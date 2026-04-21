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
