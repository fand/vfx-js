import { VFX, type VFXOpts } from "@vfx-js/core";
import {
    type BloomEffect,
    type BubbleParams,
    type DatamoshEffect,
    type FluidEffect,
    type GlassParams,
    type HalftoneEffect,
    type HalftoneInkPresetName,
    type LightStreakEffect,
    type OrbitCameraParams,
    type ParticleEffect,
    type ParticleExplodeEffect,
    type PixelSortEffect,
    type SourceChannel,
    SWIRL_PARTICLE_PALETTES,
    type SwirlParticleColorStop,
    type SwirlParticlePaletteName,
    type SwirlParticleParams,
} from "@vfx-js/effects";
import { type BindingParams, type FolderApi, Pane } from "tweakpane";

const PANE_CLASS = "vfx-tweakpane-container";

// Fixed upper bound for the count slider, independent of the effect's
// construction-time maxCount. Effects realloc state RTs when count
// crosses a power-of-two boundary, so the slider can drive the grow
// path. 2048² = ~4M particles ≈ 320MB across the 5 state RTs at
// RGBA32F — heavy but tolerable on dev hardware.
const PARTICLE_COUNT_SLIDER_MAX = 2048 * 2048;

export function disposeAllPanes(): void {
    // biome-ignore lint/suspicious/noExplicitAny: window-bag access
    const w = window as any;
    const panes: Pane[] = w.__vfxPanes ?? [];
    for (const p of panes) {
        p.dispose();
    }
    w.__vfxPanes = [];
    // Story transitions don't re-run play(), so disposed panes' DOM
    // could outlive the story. Sweep any stragglers by class.
    for (const el of document.querySelectorAll(`.${PANE_CLASS}`)) {
        el.remove();
    }
}

function trackPane(pane: Pane): void {
    // biome-ignore lint/suspicious/noExplicitAny: window-bag access
    const w = window as any;
    w.__vfxPanes ??= [];
    w.__vfxPanes.push(pane);
}

/** A tracked Tweakpane in the top-right corner (disposed with the story). */
export function makePane(title: string, expanded = true): Pane {
    const container = document.createElement("div");
    container.className = PANE_CLASS;
    container.style.cssText =
        "position:fixed;top:16px;right:16px;width:300px;max-height:calc(100vh - 32px);overflow:auto;z-index:10000";
    document.body.appendChild(container);
    const pane = new Pane({ container, title, expanded });
    trackPane(pane);
    return pane;
}

export const isChromatic = (): boolean =>
    typeof navigator !== "undefined" && /Chromatic/.test(navigator.userAgent);

export function initVFX(opts?: VFXOpts): VFX {
    // biome-ignore lint/suspicious/noExplicitAny: window-bag access
    const w = window as any;
    // Storybook re-runs play() on every arg change without disposing
    // the previous VFX. Tear it down here so the new instance owns the
    // canvas alone — otherwise the old canvas keeps painting on top
    // and arg changes look ignored.
    if (w.vfx && typeof w.vfx.destroy === "function") {
        w.vfx.destroy();
    }
    disposeAllPanes();
    const vfx = new VFX(opts);
    w.vfx = vfx;

    return vfx;
}

export function attachBloomPane(title: string, effect: BloomEffect): Pane {
    const container = document.createElement("div");
    container.className = PANE_CLASS;
    // VFX-JS's canvas defaults to `z-index: 9999`, so the pane has to
    // sit above it to stay clickable.
    container.style.cssText =
        "position:fixed;top:16px;right:16px;width:280px;z-index:10000";
    document.body.appendChild(container);

    const pane = new Pane({ container, title, expanded: false });
    pane.addBinding(effect.params, "threshold", { min: 0, max: 1, step: 0.01 });
    pane.addBinding(effect.params, "softness", { min: 0, max: 1, step: 0.01 });
    pane.addBinding(effect.params, "intensity", {
        min: 0,
        max: 10,
        step: 0.01,
    });
    pane.addBinding(effect.params, "scatter", { min: 0, max: 1, step: 0.01 });
    pane.addBinding(effect.params, "dither", { min: 0, max: 5, step: 0.05 });
    pane.addBinding(effect.params, "edgeFade", {
        min: 0,
        max: 0.2,
        step: 0.001,
    });
    // `pad` is `number | "fullscreen"` — Tweakpane can't bind a union, so
    // expose just the numeric path here. Stories can flip to "fullscreen"
    // by mutating `effect.params.pad` directly.
    pane.addBinding(effect.params, "pad", {
        min: 0,
        max: 400,
        step: 1,
        view: "number",
    });
    trackPane(pane);
    return pane;
}

export function attachLightStreakPane(
    title: string,
    effect: LightStreakEffect,
    srcSelector?: SrcSelector,
): Pane {
    const container = document.createElement("div");
    container.className = PANE_CLASS;
    container.style.cssText =
        "position:fixed;top:16px;right:16px;width:280px;z-index:10000";
    document.body.appendChild(container);

    const pane = new Pane({ container, title, expanded: false });
    if (srcSelector) {
        addSrcBinding(pane, srcSelector);
    }
    pane.addBinding(effect.params, "streaks", { min: 1, max: 24, step: 1 });
    pane.addBinding(effect.params, "angle", { min: 0, max: 360, step: 1 });
    pane.addBinding(effect.params, "threshold", { min: 0, max: 1, step: 0.01 });
    pane.addBinding(effect.params, "highlightClamp", {
        min: 0.1,
        max: 1,
        step: 0.01,
    });
    pane.addBinding(effect.params, "intensity", { min: 0, max: 2, step: 0.01 });
    pane.addBinding(effect.params, "dispersion", {
        min: -1,
        max: 1,
        step: 0.01,
    });
    pane.addBinding(effect.params, "fringe", { min: 0, max: 1, step: 0.01 });
    pane.addBinding(effect.params, "fringeCount", {
        min: 0,
        max: 10,
        step: 0.1,
    });

    // `tint` is a tuple; Tweakpane's float color picker needs {r,g,b}, so
    // mirror it and write the tuple back on change.
    const [tr, tg, tb] = effect.params.tint;
    const tintState = { tint: { r: tr, g: tg, b: tb } };
    pane.addBinding(tintState, "tint", { color: { type: "float" } }).on(
        "change",
        (ev) => {
            effect.params.tint = [ev.value.r, ev.value.g, ev.value.b];
        },
    );

    const shape = pane.addFolder({ title: "Shape", expanded: false });
    shape.addBinding(effect.params, "length", { min: 0, max: 2000, step: 1 });
    shape.addBinding(effect.params, "width", {
        min: 1,
        max: 10,
        step: 1,
    });
    shape.addBinding(effect.params, "falloff", {
        min: 0.5,
        max: 10,
        step: 0.05,
    });
    shape.addBinding(effect.params, "density", {
        min: 64,
        max: 512,
        step: 32,
    });
    shape.addBinding(effect.params, "resolution", {
        min: 0.1,
        max: 1,
        step: 0.05,
    });

    // `pad` is `number | "fullscreen"` — bind just the numeric path (see
    // attachBloomPane).
    pane.addBinding(effect.params, "pad", {
        min: 0,
        max: 800,
        step: 1,
        view: "number",
    });

    trackPane(pane);
    return pane;
}

export function attachPixelSortPane(
    title: string,
    effect: PixelSortEffect,
): Pane {
    const container = document.createElement("div");
    container.className = PANE_CLASS;
    container.style.cssText =
        "position:fixed;top:16px;right:16px;width:280px;z-index:10000";
    document.body.appendChild(container);

    const pane = new Pane({ container, title, expanded: false });
    // `range` is a tuple; bind it as a Tweakpane Point2d via an {x,y} proxy
    // (x = lo, y = hi) and write back into the array in place on change.
    const proxy = {
        range: { x: effect.params.range[0], y: effect.params.range[1] },
    };
    const rangeBinding = pane.addBinding(proxy, "range", {
        x: { min: 0, max: 1, step: 0.01 },
        y: { min: 0, max: 1, step: 0.01 },
    });
    rangeBinding.on("change", (ev) => {
        effect.params.range[0] = ev.value.x;
        effect.params.range[1] = ev.value.y;
    });
    pane.addBinding(effect.params, "sortRes", { min: 16, max: 512, step: 16 });
    pane.addBinding(effect.params, "key", {
        options: {
            luminance: "luminance",
            r: "r",
            g: "g",
            b: "b",
            hue: "hue",
            saturation: "saturation",
        },
    });
    pane.addBinding(effect.params, "direction", {
        options: { up: "up", down: "down", left: "left", right: "right" },
    });
    pane.addBinding(effect.params, "angle", { min: -180, max: 180, step: 1 });
    pane.addBinding(effect.params, "bypass");
    trackPane(pane);
    return pane;
}

export function attachFluidPane(title: string, effect: FluidEffect): Pane {
    const container = document.createElement("div");
    container.className = PANE_CLASS;
    container.style.cssText =
        "position:fixed;top:16px;right:16px;width:280px;z-index:10000";
    document.body.appendChild(container);

    const pane = new Pane({ container, title, expanded: false });
    pane.addBinding(effect.params, "pressureIterations", {
        min: 1,
        max: 40,
        step: 1,
    });
    pane.addBinding(effect.params, "curlStrength", {
        min: 0,
        max: 100,
        step: 1,
    });
    pane.addBinding(effect.params, "velocityDissipation", {
        min: 0,
        max: 5,
        step: 0.05,
    });
    pane.addBinding(effect.params, "densityDissipation", {
        min: 0,
        max: 5,
        step: 0.05,
    });
    pane.addBinding(effect.params, "splatForce", {
        min: 100,
        max: 20000,
        step: 100,
    });
    pane.addBinding(effect.params, "splatRadius", {
        min: 0.0001,
        max: 0.01,
        step: 0.0001,
    });
    pane.addBinding(effect.params, "dyeSplatRadius", {
        min: 0.0001,
        max: 0.01,
        step: 0.0001,
    });
    pane.addBinding(effect.params, "dyeSplatIntensity", {
        min: 0.001,
        max: 0.03,
        step: 0.001,
    });
    pane.addBinding(effect.params, "showDye");
    trackPane(pane);
    return pane;
}

export function attachHalftonePane(
    title: string,
    effect: HalftoneEffect,
    srcSelector?: SrcSelector,
): Pane {
    const container = document.createElement("div");
    container.className = PANE_CLASS;
    container.style.cssText =
        "position:fixed;top:16px;right:16px;width:280px;z-index:10000";
    document.body.appendChild(container);

    const pane = new Pane({ container, title, expanded: false });
    if (srcSelector) {
        addSrcBinding(pane, srcSelector);
    }
    pane.addBinding(effect.params, "mode", {
        options: { rgb: "rgb", cmyk: "cmyk" },
    });
    pane.addBinding(effect.params, "gridSize", {
        min: 2,
        max: 50,
        step: 0.5,
    });
    pane.addBinding(effect.params, "dotSize", { min: 0, max: 2, step: 0.01 });
    pane.addBinding(effect.params, "smoothing", { min: 0, max: 1, step: 0.01 });
    pane.addBinding(effect.params, "angle", { min: -180, max: 180, step: 1 });
    pane.addBinding(effect.params, "blackAmount", {
        min: 0,
        max: 1,
        step: 0.01,
    });
    pane.addBinding(effect.params, "trimEdge");

    // Tweakpane's color picker needs {r,g,b,a}, not a tuple — mirror
    // the background and write the tuple back on change.
    const [br, bg, bb, ba] = effect.params.background;
    const bgState = { background: { r: br, g: bg, b: bb, a: ba } };
    pane.addBinding(bgState, "background", {
        color: { type: "float", alpha: true },
    }).on("change", (ev) => {
        effect.params.background = [
            ev.value.r,
            ev.value.g,
            ev.value.b,
            ev.value.a,
        ];
    });

    addInkPaletteBindings(pane, effect);

    trackPane(pane);
    return pane;
}

export type DatamoshSource = "jellyfish" | "bbb" | "webcam";

export function attachDatamoshPane(
    title: string,
    effect: DatamoshEffect,
    onSourceChange?: (source: DatamoshSource) => void | Promise<void>,
): Pane {
    const container = document.createElement("div");
    container.className = PANE_CLASS;
    container.style.cssText =
        "position:fixed;top:16px;right:16px;width:280px;z-index:10000";
    document.body.appendChild(container);

    const pane = new Pane({ container, title, expanded: true });

    if (onSourceChange) {
        const state = { source: "jellyfish" as DatamoshSource };
        pane.addBinding(state, "source", {
            options: { jellyfish: "jellyfish", bbb: "bbb", webcam: "webcam" },
        }).on("change", (ev) => onSourceChange(ev.value));
    }

    // mosh toggle isn't a param — drive enable()/disable() from a mirror.
    const moshState = { mosh: effect.enabled };
    pane.addBinding(moshState, "mosh").on("change", (ev) => {
        if (ev.value) {
            effect.enable();
        } else {
            effect.disable();
        }
    });

    pane.addBinding(effect.params, "blockSize", { min: 2, max: 64, step: 1 });
    pane.addBinding(effect.params, "searchRange", { min: 1, max: 32, step: 1 });
    pane.addBinding(effect.params, "searchStep", { min: 1, max: 10, step: 1 });
    pane.addBinding(effect.params, "useResidual");
    pane.addBinding(effect.params, "dup", { min: 0, max: 8, step: 1 });
    pane.addBinding(effect.params, "colorSpace", {
        options: { rgb: "rgb", ycbcr: "ycbcr" },
    });
    pane.addBinding(effect.params, "chromaGain", { min: 0, max: 2, step: 0.1 });
    pane.addBinding(effect.params, "healRate", { min: 0, max: 1, step: 0.01 });
    pane.addBinding(effect.params, "healThreshold", {
        min: 0,
        max: 1,
        step: 0.01,
    });

    pane.addBinding(effect.params, "view", {
        options: {
            output: "output",
            motion: "motion",
            residual: "residual",
            current: "current",
            previous: "previous",
        },
    });

    trackPane(pane);
    return pane;
}

const INK_PRESET_OPTIONS: Record<string, HalftoneInkPresetName> = {
    "Pure CMYK / RGB": "pure",
    Newsprint: "newsprint",
    "FOGRA51 (offset)": "fogra51",
    "SWOP 2013": "swop",
};

const CMYK_INK_KEYS = ["cyan", "magenta", "yellow", "black"] as const;
const RGB_INK_KEYS = ["red", "green", "blue"] as const;
type InkKey = (typeof CMYK_INK_KEYS)[number] | (typeof RGB_INK_KEYS)[number];

// Mirror each ink to {color: {r,g,b}, density} for Tweakpane (the color
// picker needs an object, the density slider needs a number sibling)
// and write back the [r,g,b,d] tuple on change. Presets mutate the
// mirror in place — replacing the objects breaks the binding refs —
// then refresh() redraws every picker/slider.
type InkMirror = {
    color: { r: number; g: number; b: number };
    density: number;
};

function addInkPaletteBindings(pane: Pane, effect: HalftoneEffect): void {
    const mirror = {} as Record<InkKey, InkMirror>;
    for (const key of [...CMYK_INK_KEYS, ...RGB_INK_KEYS] as InkKey[]) {
        const [r, g, b, d] = effect.params.inkPalette[key];
        mirror[key] = { color: { r, g, b }, density: d };
    }

    const writeBack = (key: InkKey): void => {
        const { color, density } = mirror[key];
        effect.params.inkPalette[key] = [color.r, color.g, color.b, density];
    };

    const presetState = { preset: "newsprint" as HalftoneInkPresetName };
    pane.addBinding(presetState, "preset", {
        label: "ink preset",
        options: INK_PRESET_OPTIONS,
    }).on("change", (ev) => {
        effect.setInkPreset(ev.value);
        for (const key of [...CMYK_INK_KEYS, ...RGB_INK_KEYS] as InkKey[]) {
            const [r, g, b, d] = effect.params.inkPalette[key];
            mirror[key].color.r = r;
            mirror[key].color.g = g;
            mirror[key].color.b = b;
            mirror[key].density = d;
        }
        pane.refresh();
    });

    const addInkFolder = (title: string, keys: readonly InkKey[]): void => {
        const folder = pane.addFolder({ title, expanded: false });
        for (const key of keys) {
            folder
                .addBinding(mirror[key], "color", {
                    color: { type: "float" },
                    label: key,
                })
                .on("change", () => writeBack(key));
            folder
                .addBinding(mirror[key], "density", {
                    label: `${key} density`,
                    min: 0,
                    max: 1,
                    step: 0.01,
                })
                .on("change", () => writeBack(key));
        }
    };
    addInkFolder("CMYK inks", CMYK_INK_KEYS);
    addInkFolder("RGB inks", RGB_INK_KEYS);
}

type SrcSelector = {
    img: HTMLImageElement;
    sources: Record<string, string>;
    // See attachParticlesPane: framework can't observe img.src
    // changes, so the story does the swap.
    onSrcChange?: (key: string) => void | Promise<void>;
};

function createParticlePaneContainer(title: string): {
    pane: Pane;
} {
    const container = document.createElement("div");
    container.className = PANE_CLASS;
    container.style.cssText =
        "position:fixed;top:16px;right:16px;width:280px;z-index:10000";
    document.body.appendChild(container);
    const pane = new Pane({ container, title, expanded: false });
    return { pane };
}

function addSrcBinding(pane: Pane, srcSelector: SrcSelector): void {
    const { img, sources, onSrcChange } = srcSelector;
    const keys = Object.keys(sources);
    const initialKey = keys.find((k) => sources[k] === img.src) ?? keys[0];
    const state = { src: initialKey };
    const options: Record<string, string> = Object.fromEntries(
        keys.map((k) => [k, k]),
    );
    pane.addBinding(state, "src", { options }).on("change", (ev) => {
        const next = ev.value as string;
        if (onSrcChange) {
            onSrcChange(next);
        } else {
            img.src = sources[next];
        }
    });
}

export function attachParticlePane(
    title: string,
    effect: ParticleEffect,
    srcSelector?: SrcSelector,
): Pane {
    const { pane } = createParticlePaneContainer(title);
    if (srcSelector) {
        addSrcBinding(pane, srcSelector);
    }
    const emitter = pane.addFolder({ title: "Emitter", expanded: true });
    emitter.addBinding(effect.params, "count", {
        min: 1,
        max: PARTICLE_COUNT_SLIDER_MAX,
        step: 1,
    });
    // Effective spawn cap is MAX_SPAWNS_PER_FRAME × 60 ≈ 245k/sec
    // (mouse + screen combined). Per-slider 200k leaves headroom while
    // staying under the per-frame budget when only one is engaged.
    emitter.addBinding(effect.params, "birthRate", {
        min: 0,
        max: 200000,
        step: 1000,
    });
    emitter.addBinding(effect.params, "screenBirthRate", {
        min: 0,
        max: 200000,
        step: 1000,
    });
    emitter.addBinding(effect.params, "radius", { min: 5, max: 300, step: 1 });
    emitter.addBinding(effect.params, "alphaThreshold", {
        min: 0,
        max: 1,
        step: 0.01,
    });
    emitter.addBinding(effect.params, "spawnOnIdle");

    const lifetime = pane.addFolder({ title: "Lifetime", expanded: true });
    lifetime.addBinding(effect.params, "life", {
        min: 0.2,
        max: 10,
        step: 0.1,
    });
    lifetime.addBinding(effect.params, "alphaDecay", {
        min: 0.1,
        max: 5,
        step: 0.05,
    });
    lifetime.addBinding(effect.params, "fadeIn", {
        min: 0,
        max: 1,
        step: 0.005,
    });
    lifetime.addBinding(effect.params, "speedDecay", {
        min: 0.1,
        max: 5,
        step: 0.05,
    });

    const motion = pane.addFolder({ title: "Motion", expanded: true });
    motion.addBinding(effect.params, "emitSpeed", {
        min: 0,
        max: 5,
        step: 0.05,
    });
    motion.addBinding(effect.params, "noiseDelay", {
        min: 0,
        max: 1,
        step: 0.01,
    });
    motion.addBinding(effect.params, "noiseSpeed", {
        min: 0,
        max: 1,
        step: 0.005,
    });
    motion.addBinding(effect.params, "noiseScale", {
        min: 0.05,
        max: 3,
        step: 0.01,
    });
    motion.addBinding(effect.params, "noiseAnimation", {
        min: 0,
        max: 2,
        step: 0.01,
    });

    const appearance = pane.addFolder({ title: "Appearance", expanded: true });
    appearance.addBinding(effect.params, "pointSize", {
        min: 1,
        max: 10,
        step: 0.1,
    });
    appearance.addBinding(effect.params, "alpha", {
        min: 0,
        max: 1,
        step: 0.01,
    });
    appearance.addBinding(effect.params, "fog", { min: 0, max: 1, step: 0.01 });
    appearance.addBinding(effect.params, "color", { view: "color" });
    appearance.addBinding(effect.params, "colorMix", {
        min: 0,
        max: 1,
        step: 0.01,
    });

    const composite = pane.addFolder({ title: "Composite", expanded: true });
    composite.addBinding(effect.params, "blend", {
        options: { add: "add", normal: "normal" },
    });
    composite.addBinding(effect.params, "trailFade", {
        min: 0,
        max: 1,
        step: 0.005,
    });
    composite.addBinding(effect.params, "srcOpacity", {
        min: 0,
        max: 1,
        step: 0.01,
    });

    trackPane(pane);
    return pane;
}

export function attachParticleExplodePane(
    title: string,
    burst: ParticleExplodeEffect,
    srcSelector?: SrcSelector,
): Pane {
    const { pane } = createParticlePaneContainer(title);
    if (srcSelector) {
        addSrcBinding(pane, srcSelector);
    }

    const appearance = pane.addFolder({ title: "Appearance", expanded: true });
    appearance.addBinding(burst.params, "pointSize", {
        min: 1,
        max: 10,
        step: 0.1,
    });
    appearance.addBinding(burst.params, "alpha", {
        min: 0,
        max: 1,
        step: 0.01,
    });
    appearance.addBinding(burst.params, "alphaDecay", {
        min: 0.1,
        max: 5,
        step: 0.05,
    });
    appearance.addBinding(burst.params, "fog", { min: 0, max: 1, step: 0.01 });
    appearance.addBinding(burst.params, "color", { view: "color" });
    appearance.addBinding(burst.params, "colorMix", {
        min: 0,
        max: 1,
        step: 0.01,
    });

    const composite = pane.addFolder({ title: "Composite", expanded: true });
    composite.addBinding(burst.params, "blend", {
        options: { add: "add", normal: "normal" },
    });
    composite.addBinding(burst.params, "trailFade", {
        min: 0,
        max: 1,
        step: 0.005,
    });

    const explodeFolder = pane.addFolder({ title: "Explode", expanded: true });
    explodeFolder.addBinding(burst.params, "count", {
        min: 1,
        max: PARTICLE_COUNT_SLIDER_MAX,
        step: 1,
    });
    explodeFolder.addBinding(burst.params, "duration", {
        min: 0.2,
        max: 5,
        step: 0.1,
    });
    explodeFolder.addBinding(burst.params, "noiseSpeed", {
        min: 0,
        max: 20,
        step: 0.1,
    });
    explodeFolder.addBinding(burst.params, "noiseScale", {
        min: 0.05,
        max: 3,
        step: 0.01,
    });
    explodeFolder.addBinding(burst.params, "noiseAnimation", {
        min: 0,
        max: 2,
        step: 0.01,
    });
    explodeFolder.addBinding(burst.params, "outwardBias", {
        min: 0,
        max: 5,
        step: 0.05,
    });
    explodeFolder.addBinding(burst.params, "speedDecay", {
        min: 0.1,
        max: 5,
        step: 0.05,
    });
    explodeFolder.addButton({ title: "Explode" }).on("click", () => {
        burst.trigger();
    });
    explodeFolder.addButton({ title: "Reset" }).on("click", () => {
        burst.reset();
    });

    trackPane(pane);
    return pane;
}

/**
 * Shared playback panel for the core animation clock. Drives
 * `VFX.timeScale` / `VFX.setTime` / `play` / `stop` so stories can pause,
 * change speed, rewind, or scrub the `time` uniform.
 */
export function attachClockPane(
    vfx: VFX,
    opts: { title?: string; range?: [number, number] } = {},
): Pane {
    const [min, max] = opts.range ?? [0, 20];

    const container = document.createElement("div");
    container.className = PANE_CLASS;
    container.style.cssText =
        "position:fixed;top:16px;left:16px;width:260px;z-index:10000";
    document.body.appendChild(container);

    const pane = new Pane({ container, title: opts.title ?? "Clock" });

    // Tweakpane binds to object properties, so mirror the clock here and
    // push edits into the VFX instance via the bindings' change events.
    const state = { timeScale: vfx.timeScale, time: vfx.time };
    let playing = true;

    const playBtn = pane.addButton({ title: "Pause" });
    playBtn.on("click", () => {
        playing = !playing;
        if (playing) {
            vfx.play();
            playBtn.title = "Pause";
        } else {
            vfx.stop();
            playBtn.title = "Play";
        }
    });

    pane.addBinding(state, "timeScale", {
        label: "speed",
        min: -3,
        max: 3,
        step: 0.1,
    }).on("change", (ev) => {
        vfx.timeScale = ev.value;
    });

    const timeBinding = pane.addBinding(state, "time", {
        label: "time",
        min,
        max,
        step: 0.01,
    });
    timeBinding.on("change", (ev) => {
        vfx.setTime(ev.value);
        // Paused: no RAF loop is running, so draw the scrubbed frame now.
        if (!playing) {
            vfx.render();
        }
    });

    // While playing, follow the advancing clock so the time slider tracks.
    const tick = () => {
        if (!container.isConnected) {
            return; // pane disposed
        }
        if (playing) {
            state.time = vfx.time;
            timeBinding.refresh();
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    trackPane(pane);
    return pane;
}

// Options for a `cameraOrigin` dropdown (GlassEffect, SwirlParticleEffect).
const CAMERA_ORIGIN_OPTIONS = {
    element: "element",
    viewport: "viewport",
} satisfies Record<OrbitCameraParams["cameraOrigin"], string>;

// Options for a `sourceChannel` dropdown (GlassEffect, SwirlParticleEffect).
const SOURCE_CHANNEL_OPTIONS = {
    alpha: "alpha",
    luminance: "luminance",
    none: "none",
} satisfies Record<SourceChannel, SourceChannel>;

/** Source picker for {@link attachSwirlParticlePane}. */
export type SwirlSourceSelector = {
    keys: readonly string[];
    value: string;
    onChange: (key: string) => void;
};

/**
 * Tweakpane for SwirlParticleEffect. Binds to a story-owned `params`
 * object; `apply` copies the edits into the current effect, which reads
 * them every frame. `replay`, when given, adds a button that starts the
 * effect over, to see the `intro` again.
 */
export function attachSwirlParticlePane(
    title: string,
    params: SwirlParticleParams,
    apply: () => void,
    source?: SwirlSourceSelector,
    replay?: () => void,
): Pane {
    const container = document.createElement("div");
    container.className = PANE_CLASS;
    container.style.cssText =
        "position:fixed;top:16px;right:16px;width:280px;z-index:10000;max-height:calc(100vh - 32px);overflow-y:auto";
    // `drag` orbits on drags that start on the element's box, and the
    // panel overlaps a wide element (the logo is 80vw): keep panel drags
    // out.
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    document.body.appendChild(container);

    const pane = new Pane({ container, title, expanded: true });
    const range = (min: number, max: number, step: number) => ({
        min,
        max,
        step,
    });

    const bind = (
        folder: FolderApi | Pane,
        key: keyof SwirlParticleParams,
        opts: BindingParams = {},
    ) => {
        folder.addBinding(params, key, opts).on("change", apply);
    };

    if (source) {
        const state = { source: source.value };
        pane.addBinding(state, "source", {
            options: Object.fromEntries(source.keys.map((k) => [k, k])),
        }).on("change", (ev) => source.onChange(ev.value));
    }

    const particles = pane.addFolder({ title: "Particles" });
    bind(particles, "count", {
        options: {
            "1k": 1024,
            "2k": 2048,
            "4k": 4096,
            "8k": 8192,
            "16k": 16384,
            "32k": 32768,
            "65k": 65536,
            "131k": 131072,
            "262k": 262144,
            "524k": 524288,
            "1M": 1048576,
        },
    });
    bind(particles, "life", range(0.5, 12, 0.1));
    bind(particles, "intro", range(0, 5, 0.1));
    if (replay) {
        particles.addButton({ title: "Replay intro" }).on("click", replay);
    }
    bind(particles, "pointSize", range(0.5, 5, 0.1));
    bind(particles, "streak", range(0, 1.5, 0.01));

    const shape = pane.addFolder({ title: "Shape" });
    bind(shape, "sourceChannel", { options: SOURCE_CHANNEL_OPTIONS });
    bind(shape, "depth", range(0.02, 1, 0.01));

    const flow = pane.addFolder({ title: "Flow" });
    bind(flow, "speed", range(0, 1, 0.01));
    bind(flow, "swirl", range(0, 3, 0.05));
    bind(flow, "curl", range(0, 3, 0.05));
    bind(flow, "curlScale", range(0.5, 6, 0.1));
    bind(flow, "attract", range(0, 20, 0.5));
    bind(flow, "peel", range(0, 1, 0.01));

    addSwirlPaletteBindings(pane, params, apply);

    const glow = pane.addFolder({ title: "Fireflies & Bloom" });
    bind(glow, "fireflyRatio", range(0, 0.1, 0.001));
    bind(glow, "fireflyIntensity", range(0, 20, 0.5));
    bind(glow, "fireflyColor", { view: "color" });
    bind(glow, "bloom", range(0, 3, 0.05));

    // `lightDirection` is a tuple: a Point2d pad for x / y (up is up) and
    // a slider for z, written back as a new tuple.
    const light = pane.addFolder({ title: "Light" });
    const [lx, ly, lz] = params.lightDirection;
    const lightState = { direction: { x: lx, y: ly }, z: lz };
    const writeLight = () => {
        params.lightDirection = [
            lightState.direction.x,
            lightState.direction.y,
            lightState.z,
        ];
        apply();
    };
    light
        .addBinding(lightState, "direction", {
            picker: "inline",
            expanded: true,
            x: { min: -1, max: 1, step: 0.01 },
            y: { min: -1, max: 1, step: 0.01, inverted: true },
        })
        .on("change", writeLight);
    light
        .addBinding(lightState, "z", { min: -1, max: 1, step: 0.01 })
        .on("change", writeLight);
    bind(light, "lightColor", { view: "color" });
    bind(light, "lightIntensity", range(0, 3, 0.01));
    bind(light, "ambient", range(0, 1, 0.01));
    bind(light, "occlusion", range(0, 1, 0.01));
    bind(light, "glint", range(0, 3, 0.01));

    const shadow = light.addFolder({ title: "Shadow" });
    bind(shadow, "shadow");
    bind(shadow, "shadowOpacity", range(0, 1, 0.01));
    bind(shadow, "shadowSoftness", range(0, 80, 0.5));
    bind(shadow, "shadowDistance", range(0, 1.5, 0.01));
    bind(shadow, "shadowColor", { view: "color" });

    const camera = pane.addFolder({ title: "Camera" });
    bind(camera, "yaw", range(-180, 180, 0.5));
    bind(camera, "pitch", range(-85, 85, 0.5));
    bind(camera, "orbitAnimation", range(0, 90, 0.5));
    bind(camera, "orbitSpeed", range(0, 10, 0.1));
    bind(camera, "fov", range(5, 90, 1));
    bind(camera, "zoom", range(0.3, 3, 0.05));
    bind(camera, "drag");
    bind(camera, "cameraOrigin", { options: CAMERA_ORIGIN_OPTIONS });

    const pointer = pane.addFolder({ title: "Pointer" });
    bind(pointer, "pointer", {
        options: { none: "none", repel: "repel", tilt: "tilt" },
    });
    bind(pointer, "pointerRadius", range(10, 400, 1));
    bind(pointer, "pointerStrength", range(0, 4, 0.01));

    // `pad` is `number | "fullscreen"`: mirror it as a checkbox + slider.
    const padState = {
        fullscreen: params.pad === "fullscreen",
        pad: typeof params.pad === "number" ? params.pad : 200,
    };
    const writePad = () => {
        params.pad = padState.fullscreen ? "fullscreen" : padState.pad;
        apply();
    };
    const output = pane.addFolder({ title: "Output", expanded: false });
    bind(output, "antialias");
    output.addBinding(padState, "fullscreen").on("change", writePad);
    output.addBinding(padState, "pad", range(0, 600, 1)).on("change", writePad);

    trackPane(pane);
    return pane;
}

// Palette preset dropdown plus the current stops (offset slider + colour
// picker each), rebuilt when the preset changes. Edits mutate the stop
// objects in place; the effect re-bakes when an offset or colour changes.
function addSwirlPaletteBindings(
    pane: Pane,
    params: SwirlParticleParams,
    apply: () => void,
): void {
    const copyStops = (
        stops: readonly SwirlParticleColorStop[],
    ): SwirlParticleColorStop[] => stops.map((s) => ({ ...s }));
    const initial: SwirlParticlePaletteName =
        typeof params.palette === "string" ? params.palette : "nebula";
    params.palette = copyStops(
        typeof params.palette === "string"
            ? SWIRL_PARTICLE_PALETTES[params.palette]
            : params.palette,
    );

    const color = pane.addFolder({ title: "Color" });
    const presetState = { palette: initial };
    color
        .addBinding(presetState, "palette", {
            options: Object.fromEntries(
                Object.keys(SWIRL_PARTICLE_PALETTES).map((k) => [k, k]),
            ),
        })
        .on("change", (ev) => {
            params.palette = copyStops(SWIRL_PARTICLE_PALETTES[ev.value]);
            rebuildStops();
            apply();
        });
    color
        .addBinding(params, "sourceColor", { min: 0, max: 1, step: 0.01 })
        .on("change", apply);

    const stopsFolder = color.addFolder({ title: "Stops", expanded: true });
    const rebuildStops = () => {
        for (const child of [...stopsFolder.children]) {
            stopsFolder.remove(child);
        }
        const stops = params.palette as SwirlParticleColorStop[];
        stops.forEach((stop, i) => {
            stopsFolder
                .addBinding(stop, "offset", {
                    label: `stop ${i + 1}`,
                    min: 0,
                    max: 1,
                    step: 0.01,
                })
                .on("change", apply);
            stopsFolder
                .addBinding(stop, "color", { label: "", view: "color" })
                .on("change", apply);
        });
    };
    rebuildStops();
}

/** Params of {@link attachGlassPane} that Tweakpane edits. */
export type GlassPaneParams = Omit<GlassParams, "backdrop" | "backdropColors">;

/**
 * Tweakpane for GlassEffect. Binds to a story-owned `params` object and
 * calls `apply` on every edit. `backdrop` is a key of the story's own
 * list, so images can be picked by name.
 */
export function attachGlassPane(
    title: string,
    params: GlassPaneParams,
    apply: () => void,
    pickers: {
        source: SwirlSourceSelector;
        backdrop: SwirlSourceSelector;
        palette: SwirlSourceSelector;
        colors: { a: string; b: string };
    },
): Pane {
    const container = document.createElement("div");
    container.className = PANE_CLASS;
    container.style.cssText =
        "position:fixed;top:16px;right:16px;width:280px;z-index:10000;max-height:calc(100vh - 32px);overflow-y:auto";
    // The effect orbits on window pointer drags; keep panel drags out.
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    document.body.appendChild(container);

    const pane = new Pane({ container, title, expanded: true });
    const range = (min: number, max: number, step: number) => ({
        min,
        max,
        step,
    });
    const bind = (
        folder: FolderApi | Pane,
        key: keyof GlassPaneParams,
        opts: BindingParams = {},
    ) => {
        folder.addBinding(params, key, opts).on("change", apply);
    };
    const pick = (
        folder: FolderApi | Pane,
        label: string,
        sel: SwirlSourceSelector,
    ) => {
        const state = { value: sel.value };
        folder
            .addBinding(state, "value", {
                label,
                options: Object.fromEntries(sel.keys.map((k) => [k, k])),
            })
            .on("change", (ev) => sel.onChange(ev.value));
    };

    pick(pane, "source", pickers.source);

    const shape = pane.addFolder({ title: "Shape" });
    bind(shape, "sourceChannel", { options: SOURCE_CHANNEL_OPTIONS });
    bind(shape, "depth", range(0.02, 1.5, 0.01));
    bind(shape, "bevel", range(0, 0.4, 0.005));
    bind(shape, "bevelShape", {
        options: { round: "round", chamfer: "chamfer" },
    });
    bind(shape, "bulge", range(0, 0.5, 0.005));
    bind(shape, "bulgeWidth", range(0.01, 1, 0.005));
    bind(shape, "relief", range(-0.3, 0.3, 0.005));
    bind(shape, "reliefBlur", range(0, 0.1, 0.001));

    const glass = pane.addFolder({ title: "Glass" });
    bind(glass, "ior", range(1, 2.5, 0.01));
    bind(glass, "dispersion", range(0, 0.5, 0.005));
    bind(glass, "paths", range(1, 4, 1));
    bind(glass, "samples", range(1, 16, 1));
    bind(glass, "bounces", range(1, 6, 1));
    bind(glass, "jitter", range(0, 1, 0.01));
    bind(glass, "tint", { view: "color" });
    bind(glass, "absorption", range(0, 10, 0.1));
    bind(glass, "reflection", range(0, 3, 0.05));
    bind(glass, "bump", range(0, 1, 0.01));
    bind(glass, "bumpScale", range(0.02, 1, 0.005));
    bind(glass, "frost", range(0, 1, 0.01));

    const backdrop = pane.addFolder({ title: "Backdrop" });
    pick(backdrop, "backdrop", pickers.backdrop);
    pick(backdrop, "palette", pickers.palette);
    bind(backdrop, "backdropVisible");
    bind(backdrop, "backdropScale", range(0.02, 3, 0.01));
    bind(backdrop, "backdropDistance", range(0, 3, 0.01));
    bind(backdrop, "backdropSpeed", range(-2, 2, 0.01));
    bind(backdrop, "backdropRatio", range(0, 1, 0.01));
    bind(backdrop, "backdropSoftness", range(0, 1, 0.01));
    backdrop
        .addBinding(pickers.colors, "a", { view: "color", label: "colorA" })
        .on("change", apply);
    backdrop
        .addBinding(pickers.colors, "b", { view: "color", label: "colorB" })
        .on("change", apply);

    const light = pane.addFolder({ title: "Lights" });
    bind(light, "lightIntensity", range(0, 8, 0.05));
    bind(light, "lightSoftness", range(0, 1, 0.01));

    const view = pane.addFolder({ title: "View" });
    bind(view, "yaw", range(-180, 180, 0.5));
    bind(view, "pitch", range(-85, 85, 0.5));
    bind(view, "orbitAnimation", range(0, 90, 0.5));
    bind(view, "orbitSpeed", range(0, 10, 0.1));
    bind(view, "fov", range(5, 90, 1));
    bind(view, "zoom", range(0.1, 2, 0.01));
    bind(view, "drag");
    bind(view, "cameraOrigin", { options: CAMERA_ORIGIN_OPTIONS });
    bind(view, "pointer", { options: { none: "none", tilt: "tilt" } });
    bind(view, "pointerStrength", range(0, 4, 0.01));
    bind(view, "resolution", range(0.25, 2, 0.05));
    bind(view, "antialias");
    bind(view, "debug", {
        options: { off: "off", outer: "outer", inner: "inner", total: "total" },
    });

    trackPane(pane);
    return pane;
}

/** Params of {@link attachBubblePane} that Tweakpane edits. */
export type BubblePaneParams = Omit<
    BubbleParams,
    "backdrop" | "backdropColors"
>;

/**
 * Tweakpane for BubbleEffect. Binds to a story-owned `params` object and
 * calls `apply` on every edit. `source` and `backdrop` are keys of the
 * story's own lists.
 */
export function attachBubblePane(
    title: string,
    params: BubblePaneParams,
    apply: () => void,
    pickers: {
        source: SwirlSourceSelector;
        backdrop: SwirlSourceSelector;
        palette: SwirlSourceSelector;
    },
): Pane {
    const container = document.createElement("div");
    container.className = PANE_CLASS;
    container.style.cssText =
        "position:fixed;top:16px;right:16px;width:280px;z-index:10000;max-height:calc(100vh - 32px);overflow-y:auto";
    // The effect orbits on window pointer drags; keep panel drags out.
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    document.body.appendChild(container);

    const pane = new Pane({ container, title, expanded: true });
    const range = (min: number, max: number, step: number) => ({
        min,
        max,
        step,
    });
    const bind = (
        folder: FolderApi | Pane,
        key: keyof BubblePaneParams,
        opts: BindingParams = {},
    ) => {
        folder.addBinding(params, key, opts).on("change", apply);
    };
    const pick = (
        folder: FolderApi | Pane,
        label: string,
        sel: SwirlSourceSelector,
    ) => {
        const state = { value: sel.value };
        folder
            .addBinding(state, "value", {
                label,
                options: Object.fromEntries(sel.keys.map((k) => [k, k])),
            })
            .on("change", (ev) => sel.onChange(ev.value));
    };

    pick(pane, "source", pickers.source);

    const bubbles = pane.addFolder({ title: "Bubbles" });
    bind(bubbles, "sourceChannel", { options: SOURCE_CHANNEL_OPTIONS });
    bind(bubbles, "depth", range(0.02, 1.5, 0.01));
    bind(bubbles, "bevel", range(0, 0.4, 0.005));
    bind(bubbles, "cellSize", range(0.02, 0.6, 0.005));
    bind(bubbles, "cellSizeRandomness", range(0, 1, 0.01));
    bind(bubbles, "seed", range(0, 100, 1));
    bind(bubbles, "roundness", range(0, 1, 0.01));
    bind(bubbles, "skin", range(-0.1, 0.1, 0.001));
    bind(bubbles, "minSize", range(0.05, 1, 0.01));
    bind(bubbles, "containment", range(0, 1, 0.01));
    bind(bubbles, "wobble", range(0, 0.15, 0.005));
    bind(bubbles, "speed", range(0, 2, 0.01));
    bind(bubbles, "maxLayers", range(1, 16, 1));

    const film = pane.addFolder({ title: "Film" });
    bind(film, "iridescence", range(0, 1, 0.01));
    bind(film, "thickness", range(0, 1500, 5));
    bind(film, "thicknessVariation", range(0, 1, 0.01));
    bind(film, "drain", range(0, 1, 0.01));
    bind(film, "swirlScale", range(0, 6, 0.05));
    bind(film, "swirlSpeed", range(-1, 1, 0.01));
    bind(film, "reflection", range(0, 4, 0.05));
    bind(film, "tint", { view: "color" });
    bind(film, "tintStrength", range(0, 1, 0.01));
    bind(film, "opacity", range(0, 1, 0.01));
    bind(film, "color", { view: "color" });

    const borders = pane.addFolder({ title: "Borders" });
    bind(borders, "borderWidth", range(0, 0.5, 0.005));
    bind(borders, "borderStrength", range(0, 2, 0.01));
    bind(borders, "borderThickness", range(0, 1500, 5));
    bind(borders, "froth", range(0, 1, 0.01));
    bind(borders, "frothSize", range(0.01, 0.3, 0.005));
    bind(borders, "frothWidth", range(0, 0.5, 0.005));

    const backdrop = pane.addFolder({ title: "Backdrop" });
    pick(backdrop, "backdrop", pickers.backdrop);
    pick(backdrop, "palette", pickers.palette);
    bind(backdrop, "backdropVisible");
    bind(backdrop, "backdropScale", range(0.02, 3, 0.01));
    bind(backdrop, "backdropDistance", range(0, 3, 0.01));
    bind(backdrop, "backdropSpeed", range(-2, 2, 0.01));
    bind(backdrop, "backdropRatio", range(0, 1, 0.01));
    bind(backdrop, "backdropSoftness", range(0, 1, 0.01));

    const light = pane.addFolder({ title: "Lights" });
    bind(light, "lightIntensity", range(0, 8, 0.05));
    bind(light, "lightSoftness", range(0, 1, 0.01));

    const view = pane.addFolder({ title: "View" });
    bind(view, "yaw", range(-180, 180, 0.5));
    bind(view, "pitch", range(-85, 85, 0.5));
    bind(view, "orbitAnimation", range(0, 90, 0.5));
    bind(view, "orbitSpeed", range(0, 10, 0.1));
    bind(view, "fov", range(5, 90, 1));
    bind(view, "zoom", range(0.1, 2, 0.01));
    bind(view, "drag");
    bind(view, "cameraOrigin", { options: CAMERA_ORIGIN_OPTIONS });
    bind(view, "pointer", { options: { none: "none", tilt: "tilt" } });
    bind(view, "pointerStrength", range(0, 4, 0.01));
    bind(view, "resolution", range(0.25, 2, 0.05));
    bind(view, "antialias");
    bind(view, "debug", {
        options: {
            off: "off",
            cost: "cost",
            layers: "layers",
            cells: "cells",
        },
    });

    trackPane(pane);
    return pane;
}
