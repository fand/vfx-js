# gl-transitions preset adapter

Use any shader from [gl-transitions](https://gl-transitions.com/) as a
`TransitionDef`. Branch `feat/transition`. Context: [plan.md](./plan.md),
[progress.md](./progress.md).

```tsx
import { createGLTransition } from "@vfx-js/transitions";
import transitions from "gl-transitions";

const cube = transitions.find((t) => t.name === "cube")!;

<Link to="/about" onClick={transition({ transition: createGLTransition(cube) })}>
  About
</Link>
```

## Facts to verify first

The package download was blocked in this session, so the format below is
from memory. Check `node_modules/gl-transitions/index.d.ts` before coding.

- `gl-transitions` (data, MIT) is the package to use. `gl-transition` is
  the WebGL1 runtime; we replace it, so we never import it.
- Its default export is an array of
  `{ name, author, license, glsl, defaultParams, paramsTypes, createdAt, updatedAt }`.
  There are no named exports like `Cube`, so users look a transition up
  by `name`.
- Each `glsl` defines `vec4 transition(vec2 uv)` and reads
  `getFromColor(uv)`, `getToColor(uv)`, `progress` and `ratio`. The
  runtime declares `progress` and `ratio` as uniforms; the snippet does
  not. Custom params are declared in the snippet as uniforms.
- `paramsTypes` values: `float`, `int`, `bool`, `vec2`, `vec3`, `vec4`,
  `ivec2`, `sampler2D` (only `luma` uses `sampler2D`).
- uv has y up, like core's `uvContent`. The runtime samples with
  clamp-to-edge.

## 1. `createGLTransition(def, params?)` in `@vfx-js/transitions`

`packages/transitions/src/gl-transition.ts`:

```ts
export type GLTransitionDef = {
    name: string;
    glsl: string;
    defaultParams?: Record<string, unknown>;
    paramsTypes?: Record<string, string>;
};

export function createGLTransition(
    def: GLTransitionDef,
    params: TransitionUniforms = {},
): TransitionDef;
```

- Own structural type, so `gl-transitions` is not needed for types. Add
  it as a devDependency only, for tests and the demo. Never import it
  from `src/`: it is one array of ~100 shaders and cannot tree-shake.
- Returns `{ name: \`gl:${def.name}\`, frag, uniforms, ease: "linear" }`.
- `uniforms` = `defaultParams` with `params` on top. Throw a clear error
  when a param type is `sampler2D`; transition uniforms cannot be
  textures. Warn in dev on a `params` key that is not in `paramsTypes`.

### The wrapper

`frag` is built from the snippet:

```glsl
float progress;
float ratio;
vec4 getFromColor(vec2 p) { return readFrom(clamp(p, 0.0, 1.0)); }
vec4 getToColor(vec2 p) { return readTo(clamp(p, 0.0, 1.0)); }

<snippet, with `vec4 transition(vec2 uv)` renamed to `vec4 glTransition_(vec2 uv)`>

vec4 transition(vec2 uv, float t) {
  progress = t;
  ratio = resolution.x / resolution.y;
  return glTransition_(uv);
}
```

- Rename with `/vec4\s+transition\s*\(\s*vec2\s+(\w+)\s*\)/`. Throw if it
  does not match.
- Clamp reads to match the runtime's clamp-to-edge. Core returns
  transparent outside [0, 1], which would darken edges in transitions
  that sample past the frame. Clamping keeps them as authored.
- `progress` and `ratio` are plain globals set per fragment, not
  uniforms, so the core prelude stays the only place that declares
  uniforms.
- gl-transitions expect linear progress and ease themselves, so the def
  sets `ease: "linear"` (section 2).
- The snippet is GLSL ES 1.0 but uses no `texture2D` or `gl_FragColor`
  (those live in the runtime), so it compiles under `#version 300 es`.
  Local names that shadow prelude uniforms (`from`, `t`) are legal GLSL.
- `reverse` works for free: `readFrom` / `readTo` swap and `t` runs down.

## 2. Core: default uniforms on `TransitionDef`

Most gl-transitions need their params (`cube` is black with
`persp = 0`), and a WebGL uniform that is never set is 0. A def needs
to carry defaults.

- `packages/vfx-js/src/transition/types.ts`: add
  `uniforms?: TransitionUniforms` to `TransitionDef`, "defaults under the
  spec's uniforms".
- `resolveSpec` in `transition.ts`: `uniforms: { ...transition.uniforms, ...shader.uniforms }`.
- `docs/TRANSITION.md`, "Writing a `TransitionDef`": one line on
  `uniforms`.
- Unit test in `transition.test.ts`: def defaults apply; run uniforms win.

This also helps custom defs, so it is a core feature, not a
gl-transitions hack.

### Linear `t`

Core eases `t` with a smoothstep in `TransitionEffect`
(`effect.ts`, `const t = smoothstep(x)`). A def can opt out:

- `TransitionDef.ease?: "smoothstep" | "linear"`, default `"smoothstep"`.
- `ResolvedSpec` and `TransitionStartOpts` carry `ease`. In the frame
  loop, `t = ease === "linear" ? x : smoothstep(x)` (with `x` clamped to
  [0, 1]). The `t` uniform and `onFrame(t, x, dt)` both get it, so a
  driver sees the same `t` as the shader.
- `docs/TRANSITION.md`, "Writing a `TransitionDef`": `ease`.
- Unit test: a linear def gets `t === x` in `onFrame`.

## 3. Tests

`packages/transitions/src/gl-transition.test.ts` (vitest, no GL):

- The wrapper renames the function and defines `progress`, `ratio`,
  `getFromColor`, `getToColor`; the def has `ease: "linear"`.
- Whitespace variants of the signature match; a snippet without
  `transition` throws.
- `defaultParams` land in `uniforms`; `params` override them.
- `sampler2D` throws; an unknown param warns.
- With the real package: every entry of `gl-transitions` goes through
  `createGLTransition` without throwing, except the `sampler2D` ones.

Compiling cannot be tested in vitest. The landing page covers it (next).

## 4. Landing page

`packages/transition-demo/next`, Transitions page:

- A "gl-transitions" block under the presets: a `<select>` of every
  entry (skip `sampler2D` ones), the same stage and controls. Add
  `gl-transitions` to the demo's dependencies.
- Go through the whole list once in the browser and note any that log a
  compile error in `open-issues.md`.
- Getting Started: a short "gl-transitions" snippet under Vanilla.

## 5. Docs

- `docs/TRANSITION.md`, Presets: a "gl-transitions" subsection with the
  usage above, the `find` by name, `params`, the `sampler2D` limit, and
  that each transition keeps its own author and MIT license.
- `packages/transitions/README.md`: one example.
- Changeset: minor for `@vfx-js/transitions` and `@vfx-js/core`.

## Decided

- Name: `createGLTransition`, like `createSwipe`.
- `t` is linear for these defs, through `TransitionDef.ease`.
- Lookup by name (`createGLTransition("cube")`) would import the whole
  array. Users `find` by name themselves.
