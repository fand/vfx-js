---
name: vfx-js
description: Add WebGL shader effects and page transitions to websites with VFX-JS (@vfx-js/core, @vfx-js/react, @vfx-js/vue, @vfx-js/svelte, @vfx-js/astro, @vfx-js/effects, @vfx-js/transitions). Works with plain JS, React, Next.js, React Router, Vue, Nuxt, Svelte, SvelteKit and Astro. Use when a site needs visual effects on images, videos or text (glitch, RGB shift, pixelate, bloom, halftone, particles...), animated tab, carousel or page transitions, or when writing custom GLSL effects or transitions for VFX-JS.
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
| `@vfx-js/react` | React components (`VFXImg`, `VFXVideo`, `VFXSpan`, `VFXDiv`, `VFXP`, `VFXCanvas`) and `<VFXTransition>`. Subpaths `/next`, `/react-router`. |
| `@vfx-js/vue` | Vue directive `v-vfx`, `VFXCanvas`, and `<VFXTransition>` from `/nuxt` or `/router`. |
| `@vfx-js/svelte` | Svelte 5 attachment `vfx`, `VFXCanvas`, and `<VFXTransition>` from `/sveltekit`. |
| `@vfx-js/astro` | Astro components (`VFXImg`, `VFXVideo`, `VFXSpan`, `VFXDiv`, `VFXP`), `<VFXTransition>`, `<TransitionIn>`. `registerVFX` from `/client`. |
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
Scroll reveal presets animate in when the element enters the viewport, and out when it leaves: `slitScanReveal`, `warpReveal`, `pixelateReveal`, `focusReveal`.
The old names (`slitScanTransition`, `warpTransition`, `pixelateTransition`, `focusTransition`) still work.

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
    intersection: { threshold: 0.5, duration: 1 }, // enter/leave timing; see references/shader.md
});
```

### `VFX` methods

- `add(el, props)` → `Promise<void>`. Start rendering an element.
- `addHTML(el, props)` → render any HTML subtree, with live updates (html-in-canvas, Chrome only, falls back to a slower capture). Check support with `supportsHtmlInCanvas()`.
- `remove(el)`, `update(el)` (re-capture after the content changes), `updateEffects(el, effects)`.
- Video and GIF update every frame. A `<canvas>` is copied once on `add`; call `update(canvas)` after you draw to it.
- `addTransition(el, opts)` → `TransitionHandle`. See [references/transitions.md](references/transitions.md).
- `play()`, `stop()`, `render()`, `destroy()`, `setTime(t)`, `timeScale`.

`new VFX(opts)` options: `pixelRatio`, `zIndex`, `autoplay`, `scrollPadding`, `wrapper`, `postEffect`, `preserveDrawingBuffer`, `timeScale`.

## React

```bash
npm i @vfx-js/core @vfx-js/react
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
- `<VFXCanvas shader="rainbow">...</VFXCanvas>` renders any markup, form controls included. With SSR it renders a `<div>` first and switches to `<canvas>` after hydration, so its children mount again once.

## Vue and Nuxt

```bash
npm i @vfx-js/core @vfx-js/vue
```

```vue
<script setup lang="ts">
import { vVfx } from "@vfx-js/vue";
</script>

<template>
    <img v-vfx="{ shader: 'rgbShift' }" src="cat.png" />
    <h1 v-vfx="{ shader: 'glitch', overflow: 30 }">Hello</h1>
</template>
```

- The value is `VFXProps`. `null` / `undefined` means no effect. Register it globally with `app.directive("vfx", vVfx)`.
- `VFXCanvas` renders any markup into a shader. `v-model:element` gives the element the effect is on.
- `useVFXConfig({ pixelRatio, zIndex, postEffect, autoplay })` in `setup` sets the shared canvas options. `useVFXInstance()` gives the `VFX` as a ref.
- Call `updateElement(el)` after changes the directive can't see, like an input's value.
- Works with SSR (Nuxt). No `<ClientOnly>` needed.

## Svelte and SvelteKit

Needs Svelte 5.29 or later.

```bash
npm i @vfx-js/core @vfx-js/svelte
```

```svelte
<script lang="ts">
    import { vfx } from "@vfx-js/svelte";
    let shader = $state("rgbShift");
</script>

<img {@attach vfx({ shader: "rgbShift" })} src="cat.png" alt="" />
<h1 {@attach vfx(() => ({ shader }))}>Hello</h1>
```

- Pass a getter (`() => ({ ... })`) for props that change. A plain object that reads state removes and re-adds the element on every change.
- `VFXCanvas` renders any markup into a shader. `bind:element` gives the element the effect is on.
- `vfxConfig({ ... })` sets the shared canvas options. `vfxInstance().current` is the `VFX`.
- Keep a `postEffect` object out of `$state`; every new proxy replaces the canvas.
- Call `updateElement(el)` after changes the attachment can't see.

## Astro

Needs Astro 5 or later. No framework island.

```bash
npm i @vfx-js/core @vfx-js/astro
```

```astro
---
import { VFXImg, VFXSpan } from "@vfx-js/astro";
---

<VFXImg src="/cat.png" alt="" shader="rgbShift" />
<VFXSpan shader="glitch" overflow={30}>Hello</VFXSpan>
```

- `VFXImg`, `VFXVideo`, `VFXSpan`, `VFXDiv`, `VFXP` take `VFXProps` that fit in HTML: `shader` is a preset, GLSL, or `"@name"` of a registered `VFXPass[]`; `uniforms` is plain numbers or the name of registered uniforms; no `effect`.
- The props become a `data-vfx` JSON attribute. Any element with `data-vfx` works, e.g. `<Image src={cat} alt="" data-vfx='{"shader":"rgbShift"}' />` from `astro:assets`.
- Register functions by name in a client `<script>` in the layout:

```ts
import { registerVFX } from "@vfx-js/astro/client";

registerVFX({
    uniforms: { mouse: { mouse: () => [mx, my] } },
    shaders: { blur: [pass1, pass2] },
    vfx: { pixelRatio: 1 },   // shared canvas options; only before the VFX is made
});
```

- An element whose name is not registered yet waits until it is.
- `getVFX()` from `@vfx-js/astro/client` gives the shared `VFX` (or `null` without WebGL). `install()` starts the `data-vfx` watcher; the components call it for you.
- Page transitions: see [references/transitions.md](references/transitions.md).

## Rules and pitfalls

- Browser only. `new VFX()` throws without `window`, and throws when WebGL is not available. Create it in client code (`useEffect`, `onMount`, `"use client"`), and wrap it in `try` / `catch` so the page still works as plain HTML.
- With `prefers-reduced-motion: reduce`, `VFX` renders nothing. `add` does nothing, and elements stay plain HTML. It is checked once, when `VFX` is created.
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
