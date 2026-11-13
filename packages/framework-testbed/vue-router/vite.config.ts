import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [vue()],
    server: { port: 5006 },
    preview: { port: 5006 },
});
