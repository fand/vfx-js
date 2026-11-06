// 3D simplex noise by Ashima Arts (MIT).
export const contourShader = `
precision highp float;
uniform vec2 offset;
uniform float time;
uniform float speed;
uniform float dpr;
uniform float levels;
uniform float lineWidth;
uniform vec4 ink;
out vec4 outColor;

vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0 / 7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
    vec2 p = (gl_FragCoord.xy - offset) / dpr / 1040.0;
    float t = time * speed;
    float n = snoise(vec3(p, t)) + 0.3 * snoise(vec3(p * 2.3, t * 1.4));
    float f = n * levels * 0.5;
    // Distance to the nearest level in CSS px.
    float d = abs(fract(f - 0.5) - 0.5) / fwidth(f) / dpr;
    float a = (1.0 - clamp(d / lineWidth, 0.0, 1.0)) * ink.a;
    outColor = vec4(ink.rgb * a, a);
}`;

/** Stacked sine waves. Each `waves` entry: center and amplitude (fractions of the height), wavelength in CSS px, speed in rad/s. */
export const waveShader = `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform float dpr;
uniform float lineWidth;
uniform vec4 ink;
uniform vec4 waves[8];
uniform float phases[8];
out vec4 outColor;

void main() {
    float height = resolution.y / dpr;
    vec2 p = (gl_FragCoord.xy - offset) / dpr;
    float a = 0.0;
    for (int i = 0; i < 8; i++) {
        vec4 w = waves[i];
        float k = 6.2831853 / w.z;
        float phase = p.x * k + time * w.w + phases[i];
        float y = height * (0.5 + w.x + w.y * sin(phase));
        float slope = height * w.y * k * cos(phase);
        // Distance to the curve in CSS px, kept even on steep parts.
        float d = abs(p.y - y) / sqrt(1.0 + slope * slope);
        float c = 1.0 - clamp(d / lineWidth, 0.0, 1.0);
        a += c * (1.0 - a);
    }
    a *= ink.a;
    outColor = vec4(ink.rgb * a, a);
}`;
