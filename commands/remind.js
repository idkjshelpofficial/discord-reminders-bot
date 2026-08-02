const { SlashCommandBuilder } = require('discord.js');
const { addReminder } = require('../utils/reminderLogic');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Add a reminder')
    .addStringOption(opt =>
      opt.setName('time')
        .setDescription('Time in HH:MM (24h)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('Reminder message')
        .setRequired(true)
    ),
  async execute(interaction) {
    const time = interaction.options.getString('time');
    const message = interaction.options.getString('message');

    const userId = interaction.user.id;
    const channelId = interaction.channelId;

    await addReminder(userId, time, message, channelId);

    await interaction.reply({
      content: `✅ Reminder set for **${time}**: ${message}`,
      ephemeral: true
    });
  }
};
