# @vfx-js/vue

Shader page transitions and element effects for Vue, Vue Router and Nuxt, built on [@vfx-js/core](https://www.npmjs.com/package/@vfx-js/core).

```sh
npm i @vfx-js/core @vfx-js/vue @vfx-js/transitions
```

## Nuxt

Put `<VFXTransition>` from `@vfx-js/vue/nuxt` around `<NuxtPage />`.
Each path is one page.

```vue
<!-- app/app.vue -->
<script setup lang="ts">
import { Crossfade, Swipe } from "@vfx-js/transitions";
import { transition } from "@vfx-js/vue";
import { VFXTransition } from "@vfx-js/vue/nuxt";
</script>

<template>
    <nav>
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/gallery" @click="transition({ transition: Swipe })">
            Gallery
        </NuxtLink>
    </nav>
    <VFXTransition :transition="Crossfade" :duration="0.8">
        <NuxtPage />
    </VFXTransition>
</template>
```

A page picks how it enters with `useTransitionIn`:

```vue
<!-- app/pages/about.vue -->
<script setup lang="ts">
import { Glitch } from "@vfx-js/transitions";
import { useTransitionIn } from "@vfx-js/vue";

useTransitionIn({ transition: Glitch });
</script>
```

## Vue Router

Without Nuxt, put `<VFXTransition>` from `@vfx-js/vue/router` around
`<RouterView />`. Pages and links work the same as in Nuxt.

```vue
<!-- App.vue -->
<script setup lang="ts">
import { Crossfade } from "@vfx-js/transitions";
import { VFXTransition } from "@vfx-js/vue/router";
</script>

<template>
    <VFXTransition :transition="Crossfade">
        <RouterView />
    </VFXTransition>
</template>
```

- It reads the router from the app (`app.use(router)`), so it needs no
  import of `vue-router`. Without a router it warns and does nothing.
- The first navigation does not run a transition.
- The new page counts as in one tick after the navigation is confirmed.
  Lazy route components are loaded by then.
- A page with an async `setup` under your own `<Suspense>` may be
  captured before it resolves. Use `waitFor` on `<VFXTransition>` to
  wait for it.

## Which spec wins

1. The link's `transition(spec)`, for that click.
2. The new page's `useTransitionIn(spec)`.
3. The props of `<VFXTransition>`.

Back and forward add `reverse: true` to the spec that wins.

## Element effects

Add a shader to any element with `v-vfx`.
Images, videos, canvases and text all work.

```vue
<script setup lang="ts">
import { vVfx } from "@vfx-js/vue";
</script>

<template>
    <img v-vfx="{ shader: 'rgbShift' }" src="cat.png" />
    <h1 v-vfx="{ shader: 'glitch', overflow: 30 }">Hello</h1>
</template>
```

To use it in every component, register it once:

```ts
import { vVfx } from "@vfx-js/vue";

app.directive("vfx", vVfx);
```

- The value is `VFXProps` from `@vfx-js/core`. `null` or `undefined` means no effect.
- A new object with the same values does nothing.
  A new `effect` alone swaps the effect chain; any other change re-adds the element.
- Text and attribute changes inside the element update its texture.
  For changes it can't see, like an input's value, call `updateElement(el)`.
- Elements and `<VFXTransition>` share one WebGL canvas.

## `VFXCanvas`

Render any markup, form controls included, into a shader.

```vue
<script setup lang="ts">
import { VFXCanvas } from "@vfx-js/vue";
import { ref } from "vue";

const text = ref("");
const card = ref<InstanceType<typeof VFXCanvas> | null>(null);
// card.value?.el is the root element.
</script>

<template>
    <VFXCanvas ref="card" shader="rgbShift" class="card">
        <h2>Title</h2>
        <input v-model="text" />
    </VFXCanvas>
</template>
```

- Props are `VFXProps` (`shader`, `uniforms`, `effect`, ...).
  Other attributes go on the root element.
- Browsers with html-in-canvas (Chrome Canary, or Chrome with
  `chrome://flags/#canvas-draw-element`) render
  `<canvas layoutsubtree>` and capture its children as they paint.
  Typing in an input shows up in the texture.
- Other browsers render a `<div>` and capture it with dom-to-canvas.
- The server and the first render use the `<div>`. After mount, a
  supporting browser switches to the `<canvas>` once, so the children
  mount again and their local state resets at that point.
- `el` follows the switch: the `<div>` first, then the `<canvas>`.
- Style an inner element, not `VFXCanvas` itself. Padding on the canvas
  stretches the texture.
  See [html-in-canvas.md](../../docs/html-in-canvas.md) for sizing.

## API

### `<VFXTransition>` (`@vfx-js/vue/nuxt`, `@vfx-js/vue/router`)

Props: `transition`, `params`, `reverse`, `duration`, `overflow`, `ease`,
`waitFor`, `keepWrapped`, and `fullscreen`.

- The target fills the viewport height by default, and pages scroll
  inside it. Pass `:fullscreen="false"` to size it with your own CSS,
  e.g. under a header.
- `class`, `style` and other attributes go on the target.
- On the server it renders plain divs. No `<ClientOnly>` needed.
- Both take the same props. They differ only in how they learn that
  the new page is in.

### `transition(spec)`

Returns a click handler. Use it as `@click="transition(spec)"` on a link.
Modified clicks and links with another `target` are ignored.

### `setNextTransition(spec)`

Use this spec for the next navigation, e.g. before `navigateTo()` or
`router.push()`.

### `vVfx`

The directive. See [Element effects](#element-effects).

### `VFXCanvas`

A component. See [`VFXCanvas`](#vfxcanvas).

### `updateElement(el)`

Re-capture the texture of an element with `v-vfx`.

### `useTransitionIn(spec)`

Call it in a page's `setup`. Only the spec at setup counts.

## License

MIT
