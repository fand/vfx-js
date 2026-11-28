// A2-3 Gilded Vortex (holospot engine/materials/vortex.ts, MIT © 2026 Dmitry Kurash): one chirped multi-start spiral
// grating over the object under a gold (long-pass) lacquer: spirals that seem to turn as it tilts.
import fragmentMain from "../glsl/holo-vortex.js";
import type {
    GratingSummary,
    ParamValues,
    TintInputs,
    Vec2,
} from "../types.js";
import {
    DEG,
    type MaterialDef,
    numParam,
    selectParam,
    tintParam,
    type Uniforms,
} from "./build.js";

/** Pitch of the eye family [nm] (holospot physics/vortex.ts VORTEX_EYE_PITCH). */
const VORTEX_EYE_PITCH = 300;
const VORTEX_HANDEDNESS = ["ccw", "cw"] as const;
const DEFAULT_TINT: TintInputs = {
    type: "longpass",
    edgeNm: 500,
    widthNm: 50,
    floor: 0.3,
};

const clamp = (x: number, lo: number, hi: number) =>
    Math.min(Math.max(x, lo), hi);
const pitchNm = (v: ParamValues) =>
    clamp(numParam(v, "vortex.pitch", 1250), 1, 1e5);
const depthNm = (v: ParamValues) =>
    Math.max(numParam(v, "vortex.depth", 45), 0);
const lacquer = (v: ParamValues) =>
    clamp(numParam(v, "vortex.nc", 1.5), 1.0001, 3);
const seedOf = (v: ParamValues) =>
    Math.max(Math.round(numParam(v, "vortex.seed", 9)), 0);

/** The centre pad (half-domain units), each axis clamped to [−1, 1]. */
function centreOf(v: ParamValues): Vec2 {
    const c = v["vortex.centre"];
    const ok = typeof c === "object" && c !== null && "x" in c && "y" in c;
    const x = ok ? Number(c.x) : 0;
    const y = ok ? Number(c.y) : 0;
    return {
        x: Number.isFinite(x) ? clamp(x, -1, 1) : 0,
        y: Number.isFinite(y) ? clamp(y, -1, 1) : 0,
    };
}

export const vortex: MaterialDef = {
    id: "vortex",
    fragmentMain,
    extraChunks: [],

    uniforms(values: ParamValues): Uniforms {
        const d0 = pitchNm(values);
        const c = centreOf(values);
        return {
            uInvD0: 1 / d0,
            uSwirlR: clamp(numParam(values, "vortex.swirl", 15), 0, 1e4),
            uHand:
                selectParam(
                    values,
                    "vortex.handedness",
                    VORTEX_HANDEDNESS,
                    "ccw",
                ) === "cw"
                    ? -1
                    : 1,
            uVortexOff: [c.x, c.y],
            // etaN family coordinates in 1/d: (1/300 eye, 1/(0.7·d₀), 1/d₀) — the GratingSummary families
            uVortexFam: [1 / VORTEX_EYE_PITCH, 1 / (0.7 * d0), 1 / d0],
            uDepthNm: depthNm(values),
            uFanQ: Math.max(numParam(values, "vortex.fan", 1.5), 0) * DEG, // q units ← radians
            uBands: Math.max(
                Math.round(numParam(values, "vortex.bands", 24)),
                0,
            ),
            uBandContrast: clamp(
                numParam(values, "vortex.contrast", 0.45),
                0,
                1,
            ),
            uNc: lacquer(values),
            uSigS:
                Math.max(numParam(values, "vortex.roughness", 0.25), 0) * DEG,
            uCoatAlpha: clamp(
                numParam(values, "vortex.coatAlpha", 0.045),
                1e-3,
                1,
            ),
        };
    },

    defines(): Record<string, string | number> {
        return {};
    },

    // Families: 0 = the eye (300 nm), 1 = 0.7·d₀, 2 = d₀; ĝ ∥ q for the orders and orientation means for mirrors and
    // environment (gAzimuthRad null), recycling as M1.
    gratingSummary(values: ParamValues): GratingSummary {
        const d0 = pitchNm(values);
        return {
            pitchesNm: [VORTEX_EYE_PITCH, 0.7 * d0, d0],
            depthNm: depthNm(values),
            nc: lacquer(values),
            gAzimuthRad: null,
            recycle: true,
            tint: tintParam(values, "vortex", DEFAULT_TINT),
        };
    },

    relief(values: ParamValues) {
        return {
            seed: seedOf(values),
            wavinessDeg: Math.max(numParam(values, "vortex.waviness", 0.3), 0),
            orangePeelUm: Math.max(
                numParam(values, "vortex.orangePeel", 0.6),
                0,
            ),
        };
    },
};
