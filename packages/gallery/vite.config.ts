import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
                crt: resolve(__dirname, "works/crt.html"),
            },
        },
    },
});
