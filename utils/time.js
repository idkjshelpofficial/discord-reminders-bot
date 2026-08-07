const config = require('../config.json');

function getNow() {
  return new Date();
}

function getDayStart(now) {
  const [hour, minute] = config.dayStart.split(':').map(Number);

  // Convert local EDT time to UTC
  const utcHour = hour + 4; // EDT is UTC-4

  const start = new Date(now);
  start.setUTCHours(utcHour, minute, 0, 0);
  return start;
}

function isSameStreakDay(lastCheckIn) {
  if (!lastCheckIn) return false;

  const now = getNow();
  const todayStart = getDayStart(now);
  const last = new Date(lastCheckIn);

  return last >= todayStart;
}

module.exports = {
  getNow,
  getDayStart,
  isSameStreakDay
};
