import { useState } from "react";
import { Check, ChevronDown, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  formula: string;
};

export function FloatingFormula({ formula }: Props) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const empty = !formula;

  function copy() {
    if (!formula) return;
    navigator.clipboard.writeText(formula).then(() => {
      setCopied(true);
      toast.success("Formula disalin ke clipboard");
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:px-0 sm:pb-0">
      <div
        className={`pointer-events-auto w-full overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xl shadow-primary/15 ring-1 ring-primary/10 transition-all sm:w-[440px] ${
          open ? "max-h-[60vh]" : "max-h-14"
        }`}
      >
        {/* Handle / header */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 bg-gradient-to-r from-primary to-primary-glow px-4 py-3 text-left text-primary-foreground"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">
              TradingView Formula
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "" : "rotate-180"}`}
          />
        </button>

        {open ? (
          <div className="space-y-3 p-3 sm:p-4">
            <pre className="max-h-40 min-h-[64px] overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground">
              {formula ||
                "// Tambah saham, isi shares & harga untuk melihat formula."}
            </pre>
            <Button
              type="button"
              onClick={copy}
              disabled={empty}
              className="w-full gap-2"
              size="sm"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Tersalin
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Formula
                </>
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
