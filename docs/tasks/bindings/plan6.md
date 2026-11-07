# Config API for Vue and Svelte

Set the options of the shared VFX, like React's `useVFXConfig`. On PR
#226.

## API

```vue
<!-- Vue: app.vue or a layout -->
<script setup lang="ts">
import { useVFXConfig } from "@vfx-js/vue";
useVFXConfig({ pixelRatio: 1, zIndex: -1 });
// or reactive: useVFXConfig(() => ({ pixelRatio: hiDpi.value ? 2 : 1 }))
</script>
```

```svelte
<!-- Svelte: +layout.svelte -->
<script lang="ts">
    import { vfxConfig } from "@vfx-js/svelte";
    vfxConfig({ pixelRatio: 1, zIndex: -1 });
    // or reactive: vfxConfig(() => ({ pixelRatio: hiDpi ? 2 : 1 }))
</script>
```

```ts
type VFXConfig = {
    pixelRatio?: number;
    zIndex?: number;
    postEffect?: VFXPostEffect | VFXPass[];
    autoplay?: boolean;
};
```

- Same keys and rules as React's `VFXConfig`:
  - applies while the calling component is mounted; on unmount the
    options go back to the defaults;
  - a change replaces the instance; numbers and booleans compare by
    value, `postEffect` by reference;
  - two mounted callers: the last one mounted wins; warn once if their
    options differ.
- Vue takes `MaybeRefOrGetter<VFXConfig>` (`toValue` in a `watch`).
  Svelte takes the object or a getter (read in `$effect`).
- Named `vfxConfig` in Svelte, like `transitionIn`, since Svelte has no
  `use` convention.
- Call it in `setup` / component init, not later.

## Out of scope

- A second instance (React's `<VFXProvider>`, `wrapper`).
- Changing options on a live instance without replacing it.
- `autoplay: false` needs a way to reach the instance to drive frames.
  React has `VFXContext` for that. Keep `autoplay` in the type for
  parity, and add an instance getter only if asked.

## Store: replace `vfx.ts`

Today `acquireVFX()` returns the instance once. A replaced instance
must reach every consumer, so consumers attach through a callback:

```ts
/** Calls `attach` with the current VFX now and after each replace. Returns release. */
export function attachVFX(attach: (vfx: VFX) => () => void): () => void;
export function setConfig(owner: symbol, config: VFXConfig): void;
export function clearConfig(owner: symbol): void;
export function peekVFX(): VFX | null;
```

- First attach creates the instance with the effective config
  (`VFX.init(config)`; `null` → stay plain DOM, no retry, `attach`
  never runs).
- `setConfig` / `clearConfig` mark the config dirty and flush in a
  microtask. Flush: if the effective config differs from the applied
  one and the instance exists, run every consumer's detach, destroy the
  old instance, create a new one, run every `attach` again.
- Release: last consumer gone → destroy one frame later, as today.
- Timing: `setup` / init runs parent first, and consumers attach in
  `onMounted` / `onMount` (child first, but after every `setup`). So a
  layout's config is set before the first attach and the first instance
  already has it. No extra replace on load. Test this.
- Same file in both packages, except the log prefix.

## Consumers

Each one moves its "add to this VFX" and "remove from it" into the
attach callback:

- `element.ts` (`bindElement`, used by `v-vfx`, `vfx()`, `VFXCanvas`):
  attach = add the element with the last props (and capture, for
  `VFXCanvas`); detach = remove it. Props and the queue live outside
  the callback, so they survive a replace. The html-in-canvas capture
  stays running across a replace; re-add passes the latest capture.
- Vue `base.ts` (`VFXTransition`) and Svelte `sveltekit/VFXTransition.svelte`:
  attach = `addTransition(target, liveOpts)`; detach = `destroy()`.
  A replace during a run cancels the run and cuts to the new page.
  Say so in the docs.
- `updateElement(el)`: uses `peekVFX()`, unchanged.

## Tests

Each package, core mocked (`VFX.init` records options).

- Config set in a parent before children mount: one `VFX.init`, with
  the options.
- Changing the config (Vue ref / getter; Svelte getter) replaces the
  instance: old destroyed, new init with new options, elements and the
  transition re-added on the new one.
- Same values again: no replace. `postEffect` by reference.
- Unmount of the config owner: back to defaults (a replace with `{}`).
- Two owners with different options: last mounted wins, warns once.
- No consumers: config alone creates no instance.
- `VFX.init` returns null: nothing attaches, no retry.
- Element props set before a replace are the ones re-added after it.
- `VFXCanvas` with capture: re-add on the new instance passes the
  latest capture; `setupCapture` is not called again.

## Storybook

One story per package ("Effect/Vue › Config", "Effect/Svelte ›
Config"): an element plus a pixelRatio toggle (1 / 2) and a zIndex
toggle. Check one canvas after toggles.

## Docs

- READMEs: a "Config" section.
- Comparison page (bindings-compare.html, in the scratchpad): fill the
  Config row.
- `docs/tasks/bindings/progress.md`.
- Changesets: extend the element-effects ones (or a new minor each).

## Checks

- lint, test, build in packages/vue and packages/svelte.
- build-storybook; browser check of both Config stories.
