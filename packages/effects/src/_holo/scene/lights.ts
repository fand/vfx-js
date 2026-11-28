// Ported from holospot engine/scene/lights.ts (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.
// CPU light geometry for one frame (spec §4.3.1, §5.3, §5.6): four slots — 0 panel (rect), 1 spot A, 2 spot B,
// 3 the flashlight in pointer modes `light` / `flash`, otherwise spot C when on. Studio lights are fixed in the world
// and rotate only with the gyro world-lock Q_L; the flashlight follows the pointer or sits at the camera, so it is not
// world-locked. Also chooses the key light (largest irradiance at the card centre) and the evaluation order by
// hardness (spheres first, then decreasing radiance).

import { padToDir, rectHalfAxes, sphereRadius } from "../physics/geometry.js";
import { spdRgb } from "../spectral/spd.js";
import type {
    Background,
    LightSet,
    LightValues,
    PointerMode,
    Quat,
    SpdId,
    StudioValues,
    Vec2,
    Vec3,
} from "../types.js";
import { SPD_IDS } from "../types.js";

export const MAX_LIGHTS = 4;

const rgbCache = new Map<SpdId, Vec3>();
function lightRgb(id: SpdId): Vec3 {
    let c = rgbCache.get(id);
    if (!c) {
        c = spdRgb(id);
        rgbCache.set(id, c);
    }
    return c;
}

function rotate(q: Quat, v: Vec3): Vec3 {
    // v′ = q v q*
    const [x, y, z] = v;
    const tx = 2 * (q.y * z - q.z * y),
        ty = 2 * (q.z * x - q.x * z),
        tz = 2 * (q.x * y - q.y * x);
    return [
        x + q.w * tx + (q.y * tz - q.z * ty),
        y + q.w * ty + (q.z * tx - q.x * tz),
        z + q.w * tz + (q.x * ty - q.y * tx),
    ];
}

export function emptyLightSet(): LightSet {
    return {
        type: new Int32Array(MAX_LIGHTS),
        pos: new Float32Array(3 * MAX_LIGHTS),
        u: new Float32Array(3 * MAX_LIGHTS),
        w: new Float32Array(3 * MAX_LIGHTS),
        radius: new Float32Array(MAX_LIGHTS),
        rad: new Float32Array(MAX_LIGHTS),
        spd: new Int32Array(MAX_LIGHTS),
        rgb: new Float32Array(3 * MAX_LIGHTS).fill(1),
        key: -1,
        order: new Int32Array(MAX_LIGHTS).fill(-1),
    };
}

function spdIndex(id: SpdId): number {
    return Math.max(0, SPD_IDS.indexOf(id));
}

function setSphere(
    s: LightSet,
    i: number,
    P: Vec3,
    radiusM: number,
    rad: number,
    spd: SpdId,
): void {
    s.type[i] = 1;
    s.pos.set(P, 3 * i);
    s.u.fill(0, 3 * i, 3 * i + 3);
    s.w.fill(0, 3 * i, 3 * i + 3);
    s.radius[i] = Math.max(radiusM, 1e-6);
    s.rad[i] = Math.max(rad, 0);
    s.spd[i] = spdIndex(spd);
    s.rgb.set(lightRgb(spd), 3 * i);
}

function studioSphere(
    s: LightSet,
    i: number,
    l: LightValues & { sizeDeg: number },
    QL: Quat,
): void {
    const dir = padToDir(l.dir.x, l.dir.y);
    const P = rotate(QL, [
        dir[0] * l.distanceM,
        dir[1] * l.distanceM,
        dir[2] * l.distanceM,
    ]);
    setSphere(s, i, P, sphereRadius(l.sizeDeg, l.distanceM), l.radiance, l.spd);
}

// ---- irradiance at the card centre (origin, rest normal +Z), for the key-light choice

function sphereIrradiance(s: LightSet, i: number): number {
    const x = s.pos[3 * i],
        y = s.pos[3 * i + 1],
        z = s.pos[3 * i + 2];
    const d = Math.hypot(x, y, z);
    if (d <= 0) {
        return 0;
    }
    const sa = Math.min(s.radius[i] / d, 0.999);
    return s.rad[i] * Math.PI * sa * sa * Math.max(z / d, 0); // L·π sin²α cosθ (§4.3.2)
}

/** Exact projected solid angle of the rect at the origin w.r.t. +Z, clipped at the horizon (Lambert's edge sum). */
export function rectProjectedSolidAngle(P: Vec3, U: Vec3, W: Vec3): number {
    const c: Vec3[] = [
        [P[0] + U[0] + W[0], P[1] + U[1] + W[1], P[2] + U[2] + W[2]],
        [P[0] + U[0] - W[0], P[1] + U[1] - W[1], P[2] + U[2] - W[2]],
        [P[0] - U[0] - W[0], P[1] - U[1] - W[1], P[2] - U[2] - W[2]],
        [P[0] - U[0] + W[0], P[1] - U[1] + W[1], P[2] - U[2] + W[2]],
    ];
    const q: Vec3[] = []; // Sutherland–Hodgman against z ≥ 0
    for (let k = 0; k < 4; k++) {
        const a = c[k],
            b = c[(k + 1) & 3];
        if (a[2] >= 0) {
            q.push(a);
        }
        if (a[2] >= 0 !== b[2] >= 0) {
            const t = a[2] / (a[2] - b[2]);
            q.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0]);
        }
    }
    if (q.length < 3) {
        return 0;
    }
    let sum = 0;
    for (let k = 0; k < q.length; k++) {
        const a = q[k],
            b = q[(k + 1) % q.length];
        const la = Math.hypot(...a),
            lb = Math.hypot(...b);
        const ua = [a[0] / la, a[1] / la, a[2] / la],
            ub = [b[0] / lb, b[1] / lb, b[2] / lb];
        const cx = ua[1] * ub[2] - ua[2] * ub[1],
            cy = ua[2] * ub[0] - ua[0] * ub[2],
            cz = ua[0] * ub[1] - ua[1] * ub[0];
        const sn = Math.hypot(cx, cy, cz);
        if (sn < 1e-12) {
            continue;
        }
        const theta = Math.atan2(
            sn,
            ua[0] * ub[0] + ua[1] * ub[1] + ua[2] * ub[2],
        );
        sum += theta * (cz / sn); // θ_k (γ̂_k · n), n = +Z
    }
    return Math.abs(sum) / 2;
}

function rectIrradiance(s: LightSet, i: number): number {
    const P: Vec3 = [s.pos[3 * i], s.pos[3 * i + 1], s.pos[3 * i + 2]];
    const U: Vec3 = [s.u[3 * i], s.u[3 * i + 1], s.u[3 * i + 2]];
    const W: Vec3 = [s.w[3 * i], s.w[3 * i + 1], s.w[3 * i + 2]];
    return s.rad[i] * rectProjectedSolidAngle(P, U, W);
}

/** Irradiance of slot i at the card centre at rest (used for the key light; also handy for tests). */
export function centreIrradiance(s: LightSet, i: number): number {
    return s.type[i] === 1
        ? sphereIrradiance(s, i)
        : s.type[i] === 2
          ? rectIrradiance(s, i)
          : 0;
}

/** §4.3.1 light geometry. `flash` comes from the PoseController (pad = direction cosines in mode `light`), `QL` is the
 *  gyro world-lock rotation (identity without gyro), `camPos` the camera position (mode `flash`, coaxial). */
export function computeLights(
    studio: StudioValues,
    flash: { mode: PointerMode; pad: Vec2 },
    _bg: Background,
    QL: Quat,
    camPos: Vec3,
    out: LightSet = emptyLightSet(),
): LightSet {
    const s = out;
    s.type.fill(0);
    s.pos.fill(0);
    s.u.fill(0);
    s.w.fill(0);
    s.radius.fill(0);
    s.rad.fill(0);
    s.spd.fill(0);
    s.rgb.fill(1);

    // Slot 0: panel (rect). Half-axes U = D·tan(width/2)·ê_θ (radial), W = D·tan(length/2)·ê_φ (tangential).
    const p = studio.panel;
    if (p.on && p.radiance > 0) {
        const dir = padToDir(p.dir.x, p.dir.y);
        const ax = rectHalfAxes(dir, p.widthDeg, p.lengthDeg, p.distanceM);
        s.type[0] = 2;
        s.pos.set(
            rotate(QL, [
                dir[0] * p.distanceM,
                dir[1] * p.distanceM,
                dir[2] * p.distanceM,
            ]),
            0,
        );
        s.u.set(rotate(QL, ax.U), 0);
        s.w.set(rotate(QL, ax.W), 0);
        s.rad[0] = p.radiance;
        s.spd[0] = spdIndex(p.spd);
        s.rgb.set(lightRgb(p.spd), 0);
    }
    if (studio.spotA.on && studio.spotA.radiance > 0) {
        studioSphere(s, 1, studio.spotA, QL);
    }
    if (studio.spotB.on && studio.spotB.radiance > 0) {
        studioSphere(s, 2, studio.spotB, QL);
    }

    // Slot 3: the flashlight in pointer modes `light` (pad) and `flash` (at the camera), else spot C.
    const f = studio.flash;
    if (flash.mode === "flash") {
        if (f.radiance > 0) {
            setSphere(s, 3, camPos, f.sizeMm / 2000, f.radiance, f.spd);
        }
    } else if (flash.mode === "light") {
        if (f.radiance > 0) {
            const dir = padToDir(flash.pad.x, flash.pad.y);
            setSphere(
                s,
                3,
                [
                    dir[0] * f.distanceM,
                    dir[1] * f.distanceM,
                    dir[2] * f.distanceM,
                ],
                f.sizeMm / 2000,
                f.radiance,
                f.spd,
            );
        }
    } else if (studio.spotC.on && studio.spotC.radiance > 0) {
        studioSphere(s, 3, studio.spotC, QL);
    }

    // Key light and evaluation order.
    let key = -1,
        best = 0;
    const enabled: number[] = [];
    for (let i = 0; i < MAX_LIGHTS; i++) {
        if (s.type[i] === 0) {
            continue;
        }
        enabled.push(i);
        const E = centreIrradiance(s, i);
        if (E > best) {
            best = E;
            key = i;
        }
    }
    s.key = key; // −1 when no light reaches the centre
    enabled.sort(
        (a, b) => s.type[a] - s.type[b] || s.rad[b] - s.rad[a] || a - b,
    ); // spheres (1) before rects (2)
    s.order.fill(-1);
    enabled.forEach((slot, k) => {
        s.order[k] = slot;
    });
    return s;
}
