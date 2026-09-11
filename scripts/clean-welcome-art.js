const sharp = require('sharp');

async function cleanArt() {
  const meta = await sharp('public/welcome-cropped-art.jpg').metadata();
  const cropLeft = 14;
  const cropTop = 0;
  const cropWidth = meta.width - 28;
  const cropHeight = meta.height - 25;

  const topCover = Buffer.from(`
    <svg width="${cropWidth}" height="${cropHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${cropWidth}" height="120" fill="#0e3f2a" />
    </svg>
  `);

  await sharp('public/welcome-cropped-art.jpg')
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .composite([{ input: topCover, top: 0, left: 0 }])
    .jpeg({ quality: 95 })
    .toFile('public/welcome-clean-bg.jpg');

  console.log('Successfully created public/welcome-clean-bg.jpg!');
}

cleanArt().catch(console.error);
