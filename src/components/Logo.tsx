type Props = {
  /** Visual size of the mark in px. Wordmark scales with text classes. */
  size?: "sm" | "md";
  showWord?: boolean;
  className?: string;
};

/**
 * StackCap brand lockup: indigo gradient tile with a stacked-cylinder mark
 * (three offset "coin" layers with a teal rim-light on the top layer)
 * + Jakarta Sans wordmark. Used in the app header and 404 page.
 */
export function Logo({ size = "md", showWord = true, className = "" }: Props) {
  const box = size === "sm" ? "h-7 w-7 rounded-lg" : "h-9 w-9 rounded-xl";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <div
        className={`${box} relative flex shrink-0 items-center justify-center bg-gradient-to-br from-primary to-[oklch(0.32_0.14_275)] text-white shadow-[0_6px_18px_-6px_oklch(0.52_0.22_277_/_0.55)]`}
        aria-hidden
      >
        <StackMark className={icon} />
        <span className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/15" />
      </div>
      {showWord ? (
        <span className="truncate text-[15px] font-bold leading-none tracking-[-0.01em] sm:text-base">
          Stack<span className="text-primary-foreground/70">Cap</span>
        </span>
      ) : null}
    </div>
  );
}

/**
 * Stacked-coin brand mark. Three offset elliptical cylinders viewed
 * slightly from above; top layer carries a teal rim-light.
 */
function StackMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Bottom layer */}
      <ellipse cx="12" cy="18" rx="7" ry="2.2" />
      <path d="M5 18v-2M19 18v-2" />
      <path d="M5 16c0 1.21 3.13 2.2 7 2.2s7-.99 7-2.2" opacity="0.65" />
      {/* Middle layer */}
      <ellipse cx="12" cy="13.5" rx="7" ry="2.2" />
      <path d="M5 13.5v-2M19 13.5v-2" />
      {/* Top layer with teal rim-light */}
      <ellipse cx="12" cy="9" rx="7" ry="2.2" stroke="#5eead4" strokeWidth="1.9" />
      <path d="M5 9v-2M19 9v-2" stroke="#5eead4" strokeWidth="1.9" />
      <ellipse cx="12" cy="7" rx="7" ry="2.2" stroke="#5eead4" strokeWidth="1.9" />
    </svg>
  );
}
