# Saber browser diagnostics

These probes exercise the production WebGL shaders. The Node tests cover
resource ownership, invalidation and Gaussian coefficients; they cannot detect
shader aliasing or measure GPU cost.

## Freeze a comparison

Before editing, copy the built effects ESM directory to an ignored directory.
Keep all its files, including internal helpers. For parameter-consolidation
checks, use the renderer immediately before consolidation, including all nineteen
preset recipes and the layered-glow implementation used by these probes.

```sh
pnpm --filter @vfx-js/core run build:esm
pnpm --filter @vfx-js/effects run build:esm
cp -R packages/effects/lib/esm /tmp/saber-baseline
```

After editing and rebuilding, freeze both renderers and the shared core host:

```sh
node packages/effects/test/browser/prepare-saber-comparison.mjs \
  /tmp/saber-baseline /tmp/saber-comparison
python3 -m http.server 6023 --bind 127.0.0.1 --directory /tmp/saber-comparison
```

Open `http://127.0.0.1:6023/`. The manifest records SHA-256 hashes of the main
renderer and host files. Do not regenerate this folder during a measurement.
Both renderers intentionally use the same host; this isolates effect costs.

## GPU comparison

Keep other animation tabs closed, the viewport fixed, and the machine on the
same power setting. Run in the browser console:

```js
window.result = await saberComparison.runComparison({
  pixelRatios: [1, 1.5, 2, 3],
  samples: 600,
  warmup: 60,
  batch: 8,
  repeats: 3,
});
```

Progress is available as `window.saberComparisonJob`. Export that object as
JSON when finished. Each row contains CPU and GPU median/p95, renderer, case,
DPR, repetition and GL error. GPU timer queries may be unavailable; a null GPU
result is not a zero-time rendering result. Disjoint samples are discarded.
Use the median of repeated medians, and inspect p95 and repeat variation before
interpreting small differences. These timings are specific to the GPU, driver,
viewport, source and preset. They do not establish mobile performance.
Also repeat with `batch: 1` to measure one render per animation frame; batched
throughput and ordinary frame costs can differ on tile-based GPUs. Fixture
teardown releases each test context after normal resource disposal to avoid
browser context eviction during a later run.

Generate a Markdown timing table from the exported result:

```sh
node packages/effects/test/browser/summarize-saber-comparison.mjs /tmp/results.json
```

To isolate the large-padding draw-region optimization, compare two fixtures
of the same candidate. Use `pixelRatio: 2` or `3`,
`options: { preset: 'electric', dynamic: true, pad: 320 }`, and omit
`transformDraw` for the optimized fixture. For the full-target fixture use:

```js
transformDraw: (draw) =>
  draw.geometry?.attributes?.position?.itemSize === 2
    ? { ...draw, geometry: undefined }
    : draw
```

Time each with `fixture.benchmark({ samples: 360, warmup: 40, batch: 1 })`,
destroy it, and alternate order across three repetitions. This keeps both
shaders and scratch clears identical and changes only rasterized geometry.

## Numerical rendering checks

Run these after timing, never concurrently with it:

```js
const checks = await import('./saber-quality-checks.mjs');
const quality = await checks.run();
const cache = await checks.cacheChecks();
const reveal = await checks.revealChecks();
const resolution = await checks.resolutionChecks();
const noise = await checks.noiseChecks();
const resources = await checks.lifecycleChecks();
const source = await checks.sourceChecks();
const region = await checks.regionChecks();
const curves = await checks.curvedCoreChecks({ pixelRatio: 2 });
const restoration = await checks.contextRestoreChecks();
const appearanceChecks = await import('./saber-appearance-checks.mjs');
const appearance = await appearanceChecks.runAppearanceChecks({
  Baseline: saberComparison.Baseline,
});
```

The checks cover impulse energy/variance across mip boundaries, even/odd source
dimensions, DPR, fractional line widths and positions, padding invariance,
cached versus freshly rendered parameter changes,
moving reveals, supersampled procedural noise references, context restoration,
and GPU resource release. Inspect each result's failure fields; the baseline can
intentionally fail checks that motivated a correction.

The appearance check compares explicit steady settings against the supplied
pre-consolidation baseline. It also checks live preset switching against fresh
instances, brightness flicker determinism and freezing, glow independence,
soft-core energy/peak and GPU disposal. It does not compare the changed no-preset
default with the old default.

`saber-quality.mjs` also exports `createSaberFixture`, `GlowProbe`, and
`DistortionProbe` for focused experiments. `capture(pass)` returns floating-point
pixels from an internal pass; `screen()` returns composited RGBA8 pixels.
Always destroy fixtures. Resource tracking is opt-in and must remain disabled
for performance measurements.

Visual review remains necessary: numeric improvements do not prove an
attractive animated result. Storybook includes `thin-lines`,
`glow-radius-sweep`, `moving-reveal`, and the existing distortion stories.

## Combustion checks

After freezing the pre-consolidation baseline with `prepare-saber-comparison.mjs`,
import `runCombustionChecks` from `saber-combustion-checks.mjs` and pass the
baseline `SaberEffect` class. It checks distortion compatibility with explicit
steady settings, independent halo radius/gain, deterministic animated presets
and disposal at DPR 1/2 using layered glow. Bounds checks retain analytic
Fire/Embers rendering and raster sampling for synthetic extreme-noise cases.
Continue running `runAppearanceChecks` for all-preset switching and
source/softness independence.


## AE preset motion checks

Run `await (await import('./saber-motion-checks.mjs')).runMotionChecks()`.
It isolates the production noise field and verifies upward/reverse transport
against an exact 12 CSS px translation, checks directional glow-envelope reach,
and tests all eleven AE-inspired presets for animation, deterministic seeking
and frozen clocks at DPR 1/2. `failures` must be empty. This verifies motion
semantics, not pixel agreement with AE's proprietary renderer.

`directionalCoreChecks()` compares thin directional warps at DPR 1/2 with a
4× reference, versus the raster-warp fallback. The analytic path should reduce
relative error by at least 25%. It only applies to steady single outlines with
nonzero detail, including free-direction warps; reveals retain raster sampling.

`shutterChecks()` exercises core/glow shutter sampling at DPR 1/2: frozen clocks
match the zero-shutter image exactly, seeking is deterministic, and an animated
shutter changes the rendered image. It does not establish AE motion-blur parity.


Parameter-consolidation regression (frozen baseline required):

```js
const appearance = await import('./saber-appearance-checks.mjs');
const preserved = await appearance.preservedPresetChecks(saberComparison.Baseline);
// All 17 unchanged presets, 4 times, DPR 1/2: require failures.length === 0.
```

`preservedPresetChecks(Baseline, { presets, times, pixelRatios })` can run smaller
batches. Ice and Unstable intentionally changed topology; inspect their animation
separately. The no-preset appearance is now Electric. Coverage/cache probes use
explicit steady settings, avoiding dependence on that default. Glow is always
layered; obsolete pyramid/legacy-room probes have been removed. Existing motion,
reveal, softness, resource and context-restoration diagnostics remain.
