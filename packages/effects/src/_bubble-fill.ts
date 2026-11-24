// BubbleEffect's bubbles, placed on the CPU, and the grid the shader
// walks to find them. Pure module: no GL, Node-testable.
//
// 1. Big bubbles: a Poisson disk sampling of the volume (no two centres
//    closer than a spacing set by the cell size, so no lattice shows),
//    kept a little inside the outline and from poking out of it too far.
// 2. Fill: on a voxel grid over the volume, the clearance of a point is
//    how far it is from every sphere placed so far and from the shape's
//    allowed outside. The voxel with the most clearance gets the next
//    sphere, a little larger than its clearance so that it cuts into its
//    neighbours and shares walls with them, until no gap is wider than
//    `minSize` of a cell.
// 3. Grid: a uniform grid over the spheres, each cell listing every
//    sphere that can reach into it (grown by its drift). The lists are
//    complete: a cell that would list more than the shader can hold makes
//    the grid finer.
//
// No sphere's power cell is empty: each sphere owns its own centre (its
// power there, -r², is below every other sphere's).
import type { ShapeData } from "./_silhouette.js";

export type FillOptions = {
    /** Half the extrusion depth, world units. */
    halfDepth: number;
    /** Radius of the rounded edges, world units (0: sharp). */
    bevel?: number;
    /** Lattice spacing, world units. */
    cellSize: number;
    /** 0 (heavy overlap) to 1 (nearly touching). */
    roundness: number;
    /** 0 to 1: the big bubbles' radii shrink by a random share of this. */
    cellSizeRandomness: number;
    seed: number;
    /** Moves the foam's outside in (positive) or out, world units. */
    skin: number;
    /**
     * Smallest gap the fill fills, per cell size: it places spheres while
     * an empty ball of diameter `minSize * cellSize` fits. 1 or more: no
     * fill.
     */
    minSize: number;
    /** Spheres at most, up to {@link BUBBLE_MAX_COUNT}. */
    maxCount?: number;
};

export type BubbleFill = {
    /** x, y, z, r per sphere: the lattice's first, then the fill's. */
    spheres: Float32Array;
    count: number;
    /** Spheres from the lattice (the first ones). */
    latticeCount: number;
    /** The count reached `maxCount`. */
    capped: boolean;
    /**
     * How far any sphere reaches out of the shape (the extruded 2D field,
     * edges rounded by the bevel), world units.
     */
    reach: number;
    /** The fill's voxel size and count (0 without fill). */
    voxel: number;
    voxels: number;
};

export type FillShape = {
    protrude: number;
    bulgeZ: number;
};

export type SphereGrid = {
    /** The spheres the grid lists (some may be left out, see `dropped`). */
    spheres: Float32Array;
    count: number;
    /** Min corner, cell size, cells per axis. */
    origin: [number, number, number];
    cell: number;
    dims: [number, number, number];
    /**
     * One RGBA texel per cell (x fastest, then y, z), in rows of
     * {@link BUBBLE_TEX_W}: offset into `index`, count, 0, 0.
     */
    cellData: Float32Array;
    cellTexH: number;
    /** Sphere indices, four per texel, in rows of {@link BUBBLE_TEX_W}. */
    index: Float32Array;
    indexTexH: number;
    /** The spheres, one texel each (x, y, z, r). */
    sphereData: Float32Array;
    sphereTexH: number;
    /** Longest list. */
    maxList: number;
    /** Times the cells were shrunk to fit {@link BUBBLE_LIST_MAX}. */
    refinements: number;
    /** Spheres left out because no grid fitted (0 normally). */
    dropped: number;
};

type Shape2D = Pick<ShapeData, "sdf" | "sdfW" | "sdfH" | "sdfRect">;

/** What {@link buildFoam} takes. */
export type FoamInput = {
    shape: Shape2D;
    fill: FillOptions;
    /** Drift per radius, grows the grid's lists. */
    wobble: number;
    /** 0 to 1. */
    containment: number;
};

/** BubbleEffect's foam, as {@link buildFoam} returns it. */
export type FoamData = {
    fill: BubbleFill;
    /** How much the container blew the largest-growing bubble up. */
    grow: number;
    /** What the fill adds to r² deep inside the shape. */
    fillG: number;
    grid: SphereGrid;
    /** The grid the borders are found with; null: `grid` itself. */
    edgeGrid: SphereGrid | null;
    /** Per sphere of `grid`, its drift's frequencies and phases (3 each). */
    drift: Float32Array;
};

/**
 * The placement and the grids as one self-contained function: a worker
 * runs it from its source text (see `_kernel-worker.ts` and
 * `scripts/gen-bubble-kernel.mjs`), so nothing in it may refer to
 * anything outside it.
 */
export function bubbleKernel() {
    /** Width of the data textures, in texels. */
    const BUBBLE_TEX_W = 1024;
    /** Spheres a grid cell lists at most (the shader's bound). */
    const BUBBLE_LIST_MAX = 24;
    /** Spheres placed at most. */
    const BUBBLE_MAX_COUNT = 4096;

    // Radius per lattice spacing at roundness 0 and 1.
    const SPHERE_R_FLAT = 1.0;
    const SPHERE_R_ROUND = 0.52;
    // A filling sphere's radius per clearance at roundness 0 and 1: it cuts
    // into its neighbours by (k - 1) times its clearance. At most 2, so the
    // spheres placed before keep their centres (no empty cells).
    const FILL_K_FLAT = 1.8;
    const FILL_K_ROUND = 1.06;
    // A filling sphere pokes out of the shape by this share of its radius at
    // most (and by the big bubbles' limit).
    const FILL_POKE = 0.3;
    const FILL_POKE_K = FILL_POKE / (1 - FILL_POKE);
    // A filling sphere held back by the shape cuts into its nearest
    // neighbour by this much anyway, when that pokes out by little.
    const FILL_REACH = 1.15;
    // How far a bubble may poke out of the silhouette, and how much further
    // out of the front and back, per cell size.
    const SPHERE_PROTRUDE = 0.3;
    const SPHERE_BULGE_Z = 0.3;
    // The big bubbles' centres stay this deep inside the outline, and this
    // far from the front and back (as far as the depth allows), per cell size.
    const CENTRE_DEPTH = 0.1;
    const CENTRE_Z_MARGIN = 0.35;
    // Least distance between two big bubbles' centres, per cell size: about
    // as many bubbles as a lattice of that spacing.
    const POISSON_SPACING = 0.85;
    // Candidates tried round each centre before it is retired.
    const POISSON_TRIES = 30;
    // Voxels of the fill's clearance field, at most, and their size per
    // cell size, at least.
    const FILL_VOXELS_MAX = 1 << 21;
    const FILL_VOXEL_MIN = 1 / 16;
    // Buckets of the fill's queue.
    const BUCKETS = 256;
    // Shrink of the grid's cells per refinement, refinements at most, and
    // cells at most.
    const GRID_SHRINK = 0.8;
    const GRID_TRIES = 16;
    const GRID_MAX_CELLS = 1 << 21;

    /** How far a sphere may poke out of the shape, from the options. */
    function fillShape(o: FillOptions): FillShape {
        return {
            protrude: Math.max(SPHERE_PROTRUDE * o.cellSize - o.skin, 0),
            bulgeZ: SPHERE_BULGE_Z * o.cellSize,
        };
    }

    // ---- the shader's hash, in uint32 ----

    function pcg3d(x: number, y: number, z: number): [number, number, number] {
        x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
        y = (Math.imul(y, 1664525) + 1013904223) >>> 0;
        z = (Math.imul(z, 1664525) + 1013904223) >>> 0;
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

    /** The shader's `hash4`: four uniform numbers in [0, 1] from a cell. */
    function hash4(
        seed: number,
        x: number,
        y: number,
        z: number,
    ): [number, number, number, number] {
        const s = seed >>> 0;
        const [a, b, c] = pcg3d(
            (x ^ s) >>> 0,
            (y ^ Math.imul(s, 7)) >>> 0,
            (z ^ Math.imul(s, 13)) >>> 0,
        );
        let w = Math.imul(a ^ (b >>> 11) ^ (c << 7), 747796405) >>> 0;
        w = (w ^ (w >>> 16)) >>> 0;
        const n = 1 / 4294967295;
        return [a * n, b * n, c * n, w * n];
    }

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

    // ---- the shape ----

    /**
     * The 2D field at (x, y), bilinear as the shader's `sd2`: signed distance
     * (world units, negative inside) and unit gradient.
     */
    function sampleSd2(
        shape: Shape2D,
        x: number,
        y: number,
    ): [number, number, number] {
        const [rx, ry, rw, rh] = shape.sdfRect;
        const W = shape.sdfW;
        const H = shape.sdfH;
        const u = (x - rx) / rw;
        const v = (y - ry) / rh;
        const cu = Math.min(Math.max(u, 0), 1);
        const cv = Math.min(Math.max(v, 0), 1);
        const ox = (u - cu) * rw;
        const oy = (v - cv) * rh;
        const out = Math.hypot(ox, oy);
        const fx = Math.min(Math.max(cu * W - 0.5, 0), W - 1);
        const fy = Math.min(Math.max(cv * H - 0.5, 0), H - 1);
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const x1 = Math.min(x0 + 1, W - 1);
        const y1 = Math.min(y0 + 1, H - 1);
        const tx = fx - x0;
        const ty = fy - y0;
        const s = shape.sdf;
        const i00 = (y0 * W + x0) * 4;
        const i10 = (y0 * W + x1) * 4;
        const i01 = (y1 * W + x0) * 4;
        const i11 = (y1 * W + x1) * 4;
        const w00 = (1 - tx) * (1 - ty);
        const w10 = tx * (1 - ty);
        const w01 = (1 - tx) * ty;
        const w11 = tx * ty;
        const d = s[i00] * w00 + s[i10] * w10 + s[i01] * w01 + s[i11] * w11;
        let gx =
            s[i00 + 1] * w00 +
            s[i10 + 1] * w10 +
            s[i01 + 1] * w01 +
            s[i11 + 1] * w11;
        let gy =
            s[i00 + 2] * w00 +
            s[i10 + 2] * w10 +
            s[i01 + 2] * w01 +
            s[i11 + 2] * w11;
        if (out > 0) {
            gx = ox / out + gx * 0.05;
            gy = oy / out + gy * 0.05;
        }
        const gl = Math.hypot(gx, gy);
        return gl > 1e-5 ? [d + out, gx / gl, gy / gl] : [d + out, 0, 1];
    }

    /** Distance into the extruded shape (sharp edges), negative outside. */
    function insideDistance(
        shape: Shape2D,
        halfDepth: number,
        x: number,
        y: number,
        z: number,
    ): number {
        return Math.min(-sampleSd2(shape, x, y)[0], halfDepth - Math.abs(z));
    }

    // The extrusion's signed distance from the 2D one (a) and |z| - halfDepth
    // (b), with the edges rounded by `bevel`, positive outside (as the
    // shader's \`extrude\`).
    function extrudeSd(a: number, b: number, bevel: number): number {
        const wx = a + bevel;
        const wy = b + bevel;
        return wx > 0 && wy > 0
            ? Math.hypot(wx, wy) - bevel
            : Math.max(wx, wy) - bevel;
    }

    // The extruded shape's signed distance, positive outside.
    function sd3(
        shape: Shape2D,
        halfDepth: number,
        bevel: number,
        x: number,
        y: number,
        z: number,
    ) {
        const a = sampleSd2(shape, x, y)[0];
        return extrudeSd(a, Math.abs(z) - halfDepth, bevel);
    }

    // ---- spheres near a point ----

    // A hash grid of sphere centres, for the neighbours of a new sphere.
    class CentreGrid {
        readonly #cell: number;
        readonly #map = new Map<number, number[]>();

        constructor(cell: number) {
            this.#cell = cell;
        }

        #key(i: number, j: number, k: number): number {
            return ((i + 1024) * 2048 + (j + 1024)) * 2048 + (k + 1024);
        }

        add(id: number, x: number, y: number, z: number): void {
            const c = this.#cell;
            const key = this.#key(
                Math.floor(x / c),
                Math.floor(y / c),
                Math.floor(z / c),
            );
            const list = this.#map.get(key);
            if (list) {
                list.push(id);
            } else {
                this.#map.set(key, [id]);
            }
        }

        /** Calls `f` with every sphere whose centre may be within `r`. */
        near(
            x: number,
            y: number,
            z: number,
            r: number,
            f: (id: number) => void,
        ) {
            const c = this.#cell;
            const i0 = Math.floor((x - r) / c);
            const i1 = Math.floor((x + r) / c);
            const j0 = Math.floor((y - r) / c);
            const j1 = Math.floor((y + r) / c);
            const k0 = Math.floor((z - r) / c);
            const k1 = Math.floor((z + r) / c);
            for (let k = k0; k <= k1; k++) {
                for (let j = j0; j <= j1; j++) {
                    for (let i = i0; i <= i1; i++) {
                        const list = this.#map.get(this.#key(i, j, k));
                        if (list) {
                            for (const id of list) {
                                f(id);
                            }
                        }
                    }
                }
            }
        }
    }

    // ---- placement ----

    /**
     * The bubbles in the extruded shape: the lattice's, then the fill's.
     * Deterministic for the options.
     */
    function placeBubbles(shape: Shape2D, o: FillOptions): BubbleFill {
        const halfDepth = Math.max(o.halfDepth, 1e-3);
        const bevel = Math.min(Math.max(o.bevel ?? 0, 0), halfDepth);
        const cell = Math.max(o.cellSize, 1e-3);
        const roundness = Math.min(Math.max(o.roundness, 0), 1);
        const radiusVar = Math.min(Math.max(o.cellSizeRandomness, 0), 1);
        const seed = o.seed >>> 0;
        const maxCount = Math.min(
            Math.max(Math.floor(o.maxCount ?? BUBBLE_MAX_COUNT), 0),
            BUBBLE_MAX_COUNT,
        );
        const { protrude, bulgeZ } = fillShape({ ...o, cellSize: cell });
        const sphereR =
            cell *
            (SPHERE_R_FLAT + (SPHERE_R_ROUND - SPHERE_R_FLAT) * roundness);

        // 1. The big bubbles' centres: Bridson's Poisson disk sampling, grown
        //    from seeds on a coarse grid (in random order) so every part of
        //    the shape gets some, however small.
        const spacing = POISSON_SPACING * cell;
        const centreDepth = CENTRE_DEPTH * cell;
        const zLim = Math.max(halfDepth - CENTRE_Z_MARGIN * cell, 0);
        // Thinner than this, the centres spread over a plane.
        const flat = zLim < 0.5 * spacing;
        const [rx, ry, rw, rh] = shape.sdfRect;
        const rand = mulberry32(Math.imul(seed, 0x27d4eb2d) ^ 0x165667b1);
        const valid = (x: number, y: number, z: number) =>
            Math.abs(z) <= zLim && sampleSd2(shape, x, y)[0] <= -centreDepth;
        // A background grid with one centre per cell at most.
        const g = spacing / Math.sqrt(3);
        const gnx = Math.max(1, Math.ceil(rw / g));
        const gny = Math.max(1, Math.ceil(rh / g));
        const gnz = Math.max(1, Math.ceil((2 * zLim) / g));
        const owner = new Int32Array(gnx * gny * gnz).fill(-1);
        const gi = (v: number, o: number, n: number) =>
            Math.min(n - 1, Math.max(0, Math.floor((v - o) / g)));
        const pts: number[] = [];
        const free = (x: number, y: number, z: number) => {
            const i = gi(x, rx, gnx);
            const j = gi(y, ry, gny);
            const k = gi(z, -zLim, gnz);
            for (
                let kk = Math.max(0, k - 2);
                kk <= Math.min(gnz - 1, k + 2);
                kk++
            ) {
                for (
                    let jj = Math.max(0, j - 2);
                    jj <= Math.min(gny - 1, j + 2);
                    jj++
                ) {
                    for (
                        let ii = Math.max(0, i - 2);
                        ii <= Math.min(gnx - 1, i + 2);
                        ii++
                    ) {
                        const q = owner[(kk * gny + jj) * gnx + ii];
                        if (q < 0) {
                            continue;
                        }
                        const dx = pts[q * 3] - x;
                        const dy = pts[q * 3 + 1] - y;
                        const dz = pts[q * 3 + 2] - z;
                        if (dx * dx + dy * dy + dz * dz < spacing * spacing) {
                            return false;
                        }
                    }
                }
            }
            return true;
        };
        const active: number[] = [];
        const add = (x: number, y: number, z: number) => {
            const n = pts.length / 3;
            pts.push(x, y, z);
            owner[
                (gi(z, -zLim, gnz) * gny + gi(y, ry, gny)) * gnx +
                    gi(x, rx, gnx)
            ] = n;
            active.push(n);
        };
        // A candidate round centre q, between one and two spacings away.
        const around = (q: number): [number, number, number] => {
            const a = rand() * Math.PI * 2;
            if (flat) {
                const d = spacing * Math.sqrt(1 + 3 * rand());
                return [
                    pts[q * 3] + d * Math.cos(a),
                    pts[q * 3 + 1] + d * Math.sin(a),
                    (2 * rand() - 1) * zLim,
                ];
            }
            const d = spacing * Math.cbrt(1 + 7 * rand());
            const cz = 2 * rand() - 1;
            const sz = Math.sqrt(1 - cz * cz);
            return [
                pts[q * 3] + d * sz * Math.cos(a),
                pts[q * 3 + 1] + d * sz * Math.sin(a),
                pts[q * 3 + 2] + d * cz,
            ];
        };
        const seeds: number[] = [];
        for (let y = ry + spacing / 2; y < ry + rh; y += spacing) {
            for (let x = rx + spacing / 2; x < rx + rw; x += spacing) {
                seeds.push(x, y);
            }
        }
        for (let i = seeds.length / 2 - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            for (let c = 0; c < 2; c++) {
                const t = seeds[i * 2 + c];
                seeds[i * 2 + c] = seeds[j * 2 + c];
                seeds[j * 2 + c] = t;
            }
        }
        for (
            let si = 0;
            si < seeds.length / 2 && pts.length / 3 < maxCount;
            si++
        ) {
            const sx = seeds[si * 2];
            const sy = seeds[si * 2 + 1];
            const sz = (2 * rand() - 1) * zLim;
            if (!valid(sx, sy, sz) || !free(sx, sy, sz)) {
                continue;
            }
            add(sx, sy, sz);
            while (active.length > 0 && pts.length / 3 < maxCount) {
                const e = Math.floor(rand() * active.length);
                const q = active[e];
                let found = false;
                for (let t = 0; t < POISSON_TRIES; t++) {
                    const [x, y, z] = around(q);
                    if (valid(x, y, z) && free(x, y, z)) {
                        add(x, y, z);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    active[e] = active[active.length - 1];
                    active.pop();
                }
            }
            active.length = 0;
        }
        // Their radii: random within cellSizeRandomness, and kept from
        // poking out of the shape too far.
        const lat: number[] = [];
        for (let q = 0; q < pts.length / 3; q++) {
            const cx = pts[q * 3];
            const cy = pts[q * 3 + 1];
            const cz = pts[q * 3 + 2];
            const sd = sampleSd2(shape, cx, cy)[0];
            let r = sphereR * (1 - radiusVar * rand());
            r = Math.min(
                r,
                protrude -
                    extrudeSd(sd, Math.abs(cz) - halfDepth - bulgeZ, bevel),
            );
            if (r > 0) {
                lat.push(cx, cy, cz, r);
            }
        }

        // Leave out lattice spheres that do not own their own centre.
        const centres = new CentreGrid(cell);
        const nLat = lat.length / 4;
        let maxR = 0;
        for (let i = 0; i < nLat; i++) {
            centres.add(i, lat[i * 4], lat[i * 4 + 1], lat[i * 4 + 2]);
            maxR = Math.max(maxR, lat[i * 4 + 3]);
        }
        const out: number[] = [];
        for (let i = 0; i < nLat && out.length / 4 < maxCount; i++) {
            const x = lat[i * 4];
            const y = lat[i * 4 + 1];
            const z = lat[i * 4 + 2];
            const own = -lat[i * 4 + 3] * lat[i * 4 + 3];
            let owned = true;
            centres.near(x, y, z, maxR, (j) => {
                if (j === i) {
                    return;
                }
                const dx = x - lat[j * 4];
                const dy = y - lat[j * 4 + 1];
                const dz = z - lat[j * 4 + 2];
                const pj = dx * dx + dy * dy + dz * dz - lat[j * 4 + 3] ** 2;
                if (pj < own || (pj === own && j < i)) {
                    owned = false;
                }
            });
            if (owned) {
                out.push(x, y, z, lat[i * 4 + 3]);
            }
        }
        const latticeCount = out.length / 4;

        // 2. The fill.
        const tMin = 0.5 * Math.max(o.minSize, 0) * cell;
        let voxel = 0;
        let voxels = 0;
        if (o.minSize < 1 && tMin > 0 && out.length / 4 < maxCount) {
            const k = FILL_K_FLAT + (FILL_K_ROUND - FILL_K_FLAT) * roundness;
            const rand = mulberry32(Math.imul(seed, 2654435761) ^ 0x9e3779b9);
            // The voxels over the shape's box. Only those inside the shape
            // are candidates for a centre.
            let bx0 = Infinity;
            let bx1 = -Infinity;
            let by0 = Infinity;
            let by1 = -Infinity;
            {
                const W = shape.sdfW;
                const H = shape.sdfH;
                for (let j = 0; j < H; j++) {
                    for (let i = 0; i < W; i++) {
                        if (shape.sdf[(j * W + i) * 4] < 0) {
                            const x = rx + ((i + 0.5) / W) * rw;
                            const y = ry + ((j + 0.5) / H) * rh;
                            bx0 = Math.min(bx0, x);
                            bx1 = Math.max(bx1, x);
                            by0 = Math.min(by0, y);
                            by1 = Math.max(by1, y);
                        }
                    }
                }
            }
            if (bx0 <= bx1) {
                const ext = [bx1 - bx0, by1 - by0, 2 * halfDepth];
                let h = Math.max(tMin, cell * FILL_VOXEL_MIN);
                h = Math.max(
                    h,
                    Math.cbrt((ext[0] * ext[1] * ext[2]) / FILL_VOXELS_MAX),
                );
                const nx = Math.max(1, Math.ceil(ext[0] / h));
                const ny = Math.max(1, Math.ceil(ext[1] / h));
                const nz = Math.max(1, Math.ceil(ext[2] / h));
                const x0 = (bx0 + bx1) / 2 - ((nx - 1) * h) / 2;
                const y0 = (by0 + by1) / 2 - ((ny - 1) * h) / 2;
                const z0 = -((nz - 1) * h) / 2;
                const nxy = nx * ny;
                voxel = h;
                voxels = nxy * nz;
                // dB: the radius the shape allows; dS: the gap to the
                // spheres; clear = min(dS, dB), -1 for a non-candidate.
                const col = new Float32Array(nxy);
                for (let j = 0; j < ny; j++) {
                    for (let i = 0; i < nx; i++) {
                        col[j * nx + i] = -sampleSd2(
                            shape,
                            x0 + i * h,
                            y0 + j * h,
                        )[0];
                    }
                }
                const dB = new Float32Array(voxels);
                const dS = new Float32Array(voxels).fill(Infinity);
                const clear = new Float32Array(voxels).fill(-1);
                let bMax = 0;
                for (let kk = 0; kk < nz; kk++) {
                    const dz = halfDepth - Math.abs(z0 + kk * h);
                    for (let j = 0; j < nxy; j++) {
                        const v = kk * nxy + j;
                        // Into the shape, rounded edges included.
                        const d = -extrudeSd(-col[j], -dz, bevel);
                        if (d > 0) {
                            // A filling sphere pokes out of the shape by a
                            // share of its radius at most, so the small ones
                            // along the outline keep it crisp.
                            dB[v] = Math.min(
                                col[j] +
                                    Math.min(protrude, FILL_POKE_K * col[j]),
                                dz +
                                    Math.min(
                                        protrude + bulgeZ,
                                        FILL_POKE_K * dz,
                                    ),
                                d + Math.min(protrude, FILL_POKE_K * d),
                            );
                            bMax = Math.max(bMax, dB[v]);
                        } else {
                            dB[v] = -1;
                        }
                    }
                }
                // Lower dS round a sphere, for the voxels within `cap` of its
                // surface (beyond, the clearance is less than the gap).
                const carve = (
                    cx: number,
                    cy: number,
                    cz: number,
                    r: number,
                    cap: number,
                    onLower?: (v: number) => void,
                ) => {
                    const reach = r + cap;
                    const i0 = Math.max(0, Math.ceil((cx - reach - x0) / h));
                    const i1 = Math.min(
                        nx - 1,
                        Math.floor((cx + reach - x0) / h),
                    );
                    const j0 = Math.max(0, Math.ceil((cy - reach - y0) / h));
                    const j1 = Math.min(
                        ny - 1,
                        Math.floor((cy + reach - y0) / h),
                    );
                    const k0 = Math.max(0, Math.ceil((cz - reach - z0) / h));
                    const k1 = Math.min(
                        nz - 1,
                        Math.floor((cz + reach - z0) / h),
                    );
                    const r2 = reach * reach;
                    for (let kk = k0; kk <= k1; kk++) {
                        const dz = z0 + kk * h - cz;
                        for (let j = j0; j <= j1; j++) {
                            const dy = y0 + j * h - cy;
                            const dyz = dy * dy + dz * dz;
                            if (dyz > r2) {
                                continue;
                            }
                            const row = kk * nxy + j * nx;
                            for (let i = i0; i <= i1; i++) {
                                const v = row + i;
                                if (dB[v] < 0) {
                                    continue;
                                }
                                const dx = x0 + i * h - cx;
                                const d2 = dx * dx + dyz;
                                if (d2 > r2) {
                                    continue;
                                }
                                const g = Math.sqrt(d2) - r;
                                if (g < dS[v]) {
                                    dS[v] = g;
                                    onLower?.(v);
                                }
                            }
                        }
                    }
                };
                for (let s = 0; s < latticeCount; s++) {
                    carve(
                        out[s * 4],
                        out[s * 4 + 1],
                        out[s * 4 + 2],
                        out[s * 4 + 3],
                        bMax,
                    );
                }
                // The queue: buckets of clearance over [tMin, bMax], lazy.
                const span = Math.max(bMax - tMin, 1e-9);
                const bucketOf = (c: number) =>
                    Math.min(
                        BUCKETS - 1,
                        Math.floor(((c - tMin) / span) * BUCKETS),
                    );
                const buckets: number[][] = [];
                for (let b = 0; b < BUCKETS; b++) {
                    buckets.push([]);
                }
                for (let v = 0; v < voxels; v++) {
                    if (dB[v] < 0) {
                        continue;
                    }
                    const c = Math.min(dS[v], dB[v]);
                    clear[v] = c;
                    if (c >= tMin) {
                        buckets[bucketOf(c)].push(v);
                    }
                }
                const fill = new CentreGrid(cell);
                for (let s = 0; s < latticeCount; s++) {
                    fill.add(s, out[s * 4], out[s * 4 + 1], out[s * 4 + 2]);
                }
                let top = BUCKETS - 1;
                const lower = (v: number) => {
                    const c = Math.min(dS[v], dB[v]);
                    const old = clear[v];
                    if (c < old) {
                        clear[v] = c;
                        if (c >= tMin && bucketOf(c) !== bucketOf(old)) {
                            buckets[bucketOf(c)].push(v);
                        }
                    }
                };
                while (out.length / 4 < maxCount) {
                    while (top >= 0 && buckets[top].length === 0) {
                        top--;
                    }
                    if (top < 0) {
                        break;
                    }
                    // A random entry of the top bucket; skip stale ones.
                    const list = buckets[top];
                    const e = Math.floor(rand() * list.length);
                    const v = list[e];
                    list[e] = list[list.length - 1];
                    list.pop();
                    const c = clear[v];
                    if (c < tMin || bucketOf(c) !== top) {
                        continue;
                    }
                    const kk = Math.floor(v / nxy);
                    const j = Math.floor((v - kk * nxy) / nx);
                    const i = v - kk * nxy - j * nx;
                    const cx = x0 + i * h;
                    const cy = y0 + j * h;
                    const cz = z0 + kk * h;
                    // Larger than the gap, so it cuts into its neighbours; no
                    // larger than the shape allows, and small enough that
                    // every neighbour keeps its centre.
                    let r = Math.min(k * dS[v], dB[v]);
                    // One held back by the shape just short of its nearest
                    // neighbour may poke out a little more to reach it, so
                    // it shares a wall rather than floating loose.
                    const reachIt = FILL_REACH * dS[v];
                    if (r < reachIt && reachIt <= dB[v] + tMin) {
                        r = reachIt;
                    }
                    const n0 = out.length / 4;
                    fill.near(cx, cy, cz, r, (s) => {
                        const dx = cx - out[s * 4];
                        const dy = cy - out[s * 4 + 1];
                        const dz = cz - out[s * 4 + 2];
                        const lim =
                            0.98 *
                            Math.sqrt(
                                dx * dx +
                                    dy * dy +
                                    dz * dz +
                                    out[s * 4 + 3] ** 2,
                            );
                        if (lim < r) {
                            r = lim;
                        }
                    });
                    out.push(cx, cy, cz, r);
                    fill.add(n0, cx, cy, cz);
                    maxR = Math.max(maxR, r);
                    // Upper bound of every clearance left: the top bucket's.
                    const cap = tMin + ((top + 1) / BUCKETS) * span;
                    carve(cx, cy, cz, r, cap, lower);
                    // The voxel itself is inside the new sphere now.
                    clear[v] = Math.min(clear[v], -r);
                }
            }
        }

        const spheres = new Float32Array(out);
        const count = spheres.length / 4;
        let reach = 0;
        for (let s = 0; s < count; s++) {
            const d = sd3(
                shape,
                halfDepth,
                bevel,
                spheres[s * 4],
                spheres[s * 4 + 1],
                spheres[s * 4 + 2],
            );
            reach = Math.max(reach, d + spheres[s * 4 + 3]);
        }
        return {
            spheres,
            count,
            latticeCount,
            capped: count >= maxCount,
            reach,
            voxel,
            voxels,
        };
    }

    // ---- the grid ----

    /**
     * The grid over the spheres: each cell lists every sphere whose ball,
     * grown by `wobble` times its radius (its drift), touches the cell.
     * Cells start at `cell` and shrink until no list is longer than
     * {@link BUBBLE_LIST_MAX}.
     */
    function buildSphereGrid(
        input: Float32Array,
        wobble: number,
        cell: number,
    ): SphereGrid {
        let spheres = input;
        let dropped = 0;
        const grow = 1 + Math.max(wobble, 0);
        for (;;) {
            const g = tryGrid(spheres, grow, Math.max(cell, 1e-4));
            if (g.ok) {
                return { ...g.grid, dropped };
            }
            // No grid fits: leave out the smallest sphere of each full cell.
            const drop = new Set(g.drop);
            const keep: number[] = [];
            for (let s = 0; s < spheres.length / 4; s++) {
                if (!drop.has(s)) {
                    keep.push(...spheres.subarray(s * 4, s * 4 + 4));
                }
            }
            dropped += drop.size;
            spheres = new Float32Array(keep);
        }
    }

    function tryGrid(
        spheres: Float32Array,
        grow: number,
        cell0: number,
    ):
        | { ok: true; grid: Omit<SphereGrid, "dropped"> }
        | { ok: false; drop: number[] } {
        const count = spheres.length / 4;
        const lo = [Infinity, Infinity, Infinity];
        const hi = [-Infinity, -Infinity, -Infinity];
        for (let s = 0; s < count; s++) {
            const r = spheres[s * 4 + 3] * grow;
            for (let a = 0; a < 3; a++) {
                lo[a] = Math.min(lo[a], spheres[s * 4 + a] - r);
                hi[a] = Math.max(hi[a], spheres[s * 4 + a] + r);
            }
        }
        if (count === 0) {
            lo.fill(0);
            hi.fill(1e-3);
        }
        const size = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
        let cell = Math.max(
            cell0,
            Math.cbrt((size[0] * size[1] * size[2]) / GRID_MAX_CELLS),
        );
        let refinements = 0;
        for (;;) {
            const dims: [number, number, number] = [
                Math.max(1, Math.ceil(size[0] / cell)),
                Math.max(1, Math.ceil(size[1] / cell)),
                Math.max(1, Math.ceil(size[2] / cell)),
            ];
            const cells = dims[0] * dims[1] * dims[2];
            const counts = new Int32Array(cells);
            let maxList = 0;
            const each = (f: (s: number, id: number) => void) => {
                for (let s = 0; s < count; s++) {
                    const cx = spheres[s * 4];
                    const cy = spheres[s * 4 + 1];
                    const cz = spheres[s * 4 + 2];
                    const r = spheres[s * 4 + 3] * grow;
                    const c = [cx, cy, cz];
                    const a0 = c.map((v, a) =>
                        Math.max(0, Math.floor((v - r - lo[a]) / cell)),
                    );
                    const a1 = c.map((v, a) =>
                        Math.min(
                            dims[a] - 1,
                            Math.floor((v + r - lo[a]) / cell),
                        ),
                    );
                    for (let z = a0[2]; z <= a1[2]; z++) {
                        const bz = lo[2] + z * cell;
                        const ez = Math.max(bz - cz, 0, cz - bz - cell);
                        for (let y = a0[1]; y <= a1[1]; y++) {
                            const by = lo[1] + y * cell;
                            const ey = Math.max(by - cy, 0, cy - by - cell);
                            for (let x = a0[0]; x <= a1[0]; x++) {
                                const bx = lo[0] + x * cell;
                                const ex = Math.max(bx - cx, 0, cx - bx - cell);
                                if (ex * ex + ey * ey + ez * ez > r * r) {
                                    continue;
                                }
                                f(s, x + dims[0] * (y + dims[1] * z));
                            }
                        }
                    }
                }
            };
            each((_s, id) => {
                counts[id]++;
            });
            for (let id = 0; id < cells; id++) {
                maxList = Math.max(maxList, counts[id]);
            }
            if (maxList > BUBBLE_LIST_MAX) {
                const finer = cell * GRID_SHRINK;
                const more =
                    cells / (GRID_SHRINK * GRID_SHRINK * GRID_SHRINK) >
                    GRID_MAX_CELLS;
                if (refinements < GRID_TRIES && !more) {
                    cell = finer;
                    refinements++;
                    continue;
                }
                // The smallest sphere of every full cell.
                const smallest = new Int32Array(cells).fill(-1);
                each((s, id) => {
                    if (counts[id] <= BUBBLE_LIST_MAX) {
                        return;
                    }
                    const m = smallest[id];
                    if (m < 0 || spheres[s * 4 + 3] < spheres[m * 4 + 3]) {
                        smallest[id] = s;
                    }
                });
                const drop = new Set<number>();
                for (const s of smallest) {
                    if (s >= 0) {
                        drop.add(s);
                    }
                }
                return { ok: false, drop: [...drop] };
            }
            const offsets = new Int32Array(cells);
            let total = 0;
            for (let id = 0; id < cells; id++) {
                offsets[id] = total;
                total += counts[id];
            }
            const cellTexH = Math.max(1, Math.ceil(cells / BUBBLE_TEX_W));
            const cellData = new Float32Array(BUBBLE_TEX_W * cellTexH * 4);
            for (let id = 0; id < cells; id++) {
                cellData[id * 4] = offsets[id];
                cellData[id * 4 + 1] = counts[id];
            }
            const indexTexH = Math.max(1, Math.ceil(total / 4 / BUBBLE_TEX_W));
            const index = new Float32Array(BUBBLE_TEX_W * indexTexH * 4);
            const fillAt = new Int32Array(cells);
            each((s, id) => {
                index[offsets[id] + fillAt[id]++] = s;
            });
            const sphereTexH = Math.max(1, Math.ceil(count / BUBBLE_TEX_W));
            const sphereData = new Float32Array(BUBBLE_TEX_W * sphereTexH * 4);
            sphereData.set(spheres);
            return {
                ok: true,
                grid: {
                    spheres,
                    count,
                    origin: [lo[0], lo[1], lo[2]],
                    cell,
                    dims,
                    cellData,
                    cellTexH,
                    index,
                    indexTexH,
                    sphereData,
                    sphereTexH,
                    maxList,
                    refinements,
                },
            };
        }
    }

    // How much a container blows the bubbles up at containment 1, as a share
    // of what would close every gap: less leaves creases between them.
    const CONTAIN_GROW = 0.3;
    // The fill inside the shape: the gap it closes, per cell size.
    const FILL_GAP = 0.35;

    /**
     * BubbleEffect's foam: the bubbles placed, blown up in a container, the
     * grid the shader walks and the one it finds the borders with, and each
     * bubble's drift.
     */
    function buildFoam(a: FoamInput): FoamData {
        const fill = placeBubbles(a.shape, a.fill);
        const cellSize = a.fill.cellSize;
        // In a container the bubbles are blown up to fill it: r² grows by
        // the same amount for all, which leaves every wall between two
        // bubbles where it is and only pushes the foam's outside out, into
        // the gaps and against the container. At 1 it covers a gap of the
        // fill's smallest size next to the biggest bubble.
        let spheres = fill.spheres;
        let grow = 0;
        if (a.containment > 0) {
            let maxR = 0;
            for (let i = 0; i < fill.count; i++) {
                maxR = Math.max(maxR, fill.spheres[i * 4 + 3]);
            }
            const g = 0.5 * a.fill.minSize * cellSize;
            const add = a.containment * CONTAIN_GROW * (2 * maxR * g + g * g);
            spheres = fill.spheres.slice();
            for (let i = 0; i < fill.count; i++) {
                const r0 = spheres[i * 4 + 3];
                const r1 = Math.sqrt(r0 * r0 + add);
                spheres[i * 4 + 3] = r1;
                grow = Math.max(grow, r1 - r0);
            }
        }
        // The fill inside the shape: enough to close a gap of FILL_GAP cell
        // sizes next to the biggest bubble. The grid lists each sphere as far
        // as it reaches with it, so no cell misses an owner.
        let fillG = 0;
        let listed = spheres;
        if (a.containment > 0) {
            let maxR = 0;
            for (let i = 0; i < spheres.length / 4; i++) {
                maxR = Math.max(maxR, spheres[i * 4 + 3]);
            }
            const h = FILL_GAP * cellSize;
            fillG = a.containment * (2 * maxR * h + h * h);
            listed = spheres.slice();
            for (let i = 0; i < listed.length / 4; i++) {
                listed[i * 4 + 3] = Math.sqrt(listed[i * 4 + 3] ** 2 + fillG);
            }
        }
        const grid = buildSphereGrid(listed, a.wobble, cellSize);
        let edgeGrid: SphereGrid | null = null;
        if (listed !== spheres) {
            // Back to the true radii, in the grid's order (it may leave some
            // out).
            let j = 0;
            for (let i = 0; i < grid.count; i++) {
                while (
                    spheres[j * 4] !== grid.spheres[i * 4] ||
                    spheres[j * 4 + 1] !== grid.spheres[i * 4 + 1] ||
                    spheres[j * 4 + 2] !== grid.spheres[i * 4 + 2]
                ) {
                    j++;
                }
                grid.spheres[i * 4 + 3] = spheres[j * 4 + 3];
                grid.sphereData[i * 4 + 3] = spheres[j * 4 + 3];
                j++;
            }
            // The same spheres by their own radii: no list gets longer, so
            // none is left out and the indices match.
            const g = buildSphereGrid(grid.spheres, a.wobble, cellSize);
            if (g.dropped === 0) {
                edgeGrid = g;
            }
        }
        // Per bubble, the drift's frequencies and phases (as the shader's
        // hash of its index).
        const drift = new Float32Array(grid.count * 6);
        for (let i = 0; i < grid.count; i++) {
            const [x, y, z, w] = hash4(a.fill.seed, i, 977, 31);
            drift.set(
                [0.6 + 0.8 * y, 0.6 + 0.8 * z, 0.6 + 0.8 * w, z, w, x],
                i * 6,
            );
        }
        return { fill, grow, fillG, grid, edgeGrid, drift };
    }

    return {
        BUBBLE_TEX_W,
        BUBBLE_LIST_MAX,
        BUBBLE_MAX_COUNT,
        SPHERE_R_FLAT,
        SPHERE_R_ROUND,
        SPHERE_PROTRUDE,
        SPHERE_BULGE_Z,
        fillShape,
        hash4,
        sampleSd2,
        insideDistance,
        placeBubbles,
        buildSphereGrid,
        buildFoam,
    };
}

export const {
    BUBBLE_TEX_W,
    BUBBLE_LIST_MAX,
    BUBBLE_MAX_COUNT,
    SPHERE_R_FLAT,
    SPHERE_R_ROUND,
    SPHERE_PROTRUDE,
    SPHERE_BULGE_Z,
    fillShape,
    hash4,
    sampleSd2,
    insideDistance,
    placeBubbles,
    buildSphereGrid,
    buildFoam,
} = bubbleKernel();
