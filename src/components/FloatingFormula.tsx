import { useState } from "react";
import { Share2, Check, Copy, FileCode2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  formula: string;
  pineScript?: string;
  onShare?: () => void;
};

export function FloatingFormula({ formula, pineScript, onShare }: Props) {
  const [copied, setCopied] = useState<"formula" | "pine" | null>(null);
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
      <div
        className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-primary/40 px-5 py-4 text-white shadow-[0_20px_50px_-20px_oklch(0.45_0.22_277_/_0.55)] sm:gap-4 sm:px-6 sm:py-5 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-white/25"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--primary) 0%, var(--primary-glow) 100%)",
        }}
      >
        <div className="min-w-0 flex-1 truncate font-mono text-base font-semibold leading-snug tracking-tight text-white sm:text-lg">
          {formula || "Add stocks to generate formula"}
        </div>
        <div className="flex shrink-0 items-center justify-center gap-2 sm:justify-start">
          {onShare ? (
            <button
              type="button"
              onClick={onShare}
              disabled={empty}
              title="Copy watchlist link"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
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
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
            >
              {copied === "pine" ? <Check className="h-4 w-4" /> : <FileCode2 className="h-4 w-4" />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => copyText(formula, "formula", "Formula")}
            disabled={empty}
            title={copied === "formula" ? "Copied" : "Copy formula"}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm transition hover:bg-white/90 disabled:opacity-40"
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
