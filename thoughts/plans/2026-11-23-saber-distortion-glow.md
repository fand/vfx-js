# Saber distortion and layered glow

## Scope

Prototype the independently controlled Core/Glow Distortion and layered Glow
Settings observed in Video Copilot Saber. These are WebGL approximations, not
an implementation of its proprietary renderer or compatible AE parameter units.

## Implementation

1. Add independent `coreDistortion` and `glowDistortion` groups. Support Fluid,
   Smoke and Energy noise, distortion/multiply composition, invert, wind speed
   and direction, noise speed/scale/bias/complexity/aspect ratio, and seed.
   Amount zero bypasses the extra pass. Use element-local CSS coordinates.
2. Render the existing lines, distort the core, generate glow from that core,
   then distort glow separately. Glow-only changes must leave the core intact.
3. Add an opt-in `layers` glow mode with four independent size/intensity pairs.
   Share a downsample chain and blur each layer at a suitable resolution.
   Add Spread, Bias, size/intensity multipliers, and Pre Gamma. Radius must not
   depend on `pad`; insufficient padding may still clip the result. Preserve
   the existing pyramid mode and its defaults.
4. Deep-copy nested defaults and merge partial distortion updates. Export and
   document all public option types. Add Storybook controls and examples for
   glow-only distortion, core-only distortion, and four-layer glow.
5. Build and lint changed packages; regenerate/check API docs. Verify real GLSL
   rendering and independent controls in a browser, including zero settings,
   live changes, pixel ratios, resizing, and disposal. Add focused regression
   coverage where it protects parameter independence or resource lifecycle.

## Out of scope

Path input, endpoint controls, flicker redesign, motion blur, masks, and complete
AE preset parity.

## Validation results

- Effects ESM/CJS build and effects/Storybook lint passed.
- Four Node regression tests passed (`pnpm --filter @vfx-js/effects test`).
- TypeDoc generation and `pnpm --filter docs test` passed.
- Browser pixels: glow controls leave the isolated core byte-identical; each
  layer contributes; zero spread/all-zero intensities match core-only output.
  All noise types, multiply/invert, frozen/evolving clocks, mode switches and
  resizing rendered successfully. DPR 1 and 2 produced nonempty output.
- Changing pad 200 to 280 gave mean absolute RGBA difference 0.000635/255
  in the fixed-canvas fixture (small resampling differences, no radius change).
- Context restoration reproduced the same frame. The core framebuffer restore
  path logged stale-object deletion warnings; not addressed in this prototype.
- Whole-Storybook `tsc --noEmit` remains blocked by CSS module and React type
  declarations, including unchanged stories. No new Saber option type errors.

## Glow appearance refinement

- Pack narrow and wide light separately in the existing layer-sum target.
  Distort narrow light while preserving the soft halo, fading the deformable
  share by effective radius relative to noise scale, independent of layer order.
- Use broad wind-aligned fluid/smoke flow with localized finer noise and a small
  stationary contribution to keep the glow attached. Core noise stays unchanged.
- Effects build/lint and five regression tests pass. Browser pixel checks:
  far-only glow is byte-identical with distortion enabled; frozen clocks are
  byte-identical across times; moving clocks change pixels; WebGL error is zero.
- Visually checked the orange Glow Distortion story: localized upward tongues
  with smooth outer light, replacing the full-halo marble pattern. This remains
  an approximation, not AE algorithm parity.
