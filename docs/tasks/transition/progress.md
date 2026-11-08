# Element transitions: remaining work

All plans are merged (#220, #224). Only open items are left.
Older notes are in git history.

## Not checked

- Chromatic snapshot of the Transition story (never run).

## Missing

- Next.js `loading.tsx`: the run lands on the skeleton.
  No fix in v1; `docs/TRANSITION.md` Limits says to use `useVFXTransition` with a ready signal.

## Open issues

- `@vfx-js/react/next` reads `LayoutRouterContext`, which is internal to Next.
  A Next upgrade can break it.
- `@vfx-js/astro`: not checked in Safari or Firefox.
  Without `moveBefore`, Astro's swap falls back to `appendChild`, which detaches the target and canvas for a moment.
  - A new page without `<VFXTransition>` drops the live target and the handle. Unit tests only.
  - A VFX made with `wrapper` is not kept across the swap; only a canvas under `<body>` is.
- Routers that swap only a container (Swup, Barba.js, htmx) should work inside `run(cb)`. Not verified.
- Snapshot latency is not measured on large pages or on the html-in-canvas path.
  The small demo page took about 20 ms on the fallback.
