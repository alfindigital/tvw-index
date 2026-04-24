# Saham Index Calculator — Minimalis

Aplikasi 1 halaman untuk bikin "basket saham" gaya market-cap weighted index. Kamu input ticker IDX + jumlah shares, harga close otomatis ditarik dari Yahoo Finance (bisa di-override manual), dan app langsung hitung market cap, weight, total basket, dan formula TradingView.

## Tampilan & UX

- **Style**: light clean minimalis — background putih, teks slate-900, accent biru lembut, border tipis, rounded-xl, banyak whitespace. Font sans (Inter).
- **Mobile-first**: di HP tiap saham jadi **card** vertikal (bukan baris tabel) — ticker besar di atas, field shares & price di bawah, market cap & weight di footer card. Di desktop berubah jadi tabel rapi.
- **Header**: judul "Index Builder" + subtitle "IDX market-cap weighted basket".
- **3 stat cards** di atas: Total Market Cap (IDR), Largest Weight (ticker · %), Jumlah Saham.
- **List saham**: tiap item punya kolom Ticker, Shares (juta), Price (IDR, auto-filled, editable), Market Cap, Weight bar + %, tombol hapus (icon).
- **Tombol "+ Tambah Saham"** di bawah list — buka inline row baru.
- **Tombol "Refresh Harga"** di pojok atas list — fetch ulang semua harga dari Yahoo. Tampilkan timestamp "Update terakhir: HH:MM".
- **Toggle per-row "Manual"**: kalau aktif, harga tidak ditimpa saat refresh. Indikator kecil "auto" / "manual" di sebelah price.
- **TradingView Formula box** paling bawah: text monospace + tombol Copy.

## Cara kerja harga

- User ketik ticker (mis. `BBCA`). App otomatis tambahkan suffix `.JK` saat fetch ke Yahoo.
- Sumber: endpoint Yahoo `query1.finance.yahoo.com/v8/finance/chart/{TICKER}.JK` — gratis, tidak perlu API key. Karena ada CORS, fetch dilakukan lewat **server function** TanStack Start (`/api/quote`) supaya aman dari browser.
- Kalau Yahoo gagal (ticker salah / rate-limit), tampilkan badge merah "harga gagal" — user tetap bisa isi manual.
- Refresh otomatis sekali saat halaman dibuka. Selain itu manual via tombol.
- Field price selalu editable; begitu user edit → row otomatis ditandai "manual" dan tidak akan ditimpa.

## Penyimpanan

- Semua state (daftar saham, shares, harga, manual flag) disimpan di **localStorage** browser. Tidak perlu login, tidak perlu backend database.
- App dimulai dengan **basket kosong** — user tambah saham sendiri.

## Perhitungan

- `marketCap_i = shares_i (juta) × price_i × 1.000.000`
- `totalMarketCap = Σ marketCap_i`
- `weight_i = marketCap_i / totalMarketCap`
- Format angka: `T` (triliun) / `M` (miliar) / `Jt` (juta) otomatis, locale id-ID.
- Formula TradingView: `TICKER1*weight1 + TICKER2*weight2 + ...` (weight dibulatkan 4 desimal).

## Struktur teknis

- `src/routes/index.tsx` — halaman utama (komponen client untuk interaktivitas).
- `src/routes/api/quote.ts` — server route TanStack Start. Terima query `?tickers=BBCA,TLKM`, fetch paralel ke Yahoo, return `{ symbol, price, currency }[]`.
- `src/components/StockRow.tsx` — baris/card saham (responsive).
- `src/components/StatCard.tsx` — kartu stat di atas.
- `src/lib/format.ts` — helper format IDR & angka besar (T/M/Jt).
- `src/lib/storage.ts` — load/save state ke localStorage dengan key `idx-basket-v1`.
- Pakai shadcn `Button`, `Input`, `Card`, `Badge`, `Sonner` (toast feedback copy/refresh).

## Yang **tidak** termasuk (biar simpel)

- Tidak ada multi-basket / tab — hanya 1 basket.
- Tidak ada auto-refresh tiap X menit (cukup saat buka halaman + tombol manual).
- Tidak ada login, akun, sync antar device.
- Tidak ada chart historis.

Kalau nanti mau ditambah (multi-basket, sync cloud, auto-refresh tiap close 16:00 WIB), gampang ditambahkan di iterasi berikutnya.