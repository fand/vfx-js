import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{i as t,n,r,t as i}from"./build-CGrXap9d.js";import{c as a,g as o,h as s,l as c,m as l,o as u,s as d}from"./Holo.stories-B2LdWuw5.js";var f,p;function m(){return(m=e((()=>{f=`function logoKernel() {
    const INF = 1e20;
    const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
    function halfBits(b) {
        const s = (b >>> 16) & 0x8000, e = (b >>> 23) & 0xff, m = b & 0x7fffff;
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
    function half(x) {
        f32[0] = x;
        return halfBits(u32[0]);
    }
    function dt1(f, d, v, z, n) {
        let k = 0;
        v[0] = 0;
        z[0] = -INF;
        z[1] = INF;
        for (let q = 1; q < n; q++) {
            let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
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
    function edt(g, w, h) {
        const n = Math.max(w, h);
        const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
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
    function signedDistance(cov, w, h) {
        const n = w * h, gOut = new Float32Array(n), gIn = new Float32Array(n), sd = new Float32Array(n);
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
            throw new Error(any === 0
                ? "the image has no visible (opaque) pixels"
                : "the image is opaque everywhere");
        }
        edt(gOut, w, h);
        edt(gIn, w, h);
        for (let i = 0; i < n; i++) {
            const c = cov[i], ins = c >= 0.5;
            let s = ins ? Math.sqrt(gIn[i]) - 0.5 : 0.5 - Math.sqrt(gOut[i]);
            if (c > 0 && c < 1 && Math.abs(s) <= 0.5 + 1e-6) {
                s = c - 0.5;
            }
            sd[i] = s;
        }
        return sd;
    }
    function blur121(a, w, h) {
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
    function membrane(cov, w, h, pxPerUnit) {
        const cell = Math.max(1, Math.ceil(Math.max(w, h) / 256));
        const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
        const c0 = new Float32Array(gw * gh), n0 = new Float32Array(gw * gh);
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
        const levels = [{ c: c0, w: gw, h: gh, hu: cell / pxPerUnit }];
        while (Math.max(levels[levels.length - 1].w, levels[levels.length - 1].h) >
            32) {
            const L = levels[levels.length - 1], w2 = Math.ceil(L.w / 2), h2 = Math.ceil(L.h / 2);
            const c = new Float32Array(w2 * h2), k = new Float32Array(w2 * h2);
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
        let u = new Float32Array(levels[levels.length - 1].w * levels[levels.length - 1].h);
        for (let li = levels.length - 1; li >= 0; li--) {
            const L = levels[li], lw = L.w, lh = L.h, hh = L.hu * L.hu;
            if (li < levels.length - 1) {
                const P = levels[li + 1], pu = u, nu = new Float32Array(lw * lh);
                for (let y = 0; y < lh; y++) {
                    for (let x = 0; x < lw; x++) {
                        const fx = Math.min(Math.max((x + 0.5) / 2 - 0.5, 0), P.w - 1), fy = Math.min(Math.max((y + 0.5) / 2 - 0.5, 0), P.h - 1);
                        const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(x0 + 1, P.w - 1), y1 = Math.min(y0 + 1, P.h - 1);
                        const ax = fx - x0, ay = fy - y0;
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
            const iters = li === levels.length - 1 ? 400 : 60, om = 1.85;
            for (let it = 0; it < iters; it++) {
                for (let y = 0; y < lh; y++) {
                    for (let x = 0; x < lw; x++) {
                        const i = y * lw + x;
                        if (L.c[i] < 0.5) {
                            u[i] = 0;
                            continue;
                        }
                        const s = (x > 0 ? u[i - 1] : 0) +
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
    function build(r) {
        const { cov, aw, ah, box, f } = r;
        const sd = signedDistance(cov, aw, ah);
        blur121(sd, aw, ah);
        const W = Math.floor(aw / f), H = Math.floor(ah / f);
        const d = new Float32Array(W * H), k = 1 / (f * f * f);
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
        const logoW = (box[2] - box[0]) / f, logoH = (box[3] - box[1]) / f;
        let ink = 0, cnt = 0;
        for (let y = Math.max(0, Math.floor(box[1])); y < Math.min(ah, Math.ceil(box[3])); y++) {
            for (let x = Math.max(0, Math.floor(box[0])); x < Math.min(aw, Math.ceil(box[2])); x++) {
                ink += cov[y * aw + x];
                cnt++;
            }
        }
        const m = membrane(cov, aw, ah, box[2] - box[0]);
        const uAt = (ax, ay) => {
            const fx = Math.min(Math.max(ax / m.cell - 0.5, 0), m.gw - 1), fy = Math.min(Math.max(ay / m.cell - 0.5, 0), m.gh - 1);
            const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(x0 + 1, m.gw - 1), y1 = Math.min(y0 + 1, m.gh - 1);
            const tx = fx - x0, ty = fy - y0, U = m.u;
            return ((1 - ty) *
                ((1 - tx) * U[y0 * m.gw + x0] + tx * U[y0 * m.gw + x1]) +
                ty * ((1 - tx) * U[y1 * m.gw + x0] + tx * U[y1 * m.gw + x1]));
        };
        let cur = new Float32Array(4 * W * H);
        let uMax = 0;
        for (let y = 0; y < H; y++) {
            const gl = H - 1 - y;
            for (let x = 0; x < W; x++) {
                const i = y * W + x;
                const xm = Math.max(x - 1, 0), xp = Math.min(x + 1, W - 1), ym = Math.max(y - 1, 0), yp = Math.min(y + 1, H - 1);
                const gx = (d[y * W + xp] - d[y * W + xm]) / Math.max(xp - xm, 1);
                const gy = (d[ym * W + x] - d[yp * W + x]) / Math.max(yp - ym, 1);
                const uv = d[i] > -1 ? uAt((x + 0.5) * f, (y + 0.5) * f) : 0;
                uMax = Math.max(uMax, uv);
                const o = 4 * (gl * W + x);
                cur[o] = d[i] / logoW;
                cur[o + 1] = gx;
                cur[o + 2] = gy;
                cur[o + 3] = uv;
            }
        }
        const levels = [];
        let w = W, hh = H;
        for (;;) {
            const data = new Uint16Array(4 * w * hh), bits = new Uint32Array(cur.buffer, cur.byteOffset, 4 * w * hh);
            for (let i = 0; i < 4 * w * hh; i++) {
                data[i] = halfBits(bits[i]);
            }
            levels.push({ w, h: hh, data });
            if (w === 1 && hh === 1) {
                break;
            }
            const w2 = Math.max(1, w >> 1), h2 = Math.max(1, hh >> 1), sx = w > 1 ? 2 : 1, sy = hh > 1 ? 2 : 1, kk = 1 / (sx * sy);
            const next = new Float32Array(4 * w2 * h2);
            for (let y = 0; y < h2; y++) {
                for (let x = 0; x < w2; x++) {
                    const o = 4 * (y * w2 + x);
                    for (let j = 0; j < sy; j++) {
                        for (let i = 0; i < sx; i++) {
                            const s = 4 *
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
}`,p=`function paperKernel() {
    const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
    function halfBits(b) {
        const s = (b >>> 16) & 0x8000, e = (b >>> 23) & 0xff, m = b & 0x7fffff;
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
    function half(x) {
        f32[0] = x;
        return halfBits(u32[0]);
    }
    function rng(seed) {
        let a = seed >>> 0 || 1;
        return () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function gauss(r) {
        const u = Math.max(r(), 1e-9), v = r();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    function octave(h, n, gx, gy, amp, r) {
        const v = new Float32Array(gx * gy);
        for (let i = 0; i < v.length; i++) {
            v[i] = 2 * r() - 1;
        }
        const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
        const cx0 = new Int32Array(n), cx1 = new Int32Array(n), ctx = new Float32Array(n);
        for (let x = 0; x < n; x++) {
            const fx = ((x + 0.5) * gx) / n, ix = Math.floor(fx);
            cx0[x] = ix % gx;
            cx1[x] = (ix + 1) % gx;
            ctx[x] = fade(fx - ix);
        }
        for (let y = 0; y < n; y++) {
            const fy = ((y + 0.5) * gy) / n, iy = Math.floor(fy), ty = fade(fy - iy), r0 = (iy % gy) * gx, r1 = ((iy + 1) % gy) * gx, o = y * n;
            for (let x = 0; x < n; x++) {
                const tx = ctx[x], a0 = v[r0 + cx0[x]], b0 = v[r1 + cx0[x]];
                const a = a0 + (v[r0 + cx1[x]] - a0) * tx, b = b0 + (v[r1 + cx1[x]] - b0) * tx;
                const s = a + (b - a) * ty;
                h[o + x] += amp * s;
            }
        }
    }
    function build(o) {
        const n = o.n, mmPerTex = o.tileMm / n, st = o.stock | 0;
        const r = rng(o.seed * 7919 + st * 104729 + 17);
        const h = new Float32Array(n * n), alb = new Float32Array(n * n);
        const W = [
            [0.35, 0.5, 0.8, 0.8, 0.55],
            [0.6, 0.7, 0.9, 0.9, 0.7],
            [0.25, 0.3, 0.45, 0.45, 0.3],
            [0.35, 0.5, 0.8, 0.85, 0.7],
            [0.3, 0.45, 0.7, 0.75, 0.6],
            [0.6, 0.7, 0.9, 1.0, 0.8],
        ];
        const sizes = [64, 32, 16, 8, 4], wts = W[Math.min(Math.max(st, 0), 5)];
        for (let k = 0; k < sizes.length; k++) {
            const c = Math.max(1, Math.round(n / sizes[k]));
            octave(h, n, c, c, (sizes[k] / 16) * wts[k], r);
        }
        const felt = st === 1 ? 1.5 : st === 0 ? 0.45 : st === 3 ? 0.3 : 0;
        if (felt > 0) {
            const nb = n >> 1, mm2 = mmPerTex * 2, hf = new Float32Array(nb * nb);
            const nD = Math.round(900 * (o.tileMm / 10.24) ** 2);
            for (let k = 0; k < nD; k++) {
                const cx = r() * nb, cy = r() * nb, a = (0.15 + 0.3 * r()) / mm2, b = a * (0.35 + 0.3 * r());
                const th = Math.PI / 2 + (r() - 0.5) * 0.9, ca = Math.cos(th), sa = Math.sin(th);
                const amp = r() < 0.75 ? -1 : 0.6, R = Math.ceil(2.2 * a);
                for (let j = -R; j <= R; j++) {
                    for (let i = -R; i <= R; i++) {
                        const dx = Math.floor(cx) + i + 0.5 - cx, dy = Math.floor(cy) + j + 0.5 - cy;
                        const u = (dx * ca + dy * sa) / a, v = (-dx * sa + dy * ca) / b, q = u * u + v * v;
                        if (q > 4.8) {
                            continue;
                        }
                        hf[((((Math.floor(cy) + j) % nb) + nb) % nb) * nb +
                            ((((Math.floor(cx) + i) % nb) + nb) % nb)] += amp * Math.exp(-0.5 * q * 1.6);
                    }
                }
            }
            let q2 = 0;
            for (let i = 0; i < nb * nb; i++) {
                q2 += hf[i] * hf[i];
            }
            const kf = felt / (Math.sqrt(q2 / (nb * nb)) || 1);
            for (let y = 0; y < n; y++) {
                const fy = (y + 0.5) / 2 - 0.5, y0 = Math.floor(fy), ty = fy - y0, ya = ((y0 % nb) + nb) % nb, yb = (ya + 1) % nb;
                for (let x = 0; x < n; x++) {
                    const fx = (x + 0.5) / 2 - 0.5, x0 = Math.floor(fx), tx = fx - x0, xa = ((x0 % nb) + nb) % nb, xb = (xa + 1) % nb;
                    const a0 = hf[ya * nb + xa] +
                        (hf[ya * nb + xb] - hf[ya * nb + xa]) * tx, b0 = hf[yb * nb + xa] +
                        (hf[yb * nb + xb] - hf[yb * nb + xa]) * tx;
                    h[y * n + x] += kf * (a0 + (b0 - a0) * ty);
                }
            }
        }
        {
            const nb = n >> 1, mm2 = mmPerTex * 2, hb = new Float32Array(nb * nb);
            const B0 = [1.0, 0.8, 0.55, 0.9, 0.7, 1.2][st] ?? 1;
            const nB = Math.round(1100 * (o.tileMm / 10.24) ** 2);
            for (let f = 0; f < nB; f++) {
                const len = (1.0 + 2.5 * r()) *
                    Math.sqrt(Math.min(Math.max(o.fibreScale, 0.5), 2));
                const sig = (0.02 + 0.04 * r()) / mm2;
                const amp = (r() < 0.5 ? 1 : -0.6) * (0.5 + r());
                let x = r() * nb, y = r() * nb, th = r() * Math.PI * 2;
                const ds = Math.min(0.08, 0.7 * sig * mm2), steps = Math.ceil(len / ds), stepT = ds / mm2, R = Math.ceil(2.4 * sig + stepT * 0.5);
                for (let k = 0; k < steps; k++) {
                    th += gauss(r) * 0.5 * Math.sqrt(ds);
                    const dx = Math.cos(th) * stepT, dy = Math.sin(th) * stepT;
                    const taper = Math.sin((Math.PI * (k + 0.5)) / steps);
                    const cx = x + 0.5 * dx, cy = y + 0.5 * dy, ix0 = Math.floor(cx - R), iy0 = Math.floor(cy - R);
                    for (let j = 0; j <= 2 * R; j++) {
                        const ty = iy0 + j, py = ty + 0.5, wy = ((ty % nb) + nb) % nb;
                        for (let i = 0; i <= 2 * R; i++) {
                            const tx = ix0 + i, px = tx + 0.5, ax = px - x, ay = py - y, L2 = dx * dx + dy * dy;
                            const t = Math.min(Math.max((ax * dx + ay * dy) / L2, 0), 1), ex = ax - t * dx, ey = ay - t * dy, d2 = ex * ex + ey * ey;
                            if (d2 > 5.8 * sig * sig) {
                                continue;
                            }
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
            let q2 = 0;
            for (let i = 0; i < nb * nb; i++) {
                q2 += hb[i] * hb[i];
            }
            const kB = B0 / (Math.sqrt(q2 / (nb * nb)) || 1);
            for (let y = 0; y < n; y++) {
                const fy = (y + 0.5) / 2 - 0.5, y0 = Math.floor(fy), ty = fy - y0, ya = ((y0 % nb) + nb) % nb, yb = (ya + 1) % nb;
                for (let x = 0; x < n; x++) {
                    const fx = (x + 0.5) / 2 - 0.5, x0 = Math.floor(fx), tx = fx - x0, xa = ((x0 % nb) + nb) % nb, xb = (xa + 1) % nb;
                    const a = hb[ya * nb + xa] +
                        (hb[ya * nb + xb] - hb[ya * nb + xa]) * tx, b = hb[yb * nb + xa] +
                        (hb[yb * nb + xb] - hb[yb * nb + xa]) * tx;
                    h[y * n + x] += kB * (a + (b - a) * ty);
                }
            }
        }
        let m = 0, q = 0;
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
        const L0 = [1.3, 1.3, 0.9, 1.6, 1.2, 2.4][st] ?? 1.3;
        const W0 = [22, 22, 18, 24, 20, 32][st] ?? 22;
        const N0 = [1500, 1300, 900, 1300, 1000, 1700][st] ?? 1300;
        const scale = Math.min(Math.max(o.fibreScale, 0.25), 4);
        const count = Math.round((N0 *
            Math.min(Math.max(o.fibreAmount, 0), 1) *
            (o.tileMm / 10.24) ** 2) /
            scale);
        const fh = new Float32Array(n * n), fa = new Float32Array(n * n), fw = new Float32Array(n * n);
        const kraft = st === 5;
        for (let f = 0; f < count; f++) {
            const len = L0 * scale * Math.exp(0.45 * gauss(r) - 0.1);
            const wid = (W0 * Math.sqrt(scale) * (0.7 + 0.6 * r())) / 1000;
            const sig = Math.max(wid / 2.4 / mmPerTex, 0.55);
            const amp = 0.75 * (0.6 + 0.8 * r()) * Math.min(1, wid / 0.02);
            const fa0 = kraft
                ? r() < 0.55
                    ? -(0.06 + 0.16 * r())
                    : 0.05 + 0.08 * r()
                : r() < 0.7
                    ? 0.03 + 0.06 * r()
                    : -(0.01 + 0.03 * r());
            const dip = 0.4 + 0.8 * r(), ph = r() * 6.283;
            let x = r() * n, y = r() * n, th = r() * Math.PI * 2;
            const ds = 0.04, steps = Math.max(2, Math.ceil(len / ds)), stepT = ds / mmPerTex;
            const R = Math.ceil(2.6 * sig + stepT * 0.5);
            for (let s = 0; s < steps; s++) {
                th += gauss(r) * 0.8 * Math.sqrt(ds);
                const dx = Math.cos(th) * stepT, dy = Math.sin(th) * stepT;
                const vis = Math.min(Math.max(0.35 + 0.9 * Math.sin((6.283 * s * ds) / dip + ph), 0), 1);
                if (vis > 0.01) {
                    const cx = x + 0.5 * dx, cy = y + 0.5 * dy;
                    const ix0 = Math.floor(cx - R), iy0 = Math.floor(cy - R);
                    for (let j = 0; j <= 2 * R; j++) {
                        const ty = iy0 + j, py = ty + 0.5, wy = ((ty % n) + n) % n;
                        for (let i = 0; i <= 2 * R; i++) {
                            const tx = ix0 + i, px = tx + 0.5;
                            const ax = px - x, ay = py - y, L2 = dx * dx + dy * dy;
                            const t = Math.min(Math.max((ax * dx + ay * dy) / L2, 0), 1);
                            const ex = ax - t * dx, ey = ay - t * dy, d2 = ex * ex + ey * ey;
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
        const nSp = [6, 6, 3, 8, 4, 70][st] ?? 6;
        for (let k = 0; k < nSp; k++) {
            const cx = r() * n, cy = r() * n, rad = (0.01 + 0.025 * r()) / mmPerTex, a = -(0.2 + 0.4 * r()) * (kraft ? 0.7 : 1);
            const R = Math.ceil(rad * 2.2);
            for (let j = -R; j <= R; j++) {
                for (let i = -R; i <= R; i++) {
                    const d = Math.hypot(i + 0.5 - (cx % 1), j + 0.5 - (cy % 1)) /
                        rad;
                    if (d > 2.2) {
                        continue;
                    }
                    const id = ((((Math.floor(cy) + j) % n) + n) % n) * n +
                        ((((Math.floor(cx) + i) % n) + n) % n);
                    const g = Math.exp(-0.5 * d * d * 2.2);
                    alb[id] += a * g;
                    h[id] += 0.4 * g;
                }
            }
        }
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
        let am = 0, aq = 0;
        for (let i = 0; i < n * n; i++) {
            am += alb[i];
        }
        am /= n * n;
        let cur = new Float32Array(8 * n * n);
        let s2 = 0;
        for (let y = 0; y < n; y++) {
            const ym = ((y + n - 1) % n) * n, y0 = y * n, yp = ((y + 1) % n) * n;
            for (let x = 0; x < n; x++) {
                const xm = (x + n - 1) % n, xp = (x + 1) % n;
                const gx = (h[y0 + xp] - h[y0 + xm]) / (2 * rms), gy = (h[yp + x] - h[ym + x]) / (2 * rms);
                const hv = h[y0 + x] / rms, a = alb[y0 + x] - am;
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
        const levels = [];
        let w = n;
        for (;;) {
            const mom = new Uint16Array(4 * w * w), aux = new Uint16Array(4 * w * w);
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
            const w2 = w >> 1, next = new Float32Array(8 * w2 * w2);
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
}`})))()}function h(e,t=[],n=new Set){if(typeof e!=`object`||!e||n.has(e))return t;if(n.add(e),ArrayBuffer.isView(e))return e.buffer instanceof ArrayBuffer&&!t.includes(e.buffer)&&t.push(e.buffer),t;if(e instanceof ArrayBuffer)return t.includes(e)||t.push(e),t;for(let r of Array.isArray(e)?e:Object.values(e))h(r,t,n);return t}var g,_;function v(){return(v=e((()=>{g=class{factory;worker=null;url=``;failed=!1;disposed=!1;local=null;id=0;jobs=new Map;source;constructor(e,t){this.factory=e,this.source=t??e.toString()}async run(e,t,n=[]){if(this.disposed)throw Error(`kernel worker disposed`);let r=this.ensure();if(r)try{return await new Promise((i,a)=>{let o=++this.id;this.jobs.set(o,{resolve:i,reject:a});try{r.postMessage({id:o,fn:e,arg:t},n)}catch(e){this.jobs.delete(o),a(new _(String(e))),this.fail()}})}catch(e){if(!(e instanceof _)||this.disposed)throw e}this.local??=this.factory();let i=this.local[e];if(typeof i!=`function`)throw Error(`kernel has no function ${e}`);return i(t)}dispose(){this.disposed=!0,this.fail(),this.failed=!0}fail(){this.worker?.terminate(),this.worker=null,this.url&&URL.revokeObjectURL(this.url),this.url=``;for(let e of this.jobs.values())e.reject(new _(`worker unavailable`));this.jobs.clear()}ensure(){if(this.failed)return null;if(this.worker)return this.worker;try{if(typeof Worker>`u`||typeof Blob>`u`)throw Error(`no workers`);let e=`"use strict";
const K = (${this.source})();
function tr(v, out, seen) {
  if (v === null || typeof v !== "object" || seen.has(v)) return out;
  seen.add(v);
  if (ArrayBuffer.isView(v)) { if (out.indexOf(v.buffer) < 0) out.push(v.buffer); return out; }
  if (v instanceof ArrayBuffer) { if (out.indexOf(v) < 0) out.push(v); return out; }
  for (const x of (Array.isArray(v) ? v : Object.values(v))) tr(x, out, seen);
  return out;
}
self.onmessage = (e) => {
  const d = e.data;
  try {
    const r = K[d.fn](d.arg);
    self.postMessage({ id: d.id, r }, tr(r, [], new Set()));
  } catch (err) {
    self.postMessage({ id: d.id, error: String((err && err.stack) || err) });
  }
};`;this.url=URL.createObjectURL(new Blob([e],{type:`text/javascript`}));let t=new Worker(this.url);t.onmessage=e=>{let t=e.data,n=this.jobs.get(t.id);n&&(this.jobs.delete(t.id),t.error===void 0?n.resolve(t.r):n.reject(Error(t.error)))},t.onerror=e=>{e.preventDefault(),this.failed=!0,this.fail()},this.worker=t}catch{this.failed=!0,this.worker=null}return this.worker}},_=class extends Error{}})))()}function y(){let e=0x56bc75e2d63100000,t=new Float32Array(1),n=new Uint32Array(t.buffer);function r(e){let t=e>>>16&32768,n=e>>>23&255,r=e&8388607;if(n===255)return t|31744|(r===0?0:512);let i=n-112;if(i>=31)return t|31743;if(i<=0){if(i<-10)return t;let e=14-i;return t|(r|8388608)+(1<<e-1)>>e}return t|Math.min((i<<10)+(r+4096>>13),31743)}function i(e){return t[0]=e,r(n[0])}function a(t,n,r,i,a){let o=0;r[0]=0,i[0]=-0x56bc75e2d63100000,i[1]=e;for(let n=1;n<a;n++){let a=(t[n]+n*n-(t[r[o]]+r[o]*r[o]))/(2*n-2*r[o]);for(;a<=i[o];)o--,a=(t[n]+n*n-(t[r[o]]+r[o]*r[o]))/(2*n-2*r[o]);o++,r[o]=n,i[o]=a,i[o+1]=e}o=0;for(let e=0;e<a;e++){for(;i[o+1]<e;)o++;let a=e-r[o];n[e]=a*a+t[r[o]]}}function o(e,t,n){let r=Math.max(t,n),i=new Float64Array(r),o=new Float64Array(r),s=new Int32Array(r),c=new Float64Array(r+1);for(let r=0;r<t;r++){for(let a=0;a<n;a++)i[a]=e[a*t+r];a(i,o,s,c,n);for(let i=0;i<n;i++)e[i*t+r]=o[i]}for(let r=0;r<n;r++){let n=r*t;for(let r=0;r<t;r++)i[r]=e[n+r];a(i,o,s,c,t);for(let r=0;r<t;r++)e[n+r]=o[r]}}function s(t,n,r){let i=n*r,a=new Float32Array(i),s=new Float32Array(i),c=new Float32Array(i),l=0;for(let n=0;n<i;n++){let r=t[n]>=.5;r&&l++,a[n]=r?0:e,s[n]=r?e:0}if(l===0||l===i)throw Error(l===0?`the image has no visible (opaque) pixels`:`the image is opaque everywhere`);o(a,n,r),o(s,n,r);for(let e=0;e<i;e++){let n=t[e],r=n>=.5?Math.sqrt(s[e])-.5:.5-Math.sqrt(a[e]);n>0&&n<1&&Math.abs(r)<=.500001&&(r=n-.5),c[e]=r}return c}function c(e,t,n){let r=new Float32Array(Math.max(t,n));for(let i=0;i<n;i++){let n=i*t;for(let i=0;i<t;i++)r[i]=.25*(e[n+Math.max(i-1,0)]+2*e[n+i]+e[n+Math.min(i+1,t-1)]);for(let i=0;i<t;i++)e[n+i]=r[i]}for(let i=0;i<t;i++){for(let a=0;a<n;a++)r[a]=.25*(e[Math.max(a-1,0)*t+i]+2*e[a*t+i]+e[Math.min(a+1,n-1)*t+i]);for(let a=0;a<n;a++)e[a*t+i]=r[a]}}function l(e,t,n,r){let i=Math.max(1,Math.ceil(Math.max(t,n)/256)),a=Math.ceil(t/i),o=Math.ceil(n/i),s=new Float32Array(a*o),c=new Float32Array(a*o);for(let r=0;r<n;r++){let n=Math.floor(r/i);for(let o=0;o<t;o++){let l=n*a+Math.floor(o/i);s[l]+=e[r*t+o],c[l]++}}for(let e=0;e<s.length;e++)s[e]/=Math.max(c[e],1);let l=[{c:s,w:a,h:o,hu:i/r}];for(;Math.max(l[l.length-1].w,l[l.length-1].h)>32;){let e=l[l.length-1],t=Math.ceil(e.w/2),n=Math.ceil(e.h/2),r=new Float32Array(t*n),i=new Float32Array(t*n);for(let n=0;n<e.h;n++)for(let a=0;a<e.w;a++){let o=(n>>1)*t+(a>>1);r[o]+=e.c[n*e.w+a],i[o]++}for(let e=0;e<r.length;e++)r[e]/=Math.max(i[e],1);l.push({c:r,w:t,h:n,hu:e.hu*2})}let u=new Float32Array(l[l.length-1].w*l[l.length-1].h);for(let e=l.length-1;e>=0;e--){let t=l[e],n=t.w,r=t.h,i=t.hu*t.hu;if(e<l.length-1){let t=l[e+1],i=u,a=new Float32Array(n*r);for(let e=0;e<r;e++)for(let r=0;r<n;r++){let o=Math.min(Math.max((r+.5)/2-.5,0),t.w-1),s=Math.min(Math.max((e+.5)/2-.5,0),t.h-1),c=Math.floor(o),l=Math.floor(s),u=Math.min(c+1,t.w-1),d=Math.min(l+1,t.h-1),f=o-c,p=s-l;a[e*n+r]=(1-p)*((1-f)*i[l*t.w+c]+f*i[l*t.w+u])+p*((1-f)*i[d*t.w+c]+f*i[d*t.w+u])}u=a}let a=e===l.length-1?400:60;for(let e=0;e<a;e++)for(let e=0;e<r;e++)for(let a=0;a<n;a++){let o=e*n+a;if(t.c[o]<.5){u[o]=0;continue}let s=(a>0?u[o-1]:0)+(a<n-1?u[o+1]:0)+(e>0?u[o-n]:0)+(e<r-1?u[o+n]:0);u[o]+=1.85*((s+i)/4-u[o])}}return{u,gw:a,gh:o,cell:i}}function u(e){let{cov:t,aw:n,ah:i,box:a,f:o}=e,u=s(t,n,i);c(u,n,i);let d=Math.floor(n/o),f=Math.floor(i/o),p=new Float32Array(d*f),m=1/(o*o*o);for(let e=0;e<f;e++)for(let t=0;t<d;t++){let r=0;for(let i=0;i<o;i++)for(let a=0;a<o;a++)r+=u[(e*o+i)*n+t*o+a];p[e*d+t]=r*m}let h=(a[2]-a[0])/o,g=(a[3]-a[1])/o,_=0,v=0;for(let e=Math.max(0,Math.floor(a[1]));e<Math.min(i,Math.ceil(a[3]));e++)for(let r=Math.max(0,Math.floor(a[0]));r<Math.min(n,Math.ceil(a[2]));r++)_+=t[e*n+r],v++;let y=l(t,n,i,a[2]-a[0]),b=(e,t)=>{let n=Math.min(Math.max(e/y.cell-.5,0),y.gw-1),r=Math.min(Math.max(t/y.cell-.5,0),y.gh-1),i=Math.floor(n),a=Math.floor(r),o=Math.min(i+1,y.gw-1),s=Math.min(a+1,y.gh-1),c=n-i,l=r-a,u=y.u;return(1-l)*((1-c)*u[a*y.gw+i]+c*u[a*y.gw+o])+l*((1-c)*u[s*y.gw+i]+c*u[s*y.gw+o])},x=new Float32Array(4*d*f),S=0;for(let e=0;e<f;e++){let t=f-1-e;for(let n=0;n<d;n++){let r=e*d+n,i=Math.max(n-1,0),a=Math.min(n+1,d-1),s=Math.max(e-1,0),c=Math.min(e+1,f-1),l=(p[e*d+a]-p[e*d+i])/Math.max(a-i,1),u=(p[s*d+n]-p[c*d+n])/Math.max(c-s,1),m=p[r]>-1?b((n+.5)*o,(e+.5)*o):0;S=Math.max(S,m);let g=4*(t*d+n);x[g]=p[r]/h,x[g+1]=l,x[g+2]=u,x[g+3]=m}}let C=[],w=d,T=f;for(;;){let e=new Uint16Array(4*w*T),t=new Uint32Array(x.buffer,x.byteOffset,4*w*T);for(let n=0;n<4*w*T;n++)e[n]=r(t[n]);if(C.push({w,h:T,data:e}),w===1&&T===1)break;let n=Math.max(1,w>>1),i=Math.max(1,T>>1),a=w>1?2:1,o=T>1?2:1,s=1/(a*o),c=new Float32Array(4*n*i);for(let e=0;e<i;e++)for(let t=0;t<n;t++){let r=4*(e*n+t);for(let n=0;n<o;n++)for(let i=0;i<a;i++){let s=4*(Math.min(e*o+n,T-1)*w+Math.min(t*a+i,w-1));c[r]+=x[s],c[r+1]+=x[s+1],c[r+2]+=x[s+2],c[r+3]+=x[s+3]}c[r]*=s,c[r+1]*=s,c[r+2]*=s,c[r+3]*=s}x=c,w=n,T=i}return{w:d,h:f,levels:C,logoW:h,logoH:g,areaFrac:v?_/v:0,uMax:S}}return{build:u,signedDistance:s,membrane:l,half:i}}function b(e){let t=Math.min(Math.max(Number.isFinite(e)&&e>0?e:1,1/16),16),n=t<=1?800:800/t,r=t<=1?800*t:800,i=e=>Math.ceil(e/16)*16,a=i(n+224),o=i(r+224),s=(a-n)/2,c=(o-r)/2;return{W:a,H:o,logoW:n,logoH:r,aw:2*a,ah:2*o,box:[2*s,2*c,2*(s+n),2*(c+r)]}}function x(e){let t=e=>{if(!e)return NaN;let t=/^\s*([0-9.]+(?:e[+-]?\d+)?)\s*(px)?\s*$/i.exec(e);return t?Number(t[1]):NaN},n=(e.viewBox??``).trim().split(/[\s,]+/).map(Number),r=n.length===4&&n.every(Number.isFinite)&&n[2]>0&&n[3]>0,i=t(e.width),a=t(e.height);return i>0&&a>0?{w:i,h:a}:r?i>0?{w:i,h:i*n[3]/n[2]}:a>0?{w:a*n[2]/n[3],h:a}:{w:n[2],h:n[3]}:null}async function S(e){let t=new Image;return t.decoding=`async`,t.src=e,await t.decode(),t}async function C(e){let t=await fetch(e);if(!t.ok)throw Error(`HTTP ${t.status}`);let n=await t.blob(),r=await n.slice(0,512).text().catch(()=>``);if(/svg/i.test(n.type)||/\.svg(?:[?#]|$)/i.test(e)||/<svg[\s>]/i.test(r)){let e=await n.text(),t=new DOMParser().parseFromString(e,`image/svg+xml`).documentElement;if(t?.nodeName.toLowerCase()!==`svg`)throw Error(`not an SVG document`);let r=x({viewBox:t.getAttribute(`viewBox`),width:t.getAttribute(`width`),height:t.getAttribute(`height`)})??{w:300,h:150},i=(t.getAttribute(`viewBox`)??``).trim().split(/[\s,]+/).map(Number),a=i.length===4&&i.every(Number.isFinite)&&i[2]>0&&i[3]>0?i:[0,0,r.w,r.h];t.setAttribute(`preserveAspectRatio`,`none`);let o=new XMLSerializer,s=[];return{w:r.w,h:r.h,async draw(e,n,i){let c=a[2]/r.w,l=a[3]/r.h;t.setAttribute(`viewBox`,`${a[0]+n[0]*c} ${a[1]+n[1]*l} ${n[2]*c} ${n[3]*l}`),t.setAttribute(`width`,String(Math.max(1,Math.round(i[2])))),t.setAttribute(`height`,String(Math.max(1,Math.round(i[3]))));let u=URL.createObjectURL(new Blob([o.serializeToString(t)],{type:`image/svg+xml`}));s.push(u);let d=await S(u);e.drawImage(d,i[0],i[1],i[2],i[3])},close(){for(let e of s)URL.revokeObjectURL(e)}}}let i;try{i=await createImageBitmap(n,{premultiplyAlpha:`none`,colorSpaceConversion:`none`})}catch{i=await S(URL.createObjectURL(n))}let a=i instanceof HTMLImageElement?i.naturalWidth:i.width,o=i instanceof HTMLImageElement?i.naturalHeight:i.height;if(!(a>0&&o>0))throw Error(`the image has no size`);return{w:a,h:o,async draw(e,t,n){e.drawImage(i,t[0],t[1],t[2],t[3],n[0],n[1],n[2],n[3])},close(){i instanceof HTMLImageElement||i.close()}}}function w(e,t){let n=document.createElement(`canvas`);n.width=e,n.height=t;let r=n.getContext(`2d`,{willReadFrequently:!0});if(!r)throw Error(`no 2D canvas`);return r.imageSmoothingEnabled=!0,r.imageSmoothingQuality=`high`,r}function T(e,t,n,r,i){let a=t*n,o=new Float32Array(a);if(!r||i===null){for(let t=0;t<a;t++)o[t]=e[4*t+3]/255;return o}let s=0,c=new Float32Array(a);for(let t=0;t<a;t++)c[t]=(.2126*e[4*t]+.7152*e[4*t+1]+.0722*e[4*t+2])/255,s=Math.max(s,Math.abs(c[t]-i));if(s<.05)return o;for(let e=0;e<a;e++)o[e]=Math.min(Math.max((Math.abs(c[e]-i)-.15*s)/(.5*s),0),1);return o}function E(e,t,n){let r=255,i=0,a=0;for(let i=0;i<t*n;i++)r=Math.min(r,e[4*i+3]);let o=(n,r)=>{let o=4*(r*t+n);i+=(.2126*e[o]+.7152*e[o+1]+.0722*e[o+2])/255,a++};for(let e=0;e<t;e++)o(e,0),o(e,n-1);for(let e=0;e<n;e++)o(0,e),o(t-1,e);return{opaque:r>245,bg:a?i/a:1}}function D(e,t,n,r,i){let a;if(i.read===`luma`){a=new Float32Array(t*n);for(let r=0;r<t*n;r++){let t=e[4*r+3]/255;a[r]=t*((.2126*e[4*r]+.7152*e[4*r+1]+.0722*e[4*r+2])/255)}}else a=T(e,t,n,r.opaque,r.bg);let o=Math.min(Math.max(i.threshold,.01),.99);if(o!==.5)for(let e=0;e<a.length;e++){let t=a[e];a[e]=t<o?.5*t/o:.5+.5*(t-o)/(1-o)}return a}async function O(e,t=j){return A(await C(e),t)}async function k(e,t=j){e instanceof HTMLImageElement&&!e.complete&&await e.decode();let n=e instanceof HTMLImageElement?e.naturalWidth:e.width,r=e instanceof HTMLImageElement?e.naturalHeight:e.height;if(!(n>0&&r>0))throw Error(`the image has no size`);return A({w:n,h:r,async draw(t,n,r){t.drawImage(e,n[0],n[1],n[2],n[3],r[0],r[1],r[2],r[3])},close(){}},t)}async function A(e,t){try{let n=1024/Math.max(e.w,e.h),r=Math.max(1,Math.round(e.w*n)),i=Math.max(1,Math.round(e.h*n)),a=w(r,i);await e.draw(a,[0,0,e.w,e.h],[0,0,r,i]);let o=a.getImageData(0,0,r,i).data,s=E(o,r,i),c=D(o,r,i,s,t),l=r,u=i,d=-1,f=-1;for(let e=0;e<i;e++)for(let t=0;t<r;t++)c[e*r+t]>.04&&(l=Math.min(l,t),u=Math.min(u,e),d=Math.max(d,t),f=Math.max(f,e));if(d<l||f<u)throw Error(`the image has no visible (opaque) pixels`);let p=t.frame===`full`,m=p?0:(l-1)/n,h=p?0:(u-1)/n,g=p?e.w:(d+3-l)/n,_=p?e.h:(f+3-u)/n,v=_/g,y=b(v),x=w(y.aw,y.ah);await e.draw(x,[m,h,g,_],[y.box[0],y.box[1],y.box[2]-y.box[0],y.box[3]-y.box[1]]);let S=x.getImageData(0,0,y.aw,y.ah).data;return{raster:{cov:D(S,y.aw,y.ah,s,t),aw:y.aw,ah:y.ah,box:y.box,f:2},layout:y,aspect:v}}finally{e.close()}}var j;function M(){return(M=e((()=>{j={frame:`ink`,read:`auto`,threshold:.5}})))()}function N(){let e=new Float32Array(1),t=new Uint32Array(e.buffer);function n(e){let t=e>>>16&32768,n=e>>>23&255,r=e&8388607;if(n===255)return t|31744|(r===0?0:512);let i=n-112;if(i>=31)return t|31743;if(i<=0){if(i<-10)return t;let e=14-i;return t|(r|8388608)+(1<<e-1)>>e}return t|Math.min((i<<10)+(r+4096>>13),31743)}function r(r){return e[0]=r,n(t[0])}function i(e){let t=e>>>0||1;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function a(e){let t=Math.max(e(),1e-9),n=e();return Math.sqrt(-2*Math.log(t))*Math.cos(2*Math.PI*n)}function o(e,t,n,r,i,a){let o=new Float32Array(n*r);for(let e=0;e<o.length;e++)o[e]=2*a()-1;let s=e=>e*e*e*(e*(e*6-15)+10),c=new Int32Array(t),l=new Int32Array(t),u=new Float32Array(t);for(let e=0;e<t;e++){let r=(e+.5)*n/t,i=Math.floor(r);c[e]=i%n,l[e]=(i+1)%n,u[e]=s(r-i)}for(let a=0;a<t;a++){let d=(a+.5)*r/t,f=Math.floor(d),p=s(d-f),m=f%r*n,h=(f+1)%r*n,g=a*t;for(let n=0;n<t;n++){let t=u[n],r=o[m+c[n]],a=o[h+c[n]],s=r+(o[m+l[n]]-r)*t,d=s+(a+(o[h+l[n]]-a)*t-s)*p;e[g+n]+=i*d}}}function s(e){let t=e.n,r=e.tileMm/t,s=e.stock|0,c=i(e.seed*7919+s*104729+17),l=new Float32Array(t*t),u=new Float32Array(t*t),d=[[.35,.5,.8,.8,.55],[.6,.7,.9,.9,.7],[.25,.3,.45,.45,.3],[.35,.5,.8,.85,.7],[.3,.45,.7,.75,.6],[.6,.7,.9,1,.8]],f=[64,32,16,8,4],p=d[Math.min(Math.max(s,0),5)];for(let e=0;e<f.length;e++){let n=Math.max(1,Math.round(t/f[e]));o(l,t,n,n,f[e]/16*p[e],c)}let m=s===1?1.5:s===0?.45:s===3?.3:0;if(m>0){let n=t>>1,i=r*2,a=new Float32Array(n*n),o=Math.round(900*(e.tileMm/10.24)**2);for(let e=0;e<o;e++){let e=c()*n,t=c()*n,r=(.15+.3*c())/i,o=r*(.35+.3*c()),s=Math.PI/2+(c()-.5)*.9,l=Math.cos(s),u=Math.sin(s),d=c()<.75?-1:.6,f=Math.ceil(2.2*r);for(let i=-f;i<=f;i++)for(let s=-f;s<=f;s++){let c=Math.floor(e)+s+.5-e,f=Math.floor(t)+i+.5-t,p=(c*l+f*u)/r,m=(-c*u+f*l)/o,h=p*p+m*m;h>4.8||(a[((Math.floor(t)+i)%n+n)%n*n+((Math.floor(e)+s)%n+n)%n]+=d*Math.exp(-.5*h*1.6))}}let s=0;for(let e=0;e<n*n;e++)s+=a[e]*a[e];let u=m/(Math.sqrt(s/(n*n))||1);for(let e=0;e<t;e++){let r=(e+.5)/2-.5,i=Math.floor(r),o=r-i,s=(i%n+n)%n,c=(s+1)%n;for(let r=0;r<t;r++){let i=(r+.5)/2-.5,d=Math.floor(i),f=i-d,p=(d%n+n)%n,m=(p+1)%n,h=a[s*n+p]+(a[s*n+m]-a[s*n+p])*f,g=a[c*n+p]+(a[c*n+m]-a[c*n+p])*f;l[e*t+r]+=u*(h+(g-h)*o)}}}{let n=t>>1,i=r*2,o=new Float32Array(n*n),u=[1,.8,.55,.9,.7,1.2][s]??1,d=Math.round(1100*(e.tileMm/10.24)**2);for(let t=0;t<d;t++){let t=(1+2.5*c())*Math.sqrt(Math.min(Math.max(e.fibreScale,.5),2)),r=(.02+.04*c())/i,s=(c()<.5?1:-.6)*(.5+c()),l=c()*n,u=c()*n,d=c()*Math.PI*2,f=Math.min(.08,.7*r*i),p=Math.ceil(t/f),m=f/i,h=Math.ceil(2.4*r+m*.5);for(let e=0;e<p;e++){d+=a(c)*.5*Math.sqrt(f);let t=Math.cos(d)*m,i=Math.sin(d)*m,g=Math.sin(Math.PI*(e+.5)/p),_=l+.5*t,v=u+.5*i,y=Math.floor(_-h),b=Math.floor(v-h);for(let e=0;e<=2*h;e++){let a=b+e,c=a+.5,d=(a%n+n)%n;for(let e=0;e<=2*h;e++){let a=y+e,f=a+.5-l,p=c-u,h=t*t+i*i,_=Math.min(Math.max((f*t+p*i)/h,0),1),v=f-_*t,b=p-_*i,x=v*v+b*b;x>5.8*r*r||(o[d*n+(a%n+n)%n]+=s*g*Math.exp(-.5*x/(r*r))*(m/(2.5*r)))}}l+=t,u+=i}}let f=0;for(let e=0;e<n*n;e++)f+=o[e]*o[e];let p=u/(Math.sqrt(f/(n*n))||1);for(let e=0;e<t;e++){let r=(e+.5)/2-.5,i=Math.floor(r),a=r-i,s=(i%n+n)%n,c=(s+1)%n;for(let r=0;r<t;r++){let i=(r+.5)/2-.5,u=Math.floor(i),d=i-u,f=(u%n+n)%n,m=(f+1)%n,h=o[s*n+f]+(o[s*n+m]-o[s*n+f])*d,g=o[c*n+f]+(o[c*n+m]-o[c*n+f])*d;l[e*t+r]+=p*(h+(g-h)*a)}}}let h=0,g=0;for(let e=0;e<t*t;e++)h+=l[e];h/=t*t;for(let e=0;e<t*t;e++)l[e]-=h,g+=l[e]*l[e];let _=Math.sqrt(g/(t*t))||1;for(let e=0;e<t*t;e++)l[e]/=_;let v=[1.3,1.3,.9,1.6,1.2,2.4][s]??1.3,y=[22,22,18,24,20,32][s]??22,b=[1500,1300,900,1300,1e3,1700][s]??1300,x=Math.min(Math.max(e.fibreScale,.25),4),S=Math.round(b*Math.min(Math.max(e.fibreAmount,0),1)*(e.tileMm/10.24)**2/x),C=new Float32Array(t*t),w=new Float32Array(t*t),T=new Float32Array(t*t),E=s===5;for(let e=0;e<S;e++){let e=v*x*Math.exp(.45*a(c)-.1),n=y*Math.sqrt(x)*(.7+.6*c())/1e3,i=Math.max(n/2.4/r,.55),o=.75*(.6+.8*c())*Math.min(1,n/.02),s=E?c()<.55?-(.06+.16*c()):.05+.08*c():c()<.7?.03+.06*c():-(.01+.03*c()),l=.4+.8*c(),u=c()*6.283,d=c()*t,f=c()*t,p=c()*Math.PI*2,m=.04,h=Math.max(2,Math.ceil(e/m)),g=m/r,_=Math.ceil(2.6*i+g*.5);for(let e=0;e<h;e++){p+=a(c)*.8*Math.sqrt(m);let n=Math.cos(p)*g,r=Math.sin(p)*g,h=Math.min(Math.max(.35+.9*Math.sin(6.283*e*m/l+u),0),1);if(h>.01){let e=d+.5*n,a=f+.5*r,c=Math.floor(e-_),l=Math.floor(a-_);for(let e=0;e<=2*_;e++){let a=l+e,u=a+.5,p=(a%t+t)%t;for(let e=0;e<=2*_;e++){let a=c+e,l=a+.5-d,m=u-f,g=n*n+r*r,_=Math.min(Math.max((l*n+m*r)/g,0),1),v=l-_*n,y=m-_*r,b=v*v+y*y;if(b>6.8*i*i)continue;let x=Math.exp(-.5*b/(i*i))*h,S=p*t+(a%t+t)%t,E=o*x;E>C[S]&&(C[S]=E),x>T[S]&&(w[S]=w[S]+(s-w[S])*x,T[S]=x)}}}d+=n,f+=r}}for(let e=0;e<t*t;e++)l[e]+=C[e],u[e]+=w[e];let D=[6,6,3,8,4,70][s]??6;for(let e=0;e<D;e++){let e=c()*t,n=c()*t,i=(.01+.025*c())/r,a=-(.2+.4*c())*(E?.7:1),o=Math.ceil(i*2.2);for(let r=-o;r<=o;r++)for(let s=-o;s<=o;s++){let o=Math.hypot(s+.5-e%1,r+.5-n%1)/i;if(o>2.2)continue;let c=((Math.floor(n)+r)%t+t)%t*t+((Math.floor(e)+s)%t+t)%t,d=Math.exp(-.5*o*o*2.2);u[c]+=a*d,l[c]+=.4*d}}h=0,g=0;for(let e=0;e<t*t;e++)h+=l[e];h/=t*t;for(let e=0;e<t*t;e++)l[e]-=h,g+=l[e]*l[e];let O=Math.sqrt(g/(t*t))||1,k=0,A=0;for(let e=0;e<t*t;e++)k+=u[e];k/=t*t;let j=new Float32Array(8*t*t),M=0;for(let e=0;e<t;e++){let n=(e+t-1)%t*t,r=e*t,i=(e+1)%t*t;for(let e=0;e<t;e++){let a=(e+t-1)%t,o=(l[r+(e+1)%t]-l[r+a])/(2*O),s=(l[i+e]-l[n+e])/(2*O),c=l[r+e]/O,d=u[r+e]-k;A+=d*d,M+=o*o+s*s;let f=8*(r+e);j[f]=o,j[f+1]=s,j[f+2]=o*o,j[f+3]=s*s,j[f+4]=o*s,j[f+5]=d,j[f+6]=c,j[f+7]=c*c}}let N=[],P=t;for(;;){let e=new Uint16Array(4*P*P),t=new Uint16Array(4*P*P),r=new Uint32Array(j.buffer,j.byteOffset,8*P*P);for(let i=0;i<P*P;i++)for(let a=0;a<4;a++)e[4*i+a]=n(r[8*i+a]),t[4*i+a]=n(r[8*i+4+a]);if(N.push({w:P,h:P,mom:e,aux:t}),P===1)break;let i=P>>1,a=new Float32Array(8*i*i);for(let e=0;e<i;e++)for(let t=0;t<i;t++){let n=8*(e*i+t);for(let r=0;r<2;r++)for(let i=0;i<2;i++){let o=8*((2*e+r)*P+2*t+i);for(let e=0;e<8;e++)a[n+e]+=j[o+e]}for(let e=0;e<8;e++)a[n+e]*=.25}j=a,P=i}return{levels:N,rmsSlope:Math.sqrt(M/(t*t)),albedoStd:Math.sqrt(A/(t*t)),fibres:S}}return{build:s,half:r}}var P,F;function I(){return(I=e((()=>{P=1024,F=10.24})))()}function L(e,t,n){let r=4*t,i=new Uint8ClampedArray(r*n*4).fill(255);for(let a=0;a<n;a++){let o=(n-1-a)*r*4;for(let n=0;n<4*t;n++)l(s(e[a*4*t+n]),i,o+4*n)}return{w:t,h:n,bytes:i}}var R;function z(){return(z=e((()=>{m(),v(),M(),I(),o(),R=class{logoWorker=new g(y,f);paperWorker=new g(N,p);logoWanted=null;logoOptsKey=``;paperWanted=``;logoToken=0;paperToken=0;logo=null;logoVersion=0;paper=null;paperVersion=0;get errors(){return[this.logoError,this.paperError].filter(e=>e!==null)}get busy(){return this.logoBusy||this.paperBusy}logoError=null;paperError=null;logoBusy=!1;paperBusy=!1;setLogo(e,t=j){let n=e??``,r=JSON.stringify(t);if(n===this.logoWanted&&r===this.logoOptsKey)return;this.logoWanted=n,this.logoOptsKey=r;let i=++this.logoToken;this.logoError=null,typeof n==`string`&&(n.trim()===``||n.trim().toLowerCase()===`none`)?(this.logoBusy=!1,this.install(null)):(this.logoBusy=!0,(async()=>{try{let{raster:e}=typeof n==`string`?await O(n.trim(),t):await k(n,t);if(i!==this.logoToken)return;let r=await this.logoWorker.run(`build`,e,h(e));if(i!==this.logoToken)return;let a=r.levels[0];this.install({image:L(a.data,a.w,a.h),map:[r.w/r.logoW,r.h/r.logoW,1/r.logoW,r.logoH/r.logoW]}),this.logoBusy=!1}catch(e){if(i!==this.logoToken)return;this.logoError=`HoloEffect: could not load the logo${typeof n==`string`?` ${n}`:``}: ${e instanceof Error?e.message:String(e)}. A cross-origin image needs CORS (and crossOrigin on an <img>).`,console.warn(this.logoError),this.logoBusy=!1,this.install(null)}})())}install(e){this.logo=e,this.logoVersion++}setPaper(e){let t=`${e.stock}|${e.fibreAmount}|${e.fibreScale}|${e.seed}`;if(t===this.paperWanted)return;this.paperWanted=t;let n=++this.paperToken;this.paperError=null,this.paperBusy=!0,(async()=>{try{let t=await this.paperWorker.run(`build`,{n:P,tileMm:F,...e});if(n!==this.paperToken)return;let r=t.levels[0];this.paper={mom:L(r.mom,r.w,r.h),aux:L(r.aux,r.w,r.h)},this.paperVersion++,this.paperBusy=!1}catch(e){n===this.paperToken&&(this.paperError=`HoloEffect: could not build the paper maps: ${e instanceof Error?e.message:String(e)}`,console.warn(this.paperError),this.paperBusy=!1)}})()}dispose(){this.logoToken++,this.paperToken++,this.logoWorker.dispose(),this.paperWorker.dispose()}}})))()}var B;function V(){return(V=e((()=>{B=`uniform sampler2D uLogoTex;
uniform int   uLogoOn;
uniform vec4  uLogoMap;
uniform vec4  uLogoXf;
uniform float uLogoW;
uniform vec4  uRelief;
uniform int   uRelProfile;
#ifndef EMB_POM_STEPS
#define EMB_POM_STEPS 12
#endif
#ifndef EMB_SHADOW_STEPS
#define EMB_SHADOW_STEPS 10
#endif
const float DOME_U0 = 0.28, DOME_WALL = 0.45, BEVEL_R = 0.2;
#ifdef EMB_STICKER
uniform int  uLogoShape;
uniform vec4 uShapeK;
uniform vec4 uShapeT;
uniform float uFilmGrow;
#define EMB_OFF (uLogoShape == 0 && uLogoOn == 0)
#else
#define EMB_OFF (uLogoOn == 0)
#endif
vec2 logoCentre() { return 0.5 * uCardSizeMm + uLogoXf.xy; }
vec2 logoLocal(vec2 p) {
  vec2 d = wrapDelta(p - logoCentre());
  return vec2(d.x * uLogoXf.z + d.y * uLogoXf.w, -d.x * uLogoXf.w + d.y * uLogoXf.z);
}
vec2 logoToCard(vec2 v) { return vec2(v.x * uLogoXf.z - v.y * uLogoXf.w, v.x * uLogoXf.w + v.y * uLogoXf.z); }
vec2 logoUvOf(vec2 q) { return q / (uLogoW * uLogoMap.xy) + 0.5; }
#ifdef EMB_STICKER
vec3 shapeSd(vec2 q) {
  vec2 hb = uShapeK.xy, sq2 = vec2(q.x < 0.0 ? -1.0 : 1.0, q.y < 0.0 ? -1.0 : 1.0), pa = abs(q);
  if (uLogoShape == 2) {
    if (abs(hb.x - hb.y) <= 1e-6 * max(hb.x, hb.y)) {
      float l = length(pa);
      return l > 1e-9 ? vec3(hb.x - l, -sq2 * pa / l) : vec3(hb.x, -1.0, 0.0);
    }
    float w = hb.x * (pa.x - hb.x) < hb.y * (pa.y - hb.y) ? 1.57079633 : 0.0;
    for (int i = 0; i < 5; ++i) {
      vec2 cs = vec2(cos(w), sin(w)), u = hb * cs, v = hb * vec2(-cs.y, cs.x), e = pa - u;
      w += dot(e, v) / (dot(e, u) + dot(v, v));
    }
    w = clamp(w, 0.0, 1.57079633);
    vec2 c = hb * vec2(cos(w), sin(w));
    float dist = length(pa - c);
    vec2 n = normalize(c / (hb * hb));
    return vec3(dot(pa / hb, pa / hb) < 1.0 ? dist : -dist, -sq2 * n);
  }
  float r = uShapeK.z;
  vec2 qq = pa - hb + r;
  if (qq.x > 0.0 && qq.y > 0.0) { float l = length(qq); return vec3(r - l, -sq2 * qq / l); }
  return qq.x > qq.y ? vec3(r - qq.x, -sq2.x, 0.0) : vec3(r - qq.y, 0.0, -sq2.y);
}
vec3 shapePillow(vec2 q) {
  if (uRelProfile != 2) return vec3(0.0);
  if (uLogoShape == 2) {
    vec2 h2 = uShapeK.xy * uShapeK.xy;
    float u = 1.0 - dot(q * q, 1.0 / h2);
    return u > 0.0 ? uShapeK.w * vec3(u, -2.0 * q / h2) : vec3(0.0);
  }
  float A = uShapeT.x, B = uShapeT.y;
  vec2 st = uShapeT.w > 0.5 ? q.yx : q;
  if (!(abs(st.x) < A && abs(st.y) < B) || shapeSd(q).x <= 0.0) return vec3(0.0);
  float u = 0.5 * (A * A - st.x * st.x), us = -st.x, ut = 0.0;
  float c = 16.0 * A * A / (PI * PI * PI), at = abs(st.y), sgt = st.y < 0.0 ? -1.0 : 1.0;
  for (int j = 0; j < 4; ++j) {
    float n = float(2 * j + 1), k = n * PI / (2.0 * A), cn = c * (j == 0 || j == 2 ? 1.0 : -1.0) / (n * n * n);
    float e = exp(k * (at - B)), eB = exp(-2.0 * k * B), et = exp(-2.0 * k * at);
    float ch = e * (1.0 + et) / (1.0 + eB), sh = sgt * e * (1.0 - et) / (1.0 + eB);
    float cs = cos(k * st.x), sn = sin(k * st.x);
    u -= cn * ch * cs; us += cn * ch * k * sn; ut -= cn * sh * k * cs;
  }
  vec3 r = uShapeK.w * uShapeT.z * vec3(max(u, 0.0), us, ut);
  return uShapeT.w > 0.5 ? r.xzy : r;
}
#endif
float logoLod(Footprint F) {
  float texelMm = max(uLogoMap.z * uLogoW, 1e-6);
  return max(log2(max(2.50662827 * F.sMaj, 1e-6) / texelMm), 0.0);
}
vec2 logoFetch(vec2 p, float lod) {
  if (EMB_OFF) return vec2(-1e3, 0.0);
#ifdef EMB_STICKER
  if (uLogoShape > 0) { vec2 q = logoLocal(p); return vec2(shapeSd(q).x + uFilmGrow, shapePillow(q).x); }
#endif
  vec2 uv = logoUvOf(logoLocal(p)), uc = clamp(uv, 0.0, 1.0);
  vec4 t = textureLod(uLogoTex, uc, lod);
  float ex = length((uv - uc) * uLogoMap.xy);
#ifdef EMB_STICKER
  return vec2((t.r - ex) * uLogoW + uFilmGrow, ex > 0.0 ? 0.0 : t.a * uLogoW * uLogoW);
#else
  return vec2((t.r - ex) * uLogoW, ex > 0.0 ? 0.0 : t.a * uLogoW * uLogoW);
#endif
}
float logoDist(vec2 p, float lod) { return logoFetch(p, lod).x; }
struct LogoS {
  float d;
  vec2  g;
  float u;
  vec2  gu;
};
LogoS logoSample(vec2 p, Footprint F, bool wantGu) {
  LogoS s;
  s.d = -1e3; s.g = vec2(1.0, 0.0); s.u = 0.0; s.gu = vec2(0.0);
  if (EMB_OFF) return s;
#ifdef EMB_STICKER
  if (uLogoShape > 0) {
    vec2 q = logoLocal(p);
    vec3 sg = shapeSd(q), pu = shapePillow(q);
    s.d = sg.x + uFilmGrow; s.g = logoToCard(sg.yz); s.u = pu.x;
    if (wantGu) s.gu = logoToCard(pu.yz);
    return s;
  }
#endif
  vec2 q = logoLocal(p), uv = logoUvOf(q), uc = clamp(uv, 0.0, 1.0);
  vec2 sc = 1.0 / (uLogoW * uLogoMap.xy);
  vec2 eMaj = (2.50662827 * F.sMaj) * F.eMaj, eMin = (2.50662827 * F.sMin) * vec2(-F.eMaj.y, F.eMaj.x);
  vec2 gx = sc * vec2(eMaj.x * uLogoXf.z + eMaj.y * uLogoXf.w, -eMaj.x * uLogoXf.w + eMaj.y * uLogoXf.z);
  vec2 gy = sc * vec2(eMin.x * uLogoXf.z + eMin.y * uLogoXf.w, -eMin.x * uLogoXf.w + eMin.y * uLogoXf.z);
  vec4 t = textureGrad(uLogoTex, uc, gx, gy);
  vec2 ex = (uv - uc) * uLogoMap.xy;
  float exl = length(ex);
  vec2 gl = t.gb;
  if (exl > 0.0) gl = normalize(mix(gl, -ex / exl, clamp(exl * 40.0, 0.0, 1.0)));
  float glen = length(gl);
  if (glen > 1.0) gl /= glen;
#ifdef EMB_STICKER
  s.d = (t.r - exl) * uLogoW + uFilmGrow;
#else
  s.d = (t.r - exl) * uLogoW;
#endif
  s.g = logoToCard(gl);
  s.u = exl > 0.0 ? 0.0 : t.a * uLogoW * uLogoW;
  if (wantGu && exl <= 0.0) {
    float lod = logoLod(F);
    vec2 tx = vec2(uLogoMap.z / uLogoMap.x, 0.0), ty = vec2(0.0, uLogoMap.z / uLogoMap.y);
    float du = textureLod(uLogoTex, uc + tx, lod).a - textureLod(uLogoTex, uc - tx, lod).a;
    float dv = textureLod(uLogoTex, uc + ty, lod).a - textureLod(uLogoTex, uc - ty, lod).a;
    float texelMm = uLogoMap.z * uLogoW;
    s.gu = logoToCard(vec2(du, dv) * (uLogoW * uLogoW) / (2.0 * texelMm));
  }
  return s;
}
vec2 wallShape(float t, int prof) {
  float tc = clamp(t, 0.0, 1.0);
  bool ins = t > 0.0 && t < 1.0;
  if (prof == 1) {
    float a = 1.0 / (1.0 - BEVEL_R);
    if (tc < BEVEL_R) return vec2(a * tc * tc / (2.0 * BEVEL_R), ins ? a * tc / BEVEL_R : 0.0);
    if (tc > 1.0 - BEVEL_R) { float v = 1.0 - tc; return vec2(1.0 - a * v * v / (2.0 * BEVEL_R), ins ? a * v / BEVEL_R : 0.0); }
    return vec2(a * (tc - 0.5 * BEVEL_R), ins ? a : 0.0);
  }
  return vec2(0.5 - 0.5 * cos(PI * tc), ins ? 0.5 * PI * sin(PI * tc) : 0.0);
}
vec3 reliefProfile(float d, float u) {
  float H = uRelief.x, s = max(uRelief.y, 1e-3), hp = uRelief.z, lam = max(uRelief.w, 1e-3);
  vec2 w = wallShape(d / s, uRelProfile);
  float h, dh, dhu = 0.0;
  if (uRelProfile == 2) {
    float e = exp(-max(u, 0.0) / DOME_U0);
    h = H * (DOME_WALL * w.x + (1.0 - DOME_WALL) * (1.0 - e));
    dh = H * DOME_WALL * w.y / s;
    dhu = u > 0.0 ? H * (1.0 - DOME_WALL) * e / DOME_U0 : 0.0;
  } else {
    float sg = uRelProfile == 3 ? -1.0 : 1.0;
    h = sg * H * w.x;
    dh = sg * H * w.y / s;
  }
  if (d >= 0.0) h += hp;
  else {
    float b = exp(-d * d / (lam * lam));
    h += hp * b;
    dh += hp * b * (-2.0 * d) / (lam * lam);
  }
  return vec3(h, dh, dhu);
}
float reliefTop() { return uRelProfile == 3 ? uRelief.z : uRelief.x + uRelief.z; }
float reliefBottom() { return uRelProfile == 3 ? uRelief.z - uRelief.x : 0.0; }
float reliefHeightAt(vec2 p, float lod) { vec2 du = logoFetch(p, lod); return reliefProfile(du.x, du.y).x; }
vec2 reliefParallax(vec2 p0, vec3 Vt, float lod, out float hHit) {
  hHit = 0.0;
#if EMB_POM_STEPS > 0
  float top = reliefTop(), bot = reliefBottom();
  if (EMB_OFF || top - bot < 1e-5) return p0;
  vec2 k = Vt.xy / max(Vt.z, 0.25);
  float reach = (top - bot) * length(k);
  if (logoDist(p0, lod) < -(reach + 2.2 * uRelief.w + uRelief.y)) return p0;
  float hPrev = top, fPrev = top - reliefHeightAt(p0 + top * k, lod);
  for (int i = 1; i <= HOLO_NOUNROLL(EMB_POM_STEPS); ++i) {
    float hr = mix(top, bot, float(i) / float(EMB_POM_STEPS));
    float f = hr - reliefHeightAt(p0 + hr * k, lod);
    if (f <= 0.0) {
      float a = hPrev, fa = fPrev, b = hr, fb = f;
      for (int j = 0; j < 3; ++j) {
        float m = a + (b - a) * fa / max(fa - fb, 1e-9);
        float fm = m - reliefHeightAt(p0 + m * k, lod);
        if (fm > 0.0) { a = m; fa = fm; } else { b = m; fb = fm; }
      }
      hHit = a + (b - a) * fa / max(fa - fb, 1e-9);
      return p0 + hHit * k;
    }
    hPrev = hr; fPrev = f;
  }
  hHit = bot;
  return p0 + bot * k;
#else
  return p0;
#endif
}
float reliefShadow(vec2 p, float h0, vec3 Lt, float rAng, float lod) {
#if EMB_SHADOW_STEPS > 0
  float top = reliefTop();
  if (EMB_OFF || Lt.z <= 1e-3 || h0 >= top - 1e-4) return 1.0;
  float lxy = length(Lt.xy);
  if (lxy < 1e-4) return 1.0;
  vec2 dir = Lt.xy / lxy;
  float tanE = Lt.z / lxy, maxT = min((top - h0) / tanE, 8.0);
  vec2 f0 = logoFetch(p, lod);
  if (f0.x < -(maxT + uRelief.y)) return 1.0;
  float tanR = tan(clamp(rAng, 0.002, 0.35)), vis = 1.0;
  float stepIn = max(0.3 * uRelief.y, 0.02), t = min(max(-0.85 * f0.x, 0.01), maxT);
  for (int i = 0; i < HOLO_NOUNROLL(EMB_SHADOW_STEPS); ++i) {
    vec2 f = logoFetch(p + dir * t, lod);
    float hr = h0 + t * tanE, hs = reliefProfile(f.x, f.y).x;
    vis = min(vis, clamp(0.5 + 0.5 * (hr - hs) / (t * tanR + 0.003), 0.0, 1.0));
    if (vis <= 0.0 || t >= maxT) break;
    t = min(t + (f.x < 0.0 ? max(-0.85 * f.x, 0.25 * stepIn) : stepIn), maxT);
  }
  return vis * vis * (3.0 - 2.0 * vis);
#else
  return 1.0;
#endif
}
float reliefAO(float d, float h) {
  if (EMB_OFF) return 1.0;
  float Hr = max(reliefTop() - h, 0.0);
  float x = (uRelProfile == 3 ? max(d - uRelief.y, 0.0) : max(-d, 0.0)) + 0.25 * uRelief.y;
  return 1.0 - 0.4 * (1.0 - x * inversesqrt(x * x + Hr * Hr + 1e-10));
}
`})))()}var H;function U(){return(U=e((()=>{H=`uniform int   uFoilType;
uniform float uInvD;
uniform vec2  uGDir;
uniform float uDepthNm, uFanQ, uSigTheta, uSigFrel, uNc, uSigS;
uniform vec4  uFoil;
uniform float uFoilBump;
uniform uint  uSeed;
uniform mat3  uCardRot, uPrevCardRot;
uniform int   uDebugLight;
varying vec3 vWorldPos; varying vec3 vPrevWorldPos; varying vec2 vUv; varying vec3 vN; varying vec3 vT; varying vec3 vB;
#if DEBUG_VIEW == 1 || DEBUG_VIEW == 2 || DEBUG_VIEW == 3 || DEBUG_VIEW == 4 || DEBUG_VIEW == 5 || DEBUG_VIEW == 6 || DEBUG_VIEW == 11 || DEBUG_VIEW == 12
#define HOLO_RAW_VIEW 1
#endif
const vec4 GH4X = vec4(-2.3344142183, -0.7419637843, 0.7419637843, 2.3344142183);
const vec4 GH4W = vec4(0.0458758548, 0.4541243478, 0.4541243478, 0.0458758548);
mat2 embKeyKernels(vec3 X, vec3 V, vec3 T, vec3 B, vec3 Nf, float snK, out vec2 qK) {
  bool key = uKeyLight >= 0 && uKeyLight < MAX_LIGHTS;
  int ki = clamp(uKeyLight, 0, MAX_LIGHTS - 1);
  vec3 Lk = key ? normalize(uLightPos[ki] - X) : reflect(-V, Nf);
  qK = vec2(dot(Lk + V, T), dot(Lk + V, B));
  vec2 w = fwidth(qK);
  float cap = 0.09 * snK * snK;
  mat2 S = mat2(min(w.x * w.x / TAU, cap), 0.0, 0.0, min(w.y * w.y / TAU, cap));
  if (key) {
    mat3 Rrel = uPrevCardRot * transpose(uCardRot);
    vec3 Hp = normalize(uPrevLightPos[ki] - vPrevWorldPos) + normalize(cameraPosition - vPrevWorldPos);
    vec2 dq = qK - vec2(dot(Hp, Rrel * T), dot(Hp, Rrel * B));
    float l = length(dq);
    if (l > 0.2) dq *= 0.2 / l;
    S += outerProduct(dq, dq) / 12.0;
  }
  return S;
}
float foilEdgeNoise(vec2 p, float pxMm, out float var) {
  float b = uFoil.y;
  var = 0.0;
  if (b <= 0.0) return 0.0;
  uint seed = uSeed * 0x2C1B3u;
  float a1 = 0.035 * b, a2 = 0.012 * b;
  float f1 = smoothstep(1.0, 2.5, 0.06 / pxMm), f2 = smoothstep(1.0, 2.5, 0.02 / pxMm);
  float n = 0.0;
  if (f1 > 0.0) n += f1 * a1 * paperNoise(p, 0.06, seed ^ 0xED6E1000u);
  if (f2 > 0.0) n += f2 * a2 * paperNoise(p, 0.02, seed ^ 0xED6E2000u);
  var = 0.2 * ((1.0 - f1 * f1) * a1 * a1 + (1.0 - f2 * f2) * a2 * a2);
  return n;
}
Elem embossElem(vec2 p, Footprint F, mat3 fF, float mottle, out float meanW) {
  vec2 gc = uGDir;
  float sigTh = uSigTheta, invD = uInvD;
  vec3 n = fF[2];
  meanW = 0.0;
  if (uFoilType == 1) {
    vec2 r = wrapDelta(p - logoCentre());
    float rl = length(r);
    gc = rl < 0.05 ? vec2(1.0, 0.0) : r / rl;
    float sPx = sqrt(0.5 * (F.S[0][0] + F.S[1][1])) / max(rl, 0.5);
    sigTh = sqrt(uSigTheta * uSigTheta + sPx * sPx);
  } else if (uFoilType == 2) {
    float cell = max(uFoil.w, 0.01);
    const mat2 ROT = mat2(0.9205, 0.3907, -0.3907, 0.9205);
    Lattice La = latticeOf(ROT, cell);
    ivec2 c = ivec2(floor(La.Gi * p));
    vec3 h = rnd3(latticeCell(La, c), uSeed ^ 0x5BA2C000u);
    vec3 h2 = rnd3(latticeCell(La, c), uSeed ^ 0x5BA2D000u);
    float th = PI * h.x;
    gc = vec2(cos(th), sin(th));
    invD = uInvD * (1.0 + 0.06 * (h.y - 0.5));
    vec2 tilt = 0.012 * gauss2(h2.xy);
    n = normalize(fF[2] - tilt.x * fF[0] - tilt.y * fF[1]);
    meanW = smoothstep(0.4, 3.0, F.area / (cell * cell));
  }
  Elem e;
  e.n = n;
  vec3 g3 = gc.x * fF[0] + gc.y * fF[1];
  e.g = normalize(g3 - n * dot(g3, n));
  e.invD = invD; e.hNm = uDepthNm; e.nc = uNc; e.sigS = uSigS; e.tauF = 0.0; e.fanQ = uFanQ;
  e.sigTheta = sigTh; e.sigFrel = uSigFrel; e.iso2 = uFoilType == 2 ? sq(0.44 * 0.55 / max(uFoil.w * 1000.0, 1.0)) : 0.0;
  e.w = uFoilType >= 3 ? 0.0 : clamp(0.92 * mottle, 0.0, 1.0);
  e.fam = 0.0;
  return e;
}
#if DEBUG_VIEW == 3 || DEBUG_VIEW == 12
vec4 firstOrder(GLight g, vec3 Lp, vec3 Vp, Elem e, mat2 ScCard, vec3 T, vec3 B) {
  float ciIn = dot(e.n, Lp), coIn = dot(e.n, Vp);
  if (ciIn <= 0.0 || coIn <= 0.0 || g.A <= 0.0) return vec4(0.0);
  vec3  t = cross(e.n, e.g), H = e.nc * (Lp + Vp);
  float qg = dot(H, e.g), qt = dot(H, t), sn = dot(H, e.n);
  mat2  R = mat2(dot(T, e.g), dot(T, t), dot(B, e.g), dot(B, t));
  mat2  Sx = R * (ScCard + g.S) * transpose(R);
  float rho = length(vec2(qg, qt)), iso2 = sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2;
  float sgg = max(Sx[0][0] + iso2 + sq(rho * e.sigFrel), 1e-10);
  float stt = max(Sx[1][1] + iso2 + sq(rho * e.sigTheta) + sq(e.fanQ), 1e-10);
  float sgt = Sx[0][1], d = 1.0 / max(e.invD, 1e-6);
  float lam = d * abs(qg - (sgt / stt) * qt);
  float sigL = clamp(d * sqrt(max(sgg - sgt * sgt / stt, 1e-10)), 0.5, 512.0);
  return vec4(lam, sigL, exp(-0.5 * qt * qt / stt), sqrt(stt));
}
#endif
void main() {
  vec3 X = vWorldPos, V = normalize(cameraPosition - X);
  vec3 T = normalize(vT), B = normalize(vB), N = normalize(vN);
  vec2 p0 = vUv * uCardSizeMm;
  gPrint = printTint(vUv, dFdx(vUv), dFdy(vUv));
  Footprint F = footprintOf(p0);
  float pxMm = 2.50662827 * sqrt(max(F.sMaj * F.sMin, 1e-14));
  vec2 sB, sC; mat2 SgB, SgC;
  wavesSlope(uWaveBoard, p0, F, sB, SgB);
  vec2 sM; mat2 SgM;
  bumpSlope(p0, F, sM, SgM);
  sB += bowSlope(p0);
  float snK = keySn(X, V, N);
  mat3 fM = frameFromSlope(T, B, N, sB);
  vec2 qK;
  mat2 Skey = embKeyKernels(X, V, T, B, fM[2], snK, qK);
  Wear wr = wearAt(p0, F);
#if DEBUG_VIEW == 14
  wr.alphaAdd = 0.0; wr.gloss = 1.0; wr.mottle = 1.0; wr.dust = 0.0;
#endif
  float burnish = wr.alphaAdd / 0.12;
  vec3 Vt = vec3(dot(V, fM[0]), dot(V, fM[1]), dot(V, fM[2]));
  float lodL = logoLod(F);
  float hHit;
  vec2 p = reliefParallax(p0, Vt, lodL, hHit);
  bool dome = uRelProfile == 2;
  LogoS lg = logoSample(p, F, dome);
  vec3 prof = reliefProfile(lg.d, lg.u);
  float gl = length(lg.g);
  vec2 n1 = gl > 1e-5 ? lg.g / gl : vec2(1.0, 0.0);
  float texelMm = uLogoMap.z * uLogoW;
  float sd = sqrt(sq(sigmaAlong(F, n1)) + sq(0.3 * texelMm));
  float nVar;
  float dEdge = uRelief.y * (1.0 - clamp(uFoil.x, 0.0, 1.0)) + foilEdgeNoise(p, pxMm, nVar);
  float sN = sqrt(nVar + 1e-8);
  float wFo = 0.0, mF = 0.0, qF = 0.0, mP = 0.0, qP = 0.0;
  for (int k = 0; k < 4; ++k) {
    if (k >= uGhB) break;
    float x = uGhB >= 4 ? GH4X[k] : (k == 0 ? -1.0 : 1.0);
    float w = uGhB >= 4 ? GH4W[k] : 0.5;
    float dk = lg.d + sd * x;
    float sl = reliefProfile(dk, lg.u).y * gl;
    float ck = gaussCdf((dk - dEdge) / max(sN + 0.35 * sd, 1e-5));
    wFo += w * ck; mF += w * ck * sl; qF += w * ck * sl * sl;
    mP += w * (1.0 - ck) * sl; qP += w * (1.0 - ck) * sl * sl;
  }
  float wPa = 1.0 - wFo;
  float sF = mF / max(wFo, 1e-6), vF = max(qF / max(wFo, 1e-6) - sF * sF, 0.0);
  float sP = mP / max(wPa, 1e-6), vP = max(qP / max(wPa, 1e-6) - sP * sP, 0.0);
  if (wFo < 1e-4) { sF = prof.y * gl; vF = 0.0; }
  if (wPa < 1e-4) { sP = prof.y * gl; vP = 0.0; }
  vec2 sDome = prof.z * lg.gu;
  mat2 nn = outerProduct(n1, n1);
  Paper P = paperAt(p, F);
  float voidF = uFoil.y > 0.0 ? uFoil.y * gaussCdf((-2.2 + 0.6 * uFoil.y - P.hl) / 0.3) : 0.0;
  float C = uLogoOn == 0 ? 0.0 : gaussCdf((lg.d - dEdge) / sqrt(sd * sd + nVar + 1e-10)) * (1.0 - voidF);
  vec2 sRelP = sP * n1 + sDome, sRelF = sF * n1 + sDome;
  float cal = uLogoOn == 0 ? 1.0 : 1.0 - 0.35 * smoothstep(-uRelief.w, 0.0, lg.d);
  vec2 sPap = sB + sRelP + cal * P.s;
  mat2 SPap = SgB + vP * nn + (cal * cal) * P.S;
  if (uPaperBump == 1) { sPap += sM; SPap += SgM; }
  mat3 fPm = frameFromSlope(T, B, N, sB + sRelP);
  mat3 fPn = frameFromSlope(T, B, N, sPap);
  float show = 0.5 * uFoil.z;
  vec2 sFoil = sB + sRelF + show * P.s + uFoilBump * sM;
  mat2 SFoil = SgB + vF * nn + (show * show) * P.S + (uFoilBump * uFoilBump) * SgM;
  mat3 fF = frameFromSlope(T, B, N, sFoil);
  mat2 ScFoil = Skey + snK * snK * SFoil;
  float sig2F = SFoil[0][0] + SFoil[1][1], sig2P = SPap[0][0] + SPap[1][1];
  float alphaF = uCoatAlpha + wr.alphaAdd;
  float albP = P.a * (1.0 - 0.06 * burnish), sheenP = 1.0 + 0.8 * burnish;
  float hP = prof.x;
  float ao = reliefAO(lg.d, hP);
  Paper Pc = P;
  Pc.s *= cal; Pc.S *= cal * cal; Pc.hl *= cal;
  float meanW;
  Elem e = embossElem(p, F, fF, wr.mottle, meanW);
  vec3 Vp = refractIn(V, fF[2], uNc);
  float coIn = dot(fF[2], Vp);
#ifdef HOLO_RAW_VIEW
  vec3 raw = vec3(0.0);
#if DEBUG_VIEW == 1
  vec3 nS = normalize(mix(fPn[2], fF[2], C));
  raw = vec3(dot(nS, T), dot(nS, B), dot(nS, N)) * 0.5 + 0.5;
#elif DEBUG_VIEW == 2
  raw = vec3(0.5 * (qK + 1.0), 0.0);
#elif DEBUG_VIEW == 3 || DEBUG_VIEW == 12
  GLight gd = lightSummary(uDebugLight, X, V, fF[0], fF[1], fF[2]);
  vec4 fo = firstOrder(gd, refractIn(gd.L, fF[2], uNc), Vp, e, ScFoil, fF[0], fF[1]);
#if DEBUG_VIEW == 3
  if (C > 0.5 && e.w > 0.0 && fo.x >= 360.0 && fo.x <= 830.0) raw = vec3((fo.x - 350.0) / 500.0, fo.z, 0.25);
#else
  if (C > 0.5 && fo.x > 0.0) raw = vec3(fo.y / 100.0, fo.w / 0.2, 0.0);
#endif
#elif DEBUG_VIEW == 6
  raw = vec3(C, clamp(0.5 + 0.25 * P.hn, 0.0, 1.0), clamp(hP / max(reliefTop(), 1e-4), 0.0, 1.0));
#endif
  gl_FragColor = vec4(clamp(raw, 0.0, 1.0), 1.0);
  return;
#endif
  vec3 Lpap = vec3(0.0), Lc = vec3(0.0), Lz = vec3(0.0), Lo = vec3(0.0), Ed = vec3(0.0);
#if DEBUG_VIEW != 14
  for (int k = 0; k < MAX_LIGHTS; ++k) {
    int i = uLightOrder[k];
    if (i < 0) break;
    vec3 dL = uLightPos[i] - X;
    float dist = max(length(dL), 1e-4);
    vec3 Lw = dL / dist;
    vec3 Lt = vec3(dot(Lw, fM[0]), dot(Lw, fM[1]), dot(Lw, fM[2]));
    float rA = uLightType[i] == 1 ? uLightRadius[i] / dist : sqrt(length(uLightU[i]) * length(uLightW[i])) / dist;
    float vis = reliefShadow(p, hP, Lt, rA, lodL);
    bool lit = false;
    if (C < 0.9999) {
      GLight gp = lightSummary(i, X, V, fPm[0], fPm[1], fPm[2]);
      if (gp.A > 0.0) {
        Lpap += paperDirect(gp, X, V, fPm[2], fPn[2], Pc, sig2P, vis, albP, sheenP);
        Ed += gp.rad * gp.A * gp.rgb;
        lit = true;
      }
    }
    if (C > 1e-4) {
      GLight g = lightSummary(i, X, V, fF[0], fF[1], fF[2]);
      if (g.A <= 0.0) continue;
      if (!lit) Ed += g.rad * g.A * g.rgb;
      float Ti = coatT(fF[2], g.L, V);
      vec3 Lp = refractIn(g.L, fF[2], uNc);
      vec4 eta = etaOrdFor(i, e.fam);
      vec3 mir = mix(specProject(vec4(1.0), g.spd),
                     specProject(mirrorF1(e.hNm, e.nc, dot(fF[2], Lp), coIn, uEtaMir[i]), g.spd), e.w);
      vec3 ord = vec3(0.0), zer;
      if (e.w > 0.0 && meanW < 1.0) {
        if (g.type == 2) {
#if RECT_EXACT
          ord = uFoilType == 2 ? elemOrders(g, Lp, Vp, e, ScFoil, fF[0], fF[1], Ti, eta)
                               : elemOrdersRect(g, V, e, ScFoil, fF[0], fF[1], Ti, eta);
#else
          ord = elemOrders(g, Lp, Vp, e, ScFoil, fF[0], fF[1], Ti, eta);
#endif
        } else {
#if DEBUG_VIEW == 13
          ord = elemOrdersRef(g, Lp, Vp, e, ScFoil, fF[0], fF[1], Ti, eta);
#else
          ord = elemOrders(g, Lp, Vp, e, ScFoil, fF[0], fF[1], Ti, eta);
#endif
        }
      }
      if (meanW > 0.0) {
        float sigQ = sqrt(0.5 * (ScFoil[0][0] + ScFoil[1][1]));
        vec3 ring = e.w * ringKernel(g, Lp, Vp, fF[2], fF[0], fF[1], uInvD, uSigFrel + 0.017, sigQ, uDepthNm, uNc, 0.012, Ti, etaOrdFor(i, 1.0));
        ord = mix(ord, ring, meanW);
      }
#if RECT_LTC
      zer = g.type == 2 ? elemMirrorRect(g, X, V, e, ScFoil, fF[0], fF[1], fF[2], 1.0, Ti, mir)
                        : elemMirror(g, Lp, Vp, e, ScFoil, fF[0], fF[1], Ti, mir);
#else
      zer = elemMirror(g, Lp, Vp, e, ScFoil, fF[0], fF[1], Ti, mir);
#endif
      Lc += vis * coatDirect(g, X, V, fF[2], alphaF, wr.gloss, sig2F);
      if (k < DISCRETE_LIGHTS) Lc += vis * scratchLobe(g, V, fF, p, F, ScFoil);
      Lz += vis * zer;
      Lo += vis * ord;
    }
  }
#endif
  vec3 Ee = envIrradiance(fPm[2]);
  if (C < 0.9999) Lpap += paperEnv(V, fPn[2], sig2P, ao, albP, sheenP);
  if (C > 1e-4) {
    float aoF = mix(1.0, ao, 0.6);
    Lc += aoF * coatEnv(V, fF[2], sqrt(sq(alphaF) + sig2F), wr.gloss);
    vec3 mirEnv = mix(specProject(vec4(1.0), 0), specProject(mirrorF1(e.hNm, e.nc, coIn, coIn, uEtaEnv), 0), e.w);
    Lz += aoF * envMirror(V, Vp, e, fF[2], ScFoil, mirEnv);
#if NB > 0
    if (e.w > 0.0) Lo += aoF * (1.0 - meanW) * envDiffraction(V, e, ScFoil, fF[0], fF[1]);
#endif
  }
  vec3 Lfoil = Lc + Lz + Lo;
  vec3 L = mix(mix(Lpap, Lfoil, C), dustRadiance(Ed + Ee, V, fM[2]), wr.dust);
#if DEBUG_VIEW == 7
  L = (1.0 - wr.dust) * C * Lc;
#elif DEBUG_VIEW == 8
  L = (1.0 - wr.dust) * mix(Lpap, Lz + Lo, C);
#elif DEBUG_VIEW == 9
  L = (1.0 - wr.dust) * C * Lz;
#elif DEBUG_VIEW == 10
  L = (1.0 - wr.dust) * C * Lo;
#endif
  L *= uEmbExposure;
#ifdef HOLO_LDR
  L = gamutMapLuma(L, LUMA_SRGB);
#endif
  gl_FragColor = encodeCard(L);
}
`})))()}var W;function G(){return(G=e((()=>{W=`uniform sampler2D uPaperMom, uPaperAux;
uniform int   uPaperOn;
uniform vec4  uPaperMap;
uniform vec3  uPaperRgb;
uniform vec4  uPaperBrdf;
uniform vec4  uPaperPat;
uniform int   uPaperBump;
uniform int   uPaperCard;
uniform float uEmbExposure;
uniform sampler2D uPrintTex;
uniform vec4  uPrintK;
vec3 gPrint = vec3(1.0);
vec3 printTint(vec2 uv, vec2 dx, vec2 dy) {
  if (uPrintK.x < 0.5) return vec3(1.0);
  vec4 c = textureGrad(uPrintTex, clamp(uv, 0.0, 1.0), dx, dy);
  return mix(vec3(1.0), c.rgb, clamp(c.a * uPrintK.y, 0.0, 1.0));
}
#ifndef PAPER_LAYERS
#define PAPER_LAYERS 2
#endif
struct Paper {
  vec2  s;
  mat2  S;
  float a;
  float hn;
  float hs;
  float hl;
  float trans;
};
float paperNoise(vec2 p, float cell, uint salt) {
  Lattice La = latticeOf(mat2(1.0), cell);
  vec2 c = La.Gi * p, i = floor(c), f = c - i, u = f * f * (3.0 - 2.0 * f);
  ivec2 k = ivec2(i);
  float a = rnd3(latticeCell(La, k), salt).x, b = rnd3(latticeCell(La, k + ivec2(1, 0)), salt).x;
  float e = rnd3(latticeCell(La, k + ivec2(0, 1)), salt).x, d = rnd3(latticeCell(La, k + ivec2(1, 1)), salt).x;
  return 2.0 * mix(mix(a, b, u.x), mix(e, d, u.x), u.y) - 1.0;
}
void paperLayer(vec2 p, Footprint F, mat2 Q, vec2 o, out vec2 s, out mat2 S, out float a, out float h, out float hv, out float hc) {
  mat2 M = transpose(Q) * uPaperMap.x;
  vec2 uv = M * p + o;
  vec2 gMaj = M * ((2.50662827 * F.sMaj) * F.eMaj);
  vec2 gMin = M * ((2.50662827 * F.sMin) * vec2(-F.eMaj.y, F.eMaj.x));
  vec4 m = textureGrad(uPaperMom, uv, gMaj, gMin);
  vec4 x = textureGrad(uPaperAux, uv, gMaj, gMin);
  hc = textureGrad(uPaperAux, uv, 6.0 * gMaj, 6.0 * gMin).z;
  float vxx = max(m.z - m.x * m.x, 0.0), vyy = max(m.w - m.y * m.y, 0.0), c = sqrt(vxx * vyy);
  float vxy = clamp(x.x - m.x * m.y, -c, c);
  float k = uPaperMap.y;
  s = k * (Q * m.xy);
  S = (k * k) * (Q * mat2(vxx, vxy, vxy, vyy) * transpose(Q));
  a = x.y;
  h = x.z;
  hv = max(x.w - x.z * x.z, 0.0);
}
void paperSine(vec2 f, float A, float ph, vec2 p, Footprint F, inout vec2 s, inout mat2 S, inout float h) {
  float G = exp(-19.7392088 * dot(f, F.S * f));
  float arg = TAU * fract(dot(f, p) + ph);
  vec2 gA = TAU * A * f;
  s += -G * sin(arg) * gA;
  S += 0.5 * (1.0 - G * G) * outerProduct(gA, gA);
  h += G * A * cos(arg);
}
Paper paperAt(vec2 p, Footprint F) {
  Paper P;
  P.s = vec2(0.0); P.S = mat2(0.0); P.a = 1.0; P.hn = 0.0; P.hs = 0.0; P.hl = 0.0; P.trans = 1.0;
  float pxMm = sqrt(max(F.sMaj * F.sMin, 1e-14)) * 2.50662827;
  float strength = uPaperPat.z;
  float hUnit = max(uPaperMap.z, 1e-6);
  if (uPaperOn == 1) {
    vec2 s0; mat2 S0; float a0, h0, v0, c0;
    paperLayer(p, F, mat2(1.0), vec2(0.0), s0, S0, a0, h0, v0, c0);
#if PAPER_LAYERS >= 2
    vec2 s1; mat2 S1; float a1, h1, v1, c1;
    paperLayer(p, F, 1.3127 * mat2(0.83205, -0.5547, 0.5547, 0.83205), vec2(0.371, 0.619), s1, S1, a1, h1, v1, c1);
    P.s = 0.70710678 * (s0 + s1); P.S = 0.5 * (S0 + S1);
    P.hn = 0.70710678 * (h0 + h1); P.hs = sqrt(0.5 * (v0 + v1));
    P.hl = 0.70710678 * (h0 + h1 - c0 - c1);
    P.a = 1.0 + uPaperMap.w * 0.70710678 * (a0 + a1);
#else
    P.s = s0; P.S = S0; P.hn = h0; P.hs = sqrt(v0); P.hl = h0 - c0; P.a = 1.0 + uPaperMap.w * a0;
#endif
  }
  float hOn = clamp(hUnit / 0.002, 0.0, 1.0);
  P.hn *= hOn; P.hs *= hOn;
  P.hl *= hOn * (1.0 - smoothstep(0.04, 0.2, pxMm));
  int stock = int(uPaperPat.x + 0.5);
  float hPat = 0.0;
  if (stock == 3) {
    vec2 sP = vec2(0.0); mat2 SP = mat2(0.0);
    float A = 0.0032 * strength;
    paperSine(vec2(0.0, 1.0 / 0.95), A, 0.0, p, F, sP, SP, hPat);
    paperSine(vec2(0.0, 2.0 / 0.95), 0.25 * A, 0.13, p, F, sP, SP, hPat);
    float xc = p.x - 25.0 * floor(p.x / 25.0 + 0.5) - 6.0;
    xc -= 25.0 * floor(xc / 25.0 + 0.5);
    float w = 0.3, sx = sqrt(max(F.S[0][0], 0.0)), we = sqrt(w * w + sx * sx), Ac = 0.004 * strength * w / we;
    float g = exp(-0.5 * xc * xc / (we * we));
    sP.x += -Ac * g * xc / (we * we);
    hPat += Ac * g;
    P.s += sP; P.S += SP;
    P.a *= 1.0 - 2.5 * (hPat / 0.004) * 0.006 * strength;
  } else if (stock == 4) {
    vec2 sP = vec2(0.0); mat2 SP = mat2(0.0);
    float A = 0.0035 * strength, k1 = 1.0 / 0.42, k2 = 0.5 / 0.42;
    paperSine(vec2(0.0, k1), A, 0.0, p, F, sP, SP, hPat);
    paperSine(vec2(k1, 0.0), A, 0.25, p, F, sP, SP, hPat);
    paperSine(vec2(k2, k1), 0.3 * A, 0.0, p, F, sP, SP, hPat);
    paperSine(vec2(-k2, k1), 0.3 * A, 0.0, p, F, sP, SP, hPat);
    paperSine(vec2(k1, k2), 0.3 * A, 0.25, p, F, sP, SP, hPat);
    paperSine(vec2(k1, -k2), 0.3 * A, 0.25, p, F, sP, SP, hPat);
    P.s += sP; P.S += SP;
  }
  P.hn += hPat / (hUnit + 0.003 * strength);
  float form = 0.0;
  {
    uint seed = uint(uPaperPat.w) * 0x9E37u;
    form += 0.50 * smoothstep(1.0, 2.5, 4.0 / pxMm) * paperNoise(p, 4.0, seed ^ 0xF0A10000u);
    form += 0.33 * smoothstep(1.0, 2.5, 1.8 / pxMm) * paperNoise(p, 1.8, seed ^ 0xF0A20000u);
    form += 0.17 * smoothstep(1.0, 2.5, 0.8 / pxMm) * paperNoise(p, 0.8, seed ^ 0xF0A30000u);
  }
  float fc = uPaperPat.y;
  P.a *= 1.0 + 0.07 * fc * form;
  P.trans = clamp(1.0 - 0.6 * fc * form, 0.2, 2.0);
  P.a = max(P.a, 0.05);
  return P;
}
float paperOrenNayar(vec3 n, vec3 L, vec3 V, float sig) {
  float s2 = sig * sig;
  float A = 1.0 - 0.5 * s2 / (s2 + 0.33), B = 0.45 * s2 / (s2 + 0.09);
  float cl = clamp(dot(n, L), 1e-4, 1.0), cv = clamp(dot(n, V), 1e-4, 1.0);
  vec3 lt = L - n * cl, vt = V - n * cv;
  float cphi = max(dot(lt, vt), 0.0) * inversesqrt(max(dot(lt, lt) * dot(vt, vt), 1e-12));
  float sinA = sqrt(max(1.0 - min(cl, cv) * min(cl, cv), 0.0));
  float cb = max(cl, cv), tanB = sqrt(max(1.0 - cb * cb, 0.0)) / cb;
  return A + B * cphi * sinA * tanB;
}
vec3 paperDirect(GLight g, vec3 X, vec3 V, vec3 Nmac, vec3 n, Paper P, float sig2, float vis, float alb, float sheenK) {
  if (g.A <= 0.0 || vis <= 0.0) return vec3(0.0);
  float cM = max(dot(Nmac, g.L), 1e-3);
  float Esr = g.rad * g.A / cM;
  float tr = uPaperBrdf.w * P.trans;
  float w = 0.35 * tr;
  float cm = dot(n, g.L);
  float wrapped = max(cm + w, 0.0) / (1.0 + w);
  if (wrapped <= 0.0 && dot(n, V) <= 0.0) return vec3(0.0);
  float graze = 1.0 - smoothstep(0.08, 0.6, cM);
  float ms = clamp(1.0 + graze * 0.45 * (1.0 - 0.6 * tr) * P.hl, 0.25, 1.5);
  float sgU = sqrt(max(0.5 * (P.S[0][0] + P.S[1][1]), 1e-8));
  float aS = cM / max(sgU * 1.41421356 * sqrt(max(1.0 - cM * cM, 1e-6)), 1e-6);
  float lam = aS < 1.6 ? (1.0 - 1.259 * aS + 0.396 * aS * aS) / (3.535 * aS + 2.181 * aS * aS) : 0.0;
  ms *= 1.0 / (1.0 + lam);
  vec3 diff = uPaperRgb * gPrint * alb * (Esr * wrapped * ms * paperOrenNayar(n, g.L, V, uPaperBrdf.x) / PI) * g.rgb;
  vec3 sheen = coatDirect(g, X, V, n, uPaperBrdf.z, uPaperBrdf.y * sheenK, sig2);
  return vis * (diff + sheen);
}
vec3 paperEnv(vec3 V, vec3 n, float sig2, float ao, float alb, float sheenK) {
  vec3 diff = uPaperRgb * gPrint * alb * envIrradiance(n) / PI;
  vec3 sheen = coatEnv(V, n, sqrt(sq(uPaperBrdf.z) + sig2), uPaperBrdf.y * sheenK);
  return ao * diff + mix(1.0, ao, 0.7) * sheen;
}
`})))()}function ee(e){let t=Math.max(e.heightMm,0),n=Math.min(Math.max(e.puff,0),1);return{H:t,s:Math.max(e.shoulderMm,.001),hp:te*n*t,lambda:ne+re*n}}var K,te,ne,re;function ie(){return(ie=e((()=>{K=[`round`,`bevel`,`dome`,`deboss`],te=.12,ne=.6,re=1.2})))()}function ae(e){return{stock:Math.max(J.indexOf(t(e,`emboss.stock`,J,`cotton`)),0),fibreAmount:X(r(e,`emboss.fibreAmount`,.55),0,1),fibreScale:X(r(e,`emboss.fibreScale`,1),.5,2),seed:Math.max(Math.round(r(e,`emboss.seed`,7)),0)}}var oe,q,J,se,ce,Y,le,X,Z,Q,$,ue,de;function fe(){return(fe=e((()=>{z(),V(),U(),G(),ie(),I(),a(),u(),n(),oe=d(W,`vec4 c = textureGrad(uPrintTex, clamp(uv, 0.0, 1.0), dx, dy);`,`vec4 c = holoPrintSample(clamp(uv, 0.0, 1.0), dx, dy);`,`paper print`),q=[`rainbow`,`concentric`,`sparkle`,`silver`,`gold`],J=[`cotton`,`felt`,`smooth`,`laid`,`linen`,`kraft`],se={type:`longpass`,edgeNm:520,widthNm:45,floor:.2},ce={type:`clear`,edgeNm:505,widthNm:35,floor:.06},Y={depthNm:55,fanDeg:7,sigThetaDeg:.3,sigPitchPct:.5,nc:1.5,roughnessDeg:.25},le=`
#ifdef HOLO_CLEAR_PAPER
float holoPaperAlpha() {
  float d = logoFetch(vHoloUv * uCardSizeMm, 0.0).x;
  float w = max(fwidth(d), 1e-4);
  return smoothstep(-w, w, d);
}
#endif
`,X=(e,t,n)=>Math.min(Math.max(e,t),n),Z=e=>Math.max(r(e,`emboss.pitch`,1e3),1),Q=e=>r(e,`emboss.grooveAngle`,120),$=e=>t(e,`emboss.foil`,q,`rainbow`),ue=e=>t(e,`emboss.profile`,K,`round`),de={id:`emboss`,emboss:{createAssets:()=>new R,paperKey:ae},fragmentMain:H,extraChunks:[oe,B,le],uniforms(e){let t=ue(e),n=ee({heightMm:X(r(e,`emboss.height`,450),0,1e3)/1e3,shoulderMm:X(r(e,`emboss.shoulder`,.6),.05,2),profile:t,puff:X(r(e,`emboss.puff`,.4),0,1)}),a=X(r(e,`emboss.textureStrength`,1),0,2),o=X(r(e,`emboss.tooth`,7),0,30)/1e3*a,s=X(r(e,`emboss.roughness`,.75),.2,1),l=e[`emboss.paperColour`],u=Q(e)*i;return{uRelief:[n.H,n.s,n.hp,n.lambda],uRelProfile:K.indexOf(t),uPaperMap:[1/F,P/F*o,o,a],uPaperBrdf:[.25+.35*s,X(r(e,`emboss.sheen`,.35),0,1),.35+.35*s,X(r(e,`emboss.translucency`,.35),0,1)],uPaperPat:[ae(e).stock,X(r(e,`emboss.formation`,.45),0,1),a,Math.max(Math.round(r(e,`emboss.seed`,7)),0)],uPaperRgb:c(typeof l==`string`&&/^#?[0-9a-f]{6}$/i.test(l.trim())?l:`#f3f1ea`),uPaperBump:+(e[`emboss.paperBump`]===!0),uPaperCard:0,uEmbExposure:2**X(r(e,`emboss.exposure`,.6),-2,2),uPrintK:[1,X(r(e,`emboss.printInk`,1),0,1),0,0],uFoilType:q.indexOf($(e)),uInvD:1/Z(e),uGDir:[Math.sin(u),-Math.cos(u)],uDepthNm:Y.depthNm,uFanQ:Y.fanDeg*i,uSigTheta:Y.sigThetaDeg*i,uSigFrel:Y.sigPitchPct/100,uNc:Y.nc,uSigS:Y.roughnessDeg*i,uCoatAlpha:.3-.275*X(r(e,`emboss.gloss`,.8),0,1),uFoil:[X(r(e,`emboss.foilCoverage`,.85),0,1),X(r(e,`emboss.edgeBreakup`,.35),0,1),X(r(e,`emboss.showThrough`,.25),0,1),X(r(e,`emboss.sparkleSize`,160),20,2e3)/1e3],uSeed:Math.max(Math.round(r(e,`emboss.seed`,7)),0)>>>0,uFoilBump:X(r(e,`emboss.foilBump`,.25),0,1)}},defines(e){let t=e.tier;return{EMB_POM_STEPS:t===`high`?16:t===`medium`?10:6,EMB_SHADOW_STEPS:t===`high`?12:t===`medium`?8:5,PAPER_LAYERS:t===`low`?1:2}},gratingSummary(e){let t=$(e);return{pitchesNm:[Z(e)],depthNm:t===`silver`||t===`gold`?0:Y.depthNm,nc:Y.nc,gAzimuthRad:t===`rainbow`?(Q(e)-90)*i:null,recycle:!0,tint:t===`gold`?se:ce}},relief(e){return{seed:Math.max(Math.round(r(e,`emboss.seed`,7)),0),wavinessDeg:X(r(e,`emboss.waviness`,.12),0,1),orangePeelUm:0}}}})))()}fe();export{de as emboss};