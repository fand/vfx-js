---
"@vfx-js/vue": minor
"@vfx-js/svelte": minor
---

Support `keepPlaying` in `<VFXTransition>` for Nuxt and SvelteKit.

- Nuxt: gives `<NuxtPage>` a page transition that hands the leaving page to core.
- SvelteKit: wraps pages in `{#key}` on the pathname, and the leaving page's outro lasts until core gives it back.
