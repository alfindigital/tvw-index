/**
 * Thin wrapper around Microsoft Clarity for custom event + tag tracking.
 * Safe to call during SSR (no-ops) and before the Clarity tag finishes loading
 * (the snippet queues calls in `window.clarity.q`).
 */

type ClarityFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

export type DeviceKind = "mobile" | "tablet" | "desktop";

export function getDeviceKind(): DeviceKind {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function clarity(...args: unknown[]) {
  if (typeof window === "undefined") return;
  try {
    window.clarity?.(...args);
  } catch {
    // analytics must never break the UI
  }
}

/** Track a named custom event (visible in Clarity → Filters → Custom events). */
export function trackEvent(name: string, tags?: Record<string, string>) {
  clarity("event", name);
  if (tags) {
    for (const [key, value] of Object.entries(tags)) {
      clarity("set", key, value);
    }
  }
}

export const TELEGRAM_POPUP_EVENTS = {
  impression: "tg_popup_impression",
  view: "tg_popup_view",
  clickCta: "tg_popup_click_cta",
  close: "tg_popup_close",
  joinSuccess: "tg_popup_join_success",
} as const;

/** Track a Telegram popup funnel step, always tagged with the device kind. */
export function trackTelegramPopup(
  step: keyof typeof TELEGRAM_POPUP_EVENTS,
  extra?: Record<string, string>,
) {
  const device = getDeviceKind();
  trackEvent(TELEGRAM_POPUP_EVENTS[step], {
    device,
    tg_popup_step: step,
    tg_popup_device: `${step}:${device}`,
    ...extra,
  });
}
