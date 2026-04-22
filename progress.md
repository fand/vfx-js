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
