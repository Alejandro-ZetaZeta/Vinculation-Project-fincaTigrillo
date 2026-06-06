// Generates Android launcher icons from faviconOficial.svg.
// Run: node scripts/generate-icons.js  (from android-shell/)
// Requires: npm install  (sharp must be present)

const sharp = require('sharp')
const fs    = require('fs')
const path  = require('path')

const SVG_SRC = path.resolve(__dirname, '../../app/public/faviconOficial.svg')
const RES_DIR = path.resolve(__dirname, '../android/app/src/main/res')

// Icon = square bitmap written to mipmap-*/ic_launcher*.png
// Foreground = transparent-bg icon for adaptive icon (108dp grid, icon centred at 72dp)
const DENSITIES = [
  { name: 'mdpi',    icon: 48,  fg: 108 },
  { name: 'hdpi',    icon: 72,  fg: 162 },
  { name: 'xhdpi',   icon: 96,  fg: 216 },
  { name: 'xxhdpi',  icon: 144, fg: 324 },
  { name: 'xxxhdpi', icon: 192, fg: 432 },
]

// SVG source uses fill="#000000"; rewrite to white so it shows on dark background
const rawSvg     = fs.readFileSync(SVG_SRC, 'utf8')
const whiteSvg   = rawSvg.replace(/fill="#000000"/g, 'fill="#FFFFFF"')
const svgBuf     = Buffer.from(whiteSvg)

// Background colour matches the app's primary dark green
const BG = '#0f3d2e'

async function makeIconPng(size) {
  const iconPad   = Math.round(size * 0.12)
  const innerSize = size - iconPad * 2

  const bg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
       <rect width="${size}" height="${size}" fill="${BG}" rx="${Math.round(size * 0.22)}"/>
     </svg>`
  )

  const iconResized = await sharp(svgBuf)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  return sharp(bg)
    .composite([{ input: iconResized, left: iconPad, top: iconPad }])
    .png()
    .toBuffer()
}

async function makeForegroundPng(fgSize) {
  // Adaptive icon foreground: icon centred on 72/108 safe zone, rest transparent
  const safeZone  = Math.round(fgSize * (72 / 108))
  const padding   = Math.round((fgSize - safeZone) / 2)

  const iconBuf = await sharp(svgBuf)
    .resize(safeZone, safeZone, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  return sharp({
    create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: iconBuf, left: padding, top: padding }])
    .png()
    .toBuffer()
}

async function main() {
  for (const { name, icon, fg } of DENSITIES) {
    const dir = path.join(RES_DIR, `mipmap-${name}`)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const iconBuf = await makeIconPng(icon)
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'),       iconBuf)
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), iconBuf)

    const fgBuf = await makeForegroundPng(fg)
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fgBuf)

    console.log(`✓ mipmap-${name}  (${icon}px icon, ${fg}px foreground)`)
  }

  console.log('\nDone. Rebuild the APK to pick up the new icons.')
}

main().catch(err => { console.error(err); process.exit(1) })
