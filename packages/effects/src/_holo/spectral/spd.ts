// Ported from holospot engine/spectral/spd.ts (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.
// Light spectra, metal and dye factors (spec §4.2.2, §4.2.6, Appendix A.5).
// Pure module (§6.1). R_Al lives here with the dye so that the spectral factors sit together; physics/grating.ts
// re-exports `rAl` under the contract name.
import type { SpdId, TintInputs, Vec3 } from "../types.js";
import {
    QUAD_LAMBDA,
    QUAD_N,
    QUAD_WEIGHT,
    RGBCMF_QUAD,
    xyzBar,
} from "./cmf.js";

/** GLSL smoothstep (Hermite); like GLSL's formula it also works with edge0 > edge1 (a falling step). */
export function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
    return t * t * (3 - 2 * t);
}

/** Aluminium reflectance under lacquer, linear fit R_Al(λ) = 0.889 − 1.25·10⁻⁴·(clamp(λ, 380, 780) − 450) (§2.1, §4.2.6). */
export function rAl(lambdaNm: number): number {
    return 0.889 - 1.25e-4 * (Math.min(Math.max(lambdaNm, 380), 780) - 450);
}

/**
 * Double-pass dye transmittance T²(λ) (§4.2.6, verbatim): clear = 1; long-pass (gold/amber) rises and short-pass
 * (blue) falls through a smoothstep over edge ± width, with `floor` on the blocked side.
 */
export function tintT2(lambdaNm: number, t: TintInputs): number {
    if (t.type === "clear") {
        return 1;
    }
    const s = smoothstep(t.edgeNm - t.widthNm, t.edgeNm + t.widthNm, lambdaNm);
    return t.floor + (1 - t.floor) * (t.type === "longpass" ? s : 1 - s);
}

/** Material factor ρ_M(λ) = R_Al(λ)·T²_M(λ) of a tint (§4.2.3). */
export function materialFactor(t: TintInputs): (lambdaNm: number) => number {
    const tt: TintInputs = {
        type: t.type,
        edgeNm: t.edgeNm,
        widthNm: t.widthNm,
        floor: t.floor,
    }; // snapshot
    return (lambdaNm: number) => rAl(lambdaNm) * tintT2(lambdaNm, tt);
}

// ---------------------------------------------------------------------------------------------------------------
// SPDs (§4.2.2), luminance-normalised: ∫S·ȳ dλ / ∫ȳ dλ = 1 over 360–830 nm.
// ---------------------------------------------------------------------------------------------------------------

/** Second radiation constant c₂ = hc/k [nm·K]. */
const PLANCK_C2 = 1.4388e7;

function planck(lambdaNm: number, T: number): number {
    return lambdaNm ** -5 / Math.expm1(PLANCK_C2 / (lambdaNm * T));
}

function gauss(l: number, l0: number, s: number): number {
    const t = (l - l0) / s;
    return Math.exp(-0.5 * t * t);
}

/** F11-like tri-phosphor lines (λ₀ nm, amplitude, σ nm) over a 0.03 continuum (amplitudes UNVERIFIED, R04 §2.3). */
const TRIPHOSPHOR_LINES: readonly (readonly [number, number, number])[] = [
    [405, 0.12, 2.5],
    [436, 0.55, 2.5],
    [487, 0.12, 3],
    [546, 1.0, 3],
    [577, 0.15, 3],
    [611, 0.95, 4],
    [631, 0.12, 4],
];

/** S(λ) before normalisation (§4.2.2 table). */
function spdRaw(id: SpdId, l: number): number {
    switch (id) {
        case "equal":
            return 1;
        case "daylight":
            return planck(l, 5600);
        case "tungsten":
            return planck(l, 3200);
        case "led":
            return gauss(l, 452, 10) + 0.62 * gauss(l, 565, 52);
        case "triphosphor": {
            let s = 0.03;
            for (const [l0, a, sg] of TRIPHOSPHOR_LINES) {
                s += a * gauss(l, l0, sg);
            }
            return s;
        }
    }
}

const SPD_SCALE: Readonly<Record<SpdId, number>> = (() => {
    const ids: readonly SpdId[] = [
        "equal",
        "daylight",
        "tungsten",
        "led",
        "triphosphor",
    ];
    let iy = 0;
    const sy: Record<string, number> = {};
    for (const id of ids) {
        sy[id] = 0;
    }
    for (let i = 0; i < QUAD_N; i++) {
        const l = QUAD_LAMBDA[i],
            w = QUAD_WEIGHT[i] * xyzBar(l)[1];
        iy += w;
        for (const id of ids) {
            sy[id] += w * spdRaw(id, l);
        }
    }
    const out: Record<string, number> = {};
    for (const id of ids) {
        out[id] = id === "equal" ? 1 : iy / sy[id];
    }
    return out as Record<SpdId, number>;
})();

/** Luminance-normalised SPD S_id(λ) (equal energy ≡ 1). */
export function spd(id: SpdId, lambdaNm: number): number {
    return id === "equal" ? 1 : SPD_SCALE[id] * spdRaw(id, lambdaNm);
}

/** ∫₃₆₀⁸³⁰ S_id·ρ·rgbCMF dλ on the shared grid: the colour of a perfect reflector of factor ρ under that light. */
export function foilRgb(id: SpdId, rho: (lambdaNm: number) => number): Vec3 {
    let r = 0,
        g = 0,
        b = 0;
    for (let i = 0; i < QUAD_N; i++) {
        const l = QUAD_LAMBDA[i],
            k = QUAD_WEIGHT[i] * spd(id, l) * rho(l);
        r += k * RGBCMF_QUAD[3 * i];
        g += k * RGBCMF_QUAD[3 * i + 1];
        b += k * RGBCMF_QUAD[3 * i + 2];
    }
    return [r, g, b];
}

const one = (): number => 1;
const SPD_RGB_CACHE = new Map<SpdId, Vec3>();

/**
 * Display colour of a light, spdRgb(id) = ∫S·rgbCMF dλ (§4.2.2): (1, 1, 1) for `equal`. Its CIE luminance is 1 by
 * construction; its sRGB luma differs from 1 by the Bradford adaptation only (≤ 1 %), and this unrenormalised value
 * is what keeps the diffuse/coat terms (uLightRGB) consistent with the spectral tables.
 */
export function spdRgb(id: SpdId): Vec3 {
    let c = SPD_RGB_CACHE.get(id);
    if (!c) {
        c = foilRgb(id, one);
        SPD_RGB_CACHE.set(id, c);
    }
    return c;
}
