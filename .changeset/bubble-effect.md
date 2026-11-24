---
"@vfx-js/effects": minor
---

Add `BubbleEffect`: the element's silhouette, extruded into 3D, filled with a foam of transparent soap bubbles in thin-film colours.

- The silhouette is read back as for `GlassEffect`: `sourceChannel`, `refresh()`, and a recapture when the element's aspect ratio changes.
- Big bubbles are spread through the shape by Poisson disk sampling (no lattice shows); smaller ones fill the gaps between them and along the outline, placed on the CPU into the largest gap first. Where spheres overlap, they are cut by one flat wall they share (a power diagram); where they are exposed, they keep their round outside. Along each ray the films are found exactly, with no marching inside the foam: the shader walks a uniform grid over the spheres.
- Bubbles: `cellSize` (the big bubbles), `minSize` (the smallest, as a share of `cellSize`; 1 turns the fill off), `containment` (0 lets bubbles poke out of the silhouette; above 0 what pokes out is squashed towards the shape, keeping its roundness, and at 1 the bubbles are pressed flat against it), `cellSizeRandomness`, `roundness` (at the same bubble size, from a flat-walled foam to whole spheres that touch), `seed`, `wobble` / `speed` (a slow drift: the walls breathe), `depth`, `bevel` (rounded edges of the shape), `maxLayers`. Changing a placement param places the bubbles again.
- Film: the colour is thin-film interference, from a table baked once from the CIE colour matching functions. `iridescence`, `thickness` in nm, `thicknessVariation` / `swirlScale` / `swirlSpeed` for swirls, `drain` (thinner at the top), `reflection`, `tint` / `tintStrength` (the colour films scatter, stronger at grazing angles and in deep stacks), `opacity` / `color` (matte, opaque bubbles).
- Borders: on the foam's outside, where two bubbles meet, a pale line (`borderStrength`) and a film that thickens towards it (`borderThickness`), over `borderWidth` (a share of `cellSize`), lined with very fine bubbles (`froth`, `frothSize`, `frothWidth`). Walls inside the foam get none.
- Films do not bend light, so the page shows through the foam. `backdrop`, `backdropColors` and the other backdrop and light params are those of `GlassEffect`; with `backdropVisible: true` the backdrop is drawn behind the foam.
- Camera and output as in `GlassEffect` (`OrbitCameraParams`, `pointer: "tilt"`, `antialias`, `resolution`, `pad`). `debug: "cost"`, `"layers"` or `"cells"` shows a debug view.
- `GlassEffect`'s scene code (backdrop, lights, output passes) moves to a module shared with `BubbleEffect`; its output is unchanged.
