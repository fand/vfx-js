// Ported from holospot engine/spectral/tables.ts (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.
// Material- and SPD-convolved colour-matching tables, four-node spectral projection and environment bins
// (spec §4.2.3–4.2.5). Pure module (§6.1).
import type { Mat3, SpdId, Vec3 } from "../types.js";
import {
    mat3Inverse,
    QUAD_LAMBDA,
    QUAD_N,
    QUAD_STEP,
    QUAD_WEIGHT,
    RGBCMF_QUAD,
} from "./cmf.js";
import { smoothstep, spd } from "./spd.js";

// ---------------------------------------------------------------------------------------------------------------
// Table layout (§4.2.3). Texel i of a row is centred at λ = 301 + 2i nm (u = (λ − 300)/1024); row j holds
// σ_j = 0.5·2^(j/4) nm (v = (4·log2(clamp(σ, 0.5, 512)/0.5) + 0.5)/41); layer = SPD id in SPD_IDS order.
// Data index of (row j, texel i, channel c) = (j·512 + i)·4 + c, channels rgb + alpha = 1.
// ---------------------------------------------------------------------------------------------------------------

export const CMF_TABLE = {
    lambda0: 300,
    dLambda: 2,
    width: 512,
    rows: 41,
    layers: 5,
} as const;

/** σ_λ of table row j [nm]: 0.5·2^(j/4) (0.5–512 nm). */
export function sigmaOfRow(j: number): number {
    return 0.5 * 2 ** (j / 4);
}

/** Centre wavelength of texel i [nm]: 301 + 2i. */
export function texelLambda(i: number): number {
    return CMF_TABLE.lambda0 + CMF_TABLE.dLambda * (i + 0.5);
}

/** Fractional row coordinate addressed by the shader's cmfRow() (row centres at integers, 0–40). */
export function rowOfSigma(sigmaNm: number): number {
    return 4 * Math.log2(Math.min(Math.max(sigmaNm, 0.5), 512) / 0.5);
}

/**
 * CPU twin of the GLSL lookup `cmfConv`/`cmfCum` (bilinear, clamp-to-edge, LOD 0) on a table built by
 * `buildCmfLayer`: the value the GPU returns at (λ, σ) up to half-float rounding.
 */
export function sampleCmfTable(
    data: Float32Array,
    lambdaNm: number,
    sigmaNm: number,
): Vec3 {
    const W = CMF_TABLE.width,
        H = CMF_TABLE.rows;
    const x = (lambdaNm - CMF_TABLE.lambda0) / CMF_TABLE.dLambda - 0.5,
        y = rowOfSigma(sigmaNm);
    const x0 = Math.floor(x),
        y0 = Math.floor(y),
        fx = x - x0,
        fy = y - y0;
    const cx = (i: number): number => Math.min(Math.max(i, 0), W - 1),
        cy = (j: number): number => Math.min(Math.max(j, 0), H - 1);
    const i0 = cx(x0),
        i1 = cx(x0 + 1),
        j0 = cy(y0),
        j1 = cy(y0 + 1);
    const out: [number, number, number] = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
        const a =
            data[(j0 * W + i0) * 4 + c] * (1 - fx) +
            data[(j0 * W + i1) * 4 + c] * fx;
        const b =
            data[(j1 * W + i0) * 4 + c] * (1 - fx) +
            data[(j1 * W + i1) * 4 + c] * fx;
        out[c] = a * (1 - fy) + b * fy;
    }
    return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Normal CDF Φ and its integral Ψ(x) = ∫_{−∞}^{x} Φ(t) dt = x·Φ(x) + φ(x).
// ---------------------------------------------------------------------------------------------------------------

/** erfc(x), fractional error < 1.2·10⁻⁷ everywhere (Numerical Recipes `erfcc`, Chebyshev fit). */
function erfc(x: number): number {
    const z = Math.abs(x),
        t = 1 / (1 + 0.5 * z);
    const r =
        t *
        Math.exp(
            -z * z -
                1.26551223 +
                t *
                    (1.00002368 +
                        t *
                            (0.37409196 +
                                t *
                                    (0.09678418 +
                                        t *
                                            (-0.18628806 +
                                                t *
                                                    (0.27886807 +
                                                        t *
                                                            (-1.13520398 +
                                                                t *
                                                                    (1.48851587 +
                                                                        t *
                                                                            (-0.82215223 +
                                                                                t *
                                                                                    0.17087277)))))))),
        );
    return x >= 0 ? r : 2 - r;
}

/** Standard normal CDF Φ(x). */
export function normCdf(x: number): number {
    return 0.5 * erfc(-x * Math.SQRT1_2);
}

const INV_SQRT_2PI = 0.3989422804014327;

// ---------------------------------------------------------------------------------------------------------------
// buildCmfLayer
// ---------------------------------------------------------------------------------------------------------------

// All abscissae are on the 0.5 nm lattice: grid nodes 360 + 0.5·s, texel centres 301 + 2i, the lower limit 300 nm.
// Offsets are therefore integers n in units of U = 0.5 nm, and Φ(n·U/σ), Ψ(n·U/σ) are tabulated per row.
const U = QUAD_STEP; // 0.5 nm
const G0 = Math.round(360 / U); // first grid node in lattice units (720)
const C0 = Math.round(CMF_TABLE.lambda0 / U); // cumulative lower limit 300 nm (600)
const T0 = Math.round((CMF_TABLE.lambda0 + 0.5 * CMF_TABLE.dLambda) / U); // texel 0 centre 301 nm (602)
const TSTEP = Math.round(CMF_TABLE.dLambda / U); // texel spacing (4)
const NSUB = QUAD_N - 1; // 940 grid sub-intervals of 0.5 nm
const N_MIN = G0 - (T0 + TSTEP * (CMF_TABLE.width - 1)) - 32; // most negative offset needed (−1926 − margin)
const N_MAX = G0 + NSUB + 32 - C0 + 32; // most positive offset needed (≈ 1064 + margin)
const X_CUT = 6; // |x| beyond which Φ ∈ {0, 1}, Ψ ∈ {0, x} (errors ≤ 1e-9)

/**
 * Sub-intervals (of 0.5 nm) per bin for row j: bin width b = max(2^⌊log2(σ/8)⌋, 0.5) nm, so b/σ ≤ 1/8 wherever the
 * 0.5 nm grid allows (σ ≥ 4 nm), a kernel error ≤ (1/8)²/12 ≈ 0.1 % (about the half-float spacing of the stored
 * values). §4.2.3 recommends clamp(σ/4, 1, 8); that rule measured 0.24 % at σ = 45 nm.
 */
function binSubOfRow(j: number): number {
    return 2 ** Math.max(Math.floor(j / 4) - 4, -1) / U;
}

/** Scratch state of one layer build (all per-row arrays are reused across rows). */
interface LayerWork {
    gp: Float64Array; // prefix sums of the integrand's 0.5 nm trapezoid pieces, 3·(NSUB + 1)
    PHI: Float64Array; // Φ(n·U/σ) at lattice offsets n ∈ [N_MIN, N_MAX]
    SPSI: Float64Array; // σ·Ψ(n·U/σ)
    edge: Int32Array; // bin k spans the lattice interval [edge[k], edge[k + 1]]
    fb: Float64Array; // mean density F_k/b_k per bin, 3 channels
    mass: Float64Array; // σ·[Ψ((hi_k − 300)/σ) − Ψ((lo_k − 300)/σ)]: blurred share of bin k above 300 nm, × b_k
    pre: Float64Array; // prefix sums of fb·mass (full cumulative contribution of the bins below a window)
    acc: Float64Array; // 6 accumulators returned by texelSum
}

// The build is split into small functions on purpose: V8 (Node and Chrome) tiers small hot functions up within the
// first rows, which brings the cold first build (the one before the first frame, §1.5) from ≈ 90 ms to ≈ 40 ms.

/** Prefix sums of the trapezoid integrals of f = S·ρ·rgbCMF over the 0.5 nm grid pieces. */
function integrandPrefix(
    id: SpdId,
    rho: (l: number) => number,
    gp: Float64Array,
): void {
    let fr = 0,
        fg = 0,
        fbb = 0;
    for (let s = 0; s < QUAD_N; s++) {
        const l = QUAD_LAMBDA[s],
            k = spd(id, l) * rho(l);
        const r = k * RGBCMF_QUAD[3 * s],
            g = k * RGBCMF_QUAD[3 * s + 1],
            b = k * RGBCMF_QUAD[3 * s + 2];
        if (s > 0) {
            gp[3 * s] = gp[3 * s - 3] + 0.5 * U * (fr + r);
            gp[3 * s + 1] = gp[3 * s - 2] + 0.5 * U * (fg + g);
            gp[3 * s + 2] = gp[3 * s - 1] + 0.5 * U * (fbb + b);
        }
        fr = r;
        fg = g;
        fbb = b;
    }
}

/** Φ and σΨ at the integer lattice offsets of one row, with exact asymptotes beyond |x| > X_CUT. */
function fillRow(w: LayerWork, sigma: number): void {
    const { PHI, SPSI } = w,
        scale = U / sigma;
    for (let n = N_MIN; n <= N_MAX; n++) {
        const x = n * scale,
            t = n - N_MIN;
        if (x < -X_CUT) {
            PHI[t] = 0;
            SPSI[t] = 0;
        } else if (x > X_CUT) {
            PHI[t] = 1;
            SPSI[t] = sigma * x;
        } else {
            const P = normCdf(x);
            PHI[t] = P;
            SPSI[t] = sigma * (x * P + INV_SQRT_2PI * Math.exp(-0.5 * x * x));
        }
    }
}

/** Bins of one row: edges, densities, masses above 300 nm and their prefix sums. Returns the bin count. */
function binRow(w: LayerWork, sub: number): number {
    const { gp, edge, fb, mass, pre, SPSI } = w;
    const nb = Math.ceil(NSUB / sub);
    pre[0] = pre[1] = pre[2] = 0;
    edge[0] = G0;
    for (let k = 0; k < nb; k++) {
        const s0 = k * sub,
            s1 = Math.min(s0 + sub, NSUB),
            bk = (s1 - s0) * U; // the last bin ends at 830 nm
        edge[k + 1] = G0 + s1;
        for (let c = 0; c < 3; c++) {
            fb[3 * k + c] = (gp[3 * s1 + c] - gp[3 * s0 + c]) / bk;
        }
        const m = SPSI[edge[k + 1] - C0 - N_MIN] - SPSI[edge[k] - C0 - N_MIN];
        mass[k] = m;
        for (let c = 0; c < 3; c++) {
            pre[3 * (k + 1) + c] = pre[3 * k + c] + fb[3 * k + c] * m;
        }
    }
    return nb;
}

/** Window sums of one texel over bins kLo..kHi (consecutive bins share edges: hi_k = lo_{k+1}). */
function texelSum(w: LayerWork, kLo: number, kHi: number, off: number): void {
    const { edge, PHI, SPSI, mass, fb, acc } = w;
    let c0 = 0,
        c1 = 0,
        c2 = 0,
        s0 = 0,
        s1 = 0,
        s2 = 0;
    const t0 = edge[kLo] + off;
    let phiPrev = PHI[t0],
        psiPrev = SPSI[t0];
    for (let k = kLo; k <= kHi; k++) {
        const t = edge[k + 1] + off,
            phi = PHI[t],
            psi = SPSI[t];
        const dPhi = phi - phiPrev,
            dPsi = mass[k] - (psi - psiPrev);
        const r = fb[3 * k],
            g = fb[3 * k + 1],
            b = fb[3 * k + 2];
        c0 += r * dPhi;
        c1 += g * dPhi;
        c2 += b * dPhi;
        s0 += r * dPsi;
        s1 += g * dPsi;
        s2 += b * dPsi;
        phiPrev = phi;
        psiPrev = psi;
    }
    acc[0] = c0;
    acc[1] = c1;
    acc[2] = c2;
    acc[3] = s0;
    acc[4] = s1;
    acc[5] = s2;
}

/** All 512 texels of row j. Bins below a texel's window contribute their full mass to C (prefix sum), bins above none. */
function rowPass(
    w: LayerWork,
    j: number,
    sigma: number,
    sub: number,
    nb: number,
    conv: Float32Array,
    cum: Float32Array,
): void {
    const NW = CMF_TABLE.width,
        { pre, acc } = w;
    const wn = Math.ceil((X_CUT * sigma) / U) + 1; // window half-width in lattice units
    for (let i = 0; i < NW; i++) {
        const T = T0 + TSTEP * i;
        const kLo = Math.max(0, Math.ceil((T - wn - G0) / sub) - 1); // first bin with hi_k − T ≥ −wn
        const kHi = Math.min(nb - 1, Math.floor((T + wn - G0) / sub)); // last bin with lo_k − T ≤ wn
        const kp = Math.min(kLo, nb);
        let c0 = 0,
            c1 = 0,
            c2 = 0,
            s0 = pre[3 * kp],
            s1 = pre[3 * kp + 1],
            s2 = pre[3 * kp + 2];
        if (kLo <= kHi) {
            texelSum(w, kLo, kHi, -T - N_MIN);
            c0 = acc[0];
            c1 = acc[1];
            c2 = acc[2];
            s0 += acc[3];
            s1 += acc[4];
            s2 += acc[5];
        }
        const o = (j * NW + i) * 4;
        conv[o] = c0;
        conv[o + 1] = c1;
        conv[o + 2] = c2;
        conv[o + 3] = 1;
        cum[o] = s0;
        cum[o + 1] = s1;
        cum[o + 2] = s2;
        cum[o + 3] = 1;
    }
}

/**
 * Builds one SPD layer of the material spectral tables (§4.2.3) for the material factor ρ (= R_Al·T²_M):
 *   conv: Ĉ_s(λ, σ) = ∫ S_s·ρ·rgbCMF(λ′)·N(λ′; λ, σ) dλ′ [nm⁻¹] over λ′ ∈ [360, 830] nm,
 *   cum:  C_s(λ, σ) = ∫₃₀₀^λ Ĉ_s(λ″, σ) dλ″ (dimensionless),
 * as RGBA Float32Arrays of 512 × 41 texels, index (row·512 + texel)·4, alpha = 1.
 *
 * Method: the integrand is sampled on the shared 0.5 nm grid and trapezoid-integrated into bins of width b_j
 * (powers of two, `binSubOfRow`); each bin is treated as a constant density and its Gaussian blur is integrated in
 * closed form, Ĉ = Σ_k (F_k/b)·[Φ((hi_k − λ)/σ) − Φ((lo_k − λ)/σ)] and
 * C = Σ_k (F_k/b)·σ·[Ψ((hi_k − 300)/σ) − Ψ((lo_k − 300)/σ) − Ψ((hi_k − λ)/σ) + Ψ((lo_k − λ)/σ)], Ψ(x) = xΦ(x) + φ(x).
 * Both are exact for the binned integrand (no truncation or renormalisation error); binning perturbs the kernel by
 * O(b²/12) ≤ σ²/768 (σ ≥ 4 nm). C(λ, σ) → foilRgb for σ ≤ 32 nm (S7). ≈ 15–25 ms per layer in Node when warm
 * (S15), ≈ 40 ms cold.
 */
export function buildCmfLayer(
    id: SpdId,
    rho: (l: number) => number,
): { conv: Float32Array; cum: Float32Array } {
    const NW = CMF_TABLE.width,
        NR = CMF_TABLE.rows,
        nTab = N_MAX - N_MIN + 1;
    const conv = new Float32Array(NW * NR * 4),
        cum = new Float32Array(NW * NR * 4);
    const w: LayerWork = {
        gp: new Float64Array(3 * (NSUB + 1)),
        PHI: new Float64Array(nTab),
        SPSI: new Float64Array(nTab),
        edge: new Int32Array(NSUB + 1),
        fb: new Float64Array(3 * NSUB),
        mass: new Float64Array(NSUB),
        pre: new Float64Array(3 * (NSUB + 1)),
        acc: new Float64Array(6),
    };
    integrandPrefix(id, rho, w.gp);
    for (let j = 0; j < NR; j++) {
        const sigma = sigmaOfRow(j),
            sub = binSubOfRow(j);
        fillRow(w, sigma);
        const nb = binRow(w, sub);
        rowPass(w, j, sigma, sub, nb, conv, cum);
    }
    return { conv, cum };
}

// ---------------------------------------------------------------------------------------------------------------
// Four-node spectral projection (§4.2.4)
// ---------------------------------------------------------------------------------------------------------------

export const SPEC_NODES = [430, 510, 590, 670] as const;

/** Cubic Lagrange basis ℓ_k(clamp(λ, 400, 700)) on SPEC_NODES (Σ_k ℓ_k = 1). */
export function specBasis(lambdaNm: number): [number, number, number, number] {
    const x = Math.min(Math.max(lambdaNm, 400), 700);
    const n = SPEC_NODES;
    const l = (k: number): number => {
        let p = 1;
        for (let m = 0; m < 4; m++) {
            if (m !== k) {
                p *= (x - n[m]) / (n[k] - n[m]);
            }
        }
        return p;
    };
    return [l(0), l(1), l(2), l(3)];
}

/** ℓ_k at the shared grid nodes: SPEC_BASIS_QUAD[4i + k]. */
const SPEC_BASIS_QUAD: Float64Array = (() => {
    const a = new Float64Array(4 * QUAD_N);
    for (let i = 0; i < QUAD_N; i++) {
        a.set(specBasis(QUAD_LAMBDA[i]), 4 * i);
    }
    return a;
})();

/**
 * uSpecProj[s] (§4.2.4): M_s[c][k] = ∫₃₆₀⁸³⁰ S_s·ρ·rgbCMF_c·ℓ_k(clamp(λ, 400, 700)) dλ, as a column-major mat4 whose
 * column k is (M[0][k], M[1][k], M[2][k], 0): out[4k + c]. specProject(f) = (M·f).rgb; M·(1, 1, 1, 1) = foilRgb.
 */
export function buildSpecProj(
    id: SpdId,
    rho: (l: number) => number,
): Float32Array {
    const acc = new Float64Array(16);
    for (let i = 0; i < QUAD_N; i++) {
        const l = QUAD_LAMBDA[i],
            w = QUAD_WEIGHT[i] * spd(id, l) * rho(l);
        const r = w * RGBCMF_QUAD[3 * i],
            g = w * RGBCMF_QUAD[3 * i + 1],
            b = w * RGBCMF_QUAD[3 * i + 2];
        for (let k = 0; k < 4; k++) {
            const bk = SPEC_BASIS_QUAD[4 * i + k];
            acc[4 * k] += r * bk;
            acc[4 * k + 1] += g * bk;
            acc[4 * k + 2] += b * bk;
        }
    }
    const out = new Float32Array(16);
    for (let k = 0; k < 4; k++) {
        for (let c = 0; c < 3; c++) {
            out[4 * k + c] = acc[4 * k + c];
        }
    }
    return out;
}

/** CPU twin of GLSL `specProject(f, spd)` = (uSpecProj[spd]·f).rgb for a matrix from `buildSpecProj`. */
export function specProject(m: ArrayLike<number>, f: ArrayLike<number>): Vec3 {
    const o: [number, number, number] = [0, 0, 0];
    for (let k = 0; k < 4; k++) {
        for (let c = 0; c < 3; c++) {
            o[c] += m[4 * k + c] * f[k];
        }
    }
    return o;
}

// ---------------------------------------------------------------------------------------------------------------
// Environment bins (§4.2.5)
// ---------------------------------------------------------------------------------------------------------------

/** RGB → spectrum bases B = (B_r, B_g, B_b) at λ (R02 §4.3; a partition of unity). */
export function binBases(lambdaNm: number): Vec3 {
    const bb = 1 - smoothstep(480, 520, lambdaNm),
        br = smoothstep(570, 610, lambdaNm);
    return [br, 1 - br - bb, bb];
}

/**
 * Environment bin weights (§4.2.5) from layer 0 (equal energy): K bins with centres λ_j = 400 + (j + ½)·300/K and
 * width Δ = 300/K, the end bins extended to 300 and 1324 nm. W′_j = W_j·S⁻¹ with W_j[c][k] = w_j^ρ[c]·B_k(λ_j) and
 * S = Σ_j w_j ⊗ B(λ_j) from the untinted weights, so Σ_j W′_j = I for ρ ≡ 1 and the metal-and-dye colour otherwise.
 * W holds K column-major mat3 (W[9j + 3·col + row]), ready for THREE.Matrix3.fromArray(W, 9j).
 */
export function buildBins(
    K: 6 | 8,
    rho: (l: number) => number,
): { lambda: Float32Array; width: number; W: Float32Array } {
    const width = 300 / K;
    const lambda = new Float32Array(K);
    const w = new Float64Array(3 * K),
        wr = new Float64Array(3 * K);
    for (let j = 0; j < K; j++) {
        lambda[j] = 400 + (j + 0.5) * width;
    }
    // Trapezoid sub-intervals of the shared grid, each assigned to the bin containing its midpoint (the bin edges
    // 400 + j·Δ lie on the 0.5 nm grid for K = 6 and 8, so this is exact).
    for (let s = 0; s < QUAD_N - 1; s++) {
        const a = QUAD_LAMBDA[s],
            mid = a + 0.5 * QUAD_STEP;
        const j = Math.min(Math.max(Math.floor((mid - 400) / width), 0), K - 1);
        const ra = rho(a),
            rb = rho(a + QUAD_STEP);
        for (let c = 0; c < 3; c++) {
            const fa = RGBCMF_QUAD[3 * s + c],
                fbv = RGBCMF_QUAD[3 * s + 3 + c];
            w[3 * j + c] += 0.5 * QUAD_STEP * (fa + fbv);
            wr[3 * j + c] += 0.5 * QUAD_STEP * (ra * fa + rb * fbv);
        }
    }
    const B = Array.from(lambda, (l) => binBases(l));
    const S = new Array<number>(9).fill(0);
    for (let j = 0; j < K; j++) {
        for (let c = 0; c < 3; c++) {
            for (let k = 0; k < 3; k++) {
                S[3 * c + k] += w[3 * j + c] * B[j][k];
            }
        }
    }
    const Si = mat3Inverse(S as unknown as Mat3);
    const W = new Float32Array(9 * K);
    for (let j = 0; j < K; j++) {
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                // W′[row][col] = Σ_k W_j[row][k]·S⁻¹[k][col]
                let v = 0;
                for (let k = 0; k < 3; k++) {
                    v += wr[3 * j + row] * B[j][k] * Si[3 * k + col];
                }
                W[9 * j + 3 * col + row] = v;
            }
        }
    }
    return { lambda, width, W };
}
