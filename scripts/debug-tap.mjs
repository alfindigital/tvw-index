import { chromium } from "playwright";

const browser = await chromium.launch({
  executablePath: "/chromium-1194/chrome-linux/chrome",
});
const ctx = await browser.newContext({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
  colorScheme: "light",
  hasTouch: true,
});
const page = await ctx.newPage();
await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
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
await page.waitForTimeout(1200);

const sel = "button[aria-label='Refresh prices']";
const locator = page.locator(sel);
console.log("visible", await locator.isVisible());

await locator.tap();
for (const ms of [0, 30, 60, 100, 150, 250]) {
  if (ms > 0) await page.waitForTimeout(30);
  const tipVisible = await page.locator("[role='tooltip']").last().isVisible().catch(() => false);
  const text = await page.locator("[role='tooltip']").last().textContent().catch(() => null);
  const active = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  console.log(`after ~${ms}ms: tooltip visible=${tipVisible} text="${text}" active=${active}`);
}

await page.screenshot({ path: ".visual/debug-tap.png" });
await ctx.close();
await browser.close();
