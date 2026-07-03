import { createFileRoute, useRouter, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TrendingUp,
  Layers,
  Crown,
  AlertTriangle,
  RefreshCw,
  Keyboard,
  Twitter,
  Send,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { StatCard } from "@/components/StatCard";
import { StockRow } from "@/components/StockRow";
import { StockListSkeleton } from "@/components/StockRowSkeleton";
import { VirtualStockList } from "@/components/VirtualStockList";
import { FloatingFormula } from "@/components/FloatingFormula";
import { SettingsMenu } from "@/components/SettingsMenu";
import { TemplatesMenu } from "@/components/TemplatesMenu";
import { QuickAddBar } from "@/components/QuickAddBar";
import { ShortcutsDialog } from "@/components/ShortcutsDialog";
import { WeightControls } from "@/components/WeightControls";
import { EmptyWatchlist } from "@/components/EmptyWatchlist";
import { Button } from "@/components/ui/button";
import { HEADER_ICON_BUTTON_CLASS, HEADER_ICON_CLASS } from "@/components/header-actions";

import { useShortcuts } from "@/hooks/use-shortcuts";
import { WATCHLIST_NO_TICKER_TOAST } from "@/lib/copy";
import {
  loadBasket,
  saveBasket,
  newStock,
  loadSettings,
  saveSettings,
  type Stock,
  type AppSettings,
  type SortKey,
} from "@/lib/storage";
import { IDX_SHARES } from "@/data/idx-shares";
import { formatIDR, formatPct } from "@/lib/format";
import { enrichStocks, buildFormula, buildPineScript, type WeightMode, type EnrichedStock } from "@/lib/weight";
import { getQuotes } from "@/lib/quotes.functions";
import { validateTicker } from "@/lib/ticker";
import { parseWatchlistParam, buildShareUrl } from "@/lib/share";
import { TV_PREFIX } from "@/lib/site";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { list?: string } => ({
    list: typeof search.list === "string" ? search.list : undefined,
  }),
  head: () => ({
    meta: [
      { title: "IndexW — IDX Stock Watchlist Market Cap Weighted" },
      {
        name: "description",
        content:
          "Build an IDX stock watchlist weighted by market cap. 957+ built-in issuers, auto-prices from Yahoo Finance, ready-to-copy TradingView formula.",
      },
      { property: "og:title", content: "IndexW — IDX Stock Watchlist" },
      {
        property: "og:description",
        content:
          "Type ticker → Enter → instantly get market cap, weight, and TradingView formula. Indie tool for IDX investors.",
      },
    ],
  }),
  component: IndexPage,
  errorComponent: IndexErrorBoundary,
});

function IndexErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Failed to load page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An error occurred while loading the watchlist. Try reloading the page.
        </p>
        {import.meta.env.DEV && error?.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}

type Quote = {
  symbol: string;
  price: number | null;
  previousClose: number | null;
  currency: string | null;
  error?: string;
};

// After this many ms without a successful refresh, we treat a row's price as
// "stale" in the UI (small gray badge). Chosen to match the trader mental model
// of "refresh at least every 5 minutes if you care about live prices".
const STALE_AFTER_MS = 5 * 60 * 1000;
const AUTO_REFRESH_INTERVAL_MS = 60 * 1000;

function humanError(err: string | undefined): string {
  if (!err) return "Failed to fetch price";
  const e = err.toLowerCase();
  if (e.includes("404") || e.includes("not found")) return "Ticker not found";
  if (e.includes("no price")) return "No price data";
  if (e.includes("timeout") || e.includes("network") || e.includes("fetch")) return "Connection failed";
  return "Failed to fetch price";
}

function downloadCsv(rows: EnrichedStock[], mode: WeightMode) {
  const header = [
    "ticker",
    "shares_juta",
    "price_idr",
    "market_cap_idr",
    "free_float_pct",
    "weight_pct",
  ];
  const lines = rows
    .filter((r) => r.ticker)
    .map((r) =>
      [
        r.ticker,
        r.shares ?? 0,
        r.price ?? 0,
        Math.round(r.marketCap),
        mode === "freefloat" ? (r.freeFloat ?? 100) : "",
        (r.weight * 100).toFixed(4),
      ].join(","),
    );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `indexw-watchlist-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("Watchlist exported to CSV");
}

function IndexPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [fetchedAt, setFetchedAt] = useState<Record<string, number>>({});
  const [dailyChanges, setDailyChanges] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [saveDialogTrigger, setSaveDialogTrigger] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(() => ({
    weightMode: "mcap",
    sort: "manual",
    autoRefresh: false,
  }));
  const didInitialFetch = useRef(false);
  const didConsumeList = useRef(false);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const formulaRef = useRef<string>("");
  const stocksRef = useRef<Stock[]>([]);
  const getQuotesServer = useServerFn(getQuotes);
  // Stable per-row handler cache so memoized StockRow doesn't re-render
  // every time the parent re-renders.
  const rowHandlersRef = useRef(
    new Map<
      string,
      {
        onChange: (patch: Partial<Stock>) => void;
        onCommitTicker: (t: string) => void;
        onRemove: () => void;
        onCommitPrice: () => void;
        onEnableAuto: () => void;
      }
    >(),
  );
  const fetchTickerRef = useRef<
    (
      id: string,
      ticker: string,
      opts?: { silent?: boolean },
    ) => Promise<{ ok: boolean; ticker: string; error?: string }>
  >(async () => ({ ok: false, ticker: "" }));

  // Hydrate from localStorage
  useEffect(() => {
    const s = loadBasket();
    setStocks(s.stocks);
    setLastRefresh(s.lastRefresh);
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  // Keep a ref of the latest stocks for stable callbacks (avoids stale closures).
  useEffect(() => {
    stocksRef.current = stocks;
  }, [stocks]);

  // Persist basket on change
  useEffect(() => {
    if (!hydrated) return;
    saveBasket({ stocks, lastRefresh });
  }, [stocks, lastRefresh, hydrated]);

  // Persist settings on change
  useEffect(() => {
    if (!hydrated) return;
    saveSettings(settings);
  }, [settings, hydrated]);

  const enriched = useMemo(
    () => enrichStocks(stocks, { mode: settings.weightMode }),
    [stocks, settings.weightMode],
  );

  const sortedRows = useMemo(() => {
    const rows = enriched.rows;
    switch (settings.sort) {
      case "weight":
        return [...rows].sort((a, b) => b.weight - a.weight);
      case "mcap":
        return [...rows].sort((a, b) => b.marketCap - a.marketCap);
      case "ticker":
        return [...rows].sort((a, b) => a.ticker.localeCompare(b.ticker));
      default:
        return rows;
    }
  }, [enriched.rows, settings.sort]);

  const formula = useMemo(() => buildFormula(sortedRows, TV_PREFIX), [sortedRows]);
  const pineScript = useMemo(() => buildPineScript(sortedRows, { prefix: TV_PREFIX }), [sortedRows]);

  // Basket-level daily change: weight × per-name % change, summed. Only names
  // with a known previousClose contribute (weight of the rest is treated as 0),
  // so the number is "conservative" while any row is still loading.
  const totalDailyChange = useMemo(() => {
    let s = 0;
    for (const r of sortedRows) {
      const c = dailyChanges[r.id];
      if (c != null && isFinite(c)) s += r.weight * c;
    }
    return s;
  }, [sortedRows, dailyChanges]);

  // Which rows are "stale" (last fetch older than the threshold) — recomputed
  // whenever the periodic tick or fetch times change.
  const staleIds = useMemo(() => {
    const s = new Set<string>();
    for (const [id, ts] of Object.entries(fetchedAt)) {
      if (nowTick - ts > STALE_AFTER_MS) s.add(id);
    }
    return s;
  }, [fetchedAt, nowTick]);

  useEffect(() => {
    formulaRef.current = formula;
  }, [formula]);

  // Tick every 30s so "stale" badges and relative timestamps stay honest
  // without needing per-second re-renders. Pauses when the tab is hidden.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id != null) return;
      id = setInterval(() => setNowTick(Date.now()), 30_000);
    };
    const stop = () => {
      if (id != null) clearInterval(id);
      id = null;
    };
    const onVis = () => {
      if (document.hidden) stop();
      else {
        setNowTick(Date.now());
        start();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const update = useCallback((id: string, patch: Partial<Stock>) => {
    setStocks((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  function addEmpty() {
    setStocks((prev) => [...prev, newStock()]);
  }

  const remove = useCallback((id: string) => {
    const prevStocks = stocksRef.current;
    const idx = prevStocks.findIndex((s) => s.id === id);
    const removed = idx >= 0 ? prevStocks[idx] : null;

    setStocks((prev) => prev.filter((s) => s.id !== id));
    setLoadingIds((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    setFetchedAt((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    setDailyChanges((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    rowHandlersRef.current.delete(id);

    if (removed) {
      toast.success(`${removed.ticker || "Saham"} removed`, {
        action: {
          label: "Undo",
          onClick: () => {
            setStocks((cur) => {
              const copy = cur.slice();
              copy.splice(Math.min(idx, copy.length), 0, removed);
              return copy;
            });
          },
        },
      });
    }
  }, []);

  const enableAuto = useCallback(
    (id: string) => {
      update(id, { manualPrice: false });
      const s = stocksRef.current.find((x) => x.id === id);
      if (s?.ticker) fetchTickerRef.current(id, s.ticker.trim().toUpperCase());
    },
    [update],
  );

  const getRowHandlers = useCallback(
    (id: string) => {
      const cache = rowHandlersRef.current;
      const existing = cache.get(id);
      if (existing) return existing;
      const handlers = {
        onChange: (patch: Partial<Stock>) => update(id, patch),
        onCommitTicker: (t: string) => fetchTickerRef.current(id, t),
        onRemove: () => remove(id),
        onCommitPrice: () => quickAddRef.current?.focus(),
        onEnableAuto: () => enableAuto(id),
      };
      cache.set(id, handlers);
      return handlers;
    },
    [update, remove, enableAuto],
  );

  function resetWatchlist() {
    setStocks([]);
    setLastRefresh(null);
    setLoadingIds(new Set());
    setFetchedAt({});
    setDailyChanges({});
  }

  async function fetchTickerForRow(
    id: string,
    ticker: string,
    opts: { silent?: boolean } = {},
  ): Promise<{ ok: boolean; ticker: string; error?: string }> {
    const v = validateTicker(ticker);
    if (!v.ok) {
      update(id, { error: v.error });
      if (!opts.silent) toast.error(`${ticker || "(empty)"}: ${v.error}`);
      return { ok: false, ticker, error: v.error };
    }
    const cleanTicker = v.ticker;
    setLoadingIds((prev) => new Set(prev).add(id));
    try {
      const data: { quotes: Quote[] } = await getQuotesServer({
        data: { tickers: [cleanTicker] },
      });
      const q = data.quotes[0];
      if (!q) {
        const msg = "No response";
        update(id, { error: msg });
        if (!opts.silent) toast.error(`${ticker}: ${msg}`);
        return { ok: false, ticker, error: msg };
      }
      if (q.price != null) {
        const stock = stocksRef.current.find((s) => s.id === id);
        if (stock?.manualPrice) {
          update(id, { error: null });
        } else {
          update(id, { price: Number(q.price), error: null });
        }
        const now = Date.now();
        setLastRefresh(now);
        setFetchedAt((prev) => ({ ...prev, [id]: now }));
        // Track daily % change vs. previous close, if provider returned it.
        if (q.previousClose != null && q.previousClose > 0) {
          const pct = (Number(q.price) - Number(q.previousClose)) / Number(q.previousClose);
          setDailyChanges((prev) => ({ ...prev, [id]: pct }));
        }
        return { ok: true, ticker };
      }
      const msg = humanError(q.error);
      update(id, { error: msg });
      if (!opts.silent) toast.error(`${ticker}: ${msg}`);
      return { ok: false, ticker, error: msg };
    } catch (err) {
      const msg = humanError(err instanceof Error ? err.message : "fetch");
      update(id, { error: msg });
      if (!opts.silent) toast.error(`${ticker}: ${msg}`);
      return { ok: false, ticker, error: msg };
    } finally {
      setLoadingIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  }
  fetchTickerRef.current = fetchTickerForRow;

  // Add ticker via quick-add: dedupe, create row with shares from DB, fetch.
  function addTicker(rawTicker: string) {
    const result = validateTicker(rawTicker);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const ticker = result.ticker;
    const existing = stocksRef.current.find((s) => s.ticker.trim().toUpperCase() === ticker);
    if (existing) {
      toast.info(`${ticker} already in watchlist`);
      if (!existing.manualPrice) fetchTickerForRow(existing.id, ticker, { silent: true });
      return;
    }
    const id = crypto.randomUUID();
    const sharesFromDb = IDX_SHARES[ticker];
    if (sharesFromDb == null) {
      toast.warning(`${ticker} not in IDX shares database — fill manually.`);
    }
    const stock: Stock = {
      id,
      ticker,
      shares: sharesFromDb ?? 0,
      price: 0,
      manualShares: false,
      manualPrice: false,
      freeFloat: null,
      error: null,
    };
    setStocks((prev) => [...prev, stock]);
    setTimeout(() => fetchTickerForRow(id, ticker), 0);
  }

  function loadPreset(tickers: string[]) {
    const fresh: Stock[] = tickers.map((t) => ({
      id: crypto.randomUUID(),
      ticker: t,
      shares: IDX_SHARES[t] ?? 0,
      price: 0,
      manualShares: false,
      manualPrice: false,
      freeFloat: null,
      error: null,
    }));
    setStocks(fresh);
    setTimeout(() => {
      fresh.forEach((s) => fetchTickerForRow(s.id, s.ticker, { silent: true }));
    }, 0);
    toast.success(`${fresh.length} stocks loaded`);
  }

  // Auto-fetch all on first mount
  useEffect(() => {
    if (!hydrated || didInitialFetch.current) return;
    didInitialFetch.current = true;
    const tickersToFetch = stocks
      .filter((s) => s.ticker.trim() && !s.manualPrice)
      .map((s) => ({ id: s.id, ticker: s.ticker.trim().toUpperCase() }));
    if (tickersToFetch.length === 0) return;
    tickersToFetch.forEach(({ id, ticker }) => fetchTickerForRow(id, ticker, { silent: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Consume ?list=BBCA,BBRI share/deeplink param: merge-add (non-destructive).
  useEffect(() => {
    if (!hydrated || didConsumeList.current) return;
    const param = search.list;
    if (!param) return;
    didConsumeList.current = true;
    const tickers = parseWatchlistParam(param);
    const have = new Set(stocksRef.current.map((s) => s.ticker.trim().toUpperCase()));
    const additions: Stock[] = [];
    for (const t of tickers) {
      if (have.has(t)) continue;
      have.add(t);
      additions.push({
        id: crypto.randomUUID(),
        ticker: t,
        shares: IDX_SHARES[t] ?? 0,
        price: 0,
        manualShares: false,
        manualPrice: false,
        freeFloat: null,
        error: null,
      });
    }
    if (additions.length > 0) {
      setStocks((prev) => [...prev, ...additions]);
      setTimeout(() => {
        additions.forEach((s) => fetchTickerForRow(s.id, s.ticker, { silent: true }));
      }, 0);
      toast.success(`Added from link: ${additions.length} stocks`);
    }
    navigate({ to: "/", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, search.list]);

  async function refreshList(list: Stock[], opts: { isRetry?: boolean } = {}) {
    if (list.length === 0) {
      toast.info(WATCHLIST_NO_TICKER_TOAST);
      return;
    }
    const label = opts.isRetry ? "Retrying" : "Updating";
    const toastId = toast.loading(`${label} ${list.length} ticker…`);
    const results = await Promise.all(
      list.map(async (s) => {
        const r = await fetchTickerForRow(s.id, s.ticker.trim().toUpperCase(), { silent: true });
        return { ...r, id: s.id };
      }),
    );
    const failed = results.filter((r) => !r.ok);

    if (failed.length === 0) {
      toast.success(`Successfully updated ${results.length} ticker`, { id: toastId });
    } else if (failed.length === results.length) {
      toast.error(`Failed to update all tickers (${failed.length})`, {
        id: toastId,
        description: failed
          .slice(0, 3)
          .map((f) => `${f.ticker}: ${f.error}`)
          .join(" · "),
      });
    } else {
      toast.warning(`${results.length - failed.length} succeeded, ${failed.length} failed`, {
        id: toastId,
        description: failed
          .slice(0, 3)
          .map((f) => `${f.ticker}: ${f.error}`)
          .join(" · "),
      });
    }
  }

  async function refreshAll() {
    const list = stocks.filter((s) => s.ticker.trim() && !s.manualPrice);
    await refreshList(list);
  }

  // Auto-refresh loop: fires every AUTO_REFRESH_INTERVAL_MS while enabled AND
  // the tab is visible. Skips when a refresh is already in-flight so we never
  // stack concurrent basket refreshes.
  useEffect(() => {
    if (!hydrated || !settings.autoRefresh) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || document.hidden) return;
      if (loadingIds.size > 0) return;
      const list = stocksRef.current.filter((s) => s.ticker.trim() && !s.manualPrice);
      if (list.length === 0) return;
      const results = await Promise.all(
        list.map((s) =>
          fetchTickerRef.current(s.id, s.ticker.trim().toUpperCase(), { silent: true }),
        ),
      );
      if (!cancelled && import.meta.env.DEV) {
        console.debug("[auto-refresh] tick", { updated: results.length });
      }
    };
    const id = setInterval(tick, AUTO_REFRESH_INTERVAL_MS);
    const onVis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
    // loadingIds intentionally omitted — the guard reads it via closure freshness
    // on the next tick, and including it would restart the interval too often.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, settings.autoRefresh]);

  const toggleAutoRefresh = useCallback(() => {
    setSettings((s) => {
      const next = !s.autoRefresh;
      toast.success(next ? "Auto-refresh 60s: ON" : "Auto-refresh: OFF");
      return { ...s, autoRefresh: next };
    });
  }, []);

  function loadFromTemplate(stocks: Stock[]) {
    setStocks(stocks);
    setTimeout(() => {
      stocks
        .filter((s) => s.ticker.trim() && !s.manualPrice)
        .forEach((s) => fetchTickerForRow(s.id, s.ticker.trim().toUpperCase()));
    }, 0);
  }

  function reloadFromStorage() {
    const s = loadBasket();
    setStocks(s.stocks);
    setLastRefresh(s.lastRefresh);
    didInitialFetch.current = false;
  }

  function copyFormula() {
    const f = formulaRef.current;
    if (!f) {
      toast.info("No formula to copy yet");
      return;
    }
    navigator.clipboard
      .writeText(f)
      .then(() => toast.success("Formula copied"))
      .catch(() => toast.error("Failed to copy"));
  }

  function shareWatchlist() {
    const withTicker = stocks.filter((s) => s.ticker.trim());
    if (withTicker.length === 0) {
      toast.info("Add stocks first before sharing");
      return;
    }
    const url = buildShareUrl(withTicker);
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Watchlist link copied", { description: url }))
      .catch(() => toast.error("Failed to copy link"));
  }

  // Global keyboard shortcuts
  useShortcuts([
    { key: "n", handler: () => quickAddRef.current?.focus() },
    { key: "a", handler: () => addEmpty() },
    { key: "r", shift: true, handler: () => refreshAll() },
    {
      key: "f",
      shift: true,
      handler: () =>
        setSettings((s) => ({
          ...s,
          weightMode: s.weightMode === "mcap" ? "freefloat" : "mcap",
        })),
    },
    { key: "s", shift: true, handler: () => setSaveDialogTrigger((n) => n + 1) },
    { key: "c", shift: true, allowInInput: true, handler: () => copyFormula() },
    { key: "e", shift: true, handler: () => downloadCsv(sortedRows, settings.weightMode) },
    { key: "?", allowInInput: true, handler: () => setShortcutsOpen(true) },
  ]);

  const setMode = useCallback(
    (weightMode: WeightMode) => setSettings((s) => ({ ...s, weightMode })),
    [],
  );
  const setSort = useCallback((sort: SortKey) => setSettings((s) => ({ ...s, sort })), []);

  const hasRows = enriched.rows.length > 0;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Toaster position="top-center" richColors />
      <AppHeader
        actions={
          <>
            <TemplatesMenu
              currentStocks={stocks}
              onLoadTemplate={loadFromTemplate}
              saveDialogTrigger={saveDialogTrigger}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={HEADER_ICON_BUTTON_CLASS}
              aria-label="Help & keyboard shortcuts"
              title="Help & keyboard shortcuts"
              onClick={() => setShortcutsOpen(true)}
            >
              <Keyboard className={HEADER_ICON_CLASS} />
            </Button>
            <SettingsMenu
              currentStocks={stocks}
              loadingCount={loadingIds.size}
              autoRefresh={settings.autoRefresh}
              onToggleAutoRefresh={toggleAutoRefresh}
              onRefreshAll={refreshAll}
              onAddEmpty={addEmpty}
              onReset={resetWatchlist}
              onAfterImport={reloadFromStorage}
              onExportCsv={() => downloadCsv(sortedRows, settings.weightMode)}
              onShareLink={shareWatchlist}
            />
          </>
        }
      />

      <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-6 sm:pt-8">
        <h1 className="sr-only">IndexW — IDX Stock Index Weight Calculator for TradingView</h1>

        {/* Stats */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <StatCard
              label="Total Market Cap"
              value={formatIDR(enriched.total)}
              icon={TrendingUp}
            />
            <StatCard
              label="Today's Change"
              icon={totalDailyChange >= 0 ? TrendingUp : Crown}
              value={
                Object.keys(dailyChanges).length === 0
                  ? "—"
                  : `${totalDailyChange >= 0 ? "+" : ""}${(totalDailyChange * 100).toFixed(2)}%`
              }
              sub="weight × change"
            />
            <StatCard
              label="Largest Weight"
              icon={Crown}
              value={
                enriched.largest.weight > 0
                  ? `${enriched.largest.ticker} · ${formatPct(enriched.largest.weight)}`
                  : "—"
              }
            />
            <StatCard label="Components" icon={Layers} value={String(stocks.length)} />
          </div>
        </section>

        {/* Watchlist */}
        <section className="mt-6">
          {/* Quick add bar */}
          <div className="mb-3">
            <QuickAddBar ref={quickAddRef} onAdd={addTicker} />
          </div>

          {hasRows ? (
            <div className="mb-3">
              <WeightControls
                mode={settings.weightMode}
                onModeChange={setMode}
                sort={settings.sort}
                onSortChange={setSort}
                onRefresh={refreshAll}
                refreshing={loadingIds.size > 0}
              />
            </div>
          ) : null}

          <div className="space-y-2.5">
            {!hydrated ? (
              <StockListSkeleton count={3} />
            ) : !hasRows ? (
              <EmptyWatchlist onLoadPreset={loadPreset} />
            ) : enriched.total === 0 && loadingIds.size === 0 ? (
              <>
                <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
                  <p className="text-sm font-medium text-foreground">No price data yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Press the refresh icon above or re-commit ticker to fetch the latest price.
                  </p>
                </div>
                {sortedRows.map((r) => {
                  const h = getRowHandlers(r.id);
                  return (
                    <StockRow
                      key={r.id}
                      stock={r}
                      marketCap={r.marketCap}
                      weight={r.weight}
                      loading={loadingIds.has(r.id)}
                      lastFetchedAt={fetchedAt[r.id] ?? null}
                      weightMode={settings.weightMode}
                      dailyChange={dailyChanges[r.id] ?? null}
                      stale={staleIds.has(r.id)}
                      onChange={h.onChange}
                      onCommitTicker={h.onCommitTicker}
                      onRemove={h.onRemove}
                      onCommitPrice={h.onCommitPrice}
                      onEnableAuto={h.onEnableAuto}
                    />
                  );
                })}
              </>
            ) : sortedRows.length > 15 ? (
              <VirtualStockList
                rows={sortedRows}
                loadingIds={loadingIds}
                fetchedAt={fetchedAt}
                weightMode={settings.weightMode}
                dailyChanges={dailyChanges}
                staleIds={staleIds}
                getRowHandlers={getRowHandlers}
              />
            ) : (
              sortedRows.map((r) => {
                const h = getRowHandlers(r.id);
                return (
                  <StockRow
                    key={r.id}
                    stock={r}
                    marketCap={r.marketCap}
                    weight={r.weight}
                    loading={loadingIds.has(r.id)}
                    lastFetchedAt={fetchedAt[r.id] ?? null}
                    weightMode={settings.weightMode}
                    dailyChange={dailyChanges[r.id] ?? null}
                    stale={staleIds.has(r.id)}
                    onChange={h.onChange}
                    onCommitTicker={h.onCommitTicker}
                    onRemove={h.onRemove}
                    onCommitPrice={h.onCommitPrice}
                    onEnableAuto={h.onEnableAuto}
                  />
                );
              })
            )}
          </div>

          {/* Formula — inline, di bawah hasil */}
          {hasRows && (
            <div className="mt-5">
              <FloatingFormula
                formula={formula}
                pineScript={pineScript}
                onShare={shareWatchlist}
              />
            </div>
          )}
        </section>

        <footer className="mt-20 bg-transparent">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-center gap-2 px-3 py-3 text-[11px] text-muted-foreground">
            <span>
              by{" "}
              <a
                href="https://alfindigital.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                @alfindigital
              </a>
            </span>
            <span aria-hidden className="text-muted-foreground/40">
              |
            </span>
            <nav aria-label="Sosial media" className="flex items-center gap-1">
              {[
                { href: "https://x.com/alfindigital", label: "X (Twitter)", Icon: Twitter },
                { href: "https://t.me/alfidx", label: "Telegram", Icon: Send },
              ].map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </a>
              ))}
            </nav>
          </div>
        </footer>
      </main>

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
