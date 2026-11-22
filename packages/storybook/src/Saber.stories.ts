import type { Meta, StoryObj } from "@storybook/html-vite";
import { SaberEffect, type SaberParams } from "@vfx-js/effects";
import JellyfishMp4 from "./assets/jellyfish.mp4";
import Jellyfish from "./assets/jellyfish.webp";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";
import { attachSaberPane, initVFX } from "./utils";

type Args = {
    /** VFX pixel ratio. 0 uses the device pixel ratio. */
    pixelRatio: number;
    background: "dark" | "light";
    /** Font size of the text stories in CSS px. 0 scales with the viewport. */
    fontSize: number;
} & Pick<
    SaberParams,
    | "amplitude"
    | "scale"
    | "sharpness"
    | "speed"
    | "thickness"
    | "lines"
    | "burst"
    | "flicker"
    | "color"
    | "glow"
    | "glowFalloff"
    | "source"
    | "pad"
    | "edge"
    | "edgeThreshold"
    | "dynamic"
>;

const DEFAULTS = new SaberEffect().params;

export default {
    title: "Effect/Saber",
    parameters: { layout: "fullscreen" },
    args: {
        pixelRatio: 0,
        background: "dark",
        fontSize: 0,
        amplitude: DEFAULTS.amplitude,
        scale: DEFAULTS.scale,
        sharpness: DEFAULTS.sharpness,
        speed: DEFAULTS.speed,
        thickness: DEFAULTS.thickness,
        lines: DEFAULTS.lines,
        burst: DEFAULTS.burst,
        flicker: DEFAULTS.flicker,
        color: DEFAULTS.color,
        glow: DEFAULTS.glow,
        glowFalloff: DEFAULTS.glowFalloff,
        source: DEFAULTS.source,
        pad: DEFAULTS.pad,
        edge: DEFAULTS.edge,
        edgeThreshold: DEFAULTS.edgeThreshold,
        dynamic: DEFAULTS.dynamic,
    },
    argTypes: {
        pixelRatio: { control: { type: "select" }, options: [0, 1, 2] },
        amplitude: { control: { type: "range", min: 0, max: 60, step: 0.5 } },
        scale: { control: { type: "range", min: 5, max: 300, step: 1 } },
        sharpness: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
        speed: { control: { type: "range", min: 0, max: 5, step: 0.01 } },
        thickness: { control: { type: "range", min: 0.5, max: 8, step: 0.1 } },
        lines: { control: { type: "range", min: 1, max: 4, step: 1 } },
        burst: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
        flicker: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
        fontSize: { control: { type: "range", min: 0, max: 200, step: 1 } },
        background: { control: { type: "radio" }, options: ["dark", "light"] },
        color: { control: { type: "color" } },
        glow: { control: { type: "range", min: 0, max: 5, step: 0.01 } },
        glowFalloff: {
            control: { type: "range", min: 0, max: 1, step: 0.01 },
        },
        source: { control: { type: "boolean" } },
        pad: { control: { type: "range", min: 0, max: 400, step: 1 } },
        edge: { control: { type: "radio" }, options: ["alpha", "luminance"] },
        edgeThreshold: {
            control: { type: "range", min: 0, max: 1, step: 0.01 },
        },
        dynamic: { control: { type: "boolean" } },
    },
} satisfies Meta<Args>;

async function mount(el: HTMLElement, args: Args): Promise<void> {
    const vfx = initVFX(
        args.pixelRatio > 0 ? { pixelRatio: args.pixelRatio } : undefined,
    );
    const light = args.background === "light";
    document.documentElement.style.background = light ? "#f4f1ea" : "";
    document.body.style.background = light ? "#f4f1ea" : "";
    const { pixelRatio, background, fontSize, ...params } = args;
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

function renderText(text: string, args: Args): HTMLElement {
    const h1 = document.createElement("h1");
    h1.textContent = text;
    const color = args.background === "light" ? "#222" : "white";
    const size =
        args.fontSize > 0 ? `${args.fontSize}px` : "clamp(72px, 16vw, 200px)";
    h1.style.cssText = `margin: 0; color: ${color}; font: 900 ${size}/1 system-ui, 'Helvetica Neue', Arial, sans-serif`;
    return h1;
}

async function playText(canvasElement: HTMLElement, args: Args) {
    const h1 = canvasElement.querySelector("h1") as HTMLElement;
    await document.fonts?.ready;
    await mount(h1, args);
}

export const text: StoryObj<Args> = {
    render: (args) => renderText("Saber", args),
    play: ({ canvasElement, args }) => playText(canvasElement, args),
};

export const smallText: StoryObj<Args> = {
    args: { fontSize: 28 },
    render: (args) => renderText("Electric outline on small text", args),
    play: ({ canvasElement, args }) => playText(canvasElement, args),
};

const PHOTO_STYLE = "max-width: min(70vw, 900px); max-height: 70vh";

export const photo: StoryObj<Args> = {
    args: { edge: "luminance", edgeThreshold: 0.35 },
    render: () => {
        const img = document.createElement("img");
        img.src = Jellyfish;
        img.style.cssText = PHOTO_STYLE;
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

export const video: StoryObj<Args> = {
    args: { edge: "luminance", edgeThreshold: 0.35, dynamic: true },
    render: () => {
        const video = document.createElement("video");
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.autoplay = true;
        video.src = JellyfishMp4;
        video.style.cssText = PHOTO_STYLE;
        return video;
    },
    play: async ({ canvasElement, args }) => {
        const video = canvasElement.querySelector("video") as HTMLVideoElement;
        if (video.readyState < 2) {
            await new Promise((o) => {
                video.addEventListener("loadeddata", o, { once: true });
            });
        }
        await mount(video, args);
    },
};
