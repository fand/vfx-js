---
name: vfx-js
description: Add WebGL shader effects and page transitions to websites with VFX-JS (@vfx-js/core, @vfx-js/react, @vfx-js/effects, @vfx-js/transitions). Use when a site needs visual effects on images, videos or text (glitch, RGB shift, pixelate, bloom, halftone, particles...), animated tab, carousel or page transitions, or when writing custom GLSL effects or transitions for VFX-JS.
---

# VFX-JS

VFX-JS renders HTML elements (`<img>`, `<video>`, text, any element) through WebGL shaders.
The element keeps its place in the layout.
VFX-JS draws the effect on one canvas over the page and hides the original element.

Docs: https://amagi.dev/vfx-js/ · Examples: https://amagi.dev/vfx-js/examples · Transition demo: https://amagi.dev/vfx-js-transitions/

## Packages

| Package | Use it for |
| --- | --- |
| `@vfx-js/core` | The `VFX` class. Shader presets, custom shaders, the Effect API, `addTransition`. |
| `@vfx-js/react` | React components (`VFXImg`, `VFXVideo`, `VFXSpan`, `VFXDiv`, `VFXP`) and `<VFXTransition>`. |
| `@vfx-js/effects` | Prebuilt `Effect` classes (`BloomEffect`, `PixelateEffect`, ...). |
| `@vfx-js/transitions` | Transition presets (`Swipe`, `Glitch`, `Zoom`, ...). Experimental. |

## Pick the right API

| Goal | Use | Read |
| --- | --- | --- |
| Quick effect on an element | `vfx.add(el, { shader: "glitch" })` | below |
| Your own one-pass shader | `vfx.add(el, { shader: glslString })` | [references/shader.md](references/shader.md) |
| Multi-pass, feedback, simulation | `shader: VFXPass[]` | [references/shader.md](references/shader.md) |
| Prebuilt effects, chains, or reusable effect classes | `vfx.add(el, { effect })` | [references/effects.md](references/effects.md) |
| Effect over the whole page | `new VFX({ postEffect })` | [references/shader.md](references/shader.md) |
| Tabs, carousels, page transitions | `vfx.addTransition(el)` / `<VFXTransition>` | [references/transitions.md](references/transitions.md) |
| Your own transition | `class X extends ShaderTransition` | [references/transitions.md](references/transitions.md) |

## Quick start

```bash
npm i @vfx-js/core
```

```ts
import { VFX } from "@vfx-js/core";

const vfx = new VFX();
const img = document.querySelector("img")!;
await vfx.add(img, { shader: "rgbShift" });
```

Shader presets: `uvGradient`, `rainbow`, `glitch`, `rgbGlitch`, `rgbShift`, `shine`, `blink`, `spring`, `duotone`, `tritone`, `hueShift`, `sinewave`, `pixelate`, `halftone`, `invert`, `grayscale`, `vignette`, `chromatic`.
Presets that animate in when the element enters the viewport, and out when it leaves: `slitScanTransition`, `warpTransition`, `pixelateTransition`, `focusTransition`.

Without a bundler:

```html
<script type="module">
  import { VFX } from "https://esm.sh/@vfx-js/core";
  const vfx = new VFX();
  vfx.add(document.querySelector("img"), { shader: "glitch", overflow: 100 });
</script>
```

### Common `vfx.add` options

```ts
vfx.add(el, {
    shader: "glitch",          // preset name, GLSL string, or VFXPass[]
    uniforms: {                // values for your shader; a function runs every frame
        amount: 0.5,
        scroll: () => window.scrollY,
    },
    overflow: 100,             // draw outside the element: px, [top, right, bottom, left], or true (fullscreen)
    overlay: true,             // keep the original element visible (default hides it)
    zIndex: 0,                 // draw order inside the canvas
    wrap: "clamp",             // texture wrap: "repeat" (default) | "clamp" | "mirror"
    intersection: { threshold: 0.5 },
});
```

### `VFX` methods

- `add(el, props)` → `Promise<void>`. Start rendering an element.
- `addHTML(el, props)` → render any HTML subtree, with live updates (html-in-canvas, Chrome only, falls back to a slower capture).
- `remove(el)`, `update(el)` (re-capture after the content changes), `updateEffects(el, effects)`.
- `addTransition(el, opts)` → `TransitionHandle`. See [references/transitions.md](references/transitions.md).
- `play()`, `stop()`, `render()`, `destroy()`, `setTime(t)`, `timeScale`.

`new VFX(opts)` options: `pixelRatio`, `zIndex`, `autoplay`, `scrollPadding`, `wrapper`, `postEffect`, `preserveDrawingBuffer`, `timeScale`.

## React

```bash
npm i @vfx-js/react
```

```tsx
import { VFXImg, VFXSpan, VFXVideo } from "@vfx-js/react";

<VFXImg src="cat.png" shader="rgbShift" />
<VFXVideo src="clip.mp4" autoPlay muted loop playsInline shader="halftone" />
<VFXSpan shader="rainbow">Hello</VFXSpan>
```

- Every `vfx.add` option is a prop (`shader`, `effect`, `uniforms`, `overflow`, ...).
- No provider is needed. Components share one canvas. Set its options with `useVFXConfig({ pixelRatio, zIndex, postEffect })`.
- Use `<VFXProvider>` only for a separate canvas (e.g. a `wrapper`), and `VFXContext` to get the `VFX` instance.
- The package is `"use client"`. In Next.js App Router, use the components from a client component or directly in a Server Component (they cross as client references). Pass only serializable props from a Server Component: preset names, GLSL strings, plain uniforms.

## Rules and pitfalls

- Browser only. `new VFX()` throws without `window`, and throws when WebGL is not available. Create it in client code (`useEffect`, `onMount`, `"use client"`), and wrap it in `try` / `catch` so the page still works as plain HTML.
- Make one `VFX` instance per page and reuse it.
- `add` is async. `await` it before you call `updateEffects` or `remove` on the same element.
- Text and plain elements are captured once. Call `vfx.update(el)` after their content changes, or after you change `img.src`.
- Images and videos from another origin need CORS (`crossorigin="anonymous"` and a server that allows it), or WebGL cannot read them.
- `VFXSpan` captures text only. Put links and other child elements outside it.
- Custom shaders default to GLSL ES 3.0. Write `out vec4 outColor;` and `texture()`, not `gl_FragColor` / `texture2D`. VFX-JS adds `#version 300 es` for you.
- A custom shader draws only inside the element unless you set `overflow`.
- `shader` and `effect` are mutually exclusive. `overflow` is ignored with `effect`; use `outputRect` instead.
- Never share one `Effect` instance between elements. Make a new one per element.
- Respect `prefers-reduced-motion`: skip `vfx.add` or use a still effect when it matches.
- Lower `pixelRatio` (e.g. `new VFX({ pixelRatio: 1 })`) if it runs slowly on high-DPI phones.

## Debugging

- A `shader` that fails to compile makes `vfx.add` reject with the GL error log and the full source. Catch and log it: `vfx.add(el, opts).catch(console.error)`.
- A transition shader that fails logs the error with line numbers in your `frag`, then cuts to the new content.
- A blank element usually means: the shader failed, the image is CORS-blocked, or the element has zero size.
- Test effects in a real browser (e.g. with Playwright and a screenshot). Headless browsers need WebGL enabled.
