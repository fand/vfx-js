# Isolated AE Saber Glow measurements

Follow-up: [nonlinear transfer and Halo calibration](2026-11-24-saber-glow-transfer.md)
supersedes the additive/Halo-source and bit-depth hypotheses below.

## Method

Use parameter sweeps, not preset fitting. The installed AE Saber rendered 278
PNG frames across exploratory batches. A temporary 512×512 comp contains a
vertical white core from (256,32) to (256,480). Core Size is 1. Halo, flicker,
both distortions and original-core overlay are disabled. Output Gamma and
Saturation are 1. Black/opaque composition avoids alpha interpretation errors.
Existing reference comps use 16 bpc with no working space and linear blending
disabled; the quantitative comparisons below use that condition.

The probe changes one property at a time: Glow Intensity, Spread, Bias, all
four layer sizes/intensities, Intensity Multiplier, Size Multiplier and Pre
Gamma. Additional batches vary exposure to avoid clipping, isolate individual
layers, and compare one layer against split contributions. Actual property
values are logged after each change. Main controls did not silently rewrite
the recorded Advanced controls.

`packages/effects/test/browser/ae-saber-glow-probe.jsx` reproduces the basic
sweep under `/private/tmp/vfx-js-saber-glow-probe` on macOS. It restores project bit depth and
removes only its own temporary comp/solid. All exploratory frames, scripts and
logs are retained in the ignored comparison cache:
`packages/effects/node_modules/.cache/saber-raw/results/glow-study/ae/`.
`ae-profiles.json` contains the measured middle-row red-channel samples.

## Established observations

1. **Size redistributes energy.** In a weak-glow/high-output-gain sweep,
   fitted line-profile integrals for sizes 16/32/64 are 6.77/6.67/6.63.
   Widths are 15.71/31.52/64.02 px. The previous renderer instead multiplied
   normalized blur by radius, increasing integrated light with size.
2. **Spread scales width.** With Size=20, Size Multiplier=1, Spread values
   0.1/0.25/0.5/1/2 produce approximate widths 5.13/10.31/19.67/39.50/80.42 px.
   Above the small-kernel regime this supports
   `sigma ≈ 2 * Spread * Size * SizeMultiplier`. Our `size` remains CSS-pixel
   sigma; this is a measured conversion, not a new preset-specific coefficient.
3. **Pre Gamma changes the blurred profile.** The core input is constant, yet
   varying Pre Gamma changes the tail width. On one fixed-gain sweep, widths
   at 0.5/1/2 are 25.04/18.98/13.85 px (excluding the central core ±3 px).
   Applying reciprocal gamma to the sharp core before blur cannot reproduce
   this. A direct post-blur exponent has the observed direction.

## Implementation changes

- Glow layers now use normalized convolution: their integrated gain no longer
  contains a radius factor. Halo and visible-core softness keep their existing
  units; they have not been calibrated in this phase.
- Move Pre Gamma from a full-resolution input pass to the blurred-light
  combination, before Glow distortion. Use a direct exponent in 0.1–5 and
  preserve the distorted/protected light shares. A bounded computation avoids
  overflow in tiny tails and bright HDR values.
- Cache the ungraded blur pyramid separately. Pre Gamma edits only recombine
  light and rerun downstream distortion; no blur or core rebuild is needed.
  There is no new render pass, and non-neutral Pre Gamma removes one pass.
- Convert stored recipe gains once using
  `newIntensity = oldIntensity * size * glowSizeMultiplier`.
  This is a unit migration, not visual retuning. Sizes, colors, noise,
  grading and every other recipe parameter are unchanged.

The initial combination-before-exponent implementation was an approximation,
replaced by the follow-up below. The tests
establish post-blur dependence and direction, not the complete proprietary
layer-combination formula. No hidden legacy rendering mode was added.

## Held-out size validation

Use the production GPU blur and one shared gain calibrated only at Size=20.
AE conditions: Glow Intensity=1, Intensity Multiplier=1000, Spread=0.5,
Bias=1, Pre Gamma=1, output Brightness=5, only the first layer enabled.
Compare the center row at offsets 3–180 px on either side, excluding the core.
The old radius-weighted response is anchored to the same Size=20 reference.
All other sizes are held out; no per-size correction is applied.

| Size | Before RMSE, 8-bit units | After RMSE, 8-bit units |
| --- | ---: | ---: |
| 4 | 29.25 | 9.47 |
| 8 | 29.40 | 6.70 |
| 16 | 12.13 | 4.57 |
| 20 (calibration) | 3.91 | 3.91 |
| 32 | 24.89 | 3.00 |
| 64 | 65.70 | 1.22 |

This is a controlled line-profile result, not a full-preset similarity score.
Small-radius kernel shape remains different. Output clipping and 8-bit PNG
quantization also limit what can be inferred from the exported images.

## Regression and cost

- Production float-buffer checks at DPR 1/2: neutral-gamma line mass stays
  within 0.011% of 1 for radii 4–64. Width follows requested sigma. Gamma
  tests include 0.1/0.5/1/2/5; samples remain finite. At 0.1 the finite blur
  support truncates the lifted tail (measured width ~14% below the infinite
  Gaussian prediction); only finite output and broadening are asserted there.
- At t=1.37/2/2.73, 16 migrated recipes match the previous renderer pixel for
  pixel. Fire, Burning and Embers use Pre Gamma=0.81 and intentionally change
  with the corrected position/direction: total RGB increases approximately
  18.7%, 10.9%, 10.9% in these captures. No compensating preset fit was made.
- Fire benchmark, alternating baseline/candidate/candidate/baseline, 60 GPU
  samples after 20 warmup frames: median GPU times 0.932/1.004/0.787/0.892 ms.
  CPU medians are 0.4 ms throughout. Variation is too large to claim a speedup;
  this run shows no consistent material regression. No WebGL errors.
- Node tests: 34 passing. Browser calibration/cache checks, ESM/CJS builds,
  focused Storybook type check and docs public-API checks are also exercised.

## Initial unresolved questions — see follow-up below

- Bias affects layer balance/gain in AE, unlike our current post-composition
  exponent. It needs a separate model; this phase leaves that code unchanged.
- Layer 4 produced no observable response in the isolated line setup. That
  does not establish that it is unused in general. Do not remove it based on
  this probe. Equal-size active layers and split contributions also show
  differences that simple linear summation does not explain.
- Intensity and Pre Gamma interact nonlinearly. The exact position relative
  to each layer's gain and the distortion stage is not established.
- Switching AE to 32 bpc substantially changes these outputs. Treat its
  transfer pipeline separately; do not fit both bit depths with one dataset.

Review: `http://127.0.0.1:6040/glow-study.html`. Supporting cache artifacts:
`results/glow-ae-comparison.json`, `glow-size-study.png`,
`glow-kernel-report.json`, `glow-presets-report.json`, and
`glow-performance.json`.

## Follow-up: isolated Bias and layer composition

The initial unresolved Bias / composition questions above were followed by
316 independent-comp measurements (108 + 141 + 43 + 24), plus a reproducible
78-frame sweep. These use the render queue's installed `_HIDDEN X-Factor 16`
output template, verified as 16-bit PNG. `saveFrameToPng` exports only 8-bit
images. Every case has its own immutable comp/solid. No preset is fitted.
The repository script `test/browser/ae-saber-glow-layers.jsx` restores bit depth
and previous queue enable flags, removes only owned items, and checks every
queue item reached DONE. It produced all 78 images successfully.
`test/browser/analyze-saber-glow-layers.py` reproduces the Bias curves,
layer-additivity residuals and Halo-dependency check from those images.

### Findings and implementation

- **Bias changes slot gains, not a post-composition contrast exponent.**
  Low-signal sweeps support relative gains, normalized at Bias=1, approximately
  `[b, (1+2b)/3, (3+2b)/5, (4+b)/5]`. The first layer disappears at zero;
  the others remain. This is a small-signal approximation, not the exact AE
  transfer function. Stronger light curves upward beyond this model.
- **Apply Pre Gamma per weighted layer, then sum.** Separate layers remain
  approximately additive even at Pre Gamma 0.5 and 2. With two equal-size
  layers at higher signal, adding their independently measured profiles
  predicts the combined AE result with 4.03% / 3.92% / 3.74% relative L2 error
  at gamma 0.5 / 1 / 2. The former sum-then-power scaling predicts errors of
  26.6% / 3.92% / 107.1% in that composition-only test. Those comparisons use
  measured single-layer responses, not a full-renderer pixel parity claim.
  Summing all four isolated layers at the stronger signal leaves 8.0–8.7%
  error, consistent with the remaining nonlinear combination response.
- The shader now multiplies each layer's gain by its Bias weight, applies
  Pre Gamma separately, then sums distorted/protected shares. Bias moves
  before distortion and no longer affects noise contrast at final composite.
  Combined Bias/gamma sweeps show the interaction cannot be represented by
  a simple gain after gamma; exact nonlinear coupling remains approximate.
- Bias is now 0–5, neutral 1; defaults and UI agree. Its cache key refreshes
  only the combined/distorted light. Blur targets and core extraction survive
  Bias and Pre Gamma edits. No extra render target, pass or texture sample.
- Existing recipe contrast exponents are mechanically migrated to
  `newPreGamma = oldPreGamma * 2 ** oldBias`, with new Bias=1. This preserves
  the intended exponent, not exact pixels: per-layer addition and distortion
  ordering changed. No per-preset visual tuning was added.

### Limits exposed by the experiments

**Layer 4 depends on Halo in AE.** With Halo Intensity=0 it vanishes, even at
Layer 4 Intensity=100. Enabling Halo restores it; changing Halo Size changes
its profile. Blend on Top, Core Softness and Core Size did not restore it.
Our fourth layer still blurs the core independently. Reproducing this source
routing correctly requires measuring Halo's kernel/units; this change does
not pretend that dependency is solved.

**AE has a low-light floor and nonlinear HDR gain.** Remove the constant far
background before measuring profile ratios. At very low input, Layer 1 falls
entirely below this floor. Do not infer zero input response from that plateau.
At new held-out Bias values 0.1/0.6/1.5/3 and unequal sizes 10/25/50/80, the
simple balance model's relative profile errors were 1.2–2.4% for Layers 2/3
near Bias 1, but reached 5.5% for Layer 2 at Bias 3. Layer 1 at Bias 0.1 was
floor-limited (~62% relative error); weak Layer 4 had 18–29% error. These
limitations are retained in the data, not hidden by recipe compensation.
Absolute per-slot gain differences are not calibrated by normalizing each
Bias curve at 1. The chart is not evidence of full AE equivalence.

### Verification and review

- 34 Node tests pass, including Bias cache invalidation and finite-value bounds.
- Production GPU: 20 radius/gamma cases and 10 four-layer composition cases
  at DPR 1/2 pass; zero Bias keeps Layer 1 exactly dark at gamma 0.1–5.
  Independently rendered layers sum to the combined output within float error.
- All 19 presets pass fresh-vs-live cache checks. Before/after captures at
  three times (57 pairs) have no WebGL errors. At t=2, Fire RGB sum changes
  +12.2%, Fog -16.3%, Torch -15.9%, Wormhole -17.0%; these are expected
  behavioral changes, not claimed pixel compatibility.
- ESM/CJS build and docs API/export checks pass. The workspace Biome invocation
  could not resolve nested `../../biome.json`; the seven changed TS/MJS files
  pass Biome using an isolated copy of the same root rules.
- Fire ABBA benchmark, 60 samples each: GPU medians 6.00 / 4.85 / 2.72 / 2.45 ms;
  CPU medians 0.3 / 0.3 / 0.2 / 0.3 ms. Large drift prevents a reliable speed
  comparison. No extra passes are introduced; no speedup is claimed.

Review: `http://127.0.0.1:6040/bias-study.html`.
Ignored artifacts under `packages/effects/node_modules/.cache/saber-raw/results/`:
`bias-study/ae/`, `bias-measurements.json`, `bias-layer-study.png`,
`bias-checks.json`, `bias-presets-report.json`, `bias-performance.json`.
