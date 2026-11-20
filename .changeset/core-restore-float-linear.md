---
"@vfx-js/core": patch
---

Enable `OES_texture_float_linear` again when the WebGL context is restored. Linearly filtered float render targets sampled as zero after a context loss, so effects that read them (such as `BloomEffect`) drew wrong or black.
