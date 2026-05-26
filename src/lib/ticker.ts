// IDX ticker validation.
// IDX tickers are 3–5 uppercase letters (A–Z), optionally suffixed with ".JK".
// Examples valid: BBCA, TLKM, GOTO, BRPT, BBCA.JK
// Examples invalid: "", "BB", "BBCA1", "BBCA.JKK", "BBCA-W"

const TICKER_RE = /^[A-Z]{3,5}(?:\.JK)?$/;

export type TickerValidation =
  | { ok: true; ticker: string }
  | { ok: false; error: string };

export function normalizeTicker(raw: string): string {
  return raw.trim().toUpperCase();
}

export function validateTicker(raw: string): TickerValidation {
  const ticker = normalizeTicker(raw);
  if (!ticker) {
    return { ok: false, error: "Ticker tidak boleh kosong" };
  }
  if (ticker.length > 8) {
    return { ok: false, error: "Ticker terlalu panjang (maks 8 karakter)" };
  }
  if (/\s/.test(ticker)) {
    return { ok: false, error: "Ticker tidak boleh mengandung spasi" };
  }
  if (!/^[A-Z0-9.]+$/.test(ticker)) {
    return {
      ok: false,
      error: "Ticker hanya boleh huruf A–Z (mis. BBCA)",
    };
  }
  if (!TICKER_RE.test(ticker)) {
    return {
      ok: false,
      error: "Format ticker IDX salah. Contoh: BBCA atau BBCA.JK",
    };
  }
  return { ok: true, ticker };
}
