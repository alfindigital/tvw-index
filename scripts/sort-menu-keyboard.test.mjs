// Mobile E2E: Sort menu keyboard operability.
// On a mobile viewport (light + dark + 320px) verifies that:
// 1. The Sort trigger is reachable via Tab and exposes aria-haspopup/expanded
// 2. Enter opens the dropdown and focus lands on a menu item
//    (the checked radio item when one is selected)
// 3. ArrowDown / ArrowUp / Home / End move focus between menu items
// 4. Enter activates the focused item, closes the menu, and returns
//    focus to the trigger with the new sort applied
// 5. Escape closes the menu without changing the selection
//
// Usage: `node scripts/sort-menu-keyboard.test.mjs` (dev server on :8080).
// Screenshots + report land in ./.visual/sort-menu-keyboard/.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";

const URL_BASE = process.env.VC_URL ?? "http://localhost:8080/";
const OUT = resolve(".visual/sort-menu-keyboard");
await mkdir(OUT, { recursive: true });

const SCENARIOS = [
  { name: "mobile-light", width: 375, height: 812, dark: false },
  { name: "mobile-dark", width: 375, height: 812, dark: true },
  { name: "mobile-xs-light", width: 320, height: 640, dark: false },
];

const TRIGGER = "button[aria-label='Sort watchlist']";
const ITEMS = ["Input order", "Weight ↓", "Market cap ↓", "Ticker A–Z"];

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH ?? "/chromium-1194/chrome-linux/chrome",
});
const results = [];
const rel = (p) => relative(OUT, p).replace(/\\/g, "/");

const activeInfo = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      label: el.getAttribute("aria-label"),
      text: (el.textContent ?? "").trim(),
      checked: el.getAttribute("aria-checked"),
    };
  });

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
          { id: "k1", ticker: "BBCA", shares: 100, price: 0, manualShares: false, manualPrice: false, freeFloat: null },
          { id: "k2", ticker: "BBRI", shares: 200, price: 0, manualShares: false, manualPrice: false, freeFloat: null },
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
  const shot = async (key) => {
    const p = `${OUT}/${s.name}-${key}.png`;
    await page.screenshot({ path: p });
    r.screenshots.push({ key, path: rel(p) });
  };

  const trigger = page.locator(TRIGGER);
  check("Sort trigger visible", await trigger.isVisible().catch(() => false));

  // 1. Reachable via Tab.
  const tabbed = await focusByTab(page, TRIGGER);
  check("Sort trigger reachable via Tab", tabbed);
  check(
    "Trigger exposes aria-haspopup=menu",
    (await trigger.getAttribute("aria-haspopup")) === "menu",
    String(await trigger.getAttribute("aria-haspopup")),
  );
  check(
    "Trigger aria-expanded=false when closed",
    (await trigger.getAttribute("aria-expanded")) === "false",
  );
  await shot("1-trigger-focused");

  // 2. Enter opens the menu and focus moves into it.
  await page.keyboard.press("Enter");
  const menu = page.locator("[role='menu']");
  const opened = await menu
    .waitFor({ state: "visible", timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  check("Enter opens the Sort menu", opened);
  check(
    "Trigger aria-expanded=true when open",
    (await trigger.getAttribute("aria-expanded")) === "true",
  );

  const itemTexts = (await page.locator("[role='menuitemradio']").allTextContents()).map((t) =>
    t.trim(),
  );
  check(
    "Menu renders all sort options",
    ITEMS.every((i) => itemTexts.includes(i)),
    itemTexts.join(" | "),
  );

  await page.waitForTimeout(250);
  const onOpen = await activeInfo(page);
  check(
    "Focus lands on a menu item when opened",
    onOpen?.role === "menuitemradio",
    JSON.stringify(onOpen),
  );
  check(
    "Focused item on open is the checked option",
    onOpen?.checked === "true",
    `focused="${onOpen?.text}" checked=${onOpen?.checked}`,
  );
  await shot("2-menu-open");

  // 3. Arrow / Home / End navigation.
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(120);
  const afterDown = await activeInfo(page);
  check(
    "ArrowDown moves focus to next item",
    afterDown?.role === "menuitemradio" && afterDown?.text !== onOpen?.text,
    `${onOpen?.text} -> ${afterDown?.text}`,
  );

  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(120);
  const afterUp = await activeInfo(page);
  check(
    "ArrowUp returns focus to previous item",
    afterUp?.text === onOpen?.text,
    `${afterDown?.text} -> ${afterUp?.text}`,
  );

  await page.keyboard.press("End");
  await page.waitForTimeout(120);
  const atEnd = await activeInfo(page);
  check("End focuses the last item", atEnd?.text === ITEMS[ITEMS.length - 1], `${atEnd?.text}`);

  await page.keyboard.press("Home");
  await page.waitForTimeout(120);
  const atHome = await activeInfo(page);
  check("Home focuses the first item", atHome?.text === ITEMS[0], `${atHome?.text}`);
  await shot("3-keyboard-nav");

  // 4. Escape closes without selecting, focus returns to trigger.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const closedByEsc = !(await menu.isVisible().catch(() => false));
  check("Escape closes the menu", closedByEsc);
  const focusBack = await page.evaluate(
    (sel) => document.querySelector(sel) === document.activeElement,
    TRIGGER,
  );
  check("Focus returns to trigger after Escape", focusBack);

  // 5. Enter activates a different option.
  await page.keyboard.press("Enter");
  await menu.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(250);
  await page.keyboard.press("End"); // "Ticker A–Z"
  await page.waitForTimeout(120);
  const target = (await activeInfo(page))?.text;
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);

  const closedBySelect = !(await menu.isVisible().catch(() => false));
  check("Enter selects the focused item and closes the menu", closedBySelect, `selected=${target}`);
  const focusBack2 = await page.evaluate(
    (sel) => document.querySelector(sel) === document.activeElement,
    TRIGGER,
  );
  check("Focus returns to trigger after selection", focusBack2);

  // Reopen and confirm the selection is now the checked item.
  await page.keyboard.press("Enter");
  await menu.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(250);
  const checkedText = (
    await page.locator("[role='menuitemradio'][aria-checked='true']").first().textContent()
  )?.trim();
  check("Selected sort option persists as checked", checkedText === target, `${checkedText}`);
  await shot("4-after-select");
  await page.keyboard.press("Escape");

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
  "# Sort menu — mobile keyboard E2E",
  "",
  `- Scenarios: ${results.length}`,
  `- Failing scenarios: **${fails}**`,
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
console.log(`\nAll ${results.length} sort-menu keyboard scenarios passed.`);
