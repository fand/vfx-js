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
            intensity: 1.3,
            iterations: 8,
            pad: 80,
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
            createPixelateEffect({ size: 10 }),
            createScanlineEffect({ spacing: 5 }),
            createRgbMixEffect({ gains: [0, 2, 2] }),
            createBloomEffect({
                threshold: 0.2,
                softness: 0.4,
                intensity: 5.0,
                iterations: 300,
                pad: 160,
            }),
        ],
    });
};
