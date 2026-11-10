import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{o as t,t as n}from"./src-CD8aVKR1.js";import{nt as r,t as i,w as a}from"./esm-Dh2VieTG.js";function ee(e,t,n){return{...e,src:t,target:n,draw:t=>e.draw({...t,target:t.target??n}),blit:(t,r,i)=>e.blit(t,r??n,i),clear:t=>e.clear(t??n)}}var o,s,c,l,u,d,f,p,m;function h(){return(h=e((()=>{n(),o=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},s=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},l=`
vec4 splitRead(vec2 uvr, vec2 uvg, vec2 uvb, bool to) {
  vec4 r = to ? readTo(uvr) : readFrom(uvr);
  vec4 g = to ? readTo(uvg) : readFrom(uvg);
  vec4 b = to ? readTo(uvb) : readFrom(uvb);
  return vec4(r.r, g.g, b.b, (r.a + g.a + b.a) / 3.0);
}
`,u=`
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
`,d=`
vec2 mirror(vec2 p) {
  return 1.0 - abs(1.0 - mod(p, 2.0));
}
`,f=class extends t{constructor(){super(...arguments),this.name=`hard_cut`,this.frag=`
vec4 transition(vec2 uv, float t) {
  return t < 0.5 ? readFrom(uv) : readTo(uv);
}
`}},p=e=>typeof e.render==`function`&&e.enabled!==!1,m=class{constructor(e={}){c.set(this,[]),this.params=e}async init(e){o(this,c,this.stages.slice(1).map(()=>e.createRenderTarget()),`f`);for(let t of this.stages)await t.init?.(e)}start(e){for(let t of this.stages)t.start?.(e)}update(e){for(let t of this.stages)t.update?.(e)}render(e){let t=this.stages.filter(p);if(t.length===0){e.blit(e.src);return}let n=e.src;for(let[r,i]of t.entries()){if(r===t.length-1){i.render?.({...e,src:n});return}let a=s(this,c,`f`)[r];e.clear(a),i.render?.(ee(e,n,a)),n=a}}end(){for(let e of this.stages)e.end?.()}outputRect(e){let t=this.stages.filter(p);return t[t.length-1]?.outputRect?.(e)}dispose(){for(let e of this.stages)e.dispose?.();for(let e of s(this,c,`f`))e.dispose();o(this,c,[],`f`)}},c=new WeakMap})))()}var te;function g(){return(g=e((()=>{n(),h(),te=class extends t{constructor(){super(...arguments),this.name=`crosszoom`,this.overflow=!0,this.frag=`
const float STRENGTH = 0.4;
const float TAPS = 16.0;

${u}
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
`}}})))()}function ne(e){return e!==void 0&&Number.isFinite(e)&&e>=2?Math.round(e):re}var _,v,y,b,x,S,C,w,re,ie,T,E;function D(){return(D=e((()=>{n(),i(),h(),_=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},v=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},S=.25,C=1.5,w=2,re=32,ie=class extends t{constructor(){super(...arguments),this.name=`datamosh`,this.frag=`
vec4 transition(vec2 uv, float t) {
  return reverse > 0.5 ? readFrom(uv) : readTo(uv);
}
`}},T=class extends r{constructor(e){super({dup:0,blockSize:e()}),y.set(this,void 0),b.set(this,0),x.set(this,1),_(this,y,e,`f`)}start(e){this.params.blockSize=v(this,y,`f`).call(this),this.params.chromaGain=C,this.params.useResidual=!1,this.params.healRate=0,_(this,b,0,`f`),_(this,x,Math.max(e.duration*.75,.001),`f`),this.enable()}update(e){var t;let{x:n}=e.progress,r=Math.min(Math.max((n-S)/.75,0),1);this.params.useResidual=_(this,b,(t=v(this,b,`f`),++t),`f`)>w,this.params.chromaGain=C+-.5*r,this.params.healRate=n<S?0:1-.01**(e.deltaTime/v(this,x,`f`))}end(){this.disable()}},y=new WeakMap,b=new WeakMap,x=new WeakMap,E=class extends m{constructor(){super(...arguments),this.name=`datamosh`,this.stages=[new ie,new T(()=>ne(this.params.blockSize))]}}})))()}var O;function k(){return(k=e((()=>{n(),h(),O=class extends t{constructor(){super(...arguments),this.name=`distort_fade`,this.frag=`
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

${d}
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
`}}})))()}function A(){return(A=e((()=>{n()})))()}var j;function M(){return(M=e((()=>{n(),h(),j=class extends t{constructor(){super(...arguments),this.name=`glitch`,this.frag=`
uniform float amount;
uniform float speed;

float gnoise(float y) {
  return sin(y * 7.0) * sin(y * 17.0) * sin(y * 59.0);
}
vec2 gnoise(vec2 uv) {
  return vec2(gnoise(uv.x), gnoise(uv.y + 100.0));
}

${l}
vec4 transition(vec2 uv, float t) {
  // A container overflow must not show wrapped content outside the element.
  if (!inRange(uv)) return vec4(0.0);
  float shift = sin(floor(t * 10.0 + 0.5) / 10.0 * 3.141593) * amount;
  float n = t * speed;
  vec2 uvr = uv, uvg = uv, uvb = uv;
  if (gnoise(n * 3.0 + 10.0) > 0.0) {
    uvr += gnoise(vec2(floor(n * 21.0), floor(n * 31.0))) * vec2(1.0, 0.1) * shift;
    uvg += gnoise(vec2(floor(n * 22.0), floor(n * 32.0))) * vec2(1.0, 0.1) * shift;
    uvb += gnoise(vec2(floor(n * 23.0), floor(n * 33.0))) * vec2(1.0, 0.1) * shift;
  }
  // Wrap so shifted areas show content rather than holes.
  uvr = fract(uvr);
  uvg = fract(uvg);
  uvb = fract(uvb);

  vec4 c1 = splitRead(uvr, uvg, uvb, false);
  vec4 c2 = splitRead(uvr, uvg, uvb, true);
  return mix(c1, c2, step(0.5, t));
}
`}uniforms(){return{amount:this.params.amount??1,speed:this.params.speed??1}}}})))()}var ae;function N(){return(N=e((()=>{n(),ae=class extends t{constructor(){super(...arguments),this.name=`glitch_slide`,this.frag=`
// The old content, then the new one to its right, as one strip.
vec4 strip(vec2 p) {
  return p.x < 1.0 ? readFrom(p) : readTo(vec2(p.x - 1.0, p.y));
}

// Each stripe slows down as it lands, so the end does not snap.
float shift(float x) {
  x = clamp(x, 0.0, 1.0);
  return 1.0 - (1.0 - x) * (1.0 - x);
}

vec4 transition(vec2 uv, float t) {
  // A container overflow must not show wrapped content outside the element.
  if (!inRange(uv)) return vec4(0.0);
  float y = floor(uv.y * 53.0) / 53.0;
  float n = sin(y * 7.0) * sin(y * 17.0) * sin(y * 59.0) * 0.5 + 0.5;

  // Fade the shift in over the first 5% so the start matches the idle content.
  float k = min(t * 20.0, 1.0);
  vec2 uvr = uv, uvg = uv, uvb = uv;
  uvr.x += shift(t * 1.8 - n * 0.2 - 0.1) * k;
  uvg.x += shift(t * 1.8 - n * 0.2) * k;
  uvb.x += shift(t * 1.8 - n * 0.2 + 0.1) * k;

  vec4 r = strip(uvr);
  vec4 g = strip(uvg);
  vec4 b = strip(uvb);
  return vec4(r.r, g.g, b.b, (r.a + g.a + b.a) / 3.0);
}
`}}})))()}function oe(){return(oe=e((()=>{i(),h()})))()}var se;function P(){return(P=e((()=>{n(),h(),se=class extends t{constructor(){super(...arguments),this.name=`lens_distortion`,this.frag=`
uniform float strength;
uniform float dispersion;
// The old content zooms from 1 to 1 + zoom; the new one from 1 + zoom back to 1.
uniform float zoom;
const float TAPS = 12.0;
// Width of the growing warp's edge.
const float SOFT = 0.5;

${u}
${d}
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
  float zoomFrom = 1.0 + zoom * t;
  float zoomTo = 1.0 + zoom * (1.0 - t);

  vec3 rgb = vec3(0.0);
  vec3 total = vec3(0.0);
  float alpha = 0.0;
  for (float n = 0.0; n < TAPS; n += 1.0) {
    float k = (n + jitter) / TAPS;
    float s = amount * strength * (1.0 + dispersion * (k - 0.5) * 2.0);
    vec2 q = p * (1.0 - l * s);
    q.x /= aspect;
    vec4 c = vec4(0.0);
    if (mixT < 1.0) c += readFrom(mirror(q / zoomFrom * 0.5 + 0.5)) * (1.0 - mixT);
    if (mixT > 0.0) c += readTo(mirror(q / zoomTo * 0.5 + 0.5)) * mixT;
    // Each tap adds to the color channels near its place in the spectrum.
    vec3 w = max(vec3(0.0), 1.0 - abs(vec3(k) - vec3(0.0, 0.5, 1.0)) * 2.0);
    rgb += c.rgb * w;
    total += w;
    alpha += c.a;
  }
  return vec4(rgb / total, alpha / TAPS);
}
`}uniforms(){return{strength:this.params.strength??1,dispersion:Math.max(0,this.params.dispersion??.6),zoom:Math.max(0,this.params.zoom??3)}}}})))()}var F,I;function L(){return(L=e((()=>{n(),F={right:[1,0],left:[-1,0],up:[0,1],down:[0,-1],center:[0,0]},I=class extends t{constructor(){super(...arguments),this.name=`pixel_scan`,this.frag=`
uniform float blackout;
// Zero spreads out in rings; otherwise the side the fronts sweep toward.
uniform vec2 sweep;
const float W = 0.2;
// Half width of each glowing front.
const float GLOW = 0.12;
// How far the front of the new content trails the old one.
const float GAP = 0.6;
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

// Where the front reaches the cell, in [0, 1]. Cells span [-scale, scale] in x and the aspect-scaled range in y.
float cellPos(vec2 pi, float scale) {
  vec2 size = vec2(1.0, aspect());
  if (sweep == vec2(0.0)) return length(pi / scale) / length(size);
  return 0.5 + dot(pi / (scale * size * 2.0), sweep);
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
  float anim = smoothstep(GLOW, 0.0, abs(x + n * W - t));
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
  float h = x + hash(pi) * W;
  // The old content leaves at the front t; the new one arrives at a second front behind it.
  float tIn = t - GAP;
  float out_ = smoothstep(t, t - W, h);
  float in_ = smoothstep(tIn, tIn - W, h);
  vec4 from = readFrom(uv);
  vec4 to = readTo(uv);
  float a = max(from.a, to.a);
  float gap = blackout * (out_ - in_);
  vec4 c = from * (1.0 - out_) + to * in_ + vec4(0.0, 0.0, 0.0, a) * gap;
  vec4 glow = cellsColor(p * scale, scale, t) + cellsColor(p * scale, scale, tIn);
  return c + glow * 1.5;
}

vec4 transition(vec2 uv, float t) {
  // A container overflow must not show cells outside the element.
  if (!inRange(uv)) return vec4(0.0);
  vec2 p = uv * 2.0 - 1.0;
  p.y *= aspect();
  // Start and end with both fronts and their glow fully off the element.
  t = mix(-GLOW, 1.0 + W * 2.0 + GAP + GLOW, t);
  vec4 c = vec4(0.0);
  for (float i = 0.0; i < LAYERS; i++) {
    c += draw(uv, p, t, abs(cos(i) * 7.3 + 10.0));
  }
  c /= LAYERS;
  return vec4(c.rgb, min(c.a, 1.0));
}
`}uniforms(){return{blackout:this.params.blackout??!0?1:0,sweep:F[this.params.direction??`right`]}}}})))()}var R;function z(){return(z=e((()=>{n(),R=class extends t{constructor(){super(...arguments),this.name=`pixel_stretch`,this.frag=`
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
`}}})))()}var B,V,H,U,W,G,K;function q(){return(q=e((()=>{i(),h(),B=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},V=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},W={up:`down`,down:`up`,left:`right`,right:`left`},G=class extends a{constructor(e){super({range:[1,1]}),H.set(this,void 0),U.set(this,!1),B(this,H,e,`f`)}start(e){let t=V(this,H,`f`).call(this);B(this,U,e.reverse,`f`),this.params.direction=e.reverse?W[t]:t,this.params.range[0]=1}update(e){let{t}=e.progress,n=V(this,H,`f`).call(this),r=V(this,U,`f`)?1-t:t;this.params.direction=r<.5?n:W[n],this.params.range[0]=Math.abs(1-2*t)}end(){this.params.range[0]=1}},H=new WeakMap,U=new WeakMap,K=class extends m{constructor(){super(...arguments),this.name=`pixelsort`,this.stages=[new f,new G(()=>this.params.direction??`up`)]}}})))()}var ce;function J(){return(J=e((()=>{n(),ce=class extends t{constructor(){super(...arguments),this.name=`slit_scan`,this.frag=`
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
`}}})))()}var le,ue;function Y(){return(Y=e((()=>{n(),h(),le={left:[-1,0],right:[1,0],up:[0,1],down:[0,-1]},ue=class extends t{constructor(){super(...arguments),this.name=`swipe`,this.frag=`
uniform vec2 move;
const float STRETCH = 0.6;
const float BLUR = 0.2;
const float TAPS = 16.0;

${u}
// The old and new content as one strip along the move.
vec4 strip(vec2 p) {
  return inRange(p) ? readFrom(p) : readTo(p + move);
}

vec4 transition(vec2 uv, float t) {
  // A container overflow must not show shifted content outside the element.
  if (!inRange(uv)) return vec4(0.0);
  // Peaks halfway, when the content moves fastest.
  float speed = sin(t * 3.141593);
  vec2 scale = 1.0 + abs(move) * speed * STRETCH;
  vec2 p = (uv - 0.5) / scale + 0.5 - move * t;
  float jitter = ign(gl_FragCoord.xy);
  vec4 c = vec4(0.0);
  for (float i = 0.0; i < TAPS; i += 1.0) {
    float k = (i + jitter) / TAPS - 0.5;
    c += strip(p + move * k * speed * BLUR);
  }
  return c / TAPS;
}
`}uniforms(){return{move:le[this.params.direction??`left`]}}}})))()}var de,fe,X,pe,me;function Z(){return(Z=e((()=>{n(),de={center:[0,0],left:[-1,0],right:[1,0],up:[0,1],down:[0,-1]},fe={hex:`
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
`},X=e=>`
uniform float count;
uniform float shadow;
// Zero spreads out in rings; otherwise the side the sweep moves toward.
uniform vec2 sweep;
const float SPREAD = 0.6;
// Shadow offset and blur at full lift, in tiles.
const vec2 SHADOW_OFFSET = vec2(0.05, -0.08);
const float SHADOW_BLUR = 0.12;
${fe[e]}
vec4 transition(vec2 uv, float t) {
  // A container overflow must not show tiles outside the element.
  if (!inRange(uv)) return vec4(0.0);
  // Grid in tile units, centered on the element.
  float tilePx = max(resolution.x, resolution.y) / count;
  vec2 extent = resolution * 0.5 / tilePx;
  vec4 cell = cellOf((uv - 0.5) * resolution / tilePx);
  vec2 local = cell.xy;
  vec2 center = cell.zw;

  // Delay of this tile, in [0, 1]. The extent is half the grid size, in tiles.
  float d = sweep == vec2(0.0)
    ? length(center) / length(extent)
    : 0.5 + dot(center / (extent * 2.0), sweep);
  d = clamp(d, 0.0, 1.0);
  float scale = 1.0 - smoothstep(0.0, 1.0, clamp((t - d * SPREAD) / (1.0 - SPREAD), 0.0, 1.0));
  // Distance outside the shrunk tile, in pixels.
  float edge = (cellDist(local) - 0.5 * scale) * tilePx;
  float inside = 1.0 - smoothstep(0.0, 1.0, edge);
  vec4 to = readTo(uv);
  if (scale <= 0.0) return to;

  // The tile lifts as it shrinks, so its shadow moves away and softens.
  float lift = 1.0 - scale;
  float blur = SHADOW_BLUR * lift * tilePx + 1.0;
  float shadowEdge = (cellDist(local - SHADOW_OFFSET * lift) - 0.5 * scale) * tilePx;
  float shade = shadow * smoothstep(0.0, 0.2, lift) * (1.0 - smoothstep(-blur, blur, shadowEdge));
  to = vec4(to.rgb * (1.0 - shade), max(to.a, shade));
  if (inside <= 0.0) return to;

  vec4 from = readFrom((center + local / scale) * tilePx / resolution + 0.5);
  from *= inside;
  return from + to * (1.0 - from.a);
}
`,pe={hex:X(`hex`),square:X(`square`)},me=class extends t{constructor(){super(...arguments),this.name=`tile`}get frag(){return pe[this.params.shape??`hex`]}uniforms(){return{count:Math.max(1,Math.round(this.params.count??12)),shadow:Math.min(Math.max(this.params.shadow??.5,0),1),sweep:de[this.params.direction??`center`]}}}})))()}var he;function Q(){return(Q=e((()=>{n(),he=class extends t{constructor(){super(...arguments),this.name=`zoom`,this.overflow=!0,this.frag=`
vec4 transition(vec2 uv, float t) {
  vec2 uv1 = (uv - 0.5) * (1.0 - t) + 0.5;
  vec2 uv2 = (uv - 0.5) / (t * 0.999 + 0.001) + 0.5;
  // Tile the new content only inside the element, so the overflow shows just the old one.
  vec4 to = inRange(uv) ? readTo(fract(uv2)) : vec4(0.0);
  return mix(readFrom(uv1), to, t);
}
`}}})))()}var ge;function $(){return($=e((()=>{n(),h(),ge=class extends t{constructor(){super(...arguments),this.name=`zoom_blur`,this.overflow=!0,this.frag=`
${l}
${u}
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
`}}})))()}function _e(){return(_e=e((()=>{n(),g(),D(),k(),A(),M(),N(),oe(),P(),L(),z(),q(),J(),Y(),Z(),Q(),$()})))()}export{M as C,D,E,te as O,j as S,k as T,L as _,Q as a,ae as b,ue as c,J as d,K as f,I as g,z as h,he as i,g as k,Y as l,R as m,ge as n,me as o,q as p,$ as r,Z as s,_e as t,ce as u,se as v,O as w,N as x,P as y};