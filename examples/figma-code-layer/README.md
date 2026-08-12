# VFX-JS in a Figma Code Layer

Run `@vfx-js/effects` **live** on the Figma canvas using a
[Code Layer](https://www.figma.com/blog/code-on-the-figma-canvas/)
(introduced at Config 2026).

Code Layers execute real React + npm packages in a browser/WebGL context,
so VFX-JS runs exactly as it does on the web — fully animated, including
multi-pass effects like **bloom**, **fluid**, and **particle** that a
native single-pass shader fill cannot express.

## Why a Code Layer (and not a shader fill)

| Approach | Runs VFX-JS live | All effects | Uses `@vfx-js/effects` as-is |
| --- | --- | --- | --- |
| Native shader fill / shader effects | △ hand-port single-pass GLSL only | ✕ | ✕ |
| **Code Layer** | **◎** | **◎** | **◎ (npm import)** |
| Custom plugin (UI iframe) | ◎ | ◎ | ◎ (but output is baked to an image) |

`@vfx-js/effects` is a JS orchestration layer (`Effect.render` drives
`ctx.draw` / render targets / ping-pong buffers), **not** a single
fragment shader — so it needs a real WebGL runtime. A Code Layer is one.

## Files

- `VFXCodeLayer.tsx` — the component. An effect picker, live param
  sliders, and an image/text target.
- `effects.ts` — registry mapping each effect to a factory + its
  tweakable params (used to render generic controls).

## Usage

1. Add a **Code Layer** to your Figma file.
2. Ensure these deps are available to the layer:
   `@vfx-js/core`, `@vfx-js/react`, `@vfx-js/effects`, `react`,
   `react-dom`.
3. Paste both files in and render `<VFXCodeLayer />` as the default
   export.

```tsx
import VFXCodeLayer from "./VFXCodeLayer";

export default function App() {
  return <VFXCodeLayer />;
}
```

## Applying an effect to an existing Figma layer

VFX-JS captures **DOM** content, not Figma vector layers, so this sample
renders its own target (`<img>` / text) and effects that. To run an
effect over an existing layer:

1. Export the layer to an image (`node.exportAsync({ format: "PNG" })`,
   or just an image fill URL).
2. Pass that URL / data-URI as the **Image URL** field (`imageSrc`).

The layer then renders that image and applies the chosen effect to it,
live.

## Key API notes

- Effects are **stateful** — build one instance per element and mutate it
  via `setParams`; never share an instance. The component keeps a single
  `useMemo` instance per effect type.
- Switching the effect type swaps the `effect` prop reference, so
  `@vfx-js/react` takes the `updateEffects` fast path (no source reload).
- Param changes call `effect.setParams(...)` on the same instance — live,
  no flicker.
- `VFXProvider` is given a `wrapper` ref (a `position: relative;
  overflow: hidden` div) so the WebGL canvas stays inside the layer
  bounds.
- Remote images need CORS (`crossOrigin="anonymous"`) to be readable by
  WebGL. Prefer same-origin images or data-URIs exported from Figma.
