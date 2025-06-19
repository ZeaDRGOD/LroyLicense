const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

let licenses = {};
try {
  const filePath = path.resolve(__dirname, '../../data/licenses.json');
  const data = fs.readFileSync(filePath, 'utf8');
  licenses = JSON.parse(data);
} catch (error) {
  console.error('Error loading licenses.json:', error.message);
  licenses = {};
}

function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 15; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key.match(/.{1,5}/g).join('-');
}

async function saveLicenses(data) {
  const filePath = path.resolve(__dirname, '../../data/licenses.json');
  try {
    await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving licenses.json:', error.message);
    throw error;
  }
}

module.exports = {
  saveLicenses,
  generateKey,
  licenses,
};