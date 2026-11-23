import { describe, expect, test } from "vitest";
import {
    BUBBLE_LIST_MAX,
    BUBBLE_MAX_COUNT,
    BUBBLE_TEX_W,
    type BubbleFill,
    buildSphereGrid,
    type FillOptions,
    fillShape,
    hash4,
    insideDistance,
    placeBubbles,
    type SphereGrid,
    sampleSd2,
} from "./_bubble-fill.js";
import { buildShape, type ShapeData } from "./_silhouette.js";

// A silhouette like a logo: thick and thin strokes, a ring and a dot,
// mw x mh px, RGBA bottom-up.
function mask(mw: number, mh: number): Uint8Array {
    const px = new Uint8Array(mw * mh * 4);
    // Distance from (x, y) to the segment a-b, in px.
    const seg = (
        x: number,
        y: number,
        ax: number,
        ay: number,
        bx: number,
        by: number,
    ) => {
        const dx = bx - ax;
        const dy = by - ay;
        const t = Math.min(
            Math.max(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0),
            1,
        );
        return Math.hypot(x - ax - t * dx, y - ay - t * dy);
    };
    for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
            const u = x * (512 / mw);
            const v = y * (212 / mh);
            const ink =
                seg(u, v, 20, 180, 70, 30) < 14 ||
                seg(u, v, 70, 30, 120, 180) < 9 ||
                seg(u, v, 150, 180, 150, 30) < 16 ||
                seg(u, v, 150, 105, 210, 105) < 7 ||
                seg(u, v, 150, 180, 230, 180) < 12 ||
                Math.abs(Math.hypot(u - 300, v - 105) - 55) < 13 ||
                seg(u, v, 380, 40, 490, 170) < 11 ||
                seg(u, v, 380, 170, 490, 40) < 6 ||
                Math.hypot(u - 440, v - 190) < 12;
            if (ink) {
                px[(y * mw + x) * 4 + 3] = 255;
            }
        }
    }
    return px;
}

function shapeOf(): ShapeData {
    const s = buildShape(mask(512, 212), 512, 212, 0.05, 512 / 212, 2, 2);
    if (!s) {
        throw new Error("empty shape");
    }
    return s;
}

const shape = shapeOf();

// The effect's defaults.
const OPTS: FillOptions = {
    halfDepth: 0.05,
    cellSize: 0.1,
    jitter: 0.6,
    roundness: 0.3,
    cellSizeRandomness: 0.25,
    seed: 1,
    skin: 0,
    minSize: 0.25,
};

function sphere(f: { spheres: Float32Array }, i: number) {
    const s = f.spheres;
    return [s[i * 4], s[i * 4 + 1], s[i * 4 + 2], s[i * 4 + 3]] as const;
}

// Share of the interior's sample points inside some sphere.
function filledShare(f: BubbleFill, halfDepth: number): number {
    let n = 0;
    let hit = 0;
    const h = 0.01;
    for (let x = -1; x < 1; x += h) {
        for (let y = -0.45; y < 0.45; y += h) {
            for (let z = -halfDepth + h / 2; z < halfDepth; z += h) {
                if (insideDistance(shape, halfDepth, x, y, z) <= 0) {
                    continue;
                }
                n++;
                for (let i = 0; i < f.count; i++) {
                    const [cx, cy, cz, r] = sphere(f, i);
                    if ((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2 < r * r) {
                        hit++;
                        break;
                    }
                }
            }
        }
    }
    return hit / n;
}

// Share of the silhouette's sample points covered by some sphere, seen
// from the front.
function projectedShare(f: BubbleFill): number {
    let n = 0;
    let hit = 0;
    const h = 0.005;
    for (let x = -1; x < 1; x += h) {
        for (let y = -0.45; y < 0.45; y += h) {
            if (sampleSd2(shape, x, y)[0] >= 0) {
                continue;
            }
            n++;
            for (let i = 0; i < f.count; i++) {
                const [cx, cy, , r] = sphere(f, i);
                if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) {
                    hit++;
                    break;
                }
            }
        }
    }
    return hit / n;
}

describe("hash4", () => {
    test("is deterministic, in [0, 1], and depends on every input", () => {
        const a = hash4(1, 4096, 4097, 4098);
        for (const v of a) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
        }
        expect(hash4(2, 4096, 4097, 4098)).not.toEqual(a);
        expect(hash4(1, 4097, 4097, 4098)).not.toEqual(a);
        expect(hash4(1, 4096, 4097, 4098)).toEqual(a);
    });
});

describe("placeBubbles", () => {
    const fill = placeBubbles(shape, OPTS);
    const noFill = placeBubbles(shape, { ...OPTS, minSize: 1 });

    test("the lattice comes first, the fill adds to it", () => {
        expect(fill.latticeCount).toBe(noFill.count);
        expect(fill.count).toBeGreaterThan(fill.latticeCount * 1.3);
        expect(fill.count).toBeLessThan(BUBBLE_MAX_COUNT / 4);
        expect(fill.capped).toBe(false);
        for (let i = 0; i < noFill.count * 4; i++) {
            expect(fill.spheres[i]).toBe(noFill.spheres[i]);
        }
    });

    test("every centre is inside the shape, by the allowed protrusion", () => {
        const { protrude } = fillShape(OPTS);
        for (let i = 0; i < fill.count; i++) {
            const [x, y, z, r] = sphere(fill, i);
            expect(r).toBeGreaterThan(0);
            expect(Math.abs(z)).toBeLessThanOrEqual(OPTS.halfDepth + 1e-6);
            expect(sampleSd2(shape, x, y)[0]).toBeLessThan(protrude);
            if (i >= fill.latticeCount) {
                // The fill's centres are inside; its spheres poke out by
                // a share of their radius (plus a little, to reach a
                // neighbour).
                const d = insideDistance(shape, OPTS.halfDepth, x, y, z);
                expect(d).toBeGreaterThan(0);
                expect(r).toBeLessThanOrEqual(
                    Math.min(-sampleSd2(shape, x, y)[0] + protrude, 2 * d) +
                        0.5 * OPTS.minSize * OPTS.cellSize +
                        1e-5,
                );
            }
        }
    });

    test("the fill's spheres are at least minSize / 2 cells wide", () => {
        for (let i = fill.latticeCount; i < fill.count; i++) {
            expect(sphere(fill, i)[3]).toBeGreaterThan(
                0.5 * 0.5 * OPTS.minSize * OPTS.cellSize,
            );
        }
    });

    test("no sphere is fully dominated: each owns its own centre", () => {
        for (let i = 0; i < fill.count; i++) {
            const [x, y, z, r] = sphere(fill, i);
            const own = -r * r;
            for (let j = 0; j < fill.count; j++) {
                if (j === i) {
                    continue;
                }
                const [cx, cy, cz, rj] = sphere(fill, j);
                const pj =
                    (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2 - rj * rj;
                expect(pj).toBeGreaterThan(own);
            }
        }
    });

    test("the filling spheres cut into their neighbours: shared walls", () => {
        // Every one overlaps a neighbour; most cut into one by a tenth of
        // their radius or more (those limited by the outline less).
        let touch = 0;
        let cut = 0;
        for (let i = fill.latticeCount; i < fill.count; i++) {
            const [x, y, z, r] = sphere(fill, i);
            let deepest = -Infinity;
            for (let j = 0; j < fill.count; j++) {
                const [cx, cy, cz, rj] = sphere(fill, j);
                if (j !== i) {
                    const pen = r + rj - Math.hypot(x - cx, y - cy, z - cz);
                    deepest = Math.max(deepest, pen / r);
                }
            }
            touch += deepest > 0 ? 1 : 0;
            cut += deepest > 0.1 ? 1 : 0;
        }
        const n = fill.count - fill.latticeCount;
        expect(touch).toBe(n);
        expect(cut / n).toBeGreaterThan(0.7);
    });

    test("deterministic for a seed, different for another", () => {
        const again = placeBubbles(shape, OPTS);
        expect(again.count).toBe(fill.count);
        expect(Array.from(again.spheres)).toEqual(Array.from(fill.spheres));
        const other = placeBubbles(shape, { ...OPTS, seed: 2 });
        expect(Array.from(other.spheres)).not.toEqual(Array.from(fill.spheres));
    });

    test("the fill fills the gaps the lattice leaves", () => {
        const a = filledShare(noFill, OPTS.halfDepth);
        const b = filledShare(fill, OPTS.halfDepth);
        const pa = projectedShare(noFill);
        const pb = projectedShare(fill);
        // Measured: volume 0.57 -> 0.71, seen from the front 0.79 -> 0.97.
        // The volume keeps slivers thinner than minSize between spheres.
        expect(b - a).toBeGreaterThan(0.1);
        expect(pa).toBeLessThan(0.85);
        expect(pb).toBeGreaterThan(0.95);
    });

    test("bigger cells: the fill does more", () => {
        const o = { ...OPTS, cellSize: 0.16, halfDepth: 0.08, minSize: 0.18 };
        const big = placeBubbles(shape, o);
        const bigNo = placeBubbles(shape, { ...o, minSize: 1 });
        // Measured: volume 0.49 -> 0.72, from the front 0.73 -> 0.985,
        // 46 -> 253 spheres.
        expect(big.count).toBeGreaterThan(bigNo.count * 3);
        expect(
            filledShare(big, o.halfDepth) - filledShare(bigNo, o.halfDepth),
        ).toBeGreaterThan(0.15);
        expect(projectedShare(bigNo)).toBeLessThan(0.8);
        expect(projectedShare(big)).toBeGreaterThan(0.95);
    });

    test("maxCount caps the count", () => {
        const f = placeBubbles(shape, {
            ...OPTS,
            minSize: 0.05,
            maxCount: 300,
        });
        expect(f.count).toBe(300);
        expect(f.capped).toBe(true);
    });

    test("reach bounds how far the spheres reach out of the shape", () => {
        for (let i = 0; i < fill.count; i++) {
            const [x, y, z, r] = sphere(fill, i);
            const d = -insideDistance(shape, OPTS.halfDepth, x, y, z);
            expect(d + r).toBeLessThanOrEqual(fill.reach + 1e-5);
        }
    });

    test("fast enough at the defaults", () => {
        placeBubbles(shape, OPTS);
        const t = performance.now();
        const f = placeBubbles(shape, OPTS);
        const ms = performance.now() - t;
        console.log(
            `placeBubbles: ${f.count} spheres (${f.latticeCount} lattice), ${f.voxels} voxels, ${ms.toFixed(1)} ms`,
        );
        expect(ms).toBeLessThan(150);
    });
});

// Every cell's list, read back from the textures.
function lists(g: SphereGrid): number[][] {
    const [nx, ny, nz] = g.dims;
    const out: number[][] = [];
    for (let id = 0; id < nx * ny * nz; id++) {
        const off = g.cellData[id * 4];
        const n = g.cellData[id * 4 + 1];
        out.push(Array.from(g.index.subarray(off, off + n)));
    }
    return out;
}

// Brute force: does the sphere, grown by `grow`, touch the cell?
function touches(g: SphereGrid, s: number, id: number, grow: number) {
    const [nx, ny] = g.dims;
    const c = [id % nx, Math.floor(id / nx) % ny, Math.floor(id / (nx * ny))];
    let d2 = 0;
    for (let a = 0; a < 3; a++) {
        const lo = g.origin[a] + c[a] * g.cell;
        const v = g.spheres[s * 4 + a];
        const e = Math.max(lo - v, 0, v - lo - g.cell);
        d2 += e * e;
    }
    return d2 <= (g.spheres[s * 4 + 3] * grow) ** 2;
}

describe("buildSphereGrid", () => {
    test("every sphere touching a cell is in its list, and no other", () => {
        const f = placeBubbles(shape, { ...OPTS, cellSize: 0.2 });
        const wobble = 0.1;
        const g = buildSphereGrid(f.spheres, wobble, 0.2);
        expect(g.dropped).toBe(0);
        expect(g.count).toBe(f.count);
        const ls = lists(g);
        for (let id = 0; id < ls.length; id++) {
            const want: number[] = [];
            for (let s = 0; s < g.count; s++) {
                if (touches(g, s, id, 1 + wobble)) {
                    want.push(s);
                }
            }
            expect([...ls[id]].sort((a, b) => a - b)).toEqual(want);
        }
    });

    test("the grid's box holds every sphere, grown", () => {
        const f = placeBubbles(shape, OPTS);
        const g = buildSphereGrid(f.spheres, 0.15, OPTS.cellSize);
        for (let s = 0; s < g.count; s++) {
            for (let a = 0; a < 3; a++) {
                const v = g.spheres[s * 4 + a];
                const r = g.spheres[s * 4 + 3] * 1.15;
                expect(v - r).toBeGreaterThanOrEqual(g.origin[a] - 1e-6);
                expect(v + r).toBeLessThanOrEqual(
                    g.origin[a] + g.dims[a] * g.cell + 1e-6,
                );
            }
        }
    });

    test("lists fit the shader's bound at the defaults, nothing dropped", () => {
        const f = placeBubbles(shape, OPTS);
        const g = buildSphereGrid(f.spheres, 0.06, OPTS.cellSize);
        expect(g.maxList).toBeLessThanOrEqual(BUBBLE_LIST_MAX);
        expect(g.dropped).toBe(0);
        expect(g.sphereData.length).toBe(BUBBLE_TEX_W * g.sphereTexH * 4);
    });

    test("a crowded cell refines the grid rather than dropping spheres", () => {
        // 60 small spheres in a row through one coarse cell.
        const s: number[] = [];
        for (let i = 0; i < 60; i++) {
            s.push(i * 0.02, 0, 0, 0.012);
        }
        const g = buildSphereGrid(new Float32Array(s), 0, 1);
        expect(g.refinements).toBeGreaterThan(0);
        expect(g.maxList).toBeLessThanOrEqual(BUBBLE_LIST_MAX);
        expect(g.dropped).toBe(0);
        const ls = lists(g);
        for (let id = 0; id < ls.length; id++) {
            for (let k = 0; k < g.count; k++) {
                expect(ls[id].includes(k)).toBe(touches(g, k, id, 1));
            }
        }
    });

    test("spheres no grid can separate are dropped, and lists stay complete", () => {
        // 40 copies of one sphere: no cell size gets them under the bound.
        const s: number[] = [];
        for (let i = 0; i < 40; i++) {
            s.push(0, 0, 0, 0.1 + i * 1e-4);
        }
        const g = buildSphereGrid(new Float32Array(s), 0, 0.1);
        expect(g.maxList).toBeLessThanOrEqual(BUBBLE_LIST_MAX);
        expect(g.count + g.dropped).toBe(40);
        const ls = lists(g);
        for (let id = 0; id < ls.length; id++) {
            for (let k = 0; k < g.count; k++) {
                expect(ls[id].includes(k)).toBe(touches(g, k, id, 1));
            }
        }
    });
});
