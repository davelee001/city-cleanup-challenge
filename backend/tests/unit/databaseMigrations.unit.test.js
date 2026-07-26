const { loadMigrations } = require('../../src/database/migrations');

describe('PostgreSQL migrations', () => {
  it('loads numbered migrations in a stable order with checksums', () => {
    const migrations = loadMigrations();

    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations.map((migration) => migration.fileName)).toEqual(
      [...migrations.map((migration) => migration.fileName)].sort()
    );
    migrations.forEach((migration) => {
      expect(migration.fileName).toMatch(/^\d+_.+\.sql$/);
      expect(migration.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(migration.sql).toContain('CREATE TABLE');
    });
  });

  it('defines the core evidence and reward constraints', () => {
    const baseline = loadMigrations().find(
      (migration) => migration.fileName === '001_core_schema.sql'
    );

    expect(baseline.sql).toContain('UNIQUE (submission_id, kind)');
    expect(baseline.sql).toContain('submission_id INTEGER NOT NULL UNIQUE');
    expect(baseline.sql).not.toContain('CREATE TABLE IF NOT EXISTS schema_migrations');
  });
});
