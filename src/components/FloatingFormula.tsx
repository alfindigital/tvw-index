import { useState } from "react";
import { Check, ChevronDown, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  formula: string;
};

export function FloatingFormula({ formula }: Props) {
  const [open, setOpen] = useState(false);
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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-4 pb-safe sm:px-6 sm:pb-6">
      <div
        className={`pointer-events-auto w-full max-w-xl overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-[oklch(0.18_0.08_275)] via-primary to-[oklch(0.32_0.16_278)] text-primary-foreground shadow-[0_20px_50px_-15px_oklch(0.10_0.03_275_/_0.7)] ring-1 ring-primary/30 backdrop-blur-xl transition-all`}
      >
        {/* Header (div, not button — to allow nested action button) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((v) => !v);
            }
          }}
          className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left select-none"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
                TradingView Formula
              </div>
              <div className="truncate font-mono text-[11px] text-primary-foreground/70">
                {formula || "Tambah saham untuk generate formula"}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                copy();
              }}
              disabled={empty}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary-foreground px-3 text-xs font-medium text-primary transition hover:opacity-90 disabled:opacity-40"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Tersalin
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </button>
            <ChevronDown
              className={`h-4 w-4 text-primary-foreground/70 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        {open ? (
          <div className="border-t border-primary-foreground/15 p-3">
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-primary-foreground/10 px-3 py-2.5 font-mono text-xs leading-relaxed text-primary-foreground">
              {formula || "// Tambah saham, isi shares & harga untuk melihat formula."}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
