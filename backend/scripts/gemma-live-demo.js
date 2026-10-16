const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { performance } = require('perf_hooks');
const transport = require('../src/services/gemmaTransport');

process.env.GEMMA_VERIFICATION_ENABLED = 'true';
process.env.GEMMA_PROVIDER = 'ollama';
process.env.GEMMA_ENDPOINT = 'http://127.0.0.1:11434/api/chat';
process.env.GEMMA_MODEL = 'gemma3:4b';
process.env.GEMMA_TIMEOUT_MS = process.env.GEMMA_TIMEOUT_MS || '600000';
delete process.env.GEMMA_API_KEY;

async function main() {
  const root = path.resolve(__dirname, '../..');
  const beforeBuffer = await fs.readFile(path.join(root, 'docs/demo/gemma/before.png'));
  const afterBuffer = await fs.readFile(path.join(root, 'docs/demo/gemma/after.png'));
  const nativeFetch = transport.fetch;
  const tags = await (await nativeFetch('http://127.0.0.1:11434/api/tags')).json();
  const version = await (await nativeFetch('http://127.0.0.1:11434/api/version')).json();
  let providerResponse;
  let recordingPromise;
  // Transparent recording only: every request is sent to the real Ollama server.
  transport.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    recordingPromise = response.clone().json().then((value) => { providerResponse = value; }).catch(() => {});
    return response;
  };
  const { verifyEvidencePair } = require('../src/services/evidenceVerification');
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const verification = await verifyEvidencePair({ beforeBuffer, afterBuffer });
  await recordingPromise;
  transport.fetch = nativeFetch;
  const elapsedMs = Math.round(performance.now() - started);
  const report = {
    label: 'REAL LOCAL GEMMA INFERENCE ON LABELED ILLUSTRATIONS; NOT REAL CLEANUP EVIDENCE',
    startedAt, elapsedMs, timeoutMs: Number(process.env.GEMMA_TIMEOUT_MS), ollamaVersion: version.version,
    model: tags.models.find((model) => model.name === 'gemma3:4b'),
    runtime: await (await nativeFetch('http://127.0.0.1:11434/api/ps')).json(),
    images: ['before', 'after'].map((kind, index) => ({ path: `docs/demo/gemma/${kind}.png`,
      sha256: crypto.createHash('sha256').update(index === 0 ? beforeBuffer : afterBuffer).digest('hex') })),
    verification,
    providerResponse,
  };
  // Preserve the historical 303-second v1 record for baseline comparison.
  await fs.writeFile(path.join(root, 'docs/demo/gemma/live-inference-v2.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (verification.smartVerification.status !== 'completed') process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
