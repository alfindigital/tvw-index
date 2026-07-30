import { chromium } from "playwright";

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH ?? "/chromium-1194/chrome-linux/chrome",
  headless: true,
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);

await page.evaluate(() => {
  localStorage.setItem(
    "idx-templates-v1",
    JSON.stringify([
      {
        id: "tpl-1",
        name: "Test Template",
        createdAt: Date.now(),
        stocks: [{ id: "s1", ticker: "BBCA", shares: 100, price: 0, manualShares: false, manualPrice: false, freeFloat: null, error: null }],
      },
    ])
  );
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);

await page.locator("button[aria-label='Watchlist templates']").click();
await page.waitForTimeout(300);

const trash = page.locator("button[aria-label='Delete template']").first();
await trash.click();
await page.waitForTimeout(250);

const confirmBtn = page.locator("button[aria-label='Confirm delete template']").first();
const isVisible = await confirmBtn.isVisible().catch(() => false);
const hasRed = await confirmBtn.evaluate((el) => el.classList.contains("text-destructive")).catch(() => false);

console.log("confirm visible:", isVisible, "red:", hasRed);

if (!isVisible || !hasRed) {
  await browser.close();
  process.exit(1);
}

await confirmBtn.click();
await page.waitForTimeout(400);

const emptyText = await page.locator("text=No saved templates").isVisible().catch(() => false);
const templateText = await page.locator("text=Test Template").isVisible().catch(() => false);
console.log("empty visible:", emptyText, "template still visible:", templateText);

await browser.close();

if (!emptyText || templateText) process.exit(1);
console.log("Delete confirmation OK");
