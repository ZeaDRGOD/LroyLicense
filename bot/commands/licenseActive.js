const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { licenses, saveLicenses } = require('../utils/licenseUtils');
const config = require('../utils/config.json');
const products = require('../../data/products.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('licenseactive')
    .setDescription('Activate a license key')
    .addStringOption(opt =>
      opt.setName('license')
        .setDescription('The license key to activate')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!config.admins.includes(interaction.user.id)) {
      return interaction.editReply({ content: '❌ You are not authorized to use this command.' });
    }

    const key = interaction.options.getString('license').trim();

    if (!licenses[key]) {
      return interaction.editReply({ content: `❌ License key \`${key}\` not found.` });
    }

    if (licenses[key].status === 'active') {
      return interaction.editReply({ content: `❌ License \`${key}\` is already active.` });
    }

    const productName = products.find(p => p.key === licenses[key].product)?.name || licenses[key].product;

    licenses[key].status = 'active';
    delete licenses[key].revokeReason; // Clear revoke reason if present

    const embed = new EmbedBuilder()
      .setTitle('✅ License Activated')
      .setDescription(
        '- License Information:\n' +
        `> 🔑 **License Key:** \`${key}\`\n` +
        `> 📦 **Product:** **${productName || 'Unknown'}**\n` +
        `> 👤 **User:** **${licenses[key].clientId || 'Unknown'}**\n` +
        `> ✅ **Status:** **active**\n\n` +
        `- **Activated By <@${interaction.user.id}>**`
      )
      .setColor('#00FF7F')
      .setFooter({ text: 'JerryLicense 🛠️' })
      .setTimestamp();

    try {
      await saveLicenses(licenses);
      await interaction.channel.send({ embeds: [embed] });
      await interaction.editReply({ content: `✅ License \`${key}\` activated successfully.` });
    } catch (error) {
      console.error('Error activating license:', error);
      if (!interaction.replied) {
        await interaction.editReply({ content: '❌ An error occurred while activating the license.' });
      }
    }
  },
};