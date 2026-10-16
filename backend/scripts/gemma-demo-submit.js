require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');

async function main() {
  const origin = new URL(process.env.DEMO_API_ORIGIN || 'http://localhost:3000');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
    || !['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) {
    throw new Error('Demo submission is restricted to a local server');
  }
  if (!process.env.DEMO_ACCESS_TOKEN) throw new Error('Set DEMO_ACCESS_TOKEN to a local demo user access token');
  const form = new FormData();
  const directory = path.resolve(__dirname, '../../docs/demo/gemma');
  for (const kind of ['before', 'after']) {
    form.append(`${kind}Photo`, new Blob([await fs.readFile(path.join(directory, `${kind}.png`))], { type: 'image/png' }), `${kind}.png`);
  }
  for (const [key, value] of Object.entries({
    wasteCategory: 'mixed', itemCount: '3', latitude: '-1.2864', longitude: '36.8172', locationAccuracy: '10',
    capturedBeforeAt: new Date(Date.now() - 60000).toISOString(), capturedAfterAt: new Date().toISOString(),
    notes: 'ILLUSTRATIVE HACKATHON DEMO ONLY. Synthetic drawings, example coordinates/count and submission timestamps; not real cleanup evidence. Do not pay rewards.',
  })) form.append(key, value);
  const response = await fetch(new URL('/api/v1/evidence/submissions', origin), {
    method: 'POST', redirect: 'error', headers: { Authorization: `Bearer ${process.env.DEMO_ACCESS_TOKEN}` }, body: form,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Demo submission failed');
  console.log(JSON.stringify({ id: result.submission.id, status: result.submission.status,
    smartVerification: result.submission.verification.smartVerification }, null, 2));
  console.log('Open http://localhost:19006/#/evidence as the uploader to start live Gemma analysis. Upload does not start a background worker.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
