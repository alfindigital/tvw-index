export type QuoteResult = {
  symbol: string;
  price: number | null;
  previousClose: number | null;
  currency: string | null;
  marketOpen?: boolean;
  asOf?: number; // epoch ms the quote was fetched from Yahoo
  error?: string;
};


const TIMEOUT_MS = 8000;
// TTLs are computed dynamically from IDX market hours (see marketState()).
// Fallbacks used only when the market-state computation fails.
const CACHE_TTL_OPEN_S = 45;         // hot path during trading
const CACHE_TTL_CLOSED_MIN_S = 300;  // never cache < 5m outside hours
const CACHE_TTL_CLOSED_MAX_S = 12 * 60 * 60; // …and never > 12h
const STALE_TTL_S = 60 * 60 * 24; // long fallback if Yahoo is failing (24h)
const MAX_CONCURRENCY = 6; // never hammer Yahoo with N parallel requests

// Retry policy for transient Yahoo failures (network errors, timeouts,
// 429 rate limits, 5xx). Total wall time is bounded by attempts × (timeout
// + backoff) and stays well under the per-request budget.
// Configurable via env vars so ops can tune without a code change:
//   YAHOO_MAX_RETRIES        — total attempts (initial + retries). Default 3.
//   YAHOO_RETRY_BASE_MS      — base backoff before jitter. Default 250.
//   YAHOO_RETRY_MAX_BACKOFF_MS — cap on any single backoff. Default 2000.
//   YAHOO_RETRY_JITTER       — ± jitter fraction (0..1). Default 0.25.
function envNum(name: string, fallback: number, { min = 0, max = Number.POSITIVE_INFINITY } = {}): number {
  const raw =
    (typeof process !== "undefined" ? process.env?.[name] : undefined) ??
    (typeof globalThis !== "undefined"
      ? (globalThis as { [k: string]: unknown })[name]
      : undefined);
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) {
    console.warn(
      `[quotes] Invalid value for ${name}: ${JSON.stringify(raw)}. ` +
        `Using default ${fallback} (valid range: ${min}-${max === Number.POSITIVE_INFINITY ? "∞" : max}).`,
    );
    return fallback;
  }
  return n;
}

const MAX_RETRIES = Math.floor(envNum("YAHOO_MAX_RETRIES", 3, { min: 1, max: 10 }));
const RETRY_BASE_MS = envNum("YAHOO_RETRY_BASE_MS", 250, { min: 0, max: 60_000 });
const RETRY_MAX_BACKOFF_MS = envNum("YAHOO_RETRY_MAX_BACKOFF_MS", 2000, { min: 0, max: 60_000 });
const RETRY_JITTER = envNum("YAHOO_RETRY_JITTER", 0.25, { min: 0, max: 1 });



// --- IDX market hours (Asia/Jakarta, WIB, UTC+7, no DST) ---
// Trading Mon–Fri, 09:00 → 16:00 local. We treat the whole 09:00–16:00
// window as "open" (session breaks are short enough that a 45s cache is
// still correct; over-caching by a few minutes at lunch is fine).
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const OPEN_MINUTE = 9 * 60;
const CLOSE_MINUTE = 16 * 60;

type MarketState = { open: boolean; ttlSeconds: number };

function marketState(now = new Date()): MarketState {
  // Shift into Jakarta wall-clock via UTC math so DST-less WIB is exact.
  const jk = new Date(now.getTime() + JAKARTA_OFFSET_MS);
  const wd = jk.getUTCDay(); // 0=Sun … 6=Sat
  const mins = jk.getUTCHours() * 60 + jk.getUTCMinutes();
  const isWeekday = wd >= 1 && wd <= 5;
  const open = isWeekday && mins >= OPEN_MINUTE && mins < CLOSE_MINUTE;

  if (open) return { open: true, ttlSeconds: CACHE_TTL_OPEN_S };

  // Closed → cache until the next open bell (bounded).
  let addDays = 0;
  if (isWeekday && mins < OPEN_MINUTE) {
    addDays = 0; // opens later today
  } else {
    // After close today, weekend, etc. Walk forward to next weekday.
    addDays = 1;
    while (((wd + addDays) % 7) === 0 || ((wd + addDays) % 7) === 6) addDays++;
  }
  const nextOpenJk = new Date(jk);
  nextOpenJk.setUTCDate(jk.getUTCDate() + addDays);
  nextOpenJk.setUTCHours(9, 0, 0, 0);
  const nextOpenUtc = nextOpenJk.getTime() - JAKARTA_OFFSET_MS;
  const secs = Math.max(1, Math.floor((nextOpenUtc - now.getTime()) / 1000));
  const ttl = Math.min(CACHE_TTL_CLOSED_MAX_S, Math.max(CACHE_TTL_CLOSED_MIN_S, secs));
  return { open: false, ttlSeconds: ttl };
}

// Exported for unit tests.
export const __test = { marketState, envNum };

function toJkSymbol(ticker: string): string {
  const normalized = ticker.trim().toUpperCase();
  return normalized.endsWith(".JK") ? normalized : `${normalized}.JK`;
}

async function fetchQuoteOnce(symbol: string): Promise<QuoteResult> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol,
    )}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; lotmetrik/1.0; +https://tvx.alfidx.my.id)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      return {
        symbol,
        price: null,
        previousClose: null,
        currency: null,
        error: `HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
            previousClose?: number;
            chartPreviousClose?: number;
            currency?: string;
          };
        }>;
      };
    };
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    const price = meta?.regularMarketPrice ?? meta?.previousClose ?? null;
    const previousClose =
      meta?.chartPreviousClose ?? meta?.previousClose ?? null;
    const currency = meta?.currency ?? null;

    if (price == null) {
      return { symbol, price: null, previousClose, currency, error: "no price" };
    }

    return {
      symbol,
      price: Number(price),
      previousClose: previousClose != null ? Number(previousClose) : null,
      currency,
    };
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.name === "TimeoutError"
          ? "timeout"
          : error.message
        : "fetch failed";
    return { symbol, price: null, previousClose: null, currency: null, error: msg };
  }
}

// Errors we consider transient and worth retrying. Everything else (e.g.
// HTTP 404 for a delisted ticker, or "no price" on a valid symbol) is
// terminal — retrying just wastes budget.
function isRetryable(result: QuoteResult): boolean {
  const err = result.error;
  if (!err) return false;
  if (err === "timeout") return true;
  if (err === "fetch failed") return true;
  if (err.startsWith("HTTP ")) {
    const code = Number(err.slice(5));
    return code === 408 || code === 425 || code === 429 || (code >= 500 && code < 600);
  }
  // Generic network-ish errors from fetch (e.g. "network error", DNS).
  return /network|ECONN|ENOTFOUND|EAI_AGAIN|socket|reset/i.test(err);
}

function backoffDelayMs(attempt: number): number {
  // Exponential: 250ms * 2^attempt, capped, with ±25% jitter.
  const base = Math.min(RETRY_MAX_BACKOFF_MS, RETRY_BASE_MS * 2 ** attempt);
  const jitter = base * (1 - RETRY_JITTER + Math.random() * (2 * RETRY_JITTER));
  return Math.round(jitter);

}

async function fetchQuoteRaw(symbol: string): Promise<QuoteResult> {
  let last: QuoteResult | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await fetchQuoteOnce(symbol);
    if (result.price != null) return result;
    last = result;
    if (!isRetryable(result)) return result;
    if (attempt < MAX_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, backoffDelayMs(attempt)));
    }
  }
  return last ?? { symbol, price: null, previousClose: null, currency: null, error: "fetch failed" };
}

// Cloudflare edge cache (caches.default) is available in the Worker runtime but
// not in dev/node — guard accordingly. Successful quotes are cached briefly
// (CACHE_TTL_S) as fresh, and a longer stale copy (STALE_TTL_S) is kept so we
// can degrade gracefully if Yahoo returns an error or times out.
async function fetchQuoteCached(symbol: string): Promise<QuoteResult> {
  const cacheStorage =
    typeof caches !== "undefined" ? (caches as unknown as { default?: Cache }) : null;
  const cache = cacheStorage?.default ?? null;
  const freshKey = new Request(`https://idxw.cache/quote/${encodeURIComponent(symbol)}`);
  const staleKey = new Request(`https://idxw.cache/quote-stale/${encodeURIComponent(symbol)}`);

  if (cache) {
    try {
      const hit = await cache.match(freshKey);
      if (hit) return (await hit.json()) as QuoteResult;
    } catch {
      // ignore cache read errors
    }
  }

  const state = marketState();
  const raw = await fetchQuoteRaw(symbol);
  const result: QuoteResult =
    raw.price != null
      ? { ...raw, marketOpen: state.open, asOf: Date.now() }
      : raw;

  if (cache && result.price != null) {
    // Fresh TTL is dynamic: 45s while IDX is open, up to the next market
    // open (bounded 5m–12h) while closed. Stale copy is 24h so we can
    // degrade gracefully if Yahoo returns an error over a weekend.
    const body = JSON.stringify(result);
    try {
      await cache.put(
        freshKey,
        new Response(body, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${state.ttlSeconds}`,
          },
        }),
      );
      await cache.put(
        staleKey,
        new Response(body, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${STALE_TTL_S}`,
          },
        }),
      );
    } catch {
      // ignore cache write errors
    }
  }

  // Yahoo call failed → try the long-lived stale copy before giving up.
  if (result.price == null && cache) {
    try {
      const stale = await cache.match(staleKey);
      if (stale) {
        const cached = (await stale.json()) as QuoteResult;
        return { ...cached, error: "stale" };
      }
    } catch {
      // ignore
    }
  }

  return result;
}

// Simple bounded-concurrency mapper so a 45-ticker refresh fires at most
// MAX_CONCURRENCY requests at a time instead of 45 in one burst.
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i] as T);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function fetchQuote(ticker: string): Promise<QuoteResult> {
  return fetchQuoteCached(toJkSymbol(ticker));
}

export async function fetchQuotes(tickers: string[]): Promise<QuoteResult[]> {
  const cleanTickers = tickers.map((t) => t.trim()).filter(Boolean);
  if (cleanTickers.length === 0) return [];

  // Dedupe symbols so duplicate tickers don't fan out into duplicate fetches,
  // then map results back to the caller's original order.
  const symbols = cleanTickers.map(toJkSymbol);
  const unique = Array.from(new Set(symbols));
  const results = await mapPool(unique, MAX_CONCURRENCY, fetchQuoteCached);
  const bySymbol = new Map(results.map((r) => [r.symbol, r]));

  return symbols.map(
    (sym) =>
      bySymbol.get(sym) ?? {
        symbol: sym,
        price: null,
        previousClose: null,
        currency: null,
        error: "no result",
      },
  );
}
