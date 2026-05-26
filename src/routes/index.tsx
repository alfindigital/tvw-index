import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp, Layers, Crown, Plus, AlertTriangle, RefreshCw, Twitter, Facebook, Send, Youtube } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { StatCard } from "@/components/StatCard";
import { StockRow } from "@/components/StockRow";
import { FloatingFormula } from "@/components/FloatingFormula";
import { SettingsMenu } from "@/components/SettingsMenu";
import { QuickAddBar } from "@/components/QuickAddBar";
import { ShortcutsDialog } from "@/components/ShortcutsDialog";
import { LastUpdated } from "@/components/LastUpdated";
import { useShortcuts } from "@/hooks/use-shortcuts";
import {
  WATCHLIST_LABEL,
  WATCHLIST_EMPTY_TITLE,
  WATCHLIST_EMPTY_HINT,
  WATCHLIST_NO_TICKER_TOAST,
} from "@/lib/copy";
import {
  loadBasket,
  saveBasket,
  newStock,
  type Stock,
} from "@/lib/storage";
import { IDX_SHARES } from "@/data/idx-shares";
import { formatIDR } from "@/lib/format";
import { getQuotes } from "@/lib/quotes.functions";
import { validateTicker } from "@/lib/ticker";

export const Route = createFileRoute("/")({
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
      { property: "og:url", content: "https://tv-weight-index.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://tv-weight-index.lovable.app/" },
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Gagal memuat halaman
        </h1>
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
  if (e.includes("timeout") || e.includes("network") || e.includes("fetch"))
    return "Koneksi gagal";
  return "Gagal ambil harga";
}

function IndexPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [saveDialogTrigger, setSaveDialogTrigger] = useState(0);
  const didInitialFetch = useRef(false);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const formulaRef = useRef<string>("");
  const getQuotesServer = useServerFn(getQuotes);


  // Hydrate from localStorage
  useEffect(() => {
    const s = loadBasket();
    setStocks(s.stocks);
    setLastRefresh(s.lastRefresh);
    setHydrated(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (!hydrated) return;
    saveBasket({ stocks, lastRefresh });
  }, [stocks, lastRefresh, hydrated]);

  const enriched = useMemo(() => {
    const rows = stocks.map((s) => {
      const marketCap = (s.shares || 0) * (s.price || 0) * 1_000_000;
      return { ...s, marketCap };
    });
    const total = rows.reduce((a, b) => a + b.marketCap, 0);
    const withWeight = rows.map((r) => ({
      ...r,
      weight: total > 0 ? r.marketCap / total : 0,
    }));
    const largest = withWeight.reduce(
      (best, cur) => (cur.weight > best.weight ? cur : best),
      { ticker: "—", weight: 0 } as { ticker: string; weight: number },
    );
    return { rows: withWeight, total, largest };
  }, [stocks]);

  const formula = useMemo(() => {
    return enriched.rows
      .filter((r) => r.ticker && r.weight > 0)
      .map((r) => {
        const sym = r.ticker.replace(/\.JK$/i, "").toUpperCase();
        return `${sym}*${r.weight.toFixed(4)}`;
      })
      .join(" + ");
  }, [enriched.rows]);

  // Keep ref in sync for shortcut access
  useEffect(() => {
    formulaRef.current = formula;
  }, [formula]);

  function update(id: string, patch: Partial<Stock>) {
    setStocks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  }

  function addEmpty() {
    setStocks((prev) => [...prev, newStock()]);
  }

  function remove(id: string) {
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
  }

  function resetWatchlist() {
    setStocks([]);
    setLastRefresh(null);
    setLoadingIds(new Set());
    setFailedIds(new Set());
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
        const stock = stocks.find((s) => s.id === id);
        if (stock?.manualPrice) {
          update(id, { error: null });
        } else {
          update(id, { price: Number(q.price), error: null });
        }
        setLastRefresh(Date.now());
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

  // Add ticker via quick-add: create row with shares from DB and trigger fetch
  function addTicker(rawTicker: string) {
    const result = validateTicker(rawTicker);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const ticker = result.ticker;
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
      error: null,
    };
    setStocks((prev) => [...prev, stock]);
    // Trigger fetch on next tick so state is committed
    setTimeout(() => fetchTickerForRow(id, ticker), 0);
  }


  // Auto-fetch all on first mount
  useEffect(() => {
    if (!hydrated || didInitialFetch.current) return;
    didInitialFetch.current = true;
    const tickersToFetch = stocks
      .filter((s) => s.ticker.trim() && !s.manualPrice)
      .map((s) => ({ id: s.id, ticker: s.ticker.trim().toUpperCase() }));
    if (tickersToFetch.length === 0) return;
    tickersToFetch.forEach(({ id, ticker }) =>
      fetchTickerForRow(id, ticker, { silent: true }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  async function refreshList(
    list: Stock[],
    opts: { isRetry?: boolean } = {},
  ) {
    if (list.length === 0) {
      toast.info(WATCHLIST_NO_TICKER_TOAST);
      return;
    }
    const label = opts.isRetry ? "Mencoba ulang" : "Memperbarui";
    const toastId = toast.loading(`${label} ${list.length} ticker…`);
    const results = await Promise.all(
      list.map(async (s) => {
        const r = await fetchTickerForRow(
          s.id,
          s.ticker.trim().toUpperCase(),
          { silent: true },
        );
        return { ...r, id: s.id };
      }),
    );
    const failed = results.filter((r) => !r.ok);
    const succeededIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
    const failedIdSet = new Set(failed.map((r) => r.id));

    setFailedIds((prev) => {
      const next = new Set(prev);
      // Remove ids that just succeeded
      for (const id of succeededIds) next.delete(id);
      // Add ids that just failed
      for (const id of failedIdSet) next.add(id);
      return next;
    });

    if (failed.length === 0) {
      toast.success(`Berhasil memperbarui ${results.length} ticker`, { id: toastId });
    } else if (failed.length === results.length) {
      toast.error(`Gagal memperbarui semua ticker (${failed.length})`, {
        id: toastId,
        description: failed.slice(0, 3).map((f) => `${f.ticker}: ${f.error}`).join(" · "),
      });
    } else {
      toast.warning(
        `${results.length - failed.length} berhasil, ${failed.length} gagal`,
        {
          id: toastId,
          description: failed.slice(0, 3).map((f) => `${f.ticker}: ${f.error}`).join(" · "),
        },
      );
    }
  }

  async function refreshAll() {
    const list = stocks.filter((s) => s.ticker.trim() && !s.manualPrice);
    await refreshList(list);
  }

  async function retryFailed() {
    const list = stocks.filter(
      (s) => failedIds.has(s.id) && s.ticker.trim() && !s.manualPrice,
    );
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
        .forEach((s) =>
          fetchTickerForRow(s.id, s.ticker.trim().toUpperCase()),
        );
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

  // Global keyboard shortcuts
  useShortcuts([
    {
      key: "n",
      handler: () => quickAddRef.current?.focus(),
    },
    {
      key: "r",
      shift: true,
      handler: () => refreshAll(),
    },
    {
      key: "s",
      shift: true,
      handler: () => setSaveDialogTrigger((n) => n + 1),
    },
    {
      key: "c",
      shift: true,
      allowInInput: true,
      handler: () => copyFormula(),
    },
    {
      key: "?",
      allowInInput: true,
      handler: () => setShortcutsOpen(true),
    },
  ]);

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
            saveDialogTrigger={saveDialogTrigger}
          />
        }
      />

      <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-6 sm:pt-8">
        {/* Stats */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <StatCard
              label="Total Market Cap"
              value={formatIDR(enriched.total)}
              icon={TrendingUp}
            />
            <StatCard
              label="Largest Weight"
              icon={Crown}
              value={
                enriched.largest.weight > 0
                  ? enriched.largest.ticker || "—"
                  : "—"
              }
            />
            <StatCard
              label="Komponen"
              icon={Layers}
              value={String(stocks.length)}
            />
          </div>
        </section>

        {/* Last updated */}
        <div className="mt-3">
          <LastUpdated
            lastRefresh={lastRefresh}
            loading={loadingIds.size > 0}
            onRefresh={refreshAll}
            failedCount={failedIds.size}
            onRetryFailed={retryFailed}
          />

        </div>

        {/* Watchlist */}
        <section className="mt-8">
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

          <div className="space-y-2.5">
            {enriched.rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Plus className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {WATCHLIST_EMPTY_TITLE}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {WATCHLIST_EMPTY_HINT}
                </p>
              </div>
            ) : (
              enriched.rows.map((r) => (
                <StockRow
                  key={r.id}
                  stock={r}
                  marketCap={r.marketCap}
                  weight={r.weight}
                  loading={loadingIds.has(r.id)}
                  onChange={(patch) => update(r.id, patch)}
                  onCommitTicker={(t) => fetchTickerForRow(r.id, t)}
                  onRemove={() => remove(r.id)}
                  onCommitPrice={() => quickAddRef.current?.focus()}
                />
              ))
            )}
          </div>

          {/* Formula — inline, di bawah hasil */}
          {enriched.rows.length > 0 && (
            <div className="mt-5">
              <FloatingFormula formula={formula} />
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-primary/20 bg-gradient-to-r from-[oklch(0.18_0.08_275)] via-primary to-[oklch(0.32_0.16_278)] text-primary-foreground rounded-lg shadow-[0_4px_16px_-12px_oklch(0.10_0.03_275_/_0.6)]">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-1 px-3 py-1.5 text-[10px] sm:flex-row sm:gap-2">
            <div className="flex items-center gap-1.5">
              <Logo size="sm" />
              <span className="text-primary-foreground/60">· dibuat oleh</span>
              <a
                href="https://alfindigital.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary-foreground hover:underline"
              >
                @alfindigital
              </a>
            </div>
            <nav aria-label="Sosial media" className="flex items-center gap-0.5">
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
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-primary-foreground/75 transition-colors hover:bg-white/10 hover:text-primary-foreground"
                >
                  <Icon className="h-3 w-3" strokeWidth={2.25} />
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

