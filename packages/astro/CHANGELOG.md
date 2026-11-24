# @vfx-js/astro

## 0.3.0

### Minor Changes

- f10c035: Support `keepPlaying` in `<VFXTransition>` for React (Next.js, React Router) and Astro.

  - `ctx.keepPlaying(nodes, onReturn)` puts the nodes back when the run ends, for nodes a framework still owns.
  - React: with `keepPlaying`, the old page stays mounted during the run. Each page then sits in a `display: contents` div.
  - Astro: `keepPlaying` works on `<VFXTransition>`, `<TransitionIn>` and link specs. Old islands unmount when the run ends.

### Patch Changes

- Updated dependencies
- Updated dependencies [70c5b2a]
  - @vfx-js/transitions@0.1.3

## 0.2.0

### Minor Changes

- e8f816d: Add `autoReverse` to `addTransition` and every `<VFXTransition>`.
  On back it plays the spec that entered the page, reversed. Forward plays it again.
  It needs the Navigation API.
- 70bd7f4: Back navigation no longer adds `reverse: true`. It plays the same spec as forward, like `@vfx-js/react`.

### Patch Changes

- Updated dependencies [7397ab1]
  - @vfx-js/transitions@0.1.2

## 0.1.0

### Minor Changes

- 713dac9: New package: shader page transitions and element effects for Astro. `<VFXTransition>` and `<TransitionIn>` for ClientRouter, `VFXImg` / `VFXVideo` / `VFXSpan` / `VFXDiv` / `VFXP` and the `data-vfx` attribute for effects, and `registerVFX` from `@vfx-js/astro/client`.

### Patch Changes

- Updated dependencies [713dac9]
  - @vfx-js/transitions@0.1.1
