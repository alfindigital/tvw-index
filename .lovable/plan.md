## Tujuan

1. **Input ticker cepat**: ada satu input "Tambah ticker" yang aktif, ketik → tekan Enter → ticker langsung masuk ke watchlist (auto-fetch harga), tanpa harus klik tombol "Tambah Saham" lalu mengisi row baru.
2. **Navigasi keyboard**: bisa pindah field pakai Tab/Enter, copy formula via shortcut, refresh & add via shortcut.
3. **Settings menu** menggantikan tombol Templates di header. Semua aksi (templates, refresh, reset, export, import, dark/light) pindah ke dalam menu Settings di pojok kanan atas.

## Perubahan UI

### Header (kanan atas)
Sebelum: `[Refresh] [Templates] [ThemeToggle]`
Sesudah: `[Settings (⚙)]` saja.

Klik Settings membuka dropdown panjang dengan grup:

```text
Tampilan
  ◐ Dark mode                        [toggle]
Watchlist
  ↻ Refresh harga                    Shift+R
  + Tambah saham                     N
  ⌫ Reset watchlist
Templates
  (daftar template tersimpan, klik = load, ikon hapus di kanan)
  ＋ Simpan sebagai template          Shift+S
Data
  ↓ Export data (.json)
  ↑ Import data (.json)
Bantuan
  ⌨ Keyboard shortcuts               ?
```

Menu pakai `DropdownMenu` shadcn yang sudah ada, dengan `DropdownMenuLabel` per grup dan `DropdownMenuShortcut` untuk hint shortcut. Confirm dialog untuk Reset.

### Quick-add bar (di atas list watchlist)
Baris baru di atas list:

```text
[ Ticker, mis. BBCA           ] [ + Tambah ]
   Enter untuk tambah · ↑↓ untuk navigasi history
```

- Input single ticker, auto-uppercase, max 8 char.
- Enter (atau klik tombol) → push stock baru ke list, auto-isi `shares` dari `IDX_SHARES`, langsung trigger `fetchTickerForRow`, lalu input dikosongkan dan tetap fokus untuk ticker berikutnya.
- Tombol "Tambah" enabled hanya saat input non-empty.
- Tombol "Tambah Saham" lama (desktop di header section + mobile bawah list) dihapus, digantikan input ini. Untuk row tanpa ticker yang ingin ditambah manual (hanya isi shares/price), tetap bisa lewat Settings → Tambah saham (tambah row kosong).

### Keyboard shortcuts global
Pasang listener di `IndexPage` (skip kalau target adalah input/textarea, kecuali shortcut yang sengaja universal):

| Key | Aksi |
|-----|------|
| `N` | Fokus quick-add input |
| `Shift+R` | Refresh semua harga |
| `Shift+S` | Buka dialog Simpan template |
| `Shift+C` | Copy formula TradingView ke clipboard (toast "Formula disalin") |
| `?` | Buka dialog daftar shortcut |
| `Esc` | Tutup dialog/dropdown yang terbuka (default Radix) |

Di dalam row (StockRow), Tab sudah natural pindah Ticker → Shares → Harga → Hapus. Tambahan:
- Pada input Harga, Enter → commit + pindah fokus ke quick-add (untuk lanjut tambah ticker baru cepat).
- Pada input Shares, Enter → pindah fokus ke input Harga.

### Dialog Shortcuts
Dialog sederhana berisi tabel key → aksi (copy dari list di atas), dipicu oleh `?` atau menu Settings → Bantuan.

## Detail Teknis

### File baru
- `src/components/SettingsMenu.tsx` — dropdown gabungan, terima props:
  ```ts
  {
    stocks: Stock[];
    loadingCount: number;
    onRefreshAll(): void;
    onAddEmpty(): void;
    onReset(): void;
    onLoadTemplate(stocks: Stock[]): void;
    onAfterImport(): void;
    onOpenShortcuts(): void;
  }
  ```
  Berisi semua isi `TemplatesMenu` saat ini + ThemeToggle inline (pakai `useTheme` langsung) + Refresh + Reset + entry Shortcuts. `TemplatesMenu.tsx` dihapus (atau dikosongkan—isinya dipindah ke SettingsMenu).
- `src/components/QuickAddBar.tsx` — input + tombol, props: `{ onAdd(ticker: string): void; inputRef?: Ref<HTMLInputElement> }`.
- `src/components/ShortcutsDialog.tsx` — Dialog shadcn dengan tabel shortcut.
- `src/hooks/use-shortcuts.ts` — hook kecil untuk register handler global, dengan guard: skip kalau `document.activeElement` adalah `input/textarea/[contenteditable]` kecuali untuk shortcut yang ditandai `allowInInput: true` (mis. `Shift+C`).

### Perubahan file
- `src/routes/index.tsx`:
  - Tambah `quickAddRef`, `shortcutsOpen` state.
  - Fungsi baru `addTicker(raw: string)` yang membuat `Stock` dengan ticker yang sudah diparse, isi `shares` dari `IDX_SHARES` jika ada, push ke state, lalu panggil `fetchTickerForRow`.
  - Pasang `useShortcuts` dengan handler N / Shift+R / Shift+S / Shift+C / `?`.
  - Render `<QuickAddBar onAdd={addTicker} inputRef={quickAddRef} />` di atas list.
  - Hapus tombol "Tambah Saham" lama (header section + mobile).
  - Render `<ShortcutsDialog open=… />`.
  - Ganti `<TemplatesMenu …>` dan `<ThemeToggle/>` di `AppHeader actions` dengan satu `<SettingsMenu …/>`. Refresh button juga dipindah ke dalam menu (header jadi cuma 1 ikon ⚙).
- `src/components/AppHeader.tsx`: tetap, hanya 1 child action sekarang. Tidak perlu render `<ThemeToggle/>` di sini lagi (dipindah ke SettingsMenu) — hapus baris `<ThemeToggle/>`.
- `src/components/StockRow.tsx`: pada input Shares & Harga tambah `onKeyDown` untuk Enter → next field / quick-add focus. Quick-add ref di-share via context ringan atau callback prop `onCommitPrice` baru.
- `src/lib/copy.ts`: tambah konstanta untuk label tombol Settings dan judul dialog shortcuts (opsional).

### Aksesibilitas
- Setiap shortcut hint tampil di menu via `DropdownMenuShortcut`.
- Semua tombol punya `aria-label` & `title`.
- Quick-add input: `aria-label="Tambah ticker"`.

## Out of scope
- Tidak menambah autocomplete dropdown di QuickAddBar (cukup input + Enter). Bisa fase berikutnya.
- Tidak mengubah formula/perhitungan.
