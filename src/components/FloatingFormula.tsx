import { useState } from "react";
import { HelpCircle, Share2, Check, Copy, FileCode2, Sparkles } from "lucide-react";
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
  pineScript?: string;
  onShare?: () => void;
};

export function FloatingFormula({ formula, pineScript, onShare }: Props) {
  const [copied, setCopied] = useState<"formula" | "pine" | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const empty = !formula;

  function copyText(text: string, kind: "formula" | "pine", label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="w-full">
      <div className="relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl border border-primary/30 bg-primary px-5 py-4 text-primary-foreground shadow-[0_20px_50px_-20px_oklch(0.45_0.18_278_/_0.60)] sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-5 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-primary-foreground/30">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground/90" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/90">
              Your TradingView Formula
            </span>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              aria-label="How to use formula in TradingView"
              title="How to use formula in TradingView"
              className="inline-flex items-center text-primary-foreground/60 transition-colors hover:text-primary-foreground"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-1 truncate font-mono text-sm font-medium text-primary-foreground">
            {formula || "Add stocks to generate formula"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onShare ? (
            <button
              type="button"
              onClick={onShare}
              disabled={empty}
              title="Copy watchlist link"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground/80 transition hover:bg-primary-foreground/20 hover:text-primary-foreground disabled:opacity-40"
            >
              <Share2 className="h-4 w-4" />
            </button>
          ) : null}
          {pineScript ? (
            <button
              type="button"
              onClick={() => copyText(pineScript, "pine", "Pine Script")}
              disabled={empty}
              title="Copy as Pine Script v5 (for large baskets)"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground/80 transition hover:bg-primary-foreground/20 hover:text-primary-foreground disabled:opacity-40"
            >
              {copied === "pine" ? <Check className="h-4 w-4" /> : <FileCode2 className="h-4 w-4" />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => copyText(formula, "formula", "Formula")}
            disabled={empty}
            title={copied === "formula" ? "Copied" : "Copy formula"}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground text-primary transition hover:opacity-90 disabled:opacity-40"
          >
            {copied === "formula" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How to use formula in TradingView</DialogTitle>
            <DialogDescription>
              This formula combines multiple stocks into one weighted custom index.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <span>
                Click <strong>Copy</strong> to copy the formula.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <span>
                In TradingView, open a chart and click the <strong>symbol</strong> field (top-left corner).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              <span>
                <strong>Paste</strong> the formula as the expression, then press{" "}
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
                Symbols are automatically prefixed with{" "}
                <span className="font-mono">IDX:</span> for the Indonesia Stock
                Exchange.
              </span>
            </li>

          </ol>
        </DialogContent>
      </Dialog>
    </div>
  );
}
