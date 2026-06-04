import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCallback, useRef, useState } from "react";
import { render, act } from "@testing-library/react";
import { StockRow } from "./StockRow";
import type { Stock } from "@/lib/storage";

function makeStock(over: Partial<Stock> = {}): Stock {
  return {
    id: over.id ?? crypto.randomUUID(),
    ticker: over.ticker ?? "BBCA",
    shares: over.shares ?? 100,
    price: over.price ?? 9000,
    manualShares: false,
    manualPrice: false,
    error: null,
    ...over,
  };
}

/**
 * Mirrors the stable per-row handler cache used in src/routes/index.tsx so
 * tests reflect production memoization behavior.
 */
function Harness({
  initial,
}: {
  initial: Stock[];
}) {
  const [stocks, setStocks] = useState(initial);
  const handlersRef = useRef(
    new Map<
      string,
      {
        onChange: (p: Partial<Stock>) => void;
        onCommitTicker: () => void;
        onRemove: () => void;
        onCommitPrice: () => void;
      }
    >(),
  );

  const update = useCallback((id: string, patch: Partial<Stock>) => {
    setStocks((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const getHandlers = (id: string) => {
    const cache = handlersRef.current;
    const existing = cache.get(id);
    if (existing) return existing;
    const h = {
      onChange: (p: Partial<Stock>) => update(id, p),
      onCommitTicker: () => {},
      onRemove: () => {},
      onCommitPrice: () => {},
    };
    cache.set(id, h);
    return h;
  };

  // Expose mutators on window for tests
  (Harness as any)._setStocks = setStocks;

  return (
    <div>
      {stocks.map((s) => {
        const h = getHandlers(s.id);
        const cap = s.shares * s.price * 1_000_000;
        return (
          <StockRow
            key={s.id}
            stock={s}
            marketCap={cap}
            weight={0.1}
            loading={false}
            lastFetchedAt={null}
            onChange={h.onChange}
            onCommitTicker={h.onCommitTicker}
            onRemove={h.onRemove}
            onCommitPrice={h.onCommitPrice}
          />
        );
      })}
    </div>
  );
}

function renderLogsByTicker(spy: ReturnType<typeof vi.spyOn>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const call of spy.mock.calls) {
    const msg = String(call[0] ?? "");
    const m = msg.match(/\[StockRow re-render\] (\S+) #(\d+)/);
    if (m && m[1]) counts[m[1]] = (counts[m[1]] ?? 0) + 1;
  }
  return counts;
}

describe("StockRow memoization", () => {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it("only re-renders the row whose stock data actually changed", () => {
    const a = makeStock({ ticker: "BBCA", price: 9000 });
    const b = makeStock({ ticker: "BBRI", price: 4500 });
    const c = makeStock({ ticker: "TLKM", price: 3100 });

    render(<Harness initial={[a, b, c]} />);

    // Each row renders exactly once on mount
    const initial = renderLogsByTicker(spy);
    expect(initial.BBCA).toBe(1);
    expect(initial.BBRI).toBe(1);
    expect(initial.TLKM).toBe(1);

    spy.mockClear();

    // Change ONLY BBRI's price via its memoized handler
    act(() => {
      (Harness as any)._setStocks((prev: Stock[]) =>
        prev.map((s) => (s.ticker === "BBRI" ? { ...s, price: 5000 } : s)),
      );
    });

    const after = renderLogsByTicker(spy);
    expect(after.BBRI).toBe(1);
    expect(after.BBCA ?? 0).toBe(0);
    expect(after.TLKM ?? 0).toBe(0);
  });

  it("adding a new row does NOT re-render existing rows", () => {
    const a = makeStock({ ticker: "BBCA" });
    const b = makeStock({ ticker: "BBRI" });

    render(<Harness initial={[a, b]} />);
    spy.mockClear();

    act(() => {
      (Harness as any)._setStocks((prev: Stock[]) => [
        ...prev,
        makeStock({ ticker: "ASII", price: 5200 }),
      ]);
    });

    const after = renderLogsByTicker(spy);
    expect(after.ASII).toBe(1);
    expect(after.BBCA ?? 0).toBe(0);
    expect(after.BBRI ?? 0).toBe(0);
  });

  it("removing a row does NOT re-render unrelated rows", () => {
    const a = makeStock({ ticker: "BBCA" });
    const b = makeStock({ ticker: "BBRI" });
    const c = makeStock({ ticker: "TLKM" });

    render(<Harness initial={[a, b, c]} />);
    spy.mockClear();

    act(() => {
      (Harness as any)._setStocks((prev: Stock[]) =>
        prev.filter((s) => s.ticker !== "BBRI"),
      );
    });

    const after = renderLogsByTicker(spy);
    expect(after.BBCA ?? 0).toBe(0);
    expect(after.TLKM ?? 0).toBe(0);
  });
});
