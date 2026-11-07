# @vfx-js/svelte

## 0.1.0

### Minor Changes

- 7990d89: New package: shader page transitions for Svelte 5 and SvelteKit. `<VFXTransition>` from `@vfx-js/svelte/sveltekit`, with `transition(spec)`, `setNextTransition(spec)` and `transitionIn(spec)`.
- 7990d89: Add element effects: the `vfx(props)` attachment puts a shader on any element, and `updateElement(el)` re-captures its texture. Pass a getter to apply changes without re-running the attachment. `<VFXCanvas>` renders its children into a shader, with html-in-canvas where the browser has it and dom-to-canvas otherwise. `vfxConfig(config)` sets the options of the shared VFX (`pixelRatio`, `zIndex`, `postEffect`, `autoplay`). `vfxInstance()` gives the shared VFX, so `autoplay: false` can drive frames.
