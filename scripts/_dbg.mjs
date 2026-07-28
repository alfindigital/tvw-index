import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH ?? "/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport:{width:1280,height:900} });
const p = await ctx.newPage();
p.on("request", r => { if (r.url().includes("_serverFn")) console.log("REQ", r.url()); });
await p.goto("http://localhost:8080/", {waitUntil:"domcontentloaded"});
await p.waitForTimeout(1200);
await p.evaluate(()=>{localStorage.removeItem("idx-templates-v1");localStorage.setItem("idx-basket-v1",JSON.stringify({stocks:[{id:"b1",ticker:"BBCA",shares:100,price:0,manualShares:false,manualPrice:false,freeFloat:null}],lastRefresh:null}));});
await p.reload({waitUntil:"domcontentloaded"});
await p.waitForTimeout(2000);
console.log("refresh count", await p.locator("button[aria-label='Refresh prices']").count());
await p.locator("button[aria-label='Refresh prices']").click();
for (let i=0;i<10;i++){ console.log(i, await p.locator("button[aria-label='Refresh prices']").getAttribute("aria-busy"), await p.locator("button[aria-label='Refresh prices']").isDisabled()); await p.waitForTimeout(150);}
await b.close();
