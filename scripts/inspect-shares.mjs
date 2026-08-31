import * as XLSX from "xlsx";
const wb = XLSX.readFile("/tmp/stocks.xlsx");
console.log("Sheets:", wb.SheetNames);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
console.log("Rows:", rows.length);
console.log("First 12:");
rows.slice(0, 12).forEach((r, i) => console.log(i, JSON.stringify(r)));
