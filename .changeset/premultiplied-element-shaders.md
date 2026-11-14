---
"@vfx-js/core": major
---

Element shaders (`vfx.add(el, { shader })`, `VFXPass[]`) now use premultiplied alpha, like effects, transitions and post effects. `src` is uploaded premultiplied and the final pass is blended with `ONE, ONE_MINUS_SRC_ALPHA`.

**Breaking:** a custom element shader that changes colors or alpha may look different. Shaders that only move `uv` or multiply `rgb` by a factor are not affected. To migrate:

- Fade all four channels: `outColor *= t;` instead of `outColor.a *= t;`.
- Scale a color you build yourself by alpha: `vec4(color * a, a)` instead of `vec4(color, a)`.
- For math that is not a plain multiply (invert, thresholds, mixing toward a color), un-premultiply first: `vec3 rgb = c.a > 0. ? c.rgb / c.a : vec3(0.);`, then output `vec4(rgb * c.a, c.a)`.

The preset shaders keep their look. `uvGradient`, `blink`, `vignette` and `focusReveal` are a little brighter where they fade, because their output was multiplied by alpha twice before.
