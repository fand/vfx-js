// Marching-squares contour tracer for binary masks.
// Extracts closed boundary loops with a normalized arc-length parameter,
// so effects can animate along the silhouette (path reveal, pulses).

export type Contour = {
    /** Vertex positions as flat `[x0, y0, x1, y1, ...]`, texel units. */
    points: Float32Array;
    /** Normalized arc length (0..1) at each vertex. */
    t: Float32Array;
    /** Total loop length in texels. */
    length: number;
};

// Directed segments per marching-squares case, oriented so the inside
// region stays on the walk's left. Edge ids: 0 = bottom, 1 = right,
// 2 = top, 3 = left (midpoints of the cell's sides). Saddles (5, 10)
// pair segments consistently with the single-corner cases.
const CASE_SEGMENTS: readonly (readonly [number, number][])[] = [
    [],
    [[0, 3]],
    [[1, 0]],
    [[1, 3]],
    [[2, 1]],
    [
        [0, 3],
        [2, 1],
    ],
    [[2, 0]],
    [[2, 3]],
    [[3, 2]],
    [[0, 2]],
    [
        [1, 0],
        [3, 2],
    ],
    [[1, 2]],
    [[3, 1]],
    [[0, 1]],
    [[3, 0]],
    [],
];

// Edge-midpoint offsets from the cell's bottom-left corner, doubled so
// they stay integers (0.5 steps become 1).
const EDGE_OFFSET_X2: readonly (readonly [number, number])[] = [
    [1, 0], // bottom
    [2, 1], // right
    [1, 2], // top
    [0, 1], // left
];

/**
 * Trace the boundary loops of a binary mask.
 *
 * `rgba` is tightly packed RGBA bytes (bottom-left origin); a texel is
 * inside when its red channel is >= 128. Texels outside the buffer count
 * as outside, so shapes touching the border still close.
 *
 * Coordinates are in texel units: texel `(i, j)`'s center is `(i, j)`.
 */
export function traceContours(
    rgba: Uint8Array,
    width: number,
    height: number,
): Contour[] {
    const inside = (x: number, y: number): number => {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return 0;
        }
        return rgba[(y * width + x) * 4] >= 128 ? 1 : 0;
    };

    // Directed segment map: start-vertex key -> end-vertex key.
    // Every contour vertex has exactly one outgoing and one incoming
    // segment, so the map is a union of disjoint cycles.
    const next = new Map<number, number>();
    // Vertex keys pack doubled coordinates, shifted so the -1 border
    // cells stay non-negative.
    const strideX2 = 2 * (width + 2);
    const key = (x2: number, y2: number): number =>
        (y2 + 2) * strideX2 + (x2 + 2);

    for (let y = -1; y < height; y++) {
        for (let x = -1; x < width; x++) {
            const idx =
                inside(x, y) |
                (inside(x + 1, y) << 1) |
                (inside(x + 1, y + 1) << 2) |
                (inside(x, y + 1) << 3);
            for (const [from, to] of CASE_SEGMENTS[idx]) {
                const [fx, fy] = EDGE_OFFSET_X2[from];
                const [tx, ty] = EDGE_OFFSET_X2[to];
                next.set(
                    key(x * 2 + fx, y * 2 + fy),
                    key(x * 2 + tx, y * 2 + ty),
                );
            }
        }
    }

    const contours: Contour[] = [];
    const visited = new Set<number>();

    for (const start of next.keys()) {
        if (visited.has(start)) {
            continue;
        }

        // Walk the cycle, collecting doubled coordinates.
        const loop: number[] = [];
        let cur = start;
        do {
            visited.add(cur);
            loop.push(cur);
            const n = next.get(cur);
            if (n === undefined) {
                break; // malformed mask edge; drop the open chain
            }
            cur = n;
        } while (cur !== start);
        if (cur !== start || loop.length < 3) {
            continue;
        }

        const n = loop.length;
        const points = new Float32Array(n * 2);
        const t = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            points[i * 2] = ((loop[i] % strideX2) - 2) / 2;
            points[i * 2 + 1] = (Math.floor(loop[i] / strideX2) - 2) / 2;
        }

        // Cumulative arc length, normalized over the closed loop (the
        // segment back to the start counts toward the total).
        let acc = 0;
        for (let i = 0; i < n; i++) {
            t[i] = acc;
            const j = (i + 1) % n;
            const dx = points[j * 2] - points[i * 2];
            const dy = points[j * 2 + 1] - points[i * 2 + 1];
            acc += Math.hypot(dx, dy);
        }
        if (acc <= 0) {
            continue;
        }
        for (let i = 0; i < n; i++) {
            t[i] /= acc;
        }

        contours.push({ points, t, length: acc });
    }

    return contours;
}
