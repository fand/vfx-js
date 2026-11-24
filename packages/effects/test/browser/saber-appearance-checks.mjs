// Import through Storybook/Vite. Optional Baseline is the pre-consolidation class.
import { SABER_PRESETS } from "../../src/saber-presets.ts";
import {
    createSaberFixture,
    imageStats,
    STEADY_OPTIONS,
} from "./saber-quality.mjs";

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
            preset: "neon",
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
                preset: "laser",
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

// Preserved recipes must retain exact displayed pixels. Deliberately excludes
// Ice/Unstable, whose removed multi-line topology was reauthored.
export async function preservedPresetChecks(
    Baseline,
    {
        pixelRatios = [1, 2],
        times = [0, 0.5, 2, 7],
        presets = Object.keys(SABER_PRESETS).filter(
            (name) => !["ice", "unstable"].includes(name),
        ),
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
