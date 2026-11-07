export type UniformSpec = {
    name: string;
    min: number;
    max: number;
    step: number;
    value: number;
};

export type Example = {
    id: string;
    label: string;
    frag: string;
    uniforms: UniformSpec[];
};

export const examples: Example[] = [
    {
        id: "wipe",
        label: "Soft wipe",
        uniforms: [
            { name: "softness", min: 0, max: 0.5, step: 0.01, value: 0.08 },
        ],
        frag: `uniform float softness;

vec4 transition(vec2 uv, float t) {
  float edge = mix(-softness, 1.0 + softness, t);
  float m = smoothstep(edge - softness, edge + softness, uv.x);
  return mix(readTo(uv), readFrom(uv), m);
}`,
    },
    {
        id: "circle",
        label: "Circle reveal",
        uniforms: [
            { name: "softness", min: 0, max: 0.3, step: 0.01, value: 0.02 },
        ],
        frag: `uniform float softness;

vec4 transition(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
  float r = mix(-softness, 1.1 + softness, t);
  float m = smoothstep(r - softness, r + softness, length(p));
  return mix(readTo(uv), readFrom(uv), m);
}`,
    },
    {
        id: "dissolve",
        label: "Pixel dissolve",
        uniforms: [{ name: "cell", min: 2, max: 80, step: 1, value: 16 }],
        frag: `uniform float cell;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec4 transition(vec2 uv, float t) {
  // resolution is in physical px, so cells keep their size.
  float n = hash(floor(uv * resolution / cell));
  return n < t ? readTo(uv) : readFrom(uv);
}`,
    },
    {
        id: "wave",
        label: "Wave",
        uniforms: [{ name: "amp", min: 0, max: 0.2, step: 0.005, value: 0.04 }],
        frag: `uniform float amp;

vec4 transition(vec2 uv, float t) {
  float power = sin(t * 3.141593);
  vec2 d = vec2(sin(uv.y * 24.0 + t * 18.0), 0.0) * amp * power;
  return mix(readFrom(uv + d), readTo(uv - d), t);
}`,
    },
];
