// E2E: pressing Refresh actually updates close prices and the derived
// index/results UI (per-row price, market cap, weight %) changes with it.
//
// The Yahoo call is stubbed at the network layer by intercepting the
// `getQuotes` server-function POST, so the assertions are deterministic:
//   round 1 -> BBCA 1,000 / BBRI 2,000  => weights 20% / 80%
//   round 2 -> BBCA 4,000 / BBRI 2,000  => weights 50% / 50%
//
// Usage: `node scripts/refresh-updates-prices.test.mjs` (dev server on :8080).
// Report: ./.visual/refresh-updates-prices/REPORT.md
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const URL_BASE = process.env.VC_URL ?? "http://localhost:8080/";
const OUT = resolve(".visual/refresh-updates-prices");
await mkdir(OUT, { recursive: true });

const SCENARIOS = [
  { name: "desktop-light", width: 1280, height: 900, dark: false, mobile: false },
  { name: "mobile-light", width: 375, height: 812, dark: false, mobile: true },
];

// price table per refresh round, keyed by ticker
const ROUNDS = [
  { BBCA: 1000, BBRI: 2000 },
  { BBCA: 4000, BBRI: 2000 },
];

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH ?? "/chromium-1194/chrome-linux/chrome",
});
const results = [];

/** Read [{ ticker, price, weight }] straight from the rendered rows. */
async function readRows(page) {
  return page.evaluate(() => {
    const out = [];
    const tickers = Array.from(document.querySelectorAll("input[aria-label='Ticker saham']"));
    for (const t of tickers) {
      // Row root: nearest ancestor that also owns the "Price (IDR)" label.
      let root = t.parentElement;
      while (root && !Array.from(root.querySelectorAll("span")).some((s) => s.textContent?.trim() === "Price (IDR)")) {
        root = root.parentElement;
      }
      if (!root) continue;
      const priceLabel = Array.from(root.querySelectorAll("label")).find((l) =>
        Array.from(l.querySelectorAll("span")).some((s) => s.textContent?.trim() === "Price (IDR)"),
      );
      const priceInput = priceLabel?.querySelector("input");
      const weightEl = Array.from(root.querySelectorAll("div")).find((d) =>
        /^\d+(\.\d+)?%$/.test((d.textContent ?? "").trim()),
      );
      out.push({
        ticker: (t.value ?? "").trim().toUpperCase(),
        price: Number(((priceInput?.value ?? "") + "").replace(/[^\d]/g, "")) || 0,
        weight: (weightEl?.textContent ?? "").trim(),
      });
    }
    return out;
  });
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

  let round = 0;
  let serverCalls = 0;
  // Stub the quotes server function so prices are deterministic.
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = req.url();
    if (req.method() !== "POST" || !/getQuotes|quotes\.functions/i.test(url)) {
      return route.fallback();
    }
    serverCalls++;
    let tickers = [];
    try {
      const body = JSON.parse(req.postData() ?? "{}");
      const data = body?.data ?? body;
      tickers = data?.tickers ?? [];
    } catch {
      /* ignore */
    }
    const table = ROUNDS[Math.min(round, ROUNDS.length - 1)];
    const quotes = tickers.map((t) => ({
      ticker: t,
      price: table[t] ?? 1234,
      previousClose: (table[t] ?? 1234) * 0.99,
      currency: "IDR",
      error: null,
    }));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ quotes }),
    });
  });

  const seed = () =>
    page.evaluate(() => {
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

  await page.goto(URL_BASE, { waitUntil: "domcontentloaded" });
  // Let the app hydrate before seeding; it persists its own basket on mount.
  await page.waitForTimeout(2500);
  for (let attempt = 0; attempt < 3; attempt++) {
    await seed();
    await page.reload({ waitUntil: "domcontentloaded" });
    const ready = await page
      .locator("button[aria-label='Refresh prices']")
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (ready) break;
  }
  await page.waitForTimeout(1200);

  const r = { scenario: s.name, ok: true, checks: [] };
  const check = (label, pass, detail = "") => {
    if (!pass) r.ok = false;
    r.checks.push({ label, pass, detail });
  };

  const refresh = page.locator("button[aria-label='Refresh prices']");

  // ---- Round 1 -----------------------------------------------------------
  round = 0;
  const before = await readRows(page);
  await refresh.click();
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll("input[aria-label='Ticker saham']")).length > 0 &&
      Array.from(document.querySelectorAll("input"))
        .map((i) => i.value)
        .join("|")
        .includes("1,000"),
    null,
    { timeout: 15000 },
  ).catch(() => {});
  await page.waitForTimeout(800);
  const after1 = await readRows(page);

  check("server function was called on Refresh", serverCalls > 0, `calls=${serverCalls}`);
  check(
    "BBCA close price updated to 1,000",
    after1.find((x) => x.ticker === "BBCA")?.price === 1000,
    JSON.stringify(after1),
  );
  check(
    "BBRI close price updated to 2,000",
    after1.find((x) => x.ticker === "BBRI")?.price === 2000,
    JSON.stringify(after1),
  );
  check(
    "prices actually changed vs. before",
    JSON.stringify(before.map((x) => x.price)) !== JSON.stringify(after1.map((x) => x.price)),
    `${JSON.stringify(before.map((x) => x.price))} -> ${JSON.stringify(after1.map((x) => x.price))}`,
  );
  check(
    "weights reflect new prices (20% / 80%)",
    after1.find((x) => x.ticker === "BBCA")?.weight?.startsWith("20") === true &&
      after1.find((x) => x.ticker === "BBRI")?.weight?.startsWith("80") === true,
    JSON.stringify(after1.map((x) => x.weight)),
  );
  check(
    "success toast shown",
    await page
      .locator("[data-sonner-toast]", { hasText: /updated/i })
      .first()
      .isVisible()
      .catch(() => false),
  );
  await page.screenshot({ path: `${OUT}/${s.name}-round1.png` });

  // ---- Round 2: new close prices -> index recomputes ----------------------
  round = 1;
  const callsBefore = serverCalls;
  await refresh.click();
  await page
    .waitForFunction(
      () =>
        Array.from(document.querySelectorAll("input"))
          .map((i) => i.value)
          .join("|")
          .includes("4,000"),
      null,
      { timeout: 15000 },
    )
    .catch(() => {});
  await page.waitForTimeout(800);
  const after2 = await readRows(page);

  check("Refresh re-fetched (new server calls)", serverCalls > callsBefore, `${callsBefore} -> ${serverCalls}`);
  check(
    "BBCA close price updated to 4,000",
    after2.find((x) => x.ticker === "BBCA")?.price === 4000,
    JSON.stringify(after2),
  );
  check(
    "weights recomputed to 50% / 50%",
    after2.every((x) => x.weight.startsWith("50")),
    JSON.stringify(after2.map((x) => x.weight)),
  );
  check(
    "results view changed between refreshes",
    JSON.stringify(after1) !== JSON.stringify(after2),
    `${JSON.stringify(after1)} !== ${JSON.stringify(after2)}`,
  );
  await page.screenshot({ path: `${OUT}/${s.name}-round2.png` });

  results.push(r);
  await ctx.close();
}

for (const s of SCENARIOS) await runScenario(s);
await browser.close();

const lines = ["# Refresh updates prices — E2E", ""];
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
