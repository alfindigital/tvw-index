import * as XLSX from 'xlsx';
import { writeFileSync } from 'node:fs';

const wb = XLSX.readFile('/tmp/stocks.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const out = {};
let count = 0;
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r || !r[1]) continue;
  const code = String(r[1]).trim().toUpperCase();
  const sharesRaw = String(r[4] ?? '').replace(/[, ]/g, '');
  const shares = Number(sharesRaw);
  if (!code || !isFinite(shares) || shares <= 0) continue;
  // store in JUTA (millions) to match Stock.shares convention
  out[code] = Number((shares / 1_000_000).toFixed(4));
  count++;
}

const sorted = Object.keys(out).sort();
const lines = sorted.map((k) => `  ${k}: ${out[k]},`).join('\n');

const ts = `// AUTO-GENERATED from Stock_List_-_20260424.xlsx — DO NOT EDIT
// Shares dalam satuan juta (millions). Total: ${count} emiten IDX.

export const IDX_SHARES: Record<string, number> = {
${lines}
};

export const IDX_TICKERS: string[] = Object.keys(IDX_SHARES);
`;

writeFileSync('src/data/idx-shares.ts', ts);
console.log(`Wrote ${count} tickers to src/data/idx-shares.ts`);
