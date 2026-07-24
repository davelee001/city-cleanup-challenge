// SQLite database setup for users and posts
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Import enhanced features migration
const { runMigration: runEnhancedFeaturesMigration } = require('./migrations/enhance-image-features');

const configuredDatabasePath = process.env.DATABASE_PATH;
const databasePath = configuredDatabasePath
  ? path.resolve(configuredDatabasePath)
  : path.join(__dirname, '../city-cleanup.db');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
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

  db.run('CREATE INDEX IF NOT EXISTS idx_cleanup_submissions_user ON cleanup_submissions(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_cleanup_submissions_status ON cleanup_submissions(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_cleanup_evidence_sha256 ON cleanup_evidence_files(sha256)');
  db.run('CREATE INDEX IF NOT EXISTS idx_submission_transitions_submission ON submission_transitions(submission_id)');

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

module.exports = db;
