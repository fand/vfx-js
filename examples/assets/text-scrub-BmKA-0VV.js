import"./modulepreload-polyfill-N-DOuI4P.js";import{t as e}from"./esm-CeNsHEOB.js";var t=`
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;

uniform vec4 mouse2;

#define mouse (mouse2.xy)
#define move (mouse2.zw * vec2(resolution.y/resolution.x, 1.))

vec4 tex(vec2 uv) {
  float y = floor(uv.y);
  float ys = sin(y+0.7);
  uv.x += ys + time * 0.05 * ys;
  return texture2D(src, fract(uv) * 0.98 + 0.01);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float dist = 0.;

  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    vec2 md = mouse.xy - move * resolution * fi * .2;
    float r = 250. + fi * 80.;
    dist += pow(smoothstep(r, 0., length(md - gl_FragCoord.xy)), 2.) * (1. - fi * 0.1);
  }

  vec2 mv = move * dist;
  vec2 uvr, uvg, uvb;
  vec4 cr, cg, cb;

  for (float i = 0.; i < 8.; i++) {
    float ii = 1. + i / 8. * 0.2;
    uvr = uv - mv * ii * 1.;
    uvg = uv - mv * ii * 1.4;
    uvb = uv - mv * ii * 1.8;
    cr += tex(uvr);
    cg += tex(uvg);
    cb += tex(uvb);
  }
  cr /= 8.;
  cg /= 8.;
  cb /= 8.;

  gl_FragColor = vec4(cr.r, cg.g, cb.b, cr.a + cg.a + cb.a);
  gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(.4));
}
`,n=[.5,.5],r=[.5,.5],i=[0,0],a=(e,t,n)=>e*(1-n)+t*n;window.addEventListener(`pointermove`,e=>{r=[e.clientX/window.innerWidth,1-e.clientY/window.innerHeight]}),window.addEventListener(`touchmove`,e=>{r=[e.touches[0].clientX/window.innerWidth,1-e.touches[0].clientY/window.innerHeight]});var o=window.devicePixelRatio;new e().add(document.querySelector(`h2`),{shader:t,overflow:!0,uniforms:{mouse2:()=>{let[e,t]=n,[s,c]=r;return i=[s-e,c-t],n=[a(e,s,.03),a(t,c,.03)],[s*window.innerWidth*o,c*window.innerHeight*o,...i]}}});