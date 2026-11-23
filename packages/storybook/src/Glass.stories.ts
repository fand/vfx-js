import type { Meta, StoryObj } from "@storybook/html-vite";
import {
    GLASS_PALETTES,
    GlassEffect,
    type GlassPaletteName,
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

type Source =
    | { src: string; style: string }
    | { tag: "h1" | "button"; text: string; style: string };

// The element whose silhouette becomes the glass: images, and plain HTML.
const SOURCES = {
    "VFX-JS logo": { src: Logo, style: "width: min(80vw, 960px)" },
    amagi: { src: Amagi, style: "height: min(70vh, 640px)" },
    "slab (photo)": { src: Pigeon, style: PHOTO_STYLE },
    "HTML text": {
        tag: "h1",
        text: "Glass",
        style: "margin: 0; padding: 0 0.1em; color: #fff; font: 900 min(24vw, 300px) / 1.1 system-ui, sans-serif; letter-spacing: -0.02em",
    },
    "HTML button": {
        tag: "button",
        text: "Click me",
        style: "appearance: none; border: 0; border-radius: 999px; padding: 0.55em 1.4em; background: #fff; color: #000; font: 700 min(8vw, 96px) / 1 system-ui, sans-serif; cursor: pointer",
    },
} satisfies Record<string, Source>;

type SourceKey = keyof typeof SOURCES;

// What is seen through the glass: the patterns, then a few images.
const PATTERNS: readonly GlassPatternName[] = [
    "stripes",
    "grid",
    "marble",
    "flow",
    "none",
];
// The palette presets, then "custom": the two colour pickers, or the
// story's own colours until they are edited.
const PALETTE_KEYS = [...Object.keys(GLASS_PALETTES), "custom"];
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
    /**
     * Add HTML sources with `vfx.addHTML` (html-in-canvas), and show a
     * readout of clicks and `:hover` on them.
     */
    html?: boolean;
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

// Count clicks and show `:hover` on the element, to check where the
// browser hit tests it.
function watchHits(el: HTMLElement, out: HTMLElement): void {
    let clicks = 0;
    const show = () => {
        out.textContent = `clicks: ${clicks}\nhover: ${el.matches(":hover") ? "yes" : "no"}`;
    };
    el.addEventListener("click", () => {
        clicks++;
        show();
    });
    el.addEventListener("pointerenter", show);
    el.addEventListener("pointerleave", show);
    show();
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
            drag: true,
            ...args.params,
        }).params;
        // Tweakpane edits these; they are copied into the effect.
        const { backdrop: _b, backdropColors, ...params } = defaults;
        const storyColors =
            typeof backdropColors === "string" ? null : backdropColors;
        const initial =
            storyColors ?? GLASS_PALETTES[backdropColors as GlassPaletteName];
        const colors = { a: initial[0], b: initial[initial.length - 1] };
        let paletteKey =
            typeof backdropColors === "string" ? backdropColors : "custom";
        const palette = (): GlassParams["backdropColors"] => {
            if (paletteKey !== "custom") {
                return paletteKey as GlassPaletteName;
            }
            const untouched =
                storyColors &&
                colors.a === storyColors[0] &&
                colors.b === storyColors[storyColors.length - 1];
            return untouched ? storyColors : [colors.a, colors.b];
        };
        let backdropKey = args.backdrop;
        const current = (): GlassParams => ({
            ...params,
            backdrop: resolveBackdrop(backdropKey),
            backdropColors: palette(),
        });

        const readout = document.createElement("output");
        readout.style.cssText =
            "position: fixed; left: 16px; top: 16px; z-index: 10000; padding: 6px 10px; border-radius: 6px; background: #fffc; color: #000; font: 13px/1.4 ui-monospace, monospace; white-space: pre";
        if (args.html) {
            root.appendChild(readout);
        }

        let sourceKey: SourceKey = args.source;
        let el: HTMLElement | null = null;
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
            effect = new GlassEffect(current(), { still });
            if (args.html && !(next instanceof HTMLImageElement)) {
                // addHTML needs a set width for a content-sized element.
                next.style.width = `${next.getBoundingClientRect().width}px`;
                watchHits(next, readout);
                adding = vfx.addHTML(next, { effect });
            } else {
                adding = vfx.add(next, { effect });
            }
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
                palette: {
                    keys: PALETTE_KEYS,
                    value: paletteKey,
                    onChange: (key) => {
                        paletteKey = key;
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

// A soft holographic sheet: the pastel palette in wavering ribbons,
// through dispersive, faceted glass.
export const flow: StoryObj<Args> = {
    args: {
        source: "amagi",
        backdrop: "flow",
        params: {
            backdropColors: "pastel",
            backdropSoftness: 1,
            depth: 0.3,
            bevel: 0.06,
            bevelShape: "chamfer",
            dispersion: 0.25,
            paths: 3,
        },
    },
};

// The label shows as raised letters: a negative relief sinks the bright
// button around them.
export const htmlButton: StoryObj<Args> = {
    args: {
        source: "HTML button",
        backdrop: "grid",
        params: { relief: -0.05 },
    },
};

// The button added with `addHTML` and `hitGeometry` on: clicks, `:hover`
// and the cursor follow the turned front face (Chrome 157+).
export const htmlButtonHitGeometry: StoryObj<Args> = {
    args: {
        source: "HTML button",
        backdrop: "grid",
        html: true,
        params: {
            relief: -0.05,
            yaw: 40,
            fov: 60,
            orbitAnimation: 0,
            drag: false,
            pointer: "tilt",
            hitGeometry: true,
        },
    },
};
