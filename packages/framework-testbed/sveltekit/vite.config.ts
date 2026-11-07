import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [sveltekit({ adapter: adapter() })],
    server: { port: 5004 },
    preview: { port: 5004 },
});
