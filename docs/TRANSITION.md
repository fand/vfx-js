# Transition API

`vfx.addTransition` animates an element from its old content to its new
content with a shader. Use it for tab panels, carousels, or page
transitions in a single-page app.

A run works like this:

1. VFX-JS snapshots the element's current content.
2. Your callback changes the DOM.
3. VFX-JS captures the new content.
4. A transition shader mixes the snapshot and the new capture over `duration`.

The element is plain DOM at rest. VFX-JS wraps it only while a run is in
flight. With html-in-canvas the capture uses `drawElementImage`;
without it, VFX-JS falls back to dom-to-canvas, which is slower.

## Examples

### Core

```ts
import { VFX } from "@vfx-js/core";
import { swipe } from "@vfx-js/effects/transitions";

const vfx = new VFX();
const panel = document.querySelector("#panel")!;
const t = vfx.addTransition(panel, { transition: swipe, duration: 0.6 });

button.addEventListener("click", () => {
    t.run(() => {
        panel.innerHTML = renderNextTab();
    });
});
```

`run` mirrors `document.startViewTransition(cb)`: when `cb` resolves, the
DOM must be updated. `run` resolves when the animation ends.

### React

```tsx
import { VFXProvider, VFXTransition } from "@vfx-js/react";
import { crossfade, glitch } from "@vfx-js/effects/transitions";

<VFXProvider>
    <VFXTransition transition={crossfade} types={{ back: { transition: glitch, reverse: true } }}>
        <Page key={pathname} />
    </VFXTransition>
</VFXProvider>
```

A new `key` on the child starts a run. The old page stays on screen until
the transition has its snapshot.

## Core API

### Sizing

Give the target a fixed size: an explicit width and height, like a slide
stage, a tab panel with `height: 240px`, or a viewport-sized router
outlet. The old and new content then share one box, and the transition
only mixes pixels.

When the content changes the box's size, VFX-JS locks the box at its old
size for the run and lets it jump to the new size afterwards. That keeps
the textures the same size, but the jump is visible. Fix the size on the
target instead of relying on this. The width rules of the
[html-in-canvas sizing policy](./html-in-canvas.md#sizing-policy) apply
too.

### `vfx.addTransition(element, opts?)`

Returns a `Transition` at once. It touches no DOM until the first run.

```ts
const t = vfx.addTransition(el, {
    transition: crossfade,   // TransitionDef, default crossfade
    uniforms: {},            // uniforms for `transition`
    duration: 0.6,           // seconds
    reverse: false,
    overflow: undefined,     // true (whole canvas) | px on every side
    types: {                 // specs picked by run(cb, { type })
        back: { transition: swipe, reverse: true },
    },
    keepWrapped: false,      // keep the element wrapped between runs
    waitFor: "media",        // "media" | "none" | (el) => Promise<void>
});
```

### `Transition`

```ts
interface Transition {
    run(cb: () => void | Promise<void>, opts?: RunOpts): Promise<void>;
    cancel(): void;   // end the current run and show the live content
    destroy(): void;  // cancel and stop tracking the element
    readonly running: boolean;
}

type RunOpts = {
    type?: string;            // key into `types`
    transition?: TransitionDef;
    uniforms?: TransitionUniforms; // numbers and vectors, no textures
    reverse?: boolean;
    duration?: number;        // 0 cuts without animation
    overflow?: true | number;
};
```

A new `run()` during a run drops the old one. The old promise resolves
(it never rejects), and its callback still runs, so no DOM change is
lost. If `cb` throws, the run cancels and `run` rejects.

### Spec resolution

Each run picks its spec in this order:

1. The `RunOpts` passed to `run`.
2. `types[type]`, when `type` is set.
3. The container options from `addTransition`.

`transition` and `uniforms` travel together. They come from the first
level that sets `transition`, so uniforms never reach a different
shader. `reverse` and `duration` are picked per field.

### `overflow`

By default a transition draws only inside the element. `overflow` gives
it room outside: `true` for the whole canvas, a number for CSS px on
every side. The options' value (picked run → type → container) wins over
the transition's own. A target that fills the canvas, like a full-screen
outlet, never draws outside itself.

### `waitFor`

Runs after `cb` and before the new capture.

- `"media"` (default) waits for pending `<img>` loads, `<video>`
  `loadeddata` and `document.fonts.ready`, up to about 300 ms. Lazy
  images off screen and `preload="none"` videos are not waited for. It
  does not watch CSS `background-image`.
- `"none"` captures right away.
- A function gets the element and returns a promise.

### `keepWrapped`

By default the element is unwrapped after each run. Set
`keepWrapped: true` to keep it wrapped, which saves the wrap cost on
frequent runs.

## Writing a `TransitionDef`

```ts
type TransitionDef = {
    name: string;
    frag: string;                 // defines vec4 transition(vec2 uv, float t)
    overflow?: true | number;     // room to draw outside the element
    effects?(): Promise<Effect[]>;
    prepare?(run: TransitionRun, fx: Effect[]): void;
    onFrame?(t: number, x: number, dt: number, fx: Effect[]): void;
    onEnd?(fx: Effect[]): void;
};
```

### GLSL

`frag` defines one function. `t` goes from 0 to 1 with a smoothstep ease.
VFX-JS wraps it with a prelude and a `main`.

```ts
const wipe: TransitionDef = {
    name: "wipe",
    frag: `
uniform float softness;
vec4 transition(vec2 uv, float t) {
  float m = smoothstep(t - softness, t + softness, uv.x);
  return mix(readTo(uv), readFrom(uv), m);
}
`,
};

t.run(cb, { transition: wipe, uniforms: { softness: 0.05 } });
```

The prelude gives you:

- `readFrom(p)` / `readTo(p)` — the content you leave and the content you
  enter. They swap when `reverse` is true, so write only the forward
  animation.
- `inRange(p)` — whether `p` is inside [0, 1].
- Reads outside [0, 1] return transparent black.
- With `overflow`, `uv` goes below 0 and above 1 outside the element.
- Uniforms: `t`, `reverse`, `resolution` (element size in physical px),
  `time`.

A shader that fails to compile logs the error with line numbers in your
`frag`, then cuts straight to the new content.

### Driver hooks

Some transitions need extra effects, like a datamosh or a pixel sort.

- `effects` creates them when a run first uses the def. Runs that keep
  using the same def reuse them; a run with another def disposes them.
  They sit after the transition in the chain and must pass through
  (disabled) until `prepare`.
- `prepare` runs while the old content is held, before `cb`.
- `onFrame` runs every frame: `t` is eased, `x` is linear, `dt` is seconds.
- `onEnd` runs once when the run ends, is dropped or is cancelled. It must
  leave the effects passing through.

The element is unwrapped between runs, so these effects get `dispose()`
and then `init()` again. Keep per-run state keyed by the effect object,
not in module variables, since two containers may share one def.

## Presets

`@vfx-js/effects/transitions` has the presets. It also re-exports
`crossfade` from core.

```ts
import {
    crossfade, crosszoom, datamosh, glitch, glitchSlide,
    pixelsort, swipe, zoom, zoomBlur,
    createDatamosh, createPixelsort, createSwipe,
} from "@vfx-js/effects/transitions";
```

| Preset | Notes |
| ------ | ----- |
| `crossfade` | Plain mix. Default. |
| `swipe` / `createSwipe({ direction })` | Content moves left (default), right, up or down. |
| `zoom` | Old content grows out of the box; new grows out of the center. `overflow: true`. |
| `zoomBlur` | Radial blur with RGB split. `overflow: true`. |
| `crosszoom` | Crossfade through a zoom blur. `overflow: true`. |
| `glitch` | Jittery RGB-split blocks. |
| `glitchSlide` | Sliding stripes with RGB split. |
| `datamosh` / `createDatamosh({ blockSize })` | Hard cut through a datamosh that heals block by block. |
| `pixelsort` / `createPixelsort({ direction })` | Content melts into sorted streaks and sorts back out. |

## React API

### `<VFXTransition>`

```tsx
<VFXTransition
    transition={crossfade}
    duration={0.6}
    types={{ back: { transition: swipe, reverse: true } }}
    className="outlet"
>
    <Page key={pathname} />
</VFXTransition>
```

Takes the `addTransition` options as props, plus `className` and
`style`. It renders a `<div>` around one child. The child needs a `key`
that changes per page; a child without a key never transitions.

Each run uses the spec set by a click or by `setNextTransition`, else
the props.

Back navigation is detected with the Navigation API when present, else
with `popstate`. It sets `type: "back"`, so `types.back` applies.

### `transition(spec)` on a Link

```tsx
"use client";
import { transition } from "@vfx-js/react";

<Link href="/next" onClick={transition({ transition: glitch })}>Next</Link>
```

Returns an `onClick` that stores the spec for the next run. It does not
intercept navigation. It ignores modified clicks, non-left buttons,
`target="_blank"` and clicks with `defaultPrevented`. The spec expires
after about 2 s.

A Server Component cannot pass `onClick` to `Link`. Wrap the link in a
small client component that passes `onClick={transition(spec)}`.

### `useVFXTransition`

For containers you render yourself:

```tsx
const { ref, run } = useVFXTransition({ transition: swipe });

<div ref={ref}>{tab}</div>

await run(() => setTab(next), { type: "forward" });
```

`run` wraps `cb` in `startTransition` and starts the animation after
React commits. If `cb` updates no state, it resolves on the next frame.

### `setNextTransition`

For navigation from code:

```ts
setNextTransition({ transition: zoom });
router.push("/next");
```

## Limits

- Nested VFX elements inside the container freeze during a run. They show
  their plain content, not their effect.
- Next.js `loading.tsx` shows its fallback as soon as the path changes,
  so the transition lands on the skeleton. Use `useVFXTransition` with
  your own ready signal instead.
- `<VFXTransition>` does not support Astro ClientRouter, Turbo, htmx or
  multi-page (cross-document) navigation. You can wire core `run(cb)` to
  them by hand.
- `<body>` cannot be the target, since a canvas cannot wrap it. Target the
  router outlet (`#app`, `<main>`).
- There is one pending click spec per page, shared by all
  `<VFXTransition>`s.
- Content of a different size is not animated between sizes. The box is
  locked at its old size for the run and jumps afterwards. See
  [Sizing](#sizing).

## See also

- [EFFECT.md](./EFFECT.md) — the Effect API used by driver effects.
- [html-in-canvas.md](./html-in-canvas.md) — how the capture works.
