const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { generateKey, saveLicenses, licenses } = require('../utils/licenseUtils');
const config = require('../utils/config.json');
const products = require('../../data/products.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('licenserenew')
    .setDescription('Renew your license key')
    .addStringOption(opt => 
      opt.setName('license')
        .setDescription('The license key to renew')
        .setRequired(true)
    )
    .setDMPermission(true), // Allow command in DMs

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // In guild, restrict to admins
    if (interaction.inGuild() && !config.admins.includes(interaction.user.id)) {
      return interaction.editReply({ content: '❌ You are not authorized to use this command in a server.' });
    }

    const licenseKey = interaction.options.getString('license').trim();
    const userId = interaction.user.id;

    // Check if license exists
    if (!licenses[licenseKey]) {
      return interaction.editReply({ content: '❌ License key not found.' });
    }

    // In DMs, verify user ownership
    if (!interaction.inGuild() && licenses[licenseKey].discordId !== userId) {
      return interaction.editReply({ content: '❌ This license does not belong to you.' });
    }

    // Generate new license key
    const newLicenseKey = generateKey();
    const oldLicense = licenses[licenseKey];

    // Create new license with updated key, preserving other details
    licenses[newLicenseKey] = {
      ...oldLicense,
      licenseKey: newLicenseKey,
      ipList: [], // Reset IP list
      status: 'active',
    };

    // Remove old license
    delete licenses[licenseKey];

    const productName = products.find(p => p.key === oldLicense.product)?.name || oldLicense.product;

    // Simplified embed for DMs
    const dmEmbed = new EmbedBuilder()
      .setTitle('✅ License Reset Completed!')
      .setDescription(
        '- New License Information:\n' +
        `> 🔑 **New License Key:** \`${newLicenseKey}\`\n` +
        `> 🔑 **Old License Key:** \`${licenseKey}\`\n` +
        `> 📦 **Product:** **${productName || 'Unknown'}**\n` +
        `> 🌐 **IP Limit:** **${oldLicense.ipLimit}**\n` +
        `> ⏰ **Expires:** **${oldLicense.expiresAt !== 'Permanent' ? new Date(oldLicense.expiresAt).toLocaleDateString() : 'Never'}**\n` +
        `> 👤 **User:** **${oldLicense.clientId || 'Unknown'}**\n` +
        `> 🆔 **Discord ID:** **${userId}**\n`
      )
      .setColor('#00FF7F')
      .setTimestamp();

    try {
      await saveLicenses(licenses);

      // DM behavior
      if (!interaction.inGuild()) {
        await interaction.editReply({ embeds: [dmEmbed] });
        return;
      }

      // Guild behavior (admin only)
      const userEmbed = new EmbedBuilder()
        .setTitle('🔑 Your New License Key')
        .setDescription(
          '**⚠️ Warning:** Sharing this key with others will result in your license being permanently disabled and access revoked.\n\n' +
          '- License Information:\n' +
          `> 🔑 **License Key:** \`${newLicenseKey}\`\n` +
          `> 📦 **Product:** **${productName || 'Unknown'}**\n` +
          `> 🌐 **IP Limit:** **${oldLicense.ipLimit}**\n` +
          `> ⏰ **Expires:** **${oldLicense.expiresAt !== 'Permanent' ? new Date(oldLicense.expiresAt).toLocaleDateString() : 'Never'}**\n` +
          `> 👤 **User:** **${oldLicense.clientId || 'Unknown'}**`
        )
        .setColor('#FFD700')
        .setFooter({ text: 'Copy License above to use! 📋' })
        .setTimestamp();

      const adminEmbed = new EmbedBuilder()
        .setTitle('✅ License Reset Completed!')
        .setDescription(
          '- New License Information:\n' +
          `> 🔑 **New License Key:** \`${newLicenseKey}\`\n` +
          `> 🔑 **Old License Key:** \`${licenseKey}\`\n` +
          `> 📦 **Product:** **${productName || 'Unknown'}**\n` +
          `> 🌐 **IP Limit:** **${oldLicense.ipLimit}**\n` +
          `> ⏰ **Expires:** **${oldLicense.expiresAt !== 'Permanent' ? new Date(oldLicense.expiresAt).toLocaleDateString() : 'Never'}**\n` +
          `> 👤 **User:** **${oldLicense.clientId || 'Unknown'}**\n` +
          `> 🆔 **Discord ID:** **${userId}**\n\n` +
          `- **Reset By <@${interaction.user.id}>**`
        )
        .setColor('#00FF7F')
        .setFooter({ text: 'JerryLicense 🛠️' })
        .setTimestamp();

      const user = await interaction.client.users.fetch(userId);
      await user.send({ embeds: [userEmbed] });
      await interaction.channel.send({ embeds: [adminEmbed] });
      await interaction.editReply({ content: `✅ License successfully reset for <@${userId}>. New key sent to their DMs.` });
    } catch (error) {
      console.error('Error resetting license:', error);
      if (!interaction.replied) {
        await interaction.editReply({ content: '❌ Error occurred while resetting the license.' });
      }
    }
  },
};