# Optional `VFXProvider`

## Goal

`@vfx-js/react` works without `<VFXProvider>`. Components without a
Provider share one implicit `VFX` instance. `useVFXConfig(opts)` sets the
options of that instance. `<VFXProvider>` stays for the cases that need
their own instance, like a `wrapper` or several instances on one page.

```tsx
// Before
<VFXProvider pixelRatio={1}>
    <App />
</VFXProvider>

// After
function App() {
    useVFXConfig({ pixelRatio: 1 }); // optional
    return <VFXImg src="cat.png" shader="rgbShift" />;
}
```

## Current state (main)

- `VFXProvider` creates `new VFX(opts)` in an effect and passes it down
  through `VFXContext`. A new instance is made when an option changes.
- Seven places read `useContext(VFXContext)`: `element.tsx`,
  `image.tsx`, `video.tsx`, `canvas.tsx`, `hooks.ts`, and on
  `feat/transition` also `VFXTransition.tsx` and `useVFXTransition.ts`.
  Each one does nothing while the value is `null`.
- `useVFX()` returns `{ rerenderElement }`, a new object each render.
- `wrapper` only picks the canvas's parent, to stop the canvas from
  overflowing the page. The canvas is still sized and placed by the
  viewport and `window.scroll`. It is not a way to limit drawing to one
  section. That is a separate feature and out of scope here.

## API

### `useVFXInstance()` (internal)

Returns the `VFX` to use, or `null` while none is ready.

- Inside a Provider: the Provider's instance (or `null` while it is
  being created, or when WebGL is unavailable).
- Outside a Provider: the implicit instance.
- Subscribes with `useSyncExternalStore`, so consumers re-render when the
  implicit instance is created or replaced. Their effects depend on the
  instance, so they re-add their elements to a new one, as they do today
  when Provider props change.

All seven consumers switch to it. Not exported.

### `useVFXConfig(opts)`

```ts
function useVFXConfig(opts: VFXConfig): void;

type VFXConfig = {
    pixelRatio?: number;
    zIndex?: number;
    postEffect?: VFXPostEffect | VFXPass[];
    autoplay?: boolean;
};
```

- Sets the options of the implicit instance while the component is
  mounted. On unmount the options go back to the defaults.
- Takes no `wrapper`. A wrapper means a separate instance, so it goes
  through the Provider.
- A change in options replaces the instance, like a Provider prop
  change. Options are compared by value for numbers and booleans, by
  reference for `postEffect`. Callers should memo `postEffect`.
- Two mounted `useVFXConfig` calls: the last one mounted wins. It
  warns once if their options differ.
- Under a Provider: does nothing. It warns once.

### `<VFXProvider>`

Unchanged API. Its subtree uses its own instance and never touches the
implicit one. An implicit instance and a Provider instance can exist on
one page; that means two canvases. The docs say so.

### `useVFX()`

Same API. Reads `useVFXInstance()`. Returns a memoized object, so
`rerenderElement` is stable.

### `VFXContext`

Public type stays `Context<VFX | null>`. A separate internal context
marks "inside a Provider", so the two cases (no Provider vs. Provider
still creating) are told apart without a breaking type change.

Reading `useContext(VFXContext)` directly outside a Provider still gives
`null`. The docs point users to the Provider when they need the
instance, e.g. with `autoplay: false`.

## Implicit instance lifecycle

A module-level store holds the instance, the current options and a
reference count of mounted consumers.

- **Create:** when the count goes from 0 to 1. Creation waits for a
  microtask after the commit, so every `useVFXConfig` in the same commit
  is applied first. Effects run child first, so without the wait a child
  element would create the instance before the layout's config arrives.
  - No extra frame: today the Provider already creates the instance in
    an effect and re-renders before children add their elements.
    Elements stay plain DOM until their texture is ready, so there is no
    blank frame.
- **Replace:** when `useVFXConfig` options change. Destroy the old
  instance, create a new one, notify subscribers.
- **Destroy:** when the count goes to 0, one frame later. A mount in
  that frame cancels it. This keeps StrictMode double mounts and route
  swaps from rebuilding the canvas.
- **SSR:** the store is created only in effects, so nothing runs on the
  server. `useSyncExternalStore` gets a server snapshot of `null`.
- **No WebGL:** `new VFX()` throws; the store keeps `null` and does not
  retry until options change. Children render as plain DOM, as today.
- **HMR:** module reload makes a new store. The old instance is
  destroyed by its last consumer's cleanup.

## Tests

The package has no DOM test setup. Add one (jsdom or happy-dom) for
this, with `VFX` mocked.

- No Provider: one instance is created for several elements; it is
  destroyed after the last unmount, one frame later.
- StrictMode: mount, unmount, mount keeps one instance.
- `useVFXConfig` in a parent applies before the first instance is made
  (only one `new VFX` call).
- Changing `useVFXConfig` options replaces the instance and elements
  re-add.
- `useVFXConfig` unmount restores defaults.
- Two `useVFXConfig` calls warn; last mounted wins.
- Under a Provider: elements use the Provider's instance; no implicit
  instance is made; `useVFXConfig` warns and does nothing.
- `new VFX` throwing leaves elements as plain DOM.

## Docs

- `packages/react/README.md`: examples without `<VFXProvider>`; a
  `useVFXConfig` section; a Provider section for `wrapper` and several
  instances.
- `packages/docs-react`: drop the Provider from the usage example; keep
  `pixelRatio={1}` through `useVFXConfig`.
- `packages/react-vfx/README.md`: same as the react README.
- Storybook stories keep their Providers; add one story without it.
- Changeset: minor for `@vfx-js/react`.

## Out of scope

- Limiting the draw area to a wrapper's rect.
- Changing options on a live instance without replacing it.

## After merge

Rebase `feat/transition`. Switch `VFXTransition` and `useVFXTransition`
to `useVFXInstance()`. Drop `VFXProvider` from the transition demos and
`docs/TRANSITION.md`.
