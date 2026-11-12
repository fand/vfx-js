---
"@vfx-js/core": minor
"@vfx-js/react": minor
"@vfx-js/astro": minor
---

Support `keepPlaying` in `<VFXTransition>` for React (Next.js, React Router) and Astro.

- `ctx.keepPlaying(nodes, onReturn)` puts the nodes back when the run ends, for nodes a framework still owns.
- React: with `keepPlaying`, the old page stays mounted during the run. Each page then sits in a `display: contents` div.
- Astro: `keepPlaying` works on `<VFXTransition>`, `<TransitionIn>` and link specs. Old islands unmount when the run ends.
