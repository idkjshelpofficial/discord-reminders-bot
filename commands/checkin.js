const { SlashCommandBuilder } = require('discord.js');
const { handleCheckIn } = require('../utils/streakLogic');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkin')
    .setDescription('Check in for your streak'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const streak = await handleCheckIn(userId);

    await interaction.reply({
      content: `🔥 Streak updated!\nCurrent streak: **${streak.currentStreak}**\nBest streak: **${streak.bestStreak}**`,
      ephemeral: true
    });
  }
};
