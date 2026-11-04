# Element transitions: bug fixes after review

Fixes for the three confirmed bugs found in the PR #220 review.
Branch `feat/transition`. Context: [plan.md](./plan.md), [progress.md](./progress.md).

## 1. `run()` hangs when the element is not rendered

**Bug.** `TransitionEffect.snapshot()` and `start()` resolve only inside
`TransitionEffect.render()`. The player skips elements that fail the
visibility check (`packages/vfx-js/src/vfx-player.ts`, `if (!hit.isVisible) continue;`
in `#render`). A target outside the viewport, or hidden by `display: none`
after `cb`, never renders, so `run()` never resolves. The element stays
wrapped, frozen and size-locked.

**Fix.**
- Make the player render an element whose chain holds a pending or running
  transition, even when `hit.isVisible` is false. Add a hook on `VFXElement`
  (e.g. `forceRender?: () => boolean`) or check a flag the transition sets
  on the element entry via a new internal `VFXPlayer` method. Keep it
  internal, like `freezeInside`.
- Fall back to a timeout in `TransitionController`: if the snapshot has not
  landed within a bounded time (say 1 s), cut to the new content: apply `cb`,
  cancel the effect, release the wrap. Log once with `console.warn`.
- Tests in `packages/vfx-js/src/transition/transition.test.ts`: a fake
  effect whose `snapshot()` never resolves must still let `run()` settle,
  call `cb`, and unwrap.

## 2. Driver effects leak across `TransitionDef` objects

**Bug.** `#ensureDriverEffects` caches by `TransitionDef` identity and
`#loadedDriverEffects` accumulates every def ever used
(`packages/vfx-js/src/transition/transition.ts`). A factory def created per
run, e.g. `run(cb, { transition: createPixelsort({ direction }) })`, adds a
new `PixelSortEffect` to the chain on every run and never removes it.
`#frags` grows the same way.

**Fix.**
- The chain holds only the current def's driver effects:
  `[transitionEffect, ...currentDriverFx, ...opts.effects]`. On a run with
  a different def, replace the chain via `updateEffects`; the chain disposes
  the dropped effects.
- Drop `#loadedDriverEffects`. Keep at most one cached def entry (the last
  used) in `#driverEffects`, or drop the cache and recreate per def change.
  Same for `#frags`: a bounded cache or none.
- Keep the "same def twice in a row reuses the effects" behaviour, so the
  presets' per-effect `WeakMap` state still works.
- Tests: running with def A, then B, then A leaves exactly A's effects in
  the chain; a new factory def per run keeps the chain length constant.

## 3. Still clone drops `id`, so id-keyed CSS vanishes for a frame

**Bug.** `coverWithStill` removes the clone's `id`
(`packages/vfx-js/src/still-clone.ts`). Router outlets are usually `#app` or
`#main`, and their styles are often `#app { … }`. The cover meant to hide
the wrap frame shows an unstyled box instead.

**Fix.**
- Keep the `id` on the clone. The duplicate lives for one frame, is
  `aria-hidden` and `pointer-events: none`. Note the trade-off in the file
  comment.
- Alternatively copy the root's computed style onto the clone and keep the
  id removed. Prefer keeping the id: simpler and covers descendants'
  `#app .child` selectors too.
- Test in `packages/vfx-js/src/html-in-canvas.test.ts` or a new
  `still-clone.test.ts`: the clone keeps the source `id`.

## Done when

- `pnpm --filter @vfx-js/core run test`, lint and `tsc --noEmit` pass.
- `docs/tasks/transition/progress.md` gets a short "Review fixes" section
  listing the three fixes.
- One commit per fix, plain English messages.
