const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const products = require('../../data/products.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('productlist')
    .setDescription('Show available products'),

  async execute(interaction) {
    const productList = products.length > 0
      ? products.map(p => `> 🛒 **${p.name}** (\`${p.key}\`)`).join('\n')
      : '> No products found.';

    const embed = new EmbedBuilder()
      .setTitle('📋 Available Products')
      .setDescription('- Product List:\n' + productList)
      .setColor('#00FF7F')
      .setFooter({ text: 'JerryLicense 🛠️' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};