const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MIGRATION_LOCK_ID = 2_026_072_510;
const migrationsDirectory = path.join(__dirname, 'migrations');

function loadMigrations() {
  return fs
    .readdirSync(migrationsDirectory)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort()
    .map((fileName) => {
      const sql = fs.readFileSync(path.join(migrationsDirectory, fileName), 'utf8');
      return {
        fileName,
        sql,
        checksum: crypto.createHash('sha256').update(sql).digest('hex'),
      };
    });
}

async function runMigrations(pool) {
  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        file_name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const migration of loadMigrations()) {
      const applied = await client.query(
        'SELECT checksum FROM schema_migrations WHERE file_name = $1',
        [migration.fileName],
      );

      if (applied.rowCount > 0) {
        if (applied.rows[0].checksum !== migration.checksum) {
          throw new Error(
            `Migration checksum mismatch for ${migration.fileName}. Applied migrations must not be edited.`,
          );
        }
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (file_name, checksum) VALUES ($1, $2)',
          [migration.fileName, migration.checksum],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    } finally {
      client.release();
    }
  }
}

module.exports = {
  loadMigrations,
  runMigrations,
};
