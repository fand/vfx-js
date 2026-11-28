---
"@vfx-js/effects": minor
---

Add `SaberEffect`: animated light along an element's outline, with eleven
AE-inspired presets plus the `embers` alias for `burning`.

- Independent Core/Glow distortion, four Glow layers, Halo and output Gamma/Brightness/Saturation.
- 58 leaf parameters; omit 13 non-AE extension controls while preserving the named preset appearances.
- Core always distorts; Glow supports Distort and Multiply. Unknown options, including nested distortion options, throw before changing state.
- `start`/`end`, `segments` and `fade` animate outline reveals. Alpha/luminance extraction, dynamic input, padding and source composition support web elements.
- Cached, compact GPU targets and asynchronous shader preparation on supported browsers.
