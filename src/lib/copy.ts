// Centralized user-facing copy for watchlist states so heading,
// empty messages, and toasts stay in sync across the UI.
export const WATCHLIST_LABEL = "Watchlist";

export const WATCHLIST_EMPTY_TITLE = "Watchlist masih kosong";
export const WATCHLIST_EMPTY_HINT =
  "Klik tombol di bawah untuk menambah saham pertama.";

// Used when an action (refresh, save template) needs the watchlist to have items.
export const WATCHLIST_EMPTY_TOAST = "Watchlist masih kosong";
export const WATCHLIST_NO_TICKER_TOAST =
  "Watchlist masih kosong — belum ada ticker untuk di-refresh.";

export const TEMPLATES_EMPTY = "Belum ada template tersimpan";

// Template name validation
export const TEMPLATE_NAME_MAX = 60;
export const TEMPLATE_NAME_REQUIRED = "Nama template wajib diisi";
export const TEMPLATE_NAME_TOO_LONG = `Nama template maksimal ${TEMPLATE_NAME_MAX} karakter`;
