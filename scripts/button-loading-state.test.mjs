// E2E: loading/busy state for Refresh + Save buttons.
// Verifies (mobile tap + desktop click, light/dark) that:
// 1. Tapping Refresh puts the button in a visible busy state
//    (disabled + aria-busy + spinning icon)
// 2. A double tap while busy does NOT fire a second quote request
// 3. The button returns to normal (enabled, no aria-busy, no spin)
// 4. Saving a template shows a busy "Saving…" state on the dialog Save button
// 5. Double-clicking Save only creates ONE template (no double submit)
//
// Usage: `node scripts/button-loading-state.test.mjs` (dev server on :8080).
// Screenshots + report land in ./.visual/button-loading-state/.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";

const URL_BASE = process.env.VC_URL ?? "http://localhost:8080/";
const OUT = resolve(".visual/button-loading-state");
await mkdir(OUT, { recursive: true });

const SCENARIOS = [
  { name: "mobile-light", width: 375, height: 812, dark: false, mobile: true },
  { name: "mobile-dark", width: 375, height: 812, dark: true, mobile: true },
  { name: "desktop-light", width: 1280, height: 900, dark: false, mobile: false },
];

const REFRESH = "button[aria-label='Refresh prices']";
const SAVE = "button[aria-label='Save watchlist as template']";
const TEMPLATE_NAME = "E2E Loading State";

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH ?? "/chromium-1194/chrome-linux/chrome",
});
const rel = (p) => relative(OUT, p).replace(/\\/g, "/");
const results = [];

async function runScenario(s) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: 2,
    colorScheme: s.dark ? "dark" : "light",
    hasTouch: s.mobile,
    isMobile: s.mobile,
  });
  const page = await ctx.newPage();

  // Count + slow down quote server-fn calls so the busy state is observable.
  let quoteCalls = 0;
  await page.route("**/_serverFn/**", async (route) => {
    const url = route.request().url();
    if (/quote/i.test(url)) {
      quoteCalls += 1;
      await new Promise((r) => setTimeout(r, 1500));
    }
    await route.continue();
  });

  await page.goto(URL_BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    localStorage.removeItem("idx-templates-v1");
    localStorage.setItem(
      "idx-basket-v1",
      JSON.stringify({
        stocks: [
          { id: "b1", ticker: "BBCA", shares: 100, price: 0, manualShares: false, manualPrice: false, freeFloat: null },
          { id: "b2", ticker: "BBRI", shares: 200, price: 0, manualShares: false, manualPrice: false, freeFloat: null },
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
  const shot = async (key, locator) => {
    const p = `${OUT}/${s.name}-${key}.png`;
    await (locator ?? page).screenshot({ path: p });
    r.screenshots.push({ key, path: rel(p) });
  };
  const activate = async (loc) => (s.mobile ? loc.tap() : loc.click());

  // ---- Refresh ----
  const refresh = page.locator(REFRESH);
  await refresh.waitFor({ state: "visible", timeout: 5000 });
  check("Refresh idle: enabled", await refresh.isEnabled());
  check("Refresh idle: no aria-busy", (await refresh.getAttribute("aria-busy")) === null);

  quoteCalls = 0;
  await activate(refresh);

  // Busy state should appear quickly.
  let busy = false;
  for (let i = 0; i < 30; i++) {
    busy = (await refresh.getAttribute("aria-busy")) === "true";
    if (busy) break;
    await page.waitForTimeout(100);
  }
  check("Refresh shows aria-busy=true while loading", busy);
  check("Refresh is disabled while loading", await refresh.isDisabled());
  const spinning = await refresh.locator("svg.animate-spin").count();
  check("Refresh icon spins while loading", spinning === 1, `svg.animate-spin=${spinning}`);
  await shot("1-refresh-busy", refresh);

  // Double activation while busy must not fire another request.
  const callsAfterFirst = quoteCalls;
  await refresh.dispatchEvent("click").catch(() => {});
  await page.waitForTimeout(200);
  check(
    "Double click while busy does not fire a 2nd quote request",
    quoteCalls === callsAfterFirst,
    `calls=${quoteCalls} (was ${callsAfterFirst})`,
  );

  // Back to normal.
  let restored = false;
  for (let i = 0; i < 100; i++) {
    if ((await refresh.getAttribute("aria-busy")) === null && (await refresh.isEnabled())) {
      restored = true;
      break;
    }
    await page.waitForTimeout(100);
  }
  check("Refresh returns to normal after load", restored);
  check(
    "Refresh spinner removed after load",
    (await refresh.locator("svg.animate-spin").count()) === 0,
  );
  await shot("2-refresh-idle", refresh);

  // ---- Save ----
  const save = page.locator(SAVE);
  await activate(save);
  const dialog = page.locator("[role='dialog']");
  const opened = await dialog
    .waitFor({ state: "visible", timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  check("Save dialog opens", opened);

  await page.locator("[role='dialog'] input").fill(TEMPLATE_NAME);
  const confirm = page.locator("[role='dialog'] button", { hasText: /^Save$/ });
  check("Dialog Save idle: no aria-busy", (await confirm.getAttribute("aria-busy")) === null);

  // Double-click as fast as possible: only one template must be created.
  await confirm.click();
  const savingVisible = await page
    .locator("[role='dialog'] button[aria-busy='true']")
    .waitFor({ state: "visible", timeout: 1000 })
    .then(() => true)
    .catch(() => false);
  check("Dialog Save shows busy state (Saving…)", savingVisible);
  const busyText = savingVisible
    ? await page.locator("[role='dialog'] button[aria-busy='true']").innerText()
    : "";
  check("Busy label reads Saving…", /Saving/.test(busyText), busyText);
  const busyDisabled = savingVisible
    ? await page.locator("[role='dialog'] button[aria-busy='true']").isDisabled()
    : false;
  check("Dialog Save disabled while saving", busyDisabled);
  if (savingVisible) await shot("3-save-busy", dialog);

  await page.locator("[role='dialog'] button[aria-busy='true']").click({ force: true }).catch(() => {});
  await page.waitForTimeout(1000);

  const dialogClosed = (await dialog.count()) === 0 || !(await dialog.first().isVisible());
  check("Dialog closes after save completes", dialogClosed);

  const templates = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("idx-templates-v1") ?? "[]");
    } catch {
      return [];
    }
  });
  const matches = templates.filter((t) => t.name === TEMPLATE_NAME);
  check("Exactly one template saved (no double submit)", matches.length === 1, `count=${matches.length}`);

  const toast = page.locator("[data-sonner-toast]").first();
  check("Success toast shown", await toast.isVisible().catch(() => false));
  await shot("4-after-save");

  await ctx.close();
  return r;
}

for (const s of SCENARIOS) {
  const r = await runScenario(s);
  results.push(r);
  const failed = r.checks.filter((c) => !c.pass);
  console.log(`${r.ok ? "PASS" : "FAIL"} ${r.scenario} (${r.checks.length} checks)`);
  for (const f of failed) console.log(`   ✗ ${f.label} ${f.detail}`);
}
await browser.close();

const lines = ["# Button loading state E2E", ""];
for (const r of results) {
  lines.push(`## ${r.scenario} — ${r.ok ? "PASS" : "FAIL"}`, "");
  for (const c of r.checks) lines.push(`- ${c.pass ? "✅" : "❌"} ${c.label}${c.detail ? ` — ${c.detail}` : ""}`);
  lines.push("");
  for (const sc of r.screenshots) lines.push(`![${sc.key}](${sc.path})`);
  lines.push("");
}
await writeFile(`${OUT}/REPORT.md`, lines.join("\n"));
console.log(`\nReport: ${OUT}/REPORT.md`);
if (results.some((r) => !r.ok)) process.exit(1);
