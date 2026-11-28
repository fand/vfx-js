// A2-1 Sky Sparkle (holospot engine/materials/sparkle.ts, MIT © 2026 Dmitry Kurash): an embossed holographic
// sparkle film — irregular dots on two jittered lattices sharing one grating, blue-dyed specks, a sand-matte aluminium
// base, under a sky-blue short-pass lacquer. The pure conversions live in physics/sparkle.ts.
import glitter from "../glsl/glitter.js";
import fragmentMain from "../glsl/holo-sparkle.js";
import sparkleGlsl from "../glsl/sparkle.js";
import {
    lobeAreaFactor,
    SPECK_SIZE_MOMENT,
    sizeMoment,
    sparkleCoverMeans,
    sparkleFieldOf,
    sparkleGratingSummary,
    sparkleNum,
    sparkleSpeckDye,
    sparkleTint,
    speckTintRatio,
} from "../physics/sparkle.js";
import { type ParamValues, SPD_IDS } from "../types.js";
import { DEG, type MaterialDef, type Uniforms } from "./build.js";

const clamp = (x: number, lo: number, hi: number) =>
    Math.min(Math.max(x, lo), hi);

/** The speck tint uniforms, recomputed only when a dye or tint value changes (5 × 3 numbers). */
let tintCache: { key: string; rgb: Float32Array } | null = null;
function speckTints(values: ParamValues): Float32Array {
    const t = sparkleTint(values);
    const d = sparkleSpeckDye(values);
    const key = `${t.type}|${t.edgeNm}|${t.widthNm}|${t.floor}|${d.peakNm}|${d.widthNm}|${d.floor}`;
    if (tintCache && tintCache.key === key) {
        return tintCache.rgb;
    }
    const rgb = new Float32Array(
        SPD_IDS.flatMap((id) => [...speckTintRatio(id, t, d)]),
    );
    tintCache = { key, rgb };
    return rgb;
}

export const sparkle: MaterialDef = {
    id: "sparkle",
    fragmentMain,
    extraChunks: [glitter, sparkleGlsl],

    uniforms(values: ParamValues): Uniforms {
        const f = sparkleFieldOf(values);
        const Ds = f.speckScale * f.D;
        const cm = sparkleCoverMeans(f);
        return {
            uDotD: f.D,
            uDotCell: f.cell,
            uDotIrr: f.irr,
            uDotTilt: f.tilt,
            uDotTauF: Math.max(sparkleNum(values, "sparkle.dome"), 0) * DEG,
            uDotSigTh: f.sigTh,
            uDotSigF: f.sigF,
            uDotFanQ: Math.max(sparkleNum(values, "sparkle.fan"), 0) * DEG,
            uDotDepth: Math.max(sparkleNum(values, "sparkle.depth"), 0),
            uDotInvD: f.invD,
            uDotGDir: [f.gDir[0], f.gDir[1]],
            // coverage kernels (mean outline areas) and the field's mean cover with the smaller specks
            uDotAreaMean:
                (Math.PI / 4) *
                f.D *
                f.D *
                sizeMoment(f.irr) *
                lobeAreaFactor(f.irr),
            uSpeckAreaMean:
                (Math.PI / 4) *
                Ds *
                Ds *
                SPECK_SIZE_MOMENT *
                lobeAreaFactor(f.irr),
            uDotCover: cm.union,
            uSpeckArea: cm.speckArea,
            uSpeckShare: f.speckShare,
            uSpeckInvD: f.speckInvD,
            uSpeckScale: f.speckScale,
            uSpeckType: f.speckGrating ? 1 : 0,
            uSpeckTint: speckTints(values),
            uMatteSigS: f.matteSigS,
            uSandCell: f.sandCell,
            uSandTilt: f.sandTilt,
            uSandSigS: f.sandSigS,
            uHazeShare: clamp(sparkleNum(values, "sparkle.hazeShare"), 0, 1),
            uHazeDepth: Math.max(sparkleNum(values, "sparkle.hazeDepth"), 0),
            uHazeSigS:
                Math.max(sparkleNum(values, "sparkle.hazeRoughness"), 0) * DEG,
            uHazeFanQ: Math.max(sparkleNum(values, "sparkle.hazeFan"), 0) * DEG,
            uNc: clamp(sparkleNum(values, "sparkle.nc"), 1.0001, 3),
            uCoatAlpha: clamp(sparkleNum(values, "sparkle.coatAlpha"), 1e-3, 1),
            uSeed: f.seed >>> 0,
            // glitter.glsl's M3 uniforms, unused by this material (its sparkle chunk reuses only helpers), held at 0
            uFlakeD: 0,
            uCell: 0,
            uFlakeArea: 0,
            uVisFrac: 0,
            uTiltRMS: 0,
            uTauF: 0,
            uCoverage: 0,
            uDepthNm: 0,
            uStarD: 0,
            uStarOcc: 0,
            uShape: 0,
            uLayers: 0,
            uInvDRange: [0, 0],
        };
    },

    defines(): Record<string, string | number> {
        return {};
    },

    // Three families (dots, haze, grating specks) with their own depths.
    gratingSummary: sparkleGratingSummary,

    relief(values: ParamValues) {
        return {
            seed: Math.max(Math.round(sparkleNum(values, "sparkle.seed")), 0),
            wavinessDeg: Math.max(sparkleNum(values, "sparkle.waviness"), 0),
            orangePeelUm: Math.max(sparkleNum(values, "sparkle.orangePeel"), 0),
        };
    },
};
