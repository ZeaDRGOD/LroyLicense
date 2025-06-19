const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { generateKey, saveLicenses, licenses } = require('../utils/licenseUtils');
const config = require('../utils/config.json');
const fs = require('fs').promises;
const path = require('path');

// Cache products at startup
let products = [];
const productsFilePath = path.join(__dirname, '../../data/products.json');

async function loadProducts() {
  const start = Date.now();
  try {
    const data = await fs.readFile(productsFilePath, 'utf8');
    products = JSON.parse(data);
    if (!Array.isArray(products)) {
      console.error('products.json is not an array:', products);
      products = [];
    }
  } catch (error) {
    console.error('Failed to load products:', error);
    if (error.code === 'ENOENT') {
      console.warn('Creating empty products.json');
      await fs.writeFile(productsFilePath, JSON.stringify([], null, 2));
    }
    products = [];
  }
  console.log(`Products loaded in ${Date.now() - start}ms`);
}

// Load products asynchronously at startup
(async () => {
  await loadProducts();
})();

// Precompute product choices to avoid runtime overhead
const productChoices = [];
function updateProductChoices() {
  productChoices.length = 0; // Clear existing choices
  products.forEach(product => {
    if (product.name && product.key) {
      productChoices.push({ name: product.name, value: product.key });
    } else {
      console.warn(`Skipping invalid product: ${JSON.stringify(product)}`);
    }
  });
}
updateProductChoices();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('licensecreate')
    .setDescription('Create a license for a user.')
    .addUserOption(opt => opt.setName('client').setDescription('The client').setRequired(true))
    .addStringOption(opt =>
      opt
        .setName('product')
        .setDescription('The product')
        .setRequired(true)
        .addChoices(...productChoices) // Use precomputed choices
    )
    .addStringOption(opt => opt.setName('bbb').setDescription('BuiltByBit Username').setRequired(true))
    .addIntegerOption(opt => opt.setName('iplimit').setDescription('IP limit (0 or -1 for unlimited)').setRequired(true))
    .addStringOption(opt => opt.setName('expire').setDescription('Expire time (7d, 14d, 30d) or leave blank for permanent')),

  async execute(interaction) {
    const start = Date.now();
    console.log(`Processing /licensecreate for interaction ${interaction.id}`);

    // Defer reply immediately
    try {
      await interaction.deferReply({ ephemeral: true });
      console.log(`deferReply took ${Date.now() - start}ms`);
    } catch (error) {
      console.error(`Failed to defer reply for interaction ${interaction.id}:`, error);
      return;
    }

    // Check admin permissions
    if (!config.admins.includes(interaction.user.id)) {
      await interaction.editReply({ content: '❌ You are not authorized to use this command.' }).catch(error =>
        console.error('Error sending unauthorized message:', error)
      );
      return;
    }

    const client = interaction.options.getUser('client');
    const bbb = interaction.options.getString('bbb')?.trim() || 'Unknown';
    const product = interaction.options.getString('product');
    let ipLimit = interaction.options.getInteger('iplimit');
    const expire = interaction.options.getString('expire');

    // Set ipLimit to "*" for unlimited
    if (ipLimit === 0 || ipLimit === -1) {
      ipLimit = '*';
    }

    // Validate inputs
    if (!bbb || bbb === 'Unknown') {
      await interaction.editReply({ content: '❌ BuiltByBit Username cannot be empty.' }).catch(error =>
        console.error('Error sending empty username message:', error)
      );
      return;
    }

    const productData = products.find(p => p.key === product);
    if (!productData) {
      await interaction.editReply({ content: `❌ Invalid product key "${product}".` }).catch(error =>
        console.error('Error sending invalid product message:', error)
      );
      return;
    }
    const productName = productData.name;

    // Generate license
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

    // Create embeds
    const userEmbed = new EmbedBuilder()
      .setTitle('🔑 Your License Key')
      .setDescription(
        '**⚠️ Warning:** Sharing this key with others will result in your license being permanently disabled and access revoked.\n\n' +
        `- License Information:\n` +
        `> 🔑 **License Key:** \`${licenseKey}\`\n` +
        `> 📦 **Product:** **${productName}**\n` +
        `> 🌐 **IP Limit:** **${ipLimit === '*' ? 'Unlimited' : ipLimit}**\n` +
        `> ⏰ **Expires:** **${expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Never'}**\n` +
        `> 👤 **User:** **${bbb}**`
      )
      .setColor('#FFD700')
      .setFooter({ text: 'Copy License above to use! 📋' })
      .setTimestamp();

    const adminEmbed = new EmbedBuilder()
      .setTitle('✅ License Request Completed!')
      .setDescription(
        `- License Request Information:\n` +
        `> 🔑 **License Key:** \`${licenseKey}\`\n` +
        `> 📦 **Product:** **${productName}**\n` +
        `> 🌐 **IP Limit:** **${ipLimit === '*' ? 'Unlimited' : ipLimit}**\n` +
        `> ⏰ **Expires:** **${expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Never'}**\n` +
        `> 👤 **User:** **${bbb}**\n` +
        `> 🆔 **Discord ID:** **${client.id}**\n\n` +
        `- **Created By <@${interaction.user.id}>**`
      )
      .setColor('#00FF7F')
      .setFooter({ text: 'JerryLicense 🛠️' })
      .setTimestamp();

    try {
      // Batch file and API operations
      const saveStart = Date.now();
      await saveLicenses(licenses);
      console.log(`saveLicenses took ${Date.now() - saveStart}ms`);

      const apiStart = Date.now();
      await Promise.all([
        client.send({ embeds: [userEmbed] }),
        interaction.channel.send({ embeds: [adminEmbed] }),
        interaction.editReply({ content: `✅ License successfully created for <@${client.id}>` }),
      ]);
      console.log(`API calls took ${Date.now() - apiStart}ms`);

      console.log(`License creation completed in ${Date.now() - start}ms`);
    } catch (error) {
      console.error('Error creating license:', error);
      await interaction
        .editReply({ content: '❌ Error occurred while creating the license.' })
        .catch(editError => console.error('Error sending error message:', editError));
    }
  },
};