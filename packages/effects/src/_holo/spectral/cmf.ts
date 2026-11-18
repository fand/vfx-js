// Ported from holospot engine/spectral/cmf.ts (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.
// CIE 1931 colour matching, colour matrices and gamut mapping (spec §4.2.1, Appendix A.1, A.4).
// Pure module (§6.1): no runtime imports, Node-testable with type stripping.
import type { Mat3, Vec3 } from "../types.js";

// ---------------------------------------------------------------------------------------------------------------
// Shared spectral quadrature. Every CPU spectral integral of WP-A (normalisers, SPD colours, foil colours, tables,
// projection, bins) uses this one trapezoid grid over the integration domain λ′ ∈ [360, 830] nm of §4.2.3, so that
// sum rules between them (S7, S9) hold to rounding error.
// ---------------------------------------------------------------------------------------------------------------

/** Lower and upper end of every CPU spectral integral [nm] (§4.2.3: λ′ over 360–830 nm). */
export const LAMBDA_LO = 360;
export const LAMBDA_HI = 830;
/** Step of the shared trapezoid grid [nm]. */
export const QUAD_STEP = 0.5;
/** Number of grid nodes (941). */
export const QUAD_N = Math.round((LAMBDA_HI - LAMBDA_LO) / QUAD_STEP) + 1;
/** Grid nodes λ_i = 360 + 0.5·i [nm]. */
export const QUAD_LAMBDA: Float64Array = new Float64Array(QUAD_N);
/** Trapezoid weights [nm] (half weight at both ends). */
export const QUAD_WEIGHT: Float64Array = new Float64Array(QUAD_N);
for (let i = 0; i < QUAD_N; i++) {
    QUAD_LAMBDA[i] = LAMBDA_LO + QUAD_STEP * i;
    QUAD_WEIGHT[i] = i === 0 || i === QUAD_N - 1 ? 0.5 * QUAD_STEP : QUAD_STEP;
}

/** ∫₃₆₀⁸³⁰ f(λ) dλ on the shared trapezoid grid. */
export function integrate(f: (lambdaNm: number) => number): number {
    let s = 0;
    for (let i = 0; i < QUAD_N; i++) {
        s += QUAD_WEIGHT[i] * f(QUAD_LAMBDA[i]);
    }
    return s;
}

// ---------------------------------------------------------------------------------------------------------------
// Wyman, Sloan & Shirley 2013 multi-lobe fit (JCGT 2(2), Table 1; Appendix A.1). Lobe: a·exp(−½[(λ − b)·(λ < b ? γ : δ)]²).
// ---------------------------------------------------------------------------------------------------------------

type Lobe = readonly [a: number, b: number, gamma: number, delta: number];
const X_LOBES: readonly Lobe[] = [
    [0.362, 442.0, 0.0624, 0.0374],
    [1.056, 599.8, 0.0264, 0.0323],
    [-0.065, 501.1, 0.049, 0.0382],
];
const Y_LOBES: readonly Lobe[] = [
    [0.821, 568.8, 0.0213, 0.0247],
    [0.286, 530.9, 0.0613, 0.0322],
];
const Z_LOBES: readonly Lobe[] = [
    [1.217, 437.0, 0.0845, 0.0278],
    [0.681, 459.0, 0.0385, 0.0725],
];

function lobeSum(l: number, lobes: readonly Lobe[]): number {
    let s = 0;
    for (const [a, b, g, d] of lobes) {
        const t = (l - b) * (l < b ? g : d);
        s += a * Math.exp(-0.5 * t * t);
    }
    return s;
}

/** x̄, ȳ, z̄ of the Wyman fit at λ [nm] (unnormalised CIE 1931 2° observer). */
export function xyzBar(lambdaNm: number): Vec3 {
    return [
        lobeSum(lambdaNm, X_LOBES),
        lobeSum(lambdaNm, Y_LOBES),
        lobeSum(lambdaNm, Z_LOBES),
    ];
}

/** (I_x, I_y, I_z) = ∫₃₆₀⁸³⁰ (x̄, ȳ, z̄) dλ [nm], recomputed at start-up (≈ 106.71 / 106.95 / 106.86, §4.2.1). */
export const CMF_INTEGRALS: Vec3 = (() => {
    let x = 0,
        y = 0,
        z = 0;
    for (let i = 0; i < QUAD_N; i++) {
        const [a, b, c] = xyzBar(QUAD_LAMBDA[i]);
        x += QUAD_WEIGHT[i] * a;
        y += QUAD_WEIGHT[i] * b;
        z += QUAD_WEIGHT[i] * c;
    }
    return [x, y, z];
})();

// ---------------------------------------------------------------------------------------------------------------
// 3×3 helpers. Mat3 is row-major (types.ts).
// ---------------------------------------------------------------------------------------------------------------

/** m·v for a row-major Mat3. */
export function mat3MulVec(m: Mat3, v: Vec3): Vec3 {
    return [
        m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
        m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
        m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
    ];
}

/** a·b (row-major). */
export function mat3Mul(a: Mat3, b: Mat3): Mat3 {
    const r = new Array<number>(9);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            r[3 * i + j] =
                a[3 * i] * b[j] +
                a[3 * i + 1] * b[3 + j] +
                a[3 * i + 2] * b[6 + j];
        }
    }
    return r as unknown as Mat3;
}

export function mat3Transpose(m: Mat3): Mat3 {
    return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

export function mat3Inverse(m: Mat3): Mat3 {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h,
        B = f * g - d * i,
        C = d * h - e * g;
    const det = a * A + b * B + c * C;
    if (Math.abs(det) < 1e-300) {
        throw new Error("mat3Inverse: singular matrix");
    }
    const s = 1 / det;
    return [
        A * s,
        (c * h - b * i) * s,
        (b * f - c * e) * s,
        B * s,
        (a * i - c * g) * s,
        (c * d - a * f) * s,
        C * s,
        (b * g - a * h) * s,
        (a * e - b * d) * s,
    ];
}

export function diag3(v: Vec3): Mat3 {
    return [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]];
}

// ---------------------------------------------------------------------------------------------------------------
// Colour matrices, computed at start-up from the primaries (§4.2.1).
// ---------------------------------------------------------------------------------------------------------------

type XY = readonly [number, number];
const D65_XY: XY = [0.3127, 0.329];
const SRGB_PRIMARIES: readonly [XY, XY, XY] = [
    [0.64, 0.33],
    [0.3, 0.6],
    [0.15, 0.06],
];
const P3_PRIMARIES: readonly [XY, XY, XY] = [
    [0.68, 0.32],
    [0.265, 0.69],
    [0.15, 0.06],
];

/** RGB → XYZ matrix of an RGB space from its chromaticities and white point (white has Y = 1). */
function rgbToXyzMatrix(prim: readonly [XY, XY, XY], white: XY): Mat3 {
    const col = ([x, y]: XY): Vec3 => [x / y, 1, (1 - x - y) / y];
    const r = col(prim[0]),
        g = col(prim[1]),
        b = col(prim[2]);
    const P: Mat3 = [r[0], g[0], b[0], r[1], g[1], b[1], r[2], g[2], b[2]];
    const S = mat3MulVec(mat3Inverse(P), col(white));
    return mat3Mul(P, diag3(S));
}

/** Linear sRGB (D65) → CIE XYZ. */
export const M_SRGB_TO_XYZ: Mat3 = rgbToXyzMatrix(SRGB_PRIMARIES, D65_XY);
/** CIE XYZ → linear sRGB (D65). */
export const M_XYZ_TO_SRGB: Mat3 = mat3Inverse(M_SRGB_TO_XYZ);
/** D65 white in XYZ (Y = 1) = M_sRGB→XYZ·(1, 1, 1). */
export const WHITE_D65_XYZ: Vec3 = mat3MulVec(M_SRGB_TO_XYZ, [1, 1, 1]);

const M_BRADFORD: Mat3 = [
    0.8951, 0.2664, -0.1614, -0.7502, 1.7135, 0.0367, 0.0389, -0.0685, 1.0296,
];

/** Bradford chromatic adaptation from illuminant E (XYZ = 1, 1, 1) to D65. */
export const M_BRADFORD_E_TO_D65: Mat3 = (() => {
    const cone = (w: Vec3): Vec3 => mat3MulVec(M_BRADFORD, w);
    const e = cone([1, 1, 1]),
        d = cone(WHITE_D65_XYZ);
    return mat3Mul(
        mat3Inverse(M_BRADFORD),
        mat3Mul(diag3([d[0] / e[0], d[1] / e[1], d[2] / e[2]]), M_BRADFORD),
    );
})();

/**
 * M_E→sRGB = M_XYZ→sRGB · M_Bradford(E→D65): maps the E-normalised CMF integral (1, 1, 1) of a flat spectrum to
 * display white (1, 1, 1) (§4.2.1; ≈ [[3.14666, −1.66646, −0.48019], [−0.99552, 1.95576, 0.03976],
 * [0.06359, −0.21456, 1.15097]]).
 */
export const M_E_TO_SRGB: Mat3 = mat3Mul(M_XYZ_TO_SRGB, M_BRADFORD_E_TO_D65);

/** Linear Display-P3 (D65) → CIE XYZ. */
export const M_P3_TO_XYZ: Mat3 = rgbToXyzMatrix(P3_PRIMARIES, D65_XY);
/** Linear sRGB → linear Display P3 (D65 both): [[0.822462, 0.177538, 0], [0.033194, 0.966806, 0], [0.017083, 0.072397, 0.910520]]. */
export const M_SRGB_TO_P3: Mat3 = mat3Mul(
    mat3Inverse(M_P3_TO_XYZ),
    M_SRGB_TO_XYZ,
);
/** Linear Display P3 → linear sRGB. */
export const M_P3_TO_SRGB: Mat3 = mat3Inverse(M_SRGB_TO_P3);

/** Luma weights as used by the shaders (LUMA_SRGB / LUMA_P3 in common.glsl, §4.2.1). */
export const LUMA_SRGB: Vec3 = [0.2126, 0.7152, 0.0722];
export const LUMA_P3: Vec3 = [0.229, 0.6917, 0.0793];

/** Luminance of a linear colour with the given luma weights (sRGB by default). */
export function luma(c: Vec3, w: Vec3 = LUMA_SRGB): number {
    return c[0] * w[0] + c[1] * w[1] + c[2] * w[2];
}

// ---------------------------------------------------------------------------------------------------------------
// Colour-matching functions in the working space.
// ---------------------------------------------------------------------------------------------------------------

/**
 * rgbCMF(λ) = M_E→sRGB · (x̄/I_x, ȳ/I_y, z̄/I_z)(λ) [nm⁻¹] (§4.2.1). ∫₃₆₀⁸³⁰ rgbCMF dλ = (1, 1, 1), so a flat spectrum
 * of unit radiance displays as white (1, 1, 1).
 */
export function rgbCmf(lambdaNm: number): Vec3 {
    const [x, y, z] = xyzBar(lambdaNm);
    return mat3MulVec(M_E_TO_SRGB, [
        x / CMF_INTEGRALS[0],
        y / CMF_INTEGRALS[1],
        z / CMF_INTEGRALS[2],
    ]);
}

/** rgbCMF at the shared grid nodes, interleaved (r, g, b) per node: RGBCMF_QUAD[3i + c]. */
export const RGBCMF_QUAD: Float64Array = (() => {
    const a = new Float64Array(3 * QUAD_N);
    for (let i = 0; i < QUAD_N; i++) {
        const c = rgbCmf(QUAD_LAMBDA[i]);
        a[3 * i] = c[0];
        a[3 * i + 1] = c[1];
        a[3 * i + 2] = c[2];
    }
    return a;
})();

/**
 * Luminance-preserving desaturation into the gamut (R02 §3.2/§3.7; CPU twin of common.glsl `gamutMapLuma`):
 * Y = luma·c; if min(c) < 0 then c ← Y + (c − Y)·Y/S with S = Y + ‖max(−c, 0)‖₁.₅; Y ≤ 0 maps to black. S equals the
 * hard projection's Y − min c while one channel is negative and rounds the corner where two are (no derivative cusp
 * where the clipped channel switches at a primary's hue); every channel stays ≥ 0, in-gamut colours are unchanged.
 */
export function gamutMapLuma(c: Vec3, lumaW: Vec3): Vec3 {
    const Y = c[0] * lumaW[0] + c[1] * lumaW[1] + c[2] * lumaW[2];
    const mn = Math.min(c[0], c[1], c[2]);
    if (Y <= 0) {
        return [0, 0, 0];
    }
    if (mn >= 0) {
        return [c[0], c[1], c[2]];
    }
    let n = 0;
    for (let i = 0; i < 3; i++) {
        const e = Math.max(-c[i], 0);
        n += e * Math.sqrt(e);
    }
    const k = Y / (Y + n ** (2 / 3));
    return [Y + (c[0] - Y) * k, Y + (c[1] - Y) * k, Y + (c[2] - Y) * k];
}

// ---------------------------------------------------------------------------------------------------------------
// CIELAB (D65), for the colour checks of §7 (S13, S14, Q15).
// ---------------------------------------------------------------------------------------------------------------

function labF(t: number): number {
    const e = 6 / 29;
    return t > e * e * e ? Math.cbrt(t) : t / (3 * e * e) + 4 / 29;
}

/** CIE XYZ → CIELAB relative to the D65 white of luminance 1 (white = linear sRGB (1, 1, 1)). */
export function xyzToLab(xyz: Vec3): Vec3 {
    const fx = labF(xyz[0] / WHITE_D65_XYZ[0]),
        fy = labF(xyz[1] / WHITE_D65_XYZ[1]),
        fz = labF(xyz[2] / WHITE_D65_XYZ[2]);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Linear sRGB (unbounded) → CIELAB (D65, white = (1, 1, 1)). */
export function linearSrgbToLab(c: Vec3): Vec3 {
    return xyzToLab(mat3MulVec(M_SRGB_TO_XYZ, c));
}

/** CIE 1976 colour difference ΔE*ab. */
export function deltaE76(a: Vec3, b: Vec3): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
