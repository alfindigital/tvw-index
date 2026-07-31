import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
};

/**
 * Compact stat cell.
 * - Mobile: single row per stat, label left / value right (no icon).
 * - Desktop: label + value stacked, with icon chip.
 */
export function StatCard({ label, value, sub, icon: Icon }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:flex-row sm:items-center sm:px-5 sm:py-4">
      {/* Icon: desktop only */}
      {Icon ? (
        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}

      {/* Mobile: label chip on the left */}
      <div className="min-w-0 flex-1 sm:hidden">
        <div className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
      </div>

      {/* Desktop: label + optional sub, stacked, next to icon */}
      <div className="hidden min-w-0 flex-1 sm:block">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 truncate font-mono text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {value}
        </div>
        {sub ? <div className="truncate text-[11px] text-muted-foreground">{sub}</div> : null}
      </div>

      {/* Mobile: value on the right */}
      <div className="min-w-0 max-w-[60%] text-right sm:hidden">
        <div className="truncate font-mono text-sm font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}
