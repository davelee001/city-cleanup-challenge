#!/usr/bin/env node

const bcrypt = require('bcryptjs');

const APPLY_FLAG = '--apply';
const CONFIRMATION = 'MIGRATE_RETAINED_PLAINTEXT_PASSWORDS';

function isBcryptHash(value) {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(String(value || ''));
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onComplete(error) {
      if (error) reject(error);
      else resolve(this.changes);
    });
  });
}

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()));
  });
}

async function migratePlaintextPasswords(db, options = {}) {
  const apply = Boolean(options.apply);
  const rounds = Number(options.rounds || 12);
  const users = await all(db, 'SELECT id, username, password FROM users ORDER BY id');
  const plaintextUsers = users.filter((user) => !isBcryptHash(user.password));

  if (!apply) {
    return {
      apply: false,
      scanned: users.length,
      plaintext: plaintextUsers.length,
      migrated: 0,
    };
  }

  let migrated = 0;
  for (const user of plaintextUsers) {
    const passwordHash = await bcrypt.hash(user.password, rounds);
    const changes = await run(
      db,
      'UPDATE users SET password = ? WHERE id = ? AND password = ?',
      [passwordHash, user.id, user.password],
    );
    if (changes === 1) migrated += 1;
  }

  return {
    apply: true,
    scanned: users.length,
    plaintext: plaintextUsers.length,
    migrated,
  };
}

async function main() {
  const apply = process.argv.includes(APPLY_FLAG);
  if (apply && process.env.PASSWORD_MIGRATION_CONFIRM !== CONFIRMATION) {
    throw new Error(
      `Set PASSWORD_MIGRATION_CONFIRM=${CONFIRMATION} before using ${APPLY_FLAG}.`,
    );
  }

  const db = require('../src/db');
  try {
    await db.ready;
    const result = await migratePlaintextPasswords(db, { apply });
    console.log(JSON.stringify(result, null, 2));
    if (!apply && result.plaintext > 0) {
      console.log(
        `Dry run only. Back up the database, set PASSWORD_MIGRATION_CONFIRM, and rerun with ${APPLY_FLAG}.`,
      );
    }
  } finally {
    await close(db);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Password migration failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  CONFIRMATION,
  isBcryptHash,
  migratePlaintextPasswords,
};
