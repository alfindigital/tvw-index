import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { StockRow } from "./StockRow";
import type { Stock } from "@/lib/storage";

/**
 * Responsive a11y baselines for StockRow at the most common mobile widths,
 * verified in both light and dark mode. Guards against regressions in:
 *
 *  - Label font size (min 11px so it stays readable on small screens)
 *  - Tap-target height (≥36px for icon buttons, inputs)
 *  - Keyboard focus order (ticker → shares → price → remove)
 *  - aria-label on icon-only controls
 *  - Tooltip / `title` for truncated numeric values
 */

const VIEWPORTS = [
  { name: "iPhone SE", width: 375 },
  { name: "iPhone 12/13", width: 390 },
  { name: "iPhone XR/11", width: 414 },
  { name: "iPhone 14 Pro Max", width: 430 },
] as const;

function makeStock(over: Partial<Stock> = {}): Stock {
  return {
    id: over.id ?? "row-1",
    ticker: over.ticker ?? "BBCA",
    shares: over.shares ?? 123456.78,
    price: over.price ?? 9_999_999,
    manualShares: false,
    manualPrice: false,
    error: null,
    ...over,
  };
}

function renderRow(stock: Stock = makeStock()) {
  return render(
    <StockRow
      stock={stock}
      marketCap={stock.shares * stock.price * 1_000_000}
      weight={0.42}
      loading={false}
      lastFetchedAt={null}
      onChange={() => {}}
      onCommitTicker={() => {}}
      onRemove={() => {}}
      onCommitPrice={() => {}}
    />,
  );
}

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  window.dispatchEvent(new Event("resize"));
}

function setDarkMode(enabled: boolean) {
  document.documentElement.classList.toggle("dark", enabled);
}

describe("StockRow accessibility (responsive + dark mode)", () => {
  beforeEach(() => {
    setDarkMode(false);
  });
  afterEach(() => {
    setDarkMode(false);
  });

  for (const vp of VIEWPORTS) {
    for (const dark of [false, true] as const) {
      const mode = dark ? "dark" : "light";

      it(`${vp.name} (${vp.width}px) · ${mode} — labels are readable`, () => {
        setViewport(vp.width);
        setDarkMode(dark);
        const { getByText } = renderRow();
        for (const label of ["Ticker", "Shares (M)", "Price (IDR)"]) {
          const el = getByText(label);
          // Tailwind class encodes the floor: text-[11px] leading-4
          expect(el.className).toMatch(/text-\[11px\]|text-xs/);
          // High contrast in dark mode → uses `dark:text-foreground`
          expect(el.className).toMatch(/dark:text-foreground/);
        }
      });

      it(`${vp.name} (${vp.width}px) · ${mode} — icon button has aria-label`, () => {
        setViewport(vp.width);
        setDarkMode(dark);
        const { getAllByLabelText } = renderRow();
        // aria-label is specific to the row's ticker for clearer SR output.
        // Rendered once per responsive layout (mobile + desktop).
        const removeBtns = getAllByLabelText("Remove BBCA") as HTMLButtonElement[];
        expect(removeBtns.length).toBeGreaterThanOrEqual(1);
        for (const removeBtn of removeBtns) {
          expect(removeBtn.tagName).toBe("BUTTON");
          // Tap-target classes encode the minimum size (h-10 = 40px mobile, h-9 sm+)
          expect(removeBtn.className).toMatch(/h-10|h-9/);
        }
      });

      it(`${vp.name} (${vp.width}px) · ${mode} — long numeric values get tooltip via title`, () => {
        setViewport(vp.width);
        setDarkMode(dark);
        const { container } = renderRow(makeStock({ shares: 9876543.21, price: 999_999_999 }));
        const inputs = container.querySelectorAll("input");
        // ticker, shares, price
        expect(inputs.length).toBeGreaterThanOrEqual(3);
        const sharesInput = inputs[1] as HTMLInputElement;
        const priceInput = inputs[2] as HTMLInputElement;
        expect(sharesInput.getAttribute("title")).toContain("million");
        expect(priceInput.getAttribute("title")).toContain("Rp");
        // Numeric inputs must NOT truncate — clipping digits hides the value the
        // user is editing. Full value stays reachable via the `title` tooltip.
        expect(sharesInput.className).not.toContain("truncate");
        expect(priceInput.className).not.toContain("truncate");
      });

      it(`${vp.name} (${vp.width}px) · ${mode} — keyboard tab order is sane`, () => {
        setViewport(vp.width);
        setDarkMode(dark);
        const { container } = renderRow();
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>("input, button:not([disabled])"),
        );
        // Ticker input must come first so keyboard users land on it.
        const [first] = focusable;
        expect(first?.tagName).toBe("INPUT");
        expect((first as HTMLInputElement | undefined)?.value).toBe("BBCA");
        // Exactly 3 inputs (ticker, shares, price). The remove button is
        // rendered once per responsive layout (mobile + desktop), so allow
        // more than one — but every button must be the remove action.
        const inputs = focusable.filter((el) => el.tagName === "INPUT");
        const buttons = focusable.filter((el) => el.tagName === "BUTTON");
        expect(inputs).toHaveLength(3);
        expect(buttons.length).toBeGreaterThanOrEqual(1);
        for (const b of buttons) expect(b.getAttribute("aria-label")).toBe("Remove BBCA");
        // No positive tabindex (would break natural order)
        for (const el of focusable) {
          const ti = el.getAttribute("tabindex");
          if (ti != null) expect(Number(ti)).toBeLessThanOrEqual(0);
        }
      });
    }
  }
});
