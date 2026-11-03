# Multipass + overflow: element-space uniforms in intermediate passes

Fixes https://github.com/fand/vfx-js/issues/209

## Problem

In `VFXPass[]` chains with `overflow` (or fullscreen), intermediate passes get
`resolution` = buffer size (element + overflow) and `offset` = 0
(`packages/vfx-js/src/vfx-player.ts:1209-1228`). Single pass and the final
pass use `resolution` = element size and `offset` = element origin
(`vfx-player.ts:1092-1095`, `1265-1272`).

Consequences:

- Pixel math like `amplitude / resolution.x` differs between intermediate and
  final/single passes. This is the reported bug.
- Intermediate uv 0..1 spans the whole buffer, so `texture(src, uv)` stretches
  the element image over the overflow area. The final pass reads the buffer
  with element uv, which undoes the stretch. Pass-through looks right, but the
  intermediate buffer's pixel density differs from the element and its
  overflow region cannot be addressed.
- Shaders have no way to learn the element rect inside the buffer.

## Design (option "C")

One coordinate rule for every pass and mode:

- `resolution` = element size in physical px.
- `offset` = element origin inside the current render target, physical px.
- `uv = (gl_FragCoord.xy - offset) / resolution` is element space. The
  overflow area is `uv < 0` or `uv > 1`, same as single pass.
- `viewport` = the render target rect being drawn, `(x, y, w, h)` physical
  px. Unchanged. `viewport.zw` is the buffer size.

Texture spaces:

- `src` is element space (0..1 = element).
- Render targets VFX-JS owns (`<target>` buffers, `backbuffer`) are buffer
  space (0..1 = whole buffer). Read them with:

```glsl
vec2 toBuffer(vec2 uv) {
    return (uv * resolution + (offset - viewport.xy)) / viewport.zw;
}
```

This works in every pass. With no overflow it is the identity. The
`backbuffer` case already has this layout today; this change makes
`<target>` buffers follow the same rule.

No new uniforms. Buffer sizes, resize logic, and the final pass stay as-is.

## Compatibility

Only chains using `shader: VFXPass[]` together with `overflow` or fullscreen
change. Nothing in this repo does that (docs `initMultipass` has no overflow;
`@vfx-js/effects` uses the effect path, which ignores `overflow`).

Migration for affected user shaders, pick one:

- Keep old output exactly: in intermediate passes replace `offset` with
  `viewport.xy` and `resolution` with `viewport.zw`.
- Adopt the new rule: leave intermediate passes alone (pixel math is now
  element-based) and read buffers in later passes via `toBuffer(uv)`.

## Tasks

### 1. Core: intermediate pass uniforms (`vfx-player.ts:1209-1228`)

- `resolution` = `domRect.width/height * pixelRatio`.
- `offset` = `(glRect.x - defaultRect.x, glRect.y - defaultRect.y) * pixelRatio`.
  - overflow: `defaultRect = glRectWithOverflow` → overflow margin.
  - fullscreen: `defaultRect = viewportGlRect` (origin 0) → element origin in
    canvas, same value the final pass uses when drawing to canvas.
- `mouse` = `(mouseX + paddingX - defaultRect.x, mouseY + paddingY - defaultRect.y) * pixelRatio`
  (buffer space, matches `gl_FragCoord` of the current target). Replace the
  current scale conversion.
- Passes with `size`: keep `resolution` = size, `offset` = 0. A fixed-size
  buffer has no element mapping; `toBuffer` is the identity there.
- Do not touch buffer sizing/resize (`1140-1160`), the final pass
  (`1265-1272`), or post-effect multipass (`~1927`, element == canvas).
- Update the comment at `1208-1209`.

### 2. Pure helper + unit tests

- Extract a pure function that returns `{ resolution, offset, mouse }` for an
  intermediate pass from `(domRect, glRect, defaultRect, pass.size, mouse,
  padding, pixelRatio)`. Export it from `vfx-player.ts` next to
  `parseOverflowOpts`.
- Tests in `vfx-player.test.ts`: no overflow, overflow, fullscreen, `size`.
- Also assert numerically that `toBuffer` maps element uv 0 and 1 to the
  element edges inside the buffer for each case.

### 3. Docs

- `docs/MULTIPASS.md`
  - Built-in Uniforms table: `resolution` = element size (physical px);
    `offset` = element origin inside the render target; `viewport` = render
    target rect `(x, y, w, h)` in physical px; `mouse` = mouse in render
    target px.
  - New section "Overflow": uv is always element space; `<target>` and
    `backbuffer` are buffer space; `toBuffer` snippet; a glow-bleed example
    that blurs into the overflow area in an intermediate pass and composites
    in the final pass.
  - Migration note (the two options above).
- `packages/vfx-js/src/types.ts`: `VFXPass` jsdoc and the `viewport` /
  `offset` lines in `VFXPostEffect.shader` (`~491-493`), same wording.
- `docs/POSTEFFECT_EXAMPLE.md:79`: same `viewport` wording.
- `toBuffer` ships as a docs snippet only. No new export.

### 4. Storybook

- Add `packages/storybook/src/Multipass.stories.ts` with an
  `overflow` + intermediate-blur story: pass 0 blurs `src` and bleeds into the
  overflow margin, final pass composites with `toBuffer`. Include a
  fullscreen variant.

### 5. Changeset

- `@vfx-js/core`: minor. Describe the uniform change for multipass +
  overflow/fullscreen intermediate passes and the two migration options.

### 6. Verify

- `pnpm test`, `pnpm lint`.
- Run storybook; check the new story (blur reaches the overflow margin, no
  seam at element edges) and that the docs `initMultipass` demo is unchanged.
