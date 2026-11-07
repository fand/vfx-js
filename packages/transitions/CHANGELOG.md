# @vfx-js/transitions

## 0.1.0

### Minor Changes

- 3b9589a: **Experimental.** The transition API may change in minor releases.

  New package with transition presets for `addTransition`: shader presets (crossfade, swipe, zoom, glitch, and more), effect-based presets (`datamosh`, `jpegGlitch`, `pixelsort`), and `createGLTransition(entry, params?)` to use a shader from gl-transitions.

  - Presets without `overflow` (and gl-transitions) stay inside the element when the container sets `overflow`.
  - The entry is a `"use client"` module, so a Next.js Server Component can pass presets as props.

### Patch Changes

- Updated dependencies [3b9589a]
  - @vfx-js/effects@1.4.2
