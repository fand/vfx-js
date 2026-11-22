# SaberEffect rebuild plan

Rebuild the Saber effect from PR #193 (`pr-193` branch, not merged).
The old version had two problems:

- The glow came from `k / distance` on a JFA distance field. The field has creases on the medial axis, so the glow showed Voronoi-like seams.
- The line was the distance field looked up at a noise-warped uv. That only gives a smooth wobble, never a spiky, electric line.

## Approach

Split the effect into two parts that fix one problem each.

1. **Core line**: keep the JFA, but use it to find the nearest contour point, not to light pixels.
   Sample the noise at that contour point, and push the line along the contour normal by the noise value.
   The noise depends only on the position on the contour, so the line gets real jagged spikes.
2. **Glow**: draw only the thin core line into an HDR target, then blur it with a bloom pyramid.
   A blur adds light up, so it has no creases.

No CPU contour tracing, no `ctx.readPixels`, no core changes.
The arc-length features of the old PR (`progress` reveal, traveling `pulse`) are out of scope.

## Pipeline

All passes use `ctx.draw` with fullscreen quads. Lengths in params are CSS px; multiply by `ctx.dims.pixelRatio` for uniforms.

### Field build (cached)

Rebuild only when the buffer size, `edge` or `edgeThreshold` changes, when `invalidate()` was called, or every frame when `dynamic` is true.

1. **Seed pass** → `seedA` (float, nearest).
   - Mask value `m` = alpha (`edge: "alpha"`) or luminance (`edge: "luminance"`) of `src`, zero outside the valid src rect.
   - A texel is a seed when `m` crosses `edgeThreshold` between it and any 4-neighbour.
   - Store the **offset** from the texel centre to the contour point, in px: `rg = offset`, `a = 1` (valid). Refine to sub-pixel: find the crossing along x and along y by linear interpolation, then take the nearest point on the line through both crossings.
   - Offsets, not absolute coords: they stay precise in RGBA16F at any buffer size.
2. **JFA passes** `seedA ↔ seedB`, step = `2^ceil(log2(max(w, h)))/2` down to 1, then one extra pass at step 1.
   - A neighbour's candidate is `neighbourOffset + neighbourDelta`. Keep the shortest.
3. **Resolve pass** → `field` (float, linear).
   - `r` = signed distance in px (negative inside: `m >= threshold`), `gb` = outward unit normal, `a` = valid flag.

Check that a render target with `persistent: false` keeps its content between frames when the effect does not draw to it. If the host clears it, use `persistent: true` for `field`.

### Per frame

4. **Core pass** → `core` (float, linear, full buffer size).
   - Read `d` and the normal `n` from `field`. Foot point `q = p - d * n` (continuous in `p`, in px).
   - Early out per 2×2 quad when `abs(d) > amplitude * 1.2 + thickness + 4.0`, so derivatives stay valid in drawn quads.
   - For each line `i < lines` (max 4):
     - `disp = amplitude * envelope(q, t) * jag(q / scale + seed_i, t)`.
     - `f = d - disp`. Line distance `dist = abs(f) / min(screenGrad, slopeGrad)`. This keeps the line width even on steep spikes.
       - `screenGrad = length(vec2(dFdx(f), dFdy(f)))`.
       - `slopeGrad = sqrt(1 + slope^2)`, with `slope` from one more `jag` call one px along the tangent.
       - `screenGrad` alone jumps on the medial axis and draws false lines there.
     - `core += weight_i * smoothstep(thickness * 0.5 + 0.75, thickness * 0.5 - 0.75, dist)`.
   - `jag`: 4 octaves of 3D simplex noise (`xy` = contour point, `z` = time), lacunarity 2, gain ~0.55. Blend plain fbm with ridged fbm by `sharpness`, so 1 gives sharp V corners. The ridged term is `0.9 - 2 * abs(n)` (zero mean), and its sign flips every other octave so kinks point both ways.
   - `envelope`: low-frequency noise raised to a power, so some parts of the contour burst out and others stay calm. `burst` 0 gives envelope 1 everywhere.
   - Time: `t = time * speed`. `flicker` mixes smooth time with stepped time (`floor(t * 16) / 16` plus a hash jump per step) so the bolts snap between shapes.
   - Line 0 is the main line with full weight and a smaller amplitude (`amplitude * 0.35`). The other lines are thinner arcs with the full amplitude, their own seed and envelope.
   - Output is one HDR intensity channel (write it to `rgb`, `a = 1`).
5. **Glow pyramid**: `createBloomPyramid(ctx, w, h, 8)` from `_bloom-common.ts`.
   - Move the 13-tap downsample (`karis` uniform) from `bloom.ts` to `_bloom-common.ts` as `FRAG_BLOOM_DOWNSAMPLE` and use it in both effects. Use `karis: 1` on the first level to stop thin bright lines from flickering.
   - Upsample with `upsampleBloomPyramid`. Level weight `w_i = glowFalloff^i`, normalised so the weights sum to 1. `glowFalloff` near 1 gives a long tail, near 0 a tight halo.
   - Each level also gets a gain of `2^(i+1)`, so a thin line keeps its brightness as it blurs.
   - The level count follows `pad`, so the widest blur stays inside the buffer. The glow also fades out over the outer half of the pad.
   - The halo must look the same at every pixel ratio.
6. **Composite pass** → `ctx.target`.
   - `light = core * coreIntensity + glow * glowIntensity`, both times `intensity`.
   - `rgb = 1 - exp(-light * mix(color, vec3(1), 0.08))`: the tinted halo burns to white at the core with no extra branch.
   - Dither with interleaved gradient noise before output (same as `bloom.ts`).
   - `source: true` draws the element under the light (`src + light * (1 - ...)`, premultiplied, as in `bloom.ts`). `source: false` draws the light only.
   - Output premultiplied: `a = clamp(max(srcAlpha, max(rgb.r, rgb.g, rgb.b)), 0, 1)`.

`outputRect` uses `padOutputRect(params.pad, dims)`. Rebuild the pyramid when the buffer size changes, as `BloomEffect` does.

## Params

```ts
export type SaberParams = {
    /** Glow color, CSS hex. Default "#3399ff". */
    color: string;
    /** Overall brightness. Default 1. */
    intensity: number;
    /** Core line width in CSS px. Default 2. */
    thickness: number;
    /** How far the line jumps off the contour, in CSS px. Default 12. */
    amplitude: number;
    /** Size of the largest jags, in CSS px. Default 60. */
    scale: number;
    /** 0 = smooth wobble, 1 = sharp spikes. Default 0.8. */
    sharpness: number;
    /** 0 = even along the contour, 1 = bursts in places. Default 0.5. */
    burst: number;
    /** Animation rate. 0 = frozen. Default 1. */
    speed: number;
    /** 0 = smooth flow, 1 = bolts snap between shapes. Default 0.5. */
    flicker: number;
    /** Number of lines, 1..4. Default 3. */
    lines: number;
    /** Glow brightness against the core. Default 1. */
    glow: number;
    /** Glow reach, 0..1. Default 0.7. */
    glowFalloff: number;
    /** What the contour is taken from. Default "alpha". */
    edge: "alpha" | "luminance";
    /** Cutoff on the edge value, 0..1. Default 0.5. */
    edgeThreshold: number;
    /** Draw the element under the light. Default true. */
    source: boolean;
    /** Rebuild the contour every frame, for video. Default false. */
    dynamic: boolean;
    /** Room for the glow around the element, in CSS px. Default 80. */
    pad: number | "fullscreen";
};
```

Class shape follows `BloomEffect`: `params`, `constructor(initial)`, `setParams`, `init`, `render`, `outputRect`, `dispose`, plus `invalidate()` to rebuild the contour after the element changed.
Tune the defaults by eye in Storybook; the values above are starting points.

## Files

- `packages/effects/src/saber.ts`: new. Types-only import from `@vfx-js/core`.
- `packages/effects/src/_noise.ts`: new. Shared 3D simplex GLSL string (take it from `pr-193`). Leave `voronoi.ts` as is.
- `packages/effects/src/_bloom-common.ts`, `bloom.ts`: move `FRAG_DOWNSAMPLE`.
- `packages/effects/src/index.ts`: export `SaberEffect`, `SaberParams`.
- `packages/storybook/src/Saber.stories.ts`: new. Controls for every param. Sources: logo, text, jellyfish image, webcam or video with `dynamic`.
- `packages/docs/src/effects-list.ts`, `packages/effects/README.md`, `skills/vfx-js/references/effects.md`: add the effect.
- `.changeset/saber-effect.md`: `@vfx-js/effects` minor.

## Steps

1. Field build (seed, JFA, resolve) plus a debug view of the signed distance. Story with logo and text.
2. Core pass with one line. Check that the line is jagged, connected and even in width.
3. Glow pyramid and composite. Check that no seams show in the glow.
4. Extra lines, `burst`, `flicker`. Tune defaults.
5. `dynamic`, `invalidate()`, resize and context-restore handling.
6. Docs, skill, README, changeset.
7. Delete this plan when the effect is done; move what is still true into the class doc comment.

## Checks

- `pnpm run build`, `pnpm run lint`, `pnpm test`, `pnpm --filter docs test`.
- Storybook (`pnpm --filter storybook dev`, port 6006): screenshot the story on logo and text at pixel ratio 1 and 2.
  - No Voronoi seams in the glow, also in concave corners and between letters.
  - Spikes are sharp and the line has no gaps on a straight edge.
  - `BloomEffect` and `SwirlParticleEffect` stories look the same as before the `FRAG_DOWNSAMPLE` move.

## Risks

- The line breaks where the displacement crosses the medial axis (thin strokes, tight gaps). This reads as sparks. If it looks wrong, clamp `disp` to a share of the local feature size.
- With a large `amplitude`, spikes from two edges cross in concave corners and make a small hatch patch. Clamping `disp` to the local feature size is the likely fix.
- JFA at full resolution costs ~12 passes. It is cached, so only `dynamic` pays per frame. If video is too slow, build the field at half size.
