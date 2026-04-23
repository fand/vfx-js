import type { Meta, StoryObj } from "@storybook/html-vite";

import Jellyfish from "./assets/jellyfish.webp";
import Logo from "./assets/logo-640w-20p.svg";
import { createBloomEffect } from "./effects/bloom";
import { createPixelateEffect } from "./effects/pixelate";
import { createRgbMixEffect } from "./effects/rgb-mix";
import { createScanlineEffect } from "./effects/scanline";
import "./preset.css";
import { initVFX } from "./utils";

export default {
    title: "Effect",
    parameters: { layout: "fullscreen" },
} satisfies Meta<undefined>;

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
            intensity: 0.3,
            scatter: 0.7,
            pad: "fullscreen",
            dither: 1.0,
        }),
    });
};

export const crtBloom: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Jellyfish;
        return img;
    },
    args: undefined,
};
crtBloom.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX();
    await vfx.add(img, {
        effect: [
            createPixelateEffect({ size: 5 }),
            createScanlineEffect({ spacing: 5 }),
            // createRgbMixEffect({ gains: [0.5, 1, 1] }),
            createBloomEffect({
                threshold: 0.01,
                softness: 0.2,
                intensity: 2.0,
                scatter: 1.0,
                dither: 0.0,
                pad: "fullscreen",
            }),
        ],
    });
};
