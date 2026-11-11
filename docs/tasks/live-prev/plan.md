# Live prev content during transitions

## Problem

During a run, the new content keeps moving but the old content is frozen.
Animations, videos and GIFs in the old content stop, so the run looks choppy.

Why:

- The new content is live because the wrapper canvas re-captures it on every paint event.
- The old content is copied once into `from` by `TransitionStage.snapshot()`.
- Then `cb` replaces the DOM, so the old nodes are gone.

To keep the old content moving, its DOM must stay alive after `cb`, and a second html-in-canvas capture must record it every frame.

## Public API

Add one field to `TransitionSpec`.
`AddTransitionOpts`, `RunOpts` and `ShowOpts` get it too.

```ts
/**
 * Keep capturing the old content during the run, so its animations and videos keep playing.
 * Default false.
 */
liveFrom?: boolean;
```

```ts
const t = vfx.addTransition(main, { liveFrom: true });
await t.run(() => renderNext(), { liveFrom: true });
await t.show(2, { liveFrom: true });
```

- The name is a placeholder. Revisit it before release.
- Transition code does not change. `ctx.from` just updates every frame.
- Check `@vfx-js/transitions` presets for code that assumes `from` stays the same during a run.

Besides the flag, `run(cb)` needs a way for the caller to hand over the old nodes before it drops them.
Sketch:

```ts
t.run((ctx) => {
    ctx.keepPrev(oldNodes);
    swap();
}, { liveFrom: true });
```

The exact shape is open.
Callers that swap the DOM themselves (`show()`, Astro, React `VFXTransition`) use it.

## Core

### Ghost capture (`transition/live-from.ts`, new)

- Build a `<canvas layoutsubtree>` ("ghost") that holds the old nodes.
  - Put it next to the wrapper canvas, at the same rect and size.
  - `pointer-events: none`, `inert`, `aria-hidden`.
  - It never draws to itself, so nothing shows on screen.
- Inside it, put a shallow clone of the container (same tag and classes), and move the old nodes into it with `moveBefore`.
  - Selectors like `.slides > .slide` still match.
  - `moveBefore` keeps video, iframe, CSS animation and JS state.
- Use `setupCapture` / `moveNode` from `html-in-canvas.ts` to get an `OffscreenCanvas` on each paint.
- `dispose()` removes the ghost and stops the capture.
- Apply `freezeInside` to the ghost too.

### Stage (`transition/effect.ts`)

- Add `TransitionStage.setLiveSource(getTexture | null)`.
- With a source set:
  - Keep the stage enabled while playing.
  - In `render`, blit the ghost texture into `#from` each frame, then pass `ctx.src` through.
  - While holding, show the live content once the first ghost capture arrives.
- Until the first ghost frame arrives, use the snapshot, so nothing flickers.

### VFX / player

- Add `vfx.captureLive(canvas)` (`@internal`). It returns `{ texture, dispose }` and keeps a GL texture updated from the `OffscreenCanvas`.
  - Move the texture code in `updateHICTexture` into a shared helper.
  - Do not register the ghost as a player element, or it would render on screen.
- Add `captureLive` to the `TransitionHost` pick.

### Controller (`transition/transition.ts`)

- With `liveFrom`, build the ghost after the snapshot, from the nodes the caller hands over, and call `stage.setLiveSource`.
- `show()`: hand the old slide over to the ghost.
  Apply `hidden` / `remove` when the run ends, after moving the slide back to its place.
- Clean up on every exit: `#endActive`, `cancel`, `#cutAfterStall`, `destroy`.
  Dispose the ghost, call `setLiveSource(null)`, and move `show()` slides back.
- A newer run drops the old run's ghost at once.
- If no nodes are handed over, keep the snapshot (current behavior).

## Bindings

| Binding | Who swaps the DOM | Plan |
|---|---|---|
| Astro | binding (`swapKeepingTarget`) | Hand the old children to core right before `replaceChildren` (`astro/src/client/swap.ts`). Static HTML, so moving is safe. Islands keep their state. |
| React `VFXTransition` | binding (`setShown`) | Keep rendering the old page during the run, next to the new one, and hand its root to core. |
| Next.js | same as React | Built on `BaseVFXTransition`. `FrozenRouter` already pins the old page's route. |
| React Router | same as React | Built on `BaseVFXTransition`. `useOutlet()` already keeps the old page's route. |
| Nuxt | `<NuxtPage>` (uses `<Transition>`) | Keep the old page with `pageTransition` `onLeave(el, done)`. Nuxt gives each page its own route. Prototype first. |
| SvelteKit | SvelteKit, inside the binding's `{@render children}` | Wrap in `{#key page.url}` with an `out:` transition to keep the old block. Its effects pause, but CSS animations and videos keep going. `out:` needs the duration up front, but lazy specs pick it later. Prototype first. |
| Vue (vue-router) | user's `<RouterView />` | The binding would have to render `<RouterView v-slot>` itself. Old pages would see the new route through `useRoute()`. Later. |
| React `useVFXTransition` | user's `cb` | Can't keep the old nodes. Later. |

Next.js note: `FrozenRouter` relies on an internal Next API, so a Next upgrade may break it. This is not new.

## Fallback: clone (later)

For callers that can't hand over the old nodes (plain Vue, `useVFXTransition`), core could deep clone the element before `cb`.

- Sync CSS animations (`getAnimations({ subtree: true })`, `currentTime`), videos (muted, `currentTime`), and scroll positions.
- Copy canvases once.
- Limits: JS-driven parts stop, custom element constructors run, iframes reload, ids are duplicated.

Decide later, based on demand.

## Steps

1. Core: ghost capture, the hand-over entry, `liveFrom`. Use it in `show()`.
2. React `BaseVFXTransition` (covers Next.js and React Router), and Astro.
3. Prototype Nuxt (`pageTransition`) and SvelteKit (`{#key}` + `out:`).
4. Decide on the clone fallback for plain Vue and `useVFXTransition`.

## Tests and docs

- Stage: `from` updates every frame with a live source. It uses the snapshot until the first ghost frame.
- Controller: the ghost is cleaned up on every exit. `show()` slides return to their place and order. An interrupting run does not leak a ghost.
- A demo with CSS animations and a video in the old content (framework-testbed or docs-transitions).
- Add `liveFrom` to `skills/vfx-js/` and the transition docs. `pnpm --filter docs test` must pass.
- Add a changeset.
