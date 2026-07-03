export function formatIDR(value: number): string {
  if (!isFinite(value) || value <= 0) return "IDR 0";
  if (value >= 1e12) return `IDR ${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `IDR ${(value / 1e9).toFixed(2)}M`;
  if (value >= 1e6) return `IDR ${(value / 1e6).toFixed(2)}Jt`;
  return `IDR ${value.toLocaleString("id-ID")}`;
}

export function formatCompact(value: number): string {
  if (!isFinite(value) || value <= 0) return "0";
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}M`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}Jt`;
  return value.toLocaleString("id-ID");
}

export function formatPct(value: number): string {
  if (!isFinite(value)) return "0.00%";
  return `${(value * 100).toFixed(2)}%`;
}

export function formatTime(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Human "x minutes ago" relative time. Shared by LastUpdated + per-row stamps. */
export function relativeTime(ts: number | null, now: number = Date.now()): string {
  if (!ts) return "no data yet";
  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}
