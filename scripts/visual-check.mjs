// Visual regression + a11y interaction checks for header + footer.
// Usage: `node scripts/visual-check.mjs` (dev server must run on :8080).
// Screenshots + a Markdown summary are written to ./.visual/.
//
// Scenarios cover the axes we care about staying regression-free:
//   - Real device widths (320 → 1280)
//   - Light + dark themes
//   - Windows/macOS High Contrast (forced-colors: active) at 320 + 1280
//   - Browser zoom 200% at 320 + 1280
//   - Footer must not wrap in any scenario
//   - Every rotator link must show a visible focus ring under keyboard nav,
//     including forced-colors + zoom 200%, at both 320px and 1280px.
//   - Full arrow-key rotator navigation reaches every link.
//
// A Markdown summary is written to ./.visual/REPORT.md so PR reviewers can
// scan pass/fail + preview screenshots in one place.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";

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
const A11Y_SCENARIOS = [
  { name: "hc-320-light", width: 320, height: 720, dark: false, forcedColors: "active", zoom: 1 },
  { name: "hc-320-dark", width: 320, height: 720, dark: true, forcedColors: "active", zoom: 1 },
  { name: "hc-1280-light", width: 1280, height: 900, dark: false, forcedColors: "active", zoom: 1 },
  { name: "hc-1280-dark", width: 1280, height: 900, dark: true, forcedColors: "active", zoom: 1 },
  {
    name: "zoom200-320-light",
    width: 320,
    height: 720,
    dark: false,
    forcedColors: "none",
    zoom: 2,
  },
  { name: "zoom200-320-dark", width: 320, height: 720, dark: true, forcedColors: "none", zoom: 2 },
  {
    name: "zoom200-1280-light",
    width: 1280,
    height: 900,
    dark: false,
    forcedColors: "none",
    zoom: 2,
  },
  {
    name: "zoom200-1280-dark",
    width: 1280,
    height: 900,
    dark: true,
    forcedColors: "none",
    zoom: 2,
  },
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

// Structured results feed the Markdown summary at the end.
const results = [];
const rel = (p) => relative(OUT, p).replace(/\\/g, "/");
const record = (r) => {
  results.push(r);
  const tag = r.status === "pass" ? "ok" : "FAIL";
  const extra = r.detail ? ` — ${r.detail}` : "";
  console[r.status === "pass" ? "log" : "error"](`${tag} ${r.scenario} · ${r.check}${extra}`);
};

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
      const shot = `${OUT}/${vp.width}-${t.name}.png`;
      await el.screenshot({ path: shot });
      const wrapped = t.name === "footer" && box.height > maxFooterHeight(1);
      record({
        scenario: vp.name,
        check: `${t.name} render (${vp.width}px)`,
        status: wrapped ? "fail" : "pass",
        detail: `h=${box.height.toFixed(1)}px`,
        screenshot: rel(shot),
      });
    }
    await ctx.close();
  }
}

// Extract the number of rotator links from the DOM.
async function rotatorCount(page) {
  return page.locator(".afd-rot .afd-item").count();
}

// Focus a specific rotator link by index using the app's arrow-key nav so we
// exercise the keyboard path users actually take under forced-colors / zoom.
async function focusRotator(page, targetIdx) {
  // Focus the currently-active link first.
  await page.locator(".afd-item.active").first().focus();
  const startIdx = await page.evaluate(() =>
    Number(document.activeElement?.getAttribute("data-rotator-index") ?? 0),
  );
  const diff = targetIdx - startIdx;
  const key = diff >= 0 ? "ArrowRight" : "ArrowLeft";
  for (let i = 0; i < Math.abs(diff); i++) {
    await page.keyboard.press(key);
  }
  await page.waitForTimeout(120);
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || !el.classList.contains("afd-item")) {
      return { ok: false, reason: "focus lost", idx: -1 };
    }
    const cs = getComputedStyle(el);
    return {
      ok: true,
      idx: Number(el.getAttribute("data-rotator-index") ?? -1),
      label: el.getAttribute("aria-label") ?? "",
      outlineWidth: parseFloat(cs.outlineWidth),
      outlineStyle: cs.outlineStyle,
      outlineColor: cs.outlineColor,
    };
  });
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
    if (s.zoom !== 1)
      await page.evaluate((z) => {
        document.documentElement.style.zoom = String(z);
      }, s.zoom);
    await page.waitForTimeout(400);

    // 1. Footer must not wrap.
    const footer = page.locator("footer").first();
    await footer.waitFor({ state: "visible" });
    const box = await footer.boundingBox();
    const cap = maxFooterHeight(s.zoom);
    const wrapShot = `${OUT}/${s.name}-footer.png`;
    await footer.screenshot({ path: wrapShot });
    record({
      scenario: s.name,
      check: "footer no-wrap",
      status: box.height > cap ? "fail" : "pass",
      detail: `h=${box.height.toFixed(1)}px cap=${cap}px`,
      screenshot: rel(wrapShot),
    });

    // 2. Landmark check — footer must expose the contentinfo landmark
    //    with an accessible name so screen readers can jump to it.
    const landmark = await page.evaluate(() => {
      const f = document.querySelector("footer");
      if (!f) return { ok: false, reason: "no <footer>" };
      const role = f.getAttribute("role");
      const label = f.getAttribute("aria-label") || f.getAttribute("aria-labelledby");
      // <footer> at the top level is implicitly role=contentinfo.
      return { ok: !!label && (role === null || role === "contentinfo"), role, label };
    });
    record({
      scenario: s.name,
      check: "footer landmark",
      status: landmark.ok ? "pass" : "fail",
      detail: `label=${landmark.label ?? "∅"} role=${landmark.role ?? "contentinfo (implicit)"}`,
    });

    // 3. Heading structure — header/footer must NOT inject stray h1-h6
    //    that break outline in forced-colors / zoom.
    const stray = await page.evaluate(() => {
      const inside = (sel) =>
        Array.from(document.querySelectorAll(`${sel} :is(h1,h2,h3,h4,h5,h6)`)).map(
          (h) => `${h.tagName.toLowerCase()}:${h.textContent?.trim().slice(0, 20)}`,
        );
      return { header: inside("header"), footer: inside("footer") };
    });
    const strayCount = stray.header.length + stray.footer.length;
    record({
      scenario: s.name,
      check: "no stray headings in header/footer",
      status: strayCount === 0 ? "pass" : "fail",
      detail: strayCount === 0 ? "0 headings" : JSON.stringify(stray),
    });

    // 4. Every rotator link must show a visible focus ring when reached
    //    via arrow-key navigation, in this scenario.
    const count = await rotatorCount(page);
    for (let idx = 0; idx < count; idx++) {
      const focus = await focusRotator(page, idx);
      const ok =
        focus.ok && focus.idx === idx && focus.outlineWidth >= 1 && focus.outlineStyle !== "none";
      const shot = `${OUT}/${s.name}-focus-${idx}.png`;
      await footer.screenshot({ path: shot });
      record({
        scenario: s.name,
        check: `rotator link ${idx} (${focus.label || "?"}) focus ring`,
        status: ok ? "pass" : "fail",
        detail: focus.ok
          ? `outline=${focus.outlineWidth}px ${focus.outlineStyle} ${focus.outlineColor}`
          : (focus.reason ?? "unknown"),
        screenshot: rel(shot),
      });
    }
    await ctx.close();
  }
}

try {
  await runDevices();
  await runA11yScenarios();
} finally {
  await browser.close();
}

// -------- Markdown summary --------
const failures = results.filter((r) => r.status === "fail");
const grouped = results.reduce((acc, r) => {
  (acc[r.scenario] ??= []).push(r);
  return acc;
}, {});
const lines = [
  `# Visual + a11y report`,
  ``,
  `- Scenarios: ${Object.keys(grouped).length}`,
  `- Checks: ${results.length}`,
  `- Failures: **${failures.length}**`,
  ``,
];
for (const [scenario, rows] of Object.entries(grouped)) {
  lines.push(`## ${scenario}`);
  lines.push(``);
  lines.push(`| Status | Check | Detail | Screenshot |`);
  lines.push(`| --- | --- | --- | --- |`);
  for (const r of rows) {
    const badge = r.status === "pass" ? "✅ pass" : "❌ **fail**";
    const shot = r.screenshot ? `![shot](${r.screenshot})` : "—";
    lines.push(`| ${badge} | ${r.check} | ${r.detail ?? ""} | ${shot} |`);
  }
  lines.push(``);
}
await writeFile(`${OUT}/REPORT.md`, lines.join("\n"), "utf8");

if (failures.length > 0) {
  console.error(
    `\n${failures.length} visual/a11y regression(s) detected — see ./.visual/REPORT.md`,
  );
  process.exit(1);
}
console.log(`\nAll ${results.length} checks passed — summary at ./.visual/REPORT.md`);
