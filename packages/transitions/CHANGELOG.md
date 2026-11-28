# @vfx-js/transitions

## 0.1.3

### Patch Changes

- 70c5b2a: Require the `@vfx-js/core` version they are released with (`^<version>`, as the framework bindings do) instead of `>=1.6.0`. `@vfx-js/effects` uses `ctx.readPixels`, which `@vfx-js/core` 1.6.0 does not have.
- Updated dependencies [2e95bdb]
- Updated dependencies [2a81073]
- Updated dependencies [83b6e1a]
- Updated dependencies [2049065]
- Updated dependencies [88509bc]
- Updated dependencies
- Updated dependencies [70c5b2a]
- Updated dependencies [258a088]
  - @vfx-js/effects@1.5.0

## 0.1.2

### Patch Changes

- Require `@vfx-js/core` >=1.6.0, which passes premultiplied `ctx.src`.
- 7397ab1: Shrink bundles.
  Build to ES2022 so private fields stay native.
  Mark effects and transitions as side-effect free so bundlers drop unused presets.
- Updated dependencies [7397ab1]
- Updated dependencies [7e72991]
  - @vfx-js/effects@1.4.4

## 0.1.1

### Patch Changes

- 713dac9: Add `.js` to relative imports so Node can load the ESM build without a bundler.
- Updated dependencies [713dac9]
  - @vfx-js/effects@1.4.3

## 0.1.0

### Minor Changes

- 3b9589a: **Experimental.** The transition API may change in minor releases.

  New package with transition presets for `addTransition`: shader presets (crossfade, swipe, zoom, glitch, and more), effect-based presets (`datamosh`, `jpegGlitch`, `pixelsort`), and `createGLTransition(entry, params?)` to use a shader from gl-transitions.

  - Presets without `overflow` (and gl-transitions) stay inside the element when the container sets `overflow`.
  - The entry is a `"use client"` module, so a Next.js Server Component can pass presets as props.

### Patch Changes

- Updated dependencies [3b9589a]
  - @vfx-js/effects@1.4.2
