// Opt-in local inference only. Stores reports for the labeled illustration pair only.
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const sharp = require('sharp');
const { performance } = require('perf_hooks');
const compact = require('../src/services/gemmaPolicy');
const transport = require('../src/services/gemmaTransport');
const fetch = (...args) => transport.fetch(...args);
const root = path.resolve(__dirname, '../..');
const directory = path.join(root, 'docs/demo/gemma/benchmarks');
const endpoint = 'http://127.0.0.1:11434';
const variants = [
  { name: 'baseline-repeat', imageSize: 1024, legacy: true, tokens: 1800, options: {} },
  { name: 'resize-only-512', imageSize: 512, legacy: true, tokens: 1800, options: {} },
  { name: 'compact-1024-384', imageSize: 1024, tokens: 384, options: { num_ctx: 2048, num_thread: 4, repeat_penalty: 1.1 } },
  { name: 'compact-512-384', imageSize: 512, tokens: 384, options: { num_ctx: 2048, num_thread: 4, repeat_penalty: 1.1 } },
  { name: 'compact-512-256', imageSize: 512, tokens: 256, options: { num_ctx: 2048, num_thread: 4, repeat_penalty: 1.1 } },
  { name: 'compact-512-threads8', imageSize: 512, tokens: 384, options: { num_ctx: 2048, num_thread: 8, repeat_penalty: 1.1 } },
  { name: 'grounded-v2-1024', imageSize: 1024, tokens: 384, options: { num_ctx: 2048, num_thread: 4, repeat_penalty: 1.1 } },
  { name: 'grounded-v3-1024', imageSize: 1024, tokens: 384, options: { num_ctx: 2048, num_thread: 4, repeat_penalty: 1.1 } },
];

async function main() {
  const argumentsList = process.argv.slice(2);
  const cold = argumentsList.includes('--cold');
  const requested = argumentsList.filter((argument) => argument !== '--cold');
  if (!requested.length || requested.some((name) => !variants.some((variant) => variant.name === name))) {
    throw new Error(`Specify variants: ${variants.map((variant) => variant.name).join(', ')}`);
  }
  const buffers = await Promise.all(['before', 'after'].map((kind) => fs.readFile(path.join(root, `docs/demo/gemma/${kind}.png`))));
  const original = JSON.parse(await fs.readFile(path.join(directory, 'baseline-config.json')));
  const version = await (await fetch(`${endpoint}/api/version`)).json();
  const tags = await (await fetch(`${endpoint}/api/tags`)).json();
  for (const name of requested) {
    const variant = variants.find((candidate) => candidate.name === name);
    if (cold) {
      const unloaded = await fetch(`${endpoint}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gemma3:4b', stream: false, keep_alive: 0 }), signal: AbortSignal.timeout(30000) });
      if (!unloaded.ok) throw new Error('Could not unload model for controlled cold benchmark');
      await unloaded.json();
    }
    const modelStateBefore = await (await fetch(`${endpoint}/api/ps`)).json();
    if (cold && modelStateBefore.models?.some((model) => model.name === 'gemma3:4b')) throw new Error('Model remained loaded; cold comparison refused');
    const started = performance.now();
    const images = await Promise.all(buffers.map(async (buffer) => (await sharp(buffer, { limitInputPixels: 40000000 }).rotate()
      .resize(variant.imageSize, variant.imageSize, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()).toString('base64')));
    const preprocessingMs = performance.now() - started;
    const policy = variant.legacy ? original : name.startsWith('compact-')
      ? JSON.parse(await fs.readFile(path.join(directory, 'compact-v1-config.json')))
      : name.startsWith('grounded-v2-') ? JSON.parse(await fs.readFile(path.join(directory, 'grounded-v2-config.json'))) : compact;
    const body = { model: 'gemma3:4b', stream: false, keep_alive: '10m', format: policy.schema || policy.SCHEMA,
      options: { temperature: 0, seed: 42, num_predict: variant.tokens, ...variant.options },
      messages: [{ role: 'user', content: policy.prompt || policy.PROMPT, images }] };
    console.log(`Starting ${name}; real local inference on labeled illustrations`, new Date().toISOString());
    const inferenceStarted = performance.now();
    let response;
    let error;
    try {
      const incoming = await fetch(`${endpoint}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(600000) });
      response = await incoming.json();
      if (!incoming.ok) error = `HTTP ${incoming.status}`;
    } catch (failure) { error = { name: failure.name, code: failure.code || failure.cause?.code || null }; }
    const inferenceMs = performance.now() - inferenceStarted;
    let findings;
    let parsed = false;
    let flags = [];
    let structuralError;
    try {
      findings = JSON.parse(response.message.content);
      parsed = true;
      flags = compact.qualityFlags(findings);
      // Validate against that variant's schema, separately from semantic heuristics.
      require('../src/services/gemmaVerification').validateNode(findings, policy.schema || policy.SCHEMA);
    } catch (failure) { structuralError = failure.message; }
    const report = {
      label: 'REAL INFERENCE BENCHMARK ON LABELED ILLUSTRATIONS; NOT REAL CLEANUP EVIDENCE',
      variant, coldRequested: cold, modelStateBefore, recordedAt: new Date().toISOString(), ollamaVersion: version.version,
      model: tags.models.find((model) => model.name === 'gemma3:4b'),
      hardware: { cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, memoryBytes: os.totalmem() },
      inputHashes: buffers.map((buffer) => crypto.createHash('sha256').update(buffer).digest('hex')),
      prompt: body.messages[0].content, schema: body.format, options: body.options,
      imagePayloadBytes: images.reduce((total, data) => total + Buffer.byteLength(data, 'base64'), 0),
      preprocessingMs, inferenceMs, totalMs: performance.now() - started,
      error, parsed, structuralError, qualityFlags: flags, findings, response,
    };
    await fs.writeFile(path.join(directory, `${name}.json`), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ name, preprocessingMs, inferenceMs, error, parsed, structuralError, flags,
      promptTokens: response?.prompt_eval_count, generatedTokens: response?.eval_count, doneReason: response?.done_reason }));
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
