import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, TrendingUp, HelpCircle } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { IDX_SHARES, IDX_TICKERS } from "@/data/idx-shares";
import { formatCompact, formatIDR } from "@/lib/format";
import { validateTicker } from "@/lib/ticker";
import { getQuotes } from "@/lib/quotes.functions";
import { SITE_NAME, SITE_URL, SHARES_AS_OF } from "@/lib/site";
import { getCachedQuote, putQuoteCache } from "@/lib/storage";

function buildFaqs(t: string, sharesM: number | null) {
  return [
    {
      q: `Berapa jumlah saham beredar ${t}?`,
      a: sharesM != null
        ? `${t} memiliki sekitar ${formatCompact(sharesM * 1_000_000)} lembar saham beredar (per ${SHARES_AS_OF}, sumber data IDX). Angka ini dapat berubah karena aksi korporasi (stock split, rights issue, buyback).`
        : `Data jumlah saham beredar ${t} belum tersedia di database ${SITE_NAME}. Silakan cek langsung ke laman resmi IDX.`,
    },
    {
      q: `Bagaimana cara menghitung market cap ${t}?`,
      a: `Market cap = harga saham × jumlah saham beredar. Di ${SITE_NAME}, harga diambil real-time dari Yahoo Finance dan dikalikan jumlah saham beredar dari data IDX.`,
    },
    {
      q: `Bagaimana cara menambahkan ${t} ke chart TradingView?`,
      a: `Gunakan simbol IDX:${t} di TradingView. Atau tambahkan ${t} ke watchlist ${SITE_NAME}, lalu salin rumus TradingView yang otomatis dibuat untuk menggabungkan ${t} dengan saham lain sebagai custom index.`,
    },
    {
      q: `Apakah harga ${t} di ${SITE_NAME} real-time?`,
      a: `Harga bersumber dari Yahoo Finance dan bersifat delayed/closing (bukan real-time tick-by-tick). Cocok untuk analisis dan pembuatan basket index, bukan untuk trading intraday.`,
    },
  ];
}

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
      ? `${t}: ${formatCompact(shares * 1_000_000)} saham beredar. Hitung market cap & bobot indeks, tambahkan ${t} ke watchlist TradingView di ${SITE_NAME}.`
      : `Data saham ${t} IDX: hitung market cap, bobot indeks, dan rumus TradingView di ${SITE_NAME}.`;
    const url = `${SITE_URL}/saham/${t}`;
    const faqs = buildFaqs(t, shares ?? null);
    return {
      meta: [
        { title: `${t} — Saham Beredar & Market Cap IDX | ${SITE_NAME}` },
        { name: "description", content: desc },
        { property: "og:title", content: `${t} — Saham IDX | ${SITE_NAME}` },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Saham", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 3, name: t, item: url },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        },
      ],
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
  const faqs = useMemo(() => buildFaqs(t, sharesM), [t, sharesM]);
  const related = useMemo(() => {
    if (sharesM == null) return [];
    // Pick 6 tickers with the closest shares-outstanding count as "related" —
    // gives internal linking + long-tail crawl paths without extra data.
    const sorted = IDX_TICKERS
      .filter((x) => x !== t && IDX_SHARES[x] != null)
      .map((x) => ({ x, diff: Math.abs(Math.log(IDX_SHARES[x]!) - Math.log(sharesM)) }))
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 6)
      .map((r) => r.x);
    return sorted;
  }, [t, sharesM]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to watchlist
        </Link>

        <header className="mt-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Indonesia Stock Exchange (IDX) · TradingView symbol{" "}
            <span className="font-mono text-foreground">IDX:{t}</span>
          </p>
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Shares Outstanding
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-foreground">
              {sharesM != null ? formatCompact(sharesM * 1_000_000) : "—"}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {sharesM != null ? `as of ${SHARES_AS_OF}` : "not in DB"}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Last Price
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-foreground">
              {loading ? "…" : price != null ? `Rp ${price.toLocaleString("en-US")}` : "—"}
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
            <div className="mt-0.5 text-[11px] text-muted-foreground">shares × price</div>
          </div>
        </section>

        <div className="mt-8">
          <Link
            to="/"
            search={{ list: t }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add {t} to watchlist
          </Link>
        </div>

        <section className="mt-10 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            About {t} on {SITE_NAME}
          </h2>
          <p>
            {SITE_NAME} helps you build an IDX stock watchlist weighted by
            market cap (or free-float adjusted), then generates a ready-to-use TradingView
            formula. Add {t} along with other issuers to build your own custom index
            and chart it on TradingView.
          </p>
          <p className="text-xs text-muted-foreground/80">
            Note: shares outstanding are sourced from IDX data (as of {SHARES_AS_OF}) and may
            change due to corporate actions. Prices come from Yahoo Finance and are
            delayed/closing, not real-time. Not investment advice.
          </p>
        </section>

        {related.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-foreground">Saham lain dengan ukuran serupa</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {related.map((r) => (
                <Link
                  key={r}
                  to="/saham/$ticker"
                  params={{ ticker: r }}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {r}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <HelpCircle className="h-4 w-4 text-primary" />
            Pertanyaan yang sering ditanyakan
          </h2>
          <dl className="mt-4 space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-2xl border border-border bg-card p-4">
                <dt className="text-sm font-semibold text-foreground">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}

