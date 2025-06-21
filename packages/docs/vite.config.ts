import { resolve } from "node:path";
import { defineConfig } from "vite";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    server: {
        port: 3001,
    },
    base: "",
    plugins: [viteCommonjs()],
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, "index.html"),
                docs: resolve(__dirname, "typedoc/index.html"),
                storybook: resolve(__dirname, "storybook/index.html"),
            },
        },
    },

    // During development, resolve @vfx-js/core to source files for hot reloading
    resolve: mode === "development" ? {
        alias: {
            "@vfx-js/core": resolve(__dirname, "../vfx-js/src/index.ts"),
        },
    } : undefined,

    define: { "process.env": {} },
}));
