import type { Stock } from "@/lib/storage";

// How holdings are weighted into the index.
//  - "mcap":      full market cap = shares × price
//  - "freefloat": free-float adjusted = shares × price × (freeFloat% / 100)
//    matching IDX's own index methodology more closely.
export type WeightMode = "mcap" | "freefloat";

export type EnrichedStock = Stock & {
  /** Full market cap in IDR (shares stored in millions). */
  marketCap: number;
  /** Cap actually used for weighting (mcap, or free-float adjusted). */
  effectiveCap: number;
  /** Pro-rata weight before any per-name cap is applied. */
  rawWeight: number;
  /** Final weight after optional per-name capping + renormalization. */
  weight: number;
};

const SHARES_SCALE = 1_000_000; // shares stored in millions

export function fullMarketCap(s: Pick<Stock, "shares" | "price">): number {
  return (s.shares || 0) * (s.price || 0) * SHARES_SCALE;
}

export function freeFloatPct(s: Pick<Stock, "freeFloat">): number {
  const ff = s.freeFloat;
  if (ff == null || !isFinite(ff)) return 100;
  return Math.max(0, Math.min(100, ff));
}

export function effectiveCapOf(s: Stock, mode: WeightMode): number {
  const full = fullMarketCap(s);
  if (mode === "freefloat") return full * (freeFloatPct(s) / 100);
  return full;
}

/**
 * Cap each weight at `cap` (a fraction, e.g. 0.10 for 10%) and redistribute the
 * excess proportionally among the uncapped names — the standard index-capping
 * approach used by IDX/MSCI. Input weights need not be normalized; output sums
 * to 1. Returns a copy. `null`/invalid cap = no capping (just normalized).
 */
export function capWeights(rawWeights: number[], cap: number | null): number[] {
  const n = rawWeights.length;
  if (n === 0) return [];
  const positive = rawWeights.map((x) => (x > 0 && isFinite(x) ? x : 0));
  const sum = positive.reduce((a, b) => a + b, 0);
  if (sum <= 0) return positive.map(() => 0);

  const w = positive.map((x) => x / sum); // normalized, sums to 1
  if (cap == null || !(cap > 0) || cap >= 1) return w;
  // Cap too small to fit every name → equal weights is the only feasible answer.
  if (cap * n <= 1 + 1e-12) return w.map(() => 1 / n);

  const capped = new Array<boolean>(n).fill(false);
  for (let iter = 0; iter < 1000; iter++) {
    const over: number[] = [];
    for (let i = 0; i < n; i++) {
      if (!capped[i] && (w[i] ?? 0) > cap + 1e-12) over.push(i);
    }
    if (over.length === 0) break;
    for (const i of over) {
      w[i] = cap;
      capped[i] = true;
    }
    let cappedTotal = 0;
    let freeTotal = 0;
    const free: number[] = [];
    for (let i = 0; i < n; i++) {
      if (capped[i]) cappedTotal += w[i] ?? 0;
      else {
        free.push(i);
        freeTotal += w[i] ?? 0;
      }
    }
    const budget = 1 - cappedTotal;
    if (freeTotal <= 0 || budget <= 0) break;
    for (const i of free) w[i] = ((w[i] ?? 0) / freeTotal) * budget;
  }
  return w;
}

export type EnrichOptions = {
  mode: WeightMode;
  /** Per-name weight cap as a fraction (e.g. 0.1 = 10%). null = no cap. */
  cap?: number | null;
};

export function enrichStocks(
  stocks: Stock[],
  opts: EnrichOptions = { mode: "mcap", cap: null },
): {
  rows: EnrichedStock[];
  total: number;
  largest: { ticker: string; weight: number };
} {
  const base = stocks.map((s) => ({
    ...s,
    marketCap: fullMarketCap(s),
    effectiveCap: effectiveCapOf(s, opts.mode),
  }));
  const effectiveTotal = base.reduce((a, b) => a + b.effectiveCap, 0);
  const total = base.reduce((a, b) => a + b.marketCap, 0);

  const rawWeights = base.map((r) => (effectiveTotal > 0 ? r.effectiveCap / effectiveTotal : 0));
  const finalWeights = capWeights(rawWeights, opts.cap ?? null);

  const rows: EnrichedStock[] = base.map((r, i) => ({
    ...r,
    rawWeight: rawWeights[i] ?? 0,
    weight: finalWeights[i] ?? 0,
  }));

  const largest = rows.reduce((best, cur) => (cur.weight > best.weight ? cur : best), {
    ticker: "—",
    weight: 0,
  } as { ticker: string; weight: number });

  return { rows, total, largest };
}

/** Build the TradingView spread expression, e.g. `IDX:BBCA*0.4521 + IDX:TLKM*0.2310`. */
export function buildFormula(rows: { ticker: string; weight: number }[], prefix = ""): string {
  return rows
    .filter((r) => r.ticker && r.weight > 0)
    .map((r) => {
      const sym = r.ticker.replace(/\.JK$/i, "").toUpperCase();
      return `${prefix}${sym}*${r.weight.toFixed(4)}`;
    })
    .join(" + ");
}

/**
 * Build a Pine Script v5 indicator that plots the weighted basket value.
 * Use this when the inline TradingView formula bar (~500 char) isn't enough —
 * Pine indicators have no such limit and can hold 30+ symbols comfortably.
 */
export function buildPineScript(
  rows: { ticker: string; weight: number }[],
  opts: { prefix?: string; name?: string } = {},
): string {
  const prefix = opts.prefix ?? "IDX:";
  const name = (opts.name ?? "lotmetrik Basket").replace(/"/g, "'");
  const clean = rows.filter((r) => r.ticker && r.weight > 0);
  if (clean.length === 0) {
    return `//@version=5\nindicator("${name}", overlay=false)\n// Watchlist empty — add stocks first.`;
  }
  const lines: string[] = [];
  lines.push(`//@version=5`);
  lines.push(`indicator("${name}", overlay=false, precision=2)`);
  clean.forEach((r, i) => {
    const sym = r.ticker.replace(/\.JK$/i, "").toUpperCase();
    lines.push(`w${i} = ${r.weight.toFixed(6)}`);
    lines.push(`s${i} = request.security("${prefix}${sym}", timeframe.period, close)`);
  });
  const sum = clean.map((_, i) => `w${i}*s${i}`).join(" + ");
  lines.push(`basket = ${sum}`);
  lines.push(`plot(basket, "Basket", color=color.new(color.blue, 0), linewidth=2)`);
  return lines.join("\n");
}
