---
"@vfx-js/core": patch
"@vfx-js/react": patch
---

html-in-canvas: support Chrome 159+ (`content="drawable"` + `drawable` child, `paint` event) alongside `layoutsubtree`, and redraw nested canvases at their layout size and position where Chrome draws them at buffer size (156) or clips them to a box at the element's origin (156, 159).
