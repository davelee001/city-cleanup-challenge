const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const TABLES = [
  'subscriptions',
  'users',
  'refresh_tokens',
  'posts',
  'cleanup_plans',
  'usage_analytics',
  'events',
  'event_checkins',
  'cleanup_progress',
  'cleanup_submissions',
  'cleanup_evidence_files',
  'submission_transitions',
  'wallet_verification_challenges',
  'reward_controls',
  'reward_payments',
  'reward_audit_log',
];

const sourceArgument = process.argv[2] || process.env.SQLITE_SOURCE_PATH;
if (!sourceArgument || !process.argv.includes('--confirm-import')) {
  console.error(
    'Usage: npm run db:import-sqlite -- <source.db> --confirm-import',
  );
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL must point to the PostgreSQL target.');
  process.exit(1);
}

const sourcePath = path.resolve(sourceArgument);
if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
  console.error(`SQLite source not found: ${sourcePath}`);
  process.exit(1);
}

function sqliteAll(database, sql) {
  return new Promise((resolve, reject) => {
    database.all(sql, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

async function sourceTableExists(database, tableName) {
  const rows = await sqliteAll(
    database,
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${tableName}'`,
  );
  return rows.length > 0;
}

async function main() {
  const source = new sqlite3.Database(sourcePath, sqlite3.OPEN_READONLY);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  const imported = {};

  try {
    const foreignKeyProblems = await sqliteAll(source, 'PRAGMA foreign_key_check');
    if (foreignKeyProblems.length > 0) {
      const sample = foreignKeyProblems
        .slice(0, 10)
        .map((problem) => `${problem.table} row ${problem.rowid}`)
        .join(', ');
      throw new Error(
        `SQLite source contains ${foreignKeyProblems.length} orphaned foreign-key row(s): ${sample}. Reconcile them before importing.`,
      );
    }

    const occupied = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])`,
      [TABLES.filter((tableName) => tableName !== 'reward_controls')],
    );
    for (const row of occupied.rows) {
      const count = await client.query(`SELECT COUNT(*) AS total FROM ${row.table_name}`);
      if (Number(count.rows[0].total) > 0) {
        throw new Error(
          `Target table ${row.table_name} is not empty. Import into a fresh migrated database.`,
        );
      }
    }

    await client.query('BEGIN');
    for (const tableName of TABLES) {
      if (!(await sourceTableExists(source, tableName))) {
        imported[tableName] = 0;
        continue;
      }

      const targetColumnsResult = await client.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [tableName],
      );
      if (targetColumnsResult.rowCount === 0) {
        throw new Error(`Target migration did not create table ${tableName}`);
      }

      const sourceColumns = await sqliteAll(source, `PRAGMA table_info(${tableName})`);
      const sourceNames = new Map(
        sourceColumns.map((column) => [column.name.toLowerCase(), column.name]),
      );
      const columns = targetColumnsResult.rows
        .map((row) => row.column_name)
        .filter((column) => sourceNames.has(column.toLowerCase()));
      const sourceSelect = columns
        .map((column) => `"${sourceNames.get(column.toLowerCase())}"`)
        .join(', ');
      const order = tableName === 'cleanup_progress' ? ' ORDER BY id DESC' : '';
      const rows = await sqliteAll(
        source,
        `SELECT ${sourceSelect} FROM ${tableName}${order}`,
      );

      let count = 0;
      for (const row of rows) {
        const values = columns.map((column) => row[sourceNames.get(column.toLowerCase())]);
        const placeholders = values.map((value, index) => `$${index + 1}`).join(', ');
        const conflict = tableName === 'reward_controls'
          ? ' ON CONFLICT (id) DO UPDATE SET paused = EXCLUDED.paused, pause_reason = EXCLUDED.pause_reason, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at'
          : ' ON CONFLICT DO NOTHING';
        let result;
        try {
          result = await client.query(
            `INSERT INTO ${tableName} (${columns.join(', ')})
             VALUES (${placeholders})${conflict}`,
            values,
          );
        } catch (error) {
          throw new Error(
            `Unable to import ${tableName} row ${row.id ?? '(no id)'}: ${error.message}`,
          );
        }
        count += result.rowCount;
      }
      imported[tableName] = count;

      if (
        columns.includes('id')
        && !['reward_controls', 'wallet_verification_challenges'].includes(tableName)
      ) {
        await client.query(`
          SELECT setval(
            pg_get_serial_sequence('${tableName}', 'id'),
            COALESCE((SELECT MAX(id) FROM ${tableName}), 1),
            EXISTS (SELECT 1 FROM ${tableName})
          )
        `);
      }
    }
    await client.query('COMMIT');
    console.log(JSON.stringify({ ok: true, sourcePath, imported }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
    source.close();
  }
}

main().catch((error) => {
  console.error(`SQLite import failed: ${error.message}`);
  process.exitCode = 1;
});
