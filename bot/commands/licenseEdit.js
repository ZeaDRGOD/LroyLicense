const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { licenses, saveLicenses } = require('../utils/licenseUtils');
const config = require('../utils/config.json');
const products = require('../../data/products.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('licenseedit')
    .setDescription('Edit a license')
    .addStringOption(opt => opt.setName('license').setDescription('License key').setRequired(true))
    .addStringOption(opt =>
      opt.setName('type').setDescription('Edit type').setRequired(true)
        .addChoices(
          { name: 'IP Limit', value: 'iplimit' },
          { name: 'Edit IP', value: 'editip' },
          { name: 'Client', value: 'client' },
          { name: 'Expired Time', value: 'expired' }
        )
    )
    .addStringOption(opt => opt.setName('value1').setDescription('New value').setRequired(true))
    .addStringOption(opt => opt.setName('value2').setDescription('Second value (if needed)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!config.admins.includes(interaction.user.id)) {
      return interaction.editReply({ content: '❌ You are not authorized to use this command.' });
    }

    const key = interaction.options.getString('license').trim();
    const type = interaction.options.getString('type');
    const val1 = interaction.options.getString('value1').trim();
    const val2 = interaction.options.getString('value2')?.trim();

    if (!licenses[key]) {
      return interaction.editReply({ content: `❌ License key \`${key}\` not found.` });
    }

    const productName = products.find(p => p.key === licenses[key].product)?.name || licenses[key].product;
    let updateMessage = '';

    try {
      switch (type) {
        case 'iplimit': {
          const ipLimit = parseInt(val1);
          if (isNaN(ipLimit) || ipLimit <= 0) {
            return interaction.editReply({ content: '❌ IP limit must be a positive integer.' });
          }
          licenses[key].ipLimit = ipLimit;
          updateMessage = `IP limit updated to ${ipLimit}`;
          break;
        }
        case 'editip': {
          if (!val2) {
            return interaction.editReply({ content: '❌ New IP (value2) is required for editing IP.' });
          }
          const ipRegex = /^(?:(?:[0-9]{1,3}\.){3}[0-9]{1,3}|(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4})$/;
          if (!ipRegex.test(val1) || !ipRegex.test(val2)) {
            return interaction.editReply({ content: '❌ Invalid IP format. Please provide valid IPv4 or IPv6 addresses.' });
          }
          const index = licenses[key].ipList.indexOf(val1);
          if (index === -1) {
            return interaction.editReply({ content: `❌ IP \`${val1}\` not found in the license's IP list.` });
          }
          licenses[key].ipList[index] = val2;
          updateMessage = `IP updated from \`${val1}\` to \`${val2}\``;
          break;
        }
        case 'client': {
          if (!val1) {
            return interaction.editReply({ content: '❌ Client ID cannot be empty.' });
          }
          licenses[key].clientId = val1;
          updateMessage = `Client ID updated to ${val1}`;
          break;
        }
        case 'expired': {
          if (val1.toLowerCase() === 'permanent') {
            licenses[key].expiresAt = 'Permanent';
            updateMessage = 'Expiration set to Permanent';
          } else {
            const days = parseInt(val1);
            if (isNaN(days) || days <= 0) {
              return interaction.editReply({ content: '❌ Expiration time must be a positive number of days or "permanent".' });
            }
            const now = new Date();
            now.setDate(now.getDate() + days);
            licenses[key].expiresAt = now.toISOString();
            updateMessage = `Expiration updated to ${new Date(licenses[key].expiresAt).toLocaleDateString()}`;
          }
          break;
        }
        default:
          return interaction.editReply({ content: '❌ Invalid edit type.' });
      }

      const embed = new EmbedBuilder()
        .setTitle('✏️ License Updated')
        .setDescription(
          '- License Information:\n' +
          `> 🔑 **License Key:** \`${key}\`\n` +
          `> 📦 **Product:** **${productName || 'Unknown'}**\n` +
          `> 👤 **User:** **${licenses[key].clientId || 'Unknown'}**\n` +
          `> 🌐 **IP Limit:** **${licenses[key].ipLimit || 'N/A'}**\n` +
          `> 📋 **Registered IPs:** **${licenses[key].ipList.length > 0 ? licenses[key].ipList.join(', ') : 'None'}**\n` +
          `> ⏰ **Expires:** **${licenses[key].expiresAt && licenses[key].expiresAt !== 'Permanent' ? new Date(licenses[key].expiresAt).toLocaleDateString() : 'Never'}**\n` +
          `> ✅ **Status:** **${licenses[key].status || 'Unknown'}**\n` +
          `> 📝 **Revoke Reason:** **${licenses[key].revokeReason || 'None'}**\n\n` +
          `- **Update:** ${updateMessage}\n` +
          `- **Edited By <@${interaction.user.id}>**`
        )
        .setColor('#00FF7F')
        .setFooter({ text: 'JerryLicense 🛠️' })
        .setTimestamp();

      await saveLicenses(licenses);
      await interaction.channel.send({ embeds: [embed] });
      await interaction.editReply({ content: `✅ License \`${key}\` updated successfully: ${updateMessage}.` });
    } catch (error) {
      console.error('Error editing license:', error);
      if (!interaction.replied) {
        await interaction.editReply({ content: '❌ An error occurred while editing the license.' });
      }
    }
  },
};