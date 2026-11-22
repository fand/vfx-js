// Marching-squares contour tracer for binary masks.
// It finds the closed boundary loops, with each vertex's position along its loop, so effects can animate along the outline.

export type Contour = {
    /** Vertex positions as flat `[x0, y0, x1, y1, ...]`, texel units. */
    points: Float32Array;
    /** Normalized arc length (0..1) at each vertex. */
    t: Float32Array;
    /** Total loop length in texels. */
    length: number;
    /** Signed loop area in texels²: positive for a filled region's outline, negative for a hole's. */
    area: number;
};

// Directed segments per marching-squares case, oriented so the inside stays on the walk's left.
// Edge ids are the midpoints of the cell's sides: 0 = bottom, 1 = right, 2 = top, 3 = left.
// Saddles (5, 10) pair their segments the same way as the single-corner cases.
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

// Edge-midpoint offsets from the cell's bottom-left corner, doubled so they stay integers.
const EDGE_OFFSET_X2: readonly (readonly [number, number])[] = [
    [1, 0], // bottom
    [2, 1], // right
    [1, 2], // top
    [0, 1], // left
];

/**
 * Trace the boundary loops of a binary mask.
 *
 * `rgba` is tightly packed RGBA bytes with a bottom-left origin.
 * A texel is inside when its red channel is at least 128.
 * Texels outside the buffer count as outside, so shapes touching the border still close.
 * Coordinates are in texel units: texel `(i, j)`'s centre is `(i, j)`.
 */
export function traceContours(
    rgba: Uint8Array,
    width: number,
    height: number,
): Contour[] {
    // Inside flags with a one-texel empty border, so shapes touching the edge still close.
    const paddedW = width + 2;
    const inside = new Uint8Array(paddedW * (height + 2));
    for (let y = 0; y < height; y++) {
        const row = (y + 1) * paddedW + 1;
        for (let x = 0; x < width; x++) {
            inside[row + x] = rgba[(y * width + x) * 4] >= 128 ? 1 : 0;
        }
    }

    // Directed segment map from start-vertex key to end-vertex key.
    // Every vertex has exactly one outgoing and one incoming segment, so the map is a set of disjoint cycles.
    const next = new Map<number, number>();
    // Vertex keys pack doubled coordinates, shifted so the border cells at -1 stay non-negative.
    const strideX2 = 2 * (width + 2);
    const key = (x2: number, y2: number): number =>
        (y2 + 2) * strideX2 + (x2 + 2);

    for (let y = -1; y < height; y++) {
        const below = (y + 1) * paddedW;
        const above = below + paddedW;
        for (let x = -1; x < width; x++) {
            const idx =
                inside[below + x + 1] |
                (inside[below + x + 2] << 1) |
                (inside[above + x + 2] << 2) |
                (inside[above + x + 1] << 3);
            if (idx === 0 || idx === 15) {
                continue;
            }
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
                // An open chain; drop it.
                break;
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

        // Cumulative arc length, normalised over the closed loop, and the signed area.
        let acc = 0;
        let area2 = 0;
        for (let i = 0; i < n; i++) {
            t[i] = acc;
            const j = (i + 1) % n;
            const dx = points[j * 2] - points[i * 2];
            const dy = points[j * 2 + 1] - points[i * 2 + 1];
            acc += Math.hypot(dx, dy);
            area2 +=
                points[i * 2] * points[j * 2 + 1] -
                points[j * 2] * points[i * 2 + 1];
        }
        if (acc <= 0) {
            continue;
        }
        for (let i = 0; i < n; i++) {
            t[i] /= acc;
        }

        contours.push({ points, t, length: acc, area: area2 / 2 });
    }

    return contours;
}
