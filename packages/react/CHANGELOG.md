# react-vfx

## 1.4.0

### Minor Changes

- 5019a24: Move `@vfx-js/core` to `peerDependencies`, so apps load only one copy of core.
  Install `@vfx-js/core` with the binding: `npm i @vfx-js/core @vfx-js/react`.

## 1.3.0

### Minor Changes

- 7990d89: Add `@vfx-js/react/react-router`: a `VFXTransition` for React Router. Use it in place of `<Outlet />`; `pageKey` defaults to the pathname, and the old page keeps its own route while it animates out.

### Patch Changes

- f2634f6: Fix the `VFXCanvas` hydration mismatch with SSR when the browser supports html-in-canvas.

## 1.2.0

### Minor Changes

- 99b198b: `<VFXProvider>` is now optional. Components outside a Provider share one VFX instance. Use the new `useVFXConfig` hook to set its options.

  Note: components rendered outside any Provider used to render as plain DOM. They now create a shared canvas on `document.body`. A page with a Provider and components outside it has two canvases.

  `<VFXProvider zIndex>` now works. It was ignored before.

- 3b9589a: **Experimental.** The transition API may change in minor releases.

  `VFXTransition`, `useVFXTransition`, `transition()`, `setNextTransition()`.

  - `<VFXTransition pageKey>`: a new `pageKey` starts a run and mounts the children fresh. Children can be anything. The target fills the viewport height unless `fullscreen={false}`.
  - `<TransitionIn>` and `useTransitionIn(spec)`: the incoming page sets how it enters. A click spec still wins.
  - `@vfx-js/react/next`: `VFXTransition` for the Next.js App Router. `pageKey` defaults to the pathname. `next` is an optional peer dependency.
  - The package entry is a `"use client"` module, so Server Components can import `<TransitionIn>`.

### Patch Changes

- Updated dependencies [3b9589a]
- Updated dependencies [3b9589a]
  - @vfx-js/core@1.4.0

## 1.1.2

### Patch Changes

- f25d02a: html-in-canvas: support Chrome 159+ (`content="drawable"` + `drawable` child, `paint` event) alongside `layoutsubtree`, and redraw nested canvases at their layout size and position where Chrome draws them at buffer size (156) or clips them to a box at the element's origin (156, 159).
- Updated dependencies [f25d02a]
- Updated dependencies [b82efab]
  - @vfx-js/core@1.3.0

## 1.1.1

### Patch Changes

- Updated dependencies [948860f]
- Updated dependencies
  - @vfx-js/core@1.2.0

## 1.1.0

### Minor Changes

- Effect API improvements

### Patch Changes

- Updated dependencies
  - @vfx-js/core@1.1.0

## 1.0.0

### Major Changes

- VFX-JS v1: new Effect API

### Patch Changes

- Updated dependencies
  - @vfx-js/core@1.0.0

## 0.18.0

### Minor Changes

- Remove Three.js dependency

### Patch Changes

- Updated dependencies
  - @vfx-js/core@0.13.0

## 0.17.0

### Minor Changes

- Improve WebGL error handling

### Patch Changes

- Updated dependencies
  - @vfx-js/core@0.12.0

## 0.16.1

### Patch Changes

- Fix dom-to-canvas bugs
- Updated dependencies
  - @vfx-js/core@0.11.1

## 0.16.0

### Minor Changes

- HTML-in-Canvas experimental support

### Patch Changes

- Updated dependencies
  - @vfx-js/core@0.11.0

## 0.15.1

### Patch Changes

- Fix scroll overflow in Quirks mode
- Updated dependencies
  - @vfx-js/core@0.10.1

## 0.15.0

### Minor Changes

- Improve iOS support

### Patch Changes

- Updated dependencies
  - @vfx-js/core@0.10.0

## 0.14.2

### Patch Changes

- Fix multipass options in element shaders
- Updated dependencies
  - @vfx-js/core@0.9.2

## 0.14.1

### Patch Changes

- fix cyclic texture reference in multipas shader
- Updated dependencies
  - @vfx-js/core@0.9.1

## 0.14.0

### Minor Changes

- Multipass shader support

### Patch Changes

- Updated dependencies
  - @vfx-js/core@0.9.0

## 0.13.0

### Minor Changes

- Posteffect shader etc

### Patch Changes

- Updated dependencies
  - @vfx-js/core@0.8.0

## 0.12.0

### Minor Changes

- Backbuffer support / Scroll sync improvement
- Backbuffer support / Scroll sync improvement

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @vfx-js/core@0.7.0

## 0.11.0

### Minor Changes

- Support WebGL2 shaders

### Patch Changes

- Updated dependencies
  - @vfx-js/core@0.6.0

## 0.10.2

### Patch Changes

- Fix pixelRatio not working
- Updated dependencies
  - @vfx-js/core@0.5.2

## 0.10.1

### Patch Changes

- Fix intersection calculation on VFX.add()
- Updated dependencies
  - @vfx-js/core@0.5.1

## 0.10.0

### Minor Changes

- Add intersection options

### Patch Changes

- Updated dependencies
  - @vfx-js/core@0.5.0

## 0.9.1

### Patch Changes

- Updated dependencies
  - @vfx-js/core@0.4.1

## 0.9.0

### Minor Changes

- Add canvas support etc

### Patch Changes

- Updated dependencies
  - @vfx-js/core@0.4.0

## 0.8.0

### Minor Changes

- Migrate to ESM

### Patch Changes

- Updated dependencies
  - @vfx-js/core@0.3.0

## 0.7.0

### Minor Changes

- Add shaders and fixed minor bugs

### Patch Changes

- Updated dependencies
  - @vfx-js/core@0.2.0

## 0.6.2

### Patch Changes

- Fix initial loading bug
