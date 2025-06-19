const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../utils/config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('productcreate')
    .setDescription('Create a new product and add it to products.json.')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('The name of the product')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('key')
        .setDescription('The unique key for the product')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!config.admins.includes(interaction.user.id)) {
      return interaction.editReply({ content: '❌ You are not authorized to use this command.' });
    }

    const name = interaction.options.getString('name').trim();
    const key = interaction.options.getString('key').trim();

    // Validate inputs
    if (!name || !key) {
      return interaction.editReply({ content: '❌ Product name and key cannot be empty.' });
    }

    const productsFilePath = path.join(__dirname, '../../data/products.json');
    let products = [];

    try {
      // Try to read existing products
      try {
        const data = await fs.readFile(productsFilePath, 'utf8');
        products = JSON.parse(data);
      } catch (error) {
        if (error.code === 'ENOENT') {
          // File doesn't exist, initialize as empty array
          products = [];
        } else {
          throw error;
        }
      }

      // Validate products is an array
      if (!Array.isArray(products)) {
        return interaction.editReply({ content: '❌ Invalid products data format.' });
      }

      // Check if key already exists
      if (products.some(p => p.key === key)) {
        return interaction.editReply({ content: `❌ Product key "${key}" already exists.` });
      }

      // Add new product
      products.push({ name, key });

      // Write updated products back to file
      await fs.writeFile(productsFilePath, JSON.stringify(products, null, 2));

      // Create confirmation embed
      const embed = new EmbedBuilder()
        .setTitle('✅ Product Created!')
        .setDescription(
          '- Product Information:\n' +
          `> 📦 **Product Name:** **${name}**\n` +
          `> 🔑 **Product Key:** \`${key}\`\n\n` +
          `- **Created By <@${interaction.user.id}>**`
        )
        .setColor('#00FF7F')
        .setFooter({ text: 'JerryLicense 🛠️' })
        .setTimestamp();

      // Send confirmation
      await interaction.channel.send({ embeds: [embed] });
      await interaction.editReply({ content: `✅ Product "${name}" with key "${key}" successfully created.` });
    } catch (error) {
      console.error('Error creating product:', error);
      if (!interaction.replied) {
        await interaction.editReply({ content: '❌ Error occurred while creating the product.' });
      }
    }
  },
};