import"./modulepreload-polyfill-N-DOuI4P.js";import{t as e}from"./esm-CeNsHEOB.js";var t=`
precision highp float;
uniform sampler2D src;
uniform vec2 offset;
uniform vec2 resolution;
uniform float time;
out vec4 outColor;

vec4 readTex(vec2 uv) {
  vec4 c = texture(src, uv);
  c.a *= smoothstep(.5, .499, abs(uv.x - .5)) * smoothstep(.5, .499, abs(uv.y - .5));
  return c;
}

vec2 zoom(vec2 uv, float t) {
  return (uv - .5) * t + .5;
}
float rand(vec2 p) {
  return fract(sin(dot(p, vec2(829., 483.))) * 394.);
}
float rand(vec3 p) {
  return fract(sin(dot(p, vec3(829., 4839., 432.))) * 39428.);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - offset) / resolution;

  vec2 p = uv * 2. - 1.;
  p.x *= resolution.x / resolution.y;
  float l = length(p);

  // barrel distort
  float dist = pow(l, 2.) * .3;
  dist = smoothstep(0., 1., dist);
  uv = zoom(uv, 0.5 + dist);

  // radial blur
  float a = atan(p.y, p.x);
  float rd = rand(vec3(a, time, 0));
  uv = (uv - .5) * (1.0 + rd * pow(l * 0.7, 3.) * 0.3) + .5;

  vec2 uvr = uv;
  vec2 uvg = uv;
  vec2 uvb = uv;

  // aberration
  float d = (1. + sin(uv.y * 20. + time * 3.) * 0.1) * 0.05;
  uvr.x += 0.0015;
  uvb.x -= 0.0015;
  uvr = zoom(uvr, 1. + d * l * l);
  uvb = zoom(uvb, 1. - d * l * l);

  // glitch bands
  float gr = rand(vec2(floor(time * 43.), 1.));
  if (gr > 0.8) {
    float y = sin(floor(uv.y / 0.07)) + sin(floor(uv.y / 0.003 + time));
    float f = rand(vec2(y, floor(time * 5.0))) * 2. - 1.;
    uvr.x += f * 0.05;
    uvg.x += f * 0.1;
    uvb.x += f * 0.15;
  }
  float gr2 = rand(vec2(floor(time * 37.), 10.));
  if (gr2 > 0.9) {
    uvr.x += sin(uv.y * 7. + time + 1.) * 0.015;
    uvg.x += sin(uv.y * 5. + time + 2.) * 0.015;
    uvb.x += sin(uv.y * 3. + time + 3.) * 0.015;
  }

  vec4 cr = readTex(uvr);
  vec4 cg = readTex(uvg);
  vec4 cb = readTex(uvb);

  outColor = vec4(cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 1.);

  vec4 deco;

  // scanline
  float res = resolution.y;
  deco += (
    sin(uv.y * res * .7 + time * 100.) *
    sin(uv.y * res * .3 - time * 130.)
  ) * 0.05;

  // grid
  deco += smoothstep(.01, .0, min(fract(uv.x * 20.), fract(uv.y * 20.))) * 0.1;

  outColor += deco * smoothstep(2., 0., l);

  // vignette
  outColor *= 1.8 - l * l;

  // dither
  outColor += rand(vec3(p, time)) * 0.1;
}
`;window.addEventListener(`load`,async()=>{let n=document.getElementById(`app`),r=new e({scrollPadding:!1,postEffect:{shader:t}});await r.addHTML(n,{shader:`none`}),r.play(),document.documentElement.classList.add(`vfx-ready`)});