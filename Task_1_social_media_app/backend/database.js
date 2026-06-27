const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'social_media.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─────────────────────────────────────────
//  Create Tables
// ─────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT    UNIQUE NOT NULL,
    email        TEXT    UNIQUE NOT NULL,
    password_hash TEXT   NOT NULL,
    bio          TEXT    DEFAULT '',
    avatar_url   TEXT    DEFAULT '',
    created_at   DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    content    TEXT    NOT NULL,
    image_url  TEXT    DEFAULT '',
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    content    TEXT    NOT NULL,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS likes (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    UNIQUE(post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS followers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_id  INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at   DATETIME DEFAULT (datetime('now')),
    UNIQUE(follower_id, following_id),
    FOREIGN KEY (follower_id)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

console.log('✅ Database initialized at:', DB_PATH);

module.exports = db;
