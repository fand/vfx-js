# Saber parameter consolidation

## Objective

Replace the legacy procedural line generator with the existing Core Distortion pipeline. Remove redundant glow controls and the unused pyramid glow path. Execute after this plan; no compatibility aliases and no automatic commit.

## Findings

- `packages/effects/src/saber.ts` exposes 45 top-level parameters. Legacy line noise runs before the newer independent core/glow distortions.
- Every preset uses four-layer glow. Seventeen of nineteen preset names already disable the legacy generator; only Ice and Unstable need new recipes. Embers remains an alias of Burning.
- Glow Spread and Glow Size Multiplier multiply the same radii. Glow Intensity Multiplier duplicates Glow. Glow Falloff only affects the obsolete pyramid mode.
- The distance field, reveal tracing, line coverage, field support and cached rendering are shared infrastructure. Keep these when removing the old generator.
- Browser diagnostics recognize the old core shader by its `roomTex` uniform. Their classifiers and fixtures must migrate too.

## Final API and migration

Keep 32 top-level parameters (67 scalar controls including nested fields), all nineteen preset names and all existing exported type names.

| Removed parameters | Replacement |
| --- | --- |
| `amplitude`, `mainAmplitude` | Reauthor with `coreDistortion.amount`; no exact numeric conversion |
| `scale` | `coreDistortion.noiseScale`; different spatial basis, tune visually |
| `sharpness`, `burst` | Reauthor with distortion type, noise bias/detail/complexity |
| `speed` | Independent `windSpeed` and `noiseSpeed` in each distortion group |
| `flicker` | Shape evolution uses distortion clocks; brightness flicker uses existing `flickerIntensity`/`flickerSpeed`/`flickerSeed` |
| `lines`, `variation` | No line-count equivalent; one contour with distortion, optional original-core overlay |
| `glowMode`, `glowFalloff` | Always four glow layers; reauthor pyramid looks using layer sizes/intensities |
| `glowSpread` | `new.glowSizeMultiplier = old.glowSpread * old.glowSizeMultiplier` |
| `glowIntensityMultiplier` | `new.glow = old.glow * old.glowIntensityMultiplier` |

Keep all fifteen fields in each distortion group. Unused preset values alone do not make useful independent controls obsolete. Keep source, edge, padding, dynamic updates, reveal, halo, core overlay/softness and brightness flicker unchanged.

Default construction uses the Electric appearance recipe, then explicit options override it. Presets continue to reset all appearance settings while preserving input/reveal settings. Unknown top-level options throw a descriptive error before mutation so removed options cannot silently survive in JavaScript. Direct mutation of `params` remains supported for valid fields.

## Phase 1 — Preserve evidence

- [x] Compile and freeze the full current effects ESM renderer at `/tmp/saber-params-baseline-20261124` before edits.
- [x] Create a frozen comparison harness in ignored build cache. Use the same source, dimensions, times and DPR for both renderers.
- Compare seventeen preserved preset names at multiple times and DPR 1/2. Target identical RGBA pixels; investigate every difference.

## Phase 2 — Consolidate rendering and types

Files: `packages/effects/src/saber.ts`, `_saber-glow.ts`, `_saber-blur.ts`.

- [x] Delete thirteen public fields, defaults, uniforms, cache dependencies and branches.
- [x] Replace the legacy multi-line shader with its existing steady contour branch. Preserve reveal math, subpixel box coverage and the undisplaced distance calculation exactly.
- [x] Remove room-generation shaders/targets, jagged line noise and pyramid rendering. Keep shared bloom helpers used by other effects.
- [x] Keep the existing 96px field-support constant under a descriptive field-related name; retain JFA and cropped-region bounds.
- [x] Retain independent distortion clocks and caches. Base core now caches independently of time. Preserve the conditional analytic core path: detailed distortion only, and no analytic line width during reveal.
- [x] Simplify layered-glow helpers by removing the redundant spread argument. Keep layer scale/gain normalization and distortion math unchanged.
- [x] Validate options before applying presets or mutating state; copy nested recipe data as before.

## Phase 3 — Migrate recipes and consumers

Files: `saber-presets.ts`, Storybook Saber stories and `attachSaberPane`, effects README, docs effect catalog, `skills/vfx-js/references/effects.md`.

- [x] Remove obsolete fields from all recipes; preserve seventeen recipes' effective rendering values.
- [x] Ice: retain cool tint/thin core/compact glow; use low-amplitude, slowly evolving Energy distortion with original-core overlay for a crisp frozen contour.
- [x] Unstable: retain warm tint and existing brightness flicker; use stronger, faster Energy core distortion. Tune visually, accepting deliberate topology differences from removed multiple lines.
- [x] Set explicit zero distortion in steady/glow-only fixtures so the new default does not change their purpose.
- [x] Remove obsolete UI controls; retain story IDs and all useful diagnostics.
- [x] Document breaking migration, default Electric, independent clocks and unconditional four-layer glow.

## Phase 4 — Verification and regression coverage

Files: `packages/effects/test/saber.test.mjs`, relevant browser diagnostics and README.

- [x] Replace old room-based pass detection and parameter edits. Remove only obsolete pyramid/room/legacy-noise-specific checks; keep reveal, coverage, caching, animation, bounds and resource tests.
- [x] Add assertions for removed-option rejection, default/preset equivalence, preset resets, nested copying and migrated recipe behavior.
- [x] Build ESM/CJS; run effects unit tests, affected lint checks and documentation API checks.
- [x] Run browser comparisons across preserved presets, timestamps and DPR; exercise live edits, frozen clocks, reveal, resource lifecycle and fractional rendering geometry.
- [x] Inspect Ice/Unstable frames and motion; measure representative preserved and migrated presets using repeated GPU timings. Do not relax image tolerances to hide changes.
- [x] Update this plan with results and any concrete limitations.

## Risks and scope

This intentionally breaks callers using removed fields and changes no-preset, Ice and Unstable appearances. Old multi-line recipes cannot be mapped exactly to single-contour distortion; document that instead of suggesting false numerical equivalence. Preserve calibrated Fire, including its broad weak glow. No noise algorithm redesign, changes to core-library public APIs, new presets, browser-test deletion, or repository-wide cleanup. Historical plans retain their original descriptions.

Rollback is ordinary source reversion; the frozen renderer remains available for comparisons. No data migration or external application writes are required.


## Execution results

- Removed all thirteen obsolete fields, leaving 32 top-level parameters / 67 scalar controls. All nineteen preset names remain.
- Final Ice uses Energy amount 3, scale 48, speed 0.125, wind 4, detail 0.35 and original-core overlay. Final Unstable uses Energy amount 10, scale 36, speed 1.4, wind 60, detail 0.5 and overlay, retaining brightness flicker. Visual iteration reduced excessive fragmentation while retaining slow/fast motion respectively.
- Seventeen preserved presets × four times (0, 0.5, 2, 7 seconds) × DPR 1/2: all **136 RGBA frames exactly match** the frozen baseline. An earlier independent 102-frame comparison also matched exactly.
- Effects tests: 31/31. ESM/CJS builds, changed TypeScript/browser-file Biome checks, API/skill checks and diff whitespace checks passed.
- All nineteen live preset switches match fresh instances. Glow energy/variance (136 rows), core coverage (28 rows), combustion compatibility/bounds, halo isolation, frozen clocks, seeking, directional-core and shutter checks passed.
- Thirty live cache edits match fresh rendering. Reveal translation is pixel-identical and retains one contour readback through position/padding changes. Sixteen cropped/full-region cases match. Context restoration is pixel-identical; GPU resources return to zero after both normal lifecycle and restoration tests.
- Nine curved thin-core probes at DPR2 have maximum phase energy range 2.10%. DPR2/3 versus DPR1 core relative L1 differences are 1.13%/1.01%; resolution comparisons are measurements, not exact-image assertions.
- Migrated the synthetic combustion bounds stress test to explicitly retain its former raster path. Removing legacy multiple lines otherwise changed the test to analytic reconstruction, whose extreme unbounded finite-gradient artifacts were not its original oracle. Fire/Embers still test analytic bounds. No tolerances were relaxed.
- Browser diagnostics were retained and updated. Shared bloom helpers and core-library source were unchanged. No commit created.

Artifacts (ignored local build cache): `packages/effects/node_modules/.cache/saber-params/`. Frozen manifest, preserved-frame JSON, numerical results, GPU timings and migrated-preset image are available there. Baseline source snapshot: `/tmp/saber-params-baseline-20261124`. Reproduce with `prepare-saber-comparison.mjs` and the browser README.


### Performance measurements

Apple M4 Max / ANGLE Metal, 640×400 CSS fixture, DPR1, pad160. Values below are medians of three alternating-order runs (90 samples, 20 warmup frames, one render per frame), in GPU milliseconds:

| Preset | Before median / p95 | After median / p95 |
| --- | --- | --- |
| Fire | 4.826 / 10.020 | 4.498 / 10.400 |
| Energy | 4.438 / 8.892 | 4.762 / 10.169 |
| Tractor Beam | 3.815 / 9.874 | 4.167 / 9.935 |
| Ice | 2.385 / 6.039 | 2.923 / 4.893 |
| Unstable | 5.215 / 10.112 | 2.711 / 6.012 |

Single-frame measurements varied substantially between runs. A focused repeat with 60 warmup frames, 120 samples, eight renders per sample and three alternating runs measured Energy 1.953→2.030ms (p95 3.410→3.407), Ice 1.318→1.268ms (p95 2.670→1.936). These do not establish a consistent slowdown or a general speedup; isolated small differences are within observed variability. No GL errors occurred. No passes or noise evaluations were added to the seventeen preserved presets; Unstable removes its old per-frame multi-line generator.

Final migrated-preset frames at 0/1/2 seconds were visually reviewed. Both animate and seek deterministically. No further shader changes were required after exact preset comparisons.


### Verification limitation

The optional whole-Storybook `tsc --noEmit` check fails on missing CSS side-effect declarations and React/ReactDOM declarations across existing stories. These package-wide typing gaps were left outside this parameter cleanup. No Saber parameter/type errors were reported. Effects ESM/CJS compilation and documentation API checks pass.

Focused Saber story + imported utilities type-check passed with the same strict compiler settings and CSS side-effect checking disabled (CSS is handled by Vite). This does not resolve the whole-Storybook typing gaps.
