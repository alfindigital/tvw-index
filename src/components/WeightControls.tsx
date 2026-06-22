import { Scale, Percent } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { WeightMode } from "@/lib/weight";
import type { SortKey } from "@/lib/storage";

type Props = {
  mode: WeightMode;
  onModeChange: (m: WeightMode) => void;
  capPct: number | null;
  onCapChange: (v: number | null) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
};

const MODE_BTN =
  "flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors sm:flex-none";

export function WeightControls({
  mode,
  onModeChange,
  capPct,
  onCapChange,
  sort,
  onSortChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 p-2 sm:gap-3 sm:px-3">
      {/* Weighting mode */}
      <div className="flex items-center gap-1.5">
        <Scale className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <div
          className="flex rounded-lg border border-border bg-background p-0.5"
          role="group"
          aria-label="Mode bobot"
        >
          <button
            type="button"
            aria-pressed={mode === "mcap"}
            onClick={() => onModeChange("mcap")}
            className={`${MODE_BTN} ${
              mode === "mcap"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Market Cap
          </button>
          <button
            type="button"
            aria-pressed={mode === "freefloat"}
            onClick={() => onModeChange("freefloat")}
            title="Bobot berbasis free-float adjusted market cap (lebih dekat metodologi index IDX)"
            className={`${MODE_BTN} ${
              mode === "freefloat"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Free-float
          </button>
        </div>
      </div>

      {/* Per-name cap */}
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Percent className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Cap bobot</span>
        <div className="relative w-16">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step="1"
            value={capPct ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              onCapChange(raw === "" ? null : Math.max(1, Math.min(100, Number(raw) || 0)));
            }}
            placeholder="off"
            aria-label="Cap bobot maksimum per saham (persen)"
            className="h-7 w-full pr-5 text-center font-mono text-xs tabular-nums"
          />
          <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            %
          </span>
        </div>
      </label>

      {/* Sort */}
      <div className="ml-auto flex items-center gap-1.5">
        <span className="hidden text-xs text-muted-foreground sm:inline">Urutkan</span>
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
          <SelectTrigger className="h-7 w-[130px] text-xs" aria-label="Urutkan watchlist">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Urutan input</SelectItem>
            <SelectItem value="weight">Bobot ↓</SelectItem>
            <SelectItem value="mcap">Market cap ↓</SelectItem>
            <SelectItem value="ticker">Ticker A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
