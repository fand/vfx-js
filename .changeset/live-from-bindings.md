---
"@vfx-js/core": minor
"@vfx-js/react": minor
"@vfx-js/astro": minor
---

Support `liveFrom` in `<VFXTransition>` for React (Next.js, React Router) and Astro.

- `ctx.keepPrev(nodes, onReturn)` puts the nodes back when the run ends, for nodes a framework still owns.
- React: with `liveFrom`, the old page stays mounted during the run, and each page sits in a `display: contents` div.
- Astro: `liveFrom` works on `<VFXTransition>`, `<TransitionIn>` and link specs.
