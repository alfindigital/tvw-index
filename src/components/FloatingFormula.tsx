import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  formula: string;
};

export function FloatingFormula({ formula }: Props) {
  const [copied, setCopied] = useState(false);
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
      <div className="flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-[oklch(0.18_0.08_275)] via-primary to-[oklch(0.32_0.16_278)] px-4 py-3 text-primary-foreground shadow-[0_8px_24px_-16px_oklch(0.10_0.03_275_/_0.7)] ring-1 ring-primary/20">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
            TradingView Formula
          </div>
          <div className="truncate font-mono text-xs text-primary-foreground">
            {formula || "Tambah saham untuk generate formula"}
          </div>
        </div>
        <button
          type="button"
          onClick={copy}
          disabled={empty}
          className="inline-flex h-8 shrink-0 items-center rounded-lg bg-primary-foreground px-3 text-xs font-medium text-primary transition hover:opacity-90 disabled:opacity-40"
        >
          {copied ? "Tersalin" : "Copy"}
        </button>
      </div>
    </div>
  );
}
