import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
};

/**
 * Minimal one-line stat. Use inside a flex/grid row.
 */
export function StatCard({ label, value, sub, icon: Icon }: Props) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
      {Icon ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 truncate font-mono text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {value}
        </div>
        {sub ? (
          <div className="truncate text-[11px] text-muted-foreground">{sub}</div>
        ) : null}
      </div>
    </div>
  );
}
