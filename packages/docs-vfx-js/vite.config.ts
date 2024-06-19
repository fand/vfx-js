import { defineConfig } from "vite";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";

// https://vitejs.dev/config/
export default defineConfig(() => ({
    server: {
        port: 3001,
    },
    base: "",
    plugins: [viteCommonjs()],
}));
