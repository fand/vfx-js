# Transition API review

Changes to the transition API before release. Branch `feat/transition`.
Context: [progress.md](./progress.md), [docs/TRANSITION.md](../../TRANSITION.md).
Status: sections 1–3 done. "Other issues" still open.

## 1. Remove back navigation

`VFXTransition` marks history-back as `{ type: "back" }`, so `types.back`
is a reserved name. It also makes the spec rules uneven: a click spec wins
whole, a back mark sits under the page spec.

Remove it now. We can add it later without breaking anything.

- React
  - Delete `direction.ts` and its test.
    Drop the `watchNavigationDirection()` effect in `VFXTransition.tsx`.
  - `store.ts`: drop `markBackNavigation`, `PendingKind` and `kind`.
    The store holds a plain `RunOpts`.
  - `scope.ts`: `resolveRunOpts` becomes "click spec if any, else page spec".
  - Drop back cases from the store, scope and `VFXTransition` tests.
- Demo: drop `types={{ back: ... }}` in `transition-demo/next/app/shell.tsx`.
- Docs: drop back from `docs/TRANSITION.md`; rewrite "Which spec wins".
- Core: no change.

A back navigation still runs, with the page spec or the container defaults.

Done. Non-React demos (SvelteKit, Nuxt, Astro) keep their own back
detection; it is plain core usage.

## 2. `ease` on the spec

`ease` lives only on `TransitionDef`. It came in for gl-transitions ports,
which ease `t` themselves, so it says what `t` the shader expects.
But ease is timing, like `duration`, and users should pick it.

```ts
type TransitionEase =
    | "smoothstep"
    | "linear"
    | ((x: number) => number);

type TransitionSpec = {
    // ...
    ease?: TransitionEase;
};
```

- Order: run, `types[type]`, container, def, `"smoothstep"`.
  The def's `ease` becomes a default.
- `t` is computed in JS, so a function costs nothing extra.
- The same eased `t` goes to the shader and to JS hooks.
- Docs: smoothstep on a gl-transitions def eases twice.

Done. A function ease gets `x` clamped to 0..1.

## 3. Transitions as effects

Now a def is one mix shader (`frag`) plus optional `effects()` after it,
driven from `prepare` / `onFrame` / `onEnd`.

```
capture -> [mix: frag(from, to)] -> [effects()...]
```

Problems:

- Effects sit only after the mix. They can't see `from` or the progress,
  so the def pokes into them (`fx[0] as DatamoshEffect`).
- The mix is one pass. No multi-pass mix, no work on `from` and `to` apart.
- State across hooks goes in a `WeakMap<Effect, ...>`.
- "Pass through until `prepare`" is a rule the types don't show.

Proposal: a transition is an `Effect` that also sees the run.

```ts
interface TransitionEffect extends Effect {
    start?(run: TransitionRun): void; // was prepare
    end?(): void; // was onEnd
}
// Added to ctx during a run: ctx.from (snapshot texture),
// ctx.progress { t, x }, ctx.reverse.

type TransitionDef = {
    name: string;
    create(): TransitionEffect | TransitionEffect[];
};

// One-shader case stays short.
const wipe = shaderTransition({ name: "wipe", frag, uniforms, ease });
```

- State lives on the effect instance. No `WeakMap`, no casts.
- Multi-pass and per-side work use the normal effect API.
- `onFrame` becomes `update(ctx)` reading `ctx.progress`.

The def stays a factory, not an effect.
One def is shared through `types` and `setNextTransition({ transition })`
across containers, but an effect holds GPU resources for one container.

To decide:

- Compile timing. Calling `create()` at run start stalls the navigation.
  Keep the per-def cache ("kept while runs keep using it").
- `overflow`: maybe move to the effect's `outputRect` and drop it from the spec.
- Ports: gl-transitions go through `shaderTransition`.
  Datamosh, pixelsort and jpegGlitch become plain effects.

Done. Decisions:

- Per-def cache kept: `create()` runs once per container per def.
- `TransitionDef` keeps `ease?` as the def's default `t`.
  `shaderTransition` sets it.
- `overflow` stays on the spec and reaches effects as `run.overflow`.
  `shaderTransition` takes a def-level `overflow`; the spec's wins.
- `run.uniforms` holds the spec's uniforms only.
  `shaderTransition` merges its own defaults under them.
- `ctx.holding`: `render` also runs while the old content is held,
  so datamosh gets those frames. Shader effects pass the snapshot
  through then; they never draw at t=0. `update` runs only while playing.
- `ctx.cut()` ends the run now. A shader that fails to compile logs once
  and cuts; the broken set is keyed per GL context and shader source.
- Internals: `TransitionStage` (snapshot, hold, timing; off while playing)
  and `TransitionSlot` (wraps each effect, skips it outside a run).
- Datamosh, pixelsort and jpegGlitch subclass their `@vfx-js/effects`
  effect. jpegGlitch sets params in `render`, since the base `update()`
  takes no context.
- Lazy opts swap the chain after `cb`, during the hold. No re-capture,
  no compile at swap time, no wrong frame.

## Other issues (not decided)

- `type` is a plain `string`. Typos aren't caught; keys of `types` are not inferred.
- An unknown `type` falls back to the container defaults without a warning.
- `uniforms` come with the shader from the first level that sets `transition`.
  So `run({ type: "x", uniforms })` drops the run's `uniforms`.
