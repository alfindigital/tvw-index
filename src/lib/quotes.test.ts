// @vitest-environment node
import { describe, it, expect } from "vitest";
import { __test } from "./quotes";

const { marketState } = __test;

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
