# AE Saber combustion comparison

Actual renders from the installed Video Copilot Saber in After Effects 2025.
Our Fire/Embers are substantially simpler: smooth displaced glow and mostly
intact outlines, versus AE's detailed core deformation, localized brightness
and textured surrounding glow. They are original looks, not preset ports.

## Reproduction

- JSX runs through AE's `DoScript` command. Setting the Preset property really
  changes the other parameters; this was checked before rendering.
- Installed preset list: Fire (10), Burning (4), Firestorm (11), Inferno (23).
  No preset named Embers exists in this installed version.
- 960 × 540, Helvetica-Bold 160 px, centered “Saber”. AE uses Text Layer core.
  Its source-only RGBA render is the exact bitmap fed to our WebGL fixture.
  AE still generates native text contours; our renderer extracts bitmap edges.
- Raw preset output: `NAME-2.png`, `NAME-2_5.png`, plus complete settings TSVs.
- Display comparison: only AE Core Size = 2 and Glow Intensity = 20 are changed.
  This prevents raw Fire/Firestorm from obscuring the text with clipped light.
  Color, distortion, halo, noise and other preset settings remain unchanged.
- Our Fire/Embers retain their appearance settings. Harness uses source=false,
  pad=0 and DPR=1; the full-frame source already supplies ample blank margins.
- Animation: 24 samples, t=2 through 3.9167 seconds, 12 fps; replay is not a
  seamless simulation loop. Both web captures reported GL error 0.
- This is a visual comparison, not pixel parity or a performance benchmark.
  AE project uses 16 bpc; WebGL final output is 8 bit. No exposure/color-space
  matching was attempted. No additional particle effect was used in AE.

## What the installed presets actually use

| Preset | Glow distortion / composite | Core distortion | Noise complexity, glow/core | Original core size / glow intensity |
| --- | --- | --- | --- | --- |
| Fire | Energy / Multiply, amount 101 | Fluid, amount 20 | 7 / 7 | 10.3 / 36 |
| Burning | Fluid / Multiply, amount 94.1 | Fluid, amount 8 | 6.64 / 7.19 | 2.4 / 37 |
| Firestorm | Smoke / Distortion, amount 68 | Fluid, amount 4 | 7 / 7.19 | 1.3 / 156 |
| Inferno | Fluid / Multiply, amount 137 | Fluid, amount 40 | 7 / 7.19 | 5.8 / 118 |

AE and our numeric units/algorithms differ; these numbers are not directly
transferable. All four AE presets use Glow Pre Gamma 0.81 and brightness
Flicker Intensity 0. Their motion comes from spatial distortion, not global
brightness flicker. All use nonzero glow/core distortion motion blur.

## Concrete gaps and next priorities

1. **Preset structure.** Our Fire uses Fluid/displacement glow and no core
   distortion; AE Fire uses Energy/multiply glow and strong Fluid core
   distortion. Start by exploring those existing controls together. Embers
   likewise has no core-distortion configuration or independent particles.
2. **Spatial detail.** Our default noise complexity is 3. The fluid/smoke glow
   branch attenuates successive detail bands by 0.35 and adds 15% undistorted
   light. This intentionally smooths the result, but weakens combustion detail.
   AE visibly retains fine broken edges, streaks and localized bright pockets.
   This is observed behavior, not a claim about AE's private shader algorithm.
3. **Core/halo composition.** AE exposes Halo Intensity/Size and core distortion
   Blend on Top; our public API lacks those independent controls. Fire/Inferno
   disable Blend on Top, while Burning/Firestorm enable it. These are more
   useful fidelity targets than simply raising global flicker or glow gain.
4. **Temporal detail.** Consider optional distortion motion blur after spatial
   fidelity improves; preserve the cheap default. AE's settings alone do not
   establish what sample count or algorithm it uses internally.

Fire looks granular and torn; Burning keeps a readable outline with a burning
fringe; Firestorm creates tall streaks; Inferno heavily deforms the lettering.
AE can also look like simple glowing outlines when core size and glow gain are
too low (the separate `*-readable-2.png` diagnostic uses 0.8 / 10). Thus preset
tuning and rendering capability both matter.

## Artifacts

Directory:
`/Users/amagi/.codex/visualizations/2026/11/23/01a20783-0a8f-7b73-be3b-6e38ec7e2c4d/ae-saber/`

- `comparison.png`, `comparison.webp`: six-way still/animation.
- `Fire-settings.tsv`, `Burning-settings.tsv`, `Firestorm-settings.tsv`,
  `Inferno-settings.tsv`: raw installed preset settings.
- `reproduce-render.jsx`, `reproduce-display.jsx`: setup and rendering scripts.
- `source.png`, individual PNG sequences, animation WebPs and `manifest.json`.

No effect implementation or preset parameters were changed in this comparison.

## Eleven-preset animation follow-up

The subsequent implementation uses installed AE Saber animation exports for:

| AE preset | Web preset | Motion / structure |
| --- | --- | --- |
| Arc Reactor | `arc-reactor` | Blue retained outline; opposing core/glow transport |
| Burning | `burning`, alias `embers` | Retained warm outline; fast rising Fluid core fringe |
| Electric | `electric` | Cyan Energy core and rising Smoke distortion |
| Energy | `energy` | Soft amber core and rising Fluid glow |
| Fog | `fog` | Soft cyan core and slow Energy glow |
| Kryptonite | `kryptonite` | Green tangled core; drifting Fluid wisps |
| Fire | `fire` | Directional Fluid core; rising Energy/multiply fractal density |
| Torch | `torch` | Steady warm core; rising Fluid glow |
| Tractor Beam | `tractor-beam` | Narrow vertical streaks; fast upward haze |
| Windy | `windy` | Descending core deformation against rising blue haze |
| Wormhole | `wormhole` | Blue tangled core; drifting Fluid wisps |

AE spells the requested “Traktor Beam” as **Tractor Beam**. The remaining
`neon`, `plasma`, `ice`, `toxic`, `spectral`, `laser`, `unstable` are original
recipes, not claims of matching named AE presets.

### Reference capture

Artifacts live in
`/Users/amagi/.codex/visualizations/2026/11/23/01a20783-0a8f-7b73-be3b-6e38ec7e2c4d/ae-saber-11/`.

- 960×540, 24 fps, 72 frames, AE times 1 through 3.958333 s. Not seamless loops.
- Shared AE-generated Helvetica-Bold text alpha (`source.png`).
- Each `*-raw.mp4` preserves the preset, with text-core input and composite mode
  selected. Each `*-display.mp4` overrides only Core Size = 2 and Glow Intensity
  = 20, exposing structure without changing motion parameters.
- Each `*-web.mp4` renders the same alpha/time range through production WebGL.
- `settings.json` / TSV preserve AE property values; JSX and a separate AEP
  preserve setup. `compare.html` offers synchronized playback, seeking and
  reference selection. All 33 clips were checked for dimensions/frame count.
- AE `saveFrameToPng` queues asynchronous work: completion was checked against
  the actual 72 files per sequence, not the JSX completion log alone.

### Implementation

`glowFlow` extends the glow envelope in the wind direction with three weighted
samples inside the existing distortion pass. `windSpeed` transports the noise;
`noiseSpeed` evolves its shape. Negative wind reverses transport and the trail.
Zero flow retains the original render path. Wide protected halo layers stay
symmetric. These controls are spatial reach, velocity and evolution respectively;
flow is not a particle simulation or temporal feedback.

Nonzero-detail Fluid/Smoke glow now uses the full fractal field. Fire retains
four octaves and a relatively weak, broad density glow. `directionality` projects
displacement onto the wind axis. For a steady single core, nonzero directional
detail uses warped distance-field coverage, avoiding missing subpixel streaks
without another pass. Reveals and multi-line shapes keep raster sampling.

Storybook exposes all eleven references first, other recipes separately.
`embers` remains a Burning alias. Public fields and preset names are documented
in the repository skill reference.

### Verification and limits

- 27 Node tests passed; ESM/CJS builds, effects lint, TypeDoc, docs API/skill
  checks and Storybook build passed. All eleven Storybook buttons were exercised.
- Production WebGL tests: 12 signed transport cases, 2 directional-envelope
  cases and 22 preset animation/determinism/freeze cases passed at DPR 1/2.
- Default pixel compatibility remains exact; 19 live preset switches match
  fresh instances. Bounds, halo independence and GPU disposal checks passed.
- Thin directional-core error against a 4× reference fell from 0.434 to 0.205
  at DPR 1 and from 0.388 to 0.083 at DPR 2 (relative absolute error).
- Fire benchmark, 960×540/DPR 1, 3 alternating runs of 120 frames: median of GPU
  medians 2.81 ms old renderer versus 2.96 ms new renderer. Both received the
  same four-octave recipe; the old renderer ignores the new flow/directionality
  fields. Run variation overlaps; this is a desktop observation, not a mobile
  performance guarantee. The last velocity-only recipe adjustment was subsequent
  to that measurement and does not add shader work.

These are reference-based approximations. AE's private fractal construction,
motion blur, core filtering and final gamma/brightness are not identical.
Energy and Fog's structure exports saturate substantially more than our readable
recipes; Fog is tuned against the raw export. Global frame correlation is saved
as an exploratory diagnostic only: fixed text envelopes and changing noise bias
its apparent velocity, so it is not ground-truth optical flow or evidence of
exact speed parity. The shader transport checks establish direction and units.

## Refinement: compare components, not just preset names

The earlier recipes above underrepresented broad glow and saturation. This
revision targets the same `display` reference for all eleven presets; the
previous description of deliberately readable Energy/Fog exposure is superseded.
The comparison page now retains the previous videos alongside AE and current
WebGL output, synchronized over the same three seconds.

### Additional AE evidence

Using JSX against the saved AE project, exported core-only frames at 1, 2 and
3 seconds, then isolated core distortion, retained-core overlay and softness.
Files live beside the existing captures in `<preset>-core/`: `000.png`,
`024.png`, `048.png`, `steady.png`, `full-steady.png`, `no-blend.png`; selected
presets also have `no-softness.png` and Fire/Burning have bias sweeps.

On this source, native Core Softness 25 resembles a Gaussian sigma around
11.5 px in the core-only image. Setting it to zero changes the visible core
substantially without a comparable change in broad glow. These measurements
describe this fixture, not a universal conversion between AE and CSS units.
Core Blend On Top retains an original outline. Fire's high native core bias
leaves calm stretches between turbulent patches. None of these ablations
reveals AE's private shader or establishes its exact blend/noise equations.

### Changes

- Detailed Fluid glow uses fBm without the extra domain warp, reducing the
  marbled appearance and two simplex evaluations per field. Detailed core keeps
  domain warping; high Fluid bias gates turbulence into moving pockets.
- Fine detail controls octave spacing and moderate gain; density glow keeps
  diminishing fine bands. Fire still uses four octaves in both groups.
- Steady single outlines use analytic warped-distance coverage whenever detail
  is enabled, including free-direction distortion. Retained original cores now
  respect display softness, with their static blur cached separately.
- Broad glow can move with `glowDistortAllLayers`; the independent halo remains
  smooth. Tractor Beam protects its wide background layers. `glowWhiteness`
  separates glow tint from core/halo; optional linear clipping reproduces hard
  highlight saturation without changing the default exponential curve.
- Optional shutter integration uses two endpoint noise fields and five light
  samples. It approximates displacement over a shutter, without feedback or
  frame history. Only Fire and Tractor Beam enable it in the final recipes;
  applying it to slow cores cost more than the visible benefit justified.
- Rebalanced all eleven recipes against the captured images: larger electrical
  structures, calmer Burning outlines, broad Fire glow, Energy/Fog's bright
  centers, smooth Tractor Beam background and restrained Windy haze.

### Limits

AE's exact noise topology, dotted Fire trails, fine branching, colour pipeline
and temporal integration still differ. Coarse image fitting was exploratory;
it could erase important outlines and is not used as proof of visual fidelity.
The saved comparison videos are the review artifact. Shutter timing is a local
approximation, not a native AE shutter-angle conversion.

### Validation of the refinement

30 Node tests pass, covering the new composition controls, softened original
overlay cache, shutter invalidation/clamping and all-layer distortion toggles.
Production WebGL checks pass: 12 signed transport cases, 2 envelope cases,
22 preset animation/seek/freeze cases, 4 shutter cases and all 19 live preset
switches. Default-image differences are at most one 8-bit step. Tracked GPU
objects return to zero. The thin-core supersampling check remains unchanged
(relative error 0.205/0.083 at DPR 1/2 versus raster 0.434/0.388).

One dense diagnostic run hit Chrome's active-context limit and evicted its
long-lived fixture. The console reported context exhaustion; a standalone
rerun passed. The fixture now yields for pending context-loss events before
creating another context. The complete final checks then passed without that
failure. This test-harness change does not affect production rendering.

ESM/CJS, effects lint, Storybook build, TypeDoc and docs API/skill checks pass.
All eleven updated WebGL clips contain 72 frames at 960×540/24 fps, using the
unchanged AE text source and time interval. `before-refinement/` preserves the
previous clips. Detailed results are in `refinement-checks.json` beside them.

Final GPU comparison uses the preceding implementation and its recipes versus
the final implementation and recipes, with identical AE source, 960×540/DPR 1,
120 frames, 24 warmup frames, batch 1, three alternating repetitions. Median of
run medians (ms):

| Preset | Before | After |
| --- | ---: | ---: |
| Fire | 5.17 | 3.30 |
| Burning | 4.55 | 4.21 |
| Energy | 3.77 | 4.81 |
| Tractor Beam | 5.41 | 2.95 |

All 24 runs had zero GL errors. Run-to-run variation is substantial (e.g.
Tractor Beam before 3.03–5.63 ms), so this does not establish a general speedup.
Energy's final run set is more expensive; the overall result is not uniformly
faster. These are desktop measurements, not mobile guarantees. The shader keeps
four Fire octaves, skips unnecessary micro-softness passes, and avoids full
temporal accumulation. Full samples: `refinement-performance.json`.

### Fire glow correction after visual review

The first follow-up only reduced glow gain and increased its size multiplier;
the strong independent halo still filled the lettering with saturated orange.
Separating core, halo and glow exposed this mistake (`fire-light-components-before.png`).
The corrected recipe reduces halo intensity from 0.85 to 0.18, widens its radius
from 12 to 18 px, redistributes glow into radii 6/25/60/110 px, and uses larger,
less elongated density noise (scale 260, aspect 1.4, bias 1.15, amount 24).
The accepted core distortion, including bias 1.55, is unchanged; both noise
groups still have four octaves.

Six matched times (frames 0/12/24/36/48/60) now show a visible change: mean
display-encoded luminance within 12 px of the source contour drops from 0.650
to 0.540. The light fraction beyond 40 px increases from 6.2% to 16.9%, compared
with AE's 19.7%. Luminance-weighted contour distance increases from 11.6 to
20.5 px (AE: 22.8 px). These descriptive profiles include core and halo, use
compressed video for the previous version, and do not establish perceptual
or noise-topology equivalence. See `fire-light-profile.json` and the three-way
still `fire-light-comparison.png`.

The comparison page's Fire Before clip now shows the immediately preceding
glow adjustment. Other presets retain their original comparison baselines.
The updated Fire clip has 72 frames/24 fps. 30 Node tests and Storybook build pass.


## Original-preset appearance correction (2026-11-24)

The preceding eleven-preset calibration used the structure-oriented display
exports (Core Size 2 / Glow Intensity 20). That is a different target from the
native presets: Fog was overexposed, while Burning and Tractor Beam were too
weak. This revision uses the existing `*-raw` PNG sequences for ten AE-derived
recipes. Fire keeps its separately approved appearance; Embers remains Burning.
The seven original VFX-JS recipes and shared production shaders are unchanged.

Changes are recipe-only: exposure/color, core softness and brightness, halo,
layer radii/gain, and spatial distortion scale/amount/bias. Tractor Beam now
moves its broad haze with `glowDistortAllLayers`. Transport clocks and octave
counts remain unchanged. Storybook ranges accommodate the stronger presets.

### Independent-time comparison

Both renderers receive the same exported source alpha, 960×540/DPR 1, with
160 px overscan and an identical viewport crop. Baseline is commit `6ee04908`.
Tuning used AE times 1/2/3 s. The final evaluation uses six other times:
1.25/1.75/2.25/2.75/3.25/3.75 s. Each frame is reduced to 8×8 RGB block means;
relative RMS error compares temporal means, normalized by reference energy.
Variance ratio compares temporal RGB variation energy (1 means equal energy).
These are display-encoded image summaries, not perceptual match percentages
or evidence of identical noise topology, phase or motion direction.

| Preset | RGB error before → after | Temporal variance ratio before → after |
| --- | ---: | ---: |
| arc-reactor | 0.392 → 0.219 | 0.414 → 0.631 |
| burning | 0.398 → 0.146 | 0.494 → 1.313 |
| electric | 0.225 → 0.115 | 0.480 → 0.859 |
| energy | 0.263 → 0.120 | 0.914 → 0.927 |
| fog | 0.712 → 0.117 | 0.530 → 0.691 |
| kryptonite | 0.418 → 0.194 | 0.504 → 0.868 |
| torch | 0.331 → 0.123 | 0.170 → 0.936 |
| tractor-beam | 0.584 → 0.118 | 0.473 → 0.721 |
| windy | 0.576 → 0.154 | 1.123 → 1.141 |
| wormhole | 0.380 → 0.157 | 0.499 → 0.818 |

Fog loses its white clipping while retaining a cyan contour and haze.
Burning/Embers, Kryptonite, Torch and Wormhole regain luminous body; Tractor
Beam gains broad animated haze. The original AE Energy is itself heavily
clipped. Fine noise topology and local brightness distribution still differ,
especially in the tangled cores and broad Tractor Beam haze.

### Verification and artifacts

- Effects: 31 Node tests; ESM/CJS builds; changed-file Biome checks.
- Focused Storybook TypeScript check; core TypeDoc and docs API/skill checks.
- Browser: all 19 live preset switches, composition/flicker/source/softness/
  disposal checks, and eleven-preset motion/seek/freeze checks pass.
- Fire plus seven original recipes: 64 frame comparisons across four times
  and DPR 1/2, byte-for-byte unchanged. No production core-library changes.
- The fixture now releases detached WebGL capability-probe contexts after
  VFX construction. Yielding for renderer teardown alone did not eliminate
  Chrome context eviction in large matrices. All final matrices pass.

Local artifacts (ignored): `packages/effects/node_modules/.cache/saber-raw/`.
`compare.html` offers AE original / before / after playback, defaulting to Fog.
Fire explicitly uses the older structure reference and identical before/after
clips. Twenty-one new MP4s have 72 frames at 960×540/24 fps. `results/` contains
PNG sequences, `final-0.png` / `final-1.png` contact sheets, calibration traces,
`validation-six-times.json`, and `regression.json`. The `ae` symlink points to
the existing `ae-saber-11` export directory above. Serve this directory over
HTTP; the comparison uses no server-side processing.

### Rendering cost

Desktop Chrome, shared host/source, 640×400/DPR 1, 160 px overscan;
90 samples after 30 warmup frames, three alternating repetitions. GPU median
of run medians, milliseconds. Timing includes the complete effect. Batch 4
measures throughput; batch 1 measures ordinary one-render-per-frame behavior.
Every run reported GL error 0.

| Preset | Before / after, batch 4 | Before / after, batch 1 |
| --- | ---: | ---: |
| arc-reactor | 1.96 / 2.07 | 2.92 / 3.04 |
| burning | 1.88 / 2.65 | 2.08 / 3.63 |
| electric | 2.57 / 3.06 | 3.89 / 4.63 |
| energy | 2.68 / 2.75 | — |
| fog | 2.88 / 3.02 | — |
| kryptonite | 2.63 / 2.79 | — |
| torch | 0.78 / 0.73 | — |
| tractor-beam | 2.64 / 2.36 | 3.60 / 2.52 |
| windy | 3.27 / 3.10 | — |
| wormhole | 2.38 / 2.77 | — |
| fire | 2.42 / 2.44 | 2.51 / 2.52 |

Tiny core softness on Arc Reactor and Tractor Beam was removed after it added
blur passes without improving held-out image error. Burning retains the more
expensive softened core because it materially improves its luminous body.
This is a quality/cost tradeoff, not a claim of unchanged performance for all
presets. Fire is an unchanged control. These measurements are device-specific,
with run-to-run variance; they do not establish mobile performance. Full
samples: `results/performance.json` and `results/performance-frame.json`.


## Glow texture and evolution follow-up (2026-11-24)

User review requested smoke-like Burning, finer/broader Fog, evolving clouds
for Kryptonite/Torch/Wormhole, a wider Torch, bluer Tractor Beam, and more
complex Windy without changing its color/envelope. This follow-up tunes only
those seven recipes (plus the Burning/Embers alias). All core distortion
settings and shared shader code remain unchanged.

- Burning: Smoke/multiply density, stronger local modulation, slower drift
  and faster evolution. Its existing luminous core is retained.
- Fog: Fluid/multiply over larger layers; lower independent halo avoids
  masking the fine fractal field. A high-contrast Smoke trial was rejected
  because it produced clipped granular spots.
- Kryptonite/Wormhole: larger Smoke fields, wind reduced from 15 to 5 px/s,
  evolution increased from 0.125 to 0.65/0.7. Torch uses the same evolving
  cloud character, retains upward transport at 42 px/s, and has broader light.
- Tractor Beam: blue tint `#5795ff`, less white in the glow.
- Windy: four rather than two glow octaves, more fine detail/evolution;
  its color, intensity, layer radii/gains, bias and halo settings are unchanged.

### Observations and verification

Same source/crop/time as above. At t=2, light outside the source bounding box
expanded by 20 px grows from 3.6% to 9.8% for Fog and 6.4% to 24.6% for Torch.
Windy's luminance-weighted vertical RMS radius changes from 100.7 to 100.0 px;
its visible envelope remains approximately the same. These are descriptive
single-frame measurements, not AE-equivalence or exact support guarantees.

To distinguish shape evolution from scrolling, freeze core animation, remove
visible core/halo, set glow wind to zero, and compare three 0.5 s intervals.
Normalized RMS glow change (with zero wind):

| Preset | Before | After |
| --- | ---: | ---: |
| burning | 0.025 | 0.405 |
| fog | 0.037 | 0.642 |
| kryptonite | 0.094 | 0.244 |
| torch | 0.080 | 0.310 |
| wormhole | 0.132 | 0.285 |

Stopping evolution too gives byte-identical frames in all seven cases.
The old presets already evolved, but their shape changes were weak relative
to transport. The new settings strengthen billowing/evolution; they do not
implement a fluid simulation or reproduce AE's proprietary noise.

31 Node tests and ESM/CJS builds pass. Browser appearance, all 19 preset
switches, motion/seek/freeze and disposal checks pass. Eleven untouched recipes,
including Fire, match the preceding revision exactly across 88 comparisons
(four times, DPR 1/2). Preset inspection confirms every core-distortion group
and Windy's color/envelope parameters are unchanged.

Artifacts remain under the ignored `saber-raw` directory above:
`glow-compare.html` compares AE / immediately preceding appearance / new Glow;
`results/glow-*.mp4` and PNG sequences contain 72 frames at 960×540/24 fps.
The old comparison page and clips remain available. `baseline-glow/` freezes
the preceding built renderer; `glow-options.json` records this follow-up's
parameter overrides. `results/glow-metrics.json` and `glow-checks.json` contain
measurements and full validation output.

GPU check: same 640×400/DPR 1 fixture as above, batch 1, 80 samples after 25
warmup frames, three alternating repetitions. No additional render passes;
Windy evaluates two extra glow-noise octaves, while Fog's multiply branch
needs only one scalar fractal field. Median of GPU medians, milliseconds:

| Preset | Before | After |
| --- | ---: | ---: |
| burning | 3.53 | 3.54 |
| fog | 2.95 | 2.67 |
| kryptonite | 4.88 | 3.89 |
| torch | 1.23 | 1.22 |
| wormhole | 3.74 | 3.80 |
| tractor-beam | 2.54 | 3.00 |
| windy | 3.91 | 4.00 |
| fire | 2.51 | 2.76 |

All 48 runs report GL error 0. The unchanged Fire control varied by about 10%;
treat these as device-specific samples, not general speedup guarantees.
Tractor Beam changes only composition tint yet also varies, underscoring
measurement noise. Full measurements: `results/glow-performance.json`.


## Glow transport verification and correction (2026-11-24)

Image-variance checks from the preceding tuning established animation, not
matching motion. This revision inspects the exported AE Glow outside the core,
including motion at different spatial scales. The lowest tracking patches can
include a displaced core fringe; these are not semantic segmentations. Fire uses the structure/display
reference (Core Size 2 / Glow Intensity 20, original motion settings); Arc
Reactor and Wormhole use raw preset PNGs. The reference files are unchanged.

### Motion evidence

Use all 72 frames, downsample 2×, form Gaussian difference bands with sigma
2/6/14 source pixels, and match 36×36 source-pixel patches above the text over
four-frame intervals. Keep correlation ≥0.55 and reject search-boundary hits.
Frame starts are 0/8/…/56; results have 12 px/s displacement quantization.
Median vertical motion in px/s (negative means up), fine / medium / coarse:

| Preset | AE | Before | After |
| --- | --- | --- | --- |
| Fire | -84 / -72 / -48 | -72 / -72 / -48 | -84 / -72 / -36 |
| Arc Reactor | -60 / -48 / -24 | -36 / -24 / -12 | -60 / -48 / -48 |
| Wormhole | -24 / -24 / -12 | -12 / -12 / -12 | -24 / -12 / -12 |

These are local feature-tracking diagnostics, not exact noise velocities or
proof that AE uses particular blur layers internally. Stationary light
attenuation, deformation, occlusion and evolution affect the estimates; the
sample sets differ between renderers. The full distributions remain in
`results/motion-final-analysis.json`. Coarse-scale Arc Reactor motion still
differs from AE. Pixel/noise topology parity is not claimed.

The existing WebGL fBm applied the same wind translation to every octave.
AE's Fire exhibits a broader range of upward motions, with finer features
moving faster; Arc Reactor visibly has rising smoke rather than a largely
smooth envelope. The first revised Fire was too fast at fine scales and was
slowed after remeasuring the output, rather than only testing its clocks.

### Implementation

`noiseTurbulence` is an opt-in distortion-group control (0..1, default 0).
It interpolates from uniform wind to octave multipliers 0.6/0.9/1.2/1.5,
with later octaves capped at 1.8. These are noise octaves, not the four blurred
Glow layers. Fire uses four octaves, strength 1, wind 64 px/s: nominal transport
38.4/57.6/76.8/96 px/s. Its core and weak/broad glow recipe remain unchanged.

Fluid/Smoke glow also receives a gentle coarse evolving domain warp, using
two extra noise samples in the existing distortion pass. Arc Reactor uses
rising Smoke/multiply density with a visible broad envelope; Wormhole retains
Smoke's billowing appearance while gently bending its field. Both use strength
0.65. A stronger domain warp was rejected because it produced long streaks.

The feature compiles as a separate shader variant. Zero strength preserves
legacy arithmetic and register usage; other looks do not inherit its changes.
The new field participates in distortion caching, clamping and Storybook
controls. No distortion render pass or temporal simulation was added.

Fog and Torch are restored to the recipes immediately before the preceding
Glow follow-up. Windy's geometry/noise, halo and broad glow are retained.
Reducing its deformation merely moved its bright knots; instead its core gain
is 0.22 (was 0.3), whiteness 0.12 (was 0.267). Across 144 frames over 12 seconds,
the maximum count of pixels with mean RGB >200 falls from 1153 to 0, and the
maximum mean RGB falls from 222.7 to 195.3. This suppresses bright white knots
without changing the glow's color, layer radii or noise parameters.

### Validation and review

32 Node tests pass, including static glow-cache invalidation and strength
clamping. ESM/CJS builds, changed-file Biome, focused Storybook TypeScript,
TypeDoc and docs API/skill checks pass.

Browser checks pass: all 19 live preset switches, appearance/disposal,
transport/envelope, preset seek/freeze, and a new per-octave velocity probe.
The probe isolates coarse/fine bands of the production fBm, uses frozen
evolution and signed winds at DPR 1/2, and checks their distinct translated
positions. It rejects non-finite samples rather than silently passing them.
Thirteen untouched recipes match the preceding renderer byte-for-byte over
104 frames; restored Fog/Torch match their previous reference over 16 frames.
Fire core-only output matches in four sampled frames. Full results are in
`results/motion-checks.json` and `motion-targeted.json`.

The ignored artifact directory above contains `motion-compare.html`, with
synchronized AE / before / after playback at normal or quarter speed. Its
upper-Glow mode crops the same x=180,y=60,w=600,h=150 rectangle from every
column and applies the same gamma 1.667 display aid. This deliberately reveals
weak moving light; it is not the unmodified brightness comparison. Six complete
clips and eighteen crop clips use 72 frames/24 fps. `baseline-motion/` freezes
the previous renderer, and `analyze-motion.py` preserves the diagnostic script.

GPU timings for this follow-up use 640×400/DPR 1, the same exported alpha,
160 px overscan, batch 1, 80 samples after 25 warmup frames, and three
alternating repetitions. Median of run medians (ms):

| Preset | Before | After |
| --- | ---: | ---: |
| fire | 4.53 | 4.44 |
| arc-reactor | 2.90 | 3.24 |
| wormhole | 5.62 | 3.76 |
| windy | 3.34 | 3.10 |
| electric | 4.84 | 3.84 |

All 30 runs reported GL error 0. The unchanged Electric control varies
substantially; no general speedup is claimed. Arc Reactor adds about 0.34 ms
in this run set. Full samples: `results/motion-performance.json`.

A stricter upper-Glow audit excludes the lowest patch row (all retained patches
end at y=170) and rejects patches with more than 1% of pixels above max-channel
0.7. This reduces displaced-core contamination. Fine/medium/coarse median
vertical speeds in px/s are:

| Preset | AE | After |
| --- | --- | --- |
| Fire | -72 / -84 / -60 | -84 / -84 / -60 |
| Arc Reactor | -60 / -60 / -36 | -60 / -48 / -48 |
| Wormhole | -24 / -30 / -12 | -24 / -24 / -12 |

The remaining differences are within one 12 px/s tracking bin in this audit,
except that it still cannot establish matching cloud topology or all motion
statistics. See `results/motion-upper-audit.json` and `analyze-upper-motion.py`.


## Output grading migration (2026-11-24)

Removed the public `toneMapping` switch and both its shader branches. New
`gamma` / `brightness` / `saturation` controls share one output path; no hidden
preset-dependent curve remains. Geometry, noise, glow and halo generation are
unchanged in this migration.

An installed AE Saber probe used a temporary 400×300 Fog beam at t=1. Its
properties report Gamma 0.1–10, Brightness 0–5 and Saturation 0–2. Neutral is 1.
The rendered perturbations support saturation about the RGB arithmetic mean,
then brightness gain, then a direct gamma exponent. Gamma below 1 brightens;
it is not the reciprocal-gamma convention used by our Glow Pre Gamma.
Against 19,772 dim/midtone pixels, gamma=2 agrees with squared baseline output
at mean absolute error 0.00106 (normalized RGB); grayscale agrees with the
RGB mean at 0.00102. Combined gamma/brightness and gamma/saturation probes
support the stated ordering. This establishes these controls locally, not
bit-exact compatibility of the proprietary renderer, HDR/color-management
pipeline, or preset units. Probe images/logs are in the ignored comparison
cache's `results/ae-output-probe/`.

Preserving existing VFX-JS presets is a separate migration concern. Five former
linear recipes use neutral grades. Fourteen former exponential recipes use
fitted grades from pre-clip energy at t=1/2/3 with the shared 960×540 source.
The fit balances channel error and visible low-light falloff; it does not
reproduce an exponential shoulder exactly. A highlight-weighted alternative
reduced peak error but increased total image brightness and expanded visible
Glow; retained the lower mean-error fit. Values are VFX-JS appearance
compensation, not exported AE preset values.

Validation at t=1.37/2/2.73 (19 presets, 57 pairs): former linear recipes differ
by at most 1/255 per channel; other recipes have visible-region RGB MAE
1.96–5.85/255 averaged across times, with localized peak differences up to
58/255. Mean total RGB energy changes by about 0.3–2.9% for those recipes.
No WebGL errors. All controls reuse cached shapes; no render pass was added.
Production shader checks cover gamma/gain direction, grayscale, zero-light
alpha and ungraded source composition. Node tests: 33 passed. ESM/CJS builds,
focused Storybook type check, Biome and docs public-API checks passed.

Review: `http://127.0.0.1:6040/grading-compare.html`; cache files
`results/grading-report.json`, `results/grading-controls.json`,
`results/grading-fit.json`, `results/grading/*-{before,after}.png`.
