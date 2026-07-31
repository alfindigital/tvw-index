import { useCallback, useEffect, useRef, useState } from "react";
import { X, ArrowRight, Zap } from "lucide-react";
import { TelegramIcon } from "@/components/SocialIcons";
import { trackTelegramPopup } from "@/lib/analytics";

const SEEN_KEY = "stackcap-tg-invite-v2";
const PENDING_JOIN_KEY = "stackcap-tg-pending-join";
const AUTO_HIDE_MS = 5000;

/**
 * Center-screen, high-intent Telegram invite.
 * Shows once per browser. 5s countdown bar, dismissible.
 * Funnel events (impression → view → click/close → join success) go to Clarity.
 */
export function TelegramInvite() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(100);
  const closedRef = useRef(false);

  const close = useCallback((reason: "button" | "auto") => {
    if (closedRef.current) return;
    closedRef.current = true;
    trackTelegramPopup("close", { tg_popup_close_reason: reason });
    setOpen(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // A pending join from a previous session means the user actually left for Telegram.
    try {
      if (sessionStorage.getItem(PENDING_JOIN_KEY)) {
        sessionStorage.removeItem(PENDING_JOIN_KEY);
        trackTelegramPopup("joinSuccess");
      }
    } catch {
      // ignore storage errors
    }

    try {
      if (localStorage.getItem(SEEN_KEY)) return;
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore storage errors — still show once this session
    }
    trackTelegramPopup("impression");
    const show = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(show);
  }, []);

  useEffect(() => {
    if (!open) return;
    trackTelegramPopup("view");
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const remaining = Math.max(0, AUTO_HIDE_MS - elapsed);
      setProgress((remaining / AUTO_HIDE_MS) * 100);
      if (remaining > 0) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);

    const t = window.setTimeout(() => close("auto"), AUTO_HIDE_MS);
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [open, close]);

  const handleCta = useCallback(() => {
    closedRef.current = true;
    trackTelegramPopup("clickCta");
    try {
      sessionStorage.setItem(PENDING_JOIN_KEY, "1");
    } catch {
      // ignore
    }
    // If the tab is hidden shortly after the click, the user reached Telegram.
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        trackTelegramPopup("joinSuccess");
        try {
          sessionStorage.removeItem(PENDING_JOIN_KEY);
        } catch {
          // ignore
        }
        document.removeEventListener("visibilitychange", onHide);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.setTimeout(() => document.removeEventListener("visibilitychange", onHide), 10000);
    setOpen(false);
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Join the StackCap Telegram channel"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-[22rem] overflow-hidden rounded-3xl border border-primary/30 bg-card/95 shadow-[0_24px_60px_-20px_oklch(0.35_0.18_278_/_0.65)] backdrop-blur-xl animate-in zoom-in-95 slide-in-from-bottom-6 duration-300">
        {/* Glow orb */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-[oklch(0.55_0.22_278)]/15 blur-2xl" />

        <button
          type="button"
          onClick={() => close("button")}
          aria-label="Dismiss Telegram invite"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="relative px-6 pb-5 pt-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.42_0.18_278)] text-primary-foreground shadow-lg shadow-primary/25">
            <TelegramIcon className="h-7 w-7" />
          </span>

          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Zap className="h-3 w-3 fill-current" aria-hidden="true" />
            Free for first 500
          </div>

          <h3 className="mb-1 text-lg font-bold leading-tight text-foreground">
            Get the index signal first
          </h3>
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
            Join <span className="font-semibold text-primary">@lotmetrik</span> on Telegram and
            catch IDX moves before the crowd.
          </p>

          <a
            href="https://t.me/lotmetrik"
            target="_blank"
            rel="noreferrer"
            onClick={handleCta}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.45_0.2_278)] px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_8px_24px_-8px_oklch(0.45_0.2_278_/_0.6)] transition-all hover:scale-[1.02] hover:shadow-[0_12px_28px_-10px_oklch(0.45_0.2_278_/_0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
          >
            Join channel now
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </a>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Disappears in{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {Math.ceil((progress / 100) * 5)}s
            </span>
          </p>
        </div>

        {/* Countdown progress bar */}
        <div className="h-1 w-full bg-muted" aria-hidden="true">
          <div
            className="h-full bg-gradient-to-r from-primary to-[oklch(0.55_0.22_278)] transition-[width] ease-linear"
            style={{
              width: `${progress}%`,
              transitionDuration: progress === 100 ? "0ms" : "100ms",
            }}
          />
        </div>
      </div>
    </div>
  );
}
