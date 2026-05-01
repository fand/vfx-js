import"./modulepreload-polyfill-N-DOuI4P.js";import{t as e}from"./esm-CeNsHEOB.js";new e().add(document.querySelector(`h1`),{shader:`
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform vec2 mouse;
uniform float time;
uniform sampler2D src;

#define PI 3.141593
#define SAMPLES 64.

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(489., 589.))) * 492.) * 2. - 1.;
}
float hash(vec3 p) {
  return fract(sin(dot(p, vec3(489., 589., 58.))) * 492.) * 2. - 1.;
}
vec2 hash2(vec3 p) {
  return vec2(hash(p), hash(p + 1.));
}
vec4 readTex(vec2 uv) {
  if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) { return vec4(0); }
  return texture2D(src, uv);
}
vec3 spectrum(float x) {
  return cos((x - vec3(0, .5, 1)) * vec3(.6, 1., .5) * PI);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - offset) / resolution;
  if (readTex(uv).r > 0.) { discard; }

  vec2 p = uv * 2. - 1.;
  p.x *= resolution.x / resolution.y;

  vec2 mp = (mouse - offset) / resolution;
  mp = mp * 2. - 1.;
  mp.x *= resolution.x / resolution.y;

  vec2 rp = p;
  vec2 d = (mp - p) / SAMPLES;
  float acc = 0.;

  for (float i = 0.; i < SAMPLES; i++) {
    rp += d;
    rp += hash2(vec3(rp, i)) * 0.5 / SAMPLES;
    vec2 uv2 = rp;
    uv2.x /= resolution.x / resolution.y;
    uv2 = uv2 * 0.5 + 0.5;
    acc += readTex(uv2).r / SAMPLES;
  }

  float lm = length(p - mp);
  vec4 c = vec4(smoothstep(0., 1., pow(.1 / lm, .2)));
  c -= acc;
  c += vec4((spectrum(cos(acc * 3.5))), 1) * acc * 2.5;
  c -= hash(vec3(uv.xyy)) * 0.01;
  gl_FragColor = c;
}
`,overflow:!0,overlay:!0});