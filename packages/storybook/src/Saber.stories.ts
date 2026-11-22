import type { Meta, StoryObj } from "@storybook/html-vite";
import { SaberEffect, type SaberParams } from "@vfx-js/effects";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";
import { attachSaberPane, initVFX } from "./utils";

type Args = {
    /** VFX pixel ratio. 0 uses the device pixel ratio. */
    pixelRatio: number;
    background: "dark" | "light";
} & Pick<
    SaberParams,
    | "amplitude"
    | "scale"
    | "sharpness"
    | "speed"
    | "color"
    | "glow"
    | "glowFalloff"
    | "source"
    | "pad"
>;

const DEFAULTS = new SaberEffect().params;

export default {
    title: "Effect/Saber",
    parameters: { layout: "fullscreen" },
    args: {
        pixelRatio: 0,
        background: "dark",
        amplitude: DEFAULTS.amplitude,
        scale: DEFAULTS.scale,
        sharpness: DEFAULTS.sharpness,
        speed: DEFAULTS.speed,
        color: DEFAULTS.color,
        glow: DEFAULTS.glow,
        glowFalloff: DEFAULTS.glowFalloff,
        source: DEFAULTS.source,
        pad: DEFAULTS.pad,
    },
    argTypes: {
        pixelRatio: { control: { type: "select" }, options: [0, 1, 2] },
        amplitude: { control: { type: "range", min: 0, max: 60, step: 0.5 } },
        scale: { control: { type: "range", min: 5, max: 300, step: 1 } },
        sharpness: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
        speed: { control: { type: "range", min: 0, max: 5, step: 0.01 } },
        background: { control: { type: "radio" }, options: ["dark", "light"] },
        color: { control: { type: "color" } },
        glow: { control: { type: "range", min: 0, max: 5, step: 0.01 } },
        glowFalloff: {
            control: { type: "range", min: 0, max: 1, step: 0.01 },
        },
        source: { control: { type: "boolean" } },
        pad: { control: { type: "range", min: 0, max: 400, step: 1 } },
    },
} satisfies Meta<Args>;

async function mount(el: HTMLElement, args: Args): Promise<void> {
    const vfx = initVFX(
        args.pixelRatio > 0 ? { pixelRatio: args.pixelRatio } : undefined,
    );
    const light = args.background === "light";
    document.documentElement.style.background = light ? "#f4f1ea" : "";
    document.body.style.background = light ? "#f4f1ea" : "";
    const { pixelRatio, background, ...params } = args;
    const effect = new SaberEffect(params);
    await vfx.add(el, { effect });
    attachSaberPane("Saber", effect);
}

export const logo: StoryObj<Args> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Logo;
        img.style.width = "min(70vw, 800px)";
        return img;
    },
    play: async ({ canvasElement, args }) => {
        const img = canvasElement.querySelector("img") as HTMLImageElement;
        if (!img.complete) {
            await new Promise((o) => {
                img.onload = o;
            });
        }
        await mount(img, args);
    },
};

export const text: StoryObj<Args> = {
    render: (args) => {
        const h1 = document.createElement("h1");
        h1.textContent = "Saber";
        const color = args.background === "light" ? "#222" : "white";
        h1.style.cssText = `margin: 0; color: ${color}; font: 900 clamp(72px, 16vw, 200px)/1 system-ui, 'Helvetica Neue', Arial, sans-serif`;
        return h1;
    },
    play: async ({ canvasElement, args }) => {
        const h1 = canvasElement.querySelector("h1") as HTMLElement;
        await document.fonts?.ready;
        await mount(h1, args);
    },
};
