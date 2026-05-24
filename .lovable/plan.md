# Rebrand → IndexW

## Identitas baru
- **Nama**: IndexW (sebelumnya "Index Builder / TV Weight Index")
- **Tagline**: "Watchlist saham IDX, dibobotin market cap."
- **Palette**: Midnight Indigo — `#0a0a1a` (bg dark), `#141432` (surface), `#1e1e5a` (deep), `#4f46e5` (indigo aksen)
- **Typography**: Plus Jakarta Sans (heading + body), JetBrains Mono untuk angka/ticker/formula (biar tidak terasa generic dan angka tetap monospace rapi)
- **Logo mark**: ikon timbangan (scale) custom SVG inline + monogram "W" sebagai favicon
- **Tone**: tenang, presisi, fintech-grade — bukan AI-generic

## Yang akan diubah

### 1. Design tokens (`src/styles.css`)
- Ganti palet light & dark ke Midnight Indigo (oklch ekuivalen dari hex di atas)
- Primary = indigo `#4f46e5`, surface dark = `#0a0a1a`/`#141432`
- Tambah token `--font-sans` (Plus Jakarta Sans) dan `--font-mono` (JetBrains Mono)
- Import Google Fonts (Plus Jakarta Sans 400/500/600/700 + JetBrains Mono 500)
- Hapus bias warna navy lama, samakan chart colors ke skala indigo

### 2. Meta & SEO (`src/routes/__root.tsx`, `src/routes/index.tsx`, `sitemap.xml.ts`)
- `og:site_name` = "IndexW"
- Title default & index: "IndexW — Watchlist Saham IDX Bobot Market Cap"
- Update JSON-LD WebSite/Organization → name "IndexW"
- Favicon & apple-touch-icon baru (monogram "W" indigo)

### 3. Logo & header (`src/components/AppHeader.tsx`)
- Komponen `Logo` baru: ikon timbangan (Lucide `Scale`) di kotak indigo gradient + wordmark "IndexW"
- Header: sticky, blur backdrop, padding mobile-friendly
- Actions tetap (SettingsMenu) tapi spacing dirapikan untuk layar sempit

### 4. Aset visual
- `public/favicon.svg` baru (monogram W indigo)
- `public/apple-touch-icon.png` (192×192) generated
- `public/og-image.png` (1200×630) bermerek IndexW

### 5. Konsistensi tipografi di komponen
- StockRow, StatCard, QuickAddBar, FloatingFormula: angka & ticker pakai `font-mono` (JetBrains Mono), label & heading pakai sans default
- Hapus penggunaan `font-mono` ad-hoc Tailwind default; pakai token

### 6. Mobile responsiveness pass
- AppHeader: logo + actions stack rapi <380px, wordmark tetap visible
- StatCard grid: sudah 1-col mobile (oke), perketat padding di <360px
- StockRow: pastikan field ticker/shares/price tidak overflow, tombol hapus tetap tappable (min 40px)
- QuickAddBar: full-width sticky-feel di mobile
- FloatingFormula: bottom sheet style di mobile, panel di desktop (sudah ada — tinjau ulang spacing)
- Footer & main padding: `px-4` mobile, `px-6` ≥sm, tetap `max-w-5xl` desktop

### 7. Copy
- `src/lib/copy.ts`: ganti nama produk → IndexW di empty state, toast, dialog
- Footer: "IndexW · Data IDX bundled · Harga via Yahoo Finance"

## Detail teknis
- Font loading via `<link>` preconnect + stylesheet di `__root.tsx` head (bukan @import CSS, biar tidak block render)
- Tailwind v4: register `--font-sans` & `--font-mono` di `@theme inline` agar utility `font-sans` / `font-mono` otomatis pakai font baru
- Tidak menyentuh logic (storage, quotes server fn, shortcuts) — murni branding + responsive polish
- Tidak menambah dependensi npm

## Yang TIDAK diubah
- Logika fetch harga, perhitungan market cap & weight, storage, shortcuts
- Struktur route dan server functions
- Konten data IDX

Setelah implement, saya akan QA cepat di viewport mobile 390px + desktop 1280px lewat preview.