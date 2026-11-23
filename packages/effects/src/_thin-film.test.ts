import { describe, expect, test } from "vitest";
import {
    airyReflectance,
    bakeThinFilmLut,
    THIN_FILM_IOR,
    THIN_FILM_LUT_H,
    THIN_FILM_LUT_W,
    THIN_FILM_THICKNESS_MAX,
    thinFilmLut,
} from "./_thin-film.js";

const W = THIN_FILM_LUT_W;
const H = THIN_FILM_LUT_H;

// The texel nearest to a thickness (nm) and an incident cosine.
function at(lut: Float32Array, d: number, cos: number): number[] {
    const i = Math.min(
        Math.max(Math.round((d / THIN_FILM_THICKNESS_MAX) * W - 0.5), 0),
        W - 1,
    );
    const j = Math.min(Math.max(Math.round(cos * H - 0.5), 0), H - 1);
    const o = (j * W + i) * 4;
    return [lut[o], lut[o + 1], lut[o + 2]];
}

// Reflectance of one air / water face at normal incidence.
const R1 = ((THIN_FILM_IOR - 1) / (THIN_FILM_IOR + 1)) ** 2;
// Incoherent sum of all the reflections of a thick film.
const THICK = (2 * R1) / (1 + R1);

describe("thin film", () => {
    test("Airy reflectance: black film at zero thickness, peaks at delta = pi", () => {
        expect(airyReflectance(1, 0)).toBeCloseTo(0, 12);
        const peak = airyReflectance(1, Math.PI);
        expect(peak).toBeCloseTo((4 * R1) / (1 + R1) ** 2, 6);
        // Grazing light is reflected whatever the phase.
        expect(airyReflectance(0.001, 1)).toBeGreaterThan(0.95);
    });

    test("LUT values are finite and >= 0", () => {
        const lut = thinFilmLut();
        expect(lut.length).toBe(W * H * 4);
        const bad = lut.filter((v) => !Number.isFinite(v) || v < 0);
        expect(bad.length).toBe(0);
    });

    test("a film thinner than light is nearly black", () => {
        const lut = thinFilmLut();
        for (const cos of [1, 0.7, 0.4]) {
            const c = at(lut, 0, cos);
            expect(Math.max(...c)).toBeLessThan(1e-3);
        }
    });

    test("colours cycle with thickness", () => {
        const lut = thinFilmLut();
        // Hue of the strongest channel along the first orders: it must
        // change many times, and every channel must take the lead.
        const leads = new Set<number>();
        let changes = 0;
        let prev = -1;
        for (let d = 150; d <= 900; d += 10) {
            const c = at(lut, d, 1);
            const lead = c.indexOf(Math.max(...c));
            leads.add(lead);
            if (prev !== -1 && lead !== prev) {
                changes++;
            }
            prev = lead;
        }
        expect(leads.size).toBe(3);
        expect(changes).toBeGreaterThanOrEqual(6);
        // And they are saturated: far from grey on a first-order fringe.
        const c = at(lut, 300, 1);
        expect(Math.max(...c) / Math.max(Math.min(...c), 1e-6)).toBeGreaterThan(
            1.5,
        );
    });

    test("a thick film averages to the grey Fresnel value", () => {
        const lut = thinFilmLut();
        const sum = [0, 0, 0];
        let n = 0;
        for (let d = 1000; d < THIN_FILM_THICKNESS_MAX; d += 2) {
            const c = at(lut, d, 1);
            for (let k = 0; k < 3; k++) {
                sum[k] += c[k];
            }
            n++;
        }
        for (let k = 0; k < 3; k++) {
            expect(sum[k] / n).toBeGreaterThan(THICK * 0.85);
            expect(sum[k] / n).toBeLessThan(THICK * 1.15);
        }
    });

    test("bakes fast enough for init, and is cached", () => {
        const t0 = performance.now();
        bakeThinFilmLut();
        const ms = performance.now() - t0;
        console.log(`thin-film LUT bake: ${ms.toFixed(1)} ms`);
        expect(ms).toBeLessThan(200);
        expect(thinFilmLut()).toBe(thinFilmLut());
    });
});
