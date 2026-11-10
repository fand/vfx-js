---
"@vfx-js/core": minor
---

Rework enter/leave transitions as "scroll reveal".

- Add `intersection.leaveThreshold` and `intersection.duration` options.
- Add `enterProgress` / `leaveProgress` shader uniforms and `EffectContext` fields.
  They play backward when the element turns back mid-way.
- Rename `warpTransition`, `slitScanTransition`, `pixelateTransition` and `focusTransition` to `warpReveal`, `slitScanReveal`, `pixelateReveal` and `focusReveal`.
  The old names still work.
- Fix `warpReveal`, `slitScanReveal` and `pixelateReveal`: no jump on reversal, and no divide by zero in `pixelateReveal`.
- The visible ratio now divides by the smaller of the element size and the viewport size (after `rootMargin`), on each axis.
  An element larger than the viewport can now reach 1.
  With a negative `rootMargin`, smaller elements can also reach 1 sooner.
  This changes `intersection` values and `threshold` results.
- `enterTime` / `leaveTime` uniforms are now always finite.
