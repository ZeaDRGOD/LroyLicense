const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { licenses, saveLicenses } = require('../utils/licenseUtils');
const config = require('../utils/config.json');
const products = require('../../data/products.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('licenserevoke')
    .setDescription('Revoke a license key')
    .addStringOption(opt => opt.setName('license').setDescription('License key').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for revoking').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!config.admins.includes(interaction.user.id)) {
      return interaction.editReply({ content: '❌ You are not authorized to use this command.' });
    }

    const key = interaction.options.getString('license').trim();
    const reason = interaction.options.getString('reason').trim();

    if (!licenses[key]) {
      return interaction.editReply({ content: `❌ License key \`${key}\` not found.` });
    }

    const productName = products.find(p => p.key === licenses[key].product)?.name || licenses[key].product;

    licenses[key].status = 'deactive';
    licenses[key].revokeReason = reason;

    const embed = new EmbedBuilder()
      .setTitle('🚫 License Revoked')
      .setDescription(
        '- License Information:\n' +
        `> 🔑 **License Key:** \`${key}\`\n` +
        `> 📦 **Product:** **${productName || 'Unknown'}**\n` +
        `> 👤 **User:** **${licenses[key].clientId || 'Unknown'}**\n` +
        `> ✅ **Status:** **deactive**\n` +
        `> 📝 **Revoke Reason:** **${reason}**\n\n` +
        `- **Revoked By <@${interaction.user.id}>**`
      )
      .setColor('#00FF7F')
      .setFooter({ text: 'JerryLicense 🛠️' })
      .setTimestamp();

    try {
      await saveLicenses(licenses);
      await interaction.channel.send({ embeds: [embed] });
      await interaction.editReply({ content: `✅ License \`${key}\` revoked successfully.` });
    } catch (error) {
      console.error('Error revoking license:', error);
      if (!interaction.replied) {
        await interaction.editReply({ content: '❌ An error occurred while revoking the license.' });
      }
    }
  },
};