import { createServerFn } from "@tanstack/react-start";
import { fetchQuotes, type QuoteResult } from "@/lib/quotes";

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

    const quotes = await fetchQuotes(data.tickers);
    return { quotes };
  });