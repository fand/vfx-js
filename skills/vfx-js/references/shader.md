# Custom shaders (`shader` option)

Pass a GLSL fragment shader string as `shader`.
VFX-JS draws it over the element's rect, plus `overflow`.

## Template

```ts
const shader = `
precision highp float;
uniform sampler2D src;   // the element's texture
uniform vec2 resolution; // element size, physical px
uniform vec2 offset;     // element origin in the render target, physical px
uniform float time;      // seconds
uniform float amount;    // your uniform
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    uv.x += sin(uv.y * 20.0 + time) * 0.02 * amount;
    outColor = texture(src, uv);
}
`;

await vfx.add(el, { shader, uniforms: { amount: 1 } });
```

- `uv` is element space: (0, 0) bottom-left, (1, 1) top-right.
- GLSL ES 3.0 by default. VFX-JS adds `#version 300 es`. Write `out vec4 outColor` and `texture()`.
- A shader with `gl_FragColor` or `texture2D` is compiled as GLSL ES 1.0. Don't mix the two.
- Output is premultiplied alpha. For transparent pixels, scale `rgb` by `a`.

## Built-in uniforms

Declare only the ones you use.

| Uniform | Type | Meaning |
| --- | --- | --- |
| `src` | `sampler2D` | Element texture. In later passes, the previous pass. |
| `resolution` | `vec2` | Element size in physical px. |
| `offset` | `vec2` | Element origin in the render target, physical px. |
| `viewport` | `vec4` | Render target rect `(x, y, w, h)` in physical px. |
| `time` | `float` | Seconds since VFX started. |
| `mouse` | `vec2` | Mouse position in render target px (same space as `gl_FragCoord`). |
| `intersection` | `float` | How much of the element is in the viewport, 0..1. |
| `enterTime` | `float` | Seconds since the element entered the viewport. |
| `leaveTime` | `float` | Seconds since the element left the viewport. |
| `enterProgress` | `float` | Enter transition, 0..1. Plays backward if the element leaves mid-way. |
| `leaveProgress` | `float` | Leave transition, 0..1. Stays 0 until enter finishes. |
| `autoCrop` | `bool` | The `autoCrop` prop (default true). |
| `backbuffer` | `sampler2D` | Previous frame. Needs `backbuffer: true`. |
| `passIndex` | `int` | Index of the current pass. |

Use `enterProgress` and `leaveProgress` for enter and leave animations.
They turn back smoothly when the user scrolls back mid-way:

```glsl
float t = enterProgress * (1.0 - leaveProgress); // 0 hidden, 1 fully shown
```

Set the timing with `intersection`:

```ts
vfx.add(el, {
    shader,
    intersection: {
        threshold: 0.5,      // enter when half of the element is in view
        leaveThreshold: 0.2, // leave when less than 20% is in view (default: threshold)
        duration: 0.8,       // seconds for enter and leave (default: 1)
    },
});
```

`leaveThreshold` can also be above `threshold`: the element enters at `threshold` when scrolling in, and leaves at `leaveThreshold` when scrolling out.
The visible ratio uses the smaller of the element and viewport sizes, so an element taller than the viewport can reach 1.
Use `enterTime` / `leaveTime` for animations timed in seconds.

## Uniform values

```ts
uniforms: {
    f: 1,                       // float
    v2: [1, 2],                 // vec2
    color: [1, 0, 0, 1],        // vec4
    arr: new Float32Array(16),  // uniform vec4 arr[4]
    scroll: () => window.scrollY, // re-evaluated every frame
}
```

Booleans are not supported in `shader` uniforms; use `0` / `1` floats.

## Overflow

`overflow` lets the shader draw outside the element.
`uv` goes below 0 and above 1 there.

```ts
vfx.add(el, { shader, overflow: 50 });               // 50 px on every side
vfx.add(el, { shader, overflow: [0, 100, 200, 0] }); // top, right, bottom, left
vfx.add(el, { shader, overflow: true });             // whole canvas
```

The element texture is empty outside 0..1, but `wrap` defaults to `"repeat"`.
Guard reads outside the element, or use `wrap: "clamp"`:

```glsl
vec4 readTex(vec2 uv) {
    if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) return vec4(0);
    return texture(src, uv);
}
```

## Feedback with `backbuffer`

```ts
vfx.add(el, { shader, backbuffer: true });
```

```glsl
uniform sampler2D backbuffer;
uniform vec4 viewport;
// backbuffer covers the whole render target, not just the element:
vec2 bufferUv = (gl_FragCoord.xy - viewport.xy) / viewport.zw;
vec4 prev = texture(backbuffer, bufferUv);
```

## Multipass

Pass an array of passes.
Each pass writes to `target`; later passes read it as `uniform sampler2D <target>`.
The last pass draws to the screen.

```ts
vfx.add(el, {
    shader: [
        { frag: blurShader, target: "blurH", uniforms: { direction: [1, 0] } },
        { frag: blurShader, uniforms: { direction: [0, 1] } },
    ],
});
```

```ts
type VFXPass = {
    frag: string;             // fragment shader (required)
    vert?: string;            // vertex shader
    target?: string;          // buffer name; omitted on a middle pass = "pass0", "pass1", ...
    persistent?: boolean;     // keep across frames; read last frame by the target name
    float?: boolean;          // 32-bit float buffer, for data outside 0..1
    size?: [number, number];  // fixed buffer size in px; then resolution = size, offset = 0
    uniforms?: VFXUniforms;   // per-pass uniforms
};
```

Persistent buffer (trail):

```glsl
uniform sampler2D src;
uniform sampler2D trail;   // last frame of this pass
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    outColor = max(texture(src, uv), texture(trail, uv) * 0.95);
}
```

```ts
shader: [
    { frag: trailShader, target: "trail", persistent: true },
    { frag: displayShader },
]
```

With `overflow`, buffers that VFX-JS renders (`<target>`, `backbuffer`, `src` after the first pass) cover the whole buffer.
Read them with this helper:

```glsl
vec2 toBuffer(vec2 uv) {
    return (uv * resolution + (offset - viewport.xy)) / viewport.zw;
}
// texture(myTarget, toBuffer(uv))
```

Without overflow it returns `uv` unchanged, so it is always safe to use.

## Post effects

A post effect runs over the whole canvas after all elements are drawn.
`src` is the canvas, and `offset` is 0.

```ts
const vfx = new VFX({
    postEffect: { shader: "grayscale" },  // preset, GLSL string, or { effect }
});

const vfx2 = new VFX({
    postEffect: [                          // multipass, same VFXPass shape
        { frag: passA, target: "a" },
        { frag: passB },
    ],
});
```

Post effect options: `shader`, `uniforms`, `persistent` (previous frame as `backbuffer`), `float`, `effect`.
