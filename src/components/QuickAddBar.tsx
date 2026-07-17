import { forwardRef, useMemo, useRef, useState } from "react";
import { AlertCircle, Plus, Database, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { validateTicker } from "@/lib/ticker";
import { IDX_TICKERS, IDX_SHARES } from "@/data/idx-shares";
import { formatCompact } from "@/lib/format";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  onAdd: (ticker: string) => void;
  onReset: () => void;
  hasStocks: boolean;
};

const MAX_SUGGESTIONS = 8;

function matchTickers(query: string): string[] {
  const q = query.trim().toUpperCase().replace(/\.JK$/i, "");
  if (!q) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const t of IDX_TICKERS) {
    if (t === q) continue; // exact match needs no suggestion
    if (t.startsWith(q)) starts.push(t);
    else if (t.includes(q)) contains.push(t);
    if (starts.length >= MAX_SUGGESTIONS) break;
  }
  return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
}

export const QuickAddBar = forwardRef<HTMLInputElement, Props>(function QuickAddBar(
  { onAdd, onReset, hasStocks },
  ref,
) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [resetOpen, setResetOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = value.trim().toUpperCase();
  const suggestions = useMemo(() => matchTickers(value), [value]);

  let liveError: string | null = null;
  if (trimmed.length > 0) {
    const v = validateTicker(trimmed);
    if (!v.ok) liveError = v.error;
  }
  const shownError = error ?? liveError;
  const canAdd = trimmed.length > 0 && !liveError;
  const showList = open && suggestions.length > 0;

  function add(ticker: string) {
    const result = validateTicker(ticker);
    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    setError(null);
    onAdd(result.ticker);
    setValue("");
    setActive(-1);
    setOpen(false);
  }

  function commit() {
    if (active >= 0 && suggestions[active]) {
      add(suggestions[active]);
      return;
    }
    add(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-2.5 sm:p-3">
      <div className="relative flex items-stretch gap-2">
        <div className="relative flex-1">
          <Input
            ref={ref}
            value={value}
            role="combobox"
            aria-expanded={showList}
            aria-controls="quickadd-listbox"
            aria-activedescendant={active >= 0 ? `quickadd-opt-${active}` : undefined}
            aria-autocomplete="list"
            onChange={(e) => {
              setValue(e.target.value.toUpperCase().slice(0, 8));
              if (error) setError(null);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setOpen(false), 120);
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. BRIS"
            aria-label="Add ticker"
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? "quickadd-error" : undefined}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className={`h-10 w-full rounded-lg font-mono text-base font-semibold uppercase tracking-wider sm:text-sm ${
              shownError ? "border-destructive focus-visible:ring-destructive" : ""
            }`}
          />
          {showList ? (
            <ul
              id="quickadd-listbox"
              role="listbox"
              className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-lg"
              onMouseDown={(e) => {
                // keep input from blurring before click registers
                e.preventDefault();
                if (blurTimer.current) clearTimeout(blurTimer.current);
              }}
            >
              {suggestions.map((t, i) => {
                const shares = IDX_SHARES[t];
                return (
                  <li
                    key={t}
                    id={`quickadd-opt-${i}`}
                    role="option"
                    aria-selected={active === i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => add(t)}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
                      active === i ? "bg-accent text-accent-foreground" : "text-foreground"
                    }`}
                  >
                    <span className="font-mono font-semibold tracking-wider">{t}</span>
                    <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                      <Database className="h-3 w-3" aria-hidden />
                      {shares != null ? `${formatCompact(shares * 1_000_000)} lbr` : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetOpen(true)}
                disabled={!hasStocks}
                className="h-10 shrink-0 gap-1.5 rounded-lg px-3 sm:px-4"
                aria-label="Reset all — clear current watchlist"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              <span>Reset all — clear current watchlist</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          type="button"
          onClick={commit}
          disabled={!canAdd}
          className="h-10 shrink-0 gap-1.5 rounded-lg px-3 sm:px-4"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add</span>
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
      ) : null}

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset watchlist?</AlertDialogTitle>
            <AlertDialogDescription>
              All stocks in the current watchlist will be removed. Saved templates are unaffected.
              You can undo this from the toast that appears after resetting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onReset();
                setResetOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
