# Saber Glow: nonlinear amplification and Halo

Continuation of `2026-11-24-saber-glow-isolation.md`. The measurements below
supersede its additive-composition and uncalibrated Halo-source hypotheses.

## Reproduction

- Installed After Effects 2025 / VideoCopilot Saber; white straight core,
  512×512, 16 bpc, no working space, linear blending off. Distortion/flicker
  disabled except in named distortion cases. Output Brightness usually 0.01
  prevents clipping; comparisons exclude the core and quantized far field.
- `packages/effects/test/browser/ae-saber-glow-transfer.jsx` exports 231 cases
  in batches of 24. A single large queue initially stopped after one item;
  the final script checks every item's DONE status, restores existing queue
  flags/project depth and removes only its own project items. Final run: DONE
  231, all frames present. The script assumes the installed `_HIDDEN X-Factor 16`
  template. The first export's vector log formatting was malformed; scalar
  controls and frames were valid. Explicit string conversion fixes future logs.
- Analyze with `uv run --with pypng --with numpy
  packages/effects/test/browser/analyze-saber-glow-transfer.py
  /private/tmp/vfx-js-saber-glow-transfer`.
- Probe gains 0.1–4; matched products of overall/layer input gains; Pre Gamma
  0.5/1/2; output Brightness/Gamma; Halo size/intensity; Layer 1/4 distortion.
  Hold out radii 8/32/64 and gains 0.25/0.75/1.5/3 for profile validation.
- A separate controlled 12-case 32-bpc run produced nearly identical 16-bit
  PNGs to matched 16-bpc cases. The earlier apparent bit-depth discrepancy was
  confounded; it is not evidence of a different transfer at 32 bpc.

## Findings

### Input gain, Pre Gamma, amplification

Equal products of Glow Intensity, Glow Intensity Multiplier and individual
layer intensity produce identical images. Those gains precede Pre Gamma.
The measured transfer is approximated by:

```
x = pow(blur * inputGain * layerIntensity * biasWeight, preGamma)
f(x) = x * (0.34 + x * (0.18 + 0.48*x))
layer1 = (x + f(x)) / 2
layer2, layer3, layer4 = f(x)
```

This cubic is an empirical approximation, not recovered proprietary source.
At x=260, the least-squares coefficients (constant through cubic, with output
Brightness divided out) are approximately:

| Layer | Constant | Linear | Quadratic | Cubic |
| --- | ---: | ---: | ---: | ---: |
| 1 | -0.00460 | 0.66820 | 0.08704 | 0.23748 |
| 2 | -0.00253 | 0.33750 | 0.17954 | 0.46789 |

The small offset includes the quantized floor; the shader keeps zero exactly
zero. Inputs/results are bounded before/after amplification to avoid overflow.
Output Brightness is after amplification. White Glow Color values 0.25/0.5/1
are normalized to the same output by AE; colored-light calibration is still
outside this change.

### Grade layers, then Screen

Combined outputs follow `a + b - a*b`, not addition. Using measured isolated
layers to predict the pair at gain 2 / Brightness 0.01 gives normalized row
RMSE **0.0003031 for addition, 0.00001052 for Screen**. At the weakest gain,
quantization dominates and does not discriminate the models.

Separate output-grade probes also support grading each layer before Screen.
This explains the previous additive model's residual; it was not solely
nonlinear input gain. Core is Screen-combined with the three graded glow layers.

### Layer 4 is Halo

- `radius4 = layer4.size * glowSizeMultiplier * haloSize / 100`.
- Layer 4 input includes `haloIntensity / 100`.
- Equal HaloSize × Layer4Size products give identical profiles/images.
- Equal HaloIntensity × input-gain products give identical images.
- Layers 1–3 are unchanged by Halo controls. With Layer 4 disabled, changing
  Halo Intensity creates no independent extra light.
- Distortion Amount 0→50, types 1 and 3: Layer 1 changes substantially;
  **Layer 4's full image changes by exactly zero**.
- Halo has an extra Brightness multiplier and is bounded before combining
  under the core. Outside a white core, the approximation is
  `pow(B * min(B * layer4, 1), outputGamma)`.
  At x260 and Gamma=1, Brightness 0.1/0.5/1 yields
  0.009918 / 0.246006 / 0.982605, supporting B squared below clipping.

Implementation packs the four independent responses in RGBA. Glow distortion
and flow affect RGB; alpha carries untouched Halo energy. The final pass
performs the per-layer grades and Screen. The former independent Halo blur
and resources are removed; no new pass is introduced.

## Compatibility

Halo Size/Intensity now use percentages, neutral **100**, rather than CSS px
and an independent light gain. `glow` moves before Pre Gamma/amplification.
Layer 4 remains protected even with `glowDistortAllLayers: true`.

Preset values use common mechanical conversions, with no individual visual fit:

```
newGlow = oldGlow ** (1 / preGamma)
newLayerIntensity = oldLayerIntensity * slope ** (-1 / preGamma)
slopes = [0.67, 0.34, 0.34, 0.34 * brightness]
haloSize = haloIntensity = 100
```

The slope conversion preserves weak-signal units only. Strong highlights,
Screen overlap and removal of the old independent Halo change the looks.
At t=2, RGB sums relative to this turn's frozen baseline: Fire +33.5%, Fog
+8.8%, Torch +21.2%, Wormhole +10.7%, Windy -1.2%; Unstable +119.4%.
These are image-energy diagnostics, not perceptual or AE-parity scores.
Core extraction/distortion geometry is unchanged; final light composition changes.

## Verification

- 34 Node tests pass; ESM/CJS TypeScript builds pass.
- Docs checks: all 118 exports covered; API type/link checks pass.
- Eight modified TS/MJS files pass Biome using an isolated copy of root rules;
  workspace invocation cannot resolve the pre-existing nested config extends.
- GPU at DPR 1/2: output-grade, all-preset live-vs-fresh, zero Halo, matched
  Halo size/gain, protected Halo motion, nonlinear amplification and bounded
  extreme HDR checks pass. Halo brightness follows B squared. Screen error
  is about 0.63 display LSB versus 17 LSB for addition. Fused/intermediate
  Halo paths differ by at most one display LSB.
- Raw production GPU transfer profiles, with one shared input gain 50,
  compared against held-out AE radii/gains. Output grading is evaluated
  analytically for these profile comparisons, not captured from final pixels.
  Mean normalized RMSE for Layers 1/2/4: 0.002109 / 0.004051 / 0.00003503.
  A single-calibration linear baseline yields 0.007685 / 0.013051 / 0.002497.
  Weak Halo profiles can have >80% relative error despite <0.00001 absolute
  RMSE: they are at the 16-bit quantization floor. No exact parity is claimed.
- All 19 presets × 3 times captured, with zero WebGL errors. Motion recipes
  were not tuned. Screenshots expose the remaining brightness changes.
- Fire 960×540 / DPR 1 / pad 320, ABBA, 60 samples per run:
  GPU medians before 3.12/2.18 ms, after 1.68/2.96 ms; CPU 0.2–0.3 ms.
  Variation prevents a reliable speed claim. Pass count does not increase.

Review: `http://127.0.0.1:6040/transfer-study.html`.
Ignored evidence in `packages/effects/node_modules/.cache/saber-raw/results/`:
`transfer-study/ae/`, `transfer-study/experiments/`, `transfer-study.png`,
`transfer-final-checks.json`, `transfer-gpu-profiles.json`,
`transfer-comparison.json`, `transfer-presets-report.json`,
`transfer-performance.json`. Frozen renderers are `transfer-baseline/` and
`transfer-study/` under the comparison root. AE kernel, exact Bias transfer,
colored-light behavior and noise remain approximate.


## Follow-up: visible round Halo boundary

The weak-signal compensation above was inappropriate for Layer 4. It boosted
its inputs 5.0× / 18.9× / 6.8× in Arc Reactor / Burning / Tractor Beam.
Combined with the nonlinear response and Halo cap, this created a large flat
colored disk. Finite-value tests and total image energy missed the artifact.

Additional AE probes: 12 white/blue/orange Halo-only cases, multiplier
100/200/400/800, output Brightness 0.5. AE also has a saturated plateau; simply
softening or moving the clamp would contradict those measurements. Its colored
response differs from our tint multiplication and remains uncalibrated.
The correction retains the measured renderer and removes only Layer 4's
weak-signal compensation in all recipes. No per-preset visual fit. Input gains
now retain the pre-compensation values; Layers 1–3 and core are unchanged.

On the AE-exported source at t=2, saturated Halo pixels before→after:
Arc Reactor 76,827→0; Burning 106,409→0; Tractor Beam 198,615→0. Their peak
pre-clamp signals become 0.449 / 0.311 / 0.458 (cap=1). Whole-preset screenshots
confirm the round boundary is gone. Custom high gains can still saturate, as
in AE. This correction makes the previous preset brightness-delta table
historical; do not use it as a measurement of the corrected recipes.

Review: `http://127.0.0.1:6040/halo-boundary.html`. Additional AE source script,
12 exports, profiles, before/after images and regression results are retained
in the ignored `results/halo-boundary/` directory of the comparison cache.


## Audit after the AE/current preset comparison

Removed the seven original recipes (`neon`, `plasma`, `ice`, `toxic`,
`spectral`, `laser`, `unstable`); retain eleven AE-inspired recipes and the
Burning alias `embers`. Neutral diagnostics now specify their settings without
a public preset. Remaining recipe values and renderer behavior are unchanged
in this removal. The review page is regenerated with twelve names.

The current full-preset output is worse in important respects despite passing
isolated transfer/finite-value checks. At t=2, 960×540, raw PNG RGB normalized
to 0..1, white means all three channels >0.9:

| Measurement | AE original | Before transfer change | Current, after Halo fix |
| --- | ---: | ---: | ---: |
| Arc Reactor white pixels | 10,230 | 10,692 | 17,595 |
| Tractor Beam upper/lower RGB sum | 266,011 | 212,684 | 94,237 |

Upper/lower means rows y<180 or y>=360, not a semantic segmentation. These
numbers confirm visible clipping/spread regressions, not an overall quality score.
Source files are `ae/<preset>-raw/024.png`,
`results/transfer-presets/<preset>-before.png`, and
`results/preset-review/<preset>/024.png` under the review cache.

Priority diagnosis:

1. **Layer roles and input units were never reconciled.** The original AE
   settings TSVs give Layer 4 Size=3 for Arc Reactor, Fog and Tractor Beam;
   their broad emission is in earlier layers. Our hand-authored fourth layers
   use 65/20/120 CSS px. Raw numbers have different units, but the roles also
   differ: moving our broad fourth layer to an undistorted Halo, then reducing
   its gain, removed moving haze. Eliminating a flat disk did not restore AE
   parity. Reconcile layer roles/radii and input normalization before more
   global transfer changes. A simple slot reorder is insufficient because
   the first layer has a different nonlinear response.
2. **Old recipe compensation is still applied to the new renderer.** Fog's AE
   Pre Gamma=1; ours=2.02791896 from migrating the old contrast Bias. Its broad
   first layer has input gain243.666. Raising the blurred light to this power
   and then amplifying nonlinearly favors the dense center over separated
   letter contours. This is a likely cause of the changed spatial distribution,
   not a claim that changing one number alone restores AE Fog.
3. **Colored HDR response remains uncalibrated.** White-line fits and Screen
   invariants do not establish the same color/white shoulder at high gain or
   overlapping contours. Layers 1–3 also retain weak-signal compensation; it
   can overdrive brighter input. Arc Reactor's clipping worsened even though
   core extraction itself was unchanged.
4. **Core and noise were independently approximated.** Core coverage after
   distortion, strand density, Fluid/Smoke/Energy fields, spatial frequencies,
   evolution and layer/scale-dependent transport still need controlled tests.
   A still frame cannot verify matching motion.

The next rendering work should calibrate actual AE layer assignments and radius/
input units on lines plus text/multiple contours, then color/gain response,
then core/noise. Validate the full native-preset matrix at each step.
Do not report an isolated transfer test as evidence of preset equivalence.
