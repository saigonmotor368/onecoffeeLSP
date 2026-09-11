const sharp = require('sharp');

async function createBg() {
  const width = 800;
  const height = 1400;

  // Resize coffee beans to cover width and bottom 65% of height
  const beansResized = await sharp('public/coffee-beans-test2.jpg')
    .resize(width, Math.round(height * 0.65), { fit: 'cover' })
    .toBuffer();

  // Create an SVG gradient overlay
  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#143A2A" stop-opacity="1" />
          <stop offset="35%" stop-color="#184533" stop-opacity="0.95" />
          <stop offset="50%" stop-color="#1B4332" stop-opacity="0.65" />
          <stop offset="65%" stop-color="#1B4332" stop-opacity="0.1" />
          <stop offset="85%" stop-color="#08140F" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#050C09" stop-opacity="0.75" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
    </svg>
  `);

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 20, g: 58, b: 42, alpha: 1 }
    }
  })
  .composite([
    { input: beansResized, top: Math.round(height * 0.35), left: 0 },
    { input: svgOverlay, top: 0, left: 0 }
  ])
  .jpeg({ quality: 92 })
  .toFile('public/welcome-bg.jpg');

  console.log('Created public/welcome-bg.jpg successfully!');
}

createBg().catch(console.error);
