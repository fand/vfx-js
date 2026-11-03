# Multipass Shaders

VFX-JS supports multipass shader pipelines — multiple render passes chained together, where each pass can read the output of previous passes. This is useful for effects that require multiple stages (e.g. blur, fluid simulation) or feedback effects that accumulate over frames.

## Basic Usage

Pass an array of `VFXPass` objects to `postEffect`. Each pass has a `frag` shader and an optional `target` name. The last pass renders to screen.

```javascript
import { VFX } from '@vfx-js/core';

const vfx = new VFX({
    postEffect: [
        {
            frag: firstPassShader,
            target: "intermediate",  // Write output to named buffer
        },
        {
            frag: finalPassShader,   // No target = render to screen
        },
    ]
});
```

## Named Buffers

Each pass can write to a named buffer via `target`. Subsequent passes can read it by declaring `uniform sampler2D <target>` in their shader.

```javascript
const vfx = new VFX({
    postEffect: [
        {
            frag: `
                precision highp float;
                uniform sampler2D src;
                uniform vec2 resolution;
                uniform vec2 offset;
                out vec4 outColor;
                void main() {
                    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                    vec4 c = texture(src, uv);
                    float gray = dot(c.rgb, vec3(0.299, 0.587, 0.114));
                    outColor = vec4(vec3(gray), c.a);
                }
            `,
            target: "grayscale",
        },
        {
            // This pass reads the "grayscale" buffer automatically
            frag: `
                precision highp float;
                uniform sampler2D grayscale;
                uniform vec2 resolution;
                uniform vec2 offset;
                out vec4 outColor;
                void main() {
                    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                    outColor = vec4(1.0 - texture(grayscale, uv).rgb, 1.0);
                }
            `,
        },
    ]
});
```

If an intermediate pass omits `target`, it is auto-assigned as `pass0`, `pass1`, etc.

## Persistent Buffers (Feedback Effects)

Set `persistent: true` to retain the buffer across frames. The previous frame's output is accessible via the same target name — following the [ISF](https://docs.isf.video/ref_multipass.html) convention.

```javascript
const vfx = new VFX({
    postEffect: [
        {
            frag: `
                precision highp float;
                uniform sampler2D src;
                uniform sampler2D trail;   // Previous frame of this pass
                uniform vec2 resolution;
                uniform vec2 offset;
                out vec4 outColor;
                void main() {
                    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                    vec4 current = texture(src, uv);
                    vec4 prev = texture(trail, uv) * 0.95;
                    outColor = max(current, prev);
                }
            `,
            target: "trail",
            persistent: true,
        },
        {
            frag: displayShader,
        },
    ]
});
```

## Float Precision

Set `float: true` for 32-bit floating point render targets. Use this when storing non-visual data (velocity fields, pressure) or values outside `[0, 1]`.

```javascript
{
    frag: velocityShader,
    target: "velocity",
    persistent: true,
    float: true,
}
```

## Custom Size

Set `size: [width, height]` to render at a fixed resolution independent of the viewport. Useful for simulations that run at lower resolution.

A fixed-size pass uses the whole buffer: `resolution` = `size` and `offset` = 0.

```javascript
{
    frag: simulationShader,
    target: "sim",
    float: true,
    size: [256, 256],
}
```

## Per-Pass Uniforms

Each pass can have its own `uniforms`, in addition to the built-in uniforms.

```javascript
{
    frag: blurShader,
    target: "blurH",
    uniforms: {
        direction: [1.0, 0.0],
    },
},
{
    frag: blurShader,
    target: "blurV",
    uniforms: {
        direction: [0.0, 1.0],
    },
},
```

Dynamic uniforms (functions) are also supported:

```javascript
{
    frag: shader,
    uniforms: {
        speed: () => slider.value,
    },
}
```

## Element Multipass

Multipass can also be used on individual elements via `shader`:

```javascript
vfx.add(element, {
    shader: [
        { frag: firstPass, target: "pass0" },
        { frag: secondPass },
    ],
});
```

## Built-in Uniforms

Every pass automatically receives:

| Uniform | Type | Description |
|---------|------|-------------|
| `src` | `sampler2D` | Input texture. The first pass gets the element (or canvas). Later passes get the previous pass's buffer. |
| `resolution` | `vec2` | Element size in physical pixels |
| `offset` | `vec2` | Element origin inside the render target, in physical pixels |
| `viewport` | `vec4` | Render target rect `(x, y, w, h)` in physical pixels. `viewport.zw` is the buffer size. |
| `time` | `float` | Time in seconds since VFX started |
| `mouse` | `vec2` | Mouse position in render target pixels (same space as `gl_FragCoord`) |
| `passIndex` | `int` | Index of the current pass |

`uv = (gl_FragCoord.xy - offset) / resolution` is element space in every pass.
For post effects, the element is the whole canvas, so `offset` is 0.

Passes with `size` are the exception.
They use the whole buffer: `resolution` = `size`, `offset` = 0.

## Overflow

When an element multipass chain uses `overflow` (or `overflow: true` for fullscreen), each intermediate buffer covers the element plus the overflow area.

- `uv` is always element space. The overflow area is `uv < 0` or `uv > 1`.
- The element texture (`src` in the first pass) is element space.
- Buffers VFX-JS renders (`src` in later passes, `<target>` buffers, `backbuffer`) are buffer space: 0..1 is the whole buffer.

Read buffers with `toBuffer`:

```glsl
vec2 toBuffer(vec2 uv) {
    return (uv * resolution + (offset - viewport.xy)) / viewport.zw;
}
```

It works in every pass, including the final one.
Without overflow it returns `uv` unchanged.
Fixed-size passes (`size`) have no element mapping, so there `toBuffer` returns `uv` too.

### Example: Glow Bleed

Pass 0 copies the element into a buffer.
Pass 1 blurs that buffer into the overflow area.
The final pass adds the glow on top of the element.

```javascript
const toBuffer = `
vec2 toBuffer(vec2 uv) {
    return (uv * resolution + (offset - viewport.xy)) / viewport.zw;
}
`;

const copyShader = `
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    // The element texture has nothing outside 0..1
    vec2 inside = step(vec2(0.0), uv) * step(uv, vec2(1.0));
    outColor = texture(src, uv) * inside.x * inside.y;
}
`;

const glowShader = `
precision highp float;
uniform sampler2D original;
uniform vec2 resolution;
uniform vec2 offset;
uniform vec4 viewport;
out vec4 outColor;
${toBuffer}

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 texel = 4.0 / resolution;

    vec4 c = vec4(0.0);
    for (int x = -4; x <= 4; x++) {
        for (int y = -4; y <= 4; y++) {
            c += texture(original, toBuffer(uv + vec2(x, y) * texel));
        }
    }
    outColor = c / 81.0;
}
`;

const compositeShader = `
precision highp float;
uniform sampler2D original;
uniform sampler2D glow;
uniform vec2 resolution;
uniform vec2 offset;
uniform vec4 viewport;
out vec4 outColor;
${toBuffer}

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec4 base = texture(original, toBuffer(uv));
    vec4 g = texture(glow, toBuffer(uv));
    outColor = base + g * (1.0 - base.a);
}
`;

vfx.add(element, {
    overflow: 40,
    shader: [
        { frag: copyShader, target: "original" },
        { frag: glowShader, target: "glow" },
        { frag: compositeShader },
    ],
});
```

### Migration

Before this change, intermediate passes in overflow or fullscreen chains got `resolution` = buffer size and `offset` = 0.
To update such shaders, pick one:

- Keep the old output: in intermediate passes, replace `offset` with `viewport.xy` and `resolution` with `viewport.zw`.
- Use the new rule: leave intermediate passes as they are (pixel math is now element based), and read buffers in later passes with `toBuffer(uv)`.

## VFXPass Reference

```typescript
type VFXPass = {
    frag: string;             // Fragment shader (required)
    vert?: string;            // Vertex shader (optional)
    target?: string;          // Named buffer to write to
    persistent?: boolean;     // Persist across frames (prev frame = target name)
    float?: boolean;          // 32-bit float render target
    size?: [number, number];  // Fixed render target size in pixels
    uniforms?: VFXUniforms;   // Per-pass uniforms
};
```

## Example: Separable Gaussian Blur

A classic two-pass blur — horizontal then vertical:

```javascript
const blurShader = `
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
uniform vec2 direction;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 texel = direction / resolution;

    vec4 c = texture(src, uv) * 0.227027;
    c += texture(src, uv + texel * 1.0) * 0.316216;
    c += texture(src, uv - texel * 1.0) * 0.316216;
    c += texture(src, uv + texel * 2.0) * 0.070270;
    c += texture(src, uv - texel * 2.0) * 0.070270;

    outColor = c;
}
`;

const vfx = new VFX({
    postEffect: [
        { frag: blurShader, target: "blurH", uniforms: { direction: [1, 0] } },
        { frag: blurShader, uniforms: { direction: [0, 1] } },
    ]
});
```
