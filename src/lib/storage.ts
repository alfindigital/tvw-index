export type Stock = {
  id: string;
  ticker: string;
  shares: number; // dalam juta (millions)
  price: number; // IDR per share
  manualShares: boolean; // jika true, jangan auto-fill dari DB
  manualPrice: boolean; // jika true, jangan overwrite saat refresh
  // Free-float persen (0–100). null/undefined diperlakukan sebagai 100%.
  // Dipakai saat mode bobot = "freefloat".
  freeFloat?: number | null;
  error?: string | null;
};

export type BasketState = {
  stocks: Stock[];
  lastRefresh: number | null;
};

export type Template = {
  id: string;
  name: string;
  createdAt: number;
  stocks: Stock[];
};

const KEY = "idx-basket-v1";
const TPL_KEY = "idx-templates-v1";
const SETTINGS_KEY = "idx-settings-v1";
const QUOTES_KEY = "idx-quotes-v1";
const RESET_HISTORY_KEY = "idx-reset-history-v1";
// TTL for persisted reset undo/redo history. Long enough to survive a
// brief refresh or accidental tab close, short enough that it doesn't
// linger and confuse the user on the next visit.
const RESET_HISTORY_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ---------- Persistent quote cache ----------
// Keyed by *normalized* ticker (uppercase, no .JK suffix — same shape used in
// the UI). Serves as a client-side fallback so a page reload can render the
// last known price instantly, before the network round-trip to Yahoo/Cloud
// resolves. Fresh network data always wins and overwrites the entry.

export type CachedQuote = {
  price: number;
  previousClose?: number | null;
  currency?: string | null;
  asOf: number; // epoch ms when the quote was captured
};

export type QuoteCache = Record<string, CachedQuote>;

// Drop entries older than this so the cache doesn't grow forever with
// tickers the user removed from their basket weeks ago.
const QUOTE_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const QUOTE_CACHE_MAX_ENTRIES = 500;

export function normalizeTickerKey(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/\.JK$/i, "");
}

export function loadQuoteCache(): QuoteCache {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(QUOTES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const now = Date.now();
    const out: QuoteCache = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue;
      const e = v as Partial<CachedQuote>;
      const price = Number(e.price);
      const asOf = Number(e.asOf);
      if (!Number.isFinite(price) || price <= 0) continue;
      if (!Number.isFinite(asOf)) continue;
      if (now - asOf > QUOTE_CACHE_MAX_AGE_MS) continue;
      out[normalizeTickerKey(k)] = {
        price,
        previousClose:
          e.previousClose != null && Number.isFinite(Number(e.previousClose))
            ? Number(e.previousClose)
            : null,
        currency: typeof e.currency === "string" ? e.currency : null,
        asOf,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function saveQuoteCache(cache: QuoteCache): void {
  if (typeof window === "undefined") return;
  try {
    // Trim to newest N entries if the cache grew too large.
    const entries = Object.entries(cache);
    if (entries.length > QUOTE_CACHE_MAX_ENTRIES) {
      entries.sort((a, b) => b[1].asOf - a[1].asOf);
      const trimmed: QuoteCache = {};
      for (const [k, v] of entries.slice(0, QUOTE_CACHE_MAX_ENTRIES)) trimmed[k] = v;
      localStorage.setItem(QUOTES_KEY, JSON.stringify(trimmed));
      return;
    }
    localStorage.setItem(QUOTES_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

export function putQuoteCache(ticker: string, entry: CachedQuote): void {
  const key = normalizeTickerKey(ticker);
  if (!key) return;
  const cache = loadQuoteCache();
  cache[key] = entry;
  saveQuoteCache(cache);
}

export function getCachedQuote(ticker: string): CachedQuote | null {
  const key = normalizeTickerKey(ticker);
  if (!key) return null;
  const cache = loadQuoteCache();
  return cache[key] ?? null;
}


// ---------- App settings (weighting / display preferences) ----------

export type WeightModeSetting = "mcap" | "freefloat";
export type SortKey = "manual" | "weight" | "mcap" | "ticker";
export type TickerPrefix = "IDX:" | "BINANCE:" | "";

export type AppSettings = {
  weightMode: WeightModeSetting;
  sort: SortKey;
  prefix: TickerPrefix;
};

export const DEFAULT_SETTINGS: AppSettings = {
  weightMode: "mcap",
  sort: "manual",
  prefix: "IDX:",
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const p = JSON.parse(raw);
    return {
      weightMode: p.weightMode === "freefloat" ? "freefloat" : "mcap",
      sort: (["manual", "weight", "mcap", "ticker"] as const).includes(p.sort) ? p.sort : "manual",
      prefix: (["IDX:", "BINANCE:", ""] as const).includes(p.prefix) ? p.prefix : "IDX:",
    };

  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: AppSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

type RawStock = {
  id?: unknown;
  ticker?: unknown;
  shares?: unknown;
  price?: unknown;
  manualShares?: unknown;
  manualPrice?: unknown;
  manual?: unknown;
  freeFloat?: unknown;
  error?: unknown;
};

type RawTemplate = {
  id?: unknown;
  name?: unknown;
  createdAt?: unknown;
  stocks?: unknown;
};

function normalizeFreeFloat(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

function normalizeStock(s: RawStock): Stock {
  return {
    id: typeof s.id === "string" ? s.id : crypto.randomUUID(),
    ticker: String(s.ticker ?? ""),
    shares: Number(s.shares ?? 0),
    price: Number(s.price ?? 0),
    manualShares: Boolean(s.manualShares ?? false),
    manualPrice: Boolean(s.manualPrice ?? s.manual ?? false),
    freeFloat: normalizeFreeFloat(s.freeFloat),
    error: typeof s.error === "string" ? s.error : null,
  };
}

export function loadBasket(): BasketState {
  if (typeof window === "undefined") return { stocks: [], lastRefresh: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { stocks: [], lastRefresh: null };
    const parsed = JSON.parse(raw);
    const stocks: Stock[] = Array.isArray(parsed.stocks) ? parsed.stocks.map(normalizeStock) : [];
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
    freeFloat: null,
    error: null,
  };
}

// ---------- Templates ----------

export function loadTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TPL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as RawTemplate[]).map((t) => ({
      id: String(t.id ?? crypto.randomUUID()),
      name: String(t.name ?? "Untitled"),
      createdAt: Number(t.createdAt ?? Date.now()),
      stocks: Array.isArray(t.stocks) ? t.stocks.map(normalizeStock) : [],
    }));
  } catch {
    return [];
  }
}

export function saveTemplates(templates: Template[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TPL_KEY, JSON.stringify(templates));
  } catch {
    // ignore
  }
}

// ---------- Export / Import ----------

export type ExportPayload = {
  type: "idx-basket-export";
  version: 1;
  exportedAt: number;
  basket: BasketState;
  templates: Template[];
};

export function buildExport(): ExportPayload {
  return {
    type: "idx-basket-export",
    version: 1,
    exportedAt: Date.now(),
    basket: loadBasket(),
    templates: loadTemplates(),
  };
}

export type ImportResult = {
  ok: boolean;
  error?: string;
  basketCount?: number;
  templateCount?: number;
};

export function applyImport(raw: string, mode: "replace" | "merge" = "replace"): ImportResult {
  try {
    const data = JSON.parse(raw);
    if (!data || data.type !== "idx-basket-export") {
      return { ok: false, error: "Invalid file" };
    }
    const basket: BasketState = {
      stocks: Array.isArray(data.basket?.stocks) ? data.basket.stocks.map(normalizeStock) : [],
      lastRefresh: data.basket?.lastRefresh ?? null,
    };
    const templates: Template[] = Array.isArray(data.templates)
      ? (data.templates as RawTemplate[]).map((t) => ({
          id: String(t.id ?? crypto.randomUUID()),
          name: String(t.name ?? "Untitled"),
          createdAt: Number(t.createdAt ?? Date.now()),
          stocks: Array.isArray(t.stocks) ? t.stocks.map(normalizeStock) : [],
        }))
      : [];

    if (mode === "replace") {
      saveBasket(basket);
      saveTemplates(templates);
    } else {
      // merge templates by id; keep current basket
      const current = loadTemplates();
      const map = new Map(current.map((t) => [t.id, t]));
      for (const t of templates) map.set(t.id, t);
      saveTemplates(Array.from(map.values()));
    }

    return {
      ok: true,
      basketCount: basket.stocks.length,
      templateCount: templates.length,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Parse error",
    };
  }
}

// ---------- Reset undo/redo history (survives brief refresh) ----------

export type ResetUndoSnapshot = {
  stocks: Stock[];
  lastRefresh: number | null;
  fetchedAt: Record<string, number>;
  dailyChanges: Record<string, number>;
  count: number;
  at: number;
};

export type ResetRedoSnapshot = {
  stocks: Stock[];
  count: number;
  summary: string;
  at: number;
};

export type ResetHistory = {
  undo: ResetUndoSnapshot | null;
  redo: ResetRedoSnapshot | null;
};

function normalizeNumRecord(v: unknown): Record<string, number> {
  if (!v || typeof v !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    const n = Number(val);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

export function loadResetHistory(): ResetHistory {
  if (typeof window === "undefined") return { undo: null, redo: null };
  try {
    const raw = localStorage.getItem(RESET_HISTORY_KEY);
    if (!raw) return { undo: null, redo: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { undo: null, redo: null };
    const now = Date.now();
    let undo: ResetUndoSnapshot | null = null;
    let redo: ResetRedoSnapshot | null = null;
    const u = (parsed as { undo?: unknown }).undo;
    if (u && typeof u === "object") {
      const raw = u as Record<string, unknown>;
      const at = Number(raw.at);
      const stocks = Array.isArray(raw.stocks) ? raw.stocks.map(normalizeStock) : [];
      if (Number.isFinite(at) && now - at < RESET_HISTORY_TTL_MS && stocks.length > 0) {
        undo = {
          stocks,
          lastRefresh:
            raw.lastRefresh == null ? null : Number(raw.lastRefresh) || null,
          fetchedAt: normalizeNumRecord(raw.fetchedAt),
          dailyChanges: normalizeNumRecord(raw.dailyChanges),
          count: Number(raw.count) || stocks.length,
          at,
        };
      }
    }
    const r = (parsed as { redo?: unknown }).redo;
    if (r && typeof r === "object") {
      const raw = r as Record<string, unknown>;
      const at = Number(raw.at);
      const stocks = Array.isArray(raw.stocks) ? raw.stocks.map(normalizeStock) : [];
      if (Number.isFinite(at) && now - at < RESET_HISTORY_TTL_MS && stocks.length > 0) {
        redo = {
          stocks,
          count: Number(raw.count) || stocks.length,
          summary: typeof raw.summary === "string" ? raw.summary : "",
          at,
        };
      }
    }
    return { undo, redo };
  } catch {
    return { undo: null, redo: null };
  }
}

export function saveResetHistory(history: ResetHistory): void {
  if (typeof window === "undefined") return;
  try {
    if (!history.undo && !history.redo) {
      localStorage.removeItem(RESET_HISTORY_KEY);
      return;
    }
    localStorage.setItem(RESET_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore quota errors
  }
}

export function clearResetHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RESET_HISTORY_KEY);
  } catch {
    // ignore
  }
}
