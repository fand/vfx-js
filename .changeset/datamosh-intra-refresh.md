---
"@vfx-js/effects": minor
---

Add heal params to `DatamoshEffect` so the mosh can heal block by
block like a real codec: `healRate` (random refresh chance per block per
frame), `healThreshold` (refresh blocks with bad motion matches), and
`intraClusterSize` (refresh in blobs of blocks instead of single blocks).

Add `heal` (ms): after `enable()`, the mosh heals by itself over this time
and then disables. 0 keeps the old behavior.
