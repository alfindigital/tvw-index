import { Sparkles, ArrowRight } from "lucide-react";
import { PRESETS } from "@/data/presets";
import { trackActivation } from "@/lib/analytics";

type Props = {
  onLoadPreset: (tickers: string[]) => void;
};

/**
 * Empty-state that leads with a one-click aha moment (starter packs shown as
 * primary cards, not chips) and demotes the "how it works" steps to a subtle
 * caption underneath. Copy is Indonesia-first because the target audience is
 * IDX investors.
 */
export function EmptyWatchlist({ onLoadPreset }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 sm:p-7">
      {/* Hero: concrete outcome, not abstract feature */}
      <div className="text-center">
        <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" />
          Pilih 1 → langsung jadi
        </div>
        <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          Bikin index kustom IDX & pantau di TradingView
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          Klik salah satu starter pack di bawah — harga, bobot, dan formula TradingView terisi
          otomatis.
        </p>
      </div>

      {/* Starter packs — primary CTA */}
      <div className="mx-auto mt-6 grid max-w-2xl gap-2.5 sm:grid-cols-2">
        {PRESETS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onLoadPreset(p.tickers)}
            className="group relative flex items-start justify-between gap-3 rounded-xl border border-border bg-background p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/[0.03] hover:shadow-[0_8px_24px_-12px_oklch(0.52_0.22_277_/_0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{p.name}</span>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
                  {p.tickers.length}
                </span>
                {i === 1 ? (
                  <span className="rounded-full border border-primary/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                    Rekomendasi
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                {p.tickers.slice(0, 4).join(" · ")}
                {p.tickers.length > 4 ? ` · +${p.tickers.length - 4}` : ""}
              </p>
            </div>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
      </div>

      {/* Or DIY — secondary path */}
      <div className="mt-6 flex flex-col items-center gap-2 border-t border-dashed border-border pt-4 sm:flex-row sm:justify-center sm:gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Atau ketik ticker sendiri
        </span>
        <span className="hidden text-muted-foreground sm:inline" aria-hidden>
          ·
        </span>
        <span className="text-[11px] text-muted-foreground">
          Ketik di kolom atas (mis.{" "}
          <span className="font-mono font-semibold text-foreground">BBCA</span>) → Enter
        </span>
      </div>

      {/* "How it works" — demoted to fine print caption */}
      <p className="mx-auto mt-3 max-w-lg text-center text-[10.5px] leading-relaxed text-muted-foreground/80">
        Add ticker → auto-fetch harga Yahoo → copy formula tertimbang market cap → paste ke
        TradingView jadi 1 chart index.
      </p>
    </div>
  );
}
