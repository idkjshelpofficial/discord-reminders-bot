const config = require('../config.json');

function getNow() {
  return new Date();
}

function getDayStart(now) {
  const [hour, minute] = config.dayStart.split(':').map(Number);
  const start = new Date(now);
  start.setHours(hour, minute, 0, 0);
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
