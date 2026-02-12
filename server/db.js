const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    displayName TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    apiToken TEXT UNIQUE NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS magic_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expiresAt TEXT NOT NULL,
    usedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id),
    articleTitle TEXT NOT NULL,
    articleUrl TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    thumbnailUrl TEXT,
    visitedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_visits_userId ON visits(userId);
  CREATE INDEX IF NOT EXISTS idx_visits_userId_articleUrl ON visits(userId, articleUrl, visitedAt);
  CREATE INDEX IF NOT EXISTS idx_magic_tokens_token ON magic_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_users_apiToken ON users(apiToken);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);

module.exports = db;

