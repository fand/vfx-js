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

## Next

- `@vfx-js/svelte` + `/sveltekit`.
