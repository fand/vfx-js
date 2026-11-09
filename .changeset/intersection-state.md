---
"@vfx-js/core": minor
---

Rework enter/leave transitions.

- Add `intersection.leaveThreshold` and `intersection.duration` options.
- Add `enterProgress` / `leaveProgress` shader uniforms and `EffectContext` fields.
  They play backward when the element turns back mid-way.
- Fix `warpTransition`, `slitScanTransition` and `pixelateTransition`: no jump on reversal, and no divide by zero in `pixelateTransition`.
- The visible ratio now uses the smaller of the element and viewport sizes, so an element larger than the viewport can reach 1.
  This changes `intersection` values and `threshold` results for such elements.
- `enterTime` / `leaveTime` uniforms are now always finite.
