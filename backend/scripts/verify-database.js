require('dotenv').config();
const db = require('../src/db');

const REQUIRED_TABLES = [
  'users',
  'refresh_tokens',
  'cleanup_submissions',
  'cleanup_evidence_files',
  'submission_transitions',
  'reward_payments',
  'reward_controls',
  'reward_audit_log',
  'wallet_verification_challenges',
];

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

async function main() {
  await db.ready;

  const tableRows = db.client === 'postgres'
    ? await all(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'`,
    )
    : await all("SELECT name AS table_name FROM sqlite_master WHERE type = 'table'");
  const existingTables = new Set(tableRows.map((row) => row.table_name));
  const missingTables = REQUIRED_TABLES.filter((tableName) => !existingTables.has(tableName));

  if (missingTables.length > 0) {
    throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
  }

  const migrations = db.client === 'postgres'
    ? await all('SELECT file_name, checksum, applied_at FROM schema_migrations ORDER BY file_name')
    : [];

  console.log(JSON.stringify({
    ok: true,
    client: db.client,
    requiredTables: REQUIRED_TABLES.length,
    appliedMigrations: migrations,
  }, null, 2));
}

main()
  .then(() => new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()));
  }))
  .catch((error) => {
    console.error(`Database verification failed: ${error.message}`);
    process.exitCode = 1;
    db.close(() => {});
  });
