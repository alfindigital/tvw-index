// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
      const cleanSource = source.split("?")[0] ?? source;
      // Skip CSS / asset imports — let Vite handle them
      if (
        /\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp3|mp4|webm)$/i.test(
          cleanSource,
        )
      ) {
        return null;
      }

      let absPath: string;
      if (cleanSource.startsWith("@/")) {
        absPath = path.join(SRC_DIR, cleanSource.slice(2));
      } else if (importer) {
        const importerPath = importer.split("?")[0] ?? importer;
        absPath = path.resolve(path.dirname(importerPath), cleanSource);
      } else {
        return null;
      }

      const resolved = tryResolve(absPath);
      if (!resolved) {
        const importerPath = importer ? (importer.split("?")[0] ?? importer) : null;
        const from = importerPath ? path.relative(process.cwd(), importerPath) : "<unknown>";
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

function startupImportScanPlugin(): Plugin {
  // Matches static & dynamic imports + re-exports
  const IMPORT_RE =
    /(?:import\s+(?:[^"'`;]+?\s+from\s+)?|export\s+(?:\*|\{[^}]*\})\s+from\s+|import\s*\(\s*)["'`]([^"'`]+)["'`]/g;
  const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", ".lovable", ".github"]);
  const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
  const ASSET_RE =
    /\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp3|mp4|webm)$/i;

  function walk(dir: string, out: string[] = []): string[] {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return out;
    }
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, out);
      else if (CODE_EXT.has(path.extname(e.name))) out.push(full);
    }
    return out;
  }

  return {
    name: "lovable-startup-import-scan",
    apply: "serve",
    configureServer(server) {
      const issues: Array<{ from: string; spec: string; resolved: string }> = [];
      const files = walk(SRC_DIR);

      for (const file of files) {
        let src: string;
        try {
          src = readFileSync(file, "utf8");
        } catch {
          continue;
        }
        IMPORT_RE.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = IMPORT_RE.exec(src)) !== null) {
          const spec = m[1];
          if (!spec) continue;
          if (!spec.startsWith("@/") && !spec.startsWith("./") && !spec.startsWith("../")) continue;
          const clean = spec.split("?")[0] ?? spec;
          if (ASSET_RE.test(clean)) continue;

          const absPath = clean.startsWith("@/")
            ? path.join(SRC_DIR, clean.slice(2))
            : path.resolve(path.dirname(file), clean);

          if (!tryResolve(absPath)) {
            issues.push({
              from: path.relative(process.cwd(), file),
              spec,
              resolved: path.relative(process.cwd(), absPath),
            });
          }
        }
      }

      if (issues.length > 0) {
        const logger = server.config.logger;
        const lines: string[] = [
          "",
          `❌ [startup-scan] Found ${issues.length} broken import${issues.length === 1 ? "" : "s"}:`,
          "",
        ];
        // Group by importer for readability
        const byFile = new Map<string, typeof issues>();
        for (const i of issues) {
          const arr = byFile.get(i.from) ?? [];
          arr.push(i);
          byFile.set(i.from, arr);
        }
        for (const [from, list] of byFile) {
          lines.push(`  ${from}`);
          for (const i of list) {
            lines.push(`    ✗ "${i.spec}"  →  missing file: ${i.resolved}`);
          }
        }
        lines.push("");
        lines.push(`  → Create the missing file(s), fix the import path, or remove the import.`);
        lines.push("");
        logger.error(lines.join("\n"));
      } else {
        server.config.logger.info("✓ [startup-scan] All local imports resolved.");
      }
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [importGuardPlugin(), startupImportScanPlugin()],
  },
});
