import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/html-vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

function getAbsolutePath(value: string): string {
    return dirname(require.resolve(join(value, "package.json")));
}
const config: StorybookConfig = {
    stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
    addons: [
        getAbsolutePath("@chromatic-com/storybook"),
        getAbsolutePath("@storybook/addon-docs"),
    ],
    framework: {
        name: getAbsolutePath("@storybook/html-vite"),
        options: {},
    },
    viteFinal: async (config) => ({
        ...config,
        define: {
            "process.env": {},
            // Vue's esm-bundler build warns without these.
            __VUE_OPTIONS_API__: "true",
            __VUE_PROD_DEVTOOLS__: "false",
            __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
        },
        plugins: [...(config.plugins ?? []), svelte()],
        resolve: {
            ...config.resolve,
            alias: {
                ...config.resolve?.alias,
                // During development, resolve to source files for hot reloading
                "@vfx-js/core": join(__dirname, "../../vfx-js/src/index.ts"),
                "@vfx-js/react": join(__dirname, "../../react/src/react.ts"),
                // Subpaths first, so the package alias does not swallow them.
                "@vfx-js/vue/nuxt": join(
                    __dirname,
                    "../../vue/src/nuxt/index.ts",
                ),
                "@vfx-js/vue": join(__dirname, "../../vue/src/index.ts"),
                "@vfx-js/svelte/sveltekit": join(
                    __dirname,
                    "../../svelte/src/lib/sveltekit/index.ts",
                ),
                "@vfx-js/svelte": join(
                    __dirname,
                    "../../svelte/src/lib/index.ts",
                ),
                // SvelteKit is not here; stories drive navigations by hand.
                "$app/navigation": join(
                    __dirname,
                    "../src/stories/svelte/story-navigation.ts",
                ),
            },
        },
    }),
};
export default config;
