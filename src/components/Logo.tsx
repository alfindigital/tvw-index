type Props = {
  /** Visual size of the mark in px. Wordmark scales with text classes. */
  size?: "sm" | "md";
  showWord?: boolean;
  className?: string;
};

/**
 * StackCap brand lockup: indigo tile with a stacked-cylinder mark
 * (three offset "coin" layers with a teal rim-light on the top layer)
 * + Jakarta Sans wordmark. Contrast-tuned for both light and dark themes.
 */
export function Logo({ size = "md", showWord = true, className = "" }: Props) {
  const box = size === "sm" ? "h-7 w-7 rounded-lg" : "h-9 w-9 rounded-xl";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <div
        className={`${box} relative flex shrink-0 items-center justify-center bg-gradient-to-br from-primary to-[oklch(0.32_0.14_275)] text-primary-foreground shadow-[0_6px_18px_-6px_oklch(0.52_0.22_277_/_0.45)] dark:to-[oklch(0.42_0.18_278)]`}
        aria-hidden
      >
        <StackMark className={icon} />
        <span className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/20" />
      </div>
      {showWord ? (
        <span className="truncate text-[15px] font-bold leading-none tracking-[-0.01em] text-foreground sm:text-base">
          Stack<span className="text-primary">Cap</span>
        </span>
      ) : null}
    </div>
  );
}

/**
 * StackCap brand mark: clean outline of three stacked layers.
 * Single-weight stroke, no fill, minimal and readable at all sizes.
 */
function StackMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Top layer */}
      <rect x="6" y="5" width="12" height="3.5" rx="1.5" />
      {/* Middle layer */}
      <rect x="5" y="10.25" width="14" height="3.5" rx="1.5" />
      {/* Bottom layer */}
      <rect x="4" y="15.5" width="16" height="3.5" rx="1.5" />
    </svg>
  );
}
