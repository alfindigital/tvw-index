import { useEffect, useRef } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { StockRow } from "@/components/StockRow";
import type { Stock } from "@/lib/storage";

type EnrichedStock = Stock & { marketCap: number; weight: number };

type RowHandlers = {
  onChange: (patch: Partial<Stock>) => void;
  onCommitTicker: (t: string) => void;
  onRemove: () => void;
  onCommitPrice: () => void;
};

type Props = {
  rows: EnrichedStock[];
  loadingIds: Set<string>;
  fetchedAt: Record<string, number>;
  getRowHandlers: (id: string) => RowHandlers;
};

export function VirtualStockList({
  rows,
  loadingIds,
  fetchedAt,
  getRowHandlers,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  useEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 180,
    overscan: 6,
    scrollMargin: parentOffsetRef.current,
    gap: 10,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
          width: "100%",
        }}
      >
        {items.map((vi) => {
          const r = rows[vi.index];
          const h = getRowHandlers(r.id);
          return (
            <div
              key={r.id}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              <StockRow
                stock={r}
                marketCap={r.marketCap}
                weight={r.weight}
                loading={loadingIds.has(r.id)}
                lastFetchedAt={fetchedAt[r.id] ?? null}
                onChange={h.onChange}
                onCommitTicker={h.onCommitTicker}
                onRemove={h.onRemove}
                onCommitPrice={h.onCommitPrice}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
