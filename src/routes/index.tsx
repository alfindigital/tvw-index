import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, TrendingUp, Layers, Crown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { StatCard } from "@/components/StatCard";
import { StockRow } from "@/components/StockRow";
import { FloatingFormula } from "@/components/FloatingFormula";
import { TemplatesMenu } from "@/components/TemplatesMenu";
import { HEADER_ICON_BUTTON_CLASS, HEADER_ICON_CLASS } from "@/components/header-actions";
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
import { formatIDR } from "@/lib/format";
import { getQuotes } from "@/lib/quotes.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Index Builder — Kalkulator Watchlist Saham IDX" },
      {
        name: "description",
        content:
          "Bikin watchlist saham IDX market-cap weighted. Database 957+ emiten built-in, harga otomatis Yahoo Finance, formula TradingView siap pakai.",
      },
      { property: "og:title", content: "Index Builder — Watchlist Saham IDX" },
      {
        property: "og:description",
        content:
          "Database shares IDX siap pakai. Ketik ticker → Enter → langsung dapat market cap, weight, dan formula TradingView.",
      },
    ],
  }),
  component: IndexPage,
});

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
  const [hydrated, setHydrated] = useState(false);
  const didInitialFetch = useRef(false);
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

  // Derived calculations
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
        // Bersihkan suffix .JK kalau user input dgn suffix Yahoo
        const sym = r.ticker.replace(/\.JK$/i, "").toUpperCase();
        return `${sym}*${r.weight.toFixed(4)}`;
      })
      .join(" + ");
  }, [enriched.rows]);

  function update(id: string, patch: Partial<Stock>) {
    setStocks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  }

  function add() {
    setStocks((prev) => [...prev, newStock()]);
  }

  function remove(id: string) {
    setStocks((prev) => prev.filter((s) => s.id !== id));
    setLoadingIds((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  }

  async function fetchTickerForRow(id: string, ticker: string) {
    if (!ticker) return;
    setLoadingIds((prev) => new Set(prev).add(id));
    try {
      const data: { quotes: Quote[] } = await getQuotesServer({
        data: { tickers: [ticker] },
      });
      const q = data.quotes[0];
      if (!q) {
        update(id, { error: "Tidak ada respons" });
        return;
      }
      if (q.price != null) {
        // Hanya update price kalau bukan manual price
        const stock = stocks.find((s) => s.id === id);
        if (stock?.manualPrice) {
          update(id, { error: null });
        } else {
          update(id, { price: Number(q.price), error: null });
        }
        setLastRefresh(Date.now());
      } else {
        update(id, { error: humanError(q.error) });
      }
    } catch (err) {
      update(id, {
        error: humanError(err instanceof Error ? err.message : "fetch"),
      });
    } finally {
      setLoadingIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  }

  // Auto-fetch all on first mount
  useEffect(() => {
    if (!hydrated || didInitialFetch.current) return;
    didInitialFetch.current = true;
    const tickersToFetch = stocks
      .filter((s) => s.ticker.trim() && !s.manualPrice)
      .map((s) => ({ id: s.id, ticker: s.ticker.trim().toUpperCase() }));
    if (tickersToFetch.length === 0) return;
    // Fetch all in parallel
    tickersToFetch.forEach(({ id, ticker }) => fetchTickerForRow(id, ticker));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function refreshAll() {
    const list = stocks.filter((s) => s.ticker.trim() && !s.manualPrice);
    if (list.length === 0) {
      toast.info(WATCHLIST_NO_TICKER_TOAST);
      return;
    }
    list.forEach((s) =>
      fetchTickerForRow(s.id, s.ticker.trim().toUpperCase()),
    );
  }

  

  function loadFromTemplate(stocks: Stock[]) {
    setStocks(stocks);
    // re-fetch prices for non-manual after a tick
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
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Toaster position="top-center" richColors />
      <AppHeader
        actions={
          <>
            {stocks.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={refreshAll}
                disabled={loadingIds.size > 0}
                className={`${HEADER_ICON_BUTTON_CLASS} disabled:opacity-100`}
                aria-label={loadingIds.size > 0 ? "Sedang refresh" : "Refresh semua"}
                aria-busy={loadingIds.size > 0}
                title={loadingIds.size > 0 ? "Sedang refresh…" : "Refresh semua"}
              >
                <RefreshCw className={`${HEADER_ICON_CLASS} ${loadingIds.size > 0 ? "animate-spin" : ""}`} />
              </Button>
            ) : null}
            <TemplatesMenu
              currentStocks={stocks}
              onLoadTemplate={loadFromTemplate}
              onAfterImport={reloadFromStorage}
            />
          </>
        }
      />

      <main className="mx-auto w-full max-w-5xl px-3 pb-36 pt-5 sm:px-4 sm:pt-8">
        {/* Single-row minimalist stats */}
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

        {/* List */}
        <section className="mt-8">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {WATCHLIST_LABEL}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ketik ticker lalu tekan{" "}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                  Enter
                </kbd>{" "}
                untuk auto-fill.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={add}
              className="hidden shrink-0 gap-2 border-dashed sm:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Tambah Saham
            </Button>
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
                />
              ))
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={add}
            className="mt-4 w-full gap-2 border-dashed sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Tambah Saham
          </Button>
        </section>

        <footer className="mt-12 space-y-1 text-center text-[11px] text-muted-foreground">
          <div>
            Data shares IDX bundled · Harga via Yahoo Finance · Tersimpan lokal
          </div>
          <div>
            Built by{" "}
            <a
              href="https://alfindigital.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              @alfindigital
            </a>
          </div>
        </footer>
      </main>

      <FloatingFormula formula={formula} />
    </div>
  );
}
