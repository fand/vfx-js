// Ported from holospot engine/scene/paperMaps.ts (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.
// A6 Foil Emboss: procedural paper micro-structure baked into LEAN-moment textures (addendum A6.1 "Paper"; the same
// approach as the bump maps, scene/bumpMaps.ts, so it never aliases or shimmers).
//
// One seamless tile of PAPER_TILE_MM = 10.24 mm at PAPER_N = 1024 texels (10 µm per texel) holds, per stock:
//   tooth      periodic value-noise octaves of 40–640 µm cells, amplitude ∝ size (equal slope per octave: most of the
//              height in the 0.2–1 mm undulation), per-stock weights (smooth: fine octaves damped; kraft: coarse boosted)
//   bundles    the matted fibre network (flocs): soft strands 1–3.5 mm long and 40–120 µm wide, raised and hollow,
//              summed on a half-resolution grid — the 0.1–1 mm relief is fibrous, not blobby
//   felt       soft elliptical dimples 0.3–0.9 mm long near the machine direction (the felt blanket's marks: strong on
//              `felt`, a trace on cotton)
//   fibres     curved strands 0.5–3 mm long (lognormal around the stock's mean × fibre scale), 15–40 µm wide (× √scale),
//              raised with a Gaussian section and diving in and out of the sheet along their length (max-composited, so
//              crossings layer instead of summing), each with a slight albedo of its own (kraft: dark and light browns)
//   specks     rare dark inclusions 20–70 µm across (many in kraft)
// The height is normalised to zero mean and unit RMS (the shader scales it by `tooth (µm)` × texture strength).
// Textures (RGBA16F, CPU box-filtered mip chains, repeat wrap, trilinear + anisotropic):
//   uPaperMom = (sₓ, s_y, sₓ², s_y²)   uPaperAux = (sₓs_y, albedo modulation, h, h²)
// with s = ∂h/∂texel (wrapped central differences). The shader (shaders/paper.glsl) fetches both over the pixel
// footprint: mean slope, unresolved slope covariance, mean albedo modulation, and the mean and variance of the height
// (micro-shadowing and the foil's voids in the tooth's valleys). Laid lines and the linen weave are analytic in the
// shader (exactly filtered sinusoids); formation (1–6 mm cloudiness) is procedural there too (no repetition).
// The generator is self-contained (inline worker, scene/kernelWorker.ts). No DOM access at module level.

export const PAPER_N = 1024;
export const PAPER_TILE_MM = 10.24;

export interface PaperOpts {
    n: number;
    tileMm: number;
    stock: number;
    fibreAmount: number;
    fibreScale: number;
    seed: number;
}
export interface PaperLevel {
    w: number;
    h: number;
    mom: Uint16Array;
    aux: Uint16Array;
}
export interface PaperBuild {
    levels: PaperLevel[];
    rmsSlope: number; // RMS |∇h| of the base level per texel (h in RMS units)
    albedoStd: number; // standard deviation of the albedo modulation
    fibres: number; // fibres drawn
}

export function paperKernel(): {
    build(o: PaperOpts): PaperBuild;
    half(x: number): number;
} {
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
    function rng(seed: number): () => number {
        let a = seed >>> 0 || 1;
        return () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function gauss(r: () => number): number {
        const u = Math.max(r(), 1e-9),
            v = r();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    // Periodic value noise with gx × gy lattice cells over the tile, quintic interpolation, added × amp into h.
    function octave(
        h: Float32Array,
        n: number,
        gx: number,
        gy: number,
        amp: number,
        r: () => number,
    ): void {
        const v = new Float32Array(gx * gy);
        for (let i = 0; i < v.length; i++) {
            v[i] = 2 * r() - 1;
        }
        const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
        // per-column lattice indices and weights (the same for every row)
        const cx0 = new Int32Array(n),
            cx1 = new Int32Array(n),
            ctx = new Float32Array(n);
        for (let x = 0; x < n; x++) {
            const fx = ((x + 0.5) * gx) / n,
                ix = Math.floor(fx);
            cx0[x] = ix % gx;
            cx1[x] = (ix + 1) % gx;
            ctx[x] = fade(fx - ix);
        }
        for (let y = 0; y < n; y++) {
            const fy = ((y + 0.5) * gy) / n,
                iy = Math.floor(fy),
                ty = fade(fy - iy),
                r0 = (iy % gy) * gx,
                r1 = ((iy + 1) % gy) * gx,
                o = y * n;
            for (let x = 0; x < n; x++) {
                const tx = ctx[x],
                    a0 = v[r0 + cx0[x]],
                    b0 = v[r1 + cx0[x]];
                const a = a0 + (v[r0 + cx1[x]] - a0) * tx,
                    b = b0 + (v[r1 + cx1[x]] - b0) * tx;
                const s = a + (b - a) * ty;
                h[o + x] += amp * s;
            }
        }
    }

    function build(o: PaperOpts): PaperBuild {
        const n = o.n,
            mmPerTex = o.tileMm / n,
            st = o.stock | 0;
        const r = rng(o.seed * 7919 + st * 104729 + 17);
        const h = new Float32Array(n * n),
            alb = new Float32Array(n * n);
        // ---- tooth: octaves of 64 … 4 texels (0.64 … 0.04 mm), amplitude ∝ size (equal slope per octave: most of the
        //            height sits in the 0.2–1 mm undulation that shows at arm's length); stock weights per octave (64 … 4)
        const W: number[][] = [
            [0.35, 0.5, 0.8, 0.8, 0.55], // cotton: soft, bulky (the 0.1–1 mm structure comes from the fibre bundles)
            [0.6, 0.7, 0.9, 0.9, 0.7], // felt
            [0.25, 0.3, 0.45, 0.45, 0.3], // smooth
            [0.35, 0.5, 0.8, 0.85, 0.7], // laid
            [0.3, 0.45, 0.7, 0.75, 0.6], // linen
            [0.6, 0.7, 0.9, 1.0, 0.8], // kraft: coarse
        ];
        const sizes = [64, 32, 16, 8, 4],
            wts = W[Math.min(Math.max(st, 0), 5)];
        for (let k = 0; k < sizes.length; k++) {
            const c = Math.max(1, Math.round(n / sizes[k]));
            octave(h, n, c, c, (sizes[k] / 16) * wts[k], r);
        }
        // ---- felt marks (felt: strong; cotton: a trace of the letterpress felt finish)
        // felt marks: the felt blanket's impression — soft elliptical dimples 0.3–0.9 mm long (aligned within ±25° of the
        // machine direction), mostly pressed in, summed on a half-resolution grid and scaled to `felt` × unit RMS
        const felt = st === 1 ? 1.5 : st === 0 ? 0.45 : st === 3 ? 0.3 : 0;
        if (felt > 0) {
            const nb = n >> 1,
                mm2 = mmPerTex * 2,
                hf = new Float32Array(nb * nb);
            const nD = Math.round(900 * (o.tileMm / 10.24) ** 2);
            for (let k = 0; k < nD; k++) {
                const cx = r() * nb,
                    cy = r() * nb,
                    a = (0.15 + 0.3 * r()) / mm2,
                    b = a * (0.35 + 0.3 * r()); // semi-axes
                const th = Math.PI / 2 + (r() - 0.5) * 0.9,
                    ca = Math.cos(th),
                    sa = Math.sin(th);
                const amp = r() < 0.75 ? -1 : 0.6,
                    R = Math.ceil(2.2 * a);
                for (let j = -R; j <= R; j++) {
                    for (let i = -R; i <= R; i++) {
                        const dx = Math.floor(cx) + i + 0.5 - cx,
                            dy = Math.floor(cy) + j + 0.5 - cy;
                        const u = (dx * ca + dy * sa) / a,
                            v = (-dx * sa + dy * ca) / b,
                            q = u * u + v * v;
                        if (q > 4.8) {
                            continue;
                        }
                        hf[
                            ((((Math.floor(cy) + j) % nb) + nb) % nb) * nb +
                                ((((Math.floor(cx) + i) % nb) + nb) % nb)
                        ] += amp * Math.exp(-0.5 * q * 1.6);
                    }
                }
            }
            let q2 = 0;
            for (let i = 0; i < nb * nb; i++) {
                q2 += hf[i] * hf[i];
            }
            const kf = felt / (Math.sqrt(q2 / (nb * nb)) || 1);
            for (let y = 0; y < n; y++) {
                const fy = (y + 0.5) / 2 - 0.5,
                    y0 = Math.floor(fy),
                    ty = fy - y0,
                    ya = ((y0 % nb) + nb) % nb,
                    yb = (ya + 1) % nb;
                for (let x = 0; x < n; x++) {
                    const fx = (x + 0.5) / 2 - 0.5,
                        x0 = Math.floor(fx),
                        tx = fx - x0,
                        xa = ((x0 % nb) + nb) % nb,
                        xb = (xa + 1) % nb;
                    const a0 =
                            hf[ya * nb + xa] +
                            (hf[ya * nb + xb] - hf[ya * nb + xa]) * tx,
                        b0 =
                            hf[yb * nb + xa] +
                            (hf[yb * nb + xb] - hf[yb * nb + xa]) * tx;
                    h[y * n + x] += kf * (a0 + (b0 - a0) * ty);
                }
            }
        }
        // ---- fibre bundles (flocs): the matted fibre network that makes the 0.1–1 mm relief of real paper fibrous
        //      instead of blobby — soft strands 1–3.5 mm long, 40–120 µm wide, summed, on a half-resolution grid
        {
            const nb = n >> 1,
                mm2 = mmPerTex * 2,
                hb = new Float32Array(nb * nb);
            const B0 = [1.0, 0.8, 0.55, 0.9, 0.7, 1.2][st] ?? 1; // bundle relief per stock
            const nB = Math.round(1100 * (o.tileMm / 10.24) ** 2);
            for (let f = 0; f < nB; f++) {
                const len =
                    (1.0 + 2.5 * r()) *
                    Math.sqrt(Math.min(Math.max(o.fibreScale, 0.5), 2));
                const sig = (0.02 + 0.04 * r()) / mm2; // σ [half-res texels]
                const amp = (r() < 0.5 ? 1 : -0.6) * (0.5 + r()); // raised bundles and hollows
                let x = r() * nb,
                    y = r() * nb,
                    th = r() * Math.PI * 2;
                const ds = Math.min(0.08, 0.7 * sig * mm2),
                    steps = Math.ceil(len / ds),
                    stepT = ds / mm2,
                    R = Math.ceil(2.4 * sig + stepT * 0.5);
                for (let k = 0; k < steps; k++) {
                    th += gauss(r) * 0.5 * Math.sqrt(ds);
                    const dx = Math.cos(th) * stepT,
                        dy = Math.sin(th) * stepT;
                    const taper = Math.sin((Math.PI * (k + 0.5)) / steps); // fades at both ends
                    const cx = x + 0.5 * dx,
                        cy = y + 0.5 * dy,
                        ix0 = Math.floor(cx - R),
                        iy0 = Math.floor(cy - R);
                    for (let j = 0; j <= 2 * R; j++) {
                        const ty = iy0 + j,
                            py = ty + 0.5,
                            wy = ((ty % nb) + nb) % nb;
                        for (let i = 0; i <= 2 * R; i++) {
                            const tx = ix0 + i,
                                px = tx + 0.5,
                                ax = px - x,
                                ay = py - y,
                                L2 = dx * dx + dy * dy;
                            const t = Math.min(
                                    Math.max((ax * dx + ay * dy) / L2, 0),
                                    1,
                                ),
                                ex = ax - t * dx,
                                ey = ay - t * dy,
                                d2 = ex * ex + ey * ey;
                            if (d2 > 5.8 * sig * sig) {
                                continue;
                            }
                            // one sample per segment and texel: the segment's share of the strand (step / σ normalises the sum)
                            hb[wy * nb + (((tx % nb) + nb) % nb)] +=
                                amp *
                                taper *
                                Math.exp((-0.5 * d2) / (sig * sig)) *
                                (stepT / (2.5 * sig));
                        }
                    }
                    x += dx;
                    y += dy;
                }
            }
            // bilinear up to the full grid, normalised to unit RMS × the stock's weight
            let q2 = 0;
            for (let i = 0; i < nb * nb; i++) {
                q2 += hb[i] * hb[i];
            }
            const kB = B0 / (Math.sqrt(q2 / (nb * nb)) || 1);
            for (let y = 0; y < n; y++) {
                const fy = (y + 0.5) / 2 - 0.5,
                    y0 = Math.floor(fy),
                    ty = fy - y0,
                    ya = ((y0 % nb) + nb) % nb,
                    yb = (ya + 1) % nb;
                for (let x = 0; x < n; x++) {
                    const fx = (x + 0.5) / 2 - 0.5,
                        x0 = Math.floor(fx),
                        tx = fx - x0,
                        xa = ((x0 % nb) + nb) % nb,
                        xb = (xa + 1) % nb;
                    const a =
                            hb[ya * nb + xa] +
                            (hb[ya * nb + xb] - hb[ya * nb + xa]) * tx,
                        b =
                            hb[yb * nb + xa] +
                            (hb[yb * nb + xb] - hb[yb * nb + xa]) * tx;
                    h[y * n + x] += kB * (a + (b - a) * ty);
                }
            }
        }
        // normalise the tooth so the fibres are scaled against it
        let m = 0,
            q = 0;
        for (let i = 0; i < n * n; i++) {
            m += h[i];
        }
        m /= n * n;
        for (let i = 0; i < n * n; i++) {
            h[i] -= m;
            q += h[i] * h[i];
        }
        const rmsT = Math.sqrt(q / (n * n)) || 1;
        for (let i = 0; i < n * n; i++) {
            h[i] /= rmsT;
        }

        // ---- fibres
        const L0 = [1.3, 1.3, 0.9, 1.6, 1.2, 2.4][st] ?? 1.3; // mean length [mm]
        const W0 = [22, 22, 18, 24, 20, 32][st] ?? 22; // mean width [µm]
        const N0 = [1500, 1300, 900, 1300, 1000, 1700][st] ?? 1300; // fibres per 10.24 mm tile at amount 1, scale 1
        const scale = Math.min(Math.max(o.fibreScale, 0.25), 4);
        const count = Math.round(
            (N0 *
                Math.min(Math.max(o.fibreAmount, 0), 1) *
                (o.tileMm / 10.24) ** 2) /
                scale,
        );
        const fh = new Float32Array(n * n),
            fa = new Float32Array(n * n),
            fw = new Float32Array(n * n);
        const kraft = st === 5;
        for (let f = 0; f < count; f++) {
            const len = L0 * scale * Math.exp(0.45 * gauss(r) - 0.1); // mm
            const wid = (W0 * Math.sqrt(scale) * (0.7 + 0.6 * r())) / 1000; // mm
            const sig = Math.max(wid / 2.4 / mmPerTex, 0.55); // texels (Gaussian section)
            const amp = 0.75 * (0.6 + 0.8 * r()) * Math.min(1, wid / 0.02);
            const fa0 = kraft
                ? r() < 0.55
                    ? -(0.06 + 0.16 * r())
                    : 0.05 + 0.08 * r()
                : r() < 0.7
                  ? 0.03 + 0.06 * r()
                  : -(0.01 + 0.03 * r());
            const dip = 0.4 + 0.8 * r(),
                ph = r() * 6.283; // dive in / out period [mm], phase
            let x = r() * n,
                y = r() * n,
                th = r() * Math.PI * 2;
            const ds = 0.04,
                steps = Math.max(2, Math.ceil(len / ds)),
                stepT = ds / mmPerTex;
            const R = Math.ceil(2.6 * sig + stepT * 0.5);
            for (let s = 0; s < steps; s++) {
                th += gauss(r) * 0.8 * Math.sqrt(ds);
                const dx = Math.cos(th) * stepT,
                    dy = Math.sin(th) * stepT;
                const vis = Math.min(
                    Math.max(
                        0.35 + 0.9 * Math.sin((6.283 * s * ds) / dip + ph),
                        0,
                    ),
                    1,
                );
                if (vis > 0.01) {
                    const cx = x + 0.5 * dx,
                        cy = y + 0.5 * dy;
                    const ix0 = Math.floor(cx - R),
                        iy0 = Math.floor(cy - R);
                    for (let j = 0; j <= 2 * R; j++) {
                        const ty = iy0 + j,
                            py = ty + 0.5,
                            wy = ((ty % n) + n) % n;
                        for (let i = 0; i <= 2 * R; i++) {
                            const tx = ix0 + i,
                                px = tx + 0.5;
                            // distance to the segment (x, y) → (x + dx, y + dy)
                            const ax = px - x,
                                ay = py - y,
                                L2 = dx * dx + dy * dy;
                            const t = Math.min(
                                Math.max((ax * dx + ay * dy) / L2, 0),
                                1,
                            );
                            const ex = ax - t * dx,
                                ey = ay - t * dy,
                                d2 = ex * ex + ey * ey;
                            if (d2 > 6.8 * sig * sig) {
                                continue;
                            }
                            const g = Math.exp((-0.5 * d2) / (sig * sig)) * vis;
                            const id = wy * n + (((tx % n) + n) % n);
                            const v = amp * g;
                            if (v > fh[id]) {
                                fh[id] = v;
                            }
                            if (g > fw[id]) {
                                fa[id] = fa[id] + (fa0 - fa[id]) * g;
                                fw[id] = g;
                            }
                        }
                    }
                }
                x += dx;
                y += dy;
            }
        }
        for (let i = 0; i < n * n; i++) {
            h[i] += fh[i];
            alb[i] += fa[i];
        }
        // ---- specks (inclusions)
        const nSp = [6, 6, 3, 8, 4, 70][st] ?? 6;
        for (let k = 0; k < nSp; k++) {
            const cx = r() * n,
                cy = r() * n,
                rad = (0.01 + 0.025 * r()) / mmPerTex,
                a = -(0.2 + 0.4 * r()) * (kraft ? 0.7 : 1);
            const R = Math.ceil(rad * 2.2);
            for (let j = -R; j <= R; j++) {
                for (let i = -R; i <= R; i++) {
                    const d =
                        Math.hypot(i + 0.5 - (cx % 1), j + 0.5 - (cy % 1)) /
                        rad;
                    if (d > 2.2) {
                        continue;
                    }
                    const id =
                        ((((Math.floor(cy) + j) % n) + n) % n) * n +
                        ((((Math.floor(cx) + i) % n) + n) % n);
                    const g = Math.exp(-0.5 * d * d * 2.2);
                    alb[id] += a * g;
                    h[id] += 0.4 * g;
                }
            }
        }
        // ---- normalise the height, slopes, moments
        m = 0;
        q = 0;
        for (let i = 0; i < n * n; i++) {
            m += h[i];
        }
        m /= n * n;
        for (let i = 0; i < n * n; i++) {
            h[i] -= m;
            q += h[i] * h[i];
        }
        const rms = Math.sqrt(q / (n * n)) || 1;
        let am = 0,
            aq = 0;
        for (let i = 0; i < n * n; i++) {
            am += alb[i];
        }
        am /= n * n;
        let cur = new Float32Array(8 * n * n);
        let s2 = 0;
        for (let y = 0; y < n; y++) {
            const ym = ((y + n - 1) % n) * n,
                y0 = y * n,
                yp = ((y + 1) % n) * n;
            for (let x = 0; x < n; x++) {
                const xm = (x + n - 1) % n,
                    xp = (x + 1) % n;
                const gx = (h[y0 + xp] - h[y0 + xm]) / (2 * rms),
                    gy = (h[yp + x] - h[ym + x]) / (2 * rms);
                const hv = h[y0 + x] / rms,
                    a = alb[y0 + x] - am;
                aq += a * a;
                s2 += gx * gx + gy * gy;
                const o = 8 * (y0 + x);
                cur[o] = gx;
                cur[o + 1] = gy;
                cur[o + 2] = gx * gx;
                cur[o + 3] = gy * gy;
                cur[o + 4] = gx * gy;
                cur[o + 5] = a;
                cur[o + 6] = hv;
                cur[o + 7] = hv * hv;
            }
        }
        const levels: PaperLevel[] = [];
        let w = n;
        for (;;) {
            const mom = new Uint16Array(4 * w * w),
                aux = new Uint16Array(4 * w * w);
            const bits = new Uint32Array(cur.buffer, cur.byteOffset, 8 * w * w);
            for (let i = 0; i < w * w; i++) {
                for (let c = 0; c < 4; c++) {
                    mom[4 * i + c] = halfBits(bits[8 * i + c]);
                    aux[4 * i + c] = halfBits(bits[8 * i + 4 + c]);
                }
            }
            levels.push({ w, h: w, mom, aux });
            if (w === 1) {
                break;
            }
            const w2 = w >> 1,
                next = new Float32Array(8 * w2 * w2);
            for (let y = 0; y < w2; y++) {
                for (let x = 0; x < w2; x++) {
                    const d = 8 * (y * w2 + x);
                    for (let j = 0; j < 2; j++) {
                        for (let i = 0; i < 2; i++) {
                            const s = 8 * ((2 * y + j) * w + 2 * x + i);
                            for (let c = 0; c < 8; c++) {
                                next[d + c] += cur[s + c];
                            }
                        }
                    }
                    for (let c = 0; c < 8; c++) {
                        next[d + c] *= 0.25;
                    }
                }
            }
            cur = next;
            w = w2;
        }
        return {
            levels,
            rmsSlope: Math.sqrt(s2 / (n * n)),
            albedoStd: Math.sqrt(aq / (n * n)),
            fibres: count,
        };
    }
    return { build, half };
}

// ---------------------------------------------------------------------------------------------------------------
// Textures
// ---------------------------------------------------------------------------------------------------------------
