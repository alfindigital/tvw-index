import { useState } from "react";
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

  const formulaText = formula || "Add stocks to generate formula";

  return (
    <div className="w-full">
      <div className="flex w-full flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4">
        <button
          type="button"
          onClick={() => copyText(formula, "formula", "Formula")}
          disabled={empty}
          className="min-w-0 flex-1 text-left font-mono text-sm font-semibold tracking-tight text-foreground disabled:opacity-40 sm:text-base"
          title="Click to copy"
        >
          {formulaText}
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {onShare ? (
            <ActionBtn
              onClick={onShare}
              disabled={empty}
              active={false}
              label="Share"
            />
          ) : null}
          {pineScript ? (
            <ActionBtn
              onClick={() => copyText(pineScript, "pine", "Pine Script")}
              disabled={empty}
              active={copied === "pine"}
              label={copied === "pine" ? "Copied" : "Pine"}
            />
          ) : null}
          <ActionBtn
            onClick={() => copyText(formula, "formula", "Formula")}
            disabled={empty}
            active={copied === "formula"}
            primary
            label={copied === "formula" ? "Copied" : "Copy"}
          />
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  onClick,
  disabled,
  active,
  primary,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  primary?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold transition ${
        primary
          ? "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
          : active
            ? "bg-primary/10 text-primary"
            : "border border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground disabled:opacity-40"
      }`}
    >
      {label}
    </button>
  );
}
