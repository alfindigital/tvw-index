// Encode/decode a watchlist as a shareable link. We intentionally share only
// the ticker list (clean, chat-friendly URLs); shares come from the bundled DB
// and prices are fetched fresh on the recipient's side — which is exactly what
// you want when sharing a custom index ("here are the names").
import type { Stock } from "@/lib/storage";
import { SITE_URL } from "@/lib/site";

const MAX_TICKERS = 200;

export function encodeWatchlist(stocks: Stock[]): string {
  return stocks
    .map((s) => s.ticker.trim().toUpperCase())
    .filter(Boolean)
    .join(",");
}

export function parseWatchlistParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\s]+/)) {
    const t = part.trim().toUpperCase().replace(/\.JK$/i, "");
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_TICKERS) break;
  }
  return out;
}

export function buildShareUrl(stocks: Stock[]): string {
  const list = encodeWatchlist(stocks);
  return `${SITE_URL}/?list=${encodeURIComponent(list)}`;
}
