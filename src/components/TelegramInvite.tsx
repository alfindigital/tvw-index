import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { TelegramIcon } from "@/components/SocialIcons";

const SEEN_KEY = "stackcap-tg-invite-v1";
const AUTO_HIDE_MS = 5000;

/**
 * First-visit invite to the Telegram channel.
 * Auto-hides after 5s, dismissible via the close button, shown once per browser.
 */
export function TelegramInvite() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore storage errors — still show once this session
    }
    const show = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setOpen(false), AUTO_HIDE_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Join the StackCap Telegram channel"
      className="fixed bottom-4 left-1/2 z-50 w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-3 duration-300 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0"
    >
      <div className="relative flex items-center gap-3 rounded-2xl border border-primary/25 bg-card/95 px-4 py-3 shadow-[0_16px_40px_-16px_oklch(0.52_0.22_277_/_0.55)] backdrop-blur-md">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.42_0.18_278)] text-primary-foreground">
          <TelegramIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
            Join <span className="text-primary">@lotmetrik</span> on Telegram
          </p>
          <a
            href="https://t.me/lotmetrik"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            IDX index ideas & updates →
          </a>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Dismiss Telegram invite"
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
