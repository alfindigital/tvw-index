import { forwardRef, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { validateTicker } from "@/lib/ticker";

type Props = {
  onAdd: (ticker: string) => void;
};

export const QuickAddBar = forwardRef<HTMLInputElement, Props>(
  function QuickAddBar({ onAdd }, ref) {
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const trimmed = value.trim().toUpperCase();

    // Live validation only after user typed something — don't shout on empty.
    const liveError =
      trimmed.length === 0 ? null : validateTicker(trimmed).ok
        ? null
        : validateTicker(trimmed).error;
    const shownError = error ?? liveError;
    const canAdd = trimmed.length > 0 && !liveError;

    function commit() {
      const result = validateTicker(value);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setError(null);
      onAdd(result.ticker);
      setValue("");
    }

    return (
      <div className="rounded-2xl border border-border bg-card p-2.5 sm:p-3">
        <div className="flex items-stretch gap-2">
          <Input
            ref={ref}
            value={value}
            onChange={(e) => {
              setValue(e.target.value.toUpperCase().slice(0, 8));
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            placeholder="Ketik ticker, mis. BBCA"
            aria-label="Tambah ticker"
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? "quickadd-error" : "quickadd-hint"}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className={`h-10 flex-1 font-mono text-base font-semibold uppercase tracking-wider sm:text-sm ${
              shownError ? "border-destructive focus-visible:ring-destructive" : ""
            }`}
          />
          <Button
            type="button"
            onClick={commit}
            disabled={!canAdd}
            className="h-10 shrink-0 gap-1.5 px-3 sm:px-4"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Tambah</span>
          </Button>
        </div>
        {shownError ? (
          <p
            id="quickadd-error"
            role="alert"
            className="mt-1.5 flex items-center gap-1.5 px-1 text-[11px] font-medium text-destructive"
          >
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
            {shownError}
          </p>
        ) : (
          <p
            id="quickadd-hint"
            className="mt-1.5 px-1 text-[11px] text-muted-foreground"
          >
            Tekan{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground">
              Enter
            </kbd>{" "}
            untuk menambah · tekan{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground">
              N
            </kbd>{" "}
            dari mana saja untuk fokus ke sini
          </p>
        )}
      </div>
    );
  },
);

