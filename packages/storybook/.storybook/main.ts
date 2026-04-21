import type { StorybookConfig } from "@storybook/html-vite";

import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

function getAbsolutePath(value: string): any {
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
        define: { "process.env": {} },
        resolve: {
            ...config.resolve,
            alias: {
                ...config.resolve?.alias,
                // During development, resolve to source files for hot reloading
                "@vfx-js/core": join(__dirname, "../../vfx-js/src/index.ts"),
                "react-vfx": join(__dirname, "../../react-vfx/src/react-vfx.ts"),
            },
        },
    }),
};
export default config;
