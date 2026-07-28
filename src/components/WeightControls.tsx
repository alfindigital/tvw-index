import { RefreshCw, ArrowUpDown, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  "flex h-full flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 text-xs font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-none";

const ICON_BTN =
  "h-9 w-9 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";



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
      <TooltipProvider delayDuration={0}>
        <div className="ml-auto flex shrink-0 items-stretch gap-1.5 sm:gap-2">
          {onSaveWatchlist ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onSaveWatchlist}
                  onPointerDown={(e) => (e.currentTarget as HTMLButtonElement).focus()}
                  aria-label="Save watchlist as template"
                  className={ICON_BTN}
                >
                  <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">Save watchlist as template</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Save watchlist</TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onRefresh}
                onPointerDown={(e) => (e.currentTarget as HTMLButtonElement).focus()}
                disabled={refreshing}
                aria-busy={refreshing ? true : undefined}
                data-busy={refreshing ? "true" : undefined}
                aria-label="Refresh prices"
                className={ICON_BTN}

              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
                <span className="sr-only">Refresh prices</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Refresh prices</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onPointerDown={(e) => (e.currentTarget as HTMLButtonElement).focus()}
                    aria-label="Sort watchlist"
                    className={ICON_BTN}
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">Sort watchlist</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Sort watchlist</TooltipContent>
            </Tooltip>
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
      </TooltipProvider>
    </div>
  );
}


