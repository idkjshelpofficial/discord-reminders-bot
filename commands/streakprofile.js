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

    // Build achievements list
    const achievements = config.streakRoles
      .filter(r => streak.currentStreak >= r.min)
      .map(r => `・<@&${r.roleId}> (${r.min}+)`)
      .join('\n');

    const achievementsText = achievements.length > 0 ? achievements : 'None yet';

    // Rank based on current streak
    let rank = 'Unranked';
    const s = streak.currentStreak;

    if (s >= 200) rank = '☀️ S Tier';
    else if (s >= 150) rank = '🐦‍🔥 A Tier';
    else if (s >= 100) rank = '❤️‍🔥 B Tier';
    else if (s >= 50) rank = '🔥 C Tier';
    else if (s >= 25) rank = '♨️ D Tier';
    else if (s >= 10) rank = '🌡️ E Tier';

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`${user.username}'s Streak Profile`)
      .addFields(
        {
          name: 'Achievements',
          value: achievementsText
        },
        {
          name: 'Rank',
          value: rank
        },
        {
          name: 'Info',
          value:
            `🔥・Current Streak: **${streak.currentStreak}**\n` +
            `🏆・Highest Streak: **${streak.bestStreak}**\n` +
            `↩・Recoveries: **${streak.recoveryDaysUsed}**\n` +
            `❌・Streak Fails: **${streak.fails || 0}**`
        }
      )
      .setFooter({ text: 'Weird StreakBot • Hybrid Streak System' });

    await interaction.reply({ embeds: [embed] });
  }
};
