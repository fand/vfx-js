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
| `src` | `sampler2D` | Input texture (previous pass output or canvas) |
| `resolution` | `vec2` | Render target resolution in pixels |
| `offset` | `vec2` | Offset values |
| `viewport` | `vec4` | Viewport information |
| `time` | `float` | Time in seconds since VFX started |
| `mouse` | `vec2` | Mouse position in pixels |
| `passIndex` | `int` | Index of the current pass |

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
