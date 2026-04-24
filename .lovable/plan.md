## Ringkasan

Upgrade besar Index Builder: bundle data shares semua saham IDX dari file Excel ke dalam aplikasi (tersimpan permanen, tanpa cloud), auto-fetch harga saat ketik ticker + Enter, ticker error muncul di field-nya (bukan toast HTTP), formula TradingView jadi floating card mencolok, header sticky dengan toggle dark/light, dan rebrand jadi navy biru × putih premium.

## Yang akan dibangun

### 1. Database shares IDX (bundled, local-only)
- Parse `Stock_List_-_20260424.xlsx` dengan Python di build time → generate `src/data/idx-shares.ts` berisi `Record<string, number>` (ticker → shares dalam juta).
- Data ini di-bundle ke JS, tidak butuh DB cloud, tidak butuh fetch ke server. Tersimpan otomatis di setiap browser yang load app.
- Saat user ketik ticker valid → shares auto-terisi dari database.
- Tetap bisa override manual (untuk IPO baru) — input shares editable, ada flag `manualShares` agar tidak ditimpa.

### 2. Auto-refresh on Enter
- Input ticker: tekan Enter → langsung fetch harga + auto-fill shares dari DB.
- Hapus tombol "Refresh Harga" massal (atau jadikan opsional kecil di pojok). Workflow: ketik ticker → Enter → selesai.
- Saat fetch sedang jalan: tampilkan spinner kecil di field ticker.

### 3. Error handling per-field (bukan toast)
- Kalau ticker tidak ditemukan / Yahoo balas error / no price → tampilkan badge merah kecil di bawah field ticker: `"Ticker tidak ditemukan"` atau `"Tidak ada harga"`.
- Tidak ada toast `HTTP 404` lagi. API route tetap balas 200 dengan `{error: "..."}` per quote.

### 4. Floating TradingView Formula
- Pindah dari section paling bawah → jadi **floating card** di kanan-bawah viewport (atau bottom sheet di mobile).
- Bisa di-collapse/expand. Saat expand: formula besar, monospace, tombol Copy mencolok (warna primary navy).
- Selalu visible saat scroll, jadi bisa langsung copy kapan saja.

### 5. Stat cards modern
- Ganti 3 kotak seragam → 1 hero card besar (Total Market Cap dengan angka besar + ikon) + 2 kartu pendamping yang lebih ringkas (Largest Weight dengan mini bar, Jumlah Saham).
- Tambahkan gradient halus navy untuk hero card.

### 6. Sticky header + theme toggle
- Header `sticky top-0 z-50` dengan backdrop blur, border bawah halus.
- Kiri: logo/wordmark "Index Builder" (kecil, minimalis).
- Kanan: tombol toggle Dark/Light (icon Sun/Moon, simpan preferensi di localStorage key `theme`).
- Hapus subtitle panjang, header benar-benar minimalis.

### 7. Branding navy × putih premium
Update `src/styles.css`:
- **Light mode**: background putih bersih, primary navy `oklch(~0.30 0.10 260)` (deep navy), accent navy lebih terang. Tidak ada warna mencolok lain.
- **Dark mode**: background navy sangat gelap `oklch(~0.15 0.04 260)`, foreground putih, primary navy lebih terang.
- Hapus warna amber/red/blue ad-hoc di StockRow → pakai semantic colors (`destructive`, `muted`, `primary`).
- Font tetap default, spacing lebih lega, border lebih halus.

### 8. Mobile responsive polish
- Stat cards: stack vertical di mobile, hero card full-width.
- StockRow: layout sudah card-based, tinggal pastikan input ticker + Enter handler nyaman di mobile (autocomplete off, no zoom).
- Floating formula card: di mobile jadi bottom sheet collapsible (sticky `bottom-0`), bukan floating kanan-bawah.

## File yang akan diubah/dibuat

**Baru:**
- `scripts/generate-shares.mjs` — parse xlsx ke TS (run sekali di build mode).
- `src/data/idx-shares.ts` — auto-generated database shares (`export const IDX_SHARES: Record<string, number>`).
- `src/components/ThemeToggle.tsx` — toggle dark/light dengan localStorage.
- `src/components/AppHeader.tsx` — sticky header.
- `src/components/FloatingFormula.tsx` — floating formula card.
- `src/hooks/use-theme.ts` — hook tema.

**Diubah:**
- `src/styles.css` — palet navy × putih.
- `src/routes/__root.tsx` — apply class theme di `<html>`.
- `src/routes/index.tsx` — rakit ulang layout (header sticky + stats baru + list + floating formula).
- `src/components/StockRow.tsx` — Enter handler, error per-field, hilangkan badge auto/manual, auto-fill shares dari DB, badge `manual` cukup kecil untuk shares override.
- `src/components/StatCard.tsx` — variant `hero` vs `compact`.
- `src/lib/storage.ts` — tambah `manualShares: boolean` di `Stock`.

## Detail teknis

**Generate shares DB (build mode):**
```
bun add -d xlsx
node scripts/generate-shares.mjs  # baca xlsx, tulis src/data/idx-shares.ts
```
Format output:
```ts
// auto-generated, do not edit
export const IDX_SHARES: Record<string, number> = {
  BBCA: 123456.78,
  BBRI: 151559.78,
  // ...
};
```

**Auto-fill shares saat ticker berubah:**
```ts
function onTickerChange(ticker: string) {
  const upper = ticker.toUpperCase();
  const patch: Partial<Stock> = { ticker: upper };
  if (!stock.manualShares && IDX_SHARES[upper]) {
    patch.shares = IDX_SHARES[upper];
  }
  onChange(patch);
}
```

**Enter to refresh:**
```tsx
<Input
  onKeyDown={(e) => { if (e.key === "Enter") refreshOne(stock.id); }}
  ...
/>
```
`refreshOne` panggil `/api/quote?tickers=XXX` untuk satu ticker, set `loading` state lokal, set `error` di stock kalau gagal.

**Theme:** simpan di `localStorage["theme"]` = `"light" | "dark"`. Apply via `document.documentElement.classList.toggle("dark")`. Default ikut `prefers-color-scheme`.

**Floating formula:** `position: fixed; bottom: 1rem; right: 1rem;` di desktop (max-width 420px), `bottom: 0; left: 0; right: 0;` di mobile dengan handle untuk collapse.

## Yang TIDAK berubah
- LocalStorage tetap dipakai untuk basket user (`idx-basket-v1`).
- Yahoo Finance tetap sumber harga via `/api/quote`.
- TanStack Start, shadcn/ui, struktur routing.

Setelah approve, saya jalankan `bun add -d xlsx`, parse file Excel, generate `idx-shares.ts`, lalu refactor UI sesuai daftar di atas.