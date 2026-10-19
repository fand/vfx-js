---
"@vfx-js/effects": minor
---

Add heal params to `DatamoshEffect` so the mosh can heal block by
block like a real codec: `healRate` (random refresh chance per block per
frame) and `healThreshold` (refresh blocks with bad motion matches).
