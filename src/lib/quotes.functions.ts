import { createServerFn } from "@tanstack/react-start";
import { fetchQuotes, type QuoteResult } from "@/lib/quotes";
import { validateTicker } from "@/lib/ticker";

// Hard cap on tickers per request. Defense against a crafted POST asking for
// thousands of symbols (which would fan out into thousands of Yahoo fetches
// from our Worker IP). NOTE: per-IP rate limiting should additionally be set
// as a Cloudflare Rate Limiting Rule — stateless Workers can't do it reliably
// in-app without KV/Durable Objects.
const MAX_TICKERS = 50;

function sanitizeTickers(input: unknown): string[] {
  const arr = Array.isArray(input) ? input : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    if (typeof raw !== "string") continue;
    const v = validateTicker(raw); // mirror client validation server-side
    if (!v.ok) continue;
    const t = v.ticker;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_TICKERS) break;
  }
  return out;
}

export const getQuotes = createServerFn({ method: "POST" })
  .inputValidator((data: { tickers: string[] }) => ({
    tickers: sanitizeTickers(data?.tickers),
  }))
  .handler(async ({ data }) => {
    if (data.tickers.length === 0) {
      return { quotes: [] as QuoteResult[] };
    }

    const quotes = await fetchQuotes(data.tickers);
    return { quotes };
  });
