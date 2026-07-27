// E2E: pressing Refresh actually re-fetches close prices, updates the price
// field of every row, and recomputes the index/results view (weights).
//
// The quotes server function returns a seroval-encoded payload, so instead of
// fabricating a response the test:
//   Phase A — lets the real call through, parses the price the server returned
//             from the wire, and asserts the UI shows exactly that price and
//             the weights derived from it.
//   Phase B — rewrites the SAME response on the wire (BBCA price x2) so the
//             refresh is deterministic, then asserts price + weights changed.
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

// shares are in millions; weight = shares*price / sum(shares*price)
const SEED = [
  { id: "t1", ticker: "BBCA", shares: 100 },
  { id: "t2", ticker: "BBRI", shares: 200 },
];

// seroval payload: ["symbol","price",...] then values [{t:1,s:"BBCA.JK"},{t:0,s:1234},...]
const QUOTE_RE = /\{"t":1,"s":"([A-Z0-9]+)\.JK"\},\{"t":0,"s":(\d+(?:\.\d+)?)\}/;

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH ?? "/chromium-1194/chrome-linux/chrome",
});
const results = [];

/** Read [{ ticker, price, weight }] straight from the rendered rows. */
async function readRows(page) {
  return page.evaluate(() => {
    const out = [];
    for (const t of document.querySelectorAll("input[aria-label='Ticker saham']")) {
      let root = t.parentElement;
      let priceInput = null;
      let weight = "";
      for (let depth = 0; root && depth < 12; depth++, root = root.parentElement) {
        const label = Array.from(root.querySelectorAll("label")).find((l) =>
          Array.from(l.querySelectorAll("span")).some((s) => s.textContent?.trim() === "Price (IDR)"),
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

  /** ticker -> price actually delivered to the app (after any rewrite). */
  const delivered = {};
  let serverCalls = 0;
  let doubleBBCA = false;

  await page.route("**/_serverFn/**", async (route) => {
    const req = route.request();
    if (req.method() !== "POST") return route.fallback();
    serverCalls++;
    const res = await route.fetch();
    let body = await res.text();
    const m = body.match(QUOTE_RE);
    if (m) {
      const ticker = m[1];
      let price = Number(m[2]);
      if (doubleBBCA && ticker === "BBCA") {
        const next = price * 2;
        body = body.replace(`{"t":1,"s":"${ticker}.JK"},{"t":0,"s":${m[2]}}`, `{"t":1,"s":"${ticker}.JK"},{"t":0,"s":${next}}`);
        price = next;
      }
      delivered[ticker] = price;
    }
    await route.fulfill({ response: res, body, headers: { ...res.headers(), "content-length": String(Buffer.byteLength(body)) } });
  });

  const seed = () =>
    page.evaluate((rows) => {
      localStorage.removeItem("idx-quotes-v1");
      localStorage.setItem(
        "idx-basket-v1",
        JSON.stringify({
          stocks: rows.map((r) => ({ ...r, price: 0, manualShares: false, manualPrice: false, freeFloat: null })),
          lastRefresh: null,
        }),
      );
    }, SEED);

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
    const tickers = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input[aria-label='Ticker saham']")).map((i) => i.value),
    );
    if (ready && tickers.includes("BBCA")) break;
  }
  await page.waitForTimeout(1500);

  const r = { scenario: s.name, ok: true, checks: [] };
  const check = (label, pass, detail = "") => {
    if (!pass) r.ok = false;
    r.checks.push({ label, pass, detail });
  };

  const refresh = page.locator("button[aria-label='Refresh prices']");
  const settle = async (expectPrices) => {
    await page
      .waitForFunction(
        (wanted) => {
          const vals = Array.from(document.querySelectorAll("input")).map((i) => i.value);
          return wanted.every((w) => vals.includes(w));
        },
        expectPrices,
        { timeout: 20000 },
      )
      .catch(() => {});
    await page.waitForTimeout(800);
  };

  // ---- Phase A: real refresh ---------------------------------------------
  const before = await readRows(page);
  const callsBeforeA = serverCalls;
  await refresh.click();
  await page.waitForTimeout(1000);
  await settle(
    Object.values(delivered)
      .filter(Boolean)
      .map((p) => p.toLocaleString("en-US")),
  );
  const afterA = await readRows(page);

  check("Refresh triggered quote server calls", serverCalls > callsBeforeA, `${callsBeforeA} -> ${serverCalls}`);
  check("server returned a price for both tickers", Object.keys(delivered).length >= 2, JSON.stringify(delivered));
  for (const row of SEED) {
    const ui = afterA.find((x) => x.ticker === row.ticker);
    check(
      `${row.ticker} price field shows the fetched close (${delivered[row.ticker]})`,
      ui?.price === delivered[row.ticker],
      JSON.stringify(ui),
    );
  }
  check(
    "prices changed from the empty seed state",
    before.every((b) => b.price === 0) && afterA.every((a) => a.price > 0),
    `${JSON.stringify(before.map((b) => b.price))} -> ${JSON.stringify(afterA.map((a) => a.price))}`,
  );
  const expA = expectedWeights(SEED, delivered);
  check(
    "index weights recomputed from fetched prices",
    SEED.every((row, i) => afterA.find((x) => x.ticker === row.ticker)?.weight === expA[i]),
    `expected ${JSON.stringify(expA)} got ${JSON.stringify(afterA.map((x) => x.weight))}`,
  );
  check(
    "success toast shown",
    await page
      .locator("[data-sonner-toast]", { hasText: /updated/i })
      .first()
      .isVisible()
      .catch(() => false),
  );
  await page.screenshot({ path: `${OUT}/${s.name}-phase-a.png` });

  // ---- Phase B: server returns a new close for BBCA ------------------------
  doubleBBCA = true;
  const priceA = { ...delivered };
  const callsBeforeB = serverCalls;
  await refresh.click();
  await page.waitForTimeout(1000);
  await settle([(priceA.BBCA * 2).toLocaleString("en-US")]);
  const afterB = await readRows(page);

  check("second Refresh re-fetched", serverCalls > callsBeforeB, `${callsBeforeB} -> ${serverCalls}`);
  check(
    `BBCA price field updated to the new close (${priceA.BBCA * 2})`,
    afterB.find((x) => x.ticker === "BBCA")?.price === priceA.BBCA * 2,
    JSON.stringify(afterB),
  );
  check(
    "BBRI price unchanged",
    afterB.find((x) => x.ticker === "BBRI")?.price === priceA.BBRI,
    JSON.stringify(afterB),
  );
  const expB = expectedWeights(SEED, { ...priceA, BBCA: priceA.BBCA * 2 });
  check(
    "index weights recomputed after the price change",
    SEED.every((row, i) => afterB.find((x) => x.ticker === row.ticker)?.weight === expB[i]),
    `expected ${JSON.stringify(expB)} got ${JSON.stringify(afterB.map((x) => x.weight))}`,
  );
  check(
    "results view visibly changed between the two refreshes",
    JSON.stringify(afterA) !== JSON.stringify(afterB),
    `${JSON.stringify(afterA)} !== ${JSON.stringify(afterB)}`,
  );
  await page.screenshot({ path: `${OUT}/${s.name}-phase-b.png` });

  results.push(r);
  await ctx.close();
}

for (const s of SCENARIOS) await runScenario(s);
await browser.close();

const lines = ["# Refresh updates close prices — E2E", ""];
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
