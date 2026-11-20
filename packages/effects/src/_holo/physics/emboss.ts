// Ported from holospot engine/physics/emboss.ts (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.
// A6 Foil Emboss: the CPU twin of the relief height field (shaders/emboss.glsl) and the logo placement on the face.
// Pure module (spec §6.1): no three, no DOM, erasable syntax only, so `node --test` (tests/emboss.test.ts) imports it.
//
// Height field of the sculpted die (all lengths in mm). d = signed distance to the logo outline, positive inside; s =
// shoulder (wall) width; t = d/s runs from the foot of the wall (t = 0, the outline) to the top of the shoulder (t = 1).
//   round   h = H·w(t),  w = ½ − ½cos(πt)                       (convex top round, concave foot fillet, steepest mid-wall)
//   bevel   h = H·b(t),  b = linear ramp of slope 1/(1 − r) with quadratic blends of length r = 0.2 at both ends
//   dome    h = H·(0.45·w(t) + 0.55·(1 − e^(−u/U₀)))             u = membrane solution (Δu = −1 inside, u = 0 outside)
//                                                                [mm²]: a pillow that saturates for wide elements
//   deboss  h = −H·w(t)                                           (pressed into the paper)
// plus the stretched-paper swell ("puff") of every profile: hp·b(d), b = 1 inside and exp(−(d/λ)²) outside (C¹ at the
// outline), hp = 0.12·puff·H, λ = 0.6 + 1.2·puff mm.
/** Relief profiles of the die (holospot materials/emboss.params.ts EMBOSS_PROFILES). */
export const EMBOSS_PROFILES = ["round", "bevel", "dome", "deboss"] as const;
export type EmbossProfile = (typeof EMBOSS_PROFILES)[number];

/** Dome membrane scale U₀ [mm²]: a 1.5 mm wide strip (u_max = w²/8 = 0.28 mm²) reaches 1 − e⁻¹ of the pillow. */
export const DOME_U0 = 0.28;
/** Share of the emboss height in the dome profile's walls (the rest is the pillow). */
export const DOME_WALL = 0.45;
/** Bevel profile: length of the quadratic blends at both ends of the ramp, as a fraction of the shoulder. */
export const BEVEL_R = 0.2;
/** Puff: height (fraction of H at puff = 1) and reach λ = PUFF_L0 + PUFF_L1·puff [mm]. */
export const PUFF_H = 0.12,
    PUFF_L0 = 0.6,
    PUFF_L1 = 1.2;

export interface ReliefParams {
    heightMm: number;
    shoulderMm: number;
    profile: EmbossProfile;
    puff: number;
}
export interface ReliefUniform {
    H: number;
    s: number;
    hp: number;
    lambda: number;
}

/** The uRelief uniform (H, s, hp, λ) of a relief (all mm). */
export function reliefUniform(r: ReliefParams): ReliefUniform {
    const H = Math.max(r.heightMm, 0),
        puff = Math.min(Math.max(r.puff, 0), 1);
    return {
        H,
        s: Math.max(r.shoulderMm, 1e-3),
        hp: PUFF_H * puff * H,
        lambda: PUFF_L0 + PUFF_L1 * puff,
    };
}

/** Wall shape w(t) ∈ [0, 1] and dw/dt of a profile (t clamped to [0, 1]; the dome's and deboss' walls are round). */
export function wallShape(
    t: number,
    profile: EmbossProfile,
): { w: number; dw: number } {
    const tc = Math.min(Math.max(t, 0), 1),
        inside = t > 0 && t < 1;
    if (profile === "bevel") {
        const r = BEVEL_R,
            a = 1 / (1 - r);
        if (tc < r) {
            return {
                w: (a * tc * tc) / (2 * r),
                dw: inside ? (a * tc) / r : 0,
            };
        }
        if (tc > 1 - r) {
            const v = 1 - tc;
            return {
                w: 1 - (a * v * v) / (2 * r),
                dw: inside ? (a * v) / r : 0,
            };
        }
        return { w: a * (tc - r / 2), dw: inside ? a : 0 };
    }
    return {
        w: 0.5 - 0.5 * Math.cos(Math.PI * tc),
        dw: inside ? 0.5 * Math.PI * Math.sin(Math.PI * tc) : 0,
    };
}

/**
 * Height h [mm] above the paper and its derivative along the distance, dh/dd, at signed distance d [mm] (positive
 * inside) with membrane value u [mm²] (dome only), plus ∂h/∂u (the dome's pillow; its gradient is ∂h/∂u·∇u).
 */
export function reliefHeight(
    d: number,
    u: number,
    r: ReliefParams,
): { h: number; dh: number; dhdu: number } {
    const R = reliefUniform(r);
    const ws = wallShape(d / R.s, r.profile);
    let h: number,
        dh: number,
        dhdu = 0;
    if (r.profile === "dome") {
        const e = Math.exp(-Math.max(u, 0) / DOME_U0);
        h = R.H * (DOME_WALL * ws.w + (1 - DOME_WALL) * (1 - e));
        dh = (R.H * DOME_WALL * ws.dw) / R.s;
        dhdu = u > 0 ? (R.H * (1 - DOME_WALL) * e) / DOME_U0 : 0;
    } else {
        const sgn = r.profile === "deboss" ? -1 : 1;
        h = sgn * R.H * ws.w;
        dh = (sgn * R.H * ws.dw) / R.s;
    }
    // puff: b = 1 inside, exp(−(d/λ)²) outside
    if (d >= 0) {
        h += R.hp;
    } else {
        const b = Math.exp(-(d * d) / (R.lambda * R.lambda));
        h += R.hp * b;
        dh += (R.hp * b * -2 * d) / (R.lambda * R.lambda);
    }
    return { h, dh, dhdu };
}
