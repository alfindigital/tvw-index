export type Stock = {
  id: string;
  ticker: string;
  shares: number; // dalam juta (millions)
  price: number; // IDR per share
  manualShares: boolean; // jika true, jangan auto-fill dari DB
  manualPrice: boolean; // jika true, jangan overwrite saat refresh
  error?: string | null;
};

export type BasketState = {
  stocks: Stock[];
  lastRefresh: number | null;
};

const KEY = "idx-basket-v1";

export function loadBasket(): BasketState {
  if (typeof window === "undefined") return { stocks: [], lastRefresh: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { stocks: [], lastRefresh: null };
    const parsed = JSON.parse(raw);
    const stocks: Stock[] = Array.isArray(parsed.stocks)
      ? parsed.stocks.map((s: any) => ({
          id: s.id ?? crypto.randomUUID(),
          ticker: String(s.ticker ?? ""),
          shares: Number(s.shares ?? 0),
          price: Number(s.price ?? 0),
          // backward compat: old "manual" field controlled price
          manualShares: Boolean(s.manualShares ?? false),
          manualPrice: Boolean(s.manualPrice ?? s.manual ?? false),
          error: s.error ?? null,
        }))
      : [];
    return { stocks, lastRefresh: parsed.lastRefresh ?? null };
  } catch {
    return { stocks: [], lastRefresh: null };
  }
}

export function saveBasket(state: BasketState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function newStock(): Stock {
  return {
    id: crypto.randomUUID(),
    ticker: "",
    shares: 0,
    price: 0,
    manualShares: false,
    manualPrice: false,
    error: null,
  };
}
