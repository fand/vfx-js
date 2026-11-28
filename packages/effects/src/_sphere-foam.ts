// BubbleEffect's "spheres" foam along one ray, in TypeScript: the same
// algorithm as the shader, so its maths can be tested. Pure module, for
// the tests only: tsconfig leaves it out of lib/.
//
// The foam is a power diagram of spheres: a point belongs to the sphere i
// with the least power |p - c_i|^2 - r_i^2, and is inside the foam when
// that power is <= 0. Overlapping spheres are cut by their radical plane
// and share one flat wall there; an exposed sphere's own surface is the
// outside film.
//
// Along a ray p = o + t d (|d| = 1) the power is t^2 + b_i t + k_i. The
// t^2 term is common, so the owner along the ray is the lower envelope
// of the lines b_i t + k_i, and the films are:
// - where t^2 + b t + k of the owner crosses 0 (in or out of the foam),
// - where the owner changes while inside (a wall, one film).
// They come out sorted by t.

/** A sphere: centre and radius. */
export type FoamSphere = readonly [number, number, number, number];

/** A film along the ray. */
export type SphereFilm =
    | { t: number; kind: "in" | "out"; sphere: number }
    | { t: number; kind: "wall"; from: number; to: number };

/**
 * The films a ray (origin `o`, unit direction `d`) crosses on [t0, t1],
 * in order. `inside` is whether the ray is in the foam at t0 (the state
 * carried from the previous segment); undefined works it out from t0.
 */
export function sphereFilms(
    o: readonly [number, number, number],
    d: readonly [number, number, number],
    spheres: readonly FoamSphere[],
    t0: number,
    t1: number,
    inside?: boolean,
): { films: SphereFilm[]; inside: boolean } {
    const films: SphereFilm[] = [];
    // The lines: power = t^2 + b t + k. Only spheres the ray passes
    // through on [t0, t1] can own a point inside the foam there, so the
    // others are left out (the shader does the same).
    const b: number[] = [];
    const k: number[] = [];
    const ids: number[] = [];
    spheres.forEach(([x, y, z, r], i) => {
        const ox = o[0] - x;
        const oy = o[1] - y;
        const oz = o[2] - z;
        const bi = 2 * (d[0] * ox + d[1] * oy + d[2] * oz);
        const ki = ox * ox + oy * oy + oz * oz - r * r;
        const disc = bi * bi - 4 * ki;
        if (disc <= 0) {
            return;
        }
        const h = Math.sqrt(disc);
        if ((-bi - h) / 2 < t1 && (-bi + h) / 2 > t0) {
            b.push(bi);
            k.push(ki);
            ids.push(i);
        }
    });
    const m = ids.length;
    if (m === 0) {
        return { films, inside: false };
    }
    // The owner at t0: the lowest line, the steepest down on a tie.
    let own = 0;
    for (let i = 1; i < m; i++) {
        const li = b[i] * t0 + k[i];
        const lo = b[own] * t0 + k[own];
        if (li < lo || (li === lo && b[i] < b[own])) {
            own = i;
        }
    }
    const power = (i: number, t: number) => t * t + b[i] * t + k[i];
    let ins = inside ?? power(own, t0) < 0;
    let ta = t0;
    for (let guard = 0; guard <= m; guard++) {
        // The next owner: of the lines falling below this one later, the
        // first to cross it.
        let ts = Infinity;
        let next = -1;
        for (let j = 0; j < m; j++) {
            if (b[j] < b[own]) {
                const tj = Math.max((k[j] - k[own]) / (b[own] - b[j]), ta);
                if (tj < ts) {
                    ts = tj;
                    next = j;
                }
            }
        }
        const tb = Math.min(ts, t1);
        // The owner's sphere surface, crossed in (ta, tb].
        const disc = b[own] * b[own] - 4 * k[own];
        if (disc > 0) {
            const h = Math.sqrt(disc);
            const tIn = (-b[own] - h) / 2;
            const tOut = (-b[own] + h) / 2;
            if (!ins && tIn > ta && tIn <= tb) {
                films.push({ t: tIn, kind: "in", sphere: ids[own] });
                ins = true;
            }
            if (ins && tOut > ta && tOut <= tb) {
                films.push({ t: tOut, kind: "out", sphere: ids[own] });
                ins = false;
            }
        }
        if (next < 0 || ts >= t1) {
            break;
        }
        if (ins) {
            films.push({ t: ts, kind: "wall", from: ids[own], to: ids[next] });
        }
        own = next;
        ta = ts;
    }
    return { films, inside: ins };
}

/**
 * The distance from `q`, in the cell of sphere `own`, to the nearest wall
 * of that cell, and the sphere across it (-1: none). Walls lie on
 * radical planes, so the distance to the wall shared with sphere j is
 * exact: (pow_j(q) - pow_own(q)) / (2 |c_j - c_own|). It is >= 0 inside
 * the cell and 0 on the line where two bubbles' surfaces meet. As the
 * shader's `borderDist`; the owner itself (same centre) is skipped.
 */
export function borderDist(
    q: readonly [number, number, number],
    own: number,
    spheres: readonly FoamSphere[],
): { e: number; across: number } {
    const pow = ([x, y, z, r]: FoamSphere) =>
        (q[0] - x) ** 2 + (q[1] - y) ** 2 + (q[2] - z) ** 2 - r * r;
    const o = spheres[own];
    const powI = pow(o);
    let e = Infinity;
    let across = -1;
    spheres.forEach((s, j) => {
        const d2 = (s[0] - o[0]) ** 2 + (s[1] - o[1]) ** 2 + (s[2] - o[2]) ** 2;
        if (d2 < 1e-12) {
            return;
        }
        const ej = (pow(s) - powI) / (2 * Math.sqrt(d2));
        if (ej < e) {
            e = ej;
            across = j;
        }
    });
    return { e: Math.max(e, 0), across };
}
