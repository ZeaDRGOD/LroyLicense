const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { licenses } = require('../utils/licenseUtils');
const products = require('../../data/products.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mylicense')
    .setDescription('View your licenses')
    .setDMPermission(true), // Allow command in DMs

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const id = interaction.user.id;
    let userLicenses = [];

    console.log(`Checking licenses for Discord ID: ${id}`);

    for (const [key, lic] of Object.entries(licenses)) {
      if (lic.discordId === id || lic.clientId === id) {
        const productName = products.find(p => p.key === lic.product)?.name || lic.product;
        userLicenses.push(
          `> 🔑 **License Key:** \`${key}\`\n` +
          `> 📦 **Product:** **${productName || 'Unknown'}**\n` +
          `> 🌐 **IP Limit:** **${lic.ipLimit || 'N/A'}**\n` +
          `> 📋 **Registered IPs:** **${lic.ipList.length > 0 ? lic.ipList.join(', ') : 'None'}**\n` +
          `> ⏰ **Expires:** **${lic.expiresAt && lic.expiresAt !== 'Permanent' ? new Date(lic.expiresAt).toLocaleDateString() : 'Never'}**\n` +
          `> 👤 **BuiltByBit:** **${lic.clientId || 'Unknown'}**\n` +
          `> ✅ **Status:** **${lic.status || 'Unknown'}**`
        );
        console.log(`Found license: ${key} for user ${id}`);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🔍 Your Licenses')
      .setDescription(
        userLicenses.length > 0
          ? '- Your License Information:\n' + userLicenses.join('\n\n')
          : '> No licenses found. Please ensure your Discord account is linked to your BuiltByBit username or contact an admin.'
      )
      .setColor('#00FF7F')
      .setFooter({ text: 'JerryLicense 🛠️' })
      .setTimestamp();

    try {
      if (userLicenses.length === 0) {
        console.log(`No licenses found for Discord ID: ${id}`);
      }
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in mylicense command:', error);
      if (!interaction.replied) {
        await interaction.editReply({ content: '❌ An error occurred while fetching your licenses.' });
      }
    }
  },
};