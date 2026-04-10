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

        // Remove wrapper appended to body by wrapper stories
        // biome-ignore lint/suspicious/noExplicitAny: cleanup global wrapper
        (window as any).vfxWrapper?.remove();
        // biome-ignore lint/suspicious/noExplicitAny: cleanup global wrapper
        (window as any).vfxWrapper = null;

        return story();
    },
];
