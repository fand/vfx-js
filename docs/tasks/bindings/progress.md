# Progress: bindings

See [plan2.md](./plan2.md).

## Done: `@vfx-js/vue`

- `packages/vue/`: tsc dual build, like `@vfx-js/react`.
  - `.`: `transition`, `setNextTransition`, `useTransitionIn`.
  - `./nuxt`: `VFXTransition`.
- `transition-demo/nuxt` uses the package. The plugin is gone.
- README, changeset (minor, so `0.1.0`), `CLAUDE.md`.

## Checked

- 18 tests pass (`src/nuxt.test.ts`, happy-dom, core mocked). Lint and
  build pass.
- The Nuxt demo, `nuxt dev` and `nuxt generate`:
  - SSR renders the two divs. No `build.transpile` needed.
  - In Playwright's Chrome (dom-to-canvas fallback): link, back,
    forward, and a click during a run. Only one canvas. The old page
    stays on screen until the new one is in.
  - Gallery images come from outside and are blocked in the sandbox,
    so the snapshot from Gallery is slow (about 1 s). Not from the
    binding.
- Shader output not checked by eye.

## Changes from the plan

- No `nuxt/app` or `vue-router` import. The router is
  `app.config.globalProperties.$router` and the Nuxt app is `app.$nuxt`,
  which is what `useNuxtApp()` reads. A second copy of either package
  in a bundle can't break it. Open question "can a package import
  `nuxt/app`" is moot.
- `.` has no plain `VFXTransition`. Vue can't keep the old page's slot
  on screen the way React keeps old children, so a `pageKey` version
  needs more thought. Nuxt holds the navigation instead.
- The scope does the spec order (`pick(back)`), so the router glue
  stays short.
- No `pixelRatio` / `zIndex` props. The VFX is shared and made with
  defaults, as React does without `useVFXConfig`.
- Getting Started has no Nuxt tab on this branch, so it was not
  touched.

## Done: `@vfx-js/svelte`

- `packages/svelte/`: built with `svelte-package`, ESM only. Ships the
  `.svelte` file with `lang="ts"`; Svelte 5 compiles it as is.
  - `.`: `transition` (an attachment), `setNextTransition`, `transitionIn`.
  - `./sveltekit`: `VFXTransition`.
  - Peers: `svelte ^5.29`, `@sveltejs/kit ^3` (optional).
- `transition-demo/sveltekit` uses the package.
- README, changeset (minor, so `0.1.0`), `CLAUDE.md`.

## Checked (svelte)

- 16 tests pass (`src/sveltekit.svelte.test.ts`, happy-dom, core
  mocked, `$app/navigation` aliased to `src/test/app-navigation.ts`).
  biome and `svelte-check` pass. Build passes.
- The SvelteKit demo, `vite dev` and `vite build`: SSR renders the two
  divs. In Playwright's Chrome: link, back, forward, and a click during
  a run. Only one canvas. The old page stays on screen until the new
  one is in.

## Fixed along the way

- The root `.gitignore` had `lib/`, so the SvelteKit demo's
  `src/lib/PageView.svelte` was never committed, and the demo did not
  build from a clean checkout. Added `!**/src/lib/` and recreated the
  file from the Nuxt one. The same rule would have hidden
  `packages/svelte/src/lib/`.

## Differences from the old demo glue

- Forward through history (popstate, `delta > 0`) used the target
  page's preset. Now it uses the page spec or the props, like any
  navigation without a link spec. Same in Nuxt.

## Next

- One PR for both packages: #226 (transitions, element effects,
  Storybook stories).
- Getting Started: Nuxt, Vue and SvelteKit tabs added. Not checked in a
  browser.
- Astro: try the open questions in plan.md first.
- `VFXCanvas`: done, see below.
- Config API for Vue and Svelte: done, see below.
- Router subpaths: done, see below.
- Not checked: the html-in-canvas path, Chromatic for the new stories.

## Done: element effects

See [plan3.md](./plan3.md).

- `element.ts` in each package: `bindElement(el)` and `updateElement(el)`.
  Same diff and queue as React. Copied, no core change.
- Vue: `vVfx` directive, with `getSSRProps`.
- Svelte: `vfx(props | () => props)` attachment in `attachment.svelte.ts`.
  `svelte-package` emits it as `.svelte.js`, so `$effect` still works.
- Both demos: `rgbShift` on the About `<h1>`, through a PageView prop.
- READMEs, changesets (minor), `CLAUDE.md`.

## Checked (element effects)

- Tests: vue 32 (14 new), svelte 34 (18 new). Lint and build pass.
- Nuxt and SvelteKit dev, in Playwright's Chrome:
  - `/about` loaded directly: heading has the effect, one canvas,
    no errors.
  - No update loop: no mutations on the `<h1>` over 3 s, no long frames.
  - Home → About → Home → About by link, then back and forward: each
    run shows a second canvas mid-run and one after. The effect comes
    back on About. No errors.
- Demo `build:demo` passes for both.

## Changes from the plan (element effects)

- The observer also watches `childList`. Vue sets element text with
  `textContent`, which is not a characterData change.
- `releaseVFX()` runs after the queued remove, not right away. A slow
  add can't outlive the VFX.
- `peekVFX()` added to each `vfx.ts`, for `updateElement`.

## Done: router subpaths

See [plan4.md](./plan4.md).

- `@vfx-js/vue/router`: `VFXTransition` for vue-router without Nuxt.
  The new page is in after `afterEach` plus `nextTick`.
  - Shared glue moved to `connect-router.ts`; `/nuxt` uses it too.
- `@vfx-js/react/react-router`: renders `useOutlet()` with the pathname
  as `pageKey`. Peer `react-router ^7` (optional), devDep 7.18.5.
- Storybook: "Transition/Vue" uses a real vue-router
  (`createMemoryHistory`). New "Transition/React Router".
- READMEs, `docs/TRANSITION.md`, Getting Started (React tab uses the
  subpath, new Vue tab), changesets.

## Checked (router subpaths)

- Tests: vue 44 (12 new for the router), react 51 (4 new). Lint and
  build pass. `nuxt.test.ts` unchanged.
- The React test fails with `<Outlet />` in place of `useOutlet()`: the
  kept page shows the new route.
- Storybook in Playwright's Chrome: both stories run on each Next, with
  two canvases mid-run and one after. Switching between stories leaves
  one canvas. No errors.

## Changes from the plan (router subpaths)

- The first navigation (`from.matched` empty) does not run. A plain Vue
  app mounts `<VFXTransition>` before vue-router's first navigation
  ends, so `/about` loaded directly would transition from nothing.
- React props type keeps `AddTransitionOpts<T>` like `/next`, so
  `params` stays typed per transition class.

## Done: `VFXCanvas`

See [plan5.md](./plan5.md).

- `element.ts` (both): `bindElement(el, { capture })` sets up the
  html-in-canvas capture, adds with it, and re-adds with the latest one.
  Files differ only in the log prefix.
- Vue `VFXCanvas` (`canvas.ts`) with `v-model:element`; Svelte
  `VFXCanvas.svelte` with `bind:element`. Both give the element the
  effect is on: `null`, then the `<canvas>` or the `<div>`, then `null`
  after unmount. Never the `<div>` before the `<canvas>`.
- Both render the `<div>` first and switch to the `<canvas>` after mount.
  The `<div>` is never bound when html-in-canvas is supported.
- Storybook: "Effect/Vue › Canvas" and "Effect/Svelte › Canvas"
  (CRT Bloom, with an `<input>`).
- READMEs, `docs/html-in-canvas.md`, changesets.

## Checked (`VFXCanvas`)

- Tests: vue 64, svelte 54 (unit, plus SSR with `vue/server-renderer`
  and `svelte/server`). Lint and build pass.
- Storybook in Chrome for Testing (Playwright's Chromium build):
  - With `--enable-blink-features=CanvasDrawElement`, html-in-canvas is
    on. Both stories render the `<canvas>`, the effect shows, typed text
    shows in the texture, one VFX canvas, no errors.
  - Without the flag: the `<div>` fallback. Same checks pass.
  - Story switching between the Vue and Svelte stories leaves one
    canvas. React stories leave their canvas behind; they never unmount.

## Fixed along the way (`VFXCanvas`)

- Vue: the fallback `<div>` was bound twice (from `onMounted` and the
  `el` watcher), so two controllers added the same effects. Now one
  `sync()` binds only when the element changes. The test checks one add.

## Done: config API

See [plan6.md](./plan6.md).

- `vfx.ts` (both, same file except the log prefix): `attachVFX`,
  `setConfig`, `clearConfig`, `peekVFX`. A config change detaches every
  consumer, replaces the VFX, and attaches them again.
- Consumers: `bindElement` (`v-vfx`, `vfx()`, `VFXCanvas`) and both
  `VFXTransition`s attach through `attachVFX`. The html-in-canvas
  capture keeps running across a replace.
- Vue `useVFXConfig(config | ref | getter)`, Svelte
  `vfxConfig(config | getter)`, and the `VFXConfig` type.
- Vue `useVFXInstance()` (a shallow ref), Svelte `vfxInstance()`
  (`.current`): the shared VFX for `autoplay: false`. The store notifies
  on create, replace and destroy. Reading does not keep the VFX alive.
- Storybook: "Effect/Vue › Config" and "Effect/Svelte › Config".
- READMEs, changesets, comparison page.

## Checked (config API)

- Tests: vue 82, svelte 71 (15 new each, 4 of them for the instance
  getter). Lint and build pass.
- Storybook in Chrome for Testing: pixelRatio 1 → 2 → 1 and zIndex
  default → -1 → default each give one canvas with the new size and
  z-index, and the effects stay. Four fast toggles end with one canvas.
  Transition stories still run (html-in-canvas and fallback). No errors.

## Changes from the plan (config API)

- `bindElement` reads the latest props when an op runs, not the props
  of each update. Fast changes a → b → c now apply as a → c.
- The warning for two config owners has the same text in both packages,
  so the store files stay the same.
- Svelte `$state` proxies a `postEffect` object again on each assign,
  so it counts as a new one. The README says to keep it out of `$state`.
