import type { Meta, StoryObj } from "@storybook/html-vite";

import { HatchingEffect } from "@vfx-js/effects";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";
import { initVFX } from "./utils";

// Pen-and-ink hatching fills the source silhouette (its alpha channel)
// with jittered parallel strokes. Follows the Voronoi story pattern:
// render() does the full setup on every args change. initVFX() tears
// down the previous VFX first, so the swap stays clean.

export default {
    title: "Effect/Hatching",
    parameters: { layout: "fullscreen" },
} satisfies Meta<HatchingArgs>;

type HatchingSrc = "Text" | "Logo";
type HatchingArgs = {
    src: HatchingSrc;
    text: string;
    color: string;
    angle: number; // degrees (UI) -> radians (shader)
    spacing: number;
    lineWidth: number;
    angleJitter: number; // degrees (UI) -> radians (shader)
    offsetJitter: number;
    spacingJitter: number;
    seed: number;
    speed: number;
    roundCap: boolean;
    soft: number;
};

const hexToRgb = (hex: string): [number, number, number] => {
    const n = Number.parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// Draw text into a canvas whose alpha channel becomes the hatching
// region mask. The effect ignores src colour, so white-on-transparent
// is all we need.
function createTextCanvas(text: string): HTMLCanvasElement {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    const w = 600;
    const h = 300;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.style.display = "block";
    canvas.style.margin = "40px auto";

    const g = canvas.getContext("2d");
    if (g) {
        g.scale(dpr, dpr);
        g.fillStyle = "#fff";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = "900 200px system-ui, sans-serif";
        g.fillText(text || " ", w / 2, h / 2 + 8);
    }
    return canvas;
}

export const hatching: StoryObj<HatchingArgs> = {
    render: (args) => {
        const { src, text, color, angle, angleJitter, ...rest } = args;
        const vfx = initVFX();
        const effect = new HatchingEffect({
            color: hexToRgb(color),
            angle: (angle * Math.PI) / 180,
            angleJitter: (angleJitter * Math.PI) / 180,
            ...rest,
        });

        if (src === "Logo") {
            const img = document.createElement("img");
            img.src = Logo;
            img.style.display = "block";
            img.style.margin = "40px auto";
            vfx.add(img, { effect });
            return img;
        }

        const canvas = createTextCanvas(text);
        vfx.add(canvas, { effect });
        return canvas;
    },
    args: {
        src: "Text",
        text: "yo",
        color: "#e8e4d8",
        angle: 45,
        spacing: 12,
        lineWidth: 2.5,
        angleJitter: 14,
        offsetJitter: 4,
        spacingJitter: 0,
        seed: 0,
        speed: 0,
        roundCap: true,
        soft: 0,
    },
    argTypes: {
        src: { control: { type: "select" }, options: ["Text", "Logo"] },
        text: { control: { type: "text" } },
        color: { control: { type: "color" } },
        angle: { control: { type: "range", min: 0, max: 180, step: 1 } },
        spacing: { control: { type: "range", min: 4, max: 40, step: 1 } },
        lineWidth: { control: { type: "range", min: 0.5, max: 10, step: 0.5 } },
        angleJitter: { control: { type: "range", min: 0, max: 45, step: 1 } },
        offsetJitter: { control: { type: "range", min: 0, max: 16, step: 0.5 } },
        spacingJitter: {
            control: { type: "range", min: 0, max: 16, step: 0.5 },
        },
        seed: { control: { type: "range", min: 0, max: 100, step: 1 } },
        speed: { control: { type: "range", min: 0, max: 60, step: 1 } },
        roundCap: { control: { type: "boolean" } },
        soft: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    },
};
