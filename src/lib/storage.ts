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

// ---------- App settings (weighting / display preferences) ----------

export type WeightModeSetting = "mcap" | "freefloat";
export type SortKey = "manual" | "weight" | "mcap" | "ticker";

export type AppSettings = {
  weightMode: WeightModeSetting;
  sort: SortKey;
};

export const DEFAULT_SETTINGS: AppSettings = {
  weightMode: "mcap",
  sort: "manual",
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
      return { ok: false, error: "File tidak valid" };
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
