# @vfx-js/svelte

Shader page transitions for Svelte 5 and SvelteKit, built on [@vfx-js/core](https://www.npmjs.com/package/@vfx-js/core).

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

Back adds `reverse: true` to the spec that wins.

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

### `transitionIn(spec)`

Call it when a page component is created. Only the spec at creation counts.

## License

MIT
