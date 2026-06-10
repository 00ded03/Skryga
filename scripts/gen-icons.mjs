import sharp from 'sharp'
import { writeFileSync } from 'fs'

// Skryga logo SVG — golden coin with S, green leaves on top
function makeSVG(size) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.42
  const leafScale = size / 512
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="coinGrad" cx="42%" cy="38%" r="60%">
      <stop offset="0%" stop-color="#FFE066"/>
      <stop offset="60%" stop-color="#F5C518"/>
      <stop offset="100%" stop-color="#C8920A"/>
    </radialGradient>
    <radialGradient id="coinEdge" cx="50%" cy="50%" r="50%">
      <stop offset="80%" stop-color="transparent"/>
      <stop offset="100%" stop-color="#A07208" stop-opacity="0.5"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="${size*0.04}" stdDeviation="${size*0.04}" flood-color="#8B6200" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Background transparent -->
  <!-- Coin body -->
  <circle cx="${cx}" cy="${cy + size*0.05}" r="${r}" fill="url(#coinGrad)" filter="url(#shadow)"/>
  <circle cx="${cx}" cy="${cy + size*0.05}" r="${r}" fill="url(#coinEdge)"/>
  <!-- Coin rim highlight -->
  <circle cx="${cx}" cy="${cy + size*0.05}" r="${r}" fill="none" stroke="#FFE880" stroke-width="${size*0.012}"/>

  <!-- S letter -->
  <text x="${cx}" y="${cy + size*0.09}"
    font-family="Georgia, serif"
    font-size="${size * 0.38}"
    font-weight="bold"
    fill="#7A4F00"
    text-anchor="middle"
    dominant-baseline="middle"
    opacity="0.25">S</text>
  <text x="${cx}" y="${cy + size*0.08}"
    font-family="Georgia, serif"
    font-size="${size * 0.38}"
    font-weight="bold"
    fill="#5C3800"
    text-anchor="middle"
    dominant-baseline="middle">S</text>

  <!-- Left leaf -->
  <g transform="translate(${cx}, ${cy - r * 0.82}) scale(${leafScale})">
    <ellipse cx="-28" cy="-38" rx="22" ry="42"
      fill="#3A7D44"
      transform="rotate(-30, -28, -38)"/>
    <ellipse cx="-28" cy="-38" rx="10" ry="36"
      fill="#4CAF50"
      transform="rotate(-30, -28, -38)"/>
    <!-- Leaf vein -->
    <line x1="-28" y1="-8" x2="-28" y2="-62"
      stroke="#2D6B36" stroke-width="2.5" stroke-linecap="round"
      transform="rotate(-30, -28, -38)"/>
  </g>
  <!-- Right leaf -->
  <g transform="translate(${cx}, ${cy - r * 0.82}) scale(${leafScale})">
    <ellipse cx="28" cy="-38" rx="22" ry="42"
      fill="#3A7D44"
      transform="rotate(30, 28, -38)"/>
    <ellipse cx="28" cy="-38" rx="10" ry="36"
      fill="#4CAF50"
      transform="rotate(30, 28, -38)"/>
    <line x1="28" y1="-8" x2="28" y2="-62"
      stroke="#2D6B36" stroke-width="2.5" stroke-linecap="round"
      transform="rotate(30, 28, -38)"/>
  </g>
  <!-- Stem -->
  <rect x="${cx - size*0.012}" y="${cy - r * 0.9}"
    width="${size*0.024}" height="${size*0.12}"
    rx="${size*0.01}" fill="#3A7D44"/>
</svg>`
}

async function generate() {
  const sizes = [192, 512]
  for (const sz of sizes) {
    const svg = Buffer.from(makeSVG(sz))
    await sharp(svg)
      .png()
      .toFile(`public/icon-${sz}.png`)
    console.log(`Generated icon-${sz}.png`)
  }

  // Apple touch icon (180x180)
  const svg180 = Buffer.from(makeSVG(180))
  await sharp(svg180)
    .png()
    .toFile('public/apple-touch-icon.png')
  console.log('Generated apple-touch-icon.png')

  // Favicon 32x32
  const svg32 = Buffer.from(makeSVG(32))
  await sharp(svg32)
    .png()
    .toFile('public/favicon.png')
  console.log('Generated favicon.png')
}

generate().catch(console.error)
