const { getDB } = require('./db');
const { getNow, isSameStreakDay, getDayStart } = require('./time');
const config = require('../config.json');

// GET USER STREAK
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
          recoveryDaysUsed: 0,
          fails: 0
        });
      }
      resolve(row);
    });
  });
}

// SAVE USER STREAK
function saveUserStreak(streak) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO streaks (userId, currentStreak, bestStreak, lastCheckIn, inRecoveryMode, recoveryDaysUsed, fails)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET
        currentStreak = excluded.currentStreak,
        bestStreak = excluded.bestStreak,
        lastCheckIn = excluded.lastCheckIn,
        inRecoveryMode = excluded.inRecoveryMode,
        recoveryDaysUsed = excluded.recoveryDaysUsed,
        fails = excluded.fails
      `,
      [
        streak.userId,
        streak.currentStreak,
        streak.bestStreak,
        streak.lastCheckIn,
        streak.inRecoveryMode,
        streak.recoveryDaysUsed,
        streak.fails
      ],
      err => (err ? reject(err) : resolve())
    );
  });
}

// REMINDER STATE
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
      err => (err ? reject(err) : resolve())
    );
  });
}

// MESSAGE STREAK UPDATE
async function handleMessageStreak(userId) {
  const now = getNow();
  const nowISO = now.toISOString();
  const streak = await getUserStreak(userId);
  const state = await getReminderState(userId);

  const todayStartISO = getDayStart(now).toISOString();
  const isNewDay = !isSameStreakDay(streak.lastCheckIn);

  if (state.lastDayStart !== todayStartISO) {
    state.lastDayStart = todayStartISO;
    state.hasUpdatedToday = 0;
  }

  let justUpdated = false;

  if (streak.inRecoveryMode) {
    if (streak.recoveryDaysUsed < config.maxRecoveryDays) {
      const cut = 1 - config.recoveryCutPercentage;
      streak.currentStreak = Math.ceil(streak.currentStreak * cut);
      streak.inRecoveryMode = 0;
      streak.recoveryDaysUsed += 1;
      justUpdated = true;
    } else {
      streak.currentStreak = 0;
      streak.inRecoveryMode = 0;
      streak.recoveryDaysUsed = 0;
      streak.fails += 1;
      justUpdated = true;
    }
  } else if (isNewDay) {
    streak.currentStreak += 1;
    if (streak.currentStreak > streak.bestStreak) {
      streak.bestStreak = streak.currentStreak;
    }
    justUpdated = true;
  }

  streak.lastCheckIn = nowISO;
  state.hasUpdatedToday = 1;

  await saveUserStreak(streak);
  await saveReminderState(state);

  return { ...streak, justUpdated };
}

// MISSED RESET
async function applyMissedReset(userId) {
  const streak = await getUserStreak(userId);
  const state = await getReminderState(userId);

  if (state.hasUpdatedToday) return streak;

  streak.inRecoveryMode = 1;
  streak.recoveryDaysUsed += 1;
  streak.fails += 1;

  await saveUserStreak(streak);
  return streak;
}

// ROLE UPDATES
async function updateStreakRoles(member, currentStreak) {
  const rolesToGive = [];
  const rolesToRemove = [];

  for (const r of config.streakRoles) {
    if (currentStreak >= r.min) rolesToGive.push(r.roleId);
    else rolesToRemove.push(r.roleId);
  }

  for (const roleId of rolesToGive) {
    if (!member.roles.cache.has(roleId)) {
      await member.roles.add(roleId).catch(() => {});
    }
  }

  for (const roleId of rolesToRemove) {
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId).catch(() => {});
    }
  }
}

module.exports = {
  getUserStreak,
  saveUserStreak,
  getReminderState,
  saveReminderState,
  handleMessageStreak,
  applyMissedReset,
  updateStreakRoles
};
