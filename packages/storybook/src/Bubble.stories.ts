import type { Meta, StoryObj } from "@storybook/html-vite";
import {
    BubbleEffect,
    type BubbleParams,
    GLASS_PALETTES,
    type GlassPaletteName,
    type GlassPatternName,
} from "@vfx-js/effects";
import Amagi from "../../docs/public/amagi.png";
import Jellyfish from "./assets/jellyfish.webp";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";
import { attachBubblePane, initVFX, isChromatic } from "./utils";

type Source =
    | { src: string; style: string }
    | { tag: "h1"; text: string; style: string };

// A soft cloud of blobs, for the close-ups.
const CLOUD = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220" viewBox="0 0 400 220"><g fill="#fff"><ellipse cx="200" cy="140" rx="180" ry="70"/><circle cx="120" cy="105" r="70"/><circle cx="215" cy="85" r="80"/><circle cx="305" cy="110" r="65"/></g></svg>`,
)}`;

// The element whose silhouette the foam fills.
const SOURCES = {
    "VFX-JS logo": { src: Logo, style: "width: min(80vw, 960px)" },
    amagi: { src: Amagi, style: "height: min(70vh, 640px)" },
    cloud: { src: CLOUD, style: "width: min(80vw, 900px)" },
    "HTML text": {
        tag: "h1",
        text: "Bubbles",
        style: "margin: 0; padding: 0 0.1em; color: #fff; font: 900 min(20vw, 260px) / 1.1 system-ui, sans-serif; letter-spacing: -0.02em",
    },
} satisfies Record<string, Source>;

type SourceKey = keyof typeof SOURCES;

const PATTERNS: readonly GlassPatternName[] = [
    "none",
    "stripes",
    "grid",
    "marble",
    "flow",
];
const IMAGES: Record<string, string> = { "image: jellyfish": Jellyfish };
const BACKDROP_KEYS = [...PATTERNS, ...Object.keys(IMAGES)];
const PALETTE_KEYS = Object.keys(GLASS_PALETTES);

type Args = {
    source: SourceKey;
    /** A pattern name or a key of `IMAGES`. */
    backdrop?: string;
    /** Page colour behind the element (CSS). */
    background?: string;
    /** Overrides of the effect defaults for this story. */
    params?: Partial<Omit<BubbleParams, "backdrop">>;
};

function createSource(key: SourceKey): HTMLElement {
    const source: Source = SOURCES[key];
    if ("src" in source) {
        const img = document.createElement("img");
        img.style.cssText = source.style;
        img.src = source.src;
        return img;
    }
    const el = document.createElement(source.tag);
    el.style.cssText = source.style;
    el.textContent = source.text;
    return el;
}

function whenLoaded(el: HTMLElement): Promise<void> {
    if (!(el instanceof HTMLImageElement)) {
        // Text is captured as drawn, so its font has to be there.
        return document.fonts.ready.then(() => {});
    }
    return new Promise((resolve, reject) => {
        if (el.complete && el.naturalWidth > 0) {
            resolve();
            return;
        }
        el.addEventListener("load", () => resolve(), { once: true });
        el.addEventListener("error", () => reject(new Error("load failed")), {
            once: true,
        });
    });
}

export default {
    title: "Effect/Bubble",
    parameters: { layout: "fullscreen", controls: { disable: true } },
    render: (args) => {
        const root = document.createElement("div");
        root.style.cssText = `position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: ${args.background ?? "#000"}`;

        const vfx = initVFX();
        const still = isChromatic();
        const defaults = new BubbleEffect({ drag: true, ...args.params })
            .params;
        // Tweakpane edits these; they are copied into the effect.
        const { backdrop: _b, backdropColors, ...params } = defaults;
        let backdropKey = args.backdrop ?? "none";
        // A preset name, or the story's own colours until one is picked.
        let colors: BubbleParams["backdropColors"] = backdropColors;
        const current = (): BubbleParams => ({
            ...params,
            backdrop: IMAGES[backdropKey] ?? (backdropKey as GlassPatternName),
            backdropColors: colors,
        });

        let sourceKey: SourceKey = args.source;
        let el: HTMLElement | null = null;
        let effect: BubbleEffect | null = null;
        // Bumped on every swap, so a slow load can't attach a stale element.
        let token = 0;
        // `remove` must wait for a pending `add` on the same element.
        let adding: Promise<void> = Promise.resolve();

        const apply = () => {
            if (effect) {
                Object.assign(effect.params, current());
            }
        };

        const mount = async (): Promise<void> => {
            const my = ++token;
            const prev = el;
            const next = createSource(sourceKey);
            el = next;
            if (prev) {
                prev.replaceWith(next);
                await adding.catch(() => {});
                vfx.remove(prev);
            } else {
                root.appendChild(next);
            }
            try {
                await whenLoaded(next);
                // Let Storybook attach the root before VFX measures it.
                await new Promise((r) => requestAnimationFrame(r));
            } catch (e) {
                console.error(e);
                return;
            }
            if (my !== token) {
                return;
            }
            effect = new BubbleEffect(current(), { still });
            adding = vfx.add(next, { effect });
            await adding;
        };

        void mount().then(() => {
            if (still) {
                return;
            }
            attachBubblePane("Bubble", params, apply, {
                source: {
                    keys: Object.keys(SOURCES),
                    value: sourceKey,
                    onChange: (key) => {
                        sourceKey = key as SourceKey;
                        void mount();
                    },
                },
                backdrop: {
                    keys: BACKDROP_KEYS,
                    value: backdropKey,
                    onChange: (key) => {
                        backdropKey = key;
                        apply();
                    },
                },
                palette: {
                    keys: PALETTE_KEYS,
                    value: typeof colors === "string" ? colors : "mono",
                    onChange: (key) => {
                        colors = key as GlassPaletteName;
                        apply();
                    },
                },
            });
        });
        return root;
    },
} satisfies Meta<Args>;

// The VFX-JS logo as a cluster of soap bubbles: big bubbles spread
// evenly at random, smaller ones filling the gaps between them and along
// the outline, cut by flat shared walls where they meet.
export const logo: StoryObj<Args> = {
    args: { source: "VFX-JS logo" },
};

// The same big bubbles without the fill (minSize 1), for comparison.
export const noFill: StoryObj<Args> = {
    args: { source: "VFX-JS logo", params: { minSize: 1 } },
};

// Large cells: few big bubbles, the fill does the rest.
export const bigCells: StoryObj<Args> = {
    args: {
        source: "VFX-JS logo",
        params: { cellSize: 0.16, depth: 0.18, minSize: 0.18 },
    },
};

// The logo as a container (containment 1): the bubbles are blown up
// inside it and pressed flat against its walls.
export const contained: StoryObj<Args> = {
    args: { source: "VFX-JS logo", params: { containment: 1 } },
};

// White borders on the foam's outside, where two bubbles meet: the
// water gathered there scatters light, and the film thickens towards it.
export const borders: StoryObj<Args> = {
    args: {
        source: "VFX-JS logo",
        params: { containment: 1, borderHighlight: 1 },
    },
};

// The same with radii that vary more.
export const random: StoryObj<Args> = {
    args: { source: "VFX-JS logo", params: { cellSizeRandomness: 0.6 } },
};

// At the same bubble size, from a flat-walled foam (roundness 0) to whole
// spheres that touch (1).
export const roundness0: StoryObj<Args> = {
    args: { source: "VFX-JS logo", params: { roundness: 0 } },
};

export const roundness1: StoryObj<Args> = {
    args: { source: "VFX-JS logo", params: { roundness: 1 } },
};

// Plain HTML text, seen nearly from the front so the letters read.
export const htmlText: StoryObj<Args> = {
    args: {
        source: "HTML text",
        params: {
            cellSize: 0.08,
            depth: 0.14,
            roundness: 0.3,
            yaw: 11.5,
            pitch: 7,
            orbitAnimation: 8.5,
            zoom: 0.9,
        },
    },
};

// An image's silhouette, with the pastel flow drawn behind: the films
// reflect it and the page no longer shows through.
export const image: StoryObj<Args> = {
    args: {
        source: "amagi",
        backdrop: "flow",
        params: {
            backdropVisible: true,
            backdropColors: "pastel",
            backdropSoftness: 1,
            backdropScale: 0.5,
            cellSize: 0.14,
            depth: 0.25,
        },
    },
};

// A close-up of large bubbles on a pale page: a bubble cluster, flat
// walls where the bubbles meet, small bubbles between the big ones.
export const closeUp: StoryObj<Args> = {
    args: {
        source: "cloud",
        background: "linear-gradient(#c3d0fb, #a9b9ec)",
        params: {
            cellSize: 0.3,
            depth: 0.4,
            roundness: 0.5,
            cellSizeRandomness: 0.3,
            minSize: 0.3,
            iridescence: 0.2,
            tint: "#3d5fc4",
            tintStrength: 0.6,
            lightSoftness: 1,
            yaw: 5.5,
            pitch: 7,
            orbitAnimation: 5.5,
            zoom: 0.8,
        },
    },
};

// The close-up pressed into a mould, with pale borders.
export const closeUpBorders: StoryObj<Args> = {
    args: {
        ...closeUp.args,
        params: {
            ...closeUp.args?.params,
            containment: 1,
            borderHighlight: 0.6,
        },
    },
};

// Opaque bubbles: matte balls packed in the shape.
export const opaque: StoryObj<Args> = {
    args: {
        source: "cloud",
        params: {
            cellSize: 0.22,
            depth: 0.4,
            roundness: 0.4,
            opacity: 1,
            color: "#2f7fe0",
            yaw: 26,
            pitch: 17,
            orbitAnimation: 5.5,
            zoom: 0.8,
        },
    },
};

// Each bubble in a flat colour, where the ray first meets it.
export const debugCells: StoryObj<Args> = {
    args: { source: "VFX-JS logo", params: { debug: "cells" } },
};

// The cost of each pixel: texture lookups spent on the foam.
export const debugCost: StoryObj<Args> = {
    args: { source: "VFX-JS logo", params: { debug: "cost" } },
};
