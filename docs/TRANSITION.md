# Transition API

> **Experimental.** The transition API may change in minor releases.

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

```html
<nav>
    <button data-panel="#home">Home</button>
    <button data-panel="#about">About</button>
    <button data-panel="#contact">Contact</button>
</nav>
<div id="panel">
    <section id="home">...</section>
    <section id="about" hidden>...</section>
    <section id="contact" hidden>...</section>
</div>
```

```ts
import { VFX } from "@vfx-js/core";
import { Swipe } from "@vfx-js/transitions";

const vfx = new VFX();
const panel = document.querySelector<HTMLElement>("#panel")!;
const tabs = document.querySelectorAll<HTMLElement>("[data-panel]");

const t = vfx.addTransition(panel, { transition: Swipe, duration: 0.6 });
for (const tab of tabs) {
    tab.addEventListener("click", () => t.show(tab.dataset.panel!));
}
```

The sections are the slides. `show` hides the others and shows the one
you pick, with a transition. Keep the buttons outside the container.

When the content is built on the fly, change the DOM in `run` instead.
`run` mirrors `document.startViewTransition(cb)`: when `cb` resolves, the
DOM must be updated. Both resolve when the animation ends.

### React

```tsx
import { TransitionIn, VFXTransition } from "@vfx-js/react";
import { Crossfade, Glitch } from "@vfx-js/transitions";

// Once, around the router outlet. Fills the viewport by default.
<VFXTransition pageKey={pathname} transition={Crossfade}>
    {page}
</VFXTransition>

// In a page: how this page enters.
<TransitionIn transition={Glitch} params={{ amount: 1.5 }} />
```

The container owns the outlet box and keeps the old page on screen until
the snapshot is taken. The page only names its transition. Next.js users
import `VFXTransition` from `@vfx-js/react/next`. Its `pageKey` defaults to the pathname.

A new `pageKey` starts a run. The old page stays on screen until the
transition has its snapshot. The incoming page can pick its own
transition with `<TransitionIn>`.

### Vue and Svelte

Nuxt and SvelteKit have their own `<VFXTransition>`:
[`@vfx-js/vue/nuxt`](../packages/vue/README.md) and
[`@vfx-js/svelte/sveltekit`](../packages/svelte/README.md).
Each path is one page. Pages pick their transition with
`useTransitionIn` (Vue) or `transitionIn` (Svelte).

## Core API

### Sizing

Give the target a fixed size: an explicit width and height, like a slide
stage, a tab panel with `height: 240px`, or a viewport-sized router
outlet (`<VFXTransition>` does this by default). The old and new content then share one box, and the transition
only mixes pixels.

When the content changes the box's size, VFX-JS locks the box at its old
size for the run and lets it jump to the new size afterwards. That keeps
the textures the same size, but the jump is visible. Fix the size on the
target instead of relying on this. The width rules of the
[html-in-canvas sizing policy](./html-in-canvas.md#sizing-policy) apply
too.

### `vfx.addTransition(element, opts?)`

Returns a `TransitionHandle` at once. It touches no DOM until the first run.

```ts
const t = vfx.addTransition(el, {
    transition: Crossfade,   // a class or an instance, default Crossfade
    params: {},              // constructor params, only with a class
    duration: 0.6,           // seconds
    reverse: false,
    ease: undefined,         // "smoothstep" | "linear" | (x) => t
    overflow: undefined,     // true (whole canvas) | px on every side
    keepWrapped: false,      // keep the element wrapped between runs
    waitFor: "media",        // "media" | "none" | (el) => Promise<void>
});
```

### `TransitionHandle`

```ts
interface TransitionHandle {
    show(slide: SlideRef, opts?: ShowOpts): Promise<void>;
    run(
        cb: () => void | Promise<void>,
        opts?: RunOpts | (() => RunOpts),
    ): Promise<void>;
    cancel(): void;   // end the current run and show the live content
    destroy(): void;  // cancel and stop tracking the element
    readonly running: boolean;
}

// A direct child of the container, its index, or a selector inside it.
type SlideRef = HTMLElement | number | string;

type ShowOpts = RunOpts & {
    remove?: boolean; // remove the other slides instead of hiding them
};

type RunOpts<T extends Transition | TransitionClass> = {
    transition?: T;            // a class, or an instance to use as is
    params?: ParamsOf<T>;      // constructor params, typed from the class
    reverse?: boolean;
    duration?: number;        // 0 cuts without animation
    ease?: TransitionEase;    // "smoothstep" | "linear" | (x: number) => number
    overflow?: true | number;
};
```

### `show(slide, opts?)`

Use `show` when every slide is already in the DOM: tabs, carousels,
steps. The slides are the container's direct children. One shows at a
time; the others carry the `hidden` attribute.

- `slide` is an element, an index into the children, or a selector.
- An element that is not in the DOM is appended to the container first.
- A missing target, or one that is not a direct child, throws a
  `TypeError` before any run starts.
- Showing the slide that is already the only one shown starts no run,
  unless a run is in flight.
- `remove: true` removes the other slides instead of hiding them.
- The other `ShowOpts` work as in `run`.

A `display` rule on a slide beats `hidden`. Add
`[hidden] { display: none !important }`, or use `remove: true`.

### `run(cb, opts?)`

The primitive for content built on the fly: routers, `innerHTML`,
templates. `show` is built on it. Change the DOM in `cb`.

A new `run()` during a run drops the old one. The old promise resolves,
and its callback still runs, so no DOM change is lost. If `cb` throws,
the run cancels and `run` rejects, even for a dropped run.

`opts` can be a function. It is called once, right after `cb` resolves,
so the spec can depend on the new content. If it throws, the run
cancels and `run` rejects, as with `cb`. With a function, the transition
is set up and `start` runs after `cb`, not before the snapshot.

### Spec resolution

Each field comes from the first level that sets it:

1. The `RunOpts` passed to `run`.
2. The container options from `addTransition`.
3. The transition object, for `ease` and `overflow` (then `"smoothstep"`
   and none).

`params` merge per key, run over container. A run that sets its own
`transition` drops the container's `params`, so they never reach a
different class. The class fills in its own defaults.

```ts
const t = vfx.addTransition(el, { transition: Wipe, params: { softness: 0.1 } });
t.run(cb, { params: { softness: 0.3 } }); // Wipe, softness 0.3
t.run(cb, { transition: Zoom });          // Zoom, no container params
```

### Class or instance

- A class: core calls `new Class(params)` once per container. A later run
  with the same class and shallow-equal params reuses that instance.
  Other params make a new one. One class can run in many containers at
  once, and it can cross from a React Server Component.
- An instance: core uses it as is. Change `instance.params` to change a
  run while it plays. An instance runs in one container at a time; a
  second container that tries it warns once and cuts.

To reuse a spec, keep it in a variable. TypeScript catches a typo in its
name.

```ts
export const back: RunOpts = { transition: Swipe, reverse: true };

t.run(cb, back);
```

A function `ease` gets progress clamped to 0..1 and returns `t`.
The shader and JS effects get the same eased `t`.

In React, `<VFXTransition>` first builds the `RunOpts` from a click or
the incoming page. See [Which spec wins](#which-spec-wins).

### `overflow`

By default a transition draws only inside the element. `overflow` gives
it room outside: `true` for the whole canvas, a number for CSS px on
every side. The options' value (picked run → container) wins over
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

## Custom transitions

A transition is an object that implements `Transition`. Write it as a
class. Most transitions are one shader, so start with `ShaderTransition`.

```ts
interface Transition extends TransitionEffect {
    readonly name?: string;
    ease?: TransitionEase;    // the t this transition expects; a spec's ease wins
    overflow?: true | number; // room outside the element; a spec's overflow wins
}
```

### `ShaderTransition`

```ts
import { ShaderTransition } from "@vfx-js/core";

class Wipe extends ShaderTransition<{ softness?: number }> {
    name = "wipe";
    frag = `
uniform float softness;
vec4 transition(vec2 uv, float t) {
  float m = smoothstep(t - softness, t + softness, uv.x);
  return mix(readTo(uv), readFrom(uv), m);
}
`;
    // ease?: TransitionEase,     // default "smoothstep"
    // overflow?: true | number,  // room outside the element

    // Every frame. Read this.params here.
    uniforms() {
        return { softness: this.params.softness ?? 0.05 };
    }
}

t.run(cb, { transition: Wipe, params: { softness: 0.1 } });
```

`frag` defines one function. `t` goes from 0 to 1 with a smoothstep ease.
Set `ease` to change the default, e.g. `"linear"` for a shader that eases
`t` itself. VFX-JS wraps `frag` with a prelude and a `main`.
Instances with the same `frag` share one program. A `frag` that depends on
params, e.g. a getter, compiles one program per distinct string.

The prelude gives you:

- `readFrom(p)` / `readTo(p)` — the content you leave and the content you
  enter. They swap when `reverse` is true, so write only the forward
  animation.
- `inRange(p)` — whether `p` is inside [0, 1].
- Reads outside [0, 1] return transparent black.
- With `overflow`, `uv` goes below 0 and above 1 outside the element.
- A shader that wraps or shifts `uv` should guard with `inRange(uv)`, so a
  container `overflow` doesn't draw content outside the element.
- Uniforms: `t`, `reverse`, `resolution` (element size in physical px),
  `time`.

A shader that fails to compile logs the error with line numbers in your
`frag`, then cuts straight to the new content.

### `TransitionEffect`

For more than one shader, implement `Transition` directly. A transition
is an [`Effect`](./EFFECT.md) with two more hooks, and its context carries
the run.

```ts
interface TransitionEffect extends Effect {
    start?(run: TransitionRun): void; // once per run, while the old content is held
    end?(): void;                     // once when the run ends, is dropped or is cancelled
    update?(ctx: TransitionEffectContext): void;
    render?(ctx: TransitionEffectContext): void;
}

type TransitionEffectContext = EffectContext & {
    from: EffectRenderTarget;  // snapshot of the old content
    progress: { t: number; x: number }; // eased and linear, 0..1
    holding: boolean;          // old content held, before the animation
    reverse: boolean;
    run: TransitionRun;        // { reverse, duration, overflow? }
    cut(): void;               // end the run now and show the new content
};
```

- `ctx.src` is the live new content and `ctx.from` the old one.
- Outside a run the transition is skipped and the chain passes its input
  through.
- `render` also runs while `holding`, with zero progress. Pass the input
  through then (`ctx.blit(ctx.src)`), unless you need those frames.
  `update` runs only while the animation plays.
- Keep state on the instance. Each container gets its own instance of a
  class; a run with another transition disposes it.
- The element is unwrapped between runs, so the transition gets
  `dispose()` and then `init()` again.
- `run.overflow` is the spec's overflow, else the transition's own.

A blur that peaks halfway, while crossfading:

```ts
import type {
    EffectContext,
    EffectRenderTarget,
    Transition,
    TransitionEffectContext,
} from "@vfx-js/core";

// Blurs along `dir`, mixing in the old content by `mixT`.
const FRAG_BLUR = `#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D from;
uniform vec2 dir;
uniform float mixT;
void main() {
    vec4 c = vec4(0.0);
    for (int i = -4; i <= 4; i++) {
        vec2 d = dir * float(i);
        c += mix(texture(from, uvContent + d), texture(src, uvSrc + d), mixT);
    }
    outColor = c / 9.0;
}
`;

export class BlurFade implements Transition {
    name = "blur_fade";
    #blurredX: EffectRenderTarget | null = null;

    init(ctx: EffectContext) {
        this.#blurredX = ctx.createRenderTarget();
    }

    render(ctx: TransitionEffectContext) {
        if (ctx.holding || !this.#blurredX) {
            ctx.blit(ctx.src);
            return;
        }
        const [w, h] = ctx.dims.elementPixel;
        const { t } = ctx.progress;
        const r = 4 * Math.sin(Math.PI * t);
        ctx.draw({
            frag: FRAG_BLUR,
            uniforms: { src: ctx.src, from: ctx.from, dir: [r / w, 0], mixT: t },
            target: this.#blurredX,
        });
        ctx.draw({
            frag: FRAG_BLUR,
            uniforms: { src: this.#blurredX, from: this.#blurredX, dir: [0, r / h], mixT: 1 },
            target: ctx.target,
        });
    }
}
```

It ignores `reverse` to stay short. `ShaderTransition` handles it for you.

A class can also extend an effect from `@vfx-js/effects` and implement
`Transition`. `Datamosh`, `Pixelsort` and `JpegGlitch` in
`@vfx-js/transitions` are built on effects.

## Presets

`@vfx-js/transitions` has the presets. It also re-exports `Crossfade`
from core. Each preset is a class; options go in `params`.

```ts
import {
    Crossfade, Crosszoom, Datamosh, DistortFade, Glitch, GlitchSlide,
    JpegGlitch, LensDistortion, PixelScan, PixelStretch, Pixelsort,
    SlitScan, Swipe, Tile, Zoom, ZoomBlur,
} from "@vfx-js/transitions";

t.run(cb, { transition: Swipe, params: { direction: "up" } });
```

| Preset | Params | Notes |
| ------ | ------ | ----- |
| `Crossfade` | | Plain mix. Default. |
| `Swipe` | `direction` | Content moves left (default), right, up or down. |
| `Zoom` | | Old content grows out of the box; new grows out of the center. `overflow: true`. |
| `ZoomBlur` | | Radial blur with RGB split. `overflow: true`. |
| `Crosszoom` | | Crossfade through a zoom blur. `overflow: true`. |
| `Glitch` | `amount`, `speed` | Jittery RGB-split blocks. Both default to 1. |
| `GlitchSlide` | | Sliding stripes with RGB split. |
| `JpegGlitch` | `iterations`, `quality` | Hard cut through a real JPEG glitch: encode, corrupt the bytes, decode. |
| `Datamosh` | `blockSize` | Hard cut through a datamosh that heals block by block. |
| `Pixelsort` | `direction` | Content melts into sorted streaks and sorts back out. |
| `LensDistortion` | `strength`, `dispersion`, `zoom` | Lens warp that peaks halfway, with a rainbow split. `dispersion: 0` turns the split off. |
| `SlitScan` | | A scan line smears the content into stripes, then draws the new one out of its own. |
| `PixelScan` | `direction`, `blackout` | A front of glowing pixel cells sweeps right (default), left, up, down or out from the `center`. |
| `PixelStretch` | | Content stretches into streaks from the top, fades to the new one, which settles from the top. |
| `DistortFade` | | Simplex noise warp that peaks halfway, while crossfading. |
| `Tile` | `direction`, `shape`, `count`, `shadow` | Content splits into tiles that shrink away. `direction`: `center` (default), `left`, `right`, `up`, `down`. `shape`: `hex` (default) or `square`. |

### gl-transitions

`createGLTransition` turns any shader from
[gl-transitions](https://gl-transitions.com/) into a transition class.

```bash
npm i gl-transitions
```

```ts
import { createGLTransition } from "@vfx-js/transitions";
import transitions from "gl-transitions";

const Cube = createGLTransition(transitions.find((t) => t.name === "Cube")!);
t.run(cb, { transition: Cube, params: { persp: 0.5 } });
```

- Look a shader up by its `name` (PascalCase, e.g. `"Cube"`). The
  package is one array, so `@vfx-js/transitions` does not import it.
- `params` override the shader's `defaultParams`. An unknown key logs a
  warning.
- `t` is linear for these classes (`ease: "linear"`); each shader eases
  itself. Setting `ease: "smoothstep"` on the spec eases it twice.
- Shaders that need extra textures (`LumaWipe`, `DisplacementMap`)
  throw.
- A param named like a core uniform (e.g. `reverse` in `BowTie`) is
  renamed to `glParam_<name>` in the shader. Pass it by its own name in
  `params`.
- Each shader keeps its author's license (MIT), listed in its entry.

## React API

No `<VFXProvider>` is needed. Components outside a Provider share one
implicit VFX instance; set its options with `useVFXConfig`. Inside a
Provider, transitions use the Provider's instance.

The React bindings use `run` only. React owns the children, so there is
no `show`.

### `<VFXTransition>`

```tsx
<VFXTransition
    pageKey={pathname}
    transition={Crossfade}
    duration={0.6}
>
    {children}
</VFXTransition>
```

Takes the `addTransition` options as props, plus `pageKey`, `className`,
`style` and `fullscreen`. It renders two `<div>`s around the children: an
outer one with `display: contents`, and an inner one that gets
`className` and `style` and is the transition target.

The target fills the viewport height by default (`height: 100dvh;
overflow: hidden`), so pages share one box and scroll inside it. `style`
merges on top. Pass `fullscreen={false}` to drop the default and size
the target with your own CSS, e.g. `calc(100dvh - <header>)` under a
header. The default assumes a CSS reset: the browser's
`body { margin: 8px }` makes a `100dvh` box overflow the page by 16px.

Pages scroll inside the box on purpose. Document scroll does not work
for page transitions: the target would be as tall as the page, and the
router resets the scroll position during the swap, so the old snapshot
would show the wrong part of the page.

- `pageKey` changes per page, e.g. the pathname. A new key starts a run.
  Use a string or a number.
- A new key mounts the children fresh, so page state does not carry over.
- Without a `pageKey`, it never transitions. It just renders the children.
- Children can be anything. While the key stays the same, the latest
  children render. After a change, the old page stays until the swap.

The swap runs in a React transition, so a page that suspends keeps the
old page on screen until it is ready.

Browser back runs like any other navigation: with the page spec, or the
props when the page sets none.

React Router reads the route from context, like Next does. Pass
`useOutlet()` as the children, so the old page keeps its own route:

```tsx
import { useLocation, useOutlet } from "react-router";

export function Layout() {
    const { pathname } = useLocation();
    const outlet = useOutlet();
    return (
        <VFXTransition pageKey={pathname}>{outlet}</VFXTransition>
    );
}
```

### `<TransitionIn>` and `useTransitionIn`

The incoming page says how it enters:

```tsx
import { TransitionIn } from "@vfx-js/react";
import { Glitch } from "@vfx-js/transitions";

export default function AboutPage() {
    return (
        <>
            <TransitionIn transition={Glitch} params={{ amount: 1.5 }} />
            <h1>About</h1>
        </>
    );
}
```

`useTransitionIn(spec)` is the hook form for client components.
`<TransitionIn>` renders nothing.

- Only the spec at mount counts. Later prop changes are ignored.
- Outside a `<VFXTransition>`, it does nothing and warns once.
- A Server Component can pass a preset class and plain `params` as props.
  `@vfx-js/transitions` is a `"use client"` module, so its classes cross as client references.
  `params` is checked against the class.
- Write your own classes in a file that starts with `"use client"`, and import them from there.
- An instance cannot cross from a Server Component. Make it in a client
  component, e.g. with `useTransitionInstance`.
- Import `Crossfade` from `@vfx-js/transitions`, not core.
  Core is not a `"use client"` module.
- The component form exists for Next.js, where `page.tsx` is a Server
  Component and cannot call hooks. Next has no way to export custom
  client settings from a page; its route segment config is a fixed list,
  and the TypeScript plugin rejects other exports.

### Which spec wins

Each run uses one spec as its `RunOpts`:

- A `transition(spec)` click or `setNextTransition(spec)`, if set.
- Else the incoming page's `<TransitionIn>` or `useTransitionIn`.

The `<VFXTransition>` props fill the fields that spec leaves out.
Core then resolves the spec as in [Spec resolution](#spec-resolution).

Why the page, not the link: a link only knows where it goes, while the
page knows how it wants to appear, and a page is reached from many
links, from code and from the back button. The click spec stays as a
per-link override.

Why `<VFXTransition>` cannot be left out: unlike `<VFXProvider>`, it is
not just configuration. It owns the outlet element and holds the old
page in the React tree until core has its snapshot. Without it, the
router would commit the new page first and there would be nothing to
snapshot. Rendering the whole page through a canvas at all times would
remove that need, but it is a different runtime mode and is not planned.

### `@vfx-js/react/next`

`VFXTransition` for the Next.js App Router:

```tsx
// app/layout.tsx
import { VFXTransition } from "@vfx-js/react/next";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <VFXTransition>{children}</VFXTransition>
            </body>
        </html>
    );
}
```

- It takes the same props without `pageKey`. It uses `usePathname()` as
  the key.
- It pins the router context per page, so the old page keeps rendering
  its own route while it animates out.
- The pin uses an internal Next import
  (`next/dist/shared/lib/app-router-context.shared-runtime`). A Next
  upgrade may break it.
- `next` is an optional peer dependency. Import everything else from
  `@vfx-js/react`.

### `transition(spec)` on a Link

```tsx
"use client";
import { transition } from "@vfx-js/react";

<Link href="/next" onClick={transition({ transition: Glitch })}>Next</Link>
```

Returns an `onClick` that stores the spec for the next run. It wins over
the page's `<TransitionIn>`. It does not intercept navigation. It ignores modified clicks, non-left buttons,
a `target` other than `_self`, and clicks with `defaultPrevented`. The spec expires
after about 10 s.

A Server Component cannot pass `onClick` to `Link`. Wrap the link in a
small client component that passes `onClick={transition(spec)}`.

### `useVFXTransition`

For containers you render yourself:

```tsx
const { ref, run } = useVFXTransition({ transition: Swipe });

<div ref={ref}>{tab}</div>

await run(() => setTab(next), { reverse: true });
```

`run` wraps `cb` in `startTransition` and starts the animation after
React commits. If `cb` updates no state, it resolves on the next frame.

### `setNextTransition`

For navigation from code:

```ts
setNextTransition({ transition: Zoom });
router.push("/next");
```

### `useTransitionInstance`

Makes one instance of a class and keeps it while the class and params
stay equal. Params compare shallowly, so an inline object is fine.

```tsx
"use client";
import { useTransitionInstance, VFXTransition } from "@vfx-js/react";
import { Glitch } from "@vfx-js/transitions";

const fx = useTransitionInstance(Glitch, { speed: 2 });

<VFXTransition pageKey={pathname} transition={fx}>{children}</VFXTransition>
```

- New params make a new instance. It applies from the next run.
- To change a run while it plays, set `fx.params`, e.g. from a slider.

## Limits

- Nested VFX elements inside the container freeze during a run,
  including ones the new page mounts. They show their plain content, not
  their effect.
- Next.js `loading.tsx` shows its fallback as soon as the path changes,
  so the transition lands on the skeleton. Use `useVFXTransition` with
  your own ready signal instead.
- `<VFXTransition>` does not support Astro ClientRouter, Turbo, htmx or
  multi-page (cross-document) navigation. You can wire core `run(cb)` to
  them by hand.
- `<body>` cannot be the target, since a canvas cannot wrap it. Target the
  router outlet (`#app`, `<main>`).
- There is one pending click spec per page, shared by all
  `<VFXTransition>`s. Page specs are per container, through context.
- `<TransitionIn>` outside a `<VFXTransition>` does nothing. A spec
  changed after mount is ignored; it is read once when the page mounts.
- Content of a different size is not animated between sizes. The box is
  locked at its old size for the run and jumps afterwards. See
  [Sizing](#sizing).

## See also

- [EFFECT.md](./EFFECT.md) — the Effect API that transitions extend.
- [html-in-canvas.md](./html-in-canvas.md) — how the capture works.
