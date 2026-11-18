# Multiple render targets (MRT) for `ctx.draw`

Issue: https://github.com/fand/vfx-js/issues/274

## Goal

Let one `ctx.draw` write to several render targets at once.
The fragment shader writes each one with `layout(location = N) out`.

```js
ctx.draw({
    frag: simulate, // layout(location = 0..2) out vec4
    uniforms: { pos: this.pos, vel: this.vel, state: this.state },
    target: [this.pos, this.vel, this.state],
});
```

The only public API change is the type of `EffectDrawOpts.target`.

## Approach

- `Framebuffer` stays as it is: one target, one FBO.
- A new internal class binds the color attachments of several `Framebuffer`s to one FBO.
- `EffectHost` caches that class, keyed by the set of write-side `Framebuffer`s.

## Steps

### 1. `packages/vfx-js/src/types.ts`

- Change `EffectDrawOpts.target` to `EffectRenderTarget | readonly EffectRenderTarget[] | null`.
- Document the array form in the doc comment: element `i` is written by `layout(location = i)`.
- `ctx.blit` and `ctx.clear` keep taking one target.

### 2. `packages/vfx-js/src/gl/framebuffer.ts`

- Add `attachColorTo(index)`: attach this framebuffer's color to the currently bound FBO at `COLOR_ATTACHMENT0 + index`.
  Use the renderbuffer when multisampled, the texture otherwise.
- Add `attachDepthTo()`: same for depth.
- Add a `version` counter and bump it in `#allocate`.

### 3. `packages/vfx-js/src/gl/multi-framebuffer.ts` (new, internal)

- Takes a list of `Framebuffer`s and at most one of them as the depth source.
- Creates an FBO, attaches every member, then calls `drawBuffers([COLOR_ATTACHMENT0, ..., N-1])`.
  `drawBuffers` is per-FBO state, so other draws are not affected.
- Before binding, compare each member's `version` with the one seen at attach time. Attach again if any changed.
  A resize recreates MSAA renderbuffers, so the old attachments go stale.
  Plain textures keep their handle across a resize.
- Registers as `Restorable`. On context restore it recreates the FBO and attaches again.
  It is created after its members, so they are restored first.
- `dispose()` deletes the FBO and unregisters. It does not dispose the members.

### 4. `packages/vfx-js/src/effect-host.ts`

`#doDraw` takes a separate path when `target` is an array.
An array of length 1 is treated as a single target.

Validation. On failure, warn once per kind and skip the draw:

- Empty array.
- `null` in the array.
- `ctx.target` (the stage output) in the array.
- The same target twice.
- Sizes differ.
- `samples` differ.
- More targets than `MAX_DRAW_BUFFERS` (query once and cache).
- The program is GLSL 100. Add a `glslVersion` getter to `Program`.

Depth: if several targets have depth, warn once and use the first.

Draw:

- Build uniforms before binding the target, as the single-target path does.
- Viewport is the full target size.
- Default blend is `"none"`. One blend mode applies to all attachments.
- `depthTest` / `depthWrite` work when one target has depth.

After the draw:

- Call `markDirty()` on every member.
- Regenerate mipmaps on members with auto mipmap.
- Swap every persistent member. `swap: false` skips all of them.

Cache:

- `Map<string, MultiFramebuffer>`, keyed by the ids of the write-side `Framebuffer`s in order.
  A persistent target has two write sides, so a set of targets normally uses two entries.
- `#disposeOwnedRT` drops and disposes the entries that use the disposed target.
- `dispose()` disposes all entries.

### 5. Tests

- `gl/multi-framebuffer.test.ts`
    - Attaches each member and calls `drawBuffers` with the right list.
    - Attaches the depth source.
    - Attaches again after a member's `version` changes.
    - Rebuilds on restore.
    - `dispose()` deletes the FBO and leaves members alone.
- `effect-host.test.ts`
    - Each validation rule warns once and skips the draw.
    - Length-1 array behaves like a single target.
    - Persistent members swap; `swap: false` skips the swap.
    - The cache reuses an entry for the same set of targets.
    - Disposing a target drops its entries.
    - With several depth targets, the first is used.

### 6. Docs, skill, story

- `skills/vfx-js/references/effects.md`: add an MRT section and update the `draw(opts)` row.
- `docs/EFFECT.md`: same.
- `packages/docs/src/pages/custom-effects.astro`: add an MRT section.
- `packages/storybook/src/Mrt.stories.ts`: particles that update position and velocity in one pass.
- Changeset: `@vfx-js/core` minor.

## Decisions

### Naming

Overload `target`. There stays one way to say where a draw goes.

### Unused outputs: no detection

If the shader writes fewer outputs than there are targets, GL raises no error and the extra attachments hold undefined pixels.
Extra shader outputs are dropped, which is harmless.

The library does not detect this:

- WebGL2 has no API to list a program's outputs.
- `getFragDataLocation` needs the output's name, which the library does not know.
- Parsing the fragment source with a regex fails on `#define` / `#if` switches, commented-out declarations, array outputs, and a single output with no `layout`.
- A false warning on a correct shader is worse than a missed one.

Instead, the docs and the skill say: declare one output per target; a target with no output holds undefined pixels.

A dev-only warning, once per program, can be added later without an API change.

### Partial writes: not supported

A draw cannot skip some attachments (`drawBuffers` with `NONE` entries).

- A shorter array does the same job: draw with `target: [A, C]` and write locations 0 and 1.
- The FBO is cached per set of targets, so switching between `[A, B, C]` and `[A, C]` does not rebuild anything.
- A sparse array such as `[A, null, C]` would clash with `null` meaning the canvas.
- It is unclear whether a skipped persistent target should swap.

The one cost: a shader shared between a full draw and a partial draw needs two variants, because the locations shift.

A `drawBuffers`-like option can be added later without changing what the array means.

## Differences from the issue

- **MSAA:** works when every target has the same `samples`. Otherwise the draw warns and is skipped.
  A GPU that falls back to `samples: 1` for only some formats can cause a mismatch.
- **`ctx.target` can't be in the array.** It is `null` on the last stage, and it uses the stage viewport.
- **A resize does not rebuild the FBO.** Attachments are redone only for MSAA members and after a context restore.

## Out of scope

- Per-attachment blend modes and colour masks.
- `ctx.clear` with an array.
- WebGPU.
