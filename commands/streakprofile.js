const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserStreak } = require('../utils/streakLogic');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('streakprofile')
    .setDescription('Shows your streak profile'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const streak = await getUserStreak(userId);

    const roles = config.streakRoles
      .filter(r => streak.currentStreak >= r.min)
      .map(r => `<@&${r.roleId}>`)
      .join(', ') || 'None';

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`${interaction.user.username}'s Streak Profile`)
      .addFields(
        { name: '🔥 Current Streak', value: `${streak.currentStreak}`, inline: true },
        { name: '🏆 Best Streak', value: `${streak.bestStreak}`, inline: true },
        { name: '💀 Fails', value: `${streak.fails}`, inline: true },
        { name: '♻️ Recovery Mode', value: streak.inRecoveryMode ? 'Active' : 'Inactive', inline: true },
        { name: '📅 Recovery Days Used', value: `${streak.recoveryDaysUsed}`, inline: true },
        { name: '🎖️ Streak Roles', value: roles }
      )
      .setFooter({ text: 'Streak system by Yaqoob' });

    await interaction.reply({ embeds: [embed] });
  }
};
