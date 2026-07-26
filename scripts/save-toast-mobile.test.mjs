// Mobile E2E: Save watchlist confirmation toast.
// Verifies on a mobile viewport (light + dark) that:
// 1. Tapping Save opens the "Save as template" dialog
// 2. Saving shows a success toast with the template name + stock count
// 3. The toast renders at bottom-center (mobile position) with a close button
// 4. Clicking the close button dismisses the toast
// 5. Tapping Save again with the identical watchlist shows the
//    "already saved" info toast with a "Save as new" action
//
// Usage: `node scripts/save-toast-mobile.test.mjs` (dev server on :8080).
// Screenshots + report land in ./.visual/save-toast-mobile/.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";

const URL_BASE = process.env.VC_URL ?? "http://localhost:8080/";
const OUT = resolve(".visual/save-toast-mobile");
await mkdir(OUT, { recursive: true });

const SCENARIOS = [
  { name: "mobile-light", width: 375, height: 812, dark: false },
  { name: "mobile-dark", width: 375, height: 812, dark: true },
  { name: "mobile-xs-light", width: 320, height: 640, dark: false },
];

const SAVE_SELECTOR = "button[aria-label='Save watchlist as template']";
const TEMPLATE_NAME = "E2E Mobile Toast";

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH ?? "/chromium-1194/chrome-linux/chrome",
});
const results = [];
const rel = (p) => relative(OUT, p).replace(/\\/g, "/");

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

  // Seed a watchlist and clear templates so the flow starts clean.
  await page.evaluate(() => {
    localStorage.removeItem("idx-templates-v1");
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

  // 1. Tap Save -> dialog opens.
  const save = page.locator(SAVE_SELECTOR);
  check("Save button visible", await save.isVisible().catch(() => false));
  await save.tap();
  const dialog = page.locator("[role='dialog']");
  const dialogOpen = await dialog
    .waitFor({ state: "visible", timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  check("Save dialog opens on tap", dialogOpen);
  await shot("1-dialog");

  // 2. Fill name and save -> success toast.
  await page.locator("[role='dialog'] input").fill(TEMPLATE_NAME);
  await page.getByRole("button", { name: "Save", exact: true }).last().tap();

  const toast = page.locator("[data-sonner-toast]").last();
  const toastVisible = await toast
    .waitFor({ state: "visible", timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  const toastText = toastVisible ? ((await toast.textContent()) ?? "") : "";
  check("Success toast appears", toastVisible);
  check(
    "Toast text mentions saved template name",
    toastText.includes(TEMPLATE_NAME) && /saved/i.test(toastText),
    toastText,
  );
  check("Toast shows stock count", /2 stocks/.test(toastText), toastText);

  // 3. Positioned bottom-center on mobile.
  const position = await page
    .locator("[data-sonner-toaster]")
    .first()
    .getAttribute("data-y-position")
    .catch(() => null);
  const xPos = await page
    .locator("[data-sonner-toaster]")
    .first()
    .getAttribute("data-x-position")
    .catch(() => null);
  check("Toaster anchored bottom", position === "bottom", `y=${position} x=${xPos}`);
  await shot("2-toast");

  // 4. Close button dismisses the toast.
  const closeBtn = toast.locator("[data-close-button]");
  const hasClose = await closeBtn.isVisible().catch(() => false);
  check("Toast has close button", hasClose);
  if (hasClose) {
    await closeBtn.tap();
    const dismissed = await toast
      .waitFor({ state: "hidden", timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    check("Close button dismisses toast", dismissed);
  }
  await shot("3-after-close");

  // 5. Save again with identical watchlist -> "already saved" info toast.
  await page.locator(SAVE_SELECTOR).tap();
  const dupToast = page.locator("[data-sonner-toast]").last();
  const dupVisible = await dupToast
    .waitFor({ state: "visible", timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  const dupText = dupVisible ? ((await dupToast.textContent()) ?? "") : "";
  check("Duplicate save shows info toast", dupVisible && /already saved/i.test(dupText), dupText);
  check("Duplicate toast offers 'Save as new'", dupText.includes("Save as new"), dupText);
  await shot("4-duplicate-toast");

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
  "# Save watchlist — mobile toast E2E",
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
console.log(`\nAll ${results.length} save-toast mobile scenarios passed.`);
