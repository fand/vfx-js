# Progress: Optional `VFXProvider`

## Done

- `ad383842` Spec and plan. The spec no longer says "Dev builds" for warnings.
- `dd1a539e` Implementation.
  - `src/store.ts`: one implicit instance for the page.
    - Creating and replacing the instance wait one microtask.
    - The instance is destroyed one frame after the last unmount.
  - `src/use-vfx-instance.ts`: `useVFXInstance()` (internal) and `useVFXConfig()`.
  - `VFXImg`, `VFXVideo`, `VFXCanvas` and the `VFXElementFactory` elements use `useVFXInstance()`.
  - `useVFX()` reads the instance without counting as a consumer. It returns a memoized object.
  - `VFXProvider` sets the internal `VFXProviderMarker` context.
  - Tests in `src/implicit.test.ts` use happy-dom with `VFX` mocked. They cover the 8 spec cases, plus:
    - `{}` equals `{ zIndex: undefined }`.
    - `useVFX` alone does not create an instance.
- `201e579b` Docs.
  - Updated the react and react-vfx READMEs.
  - docs-react uses `useVFXConfig({ pixelRatio: 1 })`.
  - Added the "Effect/React › No Provider" story.
  - Added a minor changeset for `@vfx-js/react`.

## Checked

- react: 22 tests pass. Typecheck and lint pass.
- storybook typechecks. This needs a react build first.
- docs-react `vite build` passes.

## Not checked

- No check in a real browser yet: the request to start the preview server was denied. Next, check the "No Provider" story and docs-react.
  - Only one canvas exists.
  - The canvas goes away after a route change or unmount.

## Changes from the plan

- I merged plan commits 1 and 2. The tests render the real components, so they fail until the consumers switch over.
- `useVFXConfig` uses a fixed id per component. An option change updates that call in place, so mount order stays correct.
- The destroy callback checks the consumer count; there is no cancel.

## Fixed along the way

- `f283942c` Fixed the docs-react lint errors and added a `lint` script.
  - Changed tsconfig `jsx` to `react-jsx` to match Vite.
- `d358380d` Stopped building test files into `lib/` (core, react, react-vfx).
  - The builds use `tsconfig.build.json`.
  - `lint` type-checks the tests with `tsc --noEmit`.

## Review fixes

- `VFXProvider` now passes `zIndex` to `new VFX`. `VFXProviderProps` extends `VFXConfig`.
- The "more than one `useVFXConfig`" warning fires only when the options differ.
  Exit animations and islands mount the same config twice; that is fine.
- Changeset notes the behavior change for components outside any Provider.
- `store.ts` uses `VFX.init()`; `failed` is never reset.
- Inside a Provider, `useVFXInstance` does not subscribe to the implicit store.

## Next

- Check in a real browser (see above).
- Open the PR.
- After merge: rebase `feat/transition` and switch `VFXTransition` and `useVFXTransition` to `useVFXInstance()`. Remove the Provider from the transition demos and `docs/TRANSITION.md`.
