# Effect Interface for @vfx-js/core

## Context

The current `@vfx-js/core` treats effects as pure GLSL strings (`VFXPass[]`) and cannot hold JS-side state (see the preset definitions in `packages/vfx-js/src/constants.ts:41-64` and the `VFXPass` type in `packages/vfx-js/src/types.ts:18-64`). Complex effects (e.g. a fluid simulator) can only be built by constructing `VFXPass[]` on the storybook side, making them hard to distribute as reusable packages.

This change adds an Effect abstraction that satisfies the following:

- An Effect has optional init / update / render / dispose lifecycle hooks
- It can handle assets (render targets, etc.) and raw WebGL through a Context
- **Effect implementation packages only need `@vfx-js/core` as a devDependency** and import nothing at runtime (structural interface + types-only contract)
- **Composable**: accepts both `effect: grayscale` (single) and `effect: [grayscale, bloom]` (array). Arrays are chained into a pipeline in order.

## Design

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
//   element effect → element rect + overflow padding
//   post effect    → viewport + scrollPadding
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
// when `effect` is used. The keys that affect the orchestrator
// (overflow/type/intersection/release/overlay/zIndex/wrap) are applied
// outside the Effect and NOT surfaced here.
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
    // target's viewport rect (element rect + overflow for element effects,
    // viewport + scrollPadding for post effects), so vertex shaders operate
    // in NDC space that maps 1:1 to the target region. For pixel-space or
    // custom-topology draws, supply an `EffectGeometry` instead.
    //
    // Convenience varying — available in the fragment shader when draws
    // go through `ctx.quad`:
    //   `in vec2 uvInner;` — 0..1 covers the INNER region (element rect
    //   proper for element effects; viewport proper for post effects).
    //   Negative components or values >1 mean the fragment is in the
    //   overflow / scrollPadding pad. Auto-injected by the default vertex
    //   shader; only active when the user does NOT supply a custom `vert`
    //   (custom vertex shaders must compute their own mapping). For post
    //   effects overflow is zero, so `uvInner` equals the standard 0..1 UV.
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
    // Declares the output dimensions (and optional float flag) this effect
    // writes into ctx.output. Called every frame. The chain compares the
    // return value with the current intermediate and only reallocates the
    // RT when `size` OR `float` differs (cheap path is a no-op equality
    // check).
    //
    // If omitted, the default is the input size, non-float (i.e. ctx.src's
    // size at that slot, RGBA8). Only meaningful when render is present AND
    // the effect is not the last rendering effect in the chain (the last
    // effect's output is the fixed final target, so its outputSize return
    // value is ignored).
    //
    // `input` reflects the previous stage's output (or, for the first
    // rendering effect, element rect + overflow × pixelRatio). Overflow
    // is applied once at stage 1 and carried forward — it is NOT added
    // at every stage. Effects that want cumulative extra padding must
    // compute it explicitly from `dims.overflow` in their return value.
    //
    // Return forms:
    //   `[w, h]`                       → non-float RGBA8 of that size
    //   `{ size: [w, h], float?: bool }` → float true requests RGBA16F/32F
    //
    // Units:
    //   input / elementPixel / viewportPixel / overflow / return value → physical pixels
    //   element / viewport                                             → logical pixels (CSS px)
    //   pixelRatio → element × pixelRatio === elementPixel
    //
    // Post-effect context: `element` / `elementPixel` mirror
    // `viewport` / `viewportPixel`. `overflow` is always zero.
    outputSize?(dims: {
        readonly input: readonly [number, number];
        readonly element: readonly [number, number];
        readonly elementPixel: readonly [number, number];
        readonly viewport: readonly [number, number];
        readonly viewportPixel: readonly [number, number];
        // Margin padding around the element (physical px). Zero for post-effects.
        readonly overflow: {
            readonly top: number;
            readonly right: number;
            readonly bottom: number;
            readonly left: number;
        };
        readonly pixelRatio: number;
    }):
        | readonly [number, number]
        | { readonly size: readonly [number, number]; readonly float?: boolean };
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
| `overflow` / `intersection` / `release` / `overlay` / `zIndex` / `wrap` | handled by the orchestrator as today (unchanged) |

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
// effect-my-effect/package.json
//   "devDependencies": { "@vfx-js/core": "^0.12.0" }
// effect-my-effect/src/index.ts
import type { Effect, EffectRenderTarget } from "@vfx-js/core"; // erased at compile

const FRAG = `...`;

export function createTrailEffect(): Effect {
    let feedback: EffectRenderTarget | null = null;
    return {
        init(ctx) {
            feedback = ctx.createRenderTarget({ persistent: true });
        },
        render(ctx) {
            // geometry omitted → ctx.quad (element rect + overflow or
            // viewport + scrollPadding depending on effect type).
            // persistent=true: `feedback` as a uniform reads the previous
            // frame; after this draw the handle swaps internally so the
            // next read shows what we just wrote.
            ctx.draw({
                frag: FRAG,
                uniforms: { src: ctx.src, prev: feedback!, time: ctx.time },
                target: feedback,
            });
            ctx.draw({
                frag: `/* copy */`,
                uniforms: { src: feedback! },
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

// Pipeline — array order = pass order
vfx.add(el, { effect: [grayscale(), bloom({ threshold: 0.8 })] });

// Mixed: render-having effects form passes; render-less effects are transparent
vfx.add(el, { effect: [
    grayscale(),         // pass 0: capture → intermediate
    telemetry(),         // no render → skipped; grayscale output flows directly to bloom
    bloom({ ... }),      // pass 1: reads grayscale output, writes final target
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

**Intermediate RT allocation** (resolved every frame at the top of `chain.run`):
- If M = 0, no intermediates are needed
- If M ≥ 1, allocate M - 1 intermediates
- Each intermediate's size and format = the corresponding effect's `outputSize(dims)` return value (same size as input, non-float, if unspecified). Returning `{ size, float }` requests a float intermediate (RGBA16F or RGBA32F depending on `OES_texture_float_linear`, matching `Framebuffer`'s existing negotiation)
- `input` dims propagation (**overflow is applied once at stage 1 and carried forward**, not added cumulatively):
  - First rendering effect in the chain: `input` = **(element rect + overflow) × pixelRatio** for element effects; viewport+scrollPadding × pixelRatio for post effects
  - Subsequent effects: `input` = the previous rendering effect's resolved output size (whatever its `outputSize` returned, including the overflow pad that stage 1 baked in)
  - Effects wanting an additional padding per stage (e.g. cumulative blur-spread) compute it explicitly in their `outputSize`: `(dims) => [dims.input[0] + 2 * dims.overflow.left, ...]`
- Pooled: the RT handle is kept alive across frames; only reallocated when the resolved `{ size, float }` differs from the previous frame's. First frame allocates fresh; subsequent frames are a cheap equality check when both size and float are stable
- Every frame, before a rendering effect writes to its intermediate, the chain `gl.clear`s it (`COLOR_BUFFER_BIT`, clear color `0, 0, 0, 0`). Matches the shader-path per-pass clear in `vfx-player.ts:1062-1072`

**Per-frame execution order** (only runs when the element is visible, i.e. `isVisible === true`. Off-viewport / post-release elements skip the chain entirely — both update and render are suppressed, matching the existing shader path):

1. **uniform resolve**: evaluate function-valued entries in `VFXProps.uniforms` and write the results into each host's `ctx.uniforms`
2. **outputSize resolve**: walk `renderingIndices` in order, call each effect's `outputSize?.(dims)` (or default to input size), and reallocate the corresponding intermediate RT only when the size differs from the current one
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
     - `ctx.quad` is an `EffectQuad` opaque token that always resolves to the shared `this.#quad` (NDC -1..1 fullscreen). The viewport rect (element rect + overflow for element effects, viewport + scrollPadding for post effects) is set by the host before the draw, so the NDC quad maps 1:1 to the target region. No per-effect VAO is needed for this path. Effects wanting pixel-space or custom-topology vertices supply an `EffectGeometry` instead
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
   - Reflect the per-frame chain state into each host's ctx (EffectChain does this in bulk): `time`, `deltaTime`, `pixelRatio`, `resolution`, `mouse` (element-local bottom-left physical px), `mouseViewport` (viewport-local bottom-left physical px), `intersection`, `enterTime`, `leaveTime`, and the resolved `ctx.uniforms`
   - Call `chain.run(elementCapture, finalTarget)`
   - `finalTarget` branches on whether post-effects are present:
     - With post-effects: wrap `#postEffectTarget` in an `EffectRenderTarget` handle and pass it. **Handle cached at the host level** and regenerated only when the underlying `Framebuffer` instance changes (`#setupPostEffectTarget` reallocates on viewport resize). This keeps `ctx.output` reference-stable across frames so effects can compare identity for "output changed" checks
     - Without post-effects: `null` (→ draw directly to canvas), with the chain setting the viewport via `gl.viewport` matching the element rect
4. `chain.resolveIntermediates(...)` is called once per frame at the top of `chain.run` — no separate element/viewport resize hook is needed (the per-frame outputSize call naturally tracks size changes; RTs are only reallocated when the size differs)
5. `removeElement`: call `chain.dispose()` only (it handles effect.dispose and host.dispose internally in bulk)
6. For `VFXPostEffect.effect`, do the same wiring at the post-effect slot: one `EffectChain` whose first input is the viewport capture, final output is `null` (canvas). The branch lives alongside the existing `#renderPostEffects` path (L1202-1375). When a single post-effect slot has `effect` set, its `shader` field is ignored (dev warning if both present)

### draw implementation details

- **Self-contained draws**: every `ctx.draw()` call performs a full binding sequence (program → framebuffer → viewport → blend → VAO → uniform upload) before dispatching the draw, so no state leaks from one draw to the next, and any raw `ctx.gl.*` mutations an effect author makes between draws are harmless. No explicit reset API is exposed.
- **Program cache**: `Map<string, Program>` keyed by `frag + "\x00" + vert` (source-identical draws reuse the compiled program). `Program` already handles active-uniform introspection (the existing `ActiveUniform` table in `gl/program.ts`) and GLSL version auto-detection via `detectGlslVersion`; the host just passes `vfxProps.glslVersion` when provided
- **Quad fast path**: when `geometry` is `ctx.quad` AND the effect is drawing against the default target region (element rect + overflow, or viewport + scrollPadding), dispatch through `renderPass(gl, this.#quad, pass, target, viewport, ...)` — the same path the shader-based effect pipeline already uses. The NDC -1..1 mapping plus the `viewport` clip rectangle match the existing coordinate convention, so no per-host quad VAO is allocated
- **`uvInner` varying**: the default vertex shader (used when `EffectDrawOpts.vert` is omitted) emits a `vec2 uvInner` varying where 0..1 spans the inner region (element rect proper for element effects; viewport proper for post effects). Computed from NDC position and `uniform vec4 uvInnerRect` (xy=innerOrigin, zw=innerSize in buffer-pixel units), both auto-uploaded by the host from the current stage's `overflow` pad. Custom `vert` users must compute `uvInner` themselves if they want it — `uvInnerRect` is still auto-uploaded so the data is available. Post effects receive `overflow=0`, so `uvInner === (gl_FragCoord.xy / resolution)`
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
     - specifying `outputSize` allocates the corresponding intermediate at the specified physical-pixel size; the LAST rendering effect's `outputSize` return value is ignored (final target is fixed)
     - `outputSize` receives logical and physical pixel dims for element/viewport and physical-pixel `input` / return value
     - on element resize, intermediate sizes are recomputed and reallocated (reused when size is unchanged)
     - `ctx.uniforms` reflects VFXProps.uniforms including function-valued entries (re-evaluated per frame, before update)
     - `ctx.mouse` and `ctx.mouseViewport` both use bottom-left origin and physical pixels; `mouse` is element-local and `mouseViewport` is viewport-local
     - `update()` that calls `ctx.draw()` produces no GL side effect (draw call is silently ignored)
     - when `init` returns a Promise, it is awaited sequentially (a later effect's init never runs before an earlier one finishes)
     - when `init` throws, prior effects in the chain have their `dispose` called in reverse order — the failing effect's own `dispose` is NOT called — and the element is NOT inserted into `#elements`
     - `outputSize` returning `{ size, float: true }` allocates an RGBA16F/RGBA32F intermediate; toggling `float` across frames reallocates
     - when a middle `render` throws, a `console.warn` is emitted once and the failed effect's slot is replaced by a passthrough copy (input → output) so the next effect reads a valid texture; subsequent frames continue to call the effect
     - when the last `render` throws, a passthrough copy is emitted into the final target so the element still renders the previous effect's output (does NOT disappear)
     - when the element is off-viewport (`isVisible === false`), neither `update` nor `render` is called
     - `dispose` is called in reverse array order
   - run: `npm --workspace=@vfx-js/core run test`
3. **Integration demo**: add `packages/storybook/src/Effect.stories.ts` and implement a simple trail effect. Write it assuming `@vfx-js/core` is a devDep and only `import type` is used; verify in a browser via `npm --workspace=storybook run dev`
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
