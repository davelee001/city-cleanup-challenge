// Generates clearly labeled illustrations; never inserts submissions or triggers rewards.
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const sample = require('../tests/fixtures/gemma-cleanup.sample.json');

async function main() {
  const directory = path.resolve(__dirname, '../../docs/demo/gemma');
  await fs.mkdir(directory, { recursive: true });
  for (const kind of ['before', 'after']) {
    const litter = kind === 'before'
      ? '<rect x="240" y="390" width="65" height="25" fill="#eee"/><rect x="460" y="440" width="30" height="65" rx="8" fill="#8bd8ef"/><rect x="590" y="360" width="45" height="25" fill="#e2b852"/>'
      : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640">
      <rect width="960" height="640" fill="#94bfd0"/><rect y="240" width="960" height="400" fill="#53865b"/>
      <path d="M370 240 L560 240 L850 640 L100 640Z" fill="#b8ad94"/>
      <rect x="760" y="150" width="25" height="220" fill="#775033"/><circle cx="770" cy="140" r="100" fill="#356b46"/>
      ${litter}<rect width="960" height="55" fill="#10243e"/><text x="20" y="36" fill="white" font-size="23">ILLUSTRATIVE DEMO ONLY — ${kind.toUpperCase()} — NOT REAL CLEANUP EVIDENCE</text>
      </svg>`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(directory, `${kind}.png`));
  }
  await fs.writeFile(path.join(directory, 'sample-findings.json'), `${JSON.stringify(sample, null, 2)}\n`);
  console.log('Illustrative sample assets generated in docs/demo/gemma. No inference was performed.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
