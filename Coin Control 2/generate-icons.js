#!/usr/bin/env node
/* ============================================================
   generate-icons.js
   Run this once to generate all required app icons from
   a single source SVG using the 'sharp' library.

   Usage:
     npm install sharp
     node generate-icons.js

   This creates icons/icon-{size}.png for all required sizes.
   ============================================================ */

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

// Make sure the icons folder exists
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

// The SVG source for our coin icon
// Replace this with your own SVG or a real image file path
const svgSource = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background circle -->
  <rect width="512" height="512" rx="115" fill="#0f0f14"/>
  <!-- Coin emoji rendered as text -->
  <text x="256" y="360" font-size="320" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji">🪙</text>
</svg>
`);

// All icon sizes required for iOS, Android, and PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}.png`);
    await sharp(svgSource)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✓ Generated icon-${size}.png`);
  }
  console.log('\n🎉 All icons generated in /icons folder!');
}

generateIcons().catch(console.error);
