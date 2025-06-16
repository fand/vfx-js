import type { StorybookConfig } from "@storybook/html-vite";

import { join, dirname } from "node:path";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
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
                // During development, resolve @vfx-js/core to source files for hot reloading
                "@vfx-js/core": join(__dirname, "../../vfx-js/src/index.ts"),
            },
        },
    }),
};
export default config;
