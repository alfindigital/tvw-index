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
export const __test = { marketState };

function toJkSymbol(ticker: string): string {
  const normalized = ticker.trim().toUpperCase();
  return normalized.endsWith(".JK") ? normalized : `${normalized}.JK`;
}

async function fetchQuoteRaw(symbol: string): Promise<QuoteResult> {
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

  const result = await fetchQuoteRaw(symbol);

  if (cache && result.price != null) {
    // Cache both the short-lived "fresh" copy and a long-lived stale fallback.
    const body = JSON.stringify(result);
    try {
      await cache.put(
        freshKey,
        new Response(body, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${CACHE_TTL_S}`,
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
