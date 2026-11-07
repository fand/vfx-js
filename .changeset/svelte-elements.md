---
"@vfx-js/svelte": minor
---

Add element effects: the `vfx(props)` attachment puts a shader on any element, and `updateElement(el)` re-captures its texture. Pass a getter to apply changes without re-running the attachment. `<VFXCanvas>` renders its children into a shader, with html-in-canvas where the browser has it and dom-to-canvas otherwise. `vfxConfig(config)` sets the options of the shared VFX (`pixelRatio`, `zIndex`, `postEffect`, `autoplay`).
