import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{i as t,s as n,t as r}from"./src-DudEjhCU.js";import{d as i,f as a,p as ee}from"./utils-C2DuqTxv.js";import{B as o,nt as s,t as c,w as l}from"./esm-Dh2VieTG.js";var u,d,f,p;function m(){return(m=e((()=>{r(),u=`
vec4 splitRead(vec2 uvr, vec2 uvg, vec2 uvb, bool to) {
  vec4 r = to ? readTo(uvr) : readFrom(uvr);
  vec4 g = to ? readTo(uvg) : readFrom(uvg);
  vec4 b = to ? readTo(uvb) : readFrom(uvb);
  return vec4(r.r, g.g, b.b, (r.a + g.a + b.a) / 3.0);
}
`,d=`
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
`,f=`
vec2 mirror(vec2 p) {
  return 1.0 - abs(1.0 - mod(p, 2.0));
}
`,p=n({name:`hard_cut`,frag:`
vec4 transition(vec2 uv, float t) {
  return t < 0.5 ? readFrom(uv) : readTo(uv);
}
`})})))()}var h;function g(){return(g=e((()=>{r(),m(),h=n({name:`crosszoom`,overflow:!0,frag:`
const float STRENGTH = 0.4;
const float TAPS = 16.0;

${d}
// Quintic ease in/out, so the blur builds up and settles smoothly.
float ease(float x) {
  return x < 0.5 ? 16.0 * x * x * x * x * x : 1.0 + 16.0 * pow(x - 1.0, 5.0);
}

vec4 transition(vec2 uv, float t) {
  float mixT = smoothstep(0.0, 1.0, ease(t));
  float strength = sin(t * 3.141593) * STRENGTH;
  vec2 dir = vec2(0.5) - uv;
  float jitter = ign(gl_FragCoord.xy);

  vec4 c = vec4(0.0);
  float total = 0.0;
  for (float n = 0.0; n < TAPS; n += 1.0) {
    float k = (n + jitter) / TAPS;
    // Weight taps near the pixel more, so edges stay readable.
    float w = 4.0 * (k - k * k);
    vec2 p = uv + dir * k * strength;
    c += mix(readFrom(p), readTo(p), mixT) * w;
    total += w;
  }
  return c / total;
}
`})})))()}function te(e={}){let t=e.blockSize,n=t!==void 0&&Number.isFinite(t)&&t>=2?Math.round(t):T;return{name:`datamosh`,create:()=>[E.create(),new ne(n)]}}var _,v,y,b,x,S,C,w,T,E,ne,re;function ie(){return(ie=e((()=>{r(),c(),_=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},v=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},S=.25,C=1.5,w=2,T=32,E=n({name:`datamosh`,frag:`
vec4 transition(vec2 uv, float t) {
  return reverse > 0.5 ? readFrom(uv) : readTo(uv);
}
`}),ne=class extends s{constructor(e){super({dup:0,blockSize:e}),y.set(this,void 0),b.set(this,0),x.set(this,1),_(this,y,e,`f`)}start(e){this.params.blockSize=v(this,y,`f`),this.params.chromaGain=C,this.params.useResidual=!1,this.params.healRate=0,_(this,b,0,`f`),_(this,x,Math.max(e.duration*.75,.001),`f`),this.enable()}update(e){var t;let{x:n}=e.progress,r=Math.min(Math.max((n-S)/.75,0),1);this.params.useResidual=_(this,b,(t=v(this,b,`f`),++t),`f`)>w,this.params.chromaGain=C+-.5*r,this.params.healRate=n<S?0:1-.01**(e.deltaTime/v(this,x,`f`))}end(){this.disable()}},y=new WeakMap,b=new WeakMap,x=new WeakMap,re=te()})))()}var ae;function oe(){return(oe=e((()=>{r(),m(),ae=n({name:`distort_fade`,frag:`
const float STRENGTH = 0.15;
const float SCALE = 1.0;

// 2D simplex noise (Ashima Arts, MIT).
vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Two octaves, so the warp has both large swirls and finer ripples.
float fbm(vec2 p) {
  return snoise(p) * 0.7 + snoise(p * 2.3 + 17.0) * 0.3;
}

${f}
vec4 transition(vec2 uv, float t) {
  // A container overflow must not show warped content outside the element.
  if (!inRange(uv)) return vec4(0.0);
  float amount = sin(t * 3.141593);
  vec2 p = uv * resolution / min(resolution.x, resolution.y) * SCALE;
  // The noise drifts as the run goes, so the warp flows instead of only growing.
  p += t * 1.5;
  vec2 offset = vec2(fbm(p), fbm(p + vec2(31.7, 11.3))) * STRENGTH * amount;
  vec2 q = mirror(uv + offset);
  return mix(readFrom(q), readTo(q), smoothstep(0.3, 0.7, t));
}
`})})))()}function se(){return(se=e((()=>{r()})))()}var ce;function le(){return(le=e((()=>{r(),m(),ce=n({name:`glitch`,frag:`
float gnoise(float y) {
  return sin(y * 7.0) * sin(y * 17.0) * sin(y * 59.0);
}
vec2 gnoise(vec2 uv) {
  return vec2(gnoise(uv.x), gnoise(uv.y + 100.0));
}

${u}
vec4 transition(vec2 uv, float t) {
  // A container overflow must not show wrapped content outside the element.
  if (!inRange(uv)) return vec4(0.0);
  float amount = sin(floor(t * 10.0 + 0.5) / 10.0 * 3.141593);
  vec2 uvr = uv, uvg = uv, uvb = uv;
  if (gnoise(t * 3.0 + 10.0) > 0.0) {
    uvr += gnoise(vec2(floor(t * 21.0), floor(t * 31.0))) * vec2(1.0, 0.1) * amount;
    uvg += gnoise(vec2(floor(t * 22.0), floor(t * 32.0))) * vec2(1.0, 0.1) * amount;
    uvb += gnoise(vec2(floor(t * 23.0), floor(t * 33.0))) * vec2(1.0, 0.1) * amount;
  }
  // Wrap so shifted areas show content rather than holes.
  uvr = fract(uvr);
  uvg = fract(uvg);
  uvb = fract(uvb);

  vec4 c1 = splitRead(uvr, uvg, uvb, false);
  vec4 c2 = splitRead(uvr, uvg, uvb, true);
  return mix(c1, c2, step(0.5, t));
}
`})})))()}var ue;function D(){return(D=e((()=>{r(),m(),ue=n({name:`glitch_slide`,frag:`
${u}
vec4 transition(vec2 uv, float t) {
  // A container overflow must not show wrapped content outside the element.
  if (!inRange(uv)) return vec4(0.0);
  float y = floor(uv.y * 53.0) / 53.0;
  float n = sin(y * 7.0) * sin(y * 17.0) * sin(y * 59.0) * 0.5 + 0.5;

  // Fade the shift in over the first 5% so the start matches the idle content.
  float k = min(t * 20.0, 1.0);
  vec2 uvr = uv, uvg = uv, uvb = uv;
  uvr.x = fract(uvr.x + clamp(t * 1.8 - n * 0.2 - 0.1, 0.0, 1.0) * k);
  uvg.x = fract(uvg.x + clamp(t * 1.8 - n * 0.2, 0.0, 1.0) * k);
  uvb.x = fract(uvb.x + clamp(t * 1.8 - n * 0.2 + 0.1, 0.0, 1.0) * k);

  vec4 c1 = splitRead(uvr, uvg, uvb, false);
  vec4 c2 = splitRead(uvr, uvg, uvb, true);
  return mix(c1, c2, smoothstep(0.45, 0.55, t));
}
`})})))()}function de(e={}){let t=Math.max(1,Math.round(e.iterations??64)),n=Math.min(Math.max(e.quality??.3,0),1);return{name:`jpeg_glitch`,ease:`linear`,create:()=>[p.create(),new P(t,n)]}}var O,k,A,j,M,N,P;function F(){return(F=e((()=>{c(),m(),O=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},k=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},M=.12,N=30,P=class extends o{constructor(e,t){super({quality:t,bypass:!0,resolutionScale:.25}),A.set(this,void 0),j.set(this,void 0),O(this,A,e,`f`),O(this,j,t,`f`)}start(){this.params.bypass=!0,this.params.speed=N,this.params.quality=k(this,j,`f`)}render(e){let{x:t}=e.progress;this.params.bypass=!(t>M&&t<.88);let n=Math.sin(Math.min(Math.max(t,0),1)*Math.PI);this.params.iterations=Math.max(1,Math.round(k(this,A,`f`)*n)),super.render(e)}end(){this.params.bypass=!0}},A=new WeakMap,j=new WeakMap,de()})))()}function fe(e={}){let t=(e.strength??1).toFixed(3),r=Math.max(0,e.dispersion??.6).toFixed(3);return n({name:`lens_distortion`,frag:`
const float STRENGTH = ${t};
const float DISPERSION = ${r};
const float TAPS = 12.0;
// Width of the growing warp's edge.
const float SOFT = 0.5;

${d}
${f}
vec4 transition(vec2 uv, float t) {
  // A container overflow must not show warped content outside the element.
  if (!inRange(uv)) return vec4(0.0);
  float mixT = smoothstep(0.35, 0.65, t);
  // Centered, with 1 at the top and bottom edges.
  float aspect = resolution.x / resolution.y;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= aspect;
  float l = length(p);
  // The first half grows the warp out from the center; the second half relaxes it.
  float amount = sin(t * 3.141593);
  if (t < 0.5) {
    float reach = t * 2.0 * (length(vec2(aspect, 1.0)) + SOFT);
    amount = 1.0 - smoothstep(reach - SOFT, reach, l);
  }
  float jitter = ign(gl_FragCoord.xy);

  vec3 rgb = vec3(0.0);
  vec3 total = vec3(0.0);
  float alpha = 0.0;
  for (float n = 0.0; n < TAPS; n += 1.0) {
    float k = (n + jitter) / TAPS;
    float s = amount * STRENGTH * (1.0 + DISPERSION * (k - 0.5) * 2.0);
    vec2 q = p * (1.0 - l * s);
    q.x /= aspect;
    q = mirror(q * 0.5 + 0.5);
    vec4 c = vec4(0.0);
    if (mixT < 1.0) c += readFrom(q) * (1.0 - mixT);
    if (mixT > 0.0) c += readTo(q) * mixT;
    // Each tap adds to the color channels near its place in the spectrum.
    vec3 w = max(vec3(0.0), 1.0 - abs(vec3(k) - vec3(0.0, 0.5, 1.0)) * 2.0);
    rgb += c.rgb * w;
    total += w;
    alpha += c.a;
  }
  return vec4(rgb / total, alpha / TAPS);
}
`})}var I;function L(){return(L=e((()=>{r(),m(),I=fe()})))()}var R;function z(){return(z=e((()=>{r(),R=n({name:`pixel_scan`,frag:`
const float W = 0.2;
const float LAYERS = 3.0;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(4859.0, 3985.0))) * 3984.0);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float sdBox(vec2 p, float r) {
  vec2 q = abs(p) - r;
  return min(length(q), max(q.y, q.x));
}

float aspect() {
  return resolution.y / resolution.x;
}

// Where the front reaches the cell, in [0, 1].
float cellPos(vec2 pi, float scale) {
  return pi.x / (scale * 2.0) + 0.5;
}

vec4 cell(vec2 p, vec2 pi, float scale, float t, float edge) {
  vec2 pc = pi + 0.5;
  vec2 uvc = pc / scale;
  uvc.y /= aspect();
  uvc = uvc * 0.5 + 0.5;
  if (!inRange(uvc)) return vec4(0.0);
  // Glow only where either side has content.
  float alpha = smoothstep(0.0, 0.1, max(readFrom(uvc).a, readTo(uvc).a));
  vec4 color = vec4(hsv2rgb(vec3((pc.x * 13.0 / pc.y * 17.0) * 0.3, 1.0, 1.0)), 1.0);
  float x = cellPos(pi, scale);
  float n = hash(pi);
  float anim = smoothstep(W * 2.0, 0.0, abs(x + n * W - t));
  color *= anim;
  color *= mix(1.0, clamp(0.3 / abs(sdBox(p - pc, 0.5)), 0.0, 10.0), edge * pow(anim, 10.0));
  return color * alpha;
}

vec4 cellsColor(vec2 p, float scale, float t) {
  vec2 pi = floor(p);
  vec2 d = vec2(0.0, 1.0);
  vec4 cc = cell(p, pi, scale, t, 0.2) * 4.0;
  cc += cell(p, pi + d.xy, scale, t, 0.9);
  cc += cell(p, pi - d.xy, scale, t, 0.9);
  cc += cell(p, pi + d.yx, scale, t, 0.9);
  cc += cell(p, pi - d.yx, scale, t, 0.9);
  return cc / 8.0;
}

vec4 draw(vec2 uv, vec2 p, float t, float scale) {
  vec2 pi = floor(p * scale);
  float x = cellPos(pi, scale);
  float swap = smoothstep(t, t - W, x + hash(pi) * W);
  vec4 c = mix(readFrom(uv), readTo(uv), swap);
  return c + cellsColor(p * scale, scale, t) * 1.5;
}

vec4 transition(vec2 uv, float t) {
  // A container overflow must not show cells outside the element.
  if (!inRange(uv)) return vec4(0.0);
  vec2 p = uv * 2.0 - 1.0;
  p.y *= aspect();
  // Start and end with the front and its glow fully off the element.
  t = t * (1.0 + W * 5.0) - W * 2.0;
  vec4 c = vec4(0.0);
  for (float i = 0.0; i < LAYERS; i++) {
    c += draw(uv, p, t, abs(cos(i) * 7.3 + 10.0));
  }
  c /= LAYERS;
  return vec4(c.rgb, min(c.a, 1.0));
}
`})})))()}var B;function V(){return(V=e((()=>{r(),B=n({name:`pixel_stretch`,frag:`
const float SMOOTH = 0.05;

// Quadratic smooth min (Inigo Quilez) to round the corner where the streaks start.
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}

vec4 transition(vec2 uv, float t) {
  // A container overflow must not show stretched content outside the element.
  if (!inRange(uv)) return vec4(0.0);
  float mixT = smoothstep(0.4, 0.6, t);
  vec4 c = vec4(0.0);
  if (mixT < 1.0) {
    // Above the line repeats the row under it.
    float line = mix(1.0 + SMOOTH, -SMOOTH, smoothstep(0.0, 0.4, t));
    float y = clamp(smin(uv.y, line, SMOOTH), 0.0, 1.0);
    c += readFrom(vec2(uv.x, y)) * (1.0 - mixT);
  }
  if (mixT > 0.0) {
    // Below the line repeats the row under it.
    float line = mix(1.0 + SMOOTH, -SMOOTH, smoothstep(0.6, 1.0, t));
    float y = clamp(smax(uv.y, line, SMOOTH), 0.0, 1.0);
    c += readTo(vec2(uv.x, y)) * mixT;
  }
  return c;
}
`})})))()}function H(e={}){let t=e.direction??`up`;return{name:`pixelsort`,create:()=>[p.create(),new pe(t)]}}var U,W,G,K,q,pe,me;function he(){return(he=e((()=>{c(),m(),U=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},W=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},q={up:`down`,down:`up`,left:`right`,right:`left`},pe=class extends l{constructor(e){super({range:[1,1]}),G.set(this,void 0),K.set(this,!1),U(this,G,e,`f`)}start(e){U(this,K,e.reverse,`f`),this.params.direction=e.reverse?q[W(this,G,`f`)]:W(this,G,`f`),this.params.range[0]=1}update(e){let{t}=e.progress,n=W(this,K,`f`)?1-t:t;this.params.direction=n<.5?W(this,G,`f`):q[W(this,G,`f`)],this.params.range[0]=Math.abs(1-2*t)}end(){this.params.range[0]=1}},G=new WeakMap,K=new WeakMap,me=H()})))()}var ge;function _e(){return(_e=e((()=>{r(),ge=n({name:`slit_scan`,frag:`
const vec3 LAG = vec3(0.0, 0.2, 0.4);

vec4 splitRead(float xr, float xg, float xb, float y, bool to) {
  vec4 r = to ? readTo(vec2(xr, y)) : readFrom(vec2(xr, y));
  vec4 g = to ? readTo(vec2(xg, y)) : readFrom(vec2(xg, y));
  vec4 b = to ? readTo(vec2(xb, y)) : readFrom(vec2(xb, y));
  return vec4(r.r, g.g, b.b, (r.a + g.a + b.a) / 3.0);
}

vec4 transition(vec2 uv, float t) {
  // A container overflow must not show smeared content outside the element.
  if (!inRange(uv)) return vec4(0.0);
  float span = 1.0 + LAG.b;
  // Each sweep ends fully smeared; a quick fade joins them.
  float mixT = smoothstep(0.48, 0.52, t);
  vec4 c = vec4(0.0);
  if (mixT < 1.0) {
    // Left of the line repeats the column under it.
    vec3 line = clamp(t / 0.48, 0.0, 1.0) * span - LAG;
    vec3 x = clamp(max(vec3(uv.x), line), 0.0, 1.0);
    c += splitRead(x.r, x.g, x.b, uv.y, false) * (1.0 - mixT);
  }
  if (mixT > 0.0) {
    // Right of the line repeats the column under it.
    vec3 line = clamp((t - 0.52) / 0.48, 0.0, 1.0) * span - LAG;
    vec3 x = clamp(min(vec3(uv.x), line), 0.0, 1.0);
    c += splitRead(x.r, x.g, x.b, uv.y, true) * mixT;
  }
  return c;
}
`})})))()}function ve(e={}){let[t,r]=ye[e.direction??`left`];return n({name:`swipe`,frag:`
const vec2 move = vec2(${t.toFixed(1)}, ${r.toFixed(1)});
vec4 transition(vec2 uv, float t) {
  // A container overflow must not show shifted content outside the element.
  if (!inRange(uv)) return vec4(0.0);
  vec2 p = uv - move * t;
  return inRange(p) ? readFrom(p) : readTo(p + move);
}
`})}var ye,be;function xe(){return(xe=e((()=>{r(),ye={left:[-1,0],right:[1,0],up:[0,1],down:[0,-1]},be=ve()})))()}function J(e={}){let t=Se[e.direction??`center`],r=Ce[e.shape??`hex`],i=Math.max(1,Math.round(e.count??12)).toFixed(1);return n({name:`tile`,frag:`
const float COUNT = ${i};
const float SPREAD = 0.6;
${r}
vec4 transition(vec2 uv, float t) {
  // A container overflow must not show tiles outside the element.
  if (!inRange(uv)) return vec4(0.0);
  // Grid in tile units, centered on the element.
  float tilePx = max(resolution.x, resolution.y) / COUNT;
  vec2 extent = resolution * 0.5 / tilePx;
  vec4 cell = cellOf((uv - 0.5) * resolution / tilePx);
  vec2 local = cell.xy;
  vec2 center = cell.zw;

  float d = clamp(${t}, 0.0, 1.0);
  float scale = 1.0 - smoothstep(0.0, 1.0, clamp((t - d * SPREAD) / (1.0 - SPREAD), 0.0, 1.0));
  // Distance outside the shrunk tile, in pixels.
  float edge = (cellDist(local) - 0.5 * scale) * tilePx;
  float inside = 1.0 - smoothstep(0.0, 1.0, edge);
  vec4 to = readTo(uv);
  if (scale <= 0.0 || inside <= 0.0) return to;
  vec4 from = readFrom((center + local / scale) * tilePx / resolution + 0.5);
  from *= inside;
  return from + to * (1.0 - from.a);
}
`})}var Se,Ce,we;function Te(){return(Te=e((()=>{r(),Se={center:`length(center) / length(extent)`,left:`(extent.x - center.x) / (extent.x * 2.0)`,right:`(center.x + extent.x) / (extent.x * 2.0)`,up:`(center.y + extent.y) / (extent.y * 2.0)`,down:`(extent.y - center.y) / (extent.y * 2.0)`},Ce={hex:`
const vec2 HEX = vec2(1.0, 1.7320508);
vec4 cellOf(vec2 g) {
  vec4 ids = floor(vec4(g, g - vec2(0.5, 1.0)) / HEX.xyxy) + 0.5;
  vec2 a = g - ids.xy * HEX;
  vec2 b = g - (ids.zw + 0.5) * HEX;
  vec2 local = dot(a, a) < dot(b, b) ? a : b;
  return vec4(local, g - local);
}
float cellDist(vec2 p) {
  p = abs(p);
  return max(dot(p, vec2(0.5, 0.8660254)), p.x);
}
`,square:`
vec4 cellOf(vec2 g) {
  vec2 center = floor(g) + 0.5;
  return vec4(g - center, center);
}
float cellDist(vec2 p) {
  p = abs(p);
  return max(p.x, p.y);
}
`},we=J()})))()}var Ee;function De(){return(De=e((()=>{r(),Ee=n({name:`zoom`,overflow:!0,frag:`
vec4 transition(vec2 uv, float t) {
  vec2 uv1 = (uv - 0.5) * (1.0 - t) + 0.5;
  vec2 uv2 = (uv - 0.5) / (t * 0.999 + 0.001) + 0.5;
  // Tile the new content only inside the element, so the overflow shows just the old one.
  vec4 to = inRange(uv) ? readTo(fract(uv2)) : vec4(0.0);
  return mix(readFrom(uv1), to, t);
}
`})})))()}var Oe;function ke(){return(ke=e((()=>{r(),m(),Oe=n({name:`zoom_blur`,overflow:!0,frag:`
${u}
${d}
vec4 transition(vec2 uv, float t) {
  float jitter = ign(gl_FragCoord.xy);
  float blur = sin(t * 3.141593);
  vec2 offset = vec2(t * 2.0 - 1.0, 0.0) * 0.01 * blur;

  vec4 c1 = vec4(0.0);
  vec4 c2 = vec4(0.0);
  for (float n = 0.0; n < 16.0; n += 1.0) {
    float i = n + jitter;
    vec2 uvr = (uv - 0.5) * (1.0 - blur * i * 0.02) + offset * i + 0.5;
    vec2 uvg = (uv - 0.5) * (1.0 - blur * i * 0.04) + offset * i + 0.5;
    vec2 uvb = (uv - 0.5) * (1.0 - blur * i * 0.05) + offset * i + 0.5;
    c1 += splitRead(uvr, uvg, uvb, false);
    c2 += splitRead(uvr, uvg, uvb, true);
  }
  return mix(c1 / 16.0, c2 / 16.0, t);
}
`})})))()}function Ae(){return(Ae=e((()=>{r(),g(),ie(),oe(),se(),le(),D(),F(),L(),z(),V(),he(),_e(),xe(),Te(),De(),ke()})))()}function je(e){let t=Z[e],n=[1,2,3].map(e=>`<li style="flex:1; padding:16px; border-radius:12px; background:${t.color}; color:#111">Card ${e}</li>`).join(``),r=document.createElement(`section`);return r.innerHTML=`
        <h2 style="margin:0 0 12px">${t.title}</h2>
        <p style="margin:0 0 24px; line-height:1.6">${t.body}</p>
        <ul style="display:flex; gap:16px; margin:0; padding:0; list-style:none">${n}</ul>
    `,r.hidden=e>0,r}var Y,X,Z,Q,$,Me;function Ne(){return(Ne=e((()=>{Ae(),a(),Y={crossfade:t,swipe:be,swipeUp:ve({direction:`up`}),zoom:Ee,zoomBlur:Oe,crosszoom:h,glitch:ce,glitchSlide:ue,datamosh:re,pixelsort:me,pixelsortRight:H({direction:`right`}),lensDistortion:I,slitScan:ge,pixelScan:R,pixelStretch:B,tile:we,tileUp:J({direction:`up`}),tileSquare:J({shape:`square`}),distortFade:ae},X={none:void 0,"48px":48,full:!0},Z=[{title:`Tab one`,color:`#ff4f6d`,body:`Click Next to swap this panel with a shader transition.`},{title:`Tab two`,color:`#3fb6ff`,body:`The old content is held while the DOM changes, then mixed into the new one.`},{title:`Tab three`,color:`#7bdc6b`,body:`A new run during a transition drops the old one.`}],Q={title:`Transition`,parameters:{layout:`fullscreen`}},$={args:{transition:`crossfade`,reverse:!1,duration:.8,overflow:`none`},argTypes:{transition:{control:{type:`select`},options:Object.keys(Y)},overflow:{control:{type:`select`},options:Object.keys(X)},duration:{control:{type:`range`,min:0,max:3,step:.1}}},render:e=>{let t=document.createElement(`div`);t.style.cssText=`padding:64px; font-family:sans-serif; color:white; max-width:720px`;let n=document.createElement(`button`);n.textContent=`Next`,n.style.cssText=`margin-bottom:24px; font-size:1rem`;let r=document.createElement(`div`);r.style.cssText=`width:560px; height:240px; box-sizing:border-box; padding:24px; border-radius:16px; background:#222`;let a=0;r.append(...Z.map((e,t)=>je(t))),t.append(n,r);let o=ee(),s=i(o?{timeScale:0}:void 0),c=s.addTransition(r,{transition:Y[e.transition],reverse:e.reverse,duration:e.duration,overflow:X[e.overflow],waitFor:`none`}),l=()=>(a=(a+1)%Z.length,c.show(a));return n.addEventListener(`click`,()=>void l()),o&&requestAnimationFrame(()=>{l(),setTimeout(()=>{s.setTime(e.duration/2),s.render()},1e3)}),t}},Me=[`Tabs`],$.parameters={...$.parameters,docs:{...$.parameters?.docs,source:{originalSource:`{
  args: {
    transition: "crossfade",
    reverse: false,
    duration: 0.8,
    overflow: "none"
  },
  argTypes: {
    transition: {
      control: {
        type: "select"
      },
      options: Object.keys(TRANSITIONS)
    },
    overflow: {
      control: {
        type: "select"
      },
      options: Object.keys(OVERFLOW)
    },
    duration: {
      control: {
        type: "range",
        min: 0,
        max: 3,
        step: 0.1
      }
    }
  },
  render: args => {
    const root = document.createElement("div");
    root.style.cssText = "padding:64px; font-family:sans-serif; color:white; max-width:720px";

    // Keep the button outside the container, so the capture never covers it.
    const next = document.createElement("button");
    next.textContent = "Next";
    next.style.cssText = "margin-bottom:24px; font-size:1rem";

    // A fixed-size box: the tabs share one size, so nothing moves between them.
    // Width is explicit too; the story root shrinks to its content otherwise.
    const container = document.createElement("div");
    container.style.cssText = "width:560px; height:240px; box-sizing:border-box; padding:24px; border-radius:16px; background:#222";
    let index = 0;
    container.append(...PAGES.map((_, i) => renderPage(i)));
    root.append(next, container);
    const chromatic = isChromatic();
    const vfx = initVFX(chromatic ? {
      timeScale: 0
    } : undefined);
    const transition = vfx.addTransition(container, {
      transition: TRANSITIONS[args.transition],
      reverse: args.reverse,
      duration: args.duration,
      overflow: OVERFLOW[args.overflow],
      waitFor: "none"
    });
    const swap = () => {
      index = (index + 1) % PAGES.length;
      return transition.show(index);
    };
    next.addEventListener("click", () => void swap());
    if (chromatic) {
      // Pin the clock halfway through one run for a stable snapshot.
      requestAnimationFrame(() => {
        void swap();
        setTimeout(() => {
          vfx.setTime(args.duration / 2);
          vfx.render();
        }, 1000);
      });
    }
    return root;
  }
}`,...$.parameters?.docs?.source}}}})))()}Ne();export{$ as Tabs,Me as __namedExportsOrder,Q as default};