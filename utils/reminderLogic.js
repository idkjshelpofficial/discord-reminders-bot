const { getDB } = require('./db');
const { getNow, getDayStart } = require('./time');
const { applyMissedReset, getReminderState, saveReminderState } = require('./streakLogic');
const config = require('../config.json');
const { EmbedBuilder } = require('discord.js');

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

  const guilds = client.guilds.cache;
  for (const [, guild] of guilds) {
    const channel = guild.channels.cache.get(config.streakChannelId);
    if (!channel) continue;

    const userIds = await getUsersWithReminderRole(guild);

    for (const userId of userIds) {
      const state = await getReminderState(userId);
      const todayStartISO = dayStart.toISOString();

      if (state.lastDayStart !== todayStartISO) {
        state.lastDayStart = todayStartISO;
        state.hasUpdatedToday = 0;
        await saveReminderState(state);
      }

      if (state.hasUpdatedToday) continue;

      // Reminder hours
      if (config.reminderHours.includes(diffHours)) {
        const embed = new EmbedBuilder()
          .setColor(config.embedColor)
          .setTitle('Streak Reminder')
          .setDescription(`You haven't updated your streak yet today.\nPlease send a message in this channel to keep it alive!`)
          .setFooter({ text: `Hour ${diffHours} since day start` });

        await channel.send({ content: `<@${userId}>`, embeds: [embed] });
      }

      // Reset hour
      if (diffHours === config.resetHour) {
        const streak = await applyMissedReset(userId);

        const embed = new EmbedBuilder()
          .setColor(config.embedColor)
          .setTitle('Streak Reset')
          .setDescription(
            `You missed your streak window.\nYour streak has been reset to **${streak.currentStreak}**.\n` +
            `You can recover it for up to **${config.maxRecoveryDays} days**, but each recovery cuts **25%** of your streak (rounded up).`
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
