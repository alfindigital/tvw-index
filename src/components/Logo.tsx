import { Scale } from "lucide-react";

type Props = {
  /** Visual size of the mark in px. Wordmark scales with text classes. */
  size?: "sm" | "md";
  showWord?: boolean;
  className?: string;
};

/**
 * IndexW brand lockup: indigo gradient tile with a scale (timbangan) glyph
 * + Jakarta Sans wordmark. Used in the app header and 404 page.
 */
export function Logo({ size = "md", showWord = true, className = "" }: Props) {
  const box =
    size === "sm" ? "h-7 w-7 rounded-lg" : "h-9 w-9 rounded-xl";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";

  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <div
        className={`${box} relative flex shrink-0 items-center justify-center bg-gradient-to-br from-primary to-[oklch(0.32_0.14_275)] text-white shadow-[0_6px_18px_-6px_oklch(0.52_0.22_277_/_0.55)]`}
        aria-hidden
      >
        <Scale className={icon} strokeWidth={2.25} />
        <span className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/15" />
      </div>
      {showWord ? (
        <span className="truncate text-[15px] font-bold leading-none tracking-[-0.01em] sm:text-base">
          Index<span className="text-primary-foreground/70">W</span>
        </span>
      ) : null}
    </div>
  );
}
