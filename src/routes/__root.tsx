import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Index Builder — Watchlist & Kalkulator Saham IDX" },
      { name: "description", content: "Bangun watchlist saham IDX, hitung bobot index, dan pantau harga serta market cap secara real-time." },
      { name: "author", content: "Index Builder" },
      { property: "og:title", content: "Index Builder — Watchlist Saham IDX" },
      { property: "og:description", content: "Bangun watchlist saham IDX, hitung bobot index, dan pantau harga serta market cap secara real-time." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Index Builder" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Index Builder — Watchlist Saham IDX" },
      { name: "twitter:description", content: "Bangun watchlist saham IDX, hitung bobot index, dan pantau harga serta market cap secara real-time." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Index Builder",
          url: "https://tv-weight-index.lovable.app",
          description: "Bangun watchlist saham IDX, hitung bobot index, dan pantau harga serta market cap secara real-time.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Index Builder",
          url: "https://tv-weight-index.lovable.app",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
  return <Outlet />;
}
