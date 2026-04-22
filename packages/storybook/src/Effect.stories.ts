import type { Meta, StoryObj } from "@storybook/html-vite";

import Jellyfish from "./assets/jellyfish.webp";
import Logo from "./assets/logo-640w-20p.svg";
import { createBloomEffect } from "./effects/bloom";
import { createPosterizeEffect } from "./effects/posterize";
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
 * Chain: posterize → bloom. Exercises EffectChain with M=2 (one
 * intermediate RT allocated between the two rendering effects) and
 * verifies that src/output swap correctly. Still deterministic for
 * VRT.
 */
export const posterizeAndBloom: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Jellyfish;
        img.style.display = "block";
        img.style.margin = "40px auto";
        img.style.width = "480px";
        return img;
    },
    args: undefined,
};
posterizeAndBloom.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX();
    await vfx.add(img, {
        effect: [
            createPosterizeEffect({ levels: 4 }),
            createBloomEffect({
                threshold: 0.5,
                softness: 0.05,
                intensity: 2.5,
                radius: 3,
                iterations: 6,
            }),
        ],
        overflow: 120,
    });
};
