import { describe, expect, test } from "vitest";
import {
    type BubblePack,
    insideDistance,
    PACK_SLOTS,
    PACK_TEX_W,
    type PackOptions,
    packBubbles,
} from "./_bubble-pack.js";
import { buildShape, type ShapeData } from "./_silhouette.js";

// A silhouette like a word: three blobs and a bar, mw x mh px, RGBA
// bottom-up.
function mask(mw: number, mh: number): Uint8Array {
    const px = new Uint8Array(mw * mh * 4);
    for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
            const u = x / mw;
            const v = y / mh;
            const blob = (cx: number, r: number) =>
                ((u - cx) * mw) ** 2 + ((v - 0.5) * mh) ** 2 < (r * mh) ** 2;
            const bar = v > 0.1 && v < 0.3 && u > 0.05 && u < 0.95;
            if (blob(0.2, 0.42) || blob(0.5, 0.35) || blob(0.8, 0.4) || bar) {
                px[(y * mw + x) * 4 + 3] = 255;
            }
        }
    }
    return px;
}

function shapeOf(mw: number, mh: number, halfDepth: number): ShapeData {
    const s = buildShape(mask(mw, mh), mw, mh, halfDepth, mw / mh, 4, 3);
    if (!s) {
        throw new Error("empty shape");
    }
    return s;
}

const HALF_DEPTH = 0.25;
const OPTS: PackOptions = {
    halfDepth: HALF_DEPTH,
    maxRadius: 0.125,
    sizeVariation: 0.6,
    overlap: 1.15,
    count: 400,
    seed: 1,
    edgeBulge: 0.04,
    margin: 0.0125,
};

const shape = shapeOf(400, 160, HALF_DEPTH);

function sphere(p: BubblePack, i: number): [number, number, number, number] {
    const s = p.spheres;
    return [s[i * 4], s[i * 4 + 1], s[i * 4 + 2], s[i * 4 + 3]];
}

describe("packBubbles", () => {
    const pack = packBubbles(shape, OPTS);

    test("places a fair number of spheres", () => {
        expect(pack.count).toBeGreaterThan(40);
        expect(pack.count).toBeLessThanOrEqual(OPTS.count);
        expect(pack.spheres.length).toBe(pack.count * 4);
    });

    test("every sphere is inside the shape, bulging out by edgeBulge at most", () => {
        for (let i = 0; i < pack.count; i++) {
            const [x, y, z, r] = sphere(pack, i);
            const d = insideDistance(shape, HALF_DEPTH, x, y, z);
            expect(d).toBeGreaterThan(0);
            expect(r).toBeLessThanOrEqual(d + OPTS.edgeBulge + 1e-5);
            expect(r).toBeLessThanOrEqual(OPTS.maxRadius + 1e-6);
            expect(r).toBeGreaterThanOrEqual(
                OPTS.maxRadius * (1 - OPTS.sizeVariation) - 1e-6,
            );
        }
    });

    test("no pair overlaps more than overlap allows", () => {
        const pen = OPTS.overlap - 1;
        for (let i = 0; i < pack.count; i++) {
            const a = sphere(pack, i);
            for (let j = i + 1; j < pack.count; j++) {
                const b = sphere(pack, j);
                const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
                // The later one fits outside the earlier one shrunk by pen.
                expect(d).toBeGreaterThanOrEqual(
                    b[3] + a[3] * (1 - pen) - 1e-5,
                );
            }
        }
    });

    test("is deterministic for a seed", () => {
        const again = packBubbles(shape, OPTS);
        expect(again.spheres).toEqual(pack.spheres);
        expect(again.gridData).toEqual(pack.gridData);
        const other = packBubbles(shape, { ...OPTS, seed: 2 });
        expect(other.spheres).not.toEqual(pack.spheres);
    });

    test("overlap 1 keeps spheres apart", () => {
        const p = packBubbles(shape, { ...OPTS, overlap: 1 });
        for (let i = 0; i < p.count; i++) {
            const a = sphere(p, i);
            for (let j = i + 1; j < p.count; j++) {
                const b = sphere(p, j);
                const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
                expect(d).toBeGreaterThanOrEqual(a[3] + b[3] - 1e-5);
            }
        }
    });

    test("grid cells list every sphere that reaches into them", () => {
        expect(pack.dropped).toBe(0);
        const [nx, ny, nz] = pack.gridDims;
        const g = pack.gridCell;
        const o = pack.gridOrigin;
        expect(pack.gridData.length).toBe(PACK_TEX_W * pack.gridTexH * 4);
        expect(nx * ny * nz * PACK_SLOTS).toBeLessThanOrEqual(
            pack.gridData.length,
        );
        let checked = 0;
        for (let i = 0; i < pack.count; i++) {
            const [x, y, z, r0] = sphere(pack, i);
            const r = r0 + OPTS.margin;
            for (let cz = 0; cz < nz; cz++) {
                for (let cy = 0; cy < ny; cy++) {
                    for (let cx = 0; cx < nx; cx++) {
                        const c = [x, y, z];
                        const cl = [cx, cy, cz];
                        let d2 = 0;
                        for (let a = 0; a < 3; a++) {
                            const b0 = o[a] + cl[a] * g;
                            const e = Math.max(b0 - c[a], 0, c[a] - b0 - g);
                            d2 += e * e;
                        }
                        if (d2 > r * r) {
                            continue;
                        }
                        const id = cx + nx * (cy + ny * cz);
                        const slots = Array.from(
                            pack.gridData.subarray(
                                id * PACK_SLOTS,
                                (id + 1) * PACK_SLOTS,
                            ),
                        );
                        expect(slots).toContain(i);
                        checked++;
                    }
                }
            }
        }
        expect(checked).toBeGreaterThan(pack.count);
        // The sphere texture holds the spheres in order.
        expect(pack.sphereData.subarray(0, pack.count * 4)).toEqual(
            pack.spheres,
        );
    });

    test("is fast enough for the main thread", () => {
        // A silhouette at the size BubbleEffect reads back.
        const big = shapeOf(1024, 400, HALF_DEPTH);
        packBubbles(big, OPTS);
        const t0 = performance.now();
        const p = packBubbles(big, OPTS);
        const ms = performance.now() - t0;
        console.log(
            `packBubbles: ${p.count} spheres, grid ${p.gridDims.join("x")}, ${ms.toFixed(1)} ms`,
        );
        expect(ms).toBeLessThan(100);
    });
});
