// M1 Prism Rainbow (holospot engine/materials/prism.ts, MIT © 2026 Dmitry Kurash): one coherent linear (or
// concentric / radial) grating over the whole card, clear lacquer on aluminium, champagne-silver mirror.
import fragmentMain from "../glsl/holo-prism.js";
import type { GratingSummary, ParamValues, TintInputs } from "../types.js";
import {
    DEG,
    type MaterialDef,
    numParam,
    selectParam,
    tintParam,
    type Uniforms,
} from "./build.js";

const PRISM_PATTERNS = ["linear", "concentric", "radial"] as const;
const DEFAULT_TINT: TintInputs = {
    type: "clear",
    edgeNm: 505,
    widthNm: 35,
    floor: 0.06,
};

const pitchNm = (v: ParamValues) =>
    Math.max(numParam(v, "prism.pitch", 1000), 1);
const grooveDeg = (v: ParamValues) => numParam(v, "prism.grooveAngle", 120);
const pattern = (v: ParamValues) =>
    selectParam(v, "prism.pattern", PRISM_PATTERNS, "linear");
const depthNm = (v: ParamValues) => Math.max(numParam(v, "prism.depth", 50), 0);
const lacquer = (v: ParamValues) =>
    Math.max(numParam(v, "prism.nc", 1.5), 1.0001);

export const prism: MaterialDef = {
    id: "prism",
    fragmentMain,
    extraChunks: [],

    uniforms(values: ParamValues): Uniforms {
        // ĝ ⟂ grooves: grooves at angle a (CCW from card +x) → ĝ = (sin a, −cos a) (§3.1), e.g. 120° → ĝ at 30°
        const a = grooveDeg(values) * DEG;
        return {
            uInvD: 1 / pitchNm(values),
            uGDir: [Math.sin(a), -Math.cos(a)],
            uPattern: PRISM_PATTERNS.indexOf(pattern(values)),
            uDepthNm: depthNm(values),
            uCoverage: Math.min(
                Math.max(numParam(values, "prism.coverage", 1), 0),
                1,
            ),
            uFanQ: Math.max(numParam(values, "prism.fan", 7), 0) * DEG, // q units ← radians
            uSigTheta:
                Math.max(numParam(values, "prism.sigTheta", 0.3), 0) * DEG,
            uSigFrel:
                Math.max(numParam(values, "prism.sigPitch", 0.5), 0) / 100,
            uNc: lacquer(values),
            uSigS: Math.max(numParam(values, "prism.roughness", 0.2), 0) * DEG,
            uCoatAlpha: Math.min(
                Math.max(numParam(values, "prism.coatAlpha", 0.04), 1e-3),
                1,
            ),
        };
    },

    defines(): Record<string, string | number> {
        return {};
    },

    // One family; the linear pattern reports its grating-vector azimuth (grooves at a ⇒ ĝ at a − 90°), the circular
    // patterns null (ĝ ∥ q for the orders, orientation means for mirrors and environment, §4.4.1).
    gratingSummary(values: ParamValues): GratingSummary {
        return {
            pitchesNm: [pitchNm(values)],
            depthNm: depthNm(values),
            nc: lacquer(values),
            gAzimuthRad:
                pattern(values) === "linear"
                    ? (grooveDeg(values) - 90) * DEG
                    : null,
            recycle: true,
            tint: tintParam(values, "prism", DEFAULT_TINT),
        };
    },

    relief(values: ParamValues) {
        return {
            seed: Math.max(Math.round(numParam(values, "prism.seed", 1)), 0),
            wavinessDeg: Math.max(numParam(values, "prism.waviness", 0.3), 0),
            orangePeelUm: Math.max(
                numParam(values, "prism.orangePeel", 0.6),
                0,
            ),
        };
    },
};
