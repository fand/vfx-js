// Shared bits between particle.ts and particle-explode.ts.

// Quad expanded around each particle in the vertex shader; pointSize
// is applied in NDC using elementPixel so quads stay visually sized
// regardless of buffer scale.
export const QUAD_VERTS = new Float32Array([
    -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
]);

// hash21 used for spawn jitter (life, color, position).
export const GLSL_HASH = `
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`;

export const FRAG_CLEAR = `#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`;

// Disc sprite with smooth falloff. Premultiplied output: additive
// blend lets overlapping particles brighten naturally.
export const FRAG_PARTICLE = `#version 300 es
precision highp float;
in vec2 vCorner;
in vec4 vColor;
out vec4 outColor;

void main() {
    float d = length(vCorner) * 2.0;
    float fall = 1.0 - smoothstep(0.6, 1.0, d);
    if (fall <= 0.0) discard;
    float a = vColor.a * fall;
    outColor = vec4(vColor.rgb * a, a);
}
`;

// trailFade applies to the whole trail buffer so dead-particle pixels
// decay at the same rate as everything else. blendMode mirrors the
// stamp blend: 0 = add, 1 = premultiplied over.
export const FRAG_TRAIL_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trailPrev;
uniform sampler2D particleStamp;
uniform float trailFade;
uniform int blendMode;

void main() {
    vec4 prev = texture(trailPrev, uv);
    vec4 stamp = texture(particleStamp, uv);
    vec4 faded = prev * trailFade;
    if (blendMode == 1) {
        outColor = vec4(
            stamp.rgb + faded.rgb * (1.0 - stamp.a),
            clamp(stamp.a + faded.a * (1.0 - stamp.a), 0.0, 1.0)
        );
    } else {
        outColor = vec4(
            faded.rgb + stamp.rgb,
            clamp(faded.a + stamp.a, 0.0, 1.0)
        );
    }
}
`;

// Smallest power-of-two square grid that fits `count` slots.
export function stateSizeFromCount(count: number): number {
    const n = sanitizeCount(count);
    return 2 ** Math.ceil(Math.log2(Math.sqrt(n)));
}

// Coerce user input to a valid particle count. NaN / non-finite /
// negative / fractional values fall back to a positive integer.
export function sanitizeCount(count: number): number {
    if (!Number.isFinite(count)) {
        return 1;
    }
    return Math.max(1, Math.floor(count));
}

// Replace `params.count` with an accessor that runs `sanitizeCount` on
// every write, so `params.count = NaN` (etc) can't cascade into
// stateSizeFromCount and produce invalid RT dimensions. The initial
// `count` value is also sanitized.
export function installCountSetter<P extends { count: number }>(
    params: P,
): void {
    let storage = sanitizeCount(params.count);
    Object.defineProperty(params, "count", {
        get: () => storage,
        set: (v: number) => {
            storage = sanitizeCount(v);
        },
        enumerable: true,
        configurable: true,
    });
}

export function hexToRgb(hex: number): [number, number, number] {
    const c = hex | 0;
    return [
        ((c >> 16) & 0xff) / 255,
        ((c >> 8) & 0xff) / 255,
        (c & 0xff) / 255,
    ];
}

// Cap dt so tab-switch pauses don't teleport particles.
export const MAX_DT = 0.1;
export function clampDt(dt: number): number {
    return Math.min(MAX_DT, Math.max(0, dt));
}
