const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'bliss_local.db');
const db = new Database(dbPath);

// Initialize schemas
db.exec(`
  CREATE TABLE IF NOT EXISTS locks (
    room_id TEXT,
    check_in_date TEXT,
    check_out_date TEXT,
    expires_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS deduplication (
    message_id TEXT PRIMARY KEY,
    processed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS write_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    payload TEXT,
    attempts INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS chat_logs (
    log_id TEXT PRIMARY KEY,
    social_id TEXT,
    channel TEXT,
    sender_role TEXT,
    message_content TEXT,
    parsed_intent TEXT,
    parsed_entities TEXT,
    timestamp INTEGER
  );
`);

console.log('[SQLite] Local database initialized successfully at:', dbPath);

module.exports = db;
