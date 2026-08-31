// Mobile + desktop E2E: Radix tooltips must be wired to their icon button via
// aria-describedby once the button is focused (Tab) or tapped (pointerdown).
//
// For each of Refresh / Sort / Save:
// 1. Baseline: no aria-describedby pointing at a rendered tooltip
// 2. Keyboard focus -> aria-describedby appears, resolves to an existing
//    element with role="tooltip" (or data-radix-popper content) and non-empty
//    text that matches the expected tooltip copy
// 3. Tap (pointerdown, touch) -> same association holds
// 4. Blur/Escape -> association is torn down again
//
// Usage: `node scripts/tooltip-aria-describedby.test.mjs` (dev server on :8080).
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const URL_BASE = process.env.VC_URL ?? "http://localhost:8080/";
const OUT = resolve(".visual/tooltip-aria");
await mkdir(OUT, { recursive: true });

const SCENARIOS = [
  { name: "mobile-light", width: 375, height: 812, dark: false, mobile: true },
  { name: "mobile-dark", width: 375, height: 812, dark: true, mobile: true },
  { name: "desktop-light", width: 1280, height: 900, dark: false, mobile: false },
];

const BUTTONS = [
  { key: "refresh", label: "Refresh prices", tip: /refresh/i },
  // Sort opens a dropdown on pointerdown, so its tap phase is skipped.
  { key: "sort", label: "Sort watchlist", tip: /sort/i, skipTap: true },
  { key: "save", label: "Save watchlist as template", tip: /save/i },
];

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH ?? "/chromium-1194/chrome-linux/chrome",
});
const results = [];

/** Resolve aria-describedby -> described element info. */
const describedBy = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const ids = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
    const targets = ids.map((id) => {
      const t = document.getElementById(id);
      return {
        id,
        exists: !!t,
        role: t?.getAttribute("role") ?? null,
        isPopper:
          !!t?.closest("[data-radix-popper-content-wrapper]") ||
          t?.hasAttribute("data-radix-tooltip-content"),
        text: (t?.textContent ?? "").trim(),
      };
    });
    return { ids, targets };
  }, sel);

async function focusByTab(page, selector) {
  // Reset the sequential-focus starting point so Tab always walks from the top.
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    document.body.tabIndex = -1;
    document.body.focus();
  });
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const hit = await page.evaluate(
      (sel) => document.querySelector(sel) === document.activeElement,
      selector,
    );
    if (hit) return true;
  }
  return false;
}

async function clearFocus(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.evaluate(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null,
  );
  await page.mouse.move(5, 5);
  await page.waitForTimeout(350);
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
          {
            id: "t1",
            ticker: "BBCA",
            shares: 100,
            price: 0,
            manualShares: false,
            manualPrice: false,
            freeFloat: null,
          },
          {
            id: "t2",
            ticker: "BBRI",
            shares: 200,
            price: 0,
            manualShares: false,
            manualPrice: false,
            freeFloat: null,
          },
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

  const assertLinked = (phase, b, info) => {
    const ok = !!info && info.ids.length > 0;
    check(`${b.key}: aria-describedby present on ${phase}`, ok, JSON.stringify(info));
    if (!ok) return;
    const target = info.targets.find((t) => t.exists);
    check(
      `${b.key}: aria-describedby resolves to an element on ${phase}`,
      !!target,
      JSON.stringify(info.targets),
    );
    if (!target) return;
    check(
      `${b.key}: described element is a tooltip on ${phase}`,
      target.role === "tooltip" || target.isPopper,
      `role=${target.role} popper=${target.isPopper}`,
    );
    check(
      `${b.key}: tooltip text matches copy on ${phase}`,
      b.tip.test(target.text),
      `text="${target.text}"`,
    );
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

    // Baseline: nothing described yet.
    await clearFocus(page);
    const base = await describedBy(page, sel);
    check(
      `${b.key}: no tooltip association at rest`,
      !base || base.ids.length === 0 || base.targets.every((t) => !t.exists),
      JSON.stringify(base),
    );

    // Keyboard focus.
    const tabbed = await focusByTab(page, sel);
    check(`${b.key}: reachable via Tab`, tabbed);
    await page.waitForTimeout(300);
    assertLinked("focus", b, await describedBy(page, sel));

    // Teardown on blur.
    await clearFocus(page);
    const after = await describedBy(page, sel);
    check(
      `${b.key}: association removed after blur`,
      !after || after.ids.length === 0 || after.targets.every((t) => !t.exists),
      JSON.stringify(after),
    );

    if (b.skipTap) continue;

    // Tap: onPointerDown forces focus, which opens the tooltip.
    await locator.dispatchEvent("pointerdown", { pointerType: "touch" });
    await page.waitForTimeout(350);
    assertLinked("tap", b, await describedBy(page, sel));
    await clearFocus(page);
  }

  await ctx.close();
  results.push(r);
  const failed = r.checks.filter((c) => !c.pass);
  console[r.ok ? "log" : "error"](
    `${r.ok ? "ok" : "FAIL"} ${s.name} — ${r.checks.length - failed.length}/${r.checks.length} checks passed`,
  );
  for (const c of failed)
    console.error(`   ↳ ${c.label} ${c.detail ? `(${c.detail.slice(0, 200)})` : ""}`);
}

try {
  for (const s of SCENARIOS) await runScenario(s);
} finally {
  await browser.close();
}

const fails = results.filter((r) => !r.ok).length;
const md = [
  "# Tooltip ↔ aria-describedby E2E",
  "",
  `- Scenarios: ${results.length}`,
  `- Failing scenarios: **${fails}**`,
  "",
];
for (const r of results) {
  md.push(
    `## ${r.scenario} ${r.ok ? "✅" : "❌"}`,
    "",
    "| Check | Status | Detail |",
    "| --- | --- | --- |",
  );
  for (const c of r.checks)
    md.push(`| ${c.label} | ${c.pass ? "✅" : "❌"} | ${(c.detail || "—").slice(0, 120)} |`);
  md.push("");
}
await writeFile(`${OUT}/REPORT.md`, md.join("\n"), "utf8");

if (fails > 0) {
  console.error(`\n${fails} scenario(s) failed — see ${OUT}/REPORT.md`);
  process.exit(1);
}
console.log(`\nAll ${results.length} tooltip aria-describedby scenarios passed.`);
