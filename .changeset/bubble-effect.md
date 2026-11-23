---
"@vfx-js/effects": minor
---

Add `BubbleEffect`: the element's silhouette, extruded into 3D, filled with a foam of transparent soap bubbles in thin-film colours.

- The silhouette is the element's alpha, read once with `ctx.readPixels`, as for `GlassEffect`.
- The volume is split into 3D Voronoi cells, small enough that a logo's strokes read as ropes of foam: neighbours share their walls with no gaps, and each outer face bulges into a dome that meets its neighbours in a crease. `packing: "packed"` (default) places up to 1024 seeds evenly inside the shape on the CPU when the effect starts; `"grid"` puts them on a jittered lattice in the shader.
- Cells: `cellSize`, `regularity` (packed), `jitter` (grid), `seed`, `gap` (0 by default; above 0 walls become double films), `rounding` (the creases), `roundness` (how much outer faces bulge), `skin`, `wobble` / `speed` (a slow drift: the walls breathe), `depth`, `maxLayers`.
- Film: the colour is thin-film interference, from a table baked once from the CIE colour matching functions. `iridescence`, `thickness` in nm, `thicknessVariation` / `swirlScale` / `swirlSpeed` for swirls, `drain` (thinner at the top), `reflection`, `tint` / `tintStrength` (the colour films scatter, stronger at grazing angles and in deep stacks), `opacity` / `color` (matte, opaque cells).
- Films do not bend light, so the page shows through the foam. `backdrop`, `backdropColors` and the other backdrop and light params are those of `GlassEffect`; with `backdropVisible: true` the backdrop is drawn behind the foam.
- Camera and output as in `GlassEffect`: `yaw`, `pitch`, `orbit`, `fov`, `zoom`, `drag`, `resolution`, `fxaa`, `pad`. `debug: "cost"`, `"layers"` or `"cells"` shows a debug view.
