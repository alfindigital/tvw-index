import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { SITE_NAME, SITE_URL, SITE_DESC, OG_IMAGE, CF_BEACON_TOKEN } from "@/lib/site";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold tracking-tight text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Halaman tidak ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sepertinya halaman yang kamu cari sudah dipindah atau tidak pernah ada.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      // Dynamic status-bar color per color scheme.
      { name: "theme-color", media: "(prefers-color-scheme: light)", content: "#f5f5fb" },
      { name: "theme-color", media: "(prefers-color-scheme: dark)", content: "#0a0a1a" },
      { title: `${SITE_NAME} — Watchlist Saham IDX Bobot Market Cap` },
      { name: "description", content: SITE_DESC },
      { name: "author", content: SITE_NAME },
      { name: "application-name", content: SITE_NAME },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: SITE_NAME },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
      // Open Graph
      { property: "og:title", content: `${SITE_NAME} — Watchlist Saham IDX` },
      { property: "og:description", content: SITE_DESC },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: `${SITE_NAME} — kalkulator bobot index saham IDX` },
      { property: "og:locale", content: "id_ID" },
      // Twitter
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${SITE_NAME} — Watchlist Saham IDX` },
      { name: "twitter:description", content: SITE_DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=JetBrains+Mono:wght@500;600&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: SITE_NAME,
          url: SITE_URL,
          description: SITE_DESC,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          inLanguage: "id-ID",
          offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
        }),
      },
      // Cloudflare Web Analytics — only injected when a token is configured.
      ...(CF_BEACON_TOKEN
        ? [
            {
              src: "https://static.cloudflareinsights.com/beacon.min.js",
              defer: true,
              "data-cf-beacon": JSON.stringify({ token: CF_BEACON_TOKEN }),
            } as Record<string, unknown>,
          ]
        : []),
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  // Register the service worker (PWA / offline shell) in production only.
  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // installable PWA is a progressive enhancement; ignore failures
    });
  }, []);

  // Dev-only color-contrast watcher.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let cancelled = false;
    void import("@/lib/a11y-contrast").then(({ startContrastWatcher }) => {
      if (!cancelled) startContrastWatcher();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <Outlet />;
}
