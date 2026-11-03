---
"@vfx-js/core": minor
---

Multipass: intermediate passes now get element-space uniforms with `overflow` or fullscreen, same as the final pass.

- `resolution` is the element size, `offset` is the element origin inside the buffer, and `mouse` is in buffer pixels.
- Buffers VFX-JS renders (`src` after the first pass, `<target>`, `backbuffer`) cover the whole buffer. Under overflow, later passes must read them with `toBuffer(uv)`. See [docs/MULTIPASS.md "Overflow"](https://github.com/fand/vfx-js/blob/main/docs/MULTIPASS.md#overflow).

To migrate, pick one:

- Keep the old output: in intermediate passes, replace `offset` with `viewport.xy` and `resolution` with `viewport.zw`.
- Use the new rule: leave intermediate passes as they are, and read buffers in later passes with `toBuffer(uv)`.
