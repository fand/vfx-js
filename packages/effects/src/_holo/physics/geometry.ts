// Ported from holospot engine/physics/geometry.ts (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.
// Light geometry, camera fit, card pose, refraction, light footprints and the studio environment (CPU side of
// spec §4.1, §4.3.1, §4.3.2, §5.1–5.4). Pure module (§6.1).
import type { Background, Mat3, StudioValues, Vec3 } from "../types.js";

const D2R = Math.PI / 180;

// ---------------------------------------------------------------------------------------------------------------
// Card and camera constants (§5.1, §5.4, §7)
// ---------------------------------------------------------------------------------------------------------------

/** Card size [mm] (§5.1); card-plane positions are in mm with the origin at the bottom-left corner of the face. */
export const CARD_W_MM = 63;
export const CARD_H_MM = 88;
/** Vertical field of view of the fixed camera [deg] (§5.4). */
export const CAMERA_FOV_DEG = 22;

// ---------------------------------------------------------------------------------------------------------------
// Vector helpers (Vec3 = readonly tuple; Mat3 row-major)
// ---------------------------------------------------------------------------------------------------------------

export function add(a: Vec3, b: Vec3): Vec3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
export function sub(a: Vec3, b: Vec3): Vec3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
export function scale(a: Vec3, s: number): Vec3 {
    return [a[0] * s, a[1] * s, a[2] * s];
}
export function dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
export function cross(a: Vec3, b: Vec3): Vec3 {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}
export function length(a: Vec3): number {
    return Math.hypot(a[0], a[1], a[2]);
}
export function normalize(a: Vec3): Vec3 {
    const l = length(a);
    return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
}
/** GLSL reflect(I, N) = I − 2(N·I)N. */
export function reflect(i: Vec3, n: Vec3): Vec3 {
    return sub(i, scale(n, 2 * dot(n, i)));
}
/** m·v for a row-major Mat3. */
export function rotate(m: Mat3, v: Vec3): Vec3 {
    return [
        m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
        m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
        m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
    ];
}
/** Column c of a row-major Mat3 (the image of the c-th basis vector). */
export function column(m: Mat3, c: 0 | 1 | 2): Vec3 {
    return [m[c], m[3 + c], m[6 + c]];
}

// ---------------------------------------------------------------------------------------------------------------
// Light directions and shapes (§4.3.1)
// ---------------------------------------------------------------------------------------------------------------

/**
 * DialKit pad (x, y) → unit light direction in the rest frame (§4.3.1): the pad is the direction cosine, its length
 * clamped to r = min(√(x²+y²), 0.996); l̂ = (x, y, √(1 − r²)) with (x, y) rescaled to length r.
 */
export function padToDir(x: number, y: number): Vec3 {
    const r0 = Math.hypot(x, y),
        r = Math.min(r0, 0.996);
    const k = r0 > 0 ? r / r0 : 0;
    return [x * k, y * k, Math.sqrt(1 - r * r)];
}

/** Physical sphere radius ρ = D·tan(size/2) for an angular diameter `sizeDeg` at distance `distM` [m]. */
export function sphereRadius(sizeDeg: number, distM: number): number {
    return distM * Math.tan(0.5 * sizeDeg * D2R);
}

/** Radial and tangential unit axes of a light at direction `dir` (§4.3.1): ê_θ = (cosθ cosφ, cosθ sinφ, −sinθ), ê_φ = (−sinφ, cosφ, 0). */
export function lightAxes(dir: Vec3): { eTheta: Vec3; ePhi: Vec3 } {
    const r = Math.hypot(dir[0], dir[1]);
    const phi = r < 1e-4 ? 0 : Math.atan2(dir[1], dir[0]);
    const ct = Math.sqrt(Math.max(1 - r * r, 0)),
        st = Math.min(r, 1);
    const cp = Math.cos(phi),
        sp = Math.sin(phi);
    return { eTheta: [ct * cp, ct * sp, -st], ePhi: [-sp, cp, 0] };
}

/**
 * Rect half-axes (§4.3.1): U = D·tan(width/2)·ê_θ (width = radial size), W = D·tan(length/2)·ê_φ (length =
 * tangential size), for the unrotated direction `dir` (the caller applies the gyro world-lock Q_L to P, U and W).
 */
export function rectHalfAxes(
    dir: Vec3,
    widthDeg: number,
    lengthDeg: number,
    distM: number,
): { U: Vec3; W: Vec3 } {
    const { eTheta, ePhi } = lightAxes(dir);
    return {
        U: scale(eTheta, distM * Math.tan(0.5 * widthDeg * D2R)),
        W: scale(ePhi, distM * Math.tan(0.5 * lengthDeg * D2R)),
    };
}

// ---------------------------------------------------------------------------------------------------------------
// Camera and pose (§4.1, §5.4)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Camera distance (§5.4): D = max((0.088/0.70)/(2·tan(fov/2)), (0.063/0.80)/(2·tan(fov/2)·aspect)), so the card fills
 * 70 % of the height or 80 % of the width (0.3234 m at 4:3, 0.4384 m at 390 × 844).
 */
export function cameraDistance(
    aspect: number,
    fovDeg: number = CAMERA_FOV_DEG,
): number {
    return framingDistance(aspect, CARD_W_MM / 2000, CARD_H_MM / 2000, fovDeg);
}

/**
 * The §5.4 framing rule for any object (addendum A1.1): the camera distance at which an object of rest-pose half
 * extents (halfW, halfH) [m] fills 70 % of the height or 80 % of the width, D = max((2·halfH/0.70)/(2·tan(fov/2)),
 * (2·halfW/0.80)/(2·tan(fov/2)·aspect)). The card (31.5 × 44 mm) gives exactly `cameraDistance`.
 */
export function framingDistance(
    aspect: number,
    halfW: number,
    halfH: number,
    fovDeg: number = CAMERA_FOV_DEG,
): number {
    const t = 2 * Math.tan(0.5 * fovDeg * D2R);
    return Math.max(
        (2 * halfH) / 0.7 / t,
        (2 * halfW) / 0.8 / (t * Math.max(aspect, 1e-6)),
    );
}

/**
 * Card rotation of three.js `Euler(rx, ry, rz, 'XYZ')` (v′ = Rx·Ry·Rz·v) as a row-major Mat3 (§4.1): rx > 0 tips the
 * top edge toward the camera (normal toward −Y), ry > 0 turns the face toward +X.
 */
export function eulerXYZ(rxDeg: number, ryDeg: number, rzDeg: number): Mat3 {
    const a = Math.cos(rxDeg * D2R),
        b = Math.sin(rxDeg * D2R);
    const c = Math.cos(ryDeg * D2R),
        d = Math.sin(ryDeg * D2R);
    const e = Math.cos(rzDeg * D2R),
        f = Math.sin(rzDeg * D2R);
    return [
        c * e,
        -c * f,
        d,
        a * f + b * e * d,
        a * e - b * f * d,
        -b * c,
        b * f - a * e * d,
        b * e + a * f * d,
        a * c,
    ];
}

// ---------------------------------------------------------------------------------------------------------------
// Refraction (§4.1, CPU twins of common.glsl refractIn / refractOut)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Refraction of the air-side direction D (pointing away from the surface) into a flat layer of index n_c with top
 * normal N (§4.1): D_t/n_c + N·√(1 − |D_t|²/n_c²), D_t = D − N(D·N). Unit length for unit D.
 */
export function refractIn(d: Vec3, n: Vec3, nc: number): Vec3 {
    const dn = dot(d, n);
    const t: Vec3 = [d[0] - n[0] * dn, d[1] - n[1] * dn, d[2] - n[2] * dn];
    const tt = dot(t, t) / (nc * nc);
    const z = Math.sqrt(Math.max(1 - tt, 0));
    return [t[0] / nc + n[0] * z, t[1] / nc + n[1] * z, t[2] / nc + n[2] * z];
}

/** Inverse of refractIn: internal direction (pointing up, away from the metal) → air direction; (0, 0, 0) under TIR. */
export function refractOut(dIn: Vec3, n: Vec3, nc: number): Vec3 {
    const dn = dot(dIn, n);
    const t: Vec3 = [
        (dIn[0] - n[0] * dn) * nc,
        (dIn[1] - n[1] * dn) * nc,
        (dIn[2] - n[2] * dn) * nc,
    ];
    const tt = dot(t, t);
    if (tt >= 1) {
        return [0, 0, 0];
    }
    const z = Math.sqrt(1 - tt);
    return [t[0] + n[0] * z, t[1] + n[1] * z, t[2] + n[2] * z];
}

// ---------------------------------------------------------------------------------------------------------------
// Studio environment (§5.2, §5.3): CPU twin of the procedural cube's radiance per direction
// ---------------------------------------------------------------------------------------------------------------

/**
 * One environment panel: a gnomonic rectangle facing the origin (the same ê_θ/ê_φ axes as analytic rects), radial
 * half-angle `halfU`, tangential half-angle `halfW` [rad], smoothstep edges `edgeRad` wide centred on the nominal
 * edge (so the nominal solid angle is preserved), and a radiance profile over the normalised angular coordinates
 * (su, sw) ∈ [−1, 1]² (su = −1 is the edge nearest the zenith, i.e. the lens).
 */
export interface EnvPanel {
    centre: Vec3;
    eTheta: Vec3;
    ePhi: Vec3;
    halfU: number;
    halfW: number;
    edgeRad: number;
    profile: (su: number, sw: number) => number;
}

function envPanel(
    thetaDeg: number,
    phiDeg: number,
    widthDeg: number,
    lengthDeg: number,
    edgeDeg: number,
    profile: (su: number, sw: number) => number,
): EnvPanel {
    const th = thetaDeg * D2R,
        ph = phiDeg * D2R;
    const centre: Vec3 = [
        Math.sin(th) * Math.cos(ph),
        Math.sin(th) * Math.sin(ph),
        Math.cos(th),
    ];
    const { eTheta, ePhi } = lightAxes(centre);
    return {
        centre,
        eTheta,
        ePhi,
        halfU: 0.5 * widthDeg * D2R,
        halfW: 0.5 * lengthDeg * D2R,
        edgeRad: edgeDeg * D2R,
        profile,
    };
}

/** Edge width of every environment panel [deg] (§5.3 "3° smoothstep edges"). */
export const ENV_EDGE_DEG = 3;

/**
 * The studio's environment panels (§5.3), per unit DialKit radiance:
 * rims × 2 at θ 78°, φ 0°/180°, 5° × 60°; top fill at θ 62°, φ 90°, 60° × 60° with a 15 % hot centre
 * (1 + 0.15·(1 − r²), r the normalised elliptical radius); scrim at θ 20°, φ 90°, 20° × 50°, ×0.5 at the edge
 * nearest the lens rising linearly (in angle) to ×1.0 at the far edge.
 */
export const STUDIO_ENV_PANELS = {
    rimRight: envPanel(78, 0, 5, 60, ENV_EDGE_DEG, () => 1),
    rimLeft: envPanel(78, 180, 5, 60, ENV_EDGE_DEG, () => 1),
    fill: envPanel(
        62,
        90,
        60,
        60,
        ENV_EDGE_DEG,
        (su, sw) => 1 + 0.15 * (1 - Math.min(su * su + sw * sw, 1)),
    ),
    scrim: envPanel(
        20,
        90,
        20,
        50,
        ENV_EDGE_DEG,
        (su) => 0.75 + 0.25 * Math.min(Math.max(su, -1), 1),
    ),
} as const;

/** Coverage mask × profile of a panel in direction d (unit), and the bare mask. */
export function envPanelAt(
    p: EnvPanel,
    d: Vec3,
): { mask: number; radiance: number } {
    const z = dot(d, p.centre);
    if (z <= 1e-6) {
        return { mask: 0, radiance: 0 };
    }
    const au = Math.atan(dot(d, p.eTheta) / z),
        aw = Math.atan(dot(d, p.ePhi) / z);
    const e = 0.5 * p.edgeRad;
    const mu = 1 - smooth01((Math.abs(au) - (p.halfU - e)) / (2 * e));
    const mw = 1 - smooth01((Math.abs(aw) - (p.halfW - e)) / (2 * e));
    const mask = mu * mw;
    return {
        mask,
        radiance: mask > 0 ? mask * p.profile(au / p.halfU, aw / p.halfW) : 0,
    };
}

function smooth01(t: number): number {
    const x = Math.min(Math.max(t, 0), 1);
    return x * x * (3 - 2 * x);
}

/** Environment inputs after the background adaptation of §5.2 (what the cube is rendered with). */
export interface EnvLevels {
    rims: number;
    fill: number;
    scrim: number;
    cameraSide: number;
    cameraTexture: number;
    behind: number;
}

/** §5.2 background adaptation of the DialKit ambient values (fill ×1.5, camera side ≥ 0.03, behind = 0.6·backdrop on
 *  white). A colour page passes its tone t ∈ [0, 1] (app/state.ts backgroundTone: its relative luminance) and gets
 *  the adaptation scaled by t: fill ×(1 + 0.5t), camera side ≥ 0.03t, behind = 0.6t·backdrop (black t = 0, white 1). */
export function envLevels(
    a: StudioValues["ambient"],
    bg: Background | number,
): EnvLevels {
    const t =
        typeof bg === "number"
            ? Math.min(Math.max(bg, 0), 1)
            : bg === "white"
              ? 1
              : 0;
    return {
        rims: a.rims,
        fill: t === 1 ? 1.5 * a.fill : (1 + 0.5 * t) * a.fill,
        scrim: a.scrim,
        cameraSide: t > 0 ? Math.max(a.cameraSide, 0.03 * t) : a.cameraSide,
        cameraTexture: a.cameraTexture,
        behind: 0.6 * t * a.backdrop,
    };
}

/**
 * Radiance of the studio environment in the world direction d (unit, env frame: before `uEnvRot`), CPU twin of
 * env.frag for the tests. The camera-side texture is represented by its mean factor 1 (the seeded blobs belong to
 * the shader); pass `cameraTex` to supply a texture factor for direction d.
 */
export function studioEnvRadiance(
    d: Vec3,
    e: EnvLevels,
    cameraTex: (d: Vec3) => number = () => 1,
): number {
    const wFront = smooth01((d[2] + 0.002) / 0.004); // behind-card hemisphere for z < 0 (§5.2), ±0.002 blend
    if (wFront <= 0) {
        return e.behind;
    }
    let cover = 0,
        L = 0;
    const P = STUDIO_ENV_PANELS;
    const parts: readonly (readonly [EnvPanel, number])[] = [
        [P.rimRight, e.rims],
        [P.rimLeft, e.rims],
        [P.fill, e.fill],
        [P.scrim, e.scrim],
    ];
    for (const [p, level] of parts) {
        const s = envPanelAt(p, d);
        cover += s.mask;
        L += level * s.radiance;
    }
    const tex = 1 + e.cameraTexture * (cameraTex(d) - 1); // mix(1, texture, amount)
    const front = L + e.cameraSide * tex * Math.max(1 - cover, 0);
    return e.behind + (front - e.behind) * wFront;
}
