import { createFileRoute, useRouter, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TrendingUp,
  Layers,
  Crown,
  AlertTriangle,
  RefreshCw,
  Twitter,
  Facebook,
  Send,
  Youtube,
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
import { QuickAddBar } from "@/components/QuickAddBar";
import { ShortcutsDialog } from "@/components/ShortcutsDialog";
import { LastUpdated } from "@/components/LastUpdated";
import { WeightControls } from "@/components/WeightControls";
import { EmptyWatchlist } from "@/components/EmptyWatchlist";

import { useShortcuts } from "@/hooks/use-shortcuts";
import { WATCHLIST_LABEL, WATCHLIST_NO_TICKER_TOAST } from "@/lib/copy";
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
import { enrichStocks, buildFormula, type WeightMode, type EnrichedStock } from "@/lib/weight";
import { getQuotes } from "@/lib/quotes.functions";
import { validateTicker } from "@/lib/ticker";
import { parseWatchlistParam, buildShareUrl } from "@/lib/share";
import { SITE_NAME, SHARES_AS_OF, TV_PREFIX } from "@/lib/site";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { list?: string } => ({
    list: typeof search.list === "string" ? search.list : undefined,
  }),
  head: () => ({
    meta: [
      { title: "IndexW — Watchlist Saham IDX Bobot Market Cap" },
      {
        name: "description",
        content:
          "Bikin watchlist saham IDX yang dibobotin market cap. Database 957+ emiten built-in, harga otomatis dari Yahoo Finance, formula TradingView siap salin.",
      },
      { property: "og:title", content: "IndexW — Watchlist Saham IDX" },
      {
        property: "og:description",
        content:
          "Ketik ticker → Enter → langsung dapat market cap, weight, dan formula TradingView. Tools indie untuk investor IDX.",
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Gagal memuat halaman</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Terjadi kesalahan saat memuat watchlist. Coba muat ulang halaman.
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
            Coba lagi
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Muat ulang
          </button>
        </div>
      </div>
    </div>
  );
}

type Quote = {
  symbol: string;
  price: number | null;
  currency: string | null;
  error?: string;
};

function humanError(err: string | undefined): string {
  if (!err) return "Gagal ambil harga";
  const e = err.toLowerCase();
  if (e.includes("404") || e.includes("not found")) return "Ticker tidak ditemukan";
  if (e.includes("no price")) return "Tidak ada data harga";
  if (e.includes("timeout") || e.includes("network") || e.includes("fetch")) return "Koneksi gagal";
  return "Gagal ambil harga";
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
  toast.success("Watchlist di-export ke CSV");
}

function IndexPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [fetchedAt, setFetchedAt] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [saveDialogTrigger, setSaveDialogTrigger] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(() => ({
    weightMode: "mcap",
    capPct: null,
    usePrefix: true,
    sort: "manual",
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

  const capFraction = settings.capPct != null ? settings.capPct / 100 : null;

  const enriched = useMemo(
    () => enrichStocks(stocks, { mode: settings.weightMode, cap: capFraction }),
    [stocks, settings.weightMode, capFraction],
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

  const formula = useMemo(
    () => buildFormula(sortedRows, settings.usePrefix ? TV_PREFIX : ""),
    [sortedRows, settings.usePrefix],
  );

  useEffect(() => {
    formulaRef.current = formula;
  }, [formula]);

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
    setFailedIds((prev) => {
      if (!prev.has(id)) return prev;
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    setFetchedAt((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    rowHandlersRef.current.delete(id);

    if (removed) {
      toast.success(`${removed.ticker || "Saham"} dihapus`, {
        action: {
          label: "Urungkan",
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
    setFailedIds(new Set());
    setFetchedAt({});
  }

  async function fetchTickerForRow(
    id: string,
    ticker: string,
    opts: { silent?: boolean } = {},
  ): Promise<{ ok: boolean; ticker: string; error?: string }> {
    const v = validateTicker(ticker);
    if (!v.ok) {
      update(id, { error: v.error });
      if (!opts.silent) toast.error(`${ticker || "(kosong)"}: ${v.error}`);
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
        const msg = "Tidak ada respons";
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
      toast.info(`${ticker} sudah ada di watchlist`);
      if (!existing.manualPrice) fetchTickerForRow(existing.id, ticker, { silent: true });
      return;
    }
    const id = crypto.randomUUID();
    const sharesFromDb = IDX_SHARES[ticker];
    if (sharesFromDb == null) {
      toast.warning(`${ticker} tidak ada di database shares IDX — isi manual ya.`);
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
    toast.success(`${fresh.length} saham dimuat`);
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
      toast.success(`Ditambahkan dari link: ${additions.length} saham`);
    }
    navigate({ to: "/", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, search.list]);

  async function refreshList(list: Stock[], opts: { isRetry?: boolean } = {}) {
    if (list.length === 0) {
      toast.info(WATCHLIST_NO_TICKER_TOAST);
      return;
    }
    const label = opts.isRetry ? "Mencoba ulang" : "Memperbarui";
    const toastId = toast.loading(`${label} ${list.length} ticker…`);
    const results = await Promise.all(
      list.map(async (s) => {
        const r = await fetchTickerForRow(s.id, s.ticker.trim().toUpperCase(), { silent: true });
        return { ...r, id: s.id };
      }),
    );
    const failed = results.filter((r) => !r.ok);
    const succeededIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
    const failedIdSet = new Set(failed.map((r) => r.id));

    setFailedIds((prev) => {
      const next = new Set(prev);
      for (const id of succeededIds) next.delete(id);
      for (const id of failedIdSet) next.add(id);
      return next;
    });

    if (failed.length === 0) {
      toast.success(`Berhasil memperbarui ${results.length} ticker`, { id: toastId });
    } else if (failed.length === results.length) {
      toast.error(`Gagal memperbarui semua ticker (${failed.length})`, {
        id: toastId,
        description: failed
          .slice(0, 3)
          .map((f) => `${f.ticker}: ${f.error}`)
          .join(" · "),
      });
    } else {
      toast.warning(`${results.length - failed.length} berhasil, ${failed.length} gagal`, {
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

  async function retryFailed() {
    const list = stocks.filter((s) => failedIds.has(s.id) && s.ticker.trim() && !s.manualPrice);
    if (list.length === 0) {
      toast.info("Tidak ada ticker gagal untuk dicoba ulang");
      return;
    }
    await refreshList(list, { isRetry: true });
  }

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
      toast.info("Belum ada formula untuk disalin");
      return;
    }
    navigator.clipboard
      .writeText(f)
      .then(() => toast.success("Formula disalin"))
      .catch(() => toast.error("Gagal menyalin"));
  }

  function shareWatchlist() {
    const withTicker = stocks.filter((s) => s.ticker.trim());
    if (withTicker.length === 0) {
      toast.info("Tambah saham dulu sebelum membagikan");
      return;
    }
    const url = buildShareUrl(withTicker);
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link watchlist disalin", { description: url }))
      .catch(() => toast.error("Gagal menyalin link"));
  }

  // Global keyboard shortcuts
  useShortcuts([
    { key: "n", handler: () => quickAddRef.current?.focus() },
    { key: "r", shift: true, handler: () => refreshAll() },
    { key: "s", shift: true, handler: () => setSaveDialogTrigger((n) => n + 1) },
    { key: "c", shift: true, allowInInput: true, handler: () => copyFormula() },
    { key: "?", allowInInput: true, handler: () => setShortcutsOpen(true) },
  ]);

  const setMode = useCallback(
    (weightMode: WeightMode) => setSettings((s) => ({ ...s, weightMode })),
    [],
  );
  const setCap = useCallback((capPct: number | null) => setSettings((s) => ({ ...s, capPct })), []);
  const setSort = useCallback((sort: SortKey) => setSettings((s) => ({ ...s, sort })), []);
  const togglePrefix = useCallback(
    () => setSettings((s) => ({ ...s, usePrefix: !s.usePrefix })),
    [],
  );

  const hasRows = enriched.rows.length > 0;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Toaster position="top-center" richColors />
      <AppHeader
        actions={
          <SettingsMenu
            currentStocks={stocks}
            loadingCount={loadingIds.size}
            onRefreshAll={refreshAll}
            onAddEmpty={addEmpty}
            onReset={resetWatchlist}
            onLoadTemplate={loadFromTemplate}
            onAfterImport={reloadFromStorage}
            onOpenShortcuts={() => setShortcutsOpen(true)}
            onExportCsv={() => downloadCsv(sortedRows, settings.weightMode)}
            saveDialogTrigger={saveDialogTrigger}
          />
        }
      />

      <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-6 sm:pt-8">
        <h1 className="sr-only">IndexW — Kalkulator Bobot Index Saham IDX untuk TradingView</h1>

        {/* Stats */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <StatCard
              label="Total Market Cap"
              value={formatIDR(enriched.total)}
              icon={TrendingUp}
            />
            <StatCard
              label="Bobot Terbesar"
              icon={Crown}
              value={
                enriched.largest.weight > 0
                  ? `${enriched.largest.ticker} · ${formatPct(enriched.largest.weight)}`
                  : "—"
              }
            />
            <StatCard label="Komponen" icon={Layers} value={String(stocks.length)} />
          </div>
        </section>

        {/* Freshness + refresh + retry */}
        {hasRows ? (
          <div className="mt-4">
            <LastUpdated
              lastRefresh={lastRefresh}
              loading={loadingIds.size > 0}
              onRefresh={refreshAll}
              failedCount={failedIds.size}
              onRetryFailed={retryFailed}
            />
          </div>
        ) : null}

        {/* Watchlist */}
        <section className="mt-6">
          <div className="mb-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {WATCHLIST_LABEL}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ketik ticker di bawah lalu tekan{" "}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                Enter
              </kbd>{" "}
              untuk langsung menambah & auto-fill harga.
            </p>
          </div>

          {/* Quick add bar */}
          <div className="mb-3">
            <QuickAddBar ref={quickAddRef} onAdd={addTicker} />
          </div>

          {hasRows ? (
            <div className="mb-3">
              <WeightControls
                mode={settings.weightMode}
                onModeChange={setMode}
                capPct={settings.capPct}
                onCapChange={setCap}
                sort={settings.sort}
                onSortChange={setSort}
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
                  <p className="text-sm font-medium text-foreground">Belum ada data harga</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tekan Refresh di atas atau commit ulang ticker untuk mengambil harga terbaru.
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
                usePrefix={settings.usePrefix}
                onTogglePrefix={togglePrefix}
                onShare={shareWatchlist}
              />
              <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted-foreground/80">
                Bobot:{" "}
                {settings.weightMode === "freefloat"
                  ? "free-float adjusted market cap"
                  : "full market cap"}
                {settings.capPct != null ? ` · cap ${settings.capPct}% / saham` : ""}. Shares per{" "}
                {SHARES_AS_OF}. Harga close/delayed via Yahoo Finance — bukan rekomendasi investasi.
              </p>
            </div>
          )}
        </section>

        <footer className="mt-10 bg-transparent">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-3 py-3 text-[11px] text-muted-foreground">
            <a
              href="https://t.me/alfindigital"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <Send className="h-3 w-3 text-primary" />
              Dapat kabar saat data shares & fitur diperbarui
            </a>
            <div className="flex items-center gap-2">
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
                  { href: "https://facebook.com/alfindigital", label: "Facebook", Icon: Facebook },
                  { href: "https://t.me/alfindigital", label: "Telegram", Icon: Send },
                  { href: "https://youtube.com/@alfindigital", label: "YouTube", Icon: Youtube },
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
            <span className="text-muted-foreground/70">
              {SITE_NAME} · Data IDX bundled · Harga via Yahoo Finance
            </span>
          </div>
        </footer>
      </main>

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
