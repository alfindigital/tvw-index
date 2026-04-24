export type QuoteResult = {
  symbol: string;
  price: number | null;
  currency: string | null;
  error?: string;
};

export async function fetchQuote(ticker: string): Promise<QuoteResult> {
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

export async function fetchQuotes(tickers: string[]) {
  const cleanTickers = tickers.map((ticker) => ticker.trim()).filter(Boolean);

  if (cleanTickers.length === 0) {
    return [] as QuoteResult[];
  }

  return Promise.all(cleanTickers.map(fetchQuote));
}