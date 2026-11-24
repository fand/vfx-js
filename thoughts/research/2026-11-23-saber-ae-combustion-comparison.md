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
