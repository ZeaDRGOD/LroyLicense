const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { licenses, saveLicenses } = require('../utils/licenseUtils');
const config = require('../utils/config.json');
const products = require('../../data/products.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('licenseremove')
    .setDescription('Remove a license by key.')
    .addStringOption(opt =>
      opt.setName('licensekey')
        .setDescription('The license key to remove (e.g., ABCDE-FGHIJ-KLMNO)')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!config.admins.includes(interaction.user.id)) {
      return interaction.editReply({ content: '❌ You are not allowed to use this command.' });
    }

    const licenseKey = interaction.options.getString('licensekey').trim();

    if (!licenses[licenseKey]) {
      return interaction.editReply({ content: `❌ License key \`${licenseKey}\` not found.` });
    }

    const productName = products.find(p => p.key === licenses[licenseKey].product)?.name || licenses[licenseKey].product;
    const licenseData = { ...licenses[licenseKey] }; // Copy license data before deletion

    const embed = new EmbedBuilder()
      .setTitle('🗑️ License Removed')
      .setDescription(
        '- Removed License Information:\n' +
        `> 🔑 **License Key:** \`${licenseKey}\`\n` +
        `> 📦 **Product:** **${productName || 'Unknown'}**\n` +
        `> 👤 **User:** **${licenseData.clientId || 'Unknown'}**\n` +
        `> 📝 **Revoke Reason:** **${licenseData.revokeReason || 'None'}**\n\n` +
        `- **Removed By <@${interaction.user.id}>**`
      )
      .setColor('#00FF7F')
      .setFooter({ text: 'JerryLicense 🛠️' })
      .setTimestamp();

    try {
      delete licenses[licenseKey];
      await saveLicenses(licenses);
      await interaction.channel.send({ embeds: [embed] });
      await interaction.editReply({ content: `✅ License \`${licenseKey}\` removed successfully.` });
    } catch (error) {
      console.error('Error in licenseRemove:', error);
      if (!interaction.replied) {
        await interaction.editReply({ content: '❌ An error occurred while removing the license.' });
      }
    }
  },
};