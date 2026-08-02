const { getDB } = require('./db');

function addReminder(userId, time, message, channelId, type = 'daily') {
  const db = getDB();
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO reminders (userId, time, message, channelId, type) VALUES (?, ?, ?, ?, ?)',
      [userId, time, message, channelId, type],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getUserReminders(userId) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM reminders WHERE userId = ?', [userId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function removeReminder(userId, id) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM reminders WHERE userId = ? AND id = ?', [userId, id], err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function scheduleRemindersLoop(client, config) {
  setInterval(async () => {
    const db = getDB();
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    db.all('SELECT * FROM reminders WHERE time = ?', [currentTime], async (err, rows) => {
      if (err || !rows || rows.length === 0) return;

      for (const r of rows) {
        try {
          const channel = await client.channels.fetch(r.channelId);
          if (!channel) continue;
          await channel.send(`<@${r.userId}> ⏰ Reminder: ${r.message}`);
        } catch (e) {
          console.error('Error sending reminder:', e);
        }
      }
    });
  }, 60 * 1000);
}

module.exports = { addReminder, getUserReminders, removeReminder, scheduleRemindersLoop };
