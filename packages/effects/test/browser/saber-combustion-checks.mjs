// Import through the frozen comparison harness after replacing TS import paths.
import { createSaberFixture } from "./saber-quality.mjs";

function difference(a, b) {
    let max = 0,
        changed = 0;
    for (let i = 0; i < a.pixels.length; i++) {
        const d = Math.abs(a.pixels[i] - b.pixels[i]);
        max = Math.max(max, d);
        changed += d > 0 ? 1 : 0;
    }
    return { max, changed };
}

export async function runCombustionChecks(Baseline) {
    const result = {
        compatibility: [],
        halo: [],
        animation: [],
        bounds: [],
        failures: [],
    };
    const calm = {
        lines: 1,
        variation: 0,
        mainAmplitude: 0,
        source: false,
        pad: 80,
    };
    for (const pixelRatio of [1, 2]) {
        for (const options of [
            { preset: "fire" },
            { preset: "embers" },
            ...["fluid", "energy", "smoke"].map((type) => ({
                lines: 5,
                amplitude: 25,
                mainAmplitude: 40,
                thickness: 7,
                coreDistortion: {
                    type,
                    amount: 45,
                    noiseDetail: 1,
                    noiseBias: 0.1,
                    noiseScale: 90,
                    noiseComplexity: 8,
                },
            })),
        ]) {
            const config = {
                options: { ...options, source: false, pad: 160 },
                pixelRatio,
            };
            const reference = await createSaberFixture({
                ...config,
                transformDraw: (opts) => ({
                    ...opts,
                    frag: opts.frag.replace("#define CORE_BOUNDS", ""),
                }),
            });
            const expected = [2, 2.5, 7].map((t) => reference.screen(t));
            reference.destroy();
            const bounded = await createSaberFixture(config);
            const frames = [2, 2.5, 7].map((t, i) =>
                difference(expected[i], bounded.screen(t)),
            );
            const glError = bounded.gl.getError();
            bounded.destroy();
            result.bounds.push({ options, pixelRatio, frames, glError });
            if (frames.some((d) => d.max) || glError) {
                result.failures.push(
                    `Bounds ${pixelRatio}/${options.preset || options.coreDistortion.type}`,
                );
            }
        }
        for (const glowMode of ["layers", "pyramid"]) {
            for (const [type, composite] of [
                "fluid",
                "energy",
                "smoke",
            ].flatMap((type) =>
                ["distort", "multiply"].map((composite) => [type, composite]),
            )) {
                const options = {
                    ...calm,
                    glowMode,
                    glowDistortion: { type, composite, amount: 20 },
                };
                const old = await createSaberFixture({
                    Effect: Baseline,
                    options,
                    pixelRatio,
                });
                const a = old.screen(2);
                old.destroy();
                const f = await createSaberFixture({ options, pixelRatio });
                const d = difference(a, f.screen(2));
                f.destroy();
                result.compatibility.push({
                    pixelRatio,
                    glowMode,
                    type,
                    composite,
                    ...d,
                });
                if (d.max > 1) {
                    result.failures.push(
                        `Default ${pixelRatio}/${glowMode}/${type}/${composite}`,
                    );
                }
            }
            const f = await createSaberFixture({
                options: {
                    ...calm,
                    glowMode,
                    glow: 0,
                    coreIntensity: 0,
                    haloIntensity: 1,
                    haloSize: 5,
                },
                pixelRatio,
                trackResources: true,
            });
            const a = f.screen(2);
            f.effect.setParams({
                glowBias: 2,
                glowSizeMultiplier: 3,
                coreSoftness: 4,
                coreBlendOnTop: true,
                glowDistortion: { amount: 40 },
            });
            const independent = difference(a, f.screen(2));
            f.effect.setParams({ haloSize: 10 });
            const radius = difference(a, f.screen(2));
            f.effect.setParams({ haloIntensity: 0 });
            const disabled = f
                .screen(2)
                .pixels.some((v, i) => i % 4 !== 3 && v !== 0);
            const glError = f.gl.getError();
            f.destroy();
            const remaining = f.resources.snapshot();
            result.halo.push({
                pixelRatio,
                glowMode,
                independent,
                radius,
                disabled,
                glError,
                remaining,
            });
            if (independent.max || !radius.changed || disabled || glError) {
                result.failures.push(`Halo ${pixelRatio}/${glowMode}`);
            }
            if (
                remaining.textureBytes ||
                Object.values(remaining.objects).some(Boolean)
            ) {
                result.failures.push(`Halo disposal ${pixelRatio}/${glowMode}`);
            }
        }
        for (const preset of ["fire", "embers"]) {
            const f = await createSaberFixture({
                options: { preset, source: false, pad: 160 },
                pixelRatio,
                trackResources: true,
            });
            const a = f.screen(2),
                moving = difference(a, f.screen(2.5)),
                repeat = difference(a, f.screen(2));
            const glError = f.gl.getError();
            f.destroy();
            const remaining = f.resources.snapshot();
            result.animation.push({
                preset,
                pixelRatio,
                moving,
                repeat,
                glError,
                remaining,
            });
            if (!moving.changed || repeat.max || glError) {
                result.failures.push(`Animation ${pixelRatio}/${preset}`);
            }
            if (
                remaining.textureBytes ||
                Object.values(remaining.objects).some(Boolean)
            ) {
                result.failures.push(`Preset disposal ${pixelRatio}/${preset}`);
            }
        }
    }
    return result;
}
