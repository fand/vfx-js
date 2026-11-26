# Saber: staged AE calibration

Implemented four stages with immutable comparison snapshots. This is measured
progress, **not visual parity**. Arc Reactor still has excessive white regions;
Torch/Wormhole need substantially different fluid fields. Do not describe every
preset as improved, or fit their brightness individually to hide these errors.

## Review

Local review server: `http://127.0.0.1:6040`.
Each page contains the native AE animation, preceding stage and candidate on a
shared 24fps clock. Twelve names = eleven distinct recipes plus Embers alias.
All captures contain 72 frames, t=1..3.9583, 960x540, DPR1, pad320; same source
alpha, framing and time. Fire now targets the original raw AE preset too.

1. `/stage1.html?before=stage0-presets#fog`: native Glow layer assignments/units.
2. `/stage2.html?before=stage1-presets#tractor-beam`: color response/output grades.
3. `/stage3.html?before=stage2-presets#arc-reactor`: native Core width/softness.
4. `/current-presets.html?before=stage3-presets#fog`: final response/coupling/noise changes.

Snapshots and evidence live under the ignored
`packages/effects/node_modules/.cache/saber-raw/` directory. Frozen renderer
manifests hash the shader, native parameter table and empirical color helper.
`results/stages-evidence/` contains raw 16-bit AE PNGs and the scripts used for
additional probes. Earlier snapshots remain available; no commit was made.

## 1. Native Glow mapping

`_saber-ae-presets.ts` contains exported values, not per-look corrections:

- Layer sigma = `2 * Spread * SizeMultiplier * layerSize`.
- Intensity = native per-layer intensity; native Bias and Pre Gamma retained.
- Glow gain = `GlowIntensity * IntensityMultiplier / 200`, because core width
  is twice native Core Size.
- Halo Intensity/Size are native percent multipliers on Layer 4.
- Remove the previous weak-signal slope compensation and reassigned layer roles.

Width512/960 line probes at the same height gave sigma~20px in both.
Later SizeMultiplier .5/1/2/3.07/4.3 probes gave sigma
10.84/20.41/40.40/62.10/87.22px (expected 10/20/40/61.4/86).
This is an approximate Gaussian/mip model; it does not establish resolution
invariance for every AE project setting.

## 2. Color response

`ae-saber-color-palette.jsx`: 36 hues plus white, five Brightness levels = 185
16-bit frames, with one isolated layer. A 36x33 RGB table maps scalar radiance
through hue and chroma; 33 luminance knots are quadratic. The 33 RGB uniforms
are recalculated only when color changes. No extra pass or texture.

Stage2 implemented Brightness, colorization, Saturation about the arithmetic
RGB mean, Gamma exponent, clipping, then Screen. **The placement of Screen
after colorization is contradicted by the Stage11 colored-combination probes
below; white-only composition probes did not establish this order.** The existing measured extra
Brightness factor on Halo remains. Native output grades replace old fitted ones.

Training RGB RMSE mean .000637, worst hue .001206. Independent probes for
white/red/green/blue/[0,.4,1]/[1,.2,0]/[.6,.76,.96] give RGB RMSE
0/.001547/.000176/.001406/.000885/.001307/.000320. Errors near knees can reach
~.017; this is an approximation, not a recovered proprietary colorizer.
Separate Core-only red/blue/cyan samples validate the same response.

Reproduce curves with `analyze-saber-color-palette.py ROOT OUTPUT.json`.
The generated table is rounded to six decimals in `_saber-color.ts`.

## 3. Core

Isolated line and text probes agree: Core Size 1 produces a 2px full-width
contour. Unit visible-core gain replaces the previous arbitrary factor 3.
Native Core Softness, Blend on Top and zero forced whiteness are imported.

Softness behaves as two discrete centered box filters, each width `softness+1`.
At softness1 the convolved kernel is `[1,4,6,4,1]/16`. Measured added variance
at softness1/5/10/25: 1/6.3321/19.9898/112.8797. The shader reuses existing
paired taps and the mip pyramid; larger scales match variance approximately.

Removing the final 1/255 cutoff prevents dark soft cores losing energy. At
Brightness .5, WebGL 8-bit line mass for softness0/1/5/10/25 is
1.00392/1.00392/.99608/1.00784/1.0; native expected ~1.0039.
Float-buffer mass is 2px at DPR1 and DPR2. Added variance differs from the
ideal by at most 8% in that matrix (about 4% in effective radius).

## 4. Coupling, source limits and noise

37 isolated noise probes establish:

- Multiply Amount25/50 is affine interpolation between Amount0/100;
  ratio RMSE against interpolation ~.0008 in 16-bit AE frames.
- Amount100 masks are around .43 mean for Smoke, .57 for Fluid/Energy in the
  measured region, not an up-to-8x positive amplifier. Invert complements them
  until clipping. Replace the old hotspot function with a centered density mask.
- Wind1 translates frozen noise upward100px in one second, correlation >.99996
  for all three types. Convert exported wind by100; preserve direction offsets.
  This alone does not establish the Noise Speed/evolution mapping.
- Bias sweeps do **not** agree with a simple mask power/gain law. The current
  signed-power Bias and fractal implementation remain incomplete.

Separate Core/Glow coupling probes are important: changing Core Distortion
leaves distant Layer2 pixels exactly identical at Amount25/50. Layer4 pixels
change. Layers1–3 now use the original core; Halo uses the distorted core.
Separate cached pyramids prevent Core animation rebuilding all broad Glow.
The clean outline overlay remains display-only.

Large Core Size sweeps at GI10/50/100 show Glow source mass saturating near
CoreSize3.4: at GI50, fitted masses for Size1/3/4/5/10 are
49.34/147.56/167.41/167.45/167.61. Halo shows the same plateau. The renderer
limits gain by `min(1,6.8/thickness)`. This preserves mass, but retains a wider
source footprint; it is not an exact reconstruction of AE's source rasterizer.

Native core type/amount/scale/aspect/Bias replace earlier
recipe-specific geometry tuning. Native Glow amount/invert/composite and both
wind settings are imported. The requested four-octave default is retained; native
fractional complexity is not yet calibrated. Other procedural settings remain approximate.

## Validation and performance

37 Node tests; ESM/CJS builds; docs checks (118 exports); changed TS/MJS Biome
checks. WebGL output grading, Glow transfer and appearance/reset checks pass.
Multiply interpolation error <=.5/255; invert complement error0 in the GPU probe.
All twelve final animations have72 frames and nonzero temporal changes; GL errors0.
These checks establish invariants and stability, not AE image equivalence.

960x540, pad320, local GPU, two rounds with reversed stage order, 12 warmup and
40 measured frames. This run preceded restoring the requested four-octave cap (it used rounded
native core complexity, up to7). Per-round GPU medians in milliseconds:

| Preset | Stage0 | Stage4 |
| --- | --- | --- |
| Arc Reactor | 4.65 / 4.67 | 2.43 / 2.64 |
| Fog | 6.49 / 4.03 | 5.34 / 3.82 |
| Fire | 3.21 / 3.20 | 2.12 / 2.41 |
| Tractor Beam | 4.14 / 4.31 | 2.33 / 3.43 |

Timings vary; this is four looks on one device, not a universal performance
claim. High-percentile Fire timings increased in one round. Different preset
settings and cache reuse both affect these end-to-end measurements.

## Remaining, in order

1. Arc Reactor's excessive white regions: substantially reduced by stage 5 below.
   The retained clean outline still needs Blend on Top calibration.
   Do not reintroduce per-preset exposure compensation.
2. Native distortion field and Bias: Fluid/Smoke/Energy are still approximate
   simplex-based fields. The old Glow type/scale/detail choices remain in some
   recipes. Native core settings alone do not reproduce their shape.
3. Noise Speed and layer-dependent apparent motion: measure temporal correlation
   with wind0, then combined evolution/transport. Frozen-wind measurement supports
   uniform translation; it does not prove different octave wind velocities.
4. Revisit the large-Core-Size source footprint, fractional native complexity,
   motion blur and asymmetric fluid transport. Torch/Wormhole and the vertical
   structure of Tractor Beam still differ substantially.


## 5. Brightness/clipping before Glow Distortion

Review: `http://127.0.0.1:6040/stage5.html?before=completed-presets#arc-reactor`.
Previous stage stays frozen in `completed-presets`; current is `stage5-presets`.
AE scripts, manifests and raw 16-bit frames are archived under ignored
`results/stage5-evidence/` in the local review root.

Fourteen exact-size Arc Reactor text probes (960x540, Helvetica-Bold160, t=2)
separate Core, each Glow layer, and distorted/steady outputs. Static layer
profiles already agree visually; the large white areas appear with distortion.

Thirteen isolated HDR line probes establish the missing order: multiply each
scalar Glow layer by Brightness, bound to 0..1, then distort/mask, then colorize.
At GI200, Layer2 sigma20, Multiply100, x260: native outputs for Brightness
.01/.25/1 are .215305/.632685/.632837. At x270 they are
.09781/.554864/.555077. Higher brightness stops washing the noise out.
The previous implementation masked HDR radiance before brightness/clipping.

The existing layer-combination pass now applies Brightness/clipping to RGB;
Halo alpha remains untouched. Final RGB grading skips duplicate Brightness.
The undistorted path retains its existing transfer. Brightness changes reuse
blur pyramids, rebuilding only combination and distortion. No new draw pass or
texture. This is a structural cost observation, not a new GPU timing benchmark.

Native UI popup order is Smoke|Fluid|Energy, confirmed from installed plugin UI
strings. Core preset import had Smoke/Fluid reversed; corrected without changing
native numeric values or the requested four-octave default. Stage 4's labels for
noise type1/type2 were therefore wrong; its measured Amount/Wind results remain.

Additional controlled probes prevent unsupported fixes:

- Blend on Top: Core-only outputs are identical ON/OFF. With actual Glow,
  ON adds light at the original contour. Enabling Glow with all layer gains0
  still gives identical ON/OFF (softness0/1/25). Simple post-grade max/add/screen
  models do not fit. Current unconditional original-outline overlay remains an
  approximation; no speculative replacement shipped.
- Layer4-only Glow distortion with Core amount0: Torch/Wormhole outputs are
  pixel-identical; Arc/Burning differ only near the quantization floor. Halo
  remains protected from Glow Distortion.
- Recovering Halo from Core+Halo across softness0/1/5/25 shows the same profile.
  Core Softness does not broaden Halo's source.
- Noise Bias also changes spatial structure. A linear combination of the Bias1
  field and a low-pass copy leaves RMSE .018–.052 across types/Bias .5 and2.
  This does not identify the native algorithm; keep it an open calibration item.

Validation: 38 Node tests, ESM/CJS builds, changed-file Biome checks,
production GPU checks for output grading, Screen/Halo,
appearance/reset, Amount/Invert, and pre-mask clipping. Constant half-density
noise yields .5 (within 2/255) at Brightness .25 and1, but dims below saturation,
at DPR1/2. Brightness changes preserve blur caches; disabling distortion restores
the undistorted output path. The amplification check now measures below clipping
and separately checks the bounded RGB intermediate. Twelve snapshots ×72frames,
zero GL errors. Full AE equivalence is not claimed: Arc improves substantially,
while Fire/Core geometry, evolving noise, and Tractor Beam's vertical structure
still differ.

## 6. Two-component Multiply and signed Bias

Review: `http://127.0.0.1:6040/stage6.html?before=stage5-presets#arc-reactor`.
Forty-nine grid positions isolate vertical/horizontal Core displacement against
Glow Multiply with the same native noise settings. Fitted coefficients
(intercept, x, y): Smoke (.516, -.24602, -.24910), Fluid
(.51453, -.27048, -.25397), Energy (.51814, -.25519, -.24697).
RMSE .00771/.03783/.00973 respectively. Multiply averages both components,
rather than using x alone: `mask = .5 + .25 * (nx + ny)`.
Core sample lookup uses positive n, so displayed line displacement is negative.
Bias is applied to each signed component before averaging. A scalar power of
the final mask does not fit the native Bias sweeps.

## 7. Shared procedural model and native noise settings

Review: `http://127.0.0.1:6040/stage7.html?before=stage6-presets#fog`.
Sixty-one isolated cases vary complexity, Bias, scale and evolution. A further
nineteen cases saturate the undistorted input to recover true mask densities.
Noise type/scale/Bias/aspect/speed/seed now come from native exports; all recipes
use four evaluated octaves, detail/turbulence/directionality/flow zero. Embers
remains a Burning alias. No per-preset compensating noise overrides remain.

Smoke adds bounded density without octave normalization. Energy sums ridges
conditioned by coarser ridges. Fluid first warps coordinates with a fractal
whose complexity follows the density field. The implementation uses simplex
primitives; this is a calibrated approximation, not recovered native code.
At complexity4/Bias1, normalized mean/std in the isolated fields:

| Type | AE | Candidate |
| --- | --- | --- |
| Smoke | .4367 / .1088 | .4255 / .1009 |
| Fluid | .5782 / .1556 | .6073 / .1670 |
| Energy | .5887 / .1616 | .6064 / .1690 |

Smoke y correlations at 1/2/4/8/16/32 pixels: AE
.996/.985/.947/.842/.626/.293, candidate
.997/.987/.954/.860/.644/.300. Similar second-order agreement does **not**
establish matching random structures, gradients, or time evolution. The attempted
mapping of native 7 octaves into 4 widely spaced samples made the output too
granular and was rejected. Default four octaves is retained as requested.

## 8. Original-Core Screen and measured wind blur

Native white-line probes isolate Blend on Top and Motion Blur. Evidence/scripts
for stages6–8 are archived locally under ignored
`packages/effects/node_modules/.cache/saber-raw/results/stage6-8-evidence/`.
This includes raw 16-bit PNGs, manifests, JSX, analyses, and normalized arrays.

- Blend on Top: Glow gain0 or Core Distortion amount0 disables the overlay.
  Any positive gain/amount enables original Core Screened over the result in
  white probes. Independent color grading was an implementation assumption,
  not established by those probes; colored overlay ordering remains unverified. Overlapping original/distorted outlines also Screen, not max.
  Fits have roughly .00025 error in 16-bit probes.
- Native blur uses six equal spatial noise samples along future wind, at the
  current evolution time. Wind1 (100px/s), blur1 samples offsets0/3/6/9/12/15px.
  Blur .1/.25/.5/1 confirms reach `15 * blur`, with normalized RMSE about1e-5.
  This error describes the fitted native probe, not full-effect equivalence.
- Wind0 gives identical blur ON/OFF even with evolving noise. The source stays
  anchored; blur averages separately warped light samples, not displacement.
- Native blur converts to public seconds via `native * .15`. The renderer draws
  a transient noise field once and samples it six times, without frame history.
- Broad resolved Glow noise can use half resolution while light samples, Core
  and Halo remain full resolution. Fluid Distort is excluded: interpolation
  there displaced folds (maximum207/255 in an experimental fixture). Downsampling
  the entire distorted Glow image was also rejected. Current full-resolution
  comparisons bound both RMS and maximum errors.

AE also exported all eleven text presets with both complexity values set to4.
The Arc Reactor/Fire/Wormhole geometry gap remains: higher native octave counts
alone do not explain it. Native random structures, steep displacement gradients,
and Core behavior at larger Amount still require isolation. Do not describe
these snapshots as visual parity or use preset-specific gains to hide the gap.

Stage8 review: `http://127.0.0.1:6040/stage8.html?before=stage7-presets#arc-reactor`.
`current-presets.html` now points to Stage8. The separate four-octave diagnostic
keeps native original, native4 and candidate4 side by side. Stage6/7 snapshots
remain independently frozen. Twelve presets ×72 frames are complete, every
preset has72 unique frame hashes and GL error0.

Validation: 40 Node tests; ESM/CJS builds; docs API/skill coverage118 exports;
changed-file Biome and whitespace checks. GPU checks for motion blur, original
Core overlay, adaptive field resolution, pre-mask clipping, Amount/Invert,
output, transfer and reset all pass. Six-tap rendering differs from separately
rendered samples by at most .834/255. Overlay Screen error ≤1.432/255. Adaptive
field vs full field max2/3/0/1 on Arc/Fire/Wormhole/Tractor fixtures respectively.

Performance is not a blanket improvement. GPU timers varied widely. In two
reversed-order, 3-draw batched runs at960x540/pad320, median GPU ms ranges were:

| Preset | Stage6 | Stage8 |
| --- | --- | --- |
| Arc Reactor | 3.70–3.72 | 5.27–6.01 |
| Burning | 4.46–4.49 | 3.76–3.82 |
| Fire | 3.59–4.06 | 4.86–6.29 |
| Tractor Beam | 4.99–5.04 | 3.07–3.96 |
| Wormhole | 4.42–4.52 | 3.23–3.53 |

A separate single-draw run reversed some of those trends (notably Wormhole).
CPU medians were below0.3ms in batched runs. Noise type/octave shader
specialization had inconsistent gains and was not shipped. Six-tap cache avoids
six procedural fields, but native transport adds work to some recipes. Further
performance work remains for Arc/Fire; do not claim unchanged GPU cost.

## 9. Coordinate tests and octave evolution

Lock Noise to Saber0/1 produces identical pixels in ten native Arc Reactor text
probes (Core-only at scales39.55/79.1/158.2, Glow-only, combined). It does not
explain the remaining text mismatch. Twenty short-line probes at four locations
and Amount0/1/10/25/50 reject a simple forward translation of source vertices:
large-Amount centroids are nonlinear and source mass changes. No speculative
coordinate-mode replacement was made.

Temporal isolation found a concrete issue. Spatial lacunarity was multiplying
z/time at every octave. Native Smoke complexity1/2/4 retains similar evolution
rates; simply slowing the whole field harms the complexity1 match. Octaves now
increase spatial frequency while retaining a common evolution clock. Seeded
static phase offsets are retained. The shared rate conversion is Smoke1,
Fluid/Energy0.75. No preset-specific speed overrides or extra noise evaluations.

Evidence:49 native temporal frames at starts0/.5/1/2, another25 at held-out
starts3/4, plus31 complexity1/2 probes. Compare normalized white-field correlation
at elapsed .0625/.125/.25 seconds. Final four-octave RMSE versus native:

| Type | Fit, old → new | Held out, old → new |
| --- | --- | --- |
| Smoke | .1134 → .0515 | .2408 → .1420 |
| Fluid | .2308 → .0733 | .2724 → .0512 |
| Energy | .2130 → .0877 | .1802 → .0948 |

Smoke complexity1 stays at its original .0077 error; complexity2 improves
.0992→.0410. Fluid complexity1/2 improve .1803→.1014 and .1922→.0548.
Energy complexity1/2 improve .1345→.0140 and .1189→.0230. These are stochastic
correlation fits, not matching frames or recovered proprietary noise code.
`runNoiseEvolutionChecks` guards held-out temporal correlation with RMS≤.16;
it deliberately does not demand pixel equality across independent noise seeds.

The Stage8 Multiply optimization averages the six scalar gains before fetching
the anchored light, removing five duplicate source reads. Four presets at three
times differ from the unsimplified shader by at most1/255. It does not apply to
Distort, whose separately warped samples must still be averaged.

Stage9 review: `http://127.0.0.1:6040/stage9.html?before=stage8-optimized-presets#arc-reactor`.
The current page points to Stage9. All12×72 final frames have unique temporal
hashes and GL error0. ESM/CJS builds,40 Node tests, docs coverage118 exports,
GPU appearance/transfer/output/overlay/field-resolution/blur/Amount checks pass.
The new held-out evolution check also passes. Core and Glow wind blur pass
DPR1/2 freeze and deterministic seek checks. Controls now label the seconds
parameter “Wind blur (s)” instead of implying an evolution shutter.
Raw JSX, manifests, frames and analysis for the additional coordinate/evolution
probes are archived under ignored local `results/stage9-evidence/`.

Remaining: random-field topology and steep Core folds still visibly differ,
particularly Arc Reactor and Wormhole. Native fractional complexity and
large-core source footprint are approximate. GPU cost is not guaranteed equal:
see Stage8's mixed timing results. These limitations remain visible in the review
instead of being hidden with per-preset gain/scale corrections.

## 10. Noise units, Core Bias, and Smoke contrast

Native960x540 saturated noise fields retain the spatial correlation lengths
measured at512x512. Noise Scale therefore remains a pixel wavelength; no
composition-size multiplier was added. Fifty-two short-Core probes at three
noise types and Bias .5/1/1.5/2 support the same signed-power Bias as Glow.
At Bias1.5/2 the centroid-model RMS errors are .005/.006px for Smoke,
.0126/.0130px for Fluid, .0026/.0044px for Energy. The .5 exponent amplifies
sampling uncertainty near zero, so those errors are larger. No Core-only Bias
formula was introduced. Native thin-line outputs also show variable stroke
width after warping; replacing them with a constant-width stroke is unsupported.

Increasing Smoke frequency from1.15 to1.25/1.35/1.45 worsens the wide-field
correlation fit. Its missing gradient energy comes primarily from weak
contrast, not wavelength. A single-octave scale25 probe covers many cells;
a separate four-octave scale100 field confirms the resulting density variance.
The common bounded Smoke signal changes from `clamp(.6+.7*n,0,1)` to
`clamp(.6+.85*n,0,1)`. No preset overrides, octave increases, new samples or
passes. Native/current standard deviation:

| Probe | AE | Before | After |
| --- | --- | --- | --- |
| 1 octave, scale25 | .10436 | .08994 | .10416 |
| 4 octaves, scale100 | .12245 | .10334 | .11975 |

Four-octave gradient RMS: AE .01064, before .00862, after .01007.
The candidate still has different tails and random structures. These moments
justify a shared contrast correction, not a claim of identical noise.
`runSmokeDensityChecks` checks both probes against native moments.
Temporal correlation remains within the held-out bound after the contrast change
(Smoke RMS .14291; Fluid/Energy unchanged). The nine existing GPU suites pass.
Source data/scripts/frames are under ignored local `results/stage10-evidence/`.

Stage10 review: `http://127.0.0.1:6040/stage10.html?before=stage9-time-presets#arc-reactor`.
`current-presets.html` points here; all earlier stages remain frozen. The final
12×72 frames are complete, every preset has72 distinct temporal hashes, GL
errors0. Density tests pass at both octave counts; all nine other GPU suites,
40 Node tests, ESM/CJS builds and changed-file format/whitespace checks pass.
Stage10 adds no work relative to Stage9 (one existing scalar coefficient changes).
This does not erase the earlier whole-renderer performance caveats in Stage8.


## 11. Color discrepancy diagnosis (prototype only)

No production shader change in this investigation. Native experiments and
analysis are retained locally under ignored `results/stage11-evidence/`.
The user explicitly prioritizes fidelity over GPU cost until final optimization.

27 single-layer probes compare white/blue/orange, gains .1/1/10, no distortion,
Multiply100 and Distort40. Noise before colorization matches native outputs
with RGB RMSE .0021–.0041. Colorization before Multiply is strongly rejected
(.18–.23 at gains1/10). The current single-layer order is supported.

35 colored-combination probes isolate four layers, with white/blue/cyan/orange
and Saturation1/2. Outside the Core, native output follows scalar light
composition followed by colorization and Saturation. Current independently
colored RGB Screen does not. Representative blue results:

| Saturation | Current per-layer grade → RGB Screen | Scalar Screen → color → Saturation |
| --- | --- | --- |
| 1 | .01824 | .00248 |
| 2 | .03576 | .00323 |

24 further Core/Halo probes use softness0/25, white/blue/orange, Core alone,
Core+Layer2, Core+Halo4, and all three. With Gamma1 and BlendOnTop0, colorizing
the combined white scalar predicts colored output with RMSE .0021–.0026.
Separately colorizing Core/Halo and Glow gives .0189–.0288 for the combined
case. Thus the corrected ordering extends across these components, not merely
Glow layers1–3. These analyses decode native PNGs to 8-bit; errors near .002
are close to quantization precision. Gamma other than1, clipping extremes,
and colored BlendOnTop remain unverified by this experiment.

A diagnostic shader combines all scalar components before colorization at t2
for Arc Reactor, Electric, Windy and Fire. It does not replace Stage10.
Electric becomes whiter, but Arc Reactor has excessive broad white areas;
Fire retains an overly smooth solid white body/yellow rim; Windy retains
concentrated cyan patches and weak outlines. Color ordering is a confirmed
error, but changing it alone cannot fix incorrect spatial light distribution.
The diagnostic also combines the original-Core overlay before colorization,
which remains a hypothesis. Do not promote that overlay behavior without a
colored independent probe. Native preset base colors are already imported;
manual per-preset hue corrections would obscure these renderer discrepancies.


### Stage11 implementation

36 additional native boundary probes resolve the remaining Gamma/overlay order:
Gamma .5/1/2 follows combined colorization. Original-Core Blend on Top is part
of scalar Screen before colorization/grade too. For blue, overlay RGB Screen
has RMSE .0195/.0550/.0764 at Gamma1/.5/2; scalar composition gives
.0031/.0029/.0041. The larger dark Gamma .5 error on orange when predicting
from 8-bit colored Gamma1 is quantization amplification, not evidence for a
separate per-layer grade.

Production now combines Core/Halo, Glow1–3 and original Core as scalar light,
then colorizes and grades once. The Halo extra Brightness factor remains.
Custom Core/Glow Whiteness uses input-light weights; native recipes use zero.
No preset parameter or noise changes in this stage. The GPU color regression
uses51 native samples (maximum error4/255); the previous compositor is also
checked as a negative control. All ten GPU suites pass, including output,
transfer, overlay, noise, and all-preset switching.

Stage11 review: `http://127.0.0.1:6040/stage11.html?before=stage10-presets#arc-reactor`.
All12 presets ×72 frames captured, GL errors0. Negative control: Stage10
fails31/51 color cases, maximum49/255; Stage11 passes51/51, maximum4/255.
40 Node tests, CJS build, API/skill checks and whitespace checks pass.


## 12. Combine Glow before noise

40 native white/blue probes isolate layers1/2/3 and their combination with
Multiply normal/inverted, Multiply with wind blur, and Distort with wind blur.
A further20 weak-input white probes test below saturation. `ae-saber-layer-noise.jsx`
reproduces the high-input sweep. Parenthesize nested ternaries in ExtendScript:
its legacy evaluation differs from modern JavaScript. Discarded initial probes
had incorrect Amount0; the retained final manifests verify0/100/40 explicitly.

Native Multiply acts on the already Screen-combined scalar Glow. In saturated
regions, Screen after per-layer masks has RMSE .271/.276/.286 for normal,
inverted and blurred masks; Screen before masking matches at 8-bit precision.
At weak input, the corresponding wrong-order errors are .0252/.0253/.0275;
correct-order errors are .00179/.00173/.00178. This is a second independent
ordering error, explaining excess bright fill after the Stage11 color fix.

Production now packs combined affected light into R, stationary bypass into G,
and keeps Halo in A. Partial protection splits transmission rather than adding
half-light copies, preserving the original Screen result at zero deformation.
The effect applies noise and shutter integration to the combined affected group.
No preset tuning, extra blur, or new render pass. Native noise patterns remain
approximate; native/current Core geometry still differs visibly.

The GPU ordering regression now tests one and three saturated layers at DPR1/2.
Both must yield .5 under a half mask; old order incorrectly yields .875 for three.

Stage12 review: `http://127.0.0.1:6040/stage12.html?before=stage11-presets#arc-reactor`.
All12×72 frames captured, GL errors0. Ten GPU suites pass after updating the
transfer test's sampled channel to packed R; nonlinear boost7.29 remains.
Partial-protection identity error0 at DPR1/2. 40 Node tests, CJS build,
API/skill checks and whitespace checks pass. Raw evidence is in ignored
`results/stage12-evidence/`.


## 13. Filter Core/Halo before deformation

28 component probes compare Arc Reactor, Electric, Windy and Fire, including
native versus four octaves. Extra octaves barely change the principal defects;
four remains the default and recipe setting. Undistorted Core profiles agree,
but warped Halo pools into smooth blobs in the old implementation.

`ae-saber-core-filter-order.jsx` reconstructs native absolute warped distance
from60 Core Size coverage samples (Smoke, Amount150, Scale200, complexity4).
Use that field to pull back the steady Halo profile: RMSE .00383 versus .03692
for Gaussian blur of the deformed native core. Native Halo is blurred before
Core deformation. Core Softness25 gives the same result: .00094 for a warped
steady profile, .01164 for post-deformation filtering. These numbers use8-bit
PNG decoding and exclude clipped Core, endpoints and unresolved distances.

Production now caches the softened original Core and warps it for display.
Halo is blurred/amplified from the original Core, then separately warped with
Core Distortion, including its shutter. It bypasses Glow Distortion. The final
compositor reads that Halo only when Core Distortion and Halo are enabled.
Original-Core overlay shares the cached soft source. Animated Core no longer
rebuilds a Halo or Softness blur pyramid. The Halo warp adds sampling/noise
work; full performance optimization is intentionally deferred.

This supersedes the earlier inference that Halo must be blurred from the
already-deformed core. Coupling tests established dependency, not order.
Affine GPU checks at DPR1/2 give width ratios .50006–.50055, peak ratios
.996–.999 for Core Softness and Halo. Core/Glow/Halo cache and resource tests
cover switching, animation, and disposal. No preset parameter changes.

Stage13 review: `http://127.0.0.1:6040/stage13.html?before=stage10-presets#arc-reactor`.
All12 presets ×72 distinct frames captured, GL errors0. Ten existing GPU suites
and the new affine filter-order suite pass. Halo boundary regression now allows
native saturated light near the original contour and rejects saturation beyond
half Core width +3 Halo sigma; all18 cases have zero distant saturated pixels.
The old blanket no-saturation assertion was incompatible with measured native
Halo. Raw evidence/analysis are under ignored `results/stage13-evidence/`;
`analyze-saber-core-filter-order.py` reproduces the order metrics.

40 Node tests pass, including cached Halo shutter-field disposal across resize
and context restore; ESM/CJS builds, API/skill coverage and formatting pass.
Fire Bias3 small-point probes give signed-cube displacement RMSE .0186px;
this does not support an arbitrary new Bias law. Residual native noise patterns,
wide-Core support and detailed fire motion remain approximate. This stage does
not claim pixel parity or a GPU speedup.
