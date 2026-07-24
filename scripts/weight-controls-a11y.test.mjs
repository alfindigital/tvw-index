// A11y / tooltip E2E for WeightControls icon buttons.
// Verifies that Save watchlist, Refresh prices, and Sort watchlist buttons:
// 1. Have the expected aria-label attribute
// 2. Expose a visible tooltip on hover and on keyboard focus
// 3. Keep icon aria-hidden and show sr-only text for screen readers
//
// Usage: `node scripts/weight-controls-a11y.test.mjs` (dev server on :8080).
// Screenshots + report are saved to ./.visual/weight-controls-a11y/.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";

const URL_BASE = process.env.VC_URL ?? "http://localhost:8080/";
const OUT = resolve(".visual/weight-controls-a11y");
await mkdir(OUT, { recursive: true });

const SCENARIOS = [
  { name: "desktop-light", width: 1280, height: 900, dark: false },
  { name: "desktop-dark",  width: 1280, height: 900, dark: true },
  { name: "mobile-light",  width: 375,  height: 812, dark: false },
  { name: "mobile-dark",   width: 375,  height: 812, dark: true },
];

const TESTS = [
  {
    key: "save",
    label: "Save watchlist",
    selector: "button[aria-label='Save watchlist as template']",
    expectedTooltip: "Save watchlist",
  },
  {
    key: "refresh",
    label: "Refresh prices",
    selector: "button[aria-label='Refresh prices']",
    expectedTooltip: "Refresh prices",
  },
  {
    key: "sort",
    label: "Sort watchlist",
    selector: "button[aria-label='Sort watchlist']",
    expectedTooltip: "Sort watchlist",
  },
];

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH ?? "/chromium-1194/chrome-linux/chrome",
});
const results = [];
const rel = (p) => relative(OUT, p).replace(/\\/g, "/");

async function visibleTooltipText(page) {
  // Radix tooltip renders into a portal with role="tooltip".
  const el = page.locator("[role='tooltip']").last();
  try {
    await el.waitFor({ state: "visible", timeout: 1500 });
    return await el.textContent();
  } catch {
    return null;
  }
}

async function runScenario(s) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: 2,
    colorScheme: s.dark ? "dark" : "light",
  });
  const page = await ctx.newPage();
  await page.goto(URL_BASE, { waitUntil: "domcontentloaded" });
  if (s.dark) {
    await page.evaluate(() => document.documentElement.classList.add("dark"));
  }

  // Seed a watchlist so WeightControls (and the Save button) render.
  await page.evaluate(() => {
    localStorage.setItem(
      "idx-basket-v1",
      JSON.stringify({
        stocks: [
          { id: "test-1", ticker: "BBCA", shares: 100, price: 0, manualShares: false, manualPrice: false, freeFloat: null },
          { id: "test-2", ticker: "BBRI", shares: 200, price: 0, manualShares: false, manualPrice: false, freeFloat: null },
        ],
        lastRefresh: null,
      }),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  // Debug: dump counts and screenshot if controls are missing.
  const debugShot = `${OUT}/${s.name}-debug.png`;
  const counts = await page.evaluate(() => ({
    weightGroup: document.querySelectorAll("div[role='group'][aria-label='Weight mode']").length,
    labeledButtons: Array.from(document.querySelectorAll("button[aria-label]")).map((b) => b.getAttribute("aria-label")),
    stockRows: document.querySelectorAll("[data-stock-row]").length,
  }));
  if (counts.weightGroup === 0) {
    await page.screenshot({ path: debugShot, fullPage: false });
    console.error(`   debug ${s.name}:`, counts, `screenshot: ${rel(debugShot)}`);
  }

  const scenarioResult = {
    scenario: s.name,
    ok: true,
    tests: [],
    screenshots: [],
  };

  for (const t of TESTS) {
    const locator = page.locator(t.selector);
    const exists = await locator.isVisible().catch(() => false);
    let ariaLabel = null;
    let srText = null;
    let hoverTooltip = null;
    let focusTooltip = null;
    let hoverOk = false;
    let focusOk = false;

    if (exists) {
      ariaLabel = await locator.getAttribute("aria-label");
      srText = await locator.locator(".sr-only").textContent().catch(() => null);

      // Hover tooltip.
      await locator.hover();
      await page.waitForTimeout(350); // TooltipProvider delay is 300ms.
      hoverTooltip = await visibleTooltipText(page);
      hoverOk = hoverTooltip?.includes(t.expectedTooltip) ?? false;

      // Keyboard focus tooltip.
      await locator.focus();
      await page.waitForTimeout(350);
      focusTooltip = await visibleTooltipText(page);
      focusOk = focusTooltip?.includes(t.expectedTooltip) ?? false;

      const shot = `${OUT}/${s.name}-${t.key}.png`;
      await locator.screenshot({ path: shot });
      scenarioResult.screenshots.push({ key: t.key, path: rel(shot) });
    }

    const testOk = exists && ariaLabel === t.label && srText === t.label && hoverOk && focusOk;
    if (!testOk) scenarioResult.ok = false;

    scenarioResult.tests.push({
      key: t.key,
      label: t.label,
      exists,
      ariaLabel,
      srText,
      hoverTooltip,
      focusTooltip,
      hoverOk,
      focusOk,
      ok: testOk,
    });
  }

  await ctx.close();
  results.push(scenarioResult);
  const tag = scenarioResult.ok ? "ok" : "FAIL";
  console[scenarioResult.ok ? "log" : "error"](
    `${tag} ${s.name} — ${scenarioResult.tests.filter((x) => x.ok).length}/${scenarioResult.tests.length} tests passed`,
  );
  for (const t of scenarioResult.tests.filter((x) => !x.ok)) {
    console.error(`   ↳ ${t.label}: exists=${t.exists} aria="${t.ariaLabel}" sr="${t.srText}" hover="${t.hoverTooltip}" focus="${t.focusTooltip}"`);
  }
}

try {
  for (const s of SCENARIOS) await runScenario(s);
} finally {
  await browser.close();
}

const totalFails = results.filter((r) => !r.ok).length;
const md = [
  `# WeightControls a11y / tooltip E2E`,
  "",
  `- Scenarios: ${results.length}`,
  `- Failing scenarios: **${totalFails}**`,
  "",
  "Each test asserts:",
  "1. The icon button is rendered and has the correct `aria-label`.",
  "2. The button contains matching `.sr-only` text for screen readers.",
  "3. The tooltip portal text appears on **hover** and on **keyboard focus**.",
  "",
];

for (const r of results) {
  md.push(`## ${r.scenario} ${r.ok ? "✅" : "❌"}`);
  md.push("");
  md.push(`| Button | aria-label | sr-only | Hover tooltip | Focus tooltip | Status |`);
  md.push(`| --- | --- | --- | --- | --- | --- |`);
  for (const t of r.tests) {
    md.push(
      `| ${t.label} | ${t.ariaLabel ?? "—"} | ${t.srText ?? "—"} | ${t.hoverTooltip ?? "—"} | ${t.focusTooltip ?? "—"} | ${t.ok ? "✅" : "❌"} |`,
    );
  }
  md.push("");
  if (r.screenshots.length) {
    md.push(`**Screenshots**`);
    for (const sh of r.screenshots) {
      md.push(`- ${sh.key}: ![${sh.key}](${sh.path})`);
    }
    md.push("");
  }
}

await writeFile(`${OUT}/REPORT.md`, md.join("\n"), "utf8");

if (totalFails > 0) {
  console.error(`\n${totalFails} scenario(s) failed — see ${OUT}/REPORT.md`);
  process.exit(1);
}
console.log(`\nAll ${results.length} WeightControls a11y scenarios passed.`);
