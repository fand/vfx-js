# AE-inspired combustion

1. Preserve existing default rendering and freeze the current renderer for comparison.
2. Add opt-in fine noise detail, independent halo radius/gain and an original-core
   overlay. Reuse blur infrastructure; cache static halo and compile optional
   composition features out of the default shader.
3. Match Fire to AE Fire's Fluid core + Energy/multiply glow; match Embers to
   AE Burning's Fluid core + Fluid/multiply glow with a retained outline.
4. Tune against actual AE captures using identical source geometry and times.
   Keep global flicker off; combustion motion should be spatial.
5. Check default compatibility, halo independence/cache/disposal, both glow
   modes, preset switching, DPR and GPU errors. Build, lint and update API docs.
6. Measure incremental rendering cost, and deliver before/after/AE visuals.

## Implemented

- `haloIntensity`/`haloSize`, disabled by default; reuse Gaussian mip blurs and
  reconstruct directly in final composition, avoiding a full-size halo sum pass.
- `coreBlendOnTop`, disabled by default; preserve the original outline visually
  without changing the distorted source used for glow/halo.
- `noiseDetail`, default 0; opt-in fine turbulence, local multiply contrast and
  wind-aligned energy strands. Up to eight footprint-filtered noise octaves.
- Fire uses Fluid core + Energy/multiply glow. Embers uses Fluid core +
  Fluid/multiply glow with retained outline. Both have global flicker disabled.
- Default shader excludes optional halo/overlay samplers through compile-time
  variants. No additional passes when these controls are disabled.
- Detailed Core distortion skips empty derivative quads beyond the contour's
  maximum displaced support. The default detail-zero path remains unchanged.

## Validation

- 24 effects tests passed, including halo caching, invalidation and disposal.
- GPU diagnostics: DPR 1/2, both glow modes, three distortion types at default
  detail produce exactly the same pixels as the pre-change renderer.
- Halo independence, deterministic animation and resource cleanup passed.
- All ten presets match fresh instances after live switching; appearance,
  softness and source-isolation checks passed.
- Visual reference: the real AE renders recorded in the preceding combustion
  investigation, with identical source geometry and 24 times from 2–3.9167 s.
  This approximates the reference appearance, not AE's private noise algorithm.
- Empty-space optimization matches the unbounded shader exactly across 30
  frames: both presets plus large, multi-line Fluid/Energy/Smoke deformation,
  at DPR 1/2. No WebGL errors.
- ESM/CJS, effects lint, Storybook build and docs API/skill checks passed.
  Storybook Fire/Embers switching and new Halo controls checked visually.

## Cost and remaining differences

- At the 960 x 540 reference fixture, animated Fire uses 20 draws versus 2 in
  the previous preset; Embers uses 21 versus 17. Animated Core now invalidates
  downstream glow blurs each frame. This is a real cost increase, especially
  for Fire; the old preset's static-core caching cannot be retained unchanged.
- Halo reconstruction shares the final composite and avoids a separate
  full-resolution summation pass. Empty-space culling avoids unnecessary Core
  noise work; no speedup percentage is claimed because repeated GPU timings
  varied substantially with the local measurement environment.
- Fire is finer and more filamentary than AE Fire's broad flame pockets.
  Embers approximates AE Burning's bright outline and moving warm fringe.
  AE's private procedural noise and color pipeline are not reproduced exactly.
- Before/after/reference animation and raw validation/timing evidence:
  `/Users/amagi/.codex/visualizations/2026/11/23/01a20783-0a8f-7b73-be3b-6e38ec7e2c4d/saber-combustion/`.

## Follow-up: broader Fire

- Enlarged Core noise scale 55 -> 110 and Glow scale 32 -> 90; reduced detail
  and slowed noise evolution to 0.45. Lowered near-core glow/halo brightness
  to keep broad flames from washing out the contour.
- Core octaves 5 -> 4, Glow octaves 5 -> 3. No shader or extra pass changes.
- Same-context ABBA GPU comparison, 960 x 540, DPR 1, 120 samples per run:
  previous medians 2.124/2.127 ms; broader Fire 2.261/2.165 ms. Both 20 draws
  and 95,120,160 tracked texture bytes. Comparable local cost, not a guaranteed
  speedup. Wider features keep some coarse octaves active for more pixels.
- 24 tests and DPR 1/2 combustion/appearance checks passed. Laser frames at
  times 2 and 8 have zero pixel difference: it is intentionally a steady
  appearance preset, with reveal controlled separately by start/end.
- Updated visuals and raw evidence are in the sibling `saber-fire-broad/`
  artifact directory. Fire remains an approximation of the AE reference.

## Follow-up: fractal density instead of flame ribs

- The broad-noise preset still exposed the zero contours of the Energy field:
  applying `1 - 2 * sqrt(abs(fBm))` after summation produced coherent ridges.
  Increasing wavelength enlarged those ridges rather than creating flame volume.
- For Energy/multiply Glow, noiseDetail now blends that ridge mapping toward
  signed fBm density. Fine octave weights decay by 0.5; seven octaves preserve
  detail without overwhelming the coarse envelope. Density stretches by 0.65
  along transport, instead of the displacement strand stretch of 0.15.
- Fire uses seven Core/Glow octaves, a more broken Core, and warm fractal pockets.
  Default detail-zero rendering and the other nine presets remain pixel-identical.
- Multiply now skips the unused second fBm field. No extra passes or targets:
  20 draws and 95,120,160 tracked texture bytes in the 960 x 540 DPR 1 fixture.
- Same-context interleaved GPU medians: previous 4.353/3.459 ms, new 3.691/4.493
  ms (120 samples per run). Similar local range; measurement variation prevents
  a reliable speedup claim. Separate-context measurements are also retained.
- 24 effects tests, DPR 1/2 combustion and appearance checks, 24 default-mode
  compatibility comparisons (both composites), CJS/ESM, lint, Storybook and
  docs checks passed. Actual 24-frame AE/source comparison and raw evidence:
  sibling artifact directory `saber-noise/`.
- This removes the regular wavy-rib appearance. AE still differs in Core
  breakup and its broader red/orange glow; this is not an exact shader replica.

## Follow-up: three configurable octaves and gentler falloff

- Fire now defaults to three Core and three Glow octaves as requested.
  Existing `noiseComplexity` controls remain independent integers 1..8; both
  demo bindings now explicitly say `Noise octaves`.
- Reduced Glow gain 2.2 -> 1.4; rebalanced the four layers to radii 3/14/42/96
  and gains .4/.16/.2/.07. Lower peak noise light with a broader faint envelope.
- Verified live 1/3/8 octave changes independently at DPR 1/2, exact restoration
  to the 3-octave image, and zero GL errors. UI 5/2 edits and restoration checked.
- 24 tests, CJS/ESM, changed-file lint and Storybook build passed. The reference
  fixture remains 20 draws; tracked texture bytes 95,120,160 -> 94,344,480.
  GPU timings were variable, so no speedup ratio is claimed.
- Updated 24-frame comparison and raw checks: sibling `saber-falloff/` artifacts.
