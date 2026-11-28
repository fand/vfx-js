// Ported from holospot engine/physics/grating.ts (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.
// CPU twins of the grating maths (spec §4.4.1, R02 §2.2, §2.6, §5.3–5.4): Bessel series, scalar order efficiencies,
// dielectric Fresnel, TIR/internal-Fresnel recycling and the continuous per-node, per-family etaNorm uploaded as
// uEtaOrd / uEtaMir / uEtaEnv. Pure module (§6.1).

import { rAl, smoothstep, tintT2 } from "../spectral/spd.js";
import { SPEC_NODES } from "../spectral/tables.js";
import type { GratingSummary, LightSet, Mat3, Vec2, Vec3 } from "../types.js";
import { column, dot, normalize, sub } from "./geometry.js";

export { rAl };

// ---------------------------------------------------------------------------------------------------------------
// Scalar functions (twins of common.glsl / grating.glsl)
// ---------------------------------------------------------------------------------------------------------------

/**
 * J_m(x) by the 8-term power series Σ_{k=0}^{7} (−1)^k (x/2)^{2k+m} / (k!(k+m)!) (R02 §2.6; |error| < 4·10⁻⁵ for
 * x ≤ 4, < 1.4·10⁻³ at x = 5; Appendix A.3). Twin of GLSL `besselJ(int, float)`; negative m by J_{−m} = (−1)^m J_m.
 */
export function besselJ(m: number, x: number): number {
    const am = Math.abs(m),
        h = 0.5 * x;
    let term = 1;
    for (let i = 1; i <= am; i++) {
        term *= h / i; // h^m / m!
    }
    let s = term;
    const h2 = h * h;
    for (let k = 1; k < 8; k++) {
        term *= -h2 / (k * (k + am));
        s += term;
    }
    return m < 0 && (am & 1) === 1 ? -s : s;
}

/**
 * Scalar thin-phase efficiency of a buried sinusoid (§4.4.1): η_m = J_m²(Φ), Φ = π·n_c·h·(c_i′ + c_o′)/λ, with the
 * phase clamped at 5.5 like the GLSL `orderEff` (the series' range).
 */
export function orderEff(
    m: number,
    lambdaNm: number,
    depthNm: number,
    nc: number,
    ciIn: number,
    coIn: number,
): number {
    const x = Math.min(
        (Math.PI * nc * depthNm * (ciIn + coIn)) / lambdaNm,
        5.5,
    );
    const j = besselJ(m, x);
    return j * j;
}

/** Internal cosine of an air-side cosine c in a layer of index n_c parallel to the surface: √(1 − (1 − c²)/n_c²). */
export function cosInside(c: number, nc: number): number {
    return Math.sqrt(Math.max(1 - (1 - c * c) / (nc * nc), 0));
}

/** Exact unpolarised dielectric Fresnel reflectance, air → n_c, at air-side cosine c (R02 §2.6). */
export function fresnelDiel(c: number, nc: number): number {
    const ci = Math.min(Math.max(c, 0), 1),
        ct = cosInside(ci, nc);
    const rs = (ci - nc * ct) / (ci + nc * ct),
        rp = (nc * ci - ct) / (nc * ci + ct);
    return 0.5 * (rs * rs + rp * rp);
}

/** Piecewise-linear interpolation of a per-node vec4 at λ (nodes 430/510/590/670 nm), constant beyond the end nodes (twin of GLSL `etaAt`). */
export function etaAt(
    e: ArrayLike<number>,
    lambdaNm: number,
    offset = 0,
): number {
    const x = Math.min(Math.max((lambdaNm - 430) / 80, 0), 3);
    let s = 0;
    for (let k = 0; k < 4; k++) {
        s += e[offset + k] * Math.max(0, 1 - Math.abs(x - k));
    }
    return s;
}

/** Zeroth-order factor at the 4 spectral nodes without the flat part: f1_k = etaM_k·J₀²(Φ(λ_k)) (twin of GLSL `mirrorF1`). */
export function mirrorF1(
    depthNm: number,
    nc: number,
    ciIn: number,
    coIn: number,
    etaM: ArrayLike<number>,
): [number, number, number, number] {
    const f: [number, number, number, number] = [0, 0, 0, 0];
    for (let k = 0; k < 4; k++) {
        const j0 = besselJ(
            0,
            Math.min(
                (Math.PI * nc * depthNm * (ciIn + coIn)) / SPEC_NODES[k],
                5.5,
            ),
        );
        f[k] = etaM[k] * j0 * j0;
    }
    return f;
}

// ---------------------------------------------------------------------------------------------------------------
// Trapped weight τ(u) (§4.4.1)
// ---------------------------------------------------------------------------------------------------------------

/** Table domain and size of trapWeight (§4.4.1: 601 entries on [0, 1.6]). */
export const TRAP_TABLE = {
    uMax: 1.6,
    entries: 601,
    halfWindow: 0.03,
} as const;

const TRAP_CACHE = new Map<number, Float64Array>();

/** τ_raw(u): internal reflectance at the top surface of an order with tangential direction cosine u (TIR ⇒ 1). */
function trapRaw(u: number, nc: number): number {
    const a = Math.abs(u);
    return a >= 1 ? 1 : fresnelDiel(Math.sqrt(1 - a * a), nc); // Stokes: internal = external reflectance of the pair
}

function buildTrapTable(nc: number): Float64Array {
    // Running integral G(u) = ∫₀^u τ_raw on a fine grid with a node exactly at the √-cusp u = 1, then
    // τ(u) = [G(u + w) − G(u − w)] / 2w with G odd (τ_raw is even in u).
    const h = 5e-4,
        n = Math.round((TRAP_TABLE.uMax + 2 * TRAP_TABLE.halfWindow) / h) + 1; // a node at u = 1
    const G = new Float64Array(n);
    let prev = trapRaw(0, nc);
    for (let i = 1; i < n; i++) {
        const cur = trapRaw(i * h, nc);
        G[i] = G[i - 1] + 0.5 * h * (prev + cur);
        prev = cur;
    }
    const Gat = (u: number): number => {
        const a = Math.abs(u),
            x = a / h,
            i = Math.min(Math.floor(x), n - 2),
            f = x - i;
        const v = G[i] * (1 - f) + G[i + 1] * f;
        return u < 0 ? -v : v;
    };
    const N = TRAP_TABLE.entries,
        w = TRAP_TABLE.halfWindow;
    const tab = new Float64Array(N);
    for (let i = 0; i < N; i++) {
        const u = (TRAP_TABLE.uMax * i) / (N - 1);
        tab[i] = (Gat(u + w) - Gat(u - w)) / (2 * w);
    }
    return tab;
}

let lastTrapNc = NaN;
let lastTrapTab: Float64Array | null = null;

/** The τ table for an index (built on first use, then cached). */
function trapTable(nc: number): Float64Array {
    if (nc === lastTrapNc && lastTrapTab) {
        return lastTrapTab;
    }
    let tab = TRAP_CACHE.get(nc);
    if (!tab) {
        tab = buildTrapTable(nc);
        TRAP_CACHE.set(nc, tab);
    }
    lastTrapNc = nc;
    lastTrapTab = tab;
    return tab;
}

function trapLookup(tab: Float64Array, u: number): number {
    const N = TRAP_TABLE.entries;
    const x =
        (Math.min(Math.abs(u), TRAP_TABLE.uMax) / TRAP_TABLE.uMax) * (N - 1);
    const i = Math.min(Math.floor(x), N - 2),
        f = x - i;
    return tab[i] * (1 - f) + tab[i + 1] * f;
}

/**
 * τ(u) of §4.4.1: the internal reflectance at the lacquer/coat top surface, F_diel(√(1 − u²), n_c) for u < 1 and 1
 * in the TIR region, box-averaged over u ± 0.03 (the spread of direction cosines across the card). Tabulated once
 * per index (601 entries on [0, 1.6], linear interpolation; constant beyond 1.6). `nc` defaults to 1.5; the
 * optional argument keeps the physics right for the lacquer-index dial (1.4–1.7).
 */
export function trapWeight(u: number, nc = 1.5): number {
    return trapLookup(trapTable(nc), u);
}

// ---------------------------------------------------------------------------------------------------------------
// Renormalisation (§4.4.1)
// ---------------------------------------------------------------------------------------------------------------

export interface EtaInputs {
    lg: number;
    lt: number; // tangential direction cosines of the incident light in the grating frame (ĝ, t̂)
    ci: number; // air-side cosine of the incident light
    invD: number; // 1/pitch [nm⁻¹]
    depthNm: number; // sinusoid peak-to-valley depth [nm]
    nc: number; // index touching the relief
    lambdaNm: number; // vacuum wavelength [nm]
    R: number; // one round trip through metal and dye, R_Al(λ)·T²_M(λ)
    recycle: boolean; // TIR and internal-Fresnel recycling (false for M3 flakes)
}

/**
 * Continuous spectral renormalisation etaN (§4.4.1, R02 §5.3–5.4). Orders v_m = (mλ/d − l_g, −l_t) with
 * |v_m| < n_c contribute η_m = J_m²(Φ_m) (internal cosines of the incident and the order-m direction), weighted by
 * κ_m = smoothstep(n_c, n_c − 0.1, |v_m|); Σ = Σ κη, trapped T = Σ κη·τ(|v_m|), P = T/Σ;
 * etaN = 1/(Σ(1 − R·P)) with recycling, 1/Σ without.
 */
export function etaNormalization(o: EtaInputs): number {
    const { lg, lt, invD, depthNm, nc, lambdaNm, R } = o;
    const ciIn = cosInside(o.ci, nc),
        tab = trapTable(nc);
    const k = lambdaNm * invD; // spacing of the orders in q
    // every order with |m·k − l_g| < n_c (a degenerate pitch, k ≤ 0 or not finite, leaves only the mirror m = 0)
    const mMax =
        k > 1e-6 && Number.isFinite(k)
            ? Math.min(Math.floor((nc + Math.abs(lg)) / k) + 1, 4096)
            : 0;
    const lt2 = lt * lt,
        nc2 = nc * nc,
        phase = (Math.PI * nc * depthNm) / lambdaNm;
    let sum = 0,
        trap = 0;
    for (let m = -mMax; m <= mMax; m++) {
        const vx = m * k - lg,
            u2 = vx * vx + lt2;
        if (u2 >= nc2) {
            continue; // evanescent inside the lacquer
        }
        const u = Math.sqrt(u2);
        const kap = smoothstep(nc, nc - 0.1, u);
        if (kap <= 0) {
            continue;
        }
        const coIn = Math.sqrt(Math.max(1 - u2 / nc2, 0));
        const j = besselJ(m, Math.min(phase * (ciIn + coIn), 5.5)); // = orderEff(m, λ, h, n_c, c_i′, c_o′)
        const e = kap * j * j;
        sum += e;
        trap += e * trapLookup(tab, u);
    }
    if (!(sum > 1e-9)) {
        return 1; // unreachable for |l| < 1 (m = 0 always exits)
    }
    return o.recycle ? 1 / (sum - R * trap) : 1 / sum;
}

/** Round-trip reflectance R(λ) = R_Al(λ)·T²_M(λ) of a grating summary's metal and dye. */
function roundTrip(s: GratingSummary, lambdaNm: number): number {
    return rAl(lambdaNm) * tintT2(lambdaNm, s.tint);
}

/** etaN at the four spectral nodes for one frame ĝ = (gx, gy) (card plane), one pitch and one relief depth, written to
 *  out[off..off+3]. */
function etaNodes(
    s: GratingSummary,
    l: Vec2,
    gx: number,
    gy: number,
    pitchNm: number,
    depthNm: number,
    out: Float32Array | Float64Array,
    off: number,
): void {
    const lg = l.x * gx + l.y * gy,
        lt = -l.x * gy + l.y * gx; // t̂ = n × ĝ = (−g_y, g_x)
    const ci = Math.sqrt(Math.max(1 - (l.x * l.x + l.y * l.y), 0));
    for (let k = 0; k < 4; k++) {
        const lambdaNm = SPEC_NODES[k];
        out[off + k] = etaNormalization({
            lg,
            lt,
            ci,
            invD: 1 / pitchNm,
            depthNm,
            nc: s.nc,
            lambdaNm,
            R: roundTrip(s, lambdaNm),
            recycle: s.recycle,
        });
    }
}

/** Mean of etaN over the 8 orientations ψ_k = kπ/8 at one pitch and depth, written to out[off..off+3]. */
function etaOrientationMean(
    s: GratingSummary,
    l: Vec2,
    pitchNm: number,
    depthNm: number,
    out: Float32Array,
    off: number,
): void {
    const acc = new Float64Array(4),
        tmp = new Float64Array(4);
    for (let k = 0; k < 8; k++) {
        const psi = (k * Math.PI) / 8;
        etaNodes(s, l, Math.cos(psi), Math.sin(psi), pitchNm, depthNm, tmp, 0);
        for (let n = 0; n < 4; n++) {
            acc[n] += tmp[n] / 8;
        }
    }
    for (let n = 0; n < 4; n++) {
        out[off + n] = acc[n];
    }
}

/** Family pitch f (0–2) of a summary: M1 repeats its single pitch; M2 A/B/C; M3 min / mid / max. */
function familyPitch(s: GratingSummary, f: number): number {
    return s.pitchesNm[Math.min(f, s.pitchesNm.length - 1)];
}

/** Index of the middle family of a summary (M2 family B, M3 the harmonic-mean pitch, M1 its single family). */
function middleFamily(s: GratingSummary): number {
    return Math.floor(s.pitchesNm.length / 2);
}

/**
 * Relief depth of family f (addendum A2.3.2): `depthsNm[min(f, length − 1)]` when the summary lists per-family depths
 * (A2 Sky Sparkle: dots, haze, grating specks), else the shared `depthNm`. Without `depthsNm` every caller sees
 * exactly the previous value, so the etaNorm uploads are bit-identical to the single-depth code (test P18).
 */
export function familyDepth(s: GratingSummary, f: number): number {
    const d = s.depthsNm;
    return d && d.length > 0 ? d[Math.min(f, d.length - 1)] : s.depthNm;
}

/**
 * Per-light renormalisation (§4.4.1) from the card-frame direction cosines l of L and v of V at the card centre.
 * ord (12 = 3 families × 4 nodes, index 4f + k): frame ĝ = M1's actual grating vector, else ĝ ∥ q̂ = normalize(l + v)
 * (lit elements have ĝ ∥ q). mir (4): M1 its actual ĝ and pitch, else the mean over 8 orientations at the middle
 * family. Upload as uEtaOrd[3i + f] = ord[4f..4f+3], uEtaMir[i] = mir. Depths (A2.3.2): every order family uses its
 * own `familyDepth`; the mirror uses the depth of the family it is evaluated at (family 0 with `gAzimuthRad`, else
 * the middle family).
 */
export function etaForLight(
    s: GratingSummary,
    l: Vec2,
    v: Vec2,
): { ord: Float32Array; mir: Float32Array } {
    const ord = new Float32Array(12),
        mir = new Float32Array(4);
    let gx: number, gy: number;
    if (s.gAzimuthRad !== null) {
        gx = Math.cos(s.gAzimuthRad);
        gy = Math.sin(s.gAzimuthRad);
    } else {
        const qx = l.x + v.x,
            qy = l.y + v.y,
            r = Math.hypot(qx, qy),
            rl = Math.hypot(l.x, l.y);
        if (r > 1e-9) {
            gx = qx / r;
            gy = qy / r;
        } else if (rl > 1e-9) {
            gx = l.x / rl;
            gy = l.y / rl;
        } // mirror pose: any frame through l
        else {
            gx = 1;
            gy = 0;
        }
    }
    for (let f = 0; f < 3; f++) {
        etaNodes(
            s,
            l,
            gx,
            gy,
            familyPitch(s, f),
            familyDepth(s, f),
            ord,
            4 * f,
        );
    }
    if (s.gAzimuthRad !== null) {
        etaNodes(s, l, gx, gy, familyPitch(s, 0), familyDepth(s, 0), mir, 0);
    } else {
        const m = middleFamily(s);
        etaOrientationMean(s, l, familyPitch(s, m), familyDepth(s, m), mir, 0);
    }
    return { ord, mir };
}

/**
 * Environment renormalisation uEtaEnv (§4.4.1): etaN with the view's direction cosines v in place of l
 * (reciprocity), averaged over 8 orientations at the middle family; for M1's linear grating (gAzimuthRad set) its
 * actual ĝ is used instead of the orientation mean, as for its mirrors. Depth: that family's (A2.3.2).
 */
export function etaForEnv(s: GratingSummary, v: Vec2): Float32Array {
    const out = new Float32Array(4);
    if (s.gAzimuthRad !== null) {
        etaNodes(
            s,
            v,
            Math.cos(s.gAzimuthRad),
            Math.sin(s.gAzimuthRad),
            familyPitch(s, 0),
            familyDepth(s, 0),
            out,
            0,
        );
    } else {
        const m = middleFamily(s);
        etaOrientationMean(s, v, familyPitch(s, m), familyDepth(s, m), out, 0);
    }
    return out;
}

/**
 * The per-frame CPU work of §6.4 for FrameInputs.eta: for every light slot, l and v at the card centre in the card
 * frame (T, B) = columns 0 and 1 of cardRot, then etaForLight; disabled slots get the neutral value 1; env from V.
 * cardPos is the card centre in world metres (the origin, plus any flip lift).
 */
export function etaFrame(
    s: GratingSummary,
    lights: LightSet,
    cardRot: Mat3,
    camPos: Vec3,
    cardPos: Vec3 = [0, 0, 0],
): { ord: Float32Array; mir: Float32Array; env: Float32Array } {
    const T = column(cardRot, 0),
        B = column(cardRot, 1);
    const V = normalize(sub(camPos, cardPos));
    const v: Vec2 = { x: dot(V, T), y: dot(V, B) };
    const ord = new Float32Array(48).fill(1),
        mir = new Float32Array(16).fill(1);
    for (let i = 0; i < 4; i++) {
        if (lights.type[i] === 0) {
            continue;
        }
        const P: Vec3 = [
            lights.pos[3 * i],
            lights.pos[3 * i + 1],
            lights.pos[3 * i + 2],
        ];
        const L = normalize(sub(P, cardPos));
        const e = etaForLight(s, { x: dot(L, T), y: dot(L, B) }, v);
        ord.set(e.ord, 12 * i);
        mir.set(e.mir, 4 * i);
    }
    return { ord, mir, env: etaForEnv(s, v) };
}
