import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/chromium-1194/chrome-linux/chrome" });
const p = await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
p.on("response", async r => { if (r.url().includes("/_serverFn/")) { console.log(r.status(), (await r.text()).slice(0,300)); } });
await p.goto("http://localhost:8080/", {waitUntil:"domcontentloaded"});
await p.waitForTimeout(6000);
console.log(await p.evaluate(()=>{
  const t=document.querySelector("input[aria-label='Ticker saham']");
  let root=t.parentElement; let depth=0;
  while(root && depth<12){ const w=Array.from(root.querySelectorAll("div")).map(d=>d.textContent.trim()).filter(x=>/^\d+(\.\d+)?%$/.test(x)); if(w.length) return {depth, w}; root=root.parentElement; depth++; }
  return "none";
}));
await b.close();
