# Effect System Implementation Tasks

Implementation tasks derived from `plan.md`. Track progress in `progress.md`.

## Workflow

1. Read `task.md` and `progress.md`, pick next unchecked task
2. Implement the task (write/modify code, add tests as specified)
3. `git commit` with a descriptive message
4. Update `progress.md` (commit hash, summary, any deviations / notes)
5. Repeat

Rules:
- One task per commit (unless a task explicitly depends on another in the same commit)
- Do not mark a task done in `progress.md` before the commit lands
- If a task reveals a design gap, pause and ask — do not silently change `plan.md`

---

## Phase 1: Foundation types

- [ ] **1-1: Add Effect types to `packages/vfx-js/src/types.ts`**
  - Types: `EffectTexture`, `EffectRenderTarget`, `EffectTextureSource`, `EffectTextureWrap`, `EffectTextureFilter`, `EffectUniformValue`, `EffectUniforms`, `EffectRenderTargetOpts`, `EffectAttributeTypedArray`, `EffectAttributeDescriptor`, `EffectGeometry`, `EffectQuad`, `EffectDrawOpts`, `EffectVFXProps`, `EffectContext`, `Effect`
  - `EffectTexture` is the public shape `{ width, height, __brand }`; the internal resolver shape lives in `effect-host.ts`
  - Add `effect?: Effect | readonly Effect[]` to `VFXProps` and `VFXPostEffect`
  - Acceptance: `npm --workspace=@vfx-js/core run build` types-only (no impl yet)

- [ ] **1-2: Export new types from `packages/vfx-js/src/index.ts`**

## Phase 2: gl/* extensions

- [ ] **2-1: Extend `gl/texture.ts` — configurable filter**
  - Add `minFilter` / `magFilter: "nearest" | "linear"` fields (default: `"linear"`)
  - Apply in `#applyParams` via a `filterEnum` helper
  - Keep existing constructor compatibility

- [ ] **2-2: Extend `gl/framebuffer.ts` — configurable wrap/filter**
  - Accept `wrap?: TextureWrap | [TextureWrap, TextureWrap]` and `filter?: "nearest" | "linear"` in constructor opts
  - Apply them to the attachment texture during `#allocate`
  - Extend `Backbuffer` constructor to forward `wrap` / `filter` to both inner `Framebuffer`s

## Phase 3: Effect building blocks

- [ ] **3-1: `packages/vfx-js/src/effect-geometry.ts` (new)**
  - Compile `EffectGeometry` POJO → `{ vao, vbos, ibo }` against a specific `Program`
  - `WeakMap<EffectGeometry, Map<Program, VaoEntry>>` cache
  - `Restorable` wrapper registered on `GLContext`
  - Support `mode` (triangles/lines/lineStrip/points), `indices` (u16/u32), `instanceCount`, `drawRange`, `perInstance`, `normalized`, `location`
  - `EffectQuad` resolution (branded token → shared `Quad`)

- [ ] **3-2: `packages/vfx-js/src/effect-host.ts` (new)**
  - `EffectContext` implementation — one per effect instance
  - `Program` cache (`Map<string, Program>`, key `frag + "\x00" + vert`)
  - Internal `EffectTexture` resolver: `{ __brand, width, height, resolve(): Texture }`
  - `ctx.time` / `deltaTime` / `pixelRatio` / `resolution` / `mouse` / `mouseViewport` / `intersection` / `enterTime` / `leaveTime` / `src` / `output` / `uniforms` / `vfxProps` / `quad` / `gl` fields; orchestrator mutates in-place per frame
  - `createRenderTarget(opts)` → `Framebuffer` or `Backbuffer`. Handle `opts.size` physical-px normalization (plan.md "Backbuffer + `size` handling")
  - `wrapTexture(source, opts)` — DOM sources register as `Restorable`; `WebGLTexture` source does NOT register
  - `draw(opts)` self-contained: bind program/framebuffer/viewport/blend/VAO/uniforms; swap Backbuffer on write
  - `uvInner` varying in the default vertex shader; `uvInnerRect` uniform auto-upload
  - `onContextRestored(cb)` passthrough to `GLContext`
  - Phase flag for `ctx.draw()` no-op in `update` (dev warning once per host)
  - `dispose()` releases all owned `Program`/`Framebuffer`/`Backbuffer`/`Texture`/VAO entries

- [ ] **3-3: `packages/vfx-js/src/effect-chain.ts` (new)**
  - Holds `hosts: EffectHost[]`, `renderingIndices: number[]`, `intermediates: (EffectRenderTarget | null)[]` (length M−1)
  - `resolveIntermediates(dims)` walks `renderingIndices`, calls each effect's `outputSize?.(dims)`, reallocates on size/float delta only
  - First stage `input` = (element rect + overflow) × pixelRatio; subsequent stages = previous output. Overflow NOT added cumulatively
  - `run(capture, finalTarget)`: uniform-resolve → outputSize-resolve → update phase → render phase
  - Per-frame `gl.clear` of each intermediate before its write
  - M = 0 identity copy via host's passthrough `Pass`
  - `init` sequential + await; on throw → reverse `dispose` of prior effects (failing effect's own `dispose` NOT called), bubble rejection so `addElement` aborts
  - `update`/`render` throw → `console.warn` once per (element, effect), passthrough-copy for render failures
  - `dispose()` in reverse array order

## Phase 4: Player integration

- [ ] **4-1: `vfx-player.ts` — `addElement` Effect branch**
  - Detect `opts.effect`, short-circuit the shader path
  - Dev warning when both `shader` and `effect` are present (effect wins)
  - Dev warning + identity chain on empty `effect: []`
  - Build `EffectChain`; call `init` sequentially; on failure: reverse-dispose priors, do NOT insert into `#elements`
  - `ctx.vfxProps` snapshot (`autoCrop` / `glslVersion` only; `backbuffer` is NOT piped)

- [ ] **4-2: `vfx-player.ts` — `render()` Effect branch**
  - `!hit.isVisible` gate skips chain entirely
  - Per-frame reflect chain state into each host's ctx (`time`, `deltaTime`, `mouse` element-local bottom-left physical-px, `mouseViewport` viewport-local bottom-left physical-px, `intersection`, `enterTime`, `leaveTime`, resolved `uniforms`)
  - `finalTarget`: post-effects present → wrap `#postEffectTarget` in a host-cached `EffectRenderTarget` handle (regenerated only when the `Framebuffer` instance changes); otherwise `null`

- [ ] **4-3: `vfx-player.ts` — `removeElement` Effect branch**
  - Call `chain.dispose()` only (it handles effect + host + intermediate RT cleanup)

- [ ] **4-4: `vfx-player.ts` — `VFXPostEffect.effect`**
  - Post-effect-slot `EffectChain` with viewport capture as first input, `null` as final target
  - Live alongside `#renderPostEffects`
  - Dev warning if both `shader` and `effect` on a single `VFXPostEffect`

- [ ] **4-5: `vfx.ts` — pass `effect` through**
  - `add()` / `addHTML()` forward `effect` to the player (mostly pass-through)

## Phase 5: Tests

- [ ] **5-1: `packages/vfx-js/src/effect-host.test.ts`**
  - Program cache collapse on identical (frag, vert)
  - VAO cache keyed on (geometry, program); rebuild when either changes
  - `perInstance: true` → `vertexAttribDivisor` + `drawElementsInstanced`
  - `mode: "lineStrip"` → `LINE_STRIP` dispatch
  - `ctx.quad` omitted vs specified produces same result
  - `mat3` (len 9) / `mat4` (len 16) dispatch; mismatched length → dev warning + skip
  - `boolean` uniform → `uniform1i(loc, v ? 1 : 0)`
  - `persistent: true` RT flip-on-draw read-vs-write
  - `createRenderTarget` `wrap` / `filter` flow through to attachment
  - `wrapTexture` autoUpdate defaults (video → true, image → false) and explicit override
  - `wrapTexture` `wrap` / `filter` flow through
  - Raw `ctx.gl.*` between draws doesn't break next `ctx.draw()`
  - `EffectHost.dispose()` releases all owned GL resources
  - Simulated context-lost/restored cycle rebuilds everything (persistent RTs come back zero)
  - `uvInnerRect` uniform uploaded when shader declares it
  - WebGLTexture-backed `EffectTexture` is NOT registered `Restorable`

- [ ] **5-2: `packages/vfx-js/src/effect-chain.test.ts`**
  - Single Effect and length-1 array behave identically
  - N=3 rendering effects → 2 intermediates, src/output swap per pass
  - Render-less middle effect → slot skipped, one fewer intermediate
  - M=0 → capture → finalTarget identity copy
  - `outputSize` specified → intermediate at that physical-px size; last effect's return ignored
  - `outputSize` receives `overflow`; stage-1 default = element + overflow × pixelRatio; stage-2+ default = previous output (no cumulative)
  - Post-effect context: `element*` dims mirror `viewport*`; `overflow` is zero
  - `outputSize` returning `{ size, float: true }` allocates float intermediate; toggling `float` reallocates
  - Element resize → intermediate reallocate; unchanged size → reuse
  - `ctx.uniforms` reflects function-valued entries evaluated per frame before update
  - `ctx.mouse` element-local bottom-left px; `ctx.mouseViewport` viewport-local bottom-left px
  - `ctx.draw()` in `update()` is no-op + dev warning once
  - `init` Promise awaited sequentially
  - `init` throw → prior effects' dispose called reverse; failing effect's own dispose NOT called; element NOT inserted
  - Middle `render` throw → passthrough copy + warn once; subsequent frames keep trying
  - Last `render` throw → passthrough copy to final target (no disappear)
  - Off-viewport element → neither update nor render called
  - `dispose` reverse array order

## Phase 6: Demo

- [ ] **6-1: `packages/storybook/src/Effect.stories.ts`**
  - Simple trail effect (stateful, `persistent: true` RT)
  - `import type { Effect } ...` only (no runtime import of `@vfx-js/core`)
  - Verify in browser via `npm --workspace=storybook run dev`

## Phase 7: Verification

- [ ] **7-1: Build check** — `npm --workspace=@vfx-js/core run build` produces dual ESM/CJS; new types appear in `lib/esm/index.d.ts`
- [ ] **7-2: Zero-runtime-dep check** — grep `packages/storybook` build output; no runtime imports of `@vfx-js/core`
- [ ] **7-3: Existing tests/lint** — `npm test && npm run lint` pass

---

## Phase 8: Pad model refactor

Refactor in response to the [posterize, bloom] chain bug: `uvInner`
was destination-space (0..1 over dst inner), making
`texture(src, uvInner)` wrong at stage k≥1 where src is a buffer-sized
intermediate rather than an inner-only capture. Redesign per the
updated plan.md "Pad model" section: pad tracked by chain as delta
accumulation (`pad`), `uvInner` becomes the src-sampling UV, new
`uvInnerDst` varying handles the "am I inside?" gate, `srcInnerRect`
auto-uniform drives the sampling math.

Phase 4 already landed the old model in vfx-player.ts / effect-chain.ts
/ effect-host.ts. Phase 8 replaces those internals without touching
the public Effect interface shape except for the `outputSize` return
type and `dims` fields (documented breaking changes).

### 8-1: types.ts — `outputSize` signature + dims reshape

- [ ] **8-1**: Update `Effect.outputSize` signature in `packages/vfx-js/src/types.ts`
  - `dims`: remove `overflow`, add `fullscreenPad: { top, right, bottom, left }` (Margin, physical px)
  - return: add `{ pad: MarginOpts; float?: boolean }` variant alongside existing `[w, h]` / `{ size, float }`
  - JSDoc: describe `pad` (delta, monotonic, normalized via `createMargin`), `fullscreenPad` helper, clamp semantics
  - `VFXProps.overflow` JSDoc: note that it's shader-path only and is ignored by the effect path (dev warn when both present)
  - Acceptance: `npx tsc --noEmit` clean. No runtime change yet.

### 8-2: effect-chain.ts — pad tracking + srcInnerRect + fullscreenPad

- [ ] **8-2**: Rewrite chain pad propagation in `packages/vfx-js/src/effect-chain.ts`
  - `ChainFrameInput`: remove `overflow` fields piped into dims (keep the data if the player still passes it — map internally); add `viewportRectOnCanvasPx` (or whatever lets chain compute element's viewport-edge distance per side)
  - `IntermediateEntry`: add `pad: Margin` (physical px per side)
  - `#resolveIntermediates`:
    - Stage 0 src pad = `{0,0,0,0}` (capture has no pad)
    - Call `effect.outputSize(dims)`; normalize return to `{ pad: Margin, bufferSize: [w,h], float: bool }`:
      - `{ pad }` → `dst_pad = src_pad + createMargin(pad)` per side; `bufferSize = elementPixel + pad sums`
      - `{ size }` / `[w, h]` → `bufferSize = size`; distribute `buffer - elementPixel` to each side proportionally to `src_pad` ratios (equal split when src pad is zero everywhere)
      - Omitted → `pad = 0`
    - Monotonic clamp: `dst_pad[side] = max(dst_pad[side], src_pad[side])`; emit dev warn once per (chain, effect) on violation
    - Buffer < elementPixel on any axis → dev warn + clamp to elementPixel
    - Reallocate `Framebuffer` only when `{bufferSize, float, pad}` differs
  - Compute `srcInnerRect` per stage:
    - stage 0 (for the first rendering effect's src): `(0, 0, 1, 1)` — capture is inner-only
    - stage k≥1: `(prev.pad.left / prev.bufferSize[0], prev.pad.bottom / prev.bufferSize[1], elementPixel[0] / prev.bufferSize[0], elementPixel[1] / prev.bufferSize[1])`
  - Compute `fullscreenPad` per stage for the `dims` input: `max(0, viewport_edge_distance[side] × pr - src_pad[side])` per side (post-effects: always zero)
  - Compute `uvInnerRect` per stage (dst): `(pad.left / bufferW, pad.bottom / bufferH, elementPixel[0] / bufferW, elementPixel[1] / bufferH)`
  - Pass `srcInnerRect` and `uvInnerRect` to each host's `setFrameDims`
  - `callOutputSize`: build dims with `fullscreenPad` (not `overflow`), adapt return-value normalization to new variants
  - Acceptance: `npm --workspace=@vfx-js/core run test` — all existing chain tests pass after adjustments

### 8-3: effect-host.ts — default vert + srcInnerRect uniform + uvInnerDst

- [ ] **8-3**: Update `packages/vfx-js/src/effect-host.ts`
  - `HostFrameDims`: replace the old `uvInnerRect` field (if any) with two fields, `uvInnerRect: [x,y,w,h]` (dst) and `srcInnerRect: [x,y,w,h]` (src); both buffer/texture UV (0..1 each component)
  - `#buildUniforms`: auto-inject BOTH `uvInnerRect` and `srcInnerRect` as `vec4`
  - Default vertex shader (300 es + 100): emit three varyings: `uv`, `uvInnerDst`, `uvInner`. Compute:
    ```
    uv = bufferUV;
    uvInnerDst = (bufferUV - uvInnerRect.xy) / uvInnerRect.zw;
    uvInner = srcInnerRect.xy + uvInnerDst * srcInnerRect.zw;
    ```
  - passthrough shaders: keep `uv`-based sampling (OK since passthrough writes across the full dst buffer with src having the same layout — callers of `passthroughCopy` must pass src sized to match the dst viewport)
  - Acceptance: host-level draws with the new defaults produce the same output when src/dst layouts match (equivalent to old behavior for uniform overflow); new behavior correct when src is capture (inner-only) and dst has pad

### 8-4: vfx-player.ts — remove overflow piping, pass viewport-edge info

- [ ] **8-4**: Update `#renderEffectElement` and `#addEffectElement` in `packages/vfx-js/src/vfx-player.ts`
  - Stop treating `e.overflow × pr` as the chain's initial pad (chain's stage 0 src pad = 0)
  - Emit dev warning in `#addEffectElement` when both `opts.overflow` and `opts.effect` are set (effect path ignores overflow)
  - `ChainFrameInput` passes the element's viewport-edge distances (or enough data for chain to compute `fullscreenPad` per stage — likely needs the element's rect on viewport in physical px)
  - Update post-effect chain wiring similarly (fullscreenPad=0 for post effects)
  - Acceptance: storybook smoke test: bloom / posterizeAndBloom stories render (even if not yet visually correct — pending 8-5/8-6 shader updates)

### 8-5: storybook/effects/bloom.ts — new API usage

- [ ] **8-5**: Update `packages/storybook/src/effects/bloom.ts`
  - Shader change: replace `uvInner in [0,1]` gate with `uvInnerDst in [0,1]` in threshold and composite passes (the gate is destination-space)
  - Sampling: `texture(src, uvInner)` stays the same in the source code (semantics now correct across chain stages)
  - Add `pad?: number | "fullscreen"` option to `BloomOptions`
  - Implement `outputSize(dims)`:
    - `pad: "fullscreen"` → `{ pad: dims.fullscreenPad }`
    - numeric → `{ pad: pad }` (uniform margin)
    - omitted → no outputSize method (effect grows no pad)
  - Acceptance: storybook `bloom` story still renders with pad controlled by the bloom option rather than VFXProps.overflow

### 8-6: storybook/effects/posterize.ts — new API usage

- [ ] **8-6**: Update `packages/storybook/src/effects/posterize.ts`
  - Shader change: replace `uvInner in [0,1]` gate with `uvInnerDst in [0,1]` (for skipping overflow pad)
  - No `outputSize` needed (posterize doesn't grow pad)
  - Acceptance: standalone `posterize` story (if added) renders the posterized element on a transparent pad

### 8-7: Effect.stories.ts — drop overflow, tune effect params

- [ ] **8-7**: Update `packages/storybook/src/Effect.stories.ts`
  - `bloom` story: remove `overflow: 80`; pass `pad: 80` (or similar) to `createBloomEffect` instead
  - `posterizeAndBloom` story: remove `overflow: 160`; pass `pad: 160` (or `pad: "fullscreen"`) to bloom
  - Optionally add a third story that demonstrates `[dilate(10), shadow(10)]` or a fullscreen example
  - Acceptance: storybook renders all effect stories correctly (visual check); DevTools shows `uvInnerDst` / `uvInner` / `srcInnerRect` present when a draw is captured

### 8-8: Tests — pad accumulation + srcInnerRect + fullscreenPad

- [ ] **8-8**: Update `packages/vfx-js/src/effect-chain.test.ts` and `effect-host.test.ts`
  - effect-chain.test.ts (add):
    - `{pad: 10}` at stage 0 with capture → dst pad = 10; intermediate buffer = elementPixel + 20 per axis
    - Stacked pad: `[a({pad: 10}), b({pad: 10})]` → stage 1 src pad = 10, stage 1 dst pad = 20
    - Asymmetric pad: `{top: 0, right: 50, bottom: 0, left: 50}` produces asymmetric buffer; srcInnerRect reflects physical layout
    - Monotonic clamp: effect returning `{pad: -5}` → dev warn + clamped to 0 (dst pad unchanged)
    - `{size: [w, h]}` with w < elementPixel[0] → dev warn + clamped to elementPixel
    - `dims.fullscreenPad` matches `max(0, viewport_edge_distance × pr - src_pad)` per side
    - `dims.fullscreenPad` for post-effect chain is always `{0,0,0,0}`
    - `srcInnerRect` at stage 0 is `(0,0,1,1)`; at stage k≥1 matches previous intermediate's pad/buffer ratios
    - `uvInnerRect` matches the CURRENT dst buffer's inner sub-rect (NOT the src's)
  - effect-chain.test.ts (remove / update):
    - Any test asserting old "overflow × pr" stage 0 size — update to assert capture-based default (stage 0 src pad = 0)
    - The "overflow not added cumulatively" test — replace with the new "pad accumulates" test
  - effect-host.test.ts (add):
    - `srcInnerRect` uniform is auto-uploaded with the right vec4 value
    - `uvInnerRect` uniform is auto-uploaded with the right vec4 value
    - Default vert emits three varyings (`uv`, `uvInnerDst`, `uvInner`); smoke-test via a shader that reads them
  - Acceptance: `npm --workspace=@vfx-js/core run test` — all passing

### 8-9: progress.md + commit housekeeping

- [ ] **8-9**: Update `progress.md` as Phase 8 tasks land
  - One entry per 8-N commit, per existing format
  - Flag breaking changes in the Notes: `Effect.outputSize` signature changed; `dims.overflow` → `dims.fullscreenPad`; default vert varyings changed
  - Note: no public API change to `VFXProps` itself (overflow stays as-is for shader path; no `VFXProps.pad` added)
