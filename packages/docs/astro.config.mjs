import { fileURLToPath } from "node:url";
import mdx from "@astrojs/mdx";
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

export default defineConfig({
    output: "static",
    outDir: "dist",
    base: "/vfx-js",
    trailingSlash: "always",
    // Compression drops the line break between text and an inline tag on the next line.
    compressHTML: false,
    integrations: [mdx(), coreSource],
    server: { port: 3001, host: true },
    vite: {
        server: { allowedHosts: [".ts.net"] },
    },
});
