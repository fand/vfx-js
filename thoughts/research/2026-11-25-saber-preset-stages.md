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


## 14. Fire Core: isolate the underlying ridge field

56 new native frames: 17 point-grid probes, 9 matched Glow masks, 17 scale/
complexity probes, 9 text/Core probes, and 4 Lock Noise toggles (56 total).
The point grid uses225 closed1px square masks; open paths are ignored by Saber
and were discarded. Four seeds × Bias1/3 × Amount.25/1 separate displacement
from line thickness. Paired Glow masks confirm the same two-component field:
`.5 + .25*(nx+ny)` has .031–.040 RMS residual. Changing Lock Noise has exactly
zero pixel difference on this centered text fixture, both Core-only and full.
It does not justify a new text-coordinate mode.

The initial Fire samples do not support simply increasing distortion amount:
Bias3 magnitude below.05 occurs in19.6% of native vectors and17.0% of Stage13
vectors. Their fields differ in topology and frequency, not just coverage.
Single-octave probes expose an overly broad, bright ridge primitive. Two seeds
at scale25/aspect1.29 cover many cells and isolate this from Fluid advection.
Change the common Fluid/Energy frequency .8→1 and ridge coefficient .8→.9;
keep octave count, amplitudes, Bias, Fluid warp, and every preset unchanged.

| Energy, scale25 | AE | Stage13 | Stage14 |
| --- | --- | --- | --- |
| 1 octave mean | .33573 | ~.370 | .34837 |
| 1 octave std | .11836 | ~.106 | .11527 |
| 1 octave gradient RMS | .02892 | ~.0205 | .02752 |
| 4 octaves mean | .53935 | ~.596 | .54228 |
| 4 octaves std | .17807 | ~.168 | .17888 |
| 4 octaves gradient RMS | .04876 | ~.0390 | .05016 |

`ae-saber-fire-noise-fields.jsx` + `analyze-saber-fire-noise.py` reproduce the
native field measurements; `runRidgeDensityChecks()` checks ensemble moments,
not equal seeded pixels. Core grid/text JSX retain the other isolated probes.
The native data, candidate sweeps and discarded alternatives are archived in
ignored `results/stage14-evidence/`. Increasing Fluid warp1.3→1.8 helps broad
scale178 correlation but worsens scale25 gradients; it is not shipped here.
Fluid topology still differs and Fire still has overly smooth contour sections.

Validation:40 node tests; nine GPU suites (ridge density, Smoke density, Amount/
Invert, wind blur, evolution, Core filter order, Glow field resolution, mask
composition,51 native RGB samples), all pass.12×72 frames rendered, GL error0.
No additional noise evaluations or render passes in this change.
Review: `http://127.0.0.1:6040/stage14.html?before=stage13-presets#fire`.

## 15. Native noise lattice and Fluid deformation

The failed stronger-warp experiment exposed a missing sampling stage. Native
odd pixels are almost exactly the average of adjacent even samples, including
Bias3. Doubling comp dimensions, line coordinates, Glow radius and Noise Scale
retains the original even samples. It does not retain the interpolated odd
samples. Full comp/render resolution was separately verified as1×1; Core light
itself does not have this interpolation. This is a sampled noise lattice, not
an accidental Half render or area antialiasing.

`ae-saber-fire-noise-fields.jsx` now supports renderScale2;
`analyze-saber-noise-grid.py` compares corresponding points and odd interpolation.
The additional horizontal/vertical Core-line probes show the same parity:
odd-position displacement second-difference RMS .055–.056 versus .158–.169 at
knots for Bias1, and .020 versus .116–.125 for Bias3. Finite Core footprint and
warp inversion prevent these centroid estimates from being exact vector reads.
They support the same lattice in Core, independently of flat Glow masks.

Core/Glow/Halo now evaluate biased vectors on a two-CSS-pixel grid, interpolate
that field, then sample full-resolution light. Remove derivative-based octave
attenuation: native point samples persist at twice the output resolution.
The lattice stays content-aligned across padding/DPR and includes wind-blur
margins. Blur samples the current spatial lattice, not future independently
regenerated fields. Grid targets are reused and released with other resources.

With this sampling stage, Fluid domain warp1.3→1.8 improves both scales instead
of oversharpening small-scale fields. No preset settings or octave counts change.
At scale25/complexity4 the native gradient RMS is .0876; direct Stage14 is .1155;
Stage15 is about.087. At Fire scale178, native correlations at4/16px are
.855/.362, Stage14 .900/.492, Stage15 .862/.390. Noise topology and tails still
differ; these statistics do not establish identical native noise.

The new piecewise-bilinear field also exposed two parity bugs. Compute lattice
origin from the constant content rectangle, not cancellation of interpolated
varyings: near a floor boundary that changed Wormhole's origin within a draw.
Compute sharp-Core coverage gradients with centered distance samples instead of
GPU quad derivatives. A1px padding change now gives maximum channel deltas
3/1/5/4 for Arc/Fire/Wormhole/Tractor (RMS .12–.34/255), versus an intermediate
242/255 Wormhole failure. The regression checks the whole effect, including Core.

The undistorted Fire Core footprint agrees with native CoreSize10.3 at IoU .981
at half intensity. Remaining smooth/wide Fire sections come from warped noise,
not a fundamentally different text source or Core width. Matching random fields
and the native extreme tails remains unresolved; the page keeps that visible.

Validation:40 node tests, docs118 exports, ESM/CJS builds;12 GPU suites including
DPR1/2 lattice/Bias, padding, freeze/seek, native density/evolution, source filter
ordering, overlay,51 RGB probes and appearance checks. All pass, GL error0.
All12×72 comparison frames regenerated. Raw probes, fits and checks are under
ignored `results/stage15-evidence/`, with snapshot hashes in the review manifest.
Review: `http://127.0.0.1:6040/stage15.html?before=stage13-presets#fire`.

All16 doubled-resolution Fluid/Energy cases give point RMS exactly0 in the
16-bit PNGs. Odd interpolation99th-percentile error stays ≤2.29e-5.
One60-frame Fire GPU timing run at960×540/DPR1: Stage14 median5.77ms, Stage15
5.86ms (+1.7%); CPU median.20ms in both. This single-device result is not a
cross-device performance guarantee. Each final preset has72 unique frames.

## 16. Fire: recover fine ridges

33 native 16-bit probes isolate Fluid/Energy at scales25/178, complexities1–4,
and two seeds. Energy increments never decrease the field; Fluid increments
also move its coordinates. This separates density feedback from domain warping.
The old product of individually clamped feedback factors could only decay.
Clamp the accumulated feedback instead, allowing later ridges to recover.
Fit the common ridge coefficient .9→.94 and feedback gain1.5→1.7; no recipe,
Bias, octave count, coordinate warp, or Core coverage changes in this phase.

Energy increments at native2px knots, pooled over both scale25 seeds:

| Added octave | AE mean increment | Stage15 | Stage16 |
| --- | --- | --- | --- |
| 2 | .1286 | .1285 | .1292 |
| 3 | .0526 | .0477 | .0524 |
| 4 | .0224 | .0177 | .0218 |

Correlation of the fourth increment with the first octave: native .232,
Stage15 .399, Stage16 .289. Single-octave mean .3484→.3393 (native .3357).
These statistics calibrate an approximation; they do not recover native code
or establish matching random phases. Fluid swirl topology remains under study.

Validation:40 node tests and eight GPU suites, including new native octave
increments, density, lattice, Amount/Invert, wind blur, evolution, Core filter
ordering and odd-padding stability. All pass. Review snapshots include all
12 presets ×72 frames. Evidence: ignored results/stage16-evidence/.
Review: http://127.0.0.1:6040/stage16.html?before=stage15-presets#fire

## 17. Signed tails, aspect direction, and Fluid evolution

34 new native renders distort two orthogonal, unsaturated Glow ramps. Jointly
invert their 2D baselines (finite-comp falloff prevents a 1D inversion) to recover
both signed components. Predicting the separately rendered Multiply field gives
RMS .0017–.0026. A zero inverse-solver residual alone would not validate this.

The averaged mask concealed missing negative excursions:

| Four-octave components below -.9 | Native | Stage16 | Stage17 |
| --- | --- | --- | --- |
| Energy | 4.10% | .40% | ~3.3% |
| Fluid | 4.01% | .44% | ~3.3% |

Fit the single-octave distribution with `max(0,1-1.2*abs(n))^1.5`, and accumulated
feedback gain2. This is a measured simplex approximation, not a claim about
Saber's source. The old squared primitive had the right mean and almost no
strong negative tail after four octaves. Bias3 made the Core discrepancy worse.
The new regression measures actual signed fields after Bias3, not averaged masks.

25 aspect-only renders confirm that AE multiplies X frequency; Y stays fixed.
Our division stretched X instead. For Energy, aspect .5/1/2 gives X/Y gradient
ratios ~.51/1.02/1.92. Fix both the base coordinate and optional turbulent
transport. Refitting the common Fluid/Energy wavelength conversion to .625
retains the measured horizontal gradients while correcting vertical wavelength.
This changes the documented aspect semantics to match AE; recipes stay untouched.

Recheck motion after changing the primitive. Fluid's old .75 time conversion
became too fast (correlation RMSE .164); .5 gives .041 on starts3/4. Separate
native probes at complexity1/2/4 and starts0/.5/1/2 also improve versus .75
(RMSE .097/.082/.094, formerly .206/.108/.127). Energy remains .75, Smoke1.
Wind transport and six-tap spatial shutter stay unchanged.

Rejected experiments: larger/global/recursive/3D or independent warps,
normalized warp sums, and cubic-gradient primitives did not consistently improve
native statistics and topology together. No such algorithm replacement landed.
The gradient-noise experiments used independent hashing/gradients; public
background references: https://cs.nyu.edu/~perlin/noise/ and
https://libnoise.sourceforge.net/docs/group__libnoise.html . These do not establish
which algorithm the proprietary plug-in uses. Random phase/topology remains an
approximation; do not present this as pixel parity.

Validation:40 node tests and six focused GPU suites (octave increments, density,
negative tails, aspect, lattice/DPR, native temporal correlations), all pass.
All12×72 review frames regenerated. Raw native16-bit frames, JSX, inversions,
rejected fits and final checks are archived under ignored results/stage17-evidence/.
Review: http://127.0.0.1:6040/stage17.html?before=stage16-presets#fire

## 18. Acceptance checks and memory blocker

Stage17: straight0.25–2px Core at0/22.5/45 degrees has at most .252% energy
variation over four subpixel positions. DPR2 versus DPR1 core relativeL1 is
1.13% (DPR3:1.02%). Appearance, Core filter order, odd-padding and wind-blur
checks pass. Actual CSS resize round trips across Fire/Arc/Windy/Torch at DPR1/2
restore pixels exactly; tracked allocations stabilize and all objects release.
A radius2px/.25px circular line still has8.15% subpixel energy swing at DPR1,
1.75% at DPR2. This is identical to Stage16, not a new regression.

M4 Max/ANGLE Metal,960×540 source, pad320. Six presets, DPR1/2, two alternating
orders,60 samples after15 warmup frames, batch2. All GPU errors0. Timings are
load-sensitive: initial Fire +12–16% did not reproduce consistently. A longer
Fire check (120 samples,60 warmup,batch4) gave DPR1 means2.62→2.56ms; DPR2
medians drifted5.11→9.82ms baseline and5.16→11.90ms candidate across repeats.
Do not claim a precise regression or speedup from these noisy timing runs.

The deterministic blocker is memory: Arc Reactor peaks at~1.21GiB tracked
texture storage at DPR2. The padded surface is3200×2360 physical pixels,
~115MiB per RGBA32F image. This is estimated texture allocation, not total driver
VRAM. It also existed in Stage16; lifetime/disposal correctness does not make
the per-instance footprint acceptable. User requires this fixed before release.
Next work profiles targets, reduces formats/lifetimes/resolution where visual
parity allows, using the frozen Stage17 output as the reference. No further
artistic preset/noise tuning.


## 19. Render-target memory reduction

Frozen Stage17 appearance; no preset or noise retuning. Added explicit RGBA8,
R16F, RG16F and RGBA16F color storage to EffectRenderTargetOpts. Existing float
selection is unchanged when format is omitted. Saber uses R16F for scalar core,
softness and blur intermediates; packed Glow uses RGBA16F. Geometry and noise
remain32F on this GPU: reducing those to16F introduced visible contour errors.

Flooding now reuses the invalid distance field as one ping-pong side, resolves
into the other and retains only the resolved field. Dynamic sources retain one
scratch side, avoiding allocation every frame; disabling dynamic releases it.
Full-resolution, unit-weight core softness reuses its vertical blur directly.
Only the smooth, pre-distortion Glow mixture is capped at1 physical pixel/CSS px.
Core, warped Glow and warped Halo still render at full DPR. Capping the warped
outputs caused large isolated highlight differences and was rejected.

Tracked effect texture allocation, M4 Max/ANGLE Metal,960×540 source,pad320:

| Preset | DPR | Stage17 | Stage19 steady | Stage19 rebuild/dynamic peak |
|---|---:|---:|---:|---:|
| Arc Reactor |1|349.21 MiB|102.30 MiB|131.11 MiB|
| Arc Reactor |2|1242.27 MiB|289.56 MiB|404.79 MiB|
| Fire |1|238.60 MiB|92.18 MiB|120.99 MiB|
| Fire |2|872.39 MiB|257.83 MiB|373.07 MiB|

Arc Reactor:76.7% less steady texture storage,67.4% less at rebuild/dynamic
peak. These are traced allocations, not driver/process VRAM. The measurement
uses full contours; additional reveal payload storage is not included in this
budget.405MiB remains substantial; this does not establish a universal release
budget or device compatibility.

All12 presets × DPR1/2 × t=1,1.5,2: worst relative RGB L1 .4411%, RMS .562/255;
worst isolated channel difference48/255. Thus visual parity is approximate,
not byte-identical. Inspected DPR2 Torch/Kryptonite pairs and the Fire review.
Core coverage, DPR, reveal, resize, context restoration, lifecycle, appearance,
filter ordering and Glow resolution checks pass; disposal returns tracked
objects to zero. Memory checks include static invalidation and dynamic→static
transitions and enforce both steady and peak allocation ratios.

Core676 tests, effects41 tests, TypeScript/builds and118-export docs checks pass.
Real GPU readback: all4 new formats × ordinary/persistent/mipmap/MSAA paths
preserve expected RGBA values, GL errors0, complete disposal. Review regenerated:
12×72 unique frames, GL errors0. Artifacts are under ignored results/stage19-evidence/.
Review: http://127.0.0.1:6040/stage19.html?before=stage17-presets#fire

Timing: six presets × DPR1/2 × two alternating orders,60 GPU samples after15
warmup frames,batch2, GL errors0. DPR2 paired mean ratios ranged .63–.97.
The initial DPR1 Arc +34% did not reproduce:100 samples after40 warmup,batch4,
four alternating runs gave baseline2.37–2.79ms and candidate2.36–2.46ms.
No clear sustained slowdown; do not extrapolate these load-sensitive numbers.


## 20. RG32F distance fields

Stage19 baseline; preset values, noise and other render-target resolutions unchanged.
Full contours use RG32F for both the cached field and flood scratch. The field
stores signed distance in R, normal angle+4 in G; G=0 is invalid and G=8 is a
zero normal. Decode normals only at texel centers. Distorted core sampling keeps
hardware-linear distance and separately reconstructs bilinear validity from
four texels, avoiding interpolation of wrapped angles. Support culling reads
validity directly without trigonometry.

Two-channel flood seeds retain their original32F relative offsets. Invalid
seeds use a large finite sentinel; flood reads exclude the zero-cleared region
outside the processing rectangle. This preserves valid seeds at zero offset.
Reveal needs arc position/length in the other two channels, so it retains the
Stage19 RGBA path; returning to full contours rebuilds RG32F without discarding
the source trace. Unsupported float-linear/blend extensions also retain the
legacy path. No reduced-precision fallback is imposed on explicit RG32F callers.

M4 Max/ANGLE Metal,960×540,DPR2,pad320, full contours (tracked texture storage,
not total driver VRAM):

| Preset | Stage19 steady | Stage20 steady | Stage19 rebuild/dynamic peak | Stage20 peak |
|---|---:|---:|---:|---:|
| Arc Reactor |289.56 MiB|231.94 MiB|404.79 MiB|289.56 MiB|
| Fire |257.83 MiB|200.22 MiB|373.07 MiB|257.83 MiB|

One field saves57.62MiB; the two-field peak saves115.23MiB. Reveal retains its
prior footprint, including cached arc/payload targets. Do not apply these
full-contour numbers to active reveals or unsupported devices.

Validation:679 core +43 effects tests; ESM/CJS builds, TypeScript and docs checks.
All12 presets × DPR1/2 × t=1,1.5,2 have zero screen-pixel difference from Stage19.
All864 regenerated review PNGs match Stage19 byte-for-byte. Thin oblique lines,
empty input and cropped processing regions: exact signed distances and validity,
normal-component error <=4.47e-7, zero screen difference. Reveal↔full transitions
and compact/legacy context recovery preserve pixels; all tracked objects release.
RG32F GPU readback preserves32F fractional/HDR values in ordinary, persistent,
mipmapped and MSAA-requested targets. Unsupported formats throw before allocation;
MSAA fallback retains RG32F storage.

Artifacts: ignored results/stage20-evidence/. Reproduce from the frozen Stage19
candidate with prepare-saber-comparison.mjs; runFieldChecks() and memoryChecks({
maxSteadyRatio:.9,maxPeakRatio:.9}) check this phase separately from Stage19's
larger memory reduction against Stage17.
Review: http://127.0.0.1:6040/stage20.html?before=stage19-presets#kryptonite

Timing remains load-sensitive. The initial six-preset run showed noisy DPR1
Electric/Energy results;50 warmup frames +100 samples,batch3 in alternating
order gave Electric paired means2.98→2.98ms and Energy2.95→3.02ms. With dynamic
sources at DPR2, repeated Arc Reactor medians21.80/21.98→13.63/13.36ms; Fire
27.70/26.58→19.35/21.44ms. All GL errors0. No universal frame-rate claim.

## 21. RG32F noise grids

Stage20 baseline. Core, Glow and Halo noise grids store only the two32F
displacement channels they sample. Float-linear/blend support gates RG32F;
other devices retain the existing automatic float format. Grid spacing,
noise arithmetic, presets and render-target resolutions are unchanged.

960×540 source,DPR2,pad320, full contours, tracked texture storage:
Arc Reactor231.94→221.06MiB; Fire200.22→189.28MiB. Typical three-grid savings
are10.9MiB; Torch uses one grid and saves3.62MiB.

All12 presets × DPR1/2 × t=1,1.5,2 have zero screen-pixel difference.
All864 review PNGs are byte-identical to Stage20.44 effects tests pass.
Full-contour and Reveal context restoration, resize, dynamic/static transitions
and lifecycle checks pass; disposal releases every tracked object. GL errors0.
Artifacts: ignored results/stage21-evidence/ (qa.json, frame-diff.json, timing.json).
Review: http://127.0.0.1:6040/stage21.html?before=stage20-presets#fire

## 22. Scalar warped Glow

Stage21 baseline. The packed Glow path writes only its active component to a
full-resolution R16F target. Stationary bypass and unwarped Halo are sampled
from the cached RGBA16F base in the final composite. Explicit half-float packing
retains the former intermediate store's rounding. Warped Halo, no-distortion
composition and general multi-channel distortion probes retain their paths.
The scalar warp shader also skips the redundant stationary-channel read.
No preset, noise, sampling-resolution or color-response changes.

960×540 source,DPR2,pad320, full contours, tracked texture storage (MiB):

| Preset | Stage20 steady | Stage21 steady | Stage22 steady | Stage22 rebuild/dynamic peak |
|---|---:|---:|---:|---:|
| Arc Reactor |231.94|221.06|177.85|235.47|
| Fire |200.22|189.28|146.06|203.68|
| Torch |184.81|181.19|137.97|195.59|

The full-resolution Glow target alone saves43.21MiB vs Stage21. These are
texture allocations, not total process/driver VRAM, and exclude active Reveal
payload storage. Stage21+22 save54.09MiB for Arc Reactor and54.15MiB for Fire.

All12 presets × DPR1/2 × t=1,1.5,2 have zero screen-pixel difference.
All864 review PNGs are byte-identical to Stage21 (and Stage20).
The90 custom storage checks cover partial bypass, HDR/tint, shutter/flow,
Multiply, unwarped/disabled Halo, no distortion, Reveal/full transitions,
disabled Glow, all-layer distortion, preset changes and dynamic sources at
DPR1/1.5/2, including forced legacy float storage. Every screen byte matches.
Full-contour/Reveal context restore, resize, lifecycle and disposal checks pass;
GL errors0.45 effects tests and ESM/CJS builds pass.

Artifacts: ignored results/stage22-evidence/ (qa.json, frame-diff.json,
timing.json and benchmark-storage.mjs). Review:
http://127.0.0.1:6040/stage22.html?before=stage20-presets#fire

Timing: six presets × DPR1/2 × two alternating orders,80 GPU samples after30
warmup frames,batch3. DPR2 paired median means ranged0.884–1.050× baseline.
Initial DPR1 Fire/Torch slowdowns did not reproduce with60 warmup frames,
120 samples,batch4 and reversed starting order: Fire2.530→2.315ms,
Torch1.313→1.302ms, Windy2.175→2.170ms, Electric2.210→2.197ms,
Energy2.217→2.200ms. Arc Reactor2.210→2.392ms (+0.182ms,8.2%); this phase
does not guarantee faster rendering at low DPR. Memory reduction and captured
pixel parity are deterministic; timings remain device/load dependent. All GL
errors0. Confirmation evidence: timing-confirm.json and confirm-storage.mjs.


## 23. Shared Core/Halo noise

Stage22 baseline (`ba7e8914`). Halo borrows the Core distortion noise grid
when its effective inputs, content mapping, dimensions, time and GL context
match. The Core passes retain ownership. A mismatched grid falls back to an
independent allocation; returning to shared mode releases the fallback.
Frozen Core noise can also be reused when only Halo light changes.
Halo's light warp remains independent. No preset, shader arithmetic, sampling
resolution or public parameter changes. Ten native presets eliminate one noise
generation draw and one texture/framebuffer; Torch still has only Glow noise.

960×540 source, DPR2, pad320, full contours, tracked texture storage (MiB):

| Preset | Stage22 steady | Stage23 steady | Stage23 rebuild/dynamic peak |
|---|---:|---:|---:|
| Arc Reactor |177.85|174.23|231.84|
| Fire |146.06|142.41|200.03|
| Tractor Beam |146.03|142.31|199.93|
| Torch |137.97|137.97|195.59|

Savings3.62–3.71MiB per active Core/Halo pair, independent of DPR because the
noise grid uses content pixels. These are tracked texture allocations, not
total driver/process VRAM; active Reveal payloads are excluded from this table.

All12 presets × DPR1/2 × t=1,1.5,2 have zero screen-pixel difference.
All864 review PNGs are byte-identical to Stage22. The90 custom storage checks
also match every screen byte, including forced legacy storage, fractional DPR,
shutter/flow, Multiply, Reveal, dynamic sources and parameter transitions.
Full-contour/Reveal context restoration, resize, lifecycle and disposal checks
pass; GL errors0.48 effects tests and ESM/CJS builds pass. Whole-repo test run
also passed17 tasks, including public API/skill checks.

Artifacts: ignored results/stage23-evidence/ (qa.json, frame-diff.json,
timing.json, timing-confirm.json), stage23-noise-share-renderer/manifest.json.
Review: http://127.0.0.1:6040/stage23.html?before=stage22-presets#fire

Whole-frame timing: two reversed orders,60 warmup frames,120 single-frame
samples. Geometric mean of paired median ratios across ten affected presets:
0.952 at DPR1,0.922 at DPR2. Some individual cases regress; no universal FPS
claim. Additional80-sample batch8 confirmation and complete tables are in
[the timing report](2026-11-27-saber-noise-sharing.md). Both confirmation runs
have complete GPU sample counts and GL errors0. Initial batch3 pilot overlapped
a repository build/test run and is excluded from performance conclusions.


## 24. Cropped distance-field allocation

Stage23 baseline (`336e9870`). Compact steady-contour fields and their jump-flood
scratch now allocate the existing restricted raster window. Full output/core
resolution, source sampling, noise coordinates and flood reach stay unchanged.
Reveal and legacy float paths retain full-size fields. Reads outside the window
return the former zero border. Explicit field ownership now includes disposal.

960×540,DPR2,pad320: field3200×2360→2448×1608, RG32F57.62→30.03MiB.
Fire steady142.41→114.82MiB, rebuild/dynamic peak200.03→144.86MiB;
Arc Reactor174.23→146.64MiB, peak231.84→176.67MiB. Tracked texture storage,
not total driver/process VRAM. A rebuilt Fire field matched the baseline float
field exactly inside the window. Warped sampling has extra UV conversion:
864 review frames contain213 differing PNGs, maximum channel difference1/255,
maximum9 changed channel values per960×540 frame. Not byte-identical. Inspected
Fire before/after; no visible shape/color change. All90 custom storage cases
are byte-identical, including fallback, fractional DPR, Reveal and live switches.
Full/Reveal context restoration, resize and lifecycle checks pass, GL errors0.
49 effects tests pass. ESM/CJS builds checked.

Evidence: ignored results/stage24-evidence/ and stage24-field-window-v3/.
Review: http://127.0.0.1:6040/stage24.html?before=stage23-presets#arc-reactor

Timing: four presets ×DPR1/2 ×two reversed orders,40 warmup frames,
80 samples,batch3. Full-frame GPU median means (ms), Apple M4 Max/Chrome158:

| Preset | DPR1 before | DPR1 after | DPR2 before | DPR2 after |
|---|---:|---:|---:|---:|
| arc-reactor | 2.662 | 3.246 | 2.128 | 2.680 |
| fire | 2.849 | 2.878 | 2.872 | 2.996 |
| torch | 1.550 | 1.556 | 1.351 | 1.476 |
| windy | 2.761 | 2.415 | 2.494 | 2.797 |

Timings vary by workload and run; allocation reduction is deterministic.
All GPU samples present, GL errors0.

DPR2 confirmation:60 warmup,80 samples,batch8,two reversed orders.
arc-reactor: 2.409→2.404ms (-0.2%).
fire: 6.531→6.234ms (-4.6%).
torch: 0.890→0.835ms (-6.1%).
windy: 2.061→1.947ms (-5.6%).


## 25. Fused Glow/Halo warp composition

Stage24 baseline (`58b686df`). Glow/Halo cached-noise warp shaders are embedded
as independent namespaced functions in final light composition. Their full-size
R16F outputs are eliminated. Core retains its separate path. Presets and noise
formulas are unchanged. Shader variants are cached without concatenating entire
bodies each frame. A1×1 R16F probe identifies attachment rounding without CPU
readback; the function reproduces that rounding before composing light. This
backend truncates positive attachment writes, unlike packHalf2x16's nearest
rounding. Recalibration runs after context restoration. On fractional DPR/output
or source grids, retain the former intermediate interpolation. Static noise and
base light stay cached; fused final warps execute with each composite.

960×540,DPR2,pad320,tracked texture storage (MiB):

| Preset | Stage23 steady | Stage24 steady | Stage25 steady | Stage25 rebuild/dynamic peak |
|---|---:|---:|---:|---:|
| Fire |142.41|114.82|86.02|116.05|
| Arc Reactor |174.23|146.64|117.83|147.86|
| Torch |137.97|110.39|95.98|126.02|

Stage25 saves28.81MiB for a two-warp preset,14.40MiB for Torch (one warp),
less the2-byte rounding probe. Stage24+25 save56.39MiB steady and83.98MiB at
rebuild/dynamic peak for Fire/Arc Reactor. These are effect texture allocations,
not total VRAM. Active Reveal still uses its existing full-size payload/field.

All12 presets ×DPR1/2 ×t=1,1.5,2 have zero screen difference from Stage24.
All864 review frames are byte-identical to Stage24. Custom storage cases at
DPR1.5 (native and forced legacy) are byte-identical. At DPR1/2 some custom HDR,
flow/Multiply and live mode-switch cases differ by1/255 in at most8 channel
values per frame; strict byte-equality flags are retained as failures in raw
storage output, not relabeled as passes. Fractional fallback avoids the earlier
5/255 interpolation differences. Full/Reveal context restore, resize, lifecycle,
GPU object disposal and GL-error checks pass.51 unit tests, ESM/CJS and changed
file Biome checks pass. No public API changes.

Evidence: ignored results/stage25-evidence/ and stage25-fused-v4/.
Review: http://127.0.0.1:6040/stage25.html?before=stage24-presets#arc-reactor

Timing: four presets ×DPR1/2 ×two reversed orders,40 warmup frames,
80 samples,batch3. Full-frame GPU median means (ms), Apple M4 Max/Chrome158:

| Preset | DPR1 before | DPR1 after | DPR2 before | DPR2 after |
|---|---:|---:|---:|---:|
| arc-reactor | 2.863 | 1.498 | 2.463 | 1.530 |
| fire | 2.581 | 1.580 | 3.005 | 1.351 |
| torch | 1.399 | 1.493 | 1.338 | 1.108 |
| windy | 2.817 | 1.415 | 2.816 | 1.589 |

DPR2 confirmation:60 warmup,120 samples,batch1,two reversed orders.
Ordinary-frame GPU median means (ms):

arc-reactor: 3.581→2.661ms (-25.7%).
fire: 4.593→3.549ms (-22.7%).
torch: 2.169→1.872ms (-13.7%).
windy: 3.050→2.428ms (-20.4%).

All16 runs contain120 GPU samples; GL errors0. Timing varies across runs,
especially Fire; these measurements are device/workload-specific. DPR1 Torch
had a small batch3 regression; no universal speedup claim.


## 26. Fused Core warp and compilation measurements

Stage25 baseline (`6dca5656`). Core warp now runs in final composition on the
same integer raster grids as Glow/Halo. The original/soft Core remains cached
for light generation and overlay. Core/Halo share their noise grid as before.
Separate deferred Core state survives subsequent Glow preparation. Bounds now
address the original padded pixel grid via UV, not the final viewport's
`gl_FragCoord`; a naive initial implementation failed this mapping and was
rejected. Existing half-float rounding is reproduced. Fractional grids retain
the separate Core warp and release/recreate that target on live mode switches.
Static Core noise remains cached; the fused Core warp itself runs each composite.
No preset or public API changes.

960×540,DPR2,pad320,tracked texture allocations (MiB; not total VRAM):

| Preset | Before steady | After steady | Before rebuild/dynamic peak | After peak |
|---|---:|---:|---:|---:|
| Fire |86.02|71.61|116.05|101.64|
| Arc Reactor |117.83|103.43|147.86|133.46|
| Torch |95.98|95.98|126.02|126.02|

One R16F3200×2360 target (14.40MiB) removed where Core distortion is active.
Torch has no Core distortion; its shaders and allocation behavior are unchanged.

Visual validation:864 review frames vs Stage25,307 differ, maximum1/255 in
at most4 channel values per960×540 frame. Fire, Windy and Torch review sequences
are byte-identical. All12 presets ×DPR1/2 ×t1/1.5/2 have maximum1/255 difference.
90 additional cases (HDR, flow, Multiply, live switches, Reveal, legacy float,
DPR1/1.5/2) have maximum1/255 in at most25 channel values; DPR1.5 is exact.
Strict storage equality failures remain in raw evidence. Context restore,
Reveal restore, resize, lifecycle and object disposal pass; GL errors0.
51 unit tests, ESM/CJS and changed-file Biome checks pass.

### Startup and preset switching

Apple M4 Max/Chrome158, source960×540,DPR2,pad320. Three repetitions, four
initial presets (Arc Reactor, Fire, Windy, Torch), reversed renderer order.
Each fixture renders the initial preset, all11 others, then repeats those11.
48 fixtures/1104 rows; all GL errors0. No compilation on repeated switches.
Module/page/network loading excluded. GPU-completed wall time uses a synchronous
one-pixel canvas readback, including its overhead. `finish()` alone was insufficient
on Chromium; the earlier finish-only pilot is archived, excluded below.

Cached-source runs reuse shader source previously compiled by QA. Unique-source
runs rename the main entry function without changing arithmetic/uniforms; this
forces new source lookup but does not guarantee a driver binary-cache miss.
These are not clean-browser cold-start measurements. The API-time subtotal sums
compile/link/status queries and uniform inspection; it does not isolate parallel
driver compiler work. Wall time includes allocations, rendering and readback.

Median initial effect-render completion, milliseconds (3 runs per cell):

| Preset | Cached before | Cached after | Unique before | Unique after |
|---|---:|---:|---:|---:|
| arc-reactor |37.0|36.0|732.4|689.1|
| fire |35.8|32.9|762.3|717.4|
| windy |33.9|36.7|746.5|699.9|
| torch |30.5|31.3|633.6|627.3|

Medians across12 starting fixtures:
cached-source: initial33.95→32.55ms; complete preset tour106.70→120.85ms; compile/link/inspection API subtotal49.60→65.95ms.
unique-source: initial743.85→695.60ms; complete preset tour1141.70→1383.35ms; compile/link/inspection API subtotal921.55→973.50ms.

Fewer initial programs do not mean cheaper exploration of every preset.
A complete tour creates16 programs for either renderer: fusion shifts some
compilation into later switches. The unique-source tour is about21% slower.

Concrete regression: when starting Arc Reactor and visiting presets in stored
order, first Fire needs one additional composite variant. Cached completion
5.7→14.1ms; unique2.9→184.9ms (medians of3). Old Core/composite variants were
already reusable separately; their combined variant was not. Repeated switches
create zero programs. This is an explicit memory/startup tradeoff, not a universal
compile-speed improvement. Actual browser presentation timing is not measured.

The v2 pilot also rewrote unreachable Glow/Halo bounds source. Final code limits
that rewrite to Core, preserving existing Glow/Halo source and cache identities.
Torch before/after draw shader sequences are byte-identical (38 draws across
initialization and another render). Final QA/startup/timing were rerun after this
change; earlier v2 results are archived in results/stage26-pilot-evidence/.

Evidence: ignored stage26-core-final/ and results/stage26-evidence/.
Review: http://127.0.0.1:6040/stage26.html?before=stage25-presets#fire

### Steady-frame GPU timing

Final renderer, DPR2,60 warmup,120 samples,batch1,three reversed-order runs.
Median of per-run GPU medians (ms), not summed pass timings:

| Preset | Stage25 | Stage26 | Change |
|---|---:|---:|---:|
| arc-reactor |2.911|2.600|-10.7%|
| fire |3.692|3.293|-10.8%|
| torch |2.035|1.968|-3.3%|
| windy |2.623|2.421|-7.7%|

All24 runs have120 GPU samples, GL errors0. Torch's unchanged shader sequence
is a control: its small timing difference illustrates run variability, not an
optimization benefit. Active Core presets improved about8–11% on this device.
Earlier v2 timing is archived; final claims use timing-repeat.json only.
Keep this as a reversible memory/per-frame optimization with the first-switch
compilation regression explicitly documented. No universal hardware guarantee.


## 27. Revert Core fusion; retain measurement tools

User rejected the additional first-preset-switch compilation stall from Stage26.
Restore `_saber-glow.ts`, `_saber-warp.ts`, `saber.ts` and their unit tests exactly
to Stage25 (`6dca5656`). Keep startup measurement tooling and all Stage26 evidence.
Remove the unreleased Core-fusion changeset. Distance-field cropping and the
previous Glow/Halo fusion remain enabled. Core uses its separate intermediate
again: Fire86.02MiB, Arc Reactor117.83MiB at960×540,DPR2,pad320 (Stage25 data).
This chooses the former shader reuse across presets over14.40MiB of savings.

Stage27 review uses the archived Stage25 captures: production ESM hashes match
Stage25 exactly. No new GPU/compile timing claim; previous Stage25 evidence applies.
Review: http://127.0.0.1:6040/stage27.html?before=stage26-presets#fire


## 28. Fuse Core with uniform-selected modes

Baseline Stage27 (`a338245a`), whose production renderer is identical to Stage25.
Restore Core fusion, but use one cached-noise Core shader for raster, bounded
raster and analytic coverage. `coreMethod` selects these branches per draw.
Turbulence stays in the existing noise-generation pass; it no longer creates a
redundant cached Core variant. Glow/Halo specialization is unchanged. Preserve
Core/Halo noise sharing, R16F rounding and the fractional-grid intermediate path.
No public parameter or preset changes.

### Visual and allocation validation

864 review frames against Stage25:307 differ, maximum1/255, at most4 changed RGB
channel values per960×540 frame. Fire, Windy and Torch sequences are byte-identical.
All12 presets at DPR1/2 and t1/1.5/2: maximum1/255.114 additional cases cover
HDR, Reveal, flow, live raster/analytic/Multiply/turbulence switches, legacy float
and DPR1/1.5/2: maximum1/255 in at most25 channel values; DPR1.5 is exact.
Raw evidence retains strict nonzero-diff flags. Context/Reveal restore,8 resize
cases, lifecycle and object disposal pass. GL errors0.53 unit tests, ESM/CJS builds,
changed-file Biome and diff whitespace checks pass.

Tracked texture allocations, MiB (960×540,DPR2,pad320; not total process/GPU memory):

| Preset | Steady before | Steady after | Rebuild/dynamic peak before | Peak after |
|---|---:|---:|---:|---:|
| Fire |86.02|71.61|116.05|101.64|
| Arc Reactor |117.83|103.43|147.86|133.46|
| Torch |95.98|95.98|126.02|126.02|

Remove one full-resolution R16F target (14.40MiB) for active Core distortion.
Torch has no Core distortion, so remains an unchanged control.

### Initial compilation and preset switching

Apple M4 Max/Chrome158, source960×540,DPR2,pad320. Three repetitions, four
initial presets (Arc Reactor, Fire, Windy, Torch), reversed renderer order.
48 fixtures/1104 rows. Each fixture renders its initial preset, all11 others,
then repeats those11. All GL errors0. No paired row creates more candidate
programs than baseline. A complete tour creates16→14 programs; repeat switches
create0 programs in either renderer.

Initial effect-render completion medians (milliseconds,3 runs per cell):

| Preset | Cached before | Cached after | Unique before | Unique after |
|---|---:|---:|---:|---:|
| arc-reactor |34.5|34.7|688.6|675.4|
| fire |33.2|34.2|711.1|672.7|
| windy |33.3|34.1|700.0|682.0|
| torch |26.3|27.2|578.2|592.2|

For initial Fire, compile/link/status/uniform-inspection API subtotal:
cached30.1→29.4ms; unique664.1→580.6ms. Initial programs12→11.

Previously problematic first Fire after starting Arc Reactor and touring in
stored preset order: cached completion3.8→3.4ms; unique3.6→3.9ms (medians of3).
Both versions create0 programs at that switch in every run. Stage26's additional
~185ms compile stall is absent. This does not mean every first preset switch is
compilation-free: existing Glow/Halo/noise variants still compile as needed.

Across12 fixtures, median full-tour completion:
cached86.05→88.30ms; unique1065.20→1014.90ms. Corresponding compiler-related API
subtotals45.60→44.85ms and865.30→756.05ms.

Method: completion wall time includes allocations, rendering and synchronous
one-pixel canvas readback; module/page/network load excluded. API subtotal sums
compile/link/status queries and uniform inspection, not isolated parallel-driver
compiler work. Cached-source runs reuse QA-warmed sources. Unique-source runs
rename the main entry function without changing arithmetic/uniforms: this requests
fresh source compilation but cannot guarantee a driver binary-cache miss. These
are not clean-browser cold starts or actual presentation latency measurements.

### Steady-frame GPU timing

60 warmup frames,120 samples per run,batch1,three reversed-order runs per
preset/renderer/DPR. Median of3 per-run GPU medians, milliseconds:

| DPR | Preset | Stage27 | Stage28 | Change |
|---|---|---:|---:|---:|
|1|arc-reactor|1.728|1.666|-3.6%|
|1|fire|3.143|3.067|-2.4%|
|1|torch|1.494|1.498|+0.2%|
|1|windy|1.656|1.528|-7.8%|
|2|arc-reactor|2.466|2.283|-7.4%|
|2|fire|5.298|5.086|-4.0%|
|2|torch|1.816|1.821|+0.3%|
|2|windy|2.235|2.022|-9.5%|

All48 runs have120 GPU samples and GL errors0. Active Core presets improve about
2–10% here; Torch's0.2–0.3% variation is measurement noise, not an optimization.
These measurements compare the same-session Stage27/28 renderers; do not compare
absolute timings with older stages measured under different device conditions.

Frozen final renderer: ignored `stage28-core-uniform-renderer/` (candidate ESM
hashes match the QA pilot). Evidence: `results/stage28-evidence/{qa,frame-diff,
startup,startup-summary,timing-repeat,timing-summary}.json`. Review captures:
`results/stage28-presets/`. Baseline uses archived Stage25 captures because Stage27
production code is identical. Page includes measurement tables and raw links.
Review: http://127.0.0.1:6040/stage28.html?before=stage25-presets#fire


## 29. Prepare Saber programs asynchronously

Port the `ctx.createProgram()` / `EffectProgram` implementation from
`claude/parallel-shader-compile` (`180c8913`). Keep source-based draws and the
VFX-owned program cache compatible. With `KHR_parallel_shader_compile`, submit
compiles/links without querying blocking compile/link status, poll completion,
then inspect uniforms. Without the extension, retain synchronous compilation.
Drawing a pending handle still waits synchronously: effect authors must await
`ready` or check `isReady`. Reject foreign-context program handles. Pending
`ready` rejects on disposal; restored prepared programs compile asynchronously
and expose fresh readiness. These lifecycle cases extend the imported WIP.

Saber now awaits preparation in `init()`. Run its existing shader-selection path
on a temporary instance with dimension-only targets and intercepted draws; this
collects exactly the active sources without GPU draws, allocations or readback.
Explicitly include the later Reveal splat/arc passes. The probe is disposed
immediately; its empty readback result cannot change the real effect.

A conservative configuration key includes params and layout, excludes time.
Live edits, preset changes, fractional grids and resizing can replan; repeated
sources reuse the core cache. Before rendering, check every required program.
While compilation is pending, defer the effect's draw without mutating its
render caches. Initial async setup leaves the VFX add operation pending; later
new configurations temporarily defer Saber output. No extra full-frame target
or shader arithmetic change. Context restoration clears the preparation key.

### First-display responsiveness

Before: Stage28 effects **and core** frozen renderer. After: Stage29 effects and
core. Chrome158 / Apple M4 Max,960×540,DPR2,pad320. Four presets, three repetitions,
reversed renderer order:24 fixtures. Source image/module loading precede timing.
Each fixture renames shader entry functions to request new-source compilation;
this does not guarantee a cold driver binary cache or simulate every first visit.

Observe requestAnimationFrame gaps, a5ms interval heartbeat and PerformanceObserver
Long Tasks (>=50ms). No readback or finish in the measurement interval. First draw
means the first actual Saber composite **submitted**, not GPU completion or
presentation. Before setup, two animation frames establish the heartbeat; it
continues through setup and two frames/25ms after first draw.

First draw is the median of3; RAF gaps are the worst of3, milliseconds:

| Preset | First draw before | First draw after | Max RAF gap before | Max RAF gap after | Long Tasks before / after |
|---|---:|---:|---:|---:|---:|
|fire|629.5|136.4|616.7|17.9|3 / 0|
|arc-reactor|616.4|136.4|599.9|18.6|3 / 0|
|windy|629.5|136.2|616.6|18.3|3 / 0|
|torch|595.2|102.9|566.7|18.0|3 / 0|

All12 baseline trials contain a568–626ms Long Task. All12 candidate trials have
zero Long Tasks. Candidate worst RAF gap18.6ms and5ms-timer gap10.5ms. Thus this
supported browser remained responsive during the tested new-source preparations;
this is not a guarantee for other devices or extension-less browsers.

Fire: synchronous init return <=1.1ms; async init completion median110.6ms;
first draw submission median136.4ms. Maximum render call624.7→1.8ms.
Compiler/link/status/uniform-inspection API subtotal median606.9→0.2ms: the
compiler work has moved off the main-thread wait, not vanished. Candidate
initialization submits all required shaders before waiting, allowing overlap.
All24 fixtures report parallel-compile support and GL errors0.

### Appearance, allocations and validation

All864 review frames vs Stage28 are byte-identical (RGB on black). All12 presets
at DPR1/2 and t1/1.5/2 are exact;114 custom cases at DPR1/1.5/2 including HDR,
Reveal, live modes, fractional grids and legacy float filtering are exact.
Both full/Reveal context restoration outputs match exactly. Eight resize cases
round-trip exactly. Lifecycle/disposal checks pass, all tracked GPU objects freed.
Every preset's steady/rebuild/dynamic/frozen texture byte count is unchanged.
Fire remains71.61MiB at960×540,DPR2,pad320 (tracked allocations, not total VRAM).

Core696 tests and effects55 tests pass. Core/effects ESM+CJS builds and lint pass.
Docs API/skill checks pass (118 exports); updated public API docs and changesets.
Browser fixtures wait for a completed composite before screenshots, so pending
frames are not mistaken for final output. Compilation failures, missing extension,
disposal, restore and cross-context ownership are covered by core tests.

Evidence (ignored review server root): `stage29-async-renderer/manifest.json`,
`results/stage29-evidence/{async,async-summary,qa,frame-diff}.json` and
`results/stage29-presets/`. The earlier pilot is separately saved as
`pilot-async.json`; final reported timings use the24-row `async.json`.
Review: http://127.0.0.1:6040/stage29.html?before=stage28-presets#fire

## 30. Remove non-AE controls

Compared the saved installed-AE property export (`Fire-settings.tsv`, 77 leaf
controls including Preset) with our public API. Remove thirteen extra leaves,
reducing SaberParams from71 to58 (excluding the constructor's preset selector):

- `intensity`, `coreIntensity`: fix their gains at1.
- `coreWhiteness`, `glowWhiteness`: use the measured colorizer without white mixing.
- `glowFlow`: remove envelope displacement.
- `glowDistortAllLayers`: always distort all first three layers; Halo follows Core.
- Core `composite`: always Distort; Glow retains Distort/Multiply.
- Core/Glow `noiseDetail`, `noiseTurbulence`, `directionality`: fixed octave
  spacing2, existing transport, unconstrained displacement.

Remove corresponding uniforms, shader variants, public types/options, preset
entries and Storybook bindings. Nested unknown options now throw before any
preset or parameter mutation, just like top-level options. Existing custom
non-neutral uses require reauthoring; no compatibility aliases. Named presets
and the default Electric look are the preservation target. The pending Saber
release note and agent reference describe the reduced API.

Before renderer: freshly built `7b964333` ESM, frozen before edits. After:
`stage30-params-renderer/`, with manifest hashes. Same WebGL host in both.

### Appearance verification

- 12names ×72frames,960×540,DPR1,t1–3.958s:856/864 frames byte-identical to
  Stage29;8 frames differ by only1–2 color components each, maximum1/255
  (9 changed components across all864 images). PNG alpha is opaque for the
  emission-on-black review. This is not a byte-exact claim.
- Default plus12names ×DPR1/1.5/2 ×t1/2:78 RGBA comparisons. Two comparisons
  each differ in one component by1/255; the other76 are exact.
- 15 live-control steps ×DPR1/1.5/2 ×normal/fallback:90 RGBA comparisons, all
  exact. Covers HDR grading, wind shutter, flicker, Glow Multiply/Distort,
  distortion bypass, Reveal, preset switching, dynamic input, soft/analytic
  Core and original-source composition.
- No GL errors; tracked GPU objects released in all12 lifecycle fixtures.
- Output grading and isolated Glow transfer probes pass. Glow isolation now
  suppresses Core in the diagnostic fixture rather than using a removed public
  brightness control. The transfer probe waits for asynchronous preparation
  after edits; previously it could compare a stale frame.

53 effects unit tests pass, including atomic rejection of all13 removed leaves.
Effects ESM/CJS build, effects/Storybook lint and docs API checks pass (118 exports).
Saber story and pane pass a focused TypeScript check with a test-only CSS module
shim. Whole-Storybook tsc remains blocked by existing missing React/CSS types;
no new Saber option/type errors appear. No GPU-speed claim made for this cleanup.

Evidence: ignored review root `results/stage30-evidence/{frame-diff,qa,isolated}.json`
and `results/stage30-presets/`. Reproducible API comparison runner:
`packages/effects/test/browser/saber-params-checks.mjs`.
Review: http://127.0.0.1:6040/stage30.html?before=stage29-presets#fire
