// Screen-reader name E2E for the WeightControls icon buttons (Refresh / Sort / Save).
//
// For each button, on mobile and desktop, the test asserts:
// 1. The button exposes the expected `aria-label`
// 2. Its icon is `aria-hidden="true"` (icon glyph never announced)
// 3. It carries matching `.sr-only` text as a fallback
// 4. The computed accessible name (Chromium a11y tree, the same name a screen
//    reader announces) equals the expected label — checked while the button is
//    keyboard-focused via Tab
// 5. Tab focus actually lands on the button and `document.activeElement`'s
//    accessible name resolves to that label (role=button, not hidden)
//
// Usage: `node scripts/icon-button-aria-name.test.mjs` (dev server on :8080).
// Report: ./.visual/icon-button-aria-name/REPORT.md
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const URL_BASE = process.env.VC_URL ?? "http://localhost:8080/";
const OUT = resolve(".visual/icon-button-aria-name");
await mkdir(OUT, { recursive: true });

const SCENARIOS = [
  { name: "mobile-light", width: 375, height: 812, dark: false, mobile: true },
  { name: "mobile-dark", width: 375, height: 812, dark: true, mobile: true },
  { name: "mobile-320", width: 320, height: 720, dark: false, mobile: true },
  { name: "desktop-light", width: 1280, height: 900, dark: false, mobile: false },
  { name: "desktop-dark", width: 1280, height: 900, dark: true, mobile: false },
];

const BUTTONS = [
  { key: "refresh", label: "Refresh prices" },
  { key: "sort", label: "Sort watchlist" },
  { key: "save", label: "Save watchlist as template" },
];

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH ?? "/chromium-1194/chrome-linux/chrome",
});
const results = [];

/** Accessible name/role from Chromium's a11y tree for a given element handle. */
async function axInfo(page, locator) {
  const handle = await locator.elementHandle();
  if (!handle) return null;
  const snap = await page.accessibility.snapshot({ root: handle, interestingOnly: false });
  if (!snap) return null;
  return { role: snap.role, name: snap.name };
}

async function focusByTab(page, selector) {
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

async function runScenario(s) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    colorScheme: s.dark ? "dark" : "light",
    hasTouch: s.mobile,
    isMobile: s.mobile,
    deviceScaleFactor: s.mobile ? 2 : 1,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("pageerror:", String(e).slice(0, 200)));

  const seed = () =>
    page.evaluate(() => {
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

  await page.goto(URL_BASE, { waitUntil: "domcontentloaded" });
  // Let the app hydrate fully before seeding: it persists its own default
  // basket on mount and would otherwise overwrite the seed.
  await page.waitForTimeout(2500);

  for (let attempt = 0; attempt < 3; attempt++) {
    await seed();
    await page.reload({ waitUntil: "domcontentloaded" });
    if (s.dark) await page.evaluate(() => document.documentElement.classList.add("dark"));
    const ready = await page
      .locator("button[aria-label='Refresh prices']")
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (ready) break;
  }
  await page.waitForTimeout(600);

  const r = { scenario: s.name, ok: true, checks: [], rows: [] };
  const check = (label, pass, detail = "") => {
    if (!pass) r.ok = false;
    r.checks.push({ label, pass, detail });
  };

  for (const b of BUTTONS) {
    const sel = `button[aria-label='${b.label}']`;
    const locator = page.locator(sel);
    const exists = await locator
      .waitFor({ state: "visible", timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    check(`${b.key}: button rendered`, exists);
    if (!exists) continue;

    const ariaLabel = await locator.getAttribute("aria-label");
    check(`${b.key}: aria-label is "${b.label}"`, ariaLabel === b.label, `got="${ariaLabel}"`);

    const iconHidden = await locator
      .locator("svg")
      .first()
      .getAttribute("aria-hidden")
      .catch(() => null);
    check(`${b.key}: icon is aria-hidden`, iconHidden === "true", `got="${iconHidden}"`);

    const srText = await locator
      .locator(".sr-only")
      .textContent()
      .catch(() => null);
    check(
      `${b.key}: sr-only fallback text matches`,
      (srText ?? "").trim() === b.label,
      `got="${srText}"`,
    );

    // Playwright's role-based query resolves the same accessible name a
    // screen reader would compute.
    const byRole = page.getByRole("button", { name: b.label, exact: true });
    check(
      `${b.key}: resolvable by role+accessible name`,
      (await byRole.count()) === 1,
      `count=${await byRole.count()}`,
    );

    // Keyboard focus, then verify the a11y tree entry for the focused node.
    const tabbed = await focusByTab(page, sel);
    check(`${b.key}: reachable via Tab`, tabbed);
    await page.waitForTimeout(150);

    const ax = await axInfo(page, locator);
    check(`${b.key}: a11y role is button when focused`, ax?.role === "button", `role=${ax?.role}`);
    check(
      `${b.key}: announced name equals label when focused`,
      ax?.name === b.label,
      `name="${ax?.name}"`,
    );

    const activeName = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return null;
      const sr = el.querySelector(".sr-only");
      return el.getAttribute("aria-label") ?? (sr?.textContent ?? el.textContent ?? "").trim();
    });
    check(
      `${b.key}: activeElement name matches label`,
      activeName === b.label,
      `active="${activeName}"`,
    );

    r.rows.push({
      key: b.key,
      ariaLabel,
      srText: (srText ?? "").trim(),
      iconHidden,
      axRole: ax?.role,
      axName: ax?.name,
    });

    await page.keyboard.press("Escape").catch(() => {});
    await page.evaluate(() =>
      document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null,
    );
    await page.mouse.move(2, 2);
    await page.waitForTimeout(250);
  }

  await ctx.close();
  results.push(r);
  const failed = r.checks.filter((c) => !c.pass);
  console[r.ok ? "log" : "error"](
    `${r.ok ? "ok" : "FAIL"} ${s.name} — ${r.checks.length - failed.length}/${r.checks.length} checks passed`,
  );
  for (const c of failed)
    console.error(`   ↳ ${c.label} ${c.detail ? `(${c.detail.slice(0, 160)})` : ""}`);
}

try {
  for (const s of SCENARIOS) await runScenario(s);
} finally {
  await browser.close();
}

const fails = results.filter((r) => !r.ok).length;
const md = [
  "# Icon button aria-label / screen-reader name E2E",
  "",
  `- Scenarios: ${results.length}`,
  `- Failing scenarios: **${fails}**`,
  "",
  "Each button is checked for: `aria-label`, `aria-hidden` icon, `.sr-only` fallback,",
  "role+name resolution, and the accessible name reported by Chromium's a11y tree",
  "while the button is focused via Tab.",
  "",
];
for (const r of results) {
  md.push(
    `## ${r.scenario} ${r.ok ? "✅" : "❌"}`,
    "",
    "| Button | aria-label | sr-only | icon hidden | a11y role | announced name |",
    "| --- | --- | --- | --- | --- | --- |",
  );
  for (const row of r.rows) {
    md.push(
      `| ${row.key} | ${row.ariaLabel ?? "—"} | ${row.srText || "—"} | ${row.iconHidden ?? "—"} | ${row.axRole ?? "—"} | ${row.axName ?? "—"} |`,
    );
  }
  md.push("", "| Check | Status | Detail |", "| --- | --- | --- |");
  for (const c of r.checks)
    md.push(`| ${c.label} | ${c.pass ? "✅" : "❌"} | ${(c.detail || "—").slice(0, 120)} |`);
  md.push("");
}
await writeFile(`${OUT}/REPORT.md`, md.join("\n"), "utf8");

if (fails > 0) {
  console.error(`\n${fails} scenario(s) failed — see ${OUT}/REPORT.md`);
  process.exit(1);
}
console.log(`\nAll ${results.length} icon-button accessible-name scenarios passed.`);
