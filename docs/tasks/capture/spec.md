# vfx.capture(): spec

API spec for [#266](https://github.com/fand/vfx-js/issues/266).
The implementation steps are in [plan.md](plan.md).

## Goal

Capture an element as a texture **without** drawing it in place, and let any effect in the same VFX instance read that texture.

```ts
const page = await vfx.capture(el, { hide: true });

page.texture; // EffectTexture, stays valid while the GL texture behind it is replaced
page.rect;    // where the element is, and the size the texture was captured at
await page.update();
page.dispose();

vfx.add(canvas, { effect: myEffect, uniforms: { page: page.texture } });
// inside the effect: ctx.uniforms.page is the EffectTexture
```

This replaces three hacks in user code today:

- Reading another element's texture through the internal `Symbol.for("@vfx-js/effect.resolve-texture")`.
- A dummy effect that draws nothing, only to keep an element captured.
- A `getBoundingClientRect()` per element per frame inside the effect.

## API

### `VFX.capture`

```ts
class VFX {
    capture(source: HTMLElement, opts?: VFXCaptureOpts): Promise<VFXCapture>;
}

type VFXCaptureOpts = {
    /**
     * Hide the source element. (Default: `false`)
     * A hidden element keeps its layout and stays interactive.
     */
    hide?: boolean;
};

type VFXCapture = {
    /** The captured pixels. The same object for the life of the capture. */
    readonly texture: EffectTexture;

    /** See "rect" below. The same object for the life of the capture; its fields change. */
    readonly rect: VFXCaptureRect;

    /** Capture again. Resolves when the new pixels are in `texture`. */
    update(): Promise<void>;

    /** Stop capturing, free the texture and restore the element. Idempotent. */
    dispose(): void;
};

/** CSS px, relative to the viewport, like `getBoundingClientRect()`. */
type VFXCaptureRect = {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
};
```

- The promise resolves after the first capture is in the texture. `texture` is never empty at that point.
- `source` is typed `HTMLElement`, like `vfx.add`. The source kind is picked at runtime (next section).
- New public exports from `@vfx-js/core`: `VFXCapture`, `VFXCaptureOpts`, `VFXCaptureRect`.

### Sources

| `source` | How it is captured | When the texture changes |
|---|---|---|
| `HTMLImageElement` | The element is uploaded as is | On `update()` only |
| `HTMLVideoElement` | The element is uploaded as is | Every frame |
| `HTMLCanvasElement` | The element is uploaded as is | Every frame |
| Any other element, html-in-canvas supported | Wrapped in a `<canvas layoutsubtree>`, like `addHTML` | Every time the browser repaints the element, and on `update()` |
| Any other element, html-in-canvas not supported | One DOM snapshot (`dom-to-canvas`), like `add` | On `update()`, and on a window resize that changes the element's size |

- "Every frame" means: uploaded on the first use in a frame. A capture that no effect reads costs no upload.
- **Images.** No URL loading. `capture()` waits for `img.decode()`, so it rejects when the image is broken.
  The `<img>` itself is the upload source, so a cross-origin image needs `crossorigin="anonymous"` and CORS headers, set by the user.
  An animated GIF gives its first frame only.
- **Videos.** `capture()` waits for `canplay` when the video has no frame yet, like `add`.
- **Canvases.** A plain canvas only. An html-in-canvas canvas (`<VFXCanvas>` of `@vfx-js/react`) is not supported as a source.
- **HTML.** The sizing rules and limits of `addHTML` apply (see [html-in-canvas.md](../../html-in-canvas.md)): the wrapper canvas takes the element's place in the layout.

### `opts.hide`

| Source | `hide: false` (default) | `hide: true` |
|---|---|---|
| HTML, html-in-canvas | The wrapper canvas keeps showing the last capture, so the element looks unchanged | The wrapper canvas is cleared after each capture. The element is invisible and still interactive |
| HTML, fallback | Untouched | `opacity: 0` |
| Image, canvas | Untouched | `opacity: 0` |
| Video | Untouched | `opacity: 0.0001`, as `add` does, to keep frames decoding |

- `hide` is fixed for the life of the capture. To change it, dispose and capture again.
- With `hide: false` and html-in-canvas, the element is still moved into a wrapper canvas. What the user sees is the canvas's drawing of the element, updated on every repaint.

### `texture`

- An `EffectTexture`. It works everywhere an `EffectTexture` does: `ctx.draw({ uniforms })`, `ctx.blit`.
- Stable: when the GL texture behind it is replaced (resize, re-capture, context restore), the handle follows.
- `width` / `height` are the physical px of the current capture. They change when the element resizes.
- Pixels are premultiplied alpha, the same as `ctx.src`.
- Sampling: clamp to edge, linear filter. No options in v1.
- HTML sources are clamped to `vfx.maxTextureSize`, as with `addHTML`. `rect` is not affected.
- `texture.update()` is the same as `capture.update()`, without the promise.
- `texture.dispose()` does nothing. Use `capture.dispose()`.

### `rect`

`rect` answers "where do I draw this texture so it matches the element?".

- `x`, `y`: the element's position in the viewport, measured by VFX at the start of every rendered frame.
  All effects in one frame see the same value, and it matches that frame's canvas position.
- `width`, `height`: the element's CSS size **when the current texture was captured**.
  After a resize, the texture is one frame behind the DOM. The size stays in step with the texture, so the texture is never stretched for a frame.
- For HTML sources the rect is the wrapper canvas's rect, which is the element's border box.
- The object is mutated in place. Copy the numbers to keep an old value.
- Outside the render loop (`autoplay: false`, or before the first frame), `x` / `y` hold the value from the last rendered frame, or from the capture.

No pure "rect at capture time" is exposed: a viewport rect goes stale as soon as the page scrolls, and scrolling does not trigger a re-capture.

### `update()`

- HTML, html-in-canvas: asks the browser to repaint and resolves once the new capture is in the texture, or after a short timeout (300 ms, same as `vfx.update`).
- HTML, fallback: takes a new DOM snapshot.
- Image: waits for `img.decode()` and uploads again. Call it after changing `img.src`.
- Video, canvas: resolves at once. They refresh every frame already.
- After `dispose()`: resolves at once.

### `dispose()`

- Stops capturing and frees the GL texture.
- HTML, html-in-canvas: unwraps the element and restores its styles, like `vfx.remove` after `addHTML`.
- Others: restores the element's `opacity` if `hide` changed it.
- `vfx.destroy()` disposes every capture of the instance.

## Passing a capture to effects

Two ways. Both already work with any `EffectTexture`.

1. Through the effect's own constructor, when the effect also needs `rect`:

    ```ts
    class Minimap implements Effect {
        constructor(private page: VFXCapture) {}
        render(ctx: EffectContext) {
            const { texture, rect } = this.page;
            ctx.draw({ frag, uniforms: { page: texture, pageSize: [rect.width, rect.height] } });
        }
    }
    ```

2. Through `uniforms`, to keep the effect reusable:

    ```ts
    vfx.add(target, { effect, uniforms: { page: page.texture } });
    new VFX({ postEffect: { effect, uniforms: { page: page.texture } } });
    ```

    The effect reads `ctx.uniforms.page` and passes it on to `ctx.draw`.

Type change for (2): `VFXUniformValue` gains `EffectTexture`. It already works at runtime on the effect path; only the type rejects it today.

- **Effect path only.** On the shader path (`shader: ...`, `VFXPass[]`, shader post effects) a texture uniform is ignored with a dev warning. See "Out of scope".
- Only `capture.texture` is accepted, not the `VFXCapture` itself. One way to do it, and no unwrapping step in core.
  This differs from the issue, which proposed accepting both.

## Rules

Answers to the open questions of the issue.

1. **Ownership.** No ref counting. The code that called `capture()` owns the capture.
   After `dispose()` the handle stays safe to use: it samples as transparent, `width` / `height` are `0`, and a dev warning is logged once per capture when it is sampled.
2. **One capture per element.** A second `capture()` of an element that has a live capture in the same VFX instance rejects. Share the handle instead.
   `capture()` also rejects for an element that `addHTML` or a transition has wrapped, and `addHTML` (so also a transition run) rejects for a captured element: all of them wrap the element.
   `vfx.add` on a captured `<img>` / `<video>` / `<canvas>` is allowed.
3. **Context.** A capture belongs to the VFX instance that made it. Passing its texture to a draw in another instance throws an error that names the problem. The effect chain reports it like any other `render()` error.
4. **Context loss.** Captures come back by themselves. The upload sources are kept, and the textures are re-uploaded after `webglcontextrestored`.
5. **Timing.** Effects never see a capture change in the middle of a frame.
   - html-in-canvas: the browser paints after the frame's `requestAnimationFrame` callbacks. A re-capture caused by a DOM change in frame N is read by effects in frame N+1.
   - Video, canvas: effects read the content as of their first use in the frame.
   - `await capture.update()` is the way to be sure the next frame has the new pixels.
6. **Naming.** `capture`. It matches the internal `captureLive` and reads well for the main case (HTML).

Other cases:

- **Reduced motion.** VFX renders nothing in this mode. `capture()` resolves to an inert handle: the element is not wrapped or hidden, `texture` is a transparent 1×1 texture, `rect` is measured once, `update()` and `dispose()` do nothing.
- **Element removed from the DOM.** The capture keeps its last pixels. Call `dispose()`.
- **`capture()` rejects** when the first capture fails (broken image, element without a box). The element is restored before the promise rejects.

## Out of scope

- Shader-path support (`uniform sampler2D page;` in `shader` / `VFXPass`). Element shaders still work in straight alpha; capture textures are premultiplied. It can follow once the shader path is premultiplied too ([#271](https://github.com/fand/vfx-js/issues/271)).
- `addHTML` built on `capture`, and `addHTML` returning the handle.
- Options: `maxSize`, `wrap`, `filter`, pause while off screen.
- A helper that maps `rect` to canvas UV or px.
- Components / composables in the React, Vue, Svelte and Astro bindings. They can call `vfx.capture` on the instance.
- Capturing an element nested in another wrapped element (`addHTML` inside `capture`, or the reverse).

## Decisions to confirm

These are the points where this spec picks one side. Please check them before the implementation starts.

1. `rect` is a hybrid: position per frame, size per capture. (The issue said "the rect at the moment of this capture".)
2. `uniforms` accepts `capture.texture` only, not the `VFXCapture` object.
3. A second `capture()` of the same element rejects, instead of returning the same handle.
4. ~~No shader-path support in v1.~~ Confirmed. The premultiplied shader path is a separate PR ([#271](https://github.com/fand/vfx-js/issues/271)).
5. Reduced motion returns an inert handle, instead of `null` or a rejection.
