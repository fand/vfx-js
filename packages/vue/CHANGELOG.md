# @vfx-js/vue

## 0.4.0

### Minor Changes

- f10c035: Support `keepPlaying` in `<VFXTransition>` for Nuxt and SvelteKit.

  - Nuxt: gives `<NuxtPage>` a page transition that hands the leaving page to core.
  - SvelteKit: wraps pages in `{#key}` on the pathname, and the leaving page's outro lasts until core gives it back.

- 1c1f9e8: Support `keepPlaying` in `<VFXTransition>` from `@vfx-js/vue/router`.

  - It renders the `<RouterView>` page in a `<Transition>` keyed by path, and the leaving page stays until core gives it back.
  - `<RouterView>` must be a direct child. A `<RouterView v-slot>` works if the slot renders one root node.

## 0.3.0

### Minor Changes

- e8f816d: Add `autoReverse` to `addTransition` and every `<VFXTransition>`.
  On back it plays the spec that entered the page, reversed. Forward plays it again.
  It needs the Navigation API.
- 70bd7f4: Back navigation no longer adds `reverse: true`. It plays the same spec as forward, like `@vfx-js/react`.

### Patch Changes

- e6bc656: Fix `v-transition` on `<NuxtLink>`: the link spec was dropped, since NuxtLink prevents the click before the directive saw it.

## 0.2.0

### Minor Changes

- 5019a24: Move `@vfx-js/core` to `peerDependencies`, so apps load only one copy of core.
  Install `@vfx-js/core` with the binding: `npm i @vfx-js/core @vfx-js/vue`.

## 0.1.0

### Minor Changes

- 7990d89: New package: shader page transitions for Vue and Nuxt. `<VFXTransition>` from `@vfx-js/vue/nuxt` (Nuxt) or `@vfx-js/vue/router` (Vue Router), with `transition(spec)`, `setNextTransition(spec)` and `useTransitionIn(spec)`.
- 7990d89: Add element effects: the `v-vfx` directive (`vVfx`) puts a shader on any element, and `updateElement(el)` re-captures its texture. `<VFXCanvas>` renders its children into a shader, with html-in-canvas where the browser has it and dom-to-canvas otherwise. `useVFXConfig(config)` sets the options of the shared VFX (`pixelRatio`, `zIndex`, `postEffect`, `autoplay`). `useVFXInstance()` gives the shared VFX, so `autoplay: false` can drive frames.
