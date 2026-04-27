import"./modulepreload-polyfill-N-DOuI4P.js";import{t as e}from"./esm-C6Ll2yP5.js";var t=new e,n=(e,t,n)=>e*(1-n)+t*n,r=`
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;
uniform float scroll;

float inside(vec2 uv) {
  return step(abs(uv.x - 0.5), 0.5) * step(abs(uv.y - 0.5), 0.5);
}
vec4 readTex(vec2 uv) {
  return texture2D(src, uv) * inside(uv);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - offset) / resolution;

  float d = scroll;

  d *= abs(
    sin(floor(gl_FragCoord.x / 17.) * 7. + time * 2.) +
    sin(floor(gl_FragCoord.x / 19.) * 19. - time * 3.)
  );

  vec4 cr = readTex(uv + vec2(0, d));
  vec4 cg = readTex(uv + vec2(0, d * 2.));
  vec4 cb = readTex(uv + vec2(0, d * 3.));

  gl_FragColor = vec4(
    cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a)
  );
}
`,i=0;for(let e of document.querySelectorAll(`h2`))t.add(e,{shader:r,overflow:500,uniforms:{scroll:()=>{let e=window.scrollY-i;return i=n(i,window.scrollY,.03),e/window.innerHeight}}});