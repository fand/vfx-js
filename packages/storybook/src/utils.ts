import { VFX, type VFXOpts } from "@vfx-js/core";
import { Pane } from "tweakpane";
import type { BloomEffect } from "./effects/bloom";
import type { CurlParticlesEffect } from "./effects/curl-particles";
import type { FluidEffect } from "./effects/fluid";
import type { ReactionDiffusionEffect } from "./effects/reaction-diffusion";

export function initVFX(opts?: VFXOpts): VFX {
    const vfx = new VFX(opts);

    // biome-ignore lint/suspicious/noExplicitAny: Expose VFX instance globally
    (window as any).vfx = vfx;

    return vfx;
}

const BLOOM_PANE_CLASS = "bloom-tweakpane-container";

export function attachBloomPane(title: string, effect: BloomEffect): Pane {
    // Re-playing a story or hot-reloading `play()` would leave the
    // previous panel attached — clear any stragglers before creating
    // a fresh one so we don't stack multiple copies.
    for (const el of document.querySelectorAll(`.${BLOOM_PANE_CLASS}`)) {
        el.remove();
    }

    const container = document.createElement("div");
    container.className = BLOOM_PANE_CLASS;
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
    return pane;
}

const FLUID_PANE_CLASS = "fluid-tweakpane-container";

export function attachFluidPane(title: string, effect: FluidEffect): Pane {
    for (const el of document.querySelectorAll(`.${FLUID_PANE_CLASS}`)) {
        el.remove();
    }

    const container = document.createElement("div");
    container.className = FLUID_PANE_CLASS;
    // Stack below the bloom pane so a chain story can show both.
    container.style.cssText =
        "position:fixed;top:16px;left:16px;width:280px;z-index:10000";
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
    return pane;
}

const RD_PANE_CLASS = "rd-tweakpane-container";

// Classic Gray-Scott parameter pairs. Each gives a distinct family of
// patterns; switching presets lets you scan the (feed, kill) space.
const RD_PRESETS = {
    spots: { feed: 0.0367, kill: 0.0649 },
    coral: { feed: 0.0545, kill: 0.062 },
    mitosis: { feed: 0.0367, kill: 0.0649 },
    solitons: { feed: 0.014, kill: 0.054 },
    worms: { feed: 0.078, kill: 0.061 },
    maze: { feed: 0.029, kill: 0.057 },
} as const;

export function attachRDPane(
    title: string,
    effect: ReactionDiffusionEffect,
): Pane {
    for (const el of document.querySelectorAll(`.${RD_PANE_CLASS}`)) {
        el.remove();
    }

    const container = document.createElement("div");
    container.className = RD_PANE_CLASS;
    container.style.cssText =
        "position:fixed;top:16px;right:16px;width:280px;z-index:10000";
    document.body.appendChild(container);

    const pane = new Pane({ container, title, expanded: false });

    // Preset selector — applies a (feed, kill) pair without resetting
    // other knobs so users can mix preset shape with custom diffusion
    // / step rates.
    const presetState = { preset: "spots" as keyof typeof RD_PRESETS };
    pane.addBinding(presetState, "preset", {
        options: Object.fromEntries(
            Object.keys(RD_PRESETS).map((k) => [k, k]),
        ) as Record<string, string>,
    }).on("change", (ev) => {
        const p = RD_PRESETS[ev.value as keyof typeof RD_PRESETS];
        effect.params.feed = p.feed;
        effect.params.kill = p.kill;
        pane.refresh();
    });
    pane.addBinding(effect.params, "feed", {
        min: 0,
        max: 0.1,
        step: 0.0001,
    });
    pane.addBinding(effect.params, "kill", {
        min: 0,
        max: 0.1,
        step: 0.0001,
    });
    pane.addBinding(effect.params, "simMaxDim", {
        min: 64,
        max: 768,
        step: 16,
    });
    pane.addBinding(effect.params, "stepsPerFrame", {
        min: 1,
        max: 40,
        step: 1,
    });
    pane.addBinding(effect.params, "intensity", { min: 0, max: 2, step: 0.01 });
    pane.addBinding(effect.params, "source", {
        options: { alpha: "alpha", luminance: "luminance" },
    });
    pane.addBinding(effect.params, "mode", {
        options: { mask: "mask", scale: "scale" },
    });
    // `scaleRange` is a [low, high] tuple; expose as separate sliders
    // since Tweakpane can't bind to numeric tuples directly.
    const scaleProxy = {
        get scaleLow() {
            return effect.params.scaleRange[0];
        },
        set scaleLow(v: number) {
            effect.params.scaleRange = [v, effect.params.scaleRange[1]];
        },
        get scaleHigh() {
            return effect.params.scaleRange[1];
        },
        set scaleHigh(v: number) {
            effect.params.scaleRange = [effect.params.scaleRange[0], v];
        },
    };
    pane.addBinding(scaleProxy, "scaleLow", { min: 0.1, max: 5, step: 0.05 });
    pane.addBinding(scaleProxy, "scaleHigh", { min: 0.1, max: 5, step: 0.05 });
    pane.addButton({ title: "reseed" }).on("click", () => effect.reseed());
    return pane;
}

const PARTICLES_PANE_CLASS = "particles-tweakpane-container";

export function attachParticlesPane(
    title: string,
    effect: CurlParticlesEffect,
): Pane {
    for (const el of document.querySelectorAll(`.${PARTICLES_PANE_CLASS}`)) {
        el.remove();
    }

    const container = document.createElement("div");
    container.className = PARTICLES_PANE_CLASS;
    container.style.cssText =
        "position:fixed;top:16px;right:16px;width:280px;z-index:10000";
    document.body.appendChild(container);

    const pane = new Pane({ container, title, expanded: false });
    pane.addBinding(effect.params, "lifespan", {
        min: 0.5,
        max: 20,
        step: 0.1,
    });
    pane.addBinding(effect.params, "speed", { min: 0, max: 1, step: 0.005 });
    pane.addBinding(effect.params, "noiseScale", {
        min: 0.5,
        max: 30,
        step: 0.1,
    });
    pane.addBinding(effect.params, "pointSize", {
        min: 1,
        max: 30,
        step: 0.5,
    });
    pane.addBinding(effect.params, "radius", {
        min: 20,
        max: 800,
        step: 10,
    });
    pane.addBinding(effect.params, "backgroundOpacity", {
        min: 0,
        max: 1,
        step: 0.01,
    });
    return pane;
}
