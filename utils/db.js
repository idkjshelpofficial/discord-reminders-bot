const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function getDB() {
  if (!db) {
    db = new sqlite3.Database(path.join(__dirname, '..', 'database', 'hybrid.db'));
  }
  return db;
}

function initDB() {
  return new Promise((resolve, reject) => {
    const db = getDB();

    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS streaks (
          userId TEXT PRIMARY KEY,
          currentStreak INTEGER DEFAULT 0,
          bestStreak INTEGER DEFAULT 0,
          lastCheckIn TEXT,
          shields INTEGER DEFAULT 0,
          recoveryCount INTEGER DEFAULT 0
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT,
          time TEXT,
          message TEXT,
          channelId TEXT,
          type TEXT
        )
      `, err => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

module.exports = { getDB, initDB };
