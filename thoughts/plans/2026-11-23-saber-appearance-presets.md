# Saber appearance, brightness flicker and presets

1. Add display-only core intensity, whiteness and Gaussian softness. Defaults
   preserve existing output; changing appearance must not rebuild the field
   or alter the glow source. Cache optional softness independently.
2. Add deterministic brightness flicker with independent intensity, speed and
   seed. Evaluate its gain once per frame and apply to core/glow at composition,
   leaving source pixels and the existing shape-flicker control unchanged.
3. Ship ten original named presets, usable at construction or through
   setParams. Presets reset appearance consistently while retaining input,
   padding and reveal configuration. Copy all nested values per instance.
4. Add interactive controls, focused stories and a preset gallery. Update the
   public exports and agent API docs together.
5. Test compatibility, parameter independence, cache invalidation, deterministic
   flicker and preset isolation. Build, lint, check API docs and inspect actual
   WebGL output for every preset, including live switching and softness.

## Implemented

- `coreIntensity`, `coreWhiteness`, `coreSoftness`: visible core controls;
  softness is a separately cached, normalized Gaussian blur in CSS pixels.
- `flickerIntensity`, `flickerSpeed`, `flickerSeed`: deterministic brightness
  modulation, independent of shape flicker. No additional rendering passes.
- `preset`, `SABER_PRESETS`, `SaberPresetName`: ten original editable looks,
  constructor/live switching, explicit overrides and stable UI bindings.
- Storybook appearance/flicker stories, responsive preset gallery and API docs.

## Validation

- All 22 effects tests pass; effects/Storybook lint, ESM/CJS builds, CJS import,
  Storybook build and docs public-export/type/link checks pass.
- Actual WebGL checks at DPR 1 and 2: default output exactly matches the
  pre-feature baseline; every live preset matches a fresh instance exactly.
- Brightness flicker changes over time, repeats deterministically and freezes
  at speed zero. Core appearance leaves glow unchanged, and flicker leaves
  source pixels unchanged. Custom core tint works in both glow modes.
- Softness preserves sampled core energy within 1%, reduces peaks and produces
  finite output. Tracked GPU resources return to zero after disposal.
- Gallery: all ten selection buttons update controls/code; narrow layout has
  no horizontal overflow and exposes controls below the preview.

## Performance limits

Defaults retain the existing passes and use a compile-time default tint shader.
Softness adds blur work only when enabled; static soft cores are cached.
Timing matrices showed large run-to-run variation. A follow-up alternated old
and new renderers on the same WebGL context (DPR 2, 240 samples, four pairs):
GPU median differences were -1.2%, +0.4%, +9.6%, +4.9%, with baseline medians
drifting from 38.6 to 24.4 ms. These measurements do not establish a stable
speedup or rule out a small regression. Raw visual and timing results are in
the session visualization directory as `saber-appearance-*.json`.
