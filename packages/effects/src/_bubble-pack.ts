// BubbleEffect's "packed" foam: the seeds of the 3D Voronoi cells that
// partition the extruded silhouette, placed on the CPU. Pure module: no
// GL, Node-testable.
//
// 1. Seeds are thrown like darts (Poisson-disk-like) into the inside of
//    the volume, deep places first, so thin strokes still get seeds along
//    their middle.
// 2. A few rounds of Lloyd relaxation on a voxel grid even out the cells.
// 3. Each seed gets a list of its neighbours (the seeds whose cells touch
//    its own on the grid, then the nearest others), and the grid keeps the
//    nearest seed of every voxel: the shader's first guess of a point's
//    cell, which it refines through the neighbour lists.
import type { ShapeData } from "./_silhouette.js";

/** Most cells a foam has. */
export const FOAM_MAX_CELLS = 256;
/** Neighbours listed per cell: four RGBA texels. */
export const FOAM_NEIGHBOURS = 16;
/** Texels per row of the seed texture: the seed, then its neighbours. */
export const FOAM_SEED_TEXELS = 1 + FOAM_NEIGHBOURS;
/** Width of the owner texture (four voxels per RGBA texel). */
export const FOAM_OWNER_TEX_W = 1024;
// Voxels per cell size along an axis, and the most voxels in all.
const VOXELS_PER_CELL = 4;
const VOXELS_MAX = 160_000;
// Dart spacing relative to the cell size.
const DART_SPACING = 0.85;
// Seeds listed beyond the touching ones, at most.
const EXTRA_NEIGHBOURS = 3;
// Lloyd rounds at regularity 1.
const LLOYD_MAX_ROUNDS = 8;

export type FoamOptions = {
    /** Half the extrusion depth, world units. */
    halfDepth: number;
    /** Distance between neighbouring seeds, world units. */
    cellSize: number;
    /** 0 to 1: rounds of Lloyd relaxation, from none to evenly sized. */
    regularity: number;
    /** Seed of the random placement. */
    seed: number;
    /**
     * How far the owner grid reaches outside the shape, world units: as
     * far as a cell can (a negative skin, rounding).
     */
    margin: number;
};

export type Foam = {
    /** x, y, z, R per cell: the seed, and the radius of its cell. */
    seeds: Float32Array;
    count: number;
    /** FOAM_NEIGHBOURS per cell, nearest first, -1 for an empty slot. */
    neighbours: Int32Array;
    /** Cells whose touching neighbours did not all fit the list. */
    truncated: number;
    /** The owner grid: min corner (voxel corner), voxel size, voxels per axis. */
    ownerOrigin: [number, number, number];
    ownerCell: number;
    ownerDims: [number, number, number];
    /**
     * The nearest seed of each voxel centre, x fastest, then y, then z;
     * -1 (0 in the texture) where the voxel is too far out of the shape
     * for any cell to reach.
     */
    owner: Int32Array;
    /**
     * RGBA, FOAM_SEED_TEXELS wide, one row per cell: the seed (x, y, z,
     * R), then each neighbour's seed and index (x, y, z, i; i = -1 after
     * the last). See {@link foamSeedRows}.
     */
    seedData: Float32Array;
    seedTexH: number;
    /** The owner grid, four voxels per texel, rows of FOAM_OWNER_TEX_W. */
    ownerData: Float32Array;
    ownerTexH: number;
};

type Shape2D = Pick<
    ShapeData,
    "sdf" | "sdfW" | "sdfH" | "sdfRect" | "shapeHalf"
>;

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * The 2D signed distance (world units, negative inside) at (x, y),
 * bilinear like the shader's lookup, plus the distance past the grid's
 * edge.
 */
export function sampleSd2(shape: Shape2D, x: number, y: number): number {
    const [rx, ry, rw, rh] = shape.sdfRect;
    const W = shape.sdfW;
    const H = shape.sdfH;
    const u = (x - rx) / rw;
    const v = (y - ry) / rh;
    const cu = Math.min(Math.max(u, 0), 1);
    const cv = Math.min(Math.max(v, 0), 1);
    const out = Math.hypot((u - cu) * rw, (v - cv) * rh);
    const fx = Math.min(Math.max(cu * W - 0.5, 0), W - 1);
    const fy = Math.min(Math.max(cv * H - 0.5, 0), H - 1);
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, W - 1);
    const y1 = Math.min(y0 + 1, H - 1);
    const tx = fx - x0;
    const ty = fy - y0;
    const s = shape.sdf;
    const a = s[(y0 * W + x0) * 4] * (1 - tx) + s[(y0 * W + x1) * 4] * tx;
    const b = s[(y1 * W + x0) * 4] * (1 - tx) + s[(y1 * W + x1) * 4] * tx;
    return a * (1 - ty) + b * ty + out;
}

/**
 * Distance from (x, y, z) to the surface of the extruded shape, positive
 * inside.
 */
export function insideDistance(
    shape: Shape2D,
    halfDepth: number,
    x: number,
    y: number,
    z: number,
): number {
    return Math.min(-sampleSd2(shape, x, y), halfDepth - Math.abs(z));
}

/**
 * Nearest-seed queries through a uniform grid with cells of size `g`:
 * each cell lists the seeds that can be nearest to some point in it (no
 * farther from the cell than the best seed's farthest corner).
 */
class SeedHash {
    readonly #g: number;
    readonly #o: number[];
    readonly #d: number[];
    readonly #start: Int32Array;
    readonly #items: Int32Array;
    readonly #pos: Float64Array;

    constructor(
        pos: Float64Array,
        count: number,
        lo: number[],
        hi: number[],
        g: number,
    ) {
        this.#g = g;
        this.#o = lo;
        const d = [0, 1, 2].map((a) =>
            Math.max(1, Math.ceil((hi[a] - lo[a]) / g)),
        );
        this.#d = d;
        this.#pos = pos;
        const n = d[0] * d[1] * d[2];
        const start = new Int32Array(n + 1);
        const items: number[] = [];
        const near = new Float64Array(count);
        for (let c = 0; c < n; c++) {
            const i = c % d[0];
            const j = Math.floor(c / d[0]) % d[1];
            const k = Math.floor(c / (d[0] * d[1]));
            const x0 = lo[0] + i * g;
            const y0 = lo[1] + j * g;
            const z0 = lo[2] + k * g;
            // The best seed's farthest corner bounds the nearest distance
            // anywhere in the cell.
            let bound = Infinity;
            for (let s = 0; s < count; s++) {
                const px = pos[s * 3];
                const py = pos[s * 3 + 1];
                const pz = pos[s * 3 + 2];
                const fx = Math.max(px - x0, x0 + g - px);
                const fy = Math.max(py - y0, y0 + g - py);
                const fz = Math.max(pz - z0, z0 + g - pz);
                bound = Math.min(bound, fx * fx + fy * fy + fz * fz);
                const ex = Math.max(x0 - px, 0, px - x0 - g);
                const ey = Math.max(y0 - py, 0, py - y0 - g);
                const ez = Math.max(z0 - pz, 0, pz - z0 - g);
                near[s] = ex * ex + ey * ey + ez * ez;
            }
            start[c] = items.length;
            for (let s = 0; s < count; s++) {
                if (near[s] <= bound) {
                    items.push(s);
                }
            }
        }
        start[n] = items.length;
        this.#start = start;
        this.#items = new Int32Array(items);
    }

    #axis(v: number, a: number): number {
        const i = Math.floor((v - this.#o[a]) / this.#g);
        return Math.min(Math.max(i, 0), this.#d[a] - 1);
    }

    /**
     * The nearest seed to (x, y, z), lowest index on a tie, or -1 when
     * there are none. The point must be inside the grid's box.
     */
    nearest(x: number, y: number, z: number): number {
        const d = this.#d;
        const c =
            this.#axis(x, 0) +
            d[0] * (this.#axis(y, 1) + d[1] * this.#axis(z, 2));
        const p = this.#pos;
        const items = this.#items;
        let best = -1;
        let bestD2 = Infinity;
        for (let e = this.#start[c]; e < this.#start[c + 1]; e++) {
            const s = items[e];
            const dx = p[s * 3] - x;
            const dy = p[s * 3 + 1] - y;
            const dz = p[s * 3 + 2] - z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < bestD2 || (d2 === bestD2 && s < best)) {
                bestD2 = d2;
                best = s;
            }
        }
        return best;
    }
}

/**
 * Seeds the foam: dart throwing into the volume, Lloyd relaxation, then
 * the neighbour lists and the owner grid. Deterministic for a seed.
 */
export function buildFoam(shape: Shape2D, opts: FoamOptions): Foam {
    const halfDepth = Math.max(opts.halfDepth, 1e-3);
    const margin = Math.max(opts.margin, 0);
    const rand = mulberry32((opts.seed * 2654435761) ^ 0x2f6b1e3d);
    const [sx, sy] = shape.shapeHalf;

    // The voxel grid over the shape's box, grown by the margin.
    const lo = [-sx - margin, -sy - margin, -halfDepth - margin];
    const hi = [sx + margin, sy + margin, halfDepth + margin];
    const size = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    const cellSize = Math.max(opts.cellSize, 0.01);
    const h = Math.max(
        cellSize / VOXELS_PER_CELL,
        Math.cbrt((size[0] * size[1] * size[2]) / VOXELS_MAX),
    );
    const nx = Math.max(1, Math.ceil(size[0] / h));
    const ny = Math.max(1, Math.ceil(size[1] / h));
    const nz = Math.max(1, Math.ceil(size[2] / h));
    // Centre the grid on the box.
    const ox = -(nx * h) / 2;
    const oy = -(ny * h) / 2;
    const oz = -(nz * h) / 2;
    const nxy = nx * ny;
    const nVox = nxy * nz;
    const gridLo = [ox, oy, oz];
    const gridHi = [-ox, -oy, -oz];

    // Depth of each voxel centre inside the shape (> 0 inside).
    const col = new Float32Array(nxy);
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            col[j * nx + i] = -sampleSd2(
                shape,
                ox + (i + 0.5) * h,
                oy + (j + 0.5) * h,
            );
        }
    }
    const inside: number[] = [];
    const depth: number[] = [];
    // Voxels near enough the shape for a cell to reach: only their owner
    // matters to the shader.
    const near = new Uint8Array(nVox);
    const reach = -(margin + h * 1.5);
    for (let k = 0; k < nz; k++) {
        const dz = halfDepth - Math.abs(oz + (k + 0.5) * h);
        for (let j = 0; j < nxy; j++) {
            const d = Math.min(col[j], dz);
            if (d > reach) {
                near[k * nxy + j] = 1;
            }
            if (d > 0) {
                inside.push(k * nxy + j);
                depth.push(d);
            }
        }
    }
    const nIn = inside.length;
    const vx = (v: number) => ox + ((v % nx) + 0.5) * h;
    const vy = (v: number) => oy + ((Math.floor(v / nx) % ny) + 0.5) * h;
    const vz = (v: number) => oz + (Math.floor(v / nxy) + 0.5) * h;
    // Centres of the inside voxels.
    const ix = new Float64Array(nIn);
    const iy = new Float64Array(nIn);
    const iz = new Float64Array(nIn);
    for (let e = 0; e < nIn; e++) {
        ix[e] = vx(inside[e]);
        iy[e] = vy(inside[e]);
        iz[e] = vz(inside[e]);
    }

    // Too many cells for the budget: space them wider, on a coarser
    // grid.
    const estimate = (nIn * h * h * h) / cellSize ** 3;
    if (estimate > FOAM_MAX_CELLS) {
        return buildFoam(shape, {
            ...opts,
            cellSize: cellSize * Math.cbrt(estimate / (FOAM_MAX_CELLS * 0.85)),
        });
    }

    // Darts, deep places first (capped, so the cores of thick parts are
    // all alike and chosen at random).
    const cap = cellSize * 0.3;
    // A shape thinner than about a cell and a half gets one layer of
    // cells through its depth, seeded in its middle plane.
    const flat = 2 * halfDepth < 1.5 * cellSize;
    // Sorted as numbers: the quantised key, then the index.
    const order = new Float64Array(nIn);
    const q = h / 64;
    for (let e = 0; e < nIn; e++) {
        const k = Math.min(depth[e], cap) + rand() * h * 0.5;
        order[e] = Math.round((cap + h - k) / q) * nIn + e;
    }
    order.sort();
    const spacing = cellSize * DART_SPACING;
    const pos: number[] = [];
    {
        const g = spacing;
        const gd = [0, 1, 2].map((a) => Math.max(1, Math.ceil(size[a] / g)));
        const buckets = new Map<number, number[]>();
        const ax = (v: number, a: number) =>
            Math.min(Math.max(Math.floor((v - lo[a]) / g), 0), gd[a] - 1);
        for (let e = 0; e < nIn && pos.length / 3 < FOAM_MAX_CELLS; e++) {
            const v = order[e] % nIn;
            const x = ix[v] + (rand() - 0.5) * h * 0.5;
            const y = iy[v] + (rand() - 0.5) * h * 0.5;
            const jz = (rand() - 0.5) * h * 0.5;
            const z = flat ? 0 : iz[v] + jz;
            const ci = ax(x, 0);
            const cj = ax(y, 1);
            const ck = ax(z, 2);
            let ok = true;
            for (let k = ck - 1; k <= ck + 1 && ok; k++) {
                for (let j = cj - 1; j <= cj + 1 && ok; j++) {
                    for (let i = ci - 1; i <= ci + 1 && ok; i++) {
                        const list = buckets.get(i + gd[0] * (j + gd[1] * k));
                        if (!list) {
                            continue;
                        }
                        for (const s of list) {
                            const dx = pos[s * 3] - x;
                            const dy = pos[s * 3 + 1] - y;
                            const dz = pos[s * 3 + 2] - z;
                            if (dx * dx + dy * dy + dz * dz < g * g) {
                                ok = false;
                                break;
                            }
                        }
                    }
                }
            }
            if (!ok) {
                continue;
            }
            const id = ci + gd[0] * (cj + gd[1] * ck);
            const list = buckets.get(id) ?? [];
            buckets.set(id, list);
            list.push(pos.length / 3);
            pos.push(x, y, z);
        }
    }
    const count = pos.length / 3;
    const seeds = new Float64Array(pos);

    // Lloyd relaxation over the inside voxels. A centroid outside the
    // shape (a bent cell) is replaced by the cell's voxel nearest to it.
    const rounds = Math.round(
        Math.min(Math.max(opts.regularity, 0), 1) * LLOYD_MAX_ROUNDS,
    );
    const assign = new Int32Array(nIn);
    const sum = new Float64Array(count * 4);
    const assignAll = (): void => {
        const hash = new SeedHash(seeds, count, gridLo, gridHi, cellSize / 2);
        for (let e = 0; e < nIn; e++) {
            assign[e] = hash.nearest(ix[e], iy[e], iz[e]);
        }
    };
    for (let round = 0; round < rounds && count > 0; round++) {
        assignAll();
        sum.fill(0);
        for (let e = 0; e < nIn; e++) {
            const s = assign[e];
            sum[s * 4] += ix[e];
            sum[s * 4 + 1] += iy[e];
            sum[s * 4 + 2] += iz[e];
            sum[s * 4 + 3] += 1;
        }
        const bent: number[] = [];
        for (let s = 0; s < count; s++) {
            const n = sum[s * 4 + 3];
            if (n === 0) {
                continue;
            }
            const x = sum[s * 4] / n;
            const y = sum[s * 4 + 1] / n;
            const z = sum[s * 4 + 2] / n;
            if (insideDistance(shape, halfDepth, x, y, z) > h * 0.5) {
                seeds[s * 3] = x;
                seeds[s * 3 + 1] = y;
                seeds[s * 3 + 2] = flat ? 0 : z;
            } else {
                sum[s * 4] = x;
                sum[s * 4 + 1] = y;
                sum[s * 4 + 2] = z;
                bent.push(s);
            }
        }
        if (bent.length > 0) {
            const best = new Float64Array(count).fill(Infinity);
            const isBent = new Uint8Array(count);
            for (const s of bent) {
                isBent[s] = 1;
            }
            for (let e = 0; e < nIn; e++) {
                const s = assign[e];
                if (!isBent[s]) {
                    continue;
                }
                const d2 =
                    (ix[e] - sum[s * 4]) ** 2 +
                    (iy[e] - sum[s * 4 + 1]) ** 2 +
                    (iz[e] - sum[s * 4 + 2]) ** 2;
                if (d2 < best[s]) {
                    best[s] = d2;
                    seeds[s * 3] = ix[e];
                    seeds[s * 3 + 1] = iy[e];
                    seeds[s * 3 + 2] = flat ? 0 : iz[e];
                }
            }
        }
    }

    // The shader sees float32 seeds: work with the same values.
    for (let i = 0; i < seeds.length; i++) {
        seeds[i] = Math.fround(seeds[i]);
    }

    // The owner of every voxel, and the cells' radii (farthest inside
    // voxel corner from the seed).
    const owner = new Int32Array(nVox).fill(-1);
    const radius = new Float64Array(count);
    if (count > 0) {
        const hash = new SeedHash(seeds, count, gridLo, gridHi, cellSize / 2);
        for (let k = 0, v = 0; k < nz; k++) {
            const z = oz + (k + 0.5) * h;
            for (let j = 0; j < ny; j++) {
                const y = oy + (j + 0.5) * h;
                for (let i = 0; i < nx; i++, v++) {
                    if (near[v]) {
                        owner[v] = hash.nearest(ox + (i + 0.5) * h, y, z);
                    }
                }
            }
        }
        const half = h * 0.866;
        for (let e = 0; e < nIn; e++) {
            const s = owner[inside[e]];
            const d = Math.hypot(
                ix[e] - seeds[s * 3],
                iy[e] - seeds[s * 3 + 1],
                iz[e] - seeds[s * 3 + 2],
            );
            radius[s] = Math.max(radius[s], d + half);
        }
    }

    // Neighbours: cells that touch on the grid, nearest first, then the
    // nearest others, so a seed's drift does not miss a wall.
    const touch = new Uint8Array(count * count);
    const link = (a: number, b: number) => {
        if (a !== b) {
            touch[a * count + b] = 1;
            touch[b * count + a] = 1;
        }
    };
    for (let k = 0; k < nz; k++) {
        for (let j = 0; j < ny; j++) {
            for (let i = 0; i < nx; i++) {
                const v = i + nx * (j + ny * k);
                // 6-connected, and the diagonals within a slice and
                // across, so a thin face is not missed.
                for (let dk = 0; dk <= 1; dk++) {
                    for (let dj = -1; dj <= 1; dj++) {
                        for (let di = -1; di <= 1; di++) {
                            if (dk === 0 && (dj < 0 || (dj === 0 && di <= 0))) {
                                continue;
                            }
                            const ii = i + di;
                            const jj = j + dj;
                            const kk = k + dk;
                            if (
                                ii < 0 ||
                                ii >= nx ||
                                jj < 0 ||
                                jj >= ny ||
                                kk >= nz
                            ) {
                                continue;
                            }
                            const w = owner[ii + nx * (jj + ny * kk)];
                            if (owner[v] >= 0 && w >= 0) {
                                link(owner[v], w);
                            }
                        }
                    }
                }
            }
        }
    }
    const neighbours = new Int32Array(count * FOAM_NEIGHBOURS).fill(-1);
    let truncated = 0;
    const dist2 = (a: number, b: number) =>
        (seeds[a * 3] - seeds[b * 3]) ** 2 +
        (seeds[a * 3 + 1] - seeds[b * 3 + 1]) ** 2 +
        (seeds[a * 3 + 2] - seeds[b * 3 + 2]) ** 2;
    for (let s = 0; s < count; s++) {
        const touching: number[] = [];
        for (let o = 0; o < count; o++) {
            if (touch[s * count + o]) {
                touching.push(o);
            }
        }
        touching.sort((a, b) => dist2(s, a) - dist2(s, b) || a - b);
        if (touching.length > FOAM_NEIGHBOURS) {
            truncated++;
        }
        const list = touching.slice(0, FOAM_NEIGHBOURS);
        // A few of the nearest others, in case a seed's drift brings
        // them into touch.
        const others: number[] = [];
        for (let o = 0; o < count; o++) {
            if (
                o !== s &&
                !touch[s * count + o] &&
                dist2(s, o) < (2 * cellSize) ** 2
            ) {
                others.push(o);
            }
        }
        others.sort((a, b) => dist2(s, a) - dist2(s, b) || a - b);
        for (const o of others.slice(0, EXTRA_NEIGHBOURS)) {
            if (list.length < FOAM_NEIGHBOURS) {
                list.push(o);
            }
        }
        for (let n = 0; n < list.length; n++) {
            neighbours[s * FOAM_NEIGHBOURS + n] = list[n];
        }
    }

    // Textures.
    const out = new Float32Array(count * 4);
    for (let s = 0; s < count; s++) {
        for (let a = 0; a < 3; a++) {
            out[s * 4 + a] = seeds[s * 3 + a];
        }
        out[s * 4 + 3] = radius[s];
    }
    const seedTexH = Math.max(1, count);
    const seedData = new Float32Array(FOAM_SEED_TEXELS * seedTexH * 4);
    foamSeedRows(out, neighbours, null, seedData);
    const ownerTexH = Math.max(1, Math.ceil(nVox / 4 / FOAM_OWNER_TEX_W));
    const ownerData = new Float32Array(FOAM_OWNER_TEX_W * ownerTexH * 4).fill(
        0,
    );
    for (let v = 0; v < nVox; v++) {
        ownerData[v] = Math.max(owner[v], 0);
    }

    return {
        seeds: out,
        count,
        neighbours,
        truncated,
        ownerOrigin: [ox, oy, oz],
        ownerCell: h,
        ownerDims: [nx, ny, nz],
        owner,
        seedData,
        seedTexH,
        ownerData,
        ownerTexH,
    };
}

/**
 * Fills `out` with the seed texture's rows (see {@link Foam.seedData}):
 * each cell's seed and its neighbours' seeds inline, so the shader needs
 * no lookup through an index. `offsets` (x, y, z per cell) moves the
 * seeds, for their drift.
 */
export function foamSeedRows(
    seeds: Float32Array,
    neighbours: Int32Array,
    offsets: Float32Array | null,
    out: Float32Array,
): void {
    const count = seeds.length / 4;
    const W = FOAM_SEED_TEXELS * 4;
    const at = (s: number, a: number) =>
        seeds[s * 4 + a] + (offsets ? offsets[s * 3 + a] : 0);
    for (let s = 0; s < count; s++) {
        const row = s * W;
        for (let a = 0; a < 3; a++) {
            out[row + a] = at(s, a);
        }
        out[row + 3] = seeds[s * 4 + 3];
        let n = 0;
        for (; n < FOAM_NEIGHBOURS; n++) {
            const j = neighbours[s * FOAM_NEIGHBOURS + n];
            const o = row + 4 + n * 4;
            if (j < 0) {
                break;
            }
            out[o] = at(j, 0);
            out[o + 1] = at(j, 1);
            out[o + 2] = at(j, 2);
            out[o + 3] = j;
        }
        for (; n < FOAM_NEIGHBOURS; n++) {
            out.fill(0, row + 4 + n * 4, row + 7 + n * 4);
            out[row + 7 + n * 4] = -1;
        }
    }
}
