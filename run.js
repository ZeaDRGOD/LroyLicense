const path = require('path');
const license = require('./license.json');
const LicenseVerifier = require('./utils/licenseUtils');

async function startSystem() {
  console.log('🔍 Checking license...');
  const isValid = await LicenseVerifier.validateLicense(license.licenseKey);

  if (!isValid) {
      console.error('🚫 License verification failed. system will not start.');
      process.exit(1);
  }

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
}


// Start the system
startSystem().catch(error => {
    console.error('Failed to start bot:', error.message);
    process.exit(1);
});