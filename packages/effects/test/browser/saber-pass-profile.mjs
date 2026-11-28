// Run in a frozen comparison harness. Replay one recorded draw per timed frame:
// inline ANGLE/Metal queries grew with pass position, even after gl.finish().
// These isolated costs are not additive in-situ timings. Also measure normal,
// uninterrupted frames, with no per-pass query or GPU drain.
import { SaberEffect } from "./candidate/saber.js";
import { createSaberFixture, summarize } from "./saber-quality.mjs";

function passName({ uniforms: u = {} }) {
    const kind = u.haloPass === 1 ? "halo" : u.glowPass === 1 ? "glow" : "core";
    if (u.noiseFieldPass === 1) {
        return `${kind}-noise`;
    }
    if (u.noiseType !== undefined) {
        return `${kind}-warp`;
    }
    if (u.coreGain !== undefined) {
        return "composite";
    }
    if (u.revealEnd !== undefined) {
        return "core-source";
    }
    if (u.stepSize !== undefined) {
        return "distance-flood";
    }
    if (u.payloadOn !== undefined) {
        return "distance-seed";
    }
    if (u.edgeMode !== undefined) {
        return "distance-resolve";
    }
    if (u.axis) {
        return "blur";
    }
    if (u.layer0) {
        return "glow-pack";
    }
    return "other";
}

class ProfiledSaber extends SaberEffect {
    probe = null;
    draws = [];
    replay = null;
    replayDraws = new Map();
    render(ctx) {
        this.draws = [];
        this.context = ctx;
        const render = () =>
            super.render({
                ...ctx,
                draw: (draw) => {
                    const name = passName(draw);
                    this.draws.push({
                        name,
                        draw,
                        target: draw.target,
                        size: draw.target
                            ? [draw.target.width, draw.target.height]
                            : ctx.dims.canvasPixel,
                    });
                    if (this.probe?.selected === name) {
                        this.probe.measure(name, () => ctx.draw(draw));
                    } else {
                        ctx.draw(draw);
                    }
                },
            });
        if (this.replay) {
            const draw = this.replayDraws.get(this.replay);
            this.probe.measure(this.replay, () => ctx.draw(draw));
        } else if (this.probe?.selected === "effect-total") {
            this.probe.measure("effect-total", render);
        } else {
            render();
        }
    }
}

function gpuProbe(gl, drainBeforeQuery) {
    const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    if (!ext) {
        throw new Error("GPU timer queries unavailable");
    }
    let pending = [];
    const values = {};
    const probe = {
        selected: null,
        disjointEvents: 0,
        discarded: 0,
        values,
        measure(name, draw) {
            // ANGLE/Metal elapsed queries can include dependency waits from
            // earlier command buffers. Drain outside the measured interval.
            // This is an isolated-pass diagnostic, not production scheduling.
            if (drainBeforeQuery) {
                gl.finish();
            }
            const query = gl.createQuery();
            if (!query) {
                throw new Error("Could not allocate timer query");
            }
            gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
            try {
                draw();
            } finally {
                gl.endQuery(ext.TIME_ELAPSED_EXT);
                pending.push({ query, name });
            }
        },
        poll() {
            if (gl.getParameter(ext.GPU_DISJOINT_EXT)) {
                probe.disjointEvents++;
                probe.discarded += pending.length;
                for (const item of pending) {
                    gl.deleteQuery(item.query);
                }
                pending = [];
                return;
            }
            while (
                pending.length &&
                gl.getQueryParameter(
                    pending[0].query,
                    gl.QUERY_RESULT_AVAILABLE,
                )
            ) {
                const { query, name } = pending.shift();
                const ms = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
                gl.deleteQuery(query);
                if (!Number.isFinite(ms) || ms < 0) {
                    throw new Error("Invalid GPU timing");
                }
                values[name] ??= [];
                values[name].push(ms);
            }
        },
        async finish() {
            probe.selected = null;
            for (let i = 0; pending.length && i < 180; i++) {
                await new Promise(requestAnimationFrame);
                probe.poll();
            }
            if (pending.length) {
                throw new Error("GPU timer query timed out");
            }
        },
        dispose() {
            for (const { query } of pending) {
                gl.deleteQuery(query);
            }
            pending = [];
        },
    };
    return probe;
}

async function noiseEquality(effect) {
    const core = effect.draws.find((d) => d.name === "core-noise")?.target;
    const halo = effect.draws.find((d) => d.name === "halo-noise")?.target;
    if (!core || !halo) {
        return { applicable: false };
    }
    if (core.width !== halo.width || core.height !== halo.height) {
        return { applicable: true, sameSize: false };
    }
    const a = await effect.context.readPixels(core);
    const b = await effect.context.readPixels(halo);
    let changed = 0,
        max = 0;
    for (let i = 0; i < a.length; i++) {
        if (i % 4 > 1) {
            continue;
        }
        const delta = Math.abs(a[i] - b[i]);
        changed += Number(delta !== 0);
        max = Math.max(max, delta);
    }
    return { applicable: true, sameSize: true, changed, max };
}

export async function runPassProfile({
    presets = [
        "arc-reactor",
        "burning",
        "electric",
        "energy",
        "fog",
        "kryptonite",
        "fire",
        "torch",
        "tractor-beam",
        "windy",
        "wormhole",
    ],
    pixelRatios = [1, 2],
    samples = 48,
    warmup = 40,
    repeats = 2,
    drainBeforeQuery = true,
    isolatePasses = true,
    destination = "stage22-pass-profile",
} = {}) {
    if (!/^[a-z0-9-]+$/.test(destination)) {
        throw new Error("Invalid destination");
    }
    const source = new Image();
    source.src = "../ae-source.png";
    await source.decode();
    const job = {
        done: false,
        parameters: {
            width: 960,
            height: 540,
            pad: 320,
            pixelRatios,
            presets,
            samples,
            warmup,
            repeats,
            drainBeforeQuery,
            isolatePasses,
            dynamic: false,
        },
        snapshot: await (await fetch("./manifest.json")).json(),
        userAgent: navigator.userAgent,
        rows: [],
        frames: [],
    };
    window.saberPassProfile = job;
    async function save() {
        const response = await fetch(`/results/${destination}/profile.json`, {
            method: "POST",
            body: JSON.stringify(job),
        });
        if (!response.ok) {
            throw new Error(`Could not save profile: ${response.status}`);
        }
    }
    try {
        for (const pixelRatio of pixelRatios) {
            for (const preset of presets) {
                const f = await createSaberFixture({
                    Effect: ProfiledSaber,
                    width: 960,
                    height: 540,
                    sourceWidth: 960,
                    sourceHeight: 540,
                    pixelRatio,
                    options: {
                        preset,
                        pad: 320,
                        source: false,
                        edgeThreshold: preset === "wormhole" ? 1 : 0.5,
                    },
                    paint: (c) => c.drawImage(source, 0, 0),
                });
                let probe;
                try {
                    const debug = f.gl.getExtension(
                        "WEBGL_debug_renderer_info",
                    );
                    job.hardware = debug
                        ? f.gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
                        : f.gl.getParameter(f.gl.RENDERER);
                    const before = f.screen(2);
                    f.render(2.01);
                    const equality = await noiseEquality(f.effect);
                    for (let i = 0; i < warmup; i++) {
                        f.render(1 + i / 60);
                        await new Promise(requestAnimationFrame);
                    }
                    const inventory = f.effect.draws.map(({ name, size }) => ({
                        name,
                        size,
                    }));
                    f.effect.replayDraws = new Map(
                        f.effect.draws.map(({ name, draw }) => [name, draw]),
                    );
                    const counts = {};
                    for (const { name } of inventory) {
                        counts[name] = (counts[name] ?? 0) + 1;
                    }
                    // Multiple calls with the same label need explicit aggregation;
                    // steady presets should have one call per named pass.
                    if (Object.values(counts).some((n) => n !== 1)) {
                        throw new Error("Repeated pass label in steady frame");
                    }
                    const names = [
                        "frame-total",
                        "effect-total",
                        ...Object.keys(counts),
                    ];
                    for (let repeat = 0; repeat < repeats; repeat++) {
                        // A previous round's parity check rebuilds the field.
                        // Refresh recorded texture handles before replaying it.
                        f.render(2.01 + repeat / 100);
                        f.effect.replayDraws = new Map(
                            f.effect.draws.map(({ name, draw }) => [
                                name,
                                draw,
                            ]),
                        );
                        probe = gpuProbe(f.gl, drainBeforeQuery);
                        f.effect.probe = probe;
                        const order =
                            repeat % 2 ? names.slice().reverse() : names;
                        for (let sample = 0; sample < samples; sample++) {
                            job.current = {
                                pixelRatio,
                                preset,
                                repeat,
                                sample,
                            };
                            for (let index = 0; index < order.length; index++) {
                                const name =
                                    order[(index + sample) % order.length];
                                probe.selected = name;
                                f.effect.replay =
                                    isolatePasses && !name.endsWith("-total")
                                        ? name
                                        : null;
                                const time =
                                    1 +
                                    ((sample + index / order.length) /
                                        samples) *
                                        3;
                                const draw = () => f.render(time);
                                if (name === "frame-total") {
                                    probe.measure(name, draw);
                                } else {
                                    draw();
                                }
                                await new Promise(requestAnimationFrame);
                                probe.poll();
                            }
                        }
                        await probe.finish();
                        f.effect.probe = null;
                        f.effect.replay = null;
                        const timings = Object.fromEntries(
                            names.map((name) => [
                                name,
                                {
                                    ...summarize(probe.values[name] ?? []),
                                    raw: probe.values[name] ?? [],
                                },
                            ]),
                        );
                        if (
                            Object.values(timings).some(
                                (t) => t.samples < samples * 0.8,
                            )
                        ) {
                            throw new Error("Insufficient valid GPU samples");
                        }
                        f.effect.invalidate();
                        const after = f.screen(2);
                        const changedPixels = before.pixels.reduce(
                            (n, value, i) =>
                                n + Number(value !== after.pixels[i]),
                            0,
                        );
                        const glError = f.gl.getError();
                        if (changedPixels || glError) {
                            throw new Error(
                                `Profile affected rendering: ${changedPixels} bytes, GL ${glError}`,
                            );
                        }
                        job.rows.push({
                            preset,
                            pixelRatio,
                            repeat,
                            inventory,
                            noiseEquality: equality,
                            timings,
                            changedPixels,
                            glError,
                            disjointEvents: probe.disjointEvents,
                            discarded: probe.discarded,
                        });
                        probe.dispose();
                        probe = null;
                        await save();
                    }
                    job.frames.push({
                        preset,
                        pixelRatio,
                        ...(await f.benchmark({
                            warmup: 20,
                            samples: 60,
                            batch: 3,
                        })),
                    });
                    await save();
                } finally {
                    probe?.dispose();
                    f.destroy();
                }
            }
        }
        job.done = true;
        await save();
        return job;
    } catch (error) {
        job.error = String(error);
        await save();
        throw error;
    }
}
