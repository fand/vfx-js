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

For AE appearance comparisons, use the original `*-raw` preset exports.
The older `*-display` exports override Core Size to 2 and Glow Intensity to 20;
they expose structure but are not the native preset brightness reference.
Fire also uses the original export; its previously approved dimmer version remains an archival comparison.
Use the exported source alpha, identical times, and identical cropping. With a
full-frame 960×540 source, `pad: 320` supplies overscan for distorted broad glow;
crop the viewport readback to the source rectangle instead of resizing it.

## Isolated AE Glow response

Run `ae-saber-glow-probe.jsx` through AE's `DoScript` to export one-parameter
sweeps to `/private/tmp/vfx-js-saber-glow-probe` on macOS, or
`Folder.temp/vfx-js-saber-glow-probe` elsewhere.
It creates a temporary 512×512 line
comp, disables Halo/Core/Glow distortion and flicker, and records actual
property values. It renders at the references' 16-bit depth, then restores the
original depth and removes its temporary comp/solid (existing comps are untouched).
Wait for all 43 PNGs to finish writing after `DoScript` returns before analysis.
Some high-gain frames clip; use only unsaturated profiles for numerical fits.
Keep project depth controlled. Later matched 16/32-bpc tests found near-identical
16-bit outputs; the earlier apparent depth difference was confounded.

`await (await import('./saber-appearance-checks.mjs')).runGlowCalibrationChecks()`
checks production float-buffer line profiles at DPR 1/2. The linear blur helper
conserves energy as radius changes; post-blur Pre Gamma changes the width.
`GlowProbe` accepts `normalized: true` and `preGamma` to inspect this path;
its default remains the radius-weighted Halo/Core-softness diagnostic.

The normalized Glow migration converts recipe gains once as
`oldIntensity * size * glowSizeMultiplier`. It is a unit conversion, not a fit.
Pre Gamma 1 recipes should remain unchanged at their stored radius; recipes
with non-neutral Pre Gamma intentionally change after moving it after blur.

After changing output grading, run
`await (await import('./saber-appearance-checks.mjs')).runOutputChecks()`.
This checks Gamma/Brightness direction, grayscale at Saturation 0, transparent
light at Brightness 0, and unchanged source pixels. Gamma is the direct exponent
(below 1 lifts midtones), matching the installed AE Saber probe. Preset grades
preserve the previous VFX-JS looks; they are not copied AE preset values.

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
throughput and ordinary frame costs can differ on tile-based GPUs. The fixture
releases detached VFX capability-probe contexts after construction and its
renderer context after normal teardown, avoiding browser context eviction
during a later run.

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
const motionChecks = await import('./saber-motion-checks.mjs');
const turbulence = await motionChecks.turbulenceChecks();
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

The turbulence probe isolates coarse/fine production noise bands. With frozen
evolution it checks distinct signed wind velocities, at DPR 1/2, rather than
merely asserting that the image changes over time. AE animation analysis should
also exclude the core and inspect multiple spatial scales. A change in total
image variance alone does not establish matching transport or cloud dynamics.

Visual review remains necessary: numeric improvements do not prove an
attractive animated result. Storybook includes `thin-lines`,
`glow-radius-sweep`, `moving-reveal`, and the existing distortion stories.

## Combustion checks

After freezing the pre-consolidation baseline with `prepare-saber-comparison.mjs`,
import `runCombustionChecks` from `saber-combustion-checks.mjs` and pass the
baseline `SaberEffect` class. It checks distortion compatibility with explicit
steady settings, Layer 4 Halo radius/gain, deterministic animated presets
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
// Retained recipes, 4 times, DPR 1/2: require failures.length === 0.
```

`preservedPresetChecks(Baseline, { presets, times, pixelRatios })` can run smaller
batches. Use a baseline with the same composition semantics.
The no-preset appearance is Electric. Coverage/cache probes use
explicit steady settings, avoiding dependence on that default. Glow is always
layered; obsolete pyramid/legacy-room probes have been removed. Existing motion,
reveal, softness, resource and context-restoration diagnostics remain.

### AE Bias and layer composition

Run `ae-saber-glow-layers.jsx` with AE DoScriptFile. It writes 78 independent
512px straight-core cases to `/private/tmp/vfx-js-saber-glow-layers` on macOS,
using the installed AE 2025 `_HIDDEN X-Factor 16` template for 16-bit PNG.
Check `manifest.txt` ends with `DONE 78` and all images are present. The script
restores bit depth/previous queue enable flags and removes only its own items.
A different AE version may require an equivalent 16-bit PNG output template.

Cases isolate each layer across Bias 0–4, individual and combined layers at
Pre Gamma 0.5/1/2, and Layer 4 with/without Halo. Subtract the constant far-field
floor before computing glow ratios; avoid clipped core pixels. Bias balance
is a small-signal approximation. The later transfer probe below supersedes the additive/Halo-source hypothesis. Do not use these tests as a preset-parity score.

`runGlowCompositionChecks()` from `saber-appearance-checks.mjs` exercises the
linear blur helper's sum-before/after-gamma distinction, four isolated layers versus
their combination, and exactly dark disabled layers at DPR 1/2.

Analyze the 16-bit PNGs with:

```sh
uv run --with pypng --with numpy packages/effects/test/browser/analyze-saber-glow-layers.py /private/tmp/vfx-js-saber-glow-layers
```

This writes `analysis.json` (Bias curves, additive residuals, Halo dependency)
and `profiles.json` (raw center rows). It rejects missing images and 8-bit output.


### AE nonlinear amplification, Screen and Halo

Run `ae-saber-glow-transfer.jsx` through AE `DoScriptFile`. It writes 231
independent cases to `/private/tmp/vfx-js-saber-glow-transfer`, in batches of 24.
It checks every queue item's completion, restores depth/queue enable flags, and
removes only its own project items. The installed AE 2025 template is required.

```sh
uv run --with pypng --with numpy packages/effects/test/browser/analyze-saber-glow-transfer.py /private/tmp/vfx-js-saber-glow-transfer
```

The analyzer requires `DONE 231`, all frames and 16-bit output. It writes center
profiles and measured gain, Screen, Halo product, output-grade and distortion
comparisons. Gains 0.1–4, Pre Gamma 0.5/1/2, held-out radii 8/32/64, Halo size
and intensity, and controlled output brightness isolate the transfer ordering.
The fitted cubic is an approximation; white-line data do not establish colored
preset or noise parity. Very weak signals hit AE's quantization floor.

`runGlowTransferChecks()` from `saber-appearance-checks.mjs` exercises the actual
Saber compositor at DPR 1/2: Screen versus addition, Halo exclusion from Glow
Distortion/flow, zero Halo, matched size/gain products, nonlinear amplification
and finite HDR bounds. The raw blur helper's `response: 0` remains linear;
`GlowProbe({ normalized: true, response: 1, inputGain: 50 })` exposes the same
RGBA layer transfer used by production. Its alpha channel is Halo energy,
not opacity. Run the existing output/appearance/cache checks as well.

Halo now means Layer 4, with neutral multipliers 100/100. Historical frozen
comparisons expecting an independent Halo or unchanged pixels must be interpreted
against their original renderer. The updated combustion Halo checks follow the
new units; its old-vs-new distortion compatibility check still needs a baseline
with the same composition semantics.

`runHaloBoundaryChecks()` renders Arc Reactor, Burning and Tractor Beam on a
text source at t=1/2/3, DPR 1/2. It checks the pre-clamp Halo signal for broad
saturated plateaus, not merely finite pixels. An optional `Effect` supplies a
frozen baseline and `paint` supplies a reference alpha. The pre-fix weak-signal
Halo compensation fails all 18 cases; the corrected input gains should pass.

## Current presets beside AE

`saber-preset-review.html` shows all twelve retained names, an AE/current overview,
frame-locked playback, stepping and slow motion. The eleven AE-inspired recipes
use original `*-raw` references, including Fire. Embers maps to Burning; the
seven original recipes were removed. Manual AE selection is explicitly labeled.

Use a comparison root containing `ae-source.png` and
`ae/<name>-raw/000.png` through `071.png` (960×540, 24 fps, AE times 1–4 s).
Build effects ESM, then freeze the current renderer:

```sh
node packages/effects/test/browser/prepare-saber-comparison.mjs \
  packages/effects/lib/esm <root>/current-presets-renderer
cp packages/effects/test/browser/capture-saber-preset-review.mjs <root>/current-presets-renderer/
cp packages/effects/test/browser/saber-preset-review.html <root>/current-presets.html
```

Serve that root with the local diagnostic server supporting POST writes under
`/results/`. Open `current-presets-renderer/index.html`, then run:

```js
await (await import('./capture-saber-preset-review.mjs')).capturePresetReview();
```

Progress is in `window.presetReviewJob`; do not navigate away during capture.
The completed manifest is written last, recording all preset options, source
thresholds and renderer hashes. It generates 12×72 PNGs under
`results/preset-review/`. Then open `current-presets.html`. It preloads only the
selected pair's 72 frames and draws both canvases from one integer frame clock;
there is no independent video playback drift. Changing the renderer requires
rebuilding, freezing and recapturing. The page is a snapshot, not live HMR.


## Staged calibration review

Freeze a separate renderer before each stage and capture with a unique destination:

```js
await (await import('./capture-saber-preset-review.mjs')).capturePresetReview({
    destination: "stage4-presets",
});
```

Copy `saber-preset-review.html`, replacing `results/preset-review` with the stage's
result directory. Add `?before=stage3-presets#fog` to show AE, the previous stage,
and the current stage on one shared frame clock. Keep earlier directories frozen.
A completed manifest, 72 PNGs per preset, and zero GL errors are required before
sharing a stage. `prepare-saber-comparison.mjs` also hashes the native preset data
and empirical color-response helper in the candidate build.

`ae-saber-color-palette.jsx` exports 185 isolated color/radiance cases.
`analyze-saber-color-palette.py <export directory> <output.json>` regenerates the
36 hue curves (requires NumPy and pypng). Values in `_saber-color.ts` are rounded
to six decimals. Independent core-only color samples validate interpolation.
`ae-saber-noise-isolation.jsx` exports 37 isolated Amount/Invert/Bias/Wind/Core
cases. Additional stage scripts and raw measurements are archived under the
ignored review results; the research note records conclusions and limitations.

`runGlowMaskOrderingChecks()` in `saber-noise-isolation-checks.mjs` checks the
production compositor with a constant half-density diagnostic field at DPR1/2.
It separates pre-mask brightness/clipping from the procedural noise model.
`runGlowTransferChecks()` measures amplification below that clipping knee and
checks that the distorted RGB intermediate stays bounded.

Additional isolated regressions after the noise/transport calibration:

```js
const noise = await import('./saber-noise-isolation-checks.mjs');
const appearance = await import('./saber-appearance-checks.mjs');
await noise.runGlowMaskOrderingChecks(); // two components, pre-mask clipping
await noise.runNoiseBlurChecks(); // six spatial samples; wind0 bypass
await appearance.runCoreOverlayChecks(); // Screen and activation conditions
await appearance.runGlowResolutionChecks(); // full-resolution field reference
```

The shared noise fields approximate native density statistics and correlation;
these regressions do not assert native random-pattern or animation equivalence.
Motion Blur tests compare six separate source-anchored samples at frozen noise
evolution. `motionBlur` remains seconds; native Motion Blur converts by 0.15.

`runNoiseEvolutionChecks()` compares the four-octave noise against held-out AE
time correlations at starts3/4 seconds and intervals .0625/.125/.25 seconds.
Spatial lacunarity must not multiply the evolution clock at each octave.

`runSmokeDensityChecks()` compares single-/four-octave Smoke field mean,
standard deviation and spatial-gradient RMS with AE saturated white probes.
It catches low-contrast fields without requiring identical random patterns.


### Colored composition order

`ae-saber-color-composition.jsx` isolates colored layers at Saturation1/2;
`ae-saber-color-boundaries.jsx` isolates Core/Glow/Halo and Blend on Top at
Gamma .5/1/2. They export to `/private/tmp/vfx-js-saber-color-*11`.
The installed plugin combines scalar light before colorization, Saturation and
Gamma, including the original-Core overlay. White-only Gamma1 probes cannot
distinguish scalar Screen from RGB Screen.

`runColorCompositionChecks()` in `saber-color-composition-checks.mjs` injects
measured scalar texture inputs into the production GPU compositor and compares
51 samples against native RGB in `saber-color-composition.json`. References
use x264/272/288/312 at y256 from the four-layer probe, and x256/258/260 at y256
from the overlay probe. Values are 8-bit decoded PNG/255; each reference is
named by hue, Saturation or Gamma, and x. The 0.025 bound accommodates input
quantization near the empirical color curve's knees and output dithering.


`ae-saber-layer-noise.jsx` isolates three-layer Screen versus Multiply/Distort,
including inverted noise and wind blur. Native Multiply masks the combined
Glow, not each layer independently. `runGlowMaskOrderingChecks()` covers one
and three saturated layers at DPR1/2 and the identity of partial protection.
Layer capture RGB now packs combined affected light in R, protected light in G,
zero in B; A remains Halo. This layout applies when distortion/flow is active.


### Core/Halo filter ordering

`ae-saber-core-filter-order.jsx` renders60 native Core width samples plus
steady/warped Halo and Softness25. Recover the native absolute warped distance
from the width coverage sweep, then sample the steady filtered profile through
that field: Halo/Softness follow blur-before-warp, not blur-after-warp.
Raw evidence and analysis are retained under local `results/stage13-evidence/`.
`runCoreFilterOrderingChecks()` checks production Core and Halo under an affine
2× pullback at DPR1/2: width halves while peak intensity remains constant.
Both Core Softness and Halo reuse the original-source blur across animation.


### Fire Core noise isolation

`ae-saber-fire-noise-fields.jsx` exports16 Fluid/Energy fields plus a baseline,
with scale25/178, complexity1/4 and two seeds. Analyze genuine16-bit PNGs with
`python3 analyze-saber-fire-noise.py <output directory>` (numpy + pypng).
`ae-saber-fire-core-grid.jsx` measures225 closed point masks at two amounts,
Bias1/3 and four seeds. `ae-saber-fire-core-text.jsx` isolates Core width,
Bias and wind blur using native Fire text. All scripts restore bit depth and
existing render-queue flags and remove their own temporary project items.
`runRidgeDensityChecks()` checks native ensemble mean/std/gradient from the
field probes. The Stage14 research note records limitations and local evidence.

For the native lattice, run `ae-saber-fire-noise-fields.jsx` at renderScale1 and2,
then `python3 analyze-saber-noise-grid.py <1x output> <2x output>`.
`runNoiseGridChecks()` checks post-Bias interpolation and a fixed CSS grid at
DPR1/2. `runGlowResolutionChecks()` now checks odd-padding invariance of the
whole effect, including steep Core folds; the old adaptive-resolution comparison
was superseded by the measured native grid. Wind-blur checks use spatial samples
of the current field instead of independently re-evaluating future time.

Fire noise isolation: `ae-saber-fire-noise-fields.jsx` has `density`, `vectors`
and `aspect` modes. Each changes one group of native parameters and restores
AE's bit depth and render queue. Run at renderScale1 for vector inversion.
`analyze-saber-noise-vectors.py <vectors-dir> --density <density-dir>` recovers
signed displacement from orthogonal ramps and independently validates it against
Multiply output (numpy/scipy/pypng required). `analyze-saber-fire-noise.py` also
reports vertical gradients for aspect sweeps. GPU regressions:
`runNoiseTailChecks()` and `runNoiseAspectChecks()` in the isolation module.
