---
"@vfx-js/core": minor
"@vfx-js/effects": minor
---

Add `ctx.setElementGeometry(matrix | null)`, so an effect can tell the browser where it draws the element. Clicks, `:hover`, the cursor and accessibility bounds then follow the picture instead of the element's flat box.

- `matrix` is 16 numbers, column-major like `DOMMatrix`, mapping the element's border box (CSS px, top-left origin) to where it is drawn. Perspective works.
- Call it every frame; a frame without a call puts the flat box back. It is cleared when the element is removed.
- Only for elements added with `vfx.addHTML`, in browsers with `HTMLCanvasElement.updateElementGeometry` (Chrome 157+). Elsewhere, and in post effects, it does nothing.
- The element's own `getBoundingClientRect()` follows the geometry. The rect VFX-JS draws into does not: it measures the wrapper canvas.

`GlassEffect` takes `hitGeometry: true` to report its front face with it, and a box that catches nothing while the face points away.
