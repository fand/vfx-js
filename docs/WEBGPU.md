# WebGPU migration plan

Tracking issue: https://github.com/fand/vfx-js/issues/276

## Why

- Heavy effects freeze the page on their first draw.
  With `BubbleEffect` the freeze was 0.75 to 2.9 s before the shader was reworked, and is 0.18 to 0.28 s now (Chrome, M4 Max).
- WebGL cannot build a pipeline off the main thread.
  `KHR_parallel_shader_compile` only covers the GLSL to MSL step, about 150 ms.
- WebGPU has compute shaders, which particle and fluid effects want.

## What we measured

Details are in the issue comments.

- `createRenderPipelineAsync` drops no frame, even while a 2.7 s pipeline builds.
- The sync `createRenderPipeline` freezes as long as WebGL does.
  The cost only moves to the first draw.
- The build takes about as long as in WebGL.
- naga converts the Bubble shader both ways: GLSL to WGSL and WGSL to GLSL ES 3.00.
- The film list in `BubbleEffect` stays.
  In WebGPU it costs at most 0.25 ms per pass, and without it the pipeline takes twice as long to build.

Not measured yet: Safari WebGPU, Windows.

## Decisions

- **Default backend**: WebGPU. Browsers without WebGPU fall back to WebGL2.
  The backend is chosen once, when the `VFX` instance is made.
- **Explicit WebGL2**: import from `@vfx-js/core/webgl`.
- **Built-in effects and shader presets**: WGSL is the source.
  The build makes the GLSL with naga.
  naga never ships in the runtime.
- **User shaders and effects**: they run only on the backend of the language they are written in.
  To support both backends, the user writes both GLSL and WGSL.
- **While a pipeline builds**: show the original element.
- **Windows**: later.

## Pull requests

The work lands in three pull requests.
The first two change nothing for current users: WebGPU stays opt-in until the third.

### PR 1: Backend interface and opt-in WebGPU backend

Backend interface:

- `vfx-player`, `effect-host` and `effect-chain` stop using the `gl/` types directly.
  They talk to an internal `Backend` interface.
- The WebGL backend moves behind it with no behavior change.

WebGPU backend:

- `new VFX({ backend: "webgpu" })`, marked experimental.
- Getting a device is async, so `add()` queues work until the device is ready.
- Covers element shaders and post effects, written in WGSL.
- Effects, shader presets, transitions and capture throw on WebGPU until PR 2.
- No fallback to WebGL2 yet: `backend: "webgpu"` throws when WebGPU is missing.

How user WGSL gets its inputs:

- The user writes a complete WGSL fragment module. The library supplies the vertex stage.
- Uniforms sit in one struct bound as `var<uniform>` at group 0.
  The library reads the struct from the source and fills the fields by name, built-ins (`resolution`, `time`, ...) and user uniforms alike.
- A texture `var <name>: texture_2d<f32>` pairs with `var <name>Sampler: sampler`.
- Targets keep rows bottom-up as in WebGL, so `@builtin(position)` equals `gl_FragCoord` and a shader ported line by line draws the same.

### PR 2: Port shaders and effects

Effect API:

- An effect declares its pipelines in `init()`.
  The host builds them with `createRenderPipelineAsync`.
- Until all of them are ready, the host skips the effect and shows the original element.
- An effect that switches shaders at runtime keeps drawing with the old pipeline until the new one is ready.
- `ctx.device` sits next to `ctx.gl` for low-level work.
- Check Safari 26 before this API is fixed.

Build:

- WGSL is the source. The build runs naga to make the GLSL.
- The WebGL backend learns uniform blocks.
  naga's GLSL output puts all uniforms in one `std140` block.
- The build also writes the map from naga's sampler names to ours.
- The generated GLSL goes in its own chunk, loaded only on the WebGL2 fallback.
  It is about 2.6 times the size of the hand-written GLSL (131 KB vs 50 KB for one Bubble variant, 28 KB vs 15 KB gzipped).

Bubble and Glass first:

- These two are why we migrate, so they prove the Effect API.
- Write the WGSL by hand, built from template strings per mode and backdrop kind, as the GLSL is today.
- The build lists every variant and runs naga on each.

To measure with them:

- First-draw freeze of the generated GLSL in WebGL.
  The current GLSL is tuned by hand to compile fast, and naga's output may lose that.
- Image and frame time of the generated GLSL.

Then the rest:

- Shader presets and the other effects.
- Effects that call `ctx.gl` directly need a rewrite: particle, swirl-particle, jpeg-glitch, bubble, `_scene3d`, `_holo`.
- Move simulations to compute shaders.
  Each compute effect needs a WebGL2 answer: keep the old code, do nothing, or throw.

### PR 3: Switch the default (major release)

- `@vfx-js/core` picks WebGPU when it is there, else WebGL2.
- Add the `/webgl` and `/webgpu` subpaths.

## Open questions

- Whether the struct reader in PR 1 is enough for user WGSL. It does not take nested structs or field attributes.
- Whether the WebGL2 fallback of Bubble and Glass keeps the hand-written GLSL, if the generated one freezes too long.
- Safari WebGPU and Windows behavior.
