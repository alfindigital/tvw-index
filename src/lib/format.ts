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
