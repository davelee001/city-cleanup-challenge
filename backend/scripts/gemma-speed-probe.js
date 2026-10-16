// Local-only speed experiment. Never uses user uploads or changes live settings.
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { performance } = require('perf_hooks');
const { SCHEMA } = require('../src/services/gemmaPolicy');
const { validateAssessment } = require('../src/services/gemmaVerification');
const transport = require('../src/services/gemmaTransport');
const root = path.resolve(__dirname, '../..');
const PROMPT = 'Compare LEFT before and RIGHT after. Return schema JSON, one short sentence per list. Visible discarded waste only; never infer quantities, weight, disposal, authenticity or chemical safety. Empty lists beat guesses. For illustrations say illustrative, categories=[], concerns=[], cleanupEvidence=uncertain, sameScene=uncertain. Grass/trees are not waste. Describe only visible differences. Require human review. Recommend gloves/tools and trained handling of unknown hazards.';
async function main() {
  // Wait for the current uploader's inference; do not cancel or compete with it.
  for (let i = 0; i < 240; i += 1) {
    const log = await fs.readFile(path.join(root, '.local-inference/server.stderr.log'), 'utf8');
    if (/all slots are idle\s*$/.test(log)) break;
    if (i === 0) console.log('Waiting for current uploader inference to finish.');
    if (i === 239) throw Error('Ollama remains busy; experiment not started');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const started = performance.now();
  const inputs = await Promise.all(['before', 'after'].map((kind) => fs.readFile(path.join(root, `docs/demo/gemma/${kind}.png`))));
  const tiles = await Promise.all(inputs.map((buffer) => sharp(buffer).rotate().resize(512, 384, { fit: 'contain', background: '#ffffff' }).jpeg({ quality: 80 }).toBuffer()));
  const image = await sharp({ create: { width: 1024, height: 384, channels: 3, background: '#ffffff' } })
    .composite(tiles.map((input, index) => ({ input, top: 0, left: index * 512 }))).jpeg({ quality: 80 }).toBuffer();
  const preprocessingMs = performance.now() - started;
  const options = { temperature: 0, seed: 42, num_ctx: 2048, num_thread: 8, num_batch: 128, num_predict: 160, repeat_penalty: 1.1 };
  console.log('Starting actual local fast-layout experiment.');
  const began = performance.now();
  const response = await transport.fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(180000), body: JSON.stringify({ model: 'gemma3:4b', stream: false, keep_alive: '10m', format: SCHEMA, options,
      messages: [{ role: 'user', content: PROMPT, images: [image.toString('base64')] }] }) });
  if (!response.ok) throw Error(`Ollama HTTP ${response.status}`);
  const provider = await response.json();
  const inferenceMs = performance.now() - began;
  let findings;
  let validationError;
  try { findings = validateAssessment(JSON.parse(provider.message.content)); } catch (error) { validationError = error.message; }
  const report = { label: 'ACTUAL LOCAL GEMMA SPEED EXPERIMENT ON LABELED ILLUSTRATIONS; NOT REAL PHOTO ACCURACY VALIDATION',
    recordedAt: new Date().toISOString(), imageLayout: 'One side-by-side image; before left and after right; 512x384 per source',
    inputHashes: inputs.map((buffer) => crypto.createHash('sha256').update(buffer).digest('hex')),
    prompt: PROMPT, options, preprocessingMs, inferenceMs, doneReason: provider.done_reason, promptTokens: provider.prompt_eval_count,
    generatedTokens: provider.eval_count, loadMs: provider.load_duration / 1e6, promptMs: provider.prompt_eval_duration / 1e6,
    generationMs: provider.eval_duration / 1e6, validationError, findings, provider,
    limitations: ['Combining images reduces visible detail and can hide small waste or hazards.', 'One synthetic pair cannot establish real-photo accuracy.', 'Not enabled in application unless measurements and quality justify it.'] };
  await fs.writeFile(path.join(root, 'docs/demo/gemma/benchmarks/fast-layout-probe.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ inferenceMs, preprocessingMs, validationError, doneReason: provider.done_reason, promptTokens: provider.prompt_eval_count, generatedTokens: provider.eval_count }));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
