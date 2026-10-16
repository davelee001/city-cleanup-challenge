const sharp = require('sharp');
const { performance } = require('perf_hooks');
const { SCHEMA, PROMPT, qualityFlags, POLICY_VERSION } = require('./gemmaPolicy');
const transport = require('./gemmaTransport');

const VERSION = 'gemma-cleanup-v2';
const LIMITATION = 'AI observations require human review. Photos cannot establish weight, exact quantities, disposal, location, authenticity, or chemical safety.';

function validateNode(value, schema) {
  if (schema.enum && !schema.enum.includes(value)) throw new Error('Invalid enum');
  if (schema.type === 'string' && (typeof value !== 'string' || !value.trim()
    || value.length > (schema.maxLength || 1200))) throw new Error('Invalid text');
  if (schema.type === 'boolean' && typeof value !== 'boolean') throw new Error('Invalid boolean');
  if (schema.type === 'array') {
    if (!Array.isArray(value) || value.length > schema.maxItems
      || value.length < (schema.minItems || 0)) throw new Error('Invalid list');
    value.forEach((item) => validateNode(item, schema.items));
    if (schema.uniqueItems && new Set(value).size !== value.length) throw new Error('Duplicate category');
  }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).length !== schema.required.length
      || schema.required.some((key) => !Object.hasOwn(value, key))) throw new Error('Invalid fields');
    for (const key of schema.required) validateNode(value[key], schema.properties[key]);
  }
}

function validateAssessment(value) {
  validateNode(value, SCHEMA);
  const flags = qualityFlags(value);
  if (flags.length) {
    const error = new Error('Output quality check failed');
    error.qualityFlags = flags;
    throw error;
  }
  // The model can request review, but can never waive the application's human review.
  return { ...value, needsHumanReview: true, limitations: [...new Set([...value.limitations, LIMITATION])] };
}

function configuration() {
  const provider = process.env.GEMMA_PROVIDER || 'ollama';
  if (!['ollama', 'openai'].includes(provider)) throw new Error('Invalid provider');
  const endpoint = new URL(process.env.GEMMA_ENDPOINT || 'http://127.0.0.1:11434/api/chat');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash
    || !(endpoint.protocol === 'https:' || (endpoint.protocol === 'http:' && loopback))) {
    throw new Error('Endpoint requires HTTPS or loopback HTTP, without embedded credentials');
  }
  const timeout = Number(process.env.GEMMA_TIMEOUT_MS || 45000);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 600000) throw new Error('Invalid timeout');
  function integer(name, fallback, minimum, maximum) {
    const value = Number(process.env[name] || fallback);
    if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error('Invalid inference setting');
    return value;
  }
  return { provider, endpoint: endpoint.href, timeout, model: process.env.GEMMA_MODEL || 'gemma3:4b',
    imageSize: integer('GEMMA_IMAGE_MAX_SIZE', 1024, 512, 1536),
    maxTokens: integer('GEMMA_MAX_OUTPUT_TOKENS', 384, 256, 1024),
    context: integer('GEMMA_CONTEXT_LENGTH', 2048, 2048, 8192),
    threads: integer('GEMMA_NUM_THREADS', 4, 1, 32) };
}

async function prepareImage(buffer, imageSize = 1024) {
  // Re-encode to remove EXIF/GPS; do not send notes, account details, or original filenames.
  return (await sharp(buffer, { limitInputPixels: 40000000 }).rotate()
    .resize(imageSize, imageSize, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 }).toBuffer()).toString('base64');
}

let inFlight = 0;
async function analyzeCleanup({ beforeBuffer, afterBuffer, onProgress = () => {}, signal }) {
  if (process.env.GEMMA_VERIFICATION_ENABLED !== 'true') return { status: 'disabled', version: VERSION };
  if (inFlight >= 2) return { status: 'unavailable', version: VERSION, reason: 'busy', needsHumanReview: true };
  inFlight += 1;
  let timer;
  const started = performance.now();
  let stage = 'configuration';
  const timings = {};
  try {
    const config = configuration();
    const controller = new AbortController();
    const requestSignal = signal ? AbortSignal.any([controller.signal, signal]) : controller.signal;
    requestSignal.throwIfAborted();
    timer = setTimeout(() => controller.abort(), config.timeout);
    stage = 'preprocessing';
    onProgress({ type: 'progress', message: 'Preparing the before and after images and removing metadata.' });
    const imageStarted = performance.now();
    const images = await Promise.all([prepareImage(beforeBuffer, config.imageSize), prepareImage(afterBuffer, config.imageSize)]);
    timings.preprocessingMs = Math.round(performance.now() - imageStarted);
    const body = config.provider === 'ollama' ? {
      model: config.model, stream: !!signal, format: SCHEMA,
      keep_alive: '10m',
      options: { temperature: 0, seed: 42, num_predict: config.maxTokens, num_ctx: config.context,
        num_thread: config.threads, repeat_penalty: 1.1 },
      messages: [{ role: 'user', content: PROMPT, images }],
    } : {
      model: config.model, temperature: 0, max_tokens: config.maxTokens,
      response_format: { type: 'json_schema', json_schema: { name: 'cleanup', strict: true, schema: SCHEMA } },
      messages: [{ role: 'user', content: [
        { type: 'text', text: PROMPT },
        ...images.map((data) => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${data}` } })),
      ] }],
    };
    stage = 'inference';
    onProgress({ type: 'progress', message: 'Gemma is loading or processing the image pair. CPU inference can take several minutes.' });
    const requestStarted = performance.now();
    const response = await transport.fetch(config.endpoint, {
      method: 'POST', redirect: 'error', signal: requestSignal,
      headers: { 'Content-Type': 'application/json', ...(process.env.GEMMA_API_KEY
        ? { Authorization: `Bearer ${process.env.GEMMA_API_KEY}` } : {}) },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Inference failed');
    const chunks = [];
    let bytes = 0;
    let remainder = '';
    let generated = '';
    let streamedEnvelope;
    const streaming = config.provider === 'ollama' && !!signal;
    const decoder = new (require('string_decoder').StringDecoder)('utf8');
    function consumeLine(line) {
      if (!line.trim()) return;
      const event = JSON.parse(line);
      if (event.error) throw new Error('Inference failed');
      generated += event.message?.content || '';
      if (generated.length > 65536) throw new Error('Response too large');
      if (event.message?.content) onProgress({ type: 'generation', characters: generated.length,
        message: 'Gemma is generating its structured assessment. Findings will appear after validation.' });
      if (event.done) streamedEnvelope = event;
    }
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > (streaming ? 524288 : 65536)) { controller.abort(); throw new Error('Response too large'); }
      if (streaming) {
        remainder += decoder.write(Buffer.from(chunk));
        let newline;
        while ((newline = remainder.indexOf('\n')) !== -1) {
          consumeLine(remainder.slice(0, newline));
          remainder = remainder.slice(newline + 1);
        }
      } else chunks.push(Buffer.from(chunk));
    }
    if (streaming) {
      remainder += decoder.end();
      if (remainder.trim()) consumeLine(remainder);
      if (!streamedEnvelope) throw new Error('Incomplete inference stream');
    }
    const envelope = streaming ? { ...streamedEnvelope, message: { content: generated } }
      : JSON.parse(Buffer.concat(chunks).toString('utf8'));
    timings.requestMs = Math.round(performance.now() - requestStarted);
    for (const [key, field] of Object.entries({ loadMs: 'load_duration', promptMs: 'prompt_eval_duration', generationMs: 'eval_duration' })) {
      if (Number.isFinite(envelope[field])) timings[key] = Math.round(envelope[field] / 1000000);
    }
    if (Number.isFinite(envelope.prompt_eval_count)) timings.promptTokens = envelope.prompt_eval_count;
    if (Number.isFinite(envelope.eval_count)) timings.generatedTokens = envelope.eval_count;
    stage = 'validation';
    onProgress({ type: 'progress', message: 'Checking the assessment for malformed, repeated or unsupported claims.' });
    if (envelope.done_reason === 'length' || envelope.choices?.[0]?.finish_reason === 'length') throw new Error('Truncated output');
    const content = config.provider === 'ollama' ? envelope.message?.content : envelope.choices?.[0]?.message?.content;
    const findings = validateAssessment(JSON.parse(content));
    return { status: 'completed', version: VERSION, model: config.model, provider: config.provider,
      promptVersion: POLICY_VERSION,
      settings: { imageMaxSize: config.imageSize, maxOutputTokens: config.maxTokens, contextLength: config.context, numThreads: config.threads },
      analyzedAt: new Date().toISOString(), timings: { ...timings, totalMs: Math.round(performance.now() - started) }, findings };
  } catch (error) {
    // Never expose endpoint, provider body, credentials, or raw model output.
    return { status: 'unavailable', version: VERSION,
      reason: signal?.aborted ? 'cancelled'
        : error?.name === 'AbortError' || error?.name === 'TimeoutError' ? 'timeout'
        : error?.qualityFlags ? 'quality_check_failed' : `${stage}_failed`,
      ...(error?.qualityFlags ? { qualityFlags: error.qualityFlags } : {}),
      timings: { ...timings, totalMs: Math.round(performance.now() - started) }, needsHumanReview: true };
  } finally {
    clearTimeout(timer);
    inFlight -= 1;
  }
}

module.exports = { analyzeCleanup, validateAssessment, validateNode, prepareImage, SCHEMA, VERSION };
