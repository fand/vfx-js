# vfx.capture(): plan

Implements [#266](https://github.com/fand/vfx-js/issues/266) as specified in [spec.md](spec.md).
One PR, one commit per step. Core only (`packages/vfx-js`), plus docs.

Do not start before the "Decisions to confirm" in the spec are settled: steps 2, 4 and 5 depend on them.

## Design

### What exists already

- `makeEffectTexture(resolve, width, height, dispose?, update?)` in `effect-host.ts` builds a handle that resolves its `Texture` on every use. This is the stable handle.
- `wrapElement` / `unwrapElement` / `requestCapture` in `html-in-canvas.ts` do the html-in-canvas wrapping. `addHTML` uses them.
- `VFXPlayer.#textureFromCapture` re-uploads an `OffscreenCanvas`, or replaces the `Texture` when the canvas object changed (resize).
- `Texture` registers itself with `GLContext` and re-uploads from `source` after a context restore.
- `dom2canvas` (`dom-to-canvas.ts`) is the fallback snapshot.
- `captureLive` (`live-capture.ts`) is the closest relative: a capture that is not drawn. It is internal, html-in-canvas only, has no `rect`, and takes a canvas that is already wrapped. It stays as it is; transitions depend on its exact behavior.

So the new code is mostly glue: a per-source driver, the handle, and the per-frame tick.

### New module: `capture.ts`

Pure logic with its dependencies passed in, like `live-capture.ts`, so it can be tested without WebGL.

```ts
/** What a source kind has to provide. */
type CaptureDriver = {
    /** The element whose rect is measured (the wrapper canvas for html-in-canvas). */
    readonly box: Element;
    /** Upload on every frame (video, canvas). */
    readonly everyFrame: boolean;
    update(): Promise<void>;
    dispose(): void;
};

/** Mutable texture slot shared by the driver and the handle. */
type CaptureSlot = {
    texture: Texture;
    /** CSS size of `box` when `texture` was captured. */
    width: number;
    height: number;
};

type CaptureEntry = {
    readonly capture: VFXCapture;
    /** Called by the player at the start of each rendered frame. */
    tick(): void;
};

function createCapture(deps: CaptureDeps, source: HTMLElement, opts: VFXCaptureOpts, onDispose?: () => void): Promise<CaptureEntry>;
```

`CaptureDeps` is what the player gives: `createTexture(source)`, `textureSize(texture, axis)` (= `readTextureSourceDim`), `refreshTexture(old, offscreen)` (= `#textureFromCapture`), `emptyTexture`, `maxTextureSize`, and the html-in-canvas / `dom2canvas` functions (overridable in tests).

Drivers, picked in `createCapture`:

| Kind | Setup | `update()` | `dispose()` |
|---|---|---|---|
| `img` | `await img.decode()`, `Texture(img)` | `await img.decode()`, `needsUpdate = true`, refresh slot size | restore opacity |
| `video` | wait for `canplay` if `readyState < 3`, `Texture(video)` | no-op | restore opacity |
| `canvas` | `Texture(canvas)` | no-op | restore opacity |
| `hic` | `wrapElement(el, { onCapture, maxSize, keepDrawn: !hide })`, `Texture(initialCapture)` | `requestCapture(wrapper)` | `unwrapElement(wrapper, el)` |
| `snapshot` | `dom2canvas(el, opacity, undefined, maxSize)`, `Texture(canvas)` | `dom2canvas` again, reusing the old canvas, then `refreshTexture` | restore opacity |

All textures get `premultiplyAlpha = true`, clamp, linear.

The handle:

- `texture`: `makeEffectTexture(() => disposed ? warnOnce(), deps.emptyTexture : slot.texture, ...)`. `width` / `height` read the slot's texture source, `0` when disposed. Its `update` calls the driver's `update()`.
- `rect`: one plain object, mutated in place. `tick()` sets `x` / `y` from `box.getBoundingClientRect()`; `width` / `height` come from the slot.
- `tick()` also sets `slot.texture.needsUpdate = true` when `everyFrame`. The upload itself is lazy (on bind), so an unused capture costs nothing.
- `dispose()`: driver dispose, `slot.texture.dispose()`, tell the owner (callback) to drop the entry.

Video and canvas upload every frame, so `tick()` also copies their box size into the slot.
For the other kinds, slot size is written wherever the texture is: at setup, in `onCapture` (html-in-canvas; layout is clean inside the paint handler, so one `getBoundingClientRect()` on the wrapper is cheap), and after a snapshot / image update.

### Changes to existing files

- **`html-in-canvas.ts`**
  - `CaptureOpts.keepDrawn?: boolean` (`@internal`). When set, `onPaint` skips the `clearRect` that follows a capture, so the wrapper canvas keeps showing the element. This is `hide: false`.
  - With `hide: true` the first capture is cleared with `releaseFirstCapture(canvas)`, as `addHTML` does.
  - With `hide: false`, wrap with `stillCover` so the frame before the first capture is not blank, then call `releaseFirstCapture(canvas, true)`: it drops the still copy and keeps the drawing.
- **`vfx-player.ts`**
  - `#captures: Set<CaptureEntry>`, `addCapture(source, opts)`, and removal through the entry's dispose callback.
  - `render()`: call `tick()` on every entry before the element loop.
  - `#resize`: for `snapshot` captures whose size changed, call `update()`. Same rule as text elements.
  - `#emptyTexture`: one transparent 1×1 `Texture` for disposed handles. Created in the constructor, disposed in `destroy()`.
  - Shader path: when a uniform value is an `EffectTexture`, skip it and warn once. Applies to `addElement`, per-pass uniforms and shader post effects.
- **`effect-host.ts`**
  - `toInternalUniform` gets the host's `gl` and throws when the resolved `Texture.gl` is another context: `"[VFX-JS] This texture belongs to another VFX instance."`. One pointer compare per texture uniform.
- **`vfx.ts`**
  - `capture(source, opts)`: reduced-motion handle, conflict checks, then `#player.addCapture`.
  - `#captures: Map<HTMLElement, VFXCapture>` for the "one capture per element" rule and for `destroy()`.
  - `#addHTML`: reject when the element is in `#captures`. `capture`: reject when the element is in `#wrapperCanvases`.
  - `destroy()`: dispose captures before `#player.destroy()`.
- **`types.ts`**
  - `VFXCapture`, `VFXCaptureOpts`, `VFXCaptureRect`.
  - `VFXUniformValue` gains `EffectTexture`. Check that the bindings (`react`, `vue`, `svelte`, `astro`) still type-check; they re-use the type.
- **`index.ts`**: export the three new types.

## Steps

### 1. `keepDrawn` in `setupCapture`

- Add the option and the branch in `onPaint`.
- Tests in `html-in-canvas.test.ts`: with `keepDrawn` the canvas is not cleared after a later capture; without it the behavior is unchanged.

### 2. `capture.ts` with the `img`, `video` and `canvas` drivers

- Types in `types.ts`, exports in `index.ts`.
- `createCapture` with fake deps. Tests in `capture.test.ts`:
  - The promise resolves after the image decodes; rejects when `decode()` rejects, and the opacity is restored.
  - `hide` sets and `dispose()` restores the opacity (`0.0001` for video).
  - `tick()` updates `rect.x` / `rect.y` and flags `needsUpdate` only for video and canvas.
  - `rect` is the same object across ticks.
  - After `dispose()`: the handle resolves to the empty texture, `width` is `0`, one warning, `update()` resolves, a second `dispose()` does nothing.

### 3. `hic` and `snapshot` drivers

- Tests with fake `wrapElement` / `setupCapture` / `dom2canvas`:
  - `onCapture` goes through `refreshTexture` and updates the slot size; the handle follows a replaced `Texture`.
  - `rect.width` / `rect.height` change only on a capture, not on a tick.
  - `update()` resolves after `requestCapture`; snapshot `update()` re-runs `dom2canvas`.
  - `dispose()` unwraps; a `dispose()` while the first capture is still pending unwraps and makes `capture()` reject.
  - A failed setup restores the element.

### 4. Wire into `VFXPlayer` and `VFX`

- Everything under "Changes to existing files" for `vfx-player.ts`, `vfx.ts` and `effect-host.ts`.
- Tests:
  - `effect-host.test.ts`: a texture from another context throws; one from the same context draws.
  - `vfx-player.test.ts` or a new `vfx-capture.test.ts`, as far as happy-dom allows: conflict rejections, reduced-motion handle, `destroy()` disposes captures.

### 5. `EffectTexture` in `uniforms`

- Widen `VFXUniformValue`; add the shader-path skip and warning.
- Remove the `as EffectUniformValue` casts in `#addEffectElement` and `#initPostEffectChain` that the wider type makes unnecessary.
- Tests: a type test that `uniforms: { page: capture.texture }` compiles for `VFXProps` and `VFXPostEffect`; the shader path warns once and does not upload the value.

### 6. Storybook

`packages/storybook/src/Capture.stories.ts`, for a check in a real browser (unit tests cannot cover html-in-canvas or GL):

- **Minimap**: a long article captured with `hide: false`, drawn small in a corner by an effect on another element. Checks `rect`, live updates and `hide: false`.
- **Hidden source**: `hide: true`, the element is drawn by a post effect only. Checks interactivity (a link and an input inside).
- **Sources**: image, video and canvas side by side.
- Run each story in Chrome with html-in-canvas on and off (fallback).

### 7. Docs

- `skills/vfx-js/SKILL.md`: add `capture` under "`VFX` methods". `skills/vfx-js/references/effects.md`: a "Sharing a texture between elements" section with the two ways to pass a capture.
- Doc comments on `VFX.capture` and the new types; the API reference is generated from them.
- `docs/html-in-canvas.md`: a short section on `capture` and `hide`.
- `.changeset/capture.md`: `@vfx-js/core` minor.
- `pnpm --filter docs test` must pass (skill coverage, exported types, `{@link}`).

## Checks before the PR

- `pnpm run lint`, `pnpm test`, `pnpm run build`.
- The three stories, with html-in-canvas on and off.
- Context loss: in the Minimap story, call `WEBGL_lose_context.loseContext()` then `restoreContext()`; the minimap comes back.
- The demo from the issue (knitted page) can drop its dummy effects and the resolve-symbol access.

## Risks

- **`hide: false` on html-in-canvas shows a canvas drawing, not the live element.** Anything the capture cannot draw (see html-in-canvas.md) is missing.
  Checked in Chrome 153 after step 1: a wrapper that keeps the drawing shows the element, follows a style change within a frame, and links inside stay clickable. A cleared wrapper is invisible and its links stay clickable too.
- **`paint` event timing.** The spec's timing rule assumes the paint event runs after `requestAnimationFrame` callbacks.
  Confirmed in Chrome 153 (headless, `--enable-blink-features=CanvasDrawElement`): within one frame the order is rAF, then `ResizeObserver`, then `paint`.
  A style change, a resize or `requestPaint()` made in a rAF callback fires `paint` in the same frame, and the next rAF sees the new pixels.
  Not checked on Chrome 159+ (`content="drawable"`); check it again in step 6.
- **Many captures.** Each one is a `getBoundingClientRect()` per frame. The issue's demo did the same by hand, so it is no worse; pausing off-screen captures is listed as a later option.
