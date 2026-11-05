# Page-declared transitions for React

Let the incoming page say how it enters. The container owns the target
`<div>`, and the page swap is driven by a `pageKey` prop instead of a
keyed child. Branch `feat/transition`. Context: [plan6.md](./plan6.md),
[progress.md](./progress.md), [open-issues.md](./open-issues.md).

```tsx
// app/layout.tsx (Server Component)
import { VFXTransition } from "@vfx-js/react/next";

<VFXTransition transition={baz} types={{ back: { transition: swipe, reverse: true } }}>
  <main>{children}</main>
</VFXTransition>

// app/foo/page.tsx (Server Component)
import { TransitionIn } from "@vfx-js/react";
import { foo } from "./transitions";

export default function FooPage() {
  return (
    <>
      <TransitionIn transition={foo} />
      <div>Foo</div>
    </>
  );
}

// a client component
useTransitionIn({ transition: bar });
```

- Any page → foo: `foo`. Any page → bar: `bar`. Else `baz`.
- Back navigation without a page spec: `types.back`.
- A `<Link onClick={transition(spec)}>` still wins for that one click.

## Why the current API is hard to read

- The Link marks a global note (`pending`), and `<VFXTransition>` picks
  it up on a child `key` change. The two are tied only through a
  module-level store, so there can be one container per page.
- Users must add `<div key={pathname}>` themselves. In Next the layout
  `children` is a router outlet, so they also need `FrozenRouter`.
- The page that is entered has no say.

## Design

### Spec priority per run

1. `transition(spec)` on the clicked Link, or `setNextTransition(spec)`.
2. The incoming page's `<TransitionIn>` / `useTransitionIn`.
3. Direction: `type: "back"` picks `types.back`. It merges under 1 and 2,
   so a page spec with no `transition` still gets the back shader.
4. The container props.

Core's `resolveSpec` already handles 3 and 4. React builds one
`RunOpts` from 1 to 3.

### Timing

The page spec is known only after React commits the new page, which is
after core's snapshot. The order inside one commit saves us: child
layout effects run before the parent's. So:

1. `pageKey` changes. `<VFXTransition>` keeps rendering the old
   children and calls `run(swap, resolveOpts)`.
2. Core freezes, wraps and snapshots the old content.
3. `swap` sets the shown children inside `startTransition`. The new
   page's `useTransitionIn` layout effect registers its spec. Then the
   container's layout effect resolves the swap.
4. Core calls `resolveOpts()`, resolves the spec, binds the shader,
   captures the new content and starts.

Core binds `frag` at `start()` already. Only `def.effects` (driver
effects in the chain) and `def.prepare` run before `cb` today, so those
move after `cb` for a lazy spec.

### Names

- `pageKey` on `<VFXTransition>`. Not `key` (React remounts, which
  destroys the controller and the old DOM) and not `id` (reads as the
  DOM id next to `className` and `style`).
- `<TransitionIn>` and `useTransitionIn(spec)`. The existing
  `useVFXTransition` (`{ ref, run }`) keeps its name and behavior.

## 1. Core: lazy `RunOpts`

`packages/vfx-js/src/transition/types.ts`, `transition.ts`.

- `run(cb, opts?: RunOpts | (() => RunOpts))`.
- A function is called once, right after `cb` resolves, in the same
  run. If it throws, treat the run like a `cb` error (cancel, unwrap,
  rethrow).
- Static `opts` keep today's path unchanged: driver effects and
  `prepare` before the snapshot, early cut when `duration` is 0.
- Lazy path in `#run`:
  1. Wrap with `[this.#effect]` only, freeze, lock, snapshot. No early
     cut, since `duration` is not known yet.
  2. `await update()`.
  3. `const spec = resolveSpec(this.#opts, opts())`. If
     `spec.duration <= 0`: `#endActive`, `cancel` the effect, release
     the wrap, return.
  4. `fx = await #ensureDriverEffects(def)`. On failure, log and cut as
     today. Then `#ensureWrapped(fx, isCurrent)` again. It is already
     able to swap the chain of a wrapped element (`updateEffects`) and
     to recapture. `TransitionEffect` stays the first item, so its held
     `from` texture survives the swap.
  5. `#endActive`, set `#active`, call `def.prepare`. The hold still
     shows the old snapshot, so a driver that reads "the old content"
     (datamosh) sees the same frame as before.
  6. Continue as today: freeze, `waitFor`, `updateInTime`, next frame,
     `start`.
- Share code between the two paths. One option: a `bind(spec)` step
  that does 4 and 5, called before the snapshot for static opts and
  after `cb` for lazy opts.
- `prepare` doc: "Called while the old snapshot is held on screen. With
  a lazy spec this is after the DOM changed." Update `types.ts` and
  `docs/TRANSITION.md` (Driver hooks).
- `Transition.run` JSDoc: describe the function form and when it runs.

Tests (`transition.test.ts`):

- Lazy opts: log order is `snapshot`, `cb`, `resolveOpts`, `wrap`
  (chain swap, when the def has effects), `start`; `start` gets the
  lazy def's frag.
- Lazy `duration: 0` cuts after `cb` and unwraps.
- A lazy `opts()` that throws rejects the run and unwraps.
- `resolveSpec`: a run spec without `transition` plus `type: "back"`
  takes the `types.back` shader and the run's own `duration`.

## 2. React store: tell a click from a back mark

`packages/react/src/transition/store.ts`.

- Keep `transition(spec)`, `setNextTransition(spec)`,
  `markBackNavigation()`.
- Store `{ spec, at, kind: "click" | "back" }`. `markBackNavigation`
  stores `{ type: "back" }` with `kind: "back"` and still never
  overwrites a pending click.
- `takePending()` returns `{ spec, kind } | null`. Update
  `store.test.ts`.

## 3. `<VFXTransition>`: `pageKey`, any children, a scope context

`packages/react/src/transition/VFXTransition.tsx`, new
`packages/react/src/transition/scope.ts`.

Props:

```ts
export type VFXTransitionProps = AddTransitionOpts & {
    /** Changes per page. A change swaps the children through the shader. */
    pageKey?: unknown;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
};
```

- Children are any `ReactNode`. Drop `React.Children.only` and the
  child `key` detection. `shown` holds the node; `requestedKey` holds
  the last `pageKey` (compare with `Object.is`). Undefined `pageKey`
  never transitions.
- Keep the two-div render, `useLiveOpts`, `watchNavigationDirection`,
  the `shown`/`latestShown` buffering and the commit waiters as they
  are. The `latestShown` rule becomes: while `pageKey` is unchanged,
  render the latest children; after a change, keep the old node until
  the swap.
- Scope context (`scope.ts`):

  ```ts
  export type TransitionScope = { register(spec: RunOpts): () => void };
  export const TransitionScopeContext = createContext<TransitionScope | null>(null);
  ```

  The container provides one stable object. `register` writes
  `incoming.current = spec` and returns a cleanup that clears it only if
  it still holds the same spec.
- Each run: set `incoming.current = null` before `run`, then

  ```ts
  transition.run(swap, () => {
      const pending = takePending();
      const page = incoming.current;
      const back = pending?.kind === "back" || page === null ? pending?.spec : undefined;
      return { ...back, ...page, ...(pending?.kind === "click" ? pending.spec : {}) };
  });
  ```

  Spell this out as a small pure `resolveRunOpts(pending, page)` with
  tests. Rules: a click spec wins whole; else the page spec; `type:
  "back"` is kept under both so `types.back` fills missing fields.
- When there is no controller yet (no VFX, SSR), swap without a run as
  today.

## 4. `<TransitionIn>` and `useTransitionIn`

New `packages/react/src/transition/TransitionIn.tsx`.

```ts
export function useTransitionIn(spec: RunOpts): void;
export function TransitionIn(props: RunOpts): null;
```

- `"use client"`. The hook reads `TransitionScopeContext`; outside a
  container it does nothing (one `warnOnce` in dev).
- `useLayoutEffect(() => scope.register(spec), [scope])` with the spec
  kept in a ref, so later prop changes do not re-register. Only the
  mount matters.
- `<TransitionIn>` calls the hook and renders `null`, so a Server
  Component page can use it.
- Export both from `index.ts`. Keep `useVFXTransition` as is.

## 5. `@vfx-js/react/next`

New `packages/react/src/next/index.tsx`.

- `VFXTransition` for the App Router: reads `usePathname()` as
  `pageKey` and wraps children in `FrozenRouter` (moved from
  `packages/transition-demo/next/app/frozen-router.tsx`). Same props
  minus `pageKey`.
- `package.json`: add `"./next"` to `exports` (cjs and esm), `next` as
  an optional peer dependency (`peerDependenciesMeta`), and `next` as a
  devDependency for types. Check `tsconfig-to-dual-package` picks up
  the subpath; if not, write the two entries by hand.
- Comment the internal import
  (`next/dist/shared/lib/app-router-context.shared-runtime`) as a
  known break point on Next upgrades.
- Other routers pass `pageKey` themselves. React Router:
  `pageKey={useLocation().pathname}` with `useOutlet()` as children,
  since `<Outlet>` reads context like Next does.

## 6. Demos

- `packages/transition-demo/next/app/shell.tsx`: use
  `VFXTransition` from `@vfx-js/react/next`; drop the keyed div and
  the local `FrozenRouter`.
- Each Next page adds `<TransitionIn transition={...} />`. Keep `TLink`
  on one or two links to show the click override.
- `packages/transition-demo/void/pages/layout.tsx`:
  `pageKey={path}`, plain children. Keep `setNextTransition` on the
  nav as the override example, or move specs into the pages.

## 7. Docs and changesets

- `docs/TRANSITION.md`: rewrite "React API" around `pageKey`,
  `<TransitionIn>`, the priority list and the Next adapter. Update
  "Spec resolution" and "Driver hooks" for lazy opts and the `prepare`
  timing. Replace the `<Page key={pathname} />` example.
- `open-issues.md`: the Next section is resolved by the adapter; note
  the internal import risk.
- `progress.md`: add this plan's outcome.
- Changesets: `@vfx-js/core` (minor: lazy `RunOpts`, `prepare`
  timing), `@vfx-js/react` (minor: `pageKey`, `TransitionIn`,
  `useTransitionIn`, `./next`; the keyed-child trigger is removed).

## 8. Verify

- Lint, `tsc --noEmit`, vitest in core and react.
- React render tests are worth adding now: `react-dom/client` +
  `act` under `happy-dom` (already a devDependency), with a fake
  `Transition` injected through a test-only VFX instance or by mocking
  `useVFXInstance`. Cover: `pageKey` change calls `run`; the lazy opts
  see the spec registered by a child; click beats page; back fills in
  under a page spec.
- Browser pass on the Next demo: every page enters with its own
  shader, back uses `swipe` reversed, a `TLink` click overrides, and
  the datamosh and pixelsort presets still start from the old frame
  with the lazy path (chain swap after the snapshot must not show a
  plain frame).

## Risks

- `updateEffects` while the hold is on screen is new. If it shows one
  plain frame, pre-wrap with the container default's driver effects
  and only swap when the resolved def differs.
- `prepare` after the DOM change is a behavior change for driver
  transitions. Both presets only set params and enable, so this should
  be safe; confirm in the browser.
- `pageKey` compared with `Object.is`: objects as keys retrigger every
  render. Document "use a string".
