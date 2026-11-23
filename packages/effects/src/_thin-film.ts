// Thin-film interference of a soap film, baked once on the CPU into a
// small LUT: linear sRGB reflectance by film thickness and by the cosine
// of the angle of incidence. Pure module: no GL, Node-testable.
import {
    QUAD_LAMBDA,
    QUAD_N,
    QUAD_WEIGHT,
    RGBCMF_QUAD,
} from "./_holo/spectral/cmf.js";

/** Thickness at the LUT's right edge, in nm. */
export const THIN_FILM_THICKNESS_MAX = 1500;
/** LUT size: thickness along x, cos of the incident angle along y. */
export const THIN_FILM_LUT_W = 256;
export const THIN_FILM_LUT_H = 64;
/** Index of refraction of the soap film (water). */
export const THIN_FILM_IOR = 1.33;

// Wavelengths outside this range add nothing visible.
const LAMBDA_MIN = 380;
const LAMBDA_MAX = 780;
// Groups of this many quadrature nodes (0.5 nm each) are merged into
// one wavelength: 2 nm keeps the fringes of the thickest film resolved.
const LAMBDA_STRIDE = 4;

/**
 * The reflectance of an air / film / air layer, s and p averaged, at
 * the incident cosine `cosI` and the film phase `delta` (4π n d cosθt / λ):
 * the Airy sum of all the reflections inside the film. Both faces have
 * the same Fresnel amplitude with opposite signs (the π shift), so a
 * film that is much thinner than the light (delta → 0) is black.
 */
export function airyReflectance(
    cosI: number,
    delta: number,
    n = THIN_FILM_IOR,
): number {
    const { rs2, rp2 } = fresnelAmplitudes(cosI, n);
    const c = Math.cos(delta);
    return 0.5 * (airy(rs2, c) + airy(rp2, c));
}

function airy(r2: number, cosDelta: number): number {
    return (2 * r2 * (1 - cosDelta)) / (1 + r2 * r2 - 2 * r2 * cosDelta);
}

// Squared Fresnel amplitudes from air into the film, and cosθt.
function fresnelAmplitudes(
    cosI: number,
    n: number,
): { rs2: number; rp2: number; cosT: number } {
    const c = Math.min(Math.max(cosI, 0), 1);
    const sinT2 = (1 - c * c) / (n * n);
    const cosT = Math.sqrt(1 - sinT2);
    const rs = (c - n * cosT) / (c + n * cosT);
    const rp = (n * c - cosT) / (n * c + cosT);
    return { rs2: rs * rs, rp2: rp * rp, cosT };
}

let cached: Float32Array | null = null;

/**
 * The LUT, RGBA, `THIN_FILM_LUT_W` x `THIN_FILM_LUT_H`, rows bottom-up:
 * texel (i, j) is the film of thickness `(i + 0.5) / W * THICKNESS_MAX`
 * nm, seen at the incident cosine `(j + 0.5) / H`. rgb is linear sRGB
 * reflectance under a white (equal energy, displayed as D65) light, so a
 * perfect mirror would be (1, 1, 1); a is its luminance. Computed once
 * and shared.
 */
export function thinFilmLut(): Float32Array {
    if (!cached) {
        cached = bakeThinFilmLut();
    }
    return cached;
}

/** The LUT, computed afresh (see {@link thinFilmLut}). */
export function bakeThinFilmLut(
    w = THIN_FILM_LUT_W,
    h = THIN_FILM_LUT_H,
    n = THIN_FILM_IOR,
): Float32Array {
    // The quadrature merged into groups: one wavelength each, with the
    // summed weight of its nodes times the colour matching functions.
    const lambdas: number[] = [];
    const wr: number[] = [];
    const wg: number[] = [];
    const wb: number[] = [];
    for (let i0 = 0; i0 < QUAD_N; i0 += LAMBDA_STRIDE) {
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let sl = 0;
        let sw = 0;
        for (let i = i0; i < Math.min(i0 + LAMBDA_STRIDE, QUAD_N); i++) {
            const l = QUAD_LAMBDA[i];
            if (l < LAMBDA_MIN || l > LAMBDA_MAX) {
                continue;
            }
            const q = QUAD_WEIGHT[i];
            sr += q * RGBCMF_QUAD[3 * i];
            sg += q * RGBCMF_QUAD[3 * i + 1];
            sb += q * RGBCMF_QUAD[3 * i + 2];
            sl += q * l;
            sw += q;
        }
        if (sw > 0) {
            lambdas.push(sl / sw);
            wr.push(sr);
            wg.push(sg);
            wb.push(sb);
        }
    }
    // A flat spectrum of reflectance 1 shows as (1, 1, 1).
    const norm = (a: number[]) => {
        const s = a.reduce((x, y) => x + y, 0);
        return a.map((x) => x / s);
    };
    const nr = norm(wr);
    const ng = norm(wg);
    const nb = norm(wb);

    const out = new Float32Array(w * h * 4);
    const acc = new Float64Array(w * 3);
    const dStep = THIN_FILM_THICKNESS_MAX / w;
    for (let j = 0; j < h; j++) {
        const cosI = (j + 0.5) / h;
        const { rs2, rp2, cosT } = fresnelAmplitudes(cosI, n);
        acc.fill(0);
        for (let k = 0; k < lambdas.length; k++) {
            // delta grows linearly with the thickness: step it by
            // rotation instead of a cos per texel.
            const k0 = (4 * Math.PI * n * cosT) / lambdas[k];
            const d0 = k0 * 0.5 * dStep;
            const dd = k0 * dStep;
            const cd = Math.cos(dd);
            const sd = Math.sin(dd);
            let c = Math.cos(d0);
            let s = Math.sin(d0);
            for (let i = 0; i < w; i++) {
                const r = 0.5 * (airy(rs2, c) + airy(rp2, c));
                acc[i * 3] += nr[k] * r;
                acc[i * 3 + 1] += ng[k] * r;
                acc[i * 3 + 2] += nb[k] * r;
                const c2 = c * cd - s * sd;
                s = s * cd + c * sd;
                c = c2;
            }
        }
        for (let i = 0; i < w; i++) {
            const o = (j * w + i) * 4;
            // The matching functions dip below 0; so can a saturated
            // fringe, just out of gamut.
            const r = Math.max(acc[i * 3], 0);
            const g = Math.max(acc[i * 3 + 1], 0);
            const b = Math.max(acc[i * 3 + 2], 0);
            out[o] = r;
            out[o + 1] = g;
            out[o + 2] = b;
            out[o + 3] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }
    }
    return out;
}
