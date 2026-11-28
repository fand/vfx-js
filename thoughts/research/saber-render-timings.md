# Saber GPU timings

Final frozen renderer; Apple M4 Max / Chrome ANGLE Metal. Viewport 1000×760.
One render per frame; 40 warmup frames, 360 samples, three alternating-order
repetitions per renderer. All 216 runs returned 360 GPU samples and no GL errors.

Values are medians of run medians. Negative change means faster.
Paired ranges describe observed repetitions, not confidence intervals.

| Case | DPR | Before ms | After ms | Change | Paired range | After p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| calm-layers | 1 | 3.320 | 0.268 | -91.9% | -91.9%…-91.7% | 0.725 |
| electric-layers | 1 | 3.860 | 2.155 | -44.2% | -48.5%…-41.5% | 2.953 |
| fluid-glow | 1 | 3.402 | 1.296 | -61.9% | -71.1%…-61.2% | 2.531 |
| core-energy | 1 | 4.183 | 4.102 | -1.9% | -6.8%…5.8% | 6.657 |
| electric-pyramid | 1 | 1.891 | 1.818 | -3.8% | -7.1%…-2.5% | 2.711 |
| core-only | 1 | 1.911 | 1.527 | -20.1% | -22.2%…-19.6% | 2.565 |
| dynamic-pyramid | 1 | 4.017 | 3.840 | -4.4% | -6.0%…4.7% | 5.695 |
| fine-noise | 1 | 3.876 | 4.102 | 5.8% | -4.6%…14.9% | 6.747 |
| soft-wide-glow | 1 | 3.824 | 3.334 | -12.8% | -18.8%…-6.1% | 7.105 |
| calm-layers | 1.5 | 3.864 | 0.296 | -92.3% | -92.9%…-92.0% | 0.999 |
| electric-layers | 1.5 | 4.659 | 4.259 | -8.6% | -11.4%…-8.6% | 6.591 |
| fluid-glow | 1.5 | 4.287 | 0.500 | -88.3% | -89.2%…-87.5% | 2.353 |
| core-energy | 1.5 | 5.082 | 4.441 | -12.6% | -15.2%…-8.9% | 7.228 |
| electric-pyramid | 1.5 | 2.297 | 2.019 | -12.1% | -12.5%…-6.2% | 3.616 |
| core-only | 1.5 | 2.331 | 0.830 | -64.4% | -64.4%…-64.1% | 2.355 |
| dynamic-pyramid | 1.5 | 3.899 | 4.435 | 13.7% | -0.7%…15.8% | 6.426 |
| fine-noise | 1.5 | 4.858 | 4.420 | -9.0% | -11.0%…-2.2% | 6.562 |
| soft-wide-glow | 1.5 | 4.653 | 4.422 | -5.0% | -8.4%…-3.3% | 7.097 |
| calm-layers | 2 | 3.839 | 0.472 | -87.7% | -89.1%…-86.9% | 1.202 |
| electric-layers | 2 | 4.420 | 4.342 | -1.8% | -11.2%…-1.6% | 7.519 |
| fluid-glow | 2 | 4.351 | 0.795 | -81.7% | -83.0%…-79.7% | 2.700 |
| core-energy | 2 | 5.143 | 4.748 | -7.7% | -7.9%…-0.8% | 7.584 |
| electric-pyramid | 2 | 2.439 | 2.428 | -0.5% | -4.4%…0.6% | 3.597 |
| core-only | 2 | 2.446 | 1.083 | -55.7% | -57.2%…-54.1% | 2.666 |
| dynamic-pyramid | 2 | 4.499 | 4.659 | 3.6% | -5.5%…10.3% | 7.164 |
| fine-noise | 2 | 4.635 | 4.425 | -4.5% | -5.5%…-2.6% | 7.782 |
| soft-wide-glow | 2 | 4.639 | 4.637 | -0.0% | -3.7%…0.9% | 7.663 |
| calm-layers | 3 | 4.485 | 0.778 | -82.7% | -82.9%…-82.3% | 1.659 |
| electric-layers | 3 | 5.109 | 4.756 | -6.9% | -10.2%…-3.4% | 7.666 |
| fluid-glow | 3 | 4.859 | 1.479 | -69.6% | -69.9%…-67.0% | 3.399 |
| core-energy | 3 | 5.975 | 5.696 | -4.7% | -5.4%…1.2% | 7.249 |
| electric-pyramid | 3 | 2.816 | 2.790 | -0.9% | -7.4%…-0.9% | 4.179 |
| core-only | 3 | 2.691 | 1.666 | -38.1% | -38.9%…-34.9% | 3.218 |
| dynamic-pyramid | 3 | 5.749 | 5.857 | 1.9% | 0.0%…2.2% | 6.961 |
| fine-noise | 3 | 5.465 | 4.743 | -13.2% | -18.6%…-8.5% | 6.793 |
| soft-wide-glow | 3 | 5.612 | 5.095 | -9.2% | -9.2%…-6.9% | 7.394 |

The larger regressions in `fine-noise` (DPR 1) and `dynamic-pyramid`
(DPR 1.5) prompted the longer follow-up below.

Raw data: local artifact `saber-gpu-matrix-final.json`. The JSON includes
timestamps, hardware, CPU/GPU distributions, parameters and source hashes.

## Focused follow-up

Same frozen renderer, host, hardware and viewport. Four repetitions, 60 warmup
frames and 600 samples per run, one render per frame. All 64 runs returned all
samples with no GL errors.

| Case | DPR | Before ms | After ms | Change | After p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| dynamic-pyramid | 1 | 3.941 | 3.977 | 0.9% | 6.950 |
| fine-noise | 1 | 4.139 | 3.860 | -6.7% | 7.228 |
| dynamic-pyramid | 1.5 | 4.291 | 4.434 | 3.3% | 6.632 |
| fine-noise | 1.5 | 4.563 | 3.983 | -12.7% | 6.977 |
| dynamic-pyramid | 2 | 4.593 | 4.673 | 1.7% | 6.900 |
| fine-noise | 2 | 4.656 | 4.365 | -6.3% | 7.369 |
| dynamic-pyramid | 3 | 5.704 | 5.785 | 1.4% | 7.421 |
| fine-noise | 3 | 5.580 | 5.011 | -10.2% | 6.269 |

Fine noise improved in every paired repetition. Dynamic-input changes were
small in absolute time; paired variation remains substantial (up to +11.6%).
The main matrix is retained above rather than replaced with the follow-up.
Raw data: local artifact `saber-gpu-matrix-followup.json`.
