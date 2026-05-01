import { VFX, type VFXOpts } from "@vfx-js/core";
import { Pane } from "tweakpane";
import type { BloomEffect } from "./effects/bloom";
import type { CurlParticlesEffect } from "./effects/curl-particles";
import type { ExplodeEffect } from "./effects/explode";
import type { FluidEffect } from "./effects/fluid";
import type { ReactionDiffusionEffect } from "./effects/reaction-diffusion";

const PANE_CLASS = "vfx-tweakpane-container";

function disposeAllPanes(): void {
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
    trackPane(pane);
    return pane;
}

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
    const container = document.createElement("div");
    container.className = PANE_CLASS;
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
    trackPane(pane);
    return pane;
}

export function attachParticlesPane(
    title: string,
    effect: CurlParticlesEffect,
    burst?: ExplodeEffect,
    srcSelector?: {
        img: HTMLImageElement;
        sources: Record<string, string>;
    },
): Pane {
    const container = document.createElement("div");
    container.className = PANE_CLASS;
    container.style.cssText =
        "position:fixed;top:16px;right:16px;width:280px;z-index:10000";
    document.body.appendChild(container);

    if (burst) {
        // Share visual params so a single slider drives both effects.
        // Without this proxy, sliders only mutate the curl-particles
        // params object — the burst effect keeps its own copy and
        // ignores changes. trailFade is curl-only (the burst doesn't
        // render trails) so it is intentionally not in this list.
        for (const key of ["noiseScale", "pointSize", "fog"] as const) {
            Object.defineProperty(burst.params, key, {
                get: () => effect.params[key],
                set: (v: number) => {
                    effect.params[key] = v;
                },
                configurable: true,
                enumerable: true,
            });
        }
        // burst.duration ← curl-particles.lifespan (different names,
        // same intent — total animation time the slider drives).
        Object.defineProperty(burst.params, "duration", {
            get: () => effect.params.lifespan,
            set: (v: number) => {
                effect.params.lifespan = v;
            },
            configurable: true,
            enumerable: true,
        });
    }

    const pane = new Pane({ container, title, expanded: false });
    if (srcSelector) {
        const { img, sources } = srcSelector;
        const keys = Object.keys(sources);
        const initialKey = keys.find((k) => sources[k] === img.src) ?? keys[0];
        const state = { src: initialKey };
        const options: Record<string, string> = Object.fromEntries(
            keys.map((k) => [k, k]),
        );
        pane.addBinding(state, "src", { options }).on("change", (ev) => {
            img.src = sources[ev.value as string];
        });
    }
    pane.addBinding(effect.params, "lifespan", {
        min: 0.5,
        max: 5,
        step: 0.1,
    });
    pane.addBinding(effect.params, "aliveFraction", {
        min: 0.1,
        max: 1,
        step: 0.01,
    });
    pane.addBinding(effect.params, "speed", { min: 0, max: 1, step: 0.005 });
    pane.addBinding(effect.params, "noiseScale", {
        min: 0,
        max: 5,
        step: 0.05,
    });
    pane.addBinding(effect.params, "noiseAnimation", {
        min: 0,
        max: 2,
        step: 0.01,
    });
    pane.addBinding(effect.params, "pointSize", {
        min: 1,
        max: 5,
        step: 0.1,
    });
    pane.addBinding(effect.params, "alpha", { min: 0, max: 1, step: 0.01 });
    pane.addBinding(effect.params, "radius", {
        min: 10,
        max: 200,
        step: 1,
    });
    pane.addBinding(effect.params, "fog", { min: 0, max: 1, step: 0.01 });
    pane.addBinding(effect.params, "speedDecay", {
        min: 0.1,
        max: 10,
        step: 0.1,
    });
    pane.addBinding(effect.params, "idleKill", {
        min: 0,
        max: 10,
        step: 0.1,
    });
    pane.addBinding(effect.params, "backgroundOpacity", {
        min: 0,
        max: 1,
        step: 0.01,
    });
    pane.addBinding(effect.params, "trailFade", {
        min: 0,
        max: 1,
        step: 0.005,
    });
    if (burst) {
        pane.addButton({ title: "Explode" }).on("click", () => {
            burst.trigger();
        });
        pane.addButton({ title: "Reset" }).on("click", () => {
            burst.reset();
        });
    }
    trackPane(pane);
    return pane;
}
