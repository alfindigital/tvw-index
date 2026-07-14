// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { __test } from "./quotes";

const { marketState, envNum } = __test;

// All inputs are UTC; Asia/Jakarta = UTC+7 (no DST).
// 02:00 UTC = 09:00 WIB, 09:00 UTC = 16:00 WIB.
function utc(y: number, mo: number, d: number, h: number, mi = 0) {
  return new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
}

describe("marketState (IDX, Asia/Jakarta)", () => {
  it("is open on a weekday at 09:00 WIB", () => {
    // 2026-01-05 is Monday. 02:00 UTC = 09:00 WIB.
    const s = marketState(utc(2026, 1, 5, 2, 0));
    expect(s.open).toBe(true);
    expect(s.ttlSeconds).toBe(45);
  });

  it("is open midday Wednesday", () => {
    const s = marketState(utc(2026, 1, 7, 5, 30)); // 12:30 WIB Wed
    expect(s.open).toBe(true);
  });

  it("is closed at 16:00 WIB (exact close)", () => {
    const s = marketState(utc(2026, 1, 5, 9, 0)); // 16:00 WIB Mon
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBeGreaterThanOrEqual(300);
  });

  it("is closed on Saturday and caches until Monday open", () => {
    const s = marketState(utc(2026, 1, 10, 5, 0)); // Sat 12:00 WIB
    expect(s.open).toBe(false);
    // TTL is bounded to 12h max regardless of distance.
    expect(s.ttlSeconds).toBeLessThanOrEqual(12 * 60 * 60);
    expect(s.ttlSeconds).toBeGreaterThanOrEqual(300);
  });

  it("is closed on Sunday", () => {
    const s = marketState(utc(2026, 1, 11, 5, 0));
    expect(s.open).toBe(false);
  });

  it("is closed before open on a weekday", () => {
    const s = marketState(utc(2026, 1, 6, 0, 0)); // 07:00 WIB Tue
    expect(s.open).toBe(false);
  });
});

describe("marketState TTL bounds (5m–12h)", () => {
  const MIN = 300;
  const MAX = 12 * 60 * 60;

  it("is open at 09:00:00 WIB sharp (opening bell inclusive)", () => {
    const s = marketState(utc(2026, 1, 5, 2, 0)); // Mon 09:00 WIB
    expect(s.open).toBe(true);
    expect(s.ttlSeconds).toBe(45);
  });

  it("is open at 15:59 WIB (one minute before close)", () => {
    const s = marketState(utc(2026, 1, 5, 8, 59)); // Mon 15:59 WIB
    expect(s.open).toBe(true);
    expect(s.ttlSeconds).toBe(45);
  });

  it("is closed at 16:00 WIB sharp and TTL clamps down to 12h max", () => {
    // Actual seconds to next open ≈17h → clamped to 12h.
    const s = marketState(utc(2026, 1, 5, 9, 0)); // Mon 16:00 WIB
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBe(MAX);
  });

  it("clamps TTL up to 5m when next open is <5m away (1m before bell)", () => {
    const s = marketState(utc(2026, 1, 5, 1, 59)); // Mon 08:59 WIB
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBe(MIN);
  });

  it("returns exactly 5m when next open is exactly 5m away", () => {
    const s = marketState(utc(2026, 1, 5, 1, 55)); // Mon 08:55 WIB
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBe(MIN);
  });

  it("passes through raw seconds inside the 5m–12h band (pre-open same day)", () => {
    // Mon 05:00 WIB → 4h to open = 14400s (within band).
    const s = marketState(utc(2026, 1, 4, 22, 0));
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBe(4 * 60 * 60);
  });

  it("clamps TTL down to 12h after Friday close (~65h to Mon open)", () => {
    const s = marketState(utc(2026, 1, 9, 9, 0)); // Fri 16:00 WIB
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBe(MAX);
  });

  it("clamps TTL down to 12h on Saturday midday", () => {
    const s = marketState(utc(2026, 1, 10, 5, 0));
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBe(MAX);
  });

  it("clamps TTL down to 12h on Sunday morning", () => {
    const s = marketState(utc(2026, 1, 11, 0, 0));
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBe(MAX);
  });

  it("keeps TTL within the band on Sunday late evening (close to Mon open)", () => {
    // Sun 23:59 WIB → ~9h1m until Mon 09:00.
    const s = marketState(utc(2026, 1, 11, 16, 59));
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBeGreaterThan(MIN);
    expect(s.ttlSeconds).toBeLessThan(MAX);
  });

  it("never violates the 5m–12h bounds across a full week sweep", () => {
    // Sample every 30 minutes across a full week starting Mon 00:00 WIB.
    const start = utc(2026, 1, 4, 17, 0); // Sun 17:00 UTC = Mon 00:00 WIB
    for (let step = 0; step < 7 * 48; step++) {
      const t = new Date(start.getTime() + step * 30 * 60 * 1000);
      const s = marketState(t);
      if (s.open) {
        expect(s.ttlSeconds).toBe(45);
      } else {
        expect(s.ttlSeconds).toBeGreaterThanOrEqual(MIN);
        expect(s.ttlSeconds).toBeLessThanOrEqual(MAX);
      }
    }
  });
});
