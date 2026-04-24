import { createServerFn } from "@tanstack/react-start";

export type QuoteResult = {
  symbol: string;
  price: number | null;
  currency: string | null;
  error?: string;
};

async function fetchOne(ticker: string): Promise<QuoteResult> {
  const normalized = ticker.trim().toUpperCase();
  const symbol = normalized.endsWith(".JK") ? normalized : `${normalized}.JK`;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IndexBuilder/1.0; +https://lovable.dev)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return { symbol, price: null, currency: null, error: `HTTP ${res.status}` };
    }

    const data: any = await res.json();
    const result = data?.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice ?? result?.meta?.previousClose ?? null;
    const currency = result?.meta?.currency ?? null;

    if (price == null) {
      return { symbol, price: null, currency, error: "no price" };
    }

    return { symbol, price: Number(price), currency };
  } catch (error) {
    return {
      symbol,
      price: null,
      currency: null,
      error: error instanceof Error ? error.message : "fetch failed",
    };
  }
}

export const getQuotes = createServerFn({ method: "POST" })
  .inputValidator((data: { tickers: string[] }) => ({
    tickers: Array.isArray(data?.tickers)
      ? data.tickers.map((ticker) => ticker.trim()).filter(Boolean)
      : [],
  }))
  .handler(async ({ data }) => {
    if (data.tickers.length === 0) {
      return { quotes: [] as QuoteResult[] };
    }

    const quotes = await Promise.all(data.tickers.map(fetchOne));
    return { quotes };
  });