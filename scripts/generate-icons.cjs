const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generate() {
  const svgPath = path.join(process.cwd(), 'public/Emblem_of_Tamil_Nadu.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // 192x192 any
  await sharp(svgBuffer)
    .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(process.cwd(), 'public/pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  // 512x512 any
  await sharp(svgBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(process.cwd(), 'public/pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  // 512x512 maskable with safe margin and brand background #1e3a5f
  await sharp(svgBuffer)
    .resize(380, 380, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .extend({
      top: 66,
      bottom: 66,
      left: 66,
      right: 66,
      background: { r: 30, g: 58, b: 95, alpha: 1 }
    })
    .png()
    .toFile(path.join(process.cwd(), 'public/pwa-maskable-512x512.png'));
  console.log('Created pwa-maskable-512x512.png');

  // apple-touch-icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(process.cwd(), 'public/apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // favicon.ico / favicon.png
  await sharp(svgBuffer)
    .resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(process.cwd(), 'public/favicon.png'));
  console.log('Created favicon.png');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
