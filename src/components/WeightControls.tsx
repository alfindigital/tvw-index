import { RefreshCw, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WeightMode } from "@/lib/weight";
import type { SortKey } from "@/lib/storage";

type Props = {
  mode: WeightMode;
  onModeChange: (m: WeightMode) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
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
  onRefresh,
  refreshing,
}: Props) {
  return (
    <div className="flex flex-nowrap items-center gap-2 rounded-xl border border-border bg-card/60 p-2 sm:gap-3 sm:px-3">
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
          Mcap
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



      {/* Refresh + sort */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh prices"
          title="Refresh prices"
          className="h-7 w-7 shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
          <SelectTrigger className="h-7 w-[112px] shrink-0 text-xs sm:w-[130px]" aria-label="Sort watchlist">
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

