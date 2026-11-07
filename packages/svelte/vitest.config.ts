import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [svelte()],
    // Use Svelte's client runtime, so `mount` works.
    resolve: { conditions: ["browser"] },
    test: {
        dir: "src",
        environment: "happy-dom",
        alias: {
            "$app/navigation": fileURLToPath(
                new URL("./src/test/app-navigation.ts", import.meta.url),
            ),
        },
    },
});
