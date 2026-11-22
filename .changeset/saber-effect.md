---
"@vfx-js/effects": minor
---

Add `SaberEffect`: electric lines and glow along the element's outline.

- A main line hugs the outline. In spots that come and go it kinks, and thin arcs (`lines`, 1 to 4) lift off it and fall back. The glow has no seams, also in corners and between letters.
- Shape: `amplitude`, `scale` and `thickness` in CSS px, `sharpness` (smooth bends to straight runs with kinks), `burst` (active everywhere, or only in a few wandering spots).
- Motion: `speed`, and `flicker` to snap the lines between shapes.
- Light: `color`, `intensity`, `glow`, `glowFalloff`.
- `start` and `end` (0..1 along each outline loop) draw the outline on and wipe it out, like a write-on. Every loop reveals at the same time, from `segments` points along it (default 3; short loops use fewer). The outline is traced on the CPU only while a reveal is in use.
- The outline comes from alpha, or from luminance with `edge: "luminance"` and `edgeThreshold`.
- The outline is cached. Call `invalidate()` after `vfx.update()` changes the content but not the size, or set `dynamic: true` for video.
- Draws outside the element, within `pad` CSS px (default 80) or `"fullscreen"`. `source: false` draws the light only.
- New type: `SaberParams`.
