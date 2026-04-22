import type { Meta, StoryObj } from "@storybook/html-vite";

import Logo from "./assets/logo-640w-20p.svg";
import { createTrailEffect } from "./effects/trail";
import "./preset.css";
import { initVFX } from "./utils";

export default {
    title: "Effect",
    parameters: { layout: "fullscreen" },
} satisfies Meta<undefined>;

/**
 * Single effect: a stateful trail that accumulates the element's pixels
 * into a persistent render target and blits the result to the output.
 */
export const trail: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Logo;
        img.style.display = "block";
        img.style.margin = "40px auto";
        return img;
    },
    args: undefined,
};
trail.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX();
    // Factory call: fresh Effect instance per element.
    await vfx.add(img, {
        effect: createTrailEffect({ decay: 0.94 }),
        overflow: 80,
    });
};

/**
 * Pipeline: pass an array of effects. With one render-having effect in
 * the chain this is equivalent to the single form, but confirms the
 * array acceptance path.
 */
export const trailAsArray: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Logo;
        img.style.display = "block";
        img.style.margin = "40px auto";
        return img;
    },
    args: undefined,
};
trailAsArray.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX();
    await vfx.add(img, {
        effect: [createTrailEffect({ decay: 0.9 })],
        overflow: 60,
    });
};
