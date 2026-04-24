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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-4 sm:pb-6">
      <div
        className={`pointer-events-auto w-full max-w-xl overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-[0_10px_40px_-10px_rgb(0_0_0_/_0.25)] backdrop-blur-xl transition-all`}
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
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                TradingView Formula
              </div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">
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
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
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
              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        {open ? (
          <div className="border-t border-border/60 p-3">
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground">
              {formula || "// Tambah saham, isi shares & harga untuk melihat formula."}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
