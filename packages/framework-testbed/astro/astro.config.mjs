import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
    integrations: [react()],
    server: { port: 5002 },
});
