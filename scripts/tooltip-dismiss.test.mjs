// Tooltip lifecycle E2E for the WeightControls icon buttons.
//
// For each of Refresh / Sort / Save the test asserts:
// 1. Idle: no visible tooltip
// 2. Keyboard focus (Tab) -> tooltip visible with the expected copy
// 3. Blur -> tooltip gone
// 4. Tap (pointerdown, touch) -> tooltip visible again
// 5. Escape -> tooltip gone
// 6. Focus again, then click an outside area -> tooltip gone
//
// Usage: `node scripts/tooltip-dismiss.test.mjs` (dev server on :8080).
// Report: ./.visual/tooltip-dismiss/REPORT.md
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const URL_BASE = process.env.VC_URL ?? "http://localhost:8080/";
const OUT = resolve(".visual/tooltip-dismiss");
await mkdir(OUT, { recursive: true });

const SCENARIOS = [
  { name: "mobile-light", width: 375, height: 812, dark: false, mobile: true },
  { name: "mobile-dark", width: 375, height: 812, dark: true, mobile: true },
  { name: "desktop-light", width: 1280, height: 900, dark: false, mobile: false },
];

const BUTTONS = [
  { key: "refresh", label: "Refresh prices", tip: /refresh prices/i },
  // Sort is a dropdown trigger: tapping opens the menu, so its tap phase is skipped.
  { key: "sort", label: "Sort watchlist", tip: /sort watchlist/i, skipTap: true },
  { key: "save", label: "Save watchlist as template", tip: /save watchlist/i },
];

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH ?? "/chromium-1194/chrome-linux/chrome",
});
const results = [];

/** Text of any currently visible Radix tooltip, or null. */
async function visibleTooltip(page) {
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("[role='tooltip']"));
    for (const n of nodes) {
      const r = n.getBoundingClientRect();
      const cs = getComputedStyle(n);
      const shown = r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.opacity !== "0";
      if (shown) return (n.textContent ?? "").trim();
    }
    return null;
  });
}

async function focusByTab(page, selector) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    document.body.tabIndex = -1;
    document.body.focus();
  });
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const hit = await page.evaluate((sel) => document.querySelector(sel) === document.activeElement, selector);
    if (hit) return true;
  }
  return false;
}

async function blurAll(page) {
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
  await page.mouse.move(2, 2);
  await page.waitForTimeout(400);
}

async function runScenario(s) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    colorScheme: s.dark ? "dark" : "light",
    hasTouch: s.mobile,
    isMobile: s.mobile,
    deviceScaleFactor: s.mobile ? 2 : 1,
  });
  const page = await ctx.newPage();

  await page.goto(URL_BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    localStorage.setItem(
      "idx-basket-v1",
      JSON.stringify({
        stocks: [
          { id: "t1", ticker: "BBCA", shares: 100, price: 0, manualShares: false, manualPrice: false, freeFloat: null },
          { id: "t2", ticker: "BBRI", shares: 200, price: 0, manualShares: false, manualPrice: false, freeFloat: null },
        ],
        lastRefresh: null,
      }),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  if (s.dark) await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(1200);

  const r = { scenario: s.name, ok: true, checks: [] };
  const check = (label, pass, detail = "") => {
    if (!pass) r.ok = false;
    r.checks.push({ label, pass, detail });
  };

  for (const b of BUTTONS) {
    const sel = `button[aria-label='${b.label}']`;
    const locator = page.locator(sel);
    const exists = await locator
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    check(`${b.key}: button visible`, exists);
    if (!exists) continue;

    // 1. Idle
    await blurAll(page);
    check(`${b.key}: no tooltip at idle`, (await visibleTooltip(page)) === null);

    // 2. Focus shows tooltip
    const tabbed = await focusByTab(page, sel);
    check(`${b.key}: reachable via Tab`, tabbed);
    await page.waitForTimeout(300);
    let tip = await visibleTooltip(page);
    check(`${b.key}: tooltip visible on focus`, !!tip && b.tip.test(tip), `text="${tip}"`);

    // 3. Blur hides tooltip
    await blurAll(page);
    tip = await visibleTooltip(page);
    check(`${b.key}: tooltip hidden after blur`, tip === null, `text="${tip}"`);

    if (!b.skipTap) {
      // 4. Tap shows tooltip
      await locator.dispatchEvent("pointerdown", { pointerType: "touch" });
      await page.waitForTimeout(350);
      tip = await visibleTooltip(page);
      check(`${b.key}: tooltip visible on tap`, !!tip && b.tip.test(tip), `text="${tip}"`);
    }

    // 5. Outside click hides tooltip
    if (b.skipTap) {
      await focusByTab(page, sel);
      await page.waitForTimeout(300);
      tip = await visibleTooltip(page);
      check(`${b.key}: tooltip visible before outside click`, !!tip && b.tip.test(tip), `text="${tip}"`);
    }
    await page.mouse.click(5, 5);
    await page.waitForTimeout(400);
    tip = await visibleTooltip(page);
    check(`${b.key}: tooltip hidden after outside click`, tip === null, `text="${tip}"`);

    // 6. Escape hides tooltip
    await blurAll(page);
    await focusByTab(page, sel);
    await page.waitForTimeout(300);
    tip = await visibleTooltip(page);
    check(`${b.key}: tooltip re-opens on focus`, !!tip && b.tip.test(tip), `text="${tip}"`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);
    tip = await visibleTooltip(page);
    check(`${b.key}: tooltip hidden after Escape`, tip === null, `text="${tip}"`);

    await page.keyboard.press("Escape").catch(() => {});
    await blurAll(page);
  }

  await ctx.close();
  results.push(r);
  const failed = r.checks.filter((c) => !c.pass);
  console[r.ok ? "log" : "error"](
    `${r.ok ? "ok" : "FAIL"} ${s.name} — ${r.checks.length - failed.length}/${r.checks.length} checks passed`,
  );
  for (const c of failed) console.error(`   ↳ ${c.label} ${c.detail ? `(${c.detail.slice(0, 160)})` : ""}`);
}

try {
  for (const s of SCENARIOS) await runScenario(s);
} finally {
  await browser.close();
}

const fails = results.filter((r) => !r.ok).length;
const md = ["# Tooltip show/dismiss E2E", "", `- Scenarios: ${results.length}`, `- Failing scenarios: **${fails}**`, ""];
for (const r of results) {
  md.push(`## ${r.scenario} ${r.ok ? "✅" : "❌"}`, "", "| Check | Status | Detail |", "| --- | --- | --- |");
  for (const c of r.checks) md.push(`| ${c.label} | ${c.pass ? "✅" : "❌"} | ${(c.detail || "—").slice(0, 120)} |`);
  md.push("");
}
await writeFile(`${OUT}/REPORT.md`, md.join("\n"), "utf8");

if (fails > 0) {
  console.error(`\n${fails} scenario(s) failed — see ${OUT}/REPORT.md`);
  process.exit(1);
}
console.log(`\nAll ${results.length} tooltip dismiss scenarios passed.`);
