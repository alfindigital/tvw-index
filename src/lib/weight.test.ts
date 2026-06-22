import { describe, it, expect } from "vitest";
import { fullMarketCap, effectiveCapOf, capWeights, enrichStocks, buildFormula } from "./weight";
import type { Stock } from "./storage";

function stock(over: Partial<Stock> = {}): Stock {
  return {
    id: over.id ?? crypto.randomUUID(),
    ticker: over.ticker ?? "AAAA",
    shares: over.shares ?? 0,
    price: over.price ?? 0,
    manualShares: false,
    manualPrice: false,
    freeFloat: over.freeFloat ?? null,
    error: null,
    ...over,
  };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("market cap", () => {
  it("scales shares (millions) × price", () => {
    expect(fullMarketCap({ shares: 100, price: 9000 })).toBe(100 * 9000 * 1_000_000);
  });

  it("free-float null is treated as 100%", () => {
    const s = stock({ shares: 100, price: 1000, freeFloat: null });
    expect(effectiveCapOf(s, "freefloat")).toBe(fullMarketCap(s));
  });

  it("free-float scales the effective cap", () => {
    const s = stock({ shares: 100, price: 1000, freeFloat: 40 });
    expect(effectiveCapOf(s, "freefloat")).toBeCloseTo(fullMarketCap(s) * 0.4, 6);
    expect(effectiveCapOf(s, "mcap")).toBe(fullMarketCap(s));
  });
});

describe("capWeights", () => {
  it("returns normalized weights when no cap", () => {
    const w = capWeights([3, 1], null);
    expect(sum(w)).toBeCloseTo(1, 9);
    expect(w[0]).toBeCloseTo(0.75, 9);
  });

  it("caps a dominant name and redistributes the excess", () => {
    const w = capWeights([90, 5, 5], 0.5);
    expect(sum(w)).toBeCloseTo(1, 9);
    expect(w[0]).toBeCloseTo(0.5, 6);
    // the two small names split the remaining 0.5 equally (they were equal)
    expect(w[1]).toBeCloseTo(0.25, 6);
    expect(w[2]).toBeCloseTo(0.25, 6);
  });

  it("falls back to equal weights when the cap can't fit everyone", () => {
    const w = capWeights([5, 3, 2], 0.2); // 0.2 * 3 < 1
    expect(w).toHaveLength(3);
    for (const x of w) expect(x).toBeCloseTo(1 / 3, 9);
  });

  it("handles a single holding", () => {
    expect(capWeights([1], 0.1)).toEqual([1]);
  });

  it("returns zeros for all-zero input", () => {
    expect(capWeights([0, 0], null)).toEqual([0, 0]);
  });
});

describe("enrichStocks", () => {
  it("weights sum to 1 across holdings with value", () => {
    const { rows } = enrichStocks(
      [
        stock({ ticker: "AAAA", shares: 100, price: 1000 }),
        stock({ ticker: "BBBB", shares: 50, price: 1000 }),
      ],
      { mode: "mcap", cap: null },
    );
    expect(sum(rows.map((r) => r.weight))).toBeCloseTo(1, 9);
    expect(rows[0]!.weight).toBeCloseTo(2 / 3, 6);
  });

  it("free-float mode changes the weighting", () => {
    const { rows } = enrichStocks(
      [
        stock({ ticker: "AAAA", shares: 100, price: 1000, freeFloat: 20 }),
        stock({ ticker: "BBBB", shares: 100, price: 1000, freeFloat: 80 }),
      ],
      { mode: "freefloat", cap: null },
    );
    expect(rows[0]!.weight).toBeCloseTo(0.2, 6);
    expect(rows[1]!.weight).toBeCloseTo(0.8, 6);
  });

  it("reports the largest-weight holding", () => {
    const { largest } = enrichStocks(
      [
        stock({ ticker: "BIG", shares: 100, price: 1000 }),
        stock({ ticker: "SML", shares: 1, price: 1000 }),
      ],
      { mode: "mcap", cap: null },
    );
    expect(largest.ticker).toBe("BIG");
  });
});

describe("buildFormula", () => {
  const rows = [
    { ticker: "BBCA", weight: 0.6 },
    { ticker: "TLKM.JK", weight: 0.4 },
    { ticker: "ZERO", weight: 0 },
  ];

  it("formats weights and strips .JK, dropping zero-weight names", () => {
    expect(buildFormula(rows, "")).toBe("BBCA*0.6000 + TLKM*0.4000");
  });

  it("applies the IDX: prefix", () => {
    expect(buildFormula(rows, "IDX:")).toBe("IDX:BBCA*0.6000 + IDX:TLKM*0.4000");
  });
});
