const config = require('../config.json');

function getNow() {
  return new Date();
}

// Convert "HH:MM" (like "15:30") into a Date object for today
function getDayStart(now) {
  const [hour, minute] = config.dayStart.split(':').map(Number);

  const start = new Date(now);
  start.setHours(hour, minute, 0, 0);

  return start;
}

// Correct logic: lastCheckIn must be AFTER today's start
function isSameStreakDay(lastCheckIn) {
  if (!lastCheckIn) return false;

  const now = getNow();
  const todayStart = getDayStart(now);

  const last = new Date(lastCheckIn);

  // If last check-in happened AFTER today's start → same streak day
  return last >= todayStart;
}

module.exports = {
  getNow,
  getDayStart,
  isSameStreakDay
};
