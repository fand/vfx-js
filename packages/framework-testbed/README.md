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

`shared/` holds the pages, presets and styles the apps share.

Each app has a `typecheck` script.
The Astro one checks `.ts` files only, not `.astro` files.

Builds use `build:demo`, so the root `pnpm run build` and CI skip them.
