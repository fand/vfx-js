// Run in a frozen harness with separate before/after core builds. Sources are
// renamed per fixture; this is not a guarantee of a cold driver binary cache.
import { SaberEffect as Baseline } from "./baseline/saber.js";
import { SaberEffect as Candidate } from "./candidate/saber.js";
import { createSaberFixture } from "./saber-quality.mjs";
import { createSaberFixture as createBaseline } from "./saber-quality-baseline.mjs";

const frame = () => new Promise(requestAnimationFrame);
export async function asyncChecks({
    repeats = 3,
    presets = ["fire", "arc-reactor", "windy", "torch"],
    destination = "stage29-evidence/async.json",
} = {}) {
    const source = new Image();
    source.src = "../ae-source.png";
    await source.decode();
    const job = {
        done: false,
        rows: [],
        current: null,
        userAgent: navigator.userAgent,
    };
    window.saberAsyncJob = job;
    const save = () =>
        fetch(`/results/${destination}`, {
            method: "POST",
            body: JSON.stringify(job),
        });
    for (let repeat = 0; repeat < repeats; repeat++) {
        for (const preset of presets) {
            for (const renderer of repeat % 2
                ? ["candidate", "baseline"]
                : ["baseline", "candidate"]) {
                job.current = { repeat, preset, renderer };
                const token = `async_${crypto.randomUUID().replaceAll("-", "")}`;
                const sources = new Map();
                const salt = (opts) => {
                    if (!sources.has(opts.frag)) {
                        sources.set(
                            opts.frag,
                            `${opts.frag.replace(/void main\s*\(/, `void ${token}(`)}\nvoid main(){ ${token}(); }`,
                        );
                    }
                    return { ...opts, frag: sources.get(opts.frag) };
                };
                const calls = {},
                    renderMs = [];
                let initSyncMs = 0,
                    initReadyMs = 0;
                const Base = renderer === "baseline" ? Baseline : Candidate;
                class Measured extends Base {
                    async init(ctx) {
                        for (const name of [
                            "compileShader",
                            "linkProgram",
                            "getShaderParameter",
                            "getProgramParameter",
                            "getActiveUniform",
                            "getUniformLocation",
                        ]) {
                            const original = ctx.gl[name].bind(ctx.gl);
                            calls[name] = { count: 0, ms: 0, maxMs: 0 };
                            ctx.gl[name] = (...args) => {
                                const start = performance.now();
                                try {
                                    return original(...args);
                                } finally {
                                    const ms = performance.now() - start;
                                    const c = calls[name];
                                    c.count++;
                                    c.ms += ms;
                                    c.maxMs = Math.max(c.maxMs, ms);
                                }
                            };
                        }
                        const start = performance.now();
                        const pending = super.init(ctx);
                        initSyncMs = performance.now() - start;
                        await pending;
                        initReadyMs = performance.now() - start;
                    }
                    render(ctx) {
                        const start = performance.now();
                        super.render(ctx);
                        renderMs.push(performance.now() - start);
                    }
                }
                const rafGaps = [],
                    timerGaps = [],
                    longTasks = [];
                let lastRAF,
                    lastTimer = performance.now(),
                    active = true;
                const beat = (now) => {
                    if (!active) {
                        return;
                    }
                    if (lastRAF !== undefined) {
                        rafGaps.push(now - lastRAF);
                    }
                    lastRAF = now;
                    requestAnimationFrame(beat);
                };
                requestAnimationFrame(beat);
                const interval = setInterval(() => {
                    const now = performance.now();
                    timerGaps.push(now - lastTimer);
                    lastTimer = now;
                }, 5);
                const observer = new PerformanceObserver((list) =>
                    longTasks.push(
                        ...list.getEntries().map((e) => ({
                            startTime: e.startTime,
                            duration: e.duration,
                        })),
                    ),
                );
                observer.observe({ type: "longtask" });
                await frame();
                await frame();
                const start = performance.now();
                let fixture;
                try {
                    fixture = await (renderer === "baseline"
                        ? createBaseline
                        : createSaberFixture)({
                        Effect: Measured,
                        pixelRatio: 2,
                        width: 960,
                        height: 540,
                        sourceWidth: 960,
                        sourceHeight: 540,
                        options: { preset, pad: 320 },
                        paint: (c) => c.drawImage(source, 0, 0),
                        transformDraw: salt,
                    });
                    const firstDrawMs = performance.now() - start;
                    await frame();
                    await new Promise((r) => setTimeout(r, 25));
                    const end = performance.now();
                    job.rows.push({
                        ...job.current,
                        initSyncMs,
                        initReadyMs,
                        firstDrawMs,
                        renderMs,
                        calls,
                        maxRafGap: Math.max(0, ...rafGaps),
                        maxTimerGap: Math.max(0, ...timerGaps),
                        heartbeatCount: timerGaps.length,
                        longTasks: longTasks.filter(
                            (e) =>
                                e.startTime < end &&
                                e.startTime + e.duration > start,
                        ),
                        parallel: !!fixture.gl.getExtension(
                            "KHR_parallel_shader_compile",
                        ),
                        glError: fixture.gl.getError(),
                    });
                } finally {
                    active = false;
                    clearInterval(interval);
                    observer.disconnect();
                    fixture?.destroy();
                }
                await save();
            }
        }
    }
    job.done = true;
    await save();
    return job;
}
