import { useRef, useState } from "react";
import { Loader2, Trash2, AlertCircle } from "lucide-react";
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
  onChange: (patch: Partial<Stock>) => void;
  onCommitTicker: (ticker: string) => void; // dipanggil saat Enter / blur
  onRemove: () => void;
  /** Called when user presses Enter on the price field — useful to refocus quick-add */
  onCommitPrice?: () => void;
};

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
    const upper = v.toUpperCase().slice(0, 8);
    setTickerDraft(upper);
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
      {/* Top: ticker input + actions */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
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
              placeholder="TICKER · Enter"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="h-10 pr-9 font-mono text-base font-semibold uppercase tracking-wider sm:text-sm"
            />
            {loading ? (
              <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>
          {stock.error ? (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>{stock.error}</span>
            </div>
          ) : tickerDraft && !inDB && !stock.manualShares ? (
            <div className="mt-1.5 text-xs text-muted-foreground">
              Tidak ada di DB IDX · isi shares manual
            </div>
          ) : null}
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

      {/* Inputs: shares + price */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        <label className="block">
          <div className="flex items-center justify-between">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Shares (juta)
            </span>
            {stock.manualShares ? (
              <span className="text-[9px] font-medium uppercase tracking-wider text-primary">
                manual
              </span>
            ) : null}
          </div>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={stock.shares || ""}
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
            className="mt-1 h-9 font-mono text-sm"
          />
        </label>
        <label className="block">
          <div className="flex items-center justify-between">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Harga (IDR)
            </span>
            {stock.manualPrice ? (
              <span className="text-[9px] font-medium uppercase tracking-wider text-primary">
                manual
              </span>
            ) : null}
          </div>
          <Input
            ref={priceRef}
            type="number"
            inputMode="decimal"
            min={0}
            value={stock.price || ""}
            onChange={(e) =>
              onChange({
                price: Number(e.target.value) || 0,
                manualPrice: true,
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
                onCommitPrice?.();
              }
            }}
            placeholder="0"
            className="mt-1 h-9 font-mono text-sm"
          />
        </label>
      </div>

      {/* Footer: market cap + weight */}
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
