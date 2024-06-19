import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";

// https://vitejs.dev/config/
export default defineConfig(() => ({
    server: {
        port: 3001,
    },
    base: "",
    plugins: [react(), viteCommonjs()],
}));
