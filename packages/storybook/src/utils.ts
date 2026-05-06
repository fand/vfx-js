import { VFX, type VFXOpts } from "@vfx-js/core";
import { Pane } from "tweakpane";
import type { BloomEffect } from "./effects/bloom";
import type { FluidEffect } from "./effects/fluid";
import type { ParticleEffect } from "./effects/particle";
import type { ParticleExplodeEffect } from "./effects/particle-explode";

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
    (w.__vfxPanes ??= []).push(pane);
}

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
