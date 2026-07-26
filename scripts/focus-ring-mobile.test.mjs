// Mobile E2E: focus-ring visibility on WeightControls icon buttons.
// For Save / Refresh / Sort on mobile viewports (light + dark + 320px):
// 1. Baseline (unfocused) computed outline + box-shadow are captured
// 2. Keyboard Tab focus produces a visible ring (outline or ring box-shadow
//    that differs from the baseline) and matches :focus-visible
// 3. Tap (pointerdown -> focus) produces the same visible ring
// 4. Element screenshots are saved for visual comparison
//
// Usage: `node scripts/focus-ring-mobile.test.mjs` (dev server on :8080).
// Screenshots + report land in ./.visual/focus-ring-mobile/.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";

const URL_BASE = process.env.VC_URL ?? "http://localhost:8080/";
const OUT = resolve(".visual/focus-ring-mobile");
await mkdir(OUT, { recursive: true });

const SCENARIOS = [
  { name: "mobile-light", width: 375, height: 812, dark: false },
  { name: "mobile-dark", width: 375, height: 812, dark: true },
  { name: "mobile-xs-light", width: 320, height: 640, dark: false },
];

const BUTTONS = [
  { key: "save", label: "Save watchlist as template" },
  { key: "refresh", label: "Refresh prices" },
  { key: "sort", label: "Sort watchlist" },
];

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH ?? "/chromium-1194/chrome-linux/chrome",
});
const results = [];
const rel = (p) => relative(OUT, p).replace(/\\/g, "/");

const ringInfo = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      outlineWidth: cs.outlineWidth,
      outlineStyle: cs.outlineStyle,
      outlineColor: cs.outlineColor,
      boxShadow: cs.boxShadow,
      focused: el === document.activeElement,
      focusVisible: (() => {
        try {
          return el.matches(":focus-visible");
        } catch {
          return false;
        }
      })(),
    };
  }, sel);

function ringVisible(info, baseline) {
  if (!info) return false;
  const outlinePx = parseFloat(info.outlineWidth || "0");
  const hasOutline = outlinePx >= 1 && info.outlineStyle !== "none";
  const shadowChanged =
    info.boxShadow !== "none" && info.boxShadow !== baseline.boxShadow && info.boxShadow.length > 0;
  return hasOutline || shadowChanged;
}

async function focusByTab(page, selector) {
  await page.evaluate(() => document.body?.focus?.());
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const hit = await page.evaluate(
      (sel) => document.querySelector(sel) === document.activeElement,
      selector,
    );
    if (hit) return true;
  }
  return false;
}

async function runScenario(s) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: 2,
    colorScheme: s.dark ? "dark" : "light",
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();

  await page.goto(URL_BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    localStorage.setItem(
      "idx-basket-v1",
      JSON.stringify({
        stocks: [
          { id: "f1", ticker: "BBCA", shares: 100, price: 0, manualShares: false, manualPrice: false, freeFloat: null },
          { id: "f2", ticker: "BBRI", shares: 200, price: 0, manualShares: false, manualPrice: false, freeFloat: null },
        ],
        lastRefresh: null,
      }),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  if (s.dark) await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(1200);

  const r = { scenario: s.name, ok: true, checks: [], screenshots: [] };
  const check = (label, pass, detail = "") => {
    if (!pass) r.ok = false;
    r.checks.push({ label, pass, detail });
  };

  for (const b of BUTTONS) {
    const sel = `button[aria-label='${b.label}']`;
    const locator = page.locator(sel);
    const exists = await locator.isVisible().catch(() => false);
    check(`${b.key}: button visible`, exists);
    if (!exists) continue;

    // Baseline (blurred).
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.waitForTimeout(150);
    const baseline = await ringInfo(page, sel);
    const basePath = `${OUT}/${s.name}-${b.key}-blur.png`;
    await locator.screenshot({ path: basePath });
    r.screenshots.push({ key: `${b.key} blur`, path: rel(basePath) });

    // Keyboard focus.
    const tabbed = await focusByTab(page, sel);
    await page.waitForTimeout(200);
    const kb = await ringInfo(page, sel);
    check(`${b.key}: reachable via Tab`, tabbed);
    check(`${b.key}: :focus-visible active on Tab`, kb?.focusVisible === true, JSON.stringify(kb));
    check(
      `${b.key}: focus ring visible on Tab`,
      ringVisible(kb, baseline),
      `outline=${kb?.outlineWidth} ${kb?.outlineStyle} shadow=${kb?.boxShadow?.slice(0, 60)}`,
    );
    const kbPath = `${OUT}/${s.name}-${b.key}-tab.png`;
    await locator.screenshot({ path: kbPath });
    r.screenshots.push({ key: `${b.key} tab`, path: rel(kbPath) });

    // Reset focus, then tap (pointerdown handler forces focus).
    await page.keyboard.press("Escape");
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.waitForTimeout(250);

    await locator.dispatchEvent("pointerdown", { pointerType: "touch" });
    await page.waitForTimeout(250);
    const tap = await ringInfo(page, sel);
    check(`${b.key}: focused after tap`, tap?.focused === true, JSON.stringify(tap));
    check(
      `${b.key}: focus ring visible on tap`,
      ringVisible(tap, baseline),
      `outline=${tap?.outlineWidth} ${tap?.outlineStyle} shadow=${tap?.boxShadow?.slice(0, 60)}`,
    );
    const tapPath = `${OUT}/${s.name}-${b.key}-tap.png`;
    await locator.screenshot({ path: tapPath });
    r.screenshots.push({ key: `${b.key} tap`, path: rel(tapPath) });

    await page.keyboard.press("Escape");
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.waitForTimeout(200);
  }

  await ctx.close();
  results.push(r);
  const failed = r.checks.filter((c) => !c.pass);
  console[r.ok ? "log" : "error"](
    `${r.ok ? "ok" : "FAIL"} ${s.name} — ${r.checks.length - failed.length}/${r.checks.length} checks passed`,
  );
  for (const c of failed) console.error(`   ↳ ${c.label} ${c.detail ? `(${c.detail})` : ""}`);
}

try {
  for (const s of SCENARIOS) await runScenario(s);
} finally {
  await browser.close();
}

const fails = results.filter((r) => !r.ok).length;
const md = [
  "# Focus ring — mobile visual/assertion E2E",
  "",
  `- Scenarios: ${results.length}`,
  `- Failing scenarios: **${fails}**`,
  "",
  "Each icon button is checked blurred, on keyboard Tab focus, and after a touch pointerdown.",
  "",
];
for (const r of results) {
  md.push(`## ${r.scenario} ${r.ok ? "✅" : "❌"}`, "", "| Check | Status | Detail |", "| --- | --- | --- |");
  for (const c of r.checks) md.push(`| ${c.label} | ${c.pass ? "✅" : "❌"} | ${(c.detail || "—").slice(0, 120)} |`);
  md.push("");
  for (const sh of r.screenshots) md.push(`- ${sh.key}: ![${sh.key}](${sh.path})`);
  md.push("");
}
await writeFile(`${OUT}/REPORT.md`, md.join("\n"), "utf8");

if (fails > 0) {
  console.error(`\n${fails} scenario(s) failed — see ${OUT}/REPORT.md`);
  process.exit(1);
}
console.log(`\nAll ${results.length} focus-ring mobile scenarios passed.`);
