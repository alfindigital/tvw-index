import { RefreshCw, ArrowUpDown, Bookmark } from "lucide-react";
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
  onSaveWatchlist?: () => void;
};

const MODE_BTN =
  "flex h-full flex-1 items-center justify-center rounded-md px-3 text-xs font-semibold leading-none transition-colors sm:flex-none";


export function WeightControls({
  mode,
  onModeChange,
  sort,
  onSortChange,
  onRefresh,
  refreshing,
  onSaveWatchlist,
}: Props) {
  return (
    <div className="flex flex-nowrap items-stretch gap-2 rounded-xl border border-border bg-card/60 p-2 sm:gap-3 sm:px-3">
      {/* Weighting mode */}
      <div
        className="flex h-9 items-stretch rounded-lg border border-border bg-background p-0.5"

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
          Market cap
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
          Free Float
        </button>
      </div>

      {/* Save + Refresh + sort */}
      <div className="ml-auto flex shrink-0 items-stretch gap-1.5 sm:gap-2">
        {onSaveWatchlist ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onSaveWatchlist}
            aria-label="Save watchlist as template"
            title="Save watchlist"
            className="h-9 w-9 shrink-0 rounded-lg"
          >
            <Bookmark className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh prices"
          title="Refresh prices"
          className="h-9 w-9 shrink-0 rounded-lg"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Sort watchlist"
              title="Sort watchlist"
              className="h-9 w-9 shrink-0 rounded-lg"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
              <DropdownMenuRadioItem value="manual">Input order</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="weight">Weight ↓</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="mcap">Market cap ↓</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ticker">Ticker A–Z</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}


