import type { Meta, StoryObj } from "@storybook/html-vite";
import { initVFX } from "./utils";

export default {
    title: "Html In Canvas",
    parameters: {
        layout: "fullscreen",
        // html-in-canvas requires chrome://flags/#canvas-draw-element
        chromatic: { disableSnapshot: true },
    },
} satisfies Meta;

export const AddHTML: StoryObj = {
    render: () => {
        const container = document.createElement("div");
        container.style.padding = "32px";
        container.style.fontFamily = "sans-serif";

        const el = document.createElement("div");
        el.innerHTML = `
            <h2>html-in-canvas: addHTML</h2>
            <p style="font-size:1.2rem; line-height:1.6; max-width:600px">
                This element is captured via <code>drawElementImage</code>
                and rendered with a shader effect.
                Resize the window to see responsive re-capture.
            </p>
        `;
        container.appendChild(el);

        const vfx = initVFX();
        vfx.addHTML(el, { shader: "rainbow" });

        return container;
    },
};

export const AddHTMLWithImage: StoryObj = {
    render: () => {
        const container = document.createElement("div");
        container.style.padding = "32px";
        container.style.fontFamily = "sans-serif";

        const el = document.createElement("div");
        el.innerHTML = `
            <h2>html-in-canvas: with image</h2>
            <img src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#4488ff"/><text x="100" y="110" text-anchor="middle" fill="white" font-size="24">SVG</text></svg>')}"
                 style="display:block; width:200px; border-radius:8px; margin-top:16px" />
        `;
        container.appendChild(el);

        const vfx = initVFX();
        vfx.addHTML(el, { shader: "rgbShift" });

        return container;
    },
};

export const Fallback: StoryObj = {
    render: () => {
        const container = document.createElement("div");
        container.style.padding = "32px";
        container.style.fontFamily = "sans-serif";

        const el = document.createElement("div");
        el.innerHTML = `
            <h2>html-in-canvas: fallback</h2>
            <p style="font-size:1.2rem; line-height:1.6; max-width:600px">
                When html-in-canvas is not supported, <code>addHTML</code>
                falls back to <code>add</code> (dom-to-canvas).
                This story works in any browser.
            </p>
        `;
        container.appendChild(el);

        const vfx = initVFX();
        // Always use dom-to-canvas fallback for this story
        vfx.add(el, { shader: "rainbow" });

        return container;
    },
};
