// Centralized user-facing copy for watchlist states so heading,
// empty messages, and toasts stay in sync across the UI.
export const APP_NAME = "StackCap";
export const APP_TAGLINE = "IDX watchlist, stacked by market cap.";

export const WATCHLIST_LABEL = "Watchlist";

export const WATCHLIST_EMPTY_TITLE = "Watchlist is empty";
export const WATCHLIST_EMPTY_HINT =
  "Type a ticker above (e.g. BBCA) then press Enter to add your first stock.";

// Used when an action (refresh, save template) needs the watchlist to have items.
export const WATCHLIST_EMPTY_TOAST = "Watchlist is empty";
export const WATCHLIST_NO_TICKER_TOAST =
  "Watchlist is empty — no tickers to refresh yet.";

export const TEMPLATES_EMPTY = "No saved templates yet";

// Template name validation
export const TEMPLATE_NAME_MAX = 60;
export const TEMPLATE_NAME_REQUIRED =
  "Template name cannot be empty. Give it a memorable name.";
export const TEMPLATE_NAME_TOO_LONG = (length: number) =>
  `Template name too long (${length}/${TEMPLATE_NAME_MAX} chars). Try shortening it.`;
export const TEMPLATE_NAME_DUPLICATE = (name: string) =>
  `A template named "${name}" already exists. Use another name or delete the old one first.`;
export const TEMPLATE_NAME_INVALID_FALLBACK =
  "Template name invalid. Please check again.";

export const WATCHLIST_SAVED_TOAST = (name: string) =>
  `Watchlist saved as "${name}"`;
export const WATCHLIST_ALREADY_SAVED_TOAST = (name: string) =>
  `Watchlist already saved as "${name}"`;
