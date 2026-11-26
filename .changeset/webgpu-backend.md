---
"@vfx-js/core": minor
---

Add an experimental WebGPU backend: `new VFX({ backend: "webgpu" })`. It runs element shaders and post effects written in WGSL (`VFXPass.wgsl`). The default stays WebGL.
