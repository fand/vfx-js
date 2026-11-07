# Element transitions: remaining work

All plans are merged (#220, #224). Only open items are left.
Older notes are in git history.

## Checked in Chrome 157 with html-in-canvas (2026-11-07)

`show()` and the Tabs story, the review fixes, nested freeze and `keepWrapped` all work.
SvelteKit and Nuxt demos type-check.

## Found in the browser check

- Fixed: a target hidden with `display: none` inside `cb` threw in the paint handler.
- Open: a `position: fixed` or `absolute` target sized by its insets breaks once wrapped.
  The canvas copies the insets, but a replaced element does not stretch, and the child RO sets the canvas height to the content height.
  Fix, checked by hand in Chrome: canvas `width` / `height` = `calc(100% - <insets>)`, element `position: static; height: 100%`.
  An in-flow `100vw` × `100vh` target works today.

## Not checked

- Chromatic snapshot of the Transition story (never run).

## Missing

- Next.js `loading.tsx`: the run lands on the skeleton.
  No fix in v1; `docs/TRANSITION.md` Limits says to use `useVFXTransition` with a ready signal.

## Open issues

- `@vfx-js/react/next` reads `LayoutRouterContext`, which is internal to Next.
  A Next upgrade can break it.
- Astro ClientRouter has no helper; users write the glue by hand.
  Demo glue: `packages/transition-demo/astro/src/transition.ts`.
  - `transition:persist` inside the outlet does not work.
  - Only `<nav>` and `<main>` are swapped, so a footer never updates.
  - The loader waits for the fetch, then the snapshot. Start the run at `before-preparation` and await both.
- Routers that swap only a container (Swup, Barba.js, htmx) should work inside `run(cb)`. Not verified.
- Snapshot latency is not measured on large pages or on the html-in-canvas path.
  The small demo page took about 20 ms on the fallback.
