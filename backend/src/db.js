// SQLite database setup for users and posts
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../city-cleanup.db'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    avatar TEXT,
    subscription_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    features TEXT NOT NULL
  )`);

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

  // Create default admin user if none exists
  db.get('SELECT * FROM users WHERE role = "admin"', [], (err, adminUser) => {
    if (err) {
      console.error('Error checking for admin user:', err);
      return;
    }
    if (!adminUser) {
      db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', 'admin123', 'admin'],
        function (err) {
          if (err) {
            console.error('Error creating admin user:', err);
          } else {
            console.log('Default admin user created: admin / admin123');
          }
        }
      );
    }
  });
});

module.exports = db;
