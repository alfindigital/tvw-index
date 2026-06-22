import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { IDX_SHARES } from "@/data/idx-shares";
import { formatCompact, formatIDR } from "@/lib/format";
import { validateTicker } from "@/lib/ticker";
import { getQuotes } from "@/lib/quotes.functions";
import { SITE_NAME, SITE_URL, SHARES_AS_OF } from "@/lib/site";

export const Route = createFileRoute("/saham/$ticker")({
  beforeLoad: ({ params }) => {
    const v = validateTicker(params.ticker);
    if (!v.ok) throw notFound();
    return { ticker: v.ticker };
  },
  head: ({ params }) => {
    const t = (params.ticker || "").toUpperCase().replace(/\.JK$/i, "");
    const shares = IDX_SHARES[t];
    const desc = shares
      ? `${t}: ${formatCompact(shares * 1_000_000)} lembar saham beredar. Hitung market cap & bobot index, lalu tambahkan ${t} ke watchlist TradingView kamu di ${SITE_NAME}.`
      : `Data saham ${t} di IDX: hitung market cap, bobot index, dan formula TradingView di ${SITE_NAME}.`;
    return {
      meta: [
        { title: `${t} — Saham Beredar & Market Cap IDX | ${SITE_NAME}` },
        { name: "description", content: desc },
        { property: "og:title", content: `${t} — Saham IDX | ${SITE_NAME}` },
        { property: "og:description", content: desc },
        { property: "og:url", content: `${SITE_URL}/saham/${t}` },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/saham/${t}` }],
    };
  },
  component: EmitenPage,
});

function EmitenPage() {
  const { ticker } = Route.useParams();
  const t = ticker.toUpperCase().replace(/\.JK$/i, "");
  const sharesM = IDX_SHARES[t] ?? null; // in millions
  const getQuotesServer = useServerFn(getQuotes);
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getQuotesServer({ data: { tickers: [t] } })
      .then((res) => {
        if (cancelled) return;
        setPrice(res.quotes[0]?.price ?? null);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [t, getQuotesServer]);

  const marketCap = sharesM != null && price != null ? sharesM * price * 1_000_000 : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke watchlist
        </Link>

        <header className="mt-6">
          <h1 className="font-mono text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Saham Bursa Efek Indonesia (IDX) · simbol TradingView{" "}
            <span className="font-mono text-foreground">IDX:{t}</span>
          </p>
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Saham Beredar
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-foreground">
              {sharesM != null ? formatCompact(sharesM * 1_000_000) : "—"}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {sharesM != null ? `per ${SHARES_AS_OF}` : "belum ada di DB"}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Harga Terakhir
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-foreground">
              {loading ? "…" : price != null ? `Rp ${price.toLocaleString("id-ID")}` : "—"}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Yahoo Finance · close/delayed
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Market Cap
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-foreground">
              {marketCap != null ? formatIDR(marketCap) : "—"}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">shares × harga</div>
          </div>
        </section>

        <div className="mt-8">
          <Link
            to="/"
            search={{ list: t }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Tambah {t} ke watchlist
          </Link>
        </div>

        <section className="mt-10 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            Tentang {t} di {SITE_NAME}
          </h2>
          <p>
            {SITE_NAME} membantu kamu menyusun watchlist saham IDX yang dibobotin berdasarkan
            kapitalisasi pasar (atau free-float adjusted), lalu menghasilkan formula TradingView
            siap salin. Tambahkan {t} bersama emiten lain untuk membangun index custom-mu sendiri
            dan men-chart-nya di TradingView.
          </p>
          <p className="text-xs text-muted-foreground/80">
            Catatan: jumlah saham beredar bersumber dari data IDX (per {SHARES_AS_OF}) dan dapat
            berubah akibat aksi korporasi. Harga berasal dari Yahoo Finance dan bersifat
            delayed/penutupan, bukan real-time. Bukan rekomendasi investasi.
          </p>
        </section>
      </main>
    </div>
  );
}
