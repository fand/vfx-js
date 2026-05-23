# Effect API

VFX-JS's Effect API lets you create your own effects on top of VFX-JS.
Use it when the legacy `shader: string` path is not enough — multiple
passes, persistent feedback buffers, custom geometry, or output that
grows beyond the element rect. Once you write an effect, you can reuse
it across your app, or even distribute it as a library.

## Example

```ts
import type { Effect, EffectContext } from "@vfx-js/core";
import { VFX } from "@vfx-js/core";

const FRAG = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform float strength;

void main() {
    vec4 c = texture(src, uvSrc);
    float gray = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    outColor = vec4(mix(c.rgb, vec3(gray), strength), c.a);
}
`;

class DesaturateEffect implements Effect {
    constructor(public strength = 1.0) {}

    render(ctx: EffectContext) {
        ctx.draw({
            frag: FRAG,
            uniforms: { src: ctx.src, strength: this.strength },
            target: ctx.target,
        });
    }
}

const vfx = new VFX();
vfx.add(document.querySelector("#img")!, {
    effect: new DesaturateEffect(0.8),
});
```

For richer examples (multi-pass, persistent feedback, custom geometry)
read `packages/effects/src/` — `pixelate.ts`, `scanline.ts`, and
`bloom.ts` are good starting points.

## API

### Lifecycle

```ts
interface Effect {
    init?(ctx: EffectContext): void | Promise<void>;
    update?(ctx: EffectContext): void;
    render?(ctx: EffectContext): void;
    dispose?(): void;
    outputRect?(dims: EffectDims): ElementRect | undefined;
}
```

- `init` — allocate render targets, wrap textures. Once per attach.
- `update` — advance state. `ctx.draw()` is suppressed here.
- `render` — issue `ctx.draw()` calls. Omit to make the stage transparent.
- `dispose` — drop refs; managed RTs are freed for you.
- `outputRect` — declare the rect this stage writes into, in
  element-local physical px. Omit when output is the same size as input.

### Context

| Field            | Notes                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| `time` / `deltaTime` | Wall-clock seconds since VFX start / since last render.              |
| `resolution`     | Canvas size in physical px.                                              |
| `mouse` / `mouseViewport` | Element-local / canvas-local, bottom-left origin.               |
| `intersection`   | 0..1 viewport overlap.                                                   |
| `src` / `target` | Input texture / output RT for this stage. `target: null` = canvas.       |
| `uniforms`       | User uniforms from `VFXProps.uniforms`, re-evaluated each frame.         |
| `dims`           | Per-stage layout snapshot (same shape as `outputRect`'s arg).            |
| `quad`           | Handle for the default fullscreen quad.                                  |
| `gl`             | Raw `WebGL2RenderingContext` for low-level work.                         |

### `ctx.draw(opts)`

```ts
ctx.draw({
    frag,              // GLSL source
    vert,              // optional; default supplies uv / uvContent / uvSrc varyings
    geometry,          // ctx.quad (default) | EffectGeometry
    uniforms,          // { name: number | tuple | typed array | texture handle }
    target,            // EffectRenderTarget | null (canvas) | ctx.target
    blend,             // "premultiplied" (canvas default) | "none" (RT default) | "additive" | "normal"
    swap,              // persistent RT: false to keep writing the same buffer
});
```

Default varyings (all in [0, 1], nested largest→smallest):

- `uv` — over the full destination buffer (content + pad)
- `uvContent` — over the captured content; outside [0, 1] = pad
- `uvSrc` — over the source buffer

### `ctx.createRenderTarget(opts?)`

```ts
ctx.createRenderTarget({
    size,        // [w, h] physical px; omit → auto-resizes to element
    float,       // 16F/32F for HDR / accumulation
    persistent,  // ping-pong; read prev frame, write next
    wrap,        // "clamp" (default) | "repeat" | "mirror" | [s, t]
    filter,      // "linear" (default) | "nearest"
    mipmap,      // true (auto) | "manual"
});
```

Allocate in `init`, reuse across frames. `rt.dispose()` is eager and
idempotent; otherwise the host frees it on effect disposal.

### `EffectDims` (`ctx.dims` / `outputRect` arg)

| Field          | Units            | Meaning                                  |
| -------------- | ---------------- | ---------------------------------------- |
| `element` / `elementPixel` | CSS / phys px | Element size                       |
| `canvas` / `canvasPixel`   | CSS / phys px | Canvas size                        |
| `pixelRatio`   | scalar           | Device pixel ratio                       |
| `contentRect`  | phys px          | The element rect                         |
| `srcRect`      | phys px          | Previous stage's output rect             |
| `canvasRect`   | phys px          | Canvas rect in element-local coords      |

Common `outputRect` returns: `dims.contentRect` (same as element),
element + N px on every side (glow / blur / shadow), `dims.canvasRect`
(fill the canvas).

## Gotchas

- `shader` and `effect` are mutually exclusive — `effect` wins, warns.
- `overflow` is ignored on effect-path elements; use `outputRect`.
- Do **not** reuse one Effect across elements — use a factory.
- Raw `ctx.gl` resources are yours: free in `dispose`, rebuild from
  `ctx.onContextRestored(cb)`.

## See also

- [MULTIPASS.md](./MULTIPASS.md) — declarative multi-pass `shader` API.
- [POSTEFFECT_EXAMPLE.md](./POSTEFFECT_EXAMPLE.md) — full-canvas effects.
