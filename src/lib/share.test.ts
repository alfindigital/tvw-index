import { describe, it, expect } from "vitest";
import { parseWatchlistParam, encodeWatchlist } from "./share";
import type { Stock } from "./storage";

function stock(ticker: string): Stock {
  return {
    id: crypto.randomUUID(),
    ticker,
    shares: 0,
    price: 0,
    manualShares: false,
    manualPrice: false,
    freeFloat: null,
    error: null,
  };
}

describe("parseWatchlistParam", () => {
  it("splits on commas and whitespace, uppercasing", () => {
    expect(parseWatchlistParam("bbca, tlkm bmri")).toEqual(["BBCA", "TLKM", "BMRI"]);
  });

  it("dedupes and strips the .JK suffix", () => {
    expect(parseWatchlistParam("BBCA,BBCA.JK,bbca")).toEqual(["BBCA"]);
  });

  it("returns empty for nullish input", () => {
    expect(parseWatchlistParam(null)).toEqual([]);
    expect(parseWatchlistParam("")).toEqual([]);
  });
});

describe("encodeWatchlist", () => {
  it("joins tickers with commas, skipping blanks", () => {
    expect(encodeWatchlist([stock("BBCA"), stock("  "), stock("TLKM")])).toBe("BBCA,TLKM");
  });
});
