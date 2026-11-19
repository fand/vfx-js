---
"@vfx-js/effects": minor
---

Add `HoloEffect`, the holographic foils of [holo.spot](https://www.holo.spot), ported from [holospot](https://github.com/dmitrykurash/holospot) (MIT).

- Materials: `prism` (rainbow foil), `shatter` (gold cracked ice), `nebula` (glitter), `sparkle` (sparkle film), `vortex` (gold spiral) and `emboss` (a foil logo pressed into cotton paper, with the element printed on the paper; the logo's artwork is the `logo` param), with holo.spot's spectral studio lights, environment, glare, grain and tone curve.
- `settings` takes holo.spot's setting ids, or a holo.spot "Copy settings" blob. `HoloEffect.looks` holds the looks holo.spot ships (its card, 3D object and paper card) as params, and `HoloEffect.presets` holo.spot's material starting points (`HoloEffect.presets.prism.compactDisc`, …). The constructor merges several param objects in order.
- The element is lit as a card and tilts toward the pointer: turning in 3D through holo.spot's camera lens by default (`lens`; 4× MSAA by default, as holospot), or in place with `view: "flat"` (the light rig turns instead). `structureScale` (holo.spot's `object.structureScale`) scales shards, flakes and dots. Typed params cover the scene: `exposure`, `tone`, `glare`, `grain`, `lights`, `background`, `bow`, `pose`, `lens`, `pointer`, `tiltRange`, `wobble`, `wobbleAmp`, with holo.spot's names, units and ranges. `quality` takes holospot's tiers, including `"auto"`. `mask` decides where the foil is (the element's alpha, its luma, or everywhere), and `ink` tints the foil with the element's colours.
- `HoloEffect.settingSpecs(material)` and `effect.resolvedSettings()` help build a settings UI.
- New types: `HoloParams`, `HoloMaterial`, `HoloLogo`, `HoloTone`, `HoloLights`, `HoloPointer`, `HoloView`, `HoloPreset`, `HoloPresets`, `HoloSettingSpec`, `HoloQuality`, `HoloMask`, `HoloSettings`, `HoloSettingValue`, `HoloVec2`.
