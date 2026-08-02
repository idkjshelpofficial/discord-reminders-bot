const config = require('../config.json');

function getNow() {
  return new Date();
}

function getDayStart(date = new Date()) {
  const [hour, minute] = config.dayStart.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function isSameStreakDay(lastCheckInISO) {
  if (!lastCheckInISO) return false;

  const now = getNow();
  const last = new Date(lastCheckInISO);

  return getDayStart(now).toDateString() === getDayStart(last).toDateString();
}

module.exports = { getNow, getDayStart, isSameStreakDay };
