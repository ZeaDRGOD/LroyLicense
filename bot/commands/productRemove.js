const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../utils/config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('productremove')
    .setDescription('Remove a product from products.json.')
    .addStringOption(opt =>
      opt.setName('key')
        .setDescription('The unique key of the product to remove')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!config.admins.includes(interaction.user.id)) {
      return interaction.editReply({ content: '❌ You are not authorized to use this command.' });
    }

    const key = interaction.options.getString('key').trim();

    // Validate input
    if (!key) {
      return interaction.editReply({ content: '❌ Product key cannot be empty.' });
    }

    const productsFilePath = path.join(__dirname, '../../data/products.json');
    const licensesFilePath = path.join(__dirname, '../../data/licenses.json');
    let products = [];
    let licenses = {};

    try {
      // Read existing products
      try {
        const data = await fs.readFile(productsFilePath, 'utf8');
        products = JSON.parse(data);
      } catch (error) {
        if (error.code === 'ENOENT') {
          products = [];
        } else {
          throw error;
        }
      }

      // Validate products is an array
      if (!Array.isArray(products)) {
        return interaction.editReply({ content: '❌ Invalid products data format.' });
      }

      // Find product to remove
      const productIndex = products.findIndex(p => p.key === key);
      if (productIndex === -1) {
        return interaction.editReply({ content: `❌ Product key "${key}" not found.` });
      }

      // Get product name for confirmation
      const productName = products[productIndex].name;

      // Check if product is used by any active licenses
      try {
        const licensesData = await fs.readFile(licensesFilePath, 'utf8');
        licenses = JSON.parse(licensesData);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      const activeLicenses = Object.values(licenses).filter(
        lic => lic.product === key && lic.status === 'active'
      );
      if (activeLicenses.length > 0) {
        return interaction.editReply({
          content: `❌ Cannot remove product "${productName}" because it is used by ${activeLicenses.length} active license(s).`,
        });
      }

      // Remove product
      products.splice(productIndex, 1);

      // Write updated products back to file
      await fs.writeFile(productsFilePath, JSON.stringify(products, null, 2));

      // Create confirmation embed
      const embed = new EmbedBuilder()
        .setTitle('✅ Product Removed!')
        .setDescription(
          '- Product Information:\n' +
          `> 📦 **Product Name:** **${productName}**\n` +
          `> 🔑 **Product Key:** \`${key}\`\n\n` +
          `- **Removed By <@${interaction.user.id}>**`
        )
        .setColor('#00FF7F')
        .setFooter({ text: 'JerryLicense 🛠️' })
        .setTimestamp();

      // Send confirmation
      await interaction.channel.send({ embeds: [embed] });
      await interaction.editReply({ content: `✅ Product "${productName}" with key "${key}" successfully removed.` });
    } catch (error) {
      console.error('Error removing product:', error);
      if (!interaction.replied) {
        await interaction.editReply({ content: '❌ Error occurred while removing the product.' });
      }
    }
  },
};