# Element transitions: spec fixes after review

Fixes for the spec problems found in the PR #220 review. Decisions are
final. Branch `feat/transition`. Context: [plan.md](./plan.md),
[plan2.md](./plan2.md), [plan3.md](./plan3.md), [progress.md](./progress.md).

## 1. Still clone only on the transition path

`wrapElement` calls `coverWithStill` for every `addHTML`
(`packages/vfx-js/src/html-in-canvas.ts`). The clone costs a deep
`cloneNode`, a full subtree walk and a fixed-position insert, and its
`z-index: 9998` assumes the default VFX canvas z-index. Plain `addHTML`
users should not pay for it.

- `wrapElement` takes an option (e.g. `coverWithStill?: boolean`,
  default false). Only the transition wrap sets it.
- `VFX.addHTML` stays as it is publicly. Give `TransitionController` an
  internal way to ask for the still cover: an `@internal` method on `VFX`
  that the controller uses instead of `addHTML`, or an internal-only
  option that `VFXProps` does not expose. Keep `TransitionHost` in sync.
- Keep the "first capture stays on the canvas until the overlay draws"
  behaviour for everyone; it is cheap. Only the clone is limited.
- The clone's z-index follows the VFX canvas: read `vfx.canvas.style.zIndex`
  (or the option) and use one less, falling back to 9998.
- Tests: `html-in-canvas.test.ts` or `still-clone.test.ts` covers that
  the default wrap does not insert a clone and the transition wrap does.
- Docs: `docs/TRANSITION.md` has no user-facing change; note it in
  `progress.md`.

## 2. `waitFor: "media"` skips lazy media and waits less

`waitForMedia` (`packages/vfx-js/src/transition/transition.ts`) waits for
every `img` with `complete === false` and every `video` with
`readyState < 2`. Lazy images off screen and `preload="none"` videos never
become ready, so every run waits the full 1 s timeout.

- Skip `<img loading="lazy">` whose rect is outside the viewport
  (`getBoundingClientRect` against `window.innerWidth/innerHeight`).
- Skip `<video preload="none">`.
- `MEDIA_TIMEOUT_MS` 1000 → 300.
- Keep `document.fonts.ready`.
- Update the `waitForMedia` tests and the `waitFor` section of
  `docs/TRANSITION.md` ("up to about 300 ms", "lazy images off screen and
  `preload="none"` videos are not waited for").

## 3. `overflow`: user over preset, off when the element fills the canvas

`resolveSpec` takes the larger of the preset's `overflow` and the user's.
Presets `zoom`, `zoomBlur`, `crosszoom` declare `overflow: true`, so a
small element gets a full-canvas stage even when the user asked for less.

- `resolveSpec`: `overflow = run.overflow ?? typed?.overflow ??
  opts.overflow ?? transition.overflow`. Remove `largerOverflow`.
- `TransitionEffect.outputRect`: when `dims.contentRect` already covers
  `dims.canvasRect`, return `undefined`. A full-screen target then never
  grows the stage, whatever the spec says. Keep the `true` and number
  cases otherwise.
- Presets keep their `overflow: true`.
- Tests: `resolveSpec` user-over-preset; `outputRect` returns undefined
  for a full-cover element with `overflow: true` and a number.
- Docs: `docs/TRANSITION.md` `overflow` section: the user's value wins
  over the transition's; no overflow when the element fills the canvas.

## 4. Click spec TTL 2 s → 10 s

`PENDING_TTL_MS` in `packages/react/src/transition/store.ts`. Slow
navigations (uncached Next.js routes on a slow network) outlived 2 s and
fell back to the default transition. The spec is consumed on the first
key change, so a longer TTL only affects clicks that never navigated.

- `PENDING_TTL_MS = 10_000`.
- `store.test.ts` "expires after 2 s" → 10 s.
- `docs/TRANSITION.md`: "The spec expires after about 10 s."

## 5. `VFXTransition` swaps inside `startTransition`

`setShown(next)` in `swap` (`packages/react/src/transition/VFXTransition.tsx`)
is a sync update. A suspending new page replaces the container with the
nearest Suspense fallback, which breaks "hold the old page".
`useVFXTransition` already uses `startTransition`.

- Wrap both `setShown(next)` calls in `startTransition` (import from
  `react`). The `useLayoutEffect([shown])` commit waiter still fires on
  the commit, so no other change.
- No DOM test setup in the react package; typecheck and lint only.
- Docs: one line in the `<VFXTransition>` section: the swap runs in a
  React transition, so a page that suspends keeps the old page on
  screen until it is ready.

## 6. Progress notes

- `docs/tasks/transition/progress.md`: add a "Spec fixes" section, one
  line per item above.

## Done when

- core, effects and react: test, lint, `tsc --noEmit -p tsconfig.esm.json`
  pass. Root `pnpm run lint` passes. Storybook `tsc --noEmit` passes.
- One commit per numbered section, plain English messages.
