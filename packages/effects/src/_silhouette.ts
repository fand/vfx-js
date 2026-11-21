// The extruded silhouette shared by the 3D shape effects: a 2D signed
// distance field built on the CPU from the element's alpha, its GLSL
// lookup, and the orbit camera rotation.

// Long side of the silhouette read back from the element, in px.
export const MASK_LONG = 400;
// Padding of the SDF grid around the silhouette, relative to MASK_LONG.
const SDF_PAD = 0.3;
// Spawn points on the surface: SPAWN_SIZE² of them.
export const SPAWN_SIZE = 256;

// sdfTex: r = 2D signed distance (world units), gb = its gradient.
// The 3D shape is that silhouette extruded to [-halfDepth, halfDepth],
// with edges rounded by \`rounding\`.
//
// GLSL_SD2 is the 2D lookup and the shape's uniforms, GLSL_EXTRUDE the
// rounded extrusion; GLSL_SDF is both. An effect with its own extrusion
// takes GLSL_SD2 and defines `extrude` and `sdf3` itself.
export const GLSL_SD2 = `
uniform sampler2D sdfTex;
uniform vec4 sdfRect;
uniform float halfDepth;
uniform float rounding;

vec3 sd2(vec2 p) {
    vec2 uv = (p - sdfRect.xy) / sdfRect.zw;
    vec2 cuv = clamp(uv, 0.0, 1.0);
    vec4 s = texture(sdfTex, cuv);
    vec2 outside = (uv - cuv) * sdfRect.zw;
    float lo = length(outside);
    vec2 g = lo > 0.0 ? normalize(outside + s.gb * 0.05) : s.gb;
    float gl = length(g);
    return vec3(s.r + lo, gl > 1e-5 ? g / gl : vec2(0.0, 1.0));
}
`;

export const GLSL_EXTRUDE = `
// The extrusion of a 2D sample s (from sd2) at depth z.
// x = distance, yzw = unit gradient.
vec4 extrude(vec3 s, float z) {
    float sz = z >= 0.0 ? 1.0 : -1.0;
    vec2 w = vec2(s.x + rounding, abs(z) - halfDepth + rounding);
    if (w.x > 0.0 && w.y > 0.0) {
        float l = length(w);
        return vec4(l - rounding, vec3(s.yz * w.x, sz * w.y) / l);
    }
    if (w.x > w.y) {
        return vec4(w.x - rounding, s.yz, 0.0);
    }
    return vec4(w.y - rounding, 0.0, 0.0, sz);
}

vec4 sdf3(vec3 p) {
    return extrude(sd2(p.xy), p.z);
}
`;

export const GLSL_SDF = GLSL_SD2 + GLSL_EXTRUDE;

export type ShapeData = {
    /** RGBA: sd (world), gradient xy, 0. */
    sdf: Float32Array;
    sdfW: number;
    sdfH: number;
    /** [minX, minY, sizeX, sizeY] in world units. */
    sdfRect: [number, number, number, number];
    /** Half size of the element in world units (the long side is 1). */
    shapeHalf: [number, number];
    /** RGBA: x, y, z / halfDepth (-1..1), 0. */
    spawn: Float32Array;
    /** Width / height of the element when it was captured. */
    aspect: number;
};

const INF = 1e20;

// Felzenszwalb & Huttenlocher 1D squared distance transform.
function edt1d(
    f: Float64Array,
    n: number,
    d: Float64Array,
    v: Int32Array,
    z: Float64Array,
): void {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
        let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) {
            k--;
            s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        }
        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) {
            k++;
        }
        const dq = q - v[k];
        d[q] = dq * dq + f[v[k]];
    }
}

// In-place 2D squared EDT. `grid` holds 0 on features and INF elsewhere.
function edt2d(grid: Float64Array, w: number, h: number): void {
    const n = Math.max(w, h);
    const f = new Float64Array(n);
    const d = new Float64Array(n);
    const v = new Int32Array(n);
    const z = new Float64Array(n + 1);
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            f[y] = grid[y * w + x];
        }
        edt1d(f, h, d, v, z);
        for (let y = 0; y < h; y++) {
            grid[y * w + x] = d[y];
        }
    }
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            f[x] = grid[y * w + x];
        }
        edt1d(f, w, d, v, z);
        for (let x = 0; x < w; x++) {
            grid[y * w + x] = d[x];
        }
    }
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

// In-place box blur of `n` values at `start + i * stride`, over
// [i - r, i + r] clipped to the line.
function boxBlur1d(
    data: Float32Array,
    start: number,
    stride: number,
    n: number,
    r: number,
    line: Float32Array,
): void {
    for (let i = 0; i < n; i++) {
        line[i] = data[start + i * stride];
    }
    let sum = 0;
    for (let i = 0; i < Math.min(r, n); i++) {
        sum += line[i];
    }
    for (let i = 0; i < n; i++) {
        if (i + r < n) {
            sum += line[i + r];
        }
        if (i - r - 1 >= 0) {
            sum -= line[i - r - 1];
        }
        const cnt = Math.min(i + r, n - 1) - Math.max(i - r, 0) + 1;
        data[start + i * stride] = sum / cnt;
    }
}

/**
 * Build the SDF and spawn points from RGBA pixels (bottom-up rows).
 * The pixel staircase of the field is softened by `smoothPasses` box
 * blurs of radius `smoothRadius` px: more gives smoother normals and
 * rounder corners.
 * Returns null when the silhouette is empty.
 */
export function buildShape(
    pixels: Uint8Array | Float32Array,
    mw: number,
    mh: number,
    halfDepthHint: number,
    aspect: number,
    smoothRadius = 1,
    smoothPasses = 1,
): ShapeData | null {
    const alphaScale = pixels instanceof Float32Array ? 1 : 1 / 255;
    const mLong = Math.max(mw, mh);
    const pad = Math.round(mLong * SDF_PAD);
    const W = mw + pad * 2;
    const H = mh + pad * 2;
    const inside = new Uint8Array(W * H);
    let insideCount = 0;
    for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
            const a = pixels[(y * mw + x) * 4 + 3] * alphaScale;
            if (a >= 0.5) {
                inside[(y + pad) * W + x + pad] = 1;
                insideCount++;
            }
        }
    }
    if (insideCount < 16) {
        return null;
    }

    const toOut = new Float64Array(W * H);
    const toIn = new Float64Array(W * H);
    for (let i = 0; i < W * H; i++) {
        toOut[i] = inside[i] ? 0 : INF;
        toIn[i] = inside[i] ? INF : 0;
    }
    edt2d(toOut, W, H);
    edt2d(toIn, W, H);

    // Signed distance in px, then box blurs to soften the staircase.
    const sd = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
        sd[i] = inside[i]
            ? -(Math.sqrt(toIn[i]) - 0.5)
            : Math.sqrt(toOut[i]) - 0.5;
    }
    const r = Math.max(Math.round(smoothRadius), 0);
    if (r > 0) {
        const line = new Float32Array(Math.max(W, H));
        for (let pass = 0; pass < Math.max(smoothPasses, 0); pass++) {
            for (let y = 0; y < H; y++) {
                boxBlur1d(sd, y * W, 1, W, r, line);
            }
            for (let x = 0; x < W; x++) {
                boxBlur1d(sd, x, W, H, r, line);
            }
        }
    }

    const px = 2 / mLong; // world units per px
    const minX = -(mw / 2 + pad) * px;
    const minY = -(mh / 2 + pad) * px;
    const sdf = new Float32Array(W * H * 4);
    const gradX = new Float32Array(W * H);
    const gradY = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const l = sd[y * W + Math.max(x - 1, 0)];
            const r = sd[y * W + Math.min(x + 1, W - 1)];
            const b = sd[Math.max(y - 1, 0) * W + x];
            const t = sd[Math.min(y + 1, H - 1) * W + x];
            let gx = r - l;
            let gy = t - b;
            const gl = Math.hypot(gx, gy);
            if (gl > 1e-6) {
                gx /= gl;
                gy /= gl;
            } else {
                gx = 0;
                gy = 0;
            }
            gradX[i] = gx;
            gradY[i] = gy;
            sdf[i * 4] = sd[i] * px;
            sdf[i * 4 + 1] = gx;
            sdf[i * 4 + 2] = gy;
        }
    }

    // Spawn points, area-weighted between the two caps and the side wall.
    const insideIdx: number[] = [];
    const edgeIdx: number[] = [];
    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            const i = y * W + x;
            if (!inside[i]) {
                continue;
            }
            insideIdx.push(i);
            if (
                !inside[i - 1] ||
                !inside[i + 1] ||
                !inside[i - W] ||
                !inside[i + W]
            ) {
                edgeIdx.push(i);
            }
        }
    }
    const capArea = insideIdx.length * px * px * 2;
    // 4-neighbour edge pixels undercount diagonal edges; ~1.15 on average.
    const sideArea = edgeIdx.length * 1.15 * px * (2 * halfDepthHint);
    const pSide = sideArea / (sideArea + capArea);

    const rand = mulberry32(0x5eed1234);
    const total = SPAWN_SIZE * SPAWN_SIZE;
    const spawn = new Float32Array(total * 4);
    for (let k = 0; k < total; k++) {
        const o = k * 4;
        if (rand() < pSide && edgeIdx.length > 0) {
            const i = edgeIdx[Math.floor(rand() * edgeIdx.length)];
            const x = i % W;
            const y = (i - x) / W;
            // Slide the pixel centre onto the zero contour.
            const d = sd[i];
            const wx = minX + (x + 0.5 + (rand() - 0.5) * 0.5) * px;
            const wy = minY + (y + 0.5 + (rand() - 0.5) * 0.5) * px;
            spawn[o] = wx - gradX[i] * d * px;
            spawn[o + 1] = wy - gradY[i] * d * px;
            spawn[o + 2] = rand() * 2 - 1;
        } else {
            const i = insideIdx[Math.floor(rand() * insideIdx.length)];
            const x = i % W;
            const y = (i - x) / W;
            spawn[o] = minX + (x + rand()) * px;
            spawn[o + 1] = minY + (y + rand()) * px;
            spawn[o + 2] = rand() < 0.5 ? -1 : 1;
        }
    }

    return {
        sdf,
        sdfW: W,
        sdfH: H,
        sdfRect: [minX, minY, W * px, H * px],
        shapeHalf: [mw / mLong, mh / mLong],
        spawn,
        aspect,
    };
}

// Column-major rotation: pitch (around X) after yaw (around Y).
export function viewMatrix(yaw: number, pitch: number): number[] {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    // R = Rx(pitch) * Ry(yaw)
    // Ry = [cy 0 sy; 0 1 0; -sy 0 cy], Rx = [1 0 0; 0 cp -sp; 0 sp cp]
    const r00 = cy;
    const r01 = 0;
    const r02 = sy;
    const r10 = sp * sy;
    const r11 = cp;
    const r12 = -sp * cy;
    const r20 = -cp * sy;
    const r21 = sp;
    const r22 = cp * cy;
    return [r00, r10, r20, r01, r11, r21, r02, r12, r22];
}
