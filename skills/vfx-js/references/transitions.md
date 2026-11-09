# Transitions (`addTransition`, `@vfx-js/transitions`)

> Experimental. The API may change in any 0.x release.

A transition animates an element from its old content to its new content with a shader.
Use it for tab panels, carousels, slideshows and page transitions.

A run:

1. VFX-JS snapshots the element.
2. Your callback changes the DOM.
3. VFX-JS captures the new content.
4. A shader mixes the two over `duration`.

The element is plain DOM at rest. VFX-JS wraps it in a canvas only during a run.

```bash
npm i @vfx-js/core @vfx-js/transitions
```

## Slides already in the DOM: `show`

```html
<nav>
    <button data-panel="#home">Home</button>
    <button data-panel="#about">About</button>
</nav>
<div id="panel" style="height: 400px">
    <section id="home">...</section>
    <section id="about" hidden>...</section>
</div>
```

```ts
import { VFX } from "@vfx-js/core";
import { Swipe } from "@vfx-js/transitions";

const vfx = new VFX();
const panel = document.querySelector<HTMLElement>("#panel")!;
const t = vfx.addTransition(panel, { transition: Swipe, duration: 0.6 });

for (const tab of document.querySelectorAll<HTMLElement>("[data-panel]")) {
    tab.addEventListener("click", () => t.show(tab.dataset.panel!));
}
```

- Slides are the container's direct children. `show` hides the others with `hidden`.
- `slide` is an element, an index, or a selector. A slide that is not a direct child throws a `TypeError`.
- `remove: true` removes the other slides instead of hiding them.
- Keep the buttons outside the container.

## Content built on the fly: `run`

```ts
await t.run(() => {
    panel.innerHTML = renderPage(next);
}, { transition: Glitch, params: { amount: 1.5 } });
```

`run(cb, opts)` works like `document.startViewTransition(cb)`: the DOM must be updated when `cb` resolves.
Both `show` and `run` resolve when the animation ends.
A new `run` during a run drops the old one, but its callback still runs.
If the browser already animated the navigation (a swipe back on a phone), `run` cuts. It reads `hasUAVisualTransition` from the Navigation API.

## Options

```ts
const t = vfx.addTransition(el, {
    transition: Crossfade, // a class or an instance (default Crossfade)
    params: {},            // constructor params, only with a class
    duration: 0.6,         // seconds; 0 cuts without animation
    reverse: false,        // play backwards, old and new swapped
    ease: "smoothstep",    // "smoothstep" | "linear" | (x) => t
    overflow: undefined,   // true (whole canvas) | CSS px on every side
    keepWrapped: false,    // keep the canvas wrapper between runs
    waitFor: "media",      // wait for images / videos / fonts (~300 ms max) | "none" | (el) => Promise
    autoReverse: false,    // on back, replay the spec that entered, reversed (needs the Navigation API)
    slideSpec: undefined,  // (slide) => RunOpts | undefined: how each slide enters with show()
});
```

`run` and `show` take the same fields (except `keepWrapped`, `waitFor`, `autoReverse`, `slideSpec`).

`autoReverse` stores the spec that entered each history entry (by `navigation.currentEntry.key`).
Back plays the left entry's spec with `reverse: true`; the forward button replays the entered entry's spec.
On back the stored spec wins, even over `setNextTransition()`. No Navigation API: it does nothing. `show()` ignores it.
Every `<VFXTransition>` takes it as a prop (`auto-reverse` in Vue templates).
`show` puts its opts over the slide's `slideSpec`, then over the container's.
A run's fields win over the container's. A run that sets its own `transition` drops the container's `params`.

Handle: `show(slide, opts)`, `run(cb, opts)`, `cancel()`, `destroy()`, `running`.

## Presets

```ts
import {
    Crossfade, Crosszoom, Datamosh, DistortFade, Glitch, GlitchSlide,
    JpegGlitch, LensDistortion, PixelScan, PixelStretch, Pixelsort,
    SlitScan, Swipe, Tile, Zoom, ZoomBlur,
} from "@vfx-js/transitions";
```

| Preset | Params | Notes |
| --- | --- | --- |
| `Crossfade` | | Plain mix. Default. |
| `Swipe` | `direction`: `"left"` (default) / `"right"` / `"up"` / `"down"` | Content moves with motion blur. |
| `Zoom` | | Old content grows out; new grows from the center. |
| `ZoomBlur` | | Radial blur with RGB split. |
| `Crosszoom` | | Crossfade through a zoom blur. |
| `Glitch` | `amount`, `speed` (default 1) | Jittery RGB-split blocks. |
| `GlitchSlide` | | Sliding stripes with RGB split. |
| `JpegGlitch` | `iterations`, `quality` | Hard cut through a real JPEG glitch. |
| `Datamosh` | `blockSize` | Hard cut through a datamosh that heals block by block. |
| `Pixelsort` | `direction` | Melts into sorted streaks and sorts back. |
| `LensDistortion` | `strength`, `dispersion`, `zoom` | Lens warp with rainbow split. |
| `SlitScan` | | A scan line smears the content into stripes. |
| `PixelScan` | `direction` (incl. `"center"`), `blackout` | A front of glowing pixel cells sweeps across. |
| `PixelStretch` | | Content stretches into streaks from the top. |
| `DistortFade` | | Noise warp that peaks halfway. |
| `Tile` | `direction`, `shape` (`"hex"` / `"square"`), `count`, `shadow` | Content splits into shrinking tiles. |

Pass a class with `params`, or an instance to change params during a run:

```ts
t.show("#home", { transition: Swipe, params: { direction: "right" } });

const glitch = new Glitch({ amount: 1 });
t.show("#about", { transition: glitch });
glitch.params = { amount: 3 }; // live
```

An instance runs in one container at a time. A class can serve many containers.

### gl-transitions

Any shader from https://gl-transitions.com works:

```ts
import { createGLTransition } from "@vfx-js/transitions";
import transitions from "gl-transitions"; // npm i gl-transitions

const Cube = createGLTransition(transitions.find((t) => t.name === "Cube")!);
t.run(cb, { transition: Cube, params: { persp: 0.5 } });
```

Their `t` is linear; each shader eases itself.
Shaders that need extra textures (`LumaWipe`, `DisplacementMap`) throw.

## Custom transition: `ShaderTransition`

Most transitions are one shader.

```ts
import { ShaderTransition } from "@vfx-js/core";

export class Wipe extends ShaderTransition<{ softness?: number }> {
    readonly name = "wipe";
    readonly frag = `
uniform float softness;
vec4 transition(vec2 uv, float t) {
  float m = smoothstep(t - softness, t + softness, uv.x);
  return mix(readTo(uv), readFrom(uv), m);
}
`;
    // ease = "linear";   // default "smoothstep"
    // overflow = true;   // draw outside the element

    // Called every frame. Read this.params here.
    uniforms() {
        return { softness: this.params.softness ?? 0.05 };
    }
}

t.run(cb, { transition: Wipe, params: { softness: 0.1 } });
```

`frag` defines only `vec4 transition(vec2 uv, float t)`. VFX-JS adds the header and `main`. Don't write `#version`, `main` or `outColor`.

The prelude gives:

- `readFrom(p)` — the old content. `readTo(p)` — the new content. They swap when `reverse` is true, so write only the forward animation.
- `inRange(p)` — whether `p` is inside 0..1. Reads outside 0..1 return transparent black.
- Reads are premultiplied alpha, and the return value must be too. So `mix` and averages of reads just work.
- Uniforms: `t` (0→1, eased), `reverse`, `resolution` (element size, physical px), `time`.
- `uv` is element space, (0, 0) bottom-left. With `overflow`, `uv` goes outside 0..1.
- A shader that shifts or wraps `uv` should return `vec4(0.0)` when `!inRange(uv)`, so a container `overflow` doesn't draw content outside the element.
- At `t = 0` show only the old content, at `t = 1` only the new.
- Uniforms from `uniforms()` are numbers, vectors and arrays. No textures.

A compile error logs the error with line numbers in your `frag`, then cuts to the new content.

## Custom transition with several passes

Implement `Transition` directly. It is an `Effect` (see [effects.md](effects.md)) with run info on the context.

```ts
import type { EffectContext, EffectRenderTarget, Transition, TransitionEffectContext } from "@vfx-js/core";

export class BlurFade implements Transition {
    name = "blur_fade";
    #tmp: EffectRenderTarget | null = null;

    init(ctx: EffectContext) {
        this.#tmp = ctx.createRenderTarget();
    }

    render(ctx: TransitionEffectContext) {
        if (ctx.holding || !this.#tmp) {
            ctx.blit(ctx.src); // pass through while the old content is held
            return;
        }
        const { t } = ctx.progress;
        ctx.draw({ frag: PASS_A, uniforms: { src: ctx.src, from: ctx.from, mixT: t }, target: this.#tmp });
        ctx.draw({ frag: PASS_B, uniforms: { src: this.#tmp }, target: ctx.target });
    }
}
```

- `ctx.src` is the new content (read with `uvSrc`). `ctx.from` is the old snapshot (read with `uvContent`).
- `ctx.progress.t` is eased, `ctx.progress.x` linear. Both 0..1 and ignore `reverse`; check `ctx.reverse` yourself.
- `start(run)` runs once per run, `end()` once when it ends or is cancelled.
- `ctx.cut()` ends the run and shows the new content.
- The element is unwrapped between runs, so `dispose()` then `init()` run again.

## React

```bash
npm i @vfx-js/core @vfx-js/react @vfx-js/transitions
```

Page transitions: put one `<VFXTransition>` around the router outlet.
Pick the import for your router:

| Router | Import | Usage |
| --- | --- | --- |
| Next.js App Router | `@vfx-js/react/next` | `<VFXTransition>{children}</VFXTransition>` in `app/layout.tsx` |
| React Router 7 | `@vfx-js/react/react-router` | `<VFXTransition transition={Crossfade} />` in place of `<Outlet />` |
| Other | `@vfx-js/react` | `<VFXTransition pageKey={pathname}>{page}</VFXTransition>` |

```tsx
// React Router
import { VFXTransition } from "@vfx-js/react/react-router";
import { Crossfade } from "@vfx-js/transitions";

export function Layout() {
    return (
        <>
            <nav>...</nav>
            <VFXTransition transition={Crossfade} duration={0.6} />
        </>
    );
}
```

- The router versions use the pathname as the key. A search-only change does not run.
- With `@vfx-js/react`, a new `pageKey` starts a run. Without `pageKey` it never transitions.
- The target fills the viewport (`height: 100dvh; overflow: hidden`). Pages scroll inside it. Use a CSS reset (`body { margin: 0 }`).
- `fullscreen={false}` drops the default size; size it with `className` / `style`, e.g. `height: calc(100dvh - 64px)` under a header.
- React Router: the old page keeps its own route while it animates out, but `useLocation()` inside it reads the new location.

### Next.js App Router

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

Import `VFXTransition` from `@vfx-js/react/next`. It uses `usePathname()` as the key. Import everything else from `@vfx-js/react`.

### Per page and per link

```tsx
// app/about/page.tsx (a Server Component is fine)
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

```tsx
"use client";
import Link from "next/link";
import { transition } from "@vfx-js/react";
import { Swipe } from "@vfx-js/transitions";

export function NextLink() {
    return <Link href="/next" onClick={transition({ transition: Swipe })}>Next</Link>;
}
```

- Which spec wins: a link's `transition(spec)` or `setNextTransition(spec)`, then the page's `<TransitionIn>`, then the `<VFXTransition>` props.
- `useTransitionIn(spec)` is the hook form of `<TransitionIn>`. Only the spec at mount counts.
- `setNextTransition(spec)` before `router.push()` / `navigate()` for navigation from code.
- Import `Crossfade` from `@vfx-js/transitions`, not `@vfx-js/core`, in Server Components.
- Write custom transition classes in a file that starts with `"use client"`.
- An instance cannot cross from a Server Component. Make it in a client component with `useTransitionInstance(Class, params)`.

### Your own container

```tsx
import { useVFXTransition } from "@vfx-js/react";

const { ref, run } = useVFXTransition({ transition: Swipe });

<div ref={ref} style={{ height: 300 }}>{tab}</div>

await run(() => setTab(next), { reverse: true });
```

## Vue: Nuxt and Vue Router

```bash
npm i @vfx-js/core @vfx-js/vue @vfx-js/transitions
```

```vue
<!-- app/app.vue (Nuxt) -->
<script setup lang="ts">
import { Crossfade, Swipe } from "@vfx-js/transitions";
import { vTransition } from "@vfx-js/vue";
import { VFXTransition } from "@vfx-js/vue/nuxt";
</script>

<template>
    <nav>
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/gallery" v-transition="{ transition: Swipe }">Gallery</NuxtLink>
    </nav>
    <VFXTransition :transition="Crossfade" :duration="0.8">
        <NuxtPage />
    </VFXTransition>
</template>
```

```vue
<!-- app/pages/about.vue -->
<script setup lang="ts">
import { Glitch } from "@vfx-js/transitions";
import { useTransitionIn } from "@vfx-js/vue";

useTransitionIn({ transition: Glitch });
</script>
```

- Without Nuxt, import `VFXTransition` from `@vfx-js/vue/router` and wrap `<RouterView />`. It reads the router from `app.use(router)`.
- Each path is one page. The first navigation does not run.
- Which spec wins: the link's `v-transition`, then the page's `useTransitionIn`, then the `<VFXTransition>` props. Back does not reverse unless `autoReverse` is set.
- `setNextTransition(spec)` before `navigateTo()` / `router.push()`.
- In templates use `v-transition`, not `@click="transition(spec)"`; Vue wraps the handler, so it never runs.
- Props are the `addTransition` options plus `fullscreen`. `:fullscreen="false"` lets you size the target with CSS.
- A page with an async `setup` under your own `<Suspense>` may be captured early. Use `waitFor`.

## Svelte: SvelteKit

```bash
npm i @vfx-js/core @vfx-js/svelte @vfx-js/transitions
```

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
    import { transition } from "@vfx-js/svelte";
    import { VFXTransition } from "@vfx-js/svelte/sveltekit";
    import { Crossfade, Swipe } from "@vfx-js/transitions";

    let { children } = $props();
</script>

<nav>
    <a href="/">Home</a>
    <a href="/gallery" {@attach transition({ transition: Swipe })}>Gallery</a>
</nav>
<VFXTransition transition={Crossfade} duration={0.8}>
    {@render children()}
</VFXTransition>
```

```svelte
<!-- src/routes/about/+page.svelte -->
<script lang="ts">
    import { transitionIn } from "@vfx-js/svelte";
    import { Glitch } from "@vfx-js/transitions";

    transitionIn({ transition: Glitch });
</script>
```

- Needs Svelte 5.29 or later (`{@attach}`).
- Which spec wins: the link's `transition(spec)`, then the page's `transitionIn`, then the `<VFXTransition>` props. Back does not reverse unless `autoReverse` is set.
- `setNextTransition(spec)` before `goto()`.
- `fullscreen={false}` lets you size the target with CSS.

## Astro: ClientRouter

```bash
npm i @vfx-js/core @vfx-js/astro @vfx-js/transitions
```

```astro
---
// src/layouts/Layout.astro
import { ClientRouter } from "astro:transitions";
import { VFXTransition } from "@vfx-js/astro";
---

<html lang="en" transition:animate="none">
    <head><ClientRouter /></head>
    <body>
        <nav>
            <a href="/">Home</a>
            <a href="/gallery" data-vfx-transition="swipe">Gallery</a>
        </nav>
        <VFXTransition transition="crossfade" duration={0.8}>
            <slot />
        </VFXTransition>
    </body>
</html>
```

```astro
---
// src/pages/about.astro
import { TransitionIn } from "@vfx-js/astro";
---

<TransitionIn transition="glitch" />
```

- Needs `<ClientRouter />`. Without it links reload the page and nothing animates.
- `transition:animate="none"` turns off the browser's view transition; the shader is the animation.
- Transitions are names: lowercase class names from `@vfx-js/transitions` (`crossfade`, `swipe`, `glitch`, `pixelsort`, ...). Register others with `registerVFX({ transitions: { name: ClassOrInstance } })` from `@vfx-js/astro/client`. `ease` is `"smoothstep"`, `"linear"`, or a name from `registerVFX({ eases })`.
- A link spec is a name or JSON: `data-vfx-transition='{"transition":"swipe","params":{"direction":"left"}}'`.
- Which spec wins: the link's `data-vfx-transition`, then the page's `<TransitionIn>`, then the `<VFXTransition>` props. Back does not reverse unless `autoReverse` is set.
- `fullscreen={false}` lets you size the target with CSS.
- `installTransition({ swapFunctions })` from `@vfx-js/astro/client` is what `<VFXTransition>` calls. You rarely need it.

## Other routers

Turbo, htmx and others have no binding.
Use core `run(cb)`: hold the navigation until `run` has taken the snapshot, then let `cb` wait for the new page.

```ts
router.beforeNavigate(() =>
    new Promise<void>((snapshotTaken) => {
        t.run(() => {
            snapshotTaken();                 // the router may now swap the DOM
            return waitForNewPageInDom();    // resolve when the new page is in
        }).catch(console.error);
    }),
);
```

## Rules and pitfalls

- Give the target a fixed size (explicit height, or the viewport). Content of a different size does not animate between sizes; the box jumps after the run.
- Width rules: the target must fill its parent's width or have an inline px width. Put `max-width` or centering on a wrapper, not on the target.
- A `display` rule on a slide beats `hidden`. Add `[hidden] { display: none !important }`.
- `<body>` cannot be the target. Use the router outlet (`<main>`, `#app`).
- VFX elements inside the target freeze during a run.
- Next.js `loading.tsx` shows its fallback at once, so the transition lands on the skeleton.
- Multi-page (cross-document) navigation is not supported.
- Vue, Svelte and Astro `<VFXTransition>` render plain divs on the server. No client-only wrapper is needed.
- Respect `prefers-reduced-motion`: pass `duration: 0` when it matches.
