# Element transitions

Move glide's slide transition layer into VFX-JS as a general "swap the
contents of one element with a shader" API, then make glide a consumer.

Mechanism (same as glide today):

1. Snapshot the element's current capture into a render target (`from`).
2. Let the caller change the DOM.
3. Wait for the new capture to land (`paint` event on the HIC wrapper).
4. Mix `from` and the live capture with a transition shader for `duration`.

## Decisions

- Container-level first. `addTransition(el)` works on any element; a
  page transition targets the router outlet (`#app`, `<main>`), never
  `<body>` (a canvas cannot wrap it).
- Wrap only while a run is in flight. The element stays plain DOM at
  rest. `keepWrapped: true` only when the caller passes persistent
  `effects`. So `addTransition` touches no DOM and returns sync.
- `run(cb, opts)` mirrors `document.startViewTransition(cb)`. The
  contract: when `cb` resolves, the DOM is updated. How to wait is the
  router adapter's job.
- Who picks the transition, in order: `run` override → `type` lookup in
  the container's `types` map → page declaration (React layer only;
  forward uses the entering page's, back uses the leaving page's) →
  container default. No mutable global like `setTransition(body)`.
- Navigation names a `type` string; the container maps type → spec.
  Same split as React's `addTransitionType` + `enter={{ type: … }}`.
- The React click helper does not intercept navigation. It only records
  the next spec in a store. `<VFXTransition key={pathname}>` consumes it.
- Nested VFX elements inside the container are frozen during a run.
- Core holds only the mechanism and `crossfade`. The other presets live
  in `@vfx-js/effects/transitions` because `pixelsort` and `datamosh`
  import effects, and effects depends on core.
- Stay in glide: name registry, aliases, `"pixelsort right"` string
  parsing, unknown → crossfade warning, deck / parking / pump / hit test.

## Non-goals (for now)

- MPA (cross-document) transitions.
- Astro ClientRouter, Turbo, htmx adapters. Doable with core `run(cb)`
  later.
- Size animation when old and new content differ in height. v1 stretches
  `from` over the new size. `lockSize` later if needed.
- Transitions that draw outside the element (`outputRect`). All 9
  presets read outside but write inside.

## API

```ts
// core
const t = vfx.addTransition(el, {
    transition: crossfade,            // TransitionDef, default
    duration: 0.6,                    // seconds
    types: { back: { transition: swipe, reverse: true } },
    effects: [],                      // persistent effects after the chain
    keepWrapped: false,               // forced true when effects.length > 0
    waitFor: "media",                 // "media" | "none" | (el) => Promise
});
await t.run(cb, { type: "back" });   // or { transition, uniforms, reverse, duration }
t.cancel();                          // cut to the live capture
t.destroy();

type TransitionDef = {
    name: string;
    frag: string;                     // defines vec4 transition(vec2 uv, float t)
    effects?(): Promise<Effect[]>;    // driver effects, created once
    prepare?(run: TransitionRun, fx: Effect[]): void;
    onFrame?(t: number, x: number, dt: number, fx: Effect[]): void;
    onEnd?(fx: Effect[]): void;
};
```

```tsx
// react
<VFXTransition transition={swipe} duration={0.6} types={…}>
    <Page key={pathname} />
</VFXTransition>

const { ref, run } = useVFXTransition({ transition: swipe });
await run(() => startTransition(() => router.push("/next")), { type: "forward" });

<Link href="/next" onClick={transition(glitch)}>…</Link>   // client component
<VFXLink as={Link} href="/next" transition={glitch}>…</VFXLink>  // RSC-safe

useVFXTransitionSpec({ transition: glitch });   // page declares its own
```

`run()` steps: resolve spec → wrap (unless kept) → wait first paint →
snapshot → freeze nested VFX elements → `cb()` → `waitFor` → wait
capture (timeout 300 ms) → one frame → start → resolve on end → unfreeze
→ unwrap. A new `run()` bumps a seq and drops the old one at every await.

## Phases

### 0. Core prerequisites

- `vfx.update(el)` on a HIC element resolves when the next capture lands,
  with a timeout. Today it calls `requestPaint()` and resolves at once.
  Or add `captured(el): Promise<void>`; pick whichever reads better.
- `wrapElement` / `unwrapElement` use `moveBefore` when present, so
  iframes, video and focus survive the wrap.
- Keep the wrapper canvas's first capture visible until the overlay has
  drawn one frame, so wrapping does not flash. Needed because wrapping
  now happens on every run.

### 1. Core `addTransition`

Files under `packages/vfx-js/src/transition/`:

- `types.ts`: `TransitionDef`, `TransitionRun`, `TransitionSpec`,
  `AddTransitionOpts`, `RunOpts`.
- `glsl.ts`: `PRELUDE`, `MAIN`, `buildFrag`, `BODY_OFFSET`,
  `describeGlslError`. Export `BODY_OFFSET` so glide keeps its line
  numbers in error messages. Messages lose the `glide:` prefix.
- `effect.ts`: `TransitionEffect`, ported from glide `base.ts` as is.
- `transition.ts`: the `Transition` object: `run` / `cancel` / `destroy`,
  seq, wrap lifetime, `waitFor`, nested freeze, spec resolution.
- `crossfade.ts`.
- `VFX#addTransition` in `vfx.ts`.

Nested freeze, v1: pause every VFX element inside the container
(`enabled = false` on its chain, restore the element's opacity) so the
capture shows the plain element. v2 (later): bake each element's last
output into its wrapper canvas with `drawImage` from the output canvas,
so the capture shows the effect.

Fallback without HIC: `addHTML` already falls back to dom-to-canvas.
`update()` resolves after the snapshot there, so the same `run()` works,
just slower.

Tests: vitest for seq / spec resolution / waitFor (pure parts);
storybook story with a tab panel and a card list; Chromatic snapshot at a
fixed `setTime`.

### 2. Presets in `@vfx-js/effects/transitions`

- Add the `./transitions` subpath to `packages/effects/package.json`
  exports and both builds.
- Port swipe, zoom, zoomBlur, crosszoom, glitchSlide, glitch, datamosh,
  pixelsort. Drop `parseArgs`; take params as uniforms / a params object.
- glide's drivers keep per-run state in module `let`s (`outDir`,
  `frames`, `healSec`). Move it into the run object or a closure, since
  two containers may run the same preset at once.

### 3. React

Files under `packages/react/src/transition/`:

- `store.ts`: the pending spec. `transition(spec)` returns an `onClick`
  that writes it. Ignores modifier keys, non-left buttons,
  `target="_blank"`. Cleared when consumed or after a timeout.
- `direction.ts`: back / forward from the Navigation API `navigate`
  event (`traverse`), `popstate` fallback. Sets `type: "back"` when the
  store is empty.
- `VFXTransition.tsx`: key-based. On a new child key, keep rendering the
  old child for one frame, run `t.run(() => setShown(next))`, resolve
  after commit. Context exposes the container for page declarations.
- `useVFXTransition.ts`: `{ ref, run }`. `run` wraps the callback in a
  React 19 async action and resolves when `isPending` goes false.
- `useVFXTransitionSpec.ts`: register the page's own spec in context.
- `VFXLink.tsx`: `"use client"` wrapper that renders `as` (Next or
  react-router `Link`) with the click handler. Needed because a Server
  Component cannot pass `onClick` to `Link`.

Known gap to document: Next `loading.tsx` shows a fallback as soon as
the pathname changes, so the transition lands on the skeleton. No fix in
v1; suggest `useVFXTransition` + manual ready signal.

### 4. Docs

glide's rewrite happens in the glide repo, not here.

- docs: `docs/TRANSITION.md` (API, resolution order, router notes, what
  does not work: Astro, Turbo, htmx, MPA, nested effects freeze).
- `packages/docs` demo page; changeset for core, effects, react.

## Open questions

- Prop names on `<VFXTransition>`: `types` map now, or React's
  `enter` / `exit` / `default` names to match `<ViewTransition>` when it
  ships.
- `waitFor: "media"` watches `img` / `video` load and `fonts.ready`, not
  CSS `background-image`. Enough for v1?
- Where the output canvas sits for page-level use: `fixedCanvas` and
  `scrollPadding: false` like glide, or the default.
