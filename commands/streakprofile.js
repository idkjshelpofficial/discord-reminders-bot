const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserStreak } = require('../utils/streakLogic');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('streakprofile')
    .setDescription('Show streak stats for a user')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('User to view')
        .setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(user.id);

    const streak = await getUserStreak(user.id);

    // Achievements
    const achievements = config.streakRoles
      .filter(r => streak.currentStreak >= r.min)
      .map(r => `<@&${r.roleId}>`)
      .join('\n・');

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`${user.username}'s Streak Profile`)
      .addFields(
        {
          name: 'Achievements',
          value: achievements.length > 0 ? `・${achievements}` : 'None yet'
        },
        {
          name: 'Info',
          value:
            `🔥・Current Streak: **${streak.currentStreak}**\n` +
            `🏆・Highest Streak: **${streak.bestStreak}**\n` +
            `↩・Recoveries: **${streak.recoveryDaysUsed}**\n` +
            `❌・Streak Fails: **${streak.fails || 0}**`
        }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
