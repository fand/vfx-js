// Frozen before/after checks for the reduced API; only supported controls are edited.
import { SaberEffect as Baseline } from "./baseline/saber.js";
import { SaberEffect as Candidate } from "./candidate/saber.js";
import { SABER_PRESETS } from "./candidate/saber-presets.js";
import { createSaberFixture } from "./saber-quality.mjs";

function difference(a, b) {
    if (a.length !== b.length) {
        throw new Error("Readback dimensions differ");
    }
    let max = 0,
        changed = 0;
    for (let i = 0; i < a.length; i++) {
        const d = Math.abs(a[i] - b[i]);
        max = Math.max(max, d);
        changed += Number(d !== 0);
    }
    return { max, changed };
}
function fallback(Effect) {
    return class extends Effect {
        init(ctx) {
            return super.init({ ...ctx, gl: { getExtension: () => null } });
        }
        render(ctx) {
            super.render({ ...ctx, gl: { getExtension: () => null } });
        }
    };
}
export async function paramsChecks() {
    const job = {
        done: false,
        current: "",
        rows: [],
        resources: [],
        failed: false,
    };
    window.saberParamsJob = job;
    const source = new Image();
    source.src = "../ae-source.png";
    await source.decode();
    for (const pixelRatio of [1, 1.5, 2]) {
        for (const preset of [undefined, ...Object.keys(SABER_PRESETS)]) {
            job.current = `preset ${preset ?? "default"} DPR ${pixelRatio}`;
            const frames = [];
            for (const Effect of [Baseline, Candidate]) {
                const f = await createSaberFixture({
                    Effect,
                    pixelRatio,
                    width: 480,
                    height: 270,
                    sourceWidth: 480,
                    sourceHeight: 270,
                    options: {
                        ...(preset ? { preset } : {}),
                        source: false,
                        pad: 160,
                        edgeThreshold: preset === "wormhole" ? 1 : 0.5,
                    },
                    paint: (c) => c.drawImage(source, 0, 0, 480, 270),
                });
                try {
                    frames.push([1, 2].map((t) => f.screen(t).pixels));
                    if (f.gl.getError()) {
                        throw new Error(`${job.current}: WebGL error`);
                    }
                } finally {
                    f.destroy();
                }
            }
            for (let i = 0; i < 2; i++) {
                const row = {
                    preset: preset ?? "default",
                    pixelRatio,
                    time: i + 1,
                    ...difference(frames[0][i], frames[1][i]),
                };
                job.rows.push(row);
                job.failed ||= row.max > 1;
            }
        }
        for (const legacy of [false, true]) {
            const steps = [
                { name: "fire", params: {} },
                {
                    name: "hdr",
                    params: {
                        brightness: 3,
                        gamma: 0.7,
                        saturation: 1.8,
                        glowPreGamma: 0.6,
                    },
                },
                {
                    name: "shutter",
                    params: {
                        coreDistortion: { motionBlur: 0.12 },
                        glowDistortion: { motionBlur: 0.05 },
                    },
                },
                {
                    name: "flicker",
                    params: {
                        flickerIntensity: 0.8,
                        flickerSpeed: 7,
                        flickerSeed: 17,
                    },
                },
                {
                    name: "glow-distort",
                    params: {
                        glowDistortion: { composite: "distort", invert: true },
                    },
                },
                {
                    name: "no-glow-warp",
                    params: { glowDistortion: { amount: 0 } },
                },
                {
                    name: "no-core-warp",
                    params: { coreDistortion: { amount: 0 } },
                },
                {
                    name: "reveal",
                    params: { end: 0.63, coreDistortion: { amount: 10 } },
                },
                { name: "full", params: { end: 1 } },
                { name: "glow-off", params: { glow: 0 } },
                { name: "preset-switch", params: { preset: "arc-reactor" } },
                { name: "dynamic", params: { dynamic: true } },
                {
                    name: "soft-core",
                    params: { dynamic: false, coreSoftness: 3 },
                },
                { name: "analytic-core", params: { coreSoftness: 0 } },
                { name: "source", params: { source: true, brightness: 0 } },
            ];
            const frames = [];
            for (const Effect of [Baseline, Candidate]) {
                const f = await createSaberFixture({
                    Effect: legacy ? fallback(Effect) : Effect,
                    pixelRatio,
                    width: 481,
                    height: 303,
                    sourceWidth: 197,
                    sourceHeight: 91,
                    options: { preset: "fire", source: false, pad: 83 },
                    trackResources: true,
                });
                try {
                    const output = [];
                    for (const { name, params } of steps) {
                        job.current = `${name} DPR ${pixelRatio} legacy ${legacy}`;
                        f.effect.setParams(params);
                        if (name === "reveal") {
                            // Wait for the asynchronous trace before comparing revealed contours.
                            for (let i = 0; i < 8; i++) {
                                await f.settle(2);
                                await new Promise(requestAnimationFrame);
                            }
                        }
                        await f.settle(2);
                        output.push(f.screen(2).pixels);
                    }
                    frames.push(output);
                    if (f.gl.getError()) {
                        throw new Error(`${job.current}: WebGL error`);
                    }
                } finally {
                    f.destroy();
                }
                const disposed = f.resources.snapshot();
                job.resources.push({
                    pixelRatio,
                    legacy,
                    renderer: Effect === Baseline ? "before" : "after",
                    disposed,
                });
                job.failed ||= Object.values(disposed.objects).some(
                    (n) => n !== 0,
                );
            }
            steps.forEach(({ name }, i) => {
                const row = {
                    name,
                    pixelRatio,
                    legacy,
                    ...difference(frames[0][i], frames[1][i]),
                };
                job.rows.push(row);
                job.failed ||= row.max > 1;
            });
        }
    }
    job.done = true;
    const response = await fetch("/results/stage30-evidence/qa.json", {
        method: "POST",
        body: JSON.stringify(job, null, 2),
    });
    if (!response.ok) {
        throw new Error("Could not save QA");
    }
    return job;
}
