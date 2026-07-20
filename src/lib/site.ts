// Centralized site identity + runtime config.
// Swap the production domain anytime via the VITE_SITE_URL env var — no code change.
const DEFAULT_URL = "https://tvx.alfidx.my.id";

export const SITE_URL = (import.meta.env.VITE_SITE_URL || DEFAULT_URL).replace(/\/+$/, "");

export const SITE_NAME = "StackCap";
export const SITE_TAGLINE = "IDX watchlist, stacked by market cap.";
export const SITE_DESC =
  "StackCap — build an IDX stock watchlist, stack market-cap weights, and get a ready-to-use TradingView formula.";

export const OG_IMAGE = `${SITE_URL}/og-image.png`;

// "As of" date for the bundled shares-outstanding dataset (src/data/idx-shares.ts).
// Keep in sync whenever the dataset is regenerated.
export const SHARES_AS_OF = "24 Apr 2026";

// Default TradingView symbol prefix so bare codes resolve to the IDX listing.
export const TV_PREFIX = "IDX:";
