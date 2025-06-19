const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { licenses } = require('../utils/licenseUtils');
const config = require('../utils/config.json');
const products = require('../../data/products.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('licenselist')
    .setDescription('List all licenses'),

  async execute(interaction) {
    if (!config.admins.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ You are not authorized to use this command.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    if (Object.keys(licenses).length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🔍 All Licenses')
        .setDescription('> No licenses found.')
        .setColor('#00FF7F')
        .setFooter({ text: 'JerryLicense 🛠️' })
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    const licenseDetails = Object.entries(licenses).map(([key, lic]) => {
      const productName = products.find(p => p.key === lic.product)?.name || lic.product;
      return (
        `> 🔑 **License Key:** \`${key}\`\n` +
        `> 📦 **Product:** **${productName || 'Unknown'}**\n` +
        `> 👤 **User:** **${lic.clientId || 'Unknown'}**\n` +
        `> ✅ **Status:** **${lic.status || 'Unknown'}**\n` +
        `> 📝 **Revoke Reason:** **${lic.revokeReason || 'None'}**`
      );
    });

    const embeds = [];
    let currentEmbed = new EmbedBuilder()
      .setTitle('🔍 All Licenses')
      .setColor('#00FF7F')
      .setFooter({ text: 'JerryLicense 🛠️' })
      .setTimestamp();
    let currentDescription = '- License List:\n';
    let embedCount = 1;

    for (let i = 0; i < licenseDetails.length; i++) {
      const detail = licenseDetails[i];
      const tempDescription = currentDescription + detail + (i < licenseDetails.length - 1 ? '\n\n' : '');

      // Check if adding this license exceeds the 2000-character limit
      if (tempDescription.length > 2000) {
        currentEmbed.setDescription(currentDescription);
        embeds.push(currentEmbed);
        currentEmbed = new EmbedBuilder()
          .setTitle(`🔍 All Licenses (Page ${++embedCount})`)
          .setColor('#00FF7F')
          .setFooter({ text: 'JerryLicense 🛠️' })
          .setTimestamp();
        currentDescription = '- License List (Continued):\n' + detail + '\n\n';
      } else {
        currentDescription = tempDescription;
      }
    }

    // Add the final embed
    if (currentDescription !== '- License List:\n') {
      currentEmbed.setDescription(currentDescription);
      embeds.push(currentEmbed);
    }

    try {
      await interaction.editReply({ embeds });
    } catch (error) {
      console.error('Error listing licenses:', error);
      if (!interaction.replied) {
        await interaction.editReply({ content: '❌ An error occurred while listing licenses.' });
      }
    }
  },
};