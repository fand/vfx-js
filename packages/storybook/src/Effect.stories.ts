import type { Meta, StoryObj } from "@storybook/html-vite";

import Logo from "./assets/logo-640w-20p.svg";
import { createBloomEffect } from "./effects/bloom";
import "./preset.css";
import { initVFX } from "./utils";

export default {
    title: "Effect",
    parameters: { layout: "fullscreen" },
} satisfies Meta<undefined>;

/**
 * Single effect: bloom. Deterministic (no frame-to-frame feedback),
 * making it VRT-friendly — static input ⇒ static output.
 */
export const bloom: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Logo;
        img.style.display = "block";
        img.style.margin = "40px auto";
        return img;
    },
    args: undefined,
};
bloom.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX();
    await vfx.add(img, {
        effect: createBloomEffect({
            threshold: 0.6,
            intensity: 1.3,
            radius: 2,
            iterations: 4,
        }),
        overflow: 80,
    });
};

/**
 * Array form confirms the chain accepts `readonly Effect[]` — a
 * length-1 array behaves identically to the single form.
 */
export const bloomAsArray: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Logo;
        img.style.display = "block";
        img.style.margin = "40px auto";
        return img;
    },
    args: undefined,
};
bloomAsArray.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX();
    await vfx.add(img, {
        effect: [
            createBloomEffect({
                threshold: 0.6,
                intensity: 1.3,
                radius: 2,
                iterations: 4,
            }),
        ],
        overflow: 80,
    });
};
