import type { Meta, StoryObj } from "@storybook/html-vite";
import {
    GlassEffect,
    type GlassParams,
    type GlassPatternName,
} from "@vfx-js/effects";
import Amagi from "../../docs/public/amagi.png";
import Jellyfish from "./assets/jellyfish.webp";
import Live from "./assets/live.webp";
import Logo from "./assets/logo-640w-20p.svg";
import Pigeon from "./assets/pigeon.webp";
import Robot from "./assets/robot.webp";
import "./preset.css";
import { attachGlassPane, initVFX, isChromatic } from "./utils";

const PHOTO_STYLE = "max-width: min(60vw, 800px); max-height: 60vh";

// The element whose silhouette becomes the glass.
const SOURCES = {
    "VFX-JS logo": { src: Logo, style: "width: min(80vw, 960px)" },
    amagi: { src: Amagi, style: "height: min(70vh, 640px)" },
    "slab (photo)": { src: Pigeon, style: PHOTO_STYLE },
} satisfies Record<string, { src: string; style: string }>;

type SourceKey = keyof typeof SOURCES;

// What is seen through the glass: the patterns, then a few images.
const PATTERNS: readonly GlassPatternName[] = [
    "stripes",
    "grid",
    "checker",
    "dots",
    "noise",
    "none",
];
const IMAGES: Record<string, string> = {
    "image: jellyfish": Jellyfish,
    "image: pigeon": Pigeon,
    "image: robot": Robot,
    "image: live": Live,
};
const BACKDROP_KEYS = [...PATTERNS, ...Object.keys(IMAGES)];

function resolveBackdrop(key: string): GlassParams["backdrop"] {
    return IMAGES[key] ?? (key as GlassPatternName);
}

type Args = {
    source: SourceKey;
    /** A pattern name or a key of `IMAGES`. */
    backdrop: string;
    /** Overrides of the effect defaults for this story. */
    params?: Partial<Omit<GlassParams, "backdrop">>;
};

function createImage(key: SourceKey): HTMLImageElement {
    const img = document.createElement("img");
    img.style.cssText = SOURCES[key].style;
    img.src = SOURCES[key].src;
    return img;
}

function whenLoaded(el: HTMLImageElement): Promise<void> {
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
    title: "Effect/Glass",
    parameters: { layout: "fullscreen", controls: { disable: true } },
    render: (args) => {
        const root = document.createElement("div");
        root.style.cssText =
            "position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: #000";

        const vfx = initVFX();
        const still = isChromatic();
        const defaults = new GlassEffect({
            backdropVisible: true,
            drag: true,
            ...args.params,
        }).params;
        // Tweakpane edits these; they are copied into the effect.
        const { backdrop: _b, backdropColors, ...params } = defaults;
        const colors = { a: backdropColors[0], b: backdropColors[1] };
        let backdropKey = args.backdrop;
        const current = (): GlassParams => ({
            ...params,
            backdrop: resolveBackdrop(backdropKey),
            backdropColors: [colors.a, colors.b],
        });

        let sourceKey: SourceKey = args.source;
        let el: HTMLImageElement | null = null;
        let effect: GlassEffect | null = null;
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
            const next = createImage(sourceKey);
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
            effect = new GlassEffect(current(), { still });
            adding = vfx.add(next, { effect });
            await adding;
        };

        void mount().then(() => {
            if (still) {
                return;
            }
            attachGlassPane("Glass", params, apply, {
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
                colors,
            });
        });
        return root;
    },
} satisfies Meta<Args>;

export const logo: StoryObj<Args> = {
    args: { source: "VFX-JS logo", backdrop: "stripes" },
};

export const amagi: StoryObj<Args> = {
    args: { source: "amagi", backdrop: "grid" },
};

// Black world and box lights only, like a studio render.
export const studio: StoryObj<Args> = {
    args: {
        source: "VFX-JS logo",
        backdrop: "none",
        params: { dispersion: 0.2, bounces: 4, lightIntensity: 3 },
    },
};

// The channels split into bands instead of a smooth rainbow.
export const bands: StoryObj<Args> = {
    args: {
        source: "amagi",
        backdrop: "checker",
        params: { paths: 3, samples: 3, dispersion: 0.2 },
    },
};

export const image: StoryObj<Args> = {
    args: {
        source: "VFX-JS logo",
        backdrop: "image: jellyfish",
        params: { backdropScale: 1.6 },
    },
};
