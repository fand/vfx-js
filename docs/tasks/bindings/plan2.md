# Bindings: implementation plan

The goal and the API are in [plan.md](./plan.md). This file says how to
build it, file by file. Scope: core `hold()`, the shared spec store,
React on `hold()`, `@vfx-js/vue` (+ `/nuxt`), `@vfx-js/svelte`
(+ `/sveltekit`). Astro is last and gets its own plan once the open
questions in plan.md are tried.

## Fixes to plan.md

- Presets are classes now (#224): `Crossfade`, `Swipe`, `Glitch`, not
  `crossfade`. Update the snippets in plan.md and in the Getting Started
  tabs.
- `TransitionClass` does not help Astro: a class does not reach the
  client from `.astro` props either. Specs as names stay.
- React `<VFXTransition>` fills the viewport by default
  (`fullscreen`) and renders an outer `display: contents` div. Vue and
  Svelte do the same, so the tabs read the same.

## Step 1. Core `hold()`

`packages/vfx-js/src/transition/transition.ts`, `types.ts`.

`hold()` is a run whose `cb` waits on a deferred. The spec is always
lazy, so it uses the existing lazy path (bind after `cb`, then swap the
effects with `#ensureWrapped(slots, isCurrent, false)`).

```ts
hold(opts: { signal?: AbortSignal } = {}): Promise<TransitionHold> {
    let releaseCb!: () => void;
    const swapped = new Promise<void>((r) => { releaseCb = r; });
    let spec: RunOpts | (() => RunOpts) = {};
    let id = 0;
    let done = false;

    return new Promise((resolveHold) => {
        const ran = this.run(() => {
            // Called after the snapshot, or at once for a stale or cut run.
            resolveHold(hold);
            return swapped;
        }, () => (typeof spec === "function" ? spec() : spec));
        id = this.#seq;
        this.#holds.set(id, releaseCb);
        const hold: TransitionHold = {
            release: (s) => {
                if (done) return Promise.resolve();
                done = true;
                if (s) spec = s;
                releaseCb();
                return id === this.#seq ? ran : Promise.resolve();
            },
            cancel: () => {
                if (done) return;
                done = true;
                releaseCb();
                if (id === this.#seq) this.cancel();
            },
        };
        opts.signal?.addEventListener("abort", hold.cancel, { once: true });
        if (opts.signal?.aborted) hold.cancel();
    });
}
```

Details:

- `#holds: Map<id, () => void>`. `run()` and `cancel()` resolve every
  held deferred whose id is older than the new `#seq`. Without this an
  old hold that nobody releases keeps a stale run pending forever. The
  stale run then returns at its next `isCurrent()` check, as today.
- `run()` stays as is. Do not rewrite `run` on top of `hold`: `run`
  binds a static spec before the snapshot, and the effects start their
  `start()` while held. `hold` can't, since its spec comes later. The
  stack in plan.md ("run is hold + cb + release") holds for behavior,
  not for code.
- A destroyed handle: `run` calls `cb` at once, so `hold()` resolves
  with a hold whose `release` does nothing.
- `release()` with no spec: see step 2.
- The `ran` promise rejects only when `cb` throws. Ours never throws,
  so `release()` never rejects. Swallow `ran` errors inside `hold` so no
  unhandled rejection shows when nobody calls `release`.
- Export `TransitionHold` from `src/index.ts`.

Tests in `transition/transition.test.ts`, with the fake host:

1. `hold()` resolves after the snapshot; `running` is true.
2. `release(spec)` binds `spec` after release, not before (spy the
   transition constructor).
3. `release()` resolves when the run ends.
4. A newer `hold`, `run` or `show` wins: the old `release` resolves at
   once and does not start; the old `cancel` does not stop the new run.
5. `release` twice: the second does nothing.
6. An aborted signal, before and after the snapshot, is `cancel()`.
7. `cancel()` on the handle while held frees the hold.
8. `hold()` on a destroyed handle.
9. Snapshot stall: `hold()` still resolves, `release()` cuts.

## Step 2. Move the spec store to core

New `packages/vfx-js/src/transition/pending.ts`, moved from
`packages/react/src/transition/store.ts`:

- `setNextTransition(spec)`, `takeNextTransition()` (was `takePending`),
  `hasNextTransition()`.
- `isPlainLeftClick(e: MouseEvent, el: Element)`, DOM types only.
- Keep the state on `globalThis[Symbol.for("vfx-js.pending")]`. Two
  copies of core in one bundle (a binding resolving its own core) must
  still share one pending spec.

Export `setNextTransition` and `takeNextTransition` from core.
`takeNextTransition` is for binding authors; say so in its doc comment.

`release()` with no spec: `takeNextTransition() ?? {}`. With a spec, the
spec as given; the binding builds the priority itself:

```ts
hold.release(() => takeNextTransition() ?? pageSpec ?? {});
```

Every binding uses this one line. Container props come in through
`resolveSpec` as the defaults, so the order link → page → component
holds.

React:

- `store.ts` keeps `transition(spec)` (it takes `React.MouseEvent`),
  built on core `isPlainLeftClick` and `setNextTransition`.
- Re-export `setNextTransition` from core. `store.test.ts` moves its
  store cases to core and keeps the click cases.

## Step 3. React `<VFXTransition>` on `hold()`

`packages/react/src/transition/VFXTransition.tsx`:

```ts
useEffect(() => {
    ...
    incoming.current = null;
    const held = transition.hold();
    held.then((h) => {
        if (requestedKey.current !== key) return h.cancel();
        commitWaiters.current.push(() =>
            h.release(() => takeNextTransition() ?? incoming.current ?? {}),
        );
        startTransition(() => setShown(next));
    });
});
```

- `commitWaiters` stays: it is how React says "committed". The swap
  promise goes.
- `h.cancel()` on a newer key is safe: a newer hold already won, so it
  does nothing.
- `VFXTransition.test.tsx` must pass unchanged. No public API change, no
  changeset beyond a patch.
- `useVFXTransition.run` keeps `transition.run(...)`; it changes the DOM
  in one function.

## Step 4. `@vfx-js/vue`

### Package

`packages/vue/`, copied from `packages/react/` (tsc dual build,
`tsconfig-to-dual-package`, biome, vitest).

- Components in `.ts` with `defineComponent` and `h()`. No SFC, so no
  Vite or `vue-tsc` build; `tsc` is enough.
- `peerDependencies`: `vue ^3.5`, `nuxt ^4` (optional). `dependencies`:
  `@vfx-js/core workspace:*`.
- `exports`: `.` and `./nuxt`.

```
src/
  index.ts             transition, useTransitionIn, VFXTransition (plain)
  transition.ts        transition(spec) → (e: MouseEvent) => void
  scope.ts             InjectionKey<TransitionScope>
  use-transition-in.ts
  vfx.ts               shared VFX instance (see below)
  nuxt/index.ts        VFXTransition for Nuxt
  *.test.ts            happy-dom, core mocked
```

### Shared VFX instance

There is no Provider. `vfx.ts` keeps one refcounted `VFX`: `acquire()`
in `onMounted`, `release()` in `onUnmounted`, destroy one frame after
the count hits 0 (same rule as React `store.ts`). Props: `pixelRatio`,
`zIndex` on `<VFXTransition>`, read at creation only. A config API
like `useVFXConfig` waits until element bindings come.

### `VFXTransition` (base)

- Renders `div(display: contents) > div(ref, fill style) > slot`.
- `onMounted`: `vfx.addTransition(el, liveOpts)`. `liveOpts` is one
  object updated from props in a `watchEffect`, like React `useLiveOpts`.
- `provide(scope)`. `scope.register(spec)` sets `incoming`, returns an
  unregister that clears it only if it still holds that spec.
- Exposes `hold()` and `handle` to the router wrapper through a
  composable, not to users.

### `@vfx-js/vue/nuxt`

`VFXTransition` wraps the base and wires the router in `onMounted`:

```ts
const router = useRouter();          // from "vue-router" (Nuxt installs it)
const nuxtApp = useNuxtApp();        // from "nuxt/app"
let current: TransitionHold | null = null;
let back = false;
let position = history.state?.position ?? 0;

const removeGuard = router.beforeEach(async (to, from) => {
    if (to.path === from.path) return;
    current?.cancel();
    // On back/forward the history entry has already changed.
    back = (history.state?.position ?? position) < position;
    scope.reset();
    current = await base.hold();
});
const removeFinish = nuxtApp.hook("page:finish", () => {
    const h = current; current = null;
    h?.release(() => back ? withReverse(spec()) : spec());
});
router.afterEach((_t, _f, failure) => {
    position = history.state?.position ?? position;
    if (failure) { current?.cancel(); current = null; }
});
```

- `spec()` is `takeNextTransition() ?? incoming ?? {}`. Back adds
  `reverse: true` to whatever wins. The demo plays `Swipe` reversed on
  back; that is the demo's choice, not the binding's. Offer a
  `backTransition` prop later if asked.
- Remove the guard and the hook in `onUnmounted`.
- `page:finish` fires after the new page's `setup`, so `useTransitionIn`
  has registered by then.
- Risk: importing `nuxt/app` from a library. Check that Nuxt resolves it
  without `build.transpile`. If not, ship `@vfx-js/vue/nuxt` as a Nuxt
  module (`defineNuxtModule`) that adds the component and transpiles
  itself.

### `transition(spec)` and `useTransitionIn(spec)`

- `transition(spec)` returns `(e: MouseEvent) => void`. Check that
  `@click` on `<NuxtLink>` falls through to the `<a>` and runs; order
  against RouterLink does not matter, the spec is read at release.
- `useTransitionIn(spec)`: `inject(scope)`, register in `setup`,
  unregister in `onUnmounted`. Warn once outside `<VFXTransition>`.

### Tests

happy-dom, `vi.mock("@vfx-js/core")` with a fake handle whose `hold()`
records calls.

- Mount and unmount add and destroy one transition; one VFX for two
  `<VFXTransition>`s.
- `useTransitionIn` registers in the scope; unmount clears it.
- Nuxt wrapper with a fake router and fake `nuxtApp`: `beforeEach`
  waits for `hold()`; `page:finish` calls `release` with link → page
  order; a second navigation cancels the first hold; a failed
  navigation cancels.

## Step 5. `@vfx-js/svelte`

### Package

`packages/svelte/`, built with `@sveltejs/package` (`svelte-package`).
It ships `.svelte` and `.js` + `.d.ts` under `dist/`, ESM only. Lint with
`biome` + `svelte-check`.

- `peerDependencies`: `svelte ^5.29` (`{@attach}`), `@sveltejs/kit ^3`
  (optional).
- `exports`: `.` and `./sveltekit`, each with `types` and `svelte`
  conditions.

```
src/lib/
  index.ts
  transition.ts          attachment: (spec) => (node) => cleanup
  transition-in.ts       transitionIn(spec) via getContext
  scope.ts               context key
  vfx.ts                 shared VFX instance, same rule as Vue
  VFXTransition.svelte   base: div > div + scope context
  sveltekit/
    index.ts
    VFXTransition.svelte onNavigate wiring
```

### `@vfx-js/svelte/sveltekit`

```ts
onNavigate((nav) => {
    if (!handle || !nav.to || nav.to.url.pathname === nav.from?.url.pathname) return;
    const back = nav.type === "popstate" && (nav.delta ?? 0) < 0;
    scope.reset();
    return handle.hold().then((h) => {
        nav.complete.then(
            () => h.release(() => back ? withReverse(spec()) : spec()),
            () => h.cancel(),
        );
    });
});
```

- `onNavigate` waits for the returned promise, so the snapshot comes
  before the DOM update. A newer navigation wins through core.
- `$app/navigation` is only imported in the `/sveltekit` subpath.

### `transition(spec)` and `transitionIn(spec)`

- `transition(spec)` is an attachment: add a `click` listener that calls
  `setNextTransition` on a plain left click; return the remover.
- `transitionIn(spec)`: `getContext(key)`, register at init, unregister
  in `onDestroy`. Warn once without a context.

### Tests

vitest + `@testing-library/svelte` or `mount()` from svelte, happy-dom,
core mocked. Same cases as Vue, with a fake `onNavigate` (mock
`$app/navigation`).

## Step 6. Demos and docs

- `packages/transition-demo/nuxt`: drop `plugins/vfx-transition.client.ts`,
  use `<VFXTransition>` in `app.vue`, `transition(spec)` on links, and
  pass the back spec as the demo does today.
- `packages/transition-demo/sveltekit`: same in `+layout.svelte`.
- Getting Started (`next/app/getting-started/frameworks.ts`): the Nuxt
  and SvelteKit tabs use the bindings; move the fixed-height note above
  the tabs.
- READMEs for both packages. `docs/TRANSITION.md`: `hold()` under
  `TransitionHandle`, and when to use `show`, `run` or `hold`.
- `CLAUDE.md`: list `packages/vue/` and `packages/svelte/`.
- Changesets: minor for `@vfx-js/core` (`hold`, store), patch for
  `@vfx-js/react`, initial `0.1.0` for the two new packages.

## Step 7. Astro (separate plan)

Try the open questions first, in the existing demo glue, on `hold()`:

- Detach and reattach the canvas and the target in one task. Does the
  WebGL context survive? Does html-in-canvas keep its state? Does core
  see a stall?
- `transition:persist` inside the target.

Then write `plan3.md` for `@vfx-js/astro`.

## Commits / PRs

1. Core `hold()` + tests. (PR 1)
2. Core spec store; React re-exports; React `<VFXTransition>` on
   `hold()`. (PR 1)
3. `@vfx-js/vue` + `/nuxt`, tests, Nuxt demo port. (PR 2)
4. `@vfx-js/svelte` + `/sveltekit`, tests, SvelteKit demo port. (PR 3)
5. Docs, Getting Started tabs, changesets. (PR 2 and 3 each carry their
   own part.)

PR 1 lands first. PR 2 and 3 do not depend on each other.

## Check before merge

- `pnpm test`, `pnpm run lint`, `pnpm run build`.
- In a browser, each demo: link, back, forward, a click during a run,
  a navigation to the same page, a failed navigation. Only one canvas.

## Open

- Vue: is `nuxt/app` safe to import from a package, or do we need a
  Nuxt module?
- Back spec: keep "the winning spec + `reverse`", or add a
  `backTransition` prop on every `<VFXTransition>`?
- Should `vfx.ts` (the shared instance) live in core so React, Vue and
  Svelte share one canvas on a page with two frameworks? Not needed for
  transitions alone.
