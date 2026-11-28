// Frozen baseline vs compact storage: custom controls, fractional DPR, fallback
// and live mode switches. Preset/movie comparisons are run separately.
import { SaberEffect as Baseline } from "./baseline/saber.js";
import { SaberEffect as Candidate } from "./candidate/saber.js";
import {
    createSaberFixture,
    imageStats,
    STEADY_OPTIONS,
} from "./saber-quality.mjs";

function fallback(Effect) {
    return class extends Effect {
        init(ctx) {
            super.init({ ...ctx, gl: { getExtension: () => null } });
        }
        render(ctx) {
            super.render({ ...ctx, gl: { getExtension: () => null } });
        }
    };
}

function difference(a, b) {
    let changed = 0,
        max = 0;
    for (let i = 0; i < a.length; i++) {
        const d = Math.abs(a[i] - b[i]);
        changed += Number(d !== 0);
        max = Math.max(max, d);
    }
    return { changed, max };
}

export async function storageChecks() {
    const steps = [
        { name: "partial-bypass", params: {} },
        {
            name: "hdr-tint",
            params: {
                brightness: 3,
                gamma: 0.7,
                saturation: 1.8,
                glowPreGamma: 0.6,
                glow: 4,
                coreWhiteness: 0.1,
                glowWhiteness: 0.5,
            },
        },
        {
            name: "shutter-flow",
            params: {
                glowFlow: 32,
                glowDistortion: { motionBlur: 0.05, noiseTurbulence: 0.5 },
            },
        },
        {
            name: "multiply",
            params: { glowDistortion: { composite: "multiply", invert: true } },
        },
        {
            name: "flow-only",
            params: { glowDistortion: { amount: 0 }, glowFlow: 60 },
        },
        {
            name: "unwarped-halo",
            params: {
                coreDistortion: { amount: 0 },
                glowDistortion: { amount: 30, composite: "distort" },
            },
        },
        { name: "no-halo", params: { haloIntensity: 0 } },
        {
            name: "halo-only-warp",
            params: {
                haloIntensity: 100,
                coreDistortion: { amount: 12 },
                glowDistortion: { amount: 0 },
                glowFlow: 0,
            },
        },
        { name: "no-distortion", params: { coreDistortion: { amount: 0 } } },
        {
            name: "reveal",
            params: { end: 0.63, glowDistortion: { amount: 22 } },
        },
        { name: "full", params: { end: 1 } },
        { name: "off", params: { glow: 0 } },
        {
            name: "all-layers",
            params: { glow: 1, glowDistortAllLayers: true, source: false },
        },
        { name: "preset-switch", params: { preset: "fire" } },
        { name: "dynamic", params: { dynamic: true } },
        { name: "core-soft", params: { dynamic: false, coreSoftness: 2 } },
        { name: "core-analytic", params: { coreSoftness: 0 } },
        {
            name: "core-multiply",
            params: { coreDistortion: { composite: "multiply", amount: 12 } },
        },
        {
            name: "core-shutter",
            params: {
                coreDistortion: {
                    composite: "distort",
                    motionBlur: 0.12,
                    noiseTurbulence: 0.5,
                },
            },
        },
    ];
    const result = { done: false, rows: [], failed: false };
    window.saberStorageJob = result;
    for (const pixelRatio of [1, 1.5, 2]) {
        for (const legacy of [false, true]) {
            const captures = [];
            const resources = [];
            for (const Base of [Baseline, Candidate]) {
                const f = await createSaberFixture({
                    Effect: legacy ? fallback(Base) : Base,
                    width: 481,
                    height: 303,
                    sourceWidth: 197,
                    sourceHeight: 91,
                    pixelRatio,
                    trackResources: true,
                    options: {
                        ...STEADY_OPTIONS,
                        source: true,
                        pad: 83,
                        glowLayers: [4, 24, 60, 80].map((size) => ({
                            size,
                            intensity: 0.6,
                        })),
                        coreDistortion: {
                            ...STEADY_OPTIONS.coreDistortion,
                            amount: 12,
                        },
                        glowDistortion: {
                            ...STEADY_OPTIONS.glowDistortion,
                            amount: 30,
                            type: "smoke",
                        },
                    },
                });
                const frames = [];
                try {
                    for (const step of steps) {
                        result.current = {
                            pixelRatio,
                            legacy,
                            step: step.name,
                            renderer:
                                Base === Baseline ? "baseline" : "candidate",
                        };
                        f.effect.setParams(step.params);
                        if (step.name === "reveal") {
                            let ready = false;
                            for (let i = 0; i < 60; i++) {
                                const core = await f.capture("core", 2);
                                if (
                                    imageStats(
                                        core.pixels,
                                        core.width,
                                        core.height,
                                    ).sum > 0
                                ) {
                                    ready = true;
                                    break;
                                }
                                await new Promise(requestAnimationFrame);
                            }
                            if (!ready) {
                                throw new Error("Reveal did not resolve");
                            }
                        }
                        await f.settle(2);
                        frames.push(f.screen(2).pixels);
                    }
                    resources.push({ glError: f.gl.getError() });
                } finally {
                    f.destroy();
                }
                resources.at(-1).disposed = f.resources.snapshot();
                captures.push(frames);
            }
            const deltas = steps.map((step, i) => ({
                name: step.name,
                ...difference(captures[0][i], captures[1][i]),
            }));
            const failed =
                deltas.some((d) => d.changed !== 0) ||
                resources.some(
                    (r) =>
                        r.glError !== 0 ||
                        Object.values(r.disposed.objects).some((n) => n !== 0),
                );
            result.rows.push({ pixelRatio, legacy, deltas, resources, failed });
            result.failed ||= failed;
        }
    }
    result.done = true;
    return result;
}
