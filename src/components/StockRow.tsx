import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCompact, formatPct } from "@/lib/format";
import type { Stock } from "@/lib/storage";

type Props = {
  stock: Stock;
  marketCap: number;
  weight: number;
  onChange: (patch: Partial<Stock>) => void;
  onRemove: () => void;
};

export function StockRow({ stock, marketCap, weight, onChange, onRemove }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-ring/40">
      {/* Header: ticker + remove */}
      <div className="flex items-center justify-between gap-2">
        <Input
          value={stock.ticker}
          onChange={(e) =>
            onChange({ ticker: e.target.value.toUpperCase().slice(0, 8) })
          }
          placeholder="TICKER"
          className="h-9 w-32 font-mono text-sm font-semibold uppercase tracking-wide"
        />
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
              stock.manual
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {stock.manual ? "manual" : "auto"}
          </span>
          {stock.error ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-600">
              {stock.error}
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="Hapus saham"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Inputs: shares + price */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Shares (juta)
          </span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={stock.shares || ""}
            onChange={(e) =>
              onChange({ shares: Number(e.target.value) || 0 })
            }
            placeholder="0"
            className="mt-1 h-9 font-mono text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Harga (IDR)
          </span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={stock.price || ""}
            onChange={(e) =>
              onChange({ price: Number(e.target.value) || 0, manual: true })
            }
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
              className="h-full rounded-full bg-primary transition-[width] duration-300"
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
