# Saber per-pass GPU profile — Stage22

2026-11-27. Renderer commit `27ce4824`; rendering/presets unchanged.

Hardware: ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Max, Unspecified Version). Chrome158. Viewport1000×700 CSS px; input960×540, pad320; full contours, static source, animated distortion. Embers aliases Burning.

Each pass:40 warmup frames,48 samples ×2 rounds, reversed/rotated query order. Values below are means of the two round medians in milliseconds. Normal frame is a separate uninterrupted60-sample batch3 measurement (20 warmup frames).

**Pass values are isolated replay costs, not additive in-frame attribution.** Inline GPU queries produced pass-order-dependent values on this backend (including after gl.finish), so those pilot results were rejected. The profiler records actual draws/textures, replays one selected draw per timed frame, and drains GPU work outside its interval. Query/command-buffer boundaries and changed cache/scheduling conditions affect absolute costs; do not subtract a pass directly from total frame time to predict a speedup.

ANGLE Metal implements elapsed queries using command-buffer boundaries and GPU start/end timestamps: [QueryMtl](https://chromium.googlesource.com/angle/angle/+/main/src/libANGLE/renderer/metal/QueryMtl.mm), [CommandQueue](https://chromium.googlesource.com/angle/angle/+/main/src/libANGLE/renderer/metal/mtl_command_buffer.mm). The observed inline attribution problem is an experimental finding, not proof of a specific driver defect.

## DPR1

| Preset | Core noise | Glow noise | Halo noise | Core warp | Glow warp | Halo warp | Composite | Normal frame |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| arc-reactor | 0.48 | 0.60 | 0.48 | 0.13 | 0.26 | 0.15 | 0.11 | 2.26 |
| burning | 0.79 | 0.73 | 0.74 | 0.19 | 0.18 | 0.29 | 0.11 | 3.16 |
| electric | 0.53 | 0.40 | 0.40 | 0.14 | 0.16 | 0.16 | 0.16 | 3.35 |
| energy | 0.66 | 1.12 | 0.68 | 0.13 | 0.15 | 0.16 | 0.12 | 3.18 |
| fog | 0.71 | 0.61 | 0.71 | 0.16 | 0.23 | 0.19 | 0.14 | 1.79 |
| kryptonite | 0.55 | 1.05 | 0.56 | 0.31 | 0.40 | 0.44 | 0.13 | 3.00 |
| fire | 0.77 | 0.41 | 0.75 | 0.43 | 0.24 | 0.35 | 0.10 | 3.49 |
| torch | — | 0.84 | — | — | 0.16 | — | 0.09 | 1.14 |
| tractor-beam | 0.76 | 0.40 | 0.70 | 0.37 | 0.32 | 0.33 | 0.11 | 3.08 |
| windy | 0.52 | 0.55 | 0.51 | 0.18 | 0.14 | 0.16 | 0.11 | 2.28 |
| wormhole | 0.40 | 0.74 | 0.48 | 0.24 | 0.31 | 0.34 | 0.11 | 2.91 |

## DPR2

| Preset | Core noise | Glow noise | Halo noise | Core warp | Glow warp | Halo warp | Composite | Normal frame |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| arc-reactor | 0.50 | 0.55 | 0.42 | 0.41 | 0.56 | 0.36 | 0.35 | 3.88 |
| burning | 0.85 | 0.74 | 0.74 | 0.60 | 0.56 | 0.93 | 0.29 | 4.01 |
| electric | 0.69 | 0.51 | 0.62 | 0.45 | 0.41 | 0.42 | 0.36 | 3.31 |
| energy | 0.54 | 0.78 | 0.52 | 0.43 | 0.38 | 0.46 | 0.35 | 3.55 |
| fog | 0.55 | 0.69 | 0.52 | 0.53 | 0.42 | 0.42 | 0.38 | 3.51 |
| kryptonite | 0.36 | 0.67 | 0.35 | 0.55 | 0.81 | 0.88 | 0.23 | 3.33 |
| fire | 0.74 | 0.35 | 0.67 | 1.03 | 0.53 | 0.91 | 0.20 | 3.98 |
| torch | — | 0.90 | — | — | 0.25 | — | 0.21 | 1.50 |
| tractor-beam | 0.65 | 0.31 | 0.62 | 0.78 | 0.71 | 0.92 | 0.18 | 3.84 |
| windy | 0.58 | 0.56 | 0.57 | 0.41 | 0.35 | 0.43 | 0.33 | 2.68 |
| wormhole | 0.39 | 0.74 | 0.39 | 0.47 | 0.89 | 0.99 | 0.20 | 3.04 |

## Findings

- Core/Halo noise textures match exactly at t=2.01s in every applicable preset (ten presets ×DPR1/2). Torch has neither Core nor Halo distortion. This confirms the duplicate-noise sharing candidate; actual end-to-end savings still require implementation/measurement.
- At DPR1, noise generation dominates the isolated costs. At DPR2 the full-resolution warps become substantial: Fire Core1.03/Halo0.91ms; Tractor Beam Core0.78/Glow0.71/Halo0.92ms; Wormhole Glow0.89/Halo0.99ms. The noise grids remain roughly802×592 texels while the warped buffers are3200×2360.
- Priority: share identical Core/Halo noise first, then restrict unnecessary warp work outside conservative light/displacement bounds. Composite alone is only0.18–0.38ms at DPR2, so optimizing its arithmetic is lower priority. No speedup is inferred by subtracting isolated costs from normal-frame timings.
- Run-to-run spread is material: DPR2 Windy Core noise medians0.725/0.437ms. Use the relative workload pattern and exact noise equality for prioritization, not a universal frame-rate claim. Raw samples retain the spread.
- Distance-field generation, original Core and Blur pyramids do not run in steady frames. Their initialization, invalidation, Reveal and dynamic-source costs are outside this matrix.
- All44 rounds preserve screen bytes after restoring normal rendering. All timer groups have48 valid samples; GL errors0. Disjoint events: 0.
- Raw samples, p95, per-round spread, target sizes, hardware and renderer hashes: `packages/effects/node_modules/.cache/saber-raw/results/stage22-pass-profile/profile.json`. CSV: same folder, `summary.csv`.
- Diagnostic script: `packages/effects/test/browser/saber-pass-profile.mjs`. No renderer optimization in this change.
- Review: http://127.0.0.1:6040/stage22-pass-profile.html
