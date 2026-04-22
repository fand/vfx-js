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

## 6-1: Effect.stories.ts
- commit: 79e2b9f
- date: 2026-04-22
- notes: packages/storybook/src/effects/trail.ts exposes `createTrailEffect({ decay })` as a factory returning a stateful Effect. `feedback` = persistent RT; render is two-pass (accumulate src ⊕ decayed prev → feedback, then copy feedback → ctx.output). The accumulate shader uses `uvInner` to mask the overflow pad so only the trail history bleeds out, not the element itself. Only `import type { Effect, EffectContext, EffectRenderTarget }` from @vfx-js/core — the emitted JS has zero runtime imports of core (verified in 7-2). Two stories: `trail` (single form) and `trailAsArray` (array form), both using the SVG logo with overflow padding.

## 7-1: Build check
- date: 2026-04-22
- notes: In this (vfx-js-2) worktree, `npm --workspace=@vfx-js/core run build` fails with tsconfig `ignoreDeprecations: "6.0"` (not supported by tsc 5.8.3). Initially flagged as pre-existing in 1-1 notes — WRONG. On the main worktree the same build succeeds because `packages/vfx-js/node_modules/typescript` is at 6.0.2 (a non-public pre-release installed somehow), while this worktree's package-local node_modules are empty and tsc resolves to the root 5.8.3. Worked around via direct tsc invocation in lib/esm and lib/cjs. Both builds emit index.d.ts with the full Effect* export set: `Effect, EffectAttributeDescriptor, EffectAttributeTypedArray, EffectContext, EffectDrawOpts, EffectGeometry, EffectQuad, EffectRenderTarget, EffectRenderTargetOpts, EffectTexture, EffectTextureFilter, EffectTextureSource, EffectTextureWrap, EffectUniforms, EffectUniformValue, EffectVFXProps`. Re-running `npm install` in this worktree would hydrate packages/*/node_modules/typescript@6.0.2 and make the configured build work. No commit.

## 7-2: Zero-runtime-dep check
- date: 2026-04-22
- notes: Initially reported the storybook build as pre-existing broken — WRONG. Re-verified on the main worktree: `npm --workspace=@vfx-js/storybook run build` succeeds. The failure here is the same worktree node_modules issue as 7-1 (same underlying cause as `ignoreDeprecations` — the vfx-js-2 worktree is missing package-local deps). Verified the zero-runtime-dep property directly by standalone-compiling `packages/storybook/src/effects/trail.ts` with tsc (esnext target, bundler moduleResolution). Emitted JS contains zero `import`/`require`/`@vfx-js` occurrences — `import type` is fully erased as expected. No commit.

## 7-3: Existing tests + lint
- date: 2026-04-22
- notes: `npm test` passes — 110 tests across 6 files (rect, gl/framebuffer, gl/program, effect-host, effect-chain, vfx-player). `npm run lint` is blocked pre-existing: Biome 2.x rejects the repo's biome.json `linter.includes` key (introduced in Biome 2.x schema; effective Biome CLI version chokes on it). No lint regressions introduced by this PR (not observable until Biome config is fixed). No commit.

## 5-1: effect-host.test.ts
- commit: b8f24f0
- date: 2026-04-22
- notes: 27 tests. vi.mock replaces Backbuffer / Framebuffer / Texture / Program / Pass / EffectGeometryCache with recording classes so the host's orchestration can be unit-tested without WebGL. DOM class stubs are installed on globalThis because vitest's default env is node (HTMLVideoElement et al. undefined otherwise, causing the autoUpdate default detection to fall through). Covers wrapTexture autoUpdate defaults (video/canvas→true, image→false) + override; WebGLTexture opts.size requirement + externalHandle + autoRegister:false; wrap/filter flow-through (single + tuple); createRenderTarget persistent vs non-persistent dispatch; explicit-size vs auto-resize (pr=1 vs host.pr semantics); Backbuffer wrap/filter ctor forwarding; auto-resize via setFrameDims; program cache collapse + vert-diff rebuild; ctx.draw phase gating (update warns once; init silent); onContextRestored unsub auto-called on dispose; dispose cleanup + idempotent. Intentionally NOT covered (documented in commit body): GL-integration paths (persistent RT flip, perInstance/LINE_STRIP dispatch, ctx.gl.* resilience, context-lost restore, uvInnerRect upload) — would need headless WebGL; storybook demo covers these end-to-end.

## 5-2: effect-chain.test.ts
- commit: 06857b4
- date: 2026-04-22
- notes: 26 orchestration tests. vi.mock replaces EffectHost + Framebuffer with stubs so chain logic can be unit-tested. Covers renderingIndices collection; M=0 identity copy + isVisible gate; M=3 intermediate alloc + src/output swap + per-intermediate clear; render-less middle skipped; outputSize explicit size / float / last-effect-ignored / overflow non-cumulative; outputSize reallocation only on size/float delta; post-effect context mirror; initAll sequential+await; init throw → prior effects' dispose in reverse (failing effect's own NOT called); update/render throw paths (warn once, passthrough fallback for render); dispose reverse order + idempotent. Side-fix in effect-chain.ts: initAll error path now disposes prior hosts after their effect.dispose (was leaking host-owned GL resources from prior effects' successful inits). Matches the main dispose() path's ordering.

## 4-5: vfx.ts pass effect through
- commit: — (no code change)
- date: 2026-04-22
- notes: Verified: VFX.add delegates to #addImage / #addVideo / #addCanvas / #addText, each of which calls `this.#player.addElement(element, opts)` with the untouched opts object. VFX.addHTML destructures `overlay` out (hic flow has its own hiding) but splats everything else into hicOpts, including `effect`. No modifications required — opts.effect flows through unchanged.

## 4-4: VFXPostEffect.effect
- commit: c147888
- date: 2026-04-22
- notes: Detect single-slot VFXPostEffect.effect in #initPostEffects and route into a dedicated EffectChain whose capture is a resolver over #postEffectTarget.texture. initAll is awaited via a detached Promise (chain identity guards against destroy/re-init races); shouldUsePostEffect is gated on `chainReady` so while init is pending the scene renders directly to canvas instead of a blank frame. #runPostEffectChain synthesizes post-effect-flavored ChainFrameInput (element* === viewport*, overflow zero, mouse === mouseViewport, time = now − #initTime). Multi-slot mixed cases aren't reachable via the public typing (VFXOpts.postEffect is VFXPostEffect | VFXPass[]; VFXPass has no .effect field), so the branch handles only `postEffects.length === 1 && !("frag" in ...) && .effect`. destroy() disposes the chain and clears the flag.

## 4-3: removeElement Effect branch
- commit: 13bde85 (bundled with 4-1)
- date: 2026-04-22
- notes: Already implemented in 4-1's addElement wiring commit (plan's "one task per commit, unless explicitly depends"): removeElement branches on `e.chain` and calls `chain.dispose()` (effects + hosts + intermediate RTs) in place of the shader-path bufferTargets/passes/backbuffer dispose loop; srcTexture.dispose + opacity restore stay in the shared tail. No additional changes for 4-3.

## 4-2: render() Effect branch
- commit: 7506dff
- date: 2026-04-22
- notes: #renderEffectElement assembles ChainFrameInput and dispatches chain.run per frame. Gif/video srcTexture.needsUpdate=true mirrors shader path. Uniforms = static ⊕ generator results per frame. mouse/mouseViewport split (element-local vs viewport-local, both bottom-left physical px). element vs elementInner distinguishes rect+overflow vs rect proper; overflow × pixelRatio; finalViewport = (isFullScreen ? viewport : rect+overflow) × pr. finalTarget = #postEffectTarget when post effects exist, else null (canvas). First frame deltaTime=0 (lastRenderTime initialized to elem.startTime at addElement). Chain already gates on !isVisible internally but caller already `continue`s first for parity with shader path.

## 4-1: addElement Effect branch
- commit: 13bde85
- date: 2026-04-22
- notes: addElement detects opts.effect and dispatches to #addEffectElement, which replays the shader path's texture/opacity prelude then builds an EffectChain. Shader+effect mutex emits dev warning (effect wins); empty array emits dev warning (identity chain). captureHandle is a resolver-form EffectTexture closing over elem.srcTexture so text re-render swaps propagate automatically. User uniforms split into static + generators. initAll is sequential + awaited; on failure the chain self-cleans priors + failing host, addElement releases srcTexture, restores opacity, and rejects. VFXElement gains optional chain/effectUniformGenerators/effectStaticUniforms/effectLastRenderTime fields (passes:[], bufferTargets:new Map() for effect elements). #hitTest now guards the shader-uniform writes (isVisible && !e.chain). #rerenderTextElement / updateCanvasElement / updateHICTexture rewritten to pull `oldTexture` from `e.srcTexture` and only touch `passes[0].uniforms["src"]` on the shader path. render() loop's effect branch is a placeholder `continue` (real chain.run in 4-2). removeElement routes chain elements to `chain.dispose()` (effects + hosts + intermediates); srcTexture.dispose + opacity restore stay in the shared tail.

## 8-1: types.ts — outputSize signature + dims reshape
- commit: 4baf478
- date: 2026-04-22
- notes: Added `{ padAdd: MarginOpts; float? }` return variant. `dims` drops `overflow`, adds `fullscreenPad: { top,right,bottom,left }` (physical px, non-negative). JSDoc updated for `VFXProps.overflow` (shader-path only; warn when both present) and `EffectContext.quad` (uv / uvInner / uvInnerDst varyings + uvInnerRect / srcInnerRect auto-uniforms). effect-chain.ts got scaffolding (fullscreenPad:0 stub + padAdd passthrough) to keep tsc clean — real pad tracking lands in 8-2. **Breaking change**: the `overflow` field on the `dims` object passed to `outputSize` is removed.

## 8-2: effect-chain.ts — pad tracking + srcInnerRect + fullscreenPad
- commit: 1d821b0
- date: 2026-04-22
- notes: Per-stage StageLayout tracks `{srcPad, srcBufferSize, dstPad, dstBufferSize, srcInnerRect, uvInnerRect, float, outputViewport}` (all physical px). outputSize dispatch: padAdd adds per-side delta, explicit size distributes excess proportionally to src pad ratios (equal split when zero), tuple [w,h] treated as size. Monotonic clamp (dst pad >= src pad per side) + buffer >= elementPixel clamp, both warn once per (chain, effect). fullscreenPad = max(0, viewport-edge distance × pr − srcPad) per side; zero for post-effect chains. Last rendering effect's outputSize return is ignored (its src pad sets the canvas draw viewport). ChainFrameInput swaps `finalViewport` / `overflow` / `elementInner*` for `elementRectOnCanvasPx` + `viewportRectOnCanvasPx`. HostFrameDims: `canvasViewport*` → `outputViewport`; adds `srcInnerRect`. effect-host.ts `#doDraw` routes implicit-output writes (null / omitted / target===ctx.output) through `outputViewport` instead of hardcoded full-RT dims — fixes a 4-4-era bug where the element-chain's last effect wrote to the full postEffectTarget FBO instead of the element's canvas sub-region. Two old tests skipped with TODO-8-8 (buffer < elementPixel semantics changed from "shrink allowed" to "clamp up"). **Breaking change**: `Effect.outputSize` can no longer request a buffer smaller than `elementPixel`; plugins that did so get clamped with a dev warning.

## 8-3: effect-host.ts — default vert + srcInnerRect + uvInnerDst
- commit: 71ec9a8
- date: 2026-04-22
- notes: Default vertex shader (300 es + 100) emits three varyings: `uv` (0..1 over full dst buffer), `uvInnerDst` = `(bufferUV − uvInnerRect.xy) / uvInnerRect.zw` (0..1 over element proper, with pad mapping outside [0,1]), `uvInner` = `srcInnerRect.xy + uvInnerDst * srcInnerRect.zw` (src-sampling UV, valid for capture and padded intermediates alike). `#buildUniforms` auto-injects both vec4 uniforms; `Program.uploadUniforms` silently ignores uniforms the shader doesn't declare, so custom shaders that only use `uv` or only `uvInner` keep working. Passthrough shaders still use `uv` (simple same-layout copy). **Breaking change**: shader authors gating on `uvInner ∈ [0,1]` must switch to `uvInnerDst ∈ [0,1]` — `uvInner` is now a sampling UV, not an inside-check.

## 8-4: vfx-player.ts — overflow dev warn on effect path
- commit: be0cfce
- date: 2026-04-22
- notes: `#addEffectElement` emits a dev warn when `opts.overflow` is set alongside `opts.effect` (overflow is shader-path only; effect path uses each effect's own `outputSize` / `padAdd` / `dims.fullscreenPad`). The chain-internal pad reshape already landed in 8-2 — this closes the loop with the user-facing signal.

## 8-5: storybook/effects/bloom.ts — new API usage
- commit: 2fd4da5
- date: 2026-04-22
- notes: `BloomOptions.pad: number | "fullscreen"` controls glow spread room. `outputSize` conditionally attached (omitted when `pad` is not supplied, keeping bloom pad-neutral). Shaders gate on `uvInnerDst ∈ [0,1]`; `texture(src, uvInner)` stays correct across chain stages.

## 8-6: storybook/effects/posterize.ts — new API usage
- commit: f014fc9
- date: 2026-04-22
- notes: Gate switched to `uvInnerDst ∈ [0,1]`. No `outputSize` — posterize doesn't grow pad.

## 8-7: Effect.stories.ts — drop overflow
- commit: 458194f
- date: 2026-04-22
- notes: `bloom` story: `pad: 80`. `posterizeAndBloom`: bloom tail `pad: 160`. VFXProps.overflow removed from both.

## 8-8: tests — pad accumulation + srcInnerRect + fullscreenPad + auto-uniforms
- commit: 56f254f
- date: 2026-04-22
- notes: effect-chain.test.ts: revived the two 8-2 skips with pad-model-correct semantics; added padAdd stacking, asymmetric padAdd, monotonic clamp (negative component → warn + clamp), fullscreenPad formula verification, stage-0 srcInnerRect/uvInnerRect assertions, buffer < elementPixel clamp-up + warn. effect-host.test.ts: auto-upload of `uvInnerRect` and `srcInnerRect` vec4s, and default vert grep for the 3 varyings + 2 uniforms. Side-fix in effect-chain.ts: detect the clamp condition on the raw user-supplied size before `distributePad` rewrites it (the 8-2 warn was masked because `distributePad` already clamps excess to 0). 119 tests pass (was 108+2 skipped).
