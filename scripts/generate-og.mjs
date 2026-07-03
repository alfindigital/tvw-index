// Generates the social OG image + PWA/Apple icons from inline SVG.
// The generated PNGs are committed, so this only needs re-running after a
// branding change. `sharp` is intentionally NOT a committed dependency (it's a
// heavy native module); install it ad-hoc to regenerate, e.g.:
//   bun add -d sharp && node scripts/generate-og.mjs && bun remove sharp
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PUBLIC = resolve(process.cwd(), "public");

const INDIGO = "#4f46e5";
const DEEP = "#1e1e5a";
const NIGHT = "#0a0a1a";
const TEAL = "#5eead4";

// Stacked-coin glyph (matches favicon.svg), drawn in a 64-box viewBox.
function stackGlyph({ white = "#ffffff", teal = TEAL, w = 3 } = {}) {
  return `
    <g fill="none" stroke="${white}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="32" cy="48" rx="18" ry="5.5"/>
      <path d="M14 48v-5M50 48v-5"/>
      <path d="M14 43c0 3 8 5.5 18 5.5s18-2.5 18-5.5" opacity="0.6"/>
      <ellipse cx="32" cy="36" rx="18" ry="5.5"/>
      <path d="M14 36v-5M50 36v-5"/>
    </g>
    <g fill="none" stroke="${teal}" stroke-width="${w + 0.2}" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="32" cy="24" rx="18" ry="5.5"/>
      <path d="M14 24v-5M50 24v-5"/>
      <ellipse cx="32" cy="19" rx="18" ry="5.5"/>
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
    <g transform="translate(20,20) scale(1.4)">${stackGlyph({ w: 3.2 })}</g>
  </g>
  <!-- wordmark -->
  <text x="250" y="150" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="92" font-weight="800" fill="#ffffff" letter-spacing="-2">Stack<tspan fill="${TEAL}">Cap</tspan></text>
  <text x="252" y="205" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="600" fill="#c7d2fe" letter-spacing="2">IDX WATCHLIST</text>
  <!-- tagline -->
  <text x="96" y="320" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="46" font-weight="700" fill="#ffffff">IDX watchlist, stacked by market cap.</text>
  <text x="96" y="372" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="28" font-weight="400" fill="#a5b4fc">Type ticker &#8594; get market cap, weight, &amp; TradingView formula.</text>
  <!-- formula chip -->
  <g transform="translate(96,430)">
    <rect width="1008" height="92" rx="18" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2"/>
    <text x="32" y="42" font-family="'JetBrains Mono', 'DejaVu Sans Mono', monospace" font-size="22" font-weight="600" fill="#818cf8">TRADINGVIEW FORMULA</text>
    <text x="32" y="74" font-family="'JetBrains Mono', 'DejaVu Sans Mono', monospace" font-size="26" font-weight="600" fill="#ffffff">IDX:BBCA*0.42 + IDX:BBRI*0.27 + IDX:TLKM*0.18 + IDX:BMRI*0.13</text>
  </g>
  <text x="96" y="586" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="500" fill="#8b8bb8">tvx.alfidx.my.id  ·  by @alfindigital</text>
</svg>`;

function iconSvg(size, { maskable = false } = {}) {
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
    ${stackGlyph({ w: 3.4 })}
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
