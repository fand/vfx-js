// Import through Storybook/Vite. Optional Baseline is the pre-consolidation class.
import { SABER_PRESETS } from "../../src/saber-presets.ts";
import {
    createSaberFixture,
    GlowProbe,
    imageStats,
    STEADY_OPTIONS,
} from "./saber-quality.mjs";

// Broad preset Halos must not become flat saturated disks on a text source.
export async function runHaloBoundaryChecks({ Effect, paint } = {}) {
    const result = { rows: [], failures: [] };
    for (const pixelRatio of [1, 2]) {
        for (const preset of ["arc-reactor", "burning", "tractor-beam"]) {
            const f = await createSaberFixture({
                ...(Effect ? { Effect } : {}),
                width: 960,
                height: 540,
                sourceWidth: 960,
                sourceHeight: 540,
                pixelRatio,
                options: { preset, source: false, pad: 320 },
                paint:
                    paint ??
                    ((c) => {
                        c.fillStyle = "white";
                        c.font = "bold 150px sans-serif";
                        c.textAlign = "center";
                        c.textBaseline = "middle";
                        c.fillText("Saber", 480, 270);
                    }),
            });
            try {
                for (const time of [1, 2, 3]) {
                    // Core softness also uses a layer sum. Warm the frame so
                    // capture reads the final cached glow, not that earlier pass.
                    f.render(time);
                    const image = await f.capture("layers", time);
                    const p = f.effect.params;
                    let peak = 0;
                    let saturatedPixels = 0;
                    for (let i = 3; i < image.pixels.length; i += 4) {
                        const halo =
                            image.pixels[i] * p.intensity * p.brightness;
                        peak = Math.max(peak, halo);
                        saturatedPixels += halo >= 1 ? 1 : 0;
                    }
                    const row = {
                        preset,
                        pixelRatio,
                        time,
                        peak,
                        saturatedPixels,
                        glError: f.gl.getError(),
                    };
                    result.rows.push(row);
                    if (
                        !(peak > 0) ||
                        !Number.isFinite(peak) ||
                        saturatedPixels ||
                        row.glError
                    ) {
                        result.failures.push(row);
                    }
                }
            } finally {
                f.destroy();
            }
        }
    }
    return result;
}

// Isolated straight-line response: increasing radius redistributes light;
// post-blur gamma changes width, unlike a gamma applied to the sharp core.
export async function runGlowCalibrationChecks() {
    const result = { rows: [], failures: [] };
    for (const pixelRatio of [1, 2]) {
        const f = await createSaberFixture({
            Effect: GlowProbe,
            pixelRatio,
            width: 512,
            height: 512,
            sourceWidth: 512,
            sourceHeight: 512,
            options: { normalized: true, line: true },
        });
        try {
            for (const radius of [4, 8, 16, 20, 32, 64]) {
                for (const preGamma of radius === 20
                    ? [0.1, 0.5, 1, 2, 5]
                    : [1]) {
                    Object.assign(f.effect.params, { radius, preGamma });
                    const s = await f.capture("layers");
                    const y = Math.floor(s.height / 2);
                    const row = Array.from(
                        { length: s.width },
                        (_, x) => s.pixels[(y * s.width + x) * 4],
                    );
                    const mass = row.reduce((sum, v) => sum + v, 0);
                    const center =
                        row.reduce((sum, v, x) => sum + x * v, 0) / mass;
                    const sigma = Math.sqrt(
                        row.reduce(
                            (sum, v, x) => sum + (x - center) ** 2 * v,
                            0,
                        ) / mass,
                    );
                    const rec = {
                        pixelRatio,
                        radius,
                        preGamma,
                        mass,
                        sigma,
                        glError: f.gl.getError(),
                    };
                    result.rows.push(rec);
                    if (
                        rec.glError ||
                        !row.every(Number.isFinite) ||
                        (preGamma === 1 && Math.abs(mass - 1) > 0.015) ||
                        // Extreme gamma lifts the finite kernel's cutoff;
                        // the infinite-Gaussian width formula no longer holds.
                        (preGamma >= 0.5 &&
                            Math.abs(
                                sigma /
                                    ((radius * pixelRatio) /
                                        Math.sqrt(preGamma)) -
                                    1,
                            ) > 0.08) ||
                        (preGamma < 0.5 && sigma <= radius * pixelRatio)
                    ) {
                        result.failures.push(rec);
                    }
                }
            }
        } finally {
            f.destroy();
        }
    }
    return result;
}

// Linear blur-helper checks. Production AE-style layers additionally use a
// nonlinear response and Screen; see runGlowTransferChecks below.
export async function runGlowCompositionChecks() {
    const result = { rows: [], failures: [] };
    for (const pixelRatio of [1, 2]) {
        const f = await createSaberFixture({
            Effect: GlowProbe,
            pixelRatio,
            width: 256,
            height: 256,
            sourceWidth: 256,
            sourceHeight: 256,
            options: { normalized: true, line: true },
        });
        try {
            const capture = async (
                weights,
                preGamma,
                layerBias = [1, 1, 1, 1],
            ) => {
                Object.assign(f.effect.params, {
                    preGamma,
                    layerBias,
                    layers: weights.map((intensity) => ({
                        size: 16,
                        intensity,
                    })),
                });
                return (await f.capture("layers")).pixels;
            };
            const mass = (p) =>
                p.reduce((sum, value, i) => sum + (i % 4 === 0 ? value : 0), 0);
            for (const gamma of [0.1, 0.5, 1, 2, 5]) {
                const one = await capture([1, 0, 0, 0], gamma);
                const split = await capture([0, 0.5, 0.5, 0], gamma);
                const ratio = mass(split) / mass(one);
                const expected = 2 ** (1 - gamma);
                const singles = [];
                for (let i = 0; i < 4; i++) {
                    singles.push(
                        await capture(
                            [0.3, 0.5, 0.7, 0.9].map((v, j) =>
                                i === j ? v : 0,
                            ),
                            gamma,
                        ),
                    );
                }
                const combined = await capture([0.3, 0.5, 0.7, 0.9], gamma);
                let error = 0,
                    magnitude = 0;
                for (let i = 0; i < combined.length; i += 4) {
                    error += Math.abs(
                        combined[i] - singles.reduce((sum, p) => sum + p[i], 0),
                    );
                    magnitude += combined[i];
                }
                const disabled = await capture([1, 0, 0, 0], gamma, [
                    0,
                    1 / 3,
                    3 / 5,
                    4 / 5,
                ]);
                const row = {
                    pixelRatio,
                    gamma,
                    ratio,
                    expected,
                    additiveError: error / magnitude,
                    disabledMass: mass(disabled),
                    glError: f.gl.getError(),
                };
                result.rows.push(row);
                if (
                    row.glError ||
                    !combined.every(Number.isFinite) ||
                    Math.abs(ratio / expected - 1) > 0.005 ||
                    row.additiveError > 0.005 ||
                    row.disabledMass !== 0
                ) {
                    result.failures.push(row);
                }
            }
        } finally {
            f.destroy();
        }
    }
    return result;
}

// End-to-end production compositor checks from isolated AE observations.
export async function runGlowTransferChecks() {
    const result = { rows: [], failures: [] };
    for (const pixelRatio of [1, 2]) {
        const f = await createSaberFixture({
            pixelRatio,
            width: 320,
            height: 240,
            sourceWidth: 240,
            sourceHeight: 160,
            options: {
                ...STEADY_OPTIONS,
                color: "#ffffff",
                coreIntensity: 0,
                coreBlendOnTop: false,
                glowWhiteness: 0,
                glowBias: 1,
                haloIntensity: 100,
                haloSize: 100,
                glowPreGamma: 1,
                intensity: 1,
                brightness: 0.25,
                gamma: 1,
                saturation: 1,
                glowFlow: 0,
                source: false,
                pad: 80,
                coreDistortion: { amount: 0 },
                glowDistortion: { amount: 0 },
            },
        });
        try {
            const setLayers = (weights, size = 12) =>
                f.effect.setParams({
                    glowLayers: weights.map((intensity) => ({
                        size,
                        intensity,
                    })),
                });
            setLayers([0, 15, 0, 0]);
            const a = f.screen(2);
            setLayers([0, 0, 15, 0]);
            const b = f.screen(2);
            setLayers([0, 15, 15, 0]);
            const together = f.screen(2);
            let screenError = 0,
                additiveError = 0,
                count = 0;
            for (let i = 0; i < a.pixels.length; i += 4) {
                if (a.pixels[i] < 16 || b.pixels[i] < 16) {
                    continue;
                }
                const screen =
                    a.pixels[i] +
                    b.pixels[i] -
                    (a.pixels[i] * b.pixels[i]) / 255;
                screenError += (together.pixels[i] - screen) ** 2;
                additiveError +=
                    (together.pixels[i] -
                        Math.min(a.pixels[i] + b.pixels[i], 255)) **
                    2;
                count++;
            }
            screenError = Math.sqrt(screenError / count);
            additiveError = Math.sqrt(additiveError / count);
            setLayers([0, 0, 0, 15]);
            const halo = f.screen(2);
            f.effect.setParams({ brightness: 1 });
            const brightHalo = f.screen(2);
            f.effect.setParams({ brightness: 0.5 });
            const dimHalo = f.screen(2);
            let haloBrightnessError = 0;
            let haloBrightnessCount = 0;
            for (let i = 0; i < brightHalo.pixels.length; i += 4) {
                // Unsaturated Halo should scale by B squared at Gamma=1.
                if (brightHalo.pixels[i] < 32 || brightHalo.pixels[i] > 200) {
                    continue;
                }
                haloBrightnessError +=
                    (dimHalo.pixels[i] - brightHalo.pixels[i] / 4) ** 2;
                haloBrightnessCount++;
            }
            haloBrightnessError = Math.sqrt(
                haloBrightnessError / haloBrightnessCount,
            );
            f.effect.setParams({ brightness: 0.25 });
            f.effect.setParams({
                glowDistortion: { amount: 50, windSpeed: 30, noiseSpeed: 1 },
                glowFlow: 30,
            });
            const haloMotion = difference(halo, f.screen(3));
            f.effect.setParams({ haloIntensity: 0 });
            const disabled = f.screen(3);
            const disabledSum = disabled.pixels.reduce(
                (sum, value) => sum + value,
                0,
            );
            f.effect.setParams({ haloIntensity: 50, glow: 2 });
            const matchedGain = f.screen(3);
            f.effect.setParams({ haloIntensity: 100, glow: 1 });
            const gainDelta = difference(matchedGain, f.screen(3));
            f.effect.setParams({ haloSize: 50 });
            setLayers([0, 0, 0, 15], 24);
            const sizeDelta = difference(halo, f.screen(3));
            // Measure amplification below the pre-distortion clipping knee.
            f.effect.setParams({
                haloSize: 100,
                glow: 1,
                glowPreGamma: 1,
                brightness: 0.0001,
            });
            setLayers([0, 15, 0, 0]);
            const low = await f.capture("layers", 3);
            f.effect.params.glow = 2;
            const high = await f.capture("layers", 3);
            const peak = (p) =>
                p.reduce(
                    (max, value, i) =>
                        i % 4 === 0 ? Math.max(max, value) : max,
                    0,
                );
            const boost = peak(high.pixels) / peak(low.pixels);
            const unsaturated = peak(high.pixels) < 1;
            f.effect.setParams({ glow: 1000, glowPreGamma: 5 });
            const extreme = await f.capture("layers", 3);
            const finite = extreme.pixels.every(
                (v, i) =>
                    Number.isFinite(v) &&
                    v >= 0 &&
                    v <= (i % 4 === 3 ? 4096 : 1),
            );
            const row = {
                pixelRatio,
                screenError,
                additiveError,
                count,
                haloMotion,
                haloBrightnessError,
                haloBrightnessCount,
                disabledSum,
                gainDelta,
                sizeDelta,
                boost,
                unsaturated,
                finite,
                glError: f.gl.getError(),
            };
            result.rows.push(row);
            if (
                !count ||
                screenError > 2.5 ||
                additiveError < screenError * 1.5 ||
                haloMotion.maximum > 1 ||
                !haloBrightnessCount ||
                haloBrightnessError > 2 ||
                disabledSum !== 0 ||
                gainDelta.maximum !== 0 ||
                sizeDelta.maximum > 1 ||
                !(boost > 2) ||
                !unsaturated ||
                !finite ||
                row.glError
            ) {
                result.failures.push(row);
            }
        } finally {
            f.destroy();
        }
    }
    return result;
}

function difference(a, b) {
    let maximum = 0;
    let changed = 0;
    for (let i = 0; i < a.pixels.length; i++) {
        const delta = Math.abs(a.pixels[i] - b.pixels[i]);
        maximum = Math.max(maximum, delta);
        changed += delta > 0 ? 1 : 0;
    }
    return { maximum, changed };
}

// Production-shader checks for the AE-style output controls, including the
// source-compositing boundary. Dither may separate grayscale channels by 2 LSB.
export async function runOutputChecks() {
    const f = await createSaberFixture({
        options: {
            ...STEADY_OPTIONS,
            color: "#4080c0",
            intensity: 0.15,
            coreWhiteness: 0,
            glow: 0,
            haloIntensity: 0,
            gamma: 1,
            brightness: 1,
            saturation: 1,
            source: false,
        },
    });
    const sum = ({ pixels }) =>
        pixels.reduce(
            (total, value, i) => total + (i % 4 === 3 ? 0 : value),
            0,
        );
    const result = { failures: [] };
    try {
        const neutral = sum(f.screen(2));
        f.effect.params.gamma = 0.5;
        const lifted = sum(f.screen(2));
        f.effect.params.gamma = 2;
        const darkened = sum(f.screen(2));
        if (!(lifted > neutral && neutral > darkened && darkened > 0)) {
            result.failures.push("Gamma direction");
        }
        f.effect.setParams({ gamma: 1, brightness: 2 });
        if (sum(f.screen(2)) <= neutral) {
            result.failures.push("Brightness direction");
        }
        f.effect.setParams({ brightness: 1, saturation: 0 });
        const gray = f.screen(2);
        for (let i = 0; i < gray.pixels.length; i += 4) {
            const channels = gray.pixels.subarray(i, i + 3);
            if (Math.max(...channels) - Math.min(...channels) > 2) {
                result.failures.push("Saturation zero is not grayscale");
                break;
            }
        }
        f.effect.params.brightness = 0;
        if (f.screen(2).pixels.some((value) => value !== 0)) {
            result.failures.push("Zero brightness leaves light or alpha");
        }
        f.effect.params.source = true;
        const source = f.screen(2);
        f.effect.setParams({ gamma: 0.1, saturation: 2 });
        if (!sum(source) || difference(source, f.screen(2)).maximum) {
            result.failures.push("Output grading changes source pixels");
        }
        if (f.gl.getError()) {
            result.failures.push("Output grading WebGL error");
        }
        return result;
    } finally {
        f.destroy();
    }
}

export async function runAppearanceChecks({ Baseline } = {}) {
    const result = {
        compatibility: [],
        presets: [],
        softness: [],
        failures: [],
    };
    const options = { ...STEADY_OPTIONS, source: false, pad: 160 };
    if (Baseline) {
        for (const pixelRatio of [1, 2]) {
            const old = await createSaberFixture({
                Effect: Baseline,
                pixelRatio,
                options,
            });
            const before = old.screen(2);
            old.destroy();
            const current = await createSaberFixture({ pixelRatio, options });
            const delta = difference(before, current.screen(2));
            result.compatibility.push({
                pixelRatio,
                ...delta,
                glError: current.gl.getError(),
            });
            current.destroy();
            if (delta.maximum > 1) {
                result.failures.push(`Steady compatibility DPR ${pixelRatio}`);
            }
        }
    }
    const fixture = await createSaberFixture({ options, trackResources: true });
    try {
        for (const preset of Object.keys(SABER_PRESETS)) {
            fixture.effect.setParams({ preset });
            const live = fixture.screen(2);
            const fresh = await createSaberFixture({
                options: { preset, source: false, pad: 160 },
            });
            const delta = difference(live, fresh.screen(2));
            const energy = live.pixels.reduce(
                (sum, value, i) => sum + (i % 4 === 3 ? 0 : value),
                0,
            );
            const glError = fixture.gl.getError() || fresh.gl.getError();
            fresh.destroy();
            result.presets.push({ preset, energy, ...delta, glError });
            if (!energy || delta.maximum || glError) {
                result.failures.push(`Preset ${preset}`);
            }
        }
        fixture.effect.setParams({
            ...STEADY_OPTIONS,
            coreSoftness: 0,
            flickerIntensity: 0.8,
            flickerSpeed: 9,
            flickerSeed: 17,
        });
        const a = fixture.screen(0.2);
        const b = fixture.screen(0.7);
        const repeat = fixture.screen(0.2);
        const moving = difference(a, b);
        const deterministic = difference(a, repeat);
        fixture.effect.params.flickerSpeed = 0;
        const frozen = difference(fixture.screen(0.2), fixture.screen(8));
        fixture.effect.setParams({
            coreIntensity: 0,
            flickerIntensity: 0,
            coreWhiteness: 0,
        });
        const glowOnly = fixture.screen(2);
        fixture.effect.setParams({ coreWhiteness: 1, coreSoftness: 8 });
        const independentGlow = difference(glowOnly, fixture.screen(2));
        result.flicker = { moving, deterministic, frozen, independentGlow };
        if (
            !moving.changed ||
            deterministic.changed ||
            frozen.changed ||
            independentGlow.changed
        ) {
            result.failures.push("Flicker or glow independence");
        }
        result.tint = [];
        {
            fixture.effect.setParams({
                ...STEADY_OPTIONS,
                coreWhiteness: 0,
            });
            const colored = fixture.screen(2);
            fixture.effect.params.coreWhiteness = 1;
            const white = fixture.screen(2);
            const delta = difference(colored, white);
            const glError = fixture.gl.getError();
            result.tint.push({ ...delta, glError });
            if (!delta.changed || glError) {
                result.failures.push(`Core tint layers`);
            }
        }
        fixture.effect.setParams({
            intensity: 0,
            source: true,
            flickerIntensity: 1,
        });
        result.source = difference(fixture.screen(0), fixture.screen(4));
        if (result.source.changed) {
            result.failures.push("Brightness flicker changed source pixels");
        }
    } finally {
        fixture.destroy();
    }
    result.disposed = fixture.resources.snapshot();
    if (Object.values(result.disposed.objects).some((n) => n !== 0)) {
        result.failures.push("Resource disposal");
    }

    for (const pixelRatio of [1, 2]) {
        let output;
        const probe = await createSaberFixture({
            pixelRatio,
            options,
            transformDraw(draw, ctx) {
                if (draw.uniforms.coreGain === undefined) {
                    return draw;
                }
                output ??= ctx.createRenderTarget({ float: true });
                return {
                    ...draw,
                    target: output,
                    frag: `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D core;
out vec4 outColor;
void main() { outColor = texture(core, uv); }
`,
                };
            },
        });
        try {
            let reference;
            for (const softness of [0, 0.5, 2, 8, 0]) {
                probe.effect.params.coreSoftness = softness;
                const image = await probe.capture("composite");
                const stats = imageStats(
                    image.pixels,
                    image.width,
                    image.height,
                );
                reference ??= stats;
                const relativeMass = stats.sum / reference.sum;
                result.softness.push({
                    pixelRatio,
                    softness,
                    ...stats,
                    relativeMass,
                    glError: probe.gl.getError(),
                });
                if (
                    stats.invalid ||
                    Math.abs(relativeMass - 1) > 0.01 ||
                    (softness >= 2 && stats.peak >= reference.peak)
                ) {
                    result.failures.push(
                        `Softness ${softness}, DPR ${pixelRatio}`,
                    );
                }
            }
        } finally {
            probe.destroy();
        }
    }
    return result;
}

// Compare retained recipes with a baseline using the same rendering semantics.
export async function preservedPresetChecks(
    Baseline,
    {
        pixelRatios = [1, 2],
        times = [0, 0.5, 2, 7],
        presets = Object.keys(SABER_PRESETS),
    } = {},
) {
    const rows = [];
    for (const pixelRatio of pixelRatios) {
        for (const preset of presets) {
            const config = {
                pixelRatio,
                options: { preset, source: false, pad: 160 },
            };
            const old = await createSaberFixture({
                ...config,
                Effect: Baseline,
            });
            let expected;
            try {
                expected = times.map((time) => old.screen(time));
                if (old.gl.getError()) {
                    throw new Error(`Baseline WebGL error: ${preset}`);
                }
            } finally {
                old.destroy();
            }
            const current = await createSaberFixture(config);
            try {
                for (const [i, time] of times.entries()) {
                    rows.push({
                        preset,
                        pixelRatio,
                        time,
                        ...difference(expected[i], current.screen(time)),
                        glError: current.gl.getError(),
                    });
                }
            } finally {
                current.destroy();
            }
        }
    }
    return { rows, failures: rows.filter((row) => row.maximum || row.glError) };
}

// Native white-line probes: Blend on Top is a separate Screen operation,
// gated by nonzero Core Distortion and active Glow. Even .001 activates it.
export async function runCoreOverlayChecks() {
    const f = await createSaberFixture({
        width: 256,
        height: 256,
        sourceWidth: 256,
        sourceHeight: 256,
        pixelRatio: 1,
        options: {
            ...STEADY_OPTIONS,
            color: "#ffffff",
            brightness: 0.25,
            coreWhiteness: 0,
            glowWhiteness: 0,
            haloIntensity: 0,
            glow: 1,
            pad: 80,
            coreBlendOnTop: false,
            glowLayers: [
                { size: 0, intensity: 0 },
                { size: 20, intensity: 0.1 },
                { size: 0, intensity: 0 },
                { size: 0, intensity: 0 },
            ],
            coreDistortion: {
                ...STEADY_OPTIONS.coreDistortion,
                amount: 0,
                windSpeed: 0,
                noiseSpeed: 0,
            },
        },
        paint: (c) => c.fillRect(127, 0, 2, 256),
    });
    try {
        f.effect.setParams({ glow: 0 });
        const original = f.screen(1);
        f.effect.setParams({ coreDistortion: { amount: 0.001 } });
        const core = f.screen(1);
        f.effect.setParams({ coreBlendOnTop: true });
        const coreOnly = difference(core, f.screen(1));
        f.effect.setParams({ glow: 1, coreBlendOnTop: false });
        const off = f.screen(1);
        f.effect.setParams({ coreBlendOnTop: true });
        const on = f.screen(1);
        let maximum = 0,
            count = 0;
        for (let i = 0; i < on.pixels.length; i += 4) {
            if (original.pixels[i] < 16) {
                continue;
            }
            const expected =
                255 -
                ((255 - off.pixels[i]) * (255 - original.pixels[i])) / 255;
            maximum = Math.max(maximum, Math.abs(on.pixels[i] - expected));
            count++;
        }
        f.effect.setParams({ coreDistortion: { amount: 0 } });
        const steady = f.screen(1);
        f.effect.setParams({ coreBlendOnTop: false });
        const steadyDelta = difference(steady, f.screen(1));
        const row = {
            maximum,
            count,
            coreOnly,
            steadyDelta,
            glError: f.gl.getError(),
        };
        return {
            rows: [row],
            failures:
                !count ||
                maximum > 2 ||
                coreOnly.maximum ||
                steadyDelta.maximum ||
                row.glError
                    ? [row]
                    : [],
        };
    } finally {
        f.destroy();
    }
}

// Compare adaptive Glow resolution against the same shader at full resolution.
export async function runGlowResolutionChecks() {
    const rows = [],
        failures = [];
    for (const preset of ["arc-reactor", "fire", "wormhole", "tractor-beam"]) {
        let full = false,
            target;
        const f = await createSaberFixture({
            width: 960,
            height: 540,
            sourceWidth: 960,
            sourceHeight: 540,
            pixelRatio: 1,
            options: { preset, source: false, pad: 320 },
            transformDraw: (draw, ctx) => {
                if (
                    full &&
                    draw.uniforms?.glowPass === 1 &&
                    draw.uniforms?.noiseFieldPass
                ) {
                    target ??= ctx.createRenderTarget({ float: true });
                    return { ...draw, target };
                }
                if (
                    full &&
                    draw.uniforms?.glowPass === 1 &&
                    draw.uniforms?.noiseField &&
                    target
                ) {
                    return {
                        ...draw,
                        uniforms: { ...draw.uniforms, noiseField: target },
                    };
                }
                return draw;
            },
        });
        try {
            const a = f.screen(2);
            full = true;
            f.effect.invalidate();
            const b = f.screen(2);
            let squared = 0,
                count = 0,
                maximum = 0;
            for (let i = 0; i < a.pixels.length; i++) {
                if (i % 4 === 3 || Math.max(a.pixels[i], b.pixels[i]) < 4) {
                    continue;
                }
                const delta = Math.abs(a.pixels[i] - b.pixels[i]);
                squared += delta * delta;
                count++;
                maximum = Math.max(maximum, delta);
            }
            const row = {
                preset,
                rmse: Math.sqrt(squared / Math.max(count, 1)),
                maximum,
                count,
                glError: f.gl.getError(),
            };
            rows.push(row);
            if (!count || row.rmse > 2 || row.maximum > 16 || row.glError) {
                failures.push(row);
            }
        } finally {
            f.destroy();
        }
    }
    return { rows, failures };
}
