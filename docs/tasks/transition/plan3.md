# Element transitions: trim the API

Remove the parts of the transition API that have no user outside glide,
and glide will move to `addTransition` instead. Branch `feat/transition`,
PR #220. Context: [plan.md](./plan.md), [plan2.md](./plan2.md),
[progress.md](./progress.md).

Decision: glide adopts `vfx.addTransition(stage, { keepWrapped: true })`.
So `keepWrapped` stays. Everything below goes.

## 1. Core: drop `AddTransitionOpts.effects`

Persistent user effects after the transition. glide does not use them; its
chain is `[TransitionEffect, ...driver effects]` only.

- Remove `effects` from `AddTransitionOpts` (`transition/types.ts`).
- `TransitionController`: the chain is `[transitionEffect, ...driverFx]`.
  `#keepWrapped` is just `opts.keepWrapped ?? false`.
- Update tests in `transition/transition.test.ts` and the `keepWrapped`
  and options sections of `docs/TRANSITION.md` (no more "forced on when
  `effects` is not empty").

## 2. Core: stop exporting the internals

`packages/vfx-js/src/index.ts` exports `TransitionEffect`,
`TransitionStartOpts`, `BODY_OFFSET`, `PRELUDE`, `buildFrag` and
`describeGlslError`. They exist for glide's old hand-rolled stage, which
goes away. Remove all six exports. Keep `crossfade` and the types in
`transition/types.ts`.

- `packages/effects/src/transitions/transitions.test.ts` imports
  `buildFrag`. Change the test to check `def.frag` declares
  `vec4 transition(vec2 uv, float t)` and drop the `void main()` check.
- `docs/TRANSITION.md`: remove the sentence that says `buildFrag`,
  `PRELUDE` and `BODY_OFFSET` are exported.

## 3. Core: drop `readOld` / `readNew` from the GLSL prelude

Only `datamosh` uses `readNew`. Keep `readFrom` / `readTo` / `inRange` and
the `reverse` uniform.

- `transition/glsl.ts`: fold the old/new reads into `readFrom` / `readTo`.
- `packages/effects/src/transitions/datamosh.ts`: the cut must land on
  the new content in both directions, so write it with the `reverse`
  uniform: `reverse > 0.5 ? readFrom(uv) : readTo(uv)`.
- `docs/TRANSITION.md`: drop the `readOld` / `readNew` bullet.

## 4. Core: `TransitionUniforms` takes the core uniform value type

`Record<string, number | [number, number]>` cannot pass a color. Use the
value type that `EffectContext.draw` accepts for `uniforms` (find it in
`types.ts`; it already covers numbers and vectors). Textures stay out.

## 5. React: trim exports and types

`packages/react/src/react.ts`:

- Stop exporting `takePending`, `markBackNavigation` and
  `watchNavigationDirection`. They stay as module internals used by
  `VFXTransition` and the store.
- Remove `VFXLink` and its file `transition/VFXLink.tsx`. The guide gets
  one paragraph instead: in a Server Component, wrap the link in a small
  client component that passes `onClick={transition(spec)}`.
- `setNextTransition(spec)` and `transition(spec)` take `RunOpts` only.
  `RunOpts` is already `Partial<TransitionSpec> & { type? }`, so the
  union with `TransitionSpec` adds nothing.
- Update `transition/store.test.ts` if signatures changed, and the React
  API section of `docs/TRANSITION.md`.

## 6. Docs

- `docs/TRANSITION.md`: apply the edits above, and check the examples
  still compile against the trimmed API.
- `docs/tasks/transition/progress.md`: add an "API trim" section, one
  line per item above, and note that glide moves to `addTransition` with
  `keepWrapped: true`.
- `.changeset/react-transition.md`: drop `VFXLink` from the list.

## Done when

- `pnpm run lint`, `pnpm test` (core, effects, react) and the
  TypeScript builds of core, effects and react pass
  (`pnpm --filter <pkg> exec tsc --noEmit -p tsconfig.esm.json`).
- Storybook story still type-checks (`pnpm --filter storybook exec tsc --noEmit`
  if the package has a tsconfig; otherwise skip).
- One commit per numbered section, plain English messages.
