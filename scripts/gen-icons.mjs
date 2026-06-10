// Generate PWA icons from the real Skryga logo source file.
// Source: public/logo skryaga.png (1254x1254)
import sharp from 'sharp'

const SRC = 'public/logo skryaga.png'
const BG = '#F7F3EE'  // matches logo background

async function generate() {
  const meta = await sharp(SRC).metadata()

  // Full logo for PWA icons (192, 512) and Apple touch icon
  for (const sz of [512, 192]) {
    await sharp(SRC).resize(sz, sz, { fit: 'contain', background: BG }).png()
      .toFile(`public/icon-${sz}.png`)
    console.log(`icon-${sz}.png`)
  }

  await sharp(SRC).resize(180, 180, { fit: 'contain', background: BG }).png()
    .toFile('public/apple-touch-icon.png')
  console.log('apple-touch-icon.png')

  // Favicon: crop to coin+leaves (top 70%) then resize to 32x32
  const cropH = Math.round(meta.height! * 0.70)
  const cropX = Math.round((meta.width! - cropH) / 2)
  await sharp(SRC)
    .extract({ left: cropX, top: 0, width: cropH, height: cropH })
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile('public/favicon.png')
  console.log('favicon.png')
}

generate().catch(console.error)
