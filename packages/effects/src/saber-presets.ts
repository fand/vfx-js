import { aeLightOptions, aeTransportOptions } from "./_saber-ae-presets.js";
import { DEFAULT_DISTORTION } from "./_saber-glow.js";
import type { SaberOptions } from "./saber.js";

/** Named looks for SaberEffect. AE-inspired recipes approximate its appearance, not its numeric units. */
export type SaberPresetName =
    | "arc-reactor"
    | "burning"
    | "energy"
    | "fog"
    | "kryptonite"
    | "torch"
    | "tractor-beam"
    | "windy"
    | "wormhole"
    | "electric"
    | "fire"
    | "embers";

// Glow uses native AE layer assignments and one measured unit conversion.
// Core widths, softness and output grading also use measured AE mappings.
// Distortion remains an approximation, calibrated separately.
// Reset appearance on every selection, retaining source, edge, pad and reveal.
const BASE = {
    intensity: 1,
    thickness: 2,
    coreIntensity: 1,
    coreWhiteness: 0.15,
    coreSoftness: 0,
    coreBlendOnTop: false,

    flickerIntensity: 0,
    flickerSpeed: 12,
    flickerSeed: 0,

    glowFlow: 0,
    glowDistortAllLayers: false,
} satisfies SaberOptions;

function look(name: Exclude<SaberPresetName, "embers">): SaberOptions {
    const light = aeLightOptions(name);
    const transport = aeTransportOptions(name);
    const result: SaberOptions = {
        ...BASE,
        ...light,
        glowDistortAllLayers: true,
        coreDistortion: Object.freeze({
            ...DEFAULT_DISTORTION,
            ...transport.core,
        }),
        glowDistortion: Object.freeze({
            ...DEFAULT_DISTORTION,
            ...transport.glow,
        }),
        glowLayers: light.glowLayers.map((layer) =>
            Object.freeze({ ...layer }),
        ) as NonNullable<SaberOptions["glowLayers"]>,
    };
    Object.freeze(result.glowLayers);
    return Object.freeze(result);
}

const BURNING = look("burning");

/**
 * Immutable appearance recipes, including eleven AE-inspired looks. Use `new SaberEffect({ preset: "electric" })`
 * or `effect.setParams({ preset: "fire", color: "#ff6633" })`.
 * Explicit options override the preset; nested values are copied per instance.
 * Source, edge detection, pad and reveal settings are not part of these recipes.
 */
export const SABER_PRESETS: Readonly<Record<SaberPresetName, SaberOptions>> =
    Object.freeze({
        "arc-reactor": look("arc-reactor"),
        burning: BURNING,
        energy: look("energy"),
        fog: look("fog"),
        kryptonite: look("kryptonite"),
        torch: look("torch"),
        "tractor-beam": look("tractor-beam"),
        windy: look("windy"),
        wormhole: look("wormhole"),
        electric: look("electric"),
        fire: look("fire"),
        embers: BURNING,
    });
