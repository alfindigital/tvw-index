// End-to-end keyboard navigation test for the footer rotator.
// Simulates the exact keys a keyboard user presses (Tab → ArrowRight/Left,
// Home, End) and asserts that on every step the `active` class and
// `document.activeElement` point to the SAME rotator item — no drift, no
// stale focus — under forced-colors (Windows/macOS High Contrast) and
// browser zoom 200%, at 320px and 1280px.
//
// Usage: `node scripts/rotator-keyboard-e2e.mjs` (dev server on :8080).
// Screenshots are saved to ./.visual/rotator-e2e/.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";

const URL_BASE = process.env.VC_URL ?? "http://localhost:8080/";
const OUT = resolve(".visual/rotator-e2e");
await mkdir(OUT, { recursive: true });

const SCENARIOS = [
  { name: "hc-320-light", width: 320, height: 720, dark: false, forcedColors: "active", zoom: 1 },
  { name: "hc-320-dark", width: 320, height: 720, dark: true, forcedColors: "active", zoom: 1 },
  { name: "hc-1280-light", width: 1280, height: 900, dark: false, forcedColors: "active", zoom: 1 },
  { name: "hc-1280-dark", width: 1280, height: 900, dark: true, forcedColors: "active", zoom: 1 },
  {
    name: "zoom200-320-light",
    width: 320,
    height: 720,
    dark: false,
    forcedColors: "none",
    zoom: 2,
  },
  { name: "zoom200-320-dark", width: 320, height: 720, dark: true, forcedColors: "none", zoom: 2 },
  {
    name: "zoom200-1280-light",
    width: 1280,
    height: 900,
    dark: false,
    forcedColors: "none",
    zoom: 2,
  },
  {
    name: "zoom200-1280-dark",
    width: 1280,
    height: 900,
    dark: true,
    forcedColors: "none",
    zoom: 2,
  },
];

const browser = await chromium.launch();
const results = [];
const rel = (p) => relative(OUT, p).replace(/\\/g, "/");

// Snapshot: which index owns .active vs which owns document.activeElement.
async function probe(page) {
  return page.evaluate(() => {
    const activeCls = document.querySelector(".afd-rot .afd-item.active");
    const focused = document.activeElement;
    const idxOf = (el) =>
      el && el.classList?.contains("afd-item") ? Number(el.getAttribute("data-rotator-index")) : -1;
    return {
      activeIdx: idxOf(activeCls),
      focusedIdx: idxOf(focused),
      focusedTag: focused?.tagName ?? null,
      count: document.querySelectorAll(".afd-rot .afd-item").length,
    };
  });
}

async function runScenario(s) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: 2,
    colorScheme: s.dark ? "dark" : "light",
    forcedColors: s.forcedColors,
  });
  const page = await ctx.newPage();
  await page.goto(URL_BASE, { waitUntil: "domcontentloaded" });
  if (s.dark) await page.evaluate(() => document.documentElement.classList.add("dark"));
  if (s.zoom !== 1)
    await page.evaluate((z) => {
      document.documentElement.style.zoom = String(z);
    }, s.zoom);
  await page.waitForTimeout(400);

  // Enter the rotator via its current active link (simulates user Tab reaching
  // the sole tabbable rotator item).
  await page.locator(".afd-item.active").first().focus();
  await page.waitForTimeout(120);

  const initial = await probe(page);
  const count = initial.count;
  const steps = [];

  const step = async (label, keyPresses) => {
    for (const k of keyPresses) await page.keyboard.press(k);
    await page.waitForTimeout(140);
    const p = await probe(page);
    const ok = p.activeIdx === p.focusedIdx && p.activeIdx >= 0;
    steps.push({ label, ...p, ok });
    return { ok, ...p };
  };

  // 1) Full ArrowRight cycle: press N times, must land back on start.
  const startIdx = initial.focusedIdx;
  for (let i = 1; i <= count; i++) {
    const expected = (startIdx + i) % count;
    const r = await step(`ArrowRight×${i}`, ["ArrowRight"]);
    if (r.activeIdx !== expected) r.ok = false;
  }

  // 2) ArrowLeft cycle back the other way.
  for (let i = 1; i <= count; i++) {
    const expected = (((startIdx - i) % count) + count) % count;
    const r = await step(`ArrowLeft×${i}`, ["ArrowLeft"]);
    if (r.activeIdx !== expected) r.ok = false;
  }

  // 3) Home jumps to index 0.
  {
    const r = await step("Home", ["Home"]);
    if (r.activeIdx !== 0) r.ok = false;
  }

  // 4) End jumps to last index.
  {
    const r = await step("End", ["End"]);
    if (r.activeIdx !== count - 1) r.ok = false;
  }

  // 5) ArrowDown/ArrowUp are aliases and must also work.
  {
    const rd = await step("ArrowDown", ["ArrowDown"]);
    if (rd.activeIdx !== 0) rd.ok = false; // wraps from last
    const ru = await step("ArrowUp", ["ArrowUp"]);
    if (ru.activeIdx !== count - 1) ru.ok = false;
  }

  const shot = `${OUT}/${s.name}.png`;
  await page.locator("footer").first().screenshot({ path: shot });
  await ctx.close();

  const failures = steps.filter((x) => !x.ok);
  results.push({
    scenario: s.name,
    startIdx,
    count,
    steps,
    ok: failures.length === 0,
    screenshot: rel(shot),
  });
  const tag = failures.length === 0 ? "ok" : "FAIL";
  console[failures.length === 0 ? "log" : "error"](
    `${tag} ${s.name} — ${steps.length - failures.length}/${steps.length} steps synced`,
  );
  for (const f of failures) {
    console.error(`   ↳ ${f.label}: activeIdx=${f.activeIdx} focusedIdx=${f.focusedIdx}`);
  }
}

try {
  for (const s of SCENARIOS) await runScenario(s);
} finally {
  await browser.close();
}

// Markdown summary for PR reviewers.
const totalFails = results.filter((r) => !r.ok).length;
const md = [
  `# Rotator keyboard E2E`,
  ``,
  `- Scenarios: ${results.length}`,
  `- Failing scenarios: **${totalFails}**`,
  ``,
  `Each step verifies \`.afd-item.active\` and \`document.activeElement\``,
  `point to the same rotator index after the keypress.`,
  ``,
];
for (const r of results) {
  md.push(`## ${r.scenario} ${r.ok ? "✅" : "❌"}`);
  md.push(``);
  md.push(`Start idx: ${r.startIdx} · Links: ${r.count}`);
  md.push(``);
  md.push(`![footer](${r.screenshot})`);
  md.push(``);
  md.push(`| Step | active | focused | sync |`);
  md.push(`| --- | --- | --- | --- |`);
  for (const s of r.steps) {
    md.push(`| ${s.label} | ${s.activeIdx} | ${s.focusedIdx} | ${s.ok ? "✅" : "❌"} |`);
  }
  md.push(``);
}
await writeFile(`${OUT}/REPORT.md`, md.join("\n"), "utf8");

if (totalFails > 0) {
  console.error(`\n${totalFails} scenario(s) failed — see ${OUT}/REPORT.md`);
  process.exit(1);
}
console.log(`\nAll ${results.length} rotator-keyboard scenarios passed.`);
