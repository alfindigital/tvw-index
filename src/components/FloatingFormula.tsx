import { useState } from "react";
import { HelpCircle, Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  formula: string;
  usePrefix: boolean;
  onTogglePrefix: () => void;
  onShare?: () => void;
};

export function FloatingFormula({ formula, usePrefix, onTogglePrefix, onShare }: Props) {
  const [copied, setCopied] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const empty = !formula;

  function copy() {
    if (!formula) return;
    navigator.clipboard.writeText(formula).then(() => {
      setCopied(true);
      toast.success("Formula disalin");
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="w-full">
      <div className="flex w-full flex-col gap-2.5 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-[oklch(0.18_0.08_275)] via-primary to-[oklch(0.32_0.16_278)] px-4 py-3 text-primary-foreground shadow-[0_8px_24px_-16px_oklch(0.10_0.03_275_/_0.7)] ring-1 ring-primary/20 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
              TradingView Formula
            </span>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-foreground/70 underline-offset-2 hover:text-primary-foreground hover:underline"
            >
              <HelpCircle className="h-3 w-3" />
              cara pakai
            </button>
          </div>
          <div className="truncate font-mono text-xs text-primary-foreground">
            {formula || "Tambah saham untuk generate formula"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePrefix}
            aria-pressed={usePrefix}
            title="Tambah prefix IDX: agar simbol pasti merujuk bursa IDX"
            className={`inline-flex h-8 items-center rounded-lg px-2.5 font-mono text-[11px] font-semibold transition ${
              usePrefix
                ? "bg-primary-foreground text-primary"
                : "bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
            }`}
          >
            IDX:
          </button>
          {onShare ? (
            <button
              type="button"
              onClick={onShare}
              disabled={empty}
              title="Salin link watchlist"
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-primary-foreground/15 px-2.5 text-xs font-medium text-primary-foreground transition hover:bg-primary-foreground/25 disabled:opacity-40"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={copy}
            disabled={empty}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-primary-foreground px-3 text-xs font-medium text-primary transition hover:opacity-90 disabled:opacity-40"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Tersalin" : "Copy"}
          </button>
        </div>
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cara pakai formula di TradingView</DialogTitle>
            <DialogDescription>
              Formula ini menggabungkan beberapa saham jadi satu index custom berbobot.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <span>
                Klik <strong>Copy</strong> untuk menyalin formula.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <span>
                Di TradingView, buka chart dan klik kolom <strong>simbol</strong> (pojok kiri-atas).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              <span>
                <strong>Tempel</strong> formula sebagai expression, lalu tekan{" "}
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                  Enter
                </kbd>
                .
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                4
              </span>
              <span>
                Chart index gabungan muncul. Prefix <span className="font-mono">IDX:</span>{" "}
                memastikan tiap simbol merujuk ke bursa Indonesia.
              </span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </div>
  );
}
