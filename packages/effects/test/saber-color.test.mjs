import assert from "node:assert/strict";
import { test } from "node:test";
import { saberColorRamp } from "../lib/esm/_saber-color.js";

function sample(color, light) {
    const ramp = saberColorRamp(color),
        x = Math.sqrt(light) * 32;
    const i = Math.min(31, Math.floor(x)),
        f = x - i;
    return [0, 1, 2].map(
        (c) => ramp[3 * i + c] * (1 - f) + ramp[3 * (i + 1) + c] * f,
    );
}

test("color response matches held-out AE core probes", () => {
    // Independent Core-only frames, Brightness .5; not used to fit the palette.
    const cases = [
        [
            [1, 0, 0],
            [65535, 18789, 18789],
        ],
        [
            [0, 0, 1],
            [28549, 28549, 65535],
        ],
        [
            [0, 0.4, 1],
            [17129, 35827, 58017],
        ],
    ];
    for (const [color, expected] of cases) {
        const rgb = sample(color, 0.5019455253);
        rgb.forEach((value, c) => {
            assert.ok(Math.abs(value - expected[c] / 65535) < 0.02);
        });
    }
});

test("color ramps preserve black, white and neutral grayscale", () => {
    for (const color of [
        [1, 0, 0],
        [0, 0.4, 1],
        [0.3, 0.3, 0.3],
        [1, 1, 1],
    ]) {
        const ramp = saberColorRamp(color);
        assert.equal(ramp.length, 99);
        assert.ok(ramp.every((x) => Number.isFinite(x) && x >= 0 && x <= 1));
        assert.deepEqual(Array.from(ramp.slice(0, 3)), [0, 0, 0]);
        assert.deepEqual(Array.from(ramp.slice(-3)), [1, 1, 1]);
    }
    const ramp = saberColorRamp([0.3, 0.3, 0.3]);
    for (let i = 0; i < 33; i++) {
        for (let c = 0; c < 3; c++) {
            assert.ok(Math.abs(ramp[i * 3 + c] - (i / 32) ** 2) < 1e-7);
        }
    }
});
