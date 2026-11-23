import { describe, expect, test } from "vitest";
import {
    buildFoam,
    FOAM_MAX_CELLS,
    FOAM_NEIGHBOURS,
    FOAM_OWNER_TEX_W,
    FOAM_SEED_TEXELS,
    type Foam,
    type FoamOptions,
    foamSeedRows,
    insideDistance,
} from "./_bubble-pack.js";
import { buildShape, type ShapeData } from "./_silhouette.js";

// A silhouette like a word: three blobs and a thin bar, mw x mh px, RGBA
// bottom-up.
function mask(mw: number, mh: number): Uint8Array {
    const px = new Uint8Array(mw * mh * 4);
    for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
            const u = x / mw;
            const v = y / mh;
            const blob = (cx: number, r: number) =>
                ((u - cx) * mw) ** 2 + ((v - 0.5) * mh) ** 2 < (r * mh) ** 2;
            const bar = v > 0.1 && v < 0.2 && u > 0.05 && u < 0.95;
            if (blob(0.2, 0.42) || blob(0.5, 0.35) || blob(0.8, 0.4) || bar) {
                px[(y * mw + x) * 4 + 3] = 255;
            }
        }
    }
    return px;
}

function shapeOf(mw: number, mh: number, halfDepth: number): ShapeData {
    const s = buildShape(mask(mw, mh), mw, mh, halfDepth, mw / mh, 2, 2);
    if (!s) {
        throw new Error("empty shape");
    }
    return s;
}

const HALF_DEPTH = 0.2;
const OPTS: FoamOptions = {
    halfDepth: HALF_DEPTH,
    cellSize: 0.22,
    regularity: 0.6,
    seed: 1,
    margin: 0.04,
};

const shape = shapeOf(400, 160, HALF_DEPTH);

function seed(f: Foam, i: number): [number, number, number] {
    return [f.seeds[i * 4], f.seeds[i * 4 + 1], f.seeds[i * 4 + 2]];
}

function nearestBrute(f: Foam, x: number, y: number, z: number): number {
    let best = -1;
    let bd = Infinity;
    for (let s = 0; s < f.count; s++) {
        const [a, b, c] = seed(f, s);
        const d = (a - x) ** 2 + (b - y) ** 2 + (c - z) ** 2;
        if (d < bd) {
            bd = d;
            best = s;
        }
    }
    return best;
}

function voxelCentre(f: Foam, v: number): [number, number, number] {
    const [nx, ny] = f.ownerDims;
    const h = f.ownerCell;
    const o = f.ownerOrigin;
    return [
        o[0] + ((v % nx) + 0.5) * h,
        o[1] + ((Math.floor(v / nx) % ny) + 0.5) * h,
        o[2] + (Math.floor(v / (nx * ny)) + 0.5) * h,
    ];
}

describe("buildFoam", () => {
    const foam = buildFoam(shape, OPTS);

    test("places a few large cells", () => {
        expect(foam.count).toBeGreaterThanOrEqual(10);
        expect(foam.count).toBeLessThanOrEqual(80);
        expect(foam.seeds.length).toBe(foam.count * 4);
    });

    test("every seed is inside the shape", () => {
        for (let i = 0; i < foam.count; i++) {
            const [x, y, z] = seed(foam, i);
            expect(insideDistance(shape, HALF_DEPTH, x, y, z)).toBeGreaterThan(
                0,
            );
        }
    });

    test("seeds keep their distance, and the thin bar gets seeds", () => {
        let minD = Infinity;
        let inBar = 0;
        for (let i = 0; i < foam.count; i++) {
            const a = seed(foam, i);
            // The bar is v 0.1..0.2 of the 160 px high mask: y in
            // [-0.32, -0.24] in world units (long side 2), alone between
            // the first two blobs.
            if (a[1] < -0.2 && Math.abs(a[0] + 0.22) < 0.17) {
                inBar++;
            }
            for (let j = i + 1; j < foam.count; j++) {
                const b = seed(foam, j);
                minD = Math.min(
                    minD,
                    Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
                );
            }
        }
        expect(minD).toBeGreaterThan(OPTS.cellSize * 0.35);
        expect(inBar).toBeGreaterThanOrEqual(2);
    });

    test("is deterministic for a seed", () => {
        const again = buildFoam(shape, OPTS);
        expect(again.seeds).toEqual(foam.seeds);
        expect(again.owner).toEqual(foam.owner);
        expect(again.neighbours).toEqual(foam.neighbours);
        const other = buildFoam(shape, { ...OPTS, seed: 2 });
        expect(other.seeds).not.toEqual(foam.seeds);
    });

    test("regularity evens out the cells", () => {
        // Spread of the cells' volumes, from the owner grid.
        const spread = (f: Foam) => {
            const vol = new Float64Array(f.count);
            for (let v = 0; v < f.owner.length; v++) {
                const [x, y, z] = voxelCentre(f, v);
                if (insideDistance(shape, HALF_DEPTH, x, y, z) > 0) {
                    vol[f.owner[v]]++;
                }
            }
            const m = vol.reduce((a, b) => a + b, 0) / f.count;
            const sd = Math.sqrt(
                vol.reduce((a, b) => a + (b - m) ** 2, 0) / f.count,
            );
            return sd / m;
        };
        const raw = buildFoam(shape, { ...OPTS, regularity: 0 });
        expect(spread(foam)).toBeLessThan(spread(raw));
    });

    test("the owner grid holds each voxel's nearest seed", () => {
        expect(foam.owner.length).toBe(
            foam.ownerDims[0] * foam.ownerDims[1] * foam.ownerDims[2],
        );
        let near = 0;
        for (let v = 0; v < foam.owner.length; v++) {
            const [x, y, z] = voxelCentre(foam, v);
            const inner = insideDistance(shape, HALF_DEPTH, x, y, z);
            if (foam.owner[v] < 0) {
                // Only far out of the shape.
                expect(inner).toBeLessThan(-OPTS.margin);
                continue;
            }
            near++;
            const b = nearestBrute(foam, x, y, z);
            if (foam.owner[v] !== b) {
                // Only a tie may differ.
                const [a0, a1, a2] = seed(foam, foam.owner[v]);
                const [b0, b1, b2] = seed(foam, b);
                expect(
                    Math.hypot(a0 - x, a1 - y, a2 - z) -
                        Math.hypot(b0 - x, b1 - y, b2 - z),
                ).toBeLessThan(1e-9);
            }
            expect(foam.ownerData[v]).toBe(foam.owner[v]);
        }
        expect(near).toBeGreaterThan(foam.owner.length / 4);
        expect(foam.ownerData.length).toBe(
            FOAM_OWNER_TEX_W * foam.ownerTexH * 4,
        );
    });

    test("neighbour lists are symmetric and hold every touching cell", () => {
        const K = FOAM_NEIGHBOURS;
        const list = (s: number) =>
            Array.from(foam.neighbours.subarray(s * K, (s + 1) * K)).filter(
                (n) => n >= 0,
            );
        expect(foam.truncated).toBe(0);
        // Fine sampling: points whose two nearest seeds are nearly tied
        // lie on a wall, and each must list the other.
        let walls = 0;
        const [sx, sy] = shape.shapeHalf;
        for (let k = 0; k < 20000; k++) {
            const x = (((k * 0.618034) % 1) * 2 - 1) * sx;
            const y = (((k * 0.414214) % 1) * 2 - 1) * sy;
            const z = (((k * 0.732051) % 1) * 2 - 1) * HALF_DEPTH;
            if (insideDistance(shape, HALF_DEPTH, x, y, z) <= 0) {
                continue;
            }
            const d = Array.from({ length: foam.count }, (_, s) => {
                const [a, b, c] = seed(foam, s);
                return [Math.hypot(a - x, b - y, c - z), s];
            }).sort((p, q) => p[0] - q[0]);
            if (d[1][0] - d[0][0] < 0.01) {
                walls++;
                expect(list(d[0][1])).toContain(d[1][1]);
                expect(list(d[1][1])).toContain(d[0][1]);
            }
        }
        expect(walls).toBeGreaterThan(50);
        // Seed texture rows: the seed, then its neighbours' seeds and
        // indices, -1 after the last.
        for (let s = 0; s < foam.count; s++) {
            const row = s * FOAM_SEED_TEXELS * 4;
            expect(Array.from(foam.seedData.subarray(row, row + 4))).toEqual(
                Array.from(foam.seeds.subarray(s * 4, s * 4 + 4)),
            );
            const nb = list(s);
            for (let n = 0; n < K; n++) {
                const o = row + 4 + n * 4;
                if (n >= nb.length) {
                    expect(foam.seedData[o + 3]).toBe(-1);
                    continue;
                }
                expect(foam.seedData[o + 3]).toBe(nb[n]);
                expect(Array.from(foam.seedData.subarray(o, o + 3))).toEqual(
                    Array.from(foam.seeds.subarray(nb[n] * 4, nb[n] * 4 + 3)),
                );
            }
        }
    });

    test("seed rows follow the offsets", () => {
        const off = new Float32Array(foam.count * 3).map((_, i) => i * 1e-3);
        const rows = new Float32Array(foam.seedData.length);
        foamSeedRows(foam.seeds, foam.neighbours, off, rows);
        const j = foam.neighbours[0];
        expect(rows[0]).toBeCloseTo(foam.seeds[0], 6);
        expect(rows[4]).toBeCloseTo(foam.seeds[j * 4] + off[j * 3], 6);
        expect(rows[6]).toBeCloseTo(foam.seeds[j * 4 + 2] + off[j * 3 + 2], 6);
    });

    test("caps the cells", () => {
        const f = buildFoam(shape, { ...OPTS, cellSize: 0.02 });
        expect(f.count).toBeLessThanOrEqual(FOAM_MAX_CELLS);
        expect(f.count).toBeGreaterThan(FOAM_MAX_CELLS / 3);
    });

    test("is fast enough for the main thread", () => {
        // A silhouette at the size BubbleEffect reads back. The best of a
        // few runs, so other test files running alongside do not count.
        const big = shapeOf(512, 200, HALF_DEPTH);
        const best = (opts: FoamOptions, runs: number) => {
            let ms = Infinity;
            let f = buildFoam(big, opts);
            for (let i = 0; i < runs; i++) {
                const t0 = performance.now();
                f = buildFoam(big, opts);
                ms = Math.min(ms, performance.now() - t0);
            }
            return { f, ms };
        };
        const a = best(OPTS, 5);
        const b = best({ ...OPTS, cellSize: 0.08 }, 2);
        console.log(
            `buildFoam: ${a.f.count} cells, grid ${a.f.ownerDims.join("x")}, ${a.ms.toFixed(1)} ms; ${b.f.count} cells, grid ${b.f.ownerDims.join("x")}, ${b.ms.toFixed(1)} ms`,
        );
        expect(a.ms).toBeLessThan(30);
        // The most cells: once, when a seed param changes.
        expect(b.ms).toBeLessThan(400);
    });
});
