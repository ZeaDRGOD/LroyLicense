const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { licenses, saveLicenses } = require('../utils/licenseUtils');
const config = require('../utils/config.json');
const products = require('../../data/products.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('licenseip')
    .setDescription('Edit IPs in your license')
    .addStringOption(opt => opt.setName('license').setDescription('License key').setRequired(true))
    .addStringOption(opt => opt.setName('oldip').setDescription('Old IP').setRequired(true))
    .addStringOption(opt => opt.setName('newip').setDescription('New IP').setRequired(true))
    .setDMPermission(true), // Allow command in DMs

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // In guild, restrict to admins
    if (interaction.inGuild() && !config.admins.includes(interaction.user.id)) {
      return interaction.editReply({ content: '❌ You are not authorized to use this command in a server.' });
    }

    const key = interaction.options.getString('license').trim();
    const oldIp = interaction.options.getString('oldip').trim();
    const newIp = interaction.options.getString('newip').trim();
    const id = interaction.user.id;

    // Basic IP format validation (IPv4 or IPv6)
    const ipRegex = /^(?:(?:[0-9]{1,3}\.){3}[0-9]{1,3}|(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4})$/;
    if (!ipRegex.test(oldIp) || !ipRegex.test(newIp)) {
      return interaction.editReply({ content: '❌ Invalid IP format. Please provide valid IPv4 or IPv6 addresses.' });
    }

    if (!licenses[key]) {
      return interaction.editReply({ content: `❌ License key \`${key}\` not found.` });
    }

    if (licenses[key].discordId !== id && licenses[key].clientId !== id) {
      return interaction.editReply({ content: '❌ This license does not belong to you.' });
    }

    const index = licenses[key].ipList.indexOf(oldIp);
    if (index === -1) {
      return interaction.editReply({ content: `❌ IP \`${oldIp}\` not found in the license's IP list.` });
    }

    const productName = products.find(p => p.key === licenses[key].product)?.name || licenses[key].product;

    licenses[key].ipList[index] = newIp;

    const embed = new EmbedBuilder()
      .setTitle('🌐 License IP Updated')
      .setDescription(
        '- License Details:\n' +
        `> 🔑 **License Key:** \`${key}\`\n` +
        `> 📦 **Product:** **${productName || 'Unknown'}**\n` +
        `> 👤 **BuiltByBit:** **${licenses[key].clientId || 'Unknown'}**\n` +
        `> 🌐 **IP Limit:** **${licenses[key].ipLimit || 'N/A'}**\n` +
        `> 📋 **Registered IPs:** **${licenses[key].ipList.length > 0 ? licenses[key].ipList.join(', ') : 'None'}**\n` +
        `> ⏰ **Expires:** **${licenses[key].expiresetAt && licenses[key].expiresAt !== 'Permanent' ? new Date(licenses[key].expiresAt).toLocaleDateString() : 'Never'}**\n` +
        `> ✅ **Status:** **${licenses[key].status || 'Unknown'}**\n` +
        `- **IP Updated By <@${interaction.user.id}>**`
      )
      .setColor('#00FF7F')
      .setFooter({ text: 'JerryLicense 🛠️' })
      .setTimestamp();

    try {
      await saveLicenses(licenses);
      if (interaction.inGuild()) {
        await interaction.channel.send({ embeds: [embed] });
      }
      await interaction.editReply({ content: `✅ IP updated from \`${oldIp}\` to \`${newIp}\` for license \`${key}\`.` });
    } catch (error) {
      console.error('Error updating license IP:', error);
      if (!interaction.replied) {
        await interaction.editReply({ content: '❌ An error occurred while updating the IP.' });
      }
    }
  },
};