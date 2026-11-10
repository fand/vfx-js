# autoReverse: plan

Implements [#243](https://github.com/fand/vfx-js/issues/243).
One PR, one commit per step.

## Goal

New option `autoReverse` on `addTransition`, and the same prop on every `<VFXTransition>`.
Default `false` keeps the current behavior.

With `autoReverse`:

- Remember the spec used to enter each history entry.
- Back: play the spec stored for the entry being left, with `reverse: true`.
- Forward button: play the spec stored for the entry being entered, as is.
- No stored spec (reload, new tab, no Navigation API): same as today.

Core does the work, so apps on frameworks without a binding get it with one flag:

```ts
const t = vfx.addTransition(main, { transition: Swipe, autoReverse: true });
```

## Design

### Entry

Use the Navigation API: `navigation.currentEntry`.
The `key` names the entry, the `index` gives the direction.

- One source for every framework, Next.js included. Next.js has no history index of its own.
- No API, `index` is `-1`, or no `key`: `autoReverse` does nothing.
- Do not use router direction flags. Compare the last index with the current one.
- Store by `key`, not `index`. A push after back reuses the index but gets a new key.
  A replace keeps the key.

### Store

New module `transition/history.ts`, pure apart from the default `getEntry`:

```ts
type HistoryEntry = { index: number; key: string };

type HistorySpecs = {
    /** The spec for a run that just changed the history entry. `spec` is what the run would use without autoReverse. */
    pick(spec: RunOpts): RunOpts;
};

function createHistorySpecs(getEntry?: () => HistoryEntry | undefined): HistorySpecs;
```

- One shared instance per document, at module level.
  Not per handle: Astro makes a new handle when a page has no target, and the next page has one again.
  One page has one router, so sharing is fine.
- In memory: `Map<string, RunOpts>` by entry key. Specs hold classes, so no `sessionStorage`.
- `last` entry starts at `getEntry()` on first use.

`pick(spec)`:

- `entry = getEntry()`. `undefined` → return `spec`.
- `leaving = last`, then `last = entry`.
- `entry.index < leaving.index` and a spec is stored at `leaving.key` → return `{ ...stored, reverse: true }`.
- `entry.index > leaving.index` and a spec is stored at `entry.key` → return it.
- Else store `spec` at `entry.key` and return it. Covers push, replace, and no stored spec.

A stored spec wins over the link or page spec on back.
So `setNextTransition()` then `history.back()` plays the stored spec. Document it.

A jump like `-2` plays the top entry's spec reversed.

### Run

In `TransitionController.run`:

- `autoReverse` on: turn the opts into a lazy one, `() => historySpecs.pick(resolve(opts))`.
  A static spec binds before the snapshot today. The history entry may not have changed yet, so it must go lazy.
- `show()` skips `autoReverse`. Slides do not change history.
- The stored spec is the run opts, not merged with the container opts.
  So `{}` on back means the container opts with `reverse: true`.

### Timing

Core reads the index right after `cb` resolves. The binding must change history before that.

- Vue: `cb` waits for the page to be ready, after `afterEach`. History is done. **Checked.**
  vue-router calls `routerHistory.push` in `finalizeNavigation`, before `triggerAfterEach`.
  Nuxt resolves on `page:finish`, later still.
- SvelteKit: `cb` waits for `nav.complete`. History is done. **Checked** (3.1.0).
  `navigate()` calls `pushState` before the `onNavigate` callbacks, and `nav.complete` resolves later.
- React Router: it pushes history before it renders. OK.
- Next.js: fine. **Checked** (16.4.3).
  `HistoryUpdater` pushes in `useInsertionEffect`, in the commit that changes the pathname.
  Our run starts later, in a passive effect.
- Astro: **Checked** (7.4.2), and fixed.
  `updateDOM` runs `doSwap`, then `moveToLocation` (push), then fires `astro:after-swap`.
  `cb` used to resolve inside the swap, racing the push.
  It now resolves on `astro:after-swap`.
- Popstate is always fine: the browser changes the entry first.

## Steps

1. Core:
   - `history.ts` + tests: push, back, forward button, replace, jump, no API.
   - `autoReverse` on `AddTransitionOpts`, lazy opts in `run`, skip in `show`.
   - Tests in `transition.test.ts`: static and lazy opts, `show()` ignores it.
2. React: types come from `AddTransitionOpts`, so nothing to add.
   Tests in `VFXTransition.test.tsx` and `react-router.test.tsx`. Check the Next.js timing.
3. Vue: add the prop to `base.ts`. Tests in `router.test.ts` and `nuxt.test.ts`.
4. Svelte: add the prop to `sveltekit/VFXTransition.svelte`. Tests in `sveltekit.svelte.test.ts`.
5. Astro: add the prop to `VFXTransition.astro`, read it in `readOpts`. Check the timing. Tests in `transition.test.ts`.
6. Docs:
   - `docs/TRANSITION.md`, each binding README, `docs-transitions` `frameworks.ts`.
   - Limitations page: no reverse without the Navigation API.
   - `skills/vfx-js/references/transitions.md`: the option.
   - Changeset: minor for core and each binding.
7. Testbed: turn `autoReverse` on in the Astro, Nuxt and SvelteKit apps, and a Next.js page.
   Check push → back → forward by hand in Chrome, Safari and Firefox.

## Verify after implementation

- Astro keeps one handle across navigations.
  `swapKeepingTarget` keeps the live target, so `bind()` reuses it.
  A new handle comes only when a page has no target, then the next page has one.
  Check in the testbed that specs survive that case too, via the module-level store.

## Open points

- `pageKey` unchanged (e.g. query only): no run, so `lastIndex` is not updated.
  The next run may see the wrong direction and fall back. Could listen to `currententrychange` later.
- Back during a run: a new run starts with the stored spec. No special case.
