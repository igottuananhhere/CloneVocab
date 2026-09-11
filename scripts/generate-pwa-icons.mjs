import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'apps/web/public/icons/icon.svg');
const iconsDir = path.join(rootDir, 'apps/web/public/icons');
const publicDir = path.join(rootDir, 'apps/web/public');

const require = createRequire(import.meta.url);
const sharp = require(path.join(rootDir, 'apps/web/node_modules/sharp'));

async function main() {

  const svgBuffer = fs.readFileSync(svgPath);

  // 1. icon-192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('✓ Created icon-192.png');

  // 2. icon-512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('✓ Created icon-512.png');

  // 3. icon-512-maskable.png (with safe-zone padding)
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#13182e',
    })
    .png()
    .toFile(path.join(iconsDir, 'icon-512-maskable.png'));
  console.log('✓ Created icon-512-maskable.png');

  // 4. apple-touch-icon.png
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png');

  // 5. favicon-32.png
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ Created favicon.png');

  console.log('All PWA icons generated successfully!');
}

main().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
