# Saber Core/Halo noise sharing — Stage23

2026-11-27. Baseline `ba7e8914` (Stage22). Apple M4 Max / ANGLE Metal, Chrome158.
Input960×540, viewport1000×700 CSS px, pad320, static source, animated distortion.

## Ordinary frame timing

60 warmup frames,120 samples, one rendered frame per sample, two reversed orders.
Values: mean of the two run medians, milliseconds. Full-frame GPU queries; no per-pass instrumentation.

| Preset | DPR1 before | DPR1 after | Change | DPR2 before | DPR2 after | Change |
|---|---:|---:|---:|---:|---:|---:|
| arc-reactor | 2.670 | 2.289 | -14.2% | 4.032 | 3.694 | -8.4% |
| burning | 4.135 | 3.551 | -14.1% | 3.892 | 3.849 | -1.1% |
| electric | 2.602 | 3.097 | +19.0% | 3.821 | 2.839 | -25.7% |
| energy | 3.219 | 3.439 | +6.8% | 3.427 | 3.551 | +3.6% |
| fog | 3.050 | 3.202 | +5.0% | 3.606 | 2.937 | -18.5% |
| kryptonite | 3.179 | 3.116 | -2.0% | 4.072 | 4.402 | +8.1% |
| fire | 3.799 | 2.866 | -24.6% | 4.431 | 4.036 | -8.9% |
| torch | 1.894 | 1.932 | +2.0% | 2.647 | 2.618 | -1.1% |
| tractor-beam | 3.181 | 2.956 | -7.1% | 4.454 | 3.995 | -10.3% |
| windy | 2.334 | 2.688 | +15.1% | 3.449 | 2.870 | -16.8% |
| wormhole | 3.849 | 3.016 | -21.6% | 4.153 | 4.422 | +6.5% |

Across the ten affected presets, geometric mean after/before is0.952 at DPR1,
0.922 at DPR2. Individual results include regressions; removing a draw does not
establish a universal FPS improvement. Repeat variation is substantial. Torch
has no Core/Halo noise and is a control; its timings still vary with load.
The initial batch3 pilot overlapped a repository build/test run for part of its
duration and is excluded from performance conclusions. Raw pilot is retained.

## Appearance and memory

864 review PNGs are byte-identical to Stage22. All12 presets × DPR1/2 × three
times and90 custom storage cases match every screen byte. Context restore,
resize and resource teardown pass.48 effects tests and ESM/CJS builds pass.

DPR2 tracked texture storage: Fire146.06→142.41MiB, Arc Reactor177.85→174.23MiB,
Tractor Beam146.03→142.31MiB. Torch137.97MiB unchanged. This excludes total
driver/process VRAM and active Reveal payloads. Savings also apply at DPR1.

Raw data, renderer hashes and scripts: ignored `packages/effects/node_modules/.cache/saber-raw/`
under `results/stage23-evidence/` and `stage23-noise-share-renderer/`.
Review: http://127.0.0.1:6040/stage23.html?before=stage22-presets#fire

## Batched throughput

60 warmup frames,80 samples ×8 rendered frames, two reversed orders.
Per-frame milliseconds from full-frame queries, not isolated passes. This
measures sustained batches, not ordinary requestAnimationFrame latency.

| Preset | DPR1 before | DPR1 after | Change | DPR2 before | DPR2 after | Change |
|---|---:|---:|---:|---:|---:|---:|
| arc-reactor | 1.397 | 1.318 | -5.6% | 4.009 | 2.367 | -40.9% |
| burning | 4.227 | 2.257 | -46.6% | 6.095 | 6.319 | +3.7% |
| electric | 1.428 | 1.293 | -9.4% | 3.189 | 2.064 | -35.3% |
| energy | 1.746 | 1.486 | -14.9% | 3.904 | 3.796 | -2.8% |
| fog | 1.382 | 1.294 | -6.4% | 3.282 | 2.011 | -38.7% |
| kryptonite | 2.163 | 1.997 | -7.6% | 6.173 | 6.045 | -2.1% |
| fire | 3.989 | 2.228 | -44.1% | 6.247 | 5.995 | -4.0% |
| torch | 0.929 | 0.874 | -5.8% | 0.908 | 0.875 | -3.7% |
| tractor-beam | 3.952 | 2.890 | -26.9% | 7.773 | 6.325 | -18.6% |
| windy | 1.405 | 1.271 | -9.5% | 2.251 | 2.067 | -8.2% |
| wormhole | 2.159 | 2.173 | +0.6% | 5.855 | 5.670 | -3.2% |

All88 rows in each confirmation run have complete GPU sample counts and GL
errors0. Batch results favor sharing overall but still vary substantially;
do not extrapolate the largest gains to all hardware or workloads. Retain both
ordinary-frame and batch results, including regressions.
