const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../utils/config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('productrename')
    .setDescription('Rename an existing product in products.json.')
    .addStringOption(opt =>
      opt.setName('key')
        .setDescription('The unique key of the product to rename')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('newname')
        .setDescription('The new name for the product')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!config.admins.includes(interaction.user.id)) {
      return interaction.editReply({ content: '❌ You are not authorized to use this command.' });
    }

    const key = interaction.options.getString('key').trim();
    const newName = interaction.options.getString('newname').trim();

    // Validate inputs
    if (!key || !newName) {
      return interaction.editReply({ content: '❌ Product key and new name cannot be empty.' });
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

      // Find product to rename
      const productIndex = products.findIndex(p => p.key === key);
      if (productIndex === -1) {
        return interaction.editReply({ content: `❌ Product key "${key}" not found.` });
      }

      // Check if new name is unique
      if (products.some(p => p.name === newName && p.key !== key)) {
        return interaction.editReply({ content: `❌ Product name "${newName}" is already in use.` });
      }

      // Get old product name for confirmation
      const oldName = products[productIndex].name;

      // Update product name
      products[productIndex].name = newName;

      // Read and update licenses
      try {
        const licensesData = await fs.readFile(licensesFilePath, 'utf8');
        licenses = JSON.parse(licensesData);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Update productName in all licenses for this product
      let updatedLicenses = 0;
      for (const license of Object.values(licenses)) {
        if (license.product === key && license.productName) {
          license.productName = newName;
          updatedLicenses++;
        }
      }

      // Write updated products and licenses back to files
      await fs.writeFile(productsFilePath, JSON.stringify(products, null, 2));
      if (updatedLicenses > 0) {
        await fs.writeFile(licensesFilePath, JSON.stringify(licenses, null, 2));
      }

      // Create confirmation embed
      const embed = new EmbedBuilder()
        .setTitle('✅ Product Renamed!')
        .setDescription(
          '- Product Information:\n' +
          `> 📦 **Old Name:** **${oldName}**\n` +
          `> 📦 **New Name:** **${newName}**\n` +
          `> 🔑 **Product Key:** \`${key}\`\n` +
          `> 🔄 **Licenses Updated:** **${updatedLicenses}**\n\n` +
          `- **Renamed By <@${interaction.user.id}>**`
        )
        .setColor('#00FF7F')
        .setFooter({ text: 'JerryLicense 🛠️' })
        .setTimestamp();

      // Send confirmation
      await interaction.channel.send({ embeds: [embed] });
      await interaction.editReply({ content: `✅ Product "${oldName}" renamed to "${newName}" with key "${key}".` });
    } catch (error) {
      console.error('Error renaming product:', error);
      if (!interaction.replied) {
        await interaction.editReply({ content: '❌ Error occurred while renaming the product.' });
      }
    }
  },
};