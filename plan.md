# Effect Interface for @vfx-js/core

## Context

The current `@vfx-js/core` treats effects as pure GLSL strings (`VFXPass[]`) and cannot hold JS-side state (see the preset definitions in `packages/vfx-js/src/constants.ts:41-64` and the `VFXPass` type in `packages/vfx-js/src/types.ts:18-64`). Complex effects (e.g. a fluid simulator) can only be built by constructing `VFXPass[]` on the storybook side, making them hard to distribute as reusable packages.

This change adds an Effect abstraction that satisfies the following:

- An Effect has optional init / update / render / dispose lifecycle hooks
- It can handle assets (render targets, etc.) and raw WebGL through a Context
- **Effect implementation packages only need `@vfx-js/core` as a devDependency** and import nothing at runtime (structural interface + types-only contract)
- **Composable**: accepts both `effect: grayscale` (single) and `effect: [grayscale, bloom]` (array). Arrays are chained into a pipeline in order.

## Design

### Pad model (tl;dr)

The Effect path manages pad (the margin around the element's inner rect) entirely via effects. There is **no element-level pad option** (`VFXProps.overflow` is shader-path only). Each effect declares how much it wants to widen the pad through its `outputSize({pad})` return. The chain tracks accumulated pad internally and never exposes it to effects.

```
stage 0 src = capture       (inner-only texture, pad = 0)
stage 0 dst pad = 0 + pad_0
stage 1 src pad = stage 0 dst pad
stage 1 dst pad = src_pad + pad_1
...
dst pad >= src pad per side   (monotonic non-decreasing)
```

Shader authors sample src content with the auto-injected `uvInner` varying, which is an **src-sampling UV pointing into src's inner region** (valid whether src is capture or a prior intermediate). For "am I inside the element?" gating, use `uvInnerDst` (0..1 over the current dst buffer's inner region; outside [0,1] means overflow pad). Both computed in the default vertex shader from two auto-uniforms `dstInnerRect` (dst) and `srcInnerRect` (src).

To reach the canvas edges (= viewport-inner + scrollPadding on each side), an effect returns `{pad: dims.fullscreenPad}`. The chain pre-computes `fullscreenPad` as the per-side delta needed to hit the canvas edge from the current src pad. (Despite the `viewport*` field names in `ChainFrameInput`, those values are canvas-equivalent.)

### Public types (add to packages/vfx-js/src/types.ts)

**The public API exposes only branded types and a raw WebGL2 escape hatch (`ctx.gl`).** No rendering-library types leak through, which keeps effect packages framework-agnostic and future-proof for a WebGPU backend.

Practical implications for effect authors:
- To use a texture produced elsewhere, either pass the DOM source (HTMLImageElement / Canvas / ImageBitmap / OffscreenCanvas / Video) directly to `ctx.wrapTexture`, or allocate via `ctx.gl.createTexture()` + `texImage2D` and hand the resulting `WebGLTexture` to `ctx.wrapTexture(glTex, { size })`.
- `ctx.draw()` is self-contained: every call re-binds program / framebuffer / viewport / blend / VAO / uniforms. Raw `ctx.gl.*` state mutations therefore do not leak into subsequent `ctx.draw()` calls (same-effect or next-effect). Resources allocated via `ctx.gl` (textures / buffers / programs not created via the high-level API) are the caller's responsibility — release them in `dispose()` and re-allocate them in the `ctx.onContextRestored(cb)` callback.

```ts
// Handle for a GPU texture exposed to effects. Always pass this (not an
// extracted inner reference) as a uniform; the backend resolves to the
// current internal `Texture` at bind time.
//
// Internal representation is a lazy resolver (`{ __brand, resolve(): Texture,
// width, height }`); the public surface shows only the branded handle +
// dimensions. The resolver form lets `ctx.src` transparently follow a
// text-element re-render (which swaps `e.srcTexture` with a new Texture).
//
// `width` / `height`: physical pixels of the source's native size.
// - Element capture: source DOM's native dimensions (e.g. image.naturalWidth,
//   video.videoWidth, text-render OffscreenCanvas size). May read as 0 before
//   the source is ready (HTMLImageElement pre-load, HTMLVideoElement pre-play).
// - `wrapTexture(WebGLTexture, { size })`: the provided `size`.
// - `wrapTexture(DOMSource)`: the source's intrinsic dimensions.
export type EffectTexture = {
    readonly width: number;   // physical pixels
    readonly height: number;  // physical pixels
    readonly __brand: "EffectTexture";
};

// Render target handle. Do NOT retain the underlying texture reference
// separately — for persistent (double-buffered) RTs the read texture
// rotates across draws. Always pass the RT itself as a uniform value;
// the backend resolves the current read texture at bind time.
export type EffectRenderTarget = {
    readonly width: number;   // physical pixels
    readonly height: number;  // physical pixels
    readonly __brand: "EffectRenderTarget";
};

// Value → GLSL type dispatch is driven by the shader's active uniform
// type (inspected via gl.getActiveUniform), not the JS type alone:
// - `number`  → matches FLOAT / INT / UNSIGNED_INT / BOOL
// - `boolean` → bool (uploaded as `uniform1i(loc, v ? 1 : 0)`)
// - `[n,n]` / `[n,n,n]` / `[n,n,n,n]` → vec* / ivec* / uvec* / bvec*
//   according to the shader's declared type (e.g. `[1, 2]` against
//   `uniform ivec2 foo` uploads via `gl.uniform2i(loc, 1, 2)`).
// - `number[]` / `Float32Array` / `Int32Array` / `Uint32Array` → polymorphic:
//   mat3 (length 9, column-major), mat4 (length 16, column-major),
//   float[] / vec*[] / int[] / ivec*[] / uint[] / uvec*[] depending on the
//   shader's active uniform type. Length mismatches emit a dev warning and
//   skip the upload.
// This keeps the API free of matrix/array tag types while covering common cases.
export type EffectUniformValue =
    | number
    | boolean
    | [number, number]
    | [number, number, number]
    | [number, number, number, number]
    | number[]
    | Float32Array
    | Int32Array
    | Uint32Array
    | EffectTexture
    | EffectRenderTarget;

// Source types accepted by ctx.wrapTexture. Mirrors the internal `Texture`
// class's source list (see packages/vfx-js/src/gl/texture.ts), plus a raw
// WebGLTexture escape hatch for callers that uploaded via ctx.gl themselves.
export type EffectTextureSource =
    | WebGLTexture
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement
    | ImageBitmap
    | OffscreenCanvas;

export type EffectUniforms = { [name: string]: EffectUniformValue };

export type EffectTextureWrap = "clamp" | "repeat" | "mirror";
export type EffectTextureFilter = "nearest" | "linear";

export type EffectRenderTargetOpts = {
    // Omit → match element size × pixelRatio and auto-resize on element resize.
    // Specify tuple (physical pixels) → fixed size, no auto-resize. Tuple form
    // prevents the ambiguous "only-one-dimension" case and matches resolution/
    // mouse style.
    size?: readonly [number, number];
    float?: boolean;       // default: false
    persistent?: boolean;  // default: false (double-buffered when true)
    // Default: "clamp". Tuple form specifies [wrapS, wrapT].
    wrap?: EffectTextureWrap | readonly [EffectTextureWrap, EffectTextureWrap];
    // Default: "linear".
    filter?: EffectTextureFilter;
};

// Geometry: regl-shaped POJO. Maps 1:1 to a raw-WebGL VAO today and WebGPU
// GPUVertexBufferLayout + primitive.topology tomorrow. Attribute names (not
// shaderLocation numbers) are the user contract; backend resolves to locations
// during program link, which keeps WGSL migration transparent to effect authors.
export type EffectAttributeTypedArray =
    | Float32Array | Uint8Array | Uint16Array | Uint32Array
    | Int8Array | Int16Array | Int32Array;

export type EffectAttributeDescriptor =
    | EffectAttributeTypedArray // shorthand: Float32Array, itemSize inferred from shader
    | {
          data: EffectAttributeTypedArray;
          itemSize: 1 | 2 | 3 | 4;
          normalized?: boolean;
          perInstance?: boolean; // ANGLE_instanced_arrays / WebGPU stepMode:"instance"
          // Optional explicit vertex attribute location. GLSL: honored via
          // gl.bindAttribLocation before link (otherwise auto). WGSL (future):
          // must match @location(N) in user's shader source. Omit for GLSL;
          // specify when writing raw WGSL.
          location?: number;
      };

export type EffectGeometry = {
    mode?: "triangles" | "lines" | "lineStrip" | "points"; // default: triangles
    attributes: Record<string, EffectAttributeDescriptor>; // "position" is conventional
    indices?: Uint16Array | Uint32Array;
    instanceCount?: number;
    drawRange?: { start?: number; count?: number };
};

// Opaque handle for the effect's "target region" quad:
//   element effect → current dst buffer (elementPixel + per-stage pad;
//                    `pad: 'fullscreen'` reaches canvas edges)
//   post effect    → canvas (= viewport + scrollPadding)
// Users cannot construct or extend it; treat it as an injected default.
export type EffectQuad = { readonly __brand: "EffectQuad" };

export type EffectDrawOpts = {
    frag: string;
    vert?: string;
    geometry?: EffectQuad | EffectGeometry; // default: ctx.quad
    uniforms?: EffectUniforms;
    // null  → use ctx.output (which itself may be null → canvas)
    // undef → same as null (field omitted)
    // Passing ctx.output explicitly and passing null are equivalent.
    target?: EffectRenderTarget | null;
};

// A read-only snapshot of the VFXProps keys that are still meaningful
// when `effect` is used. Keys that affect the orchestrator
// (type/intersection/release/overlay/zIndex/wrap) are applied outside
// the Effect and NOT surfaced here. `VFXProps.overflow` is shader-path
// only and is ignored by the effect path (pad is effect-declared).
export type EffectVFXProps = {
    readonly autoCrop: boolean;     // default: true
    readonly glslVersion: "100" | "300 es"; // default: "300 es"
};

export type EffectContext = {
    // High-level API (all values uploaded via the internal gl/ module)
    readonly time: number;
    readonly deltaTime: number;
    readonly pixelRatio: number;
    readonly resolution: readonly [number, number]; // physical px
    // Element-local bottom-left origin, physical px. Bottom-left matches
    // GLSL gl_FragCoord convention.
    //
    // NOTE: intentionally diverges from the shader path's `mouse` uniform
    // (which is canvas-space and pass-dependent). Effect authors migrating
    // a shader should account for the new origin/space.
    readonly mouse: readonly [number, number];
    // Viewport-local bottom-left origin, physical px. Same value across all
    // passes (no padding/buffer-space scaling).
    readonly mouseViewport: readonly [number, number];
    readonly intersection: number;
    readonly enterTime: number;
    readonly leaveTime: number;
    readonly src: EffectTexture;
    readonly output: EffectRenderTarget | null; // final target; null => canvas
    // User-supplied uniforms from VFXProps.uniforms, resolved every frame
    // (function-valued entries are evaluated before the update phase).
    // vfx-js's built-in uniforms (time/mouse/resolution/...) are NOT included
    // here — they are exposed as top-level ctx fields.
    readonly uniforms: Readonly<Record<string, EffectUniformValue>>;
    // Snapshot of VFXProps fields that survive the effect boundary.
    readonly vfxProps: EffectVFXProps;
    // Canonical fullscreen NDC (-1..1) quad. Draws through it use the
    // dst buffer rect (stage k's intermediate or final target), with the
    // chain setting `gl.viewport` to cover that buffer. For pixel-space
    // or custom-topology draws, supply an `EffectGeometry` instead.
    //
    // Convenience varyings auto-injected by the default vertex shader
    // (only active when the user does NOT supply a custom `vert`; custom
    // vertex shaders must compute their own mapping):
    //
    //   `in vec2 uv;`
    //     0..1 over the full dst buffer (inner + pad).
    //
    //   `in vec2 uvInner;`
    //     Sampling UV pointing into `ctx.src`'s INNER region (the
    //     element-content area within src). Always usable as
    //     `texture(src, uvInner)` to fetch element content regardless
    //     of whether src is the capture (inner-only texture) or a
    //     prior stage's intermediate (buffer with pad). Computed as
    //     `srcInnerRect.xy + uvInnerDst * srcInnerRect.zw`.
    //
    //   `in vec2 uvInnerDst;`
    //     0..1 over the CURRENT dst buffer's inner region (the element
    //     area in the buffer we are rendering into). Values outside
    //     [0, 1] mean the fragment is in the pad (overflow / bloom
    //     spread zone). Use for "am I inside the element?" gating.
    //
    // Auto-uploaded uniforms (for custom vertex shaders or advanced use):
    //   `uniform vec4 dstInnerRect;` — dst inner sub-rect in buffer UV
    //                                 (xy = origin, zw = size).
    //   `uniform vec4 srcInnerRect;` — src inner sub-rect in src texture
    //                                   UV. `(0,0,1,1)` for capture;
    //                                   `(pad/w, pad/h, inner/w, inner/h)`
    //                                   for intermediate inputs.
    readonly quad: EffectQuad;
    createRenderTarget(opts?: EffectRenderTargetOpts): EffectRenderTarget;
    // Wrap an externally-produced texture so it can be passed in uniforms.
    // WebGLTexture requires opts.size (no JS-side introspection available);
    // all other sources carry their own dimensions. Ownership of external
    // sources stays with the caller; DOM sources are uploaded internally
    // and the backing GPU resource is released on EffectHost.dispose().
    //
    // autoUpdate (re-upload the source on every frame):
    //   default → HTMLVideoElement / HTMLCanvasElement / OffscreenCanvas: true
    //             HTMLImageElement / ImageBitmap / WebGLTexture:         false
    //   explicit opts.autoUpdate overrides the default.
    //
    // wrap / filter default to "clamp" / "linear" (matches the internal
    // Texture class). Tuple wrap form specifies [wrapS, wrapT].
    //
    // No caching: calling wrapTexture twice with the same source allocates
    // two independent GPU textures. Hoist the call into init() and reuse the
    // handle across frames.
    wrapTexture(
        source: EffectTextureSource,
        opts?: {
            size?: readonly [number, number];
            autoUpdate?: boolean;
            wrap?: EffectTextureWrap | readonly [EffectTextureWrap, EffectTextureWrap];
            filter?: EffectTextureFilter;
        }
    ): EffectTexture;
    draw(opts: EffectDrawOpts): void; // geometry omitted => ctx.quad

    // Raw escape hatch: the live WebGL2 context VFX-JS renders into.
    // Use for custom GL operations (DataTexture upload, extensions, MRT, etc).
    // State left behind by raw `ctx.gl.*` calls does NOT need explicit reset —
    // every `ctx.draw()` re-binds program / framebuffer / viewport / blend /
    // VAO / uniforms, so state cannot leak from one draw to the next. But
    // resources allocated via `ctx.gl` are the caller's responsibility.
    readonly gl: WebGL2RenderingContext;
    // Subscribe to webglcontextrestored. Effect authors that allocated raw
    // GL resources via ctx.gl are responsible for rebuilding them here; RTs
    // / textures / geometries created via the high-level API (createRenderTarget
    // / wrapTexture / ctx.draw with EffectGeometry) are restored automatically.
    // Returns an unsubscribe function; automatically unsubscribed on dispose.
    onContextRestored(cb: () => void): () => void;
};

export interface Effect {
    init?(ctx: EffectContext): void | Promise<void>;
    // State-update only. ctx.src / ctx.output may point to stale/previous
    // frame handles during this phase, so ctx.draw() MUST NOT be called here.
    // If called, the orchestrator silently ignores it.
    update?(ctx: EffectContext): void;
    // Optional. If omitted, the effect is TRANSPARENT in the chain:
    // its slot produces no render pass, no intermediate RT is allocated,
    // and the previous rendering effect's output becomes the next rendering
    // effect's input directly. Use for update/init/dispose-only effects
    // (telemetry, external state coordination, debug hooks).
    render?(ctx: EffectContext): void;
    dispose?(): void;
    // Declares how this effect extends its output buffer relative to
    // src. Called every frame. The chain compares the resolved output
    // dimensions with the current intermediate and only reallocates
    // the RT when size or float differs (cheap equality check).
    //
    // If omitted, the effect writes to a buffer of the same size as
    // its src (no pad added). This is the right choice for simple
    // filters that don't grow content (grayscale, invert, posterize).
    //
    // Only meaningful when `render` is present AND the effect is not
    // the last rendering effect in the chain (the last effect's output
    // is the fixed final target, so its outputSize return value is
    // ignored).
    //
    // Return forms (in priority order):
    //   `{ pad: MarginOpts; float?: boolean }`
    //     Grow each side's pad by the given amount (physical px).
    //     `pad: 10` is shorthand for `{top:10, right:10, bottom:10, left:10}`.
    //     The dst buffer size becomes `elementPixel + (src pad + pad)`
    //     on each axis. Use `dims.fullscreenPad` to reach canvas edges
    //     (= viewport + scrollPadding).
    //   `{ size: [w, h]; float?: boolean }` / `readonly [w, h]`
    //     Explicit absolute buffer size (physical px). The inner region's
    //     pixel size stays at `elementPixel`; extra pixels are distributed
    //     to each side of the pad proportionally to src's pad ratios
    //     (falls back to equal split when src has no pad). Buffer smaller
    //     than `elementPixel` on any axis triggers a dev warn + clamp.
    //
    // Units:
    //   input / elementPixel / canvasPixel / fullscreenPad / return value → physical px
    //   element / canvas                                                  → logical px
    //   pixelRatio → element × pixelRatio === elementPixel
    //
    // `canvas` / `canvasPixel` measure the WebGL canvas (= viewport-inner
    // + scrollPadding on each side). Post-effect context: `element` /
    // `elementPixel` mirror `canvas` / `canvasPixel`.
    //
    // Pad tracking is entirely internal to the chain. Effects never
    // observe the chain's accumulated pad directly — they only declare
    // deltas via `pad`, or absolute buffer sizes via `size`/`[w,h]`.
    // For "reach canvas edges (= viewport + scrollPadding)" the chain
    // provides `dims.fullscreenPad` which is the exact `pad` needed from
    // src's current pad to hit the canvas boundaries (>= 0 per side,
    // 0 if already at or beyond).
    outputSize?(dims: {
        readonly input: readonly [number, number];       // src buffer size
        readonly element: readonly [number, number];      // inner, logical px
        readonly elementPixel: readonly [number, number]; // inner, physical px
        readonly canvas: readonly [number, number];       // viewport+scrollPad, logical
        readonly canvasPixel: readonly [number, number];  // viewport+scrollPad, physical
        readonly pixelRatio: number;
        // Pad (physical px) needed to extend from src to the canvas edge
        // (= viewport + scrollPadding). Non-negative per side; 0 means
        // src already covers that edge. For post-effects, always 0
        // (src already spans the canvas).
        readonly fullscreenPad: {
            readonly top: number;
            readonly right: number;
            readonly bottom: number;
            readonly left: number;
        };
    }):
        | readonly [number, number]
        | { readonly size: readonly [number, number]; readonly float?: boolean }
        | {
              readonly pad:
                  | number
                  | readonly [number, number, number, number]
                  | {
                        readonly top?: number;
                        readonly right?: number;
                        readonly bottom?: number;
                        readonly left?: number;
                    };
              readonly float?: boolean;
          };
}
```

Add `effect?: Effect | readonly Effect[];` to `VFXProps` (`packages/vfx-js/src/types.ts:192-327`). Mutually exclusive with `shader`. If both are specified, `effect` takes precedence and a dev warning is emitted. The single form is internally normalized to a length-1 array. An empty array emits a dev warning and copies the element capture directly to the final target (identity chain).

Add `effect?: Effect | readonly Effect[];` to `VFXPostEffect` as well (same shape). When `postEffect.effect` is set, the post-effect slot runs the Effect pipeline against the viewport capture instead of the shader-based `PostEffectPass`, and `VFXPostEffect.shader` becomes optional (mutually exclusive with `effect` — same dev warning as `VFXProps`).

**How existing `VFXProps` fields flow through to effects**:

| field | behavior when `effect` is set |
| --- | --- |
| `shader` | mutually exclusive (dev warning + ignored) |
| `uniforms` | piped into `ctx.uniforms` (function-valued entries evaluated per frame, before `update`) |
| `backbuffer` | ignored for effects (NOT piped into `ctx.vfxProps`); use `ctx.createRenderTarget({ persistent: true })` for equivalent double-buffered behavior |
| `autoCrop` / `glslVersion` | piped into `ctx.vfxProps` as a read-only snapshot |
| `overflow` | **shader-path only**. Ignored by the effect path — effect authors control pad via each effect's own `outputSize` / constructor parameter. Emits a dev warning if set alongside `effect`. |
| `intersection` / `release` / `overlay` / `zIndex` / `wrap` | handled by the orchestrator as today (unchanged) |

### Public exports (packages/vfx-js/src/index.ts)

```ts
export type {
    Effect, EffectContext, EffectVFXProps,
    EffectTexture, EffectTextureSource, EffectTextureWrap, EffectTextureFilter,
    EffectRenderTarget, EffectQuad,
    EffectUniforms, EffectUniformValue,
    EffectGeometry, EffectAttributeDescriptor, EffectAttributeTypedArray,
    EffectRenderTargetOpts, EffectDrawOpts,
} from "./types.js";
```

Existing `VFXOpts / VFXProps / VFXPostEffect / VFXPass` remain unchanged.

### User-side usage example

```ts
// effect-my-bloom/package.json
//   "devDependencies": { "@vfx-js/core": "^0.12.0" }
// effect-my-bloom/src/index.ts
import type { Effect, EffectRenderTarget } from "@vfx-js/core"; // erased at compile

const FRAG_THRESHOLD = `...`;
const FRAG_BLUR = `...`;
const FRAG_COMPOSITE = `...`;

export type BloomOptions = {
    /** pad around the element in physical px, or "fullscreen". Default 0. */
    pad?: number | "fullscreen";
    iterations?: number;
};

export function createBloomEffect(opts: BloomOptions = {}): Effect {
    const { pad = 0, iterations = 6 } = opts;
    let bright: EffectRenderTarget | null = null;
    let pingA: EffectRenderTarget | null = null;
    let pingB: EffectRenderTarget | null = null;

    return {
        init(ctx) {
            bright = ctx.createRenderTarget();
            pingA = ctx.createRenderTarget();
            pingB = ctx.createRenderTarget();
        },
        // Grow the dst buffer so the glow has room to spread beyond the
        // element. `pad` is the delta added on top of src's pad —
        // chain accumulates without the effect author knowing the src
        // pad explicitly.
        outputSize(dims) {
            if (pad === "fullscreen") {
                return { pad: dims.fullscreenPad };
            }
            return { pad: pad };
        },
        render(ctx) {
            if (!bright || !pingA || !pingB) return;
            // 1. Extract bright pixels. `texture(src, uvInner)` works
            //    whether ctx.src is capture (inner-only) or a prior
            //    stage's intermediate (buffer with pad) — uvInner is the
            //    src-sampling UV into src's inner region.
            ctx.draw({
                frag: FRAG_THRESHOLD,
                uniforms: { src: ctx.src, threshold: 0.6 },
                target: bright,
            });
            // 2. Separable blur ping-pong (omitted).
            //    ...
            // 3. Composite src + bloom into final target.
            ctx.draw({
                frag: FRAG_COMPOSITE,
                uniforms: { src: ctx.src, bloom: pingB, intensity: 1.3 },
                target: ctx.output,
            });
        },
    };
}
```

Composition:

```ts
// Single effect
vfx.add(el, { effect: grayscale() });

// Pipeline — array order = pass order. Each effect's pad accumulates.
vfx.add(el, { effect: [
    posterize({ levels: 4 }),             // pad 0 (default)
    bloom({ pad: 80 }),                   // pad 80 → final buffer = element + 80px pad
]});

// Multiple pad-growing effects compose
vfx.add(el, { effect: [
    dilate({ pad: 10 }),                  // pad 10 → stage 1 src pad = 10
    shadow({ pad: 10 }),                  // pad 10 → stage 2 src pad = 20
]});

// Fullscreen pad (effect's own parameter, computed from dims.fullscreenPad)
vfx.add(el, { effect: bloom({ pad: "fullscreen" }) });

// Mixed: render-having effects form passes; render-less effects are transparent
vfx.add(el, { effect: [
    grayscale(),         // pass 0: capture → intermediate
    telemetry(),         // no render → skipped; grayscale output flows directly to bloom
    bloom({ pad: 80 }),  // pass 1: reads grayscale output, writes final target
]});
```

Stateful Effects are per-instance. **Do not reuse the same Effect object across multiple elements** — construct a new one every time via a factory function.

Custom geometry (e.g. line-strip trajectory overlay):

```ts
ctx.draw({
    frag: LINE_FRAG,
    vert: LINE_VERT,
    geometry: {
        mode: "lineStrip",
        attributes: {
            position: { data: positions, itemSize: 2 },
            aLife:    { data: life,      itemSize: 1 },
        },
    },
    uniforms: { color: [1, 0.4, 0.2] },
    target: ctx.output,
});
```

### Composition protocol

**Normalization**: `effect` accepts `Effect | readonly Effect[]` and is always handled internally as `readonly Effect[]`.

**Extracting rendering effects**: walk the array and collect the indices of effects that have a `render` method into `renderingIndices`. Let M = `renderingIndices.length`.

**Pad tracking invariants** (core of the composition model):

- **Inner physical size is constant across the chain** = `elementPixel` (element × pixelRatio) for element effects, `canvasPixel` for post effects.
- **Each intermediate buffer is `elementPixel + pad_total`** on each axis, where `pad_total.x = pad.left + pad.right` and `pad_total.y = pad.top + pad.bottom`.
- **Inner is positioned** at `(pad.left, pad.bottom)` within the buffer (GL bottom-left origin).
- **Pad monotonically non-decreasing**: `dst_pad[side] >= src_pad[side]` per side. Dev warn + clamp if an `outputSize` return would shrink pad on any side.
- **`pad` is always a delta** applied on top of src's pad; chain does the addition internally. Effects never observe the absolute accumulated pad.

**Chain initial state** (stage 0 src):
- Element effects: src = element capture texture. Capture is inner-only (no pad), so stage 0 src pad = 0.
- Post effects: src = viewport capture (a buffer that already spans the viewport); src pad = 0 (viewport is treated as the inner region).

**Intermediate RT allocation** (resolved every frame at the top of `chain.run`):
- If M = 0, no intermediates are needed.
- If M ≥ 1, allocate M - 1 intermediates.
- For each rendering effect, resolve the output pad + buffer size from its `outputSize(dims)` return:
  - `{ pad }`: `dst_pad = src_pad + pad` per side, then `buffer = elementPixel + pad_total`. `pad` normalized via `createMargin(MarginOpts)`.
  - `{ size }` / `[w, h]`: buffer size explicit. Imply pad as `(buffer - elementPixel)` total on each axis, distributed to each side proportionally to `src_pad` ratios (falls back to equal split when src has no pad).
  - Omitted: `pad = 0` → `buffer = src buffer size`.
  - `float: true` requests an RGBA16F/32F attachment (matching `Framebuffer`'s existing negotiation via `OES_texture_float_linear`).
- Pooled: the RT handle is kept alive across frames; only reallocated when the resolved `{ buffer_w, buffer_h, pad, float }` differs from the previous frame's.
- Every frame, before a rendering effect writes to its intermediate, the chain `gl.clear`s it (`COLOR_BUFFER_BIT`, clear color `0, 0, 0, 0`). Matches the shader-path per-pass clear in `vfx-player.ts:1062-1072`.

**`srcInnerRect` computation** (per stage, for the next stage's shader):
- For stage 0 src (capture): `(0, 0, 1, 1)` — capture is inner-only, 0..1 UV covers the inner.
- For stage k≥1 src (intermediate k-1): `(pad.left / buffer_w, pad.bottom / buffer_h, elementPixel_w / buffer_w, elementPixel_h / buffer_h)` — physical layout of the inner sub-rect within the intermediate.

**`fullscreenPad` computation** (per stage, passed as `dims.fullscreenPad` to `outputSize`):
- For element effects: `fullscreenPad[side] = max(0, canvas_edge_distance[side] - src_pad[side])` per side, where `canvas_edge_distance` is the physical-px distance from the element's edge to the **canvas** edge (= viewport-inner + scrollPadding) on that side. An effect returning `{ pad: dims.fullscreenPad }` ends up with `dst_pad = canvas_edge_distance` (clamped non-negative). The `pad: 'fullscreen'` semantics therefore cover the scrollPadding region — necessary so a scroll within the scrollPadding range doesn't reveal an undrawn band.
- For post effects: always `{ top: 0, right: 0, bottom: 0, left: 0 }` (src already spans the viewport).

**Per-frame execution order** (only runs when the element is visible, i.e. `isVisible === true`. Off-viewport / post-release elements skip the chain entirely — both update and render are suppressed, matching the existing shader path):

1. **uniform resolve**: evaluate function-valued entries in `VFXProps.uniforms` and write the results into each host's `ctx.uniforms`
2. **outputSize resolve**: walk `renderingIndices` in order, call each effect's `outputSize?.(dims)`, apply pad to src pad to get dst pad, compute buffer size, and reallocate the corresponding intermediate RT only when buffer size / pad / float differ from the previous frame. Update each host's `srcInnerRect` and `dstInnerRect` uniforms for this frame.
3. **update phase**: call `update?.(ctx)` on every effect in array order (ctx.src / ctx.output may carry over from the previous frame — update is state-update only). `ctx.draw()` is a no-op when called here (silently ignored, dev warning once per host)
4. **render phase**: walk `renderingIndices` in order. For the k-th rendering effect (original-array index i):
   - `ctx.src` = (k = 0) ? element capture's `EffectTexture` : the `EffectTexture` resolver pointing at `intermediates[k-1]`'s current read texture
   - `ctx.output` = (k = M - 1) ? final target (post-RT handle or `null` for canvas) : `intermediates[k]`
   - call `effects[i].render(ctx)` (the effect does not know its position in the chain)
5. **M = 0 special case**: when only update-only effects exist, the entire chain is transparent. The orchestrator copies capture → final target once via its internal passthrough program (to prevent the element from silently disappearing)

**Mutation of the ctx object**: each effect owns its **own `EffectContext` object** (owned by EffectHost). The orchestrator merely rewrites `src` / `output` / `time` / `deltaTime` / `mouse` etc. on that object during the render phase — it never creates a new object (for reference stability and to reduce allocations).

**Lifecycle ordering**:
- `init`: array order, **sequential + await** (wait for the Promise to resolve before moving on). Sequential (not parallel) because the effect array's order reflects the user's explicit pipeline order; keeping init in the same order preserves deterministic side-effect sequencing
- `update`: every frame, array order (only when the element is visible)
- `render`: every frame, `renderingIndices` order (only when the element is visible)
- `dispose`: on element removal, **reverse array order**; each `EffectHost.dispose()` fires at the same time

**Error handling**:
- `init` throws/rejects → element registration is aborted, `console.error` with the effect index and the original error, prior effects in the same element get their `dispose` called in reverse order (the **failing effect's own `dispose` is NOT called** — init did not complete, so no post-init invariant is assumed), element NOT inserted into `#elements`
- `update` throws → `console.warn` once per (element, effect) pair, that frame's `update` for the offending effect is skipped; subsequent frames continue to call it
- `render` throws → `console.warn` once per (element, effect) pair; the effect's slot is replaced by a **passthrough copy (input → output)** for that frame (internal passthrough program, same as the M = 0 special case). Applies uniformly to middle and last effects — the last effect's failure still writes the previous effect's output to the final target so the element does not visually disappear. Subsequent frames continue to call the effect
- `dispose` throws → `console.error` and continue with remaining disposes (one broken dispose does not leak later ones)

**Persistent render target semantics**:
- `createRenderTarget({ persistent: true })` returns an `EffectRenderTarget` handle backed internally by a `Backbuffer` (`packages/vfx-js/src/backbuffer.ts`). Always pass the RT itself (not a separately-extracted texture) as a uniform — the backend resolves the current read texture at bind time. Before `ctx.draw({ target: rt, uniforms: { prev: rt } })` the handle's read texture points to the previous frame's write; after the draw the orchestrator swaps, so the same handle now exposes the just-written data as its read texture (ready to be consumed by the next frame or by a subsequent pass in the same frame). This matches the multipass `persistent: true` behavior in `vfx-player.ts:836-844`.
- After a context-lost/restored cycle, persistent RTs come back zero-initialized (their accumulated pixel history is lost) — same behavior as the shader-based multipass path.
- Non-persistent RTs do NOT swap — writing to an RT and reading it via the same uniform in the same pass is a feedback loop (GL undefined behavior). The orchestrator does not detect this; it is the effect author's responsibility.

**Texture update semantics**:
- `ctx.wrapTexture(source, { autoUpdate: true })` internally sets `Texture.needsUpdate = true` every frame before any bind in the current frame's render phase, which triggers the existing `Texture.#upload()` path (see `gl/texture.ts`). `autoUpdate: false` uploads once at first bind and leaves `needsUpdate` alone afterwards.
- `WebGLTexture` sources bypass the `Texture` class's upload machinery entirely — the handle points to the raw GL texture and the caller owns its contents; `autoUpdate` is a no-op. The resulting `EffectTexture` is **NOT registered with `GLContext` as `Restorable`** — on context loss the raw handle dies and the caller must re-allocate + re-wrap in `ctx.onContextRestored(cb)`. DOM-backed wraps ARE registered and restore automatically.

**State-sharing rule** (to be documented explicitly):
> Effect instances are stateful. Do not share a single Effect object across multiple elements — use a factory function that returns a new Effect per call. This also means the per-host material/geometry cache stays per-instance (intentional: two elements using the same effect factory must maintain independent GL state).

## Implementation

### Files to modify

- **`packages/vfx-js/src/types.ts`** — add the new types above, add `effect?` to `VFXProps`
- **`packages/vfx-js/src/index.ts`** — add new type exports
- **`packages/vfx-js/src/vfx-player.ts`** — wire in the Effect path (see below)
- **`packages/vfx-js/src/gl/texture.ts`** — extend to accept `minFilter` / `magFilter` (currently hardcoded `LINEAR`) so `wrapTexture`'s `filter` option flows through to the underlying texture
- **`packages/vfx-js/src/gl/framebuffer.ts`** — extend to accept `wrap` / `filter` opts (currently hardcoded `LINEAR` min/mag + `CLAMP_TO_EDGE` wrap) so `createRenderTarget`'s `wrap` / `filter` flow through to the attachment texture
- **`packages/vfx-js/src/effect-host.ts`** (new) — `EffectContext` implementation, program/VAO caches for draw, RT (FBO + texture) management
- **`packages/vfx-js/src/effect-chain.ts`** (new) — pipeline orchestrator: intermediate RT management, ctx.src/ctx.output swapping, ordering of init / update / render / dispose
- **`packages/vfx-js/src/effect-geometry.ts`** (new) — `EffectGeometry` POJO → VAO + VBO/IBO compile (cached via `WeakMap<EffectGeometry, Map<Program, ...>>`), and `EffectQuad` resolution (trivial — the token always maps to the shared fullscreen `Quad`; geometry size semantics live in `gl.viewport`, not the VBO)
- **`packages/vfx-js/src/vfx.ts`** — pass `effect` through `add()` / `addHTML()` (mostly a pass-through)

### Changes to VFXPlayer (packages/vfx-js/src/vfx-player.ts)

1. At the top of `addElement` (L280-570), detect `opts.effect` and skip the shader path (passes construction) to run the Effect path instead
2. New `#addEffectElement(element, opts)`:
   - Create a VFXElement (reuse the existing flow for `type`, `element`, source capture via `new Texture(this.#ctx, source)`)
   - Normalize `opts.effect` to `readonly Effect[]`
   - For each effect, instantiate an `EffectHost` (1:1 with the effect). `EffectHost`:
     - Holds references to the shared `GLContext` (`this.#ctx`), the shared `Quad` (`this.#quad`), and the `#pixelRatio`
     - Caches compiled programs in a `Map<string, Program>` keyed by `frag + "\x00" + vert`. `Program` self-registers with the `GLContext`, so context loss recovery is automatic
     - Holds a `WeakMap<EffectGeometry, Map<Program, { vao, vbos, ibo, restorable }>>` to lazily compile + cache geometry POJOs per (geometry, program) pair. The program dimension is required because `gl.getAttribLocation` results are program-specific; caching a VAO against just the geometry would break on a second program with different attribute name → location assignments. Each entry implements the `Restorable` protocol and is registered on `GLContext` (same lifecycle treatment as `Quad` / `Program` / `Framebuffer` / `Texture`)
     - `ctx.quad` is an `EffectQuad` opaque token that always resolves to the shared `this.#quad` (NDC -1..1 fullscreen). The viewport rect (current stage's dst buffer — `elementPixel + per-stage pad` for element effects, `viewport + scrollPadding` for post effects) is set by the host before the draw, so the NDC quad maps 1:1 to the target region. No per-effect VAO is needed for this path. Effects wanting pixel-space or custom-topology vertices supply an `EffectGeometry` instead
     - `createRenderTarget(opts)` allocates a `Framebuffer` or a `Backbuffer` (for `persistent: true`, reusing `packages/vfx-js/src/backbuffer.ts`) and returns a branded handle that wraps it, applying the `wrap` / `filter` options to the underlying texture (for `Backbuffer`, applied to both internal `Framebuffer`s). Both classes already self-register with `GLContext` for context-loss recovery
       - **`Backbuffer` + `size` handling**: `Backbuffer`'s constructor takes `(width, height, pixelRatio, float)` and multiplies internally (see `backbuffer.ts:29-34`), and `resize(w, h)` also takes logical-px. But `EffectRenderTargetOpts.size` is **physical pixels**. The host normalizes:
         - `opts.size` specified (fixed size, no auto-resize): instantiate `Backbuffer` with `pixelRatio=1` and pass `size[0]` / `size[1]` directly
         - `opts.size` omitted (tracks element/viewport size): instantiate `Backbuffer` with `pixelRatio=this.#pixelRatio` and pass the current logical-px dimensions; on auto-resize, call `backbuffer.resize(logicalW, logicalH)`
       - `Framebuffer` path is simpler: always allocate in physical px (`opts.size` directly, or logical × pixelRatio for auto-resize)
     - Holds a single internal passthrough `Pass` for the M=0 identity copy (the program cache ensures a single compile per unique shader source across the host's lifetime)
     - Managed resources are released collectively in `dispose()`: each `Program.dispose()` / `Framebuffer.dispose()` / `Texture.dispose()` / `Backbuffer.dispose()` call unregisters from `GLContext` and calls the appropriate `gl.delete*`. The `ctx.gl` escape hatch does NOT have its allocations tracked — anything allocated there is the caller's responsibility unless the caller hands the handle back via `ctx.wrapTexture` (which then owns the lifetime)
   - Instantiate an `EffectChain`. `EffectChain`:
     - Holds `hosts: EffectHost[]` (1:1 with effects)
     - Computes `renderingIndices: number[]` (indices of effects with a `render`)
     - Holds `intermediates: (EffectRenderTarget | null)[]` (length M-1, M = renderingIndices.length)
     - Provides `resolveIntermediates(elementSize, viewportSize, pixelRatio)` which queries each rendering effect's `outputSize()` in order to propagate input→output. Called every frame; only reallocates intermediates whose size actually changed (cheap equality check first)
     - Provides `run(capture, finalTarget)` to execute each frame: uniform-resolve → outputSize-resolve → update phase → render phase. Also handles the M=0 identity-copy special case and the per-failed-effect passthrough-copy fallback
     - `dispose()` calls each effect's `dispose()` and each host's `dispose()` in reverse array order, and releases intermediate RTs
   - Call `await effects[i].init?.(hosts[i].ctx)` sequentially in array order
   - Insert the element into `#elements`; `#hitTest` works the same as before
3. In the loop in `render()` (L668-969), if an element is the effect type, instead of the existing passes rendering:
   - Skip the chain entirely when `!hit.isVisible` (same gate as the shader path), so both update and render are suppressed for off-viewport / post-release elements
   - Reflect the per-frame chain state into each host's ctx (EffectChain does this in bulk): `time`, `deltaTime`, `pixelRatio`, `resolution`, `mouse` (element-local bottom-left physical px), `mouseViewport` (viewport-local bottom-left physical px), `intersection`, `enterTime`, `leaveTime`, and the resolved `ctx.uniforms`. Also update each host's auto-uniform slots `dstInnerRect` (dst inner sub-rect) and `srcInnerRect` (src inner sub-rect) for the current stage
   - Call `chain.run(elementCapture, finalTarget)`
   - `finalTarget` branches on whether post-effects are present:
     - With post-effects: wrap `#postEffectTarget` in an `EffectRenderTarget` handle and pass it. **Handle cached at the host level** and regenerated only when the underlying `Framebuffer` instance changes (`#setupPostEffectTarget` reallocates on viewport resize). This keeps `ctx.output` reference-stable across frames so effects can compare identity for "output changed" checks
     - Without post-effects: `null` (→ draw directly to canvas), with the chain setting the viewport via `gl.viewport` to the last effect's dst buffer rect on the canvas (`elementPixel + accumulated pad`, positioned at the element's canvas-space origin minus pad)
4. `chain.resolveIntermediates(...)` is called once per frame at the top of `chain.run` — no separate element/viewport resize hook is needed (the per-frame outputSize call naturally tracks size changes; RTs are only reallocated when the size differs)
5. `removeElement`: call `chain.dispose()` only (it handles effect.dispose and host.dispose internally in bulk)
6. For `VFXPostEffect.effect`, do the same wiring at the post-effect slot: one `EffectChain` whose first input is the viewport capture, final output is `null` (canvas). The branch lives alongside the existing `#renderPostEffects` path (L1202-1375). When a single post-effect slot has `effect` set, its `shader` field is ignored (dev warning if both present)

### draw implementation details

- **Self-contained draws**: every `ctx.draw()` call performs a full binding sequence (program → framebuffer → viewport → blend → VAO → uniform upload) before dispatching the draw, so no state leaks from one draw to the next, and any raw `ctx.gl.*` mutations an effect author makes between draws are harmless. No explicit reset API is exposed.
- **Program cache**: `Map<string, Program>` keyed by `frag + "\x00" + vert` (source-identical draws reuse the compiled program). `Program` already handles active-uniform introspection (the existing `ActiveUniform` table in `gl/program.ts`) and GLSL version auto-detection via `detectGlslVersion`; the host just passes `vfxProps.glslVersion` when provided
- **Quad fast path**: when `geometry` is `ctx.quad` AND the effect is drawing against the default target region (current stage's dst buffer, or viewport + scrollPadding for post effects), dispatch through `renderPass(gl, this.#quad, pass, target, viewport, ...)` — the same path the shader-based effect pipeline already uses. The NDC -1..1 mapping plus the `viewport` clip rectangle match the existing coordinate convention, so no per-host quad VAO is allocated
- **`uvInner` / `uvInnerDst` varyings**: the default vertex shader (used when `EffectDrawOpts.vert` is omitted) emits three varyings:
  - `uv` — 0..1 over the full dst buffer (inner + pad).
  - `uvInnerDst` — `(bufferUV - dstInnerRect.xy) / dstInnerRect.zw`. 0..1 over the current dst buffer's inner region. Used for "am I in the element proper?" gating.
  - `uvInner` — `srcInnerRect.xy + uvInnerDst * srcInnerRect.zw`. The src-sampling UV pointing into src's inner region. `texture(src, uvInner)` fetches element content regardless of src's physical layout.

  Two auto-uploaded uniforms drive this:
  - `uniform vec4 dstInnerRect;` — dst inner sub-rect in buffer UV (xy = origin, zw = size). For element effects stage k, `(pad.left / buffer_w, pad.bottom / buffer_h, elementPixel_w / buffer_w, elementPixel_h / buffer_h)`. For post effects (no pad), `(0, 0, 1, 1)`.
  - `uniform vec4 srcInnerRect;` — src inner sub-rect in src texture UV. `(0, 0, 1, 1)` for stage 0's capture (capture is inner-only). For stage k≥1, matches the previous intermediate's `dstInnerRect`.

  Custom `vert` users must compute `uvInner` / `uvInnerDst` themselves if they want them; the two `*Rect` uniforms are still auto-uploaded so the data is available.
- **Custom geometry**: `EffectGeometry` POJO → compiled to a VAO via the `WeakMap<EffectGeometry, Map<Program, VaoEntry>>` cache. Attribute descriptors → `gl.bufferData` + `gl.vertexAttribPointer` (+ `gl.vertexAttribDivisor(loc, 1)` for `perInstance: true`), `indices` → `gl.bufferData(ELEMENT_ARRAY_BUFFER, ...)`, and `mode` maps to the GL primitive (`TRIANGLES` / `LINES` / `LINE_STRIP` / `POINTS`). Each entry implements `Restorable` so a context-lost recovery rebuilds it. Reusing the same POJO reference with the same program is a cache hit; a new reference or a different program rebuilds
- **Uniform dispatch**: reuse `Program`'s existing active-uniform table. `EffectUniformValue` → internal `UniformValue` (see `gl/program.ts:6-19`) is a 1:1 map: `number`, `boolean`, tuples, `number[]`, typed arrays (`Float32Array` / `Int32Array` / `Uint32Array`) pass straight through; `EffectTexture` and `EffectRenderTarget` both resolve (at bind time) to the internal `Texture` instance — for persistent RTs this resolves to the current read texture of the underlying `Backbuffer`. The backend assigns a texture unit, calls `Texture.bind(unit)`, and uploads `uniform1i(loc, unit)`
- **Scalar / tuple type dispatch**: driven entirely by the shader's active uniform type (already handled by `uploadScalarUniform` in `gl/program.ts:243-407`). `[1, 2]` against `uniform vec2` uses `uniform2f`; the same tuple against `uniform ivec2` uses `uniform2i`; `number` against `uniform bool` uses `uniform1i(loc, v ? 1 : 0)`. Effect authors don't need separate tag types
- **`number[]` / typed-array shape dispatch**: the active uniform's GL type drives the call — `FLOAT_MAT3` → `uniformMatrix3fv(loc, false, data)`, `FLOAT_MAT4` → `uniformMatrix4fv(loc, false, data)`, `FLOAT` array → `uniform1fv`, `FLOAT_VEC4` array → `uniform4fv`, `INT` array → `uniform1iv`, `UNSIGNED_INT_VEC3` array → `uniform3uiv`, etc. Length mismatch (e.g. 9-element against `vec4[]`) is a dev warning + skipped upload
- **Draw flow**: `renderPass` already handles framebuffer bind, viewport/blend state, uniform upload, and the `Quad.draw()` dispatch. For custom geometry we inline the equivalent sequence but call `gl.bindVertexArray(effectVao)` and `gl.drawElements / drawArrays / drawElementsInstanced` depending on `indices` + `instanceCount`. If the target is a persistent RT (`Backbuffer`), call `backbuffer.swap()` after the draw — matching `vfx-player.ts:836-844`
- **target resolution**: `null` / omitted → fall back to `ctx.output`. `ctx.output === null` → bind the default framebuffer (canvas) with a viewport matching the element rect (element effect) or the viewport rect (post effect). `ctx.output === EffectRenderTarget` → bind its FBO with a viewport of `(0, 0, rt.width, rt.height)`
- **Attribute names**: the linker resolves names → locations, but `Program` pre-binds `"position"` to location 0 (see `gl/program.ts` + `Quad`). Custom geometries that use `position` inherit this. For other names, rely on link-time auto-assignment. When `location?` is set on a descriptor, call `gl.bindAttribLocation(program, location, name)` before link (requires the program cache key to include the location map — or simply skip the cache for this rare case)
- **Passthrough pass**: the host keeps a single internal passthrough `Pass` (copy `src` uniform → target) used for (a) the M = 0 identity copy and (b) the per-failed-effect fallback. Amortized over the host's lifetime (one compile per unique shader source via the program cache)
- **Context-loss recovery**: every GL resource the host owns (`Program`, `Framebuffer`, `Backbuffer`, `Texture`, and the custom-geometry VAO entries) implements or wraps `Restorable`, so `GLContext`'s `webglcontextrestored` handler rebuilds them automatically. Effect authors whose `init` allocated via `ctx.gl` directly are responsible for re-allocating in a `GLContext.onContextRestored` subscription (exposed via `ctx.onContextRestored(cb)` — add this to the ctx surface)
- **Future WGSL support**: contract is that the user shader's `@location(N)` matches descriptor `location`. Today (GLSL only), `location?` is optional and works when unset

### Impact on existing code

- `VFXProps.shader` is not deprecated (would affect existing users and the 23 presets)
- The Effect path is a completely independent code path. Logic around shader/post-effect is untouched
- The Effect path reuses the same `gl/*` primitives (`GLContext` / `Program` / `Framebuffer` / `Texture` / `Quad` / `Pass` / `renderPass`) as the shader path, so context-loss recovery, GLSL-version auto-detection, and the existing float/half-float RT negotiation all work transparently
- Internally, the shader/pass implementation could also be rewritten using Effect in the future (not in this PR)

## Verification

1. **Type check**: `npm --workspace=@vfx-js/core run build` produces the dual ESM/CJS build and exports the new types in `lib/esm/index.d.ts`
2. **Unit tests**: add `packages/vfx-js/src/effect-host.test.ts` and `packages/vfx-js/src/effect-chain.test.ts` (Vitest)
   - EffectHost:
     - draw's program cache collapses to one `WebGLProgram` when (frag, vert) matches
     - passing the same `EffectGeometry` reference twice with the same program reuses the VAO (cache hit); a different `EffectGeometry` reference rebuilds; the same `EffectGeometry` with a different `(frag, vert)` pair also rebuilds (program dimension of the cache key)
     - `perInstance: true` causes `gl.vertexAttribDivisor(loc, 1)` and `drawElementsInstanced` at draw time
     - `mode: "lineStrip"` dispatches `gl.drawArrays/drawElements` with `LINE_STRIP`
     - draw with `ctx.quad` omitted and draw with it specified explicitly produce the same result
     - `number[]` length 9 against a `mat3` uniform uploads via `uniformMatrix3fv`; length 16 against `mat4` uses `uniformMatrix4fv`; mismatched length emits a dev warning and skips the upload
     - `boolean` uniform uploads via `uniform1i(loc, value ? 1 : 0)`
     - `createRenderTarget({ persistent: true })` returns a handle whose bound texture flips across draws (passing the RT as a uniform reads the previous-frame write; verified by rendering a distinct color each frame and reading back)
     - `createRenderTarget`'s `wrap` / `filter` options flow through to the underlying `Framebuffer`'s attachment texture
     - `wrapTexture` on `HTMLVideoElement` auto-uploads every frame (default), and `autoUpdate: false` suppresses re-uploads
     - `wrapTexture` on `HTMLImageElement` uploads once and does NOT re-upload per frame (default); `autoUpdate: true` opts in
     - `wrapTexture`'s `wrap` and `filter` options flow through to the underlying `Texture` (e.g. `wrap: "repeat"` produces `gl.REPEAT` on both axes; `filter: "nearest"` sets `TEXTURE_MIN/MAG_FILTER = NEAREST`)
     - after a raw `ctx.gl.useProgram(...)` / `ctx.gl.bindVertexArray(null)` / etc., the next `ctx.draw` still renders correctly (self-contained draw re-binds everything)
     - `EffectHost.dispose()` calls `dispose()` on every owned `Program` / `Framebuffer` / `Backbuffer` / `Texture` (so they unregister from `GLContext` and `gl.delete*` their handles) and deletes custom-geometry VAOs / VBOs / IBOs
     - after a simulated `webglcontextlost` + `webglcontextrestored` cycle, the same effect renders the same output in the next frame (programs / FBOs / textures / VAOs are all rebuilt via `Restorable`). Persistent RTs come back zero-initialized
   - EffectChain:
     - a single Effect and a length-1 array behave identically
     - with N=3 and three rendering effects, 2 intermediates are allocated and src/output are swapped per pass
     - when an intermediate effect has no `render`, that slot is skipped and the previous effect's output becomes the src of the next rendering effect (one fewer intermediate)
     - when every effect lacks render, the M=0 special case copies capture → finalTarget once
     - **`outputSize({pad: N})` grows each side's pad by N**: buffer = elementPixel + (src_pad + pad) sums. Stage 0 src pad = 0 so dst pad = pad; stage k inherits accumulated pad
     - **Stacked `pad`**: `[effectA({pad: 10}), effectB({pad: 10})]` → final buffer's pad = 20 per side
     - **`outputSize({pad: …})` with asymmetric per-side values** (e.g. `{top: 0, right: 50, bottom: 0, left: 50}`) produces an asymmetric buffer and `srcInnerRect` matches the physical layout
     - `outputSize({size: [w, h]})` distributes extra pad proportionally to src's pad ratios; buffer < elementPixel on any axis → dev warn + clamp
     - `outputSize` returning `{pad: M}` with M < 0 on any side → dev warn + clamp to 0 (pad monotonic non-decreasing)
     - `dims.fullscreenPad` equals the pad needed to extend src to canvas edges (= viewport + scrollPadding) per side (non-negative); effect returning `{pad: dims.fullscreenPad}` reaches canvas
     - `dims.fullscreenPad` for post effects is always `{top:0, right:0, bottom:0, left:0}` (post-effect src already spans the canvas)
     - LAST rendering effect's `outputSize` return value is ignored (final target is fixed)
     - **`srcInnerRect` uniform**: at stage 0 `(0, 0, 1, 1)` for capture; at stage k≥1 matches `pad.left/w, pad.bottom/h, elementPixel_w/w, elementPixel_h/h` of the previous intermediate
     - **`dstInnerRect` uniform**: per stage matches `pad.left/w, pad.bottom/h, elementPixel_w/w, elementPixel_h/h` of the CURRENT dst buffer
     - on element resize, intermediate sizes are recomputed and reallocated (reused when size / pad / float are unchanged)
     - `ctx.uniforms` reflects VFXProps.uniforms including function-valued entries (re-evaluated per frame, before update)
     - `ctx.mouse` and `ctx.mouseViewport` both use bottom-left origin and physical pixels; `mouse` is element-local and `mouseViewport` is viewport-local
     - `update()` that calls `ctx.draw()` produces no GL side effect (draw call is silently ignored)
     - when `init` returns a Promise, it is awaited sequentially (a later effect's init never runs before an earlier one finishes)
     - when `init` throws, prior effects in the chain have their `dispose` called in reverse order — the failing effect's own `dispose` is NOT called — and the element is NOT inserted into `#elements`
     - `outputSize` returning `{ pad, float: true }` / `{ size, float: true }` allocates an RGBA16F/RGBA32F intermediate; toggling `float` across frames reallocates
     - when a middle `render` throws, a `console.warn` is emitted once and the failed effect's slot is replaced by a passthrough copy (input → output) so the next effect reads a valid texture; subsequent frames continue to call the effect
     - when the last `render` throws, a passthrough copy is emitted into the final target so the element still renders the previous effect's output (does NOT disappear)
     - when the element is off-viewport (`isVisible === false`), neither `update` nor `render` is called
     - `dispose` is called in reverse array order
   - run: `npm --workspace=@vfx-js/core run test`
3. **Integration demo**: add `packages/storybook/src/Effect.stories.ts` and implement a bloom effect (deterministic, VRT-friendly) and a `[posterize, bloom]` chain story. Write effect modules assuming `@vfx-js/core` is a devDep and only `import type` is used; verify in a browser via `npm --workspace=storybook run dev`. The chain story exercises M=2 intermediate allocation, `pad` accumulation, and `srcInnerRect` propagation between stages.
4. **zero-runtime-dep check**: within the storybook story, only `import type { Effect } ...`, and grep the build output to verify no runtime imports of `@vfx-js/core` are included
5. **Existing tests**: `npm test` and `npm run lint` both pass

## Critical files

- `packages/vfx-js/src/types.ts` — add new types + add `VFXProps.effect` and `VFXPostEffect.effect`
- `packages/vfx-js/src/index.ts` — export new types
- `packages/vfx-js/src/vfx-player.ts` — branch on the effect path (`addElement` / `render` / `#renderPostEffects`)
- `packages/vfx-js/src/effect-host.ts` — new (EffectContext implementation; owns `Program` cache, `Framebuffer`/`Backbuffer`/`Texture` allocations, VAO WeakMap)
- `packages/vfx-js/src/effect-chain.ts` — new (pipeline orchestrator, intermediate RT management, ctx.src/ctx.output swapping, lifecycle ordering)
- `packages/vfx-js/src/effect-geometry.ts` — new (EffectGeometry → (geometry, program)-keyed VAO + VBO/IBO with `Restorable` wrapper; `EffectQuad` → shared `Quad`)
- `packages/vfx-js/src/gl/texture.ts` — extend: accept `minFilter` / `magFilter` (hardcoded `LINEAR` today) so `wrapTexture`'s `filter` flows through
- `packages/vfx-js/src/gl/framebuffer.ts` — extend: accept `wrap` / `filter` attachment opts (hardcoded `LINEAR` + `CLAMP_TO_EDGE` today) so `createRenderTarget`'s options flow through
- `packages/vfx-js/src/gl/{context,program,quad,pass,vec}.ts` — reused as-is
- `packages/vfx-js/src/backbuffer.ts` — reused as-is for `persistent: true` (the host normalizes `opts.size` physical-px → `Backbuffer`'s logical-px API; see "Backbuffer + `size` handling" above)
- `packages/vfx-js/src/vfx.ts` — pass `effect` through `add()` / `addHTML()`
- `packages/storybook/src/Effect.stories.ts` — new demo
