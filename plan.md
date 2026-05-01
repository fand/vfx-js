# mouse-particles (new effect) — implementation plan

## Goal
Keep the existing `curl-particles.ts` as-is. Add a new effect that behaves like a conventional GPU particle system, in a separate file.

## File / class name (tentative)
- File: `packages/storybook/src/effects/mouse-particles.ts`
- Class: `MouseParticlesEffect`
- Params: `MouseParticlesParams`

> The existing `CurlParticlesEffect` is an ambient curl-noise field; the new `MouseParticlesEffect` is a mouse-driven emitter. Different use cases — they coexist.
> Names are tentative. `particle-emitter.ts` / `spray-particles.ts` etc. are also fine.

## Problems with the current effect (motivation)

| Symptom | Root cause |
| --- | --- |
| Particles don't really spawn at the mouse / get stuck at 1px | Spawn is triggered by "particle's own age looped past 1.0" — async with the mouse. The mouse only moves the spawn center; the life cycle is driven by a per-particle lifespan. |
| Particles emit from transparent regions | Spawn doesn't sample `src` alpha. |
| `noiseScale` feels inverted | `noiseInput = pos * scale` → larger scale = smaller swirls. The intuitive mapping is the opposite (larger = larger swirls). |

On top of that, the current "respawn only when age crosses 1.0" design effectively keeps every particle alive at all times. It does not have the independent emitter rate / max count knobs of a typical GPU particle system.

## Requirements

- General GPU particle system controls:
  - `count` (max particles, hard cap)
  - `birthRate` (particles per second)
  - `life` (sec, with per-particle jitter)
  - Velocity field driven by 3D curl noise (time-morphing)
- Mouse-driven emitter:
  - Spawn within a circle of `radius` (element px) around the mouse, uniformly random
  - Reject spawns where `src` alpha is below a threshold (no particles from transparent regions)
  - Emit only while the mouse is over the page / moving (configurable)

## Architecture overview

### CPU side (per frame)
1. Determine `mouseActive`: `intersection > 0` && `(now - lastMoveTime) < idleThreshold`, or `spawnOnIdle === true`.
2. `birthAccumulator += birthRate * dt`; `nSpawn = floor(birthAccumulator)`; subtract back.
3. For each spawn slot:
   - Random offset inside the disk (`r = sqrt(rand) * radius`, `θ = 2π * rand`)
   - `spawnUv = mouseUv + offset / elementPixel`
   - Push `[slotIdx, spawnUv.x, spawnUv.y, lifeJitter]` into the per-instance attribute buffer.
4. Advance `nextSlot` ring-buffer style (`mod count`).
5. Hand the buffer to `EffectGeometry.attributes` as a `perInstance: true` Float32Array.

> The alpha check is done on the GPU. CPU just submits spawn candidates — we avoid the sync stall of `gl.readPixels`.

### State textures (256x256 RGBA32F, ping-pong, persistent)
Two textures for minimum surface area:
- `posTex`   : `vec4(pos.xyz, ageNorm)` — `ageNorm` ∈ [0,1] (born at 0, dead at ≥1).
- `colorTex` : `vec4(rgb, lifeJitter)` — src color sampled at spawn + per-particle life multiplier (e.g. 0.7..1.3).

Velocity is recomputed every frame from curl noise — no need to store it.

### Working textures
- `stampTex` : per-frame additive particle render target
- `trailTex` : persistent trail buffer (same as the existing effect)

### Per-frame GPU pass layout

#### Pass 0: INIT (one-shot)
- Initialize every slot with `posTex.w = 2.0` (dead).

#### Pass 1: UPDATE (full-screen quad → posTex)
For every texel:
```glsl
vec4 s = texture(posTex, uv);
float age = s.w;
if (age >= 1.0) { outColor = s; return; }   // stay dead

vec3 stretch = vec3(elementPixel / shortAxis, 1.0);
vec3 ni = s.xyz * stretch / noiseScale;     // inverted (scale ↑ → swirl ↑)
vec3 v  = curl3D(ni, time * noiseAnimation) / stretch;

float taper = pow(1.0 - age, speedDecay);
vec3 pos = s.xyz + v * speed * dt * taper;

float life = lifespan * texture(colorTex, uv).w;
age += dt / life;
outColor = vec4(pos, age);
```

#### Pass 2: SPAWN (instanced points, `nSpawn` instances)
- Geometry: `mode: "points"`; per-instance attribute `[slotIdx, spawnUvX, spawnUvY, lifeJitter]`.
- Vertex shader maps `slotIdx` to the center of the corresponding state texel and emits `gl_Position` there with `gl_PointSize = 1.0`.
- Two passes (no MRT here):
  1. → posTex: write `vec4(spawnUv, 0.0_z, 0.0_age)`. If `texture(src, spawnUv).a < alphaThreshold`, write `age = 2.0` instead so the particle is born dead.
  2. → colorTex: write `vec4(texture(src, spawnUv).rgb, lifeJitter)`.
- Skip both passes when `nSpawn == 0`.
- Run after Pass 1 so a freshly spawned particle does not advance through UPDATE on the same frame.

#### Pass 3: PARTICLE STAMP (instanced quad, `count` instances)
Mirrors the existing implementation:
- `alivePhase = age` (already 0..1).
- `lifeAlpha = (age >= 0 && age < 1) ? sin(age * π) : 0`.
- Particles with `lifeAlpha <= 0` get pushed off-NDC and discarded.
- Reuse fog / pointSize / contentRectUv logic.

#### Pass 4: TRAIL COMPOSITE (same as existing effect)
#### Pass 5: OUTPUT (same as existing effect)

## Param surface

```ts
type MouseParticlesParams = {
    count: number;            // max particles (capped by state-texture size)
    birthRate: number;        // particles / sec while mouse is active
    life: number;             // base lifespan (sec); actual = life * lifeJitter
    speed: number;            // uv / sec at full strength
    noiseScale: number;       // approximate swirl size in uv units (larger → bigger swirls)
    noiseAnimation: number;   // morph rate on the 4th simplex axis
    pointSize: number;        // particle quad size (element px)
    alpha: number;            // global alpha
    radius: number;           // emit radius (element px)
    speedDecay: number;       // life-taper exponent
    alphaThreshold: number;   // reject spawns where src.a < this (default 0.05)
    spawnOnIdle: boolean;     // emit even when the mouse is stationary (default false)
    backgroundOpacity: number;
    trailFade: number;
    fog: number;
};
```

The old `aliveFraction` and `lifespan` params no longer exist; both are folded into `life`.

## Implementation steps

1. **Create new file** `packages/storybook/src/effects/mouse-particles.ts` and define `MouseParticlesEffect implements Effect`.
2. **State layout**: allocate posTex (`vec4(pos.xyz, ageNorm)`) + colorTex (`vec4(rgb, lifeJitter)`) as ping-pong RTs. Trail RT is separate.
3. **CPU spawn scheduler**:
   - Fields: `#nextSlot`, `#birthAccumulator`, `#lastMouseUv`, `#lastMoveTime`.
   - Pre-allocate `#spawnAttr: Float32Array` of size `count * 4`.
   - At the top of `render`, compute `nSpawn` and fill the attribute buffer.
4. **INIT shader**: initialize every slot with `age = 2.0` (dead).
5. **UPDATE shader**: pure advect + age. No `justRespawned` branch. `noiseScale` divides (so it represents swirl size).
6. **SPAWN passes**:
   - `VERT_SPAWN` / `FRAG_SPAWN_POS` / `FRAG_SPAWN_COLOR`.
   - `geometry: { mode: "points", attributes: { aSpawn: { data, itemSize: 4, perInstance: true } } }`.
   - `instanceCount: nSpawn` (rewritten each frame).
7. **PARTICLE shader**: copy from the existing effect; envelope is `sin(age * π)` (age is already 0..1).
8. **TRAIL / OUTPUT shaders**: copy verbatim from the existing effect.
9. **Mouse-movement detection**: keep `lastMouseUv`; if it changed this frame, set `lastMoveTime = ctx.time`.
10. **Add storybook story**: a new `mouse-particles` story alongside the existing `curl-particles` story (don't touch the old one).

## Alternatives considered (and rejected)

- **Compute all positions on the CPU and upload to a texture every frame** — becomes CPU-bound past ~1k particles. Rejected.
- **CPU-side alpha check via `gl.readPixels`** — synchronous stall. Rejected.
- **Full-screen pass with a slot-range uniform instead of instanced points for spawn** — works, but scans all 256x256 = 65k texels every frame even when only a handful of particles spawn. Points-based is cleaner.

## Scope

- New file: `packages/storybook/src/effects/mouse-particles.ts`.
- New story: one entry in `*.stories.ts` for `MouseParticlesEffect`.
- Existing `curl-particles.ts` and its story are **not modified** (the two effects coexist).
- No impact on other packages (storybook only).

## Sharing / duplication policy with curl-particles

The following pieces of the existing effect are fully generic and can simply be copied into the new file:
- `snoise` / `grad4` / `mod289` / `permute` / `taylorInvSqrt` / `curl3D` (curl-noise utilities).
- `FRAG_TRAIL_COMPOSITE`, `FRAG_OUTPUT`, `FRAG_CLEAR`, `FRAG_PARTICLE`, `QUAD_VERTS`.

Factoring shared shader code into something like `packages/storybook/src/effects/_shaders/` is possible later but out of scope for this task. For now we accept the duplication.

## Verification

- Moving the mouse continuously emits particles (no "stuck at 1px").
- No particles emerge from transparent regions (e.g. through gaps in glyphs).
- Increasing `noiseScale` makes swirls visibly larger.
- `birthRate = 0` produces no particles.
- Setting `count` low caps the on-screen total as expected.
- Tab-switching does not teleport particles (existing `dt` cap is preserved).
