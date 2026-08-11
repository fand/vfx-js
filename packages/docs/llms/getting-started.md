# VFX-JS — Getting Started

> VFX-JS is a JavaScript/TypeScript library for adding WebGL-powered visual effects to ordinary HTML elements — images, videos, text, divs, and canvas — with one-line shader presets, custom GLSL shaders, and composable effect classes.

This guide is the agent/LLM-friendly summary of the docs at https://amagi.dev/vfx-js/.

Packages:

- `@vfx-js/core` — the core library (this guide)
- `@vfx-js/effects` — ~30 prebuilt `Effect` classes (bloom, pixelate, fluid, particles, …) — see [effects.md](./effects.md)
- `@vfx-js/react` — React bindings (`<VFXImg>`, `<VFXVideo>`, …) — see [react.md](./react.md)

## Install

```sh
npm i @vfx-js/core
```

Or load from a CDN (works in CodePen etc.):

```js
import { VFX } from "https://esm.sh/@vfx-js/core";
// or
import { VFX } from "https://cdn.jsdelivr.net/npm/@vfx-js/core/+esm";
```

## Minimal example

```js
import { VFX } from "@vfx-js/core";

const img = document.querySelector("#img");

const vfx = new VFX();
vfx.add(img, { shader: "glitch", overflow: 100 });
```

`VFX` creates a fullscreen WebGL canvas overlay, tracks the position of each added element, and renders the shader over it. The original element is hidden (opacity 0) unless `overlay` is set.

Supported elements:

- `<img>` (including animated GIF)
- `<video>` (use `autoplay loop muted` for background videos)
- Text and `<div>` (experimental; call `vfx.update(div)` after DOM/input changes to re-capture)
- `<canvas>` — draw 2D graphics yourself, then call `vfx.update(canvas)` whenever the canvas content changes:

```js
function drawCanvas() {
    // ... draw to the 2D context ...
    vfx.update(canvas); // re-upload the texture
    requestAnimationFrame(drawCanvas);
}
drawCanvas();
vfx.add(canvas, { shader: "rgbShift" });
```

## VFX class API

| Member | Description |
| --- | --- |
| `new VFX(opts?: VFXOpts)` | Create an instance and start playing immediately. Throws if WebGL is unavailable. |
| `vfx.add(element, props: VFXProps)` | Register an element and start rendering effects on it. Async. |
| `vfx.addHTML(element, props)` | Register via the html-in-canvas API (captures live HTML). Falls back to `add()` when unsupported. |
| `vfx.remove(element)` | Remove the element and stop rendering it. |
| `vfx.update(element)` | Re-capture the element's content (canvas redraws, input edits, swapped `<img>` src). |
| `vfx.updateEffects(element, effects)` | Swap the element's effect chain in place, preserving state and the source texture. |
| `vfx.play()` / `vfx.stop()` | Start / stop the render loop. |
| `vfx.render()` | Render one frame manually (combine with `autoplay: false`). |
| `vfx.time` / `vfx.setTime(t)` | Read / pin the animation clock (seconds) behind the `time` uniform. |
| `vfx.timeScale` | Playback rate of the clock: `1` realtime, `0` paused, negative = backwards. |
| `vfx.canvas` | The output `HTMLCanvasElement` VFX renders into. |
| `vfx.destroy()` | Tear down the instance and stop rendering. |

### VFXOpts (constructor options)

| Option | Type (default) | Description |
| --- | --- | --- |
| `pixelRatio` | `number` (`devicePixelRatio`) | Rendering resolution ratio. Lower it (e.g. `0.5`) for low-end devices. |
| `zIndex` | `number` | `z-index` of the WebGL canvas. |
| `autoplay` | `boolean` (`true`) | If `false`, call `vfx.play()` or `vfx.render()` yourself. |
| `scrollPadding` | `number \| [number, number] \| false` (`0.1`) | Extra canvas padding ratio used to reduce scroll jank. `false` disables it. |
| `wrapper` | `HTMLElement` | Append the canvas to this element instead of `document.body`. Must be `position: relative; overflow: hidden` at the page origin. |
| `postEffect` | `VFXPostEffect \| VFXPass[]` | Post-processing applied to the whole canvas output — see [post-effects.md](./post-effects.md). |
| `preserveDrawingBuffer` | `boolean` (`false`) | Keep the drawing buffer so `vfx.canvas` can be read outside the render frame. |
| `timeScale` | `number` (`1`) | Initial playback rate of the animation clock. |

## VFXProps (per-element options)

```js
vfx.add(element, {
    shader: "glitch", // preset name, GLSL string, or VFXPass[]
    overflow: 100,
    uniforms: { intensity: 0.5 },
});
```

| Prop | Type (default) | Description |
| --- | --- | --- |
| `shader` | `ShaderPreset \| string \| VFXPass[]` | Preset name, custom fragment shader code, or a multipass array ([multipass.md](./multipass.md)). |
| `effect` | `Effect \| Effect[]` | Effect class pipeline (mutually exclusive with `shader`; `effect` wins). Don't reuse one Effect instance across elements. |
| `uniforms` | `{ [name]: value \| () => value }` | Custom uniforms. Functions are re-evaluated every frame. Values map to `float`/`vec2`/`vec3`/`vec4`/arrays. |
| `overflow` | `true \| number \| number[] \| object` (`0`) | Let the shader render beyond the element bounds. `true` = fullscreen, number = padding px, or per-side like CSS padding (`[top, right, bottom, left]` / `{ top: 100 }`). Shader path only. |
| `overlay` | `true \| number` (`false`) | Keep the original element visible (`true` preserves opacity, a number sets it). |
| `release` | `number` (`0`) | Keep rendering for this duration (seconds) after the element leaves the viewport. |
| `intersection` | `{ threshold?, rootMargin? }` | IntersectionObserver-like options controlling when the element counts as "entered" (drives transitions). |
| `wrap` | `"repeat" \| "clamp" \| "mirror"` or tuple (`"repeat"`) | Texture wrapping mode (horizontal/vertical). |
| `zIndex` | `number` (`0`) | Render order inside the WebGL canvas (ascending). |
| `backbuffer` | `boolean` (`false`) | Expose the previous frame as `uniform sampler2D backbuffer` for feedback effects. |
| `autoCrop` | `boolean` (`true`) | Crop the input texture to the element bounds. Custom shaders get `uniform bool autoCrop` to implement it manually. |
| `glslVersion` | `"100" \| "300 es"` (`"300 es"`) | GLSL version of your custom shader. |

## Shader presets

Pass a preset name as `shader`:

```js
vfx.add(el, { shader: "rainbow" });
vfx.add(el, { shader: "glitch", overflow: 100 }); // some presets need overflow to draw outside the element
```

All presets (`ShaderPreset`): `none`, `uvGradient`, `rainbow`, `glitch`, `rgbGlitch`, `rgbShift`, `shine`, `blink`, `spring`, `duotone`, `tritone`, `hueShift`, `sinewave`, `pixelate`, `halftone`, `slitScanTransition`, `warpTransition`, `pixelateTransition`, `focusTransition`, `invert`, `grayscale`, `vignette`, `chromatic`.

Some presets take parameters via `uniforms`:

```js
vfx.add(el, {
    shader: "duotone",
    uniforms: {
        color1: [0, 0, 1, 1],
        color2: [0, 1, 0, 1],
        speed: 0.2,
    },
});
```

## Transitions

The `*Transition` presets (`slitScanTransition`, `warpTransition`, `pixelateTransition`, `focusTransition`) animate when the element enters the viewport:

```js
vfx.add(el, { shader: "warpTransition" });
```

Tune the trigger with `intersection` (e.g. `{ threshold: 1 }` to start only when fully visible), and use `release` to keep rendering after the element scrolls out. In custom shaders, use the `enterTime` / `leaveTime` / `intersection` uniforms to drive your own transitions.

## Custom shaders

Pass GLSL fragment shader code as `shader`. Default GLSL version is `300 es` (WebGL2); set `glslVersion: "100"` for legacy shaders.

```js
const shader = `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;
uniform float scroll;
out vec4 outColor;

void main (void) {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    uv.x = fract(uv.x + scroll + time * 0.2);
    outColor = texture(src, uv);
}
`;

vfx.add(el, {
    shader,
    uniforms: {
        // Uniform functions are evaluated every frame
        scroll: () => window.scrollY / window.innerHeight,
    },
});
```

Built-in uniforms available in every element shader:

| Uniform | Type | Description |
| --- | --- | --- |
| `src` | `sampler2D` | The captured element texture. |
| `resolution` | `vec2` | Render area resolution in pixels. |
| `offset` | `vec2` | Position of the render area; `(gl_FragCoord.xy - offset) / resolution` gives the element-local UV. |
| `time` | `float` | Seconds since the VFX instance started (scaled by `timeScale`). |
| `enterTime` | `float` | Seconds since the element entered the viewport. |
| `leaveTime` | `float` | Seconds since the element left the viewport. |
| `intersection` | `float` | Intersection ratio of the element (0–1). |
| `viewport` | `vec4` | Viewport information. |
| `mouse` | `vec2` | Mouse position in pixels. |
| `backbuffer` | `sampler2D` | Previous frame (only when `backbuffer: true`). |
| `autoCrop` | `bool` | Whether the shader should crop to the element bounds. |

## Prebuilt effects (@vfx-js/effects)

`@vfx-js/effects` ships ready-made `Effect` classes — bloom, halftone, pixelate, scanline, fluid, particles, voronoi, and more. See [effects.md](./effects.md) for the full list.

```sh
npm i @vfx-js/core @vfx-js/effects
```

```js
import { VFX } from "@vfx-js/core";
import { BloomEffect } from "@vfx-js/effects";

const vfx = new VFX();
const effect = new BloomEffect({ threshold: 0.2, intensity: 5 });
await vfx.add(img, { effect });
```

Chain effects by passing an array — each runs in order, the next reads the previous output as `src`:

```js
await vfx.add(img, {
    effect: [
        new PixelateEffect({ size: 10 }),
        new ScanlineEffect({ spacing: 5 }),
        new BloomEffect({ threshold: 0.01, intensity: 10, pad: 200 }),
    ],
});
```

Each effect owns its params: mutate `effect.params` (or call `effect.setParams`) to drive them live. To write your own `Effect` class, see [custom-effects.md](./custom-effects.md).

## React

Use `@vfx-js/react` for declarative bindings:

```jsx
import { VFXProvider, VFXImg } from "@vfx-js/react";

<VFXProvider>
    <VFXImg src="logo.png" shader="rgbShift" />
</VFXProvider>;
```

See [react.md](./react.md) for `VFXProvider`, `VFXImg`, `VFXVideo`, `VFXSpan`, `VFXDiv`, and gotchas.

## Further reading

- [core.md](./core.md) — `@vfx-js/core` README
- [effects.md](./effects.md) — prebuilt effect catalogue
- [react.md](./react.md) — React bindings
- [custom-effects.md](./custom-effects.md) — authoring custom `Effect` classes
- [multipass.md](./multipass.md) — multipass shader API (`VFXPass[]`)
- [post-effects.md](./post-effects.md) — full-canvas post effects
- [html-in-canvas.md](./html-in-canvas.md) — HTML-in-Canvas capture API
- [API reference (TypeDoc)](https://amagi.dev/vfx-js/docs/)
- [Live examples](https://amagi.dev/vfx-js/examples/) / [Storybook](https://amagi.dev/vfx-js/storybook/)
- [GitHub](https://github.com/fand/vfx-js)
