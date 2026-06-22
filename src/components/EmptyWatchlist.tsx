import { Plus, Keyboard, Copy, LineChart } from "lucide-react";
import { PRESETS } from "@/data/presets";

type Props = {
  onLoadPreset: (tickers: string[]) => void;
};

const STEPS = [
  { icon: Plus, text: "Tambah saham IDX ke watchlist" },
  { icon: Copy, text: "Salin formula TradingView yang dibobotin otomatis" },
  { icon: LineChart, text: "Tempel di TradingView → chart index custom-mu" },
];

export function EmptyWatchlist({ onLoadPreset }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5 text-center sm:p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Plus className="h-5 w-5" />
      </div>
      <p className="mt-3 text-base font-semibold text-foreground">
        Bangun index saham IDX-mu sendiri
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Pilih starter pack di bawah, atau ketik ticker di kotak Quick Add.
      </p>

      {/* How it works */}
      <div className="mx-auto mt-5 grid max-w-xl gap-2 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-left"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <s.icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] leading-snug text-muted-foreground">{s.text}</span>
          </div>
        ))}
      </div>

      {/* Presets */}
      <div className="mt-6">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Coba starter pack
        </div>
        <div className="mx-auto flex max-w-xl flex-wrap justify-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onLoadPreset(p.tickers)}
              title={p.desc}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <span>{p.name}</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {p.tickers.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
        <Keyboard className="h-3.5 w-3.5" />
        Tip: tekan <span className="font-mono text-foreground">N</span> dari mana saja untuk fokus
        ke Quick Add.
      </p>
    </div>
  );
}
