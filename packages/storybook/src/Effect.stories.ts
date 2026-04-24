import type { Meta, StoryObj } from "@storybook/html-vite";

import Jellyfish from "./assets/jellyfish.webp";
import Logo from "./assets/logo-640w-20p.svg";
import { createBloomEffect } from "./effects/bloom";
import { createPixelateEffect } from "./effects/pixelate";
import { createRgbMixEffect } from "./effects/rgb-mix";
import { createScanlineEffect } from "./effects/scanline";
import "./preset.css";
import { type BloomTweakOpts, attachBloomPane, initVFX } from "./utils";

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
    const bloomOpts: BloomTweakOpts = {
        threshold: 0.2,
        softness: 0.1,
        intensity: 5,
        scatter: 1,
        dither: 0,
        edgeFade: 0,
        pad: 50,
    };
    await vfx.add(img, { effect: createBloomEffect(bloomOpts) });
    attachBloomPane("Bloom", bloomOpts, async () => {
        vfx.remove(img);
        await vfx.add(img, { effect: createBloomEffect(bloomOpts) });
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
    const bloomOpts: BloomTweakOpts = {
        threshold: 0.01,
        softness: 0.2,
        intensity: 2.0,
        scatter: 1.0,
        dither: 0.0,
        edgeFade: 0.02,
        pad: 200,
    };
    const buildEffects = () => [
        createPixelateEffect({ size: 5 }),
        createScanlineEffect({ spacing: 5 }),
        createBloomEffect(bloomOpts),
    ];
    await vfx.add(img, { effect: buildEffects() });
    attachBloomPane("CRT Bloom", bloomOpts, async () => {
        vfx.remove(img);
        await vfx.add(img, { effect: buildEffects() });
    });
};

// Keep `createRgbMixEffect` reachable from the module even when the
// preset above doesn't include it — we toggle it in crtBloom via
// dev-time edits.
void createRgbMixEffect;
