import { SaberEffect as Baseline } from "./baseline/saber.js";
import * as quality from "./saber-quality.mjs";

export const cases = [
    { name: "calm-layers", options: { ...quality.STEADY_OPTIONS, pad: 160 } },
    ...[
        "electric",
        "fire",
        "energy",
        "tractor-beam",
        "arc-reactor",
        "windy",
    ].map((preset) => ({
        name: preset,
        options: { preset, pad: 160 },
    })),
    {
        name: "fluid-glow",
        options: {
            ...quality.STEADY_OPTIONS,
            pad: 160,
            glowDistortion: {
                amount: 32,
                noiseAspectRatio: 0.6,
                windSpeed: 35,
            },
        },
    },
    { name: "core-only", options: { preset: "electric", glow: 0, pad: 80 } },
    {
        name: "dynamic-layers",
        options: { ...quality.STEADY_OPTIONS, dynamic: true, pad: 80 },
    },
    {
        name: "fine-noise",
        options: {
            ...quality.STEADY_OPTIONS,
            pad: 160,
            glowDistortion: {
                amount: 32,
                noiseScale: 4,
                noiseComplexity: 6,
                type: "energy",
            },
        },
    },
    {
        name: "soft-wide-glow",
        options: {
            ...quality.STEADY_OPTIONS,
            pad: 320,
            glowBias: -1,
            glowSizeMultiplier: 2,
        },
    },
];

const status = document.querySelector("#status");
const table = document.querySelector("#results");
const button = document.querySelector("#run");
let active = false;

export async function runComparison({
    pixelRatios = [1, 2],
    samples = 240,
    warmup = 40,
    batch = 8,
    repeats = 2,
    selected = cases.map((c) => c.name),
} = {}) {
    if (active) {
        throw new Error("A comparison is already running");
    }
    active = true;
    button.disabled = true;
    const job = {
        startedAt: new Date().toISOString(),
        parameters: { pixelRatios, samples, warmup, batch, repeats, selected },
        viewport: [innerWidth, innerHeight],
        userAgent: navigator.userAgent,
        rows: [],
        running: true,
        completed: 0,
        total: pixelRatios.length * selected.length * repeats * 2,
    };
    window.saberComparisonJob = job;
    table.innerHTML =
        "<tr><th>Case</th><th>DPR</th><th>Renderer</th><th>GPU median (ms)</th><th>GPU p95 (ms)</th></tr>";
    try {
        job.snapshot = await fetch("./manifest.json").then((r) => r.json());
        for (const pixelRatio of pixelRatios) {
            for (const testCase of cases.filter((c) =>
                selected.includes(c.name),
            )) {
                for (let repeat = 0; repeat < repeats; repeat++) {
                    // Alternate order to reduce warmup/temperature bias.
                    const renderers =
                        repeat % 2
                            ? ["candidate", "baseline"]
                            : ["baseline", "candidate"];
                    for (const renderer of renderers) {
                        status.textContent = `${job.completed}/${job.total} · ${testCase.name} · DPR ${pixelRatio} · ${renderer}`;
                        let fixture;
                        try {
                            fixture = await quality.createSaberFixture({
                                Effect:
                                    renderer === "baseline"
                                        ? Baseline
                                        : undefined,
                                pixelRatio,
                                options: testCase.options,
                            });
                            const debug = fixture.gl.getExtension(
                                "WEBGL_debug_renderer_info",
                            );
                            const hardware = debug
                                ? fixture.gl.getParameter(
                                      debug.UNMASKED_RENDERER_WEBGL,
                                  )
                                : fixture.gl.getParameter(fixture.gl.RENDERER);
                            const timing = await fixture.benchmark({
                                samples,
                                warmup,
                                batch,
                            });
                            const row = {
                                case: testCase.name,
                                pixelRatio,
                                renderer,
                                hardware,
                                repeat,
                                ...timing,
                            };
                            job.rows.push(row);
                            const tr = document.createElement("tr");
                            for (const value of [
                                row.case,
                                pixelRatio,
                                renderer,
                                timing.gpuMs.median?.toFixed(3),
                                timing.gpuMs.p95?.toFixed(3),
                            ]) {
                                const td = document.createElement("td");
                                td.textContent = String(value);
                                tr.append(td);
                            }
                            table.append(tr);
                        } finally {
                            fixture?.destroy();
                        }
                        job.completed++;
                    }
                }
            }
        }
        status.textContent = `${job.completed}/${job.total} complete`;
        job.finishedAt = new Date().toISOString();
        return job;
    } catch (error) {
        job.error = String(error);
        status.textContent = job.error;
        throw error;
    } finally {
        active = false;
        job.running = false;
        button.disabled = false;
    }
}

window.saberComparison = { quality, Baseline, cases, runComparison };
button.addEventListener("click", () => runComparison());
