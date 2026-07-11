// Visual regression + a11y interaction checks for header + footer.
// Usage: `node scripts/visual-check.mjs` (dev server must run on :8080).
// Screenshots are written to ./.visual/<scenario>-<name>.png so diffs are obvious.
//
// Scenarios cover the axes we care about staying regression-free:
//   - Real device widths (320 → 1280)
//   - Light + dark themes
//   - Windows/macOS High Contrast (forced-colors: active) at 320 + 1280
//   - Browser zoom 200% at 320 + 1280 (footer must not wrap, must stay readable)
//   - Keyboard focus on the footer rotator link (focus ring must be visible,
//     including under forced-colors)
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const URL_BASE = process.env.VC_URL ?? "http://localhost:8080/";
const OUT = resolve(".visual");

// Baseline device matrix (light theme, no zoom, no forced-colors).
const DEVICES = [
  { name: "xs-320", width: 320, height: 720 },
  { name: "android-360", width: 360, height: 800 },
  { name: "iphone-375", width: 375, height: 812 },
  { name: "iphone-390", width: 390, height: 844 },
  { name: "android-411", width: 411, height: 869 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 900 },
];

// Extra a11y-critical scenarios: forced-colors + browser zoom 200%.
// Footer must never wrap regardless of theme/zoom/forced-colors.
const A11Y_SCENARIOS = [
  { name: "hc-320-light",       width: 320,  height: 720, dark: false, forcedColors: "active", zoom: 1 },
  { name: "hc-320-dark",        width: 320,  height: 720, dark: true,  forcedColors: "active", zoom: 1 },
  { name: "hc-1280-light",      width: 1280, height: 900, dark: false, forcedColors: "active", zoom: 1 },
  { name: "hc-1280-dark",       width: 1280, height: 900, dark: true,  forcedColors: "active", zoom: 1 },
  { name: "zoom200-320-light",  width: 320,  height: 720, dark: false, forcedColors: "none",   zoom: 2 },
  { name: "zoom200-320-dark",   width: 320,  height: 720, dark: true,  forcedColors: "none",   zoom: 2 },
  { name: "zoom200-1280-light", width: 1280, height: 900, dark: false, forcedColors: "none",   zoom: 2 },
  { name: "zoom200-1280-dark",  width: 1280, height: 900, dark: true,  forcedColors: "none",   zoom: 2 },
];

const TARGETS = [
  { name: "header", selector: "header" },
  { name: "footer", selector: "footer" },
];

// Rough upper bound: single-row footer must stay ≤ ~40 CSS px normally,
// ≤ 80 CSS px under 200% zoom (row height doubles). Anything above is a wrap.
const maxFooterHeight = (zoom) => (zoom >= 2 ? 80 : 56);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
let failures = 0;

async function runDevices() {
  for (const vp of DEVICES) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(URL_BASE, { waitUntil: "domcontentloaded" });
    for (const t of TARGETS) {
      const el = page.locator(t.selector).first();
      await el.waitFor({ state: "visible", timeout: 5000 });
      const box = await el.boundingBox();
      if (!box) throw new Error(`no box for ${t.name} @ ${vp.width}`);
      if (t.name === "footer" && box.height > maxFooterHeight(1)) {
        console.error(`FAIL footer wrapped @ ${vp.width}px (h=${box.height})`);
        failures++;
      }
      await el.screenshot({ path: `${OUT}/${vp.width}-${t.name}.png` });
      console.log(`ok ${vp.name} ${t.name} h=${box.height.toFixed(1)}`);
    }
    await ctx.close();
  }
}

async function runA11yScenarios() {
  for (const s of A11Y_SCENARIOS) {
    const ctx = await browser.newContext({
      viewport: { width: s.width, height: s.height },
      deviceScaleFactor: 2,
      colorScheme: s.dark ? "dark" : "light",
      forcedColors: s.forcedColors,
    });
    const page = await ctx.newPage();
    await page.goto(URL_BASE, { waitUntil: "domcontentloaded" });
    if (s.dark) await page.evaluate(() => document.documentElement.classList.add("dark"));
    if (s.zoom !== 1) await page.evaluate((z) => { document.documentElement.style.zoom = String(z); }, s.zoom);
    await page.waitForTimeout(400);

    const footer = page.locator("footer").first();
    await footer.waitFor({ state: "visible" });
    const box = await footer.boundingBox();
    const cap = maxFooterHeight(s.zoom);
    if (box.height > cap) {
      console.error(`FAIL footer wrapped in ${s.name} (h=${box.height}, cap=${cap})`);
      failures++;
    }
    await footer.screenshot({ path: `${OUT}/${s.name}-footer.png` });

    // Keyboard focus: tab to the active rotator link and verify the outline
    // is actually painted (non-empty outlineWidth on the focused element).
    const link = page.locator(".afd-item.active").first();
    await link.focus();
    await page.waitForTimeout(150);
    const focus = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || !el.classList.contains("afd-item")) return { ok: false, reason: "not focused" };
      const cs = getComputedStyle(el);
      const width = parseFloat(cs.outlineWidth);
      return { ok: width >= 1 && cs.outlineStyle !== "none", width, style: cs.outlineStyle, color: cs.outlineColor };
    });
    if (!focus.ok) {
      console.error(`FAIL focus ring missing in ${s.name}:`, focus);
      failures++;
    }
    await footer.screenshot({ path: `${OUT}/${s.name}-footer-focus.png` });
    console.log(`ok ${s.name} footer h=${box.height.toFixed(1)} focus=${focus.width}px ${focus.style}`);
    await ctx.close();
  }
}

try {
  await runDevices();
  await runA11yScenarios();
} finally {
  await browser.close();
}

if (failures > 0) {
  console.error(`\n${failures} visual/a11y regression(s) detected — see ./.visual/`);
  process.exit(1);
}
console.log("\nAll visual + a11y scenarios passed.");
