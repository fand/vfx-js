---
"@vfx-js/react": minor
"@vfx-js/vue": minor
"@vfx-js/svelte": minor
"@vfx-js/astro": minor
"react-vfx": patch
---

Move `@vfx-js/core` to `peerDependencies`, so apps load only one copy of core.
Install `@vfx-js/core` with the binding: `npm i @vfx-js/core @vfx-js/react`.
