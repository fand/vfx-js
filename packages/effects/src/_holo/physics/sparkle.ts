// Ported from holospot engine/physics/sparkle.ts (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.
// CPU twin of the A2-1 Sky Sparkle microstructure (addendum A2.4.1, A2.4.7): the hash (pcg3d / rnd3 / gauss2 of
// common.glsl), the two jittered dot lattices and the sand lattice (glitterAxes / glitterOffset of glitter.glsl on an
// open object), the two-stage dot construction, the lobed outline, the analytic pixel coverage (glitterCovK /
// glitterCoverage), the shader's 3×3 / 5×5 search with the stage-1 reject, and the moment-matched sand element.
// Every function transcribes src/shaders/sparkle.glsl; the tests SP1–SP7 (tests/sparkle.test.ts) run against it.
// Pure module (spec §6.1): runtime imports of pure modules only, explicit `.ts` extensions, erasable syntax only.
//
// Units: card mm; slopes as tan (∇h); angles in rad; 1/pitch in nm⁻¹. "cell" = one lattice pitch.

import { PARAM_SPECS } from "../data/params.js";
import type {
    GratingSummary,
    ParamValues,
    SpdId,
    TintInputs,
    TintType,
    Vec3,
} from "../types.js";

const SPARKLE_SPECK_TYPES = ["dyed", "grating"] as const;

import { foilRgb, materialFactor } from "../spectral/spd.js";

const DEG = Math.PI / 180;

// ---------------------------------------------------------------------------------------------------------------
// Constants shared with sparkle.glsl
// ---------------------------------------------------------------------------------------------------------------

/** Dot layers (glitterAxes(0) at 0°, glitterAxes(1) at 37°); the sand lattice uses glitterAxes(2) (71°). */
export const SPARKLE_LAYERS = 2;
/** Full-width dot-centre jitter in cells (±0.4 cell per axis): neighbouring dots clump and merge as in the photo. */
export const SPARKLE_JITTER = 0.8;
/** Full-width sand-point jitter in cells (±0.5: fully jittered Worley points of the soft-Voronoi facet mosaic). */
export const SAND_JITTER = 1.0;
/** Minimum softness of the facet boundaries in cells (σ floor of the soft-Voronoi weights). */
export const SAND_SOFT = 0.22;
/** Hash salts: dot layer L hashes with seed ^ (L << 8) ^ SPARKLE_SALT; the stage-2 calls xor in the SALT_* values. */
export const SPARKLE_SALT = 0x51a2c3e0;
export const SAND_SALT = 0x5a9d11c7;
export const SALT_LOBE = 0x9e3779b9,
    SALT_ERR = 0x85ebca6b,
    SALT_TILT = 0xc2b2ae35,
    SALT_SAND_TILT = 0x27d4eb2f;
/** Dot micro-slope 0.15° (rad). */
export const SPARKLE_DOT_SIGS = 0.0026;
/** Stage-1 reject: a cell is skipped when its centre lies farther than reach + REJECT_SIGMAS·σ_maj from the pixel. */
export const REJECT_SIGMAS = 4.5;
/** The search grows from 3×3 to 5×5 cells per layer when the footprint's major-axis σ exceeds this × the pitch. */
export const SEARCH_WIDE = 0.25;
/** Pixel coverage below which a dot is ignored (glitterA's 1e-4). */
export const COVER_MIN = 1e-4;

// ---------------------------------------------------------------------------------------------------------------
// Hash (common.glsl twins)
// ---------------------------------------------------------------------------------------------------------------

/** pcg3d (Jarzynski & Olano 2020) on uint32 lanes, exactly as common.glsl. */
export function pcg3d(
    x0: number,
    y0: number,
    z0: number,
): [number, number, number] {
    let x = (Math.imul(x0 >>> 0, 1664525) + 1013904223) >>> 0;
    let y = (Math.imul(y0 >>> 0, 1664525) + 1013904223) >>> 0;
    let z = (Math.imul(z0 >>> 0, 1664525) + 1013904223) >>> 0;
    x = (x + Math.imul(y, z)) >>> 0;
    y = (y + Math.imul(z, x)) >>> 0;
    z = (z + Math.imul(x, y)) >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    y = (y ^ (y >>> 16)) >>> 0;
    z = (z ^ (z >>> 16)) >>> 0;
    x = (x + Math.imul(y, z)) >>> 0;
    y = (y + Math.imul(z, x)) >>> 0;
    z = (z + Math.imul(x, y)) >>> 0;
    return [x, y, z];
}

/** rnd3(ivec2 c, uint salt): three uniforms in [0, 1) from the top 24 bits. */
export function rnd3(
    cx: number,
    cy: number,
    salt: number,
): [number, number, number] {
    const h = pcg3d((cx + (1 << 20)) >>> 0, (cy + (1 << 20)) >>> 0, salt >>> 0);
    const k = 1 / 16777216;
    return [(h[0] >>> 8) * k, (h[1] >>> 8) * k, (h[2] >>> 8) * k];
}

/** Box–Muller gauss2(u) of common.glsl. */
export function gauss2(u0: number, u1: number): [number, number] {
    const r = Math.sqrt(-2 * Math.log(Math.max(u0, 1e-7)));
    return [r * Math.cos(2 * Math.PI * u1), r * Math.sin(2 * Math.PI * u1)];
}

// ---------------------------------------------------------------------------------------------------------------
// Lattices (glitter.glsl glitterAxes / glitterOffset on open objects: G = pitch·E, Gi = Eᵀ/pitch)
// ---------------------------------------------------------------------------------------------------------------

/** (cos, sin) of the lattice rotation of a layer: 0 → 0°, 1 → 37°, 2 → 71° (the sand lattice). */
export function latticeRot(layer: number): [number, number] {
    if (layer === 1) {
        return [0.79863551, 0.60181502];
    }
    if (layer === 2) {
        return [0.32556815, 0.94551858];
    }
    return [1, 0];
}
/** Lattice offset of a layer in cells, (0.371, 0.619)·layer. */
export function latticeOffset(layer: number): [number, number] {
    return [0.371 * layer, 0.619 * layer];
}
/** Lattice coordinates u = Eᵀp/pitch + o of a card point. */
export function toLattice(
    px: number,
    py: number,
    layer: number,
    pitch: number,
): [number, number] {
    const [c, s] = latticeRot(layer),
        [ox, oy] = latticeOffset(layer);
    return [(c * px + s * py) / pitch + ox, (-s * px + c * py) / pitch + oy];
}
/** Card point p = E(u − o)·pitch of lattice coordinates u. */
export function fromLattice(
    ux: number,
    uy: number,
    layer: number,
    pitch: number,
): [number, number] {
    const [c, s] = latticeRot(layer),
        [ox, oy] = latticeOffset(layer);
    const vx = (ux - ox) * pitch,
        vy = (uy - oy) * pitch;
    return [c * vx - s * vy, s * vx + c * vy];
}

// ---------------------------------------------------------------------------------------------------------------
// Geometry from the panel values
// ---------------------------------------------------------------------------------------------------------------

/** The dot-field inputs the shader receives (sparkle.ts `apply` uploads them as uniforms). */
export interface SparkleField {
    D: number; // mean dot diameter [mm]                 uDotD
    coverage: number; // union cover target C of the two layers (aligned dot sizes)
    irr: number; // irregularity                           uDotIrr
    cell: number; // lattice pitch [mm]                     uDotCell
    tilt: number; // RMS buried tilt per axis (tan)         uDotTilt
    sigTh: number; // RMS orientation error [rad]            uDotSigTh
    sigF: number; // RMS relative pitch error               uDotSigF
    invD: number; // 1/pitch [nm⁻¹]                         uDotInvD
    gDir: [number, number]; // aligned ĝ in card coordinates        uDotGDir
    speckShare: number; // share of dots that are specks (0..1)   uSpeckShare
    speckScale: number; // speck diameter / D                     uSpeckScale
    speckInvD: number; // grating specks: 1/pitch [nm⁻¹]         uSpeckInvD
    speckGrating: boolean; // speck type grating (else dyed)        uSpeckType
    seed: number; // uSeed (uint)
    sandCell: number; // sand-cell pitch [mm]                   uSandCell
    sandTilt: number; // RMS sand-cell tilt per axis (tan)      uSandTilt
    sandSigS: number; // intra-cell micro-slope RMS [rad]       uSandSigS
    matteSigS: number; // total matte micro-slope RMS [rad]      uMatteSigS
    sandSoft: number; // softness floor of the facet boundaries [cells] (SAND_SOFT in the shader)
}

// ---- Panel values (ParamValues keyed by ParamSpec.id; a missing or non-finite value falls back to its default)

const DEFAULTS = Object.fromEntries(
    PARAM_SPECS.filter((p) => p.id.startsWith("sparkle.")).map((p) => [
        p.id,
        p.default,
    ]),
) as ParamValues;
const TINT_TYPES: readonly TintType[] = ["clear", "longpass", "shortpass"];

/** Numeric value of `sparkle.<key>` (numbers or numeric strings), else its A2.4.8 default. */
export function sparkleNum(values: ParamValues, id: string): number {
    const v = values[id];
    const x =
        typeof v === "number"
            ? v
            : typeof v === "string" && v.trim() !== ""
              ? Number(v)
              : NaN;
    return Number.isFinite(x) ? x : (DEFAULTS[id] as number);
}
/** Select value of `id` if it is one of `allowed`, else `fallback`. */
export function sparklePick<T extends string>(
    values: ParamValues,
    id: string,
    allowed: readonly T[],
    fallback: T,
): T {
    const v = values[id];
    return typeof v === "string" && (allowed as readonly string[]).includes(v)
        ? (v as T)
        : fallback;
}
const clampN = (x: number, lo: number, hi: number) =>
    Math.min(Math.max(x, lo), hi);

/** The lacquer dye of the panel (default short-pass 600 / 90 nm, floor 0.5). */
export function sparkleTint(values: ParamValues): TintInputs {
    return {
        type: sparklePick(values, "sparkle.tint", TINT_TYPES, "shortpass"),
        edgeNm: sparkleNum(values, "sparkle.tintEdge"),
        widthNm: Math.max(sparkleNum(values, "sparkle.tintWidth"), 1e-3),
        floor: clampN(sparkleNum(values, "sparkle.tintFloor"), 0, 1),
    };
}

/** The speck dye (A2.4.1): double-pass T²_s(λ) = f_s + (1 − f_s)·exp(−½((λ − λ_s)/w_s)²). */
export interface SpeckDye {
    peakNm: number;
    widthNm: number;
    floor: number;
}
export function sparkleSpeckDye(values: ParamValues): SpeckDye {
    return {
        peakNm: sparkleNum(values, "sparkle.speckDyePeak"),
        widthNm: Math.max(sparkleNum(values, "sparkle.speckDyeWidth"), 1e-3),
        floor: clampN(sparkleNum(values, "sparkle.speckDyeFloor"), 0, 1),
    };
}
export function speckDyeT2(lambdaNm: number, d: SpeckDye): number {
    const x = (lambdaNm - d.peakNm) / d.widthNm;
    return d.floor + (1 - d.floor) * Math.exp(-0.5 * x * x);
}
/** uSpeckTint[k] = foilRgb(spd, ρ_M·T²_s) / foilRgb(spd, ρ_M) per channel (A2.4.7): exact for the zeroth order, whose
 *  lobe does not depend on λ. */
export function speckTintRatio(
    spd: SpdId,
    tint: TintInputs,
    dye: SpeckDye,
): Vec3 {
    const rho = materialFactor(tint);
    const a = foilRgb(spd, (l) => rho(l) * speckDyeT2(l, dye)),
        b = foilRgb(spd, rho);
    return [
        a[0] / Math.max(b[0], 1e-12),
        a[1] / Math.max(b[1], 1e-12),
        a[2] / Math.max(b[2], 1e-12),
    ];
}

/** A2.4.7 GratingSummary: three families, f = 0 the aligned dots, 1 the haze, 2 the grating specks (unused by the
 *  default dyed specks), each with its pitch and depth (A2.3.2); etaN in the aligned frame (gAzimuthRad = groove
 *  angle − 90°); recycling on (continuous metallised relief under the lacquer, as M1). */
export function sparkleGratingSummary(values: ParamValues): GratingSummary {
    const pitch = Math.max(sparkleNum(values, "sparkle.pitch"), 1);
    const depth = Math.max(sparkleNum(values, "sparkle.depth"), 0);
    return {
        pitchesNm: [
            pitch,
            pitch,
            Math.max(sparkleNum(values, "sparkle.speckPitch"), 1),
        ],
        depthsNm: [
            depth,
            Math.max(sparkleNum(values, "sparkle.hazeDepth"), 0),
            depth,
        ],
        depthNm: depth,
        nc: clampN(sparkleNum(values, "sparkle.nc"), 1.0001, 3),
        gAzimuthRad: (sparkleNum(values, "sparkle.grooveAngle") - 90) * DEG,
        recycle: true,
        tint: sparkleTint(values),
    };
}

/** The dot field of the panel values (the uniforms of sparkle.ts `apply`). */
export function sparkleFieldOf(values: ParamValues): SparkleField {
    const D = Math.max(sparkleNum(values, "sparkle.size"), 1) * 1e-3;
    const coverage = clampN(sparkleNum(values, "sparkle.coverage"), 0.01, 0.95);
    const irr = clampN(sparkleNum(values, "sparkle.irregularity"), 0, 1);
    const a = sparkleNum(values, "sparkle.grooveAngle") * DEG;
    const matte = Math.max(sparkleNum(values, "sparkle.matte"), 0.01);
    const sandTiltDeg = clampN(
        sparkleNum(values, "sparkle.sandTilt"),
        0,
        matte,
    );
    return {
        D,
        coverage,
        irr,
        cell: sparkleCellPitch(D, coverage, irr),
        tilt: Math.tan(clampN(sparkleNum(values, "sparkle.tilt"), 0, 80) * DEG),
        sigTh: Math.max(sparkleNum(values, "sparkle.orientJitter"), 0) * DEG,
        sigF: Math.max(sparkleNum(values, "sparkle.pitchJitter"), 0) / 100,
        invD: 1 / Math.max(sparkleNum(values, "sparkle.pitch"), 1),
        gDir: [Math.sin(a), -Math.cos(a)],
        speckShare: clampN(
            sparkleNum(values, "sparkle.speckShare") / 100,
            0,
            1,
        ),
        speckScale: clampN(sparkleNum(values, "sparkle.speckSize"), 0.05, 1),
        speckInvD: 1 / Math.max(sparkleNum(values, "sparkle.speckPitch"), 1),
        speckGrating:
            sparklePick(
                values,
                "sparkle.speckType",
                SPARKLE_SPECK_TYPES,
                "dyed",
            ) === "grating",
        seed: Math.max(Math.round(sparkleNum(values, "sparkle.seed")), 0) >>> 0,
        sandCell: Math.max(sparkleNum(values, "sparkle.sandSize"), 0.01) * D,
        sandTilt: Math.tan(sandTiltDeg * DEG),
        sandSigS:
            Math.sqrt(
                Math.max(
                    matte * matte - sandTiltDeg * sandTiltDeg,
                    0.25 * 0.25,
                ),
            ) * DEG,
        matteSigS: matte * DEG,
        sandSoft: SAND_SOFT,
    };
}

/** E[s²] of the aligned size factor s ~ U(1 ± 0.4·irr). */
export function sizeMoment(irr: number): number {
    const w = 0.8 * irr;
    return 1 + (w * w) / 12;
}
/** E[1 + (a₂² + a₃²)/2] of the outline lobes a ~ U(0, 0.15·irr): the area factor of a lobed dot. */
export function lobeAreaFactor(irr: number): number {
    const a = 0.15 * irr;
    return 1 + (a * a) / 3;
}
/** E[u²] of the speck size factor u ~ U(0.9, 1.1). */
export const SPECK_SIZE_MOMENT = 1 + 0.04 / 12;

/** Lattice pitch c = D·√((π/4)·E[s²]·E[lobe area]/c₁), c₁ = 1 − √(1 − C): single-layer cover c₁, union of the two
 *  layers C (A2.4.1; aligned dot sizes; the lobe factor, 1.0019 at irr 0.5, makes the cover exact). */
export function sparkleCellPitch(
    Dmm: number,
    coverage: number,
    irr: number,
): number {
    const C = Math.min(Math.max(coverage, 1e-4), 0.999);
    const c1 = 1 - Math.sqrt(1 - C);
    return (
        Dmm *
        Math.sqrt(((Math.PI / 4) * sizeMoment(irr) * lobeAreaFactor(irr)) / c1)
    );
}

/** Mean cover with the smaller specks: single layer c₁′, union C′ = 1 − (1 − c₁′)², and the speck share f_s of the
 *  covered area (the visible speck cover is f_s·C′). */
export function sparkleCoverMeans(
    f: Pick<SparkleField, "D" | "cell" | "irr" | "speckShare" | "speckScale">,
): { c1: number; union: number; speckArea: number } {
    const p = Math.min(Math.max(f.speckShare, 0), 1),
        S = f.speckScale;
    const aligned = (1 - p) * sizeMoment(f.irr),
        speck = p * S * S * SPECK_SIZE_MOMENT;
    const c1 = Math.min(
        ((Math.PI / 4) *
            f.D *
            f.D *
            lobeAreaFactor(f.irr) *
            (aligned + speck)) /
            (f.cell * f.cell),
        1,
    );
    return {
        c1,
        union: 1 - (1 - c1) * (1 - c1),
        speckArea: aligned + speck > 0 ? speck / (aligned + speck) : 0,
    };
}

// ---------------------------------------------------------------------------------------------------------------
// Dots (sparkle.glsl dotCore / dotFull / sdDot / dotArea)
// ---------------------------------------------------------------------------------------------------------------

export interface DotCore {
    layer: number;
    i: number;
    j: number;
    cx: number;
    cy: number; // centre [mm]
    sz: number; // aligned size factor
    sS: number; // speck size factor (× D)
    reach: number; // largest distance of the outline from the centre [mm] for either dot kind
}
export interface Dot extends DotCore {
    R: number; // outline radius [mm]
    lobe: [number, number, number, number]; // (a₂cos2φ₂, a₂sin2φ₂, a₃cos3φ₃, a₃sin3φ₃)
    sx: number;
    sy: number; // buried tilt slope
    gx: number;
    gy: number; // grating vector in card coordinates (unit)
    invD: number; // 1/pitch [nm⁻¹]
    speck: boolean;
    rr: number; // roulette value
}

/** The hash salt of dot layer `layer`. */
export function dotSalt(seed: number, layer: number): number {
    return ((seed >>> 0) ^ (layer << 8) ^ SPARKLE_SALT) >>> 0;
}

/** Stage 1: centre jitter and size factor of cell (i, j) of `layer` (one rnd3). */
export function dotCore(
    f: SparkleField,
    layer: number,
    i: number,
    j: number,
): DotCore {
    const a = rnd3(i, j, dotSalt(f.seed, layer));
    const [cx, cy] = fromLattice(
        i + 0.5 + SPARKLE_JITTER * (a[0] - 0.5),
        j + 0.5 + SPARKLE_JITTER * (a[1] - 0.5),
        layer,
        f.cell,
    );
    const sz = 1 + 0.4 * f.irr * (2 * a[2] - 1);
    const sS = f.speckScale * (0.9 + 0.2 * a[2]);
    return {
        layer,
        i,
        j,
        cx,
        cy,
        sz,
        sS,
        reach: 0.5 * f.D * Math.max(sz, sS) * (1 + 0.3 * f.irr),
    };
}

/** Stage 2: lobes, orientation and pitch error, tilt, speck flag and roulette value (three more rnd3). */
export function dotFull(f: SparkleField, k: DotCore): Dot {
    const salt = dotSalt(f.seed, k.layer);
    const b = rnd3(k.i, k.j, (salt ^ SALT_LOBE) >>> 0);
    const e = rnd3(k.i, k.j, (salt ^ SALT_ERR) >>> 0);
    const t = rnd3(k.i, k.j, (salt ^ SALT_TILT) >>> 0);
    const p = f.speckShare;
    const speck = t[2] < p;
    const rr = speck
        ? t[2] / Math.max(p, 1e-6)
        : (t[2] - p) / Math.max(1 - p, 1e-6);
    const a2 = 0.15 * f.irr * b[0],
        ph2 = 2 * Math.PI * b[1],
        a3 = 0.15 * f.irr * b[2],
        ph3 = 2 * Math.PI * e[0];
    const lobe: [number, number, number, number] = [
        a2 * Math.cos(2 * ph2),
        a2 * Math.sin(2 * ph2),
        a3 * Math.cos(3 * ph3),
        a3 * Math.sin(3 * ph3),
    ];
    const [tx, ty] = gauss2(t[0], t[1]);
    let gx: number, gy: number, invD: number;
    if (speck && f.speckGrating) {
        const th = Math.PI * e[1];
        gx = Math.cos(th);
        gy = Math.sin(th);
        invD = f.speckInvD;
    } else {
        const [n0, n1] = gauss2(e[1], e[2]);
        const d = f.sigTh * n0,
            c = Math.cos(d),
            s = Math.sin(d);
        gx = c * f.gDir[0] - s * f.gDir[1];
        gy = s * f.gDir[0] + c * f.gDir[1];
        invD = f.invD / Math.max(1 + f.sigF * n1, 0.5);
    }
    return {
        ...k,
        R: 0.5 * f.D * (speck ? k.sS : k.sz),
        lobe,
        sx: f.tilt * tx,
        sy: f.tilt * ty,
        gx,
        gy,
        invD,
        speck,
        rr,
    };
}

/** |dl| − r(φ) with r(φ) = R(1 + a₂cos2(φ − φ₂) + a₃cos3(φ − φ₃)) [mm] (negative inside), without atan. */
export function sdDot(
    dx: number,
    dy: number,
    d: Pick<Dot, "R" | "lobe">,
): number {
    const l = Math.hypot(dx, dy);
    const ux = l > 1e-9 ? dx / l : 1,
        uy = l > 1e-9 ? dy / l : 0;
    const c2 = ux * ux - uy * uy,
        s2 = 2 * ux * uy,
        c3 = ux * c2 - uy * s2,
        s3 = uy * c2 + ux * s2;
    return (
        l -
        d.R *
            (1 +
                d.lobe[0] * c2 +
                d.lobe[1] * s2 +
                d.lobe[2] * c3 +
                d.lobe[3] * s3)
    );
}
/** Outline area πR²(1 + (a₂² + a₃²)/2) [mm²]. */
export function dotArea(d: Pick<Dot, "R" | "lobe">): number {
    const a2 = d.lobe[0] * d.lobe[0] + d.lobe[1] * d.lobe[1],
        a3 = d.lobe[2] * d.lobe[2] + d.lobe[3] * d.lobe[3];
    return Math.PI * d.R * d.R * (1 + 0.5 * (a2 + a3));
}

/** The dots of both layers whose outline contains the point (exact geometry, no footprint): front layer first. */
export function dotsAt(f: SparkleField, px: number, py: number): Dot[] {
    const out: Dot[] = [];
    for (let L = 0; L < SPARKLE_LAYERS; L++) {
        const [ux, uy] = toLattice(px, py, L, f.cell);
        const i0 = Math.floor(ux),
            j0 = Math.floor(uy);
        for (let j = j0 - 2; j <= j0 + 2; j++) {
            for (let i = i0 - 2; i <= i0 + 2; i++) {
                const k = dotCore(f, L, i, j);
                if (Math.hypot(px - k.cx, py - k.cy) > k.reach) {
                    continue;
                }
                const d = dotFull(f, k);
                if (sdDot(px - d.cx, py - d.cy, d) < 0) {
                    out.push(d);
                }
            }
        }
    }
    return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Footprint and coverage (relief.glsl footprintOf, glitter.glsl glitterCovK / glitterCoverage)
// ---------------------------------------------------------------------------------------------------------------

export interface Footprint {
    S: [number, number, number];
    area: number;
    sMaj: number;
    sMin: number;
    eMaj: [number, number];
}

/** footprintOf() from the pixel's mm derivatives (dFdx(p), dFdy(p)): box pixel → Gaussian σ² = px²/2π, anisotropy
 *  clamp 16. */
export function footprintOf(
    dx: [number, number],
    dy: [number, number],
): Footprint {
    const k = 1 / (2 * Math.PI);
    const a = k * (dx[0] * dx[0] + dy[0] * dy[0]),
        b = k * (dx[0] * dx[1] + dy[0] * dy[1]),
        c = k * (dx[1] * dx[1] + dy[1] * dy[1]);
    const m = 0.5 * (a + c),
        r = Math.sqrt(Math.max(m * m - (a * c - b * b), 0));
    const l1 = m + r,
        l2 = Math.max(m - r, l1 / 256);
    let e: [number, number] =
        Math.abs(b) > 1e-20 ? [l1 - c, b] : a >= c ? [1, 0] : [0, 1];
    const n = Math.hypot(e[0], e[1]);
    e = [e[0] / n, e[1] / n];
    const f: [number, number] = [-e[1], e[0]];
    return {
        S: [
            l1 * e[0] * e[0] + l2 * f[0] * f[0],
            l1 * e[0] * e[1] + l2 * f[0] * f[1],
            l1 * e[1] * e[1] + l2 * f[1] * f[1],
        ],
        area: Math.abs(dx[0] * dy[1] - dx[1] * dy[0]),
        sMaj: Math.sqrt(l1),
        sMin: Math.sqrt(l2),
        eMaj: e,
    };
}
/** An isotropic footprint of RMS σ per axis [mm] (a square pixel of side σ·√(2π)). */
export function isoFootprint(sigma: number): Footprint {
    const px = sigma * Math.sqrt(2 * Math.PI);
    return footprintOf([px, 0], [0, px]);
}
/** √(½ tr S): the RMS footprint std of the search rule. */
export function footprintRms(F: Footprint): number {
    return Math.sqrt(0.5 * (F.S[0] + F.S[2]));
}

export interface CovK {
    SI: [number, number, number];
    nrm: number;
    kSz: number;
}
/** glitterCovK(F, D, area): point-like coverage area·N(Δ; Σ_px + D²/16) and its blend weight to the SDF ramp. */
export function covK(F: Footprint, D: number, area: number): CovK {
    const a = F.S[0] + (D * D) / 16,
        b = F.S[1],
        c = F.S[2] + (D * D) / 16,
        det = Math.max(a * c - b * b, 1e-30);
    const t = Math.min(
        Math.max(((0.5 * D) / Math.max(F.sMin, 1e-9) - 0.5) / 1.5, 0),
        1,
    );
    return {
        SI: [c / det, -b / det, a / det],
        nrm: area / (2 * Math.PI * Math.sqrt(det)),
        kSz: t * t * (3 - 2 * t),
    };
}
/** glitterCoverage(k, F, dl, sd): blend of the point-like and the resolved (SDF ramp) coverage. */
export function coverage(
    k: CovK,
    F: Footprint,
    dx: number,
    dy: number,
    sd: number,
): number {
    const cPt = Math.min(
        k.nrm *
            Math.exp(
                -0.5 *
                    (k.SI[0] * dx * dx +
                        2 * k.SI[1] * dx * dy +
                        k.SI[2] * dy * dy),
            ),
        1,
    );
    const l = Math.hypot(dx, dy);
    const n: [number, number] = l > 1e-9 ? [dx / l, dy / l] : F.eMaj;
    const sN = Math.sqrt(
        Math.max(
            n[0] * n[0] * F.S[0] +
                2 * n[0] * n[1] * F.S[1] +
                n[1] * n[1] * F.S[2],
            1e-14,
        ),
    );
    const cSd = Math.min(Math.max(0.5 - sd / (2.5 * sN), 0), 1);
    return cPt + (cSd - cPt) * k.kSz;
}

/** The two coverage kernels of a layer: aligned dots from the mean D, specks from uSpeckScale·D. */
export function dotCovKs(
    f: SparkleField,
    F: Footprint,
): { dot: CovK; speck: CovK } {
    const Ds = f.speckScale * f.D;
    return {
        dot: covK(
            F,
            f.D,
            (Math.PI / 4) *
                f.D *
                f.D *
                sizeMoment(f.irr) *
                lobeAreaFactor(f.irr),
        ),
        speck: covK(
            F,
            Ds,
            (Math.PI / 4) * Ds * Ds * SPECK_SIZE_MOMENT * lobeAreaFactor(f.irr),
        ),
    };
}

export interface FoundDot {
    dot: Dot;
    c: number;
}

/** Search radius of the shader's rule: 1 (3×3 cells) or 2 (5×5) per layer, the same on every tier. */
export function searchRadius(f: SparkleField, F: Footprint): number {
    return F.sMaj > SEARCH_WIDE * f.cell ? 2 : 1;
}
/** Regime-C weight w_C of the main: the dots per pixel N_fp = 2·F.area/c² and the footprint's major axis. */
export function regimeC(f: SparkleField, F: Footprint): number {
    const ss = (a: number, b: number, x: number) => {
        const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
        return t * t * (3 - 2 * t);
    };
    return Math.max(
        ss(1.5, 6, (2 * F.area) / (f.cell * f.cell)),
        ss(0.35, 0.5, F.sMaj / f.cell),
    );
}

/**
 * The dots sparkleA evaluates at pixel p of footprint F in `layer`, with their coverage: the 3×3 / 5×5 block of cells
 * around p, stage 1 for every cell (reject when |dl| > reach + REJECT_SIGMAS·σ_maj), stage 2 and the coverage for the
 * survivors, kept when c ≥ COVER_MIN. `radius` overrides the rule (brute force: 3 → 7×7).
 */
export function searchLayer(
    f: SparkleField,
    F: Footprint,
    px: number,
    py: number,
    layer: number,
    radius?: number,
    reject = true,
): FoundDot[] {
    const R = radius ?? searchRadius(f, F);
    const [ux, uy] = toLattice(px, py, layer, f.cell);
    const i0 = Math.floor(ux) - R,
        j0 = Math.floor(uy) - R,
        n = 2 * R + 1;
    const K = dotCovKs(f, F);
    const out: FoundDot[] = [];
    for (let jj = 0; jj < n; jj++) {
        for (let ii = 0; ii < n; ii++) {
            const k = dotCore(f, layer, i0 + ii, j0 + jj);
            const dx = px - k.cx,
                dy = py - k.cy;
            if (
                reject &&
                Math.hypot(dx, dy) > k.reach + REJECT_SIGMAS * F.sMaj
            ) {
                continue;
            }
            const d = dotFull(f, k);
            const c = coverage(
                d.speck ? K.speck : K.dot,
                F,
                dx,
                dy,
                sdDot(dx, dy, d),
            );
            if (c >= COVER_MIN) {
                out.push({ dot: d, c });
            }
        }
    }
    return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Lit fractions (A2.4.2 lobe model; SP3): every dot of the card under one light at the reference geometry
// ---------------------------------------------------------------------------------------------------------------

export interface LitLight {
    pad: [number, number];
    distanceM: number;
    sizeDeg: number;
}
export interface LitResult {
    aligned: number;
    alignedN: number; // share of aligned dots lit (w > 0.5 and 400 ≤ λ₁ ≤ 700 nm), count
    centre: number;
    centreN: number; // the same within |q_t| < 0.05 of the aligned frame (band centre)
    specks: number;
    specksN: number; // grating specks lit (speckGrating), count
}

/**
 * The A2.4.2 lobe model over every dot of a 63 × 88 mm card at rest (camera at (0, 0, camZ), the front face at
 * z = 0.15 mm): per dot, q = (L + V)ₜ at its centre, the buried shift s′·s of its tilt (s′ = n_c(c_i′ + c_o′)), its own
 * ĝ and pitch; along-groove variance ½·tan²(size/2) (the light) + (s′τ_dome)² + (0.242/D_µm)² (aperture) + fan²
 * (aligned dots only); lit when exp(−½q_t²/σ_t²) > 0.5 and 400 ≤ d·|q_g| ≤ 700 nm.
 */
export function sparkleLitFractions(
    f: SparkleField,
    light: LitLight,
    o: { domeRad: number; fanQ: number; nc: number; camZ: number },
): LitResult {
    const [pdx, pdy] = light.pad,
        pr = Math.hypot(pdx, pdy);
    const lz = Math.sqrt(Math.max(1 - pr * pr, 0));
    const Lp = [
        pdx * light.distanceM,
        pdy * light.distanceM,
        lz * light.distanceM,
    ];
    const sa = Math.tan(0.5 * light.sizeDeg * DEG),
        foot = 0.5 * sa * sa;
    const cin = (c: number) =>
        Math.sqrt(Math.max(1 - (1 - c * c) / (o.nc * o.nc), 0));
    const t0x = -f.gDir[1],
        t0y = f.gDir[0];
    const r: LitResult = {
        aligned: 0,
        alignedN: 0,
        centre: 0,
        centreN: 0,
        specks: 0,
        specksN: 0,
    };
    for (let L = 0; L < SPARKLE_LAYERS; L++) {
        // lattice cells whose centres can fall on the card
        const corners = [
            [0, 0],
            [63, 0],
            [0, 88],
            [63, 88],
        ].map(([x, y]) => toLattice(x, y, L, f.cell));
        const i0 = Math.floor(Math.min(...corners.map((c) => c[0]))) - 1,
            i1 = Math.ceil(Math.max(...corners.map((c) => c[0]))) + 1;
        const j0 = Math.floor(Math.min(...corners.map((c) => c[1]))) - 1,
            j1 = Math.ceil(Math.max(...corners.map((c) => c[1]))) + 1;
        for (let j = j0; j <= j1; j++) {
            for (let i = i0; i <= i1; i++) {
                const k = dotCore(f, L, i, j);
                if (k.cx < 0 || k.cx > 63 || k.cy < 0 || k.cy > 88) {
                    continue;
                }
                const d = dotFull(f, k);
                const X = [(d.cx - 31.5) / 1000, (d.cy - 44) / 1000, 0.00015];
                const lv = [Lp[0] - X[0], Lp[1] - X[1], Lp[2] - X[2]],
                    ll = Math.hypot(lv[0], lv[1], lv[2]);
                const vv = [-X[0], -X[1], o.camZ - X[2]],
                    vl = Math.hypot(vv[0], vv[1], vv[2]);
                const Lx = lv[0] / ll,
                    Ly = lv[1] / ll,
                    Lz = lv[2] / ll,
                    Vx = vv[0] / vl,
                    Vy = vv[1] / vl,
                    Vz = vv[2] / vl;
                const qx = Lx + Vx,
                    qy = Ly + Vy,
                    sp = o.nc * (cin(Lz) + cin(Vz));
                const qqx = qx + sp * d.sx,
                    qqy = qy + sp * d.sy;
                const qg = qqx * d.gx + qqy * d.gy,
                    qt = -qqx * d.gy + qqy * d.gx;
                const grating = d.speck && f.speckGrating;
                if (d.speck && !grating) {
                    continue; // dyed specks do not diffract
                }
                const st2 =
                    foot +
                    (sp * o.domeRad) ** 2 +
                    (0.242 / Math.max(2 * d.R * 1000, 1)) ** 2 +
                    (grating ? 0 : o.fanQ * o.fanQ);
                const lam = Math.abs(qg) / d.invD;
                const lit =
                    Math.exp((-0.5 * qt * qt) / st2) > 0.5 &&
                    lam >= 400 &&
                    lam <= 700;
                if (grating) {
                    r.specksN++;
                    if (lit) {
                        r.specks++;
                    }
                    continue;
                }
                r.alignedN++;
                if (lit) {
                    r.aligned++;
                }
                if (Math.abs(qx * t0x + qy * t0y) < 0.05) {
                    r.centreN++;
                    if (lit) {
                        r.centre++;
                    }
                }
            }
        }
    }
    r.aligned /= Math.max(r.alignedN, 1);
    r.centre /= Math.max(r.centreN, 1);
    r.specks /= Math.max(r.specksN, 1);
    return r;
}

// ---------------------------------------------------------------------------------------------------------------
// Sand-matte base (sparkle.glsl sparkleSandElem): a soft-Voronoi mosaic of tilted micro-facets, moment-matched into
// one lobe per pixel
// ---------------------------------------------------------------------------------------------------------------

/** The hash salt of the sand lattice. */
export function sandSalt(seed: number): number {
    return ((seed >>> 0) ^ SAND_SALT) >>> 0;
}
/** Worley point of sand cell (i, j) (fully jittered, one rnd3) [mm]. */
export function sandPoint(
    f: SparkleField,
    i: number,
    j: number,
): [number, number] {
    const a = rnd3(i, j, sandSalt(f.seed));
    return fromLattice(
        i + 0.5 + SAND_JITTER * (a[0] - 0.5),
        j + 0.5 + SAND_JITTER * (a[1] - 0.5),
        2,
        f.sandCell,
    );
}
/** Radial clamp of the sand-facet tilt in units of σ, and the factor 1/√(E[min(r, c)²]/2) (standard Rayleigh r) that
 *  keeps the RMS per axis at uSandTilt: embossed facets have bounded slopes, and the Gaussian tail (≈ 0.25 % beyond
 *  20° at the default 6°) reflected inside the lacquer past the critical angle (black TIR pits). */
export const SAND_TILT_CLAMP = 2.5;
export const SAND_TILT_NORM = 1.02272;
/** E[min(r, c)²] of a standard 2D normal radius r: 2(1 − e^{−c²/2}(1 + c²/2)) + c²e^{−c²/2}. */
export function clampedRayleighMoment(c: number): number {
    const e = Math.exp(-0.5 * c * c);
    return 2 * (1 - e * (1 + 0.5 * c * c)) + c * c * e;
}
/** Buried tilt slope of the facet of sand cell (i, j): uSandTilt·SAND_TILT_NORM·gauss2, clamped radially at
 *  SAND_TILT_CLAMP·σ (one more rnd3; sparkle.glsl sandTiltAt). */
export function sandTiltOf(
    f: SparkleField,
    i: number,
    j: number,
): [number, number] {
    const t = rnd3(i, j, (sandSalt(f.seed) ^ SALT_SAND_TILT) >>> 0);
    const [gx, gy] = gauss2(t[0], t[1]);
    const k =
        f.sandTilt *
        SAND_TILT_NORM *
        Math.min(1, SAND_TILT_CLAMP / Math.max(Math.hypot(gx, gy), 1e-6));
    return [k * gx, k * gy];
}

export interface SandElem {
    s: [number, number]; // mean buried slope (the element normal's tilt)
    sigS: number; // isotropic micro-slope RMS [rad]
    SgA: [number, number, number]; // anisotropic slope covariance on top of sigS² (symmetric 2×2: xx, xy, yy)
    cover: number; // Σw_k = 1 − w_S (0 = the plain matte lobe)
    wS: number; // hand-over weight smoothstep(1.5, 6, N_s)
    facet: [number, number]; // cell (i, j) of the nearest facet
}

/**
 * The moment-matched sand element at p: the three nearest facets of the 3×3 cells around p, weights
 * w_k/w_0 = exp(−1.702·x_k/σ_k) (logistic area fraction beyond the bisector of facets 0 and k at distance x_k, σ_k² the
 * footprint variance across it + (sandSoft·c)²), Σw = 1 − w_S;
 * mean slope s̄ = Σw_k s_k; covariance uSandSigS²·I + w_S·(uMatteSigS² − uSandSigS²)·I + Σw_k s_k s_kᵀ − s̄s̄ᵀ (the
 * plain matte lobe takes w_S, so the element is exactly the matte lobe at w_S = 1 and the mean is unbiased for every
 * footprint).
 */
export function sandElem(
    f: SparkleField,
    F: Footprint,
    px: number,
    py: number,
): SandElem {
    const Ns = F.area / (f.sandCell * f.sandCell);
    const t = Math.min(Math.max((Ns - 1.5) / 4.5, 0), 1),
        wS = t * t * (3 - 2 * t);
    const rem = Math.max(
        f.matteSigS * f.matteSigS - f.sandSigS * f.sandSigS,
        0,
    );
    if (wS >= 1) {
        return {
            s: [0, 0],
            sigS: Math.sqrt(f.sandSigS * f.sandSigS + rem),
            SgA: [0, 0, 0],
            cover: 0,
            wS,
            facet: [0, 0],
        };
    }
    const [ux, uy] = toLattice(px, py, 2, f.sandCell);
    const i0 = Math.floor(ux) - 1,
        j0 = Math.floor(uy) - 1;
    const near: { d: number; i: number; j: number; cx: number; cy: number }[] =
        [];
    for (let jj = 0; jj < 3; jj++) {
        for (let ii = 0; ii < 3; ii++) {
            const [cx, cy] = sandPoint(f, i0 + ii, j0 + jj);
            near.push({
                d: (px - cx) ** 2 + (py - cy) ** 2,
                i: i0 + ii,
                j: j0 + jj,
                cx,
                cy,
            });
        }
    }
    near.sort((a, b) => a.d - b.d);
    const soft2 = (f.sandSoft * f.sandCell) ** 2;
    const top = near.slice(0, 3).map((n, k) => {
        if (k === 0) {
            return { ...n, w: 1 };
        }
        // distance of p to the bisector of facets 0 and k, and the footprint std across it (+ the softness floor)
        const ex = n.cx - near[0].cx,
            ey = n.cy - near[0].cy,
            l = Math.max(Math.hypot(ex, ey), 1e-6);
        const x = (n.d - near[0].d) / (2 * l);
        const sig = Math.sqrt(
            (ex * ex * F.S[0] + 2 * ex * ey * F.S[1] + ey * ey * F.S[2]) /
                (l * l) +
                soft2,
        );
        return {
            ...n,
            w: Math.exp(-Math.min((1.702 * x) / Math.max(sig, 1e-12), 80)),
        };
    });
    const W = top.reduce((s, n) => s + n.w, 0);
    let mx = 0,
        my = 0,
        xx = 0,
        xy = 0,
        yy = 0,
        cov = 0;
    for (const n of top) {
        const w = (n.w / W) * (1 - wS);
        const [sx, sy] = sandTiltOf(f, n.i, n.j);
        cov += w;
        mx += w * sx;
        my += w * sy;
        xx += w * sx * sx;
        xy += w * sx * sy;
        yy += w * sy * sy;
    }
    return {
        s: [mx, my],
        sigS: Math.sqrt(f.sandSigS * f.sandSigS + wS * rem),
        SgA: [xx - mx * mx, xy - mx * my, yy - my * my],
        cover: cov,
        wS,
        facet: [top[0].i, top[0].j],
    };
}
