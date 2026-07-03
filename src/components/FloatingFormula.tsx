import { useState } from "react";
import { Share2, FileCode2, Copy, Check } from "lucide-react";
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
      <div className="flex w-full flex-col gap-3 overflow-hidden rounded-2xl border-2 border-primary bg-card px-4 py-3.5 shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--primary)_25%,transparent)] sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4">
        <button
          type="button"
          onClick={() => copyText(formula, "formula", "Formula")}
          disabled={empty}
          className="line-clamp-2 min-w-0 flex-1 break-all text-left font-mono text-sm font-semibold leading-snug tracking-tight text-foreground disabled:opacity-40 sm:text-base"
          title="Click to copy"
        >
          {formulaText}
        </button>

        <div className="flex shrink-0 items-center justify-center gap-2 sm:justify-start">
          {onShare ? (
            <IconBtn
              onClick={onShare}
              disabled={empty}
              title="Share watchlist"
              icon={<Share2 className="h-4 w-4" />}
            />
          ) : null}
          {pineScript ? (
            <IconBtn
              onClick={() => copyText(pineScript, "pine", "Pine Script")}
              disabled={empty}
              active={copied === "pine"}
              title="Copy Pine Script"
              icon={
                copied === "pine" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <FileCode2 className="h-4 w-4" />
                )
              }
            />
          ) : null}
          <IconBtn
            onClick={() => copyText(formula, "formula", "Formula")}
            disabled={empty}
            active={copied === "formula"}
            primary
            title="Copy formula"
            icon={
              copied === "formula" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  disabled,
  active,
  primary,
  title,
  icon,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  primary?: boolean;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${
        primary
          ? "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
          : active
            ? "bg-primary/10 text-primary"
            : "border border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground disabled:opacity-40"
      }`}
    >
      {icon}
    </button>
  );
}
