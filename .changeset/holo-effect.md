---
"@vfx-js/effects": minor
---

Add `HoloEffect`, the holographic foils of [holo.spot](https://www.holo.spot), ported from [holospot](https://github.com/dmitrykurash/holospot) (MIT).

- Materials: `prism` (rainbow foil), `shatter` (gold cracked ice), `nebula` (glitter), `sparkle` (sparkle film), `vortex` (gold spiral) and `emboss` (a foil logo pressed into cotton paper, with the element printed on the paper; the logo's artwork is the `logo` param), with holo.spot's spectral studio lights, environment, glare, grain and tone curve.
- `settings` takes holo.spot's setting ids, or a holo.spot "Copy settings" blob. `HoloEffect.looks` holds the looks holo.spot ships (its card, 3D object and paper card) as params, and `HoloEffect.presets` holo.spot's material starting points (`HoloEffect.presets.prism.compactDisc`, …). The constructor merges several param objects in order.
- The element is lit as a card and tilts toward the pointer: in place by default, or drawn turning in 3D with `perspective` (0–1; `msaa: true` smooths its outline). `structureScale` sets the size of shards, flakes and dots. Typed params cover the scene: `exposure`, `tone`, `glare`, `grain`, `lights`, `background`, `bow`, `pose`, `pointer`, `tiltRange`, `wobble`. `mask` decides where the foil is (the element's alpha, its luma, or everywhere), and `ink` tints the foil with the element's colours.
- `HoloEffect.settingSpecs(material)` and `effect.resolvedSettings()` help build a settings UI.
- New types: `HoloParams`, `HoloMaterial`, `HoloLogo`, `HoloTone`, `HoloLights`, `HoloPointer`, `HoloPreset`, `HoloPresets`, `HoloSettingSpec`, `HoloQuality`, `HoloMask`, `HoloSettings`, `HoloSettingValue`, `HoloVec2`.
