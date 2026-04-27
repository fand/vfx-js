import { VFX, type VFXOpts } from "@vfx-js/core";
import { Pane } from "tweakpane";
import type { BloomEffect } from "./effects/bloom";

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
