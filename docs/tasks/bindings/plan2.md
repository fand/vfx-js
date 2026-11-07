# Bindings: implementation plan

The API is in [plan.md](./plan.md). This file says how to build the Vue
and Svelte packages.

## Scope

- `@vfx-js/vue`, with `@vfx-js/vue/nuxt`.
- `@vfx-js/svelte`, with `@vfx-js/svelte/sveltekit`.
- No change in `@vfx-js/core` or `@vfx-js/react`.
- Astro is out for now.

## Changes from plan.md

- No core `hold()`. Each `<VFXTransition>` owns its handle, so the
  binding can tell an old navigation from a new one itself. Core
  `run(cb, opts)` does the rest: `opts` can be a function, called right
  after `cb` resolves, so the spec is read when the new page is in.
- The pending spec store stays where it is. Each package has its own
  copy (`setNextTransition`, `takePending`, about 30 lines). Sharing it
  only matters with two frameworks on one page.
- Presets are classes now (#224): `Crossfade`, `Swipe`, `Glitch`.
  Snippets in plan.md use the old names.
- `<VFXTransition>` matches React: it fills the viewport by default
  (`fullscreen`), and renders an outer `display: contents` div around
  the target.

## What the bindings give

The router glue is a few lines, as in the demos. The packages are for
the rest:

- `transition(spec)` on a link, `useTransitionIn` / `transitionIn` on a
  page, and the order: link spec, then page spec, then the
  `<VFXTransition>` props.
- Back detection. Back adds `reverse: true` to the spec that wins.
- One VFX instance, made on mount and destroyed on unmount.
- SSR: one plain div, no `<ClientOnly>`.

## Shared parts (each package)

```ts
// pending.ts — same as packages/react/src/transition/store.ts,
// without the React event type.
setNextTransition(spec: RunOpts): void;
takePending(): RunOpts | null;      // 10 s TTL, once
isPlainLeftClick(e: MouseEvent, el: Element): boolean;

// scope.ts
type TransitionScope = { register(spec: RunOpts): () => void };
// register sets `incoming`; the remover clears it only if it still holds that spec.

// spec.ts
const pickSpec = (incoming: RunOpts | null, back: boolean): RunOpts => {
    const spec = takePending() ?? incoming ?? {};
    return back ? { ...spec, reverse: true } : spec;
};

// vfx.ts — one refcounted VFX per page.
// acquire() on mount, release() on unmount; destroy one frame after
// the count hits 0, so a remount in that frame keeps the canvas.
```

`<VFXTransition>` props: `AddTransitionOpts` plus `fullscreen`,
`class`, `style`. Props go into one live options object passed to
`addTransition`, so a prop change applies on the next run (as React
`useLiveOpts`). `pixelRatio` and `zIndex` are read when the VFX is made.

## `@vfx-js/vue`

### Package

`packages/vue/`, set up like `packages/react/`: tsc dual build,
`tsconfig-to-dual-package`, biome, vitest with happy-dom.

- Components in `.ts` with `defineComponent` and `h()`. No SFC, so tsc
  is enough.
- `peerDependencies`: `vue ^3.5`, `nuxt ^4` (optional).
- `dependencies`: `@vfx-js/core workspace:*`.
- `exports`: `.` and `./nuxt`.

```
src/
  index.ts             transition, useTransitionIn, setNextTransition
  pending.ts  scope.ts  spec.ts  vfx.ts
  transition.ts        transition(spec) → (e: MouseEvent) => void
  use-transition-in.ts
  base.ts              VFXTransitionBase: divs, addTransition, provide(scope)
  nuxt/index.ts        VFXTransition for Nuxt
```

### `@vfx-js/vue/nuxt`

`VFXTransition` renders the base and wires the router in `onMounted`.
Same as `transition-demo/nuxt/app/plugins/vfx-transition.client.ts`,
with the spec from `pickSpec`.

```ts
let finish: (() => void) | null = null;
const free = () => { finish?.(); finish = null; };
let position = history.state?.position ?? 0;

const offGuard = router.beforeEach((to, from) => {
    const t = handle.value;
    if (!t || to.path === from.path) return;
    free(); // a newer navigation drops this one
    // On back/forward the history entry has already changed.
    const back = (history.state?.position ?? position) < position;
    scope.incoming = null;
    return new Promise<void>((taken) =>
        t.run(() => {
            taken();
            return new Promise<void>((r) => { finish = r; });
        }, () => pickSpec(scope.incoming, back)).catch(console.error),
    );
});
const offFinish = nuxtApp.hook("page:finish", free);
const offAfter = router.afterEach((_to, _from, failure) => {
    position = history.state?.position ?? position;
    if (failure) free();
});
onUnmounted(() => { offGuard(); offFinish(); offAfter(); free(); });
```

- `router` from `useRouter()` (`vue-router`), `nuxtApp` from
  `useNuxtApp()` (`nuxt/app`).
- `page:finish` comes after the new page's `setup`, so
  `useTransitionIn` has registered by then.

### `transition` and `useTransitionIn`

- `transition(spec)` returns a click handler for
  `@click="transition(spec)"`.
- `useTransitionIn(spec)`: `inject` the scope, register in `setup`,
  remove in `onUnmounted`. Warn once without a scope.

### Tests

Mock `@vfx-js/core` with a fake `VFX` and handle that records `run`.

- One VFX for two `<VFXTransition>`s; destroyed one frame after the
  last unmount.
- `useTransitionIn` registers; unmount clears it.
- Nuxt wrapper with a fake router and `nuxtApp`:
  - `beforeEach` waits until `run` calls `cb`.
  - `page:finish` ends the run; the spec is link, then page, then `{}`.
  - Back adds `reverse`.
  - A second navigation frees the first; a failed one frees it too.
  - The same path does not run.

## `@vfx-js/svelte`

### Package

`packages/svelte/`, built with `svelte-package`. It ships `.svelte`,
`.js` and `.d.ts`, ESM only. Lint with biome and `svelte-check`.

- `peerDependencies`: `svelte ^5.29` (`{@attach}`), `@sveltejs/kit ^3`
  (optional).
- `exports`: `.` and `./sveltekit`, each with `types` and `svelte`.

```
src/lib/
  index.ts             transition, transitionIn, setNextTransition
  pending.ts  scope.ts  spec.ts  vfx.ts
  transition.ts        attachment: (spec) => (node) => remover
  transition-in.ts     getContext
  VFXTransitionBase.svelte
  sveltekit/index.ts
  sveltekit/VFXTransition.svelte
```

### `@vfx-js/svelte/sveltekit`

Same as `transition-demo/sveltekit/src/routes/+layout.svelte`.

```ts
onNavigate((nav) => {
    const t = handle;
    if (!t || !nav.to || nav.to.url.pathname === nav.from?.url.pathname) return;
    const back = nav.type === "popstate" && (nav.delta ?? 0) < 0;
    scope.incoming = null;
    return new Promise<void>((taken) =>
        t.run(async () => {
            taken();
            await nav.complete;
        }, () => pickSpec(scope.incoming, back)).catch(() => {}),
    );
});
```

- `onNavigate` waits for the promise, so the snapshot comes before the
  DOM update.
- A failed navigation rejects `nav.complete`. `cb` throws and core
  ends the run.
- `$app/navigation` is only imported under `/sveltekit`.

### `transition` and `transitionIn`

- `transition(spec)` is an attachment: a `click` listener that calls
  `setNextTransition` on a plain left click. Returns the remover.
- `transitionIn(spec)`: `getContext`, register at init, remove in
  `onDestroy`. Warn once without a context.

### Tests

vitest, happy-dom, `mount()` from `svelte`, core mocked, `$app/navigation`
mocked with a fake `onNavigate`. Same cases as Vue.

## Demos and docs

- `transition-demo/nuxt`: remove the plugin; `app.vue` uses
  `<VFXTransition>` and `transition(spec)` on the links.
- `transition-demo/sveltekit`: same in `+layout.svelte`.
- Getting Started (`next/app/getting-started/frameworks.ts`): the Nuxt
  and SvelteKit tabs use the packages. Move the fixed-height note above
  the tabs. Astro keeps its tab as is.
- A README per package.
- `CLAUDE.md`: add `packages/vue/` and `packages/svelte/`.
- Changesets: `0.1.0` for both packages.

## PRs

1. `@vfx-js/vue` + `/nuxt`, tests, Nuxt demo, Nuxt tab, README.
2. `@vfx-js/svelte` + `/sveltekit`, tests, SvelteKit demo, SvelteKit
   tab, README.

They do not depend on each other.

## Check before merge

- `pnpm test`, `pnpm run lint`, `pnpm run build`, and `build:demo` for
  the ported demo.
- In a browser: link, back, forward, a click during a run, the same
  page, a failed navigation. Only one canvas.

## Open

- Can a package import `nuxt/app` without `build.transpile`? If not,
  ship `/nuxt` as a Nuxt module that adds the component.
- `@click` on `<NuxtLink>`: check it reaches the `<a>`. The order
  against RouterLink does not matter, since the spec is read at the end.
- Back spec: "winning spec + `reverse`" for now. A `backTransition`
  prop later if asked.
- Later, if the same glue shows up a fourth time, move it to core as
  `hold()`.
