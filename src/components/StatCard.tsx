type Props = {
  label: string;
  value: string;
  sub?: string;
};

export function StatCard({ label, value, sub }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      ) : null}
    </div>
  );
}
