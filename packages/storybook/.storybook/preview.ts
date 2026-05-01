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
        const w = window as any;
        w.vfx?.destroy();
        w.timer?.dispose();
        // biome-ignore lint/suspicious/noExplicitAny: tweakpane Pane
        for (const p of (w.__vfxPanes ?? []) as any[]) {
            p.dispose?.();
        }
        w.__vfxPanes = [];
        for (const el of document.querySelectorAll(".vfx-tweakpane-container")) {
            el.remove();
        }

        // Reset storybook-root styles (may be modified by wrapper stories)
        const root = document.getElementById("storybook-root");
        if (root) {
            root.style.height = "";
            root.style.display = "";
        }

        return story();
    },
];
