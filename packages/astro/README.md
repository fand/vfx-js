# @vfx-js/astro

Shader page transitions and element effects for Astro, built on [@vfx-js/core](https://www.npmjs.com/package/@vfx-js/core).
No framework island needed.

```sh
npm i @vfx-js/core @vfx-js/astro @vfx-js/transitions
```

Needs Astro 5 or later. The package ships source; Astro compiles it.

## Page transitions

Put `<VFXTransition>` around the layout's `<slot />`.
It needs `<ClientRouter />` from `astro:transitions`.
Turn off the browser's view transition with `transition:animate="none"`; the shader is the animation.

```astro
---
// src/layouts/Layout.astro
import { ClientRouter } from "astro:transitions";
import { VFXTransition } from "@vfx-js/astro";
---

<html lang="en" transition:animate="none">
    <head>
        <ClientRouter />
    </head>
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

A page picks how it enters with `<TransitionIn>`:

```astro
---
// src/pages/about.astro
import { TransitionIn } from "@vfx-js/astro";
import Layout from "../layouts/Layout.astro";
---

<Layout>
    <TransitionIn transition="glitch" />
    <h1>About</h1>
</Layout>
```

- Transitions are names: the class names from `@vfx-js/transitions` in lowercase
  (`crossfade`, `swipe`, `glitch`, `pixelsort`, ...).
  Register your own with [`registerVFX`](#registervfx).
- A link sets the spec for its click with `data-vfx-transition`.
  Give it a name, or JSON for more options:
  `data-vfx-transition='{"transition":"swipe","params":{"direction":"left"}}'`.
- Without `<ClientRouter />` each link reloads the page.
  `<VFXTransition>` then warns once and does nothing.
- Nav, footer and `transition:persist` elements outside the target work as in plain Astro.

### Which spec wins

1. The link's `data-vfx-transition`, for that click.
2. The new page's `<TransitionIn>`.
3. The props of `<VFXTransition>`.

Back and forward use the same spec. Pass `autoReverse` to play the spec
that entered the page, reversed, on back. It needs the Navigation API.

## Element effects

```astro
---
import { VFXImg, VFXSpan } from "@vfx-js/astro";
---

<VFXImg src="/cat.png" alt="" shader="rgbShift" />
<VFXSpan shader="glitch" overflow={30}>Hello</VFXSpan>
```

- `VFXImg`, `VFXVideo`, `VFXSpan`, `VFXDiv` and `VFXP` wrap their tag.
  Other attributes go on the tag.
- Props are `VFXProps` from `@vfx-js/core`, limited to values that fit in HTML:
  - `shader`: a preset name, GLSL, or `"@name"` of a registered multipass shader.
  - `uniforms`: an object of numbers and arrays, or the name of registered uniforms.
  - No `effect`. It holds instances.
- The props go into a `data-vfx` attribute as JSON.
  Any element with `data-vfx` gets the effect, e.g. `<Image>` from `astro:assets`:

  ```astro
  <Image src={cat} alt="" data-vfx='{"shader":"rgbShift"}' />
  ```

- Changing `data-vfx` later re-adds the effect. Removing it, or the element, removes the effect.
- Text and attribute changes inside the element update its texture.
- Elements and `<VFXTransition>` share one WebGL canvas.

## `registerVFX`

Functions and instances can't go in HTML.
Register them by name in a client `<script>`, e.g. in the layout:

```astro
<script>
    import { registerVFX } from "@vfx-js/astro/client";
    import { Swipe } from "@vfx-js/transitions";

    let mouse = [0, 0];
    window.addEventListener("pointermove", (e) => {
        mouse = [e.clientX, e.clientY];
    });

    registerVFX({
        transitions: { slowSwipe: new Swipe({ direction: "up" }) },
        uniforms: { mouse: { mouse: () => mouse } },
        shaders: { blur: [pass1, pass2] },
        eases: { easeOutCubic: (x) => 1 - (1 - x) ** 3 },
        vfx: { pixelRatio: 1 },
    });
</script>
```

Then refer to them by name:

```astro
<VFXSpan shader={glsl} uniforms="mouse">Hello</VFXSpan>
<VFXDiv shader="@blur">...</VFXDiv>
<a href="/about" data-vfx-transition="slowSwipe">About</a>
<VFXTransition transition="crossfade" ease="easeOutCubic"><slot /></VFXTransition>
```

- A registered transition wins over a built-in one with the same name.
- An element with a name that is not registered yet waits, and starts once it is.
  It warns if the name is still missing after the page loads.
- `ease` also takes `"smoothstep"` and `"linear"` without registering.
- `vfx` sets the options of the shared VFX. It applies only before the VFX is made,
  so call `registerVFX` in the layout, not in a page.

## API

### `<VFXTransition>`

Props: `transition`, `params`, `reverse`, `duration`, `overflow`, `ease`,
`waitFor` (`"media"` or `"none"`), `keepWrapped`, `autoReverse`, and `fullscreen`.

- The target fills the viewport height by default, and pages scroll
  inside it. Pass `fullscreen={false}` to size it with your own CSS,
  e.g. under a header. Old and new pages share one box, so give it a
  fixed height.
- `class`, `style` and other attributes go on the target.
- The target and the VFX canvas stay in the page across navigations.
  Only the target's children change.

### `<TransitionIn>`

Props: `transition`, `params`, `reverse`, `duration`, `overflow`, `ease`.
Put it anywhere in a page.

### `VFXImg`, `VFXVideo`, `VFXSpan`, `VFXDiv`, `VFXP`

See [Element effects](#element-effects).

### `registerVFX(opts)` (`@vfx-js/astro/client`)

See [`registerVFX`](#registervfx).

### `getVFX()` (`@vfx-js/astro/client`)

The shared VFX, made on first use. `null` when WebGL is not available.

### `install()` (`@vfx-js/astro/client`)

Start watching the page for `data-vfx`. The components call it; call it
yourself only when you use `data-vfx` without any component.

### `installTransition({ swapFunctions })` (`@vfx-js/astro/client`)

What `<VFXTransition>` calls. You don't need it unless you build your
own target with `data-vfx-transition-target`.

## License

MIT
