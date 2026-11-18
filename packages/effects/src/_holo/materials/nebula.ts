// M3 Nebula Glitter (holospot engine/materials/nebula.ts, MIT © 2026 Dmitry Kurash): metallised, embossed PET flakes
// and concentric-groove "star" dots in a dyed binder over a deep base ink (glitter.glsl: regimes A / B / C).
// Flakes do not recycle the light they trap (it leaves the flake sideways), so etaNorm runs without recycling.
import glitter from "../glsl/glitter.js";
import fragmentMain from "../glsl/holo-nebula.js";
import { linearOfHex } from "../settings.js";
import type { GratingSummary, ParamValues, TintInputs } from "../types.js";
import {
    DEG,
    type MaterialDef,
    numParam,
    selectParam,
    tintParam,
    type Uniforms,
} from "./build.js";

const NEBULA_TINT: TintInputs = {
    type: "shortpass",
    edgeNm: 525,
    widthNm: 30,
    floor: 0.15,
};
const NEBULA_SHAPES = ["hex", "square", "round"] as const;
/** Flake area per D² (flat-to-flat size, square side or disc diameter): (√3/2)D², D², (π/4)D². */
const NEBULA_SHAPE_AREA = {
    hex: Math.sqrt(3) / 2,
    square: 1,
    round: Math.PI / 4,
};
/** Lattice pitch c of every flake layer in units of D (c = 1.25·D). */
const NEBULA_CELL_PER_D = 1.25;
const BASE_DEFAULT = "#0c0a24";

const clamp = (x: number, lo: number, hi: number) =>
    Math.min(Math.max(x, lo), hi);
const shapeOf = (v: ParamValues) =>
    selectParam(v, "nebula.shape", NEBULA_SHAPES, "hex");
/** Pitch range [nm] as (min, max); min and max are swapped when min > max. */
function pitchRange(v: ParamValues): [number, number] {
    const a = Math.max(numParam(v, "nebula.pitchMin", 665), 1);
    const b = Math.max(numParam(v, "nebula.pitchMax", 740), 1);
    return [Math.min(a, b), Math.max(a, b)];
}
const binderIndex = (v: ParamValues) =>
    clamp(numParam(v, "nebula.nc", 1.5), 1.0001, 3);
const depthNm = (v: ParamValues) =>
    Math.max(numParam(v, "nebula.depth", 100), 0);
const seedOf = (v: ParamValues) =>
    Math.max(Math.round(numParam(v, "nebula.seed", 3)), 0);

/** Visible share of a flake in the union of L independently placed layers of single-layer coverage c₁. */
export function nebulaVisFrac(c1: number, layers: number): number {
    const c = clamp(c1, 1e-6, 1);
    const L = Math.max(layers, 1);
    return (1 - (1 - c) ** L) / (L * c);
}

export const nebula: MaterialDef = {
    id: "nebula",
    fragmentMain,
    extraChunks: [glitter],

    uniforms(values: ParamValues): Uniforms {
        const D = Math.max(numParam(values, "nebula.size", 200), 1) * 1e-3;
        const shape = shapeOf(values);
        const layers = Math.round(
            clamp(numParam(values, "nebula.layers", 2), 1, 3),
        );
        const [lo, hi] = pitchRange(values);
        const bv = values["nebula.baseColor"];
        const base = linearOfHex(
            typeof bv === "string" && /^#?[0-9a-f]{6}$/i.test(bv.trim())
                ? bv
                : BASE_DEFAULT,
        ).map((x) => clamp(x, 0, 1));
        return {
            uFlakeD: D,
            uCell: NEBULA_CELL_PER_D * D,
            uFlakeArea: NEBULA_SHAPE_AREA[shape] * D * D,
            uShape: NEBULA_SHAPES.indexOf(shape),
            uLayers: layers,
            uVisFrac: nebulaVisFrac(
                NEBULA_SHAPE_AREA[shape] /
                    (NEBULA_CELL_PER_D * NEBULA_CELL_PER_D),
                layers,
            ),
            uTiltRMS: Math.tan(
                clamp(numParam(values, "nebula.tilt", 4.6), 0, 80) * DEG,
            ), // buried slope
            uTauF: Math.max(numParam(values, "nebula.curv", 0.4), 0) * DEG,
            uCoverage: clamp(numParam(values, "nebula.coverage", 0.65), 0, 1),
            uInvDRange: [1 / hi, 1 / lo],
            uDepthNm: depthNm(values),
            uStarD:
                Math.max(numParam(values, "nebula.starSize", 600), 1) * 1e-3,
            uStarOcc: clamp(
                numParam(values, "nebula.starDensity", 3) / 100,
                0,
                1,
            ),
            uBaseColor: [base[0], base[1], base[2]],
            uNc: binderIndex(values),
            uCoatAlpha: clamp(
                numParam(values, "nebula.coatAlpha", 0.06),
                1e-3,
                1,
            ),
            uSeed: seedOf(values) >>> 0,
        };
    },

    defines(): Record<string, string | number> {
        return {};
    },

    // Families: the minimum, middle (harmonic mean) and maximum pitch; no recycling; ĝ ∥ q and orientation means.
    gratingSummary(values: ParamValues): GratingSummary {
        const [lo, hi] = pitchRange(values);
        return {
            pitchesNm: [lo, 2 / (1 / lo + 1 / hi), hi],
            depthNm: depthNm(values),
            nc: binderIndex(values),
            gAzimuthRad: null,
            recycle: false,
            tint: tintParam(values, "nebula", NEBULA_TINT),
        };
    },

    relief(values: ParamValues) {
        return {
            seed: seedOf(values),
            wavinessDeg: Math.max(numParam(values, "nebula.waviness", 0.3), 0),
            orangePeelUm: Math.max(
                numParam(values, "nebula.orangePeel", 0.6),
                0,
            ),
        };
    },
};
