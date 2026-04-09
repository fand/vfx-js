import type { Meta, StoryObj } from "@storybook/html-vite";
import { initVFX } from "./utils";
import "./preset.css";

export default {
    title: "Scroll Overflow (Bug #137)",
} satisfies Meta;

/**
 * Reproduction for https://github.com/fand/vfx-js/issues/137
 * The canvas should NOT cause extra scrollbars when the page content
 * fits within the viewport.
 */
export const NoContentOverflow: StoryObj = {
    render: () => {
        const container = document.createElement("div");
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.alignItems = "center";
        container.style.justifyContent = "center";

        const text = document.createElement("p");
        text.textContent =
            "This page should NOT have scrollbars. If you see scrollbars, the bug is present.";
        text.style.fontSize = "24px";
        text.style.padding = "20px";
        container.appendChild(text);

        const img = document.createElement("div");
        img.textContent = "VFX Element";
        img.style.width = "200px";
        img.style.height = "200px";
        img.style.background = "#4488ff";
        img.style.display = "flex";
        img.style.alignItems = "center";
        img.style.justifyContent = "center";
        img.style.color = "white";
        img.style.fontSize = "18px";
        container.appendChild(img);

        const vfx = initVFX({ pixelRatio: 1 });
        vfx.add(img, {
            shader: "rgbShift",
            overlay: true,
        });

        return container;
    },
};
