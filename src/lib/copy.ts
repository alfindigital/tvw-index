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
export const TEMPLATE_NAME_REQUIRED =
  "Nama template tidak boleh kosong. Yuk, beri nama yang mudah kamu ingat.";
export const TEMPLATE_NAME_TOO_LONG = (length: number) =>
  `Nama template terlalu panjang (${length}/${TEMPLATE_NAME_MAX} karakter). Coba persingkat ya.`;
export const TEMPLATE_NAME_DUPLICATE = (name: string) =>
  `Sudah ada template bernama "${name}". Pakai nama lain atau hapus template lama dulu.`;
export const TEMPLATE_NAME_INVALID_FALLBACK =
  "Nama template tidak valid. Coba periksa kembali.";
