# Saber rendering quality

Improve visual quality without a significant steady-state GPU regression.
Keep the existing public controls and preserve prior distortion/glow work.

## Working plan

1. Preserve the current renderer as a local comparison baseline. Build a browser
   fixture for floating-point pass readback, controlled source images, DPR,
   animation time, and GPU timer queries. Measure before changing algorithms.
2. Investigate blur kernels: ringing/ghosting, energy conservation, radius
   changes across mip boundaries, odd dimensions, clipping, and disabled layers.
   Favor bilinear Gaussian taps and variance compensation over more passes.
3. Investigate thin-line coverage: diagonal edges, subpixel positions, small
   thicknesses, resolution changes, noise movement, and distorted cores.
   Improve analytic filtering where measurements justify it.
4. Improve procedural detail where it aliases or repeats, while retaining the
   smooth far halo and independent controls. Remove unnecessary work to pay for
   useful quality improvements.
5. Check source/compositing, alpha edges, reveals, live parameter changes, and
   resource lifecycle. Add focused regressions for confirmed defects.
6. Compare representative text/logo/shape cases and CPU/GPU timings. Reject or
   revise changes with unacceptable cost or aesthetic regressions. Record
   limitations, measurements, and reproducible verification instructions.

## Reference material

- [GPU Gems 3: Incremental Computation of the Gaussian](https://developer.nvidia.com/gpugems/gpugems3/part-vi-gpu-computing/chapter-40-incremental-computation-gaussian)
- [GLSL ES 3.00 specification](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf)

## Measurements and decisions

Implemented and numerically verified:

- Paired Gaussian blur, fixed-grid odd-sized mips, variance compensation and
  cubic reconstruction; stable highlight energy across resolution changes.
- Analytic thin-strip pixel coverage, improved seed projection and undisplaced
  distance handling; less subpixel brightness variation.
- Element-local noise, DPR-consistent displacement room, filtered fine octaves,
  integrated energy-noise cusps and continuous lattice-key velocity.
- Static-pass caches, fused undistorted layer composition, duplicate-radius
  sharing, disabled-glow bypass and scratch-target reuse.
- Source-only reveal tracing with reusable local contours and async guards.
- Framebuffer context-restoration and player-destruction resource fixes.
- Separable nine-fetch pyramid downsampling and correct single-level gain.
- Conservative draw regions for large padding, verified against full geometry.
- Degenerate-normal handling and area prefiltering for minified alpha sources.

Completed validation:

- Repeated nine-case, four-DPR GPU matrix: 216 ordinary-frame runs and 216
  batched runs. A 64-run follow-up checked fine-noise and dynamic-input cases;
  12 more runs isolated restricted draw geometry with large padding.
- Workspace tests, affected-package lint, effects ESM/CJS and Storybook builds.
- Final context restoration, cache, source, reveal, resource and numerical
  checks; visual review of thin lines, radius changes, moving reveals,
  distortion presets, photos and video. Saved timings, JSON and comparison images.

Rejected: extra mask-gradient distance refinement in the resolve pass, and
smoke absolute-value filtering, curvature-based widening and Newton refinement
of seeds. Their measured accuracy did not consistently improve enough to
justify the change. Tiny circles at DPR 1 remain an explicit limitation.

Detailed measurements, limitations and accepted/rejected decisions are tracked
in [the research report](../research/2026-11-23-saber-render-quality.md).
The browser diagnostic README documents reproducible checks. Earlier short
benchmarks predate several improvements; use the final frozen matrix for
performance conclusions.

Additional reference:
[GPU Gems 2: Fast Third-Order Texture Filtering](https://developer.nvidia.com/gpugems/gpugems2/part-iii-high-quality-rendering/chapter-20-fast-third-order-texture-filtering).
