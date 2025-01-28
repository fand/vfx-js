import { resolve } from "node:path";
import { defineConfig } from "vite";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";

// https://vitejs.dev/config/
export default defineConfig(() => ({
    server: {
        port: 3001,
    },
    base: "",
    plugins: [viteCommonjs()],
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, "index.html"),
                docs: resolve(__dirname, "docs/index.html"),
                storybook: resolve(__dirname, "storybook/index.html"),
            },
        },
    },

    define: { "process.env": {} },
}));
