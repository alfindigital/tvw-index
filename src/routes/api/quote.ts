import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type QuoteResult = {
  symbol: string;
  price: number | null;
  currency: string | null;
  error?: string;
};

async function fetchOne(ticker: string): Promise<QuoteResult> {
  const symbol = ticker.toUpperCase().endsWith(".JK")
    ? ticker.toUpperCase()
    : `${ticker.toUpperCase()}.JK`;
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol,
    )}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        // Yahoo blocks unknown UAs
        "User-Agent":
          "Mozilla/5.0 (compatible; IndexBuilder/1.0; +https://lovable.dev)",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      return { symbol, price: null, currency: null, error: `HTTP ${res.status}` };
    }
    const data: any = await res.json();
    const result = data?.chart?.result?.[0];
    const price =
      result?.meta?.regularMarketPrice ??
      result?.meta?.previousClose ??
      null;
    const currency = result?.meta?.currency ?? null;
    if (price == null) {
      return { symbol, price: null, currency, error: "no price" };
    }
    return { symbol, price: Number(price), currency };
  } catch (err) {
    return {
      symbol,
      price: null,
      currency: null,
      error: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

export const Route = createFileRoute("/api/quote")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const tickersParam = url.searchParams.get("tickers") ?? "";
        const tickers = tickersParam
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        if (tickers.length === 0) {
          return new Response(JSON.stringify({ quotes: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        const quotes = await Promise.all(tickers.map(fetchOne));
        return new Response(JSON.stringify({ quotes }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS },
        });
      },
    },
  },
});
