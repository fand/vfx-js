// Saber2: an "electric energy" effect, take two.
//
// Inspired by Video Copilot's After Effects Saber plug-in
// (https://www.videocopilot.net/tutorials/saber_plug-in), but built from
// a completely different algorithm than `SaberEffect` (which derives a
// distance field via Jump Flooding and suffers from the characteristic
// "valleys" at sharp corners).
//
// Here the pipeline is simply:
//   1. Edge detection draws the silhouette as bright lines (`EdgeEffect`).
//   2. Bloom turns those lines into a soft glow (`BloomEffect`, reused).
//
// Zero-runtime-dep — imports only types from @vfx-js/core, plus the
// sibling effects in this package.
import type { Effect } from "@vfx-js/core";
import { BloomEffect } from "./bloom";
import { EdgeEffect } from "./edge";

export type Saber2Params = {
    /** Glow color (linear RGB, 0..1). */
    color: [number, number, number];
    /** Edge line brightness. */
    intensity: number;
    /** Edge detection threshold. */
    threshold: number;
    /** Edge line width in source pixels. */
    thickness: number;
    /** Bloom gain — how strong the glow halo is. */
    glow: number;
    /** Bloom spread, 0..1 — how far the glow reaches. */
    spread: number;
    /**
     * Extra pad around the element in CSS (logical) px so the glow has room
     * to spread. `"fullscreen"` reaches the viewport edges.
     */
    pad: number | "fullscreen";
};

const DEFAULT_PARAMS: Saber2Params = {
    color: [0.35, 0.65, 1.0],
    intensity: 1.0,
    threshold: 0.08,
    thickness: 1.0,
    glow: 3.0,
    spread: 0.8,
    pad: 80,
};

/**
 * Build the Saber2 effect chain: `EdgeEffect` → `BloomEffect`.
 *
 * Pass the result straight to `vfx.add(el, { effect: saber2(...) })`. To
 * tweak parameters at runtime, keep references to the returned effects and
 * mutate their `params` (or build the two effects yourself).
 */
export function saber2(initial: Partial<Saber2Params> = {}): Effect[] {
    const p = { ...DEFAULT_PARAMS, ...initial };
    return [
        new EdgeEffect({
            color: p.color,
            intensity: p.intensity,
            threshold: p.threshold,
            thickness: p.thickness,
        }),
        new BloomEffect({
            threshold: 0.0,
            softness: 0.3,
            intensity: p.glow,
            scatter: p.spread,
            pad: p.pad,
            dither: 0,
            edgeFade: 0,
        }),
    ];
}
