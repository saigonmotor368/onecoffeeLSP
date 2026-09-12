const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const srcPath = 'C:/Users/boanl/.gemini/antigravity-ide/brain/effb4bcd-bb8a-4a42-a598-74c83ed9af51/.user_uploaded/media_1789172587285.png';
const publicDir = path.join(__dirname, '..', 'public');

async function buildAllIcons() {
  console.log('--- Step 1: Extract transparent green logo ---');
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  
  const greenBuffer = Buffer.alloc(info.width * info.height * 4);
  const whiteBuffer = Buffer.alloc(info.width * info.height * 4);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];

    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

    let alpha;
    if (brightness >= 248) {
      alpha = 0;
    } else if (brightness <= 75) {
      alpha = 255;
    } else {
      alpha = Math.round(255 * (1 - (brightness - 75) / (248 - 75)));
    }

    greenBuffer[i] = 24;
    greenBuffer[i+1] = 79;
    greenBuffer[i+2] = 56;
    greenBuffer[i+3] = alpha;

    whiteBuffer[i] = 255;
    whiteBuffer[i+1] = 255;
    whiteBuffer[i+2] = 255;
    whiteBuffer[i+3] = alpha;
  }

  const trimmedGreenBuffer = await sharp(greenBuffer, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim()
    .png()
    .toBuffer();

  const trimmedWhiteBuffer = await sharp(whiteBuffer, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim()
    .png()
    .toBuffer();

  // 1. Transparent Logos
  await sharp(trimmedGreenBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'logo.png'));

  await sharp(trimmedGreenBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'logo-original-transparent.png'));

  await sharp(trimmedGreenBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'logo-circle.png'));

  await sharp(trimmedWhiteBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'logo-white.png'));

  console.log('Saved transparent logos');

  // --- Step 2: Customer Order App Icon (512x512) ---
  // Background #184F38 + Crisp White Circle (390px) + Emerald Green Emblem (340px)
  const whiteCircleSvg = Buffer.from(`
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <circle cx="200" cy="200" r="198" fill="#FFFFFF" filter="drop-shadow(0 6px 16px rgba(0,0,0,0.35))"/>
    </svg>
  `);

  const resizedLogoForOrder = await sharp(trimmedGreenBuffer)
    .resize(340, 340, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 24, g: 79, b: 56, alpha: 1 } // #184F38 Brand Forest Green
    }
  })
    .composite([
      { input: whiteCircleSvg, top: 56, left: 56 },
      { input: resizedLogoForOrder, top: 86, left: 86 }
    ])
    .png()
    .toFile(path.join(publicDir, 'icon-order-512.png'));

  await sharp(path.join(publicDir, 'icon-order-512.png'))
    .resize(192, 192)
    .toFile(path.join(publicDir, 'icon-order-192.png'));

  console.log('Saved icon-order-512.png & icon-order-192.png');

  // --- Step 3: Admin App Icon (512x512) ---
  // Dark Slate Background #0F172A + White Circle Badge (320px) with Green Emblem + Red ADMIN Pill
  const adminCircleSvg = Buffer.from(`
    <svg width="340" height="340" xmlns="http://www.w3.org/2000/svg">
      <circle cx="170" cy="170" r="168" fill="#FFFFFF" filter="drop-shadow(0 6px 16px rgba(0,0,0,0.4))"/>
    </svg>
  `);

  const resizedLogoForAdmin = await sharp(trimmedGreenBuffer)
    .resize(280, 280, { fit: 'contain' })
    .toBuffer();

  const adminPillSvg = Buffer.from(`
    <svg width="260" height="58" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="256" height="54" rx="27" fill="#E11D48" stroke="#FFFFFF" stroke-width="4"/>
      <text x="130" y="37" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="4">ADMIN</text>
    </svg>
  `);

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 } // #0F172A
    }
  })
    .composite([
      { input: adminCircleSvg, top: 48, left: 86 },
      { input: resizedLogoForAdmin, top: 78, left: 116 },
      { input: adminPillSvg, top: 400, left: 126 }
    ])
    .png()
    .toFile(path.join(publicDir, 'icon-admin-512.png'));

  await sharp(path.join(publicDir, 'icon-admin-512.png'))
    .resize(192, 192)
    .toFile(path.join(publicDir, 'icon-admin-192.png'));

  console.log('Saved icon-admin-512.png & icon-admin-192.png');
}

buildAllIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
