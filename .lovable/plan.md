# Rebrand → StackCap

## New identity
- **Name**: StackCap (replaces "IndexW" everywhere)
- **Tagline**: "IDX watchlist, stacked by market cap."
- **Logo mark**: three offset cylindrical layers (stacked coins) forming an abstract "S", viewed at a slight isometric angle. Indigo base, teal rim-light on the top layer.
- **Palette**: keep existing Midnight Indigo base; add teal accent `oklch(0.78 0.14 195)` (~`#5eead4`) reserved for the logo rim-light and small brand highlights (favicon, OG). No sweeping palette change — indigo primary stays.
- **Fonts**: unchanged (Plus Jakarta Sans + JetBrains Mono).

## Files to change

### 1. Brand assets (new SVG-first, then generate PNGs)
- `public/favicon.svg` — rewrite: rounded indigo tile, 3 stacked cylinder layers (ellipse-top + side rectangle), each offset ~2px, top layer with teal rim stroke.
- `scripts/generate-og.mjs` — update `scaleGlyph()` → `stackGlyph()` (new cylinder-stack SVG), replace wordmark "IndexW" with "StackCap", update tagline text, regenerate:
  - `public/og-image.png` (1200×630)
  - `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`
- Run the script once after edits (documented one-off with ad-hoc `sharp` install per its header comment).

### 2. Logo component
- `src/components/Logo.tsx` — replace `<Scale>` lucide icon with an inline SVG of the stacked-cylinder mark (small, self-contained, ~18×18 viewBox). Wordmark becomes `Stack<span class="text-primary-foreground/70">Cap</span>`.

### 3. Copy & identity strings
- `src/lib/site.ts` — `SITE_NAME = "StackCap"`, `SITE_TAGLINE`, `SITE_DESC` updated to English StackCap copy.
- `src/lib/copy.ts` — `APP_NAME = "StackCap"`, `APP_TAGLINE` updated.
- `public/manifest.webmanifest` — `name`, `short_name`, `description`, `lang: "en"`.
- `public/llms.txt` — rewrite header and description in English, StackCap branding.
- `public/robots.txt` — update sitemap comment if it references the old name (verify).
- `src/routes/__root.tsx` — title template already uses `SITE_NAME`; verify no hardcoded "IndexW" remains.
- `src/routes/index.tsx` and `src/routes/saham.$ticker.tsx` — replace any hardcoded "IndexW" mentions in headings, meta, JSON-LD.
- `src/routes/sitemap[.]xml.ts` — update if it embeds the name.

### 4. Theme token (small addition)
- `src/styles.css` — add a single `--brand-accent` teal token used only by the logo SVG rim-light. No changes to primary/background/foreground.

## What stays the same
- Route structure, server functions, storage, shortcuts, quotes fetching, watchlist logic.
- Typography stack (Plus Jakarta Sans + JetBrains Mono).
- Dark theme, primary indigo, layout, mobile responsive work already shipped.
- No new npm dependencies (sharp remains ad-hoc for OG regen only).

## Verification
- `bun run typecheck`
- Manual: view `/` and `/saham/BBCA` at 390px + 1280px, confirm header logo + wordmark render, favicon updates, OG image renders new mark.
- Grep for leftover "IndexW" / "Index Builder" / Indonesian tagline strings — must be zero.

Two-step delivery: after you approve, I implement the code + copy changes first, then regenerate the PNG assets via the OG script.