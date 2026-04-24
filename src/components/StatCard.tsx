import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  variant?: "hero" | "compact";
  accent?: React.ReactNode;
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  variant = "compact",
  accent,
}: Props) {
  if (variant === "hero") {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-primary-glow p-5 text-primary-foreground shadow-sm sm:p-6">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
              {label}
            </div>
            <div className="mt-2 font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
              {value}
            </div>
            {sub ? (
              <div className="mt-1 text-xs text-primary-foreground/70">{sub}</div>
            ) : null}
          </div>
          {Icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
        </div>
        {accent ? <div className="relative mt-4">{accent}</div> : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        {Icon ? (
          <Icon className="h-4 w-4 text-muted-foreground" />
        ) : null}
      </div>
      <div className="mt-2 font-mono text-lg font-semibold tracking-tight text-foreground sm:text-xl">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
      ) : null}
      {accent ? <div className="mt-3">{accent}</div> : null}
    </div>
  );
}
