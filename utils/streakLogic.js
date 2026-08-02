const { getDB } = require('./db');
const { getNow, isSameStreakDay, getDayStart } = require('./time');
const config = require('../config.json');

function getUserStreak(userId) {
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
          inRecoveryMode: 0,
          recoveryDaysUsed: 0
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
      INSERT INTO streaks (userId, currentStreak, bestStreak, lastCheckIn, inRecoveryMode, recoveryDaysUsed)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET
        currentStreak = excluded.currentStreak,
        bestStreak = excluded.bestStreak,
        lastCheckIn = excluded.lastCheckIn,
        inRecoveryMode = excluded.inRecoveryMode,
        recoveryDaysUsed = excluded.recoveryDaysUsed
      `,
      [
        streak.userId,
        streak.currentStreak,
        streak.bestStreak,
        streak.lastCheckIn,
        streak.inRecoveryMode,
        streak.recoveryDaysUsed
      ],
      err => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function getReminderState(userId) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM reminders_state WHERE userId = ?', [userId], (err, row) => {
      if (err) return reject(err);
      if (!row) {
        return resolve({
          userId,
          lastDayStart: null,
          hasUpdatedToday: 0
        });
      }
      resolve(row);
    });
  });
}

function saveReminderState(state) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO reminders_state (userId, lastDayStart, hasUpdatedToday)
      VALUES (?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET
        lastDayStart = excluded.lastDayStart,
        hasUpdatedToday = excluded.hasUpdatedToday
      `,
      [state.userId, state.lastDayStart, state.hasUpdatedToday],
      err => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function handleMessageStreak(userId) {
  const now = getNow();
  const nowISO = now.toISOString();
  const streak = await getUserStreak(userId);
  const state = await getReminderState(userId);

  const todayStart = getDayStart(now).toISOString();

  // Ensure reminder state day is current
  if (state.lastDayStart !== todayStart) {
    state.lastDayStart = todayStart;
    state.hasUpdatedToday = 0;
  }

  // Recovery mode
  if (streak.inRecoveryMode) {
    if (streak.recoveryDaysUsed <= config.maxRecoveryDays) {
      const cut = 1 - config.recoveryCutPercentage;
      const newStreak = Math.ceil(streak.currentStreak * cut);
      streak.currentStreak = newStreak;
      streak.inRecoveryMode = 0;
      streak.recoveryDaysUsed = 0;
    } else {
      // Recovery not allowed anymore, they must rebuild from 0
      streak.inRecoveryMode = 0;
    }
  } else {
    // Normal streak increment if new day
    if (!isSameStreakDay(streak.lastCheckIn)) {
      streak.currentStreak += 1;
      if (streak.currentStreak > streak.bestStreak) {
        streak.bestStreak = streak.currentStreak;
      }
    }
  }

  streak.lastCheckIn = nowISO;
  state.hasUpdatedToday = 1;

  await saveUserStreak(streak);
  await saveReminderState(state);

  return streak;
}

async function applyMissedReset(userId) {
  const streak = await getUserStreak(userId);
  const state = await getReminderState(userId);

  // Only reset if they haven't updated today
  if (state.hasUpdatedToday) return streak;

  // Reset streak and enter recovery mode
  streak.inRecoveryMode = 1;
  streak.recoveryDaysUsed = (streak.recoveryDaysUsed || 0) + 1;
  streak.currentStreak = 0;

  await saveUserStreak(streak);
  return streak;
}

module.exports = {
  getUserStreak,
  handleMessageStreak,
  applyMissedReset,
  getReminderState,
  saveReminderState
};
