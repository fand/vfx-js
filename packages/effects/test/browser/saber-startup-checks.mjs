// Run from a frozen comparison harness. Separately measures effect first draw,
// first preset switches, and repeat switches. Excludes page/module/network load.
import { SaberEffect as Baseline } from "./baseline/saber.js";
import { SaberEffect as Candidate } from "./candidate/saber.js";
import { SABER_PRESETS } from "./candidate/saber-presets.js";
import { createSaberFixture } from "./saber-quality.mjs";

// finish() alone may return before Chromium's GPU process has completed work.
// A synchronous one-pixel canvas readback forces completion; preserve bindings.
function waitForFrame(gl) {
    const bound = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, bound);
}

export async function startupChecks({
    repeats = 3,
    destination = "stage26-evidence/startup.json",
} = {}) {
    const source = new Image();
    source.src = "../ae-source.png";
    await source.decode();
    const job = { done: false, rows: [], current: null };
    window.saberStartupJob = job;
    const save = () =>
        fetch(`/results/${destination}`, {
            method: "POST",
            body: JSON.stringify(job),
        });
    for (const mode of ["cached-source", "unique-source"]) {
        for (let repeat = 0; repeat < repeats; repeat++) {
            for (const initial of ["arc-reactor", "fire", "windy", "torch"]) {
                for (const renderer of repeat % 2
                    ? ["candidate", "baseline"]
                    : ["baseline", "candidate"]) {
                    job.current = { mode, repeat, initial, renderer };
                    // Rename the entry function without changing arithmetic or uniforms.
                    // Unique source requests shader compilation; driver binary-cache behavior
                    // is not controlled. This is not a clean-browser cold-start measurement.
                    const name = `startup_${crypto.randomUUID().replaceAll("-", "")}`;
                    const sources = new Map();
                    const salt = (opts) => {
                        if (mode !== "unique-source") {
                            return opts;
                        }
                        if (!sources.has(opts.frag)) {
                            sources.set(
                                opts.frag,
                                `${opts.frag.replace(
                                    /void main\s*\(/,
                                    `void ${name}(`,
                                )}\nvoid main() { ${name}(); }\n`,
                            );
                        }
                        return { ...opts, frag: sources.get(opts.frag) };
                    };
                    const Base = renderer === "baseline" ? Baseline : Candidate;
                    let first;
                    const calls = {};
                    class Measured extends Base {
                        init(ctx) {
                            const gl = ctx.gl;
                            for (const method of [
                                "compileShader",
                                "linkProgram",
                                "getShaderParameter",
                                "getProgramParameter",
                                "getActiveUniform",
                                "getUniformLocation",
                            ]) {
                                const original = gl[method].bind(gl);
                                calls[method] = { count: 0, ms: 0 };
                                gl[method] = (...args) => {
                                    const start = performance.now();
                                    try {
                                        return original(...args);
                                    } finally {
                                        calls[method].count++;
                                        calls[method].ms +=
                                            performance.now() - start;
                                    }
                                };
                            }
                            super.init(ctx);
                        }
                        render(ctx) {
                            if (first) {
                                return super.render(ctx);
                            }
                            waitForFrame(ctx.gl);
                            const start = performance.now();
                            super.render(ctx);
                            const submitted = performance.now();
                            waitForFrame(ctx.gl);
                            first = {
                                submitMs: submitted - start,
                                readyMs: performance.now() - start,
                            };
                        }
                    }
                    const f = await createSaberFixture({
                        Effect: Measured,
                        pixelRatio: 2,
                        width: 960,
                        height: 540,
                        sourceWidth: 960,
                        sourceHeight: 540,
                        options: { preset: initial, pad: 320 },
                        paint: (c) => c.drawImage(source, 0, 0),
                        transformDraw: salt,
                    });
                    let previous = {};
                    const record = (phase, preset, time) => {
                        const delta = Object.fromEntries(
                            Object.entries(calls).map(([key, v]) => [
                                key,
                                {
                                    count:
                                        v.count - (previous[key]?.count ?? 0),
                                    ms: v.ms - (previous[key]?.ms ?? 0),
                                },
                            ]),
                        );
                        previous = structuredClone(calls);
                        job.rows.push({
                            ...job.current,
                            phase,
                            preset,
                            ...time,
                            calls: delta,
                            glError: f.gl.getError(),
                        });
                    };
                    try {
                        record("initial", initial, first);
                        const presets = Object.keys(SABER_PRESETS).filter(
                            (p) => p !== initial,
                        );
                        for (const phase of ["first-switch", "repeat-switch"]) {
                            for (const preset of presets) {
                                waitForFrame(f.gl);
                                const start = performance.now();
                                f.effect.setParams({ preset });
                                f.render(2);
                                const submitted = performance.now();
                                waitForFrame(f.gl);
                                record(phase, preset, {
                                    submitMs: submitted - start,
                                    readyMs: performance.now() - start,
                                });
                                await new Promise(requestAnimationFrame);
                            }
                        }
                    } finally {
                        f.destroy();
                    }
                    await save();
                }
            }
        }
    }
    job.done = true;
    await save();
    return job;
}
