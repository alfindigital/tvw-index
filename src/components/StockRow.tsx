import { memo, useEffect, useRef, useState } from "react";
import { Loader2, Trash2, AlertCircle, Hand, Zap } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCompact, formatPct } from "@/lib/format";
import type { Stock } from "@/lib/storage";
import type { WeightMode } from "@/lib/weight";
import { IDX_SHARES } from "@/data/idx-shares";

type Props = {
  stock: Stock;
  marketCap: number;
  weight: number;
  loading: boolean;
  lastFetchedAt?: number | null;
  weightMode?: WeightMode;
  /** Daily change as a fraction (0.0123 = +1.23%). null when not available. */
  dailyChange?: number | null;
  /** true when the last fetch is older than the stale threshold (default 5m). */
  stale?: boolean;
  /** Brief visual highlight after undo (restored) / redo (about to be removed). */
  flash?: "restored" | "removed" | null;
  onChange: (patch: Partial<Stock>) => void;
  onCommitTicker: (ticker: string) => void;
  onRemove: () => void;
  onCommitPrice?: () => void;
  onEnableAuto?: () => void;
};

function formatSharesInput(value: number): string {
  if (!value) return "";
  // up to 4 decimals, trim trailing zeros (preserve dataset precision)
  const fixed = value.toFixed(4);
  return fixed.replace(/\.?0+$/, "");
}

// Shared typography so every field label + input renders identically.
const LABEL_CLS =
  "mb-1 block text-[11px] font-semibold uppercase leading-4 tracking-wide text-foreground/80 dark:text-foreground";
const FIELD_CLS = "h-9 w-full min-w-0 font-mono text-sm leading-5 tabular-nums";
const SUFFIX_CLS =
  "pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";

function StockRowImpl({
  stock,
  marketCap,
  weight,
  loading,
  weightMode = "mcap",
  dailyChange = null,
  stale = false,
  flash = null,
  onChange,
  onCommitTicker,
  onRemove,
  onCommitPrice,
  onEnableAuto,
}: Props) {
  const priceRef = useRef<HTMLInputElement>(null);
  const [tickerDraft, setTickerDraft] = useState(stock.ticker);

  function handleTickerChange(v: string) {
    setTickerDraft(v.toUpperCase().slice(0, 8));
  }

  function commit() {
    const upper = tickerDraft.trim().toUpperCase();
    if (upper === stock.ticker && stock.price > 0) return;
    const patch: Partial<Stock> = { ticker: upper, error: null };
    if (!stock.manualShares && IDX_SHARES[upper]) {
      patch.shares = IDX_SHARES[upper];
    }
    onChange(patch);
    onCommitTicker(upper);
  }

  const inDB = tickerDraft && IDX_SHARES[tickerDraft] != null;
  const showFreeFloat = weightMode === "freefloat";

  return (
    <div
      className={`relative rounded-xl border border-border bg-card p-2.5 transition-colors hover:border-ring/40 sm:p-4 [content-visibility:auto] [contain-intrinsic-size:160px]${
        flash === "restored"
          ? " lm-flash-restored"
          : flash === "removed"
            ? " lm-flash-removed"
            : ""
      }`}
    >
      {/* Mobile: ticker on row 1; shares | price | delete on row 2.
          Desktop: one row with ticker | shares | price | delete. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
        {/* Ticker */}
        <div className="flex flex-col gap-1 min-w-0 sm:flex-1">
          <div className={LABEL_CLS}>Ticker</div>
          <div className="flex items-end gap-1.5">
            <div className="relative flex-1 min-w-0">
              <Input
                value={tickerDraft}
                aria-label="Ticker saham"
                onChange={(e) => handleTickerChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commit();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                onBlur={() => {
                  if (tickerDraft !== stock.ticker) commit();
                }}
                placeholder="TICKER"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                title={tickerDraft || undefined}
                className={`${FIELD_CLS} truncate pr-9 font-semibold uppercase tracking-wider`}
              />
              {loading ? (
                <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-10 w-10 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:hidden"
              aria-label={`Remove ${stock.ticker || "stock"}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Shares + Price + Delete */}
        <div className="flex items-end gap-1.5 sm:flex-[2] sm:gap-2">
          <label className="block min-w-0 flex-[2] sm:flex-1">
            <span className={LABEL_CLS}>Shares (M)</span>
            <div className="relative w-full min-w-0">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={formatSharesInput(stock.shares)}
                onChange={(e) =>
                  onChange({
                    shares: Number(e.target.value) || 0,
                    manualShares: true,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    priceRef.current?.focus();
                    priceRef.current?.select();
                  }
                }}
                placeholder="0"
                title={stock.shares ? `${formatSharesInput(stock.shares)} million shares` : undefined}
                className={`${FIELD_CLS} pr-7`}
              />
              <span className={SUFFIX_CLS}>M{stock.manualShares ? "*" : ""}</span>
            </div>
          </label>
          <label className="block min-w-0 flex-1">
            <span className={LABEL_CLS}>Price (IDR)</span>
            <div className="relative w-full min-w-0">
              <Input
                ref={priceRef}
                type="text"
                inputMode="numeric"
                aria-label={`Price IDR ${stock.ticker}`}
                value={stock.price ? stock.price.toLocaleString("en-US") : ""}
                onChange={(e) => {
                  const input = e.target.value;
                  const raw = input.replace(/\D/g, "");
                  if (input.trim() !== "" && /[^\d.,\s]/.test(input)) {
                    toast.error("Invalid price format — numbers only", {
                      id: `price-format-${stock.id}`,
                      description: `${stock.ticker || "This row"}: use digits only, e.g. 9750`,
                    });
                  }
                  const num = Math.min(Number(raw) || 0, 999999999999);
                  onChange({
                    price: num,
                    manualPrice: true,
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!stock.price) {
                      toast.error("Price cannot be empty", {
                        id: `price-empty-${stock.id}`,
                        description: `${stock.ticker || "This row"}: enter a close price above 0`,
                      });
                      return;
                    }
                    (e.target as HTMLInputElement).blur();
                    onCommitPrice?.();
                  }
                }}

                placeholder="0"
                title={stock.price ? `Rp ${stock.price.toLocaleString("en-US")}` : undefined}
                className={`${FIELD_CLS} pr-9`}
              />
              <span className={SUFFIX_CLS}>IDR{stock.manualPrice ? "*" : ""}</span>
            </div>
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="hidden h-10 w-10 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:inline-flex sm:h-9 sm:w-9"
            aria-label={`Remove ${stock.ticker || "stock"}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Inline status */}
      {loading ? (
        <div className="mt-2 flex items-center gap-1 text-xs text-primary">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Fetching price…</span>
        </div>
      ) : stock.error ? (
        <div className="mt-2 flex items-start gap-1 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="break-words">{stock.error}</span>
        </div>
      ) : stock.manualPrice ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Hand className="h-3 w-3" />
            Manual price
          </span>
          {onEnableAuto ? (
            <button
              type="button"
              onClick={onEnableAuto}
              className="inline-flex items-center gap-1 rounded text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
            >
              <Zap className="h-3 w-3" />
              Use auto price
            </button>
          ) : null}
        </div>
      ) : tickerDraft && !inDB && !stock.manualShares ? (
        <div className="mt-2 text-xs text-muted-foreground">
          Not in IDX DB · fill shares manually
        </div>
      ) : null}

      {/* Row 2: Market Cap + weight (+ free-float when in free-float mode) */}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Market Cap
          </div>
          <div className="flex items-center gap-1.5 font-mono text-sm font-medium text-foreground">
            <span>{formatCompact(marketCap)}</span>
            {dailyChange != null ? (
            <span
                className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums ${
                  dailyChange >= 0
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                }`}
                title="Change vs. previous close"
              >
                {dailyChange >= 0 ? "+" : "−"}
                {(Math.abs(dailyChange) * 100).toFixed(2)}%
              </span>
            ) : null}
          </div>
        </div>
        {showFreeFloat ? (
          <label className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Free-float
            </span>
            <div className="relative w-20">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="1"
                value={stock.freeFloat ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange({
                    freeFloat: raw === "" ? null : Math.max(0, Math.min(100, Number(raw) || 0)),
                  });
                }}
                placeholder="100"
                aria-label={`Free-float percent ${stock.ticker}`}
                className="h-7 w-full pr-5 text-center font-mono text-xs tabular-nums"
              />
              <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                %
              </span>
            </div>
          </label>
        ) : null}
        <div className="flex flex-1 items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-[width] duration-300"
              style={{ width: `${Math.min(100, weight * 100).toFixed(2)}%` }}
            />
          </div>
          <div className="w-14 text-right font-mono text-xs font-medium text-foreground">
            {formatPct(weight)}
          </div>
        </div>
      </div>
    </div>
  );
}

export const StockRow = memo(StockRowImpl, (prev, next) => {
  return (
    prev.loading === next.loading &&
    prev.marketCap === next.marketCap &&
    prev.weight === next.weight &&
    prev.lastFetchedAt === next.lastFetchedAt &&
    prev.weightMode === next.weightMode &&
    prev.dailyChange === next.dailyChange &&
    prev.stale === next.stale &&
    prev.flash === next.flash &&
    prev.onChange === next.onChange &&
    prev.onCommitTicker === next.onCommitTicker &&
    prev.onRemove === next.onRemove &&
    prev.onCommitPrice === next.onCommitPrice &&
    prev.onEnableAuto === next.onEnableAuto &&
    prev.stock.id === next.stock.id &&
    prev.stock.ticker === next.stock.ticker &&
    prev.stock.shares === next.stock.shares &&
    prev.stock.price === next.stock.price &&
    prev.stock.manualShares === next.stock.manualShares &&
    prev.stock.manualPrice === next.stock.manualPrice &&
    prev.stock.freeFloat === next.stock.freeFloat &&
    prev.stock.error === next.stock.error
  );
});
