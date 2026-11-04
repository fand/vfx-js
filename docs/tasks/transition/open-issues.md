# Element transitions: open issues

Found while building the framework demos in `packages/transition-demo/`
(Next.js 16 App Router, Astro 7 ClientRouter). As of 2026-11-04.
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
  snapshot. Next hits this. React Router's `<Outlet>` likely does too,
  since it reads the route from context. SvelteKit `onNavigate` and Nuxt
  `router.beforeEach` can hold the update until the snapshot. Void's
  pages mode renders pages through UI adapters; whether it hits this
  depends on how the page reaches the component. None of these are
  verified beyond Next.

## Next.js App Router: the kept old page shows the new route

`<VFXTransition>` keeps the old child element until it has the snapshot.
In an App Router layout, `children` is not the page. It is a router
outlet that reads the current route from `LayoutRouterContext`. So the
kept old element renders the new route, and the run animates 2 → 2.

- The example in `docs/TRANSITION.md` (`<Page key={pathname} />` in a
  layout) hits this.
- The demo works around it with `FrozenRouter`
  (`packages/transition-demo/next/app/frozen-router.tsx`). It pins the
  context from mount.
- `LayoutRouterContext` is internal
  (`next/dist/shared/lib/app-router-context.shared-runtime`), so it can
  break on a Next upgrade.
- Option: ship it as `@vfx-js/react/next`, or at least document it.

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
