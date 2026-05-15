# Render Target Mipmap Support — Plan

**Goal:** Let effects opt into mipmapped render targets via `ctx.createRenderTarget({ mipmap })`, with auto-regen on draw plus a manual escape hatch.

## API

```ts
// packages/vfx-js/src/types.ts
type EffectRenderTargetOpts = {
  // ...existing
  mipmap?: boolean | "manual";   // default: false
};

type EffectRenderTarget = {
  // ...existing
  generateMipmaps(): void;       // no-op when mipmap is false
};
```

Semantics:
- `false` (default) — no mip storage, no regen. Identical to today.
- `true` — allocate full mip chain, auto regen after every draw whose `target` is this RT.
- `"manual"` — allocate full mip chain, regen only on explicit `rt.generateMipmaps()`.

Filter auto-promotion (only when mipmap is enabled):

| `filter` | MIN | MAG |
|---|---|---|
| `"linear"` (default) | `LINEAR_MIPMAP_LINEAR` | `LINEAR` |
| `"nearest"` | `NEAREST_MIPMAP_NEAREST` | `NEAREST` |

No new filter enum values. No `mipmapFilter` opt. Defer mipmap filter variants until real demand.

## File map

Modified:
- `packages/vfx-js/src/types.ts` — opts + handle additions.
- `packages/vfx-js/src/gl/texture.ts` — `mipmap` field, mipmap-aware MIN filter mapping.
- `packages/vfx-js/src/gl/framebuffer.ts` — allocate full mip chain (`texStorage2D` with `levels = floor(log2(max(w,h))) + 1`), `generateMipmaps()` method, mipmap-aware filter, restore-path parity.
- `packages/vfx-js/src/backbuffer.ts` — thread `mipmap` to both ping-pong sides, `generateMipmaps()` on write side.
- `packages/vfx-js/src/effect-host.ts` — thread `mipmap` through `#createRenderTarget`, hook auto-regen at end of `#draw` when target's mode is `true`, expose `generateMipmaps()` on the `EffectRenderTarget` handle.

Tests added in `effect-host.test.ts` (or a new `mipmap.test.ts` alongside).

## Tasks

1. **Storage**: `Framebuffer` accepts `mipmap`. Switch `texImage2D` → `texStorage2D` when mipmap to get immutable mip levels; keep current path for non-mipmap to minimise diff. Recompute levels on `setSize` / `restore`.
2. **Filter mapping**: `Texture.#applyParams` (and `Framebuffer.#allocate`'s inline params) promote MIN_FILTER when `mipmap` is set. MAG_FILTER stays as base `nearest`/`linear`.
3. **Generate API**: `Framebuffer.generateMipmaps()` binds the texture and calls `gl.generateMipmap(TEXTURE_2D)`. No-op when not mipmapped.
4. **Persistent**: `Backbuffer` forwards `mipmap` to both internal Framebuffers; `generateMipmaps()` operates on the current write side.
5. **Auto regen hook**: After each draw in `EffectHost.#draw`, if `target` is a mipmap RT with mode `true`, call `generateMipmaps()` on the underlying write FB. Mode `"manual"` skips.
6. **Handle plumbing**: `OwnedRT` carries the mipmap mode + an `regenerate()` callback. `EffectRenderTarget.generateMipmaps()` calls it (always; no-op for `false`).
7. **Float interop**: Reuse existing `floatLinearFilter` detection — RGBA32F falls back to RGBA16F so trilinear stays valid. No new ext probing.
8. **Disposal**: No new resources beyond the storage already owned by the texture; existing dispose path is sufficient.

## Tests

- `mipmap: true` → texture has `> 1` levels (probe via `gl.getTexParameter(TEXTURE_IMMUTABLE_LEVELS)` or render to LOD 1).
- `mipmap: false` (default) → MIN_FILTER stays `LINEAR`, single level.
- Auto-promotion: `{ mipmap: true, filter: "linear" }` → MIN=`LINEAR_MIPMAP_LINEAR`, MAG=`LINEAR`. Same for `"nearest"`.
- `"manual"` mode: drawing does NOT change mip 1 contents until `rt.generateMipmaps()` is called.
- Resize: auto-resize keeps mipmap allocation, level count updates.
- Persistent + mipmap: both sides allocate, regen targets the write side post-draw.
- 1×1 RT + mipmap: 1 level, `generateMipmap` is a no-op (no GL error).

## Out of scope

- Mipmap filter enum variants (`"linear-mipmap-nearest"` etc).
- Separate `mipmapFilter` opt.
- Anisotropic filtering (`EXT_texture_filter_anisotropic`).
- Manually writing to specific mip levels (would require exposing per-level FBOs).
- Migration of existing effects (bloom etc) to use mipmap — they keep their hand-built pyramids.

## Migration / compat

Default `false` → no behaviour change for any existing code (bloom, particle, post effects, etc). Effects opt in explicitly.
