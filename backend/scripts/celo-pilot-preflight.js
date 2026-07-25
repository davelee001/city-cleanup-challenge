require('dotenv').config();
const db = require('../src/db');
const { runCeloPilotPreflight } = require('../src/services/celoPreflight');

async function main() {
  const result = await runCeloPilotPreflight(db);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ready) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('Celo pilot preflight failed:', error.message);
    process.exitCode = 1;
  });
