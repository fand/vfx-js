---
"@vfx-js/effects": minor
---

Add `HoloEffect`, the holographic foils of [holo.spot](https://www.holo.spot), ported from [holospot](https://github.com/dmitrykurash/holospot) (MIT).

- Materials: `prism` (rainbow foil), `shatter` (gold cracked ice), `nebula` (glitter), `sparkle` (sparkle film), `vortex` (gold spiral) and `emboss` (a foil logo pressed into cotton paper, with the element printed on the paper; the logo's artwork is the `emboss.logo` setting, an image or a URL), with holo.spot's spectral studio lights, environment, glare, grain and tone curve.
- `settings` takes holo.spot's setting ids (typed, checked against holo.spot's ranges), or a holo.spot "Copy settings" blob. `HoloEffect.looks` holds the looks holo.spot ships (its card, 3D object and paper card), and `HoloEffect.startingPoints` holo.spot's material starting points (`HoloEffect.startingPoints.prism.compactDisc`, …). The constructor applies several inputs in order, later values winning; `setParams` applies one more.
- The element is lit as a card and tilts toward the pointer: turning in 3D through holo.spot's camera lens by default (`lens`; 4× MSAA by default, as holospot), or in place with `flat: true` (the light rig turns instead). `structureScale` (holo.spot's `object.structureScale`) scales shards, flakes and dots. Scene shorthands write holo.spot settings: `exposure`, `tone`, `glare`, `grain`, `studio`, `background`, `bow`, `pose`, `lens`, `pointer`, `tiltRange`, `wobble`, `wobbleAmp`, with holo.spot's units and ranges. `quality` takes holospot's tiers, including `"auto"`. `mask` decides where the foil is (the element's alpha, its luma, or everywhere), and `ink` tints the foil with the element's colours.
- `effect.ready` resolves once the emboss logo and paper have loaded and drawn; `effect.errors` lists loading errors.
- `HoloEffect.settingSpecs(material)` and `effect.resolvedSettings()` help build a settings UI.
- New types: `HoloParams`, `HoloInput`, `HoloSceneParams`, `HoloMaterial`, `HoloLogo`, `HoloTone`, `HoloStudio`, `HoloPointer`, `HoloStartingPoint`, `HoloStartingPoints`, `HoloStartingPointNames`, `HoloSettingSpec`, `HoloQuality`, `HoloMask`, `HoloSettings`, `HoloSettingId`, `HoloSettingValue`, `HoloCopyBlob`, `HoloVec2`.
