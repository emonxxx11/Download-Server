const express = require('express');
const axios = require('axios');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const zipUrl = 'https://raw.githubusercontent.com/nafijdev/missionpay/main/missionpay.zip';

app.get('/download', async (req, res) => {
  try {
    const response = await axios.get(zipUrl, { responseType: 'arraybuffer' });
    const zipBuffer = Buffer.from(response.data, 'binary');

    const zip = new AdmZip(zipBuffer);
    const tempDir = path.join(__dirname, 'temp');

    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    zip.extractAllTo(tempDir, true);
    const files = fs.readdirSync(tempDir);
    const targetFile = files.find(file => file.endsWith('.apk') || file.endsWith('.html') || file.endsWith('.exe') || file.endsWith('.txt') || file.endsWith('.pdf')) || files[0];
    const filePath = path.join(tempDir, targetFile);

    res.download(filePath, targetFile, err => {
      if (err) console.error('Download error:', err);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  } catch (error) {
    res.status(500).send('Download failed: ' + error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
