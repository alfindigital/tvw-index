// E2E: close-price input validation.
//  1. Typing a bad format (letters) shows a dismissible error toast.
//  2. The toast close button actually removes it.
//  3. Pressing Enter on an empty price shows "Price cannot be empty".
//  4. Typing a valid price clears the error path and the index/weights recompute.
//
// Usage: `node scripts/price-validation-toast.test.mjs` (dev server on :8080).
// Report: ./.visual/price-validation-toast/REPORT.md
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const URL_BASE = process.env.VC_URL ?? "http://localhost:8080/";
const OUT = resolve(".visual/price-validation-toast");
await mkdir(OUT, { recursive: true });

const SCENARIOS = [
  { name: "desktop-light", width: 1280, height: 900, dark: false, mobile: false },
  { name: "mobile-light", width: 375, height: 812, dark: false, mobile: true },
  { name: "mobile-dark", width: 375, height: 812, dark: true, mobile: true },
];

const SEED = [
  { id: "t1", ticker: "BBCA", shares: 100 },
  { id: "t2", ticker: "BBRI", shares: 200 },
];

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH ?? "/chromium-1194/chrome-linux/chrome",
});
const results = [];

async function readRows(page) {
  return page.evaluate(() => {
    const out = [];
    for (const t of document.querySelectorAll("input[aria-label='Ticker saham']")) {
      let root = t.parentElement;
      let priceInput = null;
      let weight = "";
      for (let depth = 0; root && depth < 12; depth++, root = root.parentElement) {
        const label = Array.from(root.querySelectorAll("label")).find((l) =>
          Array.from(l.querySelectorAll("span")).some(
            (s) => s.textContent?.trim() === "Price (IDR)",
          ),
        );
        if (label) priceInput = label.querySelector("input");
        const w = Array.from(root.querySelectorAll("div"))
          .map((d) => (d.textContent ?? "").trim())
          .find((x) => /^\d+(\.\d+)?%$/.test(x));
        if (w) weight = w;
        if (priceInput && weight) break;
      }
      out.push({
        ticker: (t.value ?? "").trim().toUpperCase(),
        price: Number(((priceInput?.value ?? "") + "").replace(/[^\d]/g, "")) || 0,
        weight,
      });
    }
    return out;
  });
}

function expectedWeights(rows, prices) {
  const caps = rows.map((r) => r.shares * (prices[r.ticker] ?? 0));
  const total = caps.reduce((a, b) => a + b, 0);
  return rows.map((r, i) => (total > 0 ? `${((caps[i] / total) * 100).toFixed(2)}%` : "0.00%"));
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
  // Keep the run deterministic: no network quotes overwriting typed prices.
  await page.route("**/_serverFn/**", (route) => route.abort());

  const seed = () =>
    page.evaluate((rows) => {
      localStorage.removeItem("idx-quotes-v1");
      localStorage.setItem(
        "idx-basket-v1",
        JSON.stringify({
          stocks: rows.map((r) => ({
            ...r,
            price: 0,
            manualShares: false,
            manualPrice: false,
            freeFloat: null,
          })),
          lastRefresh: null,
        }),
      );
    }, SEED);

  await page.goto(URL_BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  for (let attempt = 0; attempt < 3; attempt++) {
    await seed();
    await page.reload({ waitUntil: "domcontentloaded" });
    const ready = await page
      .locator("input[aria-label='Ticker saham']")
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    const tickers = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input[aria-label='Ticker saham']")).map((i) => i.value),
    );
    if (ready && tickers.includes("BBCA")) break;
  }
  await page.waitForTimeout(1200);

  const r = { scenario: s.name, ok: true, checks: [] };
  const check = (label, pass, detail = "") => {
    if (!pass) r.ok = false;
    r.checks.push({ label, pass, detail });
  };

  const priceInput = page.locator("input[aria-label^='Price IDR']").first();
  const toasts = page.locator("[data-sonner-toast]");

  // ---- 1. bad format ------------------------------------------------------
  await priceInput.click();
  await priceInput.fill("");
  await priceInput.type("abc", { delay: 40 });
  const badToast = toasts.filter({ hasText: /Invalid price format/i }).first();
  const badVisible = await badToast
    .waitFor({ state: "visible", timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  check("invalid price format shows an error toast", badVisible);
  check(
    "error toast has error styling",
    badVisible && (await badToast.getAttribute("data-type")) === "error",
    badVisible ? String(await badToast.getAttribute("data-type")) : "not shown",
  );
  check(
    "invalid characters are not written into the field",
    (await priceInput.inputValue()) === "",
  );
  await page.screenshot({ path: `${OUT}/${s.name}-1-format-error.png` });

  // ---- 2. dismissible -----------------------------------------------------
  const closeBtn = badToast.locator("[data-close-button]").first();
  const hasClose = badVisible && (await closeBtn.count()) > 0;
  if (hasClose) {
    await closeBtn.dispatchEvent("click");
    const gone = await badToast
      .waitFor({ state: "hidden", timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    check("close button dismisses the error toast", gone);
  } else {
    check("close button dismisses the error toast", false, "no [data-close-button] found");
  }

  // ---- 3. empty price on Enter -------------------------------------------
  await priceInput.click();
  await priceInput.fill("");
  await priceInput.press("Enter");
  const emptyToast = toasts.filter({ hasText: /Price cannot be empty/i }).first();
  const emptyVisible = await emptyToast
    .waitFor({ state: "visible", timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  check("empty price on Enter shows an error toast", emptyVisible);
  if (emptyVisible) {
    const c = emptyToast.locator("[data-close-button]").first();
    if ((await c.count()) > 0) {
      await c.dispatchEvent("click");
      const gone = await emptyToast
        .waitFor({ state: "hidden", timeout: 8000 })
        .then(() => true)
        .catch(() => false);
      check("empty-price toast is dismissible", gone);
    } else {
      check("empty-price toast is dismissible", false, "no close button");
    }
  } else {
    check("empty-price toast is dismissible", false, "toast never shown");
  }
  await page.screenshot({ path: `${OUT}/${s.name}-2-empty-error.png` });

  // ---- 4. valid input recomputes the results ------------------------------
  const inputs = page.locator("input[aria-label^='Price IDR']");
  await inputs.nth(0).click();
  await inputs.nth(0).fill("");
  await inputs.nth(0).fill("9750");
  await inputs.nth(0).press("Enter");
  await inputs.nth(1).click();
  await inputs.nth(1).fill("");
  await inputs.nth(1).fill("4500");
  await inputs.nth(1).press("Enter");
  await page.waitForTimeout(800);

  const rows = await readRows(page);
  check(
    "valid prices are accepted in both fields",
    rows.find((x) => x.ticker === "BBCA")?.price === 9750 &&
      rows.find((x) => x.ticker === "BBRI")?.price === 4500,
    JSON.stringify(rows),
  );
  const exp = expectedWeights(SEED, { BBCA: 9750, BBRI: 4500 });
  check(
    "index weights recomputed from the valid prices",
    SEED.every((row, i) => rows.find((x) => x.ticker === row.ticker)?.weight === exp[i]),
    `expected ${JSON.stringify(exp)} got ${JSON.stringify(rows.map((x) => x.weight))}`,
  );
  const errorToastsLeft = await toasts
    .filter({ hasText: /Invalid price format|cannot be empty/i })
    .count();
  check(
    "no validation error toast remains after valid input",
    errorToastsLeft === 0,
    `${errorToastsLeft}`,
  );
  await page.screenshot({ path: `${OUT}/${s.name}-3-valid.png` });

  results.push(r);
  await ctx.close();
}

for (const s of SCENARIOS) await runScenario(s);
await browser.close();

const lines = ["# Close-price validation toast — E2E", ""];
let failed = 0;
for (const r of results) {
  lines.push(`## ${r.scenario} — ${r.ok ? "PASS" : "FAIL"}`);
  for (const c of r.checks) {
    if (!c.pass) failed++;
    lines.push(`- ${c.pass ? "✅" : "❌"} ${c.label}${c.detail ? ` — \`${c.detail}\`` : ""}`);
  }
  lines.push("");
}
await writeFile(`${OUT}/REPORT.md`, lines.join("\n"));
console.log(lines.join("\n"));
console.log(failed === 0 ? "ALL PASS" : `${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
