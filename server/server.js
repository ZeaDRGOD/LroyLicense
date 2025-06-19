const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const rateLimit = require('express-rate-limit');
const app = express();
const config = require('./utils/config.json');
const license = require('../license.json');
const LicenseVerifier = require('../utils/licenseUtils');

async function startServer() {
  const isValid = await LicenseVerifier.validateLicense(license.licenseKey);

  if (!isValid) {
      process.exit(1);
  }

  // Load products for mapping keys to names
  const products = require('../data/products.json');

  app.set('trust proxy', false);

  // Load API key from env
  const API_KEY = config.apiKey;

  // Rate-limiter: max 100 requests per 15 minutes per IP
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.maxRateLimit,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use(limiter);

  // Middleware to check API key
  app.use((req, res, next) => {
    const key = req.headers['x-api-key'] || req.query.key;
    if (!key || key !== API_KEY) {
      return res.status(401).json({ error: 'Unauthorized: invalid API key' });
    }
    next();
  });

  // License check + IP tracking
  app.get('/:product/:license', async (req, res) => {
    const { product, license } = req.params;
    const dataPath = path.resolve(__dirname, '../data/licenses.json');
    let licenses = {};

    try {
      const raw = await fs.readFile(dataPath, 'utf8');
      licenses = JSON.parse(raw);
    } catch (err) {
      console.error('❌ Unable to read licenses.json:', err);
      return res.status(500).json({ error: 'Server error' });
    }

    const lic = licenses[license];
    if (!lic || lic.product !== product) {
      const productName = products.find(p => p.key === product)?.name || product;
      console.log(`❌ Invalid access: ${license} for ${productName} (${product})`);
      return res.json({ license, status: 'invalid' });
    }

    const now = new Date();
    const isExpired = lic.expiresAt !== 'Permanent' && new Date(lic.expiresAt) < now;
    const status = lic.status === 'deactive'
      ? 'deactive'
      : (isExpired ? 'expired' : 'active');

    let visitorIP = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    // Normalize IPv4-mapped IPv6 address (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
    if (visitorIP.startsWith('::ffff:')) {
      visitorIP = visitorIP.replace('::ffff:', '');
    }
    const isNewIP = !lic.ipList.includes(visitorIP);

    if (status === 'active' && isNewIP && lic.ipLimit !== "*") {
      if (lic.ipList.length < lic.ipLimit) {
        lic.ipList.push(visitorIP);
        try {
          await fs.writeFile(dataPath, JSON.stringify(licenses, null, 2));
          const productName = products.find(p => p.key === product)?.name || product;
          console.log(`✅ Added new IP ${visitorIP} to license ${license} for ${productName}`);
        } catch (e) {
          console.error(`❌ Could not update IP list for ${license}:`, e);
        }
      } else {
        const productName = products.find(p => p.key === product)?.name || product;
        console.log(`❌ Rejected new IP ${visitorIP} for license ${license} - limit reached for ${productName}`);
        return res.status(403).json({ error: 'IP limit reached', status: 'invalid' });
      }
    }

    const productName = products.find(p => p.key === lic.product)?.name || lic.productName || 'Unknown';
    res.json({
      license,
      status,
      clientId: lic.clientId || 'Unknown',
      productName,
      'ip-limit': lic.ipLimit === "*" ? "Unlimited" : lic.ipLimit,
      'ip-list': lic.ipList,
      expired: lic.expiresAt,
    });
  });

  const ip = config.hostIP;
  const port = config.hostPort;
  app.listen(port, () => {
    console.log(`🌐 License server with security running on http://${ip}:${port}`);
  });
}

// Start the bot
startServer().catch(error => {
    console.error('Failed to start bot:', error.message);
    process.exit(1);
});