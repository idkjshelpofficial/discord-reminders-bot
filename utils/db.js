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
          inRecoveryMode INTEGER DEFAULT 0,
          recoveryDaysUsed INTEGER DEFAULT 0,
          fails INTEGER DEFAULT 0
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS reminders_state (
          userId TEXT PRIMARY KEY,
          lastDayStart TEXT,
          hasUpdatedToday INTEGER DEFAULT 0
        )
      `);

      db.get("PRAGMA table_info(streaks)", (err, rows) => {
        if (err) return reject(err);

        const hasFails = rows.some(col => col.name === "fails");

        if (!hasFails) {
          db.run("ALTER TABLE streaks ADD COLUMN fails INTEGER DEFAULT 0", err2 => {
            if (err2) console.log("Fails column already exists or cannot be added.");
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  });
}
