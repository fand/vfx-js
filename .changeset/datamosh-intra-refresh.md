---
"@vfx-js/effects": minor
---

Add heal params to `DatamoshEffect` so the mosh can heal block by
block like a real codec: `healRate` (random refresh chance per block per
frame), `healThreshold` (refresh blocks with bad motion matches), and
`healClusterSize` (refresh in blobs of blocks instead of single blocks).
