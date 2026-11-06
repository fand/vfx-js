# Element transitions: small fixes after review

The remaining review items. Branch `feat/transition`, PR #220. Context:
[plan.md](./plan.md), [plan2.md](./plan2.md), [plan3.md](./plan3.md),
[plan4.md](./plan4.md), [progress.md](./progress.md).

## 1. `VFXTransition` renders two divs

React removes the top host node of a deleted subtree with
`parent.removeChild(node)`. During a run, core moves the transition
target into the wrapper canvas, so the node's real parent differs from
the one React remembers and `removeChild` throws `NotFoundError` inside
React's commit. VFX-JS cannot catch it.

Fix: React deletes a node core never moves.

- `packages/react/src/transition/VFXTransition.tsx` renders
  `<div style="display: contents"><div ref className style>{rendered}</div></div>`.
  - The outer div has no box and no props besides the fixed style. React
    deletes it on unmount; it never moves.
  - The inner div is the transition target: `ref`, `className`, `style`.
    Core wraps and unwraps it inside the outer div.
- Keep SSR: both divs are rendered by React on the server. No portal.
- Comment (two lines at most) above the JSX on why there are two divs.
- `docs/TRANSITION.md`, `<VFXTransition>` section: it renders two divs;
  `className` and `style` go on the inner one, which is the target.
- No DOM test setup in the react package; typecheck and lint only.

## 2. Elements that mount inside a running transition start frozen

`freezeInside(root)` freezes only elements registered at call time. VFX
elements inside the new page register asynchronously (image load, wrap),
after the controller's second `#freeze()`, so they render on the overlay
during the run with their own shader, and non-HIC ones are hidden
(`opacity: 0`) in the container's capture.

- `VFXPlayer` keeps a set of frozen roots (`freezeInside` adds, its undo
  removes).
- When `addElement` registers an element whose ancestor is a frozen root,
  mark it `frozen` and skip hiding it (no `opacity: 0`, no clearing the
  HIC canvas). The undo for that root unfreezes it with the rest.
- Test in `vfx-player.test.ts` (follow its existing fake patterns): an
  element added under a frozen root is frozen and keeps its opacity;
  after the undo it is rendered.
- `docs/TRANSITION.md` Limits: "Nested VFX elements inside the container
  freeze during a run, including ones the new page mounts."

## 3. Warn once when a capture does not land in time

`vfx.update()` on an html-in-canvas element resolves after the `paint`
event or after `CAPTURE_TIMEOUT_MS` (300 ms), silently. On timeout the
transition starts against the old capture and the new content pops in
later.

- `requestCapture` in `packages/vfx-js/src/html-in-canvas.ts` reports the
  timeout to its caller (e.g. resolve to `boolean`, or a second
  parameter). `vfx.update()` keeps returning `Promise<void>`.
- `TransitionController` warns once per controller when the post-`cb`
  capture timed out: "[VFX-JS] transition: the new content was not
  captured in time; it may pop in during the run." Reuse the stall-warn
  pattern (`#warnedStall`) or a sibling flag.
- Test in `transition.test.ts`: a host whose `update` reports a timeout
  produces exactly one warn across two runs.

## 4. CLAUDE.md test notes

`pnpm test` runs `turbo run test`, which runs every package with a `test`
script (core, effects, react, react-vfx).

- Line "`pnpm test` - Run tests (specifically for @vfx-js/core package)"
  → "`pnpm test` - Run tests in every package that has them (core,
  effects, react, react-vfx)".
- Line "Core package uses Vitest for testing" → "Packages use Vitest for
  testing".

## 5. Progress notes

`docs/tasks/transition/progress.md`: add a "Small fixes" section, one line
per item above.

## Done when

- core and react: test, lint, `tsc --noEmit -p tsconfig.esm.json` pass.
  Root `pnpm run lint` passes. Storybook `tsc --noEmit` passes.
- One commit per numbered section, plain English messages.
