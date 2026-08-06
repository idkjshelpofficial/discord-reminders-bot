require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes
} = require('discord.js');

const path = require('path');
const fs = require('fs');
const config = require('./config.json');

const { initDB } = require('./utils/db');
const { scheduleRemindersLoop } = require('./utils/reminderLogic');
const { handleMessageStreak, updateStreakRoles } = require('./utils/streakLogic');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();

// ⭐ ONLY LOAD streakprofile.js ⭐
const commands = [];
const commandFiles = ['streakprofile.js'];

for (const file of commandFiles) {
  const filePath = path.join(__dirname, 'commands', file);
  const command = require(filePath);

  client.commands.set(command.data.name, command);
  commands.push(command.data.toJSON());
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Slash command registered: streakprofile');
  } catch (error) {
    console.error('Error registering commands:', error);
  }

  await initDB();
  scheduleRemindersLoop(client);
});

// ⭐ SLASH COMMAND HANDLER ⭐
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'There was an error executing this command.',
      ephemeral: true
    });
  }
});

// ⭐ MESSAGE STREAK HANDLER ⭐
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.channel.id !== config.streakChannelId) return;

  try {
    const streak = await handleMessageStreak(message.author.id);

    await updateStreakRoles(message.member, streak.currentStreak);

    if (streak.justUpdated) {
      await message.reply(
        `🔥 Streak Updated!\nCurrent streak: **${streak.currentStreak}**\nBest streak: **${streak.bestStreak}**`
      );
    } else {
      await message.reply(`🕒 You already updated your streak today.`);
    }

  } catch (err) {
    console.error('Error updating streak from message:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
