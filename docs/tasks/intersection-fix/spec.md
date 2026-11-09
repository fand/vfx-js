# Intersection transitions: state machine

Fix the enter/leave presets (`warpTransition`, `slitScanTransition`, `pixelateTransition`, `focusTransition`) and the timing behind them.

## Problems

- A reversal makes the picture jump.
  - Leave, then enter again mid-leave: `enterTime` resets to 0, so the element vanishes at once and enters from the start.
  - `slitScanTransition`: leave mid-enter jumps to the leave branch at `1 - t2`, so the element is almost fully shown for a frame.
- The timing follows the virtual clock.
  - `timeScale = 0` keeps `enterTime` at 0, so presets discard forever and the element stays hidden.
  - Negative `timeScale` or `setTime` back in time make it negative, with the same result.
- `pixelateTransition` divides by zero when `t < 1/64` (`b = 0`). On 120Hz+ screens one frame can show a broken picture right after enter and at the end of leave.
- `intersection` cannot reach 1 when the element is taller (or wider) than the viewport.
  - `focusTransition` stays blurred and dim.
  - A `threshold` above `viewport / element` never fires enter.
- At the threshold, small scrolls flip enter and leave back and forth.
- Docs say `release` defaults to `0`; the code uses `Infinity`.
- `enterTime` / `leaveTime` can be `±Infinity` in uniforms.
- Presets hard-code `DURATION 1.0`.

Out of scope: leave not showing with default options. With `intersection.rootMargin` set it works as intended.

## Design

### State

Each element keeps an intersection state, inside core only:

- `phase`: `hidden` | `entering` | `shown` | `leaving`
- `direction`: `1` (forward) or `-1` (playing the current phase backward)
- `enterProgress`, `leaveProgress`: linear, 0 to 1

`isIn` comes from the viewport test with hysteresis (see below).

### Transitions

A reversal plays the current phase backward from where it is. It never switches to the other phase mid-way. Same idea as WAAPI `Animation.reverse()`.

| phase | `isIn` | result |
|---|---|---|
| `hidden` | true | `entering`, forward |
| `entering` forward | false | `entering`, backward |
| `entering` backward | true | `entering`, forward |
| `entering` forward | reaches 1 | `shown` |
| `entering` backward | reaches 0 | `hidden` |
| `shown` | false | `leaving`, forward |
| `leaving` forward | true | `leaving`, backward |
| `leaving` backward | false | `leaving`, forward |
| `leaving` forward | reaches 1 | `hidden`, both progress reset to 0 |
| `leaving` backward | reaches 0 | `shown` |

Values seen by shaders:

| phase | `enterProgress` | `leaveProgress` |
|---|---|---|
| `hidden` | 0 | 0 |
| `entering` | 0..1 | 0 |
| `shown` | 1 | 0 |
| `leaving` | 1 | 0..1 |

A symmetric shader can use `t = enterProgress * (1. - leaveProgress)`.

Each frame, the progress of the current phase moves by `direction * dt / duration` and is clamped to 0..1.
A large `dt` (e.g. back from a hidden tab) just finishes the phase.

### Clock

The state machine uses wall-clock `dt`, not the virtual clock.
`timeScale` and `setTime` change only `time`, not enter/leave.

### Hysteresis

- `threshold` is the enter threshold.
- New `leaveThreshold` is the leave threshold. It defaults to `threshold`, so current behavior stays.
- `isIn` turns true when the ratio reaches `threshold`, and false when it drops below `leaveThreshold`.
- With `threshold: 0`, keep the current "adjacent counts as in" rule.

### Visible ratio

The ratio for `threshold` / `leaveThreshold` and the `intersection` uniform divide by `min(element size, viewport size)` on each axis, so a large element can reach 1.
This changes `intersection` values for large elements. Note it in the changeset.

### Rendering

`isVisible` stays as is: in the viewport (with overflow) and within `release`.
Frozen elements skip `step`. On unfreeze, they continue from the stored state with a fresh `dt`.

## API

```ts
intersection?: {
    threshold?: number;
    /** Ratio below which the element leaves. Defaults to `threshold`. */
    leaveThreshold?: number;
    rootMargin?: MarginOpts;
    /** Seconds for enter and leave. Default `1`. */
    duration?: number;
};
```

New uniforms (shader path) and `EffectContext` fields (effect path):

- `enterProgress: number`
- `leaveProgress: number`

`phase` and `direction` are not exposed. Add a `direction` uniform later if a shader needs to tell a reversal apart.

`enterTime` / `leaveTime` keep their current meaning (seconds since the last logical enter/leave), so custom shaders do not change.
They switch to the hysteresis-based in/out, which matches today when `leaveThreshold` is unset.
Clamp them to a finite value (e.g. `±1e6`) before upload.

## Presets

- `warpTransition`, `slitScanTransition`, `pixelateTransition`: read `enterProgress` / `leaveProgress` instead of `enterTime` / `leaveTime`; drop `DURATION`.
- `slitScanTransition`: entering uses `enterProgress`, leaving uses `leaveProgress`; no branch jump.
- `pixelateTransition`: `b = max(1., floor(t * 64.))`.
- `focusTransition`: keeps `intersection`, which now reaches 1 on large elements.

## Other fixes

- `release` docs: default is `Infinity`; fix the doc comment.

## Implementation

- Pull the state machine out of `#hitTest` into a pure function in a new file, e.g. `intersection-state.ts`:
  `step(state, isIn, dt, duration) → state`.
- Replace `enterTime` / `leaveTime` / `isInLogicalViewport` on `VFXElement` with the state object (keep the two times for the legacy uniforms).
- Add `enterProgress` / `leaveProgress` to the default uniforms and to the chain frame input.
- Update `skills/vfx-js/` for the new options and fields.

## Tests

- `step`: every row of the transition table.
- Reversal mid-enter and mid-leave: progress continues from the same value, no jump.
- Large `dt` finishes the phase.
- Hysteresis: a ratio between `leaveThreshold` and `threshold` does not flip the state.
- Visible ratio reaches 1 for an element taller than the viewport.
- `timeScale = 0` still runs enter/leave.

## Open questions

- Option names: `leaveThreshold` vs `threshold: [enter, leave]`.
- Separate durations for enter and leave (`duration: number | [enter, leave]`)?
- Should an element already in view on `add` start in `shown` instead of `entering`? Keep `entering` for now (current behavior).
