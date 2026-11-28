# Saber rendering quality investigation

Baseline: the local renderer at the start of this quality pass, after the
independent core/glow distortion and four-layer glow work. This is a comparison
against our renderer, not a numerical reproduction of Video Copilot Saber.

## Accepted changes

- Layered glow now uses a normalized discrete Gaussian, paired bilinear reads,
  downsample/reconstruction variance compensation, and positive cubic
  reconstruction. Ceil-sized mips retain a fixed 2:1 pixel grid, including odd
  source dimensions. This removes large brightness changes at mip boundaries
  and odd-size highlight amplification.
- Pyramid glow uses a separable nine-fetch downsample with the original
  filter's 1D marginal response, removing its diagonal checkerboard leakage.
  The single-level case now applies its missing brightness weight, keeping
  the smallest glow consistent between DPR 1 and 2.
- Thin core lines integrate the pixel's strip coverage. Isolated contour seeds
  project onto their existing mask gradient. An undisplaced core uses its
  distance field directly instead of dividing by a noisy finite-difference
  gradient. Coverage uses screen gradients for undisplaced lines and handles
  degenerate normals without turning a fractional-width line into a full pixel.
  Minified alpha sources receive a four-sample area prefilter, faded in as the
  source shrinks. Native-resolution and magnified sources keep one alpha read.
- Procedural coordinates follow the element rather than output padding. Tier
  offsets and the displacement-room filter use consistent CSS units across
  DPR. Noise octaves fade below the pixel footprint; energy-noise cusps use an
  analytic pixel integral. Random lattice keys have continuous endpoint
  velocity.
- Static core, core distortion, glow preparation and glow distortion cache
  separately. Disabled glow skips its passes, equal-radius layers share a blur,
  and undistorted layers reconstruct directly in final composition. Flood
  scratch buffers also hold the room and core, removing two full-size float
  allocations.
- Large padding uses restricted geometry for field/room/core draws when that
  saves at least 25% of the covered area. The bound includes flood paths, room
  rays, line width and mask-prefilter reach. Scratch targets clear on field
  rebuild, so untouched pixels remain zero for downstream glow/distortion.
- Reveals read back only source bounds and retain element-local contour
  coordinates. Fullscreen movement and padding changes reuse the trace. Late
  asynchronous readbacks cannot interfere with a disposed/reinitialized effect.
- Framebuffer restoration no longer deletes invalid handles from the lost
  context. `VFXPlayer.destroy()` releases registered element chains and source
  textures and restores source opacity.

## Numerical evidence

All pixel metrics below came from production WebGL shaders. Core energy range
means `(max phase energy - min phase energy) / mean phase energy`, over four
quarter-pixel positions. Relative L1 means `sum(abs(a-b)) / sum(a+b)`.

| Probe | Before | After |
| --- | ---: | ---: |
| Layered impulse peak at a mip boundary | ~53% drop at 5.99→6 px | ~1.1% at 3→3.01 px, even size; ~0.8%, odd size |
| Odd 513 px impulse mass, radius 6 (expected 6) | ~12 | 5.99984 |
| 0.25 px core, axis aligned: phase energy range | 2.01% | 0.11% |
| 0.25 px core, 45°: phase energy range | 8.43% | 0.25% |
| 0.25 px core, 22.5°: phase energy range | 0.09% | 0.15% |
| Padding 80→160: core relative L1 | 0.2944 | 0.000143 |
| DPR 1 versus downsampled DPR 2: core relative L1 | 0.1539 | 0.0471 |
| DPR 1 versus downsampled DPR 3: core relative L1 | 0.1470 | 0.0500 |
| Lattice key velocity jump, finite difference h=0.001 | 1.0662 | 0.00320 |

The latest layered-glow sweep covers 68 combinations of even/odd sizes, DPR
1/2 and radii around mip boundaries. Impulse mass error is approximately 0.003%
or less. Width-0.25 energy stability improves strongly at 0° and 45°; the small
22.5° regression is retained above rather than claiming every angle improves.

Energy-noise integration reduces RMS error against an 8× supersampled reference
by 22–57% across tested wavelengths 2/4/8/24 CSS px and complexities 1/3. This is
a controlled brightness-field probe, not a measurement of perceived quality.

The pyramid's odd-size impulse energy varied by 360–363% over a one-pixel
translation in the original renderer, versus less than 0.8% with the separable
filter (`max / min - 1`, sizes 257/513, pad 0/80). A one-level unit impulse now
has normalized mass 2 at both DPR 1 and 2; the previous DPR-1 path had mass 1.

For a radius-5 circle with a 0.25 px outline at DPR 1, a 2× source previously
produced a 38% energy range in the initial analytic-coverage candidate. Handling
degenerate normals reduced that to 2.3%. With a 4× source, the final prefilter
and normal handling reduce 35% to 2.3%. These comparisons isolate later
corrections within this work; they are not comparisons against the start-of-task
baseline.

45 live parameter changes produced byte-identical cached versus forcibly
invalidated output at the same animation time. A 300×140 reveal needed one
300×140 readback; translating by (32,24) px and changing padding caused no new
readback, and the translated core matched exactly. Context loss/restoration
returned identical display pixels with no GL error.

Restricted versus full-target geometry was compared at DPR 1/1.5/2/3, pad 320
and fullscreen, with widths 2 and 80. Maximum core relative L1 was 0.0000097;
the small difference comes from interpolation precision on different geometry.
Transparent inputs remained transparent in alpha and luminance modes at
threshold zero. Semi-transparent source compositing differed from expected
premultiplied values by at most 0.000493 (less than one 8-bit step).

## Resource measurements

At DPR 2, pad 320, layered glow, tracked texture allocations fell from
322,497,504 to 181,460,192 bytes (43.7%). Tracking starts at effect initialization,
so this excludes shared host allocations created earlier and is not a measure
of total driver VRAM.

After two repeated rounds of 36 radius/mode/padding/distortion changes, live
allocation counts and bytes were stable between rounds. Destroying either
renderer under the corrected shared host left zero tracked GPU objects and
restored source opacity. Before the host fix, removing the canvas left element
resources allocated.

## Performance verification

The 216-run batched matrix completed with no GL errors and all 600 samples per
run. It covered nine cases × DPR 1/1.5/2/3 × three repetitions × two renderers,
warming up 60 frames and timing batches of eight renders. Static layered glow
improved 81–92%, glow-only animation 60–65%, and core-only rendering 40–51%.
The largest increase among group medians was about 1% for dynamic input. This
candidate predates the final pyramid, region and mask/normal corrections.

A second 216-run matrix completed against the final renderer, with one render
per animation frame, 40 warmup frames and 360 measured frames per run. It
returned all samples with no GL errors. Static layered glow was 83–92% faster,
glow-only animation 62–88% faster, and core-only rendering 20–64% faster. Most
animated cases improved or remained close. Fine noise at DPR 1 (+5.8%) and
dynamic input at DPR 1.5 (+13.7%) prompted a longer follow-up.
[The full table](saber-render-timings.md) preserves every group and repeat range,
including these increases.

The follow-up covered both cases at all four DPRs, four repetitions each,
60 warmup frames and 600 samples, one render per frame: 64 more runs, all
samples returned, no GL errors. Fine noise was 6.3–12.7% faster; every paired
repeat improved. Dynamic input was 0.9–3.3% slower (0.036–0.142 ms), with
considerable repeat variation. The initial large increases did not persist,
but the small dynamic-input cost remains documented. These results support
retaining the quality changes on this machine; they do not prove zero cost.

A separate region-isolation test used the final renderer on both sides,
dynamic input, layered glow and pad 320. Removing only the restricted draw
geometry increased median GPU time from 8.00 to 14.64 ms at DPR 2 and from
18.33 to 31.29 ms at DPR 3. The region therefore saves 45.3% and 41.4% in this
large-padding case. This is not a comparison against the start-of-task
baseline. Three alternating-order repetitions, 40 warmup and 360 measured
frames, batch 1; all 12 runs returned every sample without GL errors.

Baseline/candidate order alternates. Both matrices freeze effects and a shared
host, with SHA-256 manifests. No other animated browser fixture runs concurrently.

Hardware: Apple M4 Max, Chrome ANGLE Metal backend. Results apply to this
machine and these cases; mobile devices remain unmeasured. The earlier timing
matrix predates several optimizations and the host cleanup fix and should not
be used for final performance claims.

## Rejected experiments and remaining limits

- Extra mask-gradient distance refinement in the resolve pass: four extra
  samples did not consistently improve accuracy, so it was rejected.
- Analytic filtering of the smoke absolute-value response: one tested case
  worsened; the smoke shaping remains unchanged.
- Curvature-dependent widening and Newton refinement of contour seeds:
  improvements in individual cases did not generalize. Widening made some
  circle phases worse; seed refinement introduced large diagonal-line errors.
- A diameter-4 CSS px circle with a 0.25 px outline at DPR 1 still varies by
  about 8.1% across phases, versus 2.9% for the original, wider/softer coverage.
  At DPR 2 the final renderer's variation is about 1.8%. The locally straight
  coverage approximation is not exact for curvature this close to pixel size.
- The alpha prefilter uses four bilinear samples, not a full image mip chain;
  extreme minification remains approximate. The renderer does not reproduce
  Video Copilot's proprietary noise or parameter units.

## Reproduction and artifacts

See `packages/effects/test/browser/README.md` for building frozen comparisons,
running the GPU matrix, exporting JSON, and running numerical/lifecycle probes.
Storybook adds thin-line, radius-sweep and moving-reveal cases for visual review.

Saved local artifacts include the baseline ESM archive, fixed-grid impulse
sweep, final core sweep, noise integration, cache/reveal checks, resource
counts, context restoration, and before/after images. `saber-complete-validation.json`
contains the final numerical checks; `saber-context-restore-final.json` verifies
exact display recovery and zero tracked objects after destruction with the
final region/mask/normal implementation. `saber-gpu-matrix-batched.json` contains
the completed batched comparison. `saber-gpu-matrix-final.json` contains the
final one-frame matrix; `saber-gpu-matrix-followup.json` contains the 64-run
follow-up. `saber-region-timing-final.json` isolates region geometry.
`saber-hires-before.png`
and `saber-hires-after.png` compare a 900×524 CSS px fluid-glow fixture at DPR 2,
identical parameters/time, with a 2× source raster.

## Validation

- Workspace `pnpm test`: 17 successful tasks, 1054 tests across core, effects,
  transitions and framework bindings. All 117 public exports are covered by
  the agent docs; API type pages and links resolve.
- Core, effects and Storybook lint passed. Effects ESM/CJS builds passed.
- Storybook production build passed; visual review includes thin lines,
  continuously changing glow radius, moving reveals and existing presets.
- GPU comparisons: 216 batched runs, 216 final ordinary-frame runs and 64
  focused follow-up runs, plus 12 region-isolation runs, with no missing samples
  or GL errors. Final built Saber helpers and the two changed host files match
  their frozen benchmark copies byte for byte.
