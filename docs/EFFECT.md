# Writing Effects with the Effect API

The **Effect API** is the imperative, multi-pass interface for building
custom visual effects in VFX-JS. An effect is a small class that
implements the `Effect` interface, manages its own GPU resources, and
issues draw calls each frame via an `EffectContext`.

Use the Effect API instead of the legacy single-`shader` path when you
need any of:

- Multiple render passes (blur, bloom, fluid, feedback)
- Render targets that persist across frames
- Custom geometry, instancing, or `points` / `lines` primitives
- Dynamic shader parameters tied to JS state
- Effects that change the size of the output (glow, drop shadow)

For one-shot fragment effects with no allocations and no state, the
legacy `shader: string` API is still fine — the Effect API is
opt-in.

---

## TL;DR

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

Three rules to keep in mind:

1. **One Effect instance per element.** Effects are stateful. Use a
   factory function if you need to apply the "same" effect to many
   elements.
2. **`ctx.draw()` is only valid inside `render()`** — calling it from
   `init()` or `update()` is silently ignored.
3. **Read `ctx.src`, write to `ctx.target`** in the simple case. Both
   may be `null` / canvas in special positions of the chain; the
   defaults handle that for you.

---

## Anatomy of an Effect

```ts
interface Effect {
    init?(ctx: EffectContext): void | Promise<void>;
    update?(ctx: EffectContext): void;
    render?(ctx: EffectContext): void;
    dispose?(): void;
    outputRect?(dims: EffectDims): ElementRect | undefined;
}
```

### Lifecycle

| Hook         | When                              | What you do                                  |
| ------------ | --------------------------------- | -------------------------------------------- |
| `init`       | Once, when the effect is attached | Allocate render targets, wrap textures       |
| `update`     | Every frame, before `render`      | Advance state (no draws allowed)             |
| `render`     | Every frame                       | Issue `ctx.draw()` calls                     |
| `dispose`    | Once, on removal                  | Drop references; managed RTs are freed for you |
| `outputRect` | Queried per frame                 | Declare the rect this stage writes to        |

Omit a hook you do not need. An effect with no `render()` is
**transparent** in the chain — it is skipped and the next stage reads
the previous stage's output.

### The Context

`EffectContext` is the single argument to every hook. The same object
is passed across frames — its fields are mutated in place — so do not
cache child values (`ctx.src`, `ctx.target`, `ctx.dims`) past the end
of the current hook.

Key fields:

- **`time` / `deltaTime`** — wall-clock seconds since VFX started, and
  since this effect's last render.
- **`resolution`** — canvas size in physical pixels.
- **`mouse` / `mouseViewport`** — mouse position in element-local /
  canvas-local space, bottom-left origin.
- **`intersection`** — 0..1 IntersectionObserver-style ratio for the
  host element.
- **`src`** — input texture for this stage (`EffectTexture`).
- **`target`** — output render target for this stage
  (`EffectRenderTarget | null`; `null` means "draw to the canvas").
- **`uniforms`** — user-supplied uniforms from `VFXProps.uniforms`,
  re-evaluated each frame before `update()`.
- **`dims`** — per-stage layout snapshot (see [Layout & rects](#layout--rects)).
- **`quad`** — opaque handle for the default fullscreen quad.
- **`gl`** — raw `WebGL2RenderingContext` for low-level work.

---

## Drawing

`ctx.draw()` runs a single draw call against a fragment shader.

```ts
ctx.draw({
    frag,              // required: GLSL source
    vert,              // optional: custom vertex shader
    geometry,          // optional: ctx.quad (default) or EffectGeometry
    uniforms,          // optional: { name: value }
    target,            // optional: EffectRenderTarget | null (canvas)
    blend,             // optional: "normal" | "premultiplied" | "additive" | "none"
    swap,              // optional: persistent RT ping-pong control
});
```

### Default vertex shader

When you omit `vert`, the host injects a fullscreen-quad vertex shader
that emits three varyings, all in the [0, 1] range nested
largest-to-smallest:

| Varying     | Meaning                                                                      |
| ----------- | ---------------------------------------------------------------------------- |
| `uv`        | 0..1 over the **full destination buffer** (content + pad)                    |
| `uvContent` | 0..1 over the **captured content** (element). Outside [0,1] means pad area.  |
| `uvSrc`     | 0..1 over the **source buffer** (the previous stage's output or the capture) |

For an effect that just copies pixels through, `texture(src, uvSrc)`
is the right call — it accounts for any padding the previous stage
introduced.

### Uniform types

`EffectUniformValue` covers the common cases — scalars, tuples up to
vec4, typed arrays for array uniforms, and the texture handles
`EffectTexture` / `EffectRenderTarget` (auto-bound to the right
sampler slot).

```ts
ctx.draw({
    frag,
    uniforms: {
        src: ctx.src,             // EffectTexture
        mask: this.#mask,          // EffectRenderTarget
        strength: 0.5,             // float
        offset: [10, 20],          // vec2
        palette: this.#paletteF32, // Float32Array → vec4[N]
    },
});
```

### Targets and blend

- `target: ctx.target` — the stage's assigned destination. For the
  last stage in the chain this is the canvas; for intermediate stages
  it is a buffer the host owns.
- `target: someRT` — an `EffectRenderTarget` you allocated with
  `ctx.createRenderTarget()`. Useful for intermediates inside one
  effect (e.g. blur ping-pong).
- `target: null` — the canvas, regardless of position.

`blend` defaults to `"premultiplied"` when drawing to the canvas and
`"none"` when drawing to a user-allocated RT. Use `"additive"` for
accumulation passes (particles, sparkles).

---

## Allocating render targets

```ts
const rt = ctx.createRenderTarget({
    size: [w, h],     // optional, physical px — auto-resizes to element if omitted
    float: false,     // optional — true for 16F/32F (HDR / accumulation)
    persistent: false, // optional — keep content across frames (feedback)
    wrap: "clamp",     // optional — or tuple [wrapS, wrapT]
    filter: "linear",  // optional — "nearest" / "linear"
    mipmap: false,     // optional — true (auto) / "manual"
});
```

Allocate in `init()` and reuse across frames. The handle's `width`
and `height` are kept current when the RT auto-resizes (i.e. when you
did not pass `size`).

`rt.dispose()` releases GL resources eagerly; it is idempotent and
safe to call. The host also tears down owned RTs when the effect is
disposed, so an `init` → `dispose` pair without manual disposal also
works.

### Persistent RTs (feedback)

```ts
const trail = ctx.createRenderTarget({ persistent: true });
```

A persistent RT is double-buffered ("ping-pong") under the hood. In
the same draw call the **read side** is bound when you reference it
via a `sampler2D` uniform and the **write side** is bound when you
pass it as `target`. After the draw the buffers swap, so next frame's
draw reads what you just wrote.

Pass `swap: false` to suppress the swap — useful when you need to
write to the same physical buffer twice in one frame (e.g. a clear
pass followed by a sparse stamp pass).

---

## Layout & rects

### `EffectDims`

`ctx.dims` is a per-stage layout snapshot, with the same shape as the
argument to `outputRect()`:

| Field          | Units             | Meaning                                                                      |
| -------------- | ----------------- | ---------------------------------------------------------------------------- |
| `element`      | logical (CSS) px  | Element size                                                                 |
| `elementPixel` | physical px       | `element × pixelRatio`                                                       |
| `canvas`       | logical (CSS) px  | Canvas size                                                                  |
| `canvasPixel`  | physical px       | `canvas × pixelRatio`                                                        |
| `pixelRatio`   | scalar            | Device pixel ratio                                                           |
| `contentRect`  | physical px       | `[0, 0, elementPixel[0], elementPixel[1]]` — the element                     |
| `srcRect`      | physical px       | Previous stage's output rect; equals `contentRect` at stage 0                |
| `canvasRect`   | physical px       | Canvas rect in element-local coordinates                                     |

All rects are element-local, bottom-left origin, in physical pixels.
In post-effects there is no element, so `element` mirrors `canvas`.

### `outputRect()`

Most effects produce output the same size as their input — leave
`outputRect()` undefined and the host reuses the input rect.

Return a rect when the effect **grows the output** (glow, drop shadow,
blur) or **shrinks it** (downsample preview):

```ts
outputRect(dims: EffectDims) {
    const px = this.pad * dims.pixelRatio;
    const [, , w, h] = dims.contentRect;
    return [-px, -px, w + 2 * px, h + 2 * px];
}
```

Common returns:

- `dims.contentRect` — just the element.
- Element + N px on every side — for blur / glow / shadow.
- `dims.canvasRect` — the whole canvas, including the `scrollPadding`
  area around the viewport.

`outputRect` is queried every frame, so you can drive it from `params`.

---

## Uniforms and user inputs

Two channels feed values into your effect:

1. **`VFXProps.uniforms`** is exposed as `ctx.uniforms`. Values are
   re-evaluated each frame *before* `update()`, so function-typed
   uniforms (`scroll: () => window.scrollY`) work.
2. **Your effect's own state** — store params on the instance,
   reference `this.params` inside `render()`. This is how the
   bundled effects (`PixelateEffect`, `BloomEffect`, …) expose
   `setParams()` and live tweaks.

A mutable `params` object on the effect plays well with reactive UI
libraries (e.g. Tweakpane) — bind directly to `effect.params` and
the next frame picks up the change.

---

## Three example shapes

### 1. Single-pass filter (no state)

```ts
class InvertEffect implements Effect {
    render(ctx: EffectContext) {
        ctx.draw({
            frag: `#version 300 es
                precision highp float;
                in vec2 uvSrc;
                out vec4 outColor;
                uniform sampler2D src;
                void main() {
                    vec4 c = texture(src, uvSrc);
                    outColor = vec4(1.0 - c.rgb, c.a);
                }`,
            uniforms: { src: ctx.src },
            target: ctx.target,
        });
    }
}
```

No `init`, no `dispose`, no `outputRect` — the default behaviour is
"copy through".

### 2. Multi-pass with an intermediate RT

```ts
class SeparableBlurEffect implements Effect {
    params = { radius: 8 };
    #tmp: EffectRenderTarget | null = null;

    init(ctx: EffectContext) {
        this.#tmp = ctx.createRenderTarget(); // auto-resizes with element
    }

    render(ctx: EffectContext) {
        if (!this.#tmp) return;
        // Horizontal pass → #tmp
        ctx.draw({ frag: FRAG_BLUR_H, uniforms: { src: ctx.src, radius: this.params.radius }, target: this.#tmp });
        // Vertical pass → final target
        ctx.draw({ frag: FRAG_BLUR_V, uniforms: { src: this.#tmp, radius: this.params.radius }, target: ctx.target });
    }

    dispose() {
        this.#tmp = null; // host frees the RT
    }
}
```

### 3. Feedback (persistent RT)

```ts
class TrailEffect implements Effect {
    params = { decay: 0.94 };
    #buf: EffectRenderTarget | null = null;

    init(ctx: EffectContext) {
        this.#buf = ctx.createRenderTarget({ persistent: true });
    }

    render(ctx: EffectContext) {
        if (!this.#buf) return;
        // Read prev frame from #buf, fade and add ctx.src, write back.
        ctx.draw({
            frag: FRAG_TRAIL, // sample both src and buf, mix(buf*decay, src, srcMask)
            uniforms: { src: ctx.src, buf: this.#buf, decay: this.params.decay },
            target: this.#buf,
        });
        // Composite to the canvas / next stage.
        ctx.draw({
            frag: FRAG_COPY,
            uniforms: { src: this.#buf },
            target: ctx.target,
        });
    }
}
```

---

## Effects in a pipeline

Effects compose into a chain:

```ts
vfx.add(el, {
    effect: [new BlurEffect(), new VignetteEffect(), new GrainEffect()],
});
```

Each stage's `outputRect` defines what it writes; the next stage's
`ctx.src` reads exactly that rect via the `uvSrc` varying. Stages
do not inherit growth — if blur grows by 32 px and the next stage
declares no `outputRect`, that stage writes a 32-px-padded buffer too
because its input is padded.

Effects can also be used as post-effects (whole-canvas):

```ts
const vfx = new VFX({
    postEffect: { effect: [new BloomEffect(), new ChromaticAberrationEffect()] },
});
```

In a post-effect, there is no element — `dims.element` mirrors
`dims.canvas`, and `outputRect` typically returns `dims.canvasRect`.

---

## Cheatsheet & gotchas

- **`shader` and `effect` are mutually exclusive.** If both are set,
  `effect` wins and a dev warning fires.
- **`overflow` is ignored on effect-path elements.** Use
  `outputRect` to reach beyond the element bounds — use
  `dims.canvasRect` to fill the canvas.
- **Do not reuse one Effect instance across elements.** Use a
  factory: `() => new MyEffect(params)`.
- **`ctx.draw()` outside `render()`** is dropped silently. State
  changes belong in `update()`.
- **Raw `ctx.gl` resources are yours to clean up.** Free them in
  `dispose()` and rebuild them from `ctx.onContextRestored(cb)`.
  Resources allocated via `createRenderTarget` / `wrapTexture` /
  `EffectGeometry` are restored automatically.
- **Auto-bind matches only `sampler2D`.** `isampler2D` / `usampler2D`
  uniforms must be bound by hand via raw `gl`.

---

## See also

- [MULTIPASS.md](./MULTIPASS.md) — multi-pass `shader` / `postEffect`
  API (the declarative cousin of the Effect API).
- [POSTEFFECT_EXAMPLE.md](./POSTEFFECT_EXAMPLE.md) — using
  `postEffect` for full-canvas processing.
- `packages/effects/src/` — read-along source for the bundled
  effects (`PixelateEffect`, `ScanlineEffect`, `BloomEffect`,
  `FluidEffect`, etc.).
