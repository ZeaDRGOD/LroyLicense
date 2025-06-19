const path = require('path');

// Deploy Commands
try {
  require('./bot/deploy-commands.js');
  console.log('🚀 Deploy commands successfully');
} catch (error) {
  console.error('❌ Error starting Deploy commands:', error.message);
}

// Start the Express server
try {
  require('./server/server.js');
  console.log('🚀 Express server started successfully');
} catch (error) {
  console.error('❌ Error starting Express server:', error.message);
}

// Start the Discord bot
try {
  require('./bot/index.js');
  console.log('🚀 Discord bot started successfully');
} catch (error) {
  console.error('❌ Error starting Discord bot:', error.message);
}