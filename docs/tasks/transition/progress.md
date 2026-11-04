# Element transitions: progress

Status as of 2026-11-04. Branch `feat/transition`, PR #220.
Plans: [plan.md](./plan.md), then the review follow-ups [plan2.md](./plan2.md),
[plan3.md](./plan3.md), [plan4.md](./plan4.md), [plan5.md](./plan5.md).
User guide: [docs/TRANSITION.md](../../TRANSITION.md).

## Where it started

A glide session proposed moving glide's slide transition layer into
VFX-JS as a general "swap the contents of one element with a shader"
API. The mechanism (snapshot → change DOM → wait for capture → mix with a
shader) is not slide-specific, so it fits tab panels, carousels, cards
and SPA page transitions.

## Decisions from the discussion

- **Container-level first.** `addTransition(el)` on any element. Page
  transitions target the router outlet, never `<body>` (a canvas cannot
  wrap it). MPA is out of scope.
- **Who picks the transition.** No mutable global like
  `setTransition(body)`. Resolution order: `run` override → `types[type]`
  → container default. Navigation names a `type` string, the container
  maps it to a spec. Same split as React's `addTransitionType` +
  `enter={{ type: … }}` (which is still canary, not stable React).
- **Wrap only during a run** (default). The element is plain DOM at rest
  and is wrapped in the html-in-canvas canvas only while `run()` is in
  flight. `keepWrapped: true` keeps it wrapped between runs; glide's
  stage uses that. Avoids the hit-test flag and per-frame capture at rest.
- **React: no navigation interception.** `onClick={transition(glitch)}`
  on any Link only records the next spec in a store; `<VFXTransition
  key={pathname}>` consumes it when the key changes. Works with Next,
  react-router, TanStack, wouter and plain `<a>`. Does not work where
  the DOM swap is not a React re-render (Astro ClientRouter, Turbo, htmx,
  MPA); core `run(cb)` can be wired to those by hand.
- **Package split.** Core holds the mechanism and `crossfade`. The other
  presets live in `@vfx-js/effects/transitions` because `pixelsort` and
  `datamosh` import effects. glide keeps its registry, string parsing,
  parking, pump and hit test.
- **Fixed-size target.** The old and new content share one box. Size
  interpolation (View Transitions style) was considered and rejected: it
  does not keep the look. When sizes differ, the box is locked at the
  old size for the run and jumps afterwards, as a fallback only.
- **Dropped `useVFXTransitionSpec`.** A page-declared spec only worked for
  the leaving page, since the entering page mounts after the run starts.
  Nuxt (`definePageMeta({ pageTransition })`) and Astro
  (`transition:animate`) have page-declared transitions where the
  entering page's declaration counts, so a half-working one is worse
  than none. It may come back if Astro support needs it. Doing it
  right needs a deferred spec in core: `run(cb, () => opts)` resolved
  after `cb`, so the entering page's declaration is readable.

## What was built

Commits on `feat/transition`, in order:

1. `92c81ac1` Core prerequisites: `update()` on a HIC element resolves
   when the capture lands; `moveBefore` on wrap / unwrap; the first
   capture stays on the wrapper canvas until the overlay draws.
2. `ba7b9253` `vfx.addTransition`: `TransitionController` (run / cancel /
   destroy, seq-based interrupts, driver effects, `waitFor`), ported
   `TransitionEffect` and GLSL prelude, nested VFX elements frozen
   during a run via an internal `freezeInside` hook.
3. `ef3d4c4c` Presets under `@vfx-js/effects/transitions`: swipe, zoom,
   zoomBlur, crosszoom, glitchSlide, glitch, datamosh, pixelsort, plus
   `createSwipe` / `createPixelsort` / `createDatamosh`. Per-run state
   moved out of module scope.
4. `ba6a413b` React: `<VFXTransition>` (key-based, defers the swap one
   frame so the old page renders until the snapshot), `useVFXTransition`
   (`{ ref, run }` over React 19 actions), `transition()` click helper
   and store, `<VFXLink>` for Server Components (removed later), back /
   forward detection via the Navigation API.
5. `65ce57eb` `docs/TRANSITION.md`, Storybook "Transition / Tabs",
   changesets. Effects peer dependency on core bumped to `>=1.4.0`.
6. `9a5300f9` Size lock during a run; `overflow` option
   (`true` = whole canvas, number = px margin) through
   `TransitionEffect.outputRect`; `from` is an element-sized render
   target so a larger stage does not resize it.
7. `6fa50e81`, `db81b236` Docs "Sizing" section; story uses a fixed box
   (explicit width and height) and an `overflow` arg.
8. `7e54d93a` Premultiplied reads in the prelude, alpha kept in the
   output.
9. `079b6126` A still copy of the element covers the wrap frame.
10. `1735991c` Removed `useVFXTransitionSpec`.

## Bugs found in Storybook, and what they were

- **Tab size changed between tabs.** The story box was content-sized, so
  its width followed the text (597 → 383 → 426 px). Storybook's root
  shrinks to content. Fix: explicit width and height on the box, and
  the "fixed-size target" rule in the docs. The size lock stays as a
  fallback.
- **Transition drew only inside the element.** `TransitionEffect` had no
  `outputRect`, so the chain clipped the stage to the element.
  zoomBlur's blur never left the box. Fix: `overflow` → `outputRect`;
  zoomBlur, crosszoom and zoom declare `overflow: true`.
- **White edges on rounded corners.** Captures are straight alpha, but
  the glide `MAIN` divided rgb by alpha and forced alpha to 1. An
  antialiased edge pixel like `(0.13, 0.13, 0.13, a=0.1)` became white.
  Fix: `readOld` / `readNew` return premultiplied values; `MAIN` outputs
  the transition result as is. Side effect: the zoomBlur smear now fades
  out past the box instead of filling the screen.
- **Blank frame on Next.** Measured per frame: the first frame after the
  wrap had an empty wrapper canvas and zero overlay draws. A drawable
  child is not painted by the browser, and Chrome fires the `paint`
  event after that frame. Fix: `coverWithStill` pins a static clone over
  the element until the overlay draws (same idea as glide's
  `staticClone`). The unwrap frame has no gap: the element returns to
  plain DOM in the same frame the overlay draws it last.

## Review fixes

From the PR #220 review ([plan2.md](./plan2.md)):

- `run()` no longer hangs when the target is off screen or hidden: the
  player keeps rendering it during a run, and a 1 s timeout cuts to the
  new content.
- The chain holds only the current transition's driver effects;
  switching transitions swaps them out and disposes the old ones.
- The still copy keeps the element's `id`, so `#app { … }` styles cover
  the wrap frame.

## API trim

From [plan3.md](./plan3.md). glide moves to `vfx.addTransition(stage, {
keepWrapped: true })`, so these parts had no user left:

- Dropped `AddTransitionOpts.effects`; the chain is the transition effect
  plus the def's driver effects.
- Core no longer exports `TransitionEffect`, `TransitionStartOpts`,
  `BODY_OFFSET`, `PRELUDE`, `buildFrag` and `describeGlslError`.
- Dropped `readOld` / `readNew` from the prelude; `datamosh` uses
  `readFrom` / `readTo` with `reverse`.
- `TransitionUniforms` takes the core uniform values (numbers and
  vectors, no textures), so colors work.
- React no longer exports `takePending`, `markBackNavigation`,
  `watchNavigationDirection` or `VFXLink`; `setNextTransition` and
  `transition` take `RunOpts`.

## Spec fixes

From [plan4.md](./plan4.md):

- The still copy now covers the wrap frame only for transitions; plain
  `addHTML` skips it. It sits one below the VFX canvas z-index.
- `waitFor: "media"` skips lazy images off screen and `preload="none"`
  videos, and gives up after 300 ms instead of 1 s.
- `overflow` from the options wins over the transition's own, and a
  target that fills the canvas never grows the stage.
- A click spec now lasts 10 s instead of 2 s, so slow navigations keep it.
- `<VFXTransition>` swaps pages in `startTransition`, so a suspending
  page keeps the old one on screen instead of the Suspense fallback.

## Small fixes

From [plan5.md](./plan5.md):

- `<VFXTransition>` renders an outer `display: contents` div around the
  target, so React never removes a node that core moved.
- VFX elements that the new page mounts during a run start frozen and
  show their plain content until the run ends.
- A run warns once when the new content is not captured in time.
- `CLAUDE.md` says `pnpm test` runs every package with tests.

## Framework demos

`packages/transition-demo/` has the same three pages (Home, Gallery,
About) in five frameworks. Each link picks a preset; back plays `swipe`
reversed. Shared pages, CSS and preset names live in `shared/`.
`pnpm dev` starts them all (`--concurrency 16` on the root script).

| Demo | Port | Wiring |
| ---- | ---- | ------ |
| Next.js 16 | 5001 | `<VFXTransition>` + `FrozenRouter` |
| Astro 7 | 5002 | core `run(cb)` in `before-preparation`, custom `swap` |
| Nuxt 4 | 5003 | core `run(cb)` in `router.beforeEach`, ends on `page:finish` |
| SvelteKit 3 | 5004 | core `run(cb)` in `onNavigate` |
| Void 1.3 | 5005 | `<VFXTransition>` (React adapter) |

Each demo builds with `build:demo`, kept out of the root `pnpm build`.
In Playwright's Chrome (dom-to-canvas fallback), every demo snapshots
the old page before the new one renders, on links and on back.
Shader output was not checked by eye. Findings:
[open-issues.md](./open-issues.md).

## Verified

- Lint, vitest (core 258, effects 14, react 25), `tsc --noEmit` and the
  Storybook build pass.
- In Chrome with html-in-canvas: box stays 560×240 through runs; corners
  clean mid-crossfade; zoomBlur with `overflow: full` draws across the
  canvas and fades; no blank frame at wrap or unwrap.

## Not verified / open

- Chromatic snapshot of the Transition story (never run).
- Nested freeze and `keepWrapped` paths in a real browser.
- Everything after the review (plan2 to plan5) is covered by unit tests
  and typecheck only. Worth a browser pass before merge: the two-div
  `<VFXTransition>` on unmount mid-run, elements mounting under a frozen
  root, the off-screen stall timeout, `waitFor` with lazy images, the
  prelude without `readOld` / `readNew`, and `overflow` on a full-screen
  target.
- Next.js `loading.tsx` lands the transition on the skeleton. No fix in
  v1; use `useVFXTransition` with a manual ready signal, or drop the
  loading file for that route.
- No React render tests (`VFXTransition`, `useVFXTransition`); the
  package has no DOM test setup.
- `packages/docs` demo page not added (the site is one `main.ts` app).
- glide rewrite happens in the glide repo, on `addTransition` with
  `keepWrapped: true`.
- Exact peer versions are set at release time.
- Framework demo findings: [open-issues.md](./open-issues.md).
