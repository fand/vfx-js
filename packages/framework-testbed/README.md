# Framework testbed

Small apps to check VFX-JS with each framework's router, SSR and hydration.
They are not deployed.
The public transitions site lives in `packages/docs-transitions/`.

| App | Dev server | Port |
| --- | --- | --- |
| Astro (ClientRouter) | `pnpm --filter @vfx-js/testbed-astro dev` | 5002 |
| Nuxt | `pnpm --filter @vfx-js/testbed-nuxt dev` | 5003 |
| SvelteKit | `pnpm --filter @vfx-js/testbed-sveltekit dev` | 5004 |
| Void | `pnpm --filter @vfx-js/testbed-void dev` | 5005 |
| Vue Router | `pnpm --filter @vfx-js/testbed-vue-router dev` | 5006 |

`pnpm run dev:testbed` from the root starts all five, plus watchers for core, the bindings and the transitions.

`shared/` holds the pages, presets and styles the apps share.
The presets are Swipe and Zoom, so a reversed run is easy to spot.

The Vue Router app is a `keepPlaying` demo instead. It has a `keepPlaying` checkbox and a 3-second Crossfade, and each page shows a CSS animation and a Vue clock. With `keepPlaying`, the old page's animation keeps playing during the run, but its clock stops, since Vue has unmounted it. Use a browser with HTML-in-Canvas (`chrome://flags/#canvas-draw-element`), or both look the same.

Each app has a `typecheck` script.
The Astro one checks `.ts` files only, not `.astro` files.

Builds use `build:demo`, so the root `pnpm run build` and CI skip them.
