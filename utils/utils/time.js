const config = require('../config.json');

function getNow() {
  return new Date();
}

function isSameStreakDay(lastCheckInISO) {
  if (!lastCheckInISO) return false;

  const now = new Date();
  const last = new Date(lastCheckInISO);

  const [hour, minute] = config.dayStart.split(':').map(Number);

  const normalize = (d) => {
    const nd = new Date(d);
    nd.setHours(hour, minute, 0, 0);
    return nd.toDateString();
  };

  return normalize(now) === normalize(last);
}

module.exports = { getNow, isSameStreakDay };
