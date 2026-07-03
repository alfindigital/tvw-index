import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ROWS: { keys: string[]; label: string }[] = [
  { keys: ["N"], label: "Focus add ticker input" },
  { keys: ["Enter"], label: "Add ticker / commit field" },
  { keys: ["Tab"], label: "Move between fields" },
  { keys: ["↑↓"], label: "Navigate ticker suggestions (while typing)" },
  { keys: ["Shift", "R"], label: "Refresh all prices" },
  { keys: ["Shift", "F"], label: "Toggle weight mode (Market Cap / Free-float)" },
  { keys: ["Shift", "S"], label: "Save watchlist as template" },
  { keys: ["Shift", "C"], label: "Copy TradingView formula" },
  
  { keys: ["?"], label: "Open this shortcut list" },
  { keys: ["Esc"], label: "Close dialog / menu" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-foreground">
      {children}
    </kbd>
  );
}

export function ShortcutsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Operate StackCap faster without a mouse.</DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border rounded-lg border border-border">
          {ROWS.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="text-foreground">{r.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                {r.keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 ? <span className="text-[10px] text-muted-foreground">+</span> : null}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
