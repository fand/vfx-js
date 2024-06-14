import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";

// https://vitejs.dev/config/
export default defineConfig(() => ({
    base: "",
    plugins: [react(), viteCommonjs()],

    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                vfx: resolve(__dirname, "vfx/index.html"),
            },
        },
    },
}));
