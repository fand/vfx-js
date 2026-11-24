import assert from "node:assert/strict";
import { test } from "node:test";
import { gaussianKernel } from "../lib/esm/_saber-blur.js";

function expand({ weights, offsets }) {
    const taps = new Float64Array(25);
    taps[12] = weights[0];
    for (let i = 0; i < offsets.length; i++) {
        const position = offsets[i];
        const index = Math.floor(position);
        const fraction = position - index;
        for (const side of [-1, 1]) {
            taps[12 + side * index] += weights[i + 1] * (1 - fraction);
            if (fraction > 0) {
                taps[12 + side * (index + 1)] += weights[i + 1] * fraction;
            }
        }
    }
    return taps;
}

test("paired blur taps preserve Gaussian energy, symmetry and variance", () => {
    for (const sigma of [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3]) {
        const taps = expand(gaussianKernel(sigma));
        const mass = taps.reduce((a, b) => a + b, 0);
        assert.ok(
            Math.abs(mass - 1) < 0.0001,
            `mass at sigma ${sigma}: ${mass}`,
        );
        let variance = 0;
        for (let i = 0; i < taps.length; i++) {
            assert.ok(Number.isFinite(taps[i]) && taps[i] >= 0);
            assert.equal(taps[i], taps[taps.length - 1 - i]);
            variance += (i - 12) ** 2 * taps[i];
            if (i > 12) {
                // Bilinear offsets are float32; vanishing tails can round to a
                // texel center. Only differences above that precision matter.
                assert.ok(
                    taps[i] <= taps[i - 1] + 1e-7,
                    `secondary peak at sigma ${sigma}, tap ${i - 12}`,
                );
            }
        }
        if (sigma >= 1) {
            assert.ok(Math.abs(variance / mass / sigma ** 2 - 1) < 0.001);
        }
    }
});

test("very wide clipped kernels retain their infinite-Gaussian normalization", () => {
    for (const sigma of [4, 16, 128, 1024]) {
        const { weights } = gaussianKernel(sigma);
        assert.ok(
            Math.abs(weights[0] * sigma * Math.sqrt(2 * Math.PI) - 1) < 1e-6,
        );
        assert.ok(weights.every((x) => Number.isFinite(x) && x >= 0));
    }
});
