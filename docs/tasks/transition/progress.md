# Element transitions: progress

Status as of 2026-11-06. Branch `feat/transition`, PR #220.
Plans: [plan.md](./plan.md), then the review follow-ups [plan2.md](./plan2.md),
[plan3.md](./plan3.md), [plan4.md](./plan4.md), [plan5.md](./plan5.md),
[plan10.md](./plan10.md).
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
  on any Link only records the next spec in a store; `<VFXTransition>`
  consumes it when its page changes (first a keyed child, now
  `pageKey`; see plan7). Works with Next,
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
  Done in plan7 as `<TransitionIn>`.

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
| Next.js 16 | 5001 | `<VFXTransition>` + `FrozenRouter` (landing site, see below) |
| Astro 7 | 5002 | core `run(cb)` in `before-preparation`, custom `swap` |
| Nuxt 4 | 5003 | core `run(cb)` in `router.beforeEach`, ends on `page:finish` |
| SvelteKit 3 | 5004 | core `run(cb)` in `onNavigate` |
| Void 1.3 | 5005 | `<VFXTransition>` (React adapter) |

Each demo builds with `build:demo`, kept out of the root `pnpm build`.
In Playwright's Chrome (dom-to-canvas fallback), every demo snapshots
the old page before the new one renders, on links and on back.
Shader output was not checked by eye. Findings:
[open-issues.md](./open-issues.md).

## Landing site

The Next.js demo is now a standalone landing site for
`@vfx-js/transitions`. It no longer uses `shared/`; the other four
demos still do.

- Pages: Home (white), Getting Started (per-framework tabs), How it
  works, Transitions (dark playground with every preset, duration,
  reverse and autoplay) and Custom (live GLSL editor with uniforms).
- Each header link plays its own preset; back plays `swipe` reversed.
- The outlet has a fixed height and each page scrolls inside it. The
  outlet passes `overflow: 0`, so zoom presets never cover the header.
- Checked in Playwright's Chrome at 1440 and 390 px wide: page runs,
  tab swipes, the playground and the shader lab all animate.

## Optional `VFXProvider`

`VFXProvider` became optional on main (#221); this branch is rebased on
it. `<VFXTransition>` and `useVFXTransition` read `useVFXInstance()`, so
they use the implicit instance outside a Provider. The Next and Void
demos and `docs/TRANSITION.md` no longer use the Provider. In the Next
demo, one canvas serves the page runs and the home live stage.

## gl-transitions adapter

From [plan6.md](./plan6.md):

- Core: `TransitionDef.uniforms` (defaults under the spec's) and
  `TransitionDef.ease: "smoothstep" | "linear"`.
- `createGLTransition(entry, params?)` in `@vfx-js/transitions` wraps a
  `gl-transitions` entry: `getFromColor` / `getToColor` read the core
  textures with clamp-to-edge, `progress` and `ratio` are globals set
  per fragment, `t` is linear. Params named like a prelude uniform
  (`reverse`) become `glParam_<name>`. Entries with `textures`
  (`LumaWipe`, `DisplacementMap`) throw.
- `gl-transitions` is a devDependency only (pinned 2.0.0, the newest
  allowed by `minimumReleaseAge`). Test files no longer land in `lib/`.
- All 123 entries without textures compile and run on the landing
  site's Transitions page, which lists them in a select.

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
- No render tests for `useVFXTransition`. `VFXTransition` has them since
  plan7.
- `packages/docs` demo page not added (the site is one `main.ts` app).
- glide rewrite happens in the glide repo, on `addTransition` with
  `keepWrapped: true`.
- Exact peer versions are set at release time.
- Framework demo findings: [open-issues.md](./open-issues.md).

## Page-declared React transitions (plan7)

[plan7.md](./plan7.md). The incoming page says how it enters.

- Core: `run(cb, opts)` takes a function for `opts`. It is called once
  after `cb` resolves. With it, driver effects and `prepare` run after
  `cb`; the chain is swapped while the old snapshot is held.
- React store: pending specs carry `kind: "click" | "back"`.
  `takePending()` returns `{ spec, kind }`.
- `<VFXTransition pageKey>`: any children, a new key mounts them fresh.
  The keyed-child trigger is gone.
- `<TransitionIn>` and `useTransitionIn`: the page registers its spec at
  mount. Order: click > page > `types.back` under both > props
  (`resolveRunOpts`).
- `@vfx-js/react/next`: `usePathname()` as `pageKey`, plus
  `FrozenRouter`. `next` is an optional peer.
- Demos: Next pages use a client `<PageTransition preset>`, since
  presets with JS hooks can't cross from a Server Component. The header
  uses plain links; two `TLink`s stay as click overrides. Void puts
  `<TransitionIn>` in the shared page view and drops `setNextTransition`.
- `<VFXTransition>` fills the viewport height by default
  (`100dvh`, `overflow: hidden`); `fullscreen={false}` drops it. The
  demos pass it, since their header takes part of the viewport.
- Docs: `TRANSITION.md` React API rewritten.

Decisions from the discussion:

- **The page declares, the link overrides.** The old API tied a Link
  click to a global note and a keyed child; the two were linked only by
  a module store, and the entered page had no say. A page is reached
  from many links, from code and from back, so it is the right owner.
  The click spec stays as a per-link override.
- **`pageKey`, not `key`.** A `key` on `<VFXTransition>` remounts it,
  which destroys the controller and the old DOM before the snapshot.
  Not `id` either, since next to `className` and `style` it reads as the
  DOM id. The rendered page is keyed by `pageKey` internally, so pages
  of the same component type still remount and `<TransitionIn>`
  registers again. That remount also re-pins `FrozenRouter` in the Next
  adapter.
- **Timing.** The page spec is known only after React commits the new
  page, which is after the snapshot. Child layout effects run before the
  parent's, so the page registers its spec before the container resolves
  the swap. Core binds the shader after `cb` through the lazy `opts`
  function; `frag` was already bound at `start()`, so only driver
  effects and `prepare` moved.
- **Component and hook.** `page.tsx` in the Next App Router is a Server
  Component and cannot call hooks, so `<TransitionIn>` (a client
  component that renders nothing) is the form for pages, and
  `useTransitionIn` for client code. Server Components can only pass
  plain defs; presets with JS hooks need a client wrapper. Next has no
  API to export custom client settings from a page, and
  `metadata.other` as a `<meta>` carrier was considered and rejected as
  a hack.
- **`<VFXTransition>` stays required.** `<VFXProvider>` could be made
  optional because it only owns a global instance. `<VFXTransition>`
  owns the outlet element and the old page's lifetime in the React
  tree. Without it the router commits the new page before any snapshot;
  Next's `pushState` happens at commit, so neither the Navigation API
  nor a click gives a signal in time. The only way around is rendering
  the whole page through a canvas at all times (`keepWrapped` on the
  outlet plus a last-frame texture in core), which is a different
  runtime mode and is left out.
- **Fullscreen by default.** The target gets `height: 100dvh; overflow:
  hidden` unless `fullscreen={false}`. "Fill from my top edge to the
  viewport bottom" was considered and rejected: the demo's header above
  the outlet is incidental, and a measured offset adds a hydration
  step. Pages must scroll inside a viewport-bound box anyway: document
  scroll would mean page-tall textures and a snapshot showing the wrong
  part after the router scrolls to top. `fill` and `unstyled` were
  tried as names before `fullscreen`.
- **Back under the page spec.** `type: "back"` sits under the page spec,
  so a page with its own shader plays it reversed on back, and
  `types.back`'s shader is used only when the page sets none. This is
  what the browser pass showed; keep or flip in `resolveRunOpts` if the
  other reading turns out to be wanted.
- **Demos.** Nav links are plain `Link`s so the page specs are visible;
  two `TLink`s remain as click overrides. The Next getting-started
  snippet is `app/layout.tsx` plus `app/about/page.tsx`: the adapter is
  a client component, so no shell file and no CSS are needed.

Verified:

- Lint and `tsc --noEmit` in core and react.
- Vitest: core 267, react 51 (with render tests under happy-dom),
  transitions 25, react-vfx 2.
- `@vfx-js/react` build writes `lib/{esm,cjs}/next`; both resolve from
  Node.
- Next and Void demo builds pass.

Verified in the browser (Next demo on the dev server, Playwright,
shader programs traced through `useProgram`):

- Every page enters with its own shader: `/getting-started` swipe,
  `/transitions` pixelsort, `/` zoom, `/custom` glitch.
- A `TLink` click overrides the page spec (datamosh into `/transitions`).
- Back into `/` plays the page's own shader (zoom) with `reverse` 1,
  since the page spec sits on top of `types.back`. `types.back`'s
  shader is used only when the page sets none.
- datamosh and pixelsort run on the lazy path with no `[VFX-JS]` errors
  or warnings.

Not verified:

- Whether the chain swap after the snapshot shows a plain frame. Needs
  an eye on the screen, not a trace.

## Demo polish (plan8)

[plan8.md](./plan8.md). Done on `feat/transition`.

- Sidebar inside the outlet on doc pages (`DocSidebar`, null on `/`),
  with per-page section anchors from `site.ts`. Hidden under 900px.
- Plain `<h1>` titles replace `.doc-hero`.
- How it works opens with a before → run → after DOM figure; the old
  pipeline cards and the later wrap figure are gone.
- swipe, glitch, glitchSlide and the gl-transitions wrapper guard
  `inRange(uv)`, so a container `overflow` doesn't leak content.
- Playground drops `overflow: 48`; each preset uses its own.
- Custom editor: overlay highlight (`_components/highlight.ts`), Tab
  inserts two spaces.

Found in the browser pass, not in the plan:

- `ctx.blit` and the `uvSrc` / `uvContent` varyings follow the stage's
  rects. Under a padded stage, a blit into an element-sized RT squeezes
  the pad into the element, and a `uvContent` display stretches the
  edges. Datamosh and pixelsort now copy the content rect through
  `effects/src/_capture.ts` (`captureContent`, `copyRT`) and return
  transparent outside [0, 1].
- `jpegGlitch` preset added on `JPEGGlitchEffect`, whose readback now
  uses `captureContent` too.
- Same pattern, not fixed: `bad-jpeg.ts` samples `uvSrc` into low-res RTs and
  blits a content-only RT to the padded target. Only shows under a
  padded stage (a transition with `overflow`, or an effect with an
  `outputRect` before them).

Verified in the browser (Next demo, Playwright, 1280px and 390px):

- glitch, swipe up, datamosh, pixelsort stay inside the stage; with
  `overflow: 48` put back, datamosh and pixelsort fill the stage exactly
  with an empty pad.
- zoom and crosszoom spread past the stage with no hard edge.
- Custom editor: highlight, Tab, layers aligned, scroll sync.
- `/` → `/getting-started` lands with the sidebar in place; no console
  warnings.

## API review (plan9)

See [plan9.md](./plan9.md).

- Removed back navigation from `@vfx-js/react`. `resolveRunOpts` is now
  "click spec if any, else page spec".
- Added `ease` to the spec (run → container → def → `"smoothstep"`),
  with function eases.
- Transitions are effects: `TransitionDef = { name, ease?, create() }`,
  `TransitionEffect` with `start` / `end`, and `TransitionEffectContext`
  with `from`, `progress`, `holding`, `reverse`, `run`, `cut()`.
  `shaderTransition()` keeps one-shader authoring. All presets ported.
- Docs and the Next demo's custom page show the new API.
- Removed `types` / `type`. Levels are run, container, def. Run
  `uniforms` merge over the container's unless the run sets its own
  `transition`.

Verified in the browser (Next demo, Playwright): crossfade, swipe, zoom,
glitch, jpegGlitch, datamosh, pixelsort and gl-transitions Cube, forward
and reverse, no console errors. A broken shader logs once and cuts.

- Added `"use client"` to the `@vfx-js/react` and `@vfx-js/transitions`
  entries. A def holds functions, so it can't be a prop from a Server
  Component; as a client reference it can. Server pages can use
  `<TransitionIn transition={glitch} />` again (Next demo, Playwright).
  - Kept `<TransitionIn>`: page-level config stays in `page.tsx`.
  - Rejected: picking the spec by pathname in a client shell (config
    leaves the page), and plain-data shader defs (two def shapes, and
    effect defs still need a client file).
  - Own defs and factory calls like `createSwipe()` go in a
    `"use client"` file. Core has no directive, so Next users import
    `crossfade` from `@vfx-js/transitions`.
  - Before this, importing `@vfx-js/react` from a Server Component
    failed on `createContext`.
- Getting Started (Next demo): removed the steps list, moved the
  fixed-size note to the core-based tabs, and made the setup tabs size
  to their content with a CSS fade (0.1 s out, 0.5 s in with a 10 px
  slide).

Not verified in a browser: the rewritten Custom page, the broken-shader
cut timing, and the SvelteKit / Nuxt / Astro back specs.

Release note: `@vfx-js/transitions` now imports `shaderTransition` from
core at runtime. Raise its `@vfx-js/core` peer range to the release that
ships it.

## Demo polish: hero, header, Playground

Home hero (`_components/hero-stage.tsx`):

- The hero is its own `useVFXTransition` target. Each preset sets three
  things, by its index in the preset list:
  - `data-palette`: normal, orange, purple, green, in that order. Each
    color is white frosted glass: a near-white background, a large
    blurred glow of the color, and a white veil over it. The ink stays
    dark; only the accent changes.
  - `data-pattern`: dots, grid, diagonal, contour, sine. The pattern
    covers the whole hero; only the color glow is a soft circle.
  - `data-theme`: the title word's font, for some presets.
  - Layers, back to front: glow, veil (`::before`), pattern (`::after`
    or the contour canvas).
  - Rejected: one Sanzo Wada color per preset (looked off; the target
    was a frosted look), strong backgrounds, and swapping the title
    word every 500 ms.
- Contour lines are animated simplex noise, drawn by a second VFX-JS
  instance (`contour-canvas.tsx`, shader in `_lib/contour.ts`).
  - `wrapper` puts its canvas inside the hero, so the html-in-canvas
    capture of a run includes it.
  - `scrollPadding: false` makes the canvas `position: fixed`, which
    matches the viewport-based element rects. With the default, the
    canvas moves with the hero inside `.frame` while the rects move
    too, so the lines drift at twice the scroll speed.
  - It plays only while the contour pattern is on, and calls
    `render()` on switch so the capture has a frame.
  - Tried first: a static SVG `feTurbulence` filter (stair-stepped from
    8-bit noise), a generated contour SVG tile (fine but static), and
    raw WebGL2 (worked, but needed a `biome-ignore` for
    `gl.useProgram`, which the React hook rule misreads).
- A preset carousel sits under the title. It is a native horizontal
  scroll with 5 copies of the list, and it jumps back to the middle copy
  when scrolling stops. Chevrons scroll by half its width.
- A click blinks the label for 0.3 s, then runs the preset; the list is
  already centered on it when the run lands. Autoplay steps every 3 s
  and stops on any touch or scroll.
- Hover grows the item with `scale` (not `font-size`, which moved the
  neighbors) and adds a glass background. Edge fades use a scroll-driven
  animation, because a mask on the list stops `backdrop-filter`.
- Tried and dropped: sliding the carousel during the run. The new side
  is live, but smoothstep presets show it at ~8% for the first 0.2 s, so
  the slide was invisible on half the presets. A play hook on the def
  worked but was only needed for that.
- Removed the `npm i` line from the hero.

Header and docs layout:

- The header floats over the outlet (z-index above the VFX-JS canvas).
  It is clear while the home hero is under it, white once scrolled past.
  The hero sets `data-header="clear"` on `<html>`.
- `DocSidebar` keeps its pathname from mount. `FrozenRouter` in
  `@vfx-js/react/next` freezes `LayoutRouterContext` only, so
  `usePathname()` in the old page already gave the new path and the
  sidebar showed before the snapshot.
- The sidebar links to the Playground, outside `nav`.

Playground (`app/playground/`):

- Right column tabs: Presets, Edit, gl-transitions. Presets lists our
  examples and presets; gl-transitions has an intro (credit, count, a
  `createGLTransition` example) and shows each author. Edit shows the
  author, license and a link for gl-transitions sources.
- The stage is a small web page (`lab-scene.tsx`): heading, text, SVG
  shapes and CSS animation, in two layouts that alternate. Its padding
  is in percent; `cq` units on the container itself read the viewport.
- Page and panels use `#202028`.

Core fix (`html-in-canvas.ts`, `still-clone.ts`):

- Wrapping restarted the element's CSS animations. In Chrome 157,
  `moveBefore` into a parent inserted in the same task restarts them; a
  style flush on the new canvas first keeps them running.
- The still clone holds each CSS animation at the original's time,
  paired by element, pseudo-element and name.

Verified in the browser (Next demo, Playwright, 1280px and 375px):

- Carousel scroll, wrap, blink, autoplay stop, hover; layout never moves
  across themes.
- Palettes and patterns; the contour canvas animates, shows in a run's
  capture, and stays inside the hero when `.frame` scrolls.
- Header clear and white states, and stays above runs.
- top → docs with no sidebar flash.
- CSS animation time keeps going through a run (1526 → 3034 ms); the
  clone matches the original.

Not done:

- `FrozenRouter` should also freeze `PathnameContext`. Any app that
  calls `usePathname()` in the outlet hits the sidebar bug.
- No changeset yet for the core animation fix.
- The clone animation sync has no test; jsdom has no `getAnimations`.
- "Started by Gaëtan Renaudeau" in the gl-transitions intro is not
  checked against a source.

## New presets: lensDistortion, slitScan, pixelScan, pixelStretch, tile

All are one `shaderTransition` each, in `packages/transitions/src/`.
All return transparent outside the element, so a container overflow
shows nothing extra.

- `lensDistortion` / `createLensDistortion({ strength, dispersion })`:
  `p *= 1 - length(p) * s`, with `p` centered and y in [-1, 1]. At the
  peak the center is magnified and the edges fold back into it. The
  first half grows a full-strength warp out from the center in a soft
  circle; the second half relaxes it with `sin(πt)`. Dispersion: 12
  taps with `s` spread by ±`dispersion` (default 0.6), each tap
  weighted by its place in the spectrum. Reads past the edge mirror.
  Crossfade over t 0.35–0.65.
- `slitScan`: ported from the docs logo shader. Prev smears into columns
  left to right (t 0–0.48), a quick crossfade joins the two fully
  smeared states (0.48–0.52), then next draws out of its own columns
  (0.52–1). RGB lag 0 / 0.2 / 0.4.
- `pixelScan`: ported from `examples/works/pixel-scan.html`. A front of
  glowing cells sweeps left to right and swaps prev for next behind it.
  The `t` range is widened so the front and glow are fully off the
  element at t=0 and t=1. Glow uses the max alpha of both sides at the
  cell center (no mip reads).
- `pixelStretch`: prev stretches into vertical streaks from the top
  down (t 0–0.4), crossfades to next stretched the same way (0.4–0.6),
  then next settles from the top down (0.6–1). Uses the smin / smax of
  the Figma Pixel Stretch effect to round the corner.
- `tile` / `createTile({ direction, shape, count })`: prev splits into
  tiles that shrink to their centers and show next. `shape`: `hex`
  (default) or `square`. `direction`: `center` (rings out, default),
  `left`, `right`, `up`, `down`; it is the way the wave travels, so
  `up` starts at the bottom. `count` is tiles along the longer side
  (default 12). Tiles shrink over 40% of the run, delayed by up to 60%.

Wired into the demo preset list and hero labels, storybook
(`tileUp`, `tileSquare`), `docs/TRANSITION.md` and the preset tests.

Verified: each shader compiles in WebGL2 and was rendered at fixed `t`
(0 to 1) with two test textures in Playwright. t=0 shows prev and t=1
shows next exactly.

Not done:

- Not yet seen in the real demo or storybook; values are tuned on
  stills only.
- No hero CSS theme (font) for the new presets.
- `slitScan`, `pixelScan` and `pixelStretch` have no direction option.

## Slides: show() on the handle

From [plan10.md](./plan10.md). `run(cb)` fits routers, which build the
new content on the fly. It did not fit tabs, carousels or steps, where
every slide is already in the DOM. The old Core example also called an
undefined `renderTab`.

Model:

- A container and its **direct children** as slides. No marker attribute.
  Controls go outside the container.
- One slide shows at a time. The others carry `hidden`, which needs no CSS.

Core API:

- `TransitionHandle.show(slide, opts?)`. `SlideRef = HTMLElement | number
  | string`: an element, an index into the children, or a selector.
  `ShowOpts = RunOpts & { remove?: boolean }`.
- A missing or nested target throws a `TypeError` before any run.
- A detached element is appended to the container first.
- The slide already shown alone resolves at once, with no run. The check
  is skipped while a run is in flight, since that run may still change
  the slides.
- `remove: true` removes the other slides instead of hiding them. It is
  stripped before the run, so it never reaches the spec.
- `show` is built on `run(cb, opts)`; `run` stays the primitive.
- Renamed the `Transition` interface to `TransitionHandle`: it is the
  per-element controller, and the name clashed with `<Transition>`
  components. Shipped without an alias, since `addTransition` is
  unreleased. The class keeps the name `TransitionController`.

React: the bindings use `run` only. React owns the children, so toggling
`hidden` from core would fight it. Only the type imports changed.

Storybook: the Tabs story renders all pages up front as `<section>`s
(all but the first `hidden`) and switches with `show(index)`.

Docs and demo: the tabs example (`#panel` with three `<section>`s,
buttons with `data-panel`, `t.show(tab.dataset.panel!)`) replaces the
`renderTab` / `renderNextTab` snippets in `docs/TRANSITION.md`, the
landing page's Vanilla tab and the Vanilla getting-started section.
`docs/TRANSITION.md` documents `show`, `SlideRef`, `ShowOpts` and the
`hidden` trap: a user `display` rule beats `hidden`, so add
`[hidden] { display: none !important }` or use `remove: true`. The
SvelteKit, Nuxt and Astro snippets stay on `run`. How it works: the Swap
step says `show(slide)` writes the callback for you.

Tests (`transition.test.ts`, fake host plus a small fake DOM): `show`
hides the others after the snapshot; index and selector resolve; missing
or non-child targets throw before a run; a detached slide is appended;
`remove: true` removes the others; the shown slide starts no run;
`ShowOpts` reach the run (`reverse`).

Not done:

- No per-slide default spec in core (the `<TransitionIn>` equivalent).
  Could be a spec map on the handle later.
- The SvelteKit and Nuxt demos got the type rename but were not
  type-checked.
- `show()` has not run in a real browser yet. The storybook Tabs story
  was not run either.
