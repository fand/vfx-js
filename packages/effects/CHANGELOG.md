# @vfx-js/effects

## 1.4.0

### Minor Changes

- 3acbda6: Add heal params to `DatamoshEffect` so the mosh can heal block by
  block like a real codec: `healRate` (random refresh chance per block per
  frame) and `healThreshold` (refresh blocks with bad motion matches).
- Add ctx.clear() / Add Datamosh heal params

### Patch Changes

- 948860f: Add `ctx.clear(target)` to zero a render target with a fast GPU clear instead
  of a full-screen draw. Clears both sides of a ping-pong (`persistent: true`)
  RT, and scissors to the stage viewport when clearing the stage output.

  Particle, particle-explode, and fluid effects now use it for their per-frame
  accumulation / trail / pressure-init clears, cutting GPU bandwidth.

## 1.3.0

### Minor Changes

- Add new effect: SliceShiftEffect, PixelStretchEffect, WarpEffect, DitherEffect, TilePixelateEffect, PatternRefractionEffect, ColoredEdgesEffects

## 1.2.0

### Minor Changes

- Add effect: BadJpegEffect

## 1.1.0

### Minor Changes

- Add effects: Datamosh, Pixelsort, JPEGGlitch
- Add effects: Datamosh, Pixelsort, JPEGGlitch

## 1.0.0

### Major Changes

- VFX-JS v1: new Effect API

### Patch Changes

- Updated dependencies
  - @vfx-js/core@1.0.0
