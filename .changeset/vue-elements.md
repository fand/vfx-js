---
"@vfx-js/vue": minor
---

Add element effects: the `v-vfx` directive (`vVfx`) puts a shader on any element, and `updateElement(el)` re-captures its texture. `<VFXCanvas>` renders its children into a shader, with html-in-canvas where the browser has it and dom-to-canvas otherwise. `useVFXConfig(config)` sets the options of the shared VFX (`pixelRatio`, `zIndex`, `postEffect`, `autoplay`).
