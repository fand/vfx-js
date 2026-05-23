# Effect API

VFX-JS's Effect API lets you create your own effects on top of VFX-JS.
Use it when the legacy `shader: string` path is not enough — multiple
passes, persistent feedback buffers, custom geometry, or output that
grows beyond the element rect. Once you write an effect, you can reuse
it across your app, or even distribute it as a library.

## Examples

### Single pass

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

### Multi-pass (separable blur)

Allocate an intermediate render target in `init`, then draw twice:
horizontal into the intermediate, vertical into the final target.

```ts
const FRAG_BLUR = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 dir;

void main() {
    vec4 c = vec4(0.0);
    for (int i = -4; i <= 4; i++) {
        c += texture(src, uvSrc + dir * float(i));
    }
    outColor = c / 9.0;
}
`;

class BlurEffect implements Effect {
    #tmp: EffectRenderTarget | null = null;

    init(ctx: EffectContext) {
        this.#tmp = ctx.createRenderTarget();
    }

    render(ctx: EffectContext) {
        if (!this.#tmp) return;
        const [w, h] = ctx.dims.elementPixel;
        ctx.draw({
            frag: FRAG_BLUR,
            uniforms: { src: ctx.src, dir: [1 / w, 0] },
            target: this.#tmp,
        });
        ctx.draw({
            frag: FRAG_BLUR,
            uniforms: { src: this.#tmp, dir: [0, 1 / h] },
            target: ctx.target,
        });
    }
}
```

### Persistent RT (feedback trail)

A `persistent: true` render target is ping-pong buffered. When you
bind it as a `sampler2D` uniform you read last frame; when you draw
to it, you write the new frame. After the draw the buffers swap.

```ts
const FRAG_TRAIL = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D prev;
uniform float decay;

void main() {
    vec4 cur = texture(src, uvSrc);
    vec4 old = texture(prev, uv) * decay;
    outColor = max(cur, old);
}
`;

class TrailEffect implements Effect {
    #buf: EffectRenderTarget | null = null;

    init(ctx: EffectContext) {
        this.#buf = ctx.createRenderTarget({ persistent: true });
    }

    render(ctx: EffectContext) {
        if (!this.#buf) return;
        ctx.draw({
            frag: FRAG_TRAIL,
            uniforms: { src: ctx.src, prev: this.#buf, decay: 0.92 },
            target: this.#buf,
        });
        ctx.draw({
            frag: `#version 300 es
                precision highp float;
                in vec2 uv;
                out vec4 outColor;
                uniform sampler2D src;
                void main() { outColor = texture(src, uv); }`,
            uniforms: { src: this.#buf },
            target: ctx.target,
        });
    }
}
```

For richer examples (custom geometry, instancing, HDR pipelines) see
`packages/effects/src/` — `pixelate.ts`, `scanline.ts`, and `bloom.ts`
are good starting points.

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

- `init` — allocate render targets, wrap textures. Called once when the effect is attached.
- `update` — advance state. `ctx.draw()` calls are ignored here.
- `render` — issue `ctx.draw()` calls. Omit to make the stage a passthrough.
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
| `uniforms`       | User uniforms from `VFXProps.uniforms`. Re-evaluated each frame.         |
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
    swap,              // persistent RT: pass false to keep writing to the same buffer
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

- `shader` and `effect` are mutually exclusive — if both are set,
  `effect` takes precedence and a dev warning is emitted.
- `overflow` is ignored on effect-path elements; use `outputRect`.
- Don't share a single Effect instance across elements — use a
  factory function instead.
- Resources you allocate through raw `ctx.gl` are yours to manage —
  free them in `dispose`, and rebuild them from
  `ctx.onContextRestored(cb)`.

## See also

- [MULTIPASS.md](./MULTIPASS.md) — declarative multi-pass `shader` API.
- [POSTEFFECT_EXAMPLE.md](./POSTEFFECT_EXAMPLE.md) — full-canvas effects.
