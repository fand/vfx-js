// BubbleEffect's "packed" bubbles: spheres placed on the CPU by greedy
// packing of the extruded silhouette, and a uniform grid over them that
// the shader walks along each ray. Pure module: no GL, Node-testable.
import type { ShapeData } from "./_silhouette.js";

/** Sphere indices per grid cell. Two RGBA texels. */
export const PACK_SLOTS = 8;
/** Width of the grid's and the spheres' data textures. */
export const PACK_TEX_W = 1024;
/** Most spheres a packing places. */
export const PACK_MAX_COUNT = 1024;
// Voxels of the clearance field along the long side, at most and at
// least (small bubbles get the finer grid).
const VOXELS_MAX = 128;
const VOXELS_MIN = 64;
// Buckets of the clearance queue, over [0, maxRadius].
const BUCKETS = 64;
// Smallest radius, relative to the largest, whatever sizeVariation.
const MIN_RADIUS_SHARE = 0.1;
// The grid shrinks its cells this much when one overflows, this often.
const GRID_SHRINK = 0.8;
const GRID_TRIES = 5;
// Cells of the grid, at most.
const GRID_MAX_CELLS = 1 << 18;

export type PackOptions = {
    /** Half the extrusion depth, world units. */
    halfDepth: number;
    /** Largest radius, world units. */
    maxRadius: number;
    /** 0 to 1: radii range over `maxRadius * [1 - sizeVariation, 1]`. */
    sizeVariation: number;
    /**
     * 1: spheres just touch. Above 1, a sphere may reach into its
     * neighbours by `overlap - 1` of their radius.
     */
    overlap: number;
    /** Most spheres placed, up to {@link PACK_MAX_COUNT}. */
    count: number;
    /** Seed of the random choices. */
    seed: number;
    /**
     * A sphere's radius is at most its centre's distance to the shape's
     * surface plus this, world units: it may bulge out that far.
     */
    edgeBulge: number;
    /**
     * How far each sphere may move from its place (animation), world
     * units: the grid lists it in every cell it can reach.
     */
    margin: number;
};

export type BubblePack = {
    /** x, y, z, r per sphere. */
    spheres: Float32Array;
    count: number;
    /** Largest radius placed. */
    maxRadius: number;
    /** The grid's min corner, cell size and cells per axis. */
    gridOrigin: [number, number, number];
    gridCell: number;
    gridDims: [number, number, number];
    /**
     * RGBA, `PACK_SLOTS / 4` texels per cell, cells in x, y, z order,
     * laid out in rows of {@link PACK_TEX_W} texels: sphere indices, -1
     * for an empty slot.
     */
    gridData: Float32Array;
    gridTexH: number;
    /** The spheres again, in rows of {@link PACK_TEX_W} texels. */
    sphereData: Float32Array;
    sphereTexH: number;
    /** Sphere entries left out of full grid cells (0 normally). */
    dropped: number;
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
 * Greedy packing: the voxel with the most clearance (capped at the
 * largest radius, so ties are broken at random by `seed`) gets the next
 * sphere, as large as its clearance allows; then the clearance around it
 * shrinks. Stops at `count` spheres, or when no room is left for the
 * smallest radius.
 */
export function packBubbles(shape: Shape2D, opts: PackOptions): BubblePack {
    const halfDepth = Math.max(opts.halfDepth, 1e-3);
    const rMax = Math.max(opts.maxRadius, 1e-3);
    const sv = Math.min(Math.max(opts.sizeVariation, 0), 1);
    const rMin = rMax * Math.max(1 - sv, MIN_RADIUS_SHARE);
    const pen = Math.min(Math.max(opts.overlap - 1, 0), 0.9);
    const maxCount = Math.min(
        Math.max(Math.floor(opts.count), 0),
        PACK_MAX_COUNT,
    );
    const bulge = Math.max(opts.edgeBulge, 0);
    const rand = mulberry32((opts.seed * 2654435761) ^ 0x9e3779b9);

    // The clearance field on a voxel grid over the shape's box.
    const [sx, sy] = shape.shapeHalf;
    const long = 2 * Math.max(sx, sy);
    const h = Math.min(
        Math.max(rMin / 2, long / (VOXELS_MAX - 1)),
        long / (VOXELS_MIN - 1),
    );
    const nx = Math.max(1, Math.ceil((2 * sx) / h));
    const ny = Math.max(1, Math.ceil((2 * sy) / h));
    const nz = Math.max(1, Math.ceil((2 * halfDepth) / h));
    const x0 = -(nx * h) / 2 + h / 2;
    const y0 = -(ny * h) / 2 + h / 2;
    const z0 = -(nz * h) / 2 + h / 2;
    const nxy = nx * ny;
    const clear = new Float32Array(nxy * nz);
    // The 2D part once per column.
    const col = new Float32Array(nxy);
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            col[j * nx + i] = -sampleSd2(shape, x0 + i * h, y0 + j * h);
        }
    }
    const buckets: number[][] = [];
    for (let b = 0; b < BUCKETS; b++) {
        buckets.push([]);
    }
    const bucketOf = (c: number) =>
        Math.min(BUCKETS - 1, Math.floor((c / rMax) * BUCKETS));
    for (let k = 0; k < nz; k++) {
        const dz = halfDepth - Math.abs(z0 + k * h);
        for (let j = 0; j < nxy; j++) {
            // Only centres inside the shape are candidates.
            const d = Math.min(col[j], dz);
            const c = d > 0 ? d + bulge : -1;
            const v = k * nxy + j;
            clear[v] = Math.min(c, rMax);
            if (c >= rMin) {
                buckets[bucketOf(clear[v])].push(v);
            }
        }
    }

    const out: number[] = [];
    let top = BUCKETS - 1;
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
        if (c < rMin || bucketOf(c) !== top) {
            continue;
        }
        const target = rMax * (1 - sv * rand());
        const r = Math.max(Math.min(c, target), rMin);
        const k = Math.floor(v / nxy);
        const j = Math.floor((v - k * nxy) / nx);
        const i = v - k * nxy - j * nx;
        const cx = x0 + i * h;
        const cy = y0 + j * h;
        const cz = z0 + k * h;
        out.push(cx, cy, cz, r);

        // Shrink the clearance of every voxel this sphere comes near:
        // only those within reach can have more than rMax left.
        const keep = r * (1 - pen);
        const reach = keep + rMax;
        const ri = Math.ceil(reach / h);
        for (
            let kk = Math.max(k - ri, 0);
            kk <= Math.min(k + ri, nz - 1);
            kk++
        ) {
            const dz = (kk - k) * h;
            for (
                let jj = Math.max(j - ri, 0);
                jj <= Math.min(j + ri, ny - 1);
                jj++
            ) {
                const dy = (jj - j) * h;
                const dyz = dy * dy + dz * dz;
                if (dyz > reach * reach) {
                    continue;
                }
                const row = kk * nxy + jj * nx;
                for (
                    let ii = Math.max(i - ri, 0);
                    ii <= Math.min(i + ri, nx - 1);
                    ii++
                ) {
                    const dx = (ii - i) * h;
                    const d2 = dx * dx + dyz;
                    if (d2 > reach * reach) {
                        continue;
                    }
                    const w = row + ii;
                    const old = clear[w];
                    const nc = Math.sqrt(d2) - keep;
                    if (nc < old) {
                        clear[w] = nc;
                        if (nc >= rMin && bucketOf(nc) !== bucketOf(old)) {
                            buckets[bucketOf(nc)].push(w);
                        }
                    }
                }
            }
        }
    }

    const spheres = new Float32Array(out);
    return { ...buildGrid(spheres, opts.margin), spheres };
}

/**
 * The uniform grid over packed spheres: each cell lists the spheres that
 * reach into it (grown by `margin`). Cells start at the largest radius;
 * they shrink while one holds more than {@link PACK_SLOTS} spheres, and
 * if that does not help, the smallest spheres of a full cell are left
 * out of it.
 */
export function buildGrid(
    spheres: Float32Array,
    margin: number,
): Omit<BubblePack, "spheres"> {
    const count = spheres.length / 4;
    const m = Math.max(margin, 0);
    let maxR = 0;
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let s = 0; s < count; s++) {
        const r = spheres[s * 4 + 3];
        maxR = Math.max(maxR, r);
        for (let a = 0; a < 3; a++) {
            lo[a] = Math.min(lo[a], spheres[s * 4 + a] - r - m);
            hi[a] = Math.max(hi[a], spheres[s * 4 + a] + r + m);
        }
    }
    const sphereTexH = Math.max(1, Math.ceil(count / PACK_TEX_W));
    const sphereData = new Float32Array(PACK_TEX_W * sphereTexH * 4);
    sphereData.set(spheres);
    if (count === 0) {
        return {
            count,
            maxRadius: 0,
            gridOrigin: [0, 0, 0],
            gridCell: 1,
            gridDims: [1, 1, 1],
            gridData: new Float32Array(PACK_TEX_W * 4).fill(-1),
            gridTexH: 1,
            sphereData,
            sphereTexH,
            dropped: 0,
        };
    }
    const size = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    let cell = maxR + m;
    // Never more cells than the texture budget.
    cell = Math.max(
        cell,
        Math.cbrt((size[0] * size[1] * size[2]) / GRID_MAX_CELLS),
    );
    const texelsPerCell = PACK_SLOTS / 4;
    for (let attempt = 0; ; attempt++) {
        const dims: [number, number, number] = [
            Math.max(1, Math.ceil(size[0] / cell)),
            Math.max(1, Math.ceil(size[1] / cell)),
            Math.max(1, Math.ceil(size[2] / cell)),
        ];
        const cells = dims[0] * dims[1] * dims[2];
        const lists: number[][] = new Array(cells);
        let overflow = false;
        for (let s = 0; s < count; s++) {
            const c = [spheres[s * 4], spheres[s * 4 + 1], spheres[s * 4 + 2]];
            const r = spheres[s * 4 + 3] + m;
            const a0 = c.map((v, a) =>
                Math.max(0, Math.floor((v - r - lo[a]) / cell)),
            );
            const a1 = c.map((v, a) =>
                Math.min(dims[a] - 1, Math.floor((v + r - lo[a]) / cell)),
            );
            for (let z = a0[2]; z <= a1[2]; z++) {
                for (let y = a0[1]; y <= a1[1]; y++) {
                    for (let x = a0[0]; x <= a1[0]; x++) {
                        // Squared distance from the centre to the cell.
                        const cl = [x, y, z];
                        let d2 = 0;
                        for (let a = 0; a < 3; a++) {
                            const b0 = lo[a] + cl[a] * cell;
                            const e = Math.max(b0 - c[a], 0, c[a] - b0 - cell);
                            d2 += e * e;
                        }
                        if (d2 > r * r) {
                            continue;
                        }
                        const id = x + dims[0] * (y + dims[1] * z);
                        const list = lists[id] ?? [];
                        lists[id] = list;
                        list.push(s);
                        if (list.length > PACK_SLOTS) {
                            overflow = true;
                        }
                    }
                }
            }
        }
        const last =
            attempt >= GRID_TRIES - 1 ||
            cells / (GRID_SHRINK * GRID_SHRINK * GRID_SHRINK) > GRID_MAX_CELLS;
        if (overflow && !last) {
            cell *= GRID_SHRINK;
            continue;
        }
        const gridTexH = Math.max(
            1,
            Math.ceil((cells * texelsPerCell) / PACK_TEX_W),
        );
        const gridData = new Float32Array(PACK_TEX_W * gridTexH * 4).fill(-1);
        let dropped = 0;
        for (let id = 0; id < cells; id++) {
            let list = lists[id];
            if (!list) {
                continue;
            }
            if (list.length > PACK_SLOTS) {
                dropped += list.length - PACK_SLOTS;
                list = [...list]
                    .sort((a, b) => spheres[b * 4 + 3] - spheres[a * 4 + 3])
                    .slice(0, PACK_SLOTS);
            }
            for (let k = 0; k < list.length; k++) {
                gridData[id * PACK_SLOTS + k] = list[k];
            }
        }
        return {
            count,
            maxRadius: maxR,
            gridOrigin: [lo[0], lo[1], lo[2]],
            gridCell: cell,
            gridDims: dims,
            gridData,
            gridTexH,
            sphereData,
            sphereTexH,
            dropped,
        };
    }
}
