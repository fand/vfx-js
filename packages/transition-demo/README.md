# Transition demos

Demos of `@vfx-js/transitions` with each framework's router.

- `next/` is the public demo site, deployed to amagi.dev/vfx-js-transitions.
- The others are for checking the router glue locally. They are not deployed.

| Demo | Dev server | Port |
| --- | --- | --- |
| Next.js (App Router) | `pnpm --filter @vfx-js/transition-demo-next dev` | 5001 |
| Astro (ClientRouter) | `pnpm --filter @vfx-js/transition-demo-astro dev` | 5002 |
| Nuxt | `pnpm --filter @vfx-js/transition-demo-nuxt dev` | 5003 |
| SvelteKit | `pnpm --filter @vfx-js/transition-demo-sveltekit dev` | 5004 |
| Void | `pnpm --filter @vfx-js/transition-demo-void dev` | 5005 |

`shared/` holds the pages, presets and styles the non-Next demos share.

Each demo has a `typecheck` script.
The Astro one checks `.ts` files only, not `.astro` files.

Builds use `build:demo`, so the root `pnpm run build` and CI skip them.
