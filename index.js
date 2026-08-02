require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
  EmbedBuilder
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const config = require('./config.json');
const { initDB } = require('./utils/db');
const { scheduleRemindersLoop } = require('./utils/reminderLogic');
const { handleMessageStreak } = require('./utils/streakLogic');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();

// Load command files (remind, checkin still exist if you want them)
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    }
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Slash commands registered.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }

  await initDB();
  scheduleRemindersLoop(client, config);
});

// Slash commands (remind/checkin)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error executing this command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
    }
  }
});

// Message-based streak updates
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.channel.id !== config.streakChannelId) return;

  try {
    const streak = await handleMessageStreak(message.author.id);

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle('Streak Updated')
      .setDescription(
        `Your streak has been updated!\n` +
        `Current streak: **${streak.currentStreak}**\n` +
        `Best streak: **${streak.bestStreak}**`
      );

    await message.channel.send({ content: `<@${message.author.id}>`, embeds: [embed] });
  } catch (err) {
    console.error('Error updating streak from message:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
