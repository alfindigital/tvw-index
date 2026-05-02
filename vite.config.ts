// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const SRC_DIR = path.resolve(process.cwd(), "src");
const EXTS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];
const INDEX_EXTS = [".ts", ".tsx", ".js", ".jsx"];

function tryResolve(absPath: string): string | null {
  for (const ext of EXTS) {
    const candidate = absPath + ext;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  if (existsSync(absPath) && statSync(absPath).isDirectory()) {
    for (const ext of INDEX_EXTS) {
      const candidate = path.join(absPath, "index" + ext);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function importGuardPlugin(): Plugin {
  return {
    name: "lovable-import-guard",
    apply: "serve",
    enforce: "pre",
    resolveId(source, importer) {
      // Only check local imports
      if (!source.startsWith("@/") && !source.startsWith("./") && !source.startsWith("../")) {
        return null;
      }
      // Skip query/asset suffixes like ?url, ?raw, ?worker
      const cleanSource = source.split("?")[0];
      // Skip CSS / asset imports — let Vite handle them
      if (/\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp3|mp4|webm)$/i.test(cleanSource)) {
        return null;
      }

      let absPath: string;
      if (cleanSource.startsWith("@/")) {
        absPath = path.join(SRC_DIR, cleanSource.slice(2));
      } else if (importer) {
        absPath = path.resolve(path.dirname(importer.split("?")[0]), cleanSource);
      } else {
        return null;
      }

      const resolved = tryResolve(absPath);
      if (!resolved) {
        const from = importer ? path.relative(process.cwd(), importer.split("?")[0]) : "<unknown>";
        const msg =
          `\n\n[import-guard] Cannot find module "${source}"\n` +
          `  imported from: ${from}\n` +
          `  resolved to:   ${path.relative(process.cwd(), absPath)}\n` +
          `  → The file does not exist. Create it, fix the import path, or remove the import.\n`;
        this.error(msg);
      }
      return null;
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [importGuardPlugin()],
  },
});
