# HoloEffect: holographic foil for `@vfx-js/effects`

Port the holographic foil materials of [holospot](https://github.com/dmitrykurash/holospot)
(MIT, © 2026 Dmitry Kurash; the renderer of [holo.spot](https://www.holo.spot)) to a
single `HoloEffect` in `@vfx-js/effects`.

## Goals

- **Faithful.** Port holospot's physics, not an imitation of the look. The
  grating equation, Bessel order efficiencies, CPU η renormalisation, the
  material- and SPD-convolved spectral tables, the spectral light rig, the coat,
  the studio environment and the output stage (exposure, Neutral / AgX tone
  curve, gamut mapping) come from holospot's code.
- **All foil materials, one effect.** `prism`, `shatter`, `nebula`, `sparkle`
  and `vortex` are values of one `material` parameter of `HoloEffect`.
- **holo.spot compatible settings.** The effect takes holospot's flat setting
  ids (`"prism.pitch"`, `"studio.panel.dir"`, `"display.ev"`, …) with the same
  ranges and defaults, so a look tuned on holo.spot carries over.
- **Zero runtime dependency.** Like every effect in the package: no three.js,
  only types from `@vfx-js/core`.

## Not in this plan

- **Foil Emboss (`emboss`).** Phase 2. The logo is passed to the effect as an
  image param.
- **Volume Hologram (`volume`).** It needs the baked SDF volumes and sphere
  tracing. Possibly later, also with an image or volume param.
- **Scene objects.** The cloth, flag, sticker wall, bent / crumpled sheets and
  GLB models are part of the website, not of the foil materials.
- **Depth of field.**
- **Bump maps (`bump.*`).** They need PNG assets. The analytic relief (board
  waviness, orange peel) is ported.
- **Procedural card print (`scene.print`, card text).** The DOM element takes
  the place of the print layer (see below).

## Where holospot and vfx-js differ

| | holospot | this port |
|---|---|---|
| Geometry | three.js meshes and a 63 × 88 mm card | the element rect is a flat card |
| Shaders | three.js `ShaderMaterial` (GLSL 3.00 with three's prefix) | standalone `#version 300 es` fragment shaders for `ctx.draw` |
| Spectral tables | `DataArrayTexture` (RGBA16F, 512 × 41 × 5 layers) | 2D atlas with the layers stacked; uploaded through an 8-bit canvas and decoded on the GPU into a float target (see below) |
| Environment | procedural studio cube → PMREM (`samplerCube`) | the same procedural environment rendered into an octahedral 2D float target with mips |
| Rect lights LTC | three's `LTC_HALF_1/2` tables | tables embedded as data (last milestone; until then `RECT_LTC 0`) |
| Uniforms | `IUniform` objects | `ctx.draw` uniforms (float / int / uint arrays, mat3 / mat4 arrays are supported by core) |

vfx-js only binds `sampler2D` and can only wrap DOM sources or a
`WebGLTexture`, so:

- **Float data upload.** The CPU builds Float32 tables (holospot code). Each
  value is encoded as a 24-bit float (sign, 7-bit exponent, 16-bit mantissa) in
  the RGB bytes of an opaque `<canvas>` (alpha 255, so neither premultiplication
  nor colour management touches it). `ctx.wrapTexture(canvas, { filter:
  "nearest" })` uploads it. A decode pass writes the values into a
  `float: true` render target, which the material shaders then sample with
  linear filtering. Rebuilt only when the tint (`*.tint*`) or an SPD in use
  changes.
- **Array textures.** Layer `k` of the 512 × 41 table is rows
  `[41k, 41k + 41)` of the atlas. The lookup clamps the row coordinate to the
  layer's first and last texel centre, so bilinear filtering never mixes
  layers.
- **Cube map.** The octahedral map is a 2D target (`mipmap: true`). The
  PMREM roughness → mip mapping becomes a box-filtered mip chain. This is the
  only approximation in the environment, and it only touches the dim ambient
  light. The analytic hero lights are exact.

## Model of the element

- **Card plane.** The element's content box is the card face. Card point
  `p` in mm comes from the element UV and the physical size `sizeMm`, the
  largest side in mm. Default: CSS reference pixels (1 px = 0.2646 mm). The
  same settings then look the same on every element at a given CSS size.
- **Camera.** holospot's fixed camera: vertical FOV 22°, distance from
  `framingDistance` (the element fills 70 % of the height or 80 % of the
  width), on +Z. World frame as in holospot: card normal at rest = +Z,
  +Y up, metres.
- **Pose.** The card rotates (`eulerXYZ(rx, ry, 0)`) under world-fixed lights
  and camera, exactly as in holospot's tilt mode. The image itself is not
  warped. The element stays where the DOM put it, and only the shading follows
  the pose. A perspective-warped mode (overflow) is a possible follow-up.
- **Pointer** (`motion.pointer`): `tilt` adds up to ±`motion.tiltRange`° to
  the rest pose `motion.pose`, eased like holospot's card recipe. `light`
  moves the flashlight (light slot 3) with the pointer. `none` keeps the rest
  pose. Optional idle wobble (`motion.wobble`, `motion.wobbleAmp`).
  Source: `ctx.mouse` / `ctx.mouseViewport`.
- **Print layer = the element.** holospot composes
  `R = (1 − W)·T2·R_foil + W·onWhite`. Here the source pixel supplies it:
  - `mask` (`"alpha"` default, `"luma"`, `"none"`): where the foil is. Outside
    the foil, the element is shown unchanged.
  - `ink` (0–1): how much the source colour tints the foil as a translucent
    ink (`T2 = mix(1, srcLinear, ink)`). 0 is bare foil.
- **Output.** Exposure `2^(display.ev)`, gamut map, Neutral / AgX / clamp, sRGB
  OETF, as `output.frag`. Written premultiplied with alpha = foil coverage
  × source alpha. The page under the element is the background. Glare spill
  over it is screen-blended, which premultiplied alpha approximates with
  alpha = max channel.

## Pipeline per frame

1. **CPU.** Pose (spring / ease), the light set (`computeLights`), the key
   light, η renormalisation per light (`physics/grating.ts`), relief waves
   (when their settings change), spectral tables (when the tint changes).
2. **Table decode pass** (only after a rebuild): canvas → float atlas, conv
   and cum.
3. **Environment pass** (only when the ambient settings change): procedural
   studio environment → octahedral float target, mips regenerated.
4. **Material pass** → HDR float target (`encodeCard` compression kept, so
   the output pass is a straight port).
5. **Glare** (`display.glare`): holospot's down / up chain.
6. **Output pass** → `ctx.target`, with the source pixel for the mask and the
   pass-through outside the foil, and optional grain.

## Quality tiers

`quality: "low" | "medium" | "high"` selects holospot's `TierConfig`: the
defines (`RECT_EXACT`, `RECT_LTC`, `NB`, `IBL_ORDERS`, `DISCRETE_LIGHTS`,
`FLAKE_ENV`, …) and the loop trip counts (`uMaxOrder`, `uGhB`, `uVorR`,
`uFlakeR`, `uBCells`, `uBBins`, `uBLevels`). Default `"medium"`. MSAA and the
DPR caps do not apply: the effect renders at the element's pixel size.

## Public API

```ts
type HoloMaterial = "prism" | "shatter" | "nebula" | "sparkle" | "vortex";

type HoloParams = {
    material: HoloMaterial;
    /** Look the values start from: "card" (default), "object" or "plain". */
    look: HoloLook;
    /** holospot setting ids → values (material, studio.*, display.*, grain.*, card.*, motion.*). */
    settings: HoloSettings;
    /** Largest side of the element in mm. Default: CSS px × 0.2646. */
    sizeMm: number | null;
    quality: HoloQuality;
    mask: HoloMask;
    ink: number;
};

new HoloEffect({ material: "prism", settings: { "prism.pitch": 1200, "prism.pattern": "radial" } });
```

`HoloSettings` is a typed map of every supported id (generated from
holospot's `params.json`), so editors complete ids and value types.
`setParams` merges `settings` per id. The effect also accepts a holo.spot
"Copy settings" blob as `settings`.

## File layout

```
packages/effects/src/
  holo.ts                     HoloEffect, public types
  _holo/
    data/                     params, looks, studio presets (subset of holospot's JSON, as TS)
    spectral/                 cmf.ts, spd.ts, tables.ts, encode.ts (float24 canvas)
    physics/                  geometry.ts, grating.ts, vortex.ts, sparkle.ts (CPU twins used at run time)
    scene/                    lights.ts, relief.ts, env.ts, pose.ts
    materials/                prism.ts, shatter.ts, nebula.ts, sparkle.ts, vortex.ts (values → uniforms)
    glsl/                     shader sources as TS strings, one module per holospot file
    settings.ts               defaults, looks, Copy-blob parsing
```

Each ported file keeps a header naming its holospot source. The MIT notice of
holospot goes into `_holo/LICENSE-holospot` and the header of `holo.ts`.

## Verification

- **Unit tests (vitest, new in `@vfx-js/effects`).** Port holospot's CPU tests
  for the modules we copy (`spectral.test.ts`, `sparkle.test.ts`,
  `vortex.test.ts`, the η sum rules), plus round-trip tests of the float24
  encoding.
- **Parity screenshots.** Run holospot's `recipes/card.html` and a vfx-js page
  with the same settings at pose (0, 0), where holospot's perspective of the
  card is only a scale. Compare in Playwright. Also compare a few tilted poses
  by eye.
- **Storybook.** One story per material, with controls for the main settings.
- `pnpm --filter docs test`, `pnpm run lint`, `pnpm test`.

## Milestones and commits

Small commits, in this order. Each one builds and lints.

1. `docs`: this plan.
2. `effects`: vitest setup.
3. Spectral CPU port: `cmf.ts`, `spd.ts`, `tables.ts` + tests.
4. Physics CPU port: `geometry.ts`, `grating.ts` (η) + tests.
5. Light rig and studio presets: `lights.ts`, data.
6. Float24 canvas encoding + decode pass + tests.
7. GLSL library port: `common`, `spectral`, `lights`, `coat`, `grating`.
8. `HoloEffect` skeleton: card model, pose / pointer, prism material
   (low tier, no environment), HDR target, output pass. **First visible
   result.**
9. Studio environment (octahedral) + `ibl.glsl`.
10. Relief waves (`relief.glsl`, `relief.ts`) + `wear.glsl`.
11. Quality tiers: `RECT_EXACT`, environment diffraction bins (`NB`).
12. Shatter.
13. Glitter library + Nebula.
14. Sparkle.
15. Vortex.
16. Glare chain.
17. Grain.
18. LTC tables (`RECT_LTC`).
19. Exports, `skills/vfx-js/`, docs effects list, storybook stories, changeset.
20. Parity check against holospot; fixes.

Phase 2 (same PR, after the above works): Foil Emboss with an image param.

## Risks

- **Shader size.** The material programs are large (the glitter ones most
  of all). Compile time and register pressure on mobile GPUs. The low tier is
  the fallback, as in holospot.
- **Float render targets.** They need `EXT_color_buffer_float`. Without it
  holospot has an LDR path (`HOLO_LDR`); the port keeps it.
- **Bundle size.** The data tables and shader sources add roughly 150–250 KB of
  source to the package. The package is `sideEffects: false`, so apps that do
  not import `HoloEffect` do not pay for it.

## Status

Milestones 1–20 are done. Phase 2 (Foil Emboss) is next.

Parity against holospot `dist/holo.js` (the card at pose (0, 0), same lights and camera, holospot's `bump.strength`
0, grain and glare off unless noted). Mean absolute difference per channel, 0–255, over the card interior after
aligning both renders to the pixel; "blurred" compares both after a 6 px Gaussian blur:

| Case | Per pixel | Blurred |
|---|---|---|
| Prism, card look, medium | 1.0–1.4 | 0.8–1.3 |
| Prism, panel mirror (LTC) | 0.8 | — |
| Prism, plain look, low / high | 1.6 / 1.2 | — |
| Prism with glare 0.1 | 0.6 | — |
| Shatter | 3.4–4.0 | 0.7–0.8 |
| Nebula | 9–16 | 0.6–0.8 |
| Sparkle | 6–11 | 0.3–0.5 |
| Vortex | 0.6–1.0 | 0.3–0.8 |

The per-pixel residual of the glints and shard edges matches holospot's card sitting a quarter pixel off the pixel
grid (220.5 px wide, centred): high-frequency detail sampled at shifted positions. An earlier version of this table
blamed MSAA; the actual cause was a one-pixel crop misalignment in the comparison script plus this sub-pixel offset.

Perspective mode (`perspective: true`) draws the card as geometry projected by holospot's camera (FOV 22°, the card
at rest filling 70 % of the view, which is exactly the element's rect inside the grown output). At holo.spot's card
pose (rx −20.5°, ry −25°) it matches holospot's tilted render: prism 1.5–1.9 per pixel (0.9 blurred), shatter
2.7–2.9 (0.6 blurred). The element itself is mapped onto the card (print layer, mask, the base layer of the luma
mask), and the glare spills into the grown output.

`msaa: true` gives the card target 4× MSAA in half float, as holospot's HDR target (core `samples: 4`, #277). It
smooths the card's outline in perspective mode. In flat mode the material pass is one full-screen quad with no
triangle edges, so MSAA changes nothing there (≤ 1/255, half-float rounding); the flag defaults to `false`.

Deviations found while porting:

- The foil mask is applied in the material pass (the card target's alpha), as holospot's coverage is, so the
  glare only sees visible foil.
- Glare spill stays inside the element rect (no `outputRect` growth yet).
- The environment is prefiltered with an importance-sampled GGX lobe per tile instead of three's PMREM.
- Flat mode (the default) keeps the element in place and does not warp it; `perspective: true` is holospot's view.
- The pose is this port's: spring toward rest pose + pointer tilt (`motion.tiltRange`), idle wobble as a slow
  Lissajous. holospot's site pose controller is not part of its kit.
