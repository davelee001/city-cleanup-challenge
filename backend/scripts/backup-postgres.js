const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const databaseUrl = process.env.DATABASE_URL;
const outputArgument = process.argv[2];

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}
if (!outputArgument) {
  console.error('Usage: npm run db:backup -- <output.dump>');
  process.exit(1);
}

const outputPath = path.resolve(outputArgument);
if (fs.existsSync(outputPath)) {
  console.error(`Refusing to overwrite existing backup: ${outputPath}`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const result = spawnSync(
  'pg_dump',
  ['--format=custom', '--no-owner', '--no-acl', '--file', outputPath, databaseUrl],
  { stdio: 'inherit' },
);

if (result.error) {
  console.error(`Unable to run pg_dump: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  process.exit(result.status || 1);
}

const stats = fs.statSync(outputPath);
console.log(`PostgreSQL backup created: ${outputPath} (${stats.size} bytes)`);
