import { useState } from "react";
import { Share2, Check, Copy, FileCode2, Sparkles } from "lucide-react";
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
      <div className="relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl border-2 border-primary bg-card px-5 py-4 text-foreground shadow-[0_12px_30px_-12px_oklch(0.45_0.18_278_/_0.20)] sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
              Result
            </span>
          </div>
          <div className="mt-1 truncate font-mono text-sm font-medium text-foreground">
            {formula || "Add stocks to generate formula"}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-center gap-2 sm:justify-start">
          {onShare ? (
            <button
              type="button"
              onClick={onShare}
              disabled={empty}
              title="Copy watchlist link"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-40"
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
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-40"
            >
              {copied === "pine" ? <Check className="h-4 w-4" /> : <FileCode2 className="h-4 w-4" />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => copyText(formula, "formula", "Formula")}
            disabled={empty}
            title={copied === "formula" ? "Copied" : "Copy formula"}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {copied === "formula" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

    </div>
  );
}
