# Advanced Effect Stories — Plan

Add advanced stories to `packages/storybook/src/Effect.stories.ts` that
exercise capabilities only the Effect API enables (persistent /
float render targets, multi-pass sim, custom geometry with instancing,
`wrapTexture`). Implement in this order; each step lands its own
effect module and stories.

## 1. Stable Fluid (port to Effect)

Goal: turn the existing `stable-fluid.ts` (`VFXPass[]`) into a single
self-contained `Effect`, so it composes with other effects and is
reusable per element.

- New file: `packages/storybook/src/effects/fluid.ts` — `class FluidEffect implements Effect`.
- `init`: allocate sim RTs (velocity, pressure, divergence, curl, dye)
  via `ctx.createRenderTarget({ float: true, persistent: true })`.
  Use `ctx.gl` only where the existing pass code already does.
- `update`: run advect → curl → vorticity → divergence → pressure
  (N iterations) → gradient subtract → dye advect, all via `ctx.draw`.
  Reuse fragment shaders from `stable-fluid.ts` verbatim where possible.
- `render`: advect `ctx.src` by current velocity into `ctx.target`
  (or composite dye on top depending on `showDye`).
- Params: pull from `FluidPassesOpts` (sim resolution, iterations,
  dissipation, splat force/radius, etc.). Mutable `params` like
  `BloomEffect` for runtime tweaks.
- Mouse splats: read `ctx.mouse` deltas instead of the current
  `mouseDelta` callback plumbing.
- Stories: `fluid` (Logo) and `fluidWithBloom` (chain
  `[FluidEffect, BloomEffect]`) to prove composability.

## 2. Reaction-Diffusion (Gray-Scott)

Goal: ping-pong float RT simulation, multiple sub-steps per frame,
composite with `ctx.src`.

- New file: `packages/storybook/src/effects/reaction-diffusion.ts`.
- Two `persistent: true, float: true` RTs sized to src; ping-pong
  each frame, run `stepsPerFrame` iterations.
- `init`: seed RT with a noise / center-blob pattern via a one-shot
  `ctx.draw` (use `ctx.gl` for `clear` only if needed).
- `update`: run Gray-Scott update shader (diffusion + reaction)
  N times, alternating which RT is read/written.
- `render`: composite the pattern over `ctx.src` (multiply, mask,
  or replace via a `mode` param).
- Params: `feed`, `kill`, `diffA`, `diffB`, `stepsPerFrame`, `mode`.
- Story: `reactionDiffusion` on Jellyfish with Tweakpane controls
  (feed/kill sliders — these are the meaningful knobs).

## 3. Curl-noise Field Particles

Goal: GPU particle sim using state textures + instanced custom
geometry. Showcases the Effect API's particle story end-to-end.

- New file: `packages/storybook/src/effects/curl-particles.ts`.
- State: two ping-ponged `persistent: true, float: true` RTs sized
  `[N, 1]` (or `[sqrt(N), sqrt(N)]`) holding particle position +
  age in RGBA channels. Velocity derived from curl-noise field at
  current pos, no separate velocity RT needed.
- `update`: integrate position by sampling a curl-noise field
  (analytic 3D simplex curl in fragment shader) at current pos;
  respawn when age exceeds lifespan or pos leaves outputRect.
- `render`: instanced point/quad geometry, one instance per particle,
  with a `perInstance` `id` attribute. Vertex shader fetches pos/age
  from state RT by id, writes gl_Position; fragment shader colors
  by age (fade in/out) and samples `ctx.src` at the particle's
  spawn uv for image-tinted particles.
- Params: `count`, `lifespan`, `speed`, `noiseScale`, `pointSize`.
- Story: `curlParticles` with Logo as color seed; particle count
  configurable via `argTypes`.

## 4. ASCII / Dot-matrix Renderer

Goal: external-resource demo via `wrapTexture` + cell-based
luminance lookup.

- New file: `packages/storybook/src/effects/ascii.ts`.
- Asset: a glyph atlas image (16×16 ASCII grid, monospace,
  pre-rendered offline; e.g. one of the existing webp/svg slot
  replaced with a small PNG). Add to `assets/`.
- `init`: `ctx.wrapTexture(atlasImg)`; cache once.
- `render`: one `ctx.draw` — fragment shader divides screen into
  cells of `cellSize`px, samples avg luminance of `ctx.src` over
  the cell (or just center), maps to a glyph index, samples the
  atlas at `(glyphIdx, intra-cell uv)`. Optional color tint from
  cell-average src color.
- Params: `cellSize`, `colored` (bool), `palette` (string of chars
  ordered by density — drives glyph-index mapping at build time).
- Story: `ascii` on Jellyfish; second story `asciiOnVideo` if a
  small looping video asset is available, otherwise skip.

## Conventions (apply to all)

- Zero runtime deps from `@vfx-js/core` — type-only imports, same
  as existing `bloom.ts` / `pixelate.ts` / `scanline.ts`.
- Effects expose a mutable `params` object so Tweakpane can bind
  to it directly (mirror `BloomEffect` shape where it makes sense).
- `dispose()` clears RT/geometry references; rely on the host for
  GPU resource teardown.
- Stories live in `Effect.stories.ts`. Add a Tweakpane helper to
  `utils.ts` per effect that needs one (don't overload
  `attachBloomPane`).
- No JSDoc on stories themselves; brief comments only where the
  WHY is non-obvious (per existing repo style).
