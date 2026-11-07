# Element bindings for Vue and Svelte

Add element effects (what `VFXImg` / `VFXSpan` do in React) to
`@vfx-js/vue` and `@vfx-js/svelte`. Stacked on PR #226 (branch
`feat/vue-svelte-elements` from `ccr-a89dbef3-om8944`).

## API

One directive / attachment for every element. Core `vfx.add` already
picks image, video, canvas or text by element type, so no per-tag
components.

```vue
<script setup lang="ts">
import { vVfx } from "@vfx-js/vue";
</script>

<template>
    <img v-vfx="{ shader: 'rgbShift' }" src="cat.png" />
    <h1 v-vfx="{ shader: 'glitch', overflow: 30 }">Hello</h1>
</template>
```

```svelte
<script lang="ts">
    import { vfx } from "@vfx-js/svelte";
    let shader = $state("rgbShift");
</script>

<img {@attach vfx({ shader: "rgbShift" })} src="cat.png" alt="" />
<h1 {@attach vfx(() => ({ shader }))}>Hello</h1>
```

- Value: `VFXProps`. `null` / `undefined` means no effect.
- Svelte: `vfx(props)` or `vfx(() => props)`. A plain object that reads
  state makes Svelte re-run the attachment, so a change does a full
  remove + add. A getter keeps the attachment and applies the diff.
  Say so in the README.
- Also export `updateElement(el)` from both: re-capture an element's
  texture (what React `useVFX().rerenderElement` does). For inputs and
  other changes the observer can't see.

## Out of scope

- `VFXCanvas` (html-in-canvas wrapper). Needs its own component.
- Config API (`pixelRatio`, `zIndex`, `postEffect`, `autoplay`). The
  shared VFX keeps core defaults, as today.
- Core and React changes.

## Shared part: `element.ts` (each package)

Framework-free controller, copied into both packages (no core change,
same as plan2.md). Port from `packages/react/src/lifecycle.ts` and
`split-props.ts`:

```ts
export function bindElement(el: HTMLElement): {
    update(props: VFXProps | null | undefined): void;
    destroy(): void;
};
```

- `bindElement` calls `acquireVFX()` (from `vfx.ts`). No VFX (WebGL off)
  → every call is a no-op.
- All ops go through one FIFO queue (`createOpQueue`), so add, update
  and remove never overlap. Destroy during an in-flight add removes
  after the add.
- First non-null props → `vfx.add(el, props)`.
- Later props → `applyDelta(prev, next)`:
  - same keys (`VFX_PROP_KEYS`, compared with `===`) and same `effect`
    → nothing;
  - only `effect` differs → `vfx.updateEffects`;
  - else → `remove` + `add`.
  Template object literals are new each render, so the key compare is
  what stops needless re-adds.
- Props → null: `remove`. Null → props: `add`.
- Not img / video / canvas: a `MutationObserver` (characterData,
  attributes, subtree) calls `vfx.update(el)`, as React `VFXElementFactory`
  does.
- `destroy`: disconnect the observer, queue `remove`, `releaseVFX()`.
- `updateElement(el)`: `vfx.update(el)` on the shared instance, if any.
- Errors: `console.error("[@vfx-js/vue] ...")` (or svelte), queue goes on.

## Vue

- `src/element.ts`, `src/directive.ts`:

  ```ts
  export const vVfx: ObjectDirective<HTMLElement, VFXProps | null | undefined> = {
      mounted(el, b) { ... bindElement(el); ctl.update(b.value) },
      updated(el, b) { ctl.update(b.value) },
      beforeUnmount(el) { ctl.destroy() },
  };
  ```

  Keep the controller in a `WeakMap<HTMLElement, Controller>`.
  No SSR hooks needed; directives do not run on the server. Add
  `getSSRProps: () => ({})` so SSR does not warn.
- Export `vVfx`, `updateElement` and type `VFXProps` from `.`.
- README: section "Element effects" with the snippet; global use
  through `app.directive("vfx", vVfx)`.

## Svelte

- `src/lib/element.ts`, `src/lib/attachment.svelte.ts`:

  ```ts
  export function vfx(props: VFXProps | null | undefined | (() => VFXProps | null | undefined)): Attachment<HTMLElement> {
      return (el) => {
          const ctl = bindElement(el);
          if (typeof props === "function") {
              $effect(() => { ctl.update(props()); });
          } else {
              ctl.update(props);
          }
          return () => ctl.destroy();
      };
  }
  ```

  `.svelte.ts` so `$effect` works inside the attachment. Check that
  `svelte-package` emits it.
- Export `vfx`, `updateElement`, type `VFXProps` from `.`.
- README: section "Element effects", with the getter note.

## Tests

Each package, happy-dom, `@vfx-js/core` mocked (fake `VFX` with spy
`add`, `remove`, `update`, `updateEffects`).

- Mount adds once with the props.
- Re-render with an equal new object: no call.
- Only `effect` changes: `updateEffects`, no remove.
- Another key changes: `remove` then `add`.
- Props → null removes; null → props adds.
- Unmount removes; unmount during a slow `add` removes after it.
- Text change in a `<h1>` calls `update`; an `<img>` gets no observer.
- Two elements share one VFX; it is destroyed a frame after the last
  one goes (with `<VFXTransition>` too).
- `updateElement` calls `update`.
- Svelte: getter form applies the diff without re-running the
  attachment (`add` once, then `remove`+`add` or `updateEffects`).

## Demos

Add one effect to each transition demo's About heading, so the browser
check has a target:

- Nuxt `pages/about.vue`, SvelteKit `routes/about/+page.svelte`:
  `rgbShift` on the `<h1>` (through `PageView`, with a prop).

Check in a browser: the heading has the effect; a page transition to
and from About still works; one canvas.

## Docs

- READMEs of both packages.
- `CLAUDE.md`: Vue / Svelte lines say "transitions and element effects".
- Changesets: minor for both.
- `docs/tasks/bindings/progress.md`: a section for this work.

## Checks

- `pnpm --filter @vfx-js/vue run lint test build`, same for svelte.
- Demo `build:demo` for Nuxt and SvelteKit.
