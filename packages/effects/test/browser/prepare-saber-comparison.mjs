// Freeze both renderers and the shared host, so HMR cannot invalidate a long
// comparison. Run after building effects/core ESM; pass an earlier ESM directory.

import { createHash } from "node:crypto";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const effects = path.resolve(here, "../..");
const repo = path.resolve(effects, "../..");
const baseline = process.argv[2];
if (!baseline) {
    throw new Error(
        "Usage: node test/browser/prepare-saber-comparison.mjs <baseline ESM directory> [output directory]",
    );
}
const destination = process.argv[3]
    ? path.resolve(process.argv[3])
    : path.join(effects, "node_modules/.cache/saber-comparison");
await mkdir(destination, { recursive: true });
await Promise.all([
    cp(path.resolve(baseline), path.join(destination, "baseline"), {
        recursive: true,
    }),
    cp(path.join(effects, "lib/esm"), path.join(destination, "candidate"), {
        recursive: true,
    }),
    cp(
        path.join(repo, "packages/vfx-js/lib/esm"),
        path.join(destination, "core"),
        { recursive: true },
    ),
]);
const fixture = (await readFile(path.join(here, "saber-quality.mjs"), "utf8"))
    .replaceAll("../../src/saber.ts", "./candidate/saber.js")
    .replaceAll("../../src/_saber-glow.ts", "./candidate/_saber-glow.js");
await writeFile(path.join(destination, "saber-quality.mjs"), fixture);
await cp(
    path.join(here, "track-gl-resources.mjs"),
    path.join(destination, "track-gl-resources.mjs"),
);
await cp(
    path.join(here, "saber-comparison.mjs"),
    path.join(destination, "saber-comparison.mjs"),
);
await cp(
    path.join(here, "saber-quality-checks.mjs"),
    path.join(destination, "saber-quality-checks.mjs"),
);
await cp(
    path.join(here, "saber-combustion-checks.mjs"),
    path.join(destination, "saber-combustion-checks.mjs"),
);
await writeFile(
    path.join(destination, "saber-appearance-checks.mjs"),
    (
        await readFile(path.join(here, "saber-appearance-checks.mjs"), "utf8")
    ).replaceAll("../../src/saber-presets.ts", "./candidate/saber-presets.js"),
);
await cp(
    path.join(here, "saber-noise-isolation-checks.mjs"),
    path.join(destination, "saber-noise-isolation-checks.mjs"),
);
await cp(
    path.join(here, "saber-motion-checks.mjs"),
    path.join(destination, "saber-motion-checks.mjs"),
);
for (const file of [
    "saber-color-composition-checks.mjs",
    "saber-color-composition.json",
]) {
    await cp(path.join(here, file), path.join(destination, file));
}
const hashes = {};
for (const file of [
    "baseline/saber.js",
    "baseline/_saber-glow.js",
    "baseline/_saber-blur.js",
    "baseline/_saber-coverage.js",
    "baseline/_saber-flicker.js",
    "baseline/saber-presets.js",
    "candidate/_saber-ae-presets.js",
    "candidate/_saber-color.js",
    "candidate/saber.js",
    "candidate/_saber-glow.js",
    "candidate/_saber-blur.js",
    "candidate/_saber-coverage.js",
    "candidate/_saber-flicker.js",
    "candidate/saber-presets.js",
    "core/gl/framebuffer.js",
    "core/vfx-player.js",
]) {
    hashes[file] = createHash("sha256")
        .update(await readFile(path.join(destination, file)))
        .digest("hex");
}
await writeFile(
    path.join(destination, "manifest.json"),
    JSON.stringify({ createdAt: new Date().toISOString(), hashes }, null, 2),
);
await writeFile(
    path.join(destination, "index.html"),
    `<!doctype html>
<meta charset="utf-8">
<link rel="icon" href="data:,">
<title>Saber rendering comparison</title>
<style>
body { margin:24px; background:#14171b; color:#e7ebf0; font:15px/1.5 system-ui; }
h1 { font-size:24px; } table { border-collapse:collapse; width:100%; }
td,th { text-align:left; border-bottom:1px solid #39414a; padding:8px; }
button { padding:10px 16px; font:inherit; } #status { white-space:pre-wrap; }
</style>
<h1>Saber rendering comparison</h1>
<p>Frozen baseline and candidate. GPU timings are device-specific; compare repeated runs.</p>
<button id="run">Run comparison</button>
<p id="status">Ready</p><table id="results"></table>
<script type="importmap">{"imports":{"@vfx-js/core":"./core/index.js"}}</script>
<script type="module" src="./saber-comparison.mjs"></script>
`,
);
process.stdout.write(`${destination}\n`);
