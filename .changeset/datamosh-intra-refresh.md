---
"@vfx-js/effects": minor
---

Add intra refresh params to `DatamoshEffect` so the mosh can heal block by
block like a real codec: `intraRate` (random refresh chance per block per
frame), `intraThreshold` (refresh blocks with bad motion matches), and
`intraPatchSize` (refresh in blobs of blocks instead of single blocks).
