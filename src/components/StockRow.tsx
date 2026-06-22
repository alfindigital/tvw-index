import { memo, useEffect, useRef, useState } from "react";
import { Loader2, Trash2, AlertCircle, Hand, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCompact, formatPct, formatTime } from "@/lib/format";
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

function StockRowImpl({
  stock,
  marketCap,
  weight,
  loading,
  lastFetchedAt,
  weightMode = "mcap",
  onChange,
  onCommitTicker,
  onRemove,
  onCommitPrice,
  onEnableAuto,
}: Props) {
  const priceRef = useRef<HTMLInputElement>(null);
  const [tickerDraft, setTickerDraft] = useState(stock.ticker);
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug(`[StockRow re-render] ${stock.ticker || stock.id} #${renderCountRef.current}`, {
        price: stock.price,
        shares: stock.shares,
        loading,
      });
    }
  });

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
    <div className="relative rounded-xl border border-border bg-card p-2.5 transition-colors hover:border-ring/40 sm:p-4 [content-visibility:auto] [contain-intrinsic-size:160px]">
      {import.meta.env.DEV ? (
        <span
          key={renderCountRef.current}
          aria-hidden
          title={`Render #${renderCountRef.current}`}
          className="pointer-events-none absolute right-2 top-2 z-10 flex h-2 w-2"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
      ) : null}
      {/* Mobile: ticker+remove on one row; shares+price below.
          Desktop: one row with ticker | shares | price | remove */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
        {/* Ticker + remove (inline on mobile, flex item on desktop) */}
        <div className="flex items-end gap-1.5 sm:flex-1 sm:min-w-0 sm:gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-foreground/80 dark:text-foreground sm:text-xs">
              Ticker
            </div>
            <div className="relative">
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
                className="h-9 truncate pr-9 font-mono text-[15px] font-semibold uppercase leading-5 tracking-wider sm:text-sm"
              />
              {loading ? (
                <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-10 w-10 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-9 sm:w-9"
            aria-label={`Hapus ${stock.ticker || "saham"}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Shares + Price (grid on mobile, inline on sm+) */}
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-[2] sm:gap-2">
          <label className="block min-w-0 sm:flex-1">
            <span className="mb-1 block text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-foreground/80 dark:text-foreground sm:text-xs">
              Shares (Jt)
            </span>
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
                title={stock.shares ? `${formatSharesInput(stock.shares)} juta lembar` : undefined}
                className="h-9 w-full min-w-0 pr-7 font-mono text-[15px] leading-5 tabular-nums sm:text-sm"
              />
              <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                jt{stock.manualShares ? "*" : ""}
              </span>
            </div>
          </label>
          <label className="block min-w-0 sm:flex-1">
            <span className="mb-1 block text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-foreground/80 dark:text-foreground sm:text-xs">
              Price (IDR)
            </span>
            <div className="relative w-full min-w-0">
              <Input
                ref={priceRef}
                type="text"
                inputMode="numeric"
                value={stock.price ? stock.price.toLocaleString("id-ID") : ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  const num = Math.min(Number(raw) || 0, 999999999999);
                  onChange({
                    price: num,
                    manualPrice: true,
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                    onCommitPrice?.();
                  }
                }}
                placeholder="0"
                title={stock.price ? `Rp ${stock.price.toLocaleString("id-ID")}` : undefined}
                className="h-9 w-full min-w-0 pr-9 font-mono text-[15px] leading-5 tabular-nums sm:text-sm"
              />
              <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                IDR{stock.manualPrice ? "*" : ""}
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Inline status */}
      {loading ? (
        <div className="mt-2 flex items-center gap-1 text-xs text-primary">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Mengambil harga…</span>
        </div>
      ) : stock.error ? (
        <div className="mt-2 flex items-start gap-1 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="break-words">{stock.error}</span>
        </div>
      ) : stock.manualPrice ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <span className="flex items-center gap-1">
            <Hand className="h-3 w-3" />
            Harga manual
          </span>
          {onEnableAuto ? (
            <button
              type="button"
              onClick={onEnableAuto}
              className="inline-flex items-center gap-1 rounded text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
            >
              <Zap className="h-3 w-3" />
              Pakai harga auto
            </button>
          ) : null}
        </div>
      ) : tickerDraft && !inDB && !stock.manualShares ? (
        <div className="mt-2 text-xs text-muted-foreground">
          Tidak ada di DB IDX · isi shares manual
        </div>
      ) : lastFetchedAt ? (
        <div className="mt-2 text-xs text-muted-foreground">
          Harga close · diperbarui {formatTime(lastFetchedAt)}
        </div>
      ) : null}

      {/* Row 2: Market Cap + weight (+ free-float when in free-float mode) */}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Market Cap
          </div>
          <div className="font-mono text-sm font-medium text-foreground">
            {formatCompact(marketCap)}
          </div>
        </div>
        {showFreeFloat ? (
          <label className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Free-float
            </span>
            <div className="relative w-16">
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
                aria-label={`Free-float persen ${stock.ticker}`}
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
