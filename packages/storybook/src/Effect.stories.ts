import type { Meta, StoryObj } from "@storybook/html-vite";

import Jellyfish from "./assets/jellyfish.webp";
import Logo from "./assets/logo-640w-20p.svg";
import { BloomEffect } from "./effects/bloom";
import { FluidEffect } from "./effects/fluid";
import { createPixelateEffect } from "./effects/pixelate";
import { createScanlineEffect } from "./effects/scanline";
import "./preset.css";
import { attachBloomPane, attachFluidPane, initVFX } from "./utils";

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
        intensity: 10.0,
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

// Stable Fluid as a single Effect. Drives mouse splats off real pointer
// events; the play() call seeds a circular sweep so the story renders a
// non-empty frame on first capture.
export const fluid: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Jellyfish;
        return img;
    },
    args: undefined,
};
fluid.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX();
    const effect = new FluidEffect();
    await vfx.add(img, { effect });
    attachFluidPane("Fluid", effect);

    seedFluidMotion(canvasElement);
};

// Fluid → Bloom chain. Demonstrates the new effect API's composability:
// the same FluidEffect plugs into a multi-stage chain unchanged.
export const fluidWithBloom: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Jellyfish;
        return img;
    },
    args: undefined,
};
fluidWithBloom.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX();
    const fluid = new FluidEffect({ showDye: true });
    const bloom = new BloomEffect({
        threshold: 0.4,
        softness: 0.3,
        intensity: 3.0,
        scatter: 0.8,
        edgeFade: 0.02,
        pad: 80,
    });
    await vfx.add(img, { effect: [fluid, bloom] });
    attachFluidPane("Fluid", fluid);
    attachBloomPane("Bloom", bloom);

    seedFluidMotion(canvasElement);
};

// Synthetic pointer sweep: fires a circle of pointermoves so the fluid
// has visible velocity/dye even before the user interacts.
function seedFluidMotion(canvasElement: HTMLElement): void {
    const cx = Math.round(window.innerWidth / 2);
    const cy = Math.round(window.innerHeight / 2);
    const radius = Math.min(cx, cy) * 0.4;
    let i = 0;
    const id = window.setInterval(() => {
        const angle = (i / 60) * Math.PI * 2;
        canvasElement.dispatchEvent(
            new MouseEvent("pointermove", {
                clientX: cx + Math.cos(angle) * radius,
                clientY: cy + Math.sin(angle) * radius,
                bubbles: true,
            }),
        );
        i++;
        if (i > 120) {
            clearInterval(id);
        }
    }, 16);
}
