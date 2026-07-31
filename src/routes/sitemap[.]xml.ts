import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SITE_URL, SHARES_AS_OF } from "@/lib/site";
import { IDX_TICKERS } from "@/data/idx-shares";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Blue-chip / high-liquidity IDX names — get priority 0.8 in the sitemap so
// crawlers prioritize crawling the emiten pages that actually get search traffic.
const BLUE_CHIPS = new Set([
  "BBCA",
  "BBRI",
  "BMRI",
  "BBNI",
  "TLKM",
  "ASII",
  "UNTR",
  "ICBP",
  "INDF",
  "KLBF",
  "UNVR",
  "GOTO",
  "ADRO",
  "PTBA",
  "ITMG",
  "AMRT",
  "MYOR",
  "MDKA",
  "ANTM",
  "INCO",
  "PGAS",
  "SMGR",
  "INTP",
  "JSMR",
  "EXCL",
  "ISAT",
  "TOWR",
  "BRIS",
  "ARTO",
  "MEGA",
  "BBTN",
  "HRUM",
  "MEDC",
  "AKRA",
  "CPIN",
  "JPFA",
]);

// Parse SHARES_AS_OF ("24 Apr 2026") into ISO for <lastmod>. Falls back to
// today if the format ever drifts.
function sharesAsOfIso(): string {
  const d = new Date(SHARES_AS_OF);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const lastmod = sharesAsOfIso();
        const today = new Date().toISOString().slice(0, 10);
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0", lastmod: today },
          ...IDX_TICKERS.map((t) => ({
            path: `/saham/${t}`,
            changefreq: "weekly" as const,
            priority: BLUE_CHIPS.has(t) ? "0.8" : "0.4",
            lastmod,
          })),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${SITE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
