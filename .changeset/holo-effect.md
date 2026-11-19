---
"@vfx-js/effects": minor
---

Add `HoloEffect`, the holographic foils of [holo.spot](https://www.holo.spot), ported from [holospot](https://github.com/dmitrykurash/holospot) (MIT).

- Materials: `prism` (rainbow foil), `shatter` (gold cracked ice), `nebula` (glitter), `sparkle` (sparkle film) and `vortex` (gold spiral), with holo.spot's spectral studio lights, environment, glare, grain and tone curve.
- `settings` takes holo.spot's setting ids, or a holo.spot "Copy settings" blob. `look` picks the values holo.spot ships for its card or 3D object.
- The element is lit as a card and tilts toward the pointer: in place by default, or drawn in 3D with `perspective: true` (`msaa: true` smooths its outline). `mask` decides where the foil is (the element's alpha, its luma, or everywhere), and `ink` tints the foil with the element's colours.
- New types: `HoloParams`, `HoloMaterial`, `HoloLook`, `HoloQuality`, `HoloMask`, `HoloSettings`, `HoloSettingValue`, `HoloVec2`.
