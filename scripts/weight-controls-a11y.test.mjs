// A11y / tooltip E2E for WeightControls icon buttons.
// Verifies that Save watchlist, Refresh prices, and Sort watchlist buttons:
// 1. Have the expected aria-label attribute
// 2. Expose a visible tooltip on hover, keyboard focus, and mobile tap/focus
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
    label: "Save watchlist as template",
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

async function focusByTab(page, selector) {
  // Start focus from the document body and tab until the target is focused.
  await page.evaluate(() => {
    if (document.body?.focus) document.body.focus();
  });
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(
      (sel) => document.querySelector(sel) === document.activeElement,
      selector,
    );
    if (focused) return true;
  }
  return false;
}

async function runScenario(s) {
  const isMobile = s.width < 768;
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: 2,
    colorScheme: s.dark ? "dark" : "light",
    hasTouch: isMobile,
  });
  const page = await ctx.newPage();

  // First load lets the app hydrate and persist its default empty basket.
  await page.goto(URL_BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  // Seed a watchlist so WeightControls (and the Save button) render on reload.
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
  if (s.dark) {
    await page.evaluate(() => document.documentElement.classList.add("dark"));
  }
  await page.waitForTimeout(1200);

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
    let iconHidden = null;
    let hoverTooltip = null;
    let focusTooltip = null;
    let tapTooltip = null;
    let hoverOk = false;
    let focusOk = false;
    let tapOk = false;

    if (exists) {
      ariaLabel = await locator.getAttribute("aria-label");
      srText = await locator.locator(".sr-only").textContent().catch(() => null);
      iconHidden = await locator.locator("svg").first().getAttribute("aria-hidden").catch(() => null);

      // Hover tooltip.
      await locator.hover();
      await page.waitForTimeout(150);
      hoverTooltip = await visibleTooltipText(page);
      hoverOk = hoverTooltip?.includes(t.expectedTooltip) ?? false;

      await page.mouse.move(0, 0);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Keyboard focus tooltip via Tab navigation (focus-visible).
      const focused = await focusByTab(page, t.selector);
      await page.waitForTimeout(400);
      focusTooltip = await visibleTooltipText(page);
      focusOk = focused && (focusTooltip?.includes(t.expectedTooltip) ?? false);

      await page.keyboard.press("Escape");
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
      await page.waitForTimeout(300);

      // Mobile tap: simulate real touch by dispatching pointerdown (matches app's
      // onPointerDown focus handler) without firing click side-effects that would
      // dismiss the tooltip via re-render/dialog. Runs on all scenarios so we
      // regression-guard focus-on-tap for desktop touch devices too.
      await locator.dispatchEvent("pointerdown", { pointerType: "touch" });
      await page.waitForTimeout(400);
      tapTooltip = await visibleTooltipText(page);
      tapOk = tapTooltip?.includes(t.expectedTooltip) ?? false;

      await page.keyboard.press("Escape");
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
      await page.waitForTimeout(300);

      const shot = `${OUT}/${s.name}-${t.key}.png`;
      await locator.screenshot({ path: shot });
      scenarioResult.screenshots.push({ key: t.key, path: rel(shot) });
    }

    const testOk =
      exists &&
      ariaLabel === t.label &&
      srText === t.label &&
      iconHidden === "true" &&
      hoverOk &&
      focusOk &&
      tapOk;
    if (!testOk) scenarioResult.ok = false;

    scenarioResult.tests.push({
      key: t.key,
      label: t.label,
      exists,
      ariaLabel,
      srText,
      iconHidden,
      hoverTooltip,
      focusTooltip,
      tapTooltip,
      hoverOk,
      focusOk,
      tapOk,
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
  "3. The tooltip portal text appears on **hover** and on **keyboard focus** (which also covers mobile focus/tap).",
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
