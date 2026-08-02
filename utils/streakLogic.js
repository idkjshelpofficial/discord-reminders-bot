const { getDB } = require('./db');
const { getNow, isSameStreakDay } = require('./time');

async function getUserStreak(userId) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM streaks WHERE userId = ?', [userId], (err, row) => {
      if (err) return reject(err);
      if (!row) {
        return resolve({
          userId,
          currentStreak: 0,
          bestStreak: 0,
          lastCheckIn: null,
          shields: 0,
          recoveryCount: 0
        });
      }
      resolve(row);
    });
  });
}

function saveUserStreak(streak) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO streaks (userId, currentStreak, bestStreak, lastCheckIn, shields, recoveryCount)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET
        currentStreak = excluded.currentStreak,
        bestStreak = excluded.bestStreak,
        lastCheckIn = excluded.lastCheckIn,
        shields = excluded.shields,
        recoveryCount = excluded.recoveryCount
      `,
      [
        streak.userId,
        streak.currentStreak,
        streak.bestStreak,
        streak.lastCheckIn,
        streak.shields,
        streak.recoveryCount
      ],
      err => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function handleCheckIn(userId) {
  const now = getNow().toISOString();
  const streak = await getUserStreak(userId);

  if (isSameStreakDay(streak.lastCheckIn)) {
    streak.lastCheckIn = now;
    await saveUserStreak(streak);
    return streak;
  }

  streak.currentStreak += 1;
  streak.lastCheckIn = now;

  if (streak.currentStreak > streak.bestStreak) {
    streak.bestStreak = streak.currentStreak;
  }

  await saveUserStreak(streak);
  return streak;
}

module.exports = { getUserStreak, handleCheckIn };
