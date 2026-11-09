# @vfx-js/svelte

Shader page transitions and element effects for Svelte 5 and SvelteKit, built on [@vfx-js/core](https://www.npmjs.com/package/@vfx-js/core).

```sh
npm i @vfx-js/core @vfx-js/svelte @vfx-js/transitions
```

Needs Svelte 5.29 or later (for `{@attach}`).

## SvelteKit

Put `<VFXTransition>` from `@vfx-js/svelte/sveltekit` around the
layout's children. Each path is one page.

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

A page picks how it enters with `transitionIn`:

```svelte
<!-- src/routes/about/+page.svelte -->
<script lang="ts">
    import { transitionIn } from "@vfx-js/svelte";
    import { Glitch } from "@vfx-js/transitions";

    transitionIn({ transition: Glitch });
</script>
```

### Which spec wins

1. The link's `transition(spec)`, for that click.
2. The new page's `transitionIn(spec)`.
3. The props of `<VFXTransition>`.

Back and forward use the same spec. Nothing is reversed for you.

## Element effects

Add a shader to any element with the `vfx` attachment.
Images, videos, canvases and text all work.

```svelte
<script lang="ts">
    import { vfx } from "@vfx-js/svelte";
    let shader = $state("rgbShift");
</script>

<img {@attach vfx({ shader: "rgbShift" })} src="cat.png" alt="" />
<h1 {@attach vfx(() => ({ shader }))}>Hello</h1>
```

- The value is `VFXProps` from `@vfx-js/core`. `null` or `undefined` means no effect.
- Pass a plain object, or a getter that returns one.
  - A plain object that reads state makes Svelte re-run the attachment,
    so any change removes and re-adds the element.
  - A getter keeps the attachment and applies only the diff.
    A new object with the same values does nothing, and a new `effect`
    alone swaps the effect chain. Use it for props that change.
- Text and attribute changes inside the element update its texture.
  For changes it can't see, like an input's value, call `updateElement(el)`.
- Elements and `<VFXTransition>` share one WebGL canvas.

## `VFXCanvas`

Render any markup, form controls included, into a shader.

```svelte
<script lang="ts">
    import { VFXCanvas } from "@vfx-js/svelte";

    let text = $state("");
    let element = $state<HTMLElement | null>(null);
</script>

<VFXCanvas shader="rgbShift" class="card" bind:element>
    <h2>Title</h2>
    <input bind:value={text} />
</VFXCanvas>
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
- `bind:element` gives the element the effect is on: the `<canvas>`
  if supported, else the `<div>`. It is `null` on the server, until the
  effect is bound, and after unmount.
- Style an inner element, not `VFXCanvas` itself. Padding on the canvas
  stretches the texture.
  See [html-in-canvas.md](../../docs/html-in-canvas.md) for sizing.

## Config

Set the options of the shared VFX with `vfxConfig`, e.g. in
`+layout.svelte`. Call it when the component is created.

```svelte
<script lang="ts">
    import { vfxConfig } from "@vfx-js/svelte";

    vfxConfig({ pixelRatio: 1, zIndex: -1 });
    // Or follow state with a getter:
    // vfxConfig(() => ({ pixelRatio: hiDpi ? 2 : 1 }));
</script>
```

- Same keys as React's `useVFXConfig`: `pixelRatio`, `zIndex`,
  `postEffect`, `autoplay`.
- It applies while the calling component is mounted. On unmount the
  options go back to the defaults.
- A change replaces the shared VFX: every element and transition is
  re-added on the new one. Numbers and booleans compare by value,
  `postEffect` by reference.
- A replace during a page transition cuts to the new page.
- With two mounted callers, the last one mounted wins, with a warning.
- Keep a `postEffect` object out of `$state`. Svelte wraps it in a new
  proxy each time it is assigned, so it counts as a new reference and
  replaces the VFX.

### Drive frames yourself

With `autoplay: false`, nothing renders until you call `render()`.
`vfxInstance()` gives the shared VFX as `.current`. It follows replaces
and is `null` while there is none. Reading it does not keep the VFX
alive.

```svelte
<script lang="ts">
    import { vfxConfig, vfxInstance } from "@vfx-js/svelte";
    import { onMount } from "svelte";

    vfxConfig({ autoplay: false });
    const instance = vfxInstance();

    onMount(() => {
        let frame = 0;
        const loop = () => {
            instance.current?.render();
            frame = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(frame);
    });
</script>
```

## API

### `<VFXTransition>` (`@vfx-js/svelte/sveltekit`)

Props: `transition`, `params`, `reverse`, `duration`, `overflow`, `ease`,
`waitFor`, `keepWrapped`, and `fullscreen`.

- The target fills the viewport height by default, and pages scroll
  inside it. Pass `fullscreen={false}` to size it with your own CSS,
  e.g. under a header.
- `class`, `style` and other attributes go on the target.
- On the server it renders plain divs.

### `transition(spec)`

An attachment for a link: `{@attach transition(spec)}`.
Modified clicks and links with another `target` are ignored.

### `setNextTransition(spec)`

Use this spec for the next navigation, e.g. before `goto()`.

### `vfx(props)`

The attachment. See [Element effects](#element-effects).

### `VFXCanvas`

A component. See [`VFXCanvas`](#vfxcanvas).

### `vfxConfig(config)`

Set the options of the shared VFX. See [Config](#config).

### `vfxInstance()`

The shared VFX as `.current`, or `null`. See [Drive frames yourself](#drive-frames-yourself).

### `updateElement(el)`

Re-capture the texture of an element with `vfx`.

### `transitionIn(spec)`

Call it when a page component is created. Only the spec at creation counts.

## License

MIT
