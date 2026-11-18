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
export const CARD_T_MM = 0.3;
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

/** Rect corners in the order of §4.3.1: c0 = P+U+W, c1 = P+U−W, c2 = P−U−W, c3 = P−U+W (cross(c1−c0, c3−c0) faces the card). */
export function rectCorners(
    P: Vec3,
    U: Vec3,
    W: Vec3,
): [Vec3, Vec3, Vec3, Vec3] {
    return [
        add(add(P, U), W),
        sub(add(P, U), W),
        sub(sub(P, U), W),
        add(sub(P, U), W),
    ];
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
// Light footprints (CPU twins of lights.glsl, §4.3.2) and exact form factors
// ---------------------------------------------------------------------------------------------------------------

/** Sphere light summary in the frame (T, B, N) at X (§4.3.2): L, projected solid angle A, angular radius, peak-matched covariance S = [Sxx, Sxy, Syy] and centroid C in (T, B) direction cosines. */
export function sphereFootprint(
    lightPos: Vec3,
    radius: number,
    X: Vec3,
    T: Vec3,
    B: Vec3,
    N: Vec3,
): {
    L: Vec3;
    A: number;
    rAng: number;
    S: [number, number, number];
    C: [number, number];
} {
    const dP = sub(lightPos, X),
        dist = length(dP);
    const L = scale(dP, 1 / dist);
    const sa = Math.min(Math.max(radius / dist, 1e-5), 0.999);
    const lc: [number, number] = [dot(L, T), dot(L, B)];
    const cc = Math.max(dot(L, N), 0),
        r = Math.hypot(lc[0], lc[1]);
    const er: [number, number] = r > 1e-5 ? [lc[0] / r, lc[1] / r] : [1, 0],
        ep: [number, number] = [-er[1], er[0]];
    const ar = Math.max(sa * cc, 1e-5),
        ap = sa;
    const S: [number, number, number] = [
        0.5 * ar * ar * er[0] * er[0] + 0.5 * ap * ap * ep[0] * ep[0],
        0.5 * ar * ar * er[0] * er[1] + 0.5 * ap * ap * ep[0] * ep[1],
        0.5 * ar * ar * er[1] * er[1] + 0.5 * ap * ap * ep[1] * ep[1],
    ];
    return {
        L,
        A: cc <= 0 ? 0 : Math.PI * ar * ap,
        rAng: Math.asin(sa),
        S,
        C: lc,
    };
}

/** Sutherland–Hodgman clip of a polygon (positions relative to the shading point) to N·c ≥ eps·|c| (§4.3.2). */
export function clipToHemisphere(
    poly: readonly Vec3[],
    N: Vec3,
    eps = 1e-4,
): Vec3[] {
    const out: Vec3[] = [];
    for (let k = 0; k < poly.length; k++) {
        const a = poly[k],
            b = poly[(k + 1) % poly.length];
        const da = dot(N, a) - eps * length(a),
            db = dot(N, b) - eps * length(b);
        if (da >= 0) {
            out.push(a);
        }
        if (da >= 0 !== db >= 0) {
            out.push(add(a, scale(sub(b, a), da / (da - db))));
        }
    }
    return out;
}

/**
 * Exact projected solid angle (cos-weighted form factor × π) [sr] of a flat polygon light seen from X with normal N,
 * clipped at the horizon (Lambert's polygon formula). E = radiance × this value for a uniform emitter.
 */
export function polygonProjectedSolidAngle(
    corners: readonly Vec3[],
    X: Vec3,
    N: Vec3,
): number {
    const rel = corners.map((c) => sub(c, X));
    const poly = clipToHemisphere(rel, N, 0);
    if (poly.length < 3) {
        return 0;
    }
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
        const a = normalize(poly[i]),
            b = normalize(poly[(i + 1) % poly.length]);
        const c = cross(a, b),
            lc = length(c);
        if (lc < 1e-15) {
            continue;
        }
        s += (Math.acos(Math.min(Math.max(dot(a, b), -1), 1)) * dot(c, N)) / lc;
    }
    return 0.5 * Math.abs(s);
}

/** Irradiance factor of a uniform sphere fully or partly above the horizon, E/L = π·sin²α·cosθ (exact while above). */
export function sphereProjectedSolidAngle(
    lightPos: Vec3,
    radius: number,
    X: Vec3,
    N: Vec3,
): number {
    const dP = sub(lightPos, X),
        dist = length(dP);
    const sa = Math.min(radius / dist, 1),
        c = dot(dP, N) / dist;
    return c <= 0 ? 0 : Math.PI * sa * sa * c;
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

/** ∫ L·max(N·d, 0) dω of one panel's profile (unit level) and of its mask, by midpoint integration in gnomonic coordinates. */
function panelIrradiance(
    p: EnvPanel,
    N: Vec3,
    n = 160,
): { radiance: number; mask: number } {
    const Umax = Math.tan(p.halfU + 0.5 * p.edgeRad),
        Wmax = Math.tan(p.halfW + 0.5 * p.edgeRad);
    const du = (2 * Umax) / n,
        dw = (2 * Wmax) / n;
    let sr = 0,
        sm = 0;
    for (let i = 0; i < n; i++) {
        const u = -Umax + (i + 0.5) * du;
        for (let j = 0; j < n; j++) {
            const w = -Wmax + (j + 0.5) * dw;
            const dir = normalize(
                add(add(p.centre, scale(p.eTheta, u)), scale(p.ePhi, w)),
            );
            const cz = dot(dir, N);
            if (cz <= 0) {
                continue;
            }
            const jac = (du * dw) / (1 + u * u + w * w) ** 1.5; // dω = du dw / (1 + u² + w²)^{3/2}
            const s = envPanelAt(p, dir);
            sr += s.radiance * cz * jac;
            sm += s.mask * cz * jac;
        }
    }
    return { radiance: sr, mask: sm };
}

/** Irradiance at the rest-pose card centre (normal +Z) from the environment levels e (camera-side texture at its mean). */
export function studioEnvIrradiance(e: EnvLevels): number {
    const N: Vec3 = [0, 0, 1];
    const P = STUDIO_ENV_PANELS;
    let E = e.cameraSide * Math.PI; // the camera side fills the uncovered front hemisphere
    for (const [p, level] of [
        [P.rimRight, e.rims],
        [P.rimLeft, e.rims],
        [P.fill, e.fill],
        [P.scrim, e.scrim],
    ] as const) {
        const s = panelIrradiance(p, N);
        E += level * s.radiance - e.cameraSide * s.mask;
    }
    return E;
}

/**
 * Irradiance at the card centre at rest (normal +Z) from the enabled analytic studio lights (panel rect, spots A–C;
 * the flashlight is driven by the pointer mode and is not part of the studio) plus the environment panels and the
 * camera-side hemisphere after the §5.2 background adaptation (§5.3: 2.19 on black, 2.34 on white).
 */
export function studioIrradiance(
    s: StudioValues,
    bg: Background | number,
): number {
    const X: Vec3 = [0, 0, 0],
        N: Vec3 = [0, 0, 1];
    let E = 0;
    if (s.panel.on) {
        const dir = padToDir(s.panel.dir.x, s.panel.dir.y);
        const { U, W } = rectHalfAxes(
            dir,
            s.panel.widthDeg,
            s.panel.lengthDeg,
            s.panel.distanceM,
        );
        E +=
            s.panel.radiance *
            polygonProjectedSolidAngle(
                rectCorners(scale(dir, s.panel.distanceM), U, W),
                X,
                N,
            );
    }
    for (const spot of [s.spotA, s.spotB, s.spotC]) {
        if (!spot.on) {
            continue;
        }
        const dir = padToDir(spot.dir.x, spot.dir.y);
        E +=
            spot.radiance *
            sphereProjectedSolidAngle(
                scale(dir, spot.distanceM),
                sphereRadius(spot.sizeDeg, spot.distanceM),
                X,
                N,
            );
    }
    return E + studioEnvIrradiance(envLevels(s.ambient, bg));
}

/**
 * The reference studio of spec §5.3 as StudioValues: panel (−0.29, 0.50), spot A (0.48, 0.28), spot B, spot C off, the
 * §5.3 ambient and a 6 mm flashlight. It was the scene default until addendum A4.2 replaced the panel and spot A
 * directions and the flashlight size with the user's values; it stays the physics fixture of the spec's numbers
 * (P11–P16, the §7.2 checks pin the same lights) and must not follow the scene panel's defaults (A4.2 rule 3).
 */
export function defaultStudio(): StudioValues {
    return {
        panel: {
            on: true,
            dir: { x: -0.29, y: 0.5 },
            radiance: 4,
            distanceM: 0.9,
            spd: "equal",
            widthDeg: 14,
            lengthDeg: 50,
        },
        spotA: {
            on: true,
            dir: { x: 0.48, y: 0.28 },
            radiance: 1200,
            distanceM: 1,
            spd: "equal",
            sizeDeg: 1.5,
        },
        spotB: {
            on: true,
            dir: { x: -0.25, y: -0.68 },
            radiance: 600,
            distanceM: 1.2,
            spd: "equal",
            sizeDeg: 2.5,
        },
        spotC: {
            on: false,
            dir: { x: 0.21, y: -0.37 },
            radiance: 1200,
            distanceM: 1,
            spd: "equal",
            sizeDeg: 1,
        },
        ambient: {
            rims: 3,
            fill: 0.4,
            scrim: 0.4,
            cameraSide: 0.004,
            cameraTexture: 1,
            backdrop: 1,
            rotationDeg: 0,
        },
        flash: { sizeMm: 6, distanceM: 0.3, radiance: 1500, spd: "equal" },
    };
}
