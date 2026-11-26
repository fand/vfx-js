import {
    createSaberFixture,
    DistortionProbe,
    STEADY_OPTIONS,
} from "./saber-quality.mjs";

// AE HDR sweeps: a saturated scalar layer is bounded before Multiply. A
// constant half-density diagnostic field isolates ordering from noise shape.
export async function runGlowMaskOrderingChecks() {
    const rows = [],
        failures = [];
    for (const pixelRatio of [1, 2]) {
        let halfMask = true;
        const f = await createSaberFixture({
            width: 256,
            height: 256,
            sourceWidth: 256,
            sourceHeight: 256,
            pixelRatio,
            options: {
                ...STEADY_OPTIONS,
                color: "#ffffff",
                coreIntensity: 0,
                haloIntensity: 0,
                glow: 200,
                pad: 80,
                glowDistortAllLayers: true,
                glowLayers: [
                    { size: 0, intensity: 0 },
                    { size: 20, intensity: 1 },
                    { size: 0, intensity: 0 },
                    { size: 0, intensity: 0 },
                ],
                glowDistortion: {
                    ...STEADY_OPTIONS.glowDistortion,
                    amount: 100,
                    composite: "multiply",
                    windSpeed: 0,
                    noiseSpeed: 0,
                },
            },
            paint: (c) => c.fillRect(127, 0, 2, 256),
            transformDraw: (draw) =>
                draw.uniforms?.glowPass === 1
                    ? {
                          ...draw,
                          frag: draw.frag.replace(
                              "vec2 n = distortionAt(0.0);",
                              halfMask
                                  ? "vec2 n = vec2(1.0, -1.0);"
                                  : "vec2 n = vec2(1.0);",
                          ),
                      }
                    : draw,
        });
        try {
            // One and three saturated layers must both become half light.
            // Masking each layer before Screen incorrectly produces 0.875.
            for (const layerCount of [1, 3]) {
                f.effect.setParams({
                    glowLayers: [
                        { size: 20, intensity: layerCount === 3 ? 1 : 0 },
                        { size: 20, intensity: 1 },
                        { size: 20, intensity: layerCount === 3 ? 1 : 0 },
                        { size: 0, intensity: 0 },
                    ],
                });
                for (const brightness of [0.25, 1, 0.0001, 1]) {
                    f.effect.setParams({ brightness });
                    const s = f.screen(2);
                    const i =
                        ((s.height - 1 - 128 * pixelRatio) * s.width +
                            128 * pixelRatio) *
                        4;
                    const value = s.pixels[i] / 255;
                    const row = {
                        pixelRatio,
                        layerCount,
                        brightness,
                        value,
                        glError: f.gl.getError(),
                    };
                    rows.push(row);
                    if (
                        row.glError ||
                        (brightness >= 0.25
                            ? Math.abs(value - 0.5) > 2 / 255
                            : !(value > 0 && value < 0.49))
                    ) {
                        failures.push(row);
                    }
                }
            }
            // Partial layer protection must not change the unmasked image.
            halfMask = false;
            f.effect.setParams({
                brightness: 1,
                glow: 1,
                glowDistortAllLayers: false,
                glowLayers: [
                    { size: 8, intensity: 1 },
                    { size: 40, intensity: 1 },
                    { size: 80, intensity: 1 },
                    { size: 0, intensity: 0 },
                ],
            });
            const identity = f.screen(2);
            f.effect.setParams({ glowDistortion: { amount: 0 } });
            const bypass = f.screen(2);
            let maximum = 0;
            for (let y = 32 * pixelRatio; y < 224 * pixelRatio; y++) {
                for (let x = 32 * pixelRatio; x < 224 * pixelRatio; x++) {
                    const i =
                        ((identity.height - 1 - y) * identity.width + x) * 4;
                    maximum = Math.max(
                        maximum,
                        Math.abs(identity.pixels[i] - bypass.pixels[i]),
                    );
                }
            }
            const protection = {
                pixelRatio,
                protectionIdentity: maximum,
                glError: f.gl.getError(),
            };
            rows.push(protection);
            if (maximum > 2 || protection.glError) {
                failures.push(protection);
            }
        } finally {
            f.destroy();
        }
    }
    return { rows, failures };
}

// AE Amount sweeps: output is affine in Amount; at 100, Invert complements
// the density mask. This detects the former nonlinear hot-spot amplification.
export async function runNoiseIsolationChecks() {
    const rows = [],
        failures = [];
    for (const type of ["fluid", "smoke", "energy"]) {
        const f = await createSaberFixture({
            Effect: DistortionProbe,
            width: 256,
            height: 256,
            sourceWidth: 256,
            sourceHeight: 256,
            options: {
                type,
                noiseComplexity: 4,
                noiseDetail: 0.4,
                noiseScale: 80,
            },
        });
        try {
            const capture = (amount, invert = false) => {
                Object.assign(f.effect.params, { amount, invert });
                return f.screen(1);
            };
            const zero = capture(0),
                full = capture(100),
                half = capture(50),
                quarter = capture(25),
                inv = capture(100, true);
            let linearError = 0,
                complementError = 0;
            for (let y = 8; y < 248; y++) {
                for (let x = 8; x < 248; x++) {
                    const i = ((full.height - 1 - y) * full.width + x) * 4;
                    const a = zero.pixels[i] / 255,
                        b = full.pixels[i] / 255;
                    linearError = Math.max(
                        linearError,
                        Math.abs(half.pixels[i] / 255 - (a + b) / 2),
                        Math.abs(
                            quarter.pixels[i] / 255 - (a * 0.75 + b * 0.25),
                        ),
                    );
                    complementError = Math.max(
                        complementError,
                        Math.abs((inv.pixels[i] + full.pixels[i]) / 255 - 1),
                    );
                }
            }
            const row = {
                type,
                linearError,
                complementError,
                glError: f.gl.getError(),
            };
            rows.push(row);
            if (
                linearError > 2 / 255 ||
                complementError > 2 / 255 ||
                row.glError
            ) {
                failures.push(row);
            }
        } finally {
            f.destroy();
        }
    }
    return { rows, failures };
}

// Native blur: six spatial taps at the current evolution time. At wind100,
// 0.15 seconds covers exactly fifteen pixels; no wind means no blur.
export async function runNoiseBlurChecks() {
    const rows = [],
        failures = [];
    for (const type of ["smoke", "fluid", "energy"]) {
        const f = await createSaberFixture({
            Effect: DistortionProbe,
            width: 256,
            height: 256,
            sourceWidth: 256,
            sourceHeight: 256,
            pixelRatio: 1,
            options: {
                type,
                amount: 100,
                noiseScale: 100,
                noiseComplexity: 4,
                noiseSpeed: 0,
                windSpeed: 100,
                motionBlur: 0,
            },
        });
        try {
            const samples = Array.from({ length: 6 }, (_, i) =>
                f.screen(1 + i * 0.03),
            );
            f.effect.params.motionBlur = 0.15;
            const blurred = f.screen(1);
            let maximum = 0,
                count = 0;
            for (let y = 32; y < 220; y++) {
                for (let x = 32; x < 220; x++) {
                    const i =
                        ((blurred.height - 1 - y) * blurred.width + x) * 4;
                    // Avoid display clipping when comparing float averaging to
                    // independently quantized reference samples.
                    if (
                        samples.some(
                            (s) => s.pixels[i] < 4 || s.pixels[i] > 250,
                        )
                    ) {
                        continue;
                    }
                    const reference =
                        samples.reduce((sum, s) => sum + s.pixels[i], 0) / 6;
                    maximum = Math.max(
                        maximum,
                        Math.abs(blurred.pixels[i] - reference),
                    );
                    count++;
                }
            }
            Object.assign(f.effect.params, {
                windSpeed: 0,
                noiseSpeed: 1,
                motionBlur: 0,
            });
            const evolving = f.screen(1);
            f.effect.params.motionBlur = 0.15;
            const still = f.screen(1);
            let stillError = 0;
            for (let i = 0; i < still.pixels.length; i++) {
                stillError = Math.max(
                    stillError,
                    Math.abs(still.pixels[i] - evolving.pixels[i]),
                );
            }
            const row = {
                type,
                maximum,
                count,
                stillError,
                glError: f.gl.getError(),
            };
            rows.push(row);
            if (!count || maximum > 2 || stillError || row.glError) {
                failures.push(row);
            }
        } finally {
            f.destroy();
        }
    }
    return { rows, failures };
}

// Held-out AE white-field sequences: complexity4, scale100, speed1, wind0.
// Correlation tolerances describe approximate dynamics, not native random pixels.
export async function runNoiseEvolutionChecks() {
    const reference = {
        smoke: [0.974372, 0.910607, 0.714517, 0.977369, 0.924474, 0.75949],
        fluid: [0.80285, 0.499109, 0.077804, 0.790386, 0.490473, 0.085388],
        energy: [0.94077, 0.78661, 0.29047, 0.905639, 0.696908, 0.296045],
    };
    function field(shot) {
        const values = [];
        for (let y = 32; y < 480; y += 2) {
            for (let x = 32; x < 245; x += 2) {
                values.push(
                    shot.pixels[((shot.height - 1 - y) * shot.width + x) * 4],
                );
            }
        }
        return values;
    }
    function correlation(a, b) {
        let sx = 0,
            sy = 0,
            sxx = 0,
            syy = 0,
            sxy = 0;
        for (let i = 0; i < a.length; i++) {
            sx += a[i];
            sy += b[i];
            sxx += a[i] * a[i];
            syy += b[i] * b[i];
            sxy += a[i] * b[i];
        }
        return (
            (sxy - (sx * sy) / a.length) /
            Math.sqrt(
                (sxx - (sx * sx) / a.length) * (syy - (sy * sy) / a.length),
            )
        );
    }
    const rows = [],
        failures = [];
    for (const type of Object.keys(reference)) {
        const f = await createSaberFixture({
            Effect: DistortionProbe,
            width: 512,
            height: 512,
            sourceWidth: 512,
            sourceHeight: 512,
            pixelRatio: 1,
            options: {
                type,
                amount: 100,
                noiseScale: 100,
                noiseComplexity: 4,
                seed: 0,
                noiseBias: 1,
                noiseSpeed: 1,
                windSpeed: 0,
            },
        });
        try {
            const measured = [];
            for (const start of [3, 4]) {
                const initial = field(f.screen(start));
                for (const delta of [0.0625, 0.125, 0.25]) {
                    measured.push(
                        correlation(initial, field(f.screen(start + delta))),
                    );
                }
            }
            const rmse = Math.sqrt(
                measured.reduce(
                    (sum, value, i) => sum + (value - reference[type][i]) ** 2,
                    0,
                ) / measured.length,
            );
            const row = {
                type,
                measured,
                reference: reference[type],
                rmse,
                glError: f.gl.getError(),
            };
            rows.push(row);
            if (!Number.isFinite(rmse) || rmse > 0.16 || row.glError) {
                failures.push(row);
            }
        } finally {
            f.destroy();
        }
    }
    return { rows, failures };
}

// AE saturated white-field moments, measured at 960x540. Both a single octave
// over many cells and four octaves constrain Smoke contrast without preset tuning.
export async function runSmokeDensityChecks() {
    const references = [
        {
            complexity: 1,
            scale: 25,
            mean: 0.709338,
            std: 0.104361,
            gradient: 0.01975,
        },
        {
            complexity: 4,
            scale: 100,
            mean: 0.438095,
            std: 0.122452,
            gradient: 0.010636,
        },
    ];
    const rows = [],
        failures = [];
    for (const reference of references) {
        const f = await createSaberFixture({
            Effect: DistortionProbe,
            width: 960,
            height: 540,
            sourceWidth: 960,
            sourceHeight: 540,
            pixelRatio: 1,
            options: {
                type: "smoke",
                amount: 100,
                noiseScale: reference.scale,
                noiseComplexity: reference.complexity,
                noiseBias: 1,
                seed: 0,
            },
        });
        try {
            const shot = f.screen(0);
            let sum = 0,
                square = 0,
                gradientSquare = 0,
                count = 0,
                pairs = 0;
            for (const start of [32, 515]) {
                for (let y = 32; y < 508; y++) {
                    for (let x = start; x < start + 413; x++) {
                        const index =
                            ((shot.height - 1 - y) * shot.width + x) * 4;
                        const value = shot.pixels[index] / 255;
                        sum += value;
                        square += value * value;
                        count++;
                        if (y > 32) {
                            const previous =
                                shot.pixels[index + shot.width * 4] / 255;
                            gradientSquare += (value - previous) ** 2;
                            pairs++;
                        }
                    }
                }
            }
            const mean = sum / count;
            const row = {
                complexity: reference.complexity,
                mean,
                std: Math.sqrt(square / count - mean * mean),
                gradient: Math.sqrt(gradientSquare / pairs),
                reference,
                glError: f.gl.getError(),
            };
            rows.push(row);
            if (
                row.glError ||
                Math.abs(mean - reference.mean) > 0.015 ||
                Math.abs(row.std - reference.std) > 0.01 ||
                Math.abs(row.gradient - reference.gradient) > 0.002
            ) {
                failures.push(row);
            }
        } finally {
            f.destroy();
        }
    }
    return { rows, failures };
}
