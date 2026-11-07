# Transition as a class

Branch: new branch from `transition-demo-deploy`. Context: [progress.md](./progress.md),
[docs/TRANSITION.md](../../TRANSITION.md).

## Why

- A preset is a `TransitionDef` (`{ name, create() }`). Params go in
  through untyped `uniforms`, or through `createX()` factories that bake
  values into GLSL consts.
- Writing a custom transition means wrapping effects in a def.
- The Effect API is a plain interface that users implement as a class.
  Transitions should feel the same.

## Model

- A **transition** is an object that implements `Transition`. Users write it as a class.
- A spec takes either a **class** or an **instance**.
  - Class: core calls `new Class(params)` once per container. Works from
    React Server Components, because the class is a `"use client"` reference.
    One class can run in many containers at once.
  - Instance: core uses it as is. Use it to change params while it runs.
    One instance belongs to one container.
- Params are typed and go through the constructor. Spec `uniforms` is removed.

## Core API (`packages/vfx-js/src/transition/types.ts`)

```ts
export interface Transition extends TransitionEffect {
    readonly name?: string;
    ease?: TransitionEase;      // spec wins
    overflow?: true | number;   // spec wins
}

export type TransitionClass<P = any> = new (params?: P) => Transition;

export type TransitionSpec<T extends Transition | TransitionClass = Transition | TransitionClass> = {
    transition: T;
    /** Constructor params. Only with a class. */
    params?: T extends TransitionClass<infer P> ? P : never;
    reverse?: boolean;
    duration?: number;
    overflow?: true | number;
    ease?: TransitionEase;
};
```

- `TransitionRun` drops `uniforms`. It keeps `reverse`, `duration`, `overflow`.
- `TransitionDef`, `ShaderTransitionDef`, `ShaderTransitionOpts`, `TransitionUniforms`
  in the spec, and `shaderTransition()` are removed.
- `AddTransitionOpts`, `RunOpts`, `ShowOpts` follow the new `TransitionSpec`.
  Container opts and run opts merge the same way `uniforms` did today:
  a run that sets `transition` drops the container's `params`.

### `ShaderTransition<P>` base class (core)

Replaces `shaderTransition()`.

```ts
export abstract class ShaderTransition<P extends object = {}> implements Transition {
    abstract readonly name: string;
    abstract readonly frag: string;     // defines vec4 transition(vec2 uv, float t)
    params: P;
    constructor(params: P) { this.params = params; }
    /** Uniforms for this frame. Read `this.params` here. */
    uniforms(ctx: TransitionEffectContext): TransitionUniforms { return {}; }
    render(ctx: TransitionEffectContext): void; // holding blit, buildFrag, broken-shader cut
}
```

- Cache `buildFrag(frag)` per frag string (module-level `Map`), not per instance.
- Keep the broken-shader handling from `shader.ts` as is.

## Core runtime (`transition.ts`)

- `#cache` becomes `{ key, transition, slots }`.
  - Class: key = class + params. Reuse when the class is the same and the
    params are shallow-equal (arrays compared by item). Otherwise make a new one and dispose the old slots.
  - Instance: key = the instance.
- `typeof spec.transition === "function"` tells a class from an instance.
- The transition object is the only stage. Core knows nothing about stages inside it.
- `ease` / `overflow`: spec, then the transition object, then defaults.
- Instance claimed by another live handle: keep a module `WeakMap<Transition, handle>`.
  On a clash, warn once and `cut` the run. Release on run end / destroy.
- Default transition: `Crossfade` (was `crossfade`).

## Presets (`packages/transitions`)

PascalCase class per preset, no suffix. Remove `createX()` and the lowercase consts.

| Old | New | Params |
|---|---|---|
| `crossfade` (core) | `Crossfade` | — |
| `glitch` | `Glitch` | `amount`, `speed` (new uniforms; defaults keep today's look) |
| `glitchSlide`, `crosszoom`, `distortFade`, `lensDistortion`, `pixelStretch`, `slitScan`, `zoom`, `zoomBlur` | `GlitchSlide`, … | today's `createX` opts, else none. Move obvious hardcoded consts to uniforms only where trivial |
| `swipe` / `createSwipe` | `Swipe` | `direction` as a uniform (not a GLSL const) |
| `tile` / `createTile` | `Tile` | same opts; uniforms where the shader allows, else const |
| `pixelScan` / `createPixelScan` | `PixelScan` | `direction` as uniform |
| `pixelsort` / `createPixelsort` | `Pixelsort` | `direction`; composes hard cut + sort inside |
| `datamosh` / `createDatamosh` | `Datamosh` | `blockSize`; composes cut + mosh inside |
| `jpegGlitch` / `createJpegGlitch` | `JpegGlitch` | same; composes inside |
| `createGLTransition(def, params)` | `createGLTransition(def)` returns a class; `params` go to its constructor | |

- Keep each preset's look unchanged. Rule for params: continuous values and
  directions are uniforms; only values that change the shader's structure stay GLSL consts
  (and then the frag string depends on params; cache by string).
- Keep the internal hard cut as a small internal `ShaderTransition` class in `_shared.ts`.
- Multi-stage presets compose inside the class. Add an internal helper in `_shared.ts`
  that runs stages in order: own render targets via `ctx.createRenderTarget`, a ctx
  view with `src` / `target` swapped, and forwards `init` / `start` / `update` / `end` / `dispose` / `outputRect`.

## React (`packages/react/src/transition`)

- `TransitionIn` / `useTransitionIn` take the new `RunOpts`. Infer `params` from the class.
- Add `useTransitionInstance(Class, params)`: client only. Memo on class + shallow-equal params.
  Make a new instance when they change.
- `VFXTransition` props follow `AddTransitionOpts`. `setNextTransition` / Link specs follow `RunOpts`.
- Keep `live-opts` logic, but compare `params` instead of `uniforms`.

## Call sites to update

- `packages/storybook/src/Transition.stories.ts`
- `packages/transition-demo/**` (shared, next, astro, nuxt, sveltekit). The Next demo
  pages and `shader-lab` / `sources.ts` that show code must show the new API.
  `custom/page.tsx` shows how to write a custom transition: rewrite it as a class.
- `packages/transitions/README.md`, `docs/TRANSITION.md`, `packages/transition-demo/README.md`.

## Tests

- Update `transition.test.ts`, `transitions.test.ts`, `gl-transition.test.ts`, React tests.
- New core tests:
  - class → new per container; same class + equal params reuses; changed params makes new + disposes old.
  - instance used as is; same instance on two live handles warns and cuts.
  - spec `ease` / `overflow` beat the transition's own.
  - a run that sets `transition` drops the container's `params`.
- React: `useTransitionInstance` keeps identity for equal params, new one on change.

## Done when

- `pnpm run build`, `pnpm run lint`, `pnpm test` pass.
- Next demo runs every preset and looks the same as before (spot-check a few in a browser).
- No `shaderTransition`, `TransitionDef`, `createSwipe` etc. left outside old plan docs.

## Out of scope

- `setParams` to reuse an instance when class params change (always remake for now).
