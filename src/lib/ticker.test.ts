import { describe, it, expect } from "vitest";
import { validateTicker, normalizeTicker } from "./ticker";

describe("validateTicker", () => {
  it("accepts 3–5 letter IDX codes", () => {
    for (const t of ["GOTO", "BBCA", "ANTM", "BRPT", "TLKM"]) {
      expect(validateTicker(t)).toEqual({ ok: true, ticker: t });
    }
  });

  it("accepts and normalizes the .JK suffix + lowercase", () => {
    expect(validateTicker("bbca.jk")).toEqual({ ok: true, ticker: "BBCA.JK" });
  });

  it("rejects empty input", () => {
    expect(validateTicker("  ")).toMatchObject({ ok: false });
  });

  it("rejects too-short / too-long / numeric tickers", () => {
    for (const bad of ["BB", "BBCA1", "BBCA-W", "TOOLONGX"]) {
      expect(validateTicker(bad).ok).toBe(false);
    }
  });

  it("normalizeTicker trims + uppercases", () => {
    expect(normalizeTicker("  bbca ")).toBe("BBCA");
  });
});
