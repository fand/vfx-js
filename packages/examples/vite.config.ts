import { globSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// works/<name>.html と works/<name>/index.html の両形式をサポート
const workEntries = Object.fromEntries(
    [
        ...globSync("works/*.html", { cwd: __dirname }),
        ...globSync("works/*/index.html", { cwd: __dirname }),
    ].map((file) => {
        const name = file
            .replace(/^works\//, "")
            .replace(/\/index\.html$/, "")
            .replace(/\.html$/, "");
        return [name, resolve(__dirname, file)];
    }),
);

export default defineConfig({
    base: "./",
    plugins: [react()],
    server: {
        port: 3002,
        host: true,
        allowedHosts: [".ts.net"],
    },
    build: {
        outDir: "docs-build",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: resolve(__dirname, "index.html"),
                ...workEntries,
            },
        },
    },
});
