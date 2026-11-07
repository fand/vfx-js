# `VFXCanvas` for Vue and Svelte

Port `packages/react/src/canvas.tsx` to `@vfx-js/vue` and
`@vfx-js/svelte`. On PR #226.

## API

```vue
<script setup lang="ts">
import { VFXCanvas } from "@vfx-js/vue";
</script>

<template>
    <VFXCanvas shader="rgbShift" class="card">
        <h2>Title</h2>
        <input v-model="text" />
    </VFXCanvas>
</template>
```

```svelte
<script lang="ts">
    import { VFXCanvas } from "@vfx-js/svelte";
</script>

<VFXCanvas shader="rgbShift" class="card">
    <h2>Title</h2>
    <input bind:value={text} />
</VFXCanvas>
```

- Props: `VFXProps` (`shader`, `uniforms`, `effect`, ...). Other
  attributes (`class`, `style`, ...) go on the root element.
- html-in-canvas supported: renders
  `<canvas layoutsubtree content="drawable"><div drawable>children</div></canvas>`,
  as React does.
- Not supported: renders `<div>children</div>` and uses dom-to-canvas.

## Shared part: extend `element.ts`

`VFXCanvas` is `bindElement` plus capture. Add an option instead of a
second controller:

```ts
bindElement(el, { capture: true })
```

With `capture` (only for the `<canvas>` path):

- First add: `setupCapture(el, { onCapture, maxSize: vfx.maxTextureSize })`,
  then `vfx.add(el, props, initialCapture)`.
  `onCapture` keeps the latest capture and calls
  `vfx.updateHICTexture(el, capture)`.
- Re-add in `applyDelta` (a non-effect key changed): pass the latest
  capture, so `vfx.add` stays on the html-in-canvas path.
- Destroy: `teardownCapture(el)` before `remove`. Destroy while
  `setupCapture` is still pending: tear down after it, never add.
- No `MutationObserver`: the capture follows DOM changes itself.

Without `capture` (the `<div>` fallback): the existing path. The
observer already watches `childList`, as React's fallback does.

Same change in both packages' `element.ts`.

## SSR and hydration

`supportsHtmlInCanvas()` needs `document`, so the server can't know.
React calls it during render, which can mismatch on hydration.

Vue and Svelte:

- Server and first client render: the `<div>` fallback.
- After mount, if supported: switch to the `<canvas>`. Children mount
  again once, so their local state resets at that point. Say so in the
  READMEs.
- Client-only apps see the same one-time switch. Simpler than two
  paths, and the switch happens before the first effect is added.

Open question: is the one remount OK? The other choice is to render
nothing on the server, and the right element on the client only.

## Vue

- `src/canvas.ts`: `VFXCanvas` with `defineComponent` and `h()`.
  - `inheritAttrs: false`; attrs on the root.
  - Props: the `VFX_PROP_KEYS`, with `default: undefined` for
    booleans so Vue does not cast absent ones to `false`.
  - `onMounted`: read `supportsHtmlInCanvas()`, set a `ref`; when the
    element is in, `bindElement(el, { capture })`.
  - Props change: `controller.update(props)` from a `watch` on the
    VFX props (deep: false; the key compare stops needless re-adds).
  - `onBeforeUnmount`: `destroy()`.
- Export `VFXCanvas` from `.`.

## Svelte

- `src/lib/VFXCanvas.svelte`.
  - `let { children, shader, ..., ...attrs } = $props()`.
  - `supported = $state(false)`; set in `onMount`.
  - `{#if supported}` canvas with `layoutsubtree`, `content="drawable"`
    and a `drawable` child; `{:else}` div.
  - Bind with the existing `vfx(() => props)` attachment? No: the
    attachment can't pass `capture`. Use a small attachment inside the
    component that calls `bindElement(el, { capture })` and updates in
    `$effect`.
- Export `VFXCanvas` from `.`.

## Tests

Mock `@vfx-js/core`: `VFX`, `supportsHtmlInCanvas`, `setupCapture`
(resolves a fake capture, keeps `onCapture`), `teardownCapture`.

Each package:

- Supported:
  - renders the canvas with `layoutsubtree`, `content="drawable"` and a
    `drawable` child holding the children;
  - `setupCapture`, then `add(canvas, props, capture)`;
  - `onCapture` calls `updateHICTexture`;
  - another key changes: `remove`, then `add` with the latest capture;
  - only `effect` changes: `updateEffects`;
  - unmount: `teardownCapture`, then `remove`;
  - unmount while `setupCapture` is pending: `teardownCapture`, no `add`.
- Not supported: renders the div; `add` without a capture; a text change
  calls `update`.
- SSR (`vue/server-renderer`, `svelte/server`): the div; no core calls.
- Attrs land on the root element.

## Storybook

"Effect/Vue › Canvas" and "Effect/Svelte › Canvas", mirroring
`EffectReactCanvas.stories.tsx` (CRT Bloom).

## Browser check

html-in-canvas needs Chrome with `chrome://flags/#canvas-draw-element`
or Canary.

- Try Playwright Chromium with
  `--enable-blink-features=CanvasDrawElement`. If
  `supportsHtmlInCanvas()` is still false, stop and ask the owner to
  check the stories in Chrome Canary.
- Check: effect visible, typing in an `<input>` inside updates the
  texture, one VFX canvas, no errors. Fallback path in plain Chromium.

## Docs

- READMEs: a `VFXCanvas` section (supported browsers, the one-time
  remount).
- Changesets: extend the element-effects ones.
- `docs/html-in-canvas.md`: mention the Vue and Svelte components next
  to React.
- `progress.md`: a section for this work.

## Checks

- lint, test, build in packages/vue and packages/svelte.
- `build-storybook`.
