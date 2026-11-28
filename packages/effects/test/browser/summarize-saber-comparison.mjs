// node test/browser/summarize-saber-comparison.mjs <exported comparison JSON>
import { readFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) {
    throw new Error("Pass a completed saberComparisonJob JSON file");
}
const job = JSON.parse(await readFile(file, "utf8"));
if (job.running || job.error || job.completed !== job.total) {
    throw new Error("The comparison did not complete successfully");
}
if (job.rows.some((row) => row.glError !== 0)) {
    throw new Error("The comparison contains WebGL errors");
}
const median = (values) => {
    const sorted = values.toSorted((a, b) => a - b);
    return sorted.length % 2
        ? sorted[Math.floor(sorted.length / 2)]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};
const groups = new Map();
const repeats =
    job.parameters?.repeats ?? new Set(job.rows.map((row) => row.repeat)).size;
for (const row of job.rows) {
    const key = `${row.case}:${row.pixelRatio}`;
    if (!groups.has(key)) {
        groups.set(key, { name: row.case, dpr: row.pixelRatio, rows: [] });
    }
    groups.get(key).rows.push(row);
}
const output = [
    `GPU: ${[...new Set(job.rows.map((row) => row.hardware))].join(", ")}`,
    `Viewport: ${job.viewport?.join(" × ") ?? "unrecorded"}; ${repeats} repetitions; ${job.parameters?.samples ?? "unrecorded"} samples per run.`,
    "",
    "GPU times below are medians of repeated run medians. Negative changes are faster.",
    "Paired range shows the smallest/largest percentage change across repetitions, not a confidence interval.",
    "",
    "| Case | DPR | Baseline ms | Candidate ms | Change | Paired range | Candidate p95 ms |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
];
for (const { name, dpr, rows } of groups.values()) {
    const baseline = rows.filter((row) => row.renderer === "baseline");
    const candidate = rows.filter((row) => row.renderer === "candidate");
    if (baseline.length !== repeats || candidate.length !== repeats) {
        throw new Error(`Missing repeats: ${name}, DPR ${dpr}`);
    }
    if (rows.some((row) => row.gpuMs.median === null)) {
        output.push(
            `| ${name} | ${dpr} | unavailable | unavailable | — | — | — |`,
        );
        continue;
    }
    const a = median(baseline.map((row) => row.gpuMs.median));
    const b = median(candidate.map((row) => row.gpuMs.median));
    const p95 = median(candidate.map((row) => row.gpuMs.p95));
    const deltas = candidate.map((row) => {
        const before = baseline.find((other) => other.repeat === row.repeat);
        if (!before) {
            throw new Error(`Missing paired repeat: ${name}`);
        }
        return (row.gpuMs.median / before.gpuMs.median - 1) * 100;
    });
    output.push(
        `| ${name} | ${dpr} | ${a.toFixed(3)} | ${b.toFixed(3)} | ${((b / a - 1) * 100).toFixed(1)}% | ${Math.min(...deltas).toFixed(1)}%…${Math.max(...deltas).toFixed(1)}% | ${p95.toFixed(3)} |`,
    );
}
process.stdout.write(`${output.join("\n")}\n`);
