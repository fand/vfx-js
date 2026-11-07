# @vfx-js/vue

## 0.1.0

### Minor Changes

- 7990d89: New package: shader page transitions for Vue and Nuxt. `<VFXTransition>` from `@vfx-js/vue/nuxt` (Nuxt) or `@vfx-js/vue/router` (Vue Router), with `transition(spec)`, `setNextTransition(spec)` and `useTransitionIn(spec)`.
- 7990d89: Add element effects: the `v-vfx` directive (`vVfx`) puts a shader on any element, and `updateElement(el)` re-captures its texture. `<VFXCanvas>` renders its children into a shader, with html-in-canvas where the browser has it and dom-to-canvas otherwise. `useVFXConfig(config)` sets the options of the shared VFX (`pixelRatio`, `zIndex`, `postEffect`, `autoplay`). `useVFXInstance()` gives the shared VFX, so `autoplay: false` can drive frames.
