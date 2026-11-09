# Intersection transitions: plan

Implements [spec.md](./spec.md). One PR on `fix/intersection-state`, one commit per step.

## 1. Small fixes

- `types.ts`: fix the `release` doc comment. The default is `Infinity`.
- `vfx-player.ts` `#hitTest`: clamp the `enterTime` / `leaveTime` uniforms to `±1e6` before upload.
  `VFXElement.enterTime` / `leaveTime` keep `±Infinity` inside.

## 2. Visible ratio

- `rect.ts` `getIntersection`: divide each axis by `min(target size, container size)`, not the target size.
  Guard zero-size targets and containers (return 0).
- `rect.test.ts`: element smaller than the viewport (same as today), taller, wider, and both, fully in view → 1.
- This changes `intersection` and threshold results for large elements. Note it in the changeset.

## 3. State machine module

New `intersection-state.ts`, pure, no DOM:

```ts
type Phase = "hidden" | "entering" | "shown" | "leaving";

type IntersectionState = {
    phase: Phase;
    direction: 1 | -1;
    enterProgress: number;
    leaveProgress: number;
    /** Logical in/out after hysteresis. */
    isIn: boolean;
    /** Virtual time of the last step. */
    lastTime: number;
};

function createIntersectionState(now: number): IntersectionState;

/** In/out with hysteresis. `touching` keeps the `threshold: 0` rule. */
function nextIsIn(
    wasIn: boolean,
    ratio: number,
    touching: boolean,
    threshold: number,
    leaveThreshold: number,
): boolean;

/** Advance the state. Mutates and returns it. */
function stepIntersection(
    state: IntersectionState,
    isIn: boolean,
    now: number,
    duration: number,
): IntersectionState;
```

`stepIntersection`:

- `dt = now - lastTime`, then set `lastTime = now`. `dt` may be negative.
- Apply `isIn` first: set the phase and direction from the spec table.
- If that started a new enter or leave, stop here: progress starts at 0.
- Else move the current phase's progress by `direction * dt / duration`, or by `dt / duration` when `dt` is negative.
- Progress at 1 or more → next phase. At 0 or less → previous phase. Clamp to 0..1.
- `leaving` reaching 1 → `hidden`, both progress values back to 0.
- One phase change per step, from `isIn` or from progress. Drop leftover `dt`.

`intersection-state.test.ts`:

- Every row of the spec table.
- Reversal mid-enter and mid-leave keeps the progress value.
- Large positive `dt` finishes the phase; large negative `dt` rolls it back.
- `dt = 0` changes nothing.
- `nextIsIn`: a ratio between `leaveThreshold` and `threshold` keeps the previous value; `threshold: 0` uses `touching`.

## 4. Wire into the player

`types.ts`:

- `VFXProps.intersection`: add `leaveThreshold?: number` and `duration?: number`, with doc comments.
- `VFXElementIntersection`: add `leaveThreshold` and `duration`.
- `VFXElement`: replace `isInLogicalViewport` with `state: IntersectionState`. Keep `enterTime` / `leaveTime` for the legacy uniforms.
- `EffectContext`: add `enterProgress` / `leaveProgress` with doc comments.

`vfx-player.ts`:

- `parseIntersectionOpts`: `leaveThreshold` defaults to `threshold`; `duration` defaults to `1`, and a value of `0` or less falls back to `1` with a warning.
- Element creation (shader path and effect path): `state: createIntersectionState(now)`.
- Shared uniforms: add `enterProgress: 0` and `leaveProgress: 0`.
- `#hitTest`:
  - Compute `isIn` with `nextIsIn`.
  - Set `enterTime` / `leaveTime` on in/out changes of `isIn`, as today.
  - Call `stepIntersection`.
  - Shader path: set `enterProgress` / `leaveProgress` with the other uniforms.
  - Return the two values, so the effect path passes them on.
- Render loop: for a frozen element, set `state.lastTime = now`, so it resumes without a jump.
- `#renderEffectElement`: pass `enterProgress` / `leaveProgress` to `chain.run`.
- Post effect `chain.run`: `enterProgress: 1`, `leaveProgress: 0`, like `intersection: 1`.

`effect-chain.ts`, `effect-host.ts`: add the two fields to the frame input and the context, next to `enterTime` / `leaveTime`. Defaults are `0`.

Tests:

- `vfx-player.test.ts`: `parseIntersectionOpts` defaults and the `duration` fallback.
- `effect-chain.test.ts` / `effect-host.test.ts`: fix fixtures for the new fields; check that the values reach the context.

## 5. Presets

In `constants.ts`, all with `uniform float enterProgress; uniform float leaveProgress;`, and no `DURATION`:

- `warpTransition`, `pixelateTransition`: `t = enterProgress * (1. - leaveProgress)`; discard at `t == 0.`.
- `pixelateTransition`: `b = max(1., floor(t * 64.))`.
- `slitScanTransition`:
  - `enterProgress == 0.` → discard.
  - `leaveProgress > 0.` → leave wipe with `t = 1. - leaveProgress`.
  - Else, `enterProgress < 1.` → enter wipe with `t = 1. - enterProgress`.
  - With `leaveProgress` only above 0 once `enterProgress` is 1, there is no jump.
- `focusTransition`: unchanged. It gets the new ratio from step 2.

## 6. Docs and release

- `skills/vfx-js/references/shader.md`: add `enterProgress` / `leaveProgress` to the uniform list, plus `leaveThreshold` and `duration`.
- Effect docs in `skills/vfx-js/`: add the two `EffectContext` fields.
- `packages/docs/src/main.ts`: check its `enterTime` sample; switch to `enterProgress` if it shows a preset-like fade.
- Changeset for `@vfx-js/core` (minor): new options and uniforms, preset fixes, and the `intersection` change for large elements.
- `pnpm --filter docs test` to check the skill covers the new fields.

## 7. Check

- `pnpm --filter @vfx-js/core test`, `pnpm run lint`.
- Storybook "Intersection Transition": every story should now behave.
  - `ReverseMidLeave`: the image comes back from where it was.
  - `LeaveMidEnter`: the wipe turns back, no jump.
  - `PixelateDivideByZero`: one large block, no broken frame.
  - `TallElementThreshold`: enters.
  - `TallElementFocus`: sharp when it fills the screen.
- Update each story's panel text from "Bug" to "Expected", or keep them as regression stories.
- Existing "Presets" stories and docs-react examples still play enter on load.

## 8. Edge-triggered thresholds

Follow-up after step 7. See "Hysteresis" in spec.md.
`leaveThreshold > threshold` is now allowed and means "enter at `threshold` when scrolling in, leave at `leaveThreshold` when scrolling out".

- `intersection-state.ts`:
  - Add `wasAbove` / `wasBelow` to `IntersectionState`, both false at creation.
  - `nextIsIn` takes the state (or the two last flags) and follows the spec table; it updates the flags.
  - A threshold of `0` uses `touching` for `above` and `!touching` for `below`.
- `vfx-player.ts` `parseIntersectionOpts`: drop the `leaveThreshold` clamp and its warning flag.
- `types.ts`: rewrite the `leaveThreshold` doc comment: leave when the ratio falls below it; may be above `threshold`.
- Tests:
  - `intersection-state.test.ts`: every row of the spec table; a still ratio in the band keeps the state for both threshold orders; scroll in / scroll out with `threshold 0.3`, `leaveThreshold 0.5`; a big jump across both lines; the `0` threshold rule.
  - `vfx-player.test.ts`: replace the clamp test with "`leaveThreshold` above `threshold` is kept".
- `skills/vfx-js/references/shader.md`: update the `leaveThreshold` line.
- Changeset: no change needed unless it mentions the clamp.
