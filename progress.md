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
