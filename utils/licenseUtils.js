// ../utils/licenseUtils.js
const fetch = require('node-fetch');

class LicenseVerifier {
    static MAX_RETRIES = 3;
    static TIMEOUT = 5000;

    static async validateLicense(licenseKey) {
        const fetch = (await import('node-fetch')).default; // Dynamic import
        const product = 'lroylicense';
        const apiKey = '9cd5e2a5-1744-42bb-82da-9fab2611af8e';
        let attempts = 0;

        while (attempts < this.MAX_RETRIES) {
            attempts++;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

                const response = await fetch(
                    `http://l4oyst0rm.mikitamc.ink:25597/${product}/${licenseKey}?key=${apiKey}`,
                    {
                        method: 'GET',
                        headers: { 'x-api-key': apiKey },
                        signal: controller.signal
                    }
                );

                clearTimeout(timeoutId);

                if (response.ok) {
                    const license = await response.json();
                    if (license.status === 'active' && license.productName.toLowerCase() === 'lroylicense') {
                        this.logSuccess(licenseKey, license);
                        return true;
                    } else {
                        this.logError(`Invalid license: ${license.status}`);
                    }
                } else {
                    this.logError(`Server error: HTTP ${response.status}`);
                }
            } catch (error) {
                if (attempts === this.MAX_RETRIES) {
                    this.logError(`Server unreachable after ${this.MAX_RETRIES} tries: ${error.message}`);
                    return false;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return false;
    }

    static logSuccess(licenseKey, license) {
        console.log('✅ License valid!');
        console.log(`Key: ${this.obfuscateKey(licenseKey)}`);
        console.log(`Product: ${license.productName}`);
        console.log(`Owner: ${license.clientId}`);
        console.log(`Expires: ${license.expired}`);
    }

    static logError(message) {
        console.error(`❌ ERROR: ${message}`);
        console.error('Contact support: https://discord.gg/vQCjCPJa5Z');
    }

    static obfuscateKey(key) {
        if (!key || key.length <= 4) return key;
        return key.slice(0, 4) + '*'.repeat(key.length - 4);
    }
}

module.exports = LicenseVerifier;