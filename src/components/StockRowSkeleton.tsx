import { Skeleton } from "@/components/ui/skeleton";

/**
 * Matches StockRow dimensions exactly to prevent layout shift:
 * - Outer: rounded-xl border p-2.5 sm:p-4
 * - Label: text-[11px] leading-4 (h-4) + mb-1
 * - Input: h-9
 * - Footer: mt-3 pt-3 border-t with market cap label (h-4) + value (h-5),
 *   progress bar (h-1.5), weight value (h-4)
 */
export function StockRowSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-2.5 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
        <div className="flex items-end gap-1.5 sm:flex-1 sm:gap-2">
          <div className="min-w-0 flex-1">
            <Skeleton className="mb-1 h-4 w-14" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-8 w-8 shrink-0 rounded-md sm:h-9 sm:w-9" />
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-[2] sm:gap-2">
          <div className="sm:flex-1">
            <Skeleton className="mb-1 h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="sm:flex-1">
            <Skeleton className="mb-1 h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div>
          <Skeleton className="mb-1 h-3.5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex flex-1 items-center gap-3">
          <Skeleton className="h-1.5 flex-1 rounded-full" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    </div>
  );
}

export function StockListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <StockRowSkeleton key={i} />
      ))}
    </div>
  );
}
