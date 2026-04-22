# Effect System Implementation Progress

Track per-task completion here. Format per entry:

```
## <task id>: <short description>
- commit: <hash>
- date: <YYYY-MM-DD>
- notes: <any deviations / gotchas / follow-ups>
```

---

## 1-1: Add Effect types to types.ts
- commit: 296ab44
- date: 2026-04-22
- notes: Appended public types (EffectTexture / EffectRenderTarget / EffectTextureSource / EffectTextureWrap / EffectTextureFilter / EffectUniformValue / EffectUniforms / EffectRenderTargetOpts / EffectAttributeTypedArray / EffectAttributeDescriptor / EffectGeometry / EffectQuad / EffectDrawOpts / EffectVFXProps / EffectContext / Effect) to types.ts. Added `effect?: Effect | readonly Effect[]` to both VFXProps and VFXPostEffect. Made VFXPostEffect.shader optional (mutually exclusive with effect). Build verification blocked by pre-existing tsconfig `ignoreDeprecations: "6.0"` incompatibility with tsc 5.8.3; verified types-only via direct tsc invocation with equivalent flags.

## 1-2: Export new types from index.ts
- commit: 175f464
- date: 2026-04-22
- notes: Exported all new Effect* types from index.ts. Making VFXPostEffect.shader optional surfaced a pre-existing non-null call site in vfx-player.ts#renderPostEffects — added a runtime guard (`throw new Error(...)` when shader undefined and effect branch not yet implemented). Task 4-4 will replace this guard with the actual effect-path branching.

## 2-1: Extend gl/texture.ts — configurable filter
- commit: a57082c
- date: 2026-04-22
- notes: Added `minFilter` / `magFilter: TextureFilter` fields (default `"linear"` = previous hardcoded behavior). Added `filterEnum` helper used in `#applyParams`. Exported `TextureFilter` from `gl/index.ts`. All existing tests pass (no constructor signature change).

## 2-2: Extend gl/framebuffer.ts — configurable wrap/filter
- commit: 805d320
- date: 2026-04-22
- notes: Framebuffer constructor accepts `wrap` / `filter` opts (forwarded to the attachment Texture before `#allocate`). `#allocate` now reads from the Texture's wrap/filter fields instead of hardcoding CLAMP/LINEAR. Backbuffer forwards `wrap` / `filter` to both inner Framebuffers. Local `wrapEnum` helper in framebuffer.ts mirrors texture.ts's (kept private to avoid cross-module export churn).

## 3-1: effect-geometry.ts
- commit: aab975a
- date: 2026-04-22
- notes: EFFECT_QUAD_TOKEN singleton + isEffectQuad typeguard. CompiledGeometry (Restorable) compiles an EffectGeometry POJO into VAO + VBOs + optional IBO against a specific Program; uses `getAttribLocation` to resolve attribute locations (cache is keyed `(geo, program)` because locations are program-specific). Supports mode (triangles/lines/lineStrip/points), indices (u16/u32), instanceCount, drawRange, perInstance, normalized. `location?` is ignored for GLSL today (would require re-linking the program; WGSL-future will honor it). EffectGeometryCache uses WeakMap primary lookup + a parallel Set so dispose() can iterate all entries (WeakMap isn't iterable).

## 3-2: effect-host.ts
- commit: 42faab3
- date: 2026-04-22
- notes: EffectHost owns the per-Effect EffectContext via getters on mutable backing fields (so the chain can mutate src/output/time/... without reallocating the ctx object). Program cache keyed `frag + "\x00" + vert`. createRenderTarget dispatches Framebuffer vs Backbuffer on `persistent`, normalizes `opts.size` per plan.md (backbuffer uses pr=1 for explicit size, pr=host.pixelRatio for auto-resize). wrapTexture duck-checks WebGLTexture vs DOM source (WebGLTexture is `interface WebGLTexture {}` in the DOM lib, so Exclude collapses against it — had to use explicit union cast). Auto-update defaults: video/canvas/OffscreenCanvas → true, image/bitmap/WebGLTexture → false. Draw is self-contained (program → FBO → viewport → blend → VAO → uniforms), applies `premultiplied` blend when output === null (canvas composite) and `none` when writing to an RT. passthroughCopy / clearRt / tickAutoUpdates expose host-internal operations to the chain. Touched `gl/texture.ts` to add `externalHandle` opt (Texture wraps a caller-owned WebGLTexture, skipping create/upload/restore/delete).

## 3-3: effect-chain.ts
- commit: 1c312fb
- date: 2026-04-22
- notes: EffectChain orchestrates the per-element pipeline. renderingIndices is computed once at construction (typeof render === "function"). run(input) reflects state into hosts, resolves intermediates (reallocate only on size/float delta), calls update phase (array order), then render phase (renderingIndices order). Each intermediate exposes two handles — an EffectRenderTarget for the producing effect's `ctx.output` and an EffectTexture for the next stage's `ctx.src` — so the public type contract that `ctx.src: EffectTexture` is preserved. Initialization is sequential with `await`; on throw the chain disposes prior effects in reverse order, disposes the failing host (to release any RTs its own init allocated), and rethrows. update/render throws warn once per effect index; render failures fall back to passthrough copy so the output doesn't disappear. finalTarget handle cached + regenerated only when the underlying Framebuffer instance changes.

## 4-1: addElement Effect branch
- commit: 13bde85
- date: 2026-04-22
- notes: addElement detects opts.effect and dispatches to #addEffectElement, which replays the shader path's texture/opacity prelude then builds an EffectChain. Shader+effect mutex emits dev warning (effect wins); empty array emits dev warning (identity chain). captureHandle is a resolver-form EffectTexture closing over elem.srcTexture so text re-render swaps propagate automatically. User uniforms split into static + generators. initAll is sequential + awaited; on failure the chain self-cleans priors + failing host, addElement releases srcTexture, restores opacity, and rejects. VFXElement gains optional chain/effectUniformGenerators/effectStaticUniforms/effectLastRenderTime fields (passes:[], bufferTargets:new Map() for effect elements). #hitTest now guards the shader-uniform writes (isVisible && !e.chain). #rerenderTextElement / updateCanvasElement / updateHICTexture rewritten to pull `oldTexture` from `e.srcTexture` and only touch `passes[0].uniforms["src"]` on the shader path. render() loop's effect branch is a placeholder `continue` (real chain.run in 4-2). removeElement routes chain elements to `chain.dispose()` (effects + hosts + intermediates); srcTexture.dispose + opacity restore stay in the shared tail.
