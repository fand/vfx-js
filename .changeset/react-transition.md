---
"@vfx-js/react": minor
---

`VFXTransition`, `useVFXTransition`, `transition()`, `setNextTransition()`.

- `<VFXTransition pageKey>`: a new `pageKey` starts a run and mounts the children fresh. Children can be anything. The target fills the viewport height unless `fullscreen={false}`.
- `<TransitionIn>` and `useTransitionIn(spec)`: the incoming page sets how it enters. A click spec still wins.
- `@vfx-js/react/next`: `VFXTransition` for the Next.js App Router. `next` is an optional peer dependency.
- The package entry is a `"use client"` module, so Server Components can import `<TransitionIn>`.
