// Ported from holospot engine/scene/relief.ts (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.
// Analytic relief waves (spec §4.9; R03 §6.3, §7). Pure module: no three, no DOM (§6.1), so `node --test` runs it.
//
// Output layout (`uWave[32]`, one vec4 per wave): (f_x, f_y) in cycles/mm, amplitude A in mm, phase in cycles ∈ [0, 1).
// Height h = A·sin(2π(f·p + φ)); the shader differentiates and prefilters it exactly (relief.glsl `wavesSlope`).
//   board range (`uWaveBoard`): board/film waviness, Λ log-uniform in 8–40 mm, A ∝ Λ^1.5, scaled so that the RMS slope
//     magnitude √(Σ(2πA_k/Λ_k)²/2) = radians(waviness); plus the emboss waves when the emboss layer is the foil.
//   coat range (`uWaveCoat`): orange peel of the gloss coat, Λ log-uniform in 0.5–5 mm, A ∝ Λ^1.5, scaled so that the
//     RMS height √(ΣA_k²/2) = orange peel × 10⁻³ mm; plus the emboss waves when the emboss layer is the varnish.
import type { ReliefInputs } from "../types.js";

export interface EmbossInputs {
    emboss: "none" | "lines" | "crosshatch";
    pitchMm: number;
    heightUm: number; // peak-to-valley
    layer: "foil" | "varnish";
}
export interface WaveSet {
    data: Float32Array;
    board: [number, number];
    coat: [number, number];
}

export const MAX_WAVES = 32;
export const WAVINESS_LAMBDA_MM: readonly [number, number] = [8, 40];
export const ORANGE_PEEL_LAMBDA_MM: readonly [number, number] = [0.5, 5];
const SPECTRAL_EXPONENT = 1.5; // A ∝ Λ^1.5 (R03 §6.3: β ≈ 1–2)

/** Seeded mulberry32 (§6.1 determinism): uniform numbers in [0, 1). */
export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Independent stream per (seed, salt), so the board waves do not change when the tier changes the coat count. */
function stream(seed: number, salt: number): () => number {
    const s =
        (Math.imul((seed | 0) ^ 0x5bd1e995, 0x9e3779b1) ^
            Math.imul(salt, 0x85ebca6b)) >>>
        0;
    return mulberry32(s);
}

interface RawWave {
    fx: number;
    fy: number;
    lambda: number;
    phase: number;
}

/** n waves with stratified log-uniform wavelengths and stratified, randomly paired directions (both still
 *  log-uniform / uniform in distribution, but no seed can collapse all waves onto one scale or one direction). */
function randomWaves(
    n: number,
    lamMin: number,
    lamMax: number,
    rnd: () => number,
): RawWave[] {
    const out: RawWave[] = [];
    if (n <= 0) {
        return out;
    }
    const perm = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
        // Fisher–Yates: pair direction strata with scale strata
        const j = Math.floor(rnd() * (i + 1));
        const t = perm[i];
        perm[i] = perm[j];
        perm[j] = t;
    }
    const logSpan = Math.log(lamMax / lamMin);
    for (let k = 0; k < n; k++) {
        const lambda = lamMin * Math.exp((logSpan * (k + rnd())) / n);
        const theta = (Math.PI * (perm[k] + rnd())) / n; // a sinusoid's direction is defined modulo π
        let phase = rnd();
        if (!(phase >= 0 && phase < 1)) {
            phase = 0;
        }
        out.push({
            fx: Math.cos(theta) / lambda,
            fy: Math.sin(theta) / lambda,
            lambda,
            phase,
        });
    }
    return out;
}

function embossWaves(e: EmbossInputs): { fx: number; fy: number; A: number }[] {
    const P = e.pitchMm,
        A = 0.5 * Math.max(0, e.heightUm) * 1e-3; // peak-to-valley µm → amplitude mm
    if (e.emboss === "none" || !(P > 0) || !(A > 0)) {
        return [];
    }
    if (e.emboss === "lines") {
        return [{ fx: 0, fy: 1 / P, A }];
    }
    const c = Math.SQRT1_2 / P; // (1/P)(cos 45°, sin 45°), (1/P)(cos 135°, sin 135°)
    return [
        { fx: c, fy: c, A },
        { fx: -c, fy: c, A },
    ];
}

/** Builds the 32-wave table of §4.9 (data length 128; phases in cycles ∈ [0, 1); total waves ≤ 32). */
export function buildWaves(
    r: ReliefInputs,
    card: EmbossInputs,
    counts: { board: number; coat: number },
): WaveSet {
    const data = new Float32Array(4 * MAX_WAVES);
    const emb = embossWaves(card);
    const wavDeg = Math.max(
        0,
        Number.isFinite(r.wavinessDeg) ? r.wavinessDeg : 0,
    );
    const peelUm = Math.max(
        0,
        Number.isFinite(r.orangePeelUm) ? r.orangePeelUm : 0,
    );
    let nBoard = wavDeg > 0 ? Math.max(0, Math.floor(counts.board)) : 0;
    let nCoat = peelUm > 0 ? Math.max(0, Math.floor(counts.coat)) : 0;
    const nEmb = emb.length;
    while (nBoard + nCoat + nEmb > MAX_WAVES) {
        // never exceed the uniform array (coat first)
        if (nCoat > nBoard) {
            nCoat--;
        } else {
            nBoard--;
        }
    }

    let k = 0;
    const put = (fx: number, fy: number, A: number, phase: number) => {
        data[4 * k] = fx;
        data[4 * k + 1] = fy;
        data[4 * k + 2] = A;
        data[4 * k + 3] = phase;
        k++;
    };

    // Board waviness: A_k = c·Λ_k^1.5, RMS slope magnitude² = Σ(2πA_k/Λ_k)²/2 = 2π²c²·ΣΛ_k^(2β−2).
    const board = randomWaves(
        nBoard,
        WAVINESS_LAMBDA_MM[0],
        WAVINESS_LAMBDA_MM[1],
        stream(r.seed, 1),
    );
    if (board.length) {
        let s = 0;
        for (const w of board) {
            s += w.lambda ** (2 * SPECTRAL_EXPONENT - 2);
        }
        const c =
            (wavDeg * Math.PI) / 180 / Math.sqrt(2 * Math.PI * Math.PI * s);
        for (const w of board) {
            put(w.fx, w.fy, c * w.lambda ** SPECTRAL_EXPONENT, w.phase);
        }
    }
    if (card.layer === "foil") {
        for (const e of emb) {
            put(e.fx, e.fy, e.A, 0);
        }
    }
    const boardRange: [number, number] = [0, k];

    // Orange peel: A_k = c·Λ_k^1.5, RMS height² = ΣA_k²/2 = c²·ΣΛ_k^(2β)/2.
    const coat = randomWaves(
        nCoat,
        ORANGE_PEEL_LAMBDA_MM[0],
        ORANGE_PEEL_LAMBDA_MM[1],
        stream(r.seed, 2),
    );
    if (coat.length) {
        let s = 0;
        for (const w of coat) {
            s += w.lambda ** (2 * SPECTRAL_EXPONENT);
        }
        const c = peelUm * 1e-3 * Math.sqrt(2 / s);
        for (const w of coat) {
            put(w.fx, w.fy, c * w.lambda ** SPECTRAL_EXPONENT, w.phase);
        }
    }
    if (card.layer === "varnish") {
        for (const e of emb) {
            put(e.fx, e.fy, e.A, 0);
        }
    }
    const coatRange: [number, number] = [boardRange[1], k - boardRange[1]];

    return { data, board: boardRange, coat: coatRange };
}

/** RMS slope magnitude √(Σ(2πA_k|f_k|)²/2) of a range of the table (for tests and the reflected-edge estimate). */
export function rmsSlope(
    data: Float32Array,
    range: readonly [number, number],
): number {
    let s = 0;
    for (let k = range[0]; k < range[0] + range[1]; k++) {
        const f = Math.hypot(data[4 * k], data[4 * k + 1]);
        s += (2 * Math.PI * data[4 * k + 2] * f) ** 2 / 2;
    }
    return Math.sqrt(s);
}
