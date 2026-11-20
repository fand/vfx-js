// A6 Foil Emboss (holospot engine/materials/emboss.ts, MIT © 2026 Dmitry Kurash): heavy uncoated cotton stock
// carrying a logo that a hot brass die stamped with holographic foil and pressed into relief in one hit. The foil
// follows the relief, so its rainbow bends over the shoulders as the card tilts.
//
// This port carries one foil logo (holospot's single-element card). The hologram sticker (`emboss.element` hologram)
// needs the volume-hologram assets and is not ported, nor is the multi-element document (`emboss.doc`). The element
// is the picture printed on the paper (holospot's `emboss.print`), so the print is always on.
//
// The paper chunk is shader.ts PAPER (the print read from the element). The textures (logo distance field, paper maps) are built and uploaded by ../emboss-assets.ts; this module holds the
// uniform conversions of the panel values.
import embossGlsl from "../glsl/emboss.js";
import fragmentMain from "../glsl/holo-emboss.js";
import {
    EMBOSS_PROFILES,
    type EmbossProfile,
    reliefUniform,
} from "../physics/emboss.js";
import { PAPER_N, PAPER_TILE_MM } from "../scene/paper-maps.js";
import { linearOfHex } from "../settings.js";
import { PAPER } from "../shader.js";
import type {
    GratingSummary,
    ParamValues,
    TierConfig,
    TintInputs,
} from "../types.js";
import {
    DEG,
    type MaterialDef,
    numParam,
    selectParam,
    type Uniforms,
} from "./build.js";

export const FOIL_TYPES = [
    "rainbow",
    "concentric",
    "sparkle",
    "silver",
    "gold",
] as const;
export type FoilType = (typeof FOIL_TYPES)[number];
export const PAPER_STOCKS = [
    "cotton",
    "felt",
    "smooth",
    "laid",
    "linen",
    "kraft",
] as const;

/** Gold foil: a yellow-gold dyed lacquer over aluminium (long-pass at 520 nm). */
const GOLD_TINT: TintInputs = {
    type: "longpass",
    edgeNm: 520,
    widthNm: 45,
    floor: 0.2,
};
const CLEAR_TINT: TintInputs = {
    type: "clear",
    edgeNm: 505,
    widthNm: 35,
    floor: 0.06,
};
/** Foil grating constants (hot-stamping rainbow foil; the M1 defaults). */
export const FOIL_GRATING = {
    depthNm: 55,
    fanDeg: 7,
    sigThetaDeg: 0.3,
    sigPitchPct: 0.5,
    nc: 1.5,
    roughnessDeg: 0.25,
} as const;

const clamp = (x: number, lo: number, hi: number) =>
    Math.min(Math.max(x, lo), hi);
const pitchNm = (v: ParamValues) =>
    Math.max(numParam(v, "emboss.pitch", 1000), 1);
const grooveDeg = (v: ParamValues) => numParam(v, "emboss.grooveAngle", 120);
const foilType = (v: ParamValues): FoilType =>
    selectParam(v, "emboss.foil", FOIL_TYPES, "rainbow");
const profileOf = (v: ParamValues): EmbossProfile =>
    selectParam(v, "emboss.profile", EMBOSS_PROFILES, "round");

/** The paper generator's inputs (scene/paper-maps.ts), as holospot's embossAssetInputs. */
export function paperKey(v: ParamValues): {
    stock: number;
    fibreAmount: number;
    fibreScale: number;
    seed: number;
} {
    return {
        stock: Math.max(
            PAPER_STOCKS.indexOf(
                selectParam(v, "emboss.stock", PAPER_STOCKS, "cotton"),
            ),
            0,
        ),
        fibreAmount: clamp(numParam(v, "emboss.fibreAmount", 0.55), 0, 1),
        fibreScale: clamp(numParam(v, "emboss.fibreScale", 1), 0.5, 2),
        seed: Math.max(Math.round(numParam(v, "emboss.seed", 7)), 0),
    };
}

export const emboss: MaterialDef = {
    id: "emboss",
    fragmentMain,
    extraChunks: [PAPER, embossGlsl],

    uniforms(values: ParamValues): Uniforms {
        // ---- logo relief (the placement, in CSS px of the element, is HoloEffect's: uLogoXf, uLogoW)
        const prof = profileOf(values);
        const r = reliefUniform({
            heightMm:
                clamp(numParam(values, "emboss.height", 450), 0, 1000) / 1000,
            shoulderMm: clamp(
                numParam(values, "emboss.shoulder", 0.6),
                0.05,
                2,
            ),
            profile: prof,
            puff: clamp(numParam(values, "emboss.puff", 0.4), 0, 1),
        });
        // ---- paper
        const strength = clamp(
            numParam(values, "emboss.textureStrength", 1),
            0,
            2,
        );
        const toothMm =
            clamp(numParam(values, "emboss.tooth", 7), 0, 30) / 1000;
        const hUnit = toothMm * strength; // height of one RMS unit [mm]
        const rough = clamp(numParam(values, "emboss.roughness", 0.75), 0.2, 1);
        const col = values["emboss.paperColour"];
        // ---- foil
        const a = grooveDeg(values) * DEG; // grooves at a ⇒ ĝ = (sin a, −cos a) (§3.1)
        return {
            uRelief: [r.H, r.s, r.hp, r.lambda],
            uRelProfile: EMBOSS_PROFILES.indexOf(prof),
            uPaperMap: [
                1 / PAPER_TILE_MM,
                hUnit * (PAPER_N / PAPER_TILE_MM),
                hUnit,
                strength,
            ],
            // Oren–Nayar σ 0.25–0.6 rad (14–34°); sheen α 0.35–0.7 (A6.1)
            uPaperBrdf: [
                0.25 + 0.35 * rough,
                clamp(numParam(values, "emboss.sheen", 0.35), 0, 1),
                0.35 + 0.35 * rough,
                clamp(numParam(values, "emboss.translucency", 0.35), 0, 1),
            ],
            uPaperPat: [
                paperKey(values).stock,
                clamp(numParam(values, "emboss.formation", 0.45), 0, 1),
                strength,
                Math.max(Math.round(numParam(values, "emboss.seed", 7)), 0),
            ],
            uPaperRgb: linearOfHex(
                typeof col === "string" && /^#?[0-9a-f]{6}$/i.test(col.trim())
                    ? col
                    : "#f3f1ea",
            ),
            uPaperBump: values["emboss.paperBump"] === true ? 1 : 0,
            uPaperCard: 0,
            uEmbExposure:
                2 ** clamp(numParam(values, "emboss.exposure", 0.6), -2, 2),
            // the element is the printed picture: always on
            uPrintK: [
                1,
                clamp(numParam(values, "emboss.printInk", 1), 0, 1),
                0,
                0,
            ],
            uFoilType: FOIL_TYPES.indexOf(foilType(values)),
            uInvD: 1 / pitchNm(values),
            uGDir: [Math.sin(a), -Math.cos(a)],
            uDepthNm: FOIL_GRATING.depthNm,
            uFanQ: FOIL_GRATING.fanDeg * DEG,
            uSigTheta: FOIL_GRATING.sigThetaDeg * DEG,
            uSigFrel: FOIL_GRATING.sigPitchPct / 100,
            uNc: FOIL_GRATING.nc,
            uSigS: FOIL_GRATING.roughnessDeg * DEG,
            // gloss 1 → α 0.025 (mirror lacquer), 0 → 0.3 (satin)
            uCoatAlpha:
                0.3 -
                0.275 * clamp(numParam(values, "emboss.gloss", 0.8), 0, 1),
            uFoil: [
                clamp(numParam(values, "emboss.foilCoverage", 0.85), 0, 1),
                clamp(numParam(values, "emboss.edgeBreakup", 0.35), 0, 1),
                clamp(numParam(values, "emboss.showThrough", 0.25), 0, 1),
                clamp(numParam(values, "emboss.sparkleSize", 160), 20, 2000) /
                    1000,
            ],
            uSeed:
                Math.max(Math.round(numParam(values, "emboss.seed", 7)), 0) >>>
                0,
            uFoilBump: clamp(numParam(values, "emboss.foilBump", 0.25), 0, 1),
        };
    },

    // Parallax and shadow steps, paper lookups: full on high, lighter on medium, minimal on low (phones).
    defines(tier: TierConfig): Record<string, string | number> {
        const t = tier.tier;
        return {
            EMB_POM_STEPS: t === "high" ? 16 : t === "medium" ? 10 : 6,
            EMB_SHADOW_STEPS: t === "high" ? 12 : t === "medium" ? 8 : 5,
            PAPER_LAYERS: t === "low" ? 1 : 2,
        };
    },

    // One family; the linear rainbow reports its grating-vector azimuth, rings and sparkle cells null; gold foil is the
    // dyed lacquer's long-pass filter; silver and gold have no grating.
    gratingSummary(values: ParamValues): GratingSummary {
        const ft = foilType(values);
        return {
            pitchesNm: [pitchNm(values)],
            depthNm:
                ft === "silver" || ft === "gold" ? 0 : FOIL_GRATING.depthNm,
            nc: FOIL_GRATING.nc,
            gAzimuthRad:
                ft === "rainbow" ? (grooveDeg(values) - 90) * DEG : null,
            recycle: true,
            tint: ft === "gold" ? GOLD_TINT : CLEAR_TINT,
        };
    },

    // Paper cockle only (no orange peel: uncoated stock).
    relief(values: ParamValues) {
        return {
            seed: Math.max(Math.round(numParam(values, "emboss.seed", 7)), 0),
            wavinessDeg: clamp(numParam(values, "emboss.waviness", 0.12), 0, 1),
            orangePeelUm: 0,
        };
    },
};
