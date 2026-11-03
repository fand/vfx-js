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

### `vfx.addTransition(element, opts?)`

Returns a `Transition` at once. It touches no DOM until the first run.

```ts
const t = vfx.addTransition(el, {
    transition: crossfade,   // TransitionDef, default crossfade
    uniforms: {},            // uniforms for `transition`
    duration: 0.6,           // seconds
    reverse: false,
    types: {                 // specs picked by run(cb, { type })
        back: { transition: swipe, reverse: true },
    },
    effects: [],             // persistent effects after the transition
    keepWrapped: false,      // forced true when effects.length > 0
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
    uniforms?: Record<string, number | [number, number]>;
    reverse?: boolean;
    duration?: number;        // 0 cuts without animation
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

### `waitFor`

Runs after `cb` and before the new capture.

- `"media"` (default) waits for pending `<img>` loads, `<video>`
  `loadeddata` and `document.fonts.ready`, up to about 1 s. It does not
  watch CSS `background-image`.
- `"none"` captures right away.
- A function gets the element and returns a promise.

### `keepWrapped`

By default the element is unwrapped after each run. Set
`keepWrapped: true` to keep it wrapped, which saves the wrap cost on
frequent runs. It is forced on when you pass `effects`, since those
effects must render all the time.

## Writing a `TransitionDef`

```ts
type TransitionDef = {
    name: string;
    frag: string;                 // defines vec4 transition(vec2 uv, float t)
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
- `readOld(p)` / `readNew(p)` — the snapshot and the live capture, never
  swapped.
- `inRange(p)` — whether `p` is inside [0, 1].
- Reads outside [0, 1] return transparent black.
- Uniforms: `t`, `reverse`, `resolution` (element size in physical px),
  `time`.

A shader that fails to compile logs the error with line numbers in your
`frag`, then cuts straight to the new content. `buildFrag`, `PRELUDE` and
`BODY_OFFSET` are exported from `@vfx-js/core` if you need the full source.

### Driver hooks

Some transitions need extra effects, like a datamosh or a pixel sort.

- `effects` creates them once per `Transition`. They sit after the
  transition in the chain and must pass through (disabled) until
  `prepare`.
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
| `zoom` | Old content shrinks into the center; new grows out of it. |
| `zoomBlur` | Radial blur with RGB split. |
| `crosszoom` | Crossfade through a zoom blur. |
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

Each run uses, in order:

1. The spec set by a click or by `setNextTransition`.
2. When going back without a transition: the leaving page's
   `useVFXTransitionSpec`, played reversed.
3. The props.

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

### `<VFXLink>`

A Server Component cannot pass `onClick` to `Link`. Use `VFXLink`, a
client component:

```tsx
import Link from "next/link";
import { VFXLink } from "@vfx-js/react";

<VFXLink as={Link} href="/next" transition={{ transition: glitch }}>Next</VFXLink>
```

`as` defaults to `"a"`. Your own `onClick` runs first.

### `useVFXTransition`

For containers you render yourself:

```tsx
const { ref, run } = useVFXTransition({ transition: swipe });

<div ref={ref}>{tab}</div>

await run(() => setTab(next), { type: "forward" });
```

`run` wraps `cb` in `startTransition` and starts the animation after
React commits. If `cb` updates no state, it resolves on the next frame.

### `useVFXTransitionSpec`

A page declares its own transition while mounted:

```tsx
function About() {
    useVFXTransitionSpec({ transition: glitch });
    return <main>…</main>;
}
```

### `setNextTransition`

For navigation from code:

```ts
setNextTransition({ transition: zoom });
router.push("/next");
```

## Limits

- Nested VFX elements inside the container freeze during a run. They show
  their plain content, not their effect.
- The entering page's `useVFXTransitionSpec` is not used yet. It declares
  only after it mounts, which is too late for the run.
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
- When old and new content differ in height, the snapshot is stretched
  over the new size.
- Transitions draw only inside the element.

## See also

- [EFFECT.md](./EFFECT.md) — the Effect API used by driver effects.
- [html-in-canvas.md](./html-in-canvas.md) — how the capture works.
