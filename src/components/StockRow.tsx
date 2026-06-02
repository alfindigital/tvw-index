import { useRef, useState } from "react";
import { Loader2, Trash2, AlertCircle, Hand } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCompact, formatPct } from "@/lib/format";
import type { Stock } from "@/lib/storage";
import { IDX_SHARES } from "@/data/idx-shares";

type Props = {
  stock: Stock;
  marketCap: number;
  weight: number;
  loading: boolean;
  lastFetchedAt?: number | null;
  onChange: (patch: Partial<Stock>) => void;
  onCommitTicker: (ticker: string) => void;
  onRemove: () => void;
  onCommitPrice?: () => void;
};

function formatSharesInput(value: number): string {
  if (!value) return "";
  // up to 2 decimals, trim trailing zeros
  const fixed = value.toFixed(2);
  return fixed.replace(/\.?0+$/, "");
}

export function StockRow({
  stock,
  marketCap,
  weight,
  loading,
  onChange,
  onCommitTicker,
  onRemove,
  onCommitPrice,
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

  return (
    <div className="rounded-xl border border-border bg-card p-3 transition-colors hover:border-ring/40 sm:p-4">
      {/* Mobile: ticker+remove on one row; shares+price below.
          Desktop: one row with ticker | shares | price | remove */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
        {/* Ticker + remove (inline on mobile, flex item on desktop) */}
        <div className="flex items-end gap-2 sm:flex-1 sm:min-w-0">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Ticker
            </div>
            <div className="relative">
              <Input
                value={tickerDraft}
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
                className="h-9 pr-9 font-mono text-sm font-semibold uppercase tracking-wider"
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
            className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Hapus saham"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Shares + Price (grid on mobile, inline on sm+) */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-[2] sm:gap-2">
          <label className="block min-w-0 sm:flex-1">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
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
                className="h-9 w-full min-w-0 pr-8 font-mono text-sm tabular-nums"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                jt{stock.manualShares ? "*" : ""}
              </span>
            </div>
          </label>
          <label className="block min-w-0 sm:flex-1">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Price (IDR)
            </span>
            <div className="relative w-full min-w-0">
              <Input
                ref={priceRef}
                type="text"
                inputMode="numeric"
                value={
                  stock.price ? stock.price.toLocaleString("id-ID") : ""
                }
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
                className="h-9 w-full min-w-0 pr-10 font-mono text-sm tabular-nums"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
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
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <Hand className="h-3 w-3" />
          <span>Harga manual · auto-fetch dimatikan</span>
        </div>
      ) : tickerDraft && !inDB && !stock.manualShares ? (
        <div className="mt-2 text-xs text-muted-foreground">
          Tidak ada di DB IDX · isi shares manual
        </div>
      ) : null}

      {/* Row 2: Market Cap + weight */}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Market Cap
          </div>
          <div className="font-mono text-sm font-medium text-foreground">
            {formatCompact(marketCap)}
          </div>
        </div>
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
