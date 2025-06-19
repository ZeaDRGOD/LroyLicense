const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const config = require('./utils/config.json');

const globalCommands = [];
const guildCommands = [];

const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  const jsonData = command.data.toJSON();

  if (jsonData.dm_permission === true) {
    globalCommands.push(jsonData); // Register for global (for DM support)
  } else {
    guildCommands.push(jsonData); // Register only in guild
  }
}

const rest = new REST({ version: '10' }).setToken(config.botToken);

(async () => {
  try {
    console.log(`⏳ Registering commands...`);

    // Register global commands (DM-capable)
    if (globalCommands.length > 0) {
      await rest.put(Routes.applicationCommands(config.clientId), {
        body: globalCommands,
      });
      console.log(`✅ Registered ${globalCommands.length} global (DM) commands`);
    }

    // Register guild-only commands
    if (guildCommands.length > 0) {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: guildCommands }
      );
      console.log(`✅ Registered ${guildCommands.length} guild commands`);
    }

  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();