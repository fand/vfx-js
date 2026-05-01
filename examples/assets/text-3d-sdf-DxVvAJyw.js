import"./modulepreload-polyfill-N-DOuI4P.js";import{t as e}from"./esm-CeNsHEOB.js";import{getSDFImage as t}from"https://esm.sh/@fand/image-to-sdf@0.1.0";var n=`
precision highp float;
uniform vec2 resolution;
uniform vec2 mouse;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;
#define PI 3.141593

float rand(vec2 p) {
  return fract(sin(dot(p, vec2(484., 398.)) * 984.));
}

vec3 spectrum(float x) {
  return cos((x - vec3(0, .5, 1)) * vec3(.6, 1., .5) * PI);
}

float get(vec2 uv) {
  return texture2D(src, uv).r;
}

mat2 rot(float t) {
  float c = cos(t), s = sin(t);
  return mat2(c, -s, s, c);
}

float smin(float a, float b, float k) {
  float h = max(k-abs(a-b),0.0);
  return min(a, b) - h*h*0.25/k;
}

float sdText(vec3 p) {
  p.xy *= rot(sin(time * 0.5) * 0.2);
  p.xz *= rot(-time * 0.3);
  float dxy = get(clamp(p.xy * 0.5 + 0.5, 0., 1.));
  float dz = abs(p.z);
  return length(vec2(dxy, dz)) - .1;
}

float sdParticles(vec3 p) {
  vec3 q = p;
  q.xz *= rot(time * 0.23);
  float r = .1 * (sin(p.x + p.z) + 1.1);
  q.y -= time;
  q += 2.3;
  q = mod(q, 5.) - 2.5;
  float d = length(q) - r;

  q = p;
  q.xy *= rot(.2);
  q.xz *= rot(time * 0.2 - p.y * 0.03);
  r = .08 * (sin(p.z - p.y) + 1.1);
  q.y -= time * .7;
  q += 3.7;
  q = mod(q, 7.2) - 3.6;
  d = min(d, length(q) - r);

  r = .08 * (sin(p.z - p.y) + 1.1);
  q = p;
  q.xz *= rot(time * 0.18 + p.y * 0.02);
  q.x += sin(q.y) * .4;
  q.y -= time * .6;
  q.y = mod(q.y, 3.) - 1.5;
  d = min(d, length(q) - r);

  q = p;
  q.xz *= rot(time * -0.03 + p.y * -0.01);
  q.x += sin(q.y * .7 + .8) * .6;
  q.y -= time * .5;
  q.y = mod(q.y, 4.) - 2.;
  d = min(d, length(q) - r);

  return d;
}

float map(vec3 p) {
  float d = sdText(p);
  d = smin(d, sdParticles(p), .4);
  return d;
}

vec3 getNormal(vec3 p) {
  vec2 d = vec2(0, 1);
  return normalize(vec3(
    map(p + d.yxx) - map(p - d.yxx),
    map(p + d.xyx) - map(p - d.xyx),
    map(p + d.xxy) - map(p - d.xxy)
  ));
}

void trace(vec2 uv, vec2 p) {
  vec3 ro = vec3(0, 0, 1.3);
  vec3 rd = normalize(vec3(p, -1));

  vec3 rp;
  float t = 0.;
  float d = 0.;
  float c = 0.;
  float occ = 0.;

  for (int i = 0; i < 80; i++) {
    rp = ro + rd * t;
    d = map(rp);
    if (d < 0.003) {
      c = 1. - t * 0.06;
      occ = float(i) * 0.006 + (cos(rp.y * 2. - 1.) * .4 + .5) * -0.15;
      break;
    }
    t += d * 0.3;
  }

  gl_FragColor = mix(
    vec4(.95, .55, .7, 1),
    vec4(.4, .7, .83, 1) - occ + pow(dot(getNormal(rp), vec3(0, 1, 0)), 10.) * 0.6,
    clamp(c, 0., 1.)
  );

  float l = length(uv - .5);
  gl_FragColor.rgb *= 0.7 + spectrum(sin(l) * .5 + .5) * 0.5;
  gl_FragColor -= pow(l, 3.) * 0.5;
  gl_FragColor -= sin((uv.x - uv.y) * 1500. + time * 40.) * 0.02;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - offset) / resolution;
  vec2 p = uv * 2. - 1.;
  p.x *= resolution.x / resolution.y;
  trace(uv, p);
}
`,r=30,i=1.2,a=.17,o=window.devicePixelRatio||1,s=document.querySelector(`h1`),c=new e({pixelRatio:1}),l=()=>{let e=document.createElement(`canvas`),t=e.getContext(`2d`),n=s.getBoundingClientRect();e.style.position=`fixed`,e.style.left=`${n.left-r}px`,e.style.top=`${n.top-r}px`,e.style.width=`${n.width+r*2}px`,e.style.height=`${n.height+r*2}px`,e.width=(n.width+r*2)*o,e.height=(n.height+r*2)*o,e.style.pointerEvents=`none`;let c=window.getComputedStyle(s),l=Number.parseFloat(c.fontSize),u=l*a;t.scale(o,o),t.clearRect(0,0,n.width,n.height),t.font=c.font,t.fillStyle=`white`,t.textBaseline=`top`,t.textAlign=`center`;let d=s.innerText.split(`
`),f=0;for(let e of d)t.fillText(e,r+n.width*.5,r+u+f),f+=l*i;return e};(async()=>{let e=l();e.style.opacity=`0`,document.body.appendChild(e);let r=await t(e,{width:e.width,height:e.height,spread:100,padding:100,pixelRatio:2});r.style.opacity=`0`,r.style.position=`fixed`,r.style.inset=`0`,r.style.width=`100vw`,r.style.height=`100vh`,document.body.appendChild(r),c.add(r,{shader:n})})();