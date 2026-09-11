const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  const logoPath = path.join(publicDir, 'logo.png');

  // 1. Generate Order App Icon (Brand Green #1E4D3B background + centered One Coffee logo)
  // 512x512 with safe area for maskable icon
  const orderLogoResized = await sharp(logoPath)
    .resize(380, 380, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Create solid brand background 512x512
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 30, g: 77, b: 59, alpha: 1 } // #1E4D3B
    }
  })
    .composite([
      { input: orderLogoResized, gravity: 'center' }
    ])
    .png()
    .toFile(path.join(publicDir, 'icon-order-512.png'));

  // 192x192 for Order
  await sharp(path.join(publicDir, 'icon-order-512.png'))
    .resize(192, 192)
    .toFile(path.join(publicDir, 'icon-order-192.png'));

  // 2. Generate Admin App Icon (Dark Slate #0F172A background + One Coffee logo + ADMIN badge)
  const adminLogoResized = await sharp(logoPath)
    .resize(340, 340, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Create ADMIN badge SVG
  const adminBadgeSvg = Buffer.from(`
    <svg width="240" height="54" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="240" height="54" rx="27" fill="#E11D48" stroke="#FFFFFF" stroke-width="3"/>
      <text x="120" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="3">ADMIN</text>
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
      { input: adminLogoResized, top: 55, left: 86 },
      { input: adminBadgeSvg, top: 410, left: 136 }
    ])
    .png()
    .toFile(path.join(publicDir, 'icon-admin-512.png'));

  // 192x192 for Admin
  await sharp(path.join(publicDir, 'icon-admin-512.png'))
    .resize(192, 192)
    .toFile(path.join(publicDir, 'icon-admin-192.png'));

  console.log('Successfully created PWA icons:');
  console.log('- icon-order-192.png, icon-order-512.png');
  console.log('- icon-admin-192.png, icon-admin-512.png');
}

createIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
