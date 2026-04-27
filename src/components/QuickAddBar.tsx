import { forwardRef, useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  onAdd: (ticker: string) => void;
};

export const QuickAddBar = forwardRef<HTMLInputElement, Props>(
  function QuickAddBar({ onAdd }, ref) {
    const [value, setValue] = useState("");
    const trimmed = value.trim().toUpperCase();
    const canAdd = trimmed.length > 0;

    function commit() {
      if (!canAdd) return;
      onAdd(trimmed);
      setValue("");
    }

    return (
      <div className="rounded-2xl border border-border bg-card p-2.5 sm:p-3">
        <div className="flex items-stretch gap-2">
          <Input
            ref={ref}
            value={value}
            onChange={(e) =>
              setValue(e.target.value.toUpperCase().slice(0, 8))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            placeholder="Ketik ticker, mis. BBCA"
            aria-label="Tambah ticker"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="h-10 flex-1 font-mono text-base font-semibold uppercase tracking-wider sm:text-sm"
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
        <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
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
      </div>
    );
  },
);
