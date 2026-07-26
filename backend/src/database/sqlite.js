// SQLite database setup for users and posts
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Import enhanced features migration
const { runMigration: runEnhancedFeaturesMigration } = require('../migrations/enhance-image-features');

const configuredDatabasePath = process.env.DATABASE_PATH;
const databasePath = configuredDatabasePath
  ? (configuredDatabasePath === ':memory:' ? ':memory:' : path.resolve(configuredDatabasePath))
  : path.join(__dirname, '../../city-cleanup.db');

if (databasePath !== ':memory:') {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}
const db = new sqlite3.Database(databasePath);

function ensureColumns(tableName, columns, afterStatements = []) {
  db.all(`PRAGMA table_info(${tableName})`, (error, existingColumns) => {
    if (error) {
      console.error(`Error reading ${tableName} schema:`, error);
      return;
    }
    const existingNames = new Set(existingColumns.map((column) => column.name));
    db.serialize(() => {
      for (const [columnName, definition] of Object.entries(columns)) {
        if (!existingNames.has(columnName)) {
          db.run(
            `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`,
            (alterError) => {
              if (alterError) {
                console.error(`Error adding ${tableName}.${columnName}:`, alterError);
              }
            }
          );
        }
      }
      afterStatements.forEach((statement) => db.run(statement));
    });
  });
}

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    location TEXT,
    role TEXT DEFAULT 'user',
    avatar TEXT,
    celo_wallet_address TEXT,
    celo_wallet_verified_at TEXT,
    subscription_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Keep existing SQLite databases compatible with the current signup profile.
  db.all('PRAGMA table_info(users)', (err, columns) => {
    if (err) {
      console.error('Error reading users table schema:', err);
      return;
    }

    const existingColumns = new Set(columns.map((column) => column.name));
    const profileColumns = {
      email: 'TEXT',
      phone: 'TEXT',
      location: 'TEXT',
    };

    db.serialize(() => {
      Object.entries(profileColumns).forEach(([name, type]) => {
        if (!existingColumns.has(name)) {
          db.run(`ALTER TABLE users ADD COLUMN ${name} ${type}`, (alterError) => {
            if (alterError) {
              console.error(`Error adding users.${name}:`, alterError);
            }
          });
        }
      });

      db.run(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL',
        (indexError) => {
          if (indexError) {
            console.error('Error creating users email index:', indexError);
          }
        }
      );
    });
  });

  db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    features TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    replaced_by_hash TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`);

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)'
  );

  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cleanup_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    area TEXT NOT NULL,
    targetWaste REAL DEFAULT 0,
    estimatedDuration INTEGER DEFAULT 0,
    difficulty TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'active',
    createdBy TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS usage_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    details TEXT,
    ipAddress TEXT,
    userAgent TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    sessionId TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    creator TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    status TEXT DEFAULT 'active'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS event_checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eventId INTEGER NOT NULL,
    username TEXT NOT NULL,
    checkinTime TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    FOREIGN KEY (eventId) REFERENCES events (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cleanup_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eventId INTEGER NOT NULL,
    username TEXT NOT NULL,
    wasteCollected REAL DEFAULT 0,
    wasteType TEXT,
    beforePhotoPath TEXT,
    afterPhotoPath TEXT,
    notes TEXT,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (eventId) REFERENCES events (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cleanup_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    waste_category TEXT NOT NULL,
    item_count INTEGER,
    estimated_weight REAL,
    notes TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    location_accuracy REAL NOT NULL,
    captured_before_at TEXT NOT NULL,
    captured_after_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted',
    duplicate_of INTEGER,
    verification_summary TEXT,
    verification_version TEXT,
    risk_level TEXT,
    rejection_reason TEXT,
    appeal_reason TEXT,
    appealed_at TEXT,
    reviewed_by INTEGER,
    reviewed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (duplicate_of) REFERENCES cleanup_submissions (id),
    FOREIGN KEY (reviewed_by) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cleanup_evidence_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('before', 'after')),
    storage_path TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    perceptual_hash TEXT,
    image_metadata TEXT,
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    original_name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (submission_id, kind),
    FOREIGN KEY (submission_id) REFERENCES cleanup_submissions (id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS submission_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    actor_user_id INTEGER,
    from_status TEXT,
    to_status TEXT NOT NULL,
    reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES cleanup_submissions (id) ON DELETE CASCADE,
    FOREIGN KEY (actor_user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reward_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id TEXT UNIQUE NOT NULL,
    submission_id INTEGER UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    wallet_address TEXT,
    policy_version TEXT NOT NULL,
    calculation TEXT NOT NULL,
    amount_wei TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    chain_id INTEGER NOT NULL,
    contract_address TEXT,
    transaction_hash TEXT UNIQUE,
    block_number TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    failure_code TEXT,
    failure_reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    broadcast_at TEXT,
    confirmed_at TEXT,
    FOREIGN KEY (submission_id) REFERENCES cleanup_submissions (id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS wallet_verification_challenges (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    wallet_address TEXT NOT NULL,
    message TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reward_controls (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    paused INTEGER NOT NULL DEFAULT 1,
    pause_reason TEXT,
    updated_by INTEGER,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reward_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER,
    actor_user_id INTEGER,
    action TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES reward_payments (id) ON DELETE SET NULL,
    FOREIGN KEY (actor_user_id) REFERENCES users (id)
  )`);

  db.run(`INSERT OR IGNORE INTO reward_controls (id, paused, pause_reason)
    VALUES (1, 1, 'Rewards remain paused until the controlled testnet pilot is enabled')`);

  db.run('CREATE INDEX IF NOT EXISTS idx_cleanup_submissions_user ON cleanup_submissions(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_cleanup_submissions_status ON cleanup_submissions(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_cleanup_evidence_sha256 ON cleanup_evidence_files(sha256)');
  db.run('CREATE INDEX IF NOT EXISTS idx_submission_transitions_submission ON submission_transitions(submission_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reward_payments_user_created ON reward_payments(user_id, created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reward_payments_wallet_created ON reward_payments(wallet_address, created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_wallet_challenges_user_created ON wallet_verification_challenges(user_id, created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reward_audit_payment_created ON reward_audit_log(payment_id, created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reward_audit_actor_created ON reward_audit_log(actor_user_id, created_at)');

  ensureColumns('users', {
    celo_wallet_address: 'TEXT',
    celo_wallet_verified_at: 'TEXT',
  }, [
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_celo_wallet
     ON users(lower(celo_wallet_address))
     WHERE celo_wallet_address IS NOT NULL`,
  ]);
  ensureColumns('cleanup_submissions', {
    verification_version: 'TEXT',
    risk_level: 'TEXT',
  });
  ensureColumns('cleanup_evidence_files', {
    perceptual_hash: 'TEXT',
    image_metadata: 'TEXT',
  }, [
    'CREATE INDEX IF NOT EXISTS idx_cleanup_evidence_perceptual ON cleanup_evidence_files(perceptual_hash)',
  ]);

  if (process.env.NODE_ENV !== 'test') {
    // Run enhanced features migration after the base tables are available.
    setTimeout(async () => {
      try {
        await runEnhancedFeaturesMigration(db);
        console.log('Enhanced image features migration completed successfully');
      } catch (error) {
        console.error('Failed to run enhanced features migration:', error);
      }
    }, 1000);
  }
});

db.client = 'sqlite';
db.ready = Promise.resolve();
db.transaction = async (work) => {
  const run = (sql) => new Promise((resolve, reject) => {
    db.run(sql, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  await run('BEGIN IMMEDIATE');
  try {
    const result = await work(db);
    await run('COMMIT');
    return result;
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    throw error;
  }
};

module.exports = db;
