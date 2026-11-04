# Plan: Optional `VFXProvider`

See `spec.md` for the goal and API.

## Decisions

- `useVFX()` reads the instance but does not count as a consumer. Using
  it alone does not create a canvas.
- `useVFXConfig` does not count as a consumer. No elements, no canvas.
- No dev-build check. Warnings print once in all builds. The package has
  no `NODE_ENV` use today, and `process` may not exist in plain ESM use.
- Store defaults are `{}`. Without `useVFXConfig`, the store calls
  `new VFX({})` and core picks every default. Only values passed to
  `useVFXConfig` reach `new VFX`.
- Config compare checks the four fixed keys with `===`, not
  `Object.keys`, so `{}` equals `{ zIndex: undefined }`.
- The Provider `zIndex` TODO stays out of this change.

## New files

### `src/store.ts`

Module-level store for the implicit instance.

- State: `instance`, `appliedConfig`, `refCount`, `configOwners`
  (mount order), `failed`, `flushScheduled`, `listeners`.
- `acquire()` / `release()`, called by elements.
  - `acquire` 0 → 1 schedules a flush.
  - `release` to 0 destroys one frame later (rAF), unless a consumer
    mounted in between.
- `setConfig(owner, opts)` / `clearConfig(owner)`. Owner is a symbol.
  `setConfig` adds a new owner or updates an existing one in place,
  without changing its order.
- `subscribe` / `getSnapshot` for `useSyncExternalStore`.
- `flush()`, batched with `queueMicrotask`:
  - Effective config = last owner's opts, or `{}`.
  - If `refCount > 0` and (no instance and not `failed`, or effective
    config differs from applied): create or replace.
  - Replace: `stop()` + `destroy()` the old one, `new VFX`, notify.
  - `VFX.init()` returns `null`: `failed = true`; no retry.
- StrictMode unmount → mount and config clear → set run in the same
  tick, so the microtask flush sees no change and does nothing.

### `src/use-vfx-instance.ts`

- `useVFXInstance()` (internal):
  - Reads `VFXProviderMarker`, `VFXContext`, and the store through
    `useSyncExternalStore` (server snapshot `null`).
  - Effect: outside a Provider, `acquire()`; cleanup `release()`.
  - Returns the Provider's value inside a Provider, else the store's.
  - Takes `{ acquire: false }` for `useVFX()`.
- `useVFXConfig(opts)`:
  - Under a Provider: warn once, do nothing.
  - Effect deps `[pixelRatio, zIndex, autoplay, postEffect]`. Mount →
    `setConfig`, unmount → `clearConfig`.
  - More than one owner: warn once.

## Changes

- `context.ts`: add internal `VFXProviderMarker = createContext(false)`.
  Not exported from the package.
- `provider.tsx`: wrap children in `VFXProviderMarker.Provider value`.
- `element.tsx`, `image.tsx`, `video.tsx`, `canvas.tsx`: use
  `useVFXInstance()` in place of `useContext(VFXContext)`.
- `hooks.ts`: use `useVFXInstance({ acquire: false })`; memo the result.
- `react.ts`: export `useVFXConfig` and `VFXConfig`.

## Tests

- devDeps: `happy-dom`, `react`, `react-dom`. Use `react-dom/client` and
  `act`, no testing-library.
- `src/implicit.test.tsx` with `// @vitest-environment happy-dom`.
  `lifecycle.test.ts` stays in node.
- `vi.mock("@vfx-js/core")` swaps `VFX` for a spy class and keeps the
  rest.
- Reset the store per test with `vi.resetModules()` and dynamic import.
- Cases: the eight listed in `spec.md`.

## Docs and others

- `packages/react/README.md`, `packages/react-vfx/README.md`: examples
  without Provider; `useVFXConfig` section; Provider section for
  `wrapper` and several instances, noting two canvases.
- `packages/docs-react` (`App.tsx`, `UsageSection.tsx`): use
  `useVFXConfig({ pixelRatio: 1 })`.
- Storybook: one story without Provider.
- Changeset: minor for `@vfx-js/react`.

## Commits

1. Store, hooks, tests.
2. Switch the consumers to `useVFXInstance()`; add the marker to Provider.
3. Docs, story, changeset.
