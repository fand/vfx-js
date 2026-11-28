// M2 Gold Shatter (holospot engine/materials/shatter.ts, MIT © 2026 Dmitry Kurash): a cracked-ice mosaic of
// chord-split Voronoi shards, each a buried, tilted linear grating of one of three pitch families, under a yellow
// (long-pass) lacquer on aluminium: warm palette, gold mirror, embossed creases on part of the borders.
import fragmentMain from "../glsl/holo-shatter.js";
import type { GratingSummary, ParamValues, TintInputs } from "../types.js";
import {
    DEG,
    type MaterialDef,
    numParam,
    tintParam,
    type Uniforms,
} from "./build.js";

const DEFAULT_TINT: TintInputs = {
    type: "longpass",
    edgeNm: 500,
    widthNm: 70,
    floor: 0.25,
};

const clamp = (x: number, lo: number, hi: number) =>
    Math.min(Math.max(x, lo), hi);
const pitch = (v: ParamValues, id: string, d: number) =>
    Math.max(numParam(v, id, d), 1);
const pitches = (v: ParamValues): [number, number, number] => [
    pitch(v, "shatter.pitchA", 1150),
    pitch(v, "shatter.pitchB", 1080),
    pitch(v, "shatter.pitchC", 870),
];
const orientSteps = (v: ParamValues) =>
    clamp(Math.round(numParam(v, "shatter.orientK", 0)), 0, 64);
const depthNm = (v: ParamValues) =>
    Math.max(numParam(v, "shatter.depth", 95), 0);
const lacquer = (v: ParamValues) =>
    Math.max(numParam(v, "shatter.nc", 1.5), 1.0001);

export const shatter: MaterialDef = {
    id: "shatter",
    fragmentMain,
    extraChunks: [],

    uniforms(values: ParamValues): Uniforms {
        const [a, b, c] = pitches(values);
        return {
            uShardSize: Math.max(numParam(values, "shatter.size", 2.5), 0.05),
            uShardJit: clamp(numParam(values, "shatter.jitter", 0.9), 0, 1),
            uChords: clamp(numParam(values, "shatter.chords", 1.8), 0, 3),
            uOrientK: orientSteps(values),
            uShardTilt: Math.tan(
                clamp(numParam(values, "shatter.tilt", 1), 0, 45) * DEG,
            ), // slope
            uFanQ: Math.max(numParam(values, "shatter.fan", 5), 0) * DEG,
            uInvDSet: [1 / a, 1 / b, 1 / c],
            uDepthNm: depthNm(values),
            uCoverage: clamp(numParam(values, "shatter.coverage", 0.7), 0, 1),
            uChirp: Math.max(numParam(values, "shatter.chirp", 0), 0) / 100,
            uRidgeH: numParam(values, "shatter.ridgeH", 0.3) * 1e-3, // µm → mm
            uRidgeW:
                Math.max(numParam(values, "shatter.ridgeW", 40), 1e-3) * 1e-3,
            uCreaseShare:
                clamp(numParam(values, "shatter.creaseShare", 50), 0, 100) /
                100,
            uNc: lacquer(values),
            uSigS:
                Math.max(numParam(values, "shatter.roughness", 0.45), 0) * DEG,
            uCoatAlpha: clamp(
                numParam(values, "shatter.coatAlpha", 0.05),
                1e-3,
                1,
            ),
            uSeed:
                Math.max(Math.round(numParam(values, "shatter.seed", 7)), 0) >>>
                0,
        };
    },

    defines(): Record<string, string | number> {
        return {};
    },

    // Three families A/B/C (Elem.fam = family index). Shard orientations are random, so ĝ ∥ q for the orders and the
    // orientation mean for mirrors and environment (§4.4.1) — except with one orientation step, where every shard has
    // θ = π/2.
    gratingSummary(values: ParamValues): GratingSummary {
        return {
            pitchesNm: pitches(values),
            depthNm: depthNm(values),
            nc: lacquer(values),
            gAzimuthRad: orientSteps(values) === 1 ? Math.PI / 2 : null,
            recycle: true,
            tint: tintParam(values, "shatter", DEFAULT_TINT),
        };
    },

    relief(values: ParamValues) {
        return {
            seed: Math.max(Math.round(numParam(values, "shatter.seed", 7)), 0),
            wavinessDeg: Math.max(numParam(values, "shatter.waviness", 0.3), 0),
            orangePeelUm: Math.max(
                numParam(values, "shatter.orangePeel", 0.6),
                0,
            ),
        };
    },
};
