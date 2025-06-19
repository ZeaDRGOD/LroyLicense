const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { generateKey, saveLicenses, licenses } = require('../utils/licenseUtils');
const config = require('../utils/config.json');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('licensecreate')
    .setDescription('Create a license for a user.')
    .addUserOption(opt => opt.setName('client').setDescription('The client').setRequired(true))
    .addStringOption(opt => {
      const option = opt
        .setName('product')
        .setDescription('The product')
        .setRequired(true);
      // Dynamically load products and add as choices
      const productsFilePath = path.join(__dirname, '../../data/products.json');
      console.log(`Attempting to load products from: ${productsFilePath}`); // Debug log
      let products = [];
      try {
        if (!fs.existsSync(productsFilePath)) {
          console.error(`products.json not found at ${productsFilePath}`);
          return option; // Return empty option to avoid breaking
        }
        const data = fs.readFileSync(productsFilePath, 'utf8');
        products = JSON.parse(data);
        console.log(`Loaded products: ${JSON.stringify(products)}`); // Debug log
        if (!Array.isArray(products)) {
          console.error('products.json is not an array:', products);
          return option;
        }
        products.forEach(product => {
          if (product.name && product.key) {
            console.log(`Adding choice: name=${product.name}, value=${product.key}`); // Debug log
            option.addChoices({ name: product.name, value: product.key });
          } else {
            console.warn(`Skipping invalid product: ${JSON.stringify(product)}`);
          }
        });
      } catch (error) {
        console.error('Error loading products for choices:', error);
      }
      return option;
    })
    .addStringOption(opt => opt.setName('bbb').setDescription('BuiltByBit Username').setRequired(true))
    .addIntegerOption(opt => opt.setName('iplimit').setDescription('IP limit (0 or -1 for unlimited)').setRequired(true))
    .addStringOption(opt => opt.setName('expire').setDescription('Expire time (7d, 14d, 30d) or leave blank for permanent')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!config.admins.includes(interaction.user.id)) {
      return interaction.editReply({ content: '❌ You are not authorized to use this command.' });
    }

    const client = interaction.options.getUser('client');
    const bbb = interaction.options.getString('bbb') || 'Unknown';
    const product = interaction.options.getString('product');
    let ipLimit = interaction.options.getInteger('iplimit');
    const expire = interaction.options.getString('expire');

    // Set ipLimit to "*" for unlimited (0 or -1)
    if (ipLimit === 0 || ipLimit === -1) {
      ipLimit = "*";
    }

    // Load products dynamically
    const productsFilePath = path.join(__dirname, '../../data/products.json');
    let products = [];
    try {
      const data = await fs.promises.readFile(productsFilePath, 'utf8');
      products = JSON.parse(data);
    } catch (error) {
      console.error('Error reading products.json:', error);
      return interaction.editReply({ content: '❌ Error loading products. Please try again later.' });
    }

    // Validate product
    const productData = products.find(p => p.key === product);
    if (!productData) {
      return interaction.editReply({ content: `❌ Invalid product key "${product}".` });
    }
    const productName = productData.name;

    // Validate inputs
    if (!bbb || bbb.trim() === '') {
      return interaction.editReply({ content: '❌ BuiltByBit Username cannot be empty.' });
    }

    const licenseKey = generateKey();
    const now = new Date();
    let expiresAt = null;

    if (expire && /^\d+d$/.test(expire)) {
      const days = parseInt(expire.replace('d', ''));
      now.setDate(now.getDate() + days);
      expiresAt = now.toISOString();
    }

    licenses[licenseKey] = {
      clientId: bbb,
      discordId: client.id,
      product,
      productName,
      licenseKey,
      ipLimit,
      ipList: [],
      expiresAt: expiresAt || 'Permanent',
      status: 'active',
    };

    const userEmbed = new EmbedBuilder()
      .setTitle('🔑 Your License Key')
      .setDescription(
        '**⚠️ Warning:** Sharing this key with others will result in your license being permanently disabled and access revoked.\n\n' +
        '- License Information:\n' +
        `> 🔑 **License Key:** \`${licenseKey}\`\n` +
        `> 📦 **Product:** **${productName}**\n` +
        `> 🌐 **IP Limit:** **${ipLimit === "*" ? "Unlimited" : ipLimit}**\n` +
        `> ⏰ **Expires:** **${expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Never'}**\n` +
        `> 👤 **User:** **${bbb}**`
      )
      .setColor('#FFD700')
      .setFooter({ text: 'Copy License above to use! 📋' })
      .setTimestamp();

    const adminEmbed = new EmbedBuilder()
      .setTitle('✅ License Request Completed!')
      .setDescription(
        '- License Request Information:\n' +
        `> 🔑 **License Key:** \`${licenseKey}\`\n` +
        `> 📦 **Product:** **${productName}**\n` +
        `> 🌐 **IP Limit:** **${ipLimit === "*" ? "Unlimited" : ipLimit}**\n` +
        `> ⏰ **Expires:** **${expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Never'}**\n` +
        `> 👤 **User:** **${bbb}**\n` +
        `> �ID **Discord ID:** **${client.id}**\n\n` +
        `- **Created By <@${interaction.user.id}>**`
      )
      .setColor('#00FF7F')
      .setFooter({ text: 'JerryLicense 🛠️' })
      .setTimestamp();

    try {
      await saveLicenses(licenses);
      await client.send({ embeds: [userEmbed] });
      await interaction.channel.send({ embeds: [adminEmbed] });
      await interaction.editReply({ content: `✅ License successfully created for <@${client.id}>` });
    } catch (error) {
      console.error('Error creating license:', error);
      if (!interaction.replied) {
        await interaction.editReply({ content: '❌ Error occurred while creating the license.' });
      }
    }
  },
};