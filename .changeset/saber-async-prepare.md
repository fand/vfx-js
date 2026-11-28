---
"@vfx-js/effects": patch
---

Prepare Saber shaders before drawing, using the core's parallel compilation API. Initial setup awaits preparation without a synchronous compile wait on supported browsers; new preset/layout configurations defer rendering until ready. Shader selection runs without allocating extra GPU resources. Rendering and preset parameters are unchanged. Browsers without parallel-compilation support retain synchronous compilation.
