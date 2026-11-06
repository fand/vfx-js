# Element transitions: open issues

Found while building the framework demos in `packages/transition-demo/`
(Next.js 16, Astro 7, Nuxt 4, SvelteKit 3, Void 1.3). As of 2026-11-04.
Not fixed in the library yet. See [progress.md](./progress.md).

## Two kinds of router problems

The issues below fall into two kinds.

- **Routers that swap HTML** (Astro ClientRouter, Turbo). They replace
  `<body>`, which removes the VFX canvas and the target. So the glue
  must replace the swap, and features built into the default swap get
  lost (`transition:persist`, `data-turbo-permanent`). Routers that swap
  only a container (Swup, Barba.js, htmx targets) can run their own swap
  inside `run(cb)`, so they should be fine. Not verified.
- **Routers that render components** (Next App Router, React Router,
  SvelteKit, Nuxt, Void). The DOM is not swapped whole, so layouts and
  state stay. The risk is that the old page goes away before the
  snapshot. Next hits this (resolved, see below). React Router's
  `<Outlet>` likely does too, since it reads the route from context.
  Pass `pageKey={useLocation().pathname}` and `useOutlet()` as the
  children instead (not verified).
- Verified in the demos, no workaround needed:
  - SvelteKit: `onNavigate` holds the DOM update until the snapshot.
  - Nuxt: `router.beforeEach` holds the navigation; `page:finish` ends
    the swap.
  - Void (React adapter): the layout gets the page as an element with
    its own props, so `<VFXTransition>` keeps the old page as is.

## Next.js App Router: the kept old page shows the new route (resolved)

In an App Router layout, `children` is a router outlet that reads the
current route from `LayoutRouterContext`. So a kept old page rendered
the new route, and the run animated 2 → 2.

- Resolved by `@vfx-js/react/next` ([plan7](./plan7.md)). Its
  `VFXTransition` uses `usePathname()` as `pageKey` and pins the context
  per page with `FrozenRouter`.
- Still a risk: `LayoutRouterContext` is internal
  (`next/dist/shared/lib/app-router-context.shared-runtime`), so it can
  break on a Next upgrade.

## Astro ClientRouter: users must write the glue by hand

`<VFXTransition>` does not cover Astro. Users wire core `run(cb)` to
ClientRouter themselves, and the glue is easy to get wrong.
The demo's version is `packages/transition-demo/astro/src/transition.ts`.

- Astro's default swap replaces `<body>`. That removes the VFX canvas
  and the element passed to `addTransition`. So the glue needs a custom
  `swap` that replaces only the outlet.
- A custom swap must still call `swapFunctions` (`deselectScripts`,
  `swapRootAttributes`, `swapHeadElements`, `saveFocus`). Without them,
  page CSS in `<head>` is not updated, outlet scripts rerun on every
  navigation, and `<html>` attributes go stale. The first demo version
  missed this.
- Option: ship an Astro helper, e.g. `setupAstroTransition(vfx, "main",
  opts)`, with `astro` as a peer dependency.

Still open in the demo glue:

- `transition:persist` inside the outlet does not work, since
  `swapBodyElement` is not called. Fix: in the custom swap, put the old
  persisted elements in place of their matches in the new outlet.
- Only `<nav>` and `<main>` are swapped. Anything else outside the
  outlet (a footer) never updates.
- The loader waits for the fetch, then for the snapshot. Start the run
  at `before-preparation` and await both with `Promise.all`. A failed
  fetch then plays an old → old run once.

## Snapshot latency not measured

Navigation waits for the old snapshot (Astro), or the old page stays up
until it (Next). On the small demo page it took about 20 ms, probably on
the dom-to-canvas fallback (Playwright's Chrome had no html-in-canvas
flag). Large pages and the html-in-canvas path are not measured.

## gl-transitions

All 123 entries without textures compiled and ran on /transitions
(Playwright's Chrome, 0.3 s runs, no `[VFX-JS]` errors or warnings).
`LumaWipe` and `DisplacementMap` need textures and are not listed.
