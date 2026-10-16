// Opt-in: sends only the two specified photographs to the configured inference service.
require('dotenv').config();
const fs = require('fs/promises');
const { analyzeCleanup } = require('../src/services/gemmaVerification');

async function main() {
  const [beforePath, afterPath] = process.argv.slice(2);
  if (!beforePath || !afterPath) throw new Error('Usage: npm run gemma:smoke -- before.jpg after.jpg');
  if (process.env.GEMMA_VERIFICATION_ENABLED !== 'true') throw new Error('Set GEMMA_VERIFICATION_ENABLED=true explicitly');
  const [beforeBuffer, afterBuffer] = await Promise.all([fs.readFile(beforePath), fs.readFile(afterPath)]);
  const result = await analyzeCleanup({ beforeBuffer, afterBuffer });
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'completed') process.exitCode = 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
