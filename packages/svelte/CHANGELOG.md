# @vfx-js/svelte

## 0.3.0

### Minor Changes

- e8f816d: Add `autoReverse` to `addTransition` and every `<VFXTransition>`.
  On back it plays the spec that entered the page, reversed. Forward plays it again.
  It needs the Navigation API.
- 70bd7f4: Back navigation no longer adds `reverse: true`. It plays the same spec as forward, like `@vfx-js/react`.

## 0.2.0

### Minor Changes

- 5019a24: Move `@vfx-js/core` to `peerDependencies`, so apps load only one copy of core.
  Install `@vfx-js/core` with the binding: `npm i @vfx-js/core @vfx-js/svelte`.

## 0.1.0

### Minor Changes

- 7990d89: New package: shader page transitions for Svelte 5 and SvelteKit. `<VFXTransition>` from `@vfx-js/svelte/sveltekit`, with `transition(spec)`, `setNextTransition(spec)` and `transitionIn(spec)`.
- 7990d89: Add element effects: the `vfx(props)` attachment puts a shader on any element, and `updateElement(el)` re-captures its texture. Pass a getter to apply changes without re-running the attachment. `<VFXCanvas>` renders its children into a shader, with html-in-canvas where the browser has it and dom-to-canvas otherwise. `vfxConfig(config)` sets the options of the shared VFX (`pixelRatio`, `zIndex`, `postEffect`, `autoplay`). `vfxInstance()` gives the shared VFX, so `autoplay: false` can drive frames.
