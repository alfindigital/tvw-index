// Visual regression helper for header + footer across real device widths.
// Usage: `node scripts/visual-check.mjs` (dev server must run on :8080).
// Screenshots are written to ./.visual/<width>-<name>.png so diffs are obvious.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const URL_BASE = process.env.VC_URL ?? "http://localhost:8080/";
const OUT = resolve(".visual");

// Real devices we care about, incl. tiny Android & modern iPhones.
const VIEWPORTS = [
  { name: "xs-320", width: 320, height: 720 },   // legacy Android
  { name: "android-360", width: 360, height: 800 },
  { name: "iphone-375", width: 375, height: 812 }, // iPhone SE / 13 mini
  { name: "iphone-390", width: 390, height: 844 }, // iPhone 14
  { name: "android-411", width: 411, height: 869 }, // Pixel-class
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 900 },
];

const TARGETS = [
  { name: "header", selector: "header" },
  { name: "footer", selector: "footer" },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
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
      // Guard: footer must never wrap — height should stay within one row band.
      if (t.name === "footer" && box.height > 56) {
        console.error(`FAIL footer wrapped @ ${vp.width}px (h=${box.height})`);
        process.exitCode = 1;
      }
      await el.screenshot({ path: `${OUT}/${vp.width}-${t.name}.png` });
      console.log(`ok ${vp.name} ${t.name} h=${box.height.toFixed(1)}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
