// Generates the social OG image + PWA/Apple icons from inline SVG.
// Run once after branding changes:  node scripts/generate-og.mjs
// (sharp is a dev-only generator dependency, like xlsx for generate-shares.)
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PUBLIC = resolve(process.cwd(), "public");

const INDIGO = "#4f46e5";
const DEEP = "#1e1e5a";
const NIGHT = "#0a0a1a";

// Scale / timbangan glyph (matches favicon.svg), drawn in a 64-box viewBox.
function scaleGlyph(stroke = "#ffffff", w = 3.2) {
  return `
    <g fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M32 14v36"/>
      <path d="M20 50h24"/>
      <path d="M14 26l-6 10h12z"/>
      <path d="M50 26l-6 10h12z"/>
      <path d="M14 26h36"/>
    </g>`;
}

const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${NIGHT}"/>
      <stop offset="55%" stop-color="${DEEP}"/>
      <stop offset="100%" stop-color="${INDIGO}"/>
    </linearGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${INDIGO}"/>
      <stop offset="100%" stop-color="${DEEP}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <!-- logo tile -->
  <g transform="translate(96,96)">
    <rect width="132" height="132" rx="30" fill="url(#tile)" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>
    <g transform="translate(20,20) scale(1.4)">${scaleGlyph("#ffffff", 3.4)}</g>
  </g>
  <!-- wordmark -->
  <text x="250" y="150" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="92" font-weight="800" fill="#ffffff" letter-spacing="-2">Index<tspan fill="#c7d2fe">W</tspan></text>
  <text x="252" y="205" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="600" fill="#c7d2fe" letter-spacing="2">SAHAM IDX</text>
  <!-- tagline -->
  <text x="96" y="320" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="46" font-weight="700" fill="#ffffff">Watchlist saham IDX, dibobotin market cap.</text>
  <text x="96" y="372" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="28" font-weight="400" fill="#a5b4fc">Ketik ticker &#8594; dapat market cap, bobot, &amp; formula TradingView.</text>
  <!-- formula chip -->
  <g transform="translate(96,430)">
    <rect width="1008" height="92" rx="18" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2"/>
    <text x="32" y="42" font-family="'JetBrains Mono', 'DejaVu Sans Mono', monospace" font-size="22" font-weight="600" fill="#818cf8">TRADINGVIEW FORMULA</text>
    <text x="32" y="74" font-family="'JetBrains Mono', 'DejaVu Sans Mono', monospace" font-size="26" font-weight="600" fill="#ffffff">IDX:BBCA*0.42 + IDX:BBRI*0.27 + IDX:TLKM*0.18 + IDX:BMRI*0.13</text>
  </g>
  <text x="96" y="586" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="500" fill="#8b8bb8">tv-weight-index.lovable.app  ·  by @alfindigital</text>
</svg>`;

function iconSvg(size, { maskable = false } = {}) {
  // Full-bleed rounded square (no transparent corners) so the icon works as
  // both "any" and "maskable". Maskable keeps the glyph inside the safe zone.
  const pad = maskable ? 0.14 : 0.08;
  const inner = 1 - pad * 2;
  const radius = size * 0.2;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${INDIGO}"/>
      <stop offset="100%" stop-color="${DEEP}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
  <g transform="translate(${size * (0.5 - inner * 0.5)}, ${size * (0.5 - inner * 0.5)}) scale(${(size / 64) * inner})">
    ${scaleGlyph("#ffffff", 3.6)}
  </g>
</svg>`;
}

async function render(svg, outName, width, height) {
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const out = resolve(PUBLIC, outName);
  writeFileSync(out, buf);
  console.log(`✓ ${outName} (${width}x${height})`);
}

await render(ogSvg, "og-image.png", 1200, 630);
await render(iconSvg(512, { maskable: true }), "icon-512.png", 512, 512);
await render(iconSvg(192, { maskable: true }), "icon-192.png", 192, 192);
await render(iconSvg(180), "apple-touch-icon.png", 180, 180);
console.log("Done.");
