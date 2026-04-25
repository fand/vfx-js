import type { Meta, StoryObj } from "@storybook/html-vite";

import Jellyfish from "./assets/jellyfish.webp";
import Logo from "./assets/logo-640w-20p.svg";
import { BloomEffect } from "./effects/bloom";
import { createPixelateEffect } from "./effects/pixelate";
import { createRgbMixEffect } from "./effects/rgb-mix";
import { createScanlineEffect } from "./effects/scanline";
import "./preset.css";
import { attachBloomPane, initVFX } from "./utils";

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
    const effect = new BloomEffect({
        threshold: 0.2,
        softness: 0.1,
        intensity: 5,
        scatter: 1,
        dither: 0,
        edgeFade: 0,
        pad: 50,
    });
    await vfx.add(img, { effect });
    attachBloomPane("Bloom", effect);
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
    const bloom = new BloomEffect({
        threshold: 0.01,
        softness: 0.2,
        intensity: 2.0,
        scatter: 1.0,
        dither: 0.0,
        edgeFade: 0.02,
        pad: 200,
    });
    await vfx.add(img, {
        effect: [
            createPixelateEffect({ size: 10 }),
            createScanlineEffect({ spacing: 5 }),
            bloom,
        ],
    });
    attachBloomPane("CRT Bloom", bloom);
};

// Keep `createRgbMixEffect` reachable from the module even when the
// preset above doesn't include it — we toggle it in crtBloom via
// dev-time edits.
void createRgbMixEffect;
