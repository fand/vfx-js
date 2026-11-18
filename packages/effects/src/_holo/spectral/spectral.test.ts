// Ported from holospot tests/engine/spectral.test.ts (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.
// WP-A spectral tests S1–S14 (spec §7.1) plus layout and contract checks of spectral/*.
import assert from "node:assert/strict";
import { test } from "vitest";
import { besselJ, orderEff } from "../physics/grating.js";
import type { SpdId, TintInputs, Vec3 } from "../types.js";
import { SPD_IDS } from "../types.js";
import {
    CMF_INTEGRALS,
    deltaE76,
    gamutMapLuma,
    LUMA_P3,
    LUMA_SRGB,
    linearSrgbToLab,
    luma,
    M_E_TO_SRGB,
    M_P3_TO_SRGB,
    M_SRGB_TO_P3,
    rgbCmf,
    xyzBar,
} from "./cmf.js";
import { foilRgb, materialFactor, rAl, spd, spdRgb, tintT2 } from "./spd.js";
import {
    binBases,
    buildBins,
    buildCmfLayer,
    buildSpecProj,
    CMF_TABLE,
    rowOfSigma,
    SPEC_NODES,
    sampleCmfTable,
    sigmaOfRow,
    specBasis,
    specProject,
    texelLambda,
} from "./tables.js";

// ---------------------------------------------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------------------------------------------

const CLEAR: TintInputs = {
    type: "clear",
    edgeNm: 505,
    widthNm: 35,
    floor: 0.06,
}; // M1 defaults (§3.1)
const GOLD: TintInputs = {
    type: "longpass",
    edgeNm: 500,
    widthNm: 70,
    floor: 0.25,
}; // M2 defaults (§3.2)
const BLUE: TintInputs = {
    type: "shortpass",
    edgeNm: 525,
    widthNm: 30,
    floor: 0.15,
}; // M3 defaults (§3.3)
const ONE = (): number => 1;

/** Independent trapezoid integral of an RGB integrand over [a, b] with step h. */
function integrate3(f: (l: number) => Vec3, a = 360, b = 830, h = 0.5): Vec3 {
    const n = Math.round((b - a) / h);
    const acc: [number, number, number] = [0, 0, 0];
    for (let i = 0; i <= n; i++) {
        const l = a + i * h,
            w = (i === 0 || i === n ? 0.5 : 1) * h,
            v = f(l);
        acc[0] += w * v[0];
        acc[1] += w * v[1];
        acc[2] += w * v[2];
    }
    return acc;
}

function integrate1(
    f: (l: number) => number,
    a = 360,
    b = 830,
    h = 0.5,
): number {
    return integrate3((l) => [f(l), 0, 0], a, b, h)[0];
}

function near(
    actual: number,
    expected: number,
    tol: number,
    what: string,
): void {
    assert.ok(
        Math.abs(actual - expected) <= tol,
        `${what}: ${actual} vs ${expected} ± ${tol}`,
    );
}

const scaleV = (c: Vec3, s: number): Vec3 => [c[0] * s, c[1] * s, c[2] * s];

/** Zeroth-order factor (1 − w) + w·etaN·J₀²(Φ(λ)) at normal incidence (internal cosines 1, n_c 1.5). */
function mirrorFactor(
    h: number,
    w: number,
    etaN: number,
): (l: number) => number {
    return (l) => {
        const j0 = besselJ(0, Math.min((Math.PI * 1.5 * h * 2) / l, 5.5));
        return 1 - w + w * etaN * j0 * j0;
    };
}

/** Linear sRGB colour of a mirror (S_equal·ρ_M·f) by direct integration. */
function mirrorColour(t: TintInputs, f: (l: number) => number, h = 0.25): Vec3 {
    const rho = materialFactor(t);
    return integrate3((l) => scaleV(rgbCmf(l), rho(l) * f(l)), 360, 830, h);
}

const hueDeg = (lab: Vec3): number =>
    ((Math.atan2(lab[2], lab[1]) * 180) / Math.PI + 360) % 360;
const chroma = (lab: Vec3): number => Math.hypot(lab[1], lab[2]);

// ---------------------------------------------------------------------------------------------------------------
// S1–S6: CMFs, matrices, gamut mapping, SPDs
// ---------------------------------------------------------------------------------------------------------------

test("S1 Wyman fit integrals at 1 nm", () => {
    const sum = (a: number, b: number): Vec3 => {
        const s: [number, number, number] = [0, 0, 0];
        for (let l = a; l <= b; l++) {
            const x = xyzBar(l);
            s[0] += x[0];
            s[1] += x[1];
            s[2] += x[2];
        }
        return s;
    };
    const a = sum(380, 780),
        b = sum(360, 830);
    near(a[0], 106.71, 0.05, "∫x̄ 380–780");
    near(a[1], 106.94, 0.05, "∫ȳ 380–780");
    near(a[2], 106.81, 0.05, "∫z̄ 380–780");
    near(b[0], 106.71, 0.05, "∫x̄ 360–830");
    near(b[1], 106.95, 0.05, "∫ȳ 360–830");
    near(b[2], 106.86, 0.05, "∫z̄ 360–830");
    for (let c = 0; c < 3; c++) {
        near(CMF_INTEGRALS[c], b[c], 0.05, `CMF_INTEGRALS[${c}]`);
    }
});

test("S2 ∫ rgbCMF dλ over 360–830 nm = (1, 1, 1)", () => {
    for (const h of [1, 0.5, 0.1]) {
        const s = integrate3(rgbCmf, 360, 830, h);
        for (let c = 0; c < 3; c++) {
            near(s[c], 1, 1e-3, `channel ${c} at ${h} nm`);
        }
    }
});

test("S3 M_E→sRGB matches §4.2.1", () => {
    const expected = [
        3.14666, -1.66646, -0.48019, -0.99552, 1.95576, 0.03976, 0.06359,
        -0.21456, 1.15097,
    ];
    expected.forEach((v, i) => near(M_E_TO_SRGB[i], v, 1e-3, `M_E→sRGB[${i}]`));
    // and it maps the equal-energy integral (1, 1, 1) to white
    for (let r = 0; r < 3; r++) {
        near(
            M_E_TO_SRGB[3 * r] +
                M_E_TO_SRGB[3 * r + 1] +
                M_E_TO_SRGB[3 * r + 2],
            1,
            1e-9,
            `row ${r} sum`,
        );
    }
});

test("P3 matrices and luma weights match Appendix A.4", () => {
    const s2p = [
        0.822462, 0.177538, 0, 0.033194, 0.966806, 0, 0.017083, 0.072397,
        0.91052,
    ];
    const p2s = [
        1.22494, -0.22494, 0, -0.042057, 1.042057, 0, -0.019638, -0.078636,
        1.098274,
    ];
    s2p.forEach((v, i) => near(M_SRGB_TO_P3[i], v, 1e-5, `M_sRGB→P3[${i}]`));
    p2s.forEach((v, i) => near(M_P3_TO_SRGB[i], v, 1e-5, `M_P3→sRGB[${i}]`));
    assert.deepEqual([...LUMA_SRGB], [0.2126, 0.7152, 0.0722]);
    assert.deepEqual([...LUMA_P3], [0.229, 0.6917, 0.0793]);
});

test("S4 rgbCMF(520)/Y(520) direction", () => {
    const c = rgbCmf(520),
        Y = luma(c);
    const e = [-1.38, 1.81, -0.07];
    for (let i = 0; i < 3; i++) {
        near(c[i] / Y, e[i], 0.03, `channel ${i}`);
    }
});

test("S5 gamutMapLuma of the 520 nm colour", () => {
    const m = gamutMapLuma([-1.0, 1.32, -0.05], LUMA_SRGB);
    near(m[0], 0, 0.01, "R");
    near(m[1], 0.974, 0.01, "G");
    near(m[2], 0.4, 0.01, "B");
    near(luma(m), luma([-1.0, 1.32, -0.05]), 1e-12, "luminance preserved");
    assert.deepEqual(gamutMapLuma([0.2, 0.5, 0.1], LUMA_SRGB), [0.2, 0.5, 0.1]); // in gamut: unchanged
    assert.deepEqual(gamutMapLuma([-1, 0.1, 0.1], LUMA_SRGB), [0, 0, 0]); // Y ≤ 0: black
});

/** The former hard projection S = Y − min c (R02 §3.7), kept here to show what the 1.5-norm fixes. */
function hardGamutMap(c: Vec3, w: Vec3): Vec3 {
    const Y = luma(c, w),
        mn = Math.min(c[0], c[1], c[2]);
    if (Y <= 0) {
        return [0, 0, 0];
    }
    if (mn >= 0) {
        return c;
    }
    const k = Y / (Y - mn);
    return [Y + (c[0] - Y) * k, Y + (c[1] - Y) * k, Y + (c[2] - Y) * k];
}

test("gamutMapLuma is C¹ where two channels are clipped (no cusp at the blue primary's hue)", () => {
    // R = G < 0 (the blue primary's hue): the hard projection switches its clipped channel there and its derivative jumps
    const probe = (g: (c: Vec3) => Vec3, d: number): Vec3 =>
        g([-0.3 + d, -0.3 - d, 6]);
    const soft = (c: Vec3) => gamutMapLuma(c, LUMA_SRGB),
        hard = (c: Vec3) => hardGamutMap(c, LUMA_SRGB);
    for (const h of [1e-3, 1e-4]) {
        const kink = (g: (c: Vec3) => Vec3) => {
            const a = probe(g, h),
                o = probe(g, 0),
                b = probe(g, -h);
            return Math.max(
                ...[0, 1, 2].map((i) =>
                    Math.abs((a[i] - o[i]) / h - (o[i] - b[i]) / h),
                ),
            );
        };
        assert.ok(
            kink(soft) < 20 * h,
            `one-sided slopes differ by ${kink(soft)} at h = ${h}`,
        );
        assert.ok(
            kink(hard) > 0.5,
            `the hard projection has its cusp (${kink(hard)})`,
        );
    }
    // a bright band along the spectral locus (luminance 1.5) at 0.05 nm steps over 440–490 nm: no single-step spike of
    // the second difference (the hard projection: 0.117 at 463 nm, where R = G < 0)
    const d2 = (g: (c: Vec3) => Vec3) => {
        const out: Vec3[] = [];
        for (let i = 0; i <= 1000; i++) {
            const c = rgbCmf(440 + 0.05 * i),
                Y = luma(c);
            out.push(g([(1.5 * c[0]) / Y, (1.5 * c[1]) / Y, (1.5 * c[2]) / Y]));
        }
        let m = 0;
        for (let i = 1; i < out.length - 1; i++) {
            for (let k = 0; k < 3; k++) {
                m = Math.max(
                    m,
                    Math.abs(out[i + 1][k] - 2 * out[i][k] + out[i - 1][k]),
                );
            }
        }
        return m;
    };
    assert.ok(d2(soft) < 0.02, `soft second difference ${d2(soft)}`);
    assert.ok(d2(hard) > 0.1, `hard second difference ${d2(hard)}`);
});

test("gamutMapLuma: luminance and chroma direction kept, channels ≥ 0, identical to the hard projection for one clipped channel", () => {
    let s = 12345;
    const rnd = () =>
        (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (const w of [LUMA_SRGB, LUMA_P3]) {
        for (let n = 0; n < 2000; n++) {
            const c: Vec3 = [4 * rnd() - 1.5, 4 * rnd() - 1.5, 4 * rnd() - 1.5];
            const Y = luma(c, w),
                m = gamutMapLuma(c, w);
            if (Y <= 0) {
                assert.deepEqual(m, [0, 0, 0]);
                continue;
            }
            near(luma(m, w), Y, 1e-12 * Math.max(1, Y), "luminance");
            for (let i = 0; i < 3; i++) {
                assert.ok(m[i] >= -1e-12, `channel ${i} of ${c} → ${m}`);
            }
            if (Math.min(...c) >= 0) {
                assert.deepEqual(m, [...c]);
                continue;
            }
            // m − Y = k·(c − Y) with one k ∈ (0, 1] (a pull toward the grey of equal luminance: hue kept)
            const j = [0, 1, 2].reduce(
                (a, b) => (Math.abs(c[b] - Y) > Math.abs(c[a] - Y) ? b : a),
                0,
            );
            const k = (m[j] - Y) / (c[j] - Y);
            assert.ok(k > 0 && k <= 1 + 1e-12, `k = ${k}`);
            for (let i = 0; i < 3; i++) {
                near(m[i] - Y, k * (c[i] - Y), 1e-9, `collinear ${i}`);
            }
            if (c.filter((x) => x < 0).length === 1) {
                const h = hardGamutMap(c, w);
                for (let i = 0; i < 3; i++) {
                    near(m[i], h[i], 1e-12, `one clipped channel ${i}`);
                }
            }
        }
    }
});

test("S6 SPDs are luminance-normalised; spdRgb", () => {
    const iy = integrate1((l) => xyzBar(l)[1], 360, 830, 0.25);
    for (const id of SPD_IDS) {
        const r =
            integrate1((l) => spd(id, l) * xyzBar(l)[1], 360, 830, 0.25) / iy;
        near(r, 1, 1e-3, `∫S·ȳ/∫ȳ for ${id}`);
        for (let l = 360; l <= 830; l += 5) {
            assert.ok(spd(id, l) > 0, `${id} positive at ${l}`);
        }
    }
    const e = spdRgb("equal");
    for (let c = 0; c < 3; c++) {
        near(e[c], 1, 1e-3, `spdRgb(equal)[${c}]`);
    }
    const t = spdRgb("tungsten");
    assert.ok(t[0] > t[1] && t[1] > t[2], `tungsten R > G > B: ${t}`);
    const d = spdRgb("daylight");
    assert.ok(
        Math.abs(d[0] - d[2]) < 0.1 && d[1] > 0.95,
        `5600 K near white: ${d}`,
    );
    for (const id of SPD_IDS) {
        near(luma(spdRgb(id)), 1, 0.02, `luminance of spdRgb(${id})`);
    }
});

test("tint T² and material factor (§4.2.6, §3.2, §3.3)", () => {
    assert.equal(tintT2(400, CLEAR), 1);
    // §3.2 gold dye: 0.29 / 0.40 / 0.47 / 0.62 / 0.78 / 0.96 at 450 / 470 / 480 / 500 / 520 / 550 nm
    const gold: [number, number][] = [
        [450, 0.29],
        [470, 0.4],
        [480, 0.47],
        [500, 0.62],
        [520, 0.78],
        [550, 0.96],
    ];
    for (const [l, v] of gold) {
        near(tintT2(l, GOLD), v, 0.01, `gold T² at ${l}`);
    }
    // §3.3 blue dye: ≥ 0.98 below 500, 0.68 at 520, 0.28 at 540, 0.15 beyond 560
    assert.ok(tintT2(499, BLUE) >= 0.98);
    near(tintT2(520, BLUE), 0.68, 0.01, "blue T² 520");
    near(tintT2(540, BLUE), 0.28, 0.01, "blue T² 540");
    near(tintT2(560, BLUE), 0.15, 1e-9, "blue T² 560");
    // §2.1 R_Al ≈ 0.889 / 0.876 / 0.864 at 450 / 550 / 650 nm; clamped outside 380–780
    near(rAl(450), 0.889, 1e-9, "R_Al 450");
    near(rAl(550), 0.8765, 1e-9, "R_Al 550");
    near(rAl(650), 0.864, 1e-9, "R_Al 650");
    assert.equal(rAl(300), rAl(380));
    assert.equal(rAl(900), rAl(780));
    const rho = materialFactor(GOLD);
    near(
        rho(500),
        rAl(500) * tintT2(500, GOLD),
        1e-15,
        "materialFactor = R_Al·T²",
    );
});

// ---------------------------------------------------------------------------------------------------------------
// Tables (§4.2.3)
// ---------------------------------------------------------------------------------------------------------------

const LAYERS = new Map<string, { conv: Float32Array; cum: Float32Array }>();
function layer(
    id: SpdId,
    which: "one" | "gold" | "clear",
): { conv: Float32Array; cum: Float32Array } {
    const key = `${id}/${which}`;
    let t = LAYERS.get(key);
    if (!t) {
        t = buildCmfLayer(
            id,
            which === "one"
                ? ONE
                : materialFactor(which === "gold" ? GOLD : CLEAR),
        );
        LAYERS.set(key, t);
    }
    return t;
}

test("table layout constants and addressing", () => {
    assert.deepEqual(
        { ...CMF_TABLE },
        { lambda0: 300, dLambda: 2, width: 512, rows: 41, layers: 5 },
    );
    near(sigmaOfRow(0), 0.5, 1e-12, "σ_0");
    near(sigmaOfRow(40), 512, 1e-9, "σ_40");
    near(sigmaOfRow(32), 128, 1e-9, "σ_32");
    near(texelLambda(0), 301, 0, "texel 0");
    near(texelLambda(511), 1323, 0, "texel 511");
    for (let j = 0; j < 41; j++) {
        near(rowOfSigma(sigmaOfRow(j)), j, 1e-9, `row of σ_${j}`);
    }
    near(rowOfSigma(0.1), 0, 0, "σ clamp low");
    near(rowOfSigma(9999), 40, 0, "σ clamp high");
    const { conv, cum } = layer("equal", "one");
    assert.equal(conv.length, 512 * 41 * 4);
    assert.equal(cum.length, 512 * 41 * 4);
    for (let k = 3; k < conv.length; k += 4) {
        assert.equal(conv[k], 1);
        assert.equal(cum[k], 1);
    }
    for (const v of conv) {
        assert.ok(Number.isFinite(v));
    }
    // sampleCmfTable at a texel centre and an exact row returns that texel: index (row·512 + texel)·4
    const j = 20,
        i = 127,
        s = sampleCmfTable(conv, texelLambda(i), sigmaOfRow(j));
    for (let c = 0; c < 3; c++) {
        near(
            s[c],
            conv[(j * 512 + i) * 4 + c],
            1e-9,
            `texel (${j}, ${i}) channel ${c}`,
        );
    }
    // the luminance of the cumulative table is monotone (luma·rgbCMF ≥ 0, unlike the single channels: G < 0 near 440 nm)
    const lumAt = (jj: number, ii: number): number =>
        luma([
            cum[(jj * 512 + ii) * 4],
            cum[(jj * 512 + ii) * 4 + 1],
            cum[(jj * 512 + ii) * 4 + 2],
        ]);
    for (let jj = 0; jj < 41; jj += 4) {
        for (let ii = 1; ii < 512; ii++) {
            assert.ok(
                lumAt(jj, ii) >= lumAt(jj, ii - 1) - 1e-6,
                `luminance of C non-decreasing (row ${jj}, texel ${ii})`,
            );
        }
    }
});

test("S7 table sum rules for every layer (ρ ≡ 1 and gold), rows σ ≤ 32 nm", () => {
    for (const which of ["one", "gold"] as const) {
        const rho = which === "one" ? ONE : materialFactor(GOLD);
        for (const id of SPD_IDS) {
            const f = foilRgb(id, rho);
            const { conv, cum } = layer(id, which);
            for (let j = 0; j < 41 && sigmaOfRow(j) <= 32 + 1e-9; j++) {
                const s: [number, number, number] = [0, 0, 0];
                for (let i = 0; i < 512; i++) {
                    for (let c = 0; c < 3; c++) {
                        s[c] += conv[(j * 512 + i) * 4 + c] * 2;
                    }
                }
                for (let c = 0; c < 3; c++) {
                    near(
                        s[c],
                        f[c],
                        0.01 * Math.abs(f[c]),
                        `${id}/${which} row ${j} Σ Ĉ·2 nm channel ${c}`,
                    );
                    near(
                        cum[(j * 512 + 511) * 4 + c],
                        f[c],
                        1e-3,
                        `${id}/${which} row ${j} C(texel 511) channel ${c}`,
                    );
                }
            }
        }
    }
});

test("S8 environment bins: Σ W′ = I (ρ ≡ 1), ≈ 0.876·I with clear Al", () => {
    for (const K of [6, 8] as const) {
        const b = buildBins(K, ONE);
        assert.equal(b.lambda.length, K);
        assert.equal(b.W.length, 9 * K);
        near(b.width, 300 / K, 1e-12, "width");
        for (let j = 0; j < K; j++) {
            near(b.lambda[j], 400 + (j + 0.5) * (300 / K), 1e-4, `λ_${j}`);
        }
        const sum = (W: Float32Array, r: number, c: number): number => {
            let s = 0;
            for (let j = 0; j < K; j++) {
                s += W[9 * j + 3 * c + r]; // column-major
            }
            return s;
        };
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                near(
                    sum(b.W, r, c),
                    r === c ? 1 : 0,
                    1e-6,
                    `K=${K} ΣW′[${r}][${c}]`,
                );
            }
        }
        const m = buildBins(K, materialFactor(CLEAR));
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                near(
                    sum(m.W, r, c),
                    r === c ? 0.876 : 0,
                    0.02,
                    `K=${K} Al ΣW′[${r}][${c}]`,
                );
            }
        }
    }
    const B = binBases(550);
    near(B[0] + B[1] + B[2], 1, 1e-12, "bases are a partition of unity");
    assert.deepEqual([...binBases(450)], [0, 0, 1]);
    assert.deepEqual([...binBases(650)], [1, 0, 0]);
});

test("S9 spectral projection: M·(1,1,1,1) = foilRgb; M1 zeroth order within 1 %", () => {
    assert.deepEqual([...SPEC_NODES], [430, 510, 590, 670]);
    for (const l of [380, 430, 455, 510, 600, 670, 700, 800]) {
        const b = specBasis(l);
        near(b[0] + b[1] + b[2] + b[3], 1, 1e-12, `Σℓ at ${l}`);
    }
    SPEC_NODES.forEach((n, k) =>
        specBasis(n).forEach((v, m) =>
            near(v, k === m ? 1 : 0, 1e-12, `ℓ_${m}(${n})`),
        ),
    );
    const f = mirrorFactor(50, 1, 1.07);
    const fNodes = SPEC_NODES.map((l) => f(l));
    for (const t of [CLEAR, GOLD, BLUE]) {
        const rho = materialFactor(t);
        for (const id of SPD_IDS) {
            const M = buildSpecProj(id, rho);
            assert.equal(M.length, 16);
            for (let k = 0; k < 4; k++) {
                assert.equal(M[4 * k + 3], 0);
            }
            const p = specProject(M, [1, 1, 1, 1]),
                fr = foilRgb(id, rho);
            for (let c = 0; c < 3; c++) {
                near(p[c], fr[c], 1e-6, `${id}/${t.type} M·1 channel ${c}`);
            }
            if (t === CLEAR) {
                const proj = specProject(M, fNodes);
                const ref = integrate3(
                    (l) => scaleV(rgbCmf(l), spd(id, l) * rho(l) * f(l)),
                    360,
                    830,
                    1,
                );
                for (let c = 0; c < 3; c++) {
                    near(
                        proj[c],
                        ref[c],
                        0.01 * Math.abs(ref[c]),
                        `${id} M1 zeroth order channel ${c}`,
                    );
                }
            }
        }
    }
});

test("S10 tri-phosphor lines at σ = 0.5 nm", () => {
    const { conv } = layer("triphosphor", "one");
    const lum = (i: number): number =>
        luma([conv[i * 4], conv[i * 4 + 1], conv[i * 4 + 2]]);
    const maxima: number[] = [];
    for (let i = 1; i < 511; i++) {
        if (lum(i) > lum(i - 1) && lum(i) >= lum(i + 1)) {
            maxima.push(texelLambda(i));
        }
    }
    for (const l0 of [436, 546, 611]) {
        assert.ok(
            maxima.some((m) => Math.abs(m - l0) <= 2),
            `local luminance maximum near ${l0} nm (maxima ${maxima.join(", ")})`,
        );
    }
});

test("S12 Ĉ at σ = 300 nm (row interpolation) vs a direct Gaussian × CMF integral", () => {
    for (const which of ["one", "gold"] as const) {
        const rho = which === "one" ? ONE : materialFactor(GOLD);
        const { conv } = layer("equal", which);
        for (const lam of [450, 556, 650, 900]) {
            const t = sampleCmfTable(conv, lam, 300);
            const sg = 300;
            const d = integrate3(
                (l) =>
                    scaleV(
                        rgbCmf(l),
                        (rho(l) * Math.exp(-0.5 * ((l - lam) / sg) ** 2)) /
                            (Math.sqrt(2 * Math.PI) * sg),
                    ),
                360,
                830,
                0.25,
            );
            const big = Math.max(...d.map(Math.abs));
            for (let c = 0; c < 3; c++) {
                near(t[c], d[c], 0.01 * big, `${which} λ* ${lam} channel ${c}`);
            }
        }
    }
});

test("table accuracy at exact rows: Ĉ and cumulative differences vs direct integrals", () => {
    const rho = materialFactor(GOLD);
    const { conv, cum } = layer("equal", "gold");
    for (const j of [0, 8, 13, 20, 26, 32, 36, 40]) {
        const sg = sigmaOfRow(j);
        let big = 0;
        const rows: [number, Vec3][] = [];
        for (const i of [60, 100, 125, 150, 175, 200, 250]) {
            const lam = texelLambda(i);
            const d = integrate3(
                (l) =>
                    scaleV(
                        rgbCmf(l),
                        (rho(l) * Math.exp(-0.5 * ((l - lam) / sg) ** 2)) /
                            (Math.sqrt(2 * Math.PI) * sg),
                    ),
                360,
                830,
                Math.min(0.05, sg / 10),
            );
            big = Math.max(big, ...d.map(Math.abs));
            rows.push([i, d]);
        }
        for (const [i, d] of rows) {
            for (let c = 0; c < 3; c++) {
                near(
                    conv[(j * 512 + i) * 4 + c],
                    d[c],
                    2e-3 * big,
                    `Ĉ row ${j} texel ${i} channel ${c}`,
                );
            }
        }
    }
    // C(λb) − C(λa) at an exact row = ∫ ρ·rgbCMF·[Φ((λb − λ′)/σ) − Φ((λa − λ′)/σ)] dλ′
    const erf = (x: number): number => {
        // Abramowitz–Stegun 7.1.26 is not enough here; use a series/continued fraction
        const t = Math.abs(x);
        if (t < 3) {
            let s = t,
                term = t;
            for (let n = 1; n < 80; n++) {
                term *= (-t * t) / n;
                s += term / (2 * n + 1);
            }
            return Math.sign(x) * (2 / Math.sqrt(Math.PI)) * s;
        }
        let cf = 0;
        for (let n = 60; n >= 1; n--) {
            cf = n / 2 / (t + cf);
        }
        return (
            Math.sign(x) *
            (1 - Math.exp(-t * t) / (Math.sqrt(Math.PI) * (t + cf)))
        );
    };
    const Phi = (x: number): number => 0.5 * (1 + erf(x / Math.SQRT2));
    for (const j of [10, 21, 30]) {
        const sg = sigmaOfRow(j),
            ia = 89,
            ib = 159,
            la = texelLambda(ia),
            lb = texelLambda(ib);
        const d = integrate3(
            (l) =>
                scaleV(
                    rgbCmf(l),
                    rho(l) * (Phi((lb - l) / sg) - Phi((la - l) / sg)),
                ),
            360,
            830,
            0.05,
        );
        for (let c = 0; c < 3; c++) {
            const t = cum[(j * 512 + ib) * 4 + c] - cum[(j * 512 + ia) * 4 + c];
            near(
                t,
                d[c],
                2e-4 + 1e-3 * Math.abs(d[c]),
                `ΔC row ${j} channel ${c}`,
            );
        }
    }
});

// ---------------------------------------------------------------------------------------------------------------
// S13–S15: colours through the tables, build time
// ---------------------------------------------------------------------------------------------------------------

test("S13 mirror body colours (Q15)", (_t) => {
    const m1 = mirrorColour(CLEAR, mirrorFactor(50, 1, 1.07));
    const m2 = mirrorColour(GOLD, mirrorFactor(95, 0.7, 1.2));
    const m3 = mirrorColour(BLUE, mirrorFactor(100, 0.65, 1.22));
    const lab1 = linearSrgbToLab(m1),
        lab1h = linearSrgbToLab(scaleV(m1, 1 / Math.max(...m1)));
    assert.ok(chroma(lab1) <= 13, `M1 C*ab ${chroma(lab1)}`);
    assert.ok(
        chroma(lab1h) <= 13,
        `M1 C*ab at highlight luminance ${chroma(lab1h)}`,
    );
    near(m1[1] / m1[0], 0.9, 0.02, "M1 G/R (computed 0.90)");
    near(m1[2] / m1[0], 0.73, 0.02, "M1 B/R (computed 0.73)");
    const gr = m2[1] / m2[0],
        br = m2[2] / m2[0];
    assert.ok(gr >= 0.64 && gr <= 0.72, `M2 G/R ${gr}`);
    assert.ok(br >= 0.09 && br <= 0.17, `M2 B/R ${br}`);
    near(luma(m2), 0.38, 0.02, "M2 mirror Y (computed 0.38)");
    const h3 = hueDeg(linearSrgbToLab(m3));
    void `M1 C*ab ${chroma(lab1).toFixed(1)} (${chroma(lab1h).toFixed(1)} at highlight), G/R ${(m1[1] / m1[0]).toFixed(3)}, B/R ${(m1[2] / m1[0]).toFixed(3)}; M2 G/R ${gr.toFixed(3)}, B/R ${br.toFixed(3)}, Y ${luma(m2).toFixed(3)}; M3 hue ${h3.toFixed(1)}°`;
    assert.ok(h3 >= 250 && h3 <= 270, `M3 hue ${h3}`);
    // the same colours through the tables' spectral projection agree (the shader path)
    for (const [t, f, ref] of [
        [CLEAR, mirrorFactor(50, 1, 1.07), m1],
        [GOLD, mirrorFactor(95, 0.7, 1.2), m2],
        [BLUE, mirrorFactor(100, 0.65, 1.22), m3],
    ] as const) {
        const p = specProject(
            buildSpecProj("equal", materialFactor(t)),
            SPEC_NODES.map((l) => f(l)),
        );
        assert.ok(
            deltaE76(linearSrgbToLab(p), linearSrgbToLab(ref)) <= 1,
            `${t.type} projected mirror ΔE`,
        );
    }
});

test("S14 table path vs 0.5 nm brute force: gold mirror and gold lobes", (_t) => {
    // (a) gold M2 mirror via specProject
    const f = mirrorFactor(95, 0.7, 1.2);
    const M = buildSpecProj("equal", materialFactor(GOLD));
    const p = specProject(
        M,
        SPEC_NODES.map((l) => f(l)),
    );
    const ref = mirrorColour(GOLD, f, 0.5);
    const dA = deltaE76(linearSrgbToLab(p), linearSrgbToLab(ref));
    assert.ok(dA <= 1, `(a) gold mirror ΔE*ab ${dA}`);
    const diag: string[] = [`(a) ΔE ${dA.toFixed(2)}`];
    // (b) the lobe Ĉ(λ*, 128 nm)·η(λ*) with the gold factor: table lookup vs the brute-force integral of the same formula,
    // η(λ*)·∫ ρ·rgbCMF·N(λ′; λ*, 128) dλ′ (§4.4.3 evaluates η at λ*; ρ_M is integrated exactly by the table)
    const rho = materialFactor(GOLD),
        { conv } = layer("equal", "gold"),
        plain = layer("equal", "one").conv;
    const eta = (l: number): number => orderEff(1, l, 95, 1.5, 1, 1);
    const sg = 128;
    let oldRuleWorst = 0;
    for (const lam of [450, 500, 560]) {
        const gaussAt = (l: number): number =>
            Math.exp(-0.5 * ((l - lam) / sg) ** 2) /
            (Math.sqrt(2 * Math.PI) * sg);
        const bf = scaleV(
            integrate3(
                (l) => scaleV(rgbCmf(l), rho(l) * gaussAt(l)),
                360,
                830,
                0.5,
            ),
            eta(lam),
        );
        const tab = scaleV(sampleCmfTable(conv, lam, sg), eta(lam));
        const k = 1 / Math.max(...bf); // compare at highlight luminance (brightest channel → 1)
        const dB = deltaE76(
            linearSrgbToLab(scaleV(tab, k)),
            linearSrgbToLab(scaleV(bf, k)),
        );
        assert.ok(dB <= 2, `(b) lobe at ${lam} nm ΔE*ab ${dB}`);
        diag.push(`(b) ${lam} nm ΔE ${dB.toFixed(2)}`);
        const old = scaleV(sampleCmfTable(plain, lam, sg), eta(lam) * rho(lam)); // revision-1 rule: tint at λ*
        oldRuleWorst = Math.max(
            oldRuleWorst,
            deltaE76(
                linearSrgbToLab(scaleV(old, k)),
                linearSrgbToLab(scaleV(bf, k)),
            ),
        );
        // Informational bound on the shader's own approximation, η taken at λ* while it varies over a 128 nm lobe
        // (R02 §3.4, §4.4.3): with η(λ) inside the integral the difference is ≈ 4–5 ΔE*ab at highlight luminance.
        const bfEta = integrate3(
            (l) => scaleV(rgbCmf(l), eta(l) * rho(l) * gaussAt(l)),
            360,
            830,
            0.5,
        );
        const kE = 1 / Math.max(...bfEta);
        const dEta = deltaE76(
            linearSrgbToLab(scaleV(tab, kE)),
            linearSrgbToLab(scaleV(bfEta, kE)),
        );
        assert.ok(dEta <= 6, `η-at-λ* approximation at ${lam} nm`);
        diag.push(`η(λ) inside: ${dEta.toFixed(2)}`);
    }
    assert.ok(
        oldRuleWorst > 10,
        `the revision-1 "tint at λ*" rule must be visibly wrong (ΔE ${oldRuleWorst})`,
    );
    void `${diag.join("; ")}; revision-1 rule worst ΔE ${oldRuleWorst.toFixed(0)}`;
});
