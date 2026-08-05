const { getNow, getDayStart } = require('./time');
const { 
  applyMissedReset, 
  getReminderState, 
  saveReminderState 
} = require('./streakLogic');
const config = require('../config.json');
const { EmbedBuilder } = require('discord.js');

// Get all users with the reminder role
async function getUsersWithReminderRole(guild) {
  const role = guild.roles.cache.get(config.reminderRoleId);
  if (!role) return [];
  return [...role.members.values()].map(m => m.user.id);
}

async function processReminders(client) {
  const now = getNow();
  const dayStart = getDayStart(now);
  const diffMs = now - dayStart;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  for (const [, guild] of client.guilds.cache) {
    const channel = guild.channels.cache.get(config.streakChannelId);
    if (!channel) continue;

    const userIds = await getUsersWithReminderRole(guild);

    for (const userId of userIds) {
      const state = await getReminderState(userId);
      const todayStartISO = dayStart.toISOString();

      // NEW DAY START — ping reminder role
      if (state.lastDayStart !== todayStartISO) {
        state.lastDayStart = todayStartISO;
        state.hasUpdatedToday = 0;
        await saveReminderState(state);

        const embed = new EmbedBuilder()
          .setColor(config.embedColor)
          .setTitle('New Streak Day Started')
          .setDescription(
            `A new streak day has begun!\n` +
            `Send a message in this channel to update your streak.`
          );

        await channel.send({ content: `<@&${config.reminderRoleId}>`, embeds: [embed] });
      }

      // If user already updated today → skip
      if (state.hasUpdatedToday) continue;

      // Reminder hours (2h, 4h, 6h)
      if (config.reminderHours.includes(diffHours)) {
        const embed = new EmbedBuilder()
          .setColor(config.embedColor)
          .setTitle('Streak Reminder')
          .setDescription(
            `You haven't updated your streak yet today.\n` +
            `Send a message in this channel to keep it alive!`
          )
          .setFooter({ text: `Hour ${diffHours} since day start` });

        await channel.send({ content: `<@${userId}>`, embeds: [embed] });
      }

      // RESET HOUR (7h)
      if (diffHours === config.resetHour) {
        const streak = await applyMissedReset(userId);

        const embed = new EmbedBuilder()
          .setColor(config.embedColor)
          .setTitle('Streak Failed')
          .setDescription(
            `You missed your streak window.\n` +
            `Your streak has been reset to **${streak.currentStreak}**.\n\n` +
            `You can recover it for up to **${config.maxRecoveryDays} days**.\n` +
            `Each recovery cuts **${config.recoveryCutPercentage * 100}%** of your streak (rounded up).`
          );

        await channel.send({ content: `<@${userId}>`, embeds: [embed] });
      }
    }
  }
}

function scheduleRemindersLoop(client) {
  setInterval(() => {
    processReminders(client).catch(console.error);
  }, 60 * 1000); // check every minute
}

module.exports = { scheduleRemindersLoop };
