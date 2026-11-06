---
"@vfx-js/transitions": minor
---

**Experimental.** The transition API may change in minor releases.

New package with transition presets for `addTransition`.

`createGLTransition(entry, params?)`: use a shader from gl-transitions as a transition.

Presets without `overflow` (and gl-transitions) stay inside the element when the container sets `overflow`.

`jpegGlitch` / `createJpegGlitch`: hard cut through a real JPEG glitch, built on `JPEGGlitchEffect`.

The entry is a `"use client"` module, so a Next.js Server Component can pass presets as props.
