const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const databaseUrl = process.env.DATABASE_URL;
const inputArgument = process.argv[2];
const confirmed = process.argv.includes('--confirm-restore');

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}
if (!inputArgument || !confirmed) {
  console.error('Usage: npm run db:restore -- <input.dump> --confirm-restore');
  process.exit(1);
}

const inputPath = path.resolve(inputArgument);
if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) {
  console.error(`Backup file not found: ${inputPath}`);
  process.exit(1);
}

const result = spawnSync(
  'pg_restore',
  [
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-acl',
    '--exit-on-error',
    '--dbname',
    databaseUrl,
    inputPath,
  ],
  { stdio: 'inherit' },
);

if (result.error) {
  console.error(`Unable to run pg_restore: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log(`PostgreSQL restore completed from: ${inputPath}`);
