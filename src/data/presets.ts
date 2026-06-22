// Built-in starter baskets so first-time users get instant value instead of a
// blank watchlist. Tickers are validated against IDX_SHARES at use-time, so an
// unknown code is silently dropped rather than breaking the preset.
import { IDX_SHARES } from "@/data/idx-shares";

export type Preset = {
  id: string;
  name: string;
  desc: string;
  tickers: string[];
};

const RAW_PRESETS: Preset[] = [
  {
    id: "big4-banks",
    name: "4 Bank Besar",
    desc: "BBCA · BBRI · BMRI · BBNI",
    tickers: ["BBCA", "BBRI", "BMRI", "BBNI"],
  },
  {
    id: "bluechip-10",
    name: "Blue Chip 10",
    desc: "10 emiten kapitalisasi besar lintas sektor",
    tickers: ["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "BBNI", "UNTR", "ICBP", "KLBF", "ADRO"],
  },
  {
    id: "energy",
    name: "Energi & Batu Bara",
    desc: "ADRO · PTBA · ITMG · INDY · HRUM",
    tickers: ["ADRO", "PTBA", "ITMG", "INDY", "HRUM"],
  },
  {
    id: "consumer",
    name: "Konsumer",
    desc: "ICBP · INDF · UNVR · MYOR · AMRT",
    tickers: ["ICBP", "INDF", "UNVR", "MYOR", "AMRT"],
  },
];

/** Presets with their tickers filtered to those present in the bundled DB. */
export const PRESETS: Preset[] = RAW_PRESETS.map((p) => ({
  ...p,
  tickers: p.tickers.filter((t) => IDX_SHARES[t] != null),
})).filter((p) => p.tickers.length > 0);
