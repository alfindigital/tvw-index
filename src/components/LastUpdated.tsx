import { useEffect, useState } from "react";
import { RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/format";

function relative(ts: number | null, now: number): string {
  if (!ts) return "belum ada data";
  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 5) return "baru saja";
  if (diff < 60) return `${diff} detik lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

type Props = {
  lastRefresh: number | null;
  loading: boolean;
  onRefresh: () => void;
};

export function LastUpdated({ lastRefresh, loading, onRefresh }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const rel = relative(lastRefresh, now);
  const abs = lastRefresh ? formatTime(lastRefresh) : null;

  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 sm:px-4"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <span className="truncate">
          <span className="font-medium text-foreground">Harga close:</span>{" "}
          {loading ? (
            "memperbarui…"
          ) : (
            <>
              {rel}
              {abs ? (
                <span className="ml-1 font-mono text-[11px] text-muted-foreground/80">
                  · {abs}
                </span>
              ) : null}
            </>
          )}
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        className="h-9 gap-1.5 px-3 text-xs font-semibold shadow-sm"
        aria-label={loading ? "Sedang memperbarui harga" : "Perbarui harga"}
      >
        <RefreshCw
          className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          aria-hidden
        />
        <span>{loading ? "Memperbarui…" : "Perbarui harga"}</span>
      </Button>
    </div>
  );
}
