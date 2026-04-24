import { createFileRoute } from "@tanstack/react-router";
import { fetchQuotes } from "@/lib/quotes";

export const Route = createFileRoute("/api/quote")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const tickers = (url.searchParams.get("tickers") ?? "")
          .split(",")
          .map((ticker) => ticker.trim())
          .filter(Boolean);

        const quotes = await fetchQuotes(tickers);

        return Response.json({ quotes });
      },
    },
  },
} as any);