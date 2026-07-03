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
    return { ok: false, error: "Ticker cannot be empty" };
  }
  if (ticker.length > 8) {
    return { ok: false, error: "Ticker too long (max 8 characters)" };
  }
  if (/\s/.test(ticker)) {
    return { ok: false, error: "Ticker cannot contain spaces" };
  }
  if (!/^[A-Z0-9.]+$/.test(ticker)) {
    return {
      ok: false,
      error: "Ticker must be A–Z letters only (e.g. BBCA)",
    };
  }
  if (!TICKER_RE.test(ticker)) {
    return {
      ok: false,
      error: "Invalid IDX ticker format. Example: BBCA or BBCA.JK",
    };
  }
  return { ok: true, ticker };
}
