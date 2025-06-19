const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { licenses } = require('../utils/licenseUtils');
const config = require('../utils/config.json');
const products = require('../../data/products.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('licenseinfo')
    .setDescription('Get license info')
    .addStringOption(opt => opt.setName('input').setDescription('Client ID or License key').setRequired(true))
    .setDMPermission(true), // Allow command in DMs

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // In guild, restrict to admins
    if (interaction.inGuild() && !config.admins.includes(interaction.user.id)) {
      return interaction.editReply({ content: '❌ You are not authorized to use this command in a server.' });
    }

    const input = interaction.options.getString('input').trim();
    const userId = interaction.user.id;
    let results = [];

    // In DMs, restrict to user's own licenses
    if (!interaction.inGuild()) {
      for (const [key, lic] of Object.entries(licenses)) {
        if (lic.discordId === userId || lic.clientId === input) {
          results.push({ key, data: lic });
        }
      }
    } else {
      // In guild, admins can search by license key or client ID
      if (licenses[input]) {
        results.push({ key: input, data: licenses[input] });
      } else {
        for (const [key, lic] of Object.entries(licenses)) {
          if (lic.clientId === input || lic.discordId === input) {
            results.push({ key, data: lic });
          }
        }
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🔍 License Information')
      .setColor('#00FF7F')
      .setFooter({ text: 'JerryLicense 🛠️' })
      .setTimestamp();

    if (!results.length) {
      embed.setDescription('> No licenses found for the provided input.');
      return interaction.editReply({ embeds: [embed] });
    }

    const licenseDetails = results.map(r => {
      const productName = products.find(p => p.key === r.data.product)?.name || r.data.product;
      return (
        `> 🔑 **License Key:** \`${r.key}\`\n` +
        `> 📦 **Product:** **${productName || 'Unknown'}**\n` +
        `> 👤 **BuiltByBit:** **${r.data.clientId || 'Unknown'}**\n` +
        `> 🆔 **Discord ID:** **${r.data.discordId || 'Not Set'}**\n` +
        `> 🌐 **IP Limit:** **${r.data.ipLimit || 'N/A'}**\n` +
        `> 📋 **Registered IPs:** **${r.data.ipList.length > 0 ? r.data.ipList.join(', ') : 'None'}**\n` +
        `> ⏰ **Expires:** **${r.data.expiresAt && r.data.expiresAt !== 'Permanent' ? new Date(r.data.expiresAt).toLocaleDateString() : 'Never'}**\n` +
        `> ✅ **Status:** **${r.data.status || 'Unknown'}**\n`
      );
    }).join('\n\n');

    embed.setDescription('- License Details:\n' + licenseDetails);

    try {
      if (interaction.inGuild()) {
        await interaction.channel.send({ embeds: [embed] });
      }
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in licenseinfo command:', error);
      if (!interaction.replied) {
        await interaction.editReply({ content: '❌ An error occurred while fetching license info.' });
      }
    }
  },
};