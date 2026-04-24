import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { StatCard } from "@/components/StatCard";
import { StockRow } from "@/components/StockRow";
import {
  loadBasket,
  saveBasket,
  newStock,
  type Stock,
} from "@/lib/storage";
import { formatIDR, formatPct, formatTime } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Index Builder — Kalkulator Basket Saham IDX" },
      {
        name: "description",
        content:
          "Bikin basket saham IDX market-cap weighted. Harga close otomatis dari Yahoo Finance, hitung weight & formula TradingView dalam satu halaman.",
      },
      { property: "og:title", content: "Index Builder — Basket Saham IDX" },
      {
        property: "og:description",
        content:
          "Kalkulator index saham IDX yang simpel: input ticker, harga otomatis, weight & formula TradingView langsung jadi.",
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

function IndexPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const didInitialFetch = useRef(false);

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
      .map((r) => `${r.ticker}*${r.weight.toFixed(4)}`)
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
  }

  async function refreshPrices(silent = false) {
    const tickers = stocks
      .filter((s) => s.ticker.trim() && !s.manual)
      .map((s) => s.ticker.trim().toUpperCase());
    if (tickers.length === 0) {
      if (!silent) toast.info("Tidak ada ticker auto untuk di-refresh.");
      return;
    }
    setRefreshing(true);
    try {
      const res = await fetch(
        `/api/quote?tickers=${encodeURIComponent(tickers.join(","))}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { quotes: Quote[] } = await res.json();
      const map = new Map<string, Quote>();
      data.quotes.forEach((q) => {
        const base = q.symbol.replace(/\.JK$/i, "");
        map.set(base, q);
      });
      let okCount = 0;
      let failCount = 0;
      setStocks((prev) =>
        prev.map((s) => {
          if (s.manual || !s.ticker.trim()) return s;
          const q = map.get(s.ticker.trim().toUpperCase());
          if (!q) return s;
          if (q.price != null) {
            okCount++;
            return { ...s, price: q.price, error: null };
          }
          failCount++;
          return { ...s, error: q.error ?? "gagal" };
        }),
      );
      setLastRefresh(Date.now());
      if (!silent) {
        if (failCount === 0) toast.success(`Harga ${okCount} saham diperbarui.`);
        else toast.warning(`${okCount} berhasil, ${failCount} gagal.`);
      }
    } catch (err) {
      if (!silent) {
        toast.error(
          `Gagal ambil harga: ${err instanceof Error ? err.message : "error"}`,
        );
      }
    } finally {
      setRefreshing(false);
    }
  }

  // Auto-fetch once on mount if there are auto stocks
  useEffect(() => {
    if (!hydrated || didInitialFetch.current) return;
    if (stocks.some((s) => s.ticker.trim() && !s.manual)) {
      didInitialFetch.current = true;
      refreshPrices(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function copyFormula() {
    if (!formula) return;
    navigator.clipboard.writeText(formula).then(() => {
      setCopied(true);
      toast.success("Formula disalin.");
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="top-center" richColors />
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Index Builder
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Basket saham IDX market-cap weighted. Simpel, mobile-first.
          </p>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Total Market Cap"
            value={formatIDR(enriched.total)}
          />
          <StatCard
            label="Largest Weight"
            value={
              enriched.largest.weight > 0
                ? `${enriched.largest.ticker || "—"} · ${formatPct(enriched.largest.weight)}`
                : "—"
            }
          />
          <StatCard label="Jumlah Saham" value={String(stocks.length)} />
        </section>

        {/* List header */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Daftar Saham
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Update terakhir: {formatTime(lastRefresh)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refreshPrices()}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh Harga</span>
              <span className="sm:hidden">Refresh</span>
            </Button>
          </div>

          {/* Rows */}
          <div className="space-y-3">
            {enriched.rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum ada saham. Klik <span className="font-medium text-foreground">Tambah Saham</span> untuk mulai.
                </p>
              </div>
            ) : (
              enriched.rows.map((r) => (
                <StockRow
                  key={r.id}
                  stock={r}
                  marketCap={r.marketCap}
                  weight={r.weight}
                  onChange={(patch) => update(r.id, patch)}
                  onRemove={() => remove(r.id)}
                />
              ))
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={add}
            className="mt-4 w-full gap-2 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Tambah Saham
          </Button>
        </section>

        {/* Formula */}
        <section className="mt-10">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                TradingView Formula
              </h2>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={copyFormula}
                disabled={!formula}
                className="gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy
              </Button>
            </div>
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-secondary p-3 font-mono text-xs text-foreground">
              {formula || "// Tambah saham & isi shares + harga untuk lihat formula."}
            </pre>
          </div>
        </section>

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Data harga via Yahoo Finance · Tersimpan lokal di browser
        </footer>
      </div>
    </div>
  );
}
