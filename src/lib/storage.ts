export type Stock = {
  id: string;
  ticker: string;
  shares: number; // in juta (millions)
  price: number; // IDR per share
  manual: boolean; // if true, do not overwrite on refresh
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
    const parsed = JSON.parse(raw) as BasketState;
    return {
      stocks: Array.isArray(parsed.stocks) ? parsed.stocks : [],
      lastRefresh: parsed.lastRefresh ?? null,
    };
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
    manual: false,
    error: null,
  };
}
