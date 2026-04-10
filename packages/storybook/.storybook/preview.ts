import type { Preview } from "@storybook/html-vite";

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        viewport: {
            viewports: {
                small: {
                    name: "small",
                    styles: {
                        width: "600px",
                        height: "600px",
                    },
                },
            },
        },
    },
};

export default preview;

export const decorators = [
    (story) => {
        // biome-ignore lint/suspicious/noExplicitAny: use global VFX
        (window as any).vfx?.destroy();
        // biome-ignore lint/suspicious/noExplicitAny: use global Timer
        (window as any).timer?.dispose();

        // Reset storybook-root styles (may be modified by wrapper stories)
        const root = document.getElementById("storybook-root");
        if (root) {
            root.style.height = "";
            root.style.display = "";
        }

        return story();
    },
];
