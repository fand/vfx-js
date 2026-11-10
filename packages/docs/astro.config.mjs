import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

// Use core source in dev for hot reload.
const coreSource = {
    name: "core-source",
    hooks: {
        "astro:config:setup": ({ command, updateConfig }) => {
            if (command !== "dev") {
                return;
            }
            updateConfig({
                vite: {
                    resolve: {
                        alias: {
                            "@vfx-js/core": fileURLToPath(
                                new URL(
                                    "../vfx-js/src/index.ts",
                                    import.meta.url,
                                ),
                            ),
                        },
                    },
                },
            });
        },
    },
};

// The build copies these folders into dist. Serve them in dev too.
const copiedDirs = { storybook: "storybook", examples: "examples" };
const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".woff2": "font/woff2",
};

const copiedDirsInDev = {
    name: "copied-dirs-in-dev",
    hooks: {
        "astro:server:setup": ({ server }) => {
            server.middlewares.use((req, res, next) => {
                const path = decodeURIComponent((req.url ?? "").split("?")[0]);
                // Vite may strip the base before this runs.
                const match = path.match(
                    /^(?:\/vfx-js)?\/(storybook|examples)(\/.*)?$/,
                );
                if (!match) {
                    return next();
                }
                const root = fileURLToPath(
                    new URL(copiedDirs[match[1]], import.meta.url),
                );
                let file = join(root, normalize(match[2] ?? "/"));
                if (!file.startsWith(root)) {
                    return next();
                }
                try {
                    if (statSync(file).isDirectory()) {
                        file = join(file, "index.html");
                    }
                    statSync(file);
                } catch {
                    return next();
                }
                res.setHeader(
                    "Content-Type",
                    mimeTypes[extname(file)] ?? "application/octet-stream",
                );
                createReadStream(file).pipe(res);
            });
        },
    },
};

export default defineConfig({
    site: "https://amagi.dev",
    output: "static",
    outDir: "dist",
    base: "/vfx-js",
    trailingSlash: "always",
    // Compression drops the line break between text and an inline tag on the next line.
    compressHTML: false,
    integrations: [mdx(), sitemap(), coreSource, copiedDirsInDev],
    server: { port: 3001, host: true },
    vite: {
        server: { allowedHosts: [".ts.net"] },
        // Inline module scripts run again on every page swap. Keep them as files, which run once.
        build: { assetsInlineLimit: 0 },
    },
});
