import { RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { WeightMode } from "@/lib/weight";
import type { SortKey, TickerPrefix } from "@/lib/storage";

type Props = {
  mode: WeightMode;
  onModeChange: (m: WeightMode) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  prefix: TickerPrefix;
  onPrefixChange: (p: TickerPrefix) => void;
  onRefresh: () => void;
  refreshing?: boolean;
};

const MODE_BTN =
  "flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors sm:flex-none";

export function WeightControls({
  mode,
  onModeChange,
  sort,
  onSortChange,
  prefix,
  onPrefixChange,
  onRefresh,
  refreshing,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 p-2 sm:gap-3 sm:px-3">
      {/* Weighting mode */}
      <div
        className="flex rounded-lg border border-border bg-background p-0.5"
        role="group"
        aria-label="Weight mode"
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
          title="Free-float adjusted market cap weighting (closer to IDX index methodology)"
          className={`${MODE_BTN} ${
            mode === "freefloat"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Free-float
        </button>
      </div>

      {/* Ticker prefix */}
      <Select
        value={prefix === "" ? "__none__" : prefix}
        onValueChange={(v) => onPrefixChange((v === "__none__" ? "" : v) as TickerPrefix)}
      >
        <SelectTrigger
          className="h-7 w-[110px] text-xs"
          aria-label="Ticker prefix"
          title="Symbol prefix for TradingView formula"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="IDX:">IDX:</SelectItem>
          <SelectItem value="BINANCE:">BINANCE:</SelectItem>
          <SelectItem value="__none__">No prefix</SelectItem>
        </SelectContent>
      </Select>

      {/* Refresh + sort */}
      <div className="ml-auto flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh prices"
          title="Refresh prices"
          className="h-7 w-7"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
          <SelectTrigger className="h-7 w-[130px] text-xs" aria-label="Sort watchlist">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Input order</SelectItem>
            <SelectItem value="weight">Weight ↓</SelectItem>
            <SelectItem value="mcap">Market cap ↓</SelectItem>
            <SelectItem value="ticker">Ticker A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

