// SQLite database setup for users and posts
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../city-cleanup.db'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT NOT NULL
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
});

module.exports = db;
