// Ported from holospot engine/scene/logo.ts (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.
// A6 Foil Emboss: the logo — SVG / PNG → alpha mask → exact signed distance field + dome membrane → mipmapped texture.
//
// Pipeline (addendum A6.1 "Logo source"):
//   1. Page: the image (an image element, a canvas or a URL) is decoded by the
//      browser (SVG included: its root gets explicit width/height so it rasterises crisply at the size drawn), drawn
//      once at 1024 px on the long side to find the ink's bounding box, then drawn again so that box fills the analysis
//      raster's logo box (≤ 1600 px on the long side, 14 % padding per side, aspect preserved). Coverage = alpha (an
//      image without transparency: the contrast against its border colour).
//   2. Kernel (inline worker, scene/kernelWorker.ts): Felzenszwalb–Huttenlocher squared EDT of the binary mask inside
//      and outside, signed distance = d_in − ½ or ½ − d_out [px], edge pixels refined to (coverage − ½), a (1 2 1)²
//      blur against the staircase, 2× box reduction to the storage grid (≤ 1024 texels, dims multiples of 16), central-
//      difference gradient, and the dome membrane u (Δu = −1 inside, u = 0 outside; SOR coarse-to-fine on a ≤ 256 grid).
//   3. Page: one RGBA16F texture (d [logo widths, + inside], ∂d/∂x, ∂d/∂y [unitless, logo frame], u [logo widths²])
//      with a CPU box-filtered mip chain (trilinear + anisotropic), clamp-to-edge; rows bottom-up (logo +y = uv +v).
// The shader (shaders/emboss.glsl) maps card mm → logo frame → uv with the placement uniforms; outside the texture the
// distance continues as (edge value − distance to the box).
// No DOM access at module level (the kernel is imported by tests/emboss.test.ts under node --test).

// ---------------------------------------------------------------------------------------------------------------
// Kernel (self-contained: its source text is the worker's code)
// ---------------------------------------------------------------------------------------------------------------

/** Analysis raster for the kernel: coverage in [0, 1], row 0 = top (canvas order); the logo box [x0, y0, x1, y1) in
 *  analysis px; `f` analysis px per storage texel (1 or 2; aw, ah multiples of f). */
export interface LogoRaster {
    cov: Float32Array;
    aw: number;
    ah: number;
    box: [number, number, number, number];
    f: number;
}
export interface LogoLevel {
    w: number;
    h: number;
    data: Uint16Array;
}
export interface LogoBuild {
    w: number;
    h: number; // storage texels
    levels: LogoLevel[]; // RGBA half floats, base first, down to 1 × 1, rows bottom-up
    logoW: number;
    logoH: number; // logo box in storage texels
    areaFrac: number; // inked fraction of the logo box
    uMax: number; // largest membrane value [logo widths²]
}

export function logoKernel(): {
    build(r: LogoRaster): LogoBuild;
    signedDistance(cov: Float32Array, w: number, h: number): Float32Array;
    membrane(
        cov: Float32Array,
        w: number,
        h: number,
        pxPerUnit: number,
    ): { u: Float32Array; gw: number; gh: number; cell: number };
    half(x: number): number;
} {
    const INF = 1e20;
    const f32 = new Float32Array(1),
        u32 = new Uint32Array(f32.buffer);
    function halfBits(b: number): number {
        const s = (b >>> 16) & 0x8000,
            e = (b >>> 23) & 0xff,
            m = b & 0x7fffff;
        if (e === 0xff) {
            return s | 0x7c00 | (m !== 0 ? 0x200 : 0);
        }
        const E = e - 112;
        if (E >= 31) {
            return s | 0x7bff;
        }
        if (E <= 0) {
            if (E < -10) {
                return s;
            }
            const sh = 14 - E;
            return s | (((m | 0x800000) + (1 << (sh - 1))) >> sh);
        }
        return s | Math.min((E << 10) + ((m + 0x1000) >> 13), 0x7bff);
    }
    function half(x: number): number {
        f32[0] = x;
        return halfBits(u32[0]);
    }

    // Felzenszwalb & Huttenlocher (2012): 1D squared distance transform of f (lower envelope of parabolas).
    function dt1(
        f: Float64Array,
        d: Float64Array,
        v: Int32Array,
        z: Float64Array,
        n: number,
    ): void {
        let k = 0;
        v[0] = 0;
        z[0] = -INF;
        z[1] = INF;
        for (let q = 1; q < n; q++) {
            let s =
                (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
            while (s <= z[k]) {
                k--;
                s =
                    (f[q] + q * q - (f[v[k]] + v[k] * v[k])) /
                    (2 * q - 2 * v[k]);
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
            const r = q - v[k];
            d[q] = r * r + f[v[k]];
        }
    }
    // 2D squared EDT in place (0 = feature, INF = none): columns, then rows.
    function edt(g: Float32Array, w: number, h: number): void {
        const n = Math.max(w, h);
        const f = new Float64Array(n),
            d = new Float64Array(n),
            v = new Int32Array(n),
            z = new Float64Array(n + 1);
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                f[y] = g[y * w + x];
            }
            dt1(f, d, v, z, h);
            for (let y = 0; y < h; y++) {
                g[y * w + x] = d[y];
            }
        }
        for (let y = 0; y < h; y++) {
            const o = y * w;
            for (let x = 0; x < w; x++) {
                f[x] = g[o + x];
            }
            dt1(f, d, v, z, w);
            for (let x = 0; x < w; x++) {
                g[o + x] = d[x];
            }
        }
    }
    // Signed distance [px] to the coverage-½ outline, positive inside; pixels on the outline use their coverage.
    function signedDistance(
        cov: Float32Array,
        w: number,
        h: number,
    ): Float32Array {
        const n = w * h,
            gOut = new Float32Array(n),
            gIn = new Float32Array(n),
            sd = new Float32Array(n);
        let any = 0;
        for (let i = 0; i < n; i++) {
            const ins = cov[i] >= 0.5;
            if (ins) {
                any++;
            }
            gOut[i] = ins ? 0 : INF;
            gIn[i] = ins ? INF : 0;
        }
        if (any === 0 || any === n) {
            throw new Error(
                any === 0
                    ? "the image has no visible (opaque) pixels"
                    : "the image is opaque everywhere",
            );
        }
        edt(gOut, w, h);
        edt(gIn, w, h);
        for (let i = 0; i < n; i++) {
            const c = cov[i],
                ins = c >= 0.5;
            let s = ins ? Math.sqrt(gIn[i]) - 0.5 : 0.5 - Math.sqrt(gOut[i]);
            if (c > 0 && c < 1 && Math.abs(s) <= 0.5 + 1e-6) {
                s = c - 0.5;
            }
            sd[i] = s;
        }
        return sd;
    }
    // Separable (1 2 1)/4 blur with clamped borders, in place.
    function blur121(a: Float32Array, w: number, h: number): void {
        const t = new Float32Array(Math.max(w, h));
        for (let y = 0; y < h; y++) {
            const o = y * w;
            for (let x = 0; x < w; x++) {
                t[x] =
                    0.25 *
                    (a[o + Math.max(x - 1, 0)] +
                        2 * a[o + x] +
                        a[o + Math.min(x + 1, w - 1)]);
            }
            for (let x = 0; x < w; x++) {
                a[o + x] = t[x];
            }
        }
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                t[y] =
                    0.25 *
                    (a[Math.max(y - 1, 0) * w + x] +
                        2 * a[y * w + x] +
                        a[Math.min(y + 1, h - 1) * w + x]);
            }
            for (let y = 0; y < h; y++) {
                a[y * w + x] = t[y];
            }
        }
    }
    // Membrane Δu = −1 inside the mask (u = 0 outside) with grid spacing in "units" (pxPerUnit analysis px = 1 unit):
    // SOR from a ≤ 32 grid up to a ≤ 256 grid (coverage box-averaged per cell, inside where ≥ ½).
    function membrane(
        cov: Float32Array,
        w: number,
        h: number,
        pxPerUnit: number,
    ): { u: Float32Array; gw: number; gh: number; cell: number } {
        const cell = Math.max(1, Math.ceil(Math.max(w, h) / 256));
        const gw = Math.ceil(w / cell),
            gh = Math.ceil(h / cell);
        // finest grid coverage
        const c0 = new Float32Array(gw * gh),
            n0 = new Float32Array(gw * gh);
        for (let y = 0; y < h; y++) {
            const gy = Math.floor(y / cell);
            for (let x = 0; x < w; x++) {
                const i = gy * gw + Math.floor(x / cell);
                c0[i] += cov[y * w + x];
                n0[i]++;
            }
        }
        for (let i = 0; i < c0.length; i++) {
            c0[i] /= Math.max(n0[i], 1);
        }
        const levels: { c: Float32Array; w: number; h: number; hu: number }[] =
            [{ c: c0, w: gw, h: gh, hu: cell / pxPerUnit }];
        while (
            Math.max(levels[levels.length - 1].w, levels[levels.length - 1].h) >
            32
        ) {
            const L = levels[levels.length - 1],
                w2 = Math.ceil(L.w / 2),
                h2 = Math.ceil(L.h / 2);
            const c = new Float32Array(w2 * h2),
                k = new Float32Array(w2 * h2);
            for (let y = 0; y < L.h; y++) {
                for (let x = 0; x < L.w; x++) {
                    const i = (y >> 1) * w2 + (x >> 1);
                    c[i] += L.c[y * L.w + x];
                    k[i]++;
                }
            }
            for (let i = 0; i < c.length; i++) {
                c[i] /= Math.max(k[i], 1);
            }
            levels.push({ c, w: w2, h: h2, hu: L.hu * 2 });
        }
        let u = new Float32Array(
            levels[levels.length - 1].w * levels[levels.length - 1].h,
        );
        for (let li = levels.length - 1; li >= 0; li--) {
            const L = levels[li],
                lw = L.w,
                lh = L.h,
                hh = L.hu * L.hu;
            if (li < levels.length - 1) {
                // prolong the coarser solution (bilinear)
                const P = levels[li + 1],
                    pu = u,
                    nu = new Float32Array(lw * lh);
                for (let y = 0; y < lh; y++) {
                    for (let x = 0; x < lw; x++) {
                        const fx = Math.min(
                                Math.max((x + 0.5) / 2 - 0.5, 0),
                                P.w - 1,
                            ),
                            fy = Math.min(
                                Math.max((y + 0.5) / 2 - 0.5, 0),
                                P.h - 1,
                            );
                        const x0 = Math.floor(fx),
                            y0 = Math.floor(fy),
                            x1 = Math.min(x0 + 1, P.w - 1),
                            y1 = Math.min(y0 + 1, P.h - 1);
                        const ax = fx - x0,
                            ay = fy - y0;
                        nu[y * lw + x] =
                            (1 - ay) *
                                ((1 - ax) * pu[y0 * P.w + x0] +
                                    ax * pu[y0 * P.w + x1]) +
                            ay *
                                ((1 - ax) * pu[y1 * P.w + x0] +
                                    ax * pu[y1 * P.w + x1]);
                    }
                }
                u = nu;
            }
            const iters = li === levels.length - 1 ? 400 : 60,
                om = 1.85;
            for (let it = 0; it < iters; it++) {
                for (let y = 0; y < lh; y++) {
                    for (let x = 0; x < lw; x++) {
                        const i = y * lw + x;
                        if (L.c[i] < 0.5) {
                            u[i] = 0;
                            continue;
                        }
                        const s =
                            (x > 0 ? u[i - 1] : 0) +
                            (x < lw - 1 ? u[i + 1] : 0) +
                            (y > 0 ? u[i - lw] : 0) +
                            (y < lh - 1 ? u[i + lw] : 0);
                        u[i] += om * ((s + hh) / 4 - u[i]);
                    }
                }
            }
        }
        return { u, gw, gh, cell };
    }

    function build(r: LogoRaster): LogoBuild {
        const { cov, aw, ah, box, f } = r;
        const sd = signedDistance(cov, aw, ah);
        blur121(sd, aw, ah);
        const W = Math.floor(aw / f),
            H = Math.floor(ah / f);
        // storage distance [storage texels], canvas row order
        const d = new Float32Array(W * H),
            k = 1 / (f * f * f);
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                let s = 0;
                for (let j = 0; j < f; j++) {
                    for (let i = 0; i < f; i++) {
                        s += sd[(y * f + j) * aw + x * f + i];
                    }
                }
                d[y * W + x] = s * k;
            }
        }
        const logoW = (box[2] - box[0]) / f,
            logoH = (box[3] - box[1]) / f;
        // inked fraction of the logo box
        let ink = 0,
            cnt = 0;
        for (
            let y = Math.max(0, Math.floor(box[1]));
            y < Math.min(ah, Math.ceil(box[3]));
            y++
        ) {
            for (
                let x = Math.max(0, Math.floor(box[0]));
                x < Math.min(aw, Math.ceil(box[2]));
                x++
            ) {
                ink += cov[y * aw + x];
                cnt++;
            }
        }
        // membrane in logo widths (pxPerUnit = logo width in analysis px)
        const m = membrane(cov, aw, ah, box[2] - box[0]);
        const uAt = (ax: number, ay: number) => {
            // bilinear in the coarse grid, analysis px coordinates
            const fx = Math.min(Math.max(ax / m.cell - 0.5, 0), m.gw - 1),
                fy = Math.min(Math.max(ay / m.cell - 0.5, 0), m.gh - 1);
            const x0 = Math.floor(fx),
                y0 = Math.floor(fy),
                x1 = Math.min(x0 + 1, m.gw - 1),
                y1 = Math.min(y0 + 1, m.gh - 1);
            const tx = fx - x0,
                ty = fy - y0,
                U = m.u;
            return (
                (1 - ty) *
                    ((1 - tx) * U[y0 * m.gw + x0] + tx * U[y0 * m.gw + x1]) +
                ty * ((1 - tx) * U[y1 * m.gw + x0] + tx * U[y1 * m.gw + x1])
            );
        };
        // base level: (d / logoW, ∂d/∂x, ∂d/∂y with +y up, u), rows bottom-up
        let cur = new Float32Array(4 * W * H);
        let uMax = 0;
        for (let y = 0; y < H; y++) {
            const gl = H - 1 - y; // GL row
            for (let x = 0; x < W; x++) {
                const i = y * W + x;
                const xm = Math.max(x - 1, 0),
                    xp = Math.min(x + 1, W - 1),
                    ym = Math.max(y - 1, 0),
                    yp = Math.min(y + 1, H - 1);
                const gx =
                    (d[y * W + xp] - d[y * W + xm]) / Math.max(xp - xm, 1);
                const gy =
                    (d[ym * W + x] - d[yp * W + x]) / Math.max(yp - ym, 1); // canvas rows run down: +y up
                const uv = d[i] > -1 ? uAt((x + 0.5) * f, (y + 0.5) * f) : 0;
                uMax = Math.max(uMax, uv);
                const o = 4 * (gl * W + x);
                cur[o] = d[i] / logoW;
                cur[o + 1] = gx;
                cur[o + 2] = gy;
                cur[o + 3] = uv;
            }
        }
        const levels: LogoLevel[] = [];
        let w = W,
            hh = H;
        for (;;) {
            const data = new Uint16Array(4 * w * hh),
                bits = new Uint32Array(cur.buffer, cur.byteOffset, 4 * w * hh);
            for (let i = 0; i < 4 * w * hh; i++) {
                data[i] = halfBits(bits[i]);
            }
            levels.push({ w, h: hh, data });
            if (w === 1 && hh === 1) {
                break;
            }
            const w2 = Math.max(1, w >> 1),
                h2 = Math.max(1, hh >> 1),
                sx = w > 1 ? 2 : 1,
                sy = hh > 1 ? 2 : 1,
                kk = 1 / (sx * sy);
            const next = new Float32Array(4 * w2 * h2);
            for (let y = 0; y < h2; y++) {
                for (let x = 0; x < w2; x++) {
                    const o = 4 * (y * w2 + x);
                    for (let j = 0; j < sy; j++) {
                        for (let i = 0; i < sx; i++) {
                            const s =
                                4 *
                                (Math.min(y * sy + j, hh - 1) * w +
                                    Math.min(x * sx + i, w - 1));
                            next[o] += cur[s];
                            next[o + 1] += cur[s + 1];
                            next[o + 2] += cur[s + 2];
                            next[o + 3] += cur[s + 3];
                        }
                    }
                    next[o] *= kk;
                    next[o + 1] *= kk;
                    next[o + 2] *= kk;
                    next[o + 3] *= kk;
                }
            }
            cur = next;
            w = w2;
            hh = h2;
        }
        return {
            w: W,
            h: H,
            levels,
            logoW,
            logoH,
            areaFrac: cnt ? ink / cnt : 0,
            uMax,
        };
    }

    return { build, signedDistance, membrane, half };
}

// ---------------------------------------------------------------------------------------------------------------
// Layout of the rasters (pure)
// ---------------------------------------------------------------------------------------------------------------

/** Storage: logo long side 800 texels, 14 % padding of the long side per side, dims rounded up to multiples of 16. */
export const LOGO_LONG_TEXELS = 800;
export const LOGO_PAD = 0.14;
export const LOGO_ANALYSIS_F = 2;

export interface LogoLayout {
    W: number;
    H: number; // storage texels
    logoW: number;
    logoH: number; // logo box, storage texels (float)
    aw: number;
    ah: number; // analysis px (= f·W, f·H)
    box: [number, number, number, number]; // logo box in analysis px, canvas order
}

/** The storage and analysis layout of an artwork of aspect `aspect` (height / width). */
export function logoLayout(aspect: number): LogoLayout {
    const a = Math.min(
        Math.max(Number.isFinite(aspect) && aspect > 0 ? aspect : 1, 1 / 16),
        16,
    );
    const L = LOGO_LONG_TEXELS,
        pad = Math.round(LOGO_PAD * L);
    const logoW = a <= 1 ? L : L / a,
        logoH = a <= 1 ? L * a : L;
    const up16 = (x: number) => Math.ceil(x / 16) * 16;
    const W = up16(logoW + 2 * pad),
        H = up16(logoH + 2 * pad),
        f = LOGO_ANALYSIS_F;
    const x0 = (W - logoW) / 2,
        y0 = (H - logoH) / 2;
    return {
        W,
        H,
        logoW,
        logoH,
        aw: f * W,
        ah: f * H,
        box: [f * x0, f * y0, f * (x0 + logoW), f * (y0 + logoH)],
    };
}

/** Parses an SVG root's viewBox / width / height into an intrinsic size (CSS px) and aspect. */
export function svgIntrinsicSize(attrs: {
    viewBox?: string | null;
    width?: string | null;
    height?: string | null;
}): { w: number; h: number } | null {
    const num = (s: string | null | undefined) => {
        if (!s) {
            return NaN;
        }
        const m = /^\s*([0-9.]+(?:e[+-]?\d+)?)\s*(px)?\s*$/i.exec(s);
        return m ? Number(m[1]) : NaN;
    };
    const vb = (attrs.viewBox ?? "")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
    const vbOk =
        vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0;
    const w = num(attrs.width),
        h = num(attrs.height);
    if (w > 0 && h > 0) {
        return { w, h };
    }
    if (vbOk) {
        if (w > 0) {
            return { w, h: (w * vb[3]) / vb[2] };
        }
        if (h > 0) {
            return { w: (h * vb[2]) / vb[3], h };
        }
        return { w: vb[2], h: vb[3] };
    }
    return null;
}

// ---------------------------------------------------------------------------------------------------------------
// The page side: decode, rasterise, build, upload
// ---------------------------------------------------------------------------------------------------------------

/** A decoded source: draws its region (sx, sy, sw, sh) [intrinsic px] into (dx, dy, dw, dh) [canvas px]. An SVG is
 *  re-created with that region as its viewBox at the drawn size, so it stays vector-crisp at any scale. */
interface LogoSource {
    w: number;
    h: number;
    draw(
        g: CanvasRenderingContext2D,
        s: readonly [number, number, number, number],
        d: readonly [number, number, number, number],
    ): Promise<void>;
    close(): void;
}

async function loadImageEl(src: string): Promise<HTMLImageElement> {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    await img.decode();
    return img;
}

/** Decodes a logo URL (path, data: or blob: URL). */
async function decodeLogo(url: string): Promise<LogoSource> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const head = await blob
        .slice(0, 512)
        .text()
        .catch(() => "");
    const isSvg =
        /svg/i.test(blob.type) ||
        /\.svg(?:[?#]|$)/i.test(url) ||
        /<svg[\s>]/i.test(head);
    if (isSvg) {
        const text = await blob.text();
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        const root = doc.documentElement;
        if (root?.nodeName.toLowerCase() !== "svg") {
            throw new Error("not an SVG document");
        }
        const size = svgIntrinsicSize({
            viewBox: root.getAttribute("viewBox"),
            width: root.getAttribute("width"),
            height: root.getAttribute("height"),
        }) ?? { w: 300, h: 150 };
        const vb0 = (root.getAttribute("viewBox") ?? "")
            .trim()
            .split(/[\s,]+/)
            .map(Number);
        const vb =
            vb0.length === 4 &&
            vb0.every(Number.isFinite) &&
            vb0[2] > 0 &&
            vb0[3] > 0
                ? vb0
                : [0, 0, size.w, size.h];
        root.setAttribute("preserveAspectRatio", "none");
        const ser = new XMLSerializer();
        const urls: string[] = [];
        return {
            w: size.w,
            h: size.h,
            async draw(g, s, d) {
                const kx = vb[2] / size.w,
                    ky = vb[3] / size.h;
                root.setAttribute(
                    "viewBox",
                    `${vb[0] + s[0] * kx} ${vb[1] + s[1] * ky} ${s[2] * kx} ${s[3] * ky}`,
                );
                root.setAttribute(
                    "width",
                    String(Math.max(1, Math.round(d[2]))),
                );
                root.setAttribute(
                    "height",
                    String(Math.max(1, Math.round(d[3]))),
                );
                const u = URL.createObjectURL(
                    new Blob([ser.serializeToString(root)], {
                        type: "image/svg+xml",
                    }),
                );
                urls.push(u);
                const img = await loadImageEl(u);
                g.drawImage(img, d[0], d[1], d[2], d[3]);
            },
            close() {
                for (const u of urls) {
                    URL.revokeObjectURL(u);
                }
            },
        };
    }
    let bmp: ImageBitmap | HTMLImageElement;
    try {
        bmp = await createImageBitmap(blob, {
            premultiplyAlpha: "none",
            colorSpaceConversion: "none",
        });
    } catch {
        bmp = await loadImageEl(URL.createObjectURL(blob));
    }
    const w = bmp instanceof HTMLImageElement ? bmp.naturalWidth : bmp.width,
        h = bmp instanceof HTMLImageElement ? bmp.naturalHeight : bmp.height;
    if (!(w > 0 && h > 0)) {
        throw new Error("the image has no size");
    }
    return {
        w,
        h,
        async draw(g, s, d) {
            g.drawImage(bmp, s[0], s[1], s[2], s[3], d[0], d[1], d[2], d[3]);
        },
        close() {
            if (!(bmp instanceof HTMLImageElement)) {
                bmp.close();
            }
        },
    };
}

export function canvas2d(w: number, h: number): CanvasRenderingContext2D {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) {
        throw new Error("no 2D canvas");
    }
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    return g;
}

/** Coverage of RGBA pixels: alpha, or for an image without transparency the contrast against its border colour. */
export function coverageOf(
    px: ArrayLike<number>,
    w: number,
    h: number,
    opaque: boolean,
    bg: number | null,
): Float32Array {
    const n = w * h,
        cov = new Float32Array(n);
    if (!opaque || bg === null) {
        for (let i = 0; i < n; i++) {
            cov[i] = px[4 * i + 3] / 255;
        }
        return cov;
    }
    let maxC = 0;
    const L = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        L[i] =
            (0.2126 * px[4 * i] +
                0.7152 * px[4 * i + 1] +
                0.0722 * px[4 * i + 2]) /
            255;
        maxC = Math.max(maxC, Math.abs(L[i] - bg));
    }
    if (maxC < 0.05) {
        return cov;
    }
    for (let i = 0; i < n; i++) {
        cov[i] = Math.min(
            Math.max((Math.abs(L[i] - bg) - 0.15 * maxC) / (0.5 * maxC), 0),
            1,
        );
    }
    return cov;
}

/** Mean luminance of the border pixels and whether the image is opaque everywhere. */
function borderInfo(
    px: Uint8ClampedArray,
    w: number,
    h: number,
): { opaque: boolean; bg: number } {
    let minA = 255,
        s = 0,
        k = 0;
    for (let i = 0; i < w * h; i++) {
        minA = Math.min(minA, px[4 * i + 3]);
    }
    const add = (x: number, y: number) => {
        const i = 4 * (y * w + x);
        s += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
        k++;
    };
    for (let x = 0; x < w; x++) {
        add(x, 0);
        add(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
        add(0, y);
        add(w - 1, y);
    }
    return { opaque: minA > 245, bg: k ? s / k : 1 };
}

/**
 * vfx-js port: how an image is read as a logo.
 * - `frame`: `"ink"` fits the ink's bounding box (holospot); `"full"` keeps the whole image as the logo box (the
 *   element as the logo, so it maps 1:1 onto the element).
 * - `read`: `"auto"` is holospot's coverage (alpha, or the contrast against the border of an opaque image); `"luma"`
 *   is the brightness × alpha.
 * - `threshold`: the coverage cut into foil / no foil (holospot: ½), moved by remapping the coverage around it.
 */
export interface LogoReadOpts {
    frame: "ink" | "full";
    read: "auto" | "luma";
    threshold: number;
}
export const LOGO_READ_DEFAULT: LogoReadOpts = {
    frame: "ink",
    read: "auto",
    threshold: 0.5,
};

/** Coverage per the read options: holospot's, or luma × alpha; then the threshold moved to ½. */
function readCoverage(
    px: Uint8ClampedArray,
    w: number,
    h: number,
    bi: { opaque: boolean; bg: number },
    o: LogoReadOpts,
): Float32Array {
    let cov: Float32Array;
    if (o.read === "luma") {
        cov = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
            const a = px[4 * i + 3] / 255;
            // straight colour (canvas pixels are not premultiplied)
            cov[i] =
                a *
                ((0.2126 * px[4 * i] +
                    0.7152 * px[4 * i + 1] +
                    0.0722 * px[4 * i + 2]) /
                    255);
        }
    } else {
        cov = coverageOf(px, w, h, bi.opaque, bi.bg);
    }
    const t = Math.min(Math.max(o.threshold, 0.01), 0.99);
    if (t !== 0.5) {
        for (let i = 0; i < cov.length; i++) {
            const c = cov[i];
            cov[i] = c < t ? (0.5 * c) / t : 0.5 + (0.5 * (c - t)) / (1 - t);
        }
    }
    return cov;
}

/** Rasterises a logo for the kernel: ink bounding box at 1024 px, then the analysis raster of `logoLayout`. */
export async function rasterizeLogo(
    url: string,
    opts: LogoReadOpts = LOGO_READ_DEFAULT,
): Promise<{ raster: LogoRaster; layout: LogoLayout; aspect: number }> {
    return rasterizeSource(await decodeLogo(url), opts);
}

/** vfx-js port: rasterises an image object (a decoded <img>, a canvas or an ImageBitmap) as rasterizeLogo does a URL. */
export async function rasterizeLogoImage(
    img: HTMLImageElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas,
    opts: LogoReadOpts = LOGO_READ_DEFAULT,
): Promise<{ raster: LogoRaster; layout: LogoLayout; aspect: number }> {
    if (img instanceof HTMLImageElement && !img.complete) {
        await img.decode();
    }
    const w = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
    const h = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
    if (!(w > 0 && h > 0)) {
        throw new Error("the image has no size");
    }
    return rasterizeSource(
        {
            w,
            h,
            async draw(g, s, d) {
                g.drawImage(
                    img,
                    s[0],
                    s[1],
                    s[2],
                    s[3],
                    d[0],
                    d[1],
                    d[2],
                    d[3],
                );
            },
            close() {},
        },
        opts,
    );
}

async function rasterizeSource(
    src: LogoSource,
    opts: LogoReadOpts,
): Promise<{ raster: LogoRaster; layout: LogoLayout; aspect: number }> {
    try {
        // pass 1: bounding box of the ink
        const s1 = 1024 / Math.max(src.w, src.h),
            w1 = Math.max(1, Math.round(src.w * s1)),
            h1 = Math.max(1, Math.round(src.h * s1));
        const g1 = canvas2d(w1, h1);
        await src.draw(g1, [0, 0, src.w, src.h], [0, 0, w1, h1]);
        const p1 = g1.getImageData(0, 0, w1, h1).data;
        const bi = borderInfo(p1, w1, h1);
        const c1 = readCoverage(p1, w1, h1, bi, opts);
        let x0 = w1,
            y0 = h1,
            x1 = -1,
            y1 = -1;
        for (let y = 0; y < h1; y++) {
            for (let x = 0; x < w1; x++) {
                if (c1[y * w1 + x] > 0.04) {
                    x0 = Math.min(x0, x);
                    y0 = Math.min(y0, y);
                    x1 = Math.max(x1, x);
                    y1 = Math.max(y1, y);
                }
            }
        }
        if (x1 < x0 || y1 < y0) {
            throw new Error("the image has no visible (opaque) pixels");
        }
        // the ink's box (one pass-1 pixel of margin against clipping anti-aliased ink), intrinsic px; or the whole image
        const full = opts.frame === "full";
        const bx = full ? 0 : (x0 - 1) / s1,
            by = full ? 0 : (y0 - 1) / s1,
            bw = full ? src.w : (x1 + 3 - x0) / s1,
            bh = full ? src.h : (y1 + 3 - y0) / s1;
        const aspect = bh / bw;
        // pass 2: the box fills the analysis logo box
        const L = logoLayout(aspect);
        const g2 = canvas2d(L.aw, L.ah);
        await src.draw(
            g2,
            [bx, by, bw, bh],
            [L.box[0], L.box[1], L.box[2] - L.box[0], L.box[3] - L.box[1]],
        );
        const p2 = g2.getImageData(0, 0, L.aw, L.ah).data;
        const cov = readCoverage(p2, L.aw, L.ah, bi, opts);
        return {
            raster: { cov, aw: L.aw, ah: L.ah, box: L.box, f: LOGO_ANALYSIS_F },
            layout: L,
            aspect,
        };
    } finally {
        src.close();
    }
}
