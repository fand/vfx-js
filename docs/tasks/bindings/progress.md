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

- Open the PRs (one per package, per plan2.md).
- Getting Started tabs for Nuxt and SvelteKit, once the page has them.

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
