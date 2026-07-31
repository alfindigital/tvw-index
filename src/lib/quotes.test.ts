// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

describe("envNum runtime validation", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    delete process.env.YAHOO_TEST_VAR;
  });

  it("returns the default for a missing or empty env value without warning", () => {
    expect(envNum("YAHOO_TEST_VAR", 3, { min: 1, max: 10 })).toBe(3);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns a valid value inside the allowed range", () => {
    process.env.YAHOO_TEST_VAR = "5";
    expect(envNum("YAHOO_TEST_VAR", 3, { min: 1, max: 10 })).toBe(5);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("falls back to default and warns for a non-numeric value", () => {
    process.env.YAHOO_TEST_VAR = "abc";
    expect(envNum("YAHOO_TEST_VAR", 3, { min: 1, max: 10 })).toBe(3);
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toMatch(/Invalid value for YAHOO_TEST_VAR/);
  });

  it("falls back to default and warns for a value above the max", () => {
    process.env.YAHOO_TEST_VAR = "99";
    expect(envNum("YAHOO_TEST_VAR", 3, { min: 1, max: 10 })).toBe(3);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("falls back to default and warns for a value below the min", () => {
    process.env.YAHOO_TEST_VAR = "0";
    expect(envNum("YAHOO_TEST_VAR", 3, { min: 1, max: 10 })).toBe(3);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("falls back to default and warns for a negative jitter value", () => {
    process.env.YAHOO_TEST_VAR = "-0.5";
    expect(envNum("YAHOO_TEST_VAR", 0.25, { min: 0, max: 1 })).toBe(0.25);
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});

describe("retry env overrides (module reload)", () => {
  const ENV_KEYS = [
    "YAHOO_MAX_RETRIES",
    "YAHOO_RETRY_BASE_MS",
    "YAHOO_RETRY_MAX_BACKOFF_MS",
    "YAHOO_RETRY_JITTER",
  ] as const;
  const saved: Record<string, string | undefined> = {};
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    warnSpy.mockRestore();
    vi.resetModules();
  });

  async function reload(env: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
    for (const k of ENV_KEYS) delete process.env[k];
    for (const [k, v] of Object.entries(env)) process.env[k] = v;
    vi.resetModules();
    return await import("./quotes");
  }

  it("uses documented defaults when no env vars are set", async () => {
    const mod = await reload({});
    expect(mod.__test.retryConfig()).toEqual({
      MAX_RETRIES: 3,
      RETRY_BASE_MS: 250,
      RETRY_MAX_BACKOFF_MS: 2000,
      RETRY_JITTER: 0.25,
    });
  });

  it("applies valid env overrides for all four knobs", async () => {
    const mod = await reload({
      YAHOO_MAX_RETRIES: "5",
      YAHOO_RETRY_BASE_MS: "100",
      YAHOO_RETRY_MAX_BACKOFF_MS: "5000",
      YAHOO_RETRY_JITTER: "0.5",
    });
    expect(mod.__test.retryConfig()).toEqual({
      MAX_RETRIES: 5,
      RETRY_BASE_MS: 100,
      RETRY_MAX_BACKOFF_MS: 5000,
      RETRY_JITTER: 0.5,
    });
  });

  it("floors MAX_RETRIES to an integer number of attempts", async () => {
    const mod = await reload({ YAHOO_MAX_RETRIES: "4.9" });
    expect(mod.__test.retryConfig().MAX_RETRIES).toBe(4);
  });

  it("clamps invalid jitter (>1 or <0) back to the default 0.25 with a warning", async () => {
    const modHigh = await reload({ YAHOO_RETRY_JITTER: "1.5" });
    expect(modHigh.__test.retryConfig().RETRY_JITTER).toBe(0.25);

    const modNeg = await reload({ YAHOO_RETRY_JITTER: "-0.1" });
    expect(modNeg.__test.retryConfig().RETRY_JITTER).toBe(0.25);

    expect(warnSpy.mock.calls.some((c: unknown[]) => /YAHOO_RETRY_JITTER/.test(String(c[0])))).toBe(
      true,
    );
  });

  it("accepts jitter at the exact 0 and 1 boundaries", async () => {
    const modZero = await reload({ YAHOO_RETRY_JITTER: "0" });
    expect(modZero.__test.retryConfig().RETRY_JITTER).toBe(0);

    const modOne = await reload({ YAHOO_RETRY_JITTER: "1" });
    expect(modOne.__test.retryConfig().RETRY_JITTER).toBe(1);
  });

  it("clamps MAX_RETRIES out-of-range values (0 and 11) to the default 3", async () => {
    const modLow = await reload({ YAHOO_MAX_RETRIES: "0" });
    expect(modLow.__test.retryConfig().MAX_RETRIES).toBe(3);

    const modHigh = await reload({ YAHOO_MAX_RETRIES: "11" });
    expect(modHigh.__test.retryConfig().MAX_RETRIES).toBe(3);
  });

  it("clamps base/max backoff out-of-range values to defaults", async () => {
    const mod = await reload({
      YAHOO_RETRY_BASE_MS: "-1",
      YAHOO_RETRY_MAX_BACKOFF_MS: "999999",
    });
    const cfg = mod.__test.retryConfig();
    expect(cfg.RETRY_BASE_MS).toBe(250);
    expect(cfg.RETRY_MAX_BACKOFF_MS).toBe(2000);
  });

  it("caps backoff at RETRY_MAX_BACKOFF_MS with zero jitter for deterministic output", async () => {
    const mod = await reload({
      YAHOO_RETRY_BASE_MS: "100",
      YAHOO_RETRY_MAX_BACKOFF_MS: "500",
      YAHOO_RETRY_JITTER: "0",
    });
    // attempt 0 → 100, attempt 1 → 200, attempt 2 → 400, attempt 3 → 500 (capped from 800).
    expect(mod.__test.backoffDelayMs(0)).toBe(100);
    expect(mod.__test.backoffDelayMs(1)).toBe(200);
    expect(mod.__test.backoffDelayMs(2)).toBe(400);
    expect(mod.__test.backoffDelayMs(3)).toBe(500);
    expect(mod.__test.backoffDelayMs(10)).toBe(500);
  });

  it("keeps jittered backoff within the ± jitter fraction band", async () => {
    const mod = await reload({
      YAHOO_RETRY_BASE_MS: "1000",
      YAHOO_RETRY_MAX_BACKOFF_MS: "10000",
      YAHOO_RETRY_JITTER: "0.25",
    });
    // attempt 0 → base 1000, ±25% → [750, 1250].
    const rand = vi.spyOn(Math, "random");
    try {
      rand.mockReturnValue(0);
      expect(mod.__test.backoffDelayMs(0)).toBe(750);
      rand.mockReturnValue(0.9999999);
      expect(mod.__test.backoffDelayMs(0)).toBe(1250);
      rand.mockReturnValue(0.5);
      expect(mod.__test.backoffDelayMs(0)).toBe(1000);
    } finally {
      rand.mockRestore();
    }
  });

  it("collapses jitter when RETRY_JITTER=0 (fully deterministic)", async () => {
    const mod = await reload({
      YAHOO_RETRY_BASE_MS: "400",
      YAHOO_RETRY_MAX_BACKOFF_MS: "10000",
      YAHOO_RETRY_JITTER: "0",
    });
    const rand = vi.spyOn(Math, "random").mockReturnValue(0.42);
    try {
      expect(mod.__test.backoffDelayMs(0)).toBe(400);
      expect(mod.__test.backoffDelayMs(1)).toBe(800);
    } finally {
      rand.mockRestore();
    }
  });
});
