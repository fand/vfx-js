import type { Meta, StoryObj } from "@storybook/html-vite";
import {
    SABER_PRESETS,
    SaberEffect,
    type SaberParams,
    type SaberPresetName,
} from "@vfx-js/effects";
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
    | "thickness"
    | "coreIntensity"
    | "coreWhiteness"
    | "coreSoftness"
    | "coreBlendOnTop"
    | "haloIntensity"
    | "haloSize"
    | "flickerIntensity"
    | "flickerSpeed"
    | "flickerSeed"
    | "color"
    | "glow"
    | "source"
    | "pad"
    | "edge"
    | "edgeThreshold"
    | "dynamic"
    | "start"
    | "end"
    | "segments"
    | "fade"
    | "glowLayers"
    | "glowBias"
    | "glowSizeMultiplier"
    | "glowPreGamma"
    | "glowFlow"
    | "glowDistortAllLayers"
    | "coreDistortion"
    | "glowDistortion"
>;

const DEFAULTS = new SaberEffect().params;

export default {
    title: "Effect/Saber",
    parameters: { layout: "fullscreen" },
    args: {
        pixelRatio: 0,
        background: "dark",
        fontSize: 0,
        thickness: DEFAULTS.thickness,
        coreIntensity: DEFAULTS.coreIntensity,
        coreWhiteness: DEFAULTS.coreWhiteness,
        coreSoftness: DEFAULTS.coreSoftness,
        coreBlendOnTop: DEFAULTS.coreBlendOnTop,
        haloIntensity: DEFAULTS.haloIntensity,
        haloSize: DEFAULTS.haloSize,
        flickerIntensity: DEFAULTS.flickerIntensity,
        flickerSpeed: DEFAULTS.flickerSpeed,
        flickerSeed: DEFAULTS.flickerSeed,
        color: DEFAULTS.color,
        glow: DEFAULTS.glow,
        source: DEFAULTS.source,
        pad: DEFAULTS.pad,
        edge: DEFAULTS.edge,
        edgeThreshold: DEFAULTS.edgeThreshold,
        dynamic: DEFAULTS.dynamic,
        start: DEFAULTS.start,
        end: DEFAULTS.end,
        segments: DEFAULTS.segments,
        fade: DEFAULTS.fade,
        glowLayers: DEFAULTS.glowLayers,
        glowBias: DEFAULTS.glowBias,
        glowSizeMultiplier: DEFAULTS.glowSizeMultiplier,
        glowPreGamma: DEFAULTS.glowPreGamma,
        glowFlow: DEFAULTS.glowFlow,
        glowDistortAllLayers: DEFAULTS.glowDistortAllLayers,
        coreDistortion: DEFAULTS.coreDistortion,
        glowDistortion: DEFAULTS.glowDistortion,
    },
    argTypes: {
        pixelRatio: { control: { type: "select" }, options: [0, 1, 2] },
        thickness: { control: { type: "range", min: 0.1, max: 8, step: 0.05 } },
        coreIntensity: {
            control: { type: "range", min: 0, max: 10, step: 0.01 },
        },
        coreWhiteness: {
            control: { type: "range", min: 0, max: 1, step: 0.01 },
        },
        coreSoftness: {
            control: { type: "range", min: 0, max: 12, step: 0.05 },
        },
        flickerIntensity: {
            control: { type: "range", min: 0, max: 1, step: 0.01 },
        },
        flickerSpeed: {
            control: { type: "range", min: 0, max: 30, step: 0.1 },
        },
        flickerSeed: { control: { type: "number" } },
        fontSize: { control: { type: "range", min: 0, max: 200, step: 1 } },
        background: { control: { type: "radio" }, options: ["dark", "light"] },
        color: { control: { type: "color" } },
        glow: { control: { type: "range", min: 0, max: 5, step: 0.01 } },
        source: { control: { type: "boolean" } },
        pad: { control: { type: "range", min: 0, max: 400, step: 1 } },
        edge: { control: { type: "radio" }, options: ["alpha", "luminance"] },
        edgeThreshold: {
            control: { type: "range", min: 0, max: 1, step: 0.01 },
        },
        dynamic: { control: { type: "boolean" } },
        start: { control: { type: "range", min: 0, max: 1, step: 0.001 } },
        end: { control: { type: "range", min: 0, max: 1, step: 0.001 } },
        segments: { control: { type: "range", min: 1, max: 8, step: 1 } },
        fade: { control: { type: "range", min: 0, max: 300, step: 1 } },
        glowBias: { control: { type: "range", min: -2, max: 2, step: 0.01 } },
        glowSizeMultiplier: {
            control: { type: "range", min: 0, max: 4, step: 0.01 },
        },
        glowPreGamma: {
            control: { type: "range", min: 0.1, max: 3, step: 0.01 },
        },
        glowLayers: { control: "object" },
        coreDistortion: { control: "object" },
        glowDistortion: { control: "object" },
    },
} satisfies Meta<Args>;

async function mount(
    el: HTMLElement,
    args: Args,
    animate?: (effect: SaberEffect, time: number) => void,
): Promise<void> {
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
    if (animate) {
        // Follow the VFX clock, so the loop also holds when the clock is paused or set.
        // Stops once a newer story replaced this VFX.
        const tick = () => {
            if ((window as { vfx?: unknown }).vfx !== vfx) {
                return;
            }
            animate(effect, vfx.time);
            requestAnimationFrame(tick);
        };
        tick();
    }
}

const easeInOut = (x: number) => x * x * (3 - 2 * x);

// Draw the outline on, hold, wipe it out with a fading tail, pause, repeat.
function revealLoop(effect: SaberEffect, time: number): void {
    const t = time % 6;
    effect.params.end = easeInOut(Math.min(t / 2, 1));
    effect.params.start = easeInOut(Math.min(Math.max((t - 3.8) / 1.6, 0), 1));
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

export const reveal: StoryObj<Args> = {
    args: { source: false },
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
        await mount(img, args, revealLoop);
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

async function playText(
    canvasElement: HTMLElement,
    args: Args,
    animate?: (effect: SaberEffect, time: number) => void,
) {
    const h1 = canvasElement.querySelector("h1") as HTMLElement;
    await document.fonts?.ready;
    await mount(h1, args, animate);
}

export const text: StoryObj<Args> = {
    render: (args) => renderText("Saber", args),
    play: ({ canvasElement, args }) => playText(canvasElement, args),
};

export const revealText: StoryObj<Args> = {
    args: { source: false },
    render: (args) => renderText("Saber", args),
    play: ({ canvasElement, args }) =>
        playText(canvasElement, args, revealLoop),
};

export const smallText: StoryObj<Args> = {
    args: { fontSize: 28 },
    render: (args) => renderText("Electric outline on small text", args),
    play: ({ canvasElement, args }) => playText(canvasElement, args),
};

// Start from a steady outline to isolate each new control group.
const LAYERED_ARGS: Partial<Args> = {
    source: false,
    coreSoftness: 0,
    coreBlendOnTop: false,
    haloIntensity: 0,
    glowFlow: 0,
    glowDistortAllLayers: false,
    coreDistortion: { ...DEFAULTS.coreDistortion, amount: 0 },
    glowDistortion: { ...DEFAULTS.glowDistortion, amount: 0 },
    pad: 320,
    fontSize: 96,
};

export const layeredGlow: StoryObj<Args> = {
    args: LAYERED_ARGS,
    render: (args) => renderText("Saber", args),
    play: ({ canvasElement, args }) => playText(canvasElement, args),
};

export const coreAppearance: StoryObj<Args> = {
    args: {
        ...LAYERED_ARGS,
        coreWhiteness: 0.7,
        coreSoftness: 1.2,
        coreIntensity: 1.5,
    },
    render: (args) => renderText("Saber", args),
    play: ({ canvasElement, args }) => playText(canvasElement, args),
};

export const brightnessFlicker: StoryObj<Args> = {
    args: {
        ...LAYERED_ARGS,
        color: "#ff3ca6",
        flickerIntensity: 0.8,
        flickerSpeed: 10,
        flickerSeed: 17,
    },
    render: (args) => renderText("Saber", args),
    play: ({ canvasElement, args }) => playText(canvasElement, args),
};

const PRESET_DESCRIPTIONS: Record<SaberPresetName, string> = {
    "arc-reactor":
        "AE Arc Reactor-inspired blue core with counter-moving electrical detail.",
    burning:
        "AE Burning-inspired steady outline with a rapidly rising warm fringe.",
    energy: "AE Energy-inspired amber turbulence around a soft bright core.",
    fog: "AE Fog-inspired soft cyan light with slowly drifting distortion.",
    kryptonite:
        "AE Kryptonite-inspired green tangled edges and drifting wisps.",
    torch: "AE Torch-inspired rising flames around a steady warm outline.",
    "tractor-beam":
        "AE Tractor Beam-inspired pale blue vertical streaks and fast upward flow.",
    windy: "AE Windy-inspired descending core deformation against rising blue haze.",
    wormhole: "AE Wormhole-inspired blue tangled edges and drifting wisps.",
    electric:
        "AE Electric-inspired cyan electrical edges with rising turbulent glow.",
    fire: "AE Fire-inspired rising fractal flames around a torn edge.",
    embers: "Alias of Burning: a steady outline with a rising warm fringe.",
};

const AE_PRESETS: SaberPresetName[] = [
    "arc-reactor",
    "burning",
    "electric",
    "energy",
    "fog",
    "kryptonite",
    "fire",
    "torch",
    "tractor-beam",
    "windy",
    "wormhole",
];

export const presets: StoryObj<Args> = {
    parameters: { controls: { disable: true } },
    render: () => {
        const root = document.createElement("section");
        root.className = "saber-gallery";
        root.innerHTML = `<style>
            .saber-gallery { box-sizing: border-box; align-self: flex-start; width: 100%; min-height: 100%; padding: 32px 330px 32px 32px; color: #eef0f7; font: 14px/1.5 system-ui; }
            .saber-gallery header, .saber-gallery nav, .saber-gallery footer { position: relative; z-index: 10000; }
            .saber-gallery h2 { margin: 0; font-size: 24px; }
            .saber-gallery p { color: #a7acbc; margin: 6px 0; }
            .saber-gallery .preview { height: 290px; display: grid; place-items: center; }
            .saber-gallery h1 { margin: 0; color: white; font: 900 clamp(56px, 9vw, 120px)/1 system-ui; }
            .saber-gallery nav { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; }
            .saber-gallery button { cursor: pointer; text-align: left; border: 1px solid #35394a; border-radius: 9px; padding: 13px; color: #e9edf5; background: #141720; font: inherit; }
            .saber-gallery button::before { content: ''; display: inline-block; width: 9px; height: 9px; margin-right: 9px; border-radius: 50%; background: var(--tint); box-shadow: 0 0 12px var(--tint); }
            .saber-gallery button[aria-pressed=true] { border-color: var(--tint); background: #252937; }
            .saber-gallery button:focus-visible { outline: 2px solid white; outline-offset: 3px; }
            .saber-gallery footer { margin-top: 18px; }
            .saber-gallery code { color: #e7cba7; }
            @media(max-width: 760px) {
                .saber-gallery { padding: 24px; }
                body:has(.saber-gallery) #storybook-root { height: auto; min-height: 100%; }
                body:has(.saber-gallery) .vfx-tweakpane-container { position: relative !important; top: auto !important; right: auto !important; width: calc(100% - 48px) !important; margin: 24px; max-height: none !important; overflow: visible !important; }
            }
        </style><header><h2>Saber looks</h2><p>Eleven AE-inspired looks. Select a preset, then tune its controls.</p></header>
        <div class="preview"><h1>Saber</h1></div><nav aria-label="Saber presets"></nav>
        <details><summary>Other looks</summary><nav aria-label="Other Saber presets"></nav></details>
        <footer><p data-description></p><code data-code></code></footer>`;
        const nav = root.querySelector("nav");
        const otherNav = root.querySelector(
            'nav[aria-label="Other Saber presets"]',
        );
        const allNames = Object.keys(SABER_PRESETS) as SaberPresetName[];
        for (const name of [
            ...AE_PRESETS,
            ...allNames.filter((n) => !AE_PRESETS.includes(n)),
        ]) {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.preset = name;
            button.textContent = name
                .split("-")
                .map((word) => word[0].toUpperCase() + word.slice(1))
                .join(" ");
            button.style.setProperty(
                "--tint",
                SABER_PRESETS[name].color ?? "white",
            );
            button.setAttribute("aria-pressed", String(name === "fire"));
            (AE_PRESETS.includes(name) ? nav : otherNav)?.append(button);
        }
        return root;
    },
    play: async ({ canvasElement }) => {
        await document.fonts.ready;
        const vfx = initVFX();
        const effect = new SaberEffect({
            preset: "fire",
            source: false,
            pad: 320,
        });
        await vfx.add(canvasElement.querySelector("h1") as HTMLElement, {
            effect,
        });
        const pane = attachSaberPane("Saber · controls", effect);
        const select = (name: SaberPresetName) => {
            effect.setParams({
                preset: name,
                // Input/reveal options belong to this demo, not appearance recipes.
                ...(name === "wormhole" || name === "fog"
                    ? {
                          edge: "alpha" as const,
                          edgeThreshold: name === "wormhole" ? 1 : 0.5,
                          dynamic: false,
                          source: false,
                          pad: 320,
                          start: 0,
                          end: 1,
                          segments: 3,
                          fade: 100,
                      }
                    : {}),
            });
            pane.refresh();
            for (const button of canvasElement.querySelectorAll<HTMLButtonElement>(
                "[data-preset]",
            )) {
                button.setAttribute(
                    "aria-pressed",
                    String(button.dataset.preset === name),
                );
            }
            const description =
                canvasElement.querySelector("[data-description]");
            const code = canvasElement.querySelector("[data-code]");
            if (description) {
                description.textContent = PRESET_DESCRIPTIONS[name];
            }
            if (code) {
                code.textContent =
                    name === "wormhole"
                        ? 'new SaberEffect({ preset: "wormhole", edgeThreshold: 1, source: false, pad: 320 })'
                        : `new SaberEffect({ preset: "${name}", source: false })`;
            }
        };
        for (const button of canvasElement.querySelectorAll<HTMLButtonElement>(
            "[data-preset]",
        )) {
            button.addEventListener("click", () =>
                select(button.dataset.preset as SaberPresetName),
            );
        }
        select("fire");
    },
};

export const thinLines: StoryObj<Args> = {
    args: {
        ...LAYERED_ARGS,
        pixelRatio: 1,
        fontSize: 48,
        thickness: 0.35,
        glow: 0.4,
        coreDistortion: {
            ...DEFAULTS.coreDistortion,
            amount: 2,
            noiseSpeed: 0.06,
            windSpeed: 0,
        },
        pad: 160,
    },
    render: (args) => renderText("Fine electric lines", args),
    play: ({ canvasElement, args }) => playText(canvasElement, args),
};

export const glowRadiusSweep: StoryObj<Args> = {
    args: {
        ...LAYERED_ARGS,
        glowLayers: [
            { size: 1, intensity: 2 },
            { size: 0, intensity: 0 },
            { size: 0, intensity: 0 },
            { size: 0, intensity: 0 },
        ],
    },
    render: (args) => renderText("Saber", args),
    play: ({ canvasElement, args }) =>
        playText(canvasElement, args, (effect, time) => {
            // Cross the mip boundaries at 3, 6, 12 and 24 CSS px continuously.
            effect.params.glowLayers[0].size =
                2 ** ((Math.sin(time * 0.5) + 1) * 2.5);
        }),
};

export const movingReveal: StoryObj<Args> = {
    args: { ...LAYERED_ARGS, pad: "fullscreen", fontSize: 72, end: 0.5 },
    render: (args) => renderText("Saber", args),
    play: async ({ canvasElement, args }) => {
        const h1 = canvasElement.querySelector("h1") as HTMLElement;
        await document.fonts?.ready;
        await mount(h1, args, (effect, time) => {
            h1.style.transform = `translateX(${Math.sin(time * 0.7) * 120}px)`;
            revealLoop(effect, time);
        });
    },
};

export const glowDistortion: StoryObj<Args> = {
    args: {
        ...LAYERED_ARGS,
        color: "#ff7a24",
        glowDistortion: {
            ...DEFAULTS.glowDistortion,
            amount: 32,
            type: "fluid",
            noiseAspectRatio: 0.6,
            windSpeed: 35,
        },
    },
    render: (args) => renderText("Saber", args),
    play: ({ canvasElement, args }) => playText(canvasElement, args),
};

export const coreDistortion: StoryObj<Args> = {
    args: {
        ...LAYERED_ARGS,
        coreDistortion: {
            ...DEFAULTS.coreDistortion,
            amount: 8,
            type: "energy",
            noiseScale: 32,
            windSpeed: 12,
        },
    },
    render: (args) => renderText("Saber", args),
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
