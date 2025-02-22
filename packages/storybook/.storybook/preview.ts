import type { Preview } from "@storybook/html";

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
};

export default preview;

export const decorators = [
    (story) => {
        (window as any).vfx?.destroy();
        (window as any).timer?.dispose();

        return story();
    },
];
