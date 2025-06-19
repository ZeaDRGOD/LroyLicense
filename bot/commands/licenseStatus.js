const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { licenses } = require('../utils/licenseUtils');
const products = require('../../data/products.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('licensestatus')
    .setDescription('Check your license status'),

  async execute(interaction) {
    const id = interaction.user.id;
    const userLicenses = Object.entries(licenses).filter(([_, v]) => v.clientId === id);

    const embed = new EmbedBuilder()
      .setTitle('🔍 License Status')
      .setColor('#00FF7F')
      .setFooter({ text: 'JerryLicense 🛠️' })
      .setTimestamp();

    if (!userLicenses.length) {
      embed.setDescription('> No licenses found.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const licenseDetails = userLicenses.map(([key, lic]) => {
      const productName = products.find(p => p.key === lic.product)?.name || lic.product;
      return (
        `> 🔑 **License Key:** \`${key}\`\n` +
        `> 📦 **Product:** **${productName || 'Unknown'}**\n` +
        `> ✅ **Status:** **${lic.status || 'Unknown'}**`
      );
    }).join('\n\n');

    embed.setDescription('- Your License Status:\n' + licenseDetails);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};