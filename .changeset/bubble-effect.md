---
"@vfx-js/effects": minor
---

Add `BubbleEffect`: the element's silhouette, extruded into 3D, filled with transparent soap bubbles in thin-film colours.

- The silhouette is the element's alpha, read once with `ctx.readPixels`, as for `GlassEffect`.
- `packing`: `"grid"` places one bubble per cell of a jittered lattice, in the shader; `"packed"` packs them on the CPU when the effect starts, largest first and small ones in the gaps, so they fill the shape snugly. `count` caps the packed bubbles.
- Bubbles: `bubbleSize`, `sizeVariation`, `overlap`, `seed`, `jitter` (grid), `wobble` / `speed` (a slow drift), `depth`. `contact: "clip"` gives touching bubbles a shared flat wall, like foam; `"separate"` lets them pass through each other.
- Film: the colour is thin-film interference, from a table baked once from the CIE colour matching functions. `thickness` in nm, `thicknessVariation` / `swirlScale` / `swirlSpeed` for swirls, `drain` (thinner at the top), `filmGain`, `reflection`. `maxLayers` films are composited per pixel.
- Films do not bend light, so the page shows through the bubbles. `backdrop`, `backdropColors` and the other backdrop and light params are those of `GlassEffect`; with `backdropVisible: true` the backdrop is drawn behind the bubbles.
- Camera and output as in `GlassEffect`: `yaw`, `pitch`, `orbit`, `fov`, `zoom`, `drag`, `resolution`, `fxaa`, `pad`. `debug: "cost"` or `"layers"` shows a heat map.
