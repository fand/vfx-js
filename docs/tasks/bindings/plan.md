# Bindings: `hold()` in core, Vue / Svelte / Astro packages

Context: [transition/open-issues.md](../transition/open-issues.md),
[transition/plan10.md](../transition/plan10.md), Getting Started tabs in
`packages/transition-demo/next/app/getting-started/frameworks.ts`.

## Why

The Nuxt, SvelteKit and Astro tabs wire core `run(cb)` to the router by
hand. All three write the same glue:

```ts
new Promise((snapshotTaken) => t.run(() => {
  snapshotTaken();
  return new Promise((done) => { finishSwap = done; });
}));
```

The cause is the same in each. The router changes the DOM, but `run(cb)`
expects to change it inside `cb`. So every glue:

- holds the navigation until the snapshot is taken,
- tells the run when the new DOM is in place,
- frees the held run when a navigation is dropped or aborted.

SvelteKit is the shortest because `nav.complete` is already a promise.
Nuxt and Astro only give events, so users build the promise themselves.
React `<VFXTransition>` does the same inside (`commitWaiters`).

What stays per framework:

- Back detection: `history.state.position` (Nuxt), `nav.delta`
  (SvelteKit), `ev.direction` (Astro).
- Astro's ClientRouter swaps `<body>`, which removes the canvas and the
  target. So Astro needs its own swap.

None of the three can set the spec from the page, like React's
`<TransitionIn>`.

## Core: `hold()` on the handle

```ts
interface TransitionHandle {
    show(slide: SlideRef, opts?: ShowOpts): Promise<void>;
    run(cb: () => void | Promise<void>, opts?: RunOpts | (() => RunOpts)): Promise<void>;
    /**
     * Snapshot the old content and hold it on screen.
     * Change the DOM yourself, then call `release`.
     * For routers that own the DOM update.
     */
    hold(opts?: { signal?: AbortSignal }): Promise<TransitionHold>;
    cancel(): void;
    destroy(): void;
    readonly running: boolean;
}

interface TransitionHold {
    /** The new content is in place. Animate to it. Resolves when the animation ends. */
    release(opts?: RunOpts | (() => RunOpts)): Promise<void>;
    /** Drop this hold and show the live content. */
    cancel(): void;
}
```

The three methods stack:

- `run(cb, opts)` is `hold()`, then `await cb()`, then `release(opts)`.
- `show(slide)` is `run` with a cb that switches slides.

Rules:

- A newer `hold`, `run` or `show` wins. The old hold's `release` and
  `cancel` do nothing and resolve at once. An old hold's `cancel` never
  stops a newer run. Only core can tell old from new, so this can't live
  outside the handle.
- An aborted `signal` is the same as `cancel()`.
- `release` works once. Later calls do nothing.
- `running` is true while held, as it is while `run` waits for `cb`.
- A hold that is never released waits forever, as `run` does when `cb`
  never resolves. A timeout, if any, comes to both at once.
- The spec is read at `release`, so it can depend on the new page.

Name: core already calls the snapshot-on-screen state "held"
(`ctx.holding`).

Not a separate `holdRun(t)` export. One handle, one place to read.

## Core: move the pending spec store

`setNextTransition()` and the store behind `transition(spec)` live in
`packages/react/src/transition/store.ts`. Move them to core so every
binding shares them. `release()` with no spec reads the pending spec.
`@vfx-js/react` re-exports.

## React

- `<VFXTransition>` uses `hold()` / `release()` in place of
  `commitWaiters` and the swap promise.
- No public API change.

## New packages

Separate packages, like `@vfx-js/react`:

- `@vfx-js/vue`, with `@vfx-js/vue/nuxt`
- `@vfx-js/svelte`, with `@vfx-js/svelte/sveltekit`
- `@vfx-js/astro`

Not one `@vfx-js/bindings` with subpaths. It would work (optional peers,
one subpath per framework), but:

- builds differ: React and Vue ship JS, Svelte ships `.svelte` under the
  `svelte` condition, Astro ships `.astro`;
- a Vue-only breaking change would bump React users;
- `@vfx-js/react` and `react-vfx` are already published.

Scope: transitions only at first. Element bindings like `VFXImg` come
later if asked for.

Router glue goes in the framework subpath (`/nuxt`, `/sveltekit`), as
`@vfx-js/react/next` does. A plain vue-router `/router` subpath is out
for now: with async components and Suspense, when the new page is in the
DOM is a separate question. Nuxt's `page:finish` answers it for Nuxt.

### API per framework

| | layout | page | link |
|---|---|---|---|
| Next | `<VFXTransition>` | `<TransitionIn>` | `onClick={transition(spec)}` |
| Nuxt | `<VFXTransition>` | `useTransitionIn(spec)` | `@click="transition(spec)"` |
| SvelteKit | `<VFXTransition>` | `transitionIn(spec)` | `{@attach transition(spec)}` |
| Astro | `<VFXTransition>` | `<TransitionIn>` | `data-vfx-transition` |

Spec priority in every binding: link spec, then page spec, then the
`<VFXTransition>` spec. Back adds `reverse`.

### `@vfx-js/vue/nuxt`

`<VFXTransition>` registers `router.beforeEach` (`hold()`) and the
`page:finish` hook (`release()`) in `onMounted`. On SSR it renders one
div, so no `<ClientOnly>`. Back from `history.state.position`.
`useTransitionIn` goes through provide/inject. `page:finish` comes
after the new page's `setup`, so the page spec is ready by `release`.

```vue
<!-- app.vue -->
<script setup lang="ts">
import { transition } from "@vfx-js/vue";
import { VFXTransition } from "@vfx-js/vue/nuxt";
import { crossfade, swipe } from "@vfx-js/transitions";
</script>

<template>
  <nav>
    <NuxtLink to="/">Home</NuxtLink>
    <NuxtLink to="/gallery" @click="transition({ transition: swipe })">Gallery</NuxtLink>
  </nav>
  <VFXTransition :transition="crossfade" :duration="0.8">
    <NuxtPage />
  </VFXTransition>
</template>
```

```vue
<!-- pages/about.vue -->
<script setup lang="ts">
import { useTransitionIn } from "@vfx-js/vue";
import { glitch } from "@vfx-js/transitions";
useTransitionIn({ transition: glitch });
</script>
```

### `@vfx-js/svelte/sveltekit`

`<VFXTransition>` uses `onNavigate`: `hold()`, then `release()` after
`nav.complete`; `cancel()` if it rejects. Back from `nav.delta`.
`transitionIn` goes through `getContext`.

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { transition } from "@vfx-js/svelte";
  import { VFXTransition } from "@vfx-js/svelte/sveltekit";
  import { crossfade, swipe } from "@vfx-js/transitions";
  let { children } = $props();
</script>

<nav>
  <a href="/">Home</a>
  <a href="/gallery" {@attach transition({ transition: swipe })}>Gallery</a>
</nav>
<VFXTransition transition={crossfade} duration={0.8}>
  {@render children()}
</VFXTransition>
```

```svelte
<!-- src/routes/about/+page.svelte -->
<script lang="ts">
  import { transitionIn } from "@vfx-js/svelte";
  import { glitch } from "@vfx-js/transitions";
  transitionIn({ transition: glitch });
</script>
```

### `@vfx-js/astro`

A `.astro` component. Its script imports `astro:transitions/client`
itself, so users never see `swapFunctions`.

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
<h1>About</h1>
```

Inside:

- `astro:before-preparation`: `hold({ signal: ev.signal })` after the
  loader.
- `astro:before-swap`: a custom swap that keeps Astro's whole-body swap.
  1. Detach the live canvas and target (the wrapper core puts around
     the target during a run).
  2. `swapFunctions.deselectScripts`, `swapRootAttributes`,
     `swapHeadElements`, `saveFocus`, then `swapBodyElement`.
  3. Put the live target where the new `<VFXTransition>` is, filled
     with the new page's content.
  4. Put the canvas back, restore focus, `release()`.

  This updates the nav and footer and keeps `transition:persist`. Both
  are open in the demo glue today.
- Spec from the clicked link's `data-vfx-transition`, then the new
  page's `<TransitionIn>` (a `<meta>` read from `ev.newDocument`), then
  the component prop. Back from `ev.direction`.

Specs are names. Defs hold functions (`create`, `ease`), and `.astro`
props never reach the client. Next gets around this with `"use client"`
in `@vfx-js/transitions`, which makes presets client references. Astro
has no such reference. Page scripts don't help either: module scripts
run once, so they don't rerun on a revisit through ClientRouter.

- Preset names resolve by default. Type the prop as the union of preset
  names.
- Custom defs: register from a client script.

  ```ts
  import { registerTransitions } from "@vfx-js/astro/client";
  import { createSwipe } from "@vfx-js/transitions";
  registerTransitions({ slowSwipe: createSwipe({ angle: 90 }) });
  ```

## Docs

- Getting Started: Nuxt, SvelteKit and Astro tabs use the bindings.
  Next, React, Void and Vanilla stay as they are.
- No "custom router" tab. Every listed framework has a binding.
- `hold()` goes in the API reference under `TransitionHandle`, with how
  `show`, `run` and `hold` relate: `show` for slides already in the DOM,
  `run` when you change the DOM in one function, `hold` when the DOM
  change spans two router hooks.
- The fixed-height note repeats in every tab. Move it above the tabs.

## Order

1. Core `hold()`, with `run` built on it. Tests in
   `transition/transition.test.ts` with the fake host.
2. Move the pending spec store to core. React re-exports.
3. React `<VFXTransition>` on `hold()`.
4. `@vfx-js/astro`. Port `packages/transition-demo/astro` to it.
5. `@vfx-js/vue/nuxt` and `@vfx-js/svelte/sveltekit`. Port those demos.
6. Getting Started tabs and API reference.

## Open questions

- Astro: does detaching and reattaching the canvas and target in one
  task keep the WebGL context and html-in-canvas state? Does core see
  it as a stall? Core may need to expose the wrapper element.
- Astro: `transition:persist` inside the target, with the body swap
  above. Not tried.
- Can `definePageMeta` hold a spec with imported defs? If yes, Nuxt
  could offer it next to `useTransitionIn`.
- Back detection with the Navigation API in core, to drop it from every
  binding. Transitions are html-in-canvas only, so the API is there.
  Not checked: does the `navigate` event fire before each router's hook?
- Peer ranges: Vue 3, Svelte 5 only, Astro version floor for
  `swapFunctions.swapBodyElement`.
