/**
 * Downloads consolidated face-api.js model weights from jsDelivr CDN.
 * Run: node download-models.js
 */
const fs   = require('fs');
const https = require('https');
const path  = require('path');

const BASE = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

const FILES = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
];

const DEST = path.join(__dirname, 'public', 'models');
fs.mkdirSync(DEST, { recursive: true });

function download(filename) {
  const url  = `${BASE}/${filename}`;
  const dest = path.join(DEST, filename);
  const file = fs.createWriteStream(dest);

  https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      file.close();
      fs.unlinkSync(dest);
      return download(filename);
    }
    if (res.statusCode !== 200) {
      console.error(`✗ ${filename} – HTTP ${res.statusCode}`);
      file.close();
      return;
    }
    res.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        const size = fs.statSync(dest).size;
        console.log(`✓ ${filename} (${(size / 1024).toFixed(1)} KB)`);
      });
    });
  }).on('error', (err) => {
    console.error(`✗ ${filename} – ${err.message}`);
    file.close();
  });
}

console.log(`Downloading consolidated models to ${DEST}...\n`);
FILES.forEach(download);
