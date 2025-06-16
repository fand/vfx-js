import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
    server: {
        port: 3000,
    },
    base: "",
    plugins: [react()],

    // During development, resolve packages to source files for hot reloading
    resolve: mode === "development" ? {
        alias: {
            "@vfx-js/core": resolve(__dirname, "../vfx-js/src/index.ts"),
            "react-vfx": resolve(__dirname, "../react-vfx/src/index.ts"),
        },
    } : undefined,
}));
