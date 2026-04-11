import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fg from "fast-glob";
import { defineConfig } from "vite";
import { galleryIndex } from "./src/plugin/gallery-index";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Collect every HTML file under `pages/**` (plus the root `index.html`) and
 * expose them to Rollup as multi-page inputs. Adding/removing a page is a
 * file-system operation only — no central registry to update.
 */
function pageInputs(): Record<string, string> {
    const entries: Record<string, string> = {
        index: resolve(__dirname, "index.html"),
    };
    const files = fg.sync("pages/**/*.html", { cwd: __dirname }).sort();
    for (const rel of files) {
        const key = rel.replace(/\.html$/, "").replace(/[\/\\]/g, "_");
        entries[key] = resolve(__dirname, rel);
    }
    return entries;
}

export default defineConfig(({ mode }) => ({
    base: "",
    server: {
        port: 3002,
        host: true,
        allowedHosts: [".ts.net"],
    },
    preview: {
        port: 3002,
        host: true,
    },
    plugins: [galleryIndex()],
    build: {
        outDir: "docs-build",
        emptyOutDir: true,
        // Needed so that pages can use top-level `await` inside their
        // inline module scripts (e.g. `await vfx.add(...)`).
        target: "es2022",
        rollupOptions: {
            input: pageInputs(),
        },
    },
    // During development, resolve @vfx-js/core to source files for hot reloading
    resolve:
        mode === "development"
            ? {
                  alias: {
                      "@vfx-js/core": resolve(
                          __dirname,
                          "../vfx-js/src/index.ts",
                      ),
                  },
              }
            : undefined,
    define: { "process.env": {} },
}));
