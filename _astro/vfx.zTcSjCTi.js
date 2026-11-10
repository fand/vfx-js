import{n as e,r as t,t as n}from"./esm.D1WLRyTx.js";var r=Object.defineProperty,i=(e,t)=>{let n={};for(var i in e)r(n,i,{get:e[i],enumerable:!0});return t||r(n,Symbol.toStringTag,{value:`Module`}),n},a=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},o=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},s,c=`
vec4 splitRead(vec2 uvr, vec2 uvg, vec2 uvb, bool to) {
  vec4 r = to ? readTo(uvr) : readFrom(uvr);
  vec4 g = to ? readTo(uvg) : readFrom(uvg);
  vec4 b = to ? readTo(uvb) : readFrom(uvb);
  return vec4(r.r, g.g, b.b, (r.a + g.a + b.a) / 3.0);
}
`,l=`
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
`,u=`
vec2 mirror(vec2 p) {
  return 1.0 - abs(1.0 - mod(p, 2.0));
}
`,d=class extends t{constructor(){super(...arguments),this.name=`hard_cut`,this.frag=`
vec4 transition(vec2 uv, float t) {
  return t < 0.5 ? readFrom(uv) : readTo(uv);
}
`}},f=e=>typeof e.render==`function`&&e.enabled!==!1;function p(e,t,n){return{...e,src:t,target:n,draw:t=>e.draw({...t,target:t.target??n}),blit:(t,r,i)=>e.blit(t,r??n,i),clear:t=>e.clear(t??n)}}var m=class{constructor(e={}){s.set(this,[]),this.params=e}async init(e){a(this,s,this.stages.slice(1).map(()=>e.createRenderTarget()),`f`);for(let t of this.stages)await t.init?.(e)}start(e){for(let t of this.stages)t.start?.(e)}update(e){for(let t of this.stages)t.update?.(e)}render(e){let t=this.stages.filter(f);if(t.length===0){e.blit(e.src);return}let n=e.src;for(let[r,i]of t.entries()){if(r===t.length-1){i.render?.({...e,src:n});return}let a=o(this,s,`f`)[r];e.clear(a),i.render?.(p(e,n,a)),n=a}}end(){for(let e of this.stages)e.end?.()}outputRect(e){let t=this.stages.filter(f);return t[t.length-1]?.outputRect?.(e)}dispose(){for(let e of this.stages)e.dispose?.();for(let e of o(this,s,`f`))e.dispose();a(this,s,[],`f`)}};s=new WeakMap;var h=class extends t{constructor(){super(...arguments),this.name=`crosszoom`,this.overflow=!0,this.frag=`
const float STRENGTH = 0.4;
const float TAPS = 16.0;

${l}
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
`}},g=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},_=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ee,te,ne,re,ie,ae,oe,se,ce,le,ue={standard:` .:-=+*#%@`,minimal:` .#`,blocks:` ░▒▓█`,dots:` .·•●`,circles:` ◌○◉●`,detailed:` .'\`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$`},de=`#version 300 es
precision highp float;

in vec2 uvContent;
out vec4 outColor;

uniform sampler2D src;
uniform sampler2D atlas;
uniform vec4 srcRectUv;
uniform vec2 elementPx;     // element size, physical px
uniform vec2 cellPx;        // cell size, physical px
uniform float cols;         // atlas columns
uniform float rows;         // atlas rows
uniform float charCount;    // number of glyphs in the ramp
uniform vec4 color;         // fixed glyph colour (when colorFromSource == 0)
uniform vec4 background;     // cell backdrop, non-premultiplied
uniform int colorFromSource; // 1 = tint glyph with the cell's avg colour
uniform int invert;          // 1 = flip the luminance → glyph mapping
uniform float glyphAspect;   // font's character box aspect (advance / em)
uniform int tileColor;       // 1 = use the atlas tile's own RGBA (image tiles)
uniform float dither;        // ordered-dither amount in index units (0 = off)
uniform vec2 atlasCellPx;    // atlas cell size in texels (for edge inset)

// Box-average TAPS x TAPS samples per cell. A single centre tap throws
// away most of the cell; this keeps the glyph choice representative. 3x3
// keeps the luminance stable enough for the discrete glyph mapping while
// costing far fewer fetches than a 4x4 grid.
const int TAPS = 3;

vec4 readSrc(vec2 contentUv) {
    vec2 p = clamp(contentUv, 0.0, 1.0);
    return texture(src, srcRectUv.xy + p * srcRectUv.zw);
}

// 4x4 ordered (Bayer) dither threshold in (0, 1), keyed by cell index so
// the offset is constant across a cell (one character per cell).
float bayer4x4(vec2 cell) {
    int x = int(mod(cell.x, 4.0));
    int y = int(mod(cell.y, 4.0));
    float m[16] = float[16](
        0.0, 8.0, 2.0, 10.0,
        12.0, 4.0, 14.0, 6.0,
        3.0, 11.0, 1.0, 9.0,
        15.0, 7.0, 13.0, 5.0
    );
    return (m[y * 4 + x] + 0.5) / 16.0;
}

void main() {
    if (uvContent.x < 0.0 || uvContent.x > 1.0 ||
        uvContent.y < 0.0 || uvContent.y > 1.0) {
        outColor = vec4(0.0);
        return;
    }

    // Anchor the grid at the element (srcRect) centre so cells are
    // symmetric about the middle instead of growing from the bottom-left
    // corner — any partial cells split evenly between opposite edges.
    vec2 fragPx = uvContent * elementPx;
    vec2 gridOrigin = elementPx * 0.5;
    vec2 rel = fragPx - gridOrigin;
    vec2 cellIdx = floor(rel / cellPx);
    vec2 cellOriginPx = gridOrigin + cellIdx * cellPx;

    vec4 acc = vec4(0.0);
    for (int y = 0; y < TAPS; ++y) {
        for (int x = 0; x < TAPS; ++x) {
            vec2 o = (vec2(float(x), float(y)) + 0.5) / float(TAPS);
            vec2 samplePx = cellOriginPx + o * cellPx;
            acc += readSrc(samplePx / elementPx);
        }
    }
    acc /= float(TAPS * TAPS);

    float lum = dot(acc.rgb, vec3(0.299, 0.587, 0.114));
    if (invert == 1) {
        lum = 1.0 - lum;
    }

    // Pick the glyph and its cell in the atlas (top-row origin in canvas
    // space; the texture is uploaded Y-flipped, hence the 1.0 - ... on v).
    // Ordered dither perturbs the continuous index by up to ±0.5 cell
    // (at dither == 1), so neighbouring cells round to different glyphs
    // and short ramps gain apparent tonal steps without banding.
    float li = lum * charCount;
    if (dither > 0.0) {
        li += (bayer4x4(cellIdx) - 0.5) * dither;
    }
    float idx = clamp(floor(li), 0.0, charCount - 1.0);
    float col = mod(idx, cols);
    float rowTop = floor(idx / cols);

    // Fit the glyph's character box into the cell with its native
    // aspect preserved (contain): scale by the limiting axis and centre,
    // so a wide cell letterboxes left/right and a tall cell top/bottom
    // instead of stretching the glyph to the cell's aspect.
    vec2 local = fract(rel / cellPx);
    float cellAspect = cellPx.x / cellPx.y;
    vec2 frac = min(vec2(1.0), vec2(glyphAspect / cellAspect, cellAspect / glyphAspect));
    vec2 gloc = (local - 0.5) / frac + 0.5;

    vec4 tile = vec4(0.0);
    if (gloc.x >= 0.0 && gloc.x <= 1.0 && gloc.y >= 0.0 && gloc.y <= 1.0) {
        // Image tiles can fill the cell edge-to-edge, so linear filtering
        // would bleed a neighbouring tile's colour across the shared
        // border — inset the sample by half a texel to stop it. Glyphs
        // have transparent side bearings, so they need no inset.
        vec2 inset = tileColor == 1 ? 0.5 / atlasCellPx : vec2(0.0);
        vec2 g2 = mix(inset, 1.0 - inset, gloc);
        float u = (col + g2.x) / cols;
        float v = 1.0 - (rowTop + 1.0 - g2.y) / rows;
        tile = texture(atlas, vec2(u, v));
    }

    // Image tiles keep their own RGBA; glyph tiles are a coverage mask in
    // .a, tinted by color (or the cell's average colour). The alpha is the
    // same either way: tile coverage x color.a (global opacity) x the
    // cell's source alpha, so transparent regions (e.g. text captures)
    // fall back to the background.
    // acc is premultiplied. Un-premultiply it, since fgA applies the alpha below.
    vec3 srcRgb = acc.a > 0.0 ? acc.rgb / acc.a : vec3(0.0);
    vec3 fg;
    if (tileColor == 1) {
        fg = tile.rgb;
    } else {
        fg = colorFromSource == 1 ? srcRgb : color.rgb;
    }
    float fgA = tile.a * color.a * acc.a;

    float outA = fgA + background.a * (1.0 - fgA);
    vec3 premul = fg * fgA + background.rgb * background.a * (1.0 - fgA);
    outColor = vec4(premul, outA);
}
`,fe={grid:12,preset:`standard`,font:`monospace`,fontWeight:`normal`,color:[1,1,1,1],background:[0,0,0,0],colorFromSource:!1,invert:!1,dither:0},v=64;function pe(e){return Array.isArray(e)?[...e]:Array.from(e)}function me(e){return typeof e==`number`?[e,e]:e}async function he(e,t){let n=typeof document<`u`?document.fonts:void 0;if(n?.load)try{await n.load(`${t} ${v}px ${e}`),await n.ready}catch{}}function ge(e,t,n,r){let i=Math.max(1,e.length),a=Math.ceil(Math.sqrt(i)),o=Math.ceil(i/a),s=`${n} ${v}px ${t}`,c=document.createElement(`canvas`),l;if(r&&r>0)l=Math.max(1,Math.round(r*v));else{let t=c.getContext(`2d`);if(l=v,t){t.font=s;let n=0;for(let r of e)n=Math.max(n,t.measureText(r).width);n>0&&(l=Math.max(1,Math.ceil(n)))}}c.width=a*l,c.height=o*v;let u=c.getContext(`2d`);if(u){u.clearRect(0,0,c.width,c.height),u.fillStyle=`#fff`,u.textAlign=`center`,u.textBaseline=`middle`,u.font=s;for(let t=0;t<e.length;t++){let n=t%a,r=Math.floor(t/a),i=n*l+l/2,o=r*v+v/2;u.save(),u.beginPath(),u.rect(n*l,r*v,l,v),u.clip(),u.fillText(e[t],i,o),u.restore()}}return{canvas:c,cols:a,rows:o,cellW:l,cellH:v}}var _e=2048,ve=256;function ye(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement)return[e.naturalWidth||e.width,e.naturalHeight||e.height];let t=e;return[t.width||1,t.height||1]}async function be(e){if(typeof e!=`string`)return e;let t=new Image;t.crossOrigin=`anonymous`,t.src=e;try{await t.decode()}catch{}return t}function xe(e){let t=Math.max(1,e.length),n=Math.ceil(Math.sqrt(t)),r=Math.ceil(t/n),i=e.map(ye),[a,o]=i[0]??[1,1],s=a/Math.max(1,o),c=Math.max(1,...i.map(e=>e[1])),l=Math.min(ve,Math.max(8,Math.round(c))),u=Math.max(1,Math.round(l*s)),d=Math.min(1,_e/(n*u),_e/(r*l));u=Math.max(1,Math.floor(u*d)),l=Math.max(1,Math.floor(l*d));let f=document.createElement(`canvas`);f.width=n*u,f.height=r*l;let p=f.getContext(`2d`);if(p){p.clearRect(0,0,f.width,f.height);for(let t=0;t<e.length;t++){let[r,a]=i[t],o=Math.min(u/r,l/a),s=r*o,c=a*o,d=t%n*u+(u-s)/2,f=Math.floor(t/n)*l+(l-c)/2;p.drawImage(e[t],d,f,s,c)}}return{canvas:f,cols:n,rows:r,cellW:u,cellH:l}}var Se=class{constructor(e={}){ee.add(this),te.set(this,null),ne.set(this,1),re.set(this,1),ie.set(this,1),ae.set(this,1),oe.set(this,[1,1]),se.set(this,!1),ce.set(this,null),this.params={...fe,...e}}setParams(e){Object.assign(this.params,e)}async init(e){typeof document<`u`&&(g(this,ce,e,`f`),await _(this,ee,`m`,le).call(this,e))}async updateAtlas(){_(this,ce,`f`)&&await _(this,ee,`m`,le).call(this,_(this,ce,`f`))}render(e){if(!_(this,te,`f`))return;let[t,n]=e.dims.elementPixel,[r,i]=me(this.params.grid),a=[Math.max(1,r)*e.pixelRatio,Math.max(1,i)*e.pixelRatio];e.draw({frag:de,uniforms:{src:e.src,atlas:_(this,te,`f`),elementPx:[Math.max(1,t),Math.max(1,n)],cellPx:a,cols:_(this,ne,`f`),rows:_(this,re,`f`),charCount:_(this,ie,`f`),glyphAspect:_(this,ae,`f`),atlasCellPx:_(this,oe,`f`),tileColor:+!!_(this,se,`f`),color:this.params.color,background:this.params.background,colorFromSource:+!!this.params.colorFromSource,invert:+!!this.params.invert,dither:Math.min(1,Math.max(0,this.params.dither))},target:e.target})}dispose(){_(this,te,`f`)?.dispose(),g(this,te,null,`f`),g(this,ce,null,`f`)}};te=new WeakMap,ne=new WeakMap,re=new WeakMap,ie=new WeakMap,ae=new WeakMap,oe=new WeakMap,se=new WeakMap,ce=new WeakMap,ee=new WeakSet,le=async function(e){let t=this.params.tiles,n;if(t&&t.length>0){let e=await Promise.all(t.map(be));g(this,ie,e.length,`f`),g(this,se,!0,`f`),n=xe(e)}else{t&&t.length===0&&console.warn("[VFX-JS] AsciiEffect: `tiles` is empty; falling back to characters.");let e=pe(this.params.chars??ue[this.params.preset]);e.length===0&&console.warn(`[VFX-JS] AsciiEffect: empty character ramp; nothing will be rendered.`),g(this,ie,Math.max(1,e.length),`f`),g(this,se,!1,`f`),await he(this.params.font,this.params.fontWeight),n=ge(e,this.params.font,this.params.fontWeight,this.params.charAspect)}let r=_(this,te,`f`);g(this,ne,n.cols,`f`),g(this,re,n.rows,`f`),g(this,ae,n.cellW/n.cellH,`f`),g(this,oe,[n.cellW,n.cellH],`f`),g(this,te,e.wrapTexture(n.canvas,{autoUpdate:!1,filter:`linear`}),`f`),r?.dispose()};function Ce(e,t){if(e===`fullscreen`)return t.canvasRect;let n=e*t.pixelRatio,[,,r,i]=t.contentRect;return[-n,-n,r+2*n,i+2*n]}var we=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},y=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Te,b,x,Ee,De,Oe,ke,Ae,je=`#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform float threshold;
uniform float softness;
uniform float edgeFade;

void main() {
    // Hard-gate sampling to uvSrc in [0,1]: a bare clamp would smear
    // src's edge pixels into the pad (visible as a stretched image
    // when edgeFade x pad reaches past the src buffer). The clamp on
    // texture() keeps the sampler happy; srcMask zeroes what lies
    // outside the actual src content.
    vec2 insideSrc = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float srcMask = insideSrc.x * insideSrc.y;
    vec3 srgb = texture(src, clamp(uvSrc, 0.0, 1.0)).rgb * srcMask;
    vec3 lin = pow(srgb, vec3(2.2));

    // COD:AW (Jimenez 2014) / Unity HDRP soft-knee brightness
    // response. Quadratic ramp of half-width (threshold * softness)
    // centred on the cutoff — softness gates mid-luma pixels on
    // BOTH sides of threshold, so raising it *widens* the bloom
    // (the previous one-sided smoothstep did the opposite).
    // softness=0 collapses to a hard threshold; softness=1 extends
    // the knee down to zero. br uses max-channel (COD convention)
    // so saturated primaries still trigger bloom where a Rec.709
    // luma would have hidden them.
    float br = max(max(lin.r, lin.g), lin.b);
    float knee = threshold * softness;
    float rq = clamp(br - threshold + knee, 0.0, 2.0 * knee);
    rq = rq * rq / (4.0 * knee + 1e-4);
    float contribution = max(rq, br - threshold) / max(br, 1e-4);

    // Chebyshev distance outside the inner rect in uvContent units;
    // 0 inside, positive in the pad region.
    vec2 outside = max(vec2(0.0), max(-uvContent, uvContent - 1.0));
    float outDist = max(outside.x, outside.y);
    float mask = 1.0 - smoothstep(0.0, edgeFade, outDist);
    float f = contribution * mask;

    outColor = vec4(lin * f, f);
}
`,Me=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 texelSize;
uniform int karis;

vec4 s(vec2 o) { return texture(src, uv + o); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
    vec2 t = texelSize;
    vec4 a = s(vec2(-2.0 * t.x, -2.0 * t.y));
    vec4 b = s(vec2( 0.0,       -2.0 * t.y));
    vec4 c = s(vec2( 2.0 * t.x, -2.0 * t.y));
    vec4 d = s(vec2(-2.0 * t.x,  0.0));
    vec4 e = s(vec2( 0.0,        0.0));
    vec4 f = s(vec2( 2.0 * t.x,  0.0));
    vec4 g = s(vec2(-2.0 * t.x,  2.0 * t.y));
    vec4 h = s(vec2( 0.0,        2.0 * t.y));
    vec4 i = s(vec2( 2.0 * t.x,  2.0 * t.y));
    vec4 j = s(vec2(-1.0 * t.x, -1.0 * t.y));
    vec4 k = s(vec2( 1.0 * t.x, -1.0 * t.y));
    vec4 l = s(vec2(-1.0 * t.x,  1.0 * t.y));
    vec4 m = s(vec2( 1.0 * t.x,  1.0 * t.y));

    vec4 box1 = (a + b + d + e) * 0.25;
    vec4 box2 = (b + c + e + f) * 0.25;
    vec4 box3 = (d + e + g + h) * 0.25;
    vec4 box4 = (e + f + h + i) * 0.25;
    vec4 box5 = (j + k + l + m) * 0.25;

    vec4 color;
    if (karis == 1) {
        float w1 = 1.0 / (1.0 + luma(box1.rgb));
        float w2 = 1.0 / (1.0 + luma(box2.rgb));
        float w3 = 1.0 / (1.0 + luma(box3.rgb));
        float w4 = 1.0 / (1.0 + luma(box4.rgb));
        float w5 = 1.0 / (1.0 + luma(box5.rgb));
        color = (box1 * w1 + box2 * w2 + box3 * w3 + box4 * w4 + box5 * w5)
              / (w1 + w2 + w3 + w4 + w5);
    } else {
        color = box1 * 0.125 + box2 * 0.125 + box3 * 0.125 + box4 * 0.125
              + box5 * 0.5;
    }
    outColor = color;
}
`,Ne=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D srcSmall;
uniform sampler2D srcLarge;
uniform vec2 texelSize;
uniform float weightLarge;
uniform float weightSmall;

void main() {
    vec2 t = texelSize;
    vec4 sum = vec4(0.0);
    sum += texture(srcSmall, uv + vec2(-t.x, -t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2( 0.0, -t.y)) * 2.0;
    sum += texture(srcSmall, uv + vec2( t.x, -t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2(-t.x,  0.0)) * 2.0;
    sum += texture(srcSmall, uv                  ) * 4.0;
    sum += texture(srcSmall, uv + vec2( t.x,  0.0)) * 2.0;
    sum += texture(srcSmall, uv + vec2(-t.x,  t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2( 0.0,  t.y)) * 2.0;
    sum += texture(srcSmall, uv + vec2( t.x,  t.y)) * 1.0;
    sum *= (1.0 / 16.0);
    outColor = texture(srcLarge, uv) * weightLarge + sum * weightSmall;
}
`,Pe=`#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D bloom;
uniform vec2 texelSize;
uniform float intensity;
uniform float dither;
uniform float edgeFade;

// Interleaved gradient noise (Jimenez 2014). Cheap, high-quality,
// spatially decorrelated — perfect for breaking 8-bit quantisation
// bands in the gamma-encoded bloom halo.
float ign(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void main() {
    // 5×5 binomial gaussian ([1,4,6,4,1]/16 outer-producted) via 9
    // bilinear taps at ±1.2 source texels. Each bilinear fetch
    // integrates a tap-pair perfectly, so result ≡ 25-tap convolution.
    vec2 t = texelSize * 1.2;
    vec4 b = vec4(0.0);
    b += texture(bloom, uv + vec2(-t.x, -t.y)) * 25.0;
    b += texture(bloom, uv + vec2( 0.0, -t.y)) * 30.0;
    b += texture(bloom, uv + vec2( t.x, -t.y)) * 25.0;
    b += texture(bloom, uv + vec2(-t.x,  0.0)) * 30.0;
    b += texture(bloom, uv                  ) * 36.0;
    b += texture(bloom, uv + vec2( t.x,  0.0)) * 30.0;
    b += texture(bloom, uv + vec2(-t.x,  t.y)) * 25.0;
    b += texture(bloom, uv + vec2( 0.0,  t.y)) * 30.0;
    b += texture(bloom, uv + vec2( t.x,  t.y)) * 25.0;
    b *= (1.0 / 256.0);

    // Same soft edge-fade as threshold so base and bloom share a
    // coverage footprint — base alpha tapers into the pad instead of
    // stepping from 1 to 0. The hard srcMask (same shape as the
    // threshold pass) kills anything outside src's valid [0,1] so
    // bloom pad extending past the src buffer doesn't repeat edge
    // pixels.
    vec2 insideSrc = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float srcMask = insideSrc.x * insideSrc.y;
    vec4 baseColor = texture(src, clamp(uvSrc, 0.0, 1.0)) * srcMask;
    vec2 outside = max(vec2(0.0), max(-uvContent, uvContent - 1.0));
    float outDist = max(outside.x, outside.y);
    float baseMask = 1.0 - smoothstep(0.0, edgeFade, outDist);
    baseColor.a *= baseMask;

    // Linear composite: decode base, add linear bloom, single pow out.
    vec3 baseLin = pow(baseColor.rgb, vec3(2.2));
    vec3 lin = baseLin + max(b.rgb, vec3(0.0)) * intensity;
    vec3 rgb = pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2));

    // TPDF dither just before 8-bit quantisation. Two IGN samples
    // summed give a triangular PDF in [-1, 1], which decorrelates the
    // quantisation error from the signal (uniform dither doesn't).
    // Independent per channel to avoid tinted bands.
    vec3 n1 = vec3(
        ign(gl_FragCoord.xy),
        ign(gl_FragCoord.xy + 17.0),
        ign(gl_FragCoord.xy + 41.0)
    );
    vec3 n2 = vec3(
        ign(gl_FragCoord.xy + 113.0),
        ign(gl_FragCoord.xy + 131.0),
        ign(gl_FragCoord.xy + 149.0)
    );
    vec3 n = n1 + n2 - 1.0;
    rgb += n * dither / 255.0;

    // Premultiply with the union coverage of base and bloom. At pad
    // edges both feed zero so rgb × a → 0 and the halo dissolves
    // instead of leaving a gamma-boosted floor behind.
    float a = clamp(max(baseColor.a, b.a * intensity), 0.0, 1.0);
    outColor = vec4(rgb * a, a);
}
`,Fe={threshold:.7,softness:.1,intensity:1.2,scatter:.7,pad:50,dither:0,edgeFade:.02},Ie=.5,Le=class{constructor(e={}){Te.add(this),b.set(this,null),x.set(this,[]),Ee.set(this,[]),De.set(this,!1),Oe.set(this,0),ke.set(this,0),this.params={...Fe,...e}}setParams(e){Object.assign(this.params,e)}init(e){we(this,b,e.createRenderTarget({float:!0}),`f`)}render(e){if(!y(this,b,`f`))return;let{threshold:t,softness:n,intensity:r}=this.params,i=Math.min(Math.max(this.params.scatter,0),1),a=Math.max(0,this.params.dither),o=Math.max(1e-6,this.params.edgeFade);(y(this,b,`f`).width!==y(this,Oe,`f`)||y(this,b,`f`).height!==y(this,ke,`f`))&&(y(this,x,`f`).length=0,y(this,Ee,`f`).length=0,we(this,De,!1,`f`),we(this,Oe,y(this,b,`f`).width,`f`),we(this,ke,y(this,b,`f`).height,`f`)),y(this,Te,`m`,Ae).call(this,e,y(this,b,`f`).width,y(this,b,`f`).height);let s=y(this,x,`f`).length;if(s===0)return;e.draw({frag:je,uniforms:{src:e.src,threshold:t,softness:n,edgeFade:o},target:y(this,b,`f`)}),e.draw({frag:Me,uniforms:{src:y(this,b,`f`),texelSize:[1/y(this,b,`f`).width,1/y(this,b,`f`).height],karis:1},target:y(this,x,`f`)[0]});for(let t=1;t<s;t++){let n=y(this,x,`f`)[t-1];e.draw({frag:Me,uniforms:{src:n,texelSize:[1/n.width,1/n.height],karis:0},target:y(this,x,`f`)[t]})}let c=y(this,b,`f`).width,l=y(this,b,`f`).height,u=1+i*Math.max(0,s-1),d=e=>Math.min(1,Math.max(0,u-e));for(let t=s-2;t>=0;t--){let n=t===s-2?y(this,x,`f`)[s-1]:y(this,Ee,`f`)[t+1],r=2**(t+2),i=t===s-2?d(s-1):1;e.draw({frag:Ne,uniforms:{srcSmall:n,srcLarge:y(this,x,`f`)[t],texelSize:[Ie*r/c,Ie*r/l],weightLarge:d(t),weightSmall:i},target:y(this,Ee,`f`)[t]})}let f=s>=2?y(this,Ee,`f`)[0]:y(this,x,`f`)[0],p=r/Math.max(1,u);e.draw({frag:Pe,uniforms:{src:e.src,bloom:f,texelSize:[Ie*2/c,Ie*2/l],intensity:p,dither:a,edgeFade:o},target:e.target})}outputRect(e){return Ce(this.params.pad,e)}dispose(){we(this,b,null,`f`),y(this,x,`f`).length=0,y(this,Ee,`f`).length=0,we(this,De,!1,`f`),we(this,Oe,0,`f`),we(this,ke,0,`f`)}};b=new WeakMap,x=new WeakMap,Ee=new WeakMap,De=new WeakMap,Oe=new WeakMap,ke=new WeakMap,Te=new WeakSet,Ae=function(e,t,n){if(y(this,De,`f`))return;let r=Math.max(1,Math.floor(t/2)),i=Math.max(1,Math.floor(n/2));for(let t=0;t<8;t++){y(this,x,`f`).push(e.createRenderTarget({size:[r,i],float:!0}));let t=Math.max(1,Math.floor(r/2)),n=Math.max(1,Math.floor(i/2));if(t===r&&n===i)break;r=t,i=n}for(let t=0;t<y(this,x,`f`).length-1;t++)y(this,Ee,`f`).push(e.createRenderTarget({size:[y(this,x,`f`)[t].width,y(this,x,`f`)[t].height],float:!0}));we(this,De,!0,`f`)};var Re=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
void main() {
    outColor = texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}
`,ze=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`;function Be(e,t){e.draw({frag:Re,uniforms:{src:e.src},target:t})}function Ve(e,t,n){e.draw({frag:ze,uniforms:{src:t},target:n})}var S=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},C=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},He,w,T,Ue,We,Ge,Ke,qe,Je,Ye,Xe,Ze,Qe,$e,et,tt,nt,rt,it,at,ot=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D tex;
void main() {
    if (any(lessThan(uvContent, vec2(0.0))) || any(greaterThan(uvContent, vec2(1.0)))) {
        outColor = vec4(0.0);
        return;
    }
    vec4 c = texture(tex, uvContent);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,st=`#version 300 es
precision highp float;
out vec4 outMV;
uniform sampler2D uCur, uRef;
uniform vec2 uResolution;   // [w, h] in px
uniform float uBlock;       // block size in px
uniform float uSearch;      // search radius, in steps
uniform float uStep;        // px per step (coverage = uSearch * uStep px)
uniform float uHealRate;
uniform float uHealThreshold;
uniform float uFrame;
float hash(vec3 p) {
    uvec3 q = uvec3(p) * uvec3(1597334673u, 3812015801u, 2798796415u);
    return float((q.x ^ q.y ^ q.z) * 1597334673u) / 4294967295.0;
}
void main() {
    vec2 block = floor(gl_FragCoord.xy);
    vec2 base = block * uBlock;     // top-left pixel of this block

    // Cache the current block's 3x3 samples and their (offset, px) within
    // the block — the offsets are invariant across candidates.
    vec3 cs[9];
    vec2 off[9];
    for (int i = 0; i < 3; i++) {
      for (int j = 0; j < 3; j++) {
        int k = i * 3 + j;
        off[k] = vec2(1 + i * 2, 1 + j * 2) / 6.0 * uBlock;
        cs[k] = texture(uCur, (base + off[k] + 0.5) / uResolution).rgb;
      }
    }

    vec2 move = vec2(0.0);
    float bestSad = 1e9;
    float bestRaw = 0.0;
    for (float by = -uSearch; by <= uSearch; by++) {
      for (float bx = -uSearch; bx <= uSearch; bx++) {
        vec2 cand = vec2(bx, by) * uStep;   // candidate displacement, px
        float sad = 0.0;
        for (int k = 0; k < 9; k++) {
          vec3 cRef = texture(uRef, (base + off[k] + cand + 0.5) / uResolution).rgb;
          sad += dot(abs(cs[k] - cRef), vec3(1.0));
        }
        float raw = sad;
        sad += length(cand) * 0.0025;   // prefer small motion on ties
        if (sad < bestSad) {
          bestSad = sad;
          bestRaw = raw;
          move = cand;
        }
      }
    }

    // Mean abs diff per channel, 0..1.
    float err = bestRaw / 27.0;
    bool intra = hash(vec3(block, uFrame)) < uHealRate || err > uHealThreshold;
    outMV = vec4(move, intra ? 1.0 : 0.0, 1.0);
}
`,ct=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D uCur, uRef, uMV;
uniform vec2 uResolution;
void main() {
    vec2 mv = texture(uMV, uv).rg; // px
    vec3 cur = texture(uCur, uv).rgb;
    vec3 pred = texture(uRef, uv + mv / uResolution).rgb;
    outColor = vec4(cur - pred, 1.0);
}
`,lt=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D uAccum, uMV, uVideo, uResidual;
uniform vec2 uResolution;
uniform bool uIntra;
uniform bool uUseResidual;
void main() {
    if (uIntra || texture(uMV, uv).b > 0.5) {
        outColor = vec4(texture(uVideo, uv).rgb, 1.0);
        return;
    }
    vec2 mv = texture(uMV, uv).rg; // px
    vec3 pred = texture(uAccum, uv + mv / uResolution).rgb;
    vec3 res = uUseResidual ? texture(uResidual, uv).rgb : vec3(0.0);
    // Clamp like an 8-bit decoder so the feedback can't run away to white.
    outColor = vec4(clamp(pred + res, 0.0, 1.0), 1.0);
}
`,ut=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D uMV;
uniform float uMvScale;     // magnitude normalization, px
vec3 hsv(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
void main() {
    vec2 mv = texture(uMV, uvContent).rg;
    float ang = atan(mv.y, mv.x) / 6.28318 + 0.5;
    float mag = clamp(length(mv) / max(uMvScale, 1.0), 0.0, 1.0);
    outColor = vec4(hsv(vec3(ang, 0.9, 0.15 + 0.85 * mag)), 1.0);
}
`,dt=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D uResidual;
void main() {
    vec3 r = texture(uResidual, uvContent).rgb;
    outColor = vec4(clamp(r * 0.5 + 0.5, 0.0, 1.0), 1.0);
}
`,ft=`
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 chroma(vec3 c) {
    return vec2(dot(c, vec3(-0.168736, -0.331264, 0.5)),
                dot(c, vec3(0.5, -0.418688, -0.081312))) + 0.5;
}
`,pt=`#version 300 es
precision highp float;
${ft}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uCur, uRef, uMV;
uniform vec2 uChromaRes;
void main() {
    vec2 mvc = floor(texture(uMV, uv).rg * 0.5);
    vec2 pred = chroma(texture(uRef, uv + mvc / uChromaRes).rgb);
    outColor = vec4(chroma(texture(uCur, uv).rgb) - pred, 0.0, 1.0);
}
`,mt=`#version 300 es
precision highp float;
${ft}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uAccum, uMV, uVideo, uResidual;
uniform vec2 uResolution;
uniform bool uIntra;
uniform bool uUseResidual;
void main() {
    // I-frame: passthrough the input
    if (uIntra || texture(uMV, uv).b > 0.5) {
        outColor = vec4(luma(texture(uVideo, uv).rgb), 0.0, 0.0, 1.0);
        return;
    }

    // P-frame: compose luma from acc + residual
    vec2 mv = texture(uMV, uv).rg; // px
    float pred = texture(uAccum, uv + mv / uResolution).r;
    float res = uUseResidual ? luma(texture(uResidual, uv).rgb) : 0.0;
    float Y = clamp(pred + res, 0.0, 1.0);

    outColor = vec4(Y, 0.0, 0.0, 1.0);
}
`,ht=`#version 300 es
precision highp float;
${ft}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uChromaAcc, uMV, uVideo, uResidualC;
uniform vec2 uChromaRes;
uniform bool uIntra;
uniform bool uUseResidual;
void main() {
    // I-frame: passthrough the input
    if (uIntra || texture(uMV, uv).b > 0.5) {
        outColor = vec4(chroma(texture(uVideo, uv).rgb), 0.0, 1.0);
        return;
    }

    // P-frame: compose chroma from acc + residual. uResidualC is the
    // zero-centered chroma residual (built with the SAME truncated MV as
    // the prediction below, so they cancel when residual is on).
    vec2 mv = texture(uMV, uv).rg; // px (luma units)
    vec2 mvc = floor(mv * 0.5);
    vec2 pred = texture(uChromaAcc, uv + mvc / uChromaRes).rg;
    vec2 res = uUseResidual ? texture(uResidualC, uv).rg : vec2(0);
    vec2 C = clamp(pred + res, 0.0, 1.0);

    outColor = vec4(C, 0.0, 1.0);
}
`,gt=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D uLumaAcc;
uniform sampler2D uChromaAcc;
uniform float uChromaGain;
void main() {
    if (any(lessThan(uvContent, vec2(0.0))) || any(greaterThan(uvContent, vec2(1.0)))) {
        outColor = vec4(0.0);
        return;
    }
    float Y = texture(uLumaAcc, uvContent).r;
    vec2 cbcr = (texture(uChromaAcc, uvContent).rg - 0.5) * uChromaGain;
    vec3 rgb = vec3(
        Y + 1.402 * cbcr.y,
        Y - 0.344136 * cbcr.x - 0.714136 * cbcr.y,
        Y + 1.772 * cbcr.x
    );
    outColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
}
`,_t={blockSize:16,searchRange:5,searchStep:2,useResidual:!0,dup:0,colorSpace:`ycbcr`,chromaGain:1,healRate:0,healThreshold:1,view:`output`},vt=class{constructor(e={}){He.add(this),w.set(this,!1),T.set(this,!0),Ue.set(this,null),We.set(this,null),Ge.set(this,null),Ke.set(this,null),qe.set(this,null),Je.set(this,null),Ye.set(this,null),Xe.set(this,0),Ze.set(this,0),Qe.set(this,0),$e.set(this,0),et.set(this,0),tt.set(this,0),nt.set(this,void 0),this.params={..._t,...e},S(this,nt,this.params.colorSpace,`f`)}setParams(e){Object.assign(this.params,e)}enable(){S(this,w,!0,`f`)}disable(){S(this,w,!1,`f`),S(this,T,!0,`f`)}get enabled(){return C(this,w,`f`)}render(e){var t,n;C(this,He,`m`,it).call(this,e);let r=C(this,Ue,`f`),i=C(this,We,`f`),a=C(this,Ge,`f`),o=C(this,Ke,`f`),s=C(this,qe,`f`),c=C(this,Je,`f`),l=C(this,Ye,`f`);if(!r||!i||!a||!o||!s||!c||!l)return;this.params.colorSpace!==C(this,nt,`f`)&&(S(this,nt,this.params.colorSpace,`f`),S(this,T,!0,`f`));let u=[C(this,Xe,`f`),C(this,Ze,`f`)];Be(e,r);let d=this.params.view!==`output`;if((C(this,w,`f`)||d)&&(e.draw({frag:st,uniforms:{uCur:r,uRef:i,uResolution:u,uBlock:C(this,et,`f`),uSearch:this.params.searchRange,uStep:this.params.searchStep,uHealRate:this.params.healRate,uHealThreshold:this.params.healThreshold,uFrame:(S(this,tt,(n=C(this,tt,`f`),t=n++,n),`f`),t%65536)},target:a}),e.draw({frag:ct,uniforms:{uCur:r,uRef:i,uMV:a,uResolution:u},target:o})),C(this,w,`f`)){let t=C(this,T,`f`)?1:1+this.params.dup,n=[C(this,Qe,`f`),C(this,$e,`f`)];this.params.colorSpace===`ycbcr`&&e.draw({frag:pt,uniforms:{uCur:r,uRef:i,uMV:a,uChromaRes:n},target:l});for(let i=0;i<t;i++){let t=this.params.useResidual&&i===0;this.params.colorSpace===`ycbcr`?(e.draw({frag:mt,uniforms:{uAccum:s,uMV:a,uVideo:r,uResidual:o,uResolution:u,uIntra:C(this,T,`f`),uUseResidual:t},target:s}),e.draw({frag:ht,uniforms:{uChromaAcc:c,uMV:a,uVideo:r,uResidualC:l,uChromaRes:n,uIntra:C(this,T,`f`),uUseResidual:t},target:c})):e.draw({frag:lt,uniforms:{uAccum:s,uMV:a,uVideo:r,uResidual:o,uResolution:u,uIntra:C(this,T,`f`),uUseResidual:t},target:s})}S(this,T,!1,`f`)}else S(this,T,!0,`f`);C(this,He,`m`,at).call(this,e,r,i,a,o,s,c),Be(e,i)}dispose(){C(this,He,`m`,rt).call(this),S(this,Xe,0,`f`),S(this,Ze,0,`f`),S(this,Qe,0,`f`),S(this,$e,0,`f`),S(this,et,0,`f`),S(this,T,!0,`f`)}};w=new WeakMap,T=new WeakMap,Ue=new WeakMap,We=new WeakMap,Ge=new WeakMap,Ke=new WeakMap,qe=new WeakMap,Je=new WeakMap,Ye=new WeakMap,Xe=new WeakMap,Ze=new WeakMap,Qe=new WeakMap,$e=new WeakMap,et=new WeakMap,tt=new WeakMap,nt=new WeakMap,He=new WeakSet,rt=function(){C(this,Ue,`f`)?.dispose(),C(this,We,`f`)?.dispose(),C(this,Ge,`f`)?.dispose(),C(this,Ke,`f`)?.dispose(),C(this,qe,`f`)?.dispose(),C(this,Je,`f`)?.dispose(),C(this,Ye,`f`)?.dispose(),S(this,Ue,null,`f`),S(this,We,null,`f`),S(this,Ge,null,`f`),S(this,Ke,null,`f`),S(this,qe,null,`f`),S(this,Je,null,`f`),S(this,Ye,null,`f`)},it=function(e){let[t,n]=e.dims.elementPixel,r=Math.max(2,this.params.blockSize);if(C(this,Xe,`f`)===t&&C(this,Ze,`f`)===n&&C(this,et,`f`)===r)return;C(this,He,`m`,rt).call(this),S(this,Xe,t,`f`),S(this,Ze,n,`f`),S(this,Qe,Math.ceil(t/2),`f`),S(this,$e,Math.ceil(n/2),`f`),S(this,et,r,`f`),S(this,T,!0,`f`);let i=Math.ceil(t/r),a=Math.ceil(n/r);S(this,Ue,e.createRenderTarget({size:[t,n]}),`f`),S(this,We,e.createRenderTarget({size:[t,n],persistent:!0}),`f`),S(this,Ke,e.createRenderTarget({size:[t,n],float:!0}),`f`),S(this,qe,e.createRenderTarget({size:[t,n],float:!0,persistent:!0}),`f`),S(this,Je,e.createRenderTarget({size:[C(this,Qe,`f`),C(this,$e,`f`)],float:!0,persistent:!0}),`f`),S(this,Ye,e.createRenderTarget({size:[C(this,Qe,`f`),C(this,$e,`f`)],float:!0}),`f`),S(this,Ge,e.createRenderTarget({size:[i,a],float:!0,filter:`nearest`}),`f`)},at=function(e,t,n,r,i,a,o){switch(this.params.view){case`motion`:e.draw({frag:ut,uniforms:{uMV:r,uMvScale:this.params.searchRange*this.params.searchStep},target:e.target});return;case`residual`:e.draw({frag:dt,uniforms:{uResidual:i},target:e.target});return;case`current`:e.draw({frag:ot,uniforms:{tex:t},target:e.target});return;case`previous`:e.draw({frag:ot,uniforms:{tex:n},target:e.target});return;default:C(this,w,`f`)&&this.params.colorSpace===`ycbcr`?e.draw({frag:gt,uniforms:{uLumaAcc:a,uChromaAcc:o,uChromaGain:this.params.chromaGain},target:e.target}):e.draw({frag:ot,uniforms:{tex:C(this,w,`f`)?a:t},target:e.target})}};var E=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},D=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},yt,bt,xt,St,Ct,wt,O,Tt,Et,Dt,Ot=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D velocity;
uniform vec2 simTexel;

void main() {
    float L = texture(velocity, uv - vec2(simTexel.x, 0.0)).y;
    float R = texture(velocity, uv + vec2(simTexel.x, 0.0)).y;
    float T = texture(velocity, uv + vec2(0.0, simTexel.y)).x;
    float B = texture(velocity, uv - vec2(0.0, simTexel.y)).x;
    outColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}
`,kt=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D velocity;
uniform sampler2D curl;
uniform vec2 simTexel;
uniform float aspect;
uniform vec2 mouseUv;
uniform vec2 mouseDeltaUv;
uniform float curlStrength;
uniform float splatForce;
uniform float splatRadius;

void main() {
    float L = abs(texture(curl, uv - vec2(simTexel.x, 0.0)).x);
    float R = abs(texture(curl, uv + vec2(simTexel.x, 0.0)).x);
    float T = abs(texture(curl, uv + vec2(0.0, simTexel.y)).x);
    float B = abs(texture(curl, uv - vec2(0.0, simTexel.y)).x);
    float C = texture(curl, uv).x;

    vec2 force = vec2(T - B, R - L);
    float len = length(force);
    force = len > 0.0001 ? force / len : vec2(0.0);
    force *= curlStrength * C;
    force.y *= -1.0;

    vec2 vel = texture(velocity, uv).xy;
    vel += force * 0.016;
    vel = clamp(vel, vec2(-1000.0), vec2(1000.0));

    // Mouse splat. diff is in uv space; aspect-correct so the falloff
    // is circular regardless of element shape.
    vec2 diff = uv - mouseUv;
    diff.x *= aspect;
    float mSplat = exp(-dot(diff, diff) / splatRadius);
    vel += mouseDeltaUv * mSplat * splatForce;

    outColor = vec4(vel, 0.0, 1.0);
}
`,At=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D vortVel;
uniform vec2 simTexel;

void main() {
    float L = texture(vortVel, uv - vec2(simTexel.x, 0.0)).x;
    float R = texture(vortVel, uv + vec2(simTexel.x, 0.0)).x;
    float T = texture(vortVel, uv + vec2(0.0, simTexel.y)).y;
    float B = texture(vortVel, uv - vec2(0.0, simTexel.y)).y;
    vec2 C = texture(vortVel, uv).xy;
    // No-flow-through walls: reflect velocity at boundaries.
    if (uv.x - simTexel.x < 0.0) L = -C.x;
    if (uv.x + simTexel.x > 1.0) R = -C.x;
    if (uv.y + simTexel.y > 1.0) T = -C.y;
    if (uv.y - simTexel.y < 0.0) B = -C.y;
    outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}
`,jt=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D pressure;
uniform sampler2D divergence;
uniform vec2 simTexel;

void main() {
    float L = texture(pressure, uv - vec2(simTexel.x, 0.0)).x;
    float R = texture(pressure, uv + vec2(simTexel.x, 0.0)).x;
    float T = texture(pressure, uv + vec2(0.0, simTexel.y)).x;
    float B = texture(pressure, uv - vec2(0.0, simTexel.y)).x;
    float div = texture(divergence, uv).x;
    outColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}
`,Mt=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D vortVel;
uniform sampler2D pressure;
uniform vec2 simTexel;

void main() {
    float L = texture(pressure, uv - vec2(simTexel.x, 0.0)).x;
    float R = texture(pressure, uv + vec2(simTexel.x, 0.0)).x;
    float T = texture(pressure, uv + vec2(0.0, simTexel.y)).x;
    float B = texture(pressure, uv - vec2(0.0, simTexel.y)).x;
    vec2 vel = texture(vortVel, uv).xy;
    vel -= vec2(R - L, T - B);
    outColor = vec4(vel, 0.0, 1.0);
}
`,Nt=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D projVel;
uniform vec2 simTexel;
uniform float velocityDissipation;

void main() {
    vec2 vel = texture(projVel, uv).xy;
    vec2 coord = uv - vel * simTexel * 0.016;
    vec2 advected = texture(projVel, coord).xy;
    advected /= 1.0 + velocityDissipation * 0.016;
    outColor = vec4(advected, 0.0, 1.0);
}
`,Pt=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D velocity;
uniform sampler2D dye;
uniform float time;
uniform float aspect;
uniform vec2 mouseUv;
uniform vec2 mouseDeltaUv;
uniform vec2 simSize;
uniform float densityDissipation;
uniform float dyeSplatRadius;
uniform float dyeSplatIntensity;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    // Velocity is in sim-texel units; convert to UV displacement.
    vec2 vel = texture(velocity, uv).xy;
    vec2 velTexel = 1.0 / simSize;
    vec2 coord = uv - vel * velTexel * 0.016;
    vec3 d = texture(dye, coord).rgb;

    d /= 1.0 + densityDissipation * 0.016;

    // Mouse dye splat (speed-dependent, hue cycles with time).
    vec2 diff = uv - mouseUv;
    diff.x *= aspect;
    float mSplat = exp(-dot(diff, diff) / dyeSplatRadius);
    float mSpeed = length(mouseDeltaUv) * max(simSize.x, simSize.y);
    vec3 mColor = hsv2rgb(vec3(fract(time * 0.06), 0.85, 1.0));
    d += mColor * mSplat * clamp(mSpeed * dyeSplatIntensity, 0.0, 3.0);

    outColor = vec4(max(d, vec3(0.0)), 1.0);
}
`,Ft=`#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D dye;
uniform sampler2D velocity;
uniform vec2 simSize;
uniform float showDye;
uniform float time;

vec3 spectrum(float x) {
    return cos((x - vec3(0, .5, 1)) * vec3(.6, 1., .5) * 3.14);
}

void main() {
    vec3 c = texture(dye, uv).rgb;

    if (showDye > 0.5) {
        float a = max(c.r, max(c.g, c.b));
        outColor = vec4(c, a);
    } else {
        vec2 vel = texture(velocity, uv).xy;
        vec2 disp = vel / simSize;

        vec2 cr = texture(src, uvSrc - disp * 0.080).ra;
        vec2 cg = texture(src, uvSrc - disp * 0.060).ga;
        vec2 cb = texture(src, uvSrc - disp * 0.040).ba;
        outColor = vec4(cr.x, cg.x, cb.x, (cr.y + cg.y + cb.y) / 3.);

        float v = length(disp);
        outColor += vec4(spectrum(sin(v * 3. + time) * 0.4 + 0.5), 1)
                  * smoothstep(.2, .8, v) * 0.2;
    }
}
`,It={simSize:[256,256],pressureIterations:1,curlStrength:13,velocityDissipation:.6,densityDissipation:.65,splatForce:6e3,splatRadius:.002,dyeSplatRadius:.001,dyeSplatIntensity:.005,showDye:!1},Lt=class{constructor(e={}){yt.set(this,null),bt.set(this,null),xt.set(this,null),St.set(this,null),Ct.set(this,null),wt.set(this,null),O.set(this,null),Tt.set(this,null),Et.set(this,[0,0]),Dt.set(this,!1),this.params={...It,...e}}init(e){let t=this.params.simSize,n={size:t,float:!0};E(this,yt,e.createRenderTarget(n),`f`),E(this,bt,e.createRenderTarget(n),`f`),E(this,xt,e.createRenderTarget(n),`f`),E(this,St,e.createRenderTarget(n),`f`),E(this,Ct,e.createRenderTarget(n),`f`),E(this,wt,e.createRenderTarget(n),`f`),E(this,O,e.createRenderTarget({size:t,float:!0,persistent:!0}),`f`),E(this,Tt,e.createRenderTarget({float:!0,persistent:!0}),`f`)}render(e){if(!D(this,yt,`f`)||!D(this,bt,`f`)||!D(this,xt,`f`)||!D(this,St,`f`)||!D(this,Ct,`f`)||!D(this,wt,`f`)||!D(this,O,`f`)||!D(this,Tt,`f`))return;let{simSize:t,pressureIterations:n,curlStrength:r,velocityDissipation:i,densityDissipation:a,splatForce:o,splatRadius:s,dyeSplatRadius:c,dyeSplatIntensity:l,showDye:u}=this.params,d=[1/t[0],1/t[1]],[f,p]=e.dims.elementPixel,m=f/p,h=[e.mouse[0]/f,e.mouse[1]/p],g=D(this,Dt,`f`)?[h[0]-D(this,Et,`f`)[0],h[1]-D(this,Et,`f`)[1]]:[0,0];E(this,Et,h,`f`),E(this,Dt,!0,`f`),e.draw({frag:Ot,uniforms:{velocity:D(this,O,`f`),simTexel:d},target:D(this,yt,`f`)}),e.draw({frag:kt,uniforms:{velocity:D(this,O,`f`),curl:D(this,yt,`f`),simTexel:d,aspect:m,mouseUv:h,mouseDeltaUv:g,curlStrength:r,splatForce:o,splatRadius:s},target:D(this,bt,`f`)}),e.draw({frag:At,uniforms:{vortVel:D(this,bt,`f`),simTexel:d},target:D(this,xt,`f`)}),e.clear(D(this,St,`f`));let _=D(this,St,`f`),ee=D(this,Ct,`f`);for(let t=0;t<n;t++){e.draw({frag:jt,uniforms:{pressure:_,divergence:D(this,xt,`f`),simTexel:d},target:ee});let t=_;_=ee,ee=t}e.draw({frag:Mt,uniforms:{vortVel:D(this,bt,`f`),pressure:_,simTexel:d},target:D(this,wt,`f`)}),e.draw({frag:Nt,uniforms:{projVel:D(this,wt,`f`),simTexel:d,velocityDissipation:i},target:D(this,O,`f`)}),e.draw({frag:Pt,uniforms:{velocity:D(this,O,`f`),dye:D(this,Tt,`f`),time:e.time,aspect:m,mouseUv:h,mouseDeltaUv:g,simSize:t,densityDissipation:a,dyeSplatRadius:c,dyeSplatIntensity:l},target:D(this,Tt,`f`)}),e.draw({frag:Ft,uniforms:{src:e.src,dye:D(this,Tt,`f`),velocity:D(this,O,`f`),simSize:t,showDye:+!!u,time:e.time},target:e.target})}dispose(){E(this,yt,null,`f`),E(this,bt,null,`f`),E(this,xt,null,`f`),E(this,St,null,`f`),E(this,Ct,null,`f`),E(this,wt,null,`f`),E(this,O,null,`f`),E(this,Tt,null,`f`),E(this,Dt,!1,`f`)}};yt=new WeakMap,bt=new WeakMap,xt=new WeakMap,St=new WeakMap,Ct=new WeakMap,wt=new WeakMap,O=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap;var Rt={pure:{cyan:[0,1,1,1],magenta:[1,0,1,1],yellow:[1,1,0,1],black:[0,0,0,1],red:[1,0,0,1],green:[0,1,0,1],blue:[0,0,1,1]},newsprint:{cyan:[.15,.73,.88,1],magenta:[.88,.12,.55,1],yellow:[.97,.93,.08,1],black:[.1,.1,.1,1]},fogra51:{cyan:[0,.525,.765,1],magenta:[.827,0,.486,1],yellow:[.984,.91,0,1],black:[.145,.145,.145,1]},swop:{cyan:[0,.557,.769,1],magenta:[.827,.02,.478,1],yellow:[.984,.902,.027,1],black:[.169,.169,.169,1]}},zt=`#version 300 es
precision highp float;

in vec2 uvContent;
out vec4 outColor;

uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 srcSizePx;    // src texture size in texels
uniform vec2 elementPx;
uniform float gridSize;
uniform float dotSize;
uniform float smoothing;
uniform float angle;       // global grid rotation in degrees, added to per-channel angles
uniform float blackAmount; // GCR amount: 1.0 = max GCR (k = 1 - max(rgb)), 0.0 = pure CMY (no K)
uniform int ymck;          // 0 = RGB (additive), 1 = CMYK (subtractive)
uniform int trimEdge;      // 1 = skip dots whose extent crosses the image edge
uniform vec4 background;   // SRC-OVER backdrop, RGBA in [0, 1], non-premul
uniform vec4 cInk, mInk, yInk, kInk;  // CMYK inks: .rgb = solid colour, .a = density
uniform vec4 rInk, gInk, bInk;        // RGB inks: .rgb = colour, .a = density

const vec3 RGB_ANGLES = vec3(15.0, 45.0, 75.0);
const vec4 CMYK_ANGLES = vec4(15.0, 75.0, 0.0, 45.0);

const vec2 cellOffsets[9] = vec2[9](
    vec2(0),
    vec2(-1, 0), vec2(1, 0), vec2(0, -1), vec2(0, 1),
    vec2(-1, -1), vec2(1, -1), vec2(-1, 1), vec2(1)
);

// texelFetch bypasses the framework's LINEAR filter. Bilinear at a
// transparent/opaque boundary yields gray, which cmykChannel turns
// into a phantom K dot.
vec4 sampleSrcNearest(vec2 px) {
    vec2 uv = clamp(px / elementPx, 0.0, 1.0);
    vec2 texUv = srcRectUv.xy + uv * srcRectUv.zw;
    return texelFetch(src, ivec2(texUv * srcSizePx), 0);
}

// Lower blackAmount shifts ink from K to CMY (paint model still holds
// for any k <= 1 - max(rgb)), preserving hue where max-GCR collapses to K.
float cmykChannel(vec3 rgb, int i) {
    float k = blackAmount * (1.0 - max(rgb.r, max(rgb.g, rgb.b)));
    if (i == 3) return k;
    return (1.0 - rgb[i] - k) / max(1.0 - k, 1e-6);
}

vec3 inkMix(vec4 cmyk) {
    return mix(vec3(1.0), cInk.rgb, cmyk.x)
         * mix(vec3(1.0), mInk.rgb, cmyk.y)
         * mix(vec3(1.0), yInk.rgb, cmyk.z)
         * mix(vec3(1.0), kInk.rgb, cmyk.w);
}

void main() {
    vec2 fragCoord = uvContent * elementPx;
    // Anchor the grid at the element centre so resizing gridSize scales
    // cells around the centre instead of the bottom-left corner.
    vec2 gridCenter = elementPx * 0.5;
    bool isRgb = ymck == 0;
    int channelCount = isRgb ? 3 : 4;
    float maxDotRadius = gridSize * dotSize * 0.7071068;

    // 5 cells once axis neighbours are in reach, 9 once diagonals are.
    int cellCount = dotSize < 0.7071068 ? 1 : (dotSize < 1.0 ? 5 : 9);

    vec4 amounts = vec4(0.0);

    for (int i = 0; i < 4; ++i) {
        if (i >= channelCount) break;

        float channelAngle = isRgb ? RGB_ANGLES[i] : CMYK_ANGLES[i];
        float rotRad = radians(channelAngle + angle);
        float c = cos(rotRad);
        float s = sin(rotRad);

        // cTrans rotates screen -> grid space; ccTrans is its inverse
        mat2 ccTrans = mat2(c, s, -s, c);
        mat2 cTrans = mat2(c, -s, s, c);

        vec2 gridFragLoc = cTrans * (fragCoord - gridCenter);
        vec2 gridOriginLoc = floor(gridFragLoc / gridSize);

        for (int j = 0; j < 9; ++j) {
            if (j >= cellCount) break;
            vec2 cell = gridOriginLoc + cellOffsets[j];
            vec2 gridDotLoc = cell * gridSize + vec2(gridSize / 2.0);
            vec2 renderDotLoc = ccTrans * gridDotLoc + gridCenter;

            // Skip texture fetch if fragment can't be covered.
            float fragDistanceToDotCenter = distance(fragCoord, renderDotLoc);
            if (fragDistanceToDotCenter > maxDotRadius) continue;

            if (trimEdge == 1 && (
                any(lessThan(renderDotLoc, vec2(maxDotRadius))) ||
                any(greaterThan(renderDotLoc, elementPx - vec2(maxDotRadius)))
            )) continue;

            vec4 dotColor = sampleSrcNearest(renderDotLoc);
            float channelAmount = isRgb
                ? dotColor[i]
                : cmykChannel(dotColor.rgb, i);
            // Scale by source alpha at the dot centre so dots shrink
            // (instead of getting hard-clipped) at the source silhouette.
            // Also kills the CMYK k=1 black artefact for transparent
            // pixels (rgb=0 → k=1 without this).
            float dotRadius = channelAmount * dotColor.a * maxDotRadius;
            if (fragDistanceToDotCenter < dotRadius) {
                amounts[i] += smoothstep(
                    dotRadius,
                    dotRadius - dotRadius * smoothing,
                    fragDistanceToDotCenter
                );
            }
        }
    }

    // fg.rgb = full-strength ink, fg.a = geometric coverage. Splitting
    // these keeps AA edges from double-tinting the background.
    // Per-ink density applies post-clamp + re-clamp for a true density
    // dial (pre-clamp scaling lets neighbour-dot overlap >1 absorb
    // reductions).
    vec4 fg;
    if (isRgb) {
        vec3 rgbDensity = vec3(rInk.a, gInk.a, bInk.a);
        vec3 rgbInks = clamp(
            clamp(amounts.rgb, 0.0, 1.0) * rgbDensity,
            0.0, 1.0
        );
        vec3 weighted = rInk.rgb * rgbInks.r + gInk.rgb * rgbInks.g + bInk.rgb * rgbInks.b;
        // Normalise to max so the colour at AA edges stays full strength.
        float maxComp = max(max(weighted.r, weighted.g), weighted.b);
        vec3 inkColor = maxComp > 0.0 ? weighted / maxComp : vec3(0.0);
        // Multiplicative complement: probability that AT LEAST ONE
        // channel covers this fragment (channels overlap stochastically).
        float dotMask = 1.0
            - (1.0 - rgbInks.r) * (1.0 - rgbInks.g) * (1.0 - rgbInks.b);
        fg = vec4(inkColor, dotMask);
    } else {
        vec4 cmykDensity = vec4(cInk.a, mInk.a, yInk.a, kInk.a);
        vec4 inks = clamp(
            clamp(amounts, 0.0, 1.0) * cmykDensity,
            0.0, 1.0
        );
        float maxInk = max(max(inks.x, inks.y), max(inks.z, inks.w));
        vec4 normInks = maxInk > 0.0 ? inks / maxInk : vec4(0.0);
        vec3 inkColor = inkMix(normInks);
        float inkCoverage = 1.0
            - (1.0 - inks.x) * (1.0 - inks.y) * (1.0 - inks.z) * (1.0 - inks.w);
        fg = vec4(inkColor, inkCoverage);
    }

    // SRC-OVER, premultiplied (framework expects rgb*alpha).
    // background.a=0 disables the backdrop.
    float outA = fg.a + background.a * (1.0 - fg.a);
    vec3 outRgbPremul =
        fg.rgb * fg.a + background.rgb * background.a * (1.0 - fg.a);

    outColor = vec4(outRgbPremul, outA);
}
`,Bt={...Rt.pure,...Rt.newsprint},Vt={gridSize:10,dotSize:1,smoothing:.15,angle:0,mode:`rgb`,blackAmount:1,trimEdge:!0,background:[0,0,0,0],inkPalette:Bt},Ht=class{constructor(e={}){this.params={...Vt,...e,inkPalette:{...Bt,...e.inkPalette??{}}}}setParams(e){Object.assign(this.params,e)}setInkPreset(e){Object.assign(this.params.inkPalette,Rt[e])}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params,o=a.inkPalette;e.draw({frag:zt,uniforms:{src:e.src,srcSizePx:[e.src.width||1,e.src.height||1],elementPx:[r,i],gridSize:Math.max(1,a.gridSize),dotSize:Math.max(0,a.dotSize),smoothing:Math.max(0,Math.min(1,a.smoothing)),angle:a.angle,blackAmount:Math.max(0,Math.min(1,a.blackAmount)),ymck:+(a.mode===`cmyk`),trimEdge:+!!a.trimEdge,background:a.background,cInk:o.cyan,mInk:o.magenta,yInk:o.yellow,kInk:o.black,rInk:o.red,gInk:o.green,bInk:o.blue},target:e.target})}},k=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},A=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},j,Ut,M,Wt,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt,N,$t,en,tn,nn,rn,an,on,sn,cn,ln,un,dn,fn,pn,mn,hn,gn,_n,vn,yn,bn,xn=`#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
void main() {
    if (any(lessThan(uvContent, vec2(0.0))) ||
        any(greaterThan(uvContent, vec2(1.0)))) {
        outColor = vec4(0.0);
        return;
    }
    vec4 c = texture(src, uvSrc);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,Sn=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D tex;
void main() {
    if (any(lessThan(uvContent, vec2(0.0))) ||
        any(greaterThan(uvContent, vec2(1.0)))) {
        outColor = vec4(0.0);
        return;
    }
    vec4 c = texture(tex, uvContent);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,Cn={quality:.4,seed:.25,iterations:24,resolutionScale:1,randomFlip:!0,vertical:!1,speed:0,bypass:!1};function wn(e,t){if(typeof OffscreenCanvas<`u`)return new OffscreenCanvas(e,t);let n=document.createElement(`canvas`);return n.width=e,n.height=t,n}function Tn(e){let t=e.getContext(`2d`);if(!t)throw Error(`[VFX-JS] JPEGGlitchEffect: 2D canvas context unavailable`);return t}function En(e,t){if(typeof OffscreenCanvas<`u`&&e instanceof OffscreenCanvas)return e.convertToBlob({type:`image/jpeg`,quality:t});let n=e;return new Promise((e,r)=>{n.toBlob(t=>t?e(t):r(Error(`[VFX-JS] JPEGGlitchEffect: toBlob failed`)),`image/jpeg`,t)})}function Dn(e){for(let t=2;t+3<e.length;t++)if(e[t]===255&&e[t+1]===218){let n=e[t+2]<<8|e[t+3];return Math.min(e.length,t+2+n)}return Math.min(e.length,417)}function On(e,t){let n=Math.imul(Math.floor(e*2654435761)|0,2246822519)+Math.imul(t+1,3266489917)>>>0;return()=>{n=n+1831565813>>>0;let e=Math.imul(n^n>>>15,1|n);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function kn(e,t,n,r,i,a,o){switch(e.save(),e.clearRect(0,0,a,o),i){case 90:e.translate(a,0);break;case 180:e.translate(a,o);break;case 270:e.translate(0,o)}e.rotate(i*Math.PI/180),e.drawImage(t,0,0,n,r),e.restore()}function An(e,t,n,r){let i=e.length-t-4;if(i<=1)return;let a=Math.max(1,Math.floor(n));for(let n=0;n<a;n++){let o=i/a*n|0,s=i/a*(n+1)|0,c=Math.max(1,s-o),l=Math.min(i,o+(r()*c|0)),u=r()*256|0;e[t+l]=u}}var jn=class{get producedFrames(){return k(this,pn,`f`)}constructor(e={}){j.add(this),this.enabled=!0,Ut.set(this,!1),M.set(this,null),Wt.set(this,null),Gt.set(this,null),Kt.set(this,null),qt.set(this,!1),Jt.set(this,null),Yt.set(this,null),Xt.set(this,null),Zt.set(this,null),Qt.set(this,null),N.set(this,null),$t.set(this,null),en.set(this,new Uint8Array),tn.set(this,null),nn.set(this,0),rn.set(this,0),an.set(this,0),on.set(this,0),sn.set(this,!0),cn.set(this,!1),ln.set(this,-1e9),un.set(this,0),dn.set(this,0),fn.set(this,!1),pn.set(this,0),this.params={...Cn,...e}}setParams(e){Object.assign(this.params,e),A(this,sn,!0,`f`)}init(e){A(this,Ut,typeof createImageBitmap==`function`&&(typeof OffscreenCanvas<`u`||typeof document<`u`),`f`),k(this,Ut,`f`)&&(A(this,ln,-1e9,`f`),A(this,sn,!0,`f`),A(this,Yt,wn(1,1),`f`),A(this,Xt,Tn(k(this,Yt,`f`)),`f`),A(this,Zt,wn(1,1),`f`),A(this,Qt,Tn(k(this,Zt,`f`)),`f`),A(this,N,wn(1,1),`f`),A(this,$t,Tn(k(this,N,`f`)),`f`),A(this,M,e.createRenderTarget({size:[1,1]}),`f`),A(this,Gt,e.gl,`f`),k(this,j,`m`,mn).call(this,e),A(this,Jt,e.onContextRestored(()=>{k(this,j,`m`,mn).call(this,e),A(this,qt,k(this,fn,`f`),`f`)}),`f`))}update(){this.enabled===!1&&A(this,fn,!1,`f`)}render(e){if(this.params.bypass||!k(this,Ut,`f`)||!k(this,M,`f`)){A(this,fn,!1,`f`),k(this,j,`m`,hn).call(this,e);return}let t=e.src.width,n=e.src.height;(t!==k(this,an,`f`)||n!==k(this,on,`f`))&&(A(this,an,t,`f`),A(this,on,n,`f`),A(this,sn,!0,`f`));let[r,i]=e.dims.elementPixel,a=Math.min(1,Math.max(0,this.params.resolutionScale)),o=Math.max(1,Math.round(r*a)),s=Math.max(1,Math.round(i*a));r>=2&&i>=2&&t>0&&n>0&&((o!==k(this,nn,`f`)||s!==k(this,rn,`f`))&&k(this,j,`m`,_n).call(this,e,o,s),k(this,j,`m`,gn).call(this,e)&&k(this,j,`m`,vn).call(this,e)),k(this,fn,`f`)&&k(this,Wt,`f`)?(k(this,qt,`f`)&&k(this,j,`m`,yn).call(this,e),e.draw({frag:Sn,uniforms:{tex:k(this,Wt,`f`)},target:e.target})):k(this,j,`m`,hn).call(this,e)}dispose(){var e;k(this,Jt,`f`)?.call(this),A(this,Jt,null,`f`),k(this,Gt,`f`)&&k(this,Kt,`f`)&&k(this,Gt,`f`).deleteTexture(k(this,Kt,`f`)),A(this,Kt,null,`f`),A(this,Gt,null,`f`),A(this,qt,!1,`f`),k(this,M,`f`)?.dispose(),A(this,M,null,`f`),A(this,Wt,null,`f`),A(this,Yt,null,`f`),A(this,Xt,null,`f`),A(this,Zt,null,`f`),A(this,Qt,null,`f`),A(this,N,null,`f`),A(this,$t,null,`f`),A(this,tn,null,`f`),A(this,en,new Uint8Array,`f`),A(this,fn,!1,`f`),A(this,cn,!1,`f`),A(this,nn,0,`f`),A(this,rn,0,`f`),A(this,un,(e=k(this,un,`f`),e++,e),`f`)}};Ut=new WeakMap,M=new WeakMap,Wt=new WeakMap,Gt=new WeakMap,Kt=new WeakMap,qt=new WeakMap,Jt=new WeakMap,Yt=new WeakMap,Xt=new WeakMap,Zt=new WeakMap,Qt=new WeakMap,N=new WeakMap,$t=new WeakMap,en=new WeakMap,tn=new WeakMap,nn=new WeakMap,rn=new WeakMap,an=new WeakMap,on=new WeakMap,sn=new WeakMap,cn=new WeakMap,ln=new WeakMap,un=new WeakMap,dn=new WeakMap,fn=new WeakMap,pn=new WeakMap,j=new WeakSet,mn=function(e){let t=e.gl,n=t.createTexture();n&&(t.bindTexture(t.TEXTURE_2D,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,0])),t.bindTexture(t.TEXTURE_2D,null),A(this,Kt,n,`f`),A(this,Wt,e.wrapTexture(n,{size:[k(this,nn,`f`)||1,k(this,rn,`f`)||1]}),`f`))},hn=function(e){e.draw({frag:xn,uniforms:{src:e.src},target:e.target})},gn=function(e){if(k(this,cn,`f`))return!1;let t=this.params.speed;return t>0?e.time-k(this,ln,`f`)>=1/t:k(this,sn,`f`)},_n=function(e,t,n){var r;A(this,nn,t,`f`),A(this,rn,n,`f`),A(this,en,new Uint8Array(t*n*4),`f`),A(this,tn,new ImageData(t,n),`f`),k(this,Yt,`f`)&&(k(this,Yt,`f`).width=t,k(this,Yt,`f`).height=n),k(this,N,`f`)&&(k(this,N,`f`).width=t,k(this,N,`f`).height=n),k(this,M,`f`)?.dispose(),A(this,M,e.createRenderTarget({size:[t,n]}),`f`),A(this,fn,!1,`f`),A(this,sn,!0,`f`),A(this,cn,!1,`f`),A(this,qt,!1,`f`),A(this,un,(r=k(this,un,`f`),r++,r),`f`)},vn=function(e){var t;let n=k(this,nn,`f`),r=k(this,rn,`f`),i=k(this,Yt,`f`),a=k(this,Xt,`f`),o=k(this,Zt,`f`),s=k(this,Qt,`f`),c=k(this,tn,`f`);if(!i||!a||!o||!s||!c||!k(this,M,`f`))return;Be(e,k(this,M,`f`));let l=e.gl;l.readPixels(0,0,n,r,l.RGBA,l.UNSIGNED_BYTE,k(this,en,`f`)),l.bindFramebuffer(l.FRAMEBUFFER,null),A(this,cn,!0,`f`),A(this,sn,!1,`f`),A(this,ln,e.time,`f`);let u=c.data,d=n*4;for(let e=0;e<r;e++){let t=(r-1-e)*d;u.set(k(this,en,`f`).subarray(t,t+d),e*d)}for(let e=3;e<u.length;e+=4)u[e]=255;let f=this.params.speed>0?k(this,dn,`f`):0;A(this,dn,(t=k(this,dn,`f`),t++,t),`f`);let{quality:p,seed:m,iterations:h,randomFlip:g,vertical:_}=this.params,ee=On(m,f),te=g&&ee()<.5;a.putImageData(c,0,0);let ne=((te?180:0)+(_?270:0))%360,re=_,ie=re?r:n,ae=re?n:r;o.width=ie,o.height=ae,kn(s,i,n,r,ne,ie,ae),k(this,j,`m`,bn).call(this,o,n,r,p,h,ne,ee,k(this,un,`f`))},yn=function(e){let t=e.gl;k(this,Kt,`f`)&&k(this,N,`f`)&&(t.bindTexture(t.TEXTURE_2D,k(this,Kt,`f`)),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,k(this,N,`f`)),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,null),A(this,qt,!1,`f`))},bn=async function(e,t,n,r,i,a,o,s){var c;try{let l=await En(e,r),u=new Uint8Array(await l.arrayBuffer());An(u,Dn(u),i,o);let d=await createImageBitmap(new Blob([u],{type:`image/jpeg`}));if(s===k(this,un,`f`)&&k(this,$t,`f`)){let e=(360-a)%360;kn(k(this,$t,`f`),d,d.width,d.height,e,t,n),A(this,fn,!0,`f`),A(this,pn,(c=k(this,pn,`f`),c++,c),`f`),A(this,qt,!0,`f`)}d.close()}catch{}finally{s===k(this,un,`f`)&&A(this,cn,!1,`f`)}};var P=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},F=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Mn,Nn,Pn,Fn,In,Ln,Rn=`#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;

void main() {
    vec2 inS = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    vec2 inC = step(vec2(0.0), uvContent) * step(uvContent, vec2(1.0));
    float m = inS.x * inS.y * inC.x * inC.y;
    vec4 base = texture(src, clamp(uvSrc, 0.0, 1.0)) * m;
    outColor = vec4(base.rgb * base.a, base.a);
}
`,zn=`
float hash(uint n) {
    n = (n ^ 61u) ^ (n >> 16u);
    n *= 9u;
    n = n ^ (n >> 4u);
    n *= 0x27d4eb2du;
    n = n ^ (n >> 15u);
    return float(n & 0x00ffffffu) / 16777216.0;
}

vec2 cellUv(ivec2 cell, int dim) {
    uint i = uint(cell.y * dim + cell.x);
    vec2 j = vec2(hash(i * 2u + 1u), hash(i * 2u + 2u)) - 0.5;
    return (vec2(cell) + 0.5 + j * 0.8) / float(dim);
}
`,Bn=`#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D src;
uniform float threshold;   // highlight cutoff
uniform float highlightClamp; // upper clamp on source highlight brightness
uniform int dim;
${zn}
void main() {
    ivec2 cell = ivec2(gl_FragCoord.xy);
    vec3 c = texture(src, cellUv(cell, dim)).rgb;
    // Max-channel knee, hue preserved, clamped so blown-out sources
    // don't dominate. gate is the highlight factor in [0,1].
    float vmax = max(max(c.r, c.g), c.b);
    if (vmax > highlightClamp) {
        c *= highlightClamp / vmax;
        vmax = highlightClamp;
    }
    float gate = max(0.0, vmax - threshold) / max(vmax, 1e-5);
    outColor = vec4(c, gate);
}
`,Vn=`#version 300 es
precision highp float;
in vec2 position;

uniform sampler2D highlight; // dim×dim pre-pass output
uniform int dim;
// Source buffer rect and this stage's output rect, in element-local
// physical px. The host viewport equals dstRect.
uniform vec4 srcRect;
uniform vec4 dstRect;
uniform float angle;       // streak direction (rad)
uniform float lengthPx;    // max streak length (physical px)
uniform float widthPx;     // streak cross-section width (physical px)

out float v_along;
out float v_cross;
out vec3 v_color;
out float v_gate;
${zn}
void main() {
    ivec2 cell = ivec2(gl_InstanceID % dim, gl_InstanceID / dim);
    vec4 hl = texelFetch(highlight, cell, 0);
    vec3 c = hl.rgb;
    float gate = hl.a;

    // Cull dim cells: collapse the quad to a single off-screen point.
    if (gate < 0.003) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        v_along = 0.0;
        v_cross = 0.0;
        v_color = vec3(0.0);
        v_gate = 0.0;
        return;
    }

    vec2 srcPx = srcRect.xy + cellUv(cell, dim) * srcRect.zw;
    vec2 centerNdc = (srcPx - dstRect.xy) / dstRect.zw * 2.0 - 1.0;

    vec2 dir = vec2(cos(angle), sin(angle));
    vec2 perp = vec2(-dir.y, dir.x);

    vec2 offPx = dir * (position.x * lengthPx)
               + perp * (position.y * widthPx * 0.5);

    // px → NDC delta; the divide by w/h is undone by the viewport mapping.
    vec2 ndc = centerNdc + offPx * 2.0 / dstRect.zw;
    gl_Position = vec4(ndc, 0.0, 1.0);

    v_along = position.x;
    v_cross = position.y;
    v_color = c;
    v_gate = gate;
}
`,Hn=`#version 300 es
precision highp float;
in float v_along;
in float v_cross;
in vec3 v_color;
in float v_gate;

uniform float falloff;          // length fade decay rate
uniform float dispersion;       // -1 = blue tip, +1 = red tip
uniform float fringe;           // diffraction fringe contrast
uniform float fringeCount;      // fringes along the streak (green reference)

out vec4 outColor;

void main() {
    // Normalized exponential length falloff, pinned to 1 at the source
    // and 0 at the tip. Floor k so falloff -> 0 approaches the linear
    // limit instead of degenerating to zero output.
    float k = max(falloff, 1e-3);
    float eEnd = exp(-k);
    float base = max((exp(-k * v_along) - eEnd) / max(1.0 - eEnd, 1e-4), 0.0);
    // Dispersion: per-channel exponential reach ratio pivoting on green,
    // applied over the normalized profile so the tip fringe survives.
    float spread = dispersion * 0.8;
    vec3 perChannel = base * exp(k * spread * vec3(1.0, 0.0, -1.0) * v_along);
    // Soft gaussian cross-section so neighbouring sprites overlap into a
    // continuous sheet instead of discrete stripes.
    float crossFall = exp(-v_cross * v_cross * 2.0);
    vec3 rgb = v_color * perChannel * (crossFall * v_gate);

    // Diffraction fringes: per-channel intensity modulation whose period
    // scales with wavelength (630/530/465 nm), so all channels peak at the
    // source (white core) and separate into rainbow bands further out.
    if (fringe > 1e-4) {
        vec3 freq = fringeCount * vec3(0.8413, 1.0, 1.1398);
        vec3 m = 0.5 + 0.5 * cos(6.2831853 * freq * v_along);
        rgb *= mix(vec3(1.0), m, fringe);
    }

    if (max(max(rgb.r, rgb.g), rgb.b) < 1e-4) {
        discard;
    }
    outColor = vec4(rgb, 1.0);
}
`,Un=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D accum;
uniform vec3 tint;
uniform float intensity;
uniform float norm;        // core-gain normalisation (cross-method calibration)

void main() {
    vec3 acc = max(texture(accum, uv).rgb, vec3(0.0));
    vec3 s = (1.0 - exp(-acc * norm * intensity)) * tint;
    float a = clamp(dot(s, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    outColor = vec4(s, a);
}
`,Wn=256,Gn={streaks:2,angle:0,length:300,width:3,falloff:2,threshold:.9,highlightClamp:1,intensity:.5,tint:[1,1,1],dispersion:-.3,fringe:.5,fringeCount:1.5,density:256,resolution:.2,pad:300},Kn=class{constructor(e={}){Mn.set(this,null),Nn.set(this,0),Pn.set(this,null),Fn.set(this,null),In.set(this,0),Ln.set(this,0),this.params={...Gn,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=Math.max(2,Math.floor(this.params.density));P(this,Mn,`f`)&&P(this,Nn,`f`)===t||(P(this,Mn,`f`)&&e.releaseGeometry(P(this,Mn,`f`)),F(this,Mn,qn(t),`f`),F(this,Nn,t,`f`),P(this,Fn,`f`)?.dispose(),F(this,Fn,e.createRenderTarget({size:[t,t],float:!0,filter:`nearest`}),`f`));let n=P(this,Fn,`f`);if(!n)return;let r=this.outputRect(e.dims),i=e.dims.srcRect,a=e.dims.pixelRatio,o=Math.min(Math.max(this.params.resolution,.1),1),s=Math.max(2,Math.round(r[2]*o)),c=Math.max(2,Math.round(r[3]*o));(s!==P(this,In,`f`)||c!==P(this,Ln,`f`))&&(P(this,Pn,`f`)?.dispose(),F(this,Pn,e.createRenderTarget({size:[s,c],float:!0,filter:`linear`}),`f`),F(this,In,s,`f`),F(this,Ln,c,`f`));let l=P(this,Pn,`f`);if(!l)return;e.draw({frag:Rn,target:e.target,uniforms:{src:e.src}}),e.draw({frag:Bn,target:n,blend:`none`,uniforms:{src:e.src,threshold:this.params.threshold,highlightClamp:Math.max(this.params.threshold+.001,this.params.highlightClamp),dim:t}}),e.clear(l);let u=Math.max(1,Math.round(this.params.streaks)),d=this.params.length*a,f=this.params.width*a,p=this.params.angle*Math.PI/180;for(let a=0;a<u;a++){let o=p+a*Math.PI*2/u;e.draw({vert:Vn,frag:Hn,geometry:P(this,Mn,`f`),blend:`additive`,target:l,uniforms:{highlight:n,dim:t,srcRect:[i[0],i[1],i[2],i[3]],dstRect:[r[0],r[1],r[2],r[3]],angle:o,lengthPx:d,widthPx:f,falloff:this.params.falloff,dispersion:this.params.dispersion,fringe:this.params.fringe,fringeCount:this.params.fringeCount}})}let m=(Wn/t)**2;e.draw({frag:Un,target:e.target,blend:`additive`,uniforms:{accum:l,intensity:this.params.intensity,norm:m/(u*.9),tint:[this.params.tint[0],this.params.tint[1],this.params.tint[2]]}})}outputRect(e){return Ce(this.params.pad,e)}dispose(){F(this,Mn,null,`f`),F(this,Nn,0,`f`),P(this,Pn,`f`)?.dispose(),F(this,Pn,null,`f`),P(this,Fn,`f`)?.dispose(),F(this,Fn,null,`f`),F(this,In,0,`f`),F(this,Ln,0,`f`)}};Mn=new WeakMap,Nn=new WeakMap,Pn=new WeakMap,Fn=new WeakMap,In=new WeakMap,Ln=new WeakMap;function qn(e){return{attributes:{position:{data:new Float32Array([0,-1,1,-1,1,1,0,1]),itemSize:2}},indices:new Uint16Array([0,1,2,0,2,3]),instanceCount:e*e}}var I=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},L=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Jn,R,Yn,Xn,Zn,Qn,$n,er,tr,nr=8,rr=`#version 300 es
precision highp float;

in vec2 uvContent;
out vec4 outColor;

uniform sampler2D src;
uniform sampler2D atlas;
uniform vec4 srcRectUv;
uniform vec2 elementPx;      // element size, physical px
uniform vec2 cellPx;         // cell size, physical px
uniform float cols;          // atlas columns
uniform float rows;          // atlas rows
uniform float glyphCount;    // number of glyphs in the pool
uniform float glyphAspect;   // font's character box aspect (advance / em)
uniform float time;          // seconds since VFX start
uniform float seed;          // shifts the random pattern (columns + glyphs)
uniform vec4 colorStops[${nr}]; // trail-colour gradient stops (sRGB), head→tail
uniform int colorStopCount;  // number of active stops (>= 1)
uniform vec4 headColor;      // leading-glyph colour, non-premultiplied
uniform vec4 background;     // cell backdrop, non-premultiplied
uniform float speed;         // base fall speed, cells / second
uniform float tail;          // trail length, cells
uniform float tailFade;      // 1 = fade to the tail, 0 = no fade (gradient only)
uniform float birthRate;     // new drops per second, per column
uniform float glyphSpeed;    // glyph reshuffle rate, changes / second
uniform float brightness;    // overall gain on the rain
uniform float contrast;      // source-luminance contrast about 0.5 (1 = off)
uniform int invert;          // 1 = flip source luminance

// Box-average a TAPS x TAPS grid per cell for the source luminance. 2x2 is
// plenty here: the luminance only scales the rain's brightness (a small
// error is invisible) and the moving glyphs mask any residual aliasing.
const int TAPS = 2;

// --- OKLCH gradient (Björn Ottosson's sRGB <-> OKLab) --------------------
vec3 srgbToLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)),
               step(0.04045, c));
}
vec3 linearToSrgb(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
               step(0.0031308, c));
}
vec3 linSrgbToOklab(vec3 c) {
    float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
    vec3 lms = pow(max(vec3(l, m, s), 0.0), vec3(1.0 / 3.0));
    return vec3(
        0.2104542553 * lms.x + 0.7936177850 * lms.y - 0.0040720468 * lms.z,
        1.9779984951 * lms.x - 2.4285922050 * lms.y + 0.4505937099 * lms.z,
        0.0259040371 * lms.x + 0.7827717662 * lms.y - 0.8086757660 * lms.z);
}
vec3 oklabToLinSrgb(vec3 lab) {
    float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
    vec3 lms = vec3(l_, m_, s_);
    lms = lms * lms * lms;
    return vec3(
        4.0767416621 * lms.x - 3.3077115913 * lms.y + 0.2309699292 * lms.z,
        -1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
        -0.0041960863 * lms.x - 0.7034186147 * lms.y + 1.7076147010 * lms.z);
}

// Interpolate two sRGB colours in OKLCH at t: lightness + chroma linearly,
// hue along the shortest path (achromatic endpoints borrow the other's hue,
// matching CSS oklch). Alpha is interpolated linearly.
vec4 oklchMix(vec4 c0, vec4 c1, float t) {
    vec3 lab0 = linSrgbToOklab(srgbToLinear(c0.rgb));
    vec3 lab1 = linSrgbToOklab(srgbToLinear(c1.rgb));
    float C0 = length(lab0.yz);
    float C1 = length(lab1.yz);
    float h0 = atan(lab0.z, lab0.y);
    float h1 = atan(lab1.z, lab1.y);
    if (C0 < 1e-4) h0 = h1;
    if (C1 < 1e-4) h1 = h0;
    float dh = h1 - h0;
    dh -= 6.283185307 * floor(dh / 6.283185307 + 0.5); // wrap to [-pi, pi]
    float L = mix(lab0.x, lab1.x, t);
    float C = mix(C0, C1, t);
    float h = h0 + dh * t;
    vec3 rgb = oklabToLinSrgb(vec3(L, C * cos(h), C * sin(h)));
    return vec4(linearToSrgb(rgb), mix(c0.a, c1.a, t));
}

// Sample the trail-colour gradient at t in [0, 1] (0 = head, 1 = tail end).
vec4 sampleGradient(float t) {
    if (colorStopCount <= 1) {
        return colorStops[0];
    }
    float f = clamp(t, 0.0, 1.0) * float(colorStopCount - 1);
    int i = min(int(floor(f)), colorStopCount - 2);
    return oklchMix(colorStops[i], colorStops[i + 1], f - float(i));
}

vec4 readSrc(vec2 contentUv) {
    vec2 p = clamp(contentUv, 0.0, 1.0);
    return texture(src, srcRectUv.xy + p * srcRectUv.zw);
}

// Sine-free hashes (Dave Hoskins) — stable across GPUs.
float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}
float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    if (uvContent.x < 0.0 || uvContent.x > 1.0 ||
        uvContent.y < 0.0 || uvContent.y > 1.0) {
        outColor = vec4(0.0);
        return;
    }

    // Flip Y to a top-down pixel frame so columns fall from the top edge.
    vec2 fragPx = uvContent * elementPx;
    vec2 topPx = vec2(fragPx.x, elementPx.y - fragPx.y);

    // Center the grid on the element so partial cells split evenly between
    // edges (matches AsciiEffect).
    vec2 gridOrigin = elementPx * 0.5;
    vec2 cellIdx = floor((topPx - gridOrigin) / cellPx);
    vec2 cellOriginTop = gridOrigin + cellIdx * cellPx;
    float colId = cellIdx.x;
    // Row from the top edge, so drops start at the top wherever the grid lands.
    float topRow = floor(-gridOrigin.y / cellPx.y);
    float rowTopId = cellIdx.y - topRow;

    // Per-column drop train: each column has its own speed and phase and births
    // a stream ~every 1/birthRate s (jittered). seed shifts the pattern.
    float colSpeed = max(0.0001, speed * mix(0.5, 1.5, hash11(colId * 1.37 + 3.1 + seed)));
    float colPhase = hash11(colId * 0.71 + 7.3 + seed * 7.77);
    float spawnInterval = 1.0 / max(birthRate, 0.0001);

    // Scan recent drops and keep the one whose head is closest above this cell
    // (smallest d); bestD < 0 means none reach here. Centring the scan on the
    // drop at THIS cell lets deep cells catch older drops. The fixed 5-drop
    // window can clip a long dim tail — cosmetic; widen the loop if needed.
    float bestD = -1.0;
    float headSlot = (time - rowTopId / colSpeed) / spawnInterval - colPhase;
    float kStart = floor(headSlot) + 1.0;
    for (int i = 0; i < 5; i++) {
        float kk = kStart - float(i);
        // Birth time, jittered within ±0.3 of its slot.
        float jit = (hash11(kk * 3.7 + colId * 1.9 + seed * 11.13) - 0.5) * 0.6;
        float tb = (kk + colPhase + jit) * spawnInterval;
        float elapsed = time - tb;
        if (elapsed < 0.0) {
            continue;   // not born yet
        }
        // Cells above the head (d >= 0) form the trail; below it is dark.
        float d = elapsed * colSpeed - rowTopId;
        if (d < 0.0 || d > tail) {
            continue;
        }
        if (bestD < 0.0 || d < bestD) {
            bestD = d;
        }
    }

    float trail = 0.0;     // brightness along the trail (head = 1)
    float headMix = 0.0;   // blend toward headColor at the tip
    float gradT = 0.0;     // colour-ramp position: 0 at head, 1 at tail end
    if (bestD >= 0.0) {
        // tailFade scales the dim-toward-tail falloff: 0 = flat trail (fade via
        // gradient), 1 = classic bright head / dim tail.
        float fade = pow(1.0 - bestD / tail, 1.5);
        trail = mix(1.0, fade, tailFade);
        // Blend toward headColor over the first ~2 cells.
        headMix = clamp(1.0 - bestD * 0.6, 0.0, 1.0);
        gradT = clamp(bestD / tail, 0.0, 1.0);
    }

    // Random glyph per cell, reshuffled in steps; per-column phase desyncs
    // neighbours.
    float gstep = floor(time * glyphSpeed + hash11(colId + seed * 3.3) * 17.0);
    float gi = hash13(vec3(colId + seed * 13.0, rowTopId, gstep));
    float idx = clamp(floor(gi * glyphCount), 0.0, glyphCount - 1.0);

    // Atlas cell for this glyph (texture is Y-flipped, hence 1.0 - ... on v).
    float acol = mod(idx, cols);
    float arowTop = floor(idx / cols);

    // Contain-fit the glyph so non-square cells letterbox instead of stretching.
    vec2 local = (topPx - cellOriginTop) / cellPx;  // 0..1 within the cell
    vec2 luv = vec2(local.x, 1.0 - local.y);        // bottom-up for upright glyphs
    float cellAspect = cellPx.x / cellPx.y;
    vec2 frac = min(vec2(1.0), vec2(glyphAspect / cellAspect, cellAspect / glyphAspect));
    vec2 gloc = (luv - 0.5) / frac + 0.5;

    float cover = 0.0;
    if (gloc.x >= 0.0 && gloc.x <= 1.0 && gloc.y >= 0.0 && gloc.y <= 1.0) {
        float u = (acol + gloc.x) / cols;
        float v = 1.0 - (arowTop + 1.0 - gloc.y) / rows;
        cover = texture(atlas, vec2(u, v)).a;
    }

    // Box-averaged source luminance, multiplied into the rain so the picture
    // shows through.
    vec4 acc = vec4(0.0);
    for (int y = 0; y < TAPS; ++y) {
        for (int x = 0; x < TAPS; ++x) {
            vec2 o = (vec2(float(x), float(y)) + 0.5) / float(TAPS);
            vec2 sTop = cellOriginTop + o * cellPx;
            vec2 sUv = vec2(sTop.x, elementPx.y - sTop.y) / elementPx;
            acc += readSrc(sUv);
        }
    }
    acc /= float(TAPS * TAPS);
    float lum = dot(acc.rgb, vec3(0.299, 0.587, 0.114));
    // Contrast about mid-grey: < 1 flattens, > 1 deepens.
    lum = clamp((lum - 0.5) * contrast + 0.5, 0.0, 1.0);
    if (invert == 1) {
        lum = 1.0 - lum;
    }

    // Trail colour from the gradient along the drop (0 = head, 1 = tail).
    vec4 trailColor = sampleGradient(gradT);

    // Rain lights up only where the picture is bright; blend hue and alpha
    // toward headColor at the tip. Transparent source falls back to background.
    vec3 hue = mix(trailColor.rgb, headColor.rgb, headMix);
    float colA = mix(trailColor.a, headColor.a, headMix);
    float fgA = clamp(cover * trail * lum * acc.a * colA * brightness, 0.0, 1.0);

    float outA = fgA + background.a * (1.0 - fgA);
    vec3 premul = hue * fgA + background.rgb * background.a * (1.0 - fgA);
    outColor = vec4(premul, outA);
}
`,ir={grid:[12,16],font:`monospace`,fontWeight:`normal`,color:[.18,1,.36,1],headColor:[.85,1,.9,1],background:[0,0,0,1],speed:10,tail:18,tailFade:1,birthRate:.6,glyphSpeed:8,brightness:1,contrast:1,invert:!1,seed:0},z=64;function ar(e){return Array.isArray(e)?[...e]:Array.from(e)}function or(e){return typeof e==`number`?[e,e]:e}async function sr(e,t){let n=typeof document<`u`?document.fonts:void 0;if(n?.load)try{await n.load(`${t} ${z}px ${e}`),await n.ready}catch{}}function cr(e,t,n,r){let i=Math.max(1,e.length),a=Math.ceil(Math.sqrt(i)),o=Math.ceil(i/a),s=`${n} ${z}px ${t}`,c=document.createElement(`canvas`),l;if(r&&r>0)l=Math.max(1,Math.round(r*z));else{let t=c.getContext(`2d`);if(l=z,t){t.font=s;let n=0;for(let r of e)n=Math.max(n,t.measureText(r).width);n>0&&(l=Math.max(1,Math.ceil(n)))}}c.width=a*l,c.height=o*z;let u=c.getContext(`2d`);if(u){u.clearRect(0,0,c.width,c.height),u.fillStyle=`#fff`,u.textAlign=`center`,u.textBaseline=`middle`,u.font=s;for(let t=0;t<e.length;t++){let n=t%a,r=Math.floor(t/a),i=n*l+l/2,o=r*z+z/2;u.save(),u.beginPath(),u.rect(n*l,r*z,l,z),u.clip(),u.fillText(e[t],i,o),u.restore()}}return{canvas:c,cols:a,rows:o,cellW:l,cellH:z}}function lr(e){return Array.isArray(e[0])}function ur(e){return lr(e)?e.length>0?e:[ir.color]:[e]}function dr(e){let t=ur(e).slice(0,nr),n=new Float32Array(32);for(let e=0;e<t.length;e++)n.set(t[e],e*4);return{data:n,count:t.length}}function fr(e,t){if(t.grid!==void 0){let[n,r]=or(t.grid);e.grid=[Math.max(1,n),Math.max(1,r)]}t.glyphs!==void 0&&(e.glyphs=t.glyphs),t.font!==void 0&&(e.font=t.font),t.fontWeight!==void 0&&(e.fontWeight=t.fontWeight),t.charAspect!==void 0&&(e.charAspect=t.charAspect),t.color!==void 0&&(e.stops=dr(t.color)),t.headColor!==void 0&&(e.headColor=t.headColor),t.background!==void 0&&(e.background=t.background),t.speed!==void 0&&(e.speed=t.speed),t.tail!==void 0&&(e.tail=Math.max(1,t.tail)),t.tailFade!==void 0&&(e.tailFade=Math.min(1,Math.max(0,t.tailFade))),t.birthRate!==void 0&&(e.birthRate=Math.max(0,t.birthRate)),t.glyphSpeed!==void 0&&(e.glyphSpeed=Math.max(0,t.glyphSpeed)),t.brightness!==void 0&&(e.brightness=Math.max(0,t.brightness)),t.contrast!==void 0&&(e.contrast=Math.max(0,t.contrast)),t.invert!==void 0&&(e.invert=+!!t.invert),t.seed!==void 0&&(e.seed=t.seed)}function pr(e){let t={};return fr(t,e),t}var mr=class{constructor(e={}){Jn.add(this),R.set(this,void 0),Yn.set(this,null),Xn.set(this,1),Zn.set(this,1),Qn.set(this,1),$n.set(this,1),er.set(this,null),I(this,R,pr({...ir,...e}),`f`)}setParams(e){fr(L(this,R,`f`),e)}async init(e){typeof document<`u`&&(I(this,er,e,`f`),await L(this,Jn,`m`,tr).call(this,e))}async updateAtlas(){L(this,er,`f`)&&await L(this,Jn,`m`,tr).call(this,L(this,er,`f`))}render(e){if(!L(this,Yn,`f`))return;let t=L(this,R,`f`),[n,r]=e.dims.elementPixel,i=[t.grid[0]*e.pixelRatio,t.grid[1]*e.pixelRatio];e.draw({frag:rr,uniforms:{src:e.src,atlas:L(this,Yn,`f`),elementPx:[Math.max(1,n),Math.max(1,r)],cellPx:i,cols:L(this,Xn,`f`),rows:L(this,Zn,`f`),glyphCount:L(this,Qn,`f`),glyphAspect:L(this,$n,`f`),time:e.time,colorStops:t.stops.data,colorStopCount:t.stops.count,headColor:t.headColor,background:t.background,speed:t.speed,tail:t.tail,tailFade:t.tailFade,birthRate:t.birthRate,glyphSpeed:t.glyphSpeed,brightness:t.brightness,contrast:t.contrast,invert:t.invert,seed:t.seed},target:e.target})}dispose(){L(this,Yn,`f`)?.dispose(),I(this,Yn,null,`f`),I(this,er,null,`f`)}};R=new WeakMap,Yn=new WeakMap,Xn=new WeakMap,Zn=new WeakMap,Qn=new WeakMap,$n=new WeakMap,er=new WeakMap,Jn=new WeakSet,tr=async function(e){let t=ar(L(this,R,`f`).glyphs??`ﾊﾋﾌﾍﾎｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789Z:."=*+-<>|`);t.length===0&&console.warn(`[VFX-JS] MatrixEffect: empty glyph pool; nothing will be rendered.`),I(this,Qn,Math.max(1,t.length),`f`),await sr(L(this,R,`f`).font,L(this,R,`f`).fontWeight);let n=cr(t,L(this,R,`f`).font,L(this,R,`f`).fontWeight,L(this,R,`f`).charAspect),r=L(this,Yn,`f`);I(this,Xn,n.cols,`f`),I(this,Zn,n.rows,`f`),I(this,$n,n.cellW/n.cellH,`f`),I(this,Yn,e.wrapTexture(n.canvas,{autoUpdate:!1,filter:`linear`}),`f`),r?.dispose()};var hr=.7,gr=1.3,_r=`
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
float permute(float x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float taylorInvSqrt(float r) { return 1.79284291400159 - 0.85373472095314 * r; }

vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p, s;
    p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
    return p;
}

float snoise(vec4 v) {
    const vec2 C = vec2(0.138196601125010504,
                        0.309016994374947451);
    vec4 i = floor(v + dot(v, C.yyyy));
    vec4 x0 = v - i + dot(i, C.xxxx);
    vec4 i0;
    vec3 isX = step(x0.yzw, x0.xxx);
    vec3 isYZ = step(x0.zww, x0.yyz);
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;
    vec4 i3 = clamp(i0, 0.0, 1.0);
    vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
    vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);
    vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
    vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
    vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
    vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;
    i = mod289(i);
    float j0 = permute(
        permute(permute(permute(i.w) + i.z) + i.y) + i.x
    );
    vec4 j1 = permute(
        permute(
            permute(
                permute(i.w + vec4(i1.w, i2.w, i3.w, 1.0))
                + i.z + vec4(i1.z, i2.z, i3.z, 1.0)
            )
            + i.y + vec4(i1.y, i2.y, i3.y, 1.0)
        )
        + i.x + vec4(i1.x, i2.x, i3.x, 1.0)
    );
    vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);
    vec4 p0 = grad4(j0,   ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);
    vec4 norm = taylorInvSqrt(vec4(
        dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)
    ));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4, p4));
    vec3 m0 = max(0.6 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
    m0 = m0 * m0;
    m1 = m1 * m1;
    return 49.0 * (
        dot(m0 * m0, vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)))
        + dot(m1 * m1, vec2(dot(p3, x3), dot(p4, x4)))
    );
}

vec3 curl3D(vec3 p, float t) {
    float eps = 0.01;
    vec4 dx = vec4(eps, 0.0, 0.0, 0.0);
    vec4 dy = vec4(0.0, eps, 0.0, 0.0);
    vec4 dz = vec4(0.0, 0.0, eps, 0.0);
    vec4 pa = vec4(p,                                          t);
    vec4 pb = vec4(p + vec3(31.341, 47.853, 19.287),           t);
    vec4 pc = vec4(p + vec3(83.519, 71.523, 53.819),           t);
    float dPzdy = snoise(pc + dy) - snoise(pc - dy);
    float dPydz = snoise(pb + dz) - snoise(pb - dz);
    float dPxdz = snoise(pa + dz) - snoise(pa - dz);
    float dPzdx = snoise(pc + dx) - snoise(pc - dx);
    float dPydx = snoise(pb + dx) - snoise(pb - dx);
    float dPxdy = snoise(pa + dy) - snoise(pa - dy);
    return vec3(dPzdy - dPydz, dPxdz - dPzdx, dPydx - dPxdy) / (2.0 * eps);
}

// Aspect-corrected curl sampler. stretch maps element px so the noise
// grid is isotropic in screen space; the inverse scaling on the output
// keeps the velocity field circular regardless of element aspect.
vec3 sampleCurl(vec3 pos, vec2 elementPixel, float scale, float animTime) {
    float shortAxis = min(elementPixel.x, elementPixel.y);
    vec3 stretch = vec3(elementPixel / shortAxis, 1.0);
    vec3 noiseInput = pos * stretch / max(scale, 1e-4);
    return curl3D(noiseInput, animTime) / stretch;
}
`,vr=new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),yr=`
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,br=`#version 300 es
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
`,xr=`#version 300 es
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
`;function Sr(e){let t=Cr(e);return 2**Math.ceil(Math.log2(Math.sqrt(t)))}function Cr(e){return Number.isFinite(e)?Math.max(1,Math.floor(e)):1}function wr(e){let t=e|0;return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}var Tr=.1;function Er(e){return Math.min(Tr,Math.max(0,e))}var B=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},V=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},H,Dr,U,W,Or,kr,Ar,jr,G,Mr,Nr,Pr,Fr,Ir,Lr,Rr,zr,Br,Vr,Hr,Ur,Wr,Gr,Kr,qr,Jr,Yr,Xr,Zr,Qr=64,$r=4096,ei=.1,ti=[Qr,Qr],ni=new Float32Array($r);for(let e=0;e<$r;e++)ni[e]=e;var ri=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, 2.0);
}
`,ii=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0);
}
`,ai=`#version 300 es
precision highp float;
in vec2 position;

uniform sampler2D posTex;
uniform sampler2D colorTex;
uniform vec2 stateSize;
uniform float pointSize;
uniform vec2 elementPixel;
uniform int particleCount;
uniform float alpha;
uniform float alphaDecay;
uniform float fadeIn;
uniform float fog;
uniform vec4 contentRectUv;

out vec2 vCorner;
out vec4 vColor;

void main() {
    int id = gl_InstanceID;
    if (id >= particleCount) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }
    int sx = id % int(stateSize.x);
    int sy = id / int(stateSize.x);
    vec2 stateUv = (vec2(float(sx), float(sy)) + 0.5) / stateSize;
    vec4 s = texture(posTex, stateUv);
    vec4 c = texture(colorTex, stateUv);

    float age = s.w;
    // smoothstep rise to ~1 at age=fadeIn, then pow-shaped decay to 0
    // at age=1. Small fadeIn keeps the radial-emit phase visible;
    // larger values restore the slow fade-in look.
    float rise = fadeIn > 0.0 ? smoothstep(0.0, fadeIn, age) : 1.0;
    float fall = pow(max(1.0 - age, 0.0), alphaDecay);
    float lifeAlpha = rise * fall;
    if (lifeAlpha <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }

    float fogFactor = fog > 0.0
        ? mix(1.0, smoothstep(1.0, -0.5, s.z), fog)
        : 1.0;

    vec2 bufferUv = contentRectUv.xy + s.xy * contentRectUv.zw;
    vec2 ndcPos = bufferUv * 2.0 - 1.0;

    vec2 bufferPixel = elementPixel / max(contentRectUv.zw, vec2(1e-6));
    vec2 ndcOffset = position * pointSize * 2.0 / bufferPixel;
    gl_Position = vec4(ndcPos + ndcOffset, 0.0, 1.0);

    vCorner = position;
    vColor = vec4(c.rgb, lifeAlpha * alpha * fogFactor);
}
`,oi=`#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;

uniform sampler2D src;
uniform sampler2D trail;
uniform float srcOpacity;

void main() {
    // src is element-sized; the trail buffer extends to the canvas, so
    // mask src outside [0,1].
    vec2 inside = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float srcMask = inside.x * inside.y;
    vec4 base = texture(src, clamp(uvSrc, 0.0, 1.0))
              * srcOpacity * srcMask;
    vec4 t = texture(trail, uv);
    outColor = vec4(base.rgb * (1.0 - t.a) + t.rgb, max(base.a, t.a));
}
`,si=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D posTex;
uniform sampler2D colorTex;
uniform sampler2D velTex;
uniform vec2 elementPixel;
uniform float time;
uniform float dt;
uniform float noiseSpeed;
uniform float emitSpeed;
uniform float noiseDelay;
uniform float noiseScale;
uniform float noiseAnimation;
uniform float speedDecay;
uniform float life;
${_r}

void main() {
    vec4 s = texture(posTex, uv);
    float age = s.w;
    if (age >= 1.0) {
        outColor = s;
        return;
    }

    vec3 curlV = sampleCurl(s.xyz, elementPixel, noiseScale, time * noiseAnimation);

    // velTex.xy is a unit direction in pixel space (0 for screen
    // spawns). Multiplying by shortAxis/elementPixel converts to a
    // uv-space velocity that's isotropic in screen px (circular blast
    // on non-square elements) and short-axis-normalized so emitSpeed
    // and noiseSpeed share the same uv/sec scale.
    vec2 radialDirPx = texture(velTex, uv).xy;
    float shortAxis = min(elementPixel.x, elementPixel.y);
    vec3 radialV = vec3(
        radialDirPx * shortAxis / max(elementPixel, vec2(1.0)),
        0.0
    );

    float blend = noiseDelay > 0.0 ? smoothstep(0.0, noiseDelay, age) : 1.0;
    vec3 v = mix(radialV * emitSpeed, curlV * noiseSpeed, blend);

    float taper = pow(clamp(1.0 - age, 0.0, 1.0), speedDecay);
    vec3 pos = s.xyz + v * dt * taper;

    float lifeMul = max(texture(colorTex, uv).w, 1e-3);
    age += dt / (max(life, 1e-3) * lifeMul);

    outColor = vec4(pos, age);
}
`,ci=`#version 300 es
precision highp float;
in float position;

uniform sampler2D uSpawnTex;
uniform vec2 uSpawnTexSize;
uniform int uSpawnCount;
uniform vec2 stateSize;

out vec4 vSpawn;

void main() {
    int idx = int(position);
    if (idx >= uSpawnCount) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
        vSpawn = vec4(0.0);
        return;
    }
    int sx = idx % int(uSpawnTexSize.x);
    int sy = idx / int(uSpawnTexSize.x);
    vec4 s = texelFetch(uSpawnTex, ivec2(sx, sy), 0);
    int slot = int(s.x);
    int tx = slot % int(stateSize.x);
    int ty = slot / int(stateSize.x);
    vec2 ndc = (vec2(float(tx), float(ty)) + 0.5) / stateSize * 2.0 - 1.0;
    gl_Position = vec4(ndc, 0.0, 1.0);
    gl_PointSize = 1.0;
    vSpawn = s;
}
`,li=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;

uniform sampler2D src;
uniform float alphaThreshold;

void main() {
    vec2 spawnUv = vSpawn.yz;
    vec2 inside = step(vec2(0.0), spawnUv) * step(spawnUv, vec2(1.0));
    float visible = inside.x * inside.y;
    float a = texture(src, clamp(spawnUv, 0.0, 1.0)).a * visible;
    if (a < alphaThreshold) {
        outColor = vec4(0.0, 0.0, 0.0, 2.0); // born dead
        return;
    }
    outColor = vec4(spawnUv, 0.0, 0.0);
}
`,ui=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;

uniform sampler2D src;
uniform vec3 color;
uniform float colorMix;
uniform vec2 lifeJitterRange;
${yr}

void main() {
    vec4 c = texture(src, clamp(vSpawn.yz, 0.0, 1.0));
    float h = hash21(vSpawn.yz + vec2(vSpawn.x) * 1.7);
    float lifeJitter = mix(lifeJitterRange.x, lifeJitterRange.y, h);
    outColor = vec4(mix(c.rgb, color, colorMix), lifeJitter);
}
`,di=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;
void main() {
    float theta = vSpawn.w;
    vec2 dir = theta >= 0.0 ? vec2(cos(theta), sin(theta)) : vec2(0.0);
    outColor = vec4(dir, 0.0, 0.0);
}
`,fi={count:1048576,birthRate:3e4,screenBirthRate:1e4,life:1,noiseSpeed:.3,emitSpeed:1,noiseDelay:.15,noiseScale:1,noiseAnimation:.3,pointSize:10,alpha:1,radius:300,speedDecay:1,alphaDecay:5,fadeIn:.05,alphaThreshold:.05,spawnOnIdle:!0,srcOpacity:0,trailFade:.75,fog:.5,color:16777215,colorMix:0,blend:`add`},pi=class{get params(){return B(this,Dr,`f`)}constructor(e={}){H.add(this),Dr.set(this,void 0),U.set(this,null),W.set(this,null),Or.set(this,null),kr.set(this,null),Ar.set(this,null),jr.set(this,!1),G.set(this,void 0),Mr.set(this,void 0),Nr.set(this,new Float32Array($r*4)),Pr.set(this,null),Fr.set(this,null),Ir.set(this,null),Lr.set(this,null),Rr.set(this,null),zr.set(this,null),Br.set(this,0),Vr.set(this,0),Hr.set(this,0),Ur.set(this,null),Wr.set(this,-1/0),V(this,Dr,{...fi,...e},`f`),B(this,Dr,`f`).count=Cr(B(this,Dr,`f`).count),V(this,G,Sr(B(this,Dr,`f`).count),`f`),V(this,Mr,B(this,G,`f`)*B(this,G,`f`),`f`)}get maxCount(){return B(this,Mr,`f`)}setParam(e){let t=B(this,Dr,`f`);for(let[n,r]of Object.entries(e))r!==void 0&&(t[n]=n===`count`?Cr(r):r)}init(e){B(this,H,`m`,Gr).call(this,e),V(this,kr,e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),`f`),V(this,Ar,e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),`f`),V(this,Lr,{attributes:{position:vr}},`f`),V(this,Ir,{mode:`points`,attributes:{position:{data:ni,itemSize:1}}},`f`),V(this,Rr,e.gl,`f`),B(this,H,`m`,Jr).call(this,e),V(this,zr,e.onContextRestored(()=>{V(this,Rr,e.gl,`f`),B(this,H,`m`,Jr).call(this,e),V(this,jr,!1,`f`)}),`f`)}render(e){if(!B(this,U,`f`)||!B(this,W,`f`)||!B(this,Or,`f`)||!B(this,kr,`f`)||!B(this,Ar,`f`)||!B(this,Lr,`f`)||!B(this,Ir,`f`)||!B(this,Fr,`f`)||!B(this,Pr,`f`))return;let t=Sr(this.params.count);t!==B(this,G,`f`)&&(B(this,H,`m`,Kr).call(this),V(this,G,t,`f`),V(this,Mr,t*t,`f`),B(this,H,`m`,Gr).call(this,e),V(this,Br,0,`f`),V(this,jr,!1,`f`)),B(this,jr,`f`)||(e.draw({frag:ri,target:B(this,U,`f`)}),e.draw({frag:ii,target:B(this,W,`f`)}),e.draw({frag:ii,target:B(this,Or,`f`)}),V(this,jr,!0,`f`));let n=Er(e.deltaTime),r=[e.dims.elementPixel[0],e.dims.elementPixel[1]],i=[B(this,G,`f`),B(this,G,`f`)],a=B(this,H,`m`,Xr).call(this,e,n,r);a>0&&B(this,H,`m`,Yr).call(this,e);let o=a===0;if(e.draw({frag:si,uniforms:{posTex:B(this,U,`f`),colorTex:B(this,W,`f`),velTex:B(this,Or,`f`),elementPixel:r,time:e.time,dt:n,noiseSpeed:this.params.noiseSpeed,emitSpeed:this.params.emitSpeed,noiseDelay:this.params.noiseDelay,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,life:this.params.life},target:B(this,U,`f`),swap:o}),a>0){let t={uSpawnTex:B(this,Fr,`f`),uSpawnTexSize:ti,uSpawnCount:a,stateSize:i};e.draw({vert:ci,frag:li,geometry:B(this,Ir,`f`),uniforms:{...t,src:e.src,alphaThreshold:this.params.alphaThreshold},target:B(this,U,`f`),blend:`none`}),e.draw({vert:ci,frag:ui,geometry:B(this,Ir,`f`),uniforms:{...t,src:e.src,color:wr(this.params.color),colorMix:this.params.colorMix,lifeJitterRange:[hr,gr]},target:B(this,W,`f`),blend:`none`}),e.draw({vert:ci,frag:di,geometry:B(this,Ir,`f`),uniforms:t,target:B(this,Or,`f`),blend:`none`})}let s=B(this,H,`m`,Zr).call(this);B(this,Lr,`f`).instanceCount=s,e.clear(B(this,kr,`f`)),e.draw({vert:ai,frag:br,uniforms:{posTex:B(this,U,`f`),colorTex:B(this,W,`f`),stateSize:i,pointSize:this.params.pointSize,elementPixel:r,particleCount:s,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fadeIn:this.params.fadeIn,fog:this.params.fog},geometry:B(this,Lr,`f`),target:B(this,kr,`f`),blend:this.params.blend===`normal`?`premultiplied`:`additive`}),e.draw({frag:xr,uniforms:{trailPrev:B(this,Ar,`f`),particleStamp:B(this,kr,`f`),trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:B(this,Ar,`f`)}),e.draw({frag:oi,uniforms:{src:e.src,trail:B(this,Ar,`f`),srcOpacity:this.params.srcOpacity},target:e.target})}dispose(){B(this,zr,`f`)?.call(this),V(this,zr,null,`f`),B(this,Rr,`f`)&&B(this,Pr,`f`)&&B(this,Rr,`f`).deleteTexture(B(this,Pr,`f`)),V(this,Pr,null,`f`),V(this,Fr,null,`f`),V(this,Ir,null,`f`),V(this,Rr,null,`f`),B(this,H,`m`,Kr).call(this),B(this,kr,`f`)?.dispose(),B(this,Ar,`f`)?.dispose(),V(this,kr,null,`f`),V(this,Ar,null,`f`),V(this,Lr,null,`f`),V(this,jr,!1,`f`)}outputRect(e){return e.canvasRect}};Dr=new WeakMap,U=new WeakMap,W=new WeakMap,Or=new WeakMap,kr=new WeakMap,Ar=new WeakMap,jr=new WeakMap,G=new WeakMap,Mr=new WeakMap,Nr=new WeakMap,Pr=new WeakMap,Fr=new WeakMap,Ir=new WeakMap,Lr=new WeakMap,Rr=new WeakMap,zr=new WeakMap,Br=new WeakMap,Vr=new WeakMap,Hr=new WeakMap,Ur=new WeakMap,Wr=new WeakMap,H=new WeakSet,Gr=function(e){let t={size:[B(this,G,`f`),B(this,G,`f`)],float:!0,wrap:`clamp`,filter:`nearest`};V(this,U,e.createRenderTarget({...t,persistent:!0}),`f`),V(this,W,e.createRenderTarget(t),`f`),V(this,Or,e.createRenderTarget(t),`f`)},Kr=function(){B(this,U,`f`)?.dispose(),B(this,W,`f`)?.dispose(),B(this,Or,`f`)?.dispose(),V(this,U,null,`f`),V(this,W,null,`f`),V(this,Or,null,`f`)},qr=function(e){let t=e.gl,n=t.createTexture();if(!n)throw Error(`[ParticleEffect] Failed to create spawn texture`);return t.bindTexture(t.TEXTURE_2D,n),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,Qr,Qr,0,t.RGBA,t.FLOAT,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.bindTexture(t.TEXTURE_2D,null),{raw:n,handle:e.wrapTexture(n,{size:[Qr,Qr],filter:`nearest`,wrap:`clamp`})}},Jr=function(e){let t=B(this,H,`m`,qr).call(this,e);V(this,Pr,t.raw,`f`),V(this,Fr,t.handle,`f`)},Yr=function(e){if(!B(this,Pr,`f`))return;let t=e.gl;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,B(this,Pr,`f`)),t.texSubImage2D(t.TEXTURE_2D,0,0,0,Qr,Qr,t.RGBA,t.FLOAT,B(this,Nr,`f`)),t.bindTexture(t.TEXTURE_2D,null)},Xr=function(e,t,n){let r=[e.mouse[0]/Math.max(1,n[0]),e.mouse[1]/Math.max(1,n[1])];(!B(this,Ur,`f`)||Math.abs(r[0]-B(this,Ur,`f`)[0])>1e-6||Math.abs(r[1]-B(this,Ur,`f`)[1])>1e-6)&&V(this,Wr,e.time,`f`),V(this,Ur,r,`f`);let i=e.intersection>0,a=e.time-B(this,Wr,`f`)<ei;i&&(a||this.params.spawnOnIdle)?V(this,Vr,Math.min(B(this,Vr,`f`)+this.params.birthRate*t,$r),`f`):V(this,Vr,0,`f`),i?V(this,Hr,Math.min(B(this,Hr,`f`)+this.params.screenBirthRate*t,$r),`f`):V(this,Hr,0,`f`);let o=Math.min($r,Math.floor(B(this,Vr,`f`))),s=Math.min($r-o,Math.floor(B(this,Hr,`f`)));V(this,Vr,B(this,Vr,`f`)-o,`f`),V(this,Hr,B(this,Hr,`f`)-s,`f`);let c=o+s;if(c===0)return 0;let l=B(this,H,`m`,Zr).call(this),u=Math.max(1,n[0]),d=Math.max(1,n[1]),f=B(this,Nr,`f`),p=0;for(;p<o;p++){let e=Math.sqrt(Math.random())*this.params.radius,t=Math.random()*Math.PI*2,n=Math.cos(t)*e,i=Math.sin(t)*e,a=p*4;f[a+0]=B(this,Br,`f`),f[a+1]=r[0]+n/u,f[a+2]=r[1]+i/d,f[a+3]=t,V(this,Br,(B(this,Br,`f`)+1)%l,`f`)}for(let e=0;e<s;e++,p++){let e=p*4;f[e+0]=B(this,Br,`f`),f[e+1]=Math.random(),f[e+2]=Math.random(),f[e+3]=-1,V(this,Br,(B(this,Br,`f`)+1)%l,`f`)}return c},Zr=function(){return Math.max(1,Math.min(B(this,Mr,`f`),Math.floor(this.params.count)))};var K=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},q=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},mi,hi,gi,_i,J,Y,vi,X,yi,bi,xi,Si,Ci,wi,Ti,Ei,Di,Oi=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D posTex;
uniform vec2 stateSize;
uniform vec2 elementPixel;
uniform float time;
uniform float dt;
uniform float noiseSpeed;
uniform float noiseScale;
uniform float noiseAnimation;
uniform float speedDecay;
uniform float outwardBias;
uniform float duration;
uniform float count;
uniform int uBurst;
${yr}
${_r}

void main() {
    if (uBurst == 1) {
        ivec2 pix = ivec2(floor(uv * stateSize));
        float fid = float(pix.y * int(stateSize.x) + pix.x);
        if (fid >= count) {
            outColor = vec4(0.0, 0.0, 0.0, 2.0); // dead
            return;
        }
        vec2 spawnUv = vec2(
            hash21(uv * 31.7 + 11.13),
            hash21(uv * 73.13 + 7.71)
        );
        float z0 = (hash21(uv * 53.7 + 0.81) - 0.5) * 0.02;
        outColor = vec4(spawnUv, z0, 0.0);
        return;
    }

    vec4 s = texture(posTex, uv);
    float age = s.w;
    if (age >= 1.0) {
        outColor = s;
        return;
    }

    vec3 vNoise = sampleCurl(s.xyz, elementPixel, noiseScale, time * noiseAnimation);
    vec3 outward = vec3(s.xy - vec2(0.5), s.z) * outwardBias;

    float taper = pow(clamp(1.0 - age, 0.0, 1.0), speedDecay);
    vec3 pos = s.xyz + (vNoise + outward) * noiseSpeed * dt * taper;

    float lifespanScale = mix(
        ${hr.toFixed(4)},
        ${gr.toFixed(4)},
        hash21(uv * 91.7 + 1.234)
    );
    age += dt / max(duration * lifespanScale, 1e-3);

    outColor = vec4(pos, age);
}
`,ki=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 stateSize;
uniform float count;
uniform vec3 color;
uniform float colorMix;
${yr}

void main() {
    ivec2 pix = ivec2(floor(uv * stateSize));
    float fid = float(pix.y * int(stateSize.x) + pix.x);
    if (fid >= count) {
        outColor = vec4(0.0);
        return;
    }
    vec2 spawnUv = vec2(
        hash21(uv * 31.7 + 11.13),
        hash21(uv * 73.13 + 7.71)
    );
    vec2 sampleUv = srcRectUv.xy + spawnUv * srcRectUv.zw;
    vec4 c = texture(src, sampleUv);
    outColor = vec4(mix(c.rgb, color, colorMix), c.a);
}
`,Ai=`#version 300 es
precision highp float;
in vec2 position;

uniform sampler2D posTex;
uniform sampler2D colorTex;
uniform vec2 stateSize;
uniform float pointSize;
uniform vec2 elementPixel;
uniform int particleCount;
uniform float alpha;
uniform float alphaDecay;
uniform float fog;
uniform vec4 contentRectUv;

out vec2 vCorner;
out vec4 vColor;

void main() {
    int id = gl_InstanceID;
    if (id >= particleCount) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }
    int sx = id % int(stateSize.x);
    int sy = id / int(stateSize.x);
    vec2 stateUv = (vec2(float(sx), float(sy)) + 0.5) / stateSize;
    vec4 s = texture(posTex, stateUv);
    vec4 c = texture(colorTex, stateUv);

    float age = s.w;
    // Quarter-cosine envelope: full alpha at trigger, 0 at age=1.
    // alphaDecay > 1 holds peak alpha longer; < 1 makes the fade snappy.
    float lifeAlpha = (age >= 0.0 && age < 1.0)
        ? pow(cos(age * 1.5707963), alphaDecay)
        : 0.0;
    if (lifeAlpha <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }

    float fogFactor = fog > 0.0
        ? mix(1.0, smoothstep(1.0, -0.5, s.z), fog)
        : 1.0;

    vec2 bufferUv = contentRectUv.xy + s.xy * contentRectUv.zw;
    vec2 ndcPos = bufferUv * 2.0 - 1.0;

    vec2 bufferPixel = elementPixel / max(contentRectUv.zw, vec2(1e-6));
    vec2 ndcOffset = position * pointSize * 2.0 / bufferPixel;
    gl_Position = vec4(ndcPos + ndcOffset, 0.0, 1.0);

    vCorner = position;
    vColor = vec4(c.rgb, c.a * lifeAlpha * alpha * fogFactor);
}
`,ji=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trail;

void main() {
    outColor = texture(trail, uv);
}
`,Mi={count:1e5,duration:1,noiseSpeed:1.5,noiseScale:1,noiseAnimation:1,outwardBias:1,pointSize:3,alpha:1,alphaDecay:5,speedDecay:2,fog:0,trailFade:.5,color:16777215,colorMix:0,blend:`add`},Ni=class{get params(){return K(this,hi,`f`)}constructor(e={}){mi.add(this),hi.set(this,void 0),gi.set(this,null),_i.set(this,null),J.set(this,null),Y.set(this,null),vi.set(this,null),X.set(this,void 0),yi.set(this,!1),bi.set(this,!1),xi.set(this,-1),Si.set(this,0),Ci.set(this,0),q(this,hi,{...Mi,...e},`f`),K(this,hi,`f`).count=Cr(K(this,hi,`f`).count);let t=Sr(K(this,hi,`f`).count);q(this,X,[t,t],`f`)}trigger(){q(this,yi,!0,`f`),q(this,bi,!0,`f`),q(this,xi,-1,`f`),q(this,Si,0,`f`),q(this,Ci,0,`f`)}reset(){q(this,yi,!1,`f`),q(this,bi,!1,`f`),q(this,xi,-1,`f`),q(this,Si,0,`f`),q(this,Ci,0,`f`)}isDone(){return!K(this,yi,`f`)||K(this,Si,`f`)<this.params.duration?!1:K(this,Ci,`f`)>=K(this,mi,`m`,wi).call(this)}init(e){K(this,mi,`m`,Ti).call(this,e),q(this,J,e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),`f`),q(this,Y,e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),`f`),q(this,vi,{attributes:{position:vr}},`f`)}render(e){var t;if(!K(this,gi,`f`)||!K(this,_i,`f`)||!K(this,J,`f`)||!K(this,Y,`f`)||!K(this,vi,`f`)||e.intersection<=0)return;let n=Sr(this.params.count),r=!K(this,yi,`f`)||this.isDone();if(n!==K(this,X,`f`)[0]&&r&&(K(this,mi,`m`,Ei).call(this),q(this,X,[n,n],`f`),K(this,mi,`m`,Ti).call(this,e)),!K(this,yi,`f`)){e.blit(e.src,e.target);return}K(this,xi,`f`)<0&&q(this,xi,e.time,`f`);let i=e.time-K(this,xi,`f`);q(this,Si,i,`f`);let a=i>=this.params.duration;if(a&&K(this,Ci,`f`)>=K(this,mi,`m`,wi).call(this)){e.clear(e.target);return}let o=Er(e.deltaTime),s=[e.dims.elementPixel[0],e.dims.elementPixel[1]];if(a)e.clear(K(this,J,`f`)),q(this,Ci,(t=K(this,Ci,`f`),t++,t),`f`);else{let t=+!!K(this,bi,`f`);q(this,bi,!1,`f`);let n=K(this,mi,`m`,Di).call(this);e.draw({frag:Oi,uniforms:{posTex:K(this,gi,`f`),stateSize:K(this,X,`f`),elementPixel:s,time:e.time,dt:o,noiseSpeed:this.params.noiseSpeed,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,outwardBias:this.params.outwardBias,duration:this.params.duration,count:n,uBurst:t},target:K(this,gi,`f`)}),t===1&&(e.draw({frag:ki,uniforms:{src:e.src,stateSize:K(this,X,`f`),count:n,color:wr(this.params.color),colorMix:this.params.colorMix},target:K(this,_i,`f`)}),e.clear(K(this,Y,`f`))),K(this,vi,`f`).instanceCount=n,e.clear(K(this,J,`f`)),e.draw({vert:Ai,frag:br,uniforms:{posTex:K(this,gi,`f`),colorTex:K(this,_i,`f`),stateSize:K(this,X,`f`),pointSize:this.params.pointSize,elementPixel:s,particleCount:n,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fog:this.params.fog},geometry:K(this,vi,`f`),target:K(this,J,`f`),blend:this.params.blend===`normal`?`premultiplied`:`additive`})}e.draw({frag:xr,uniforms:{trailPrev:K(this,Y,`f`),particleStamp:K(this,J,`f`),trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:K(this,Y,`f`)}),e.draw({frag:ji,uniforms:{trail:K(this,Y,`f`)},target:e.target})}dispose(){K(this,mi,`m`,Ei).call(this),K(this,J,`f`)?.dispose(),K(this,Y,`f`)?.dispose(),q(this,J,null,`f`),q(this,Y,null,`f`),q(this,vi,null,`f`)}outputRect(e){return e.canvasRect}};hi=new WeakMap,gi=new WeakMap,_i=new WeakMap,J=new WeakMap,Y=new WeakMap,vi=new WeakMap,X=new WeakMap,yi=new WeakMap,bi=new WeakMap,xi=new WeakMap,Si=new WeakMap,Ci=new WeakMap,mi=new WeakSet,wi=function(){let e=this.params.trailFade;return e<=0?1:e>=.999?600:Math.ceil(-Math.log(255)/Math.log(e))},Ti=function(e){let t={size:K(this,X,`f`),float:!0,wrap:`clamp`,filter:`nearest`};q(this,gi,e.createRenderTarget({...t,persistent:!0}),`f`),q(this,_i,e.createRenderTarget(t),`f`)},Ei=function(){K(this,gi,`f`)?.dispose(),K(this,_i,`f`)?.dispose(),q(this,gi,null,`f`),q(this,_i,null,`f`)},Di=function(){let e=K(this,X,`f`)[0]*K(this,X,`f`)[1];return Math.max(1,Math.min(e,Math.floor(this.params.count)))};var Z=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Q=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Pi,$,Fi,Ii,Li,Ri,zi,Bi,Vi,Hi,Ui,Wi,Gi,Ki,qi=`
float key(vec3 c, int mode) {
    if (mode == 0) return dot(c, vec3(0.299, 0.587, 0.114));
    if (mode == 1) return c.r;
    if (mode == 2) return c.g;
    if (mode == 3) return c.b;
    float mx = max(max(c.r, c.g), c.b);
    float mn = min(min(c.r, c.g), c.b);
    float d  = mx - mn;
    if (mode == 5) return mx > 0.0 ? d / mx : 0.0;
    if (d < 1e-5) return 0.0;
    float h;
    if (mx == c.r)      h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
    else                h = (c.r - c.g) / d + 4.0;
    return h / 6.0;
}
`,Ji=`
ivec2 toXY(int a, int b, int axis) { return axis == 0 ? ivec2(a, b) : ivec2(b, a); }

// Map a box point (centred coords) back into source pixel space — the same
// box -> source rotation rotate-in uses.
vec2 boxToSrc(vec2 boxPx, vec2 imgSize, vec2 rot) {
    vec2 dSrc = vec2(rot.x * boxPx.x + rot.y * boxPx.y, -rot.y * boxPx.x + rot.x * boxPx.y);
    return dSrc + imgSize * 0.5;
}

// Rotated path: does the low-res cell (a along axis, b across) overlap the
// source rect? Run membership is LENIENT — the bound is grown by one cell so a
// boundary cell straddling the source edge still counts as inside. That keeps
// every full-res inside pixel backed by a sorted cell; the crisp edge is
// reimposed per output pixel in the gather (see boxToSrc clip). Without the
// slack, boundary cells fall out of the run at coarse sortRes and the gather
// shows the original image in a staircase along the edge.
bool insideSrc(int a, int b, int axis, vec2 lowSize, vec2 boxSize, vec2 imgSize, vec2 rot) {
    vec2 boxPx = (vec2(toXY(a, b, axis)) + 0.5) / lowSize * boxSize - boxSize * 0.5;
    vec2 sp = boxToSrc(boxPx, imgSize, rot);
    float m = axis == 0 ? boxSize.x / lowSize.x : boxSize.y / lowSize.y;
    return sp.x >= -m && sp.x <= imgSize.x + m && sp.y >= -m && sp.y <= imgSize.y + m;
}

// A cell belongs to a sort run when it is inside the source AND its key falls
// in the [lo, hi] band. Both ends are inclusive so the defaults lo == 0 /
// hi == 1 keep every source pixel instead of dropping pure-black or pure-white
// ones. In the rotated path the source bound comes from \`insideSrc\`
// (coordinate), decoupled from the band, so the run never extends into padding.
bool runActive(sampler2D s, int a, int b, int axis, int keyMode, float lo, float hi, int masked, vec2 lowSize, vec2 boxSize, vec2 imgSize, vec2 rot) {
    if (masked == 1 && !insideSrc(a, b, axis, lowSize, boxSize, imgSize, rot)) return false;
    float k = key(texelFetch(s, toXY(a, b, axis), 0).rgb, keyMode);
    return k >= lo && k <= hi;
}

void scanSegment(sampler2D s, int a, int b, int L, int keyMode, float lo, float hi, int axis, int masked, vec2 lowSize, vec2 boxSize, vec2 imgSize, vec2 rot, out int segStart, out int segEnd) {
    segStart = a;
    for (int i = 0; i < 8192; i++) {
        if (segStart <= 0) break;
        if (i >= L) break;
        if (!runActive(s, segStart - 1, b, axis, keyMode, lo, hi, masked, lowSize, boxSize, imgSize, rot)) break;
        segStart--;
    }
    segEnd = a + 1;
    for (int i = 0; i < 8192; i++) {
        if (segEnd >= L) break;
        if (i >= L) break;
        if (!runActive(s, segEnd, b, axis, keyMode, lo, hi, masked, lowSize, boxSize, imgSize, rot)) break;
        segEnd++;
    }
}
`,Yi=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 srcSize;
uniform float threshold;
uniform float thresholdHigh;
uniform int keyMode;
uniform int direction;
uniform int axis;
uniform int masked;
uniform vec2 boxSize;
uniform vec2 imgSize;
uniform vec2 rot;
${qi}
${Ji}
void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int a = axis == 0 ? p.x : p.y;
    int b = axis == 0 ? p.y : p.x;
    int L = int(axis == 0 ? srcSize.x : srcSize.y);
    float myKey = key(texelFetch(src, p, 0).rgb, keyMode);
    if (!runActive(src, a, b, axis, keyMode, threshold, thresholdHigh, masked, srcSize, boxSize, imgSize, rot)) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    int segStart, segEnd;
    scanSegment(src, a, b, L, keyMode, threshold, thresholdHigh, axis, masked, srcSize, boxSize, imgSize, rot, segStart, segEnd);
    int rank = 0;
    for (int i = segStart; i < segEnd; i++) {
        if (i == a) continue;
        float k = key(texelFetch(src, toXY(i, b, axis), 0).rgb, keyMode);
        if (direction == 0) {
            if (k < myKey || (k == myKey && i < a)) rank++;
        } else {
            if (k > myKey || (k == myKey && i < a)) rank++;
        }
    }
    outColor = vec4(float(rank), float(segEnd - segStart), 0.0, 1.0);
}
`,Xi=`#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvContent;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D srcHi;
uniform sampler2D rankTex;
uniform vec2 lowSize;
uniform float threshold;
uniform float thresholdHigh;
uniform int keyMode;
uniform int axis;
uniform int masked;
uniform vec2 boxSize;
uniform vec2 imgSize;
uniform vec2 rot;
${qi}
${Ji}
void main() {
    vec2 p = masked == 1 ? uv : uvContent;
    vec2 hiUv = masked == 1 ? uv : uvSrc;
    if (any(lessThan(p, vec2(0.0))) || any(greaterThan(p, vec2(1.0)))) {
        outColor = vec4(0.0);
        return;
    }
    // Crisp source edge at full output resolution. The lenient low-res run
    // membership lets sorted content spill up to a cell into the padding;
    // clip it back to the exact rotated rect here so the boundary is sharp
    // and never reveals the padding, independent of sortRes.
    if (masked == 1) {
        vec2 sp = boxToSrc(p * boxSize - boxSize * 0.5, imgSize, rot);
        if (sp.x < 0.0 || sp.x > imgSize.x || sp.y < 0.0 || sp.y > imgSize.y) {
            outColor = vec4(0.0);
            return;
        }
    }
    int lowA = axis == 0 ? int(p.x * lowSize.x) : int(p.y * lowSize.y);
    int b    = axis == 0 ? int(p.y * lowSize.y) : int(p.x * lowSize.x);
    int L    = int(axis == 0 ? lowSize.x : lowSize.y);
    ivec2 lowP = toXY(lowA, b, axis);
    float myKey = key(texelFetch(src, lowP, 0).rgb, keyMode);
    if (!runActive(src, lowA, b, axis, keyMode, threshold, thresholdHigh, masked, lowSize, boxSize, imgSize, rot)) {
        // padding / out-of-band pixels skip the low-res buffer entirely.
        vec4 c = texture(srcHi, hiUv);
        outColor = vec4(c.rgb * c.a, c.a);
        return;
    }
    int segStart, segEnd;
    scanSegment(src, lowA, b, L, keyMode, threshold, thresholdHigh, axis, masked, lowSize, boxSize, imgSize, rot, segStart, segEnd);
    int targetRank = lowA - segStart;
    for (int i = segStart; i < segEnd; i++) {
        int r = int(texelFetch(rankTex, toXY(i, b, axis), 0).r + 0.5);
        if (r == targetRank) {
            // unmoved pixels keep the hi-res source; moved pixels take the low-res sorted color
            if (i == lowA) {
                vec4 c = texture(srcHi, hiUv);
                outColor = vec4(c.rgb * c.a, c.a);
            } else {
                vec4 c = texelFetch(src, toXY(i, b, axis), 0);
                outColor = vec4(c.rgb * c.a, c.a);
            }
            return;
        }
    }
    vec4 c = texture(srcHi, hiUv);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,Zi=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    vec4 c = texture(src, uvSrc);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,Qi=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 srcSize;
uniform vec2 boxSize;
uniform vec2 rot;
void main() {
    vec2 dBox = uv * boxSize - boxSize * 0.5;
    vec2 dSrc = vec2(
        rot.x * dBox.x + rot.y * dBox.y,
        -rot.y * dBox.x + rot.x * dBox.y
    );
    vec2 uvS = clamp((dSrc + srcSize * 0.5) / srcSize, 0.0, 1.0);
    outColor = texture(src, srcRectUv.xy + uvS * srcRectUv.zw);
}
`,$i=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 srcSize;
uniform vec2 boxSize;
uniform vec2 rot;
void main() {
    if (any(lessThan(uvContent, vec2(0.0))) || any(greaterThan(uvContent, vec2(1.0)))) {
        outColor = vec4(0.0);
        return;
    }
    vec2 dSrc = uvContent * srcSize - srcSize * 0.5;
    vec2 dBox = vec2(
        rot.x * dSrc.x - rot.y * dSrc.y,
        rot.y * dSrc.x + rot.x * dSrc.y
    );
    vec2 uvB = (dBox + boxSize * 0.5) / boxSize;
    outColor = texture(src, uvB);
}
`,ea={right:{axis:0,direction:0},left:{axis:0,direction:1},down:{axis:1,direction:1},up:{axis:1,direction:0}},ta={luminance:0,r:1,g:2,b:3,hue:4,saturation:5},na={range:[0,1],sortRes:128,key:`luminance`,direction:`up`,angle:0,bypass:!1},ra=class{constructor(e={}){Pi.add(this),$.set(this,null),Fi.set(this,null),Ii.set(this,null),Li.set(this,null),Ri.set(this,0),zi.set(this,0),Bi.set(this,0),Vi.set(this,0),Hi.set(this,0),Ui.set(this,0),Wi.set(this,0),this.params={...na,...e},this.params.range=[...this.params.range]}setParams(e){Object.assign(this.params,e),e.range&&(this.params.range=[...e.range])}render(e){if(Z(this,Pi,`m`,Ki).call(this,e),this.params.bypass||!Z(this,$,`f`)||!Z(this,Fi,`f`)){e.draw({frag:Zi,uniforms:{src:e.src},target:e.target});return}let{axis:t,direction:n}=ea[this.params.direction],r=[Z(this,Ui,`f`),Z(this,Wi,`f`)],[i,a]=this.params.range,o=ta[this.params.key],[s,c]=e.dims.elementPixel,l=Z(this,Ii,`f`),u=Z(this,Li,`f`),d=this.params.angle!==0&&l!==null&&u!==null,f=e.src,p=e.target,m=[1,0],h=[s,c];if(d){let t=-this.params.angle*Math.PI/180;m=[Math.cos(t),Math.sin(t)],h=[Z(this,Vi,`f`),Z(this,Hi,`f`)],e.draw({frag:Qi,uniforms:{src:e.src,srcSize:[s,c],boxSize:h,rot:m},target:l}),f=l,p=u}d&&l!==null?Ve(e,l,Z(this,$,`f`)):Be(e,Z(this,$,`f`));let g=+!!d,_=[s,c];e.draw({frag:Yi,uniforms:{src:Z(this,$,`f`),srcSize:r,threshold:i,thresholdHigh:a,keyMode:o,direction:n,axis:t,masked:g,boxSize:h,imgSize:_,rot:m},target:Z(this,Fi,`f`)}),e.draw({frag:Xi,uniforms:{src:Z(this,$,`f`),srcHi:f,rankTex:Z(this,Fi,`f`),lowSize:r,threshold:i,thresholdHigh:a,keyMode:o,axis:t,masked:g,boxSize:h,imgSize:_,rot:m},target:p}),d&&e.draw({frag:$i,uniforms:{src:u,srcSize:[s,c],boxSize:h,rot:m},target:e.target})}dispose(){Z(this,Pi,`m`,Gi).call(this),Q(this,Ri,0,`f`),Q(this,zi,0,`f`),Q(this,Bi,0,`f`),Q(this,Vi,0,`f`),Q(this,Hi,0,`f`),Q(this,Ui,0,`f`),Q(this,Wi,0,`f`)}};$=new WeakMap,Fi=new WeakMap,Ii=new WeakMap,Li=new WeakMap,Ri=new WeakMap,zi=new WeakMap,Bi=new WeakMap,Vi=new WeakMap,Hi=new WeakMap,Ui=new WeakMap,Wi=new WeakMap,Pi=new WeakSet,Gi=function(){Z(this,$,`f`)?.dispose(),Z(this,Fi,`f`)?.dispose(),Z(this,Ii,`f`)?.dispose(),Z(this,Li,`f`)?.dispose(),Q(this,$,null,`f`),Q(this,Fi,null,`f`),Q(this,Ii,null,`f`),Q(this,Li,null,`f`)},Ki=function(e){let[t,n]=e.dims.elementPixel,{axis:r}=ea[this.params.direction],{angle:i}=this.params,a=this.params.sortRes,o=t,s=n;if(i!==0){let e=i*Math.PI/180,r=Math.abs(Math.cos(e)),a=Math.abs(Math.sin(e));o=Math.ceil(t*r+n*a),s=Math.ceil(t*a+n*r)}let c=r===0?Math.max(1,Math.round(a*o/t)):Math.max(1,Math.round(a*s/n)),l=r===0?c:o,u=r===0?s:c;(Z(this,Ri,`f`)!==t||Z(this,zi,`f`)!==n||Z(this,Bi,`f`)!==i||Z(this,Ui,`f`)!==l||Z(this,Wi,`f`)!==u)&&(Z(this,Pi,`m`,Gi).call(this),Q(this,Ri,t,`f`),Q(this,zi,n,`f`),Q(this,Bi,i,`f`),Q(this,Vi,o,`f`),Q(this,Hi,s,`f`),Q(this,Ui,l,`f`),Q(this,Wi,u,`f`),Q(this,$,e.createRenderTarget({size:[l,u],filter:`nearest`}),`f`),Q(this,Fi,e.createRenderTarget({size:[l,u],filter:`nearest`,float:!0}),`f`),i!==0&&(Q(this,Ii,e.createRenderTarget({size:[o,s]}),`f`),Q(this,Li,e.createRenderTarget({size:[o,s]}),`f`)))};var ia=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},aa=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},oa,sa,ca,la=.25,ua=1.5,da=2,fa=32,pa=class extends t{constructor(){super(...arguments),this.name=`datamosh`,this.frag=`
vec4 transition(vec2 uv, float t) {
  return reverse > 0.5 ? readFrom(uv) : readTo(uv);
}
`}};function ma(e){return e!==void 0&&Number.isFinite(e)&&e>=2?Math.round(e):fa}var ha=class extends vt{constructor(e){super({dup:0,blockSize:e()}),oa.set(this,void 0),sa.set(this,0),ca.set(this,1),ia(this,oa,e,`f`)}start(e){this.params.blockSize=aa(this,oa,`f`).call(this),this.params.chromaGain=ua,this.params.useResidual=!1,this.params.healRate=0,ia(this,sa,0,`f`),ia(this,ca,Math.max(e.duration*.75,.001),`f`),this.enable()}update(e){var t;let{x:n}=e.progress,r=Math.min(Math.max((n-la)/.75,0),1);this.params.useResidual=ia(this,sa,(t=aa(this,sa,`f`),++t),`f`)>da,this.params.chromaGain=ua+-.5*r,this.params.healRate=n<la?0:1-.01**(e.deltaTime/aa(this,ca,`f`))}end(){this.disable()}};oa=new WeakMap,sa=new WeakMap,ca=new WeakMap;var ga=class extends m{constructor(){super(...arguments),this.name=`datamosh`,this.stages=[new pa,new ha(()=>ma(this.params.blockSize))]}},_a=class extends t{constructor(){super(...arguments),this.name=`distort_fade`,this.frag=`
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

${u}
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
`}},va=/vec4\s+transition\s*\(\s*vec2\s+(\w+)\s*\)/,ya=new Set([`from`,`src`,`srcRectUv`,`t`,`reverse`,`resolution`,`time`,`uvContent`,`outColor`,`progress`,`ratio`]),ba=e=>ya.has(e)?`glParam_${e}`:e;function xa(e){let n=e.paramsTypes??{},r=[...e.textures??[],...Object.keys(n).filter(e=>n[e]===`sampler2D`)];if(r.length>0)throw Error(`[VFX-JS] gl-transition "${e.name}" needs textures (${r.join(`, `)}), which are not supported.`);if(!va.test(e.glsl))throw Error(`[VFX-JS] gl-transition "${e.name}" has no \`vec4 transition(vec2 uv)\`.`);let i=e.glsl.replace(va,`vec4 glTransition_(vec2 $1)`);for(let e of Object.keys(n)){let t=ba(e);t!==e&&(i=i.replace(RegExp(`(^|[^.\\w])${e}\\b`,`g`),`$1${t}`))}let a=`
float progress;
float ratio;
vec4 getFromColor(vec2 p) { return readFrom(clamp(p, 0.0, 1.0)); }
vec4 getToColor(vec2 p) { return readTo(clamp(p, 0.0, 1.0)); }

${i}

vec4 transition(vec2 uv, float t) {
  // getFromColor clamps, so a container overflow would stretch the edges.
  if (!inRange(uv)) return vec4(0.0);
  progress = t;
  ratio = resolution.x / resolution.y;
  return glTransition_(uv);
}
`;return class extends t{constructor(t={}){super(t),this.name=`gl:${e.name}`,this.frag=a,this.ease=`linear`;for(let r of Object.keys(t))r in n||console.warn(`[VFX-JS] gl-transition "${e.name}" has no param "${r}".`)}uniforms(){let t={},n={...e.defaultParams,...this.params};for(let e of Object.keys(n))t[ba(e)]=n[e];return t}}}var Sa=class extends t{constructor(){super(...arguments),this.name=`glitch`,this.frag=`
uniform float amount;
uniform float speed;

float gnoise(float y) {
  return sin(y * 7.0) * sin(y * 17.0) * sin(y * 59.0);
}
vec2 gnoise(vec2 uv) {
  return vec2(gnoise(uv.x), gnoise(uv.y + 100.0));
}

${c}
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
`}uniforms(){return{amount:this.params.amount??1,speed:this.params.speed??1}}},Ca=class extends t{constructor(){super(...arguments),this.name=`glitch_slide`,this.frag=`
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
`}},wa=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Ta=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ea,Da=.12,Oa=30,ka=e=>Math.min(Math.max(e.quality??.1,0),1),Aa=class extends jn{constructor(e){super({quality:ka(e()),bypass:!0,resolutionScale:.25}),Ea.set(this,void 0),wa(this,Ea,e,`f`)}start(){this.params.bypass=!0,this.params.speed=Oa,this.params.quality=ka(Ta(this,Ea,`f`).call(this))}render(e){let{x:t}=e.progress;this.params.bypass=!(t>Da&&t<.88);let n=Math.sin(Math.min(Math.max(t,0),1)*Math.PI),r=Math.max(1,Math.round(Ta(this,Ea,`f`).call(this).iterations??4));this.params.iterations=Math.max(1,Math.round(r*n)),super.render(e)}end(){this.params.bypass=!0}};Ea=new WeakMap;var ja=class extends m{constructor(){super(...arguments),this.name=`jpeg_glitch`,this.ease=`linear`,this.stages=[new d,new Aa(()=>this.params)]}},Ma=class extends t{constructor(){super(...arguments),this.name=`lens_distortion`,this.frag=`
uniform float strength;
uniform float dispersion;
// The old content zooms from 1 to 1 + zoom; the new one from 1 + zoom back to 1.
uniform float zoom;
const float TAPS = 12.0;
// Width of the growing warp's edge.
const float SOFT = 0.5;

${l}
${u}
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
`}uniforms(){return{strength:this.params.strength??1,dispersion:Math.max(0,this.params.dispersion??.6),zoom:Math.max(0,this.params.zoom??3)}}},Na={right:[1,0],left:[-1,0],up:[0,1],down:[0,-1],center:[0,0]},Pa=class extends t{constructor(){super(...arguments),this.name=`pixel_scan`,this.frag=`
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
`}uniforms(){return{blackout:this.params.blackout??!0?1:0,sweep:Na[this.params.direction??`right`]}}},Fa=class extends t{constructor(){super(...arguments),this.name=`pixel_stretch`,this.frag=`
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
`}},Ia=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},La=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ra,za,Ba={up:`down`,down:`up`,left:`right`,right:`left`},Va=class extends ra{constructor(e){super({range:[1,1]}),Ra.set(this,void 0),za.set(this,!1),Ia(this,Ra,e,`f`)}start(e){let t=La(this,Ra,`f`).call(this);Ia(this,za,e.reverse,`f`),this.params.direction=e.reverse?Ba[t]:t,this.params.range[0]=1}update(e){let{t}=e.progress,n=La(this,Ra,`f`).call(this),r=La(this,za,`f`)?1-t:t;this.params.direction=r<.5?n:Ba[n],this.params.range[0]=Math.abs(1-2*t)}end(){this.params.range[0]=1}};Ra=new WeakMap,za=new WeakMap;var Ha=class extends m{constructor(){super(...arguments),this.name=`pixelsort`,this.stages=[new d,new Va(()=>this.params.direction??`up`)]}},Ua=class extends t{constructor(){super(...arguments),this.name=`slit_scan`,this.frag=`
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
`}},Wa={left:[-1,0],right:[1,0],up:[0,1],down:[0,-1]},Ga=class extends t{constructor(){super(...arguments),this.name=`swipe`,this.frag=`
uniform vec2 move;
const float STRETCH = 0.6;
const float BLUR = 0.2;
const float TAPS = 16.0;

${l}
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
`}uniforms(){return{move:Wa[this.params.direction??`left`]}}},Ka={center:[0,0],left:[-1,0],right:[1,0],up:[0,1],down:[0,-1]},qa={hex:`
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
`},Ja=e=>`
uniform float count;
uniform float shadow;
// Zero spreads out in rings; otherwise the side the sweep moves toward.
uniform vec2 sweep;
const float SPREAD = 0.6;
// Shadow offset and blur at full lift, in tiles.
const vec2 SHADOW_OFFSET = vec2(0.05, -0.08);
const float SHADOW_BLUR = 0.12;
${qa[e]}
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
`,Ya={hex:Ja(`hex`),square:Ja(`square`)},Xa=class extends t{constructor(){super(...arguments),this.name=`tile`}get frag(){return Ya[this.params.shape??`hex`]}uniforms(){return{count:Math.max(1,Math.round(this.params.count??12)),shadow:Math.min(Math.max(this.params.shadow??.5,0),1),sweep:Ka[this.params.direction??`center`]}}},Za=class extends t{constructor(){super(...arguments),this.name=`zoom`,this.overflow=!0,this.frag=`
vec4 transition(vec2 uv, float t) {
  vec2 uv1 = (uv - 0.5) * (1.0 - t) + 0.5;
  vec2 uv2 = (uv - 0.5) / (t * 0.999 + 0.001) + 0.5;
  // Tile the new content only inside the element, so the overflow shows just the old one.
  vec4 to = inRange(uv) ? readTo(fract(uv2)) : vec4(0.0);
  return mix(readFrom(uv1), to, t);
}
`}},Qa=class extends t{constructor(){super(...arguments),this.name=`zoom_blur`,this.overflow=!0,this.frag=`
${c}
${l}
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
`}},$a=i({Crossfade:()=>e,Crosszoom:()=>h,Datamosh:()=>ga,DistortFade:()=>_a,Glitch:()=>Sa,GlitchSlide:()=>Ca,JpegGlitch:()=>ja,LensDistortion:()=>Ma,PixelScan:()=>Pa,PixelStretch:()=>Fa,Pixelsort:()=>Ha,SlitScan:()=>Ua,Swipe:()=>Ga,Tile:()=>Xa,Zoom:()=>Za,ZoomBlur:()=>Qa,createGLTransition:()=>xa}),eo=new Map,to=new Map,no=new Map,ro=new Map,io={},ao=!1,oo=new Set,so=new Map;for(let[e,t]of Object.entries($a))typeof t==`function`&&/^[A-Z]/.test(e)&&so.set(e.toLowerCase(),t);function co(e,t){for(let[n,r]of Object.entries(t??{}))e.set(n,r)}function lo(e){co(eo,e.transitions),co(to,e.uniforms),co(no,e.shaders),co(ro,e.eases),e.vfx&&(ao&&console.warn("[@vfx-js/astro] registerVFX: the VFX already exists, so the `vfx` options are ignored. Call registerVFX before any element."),io={...io,...e.vfx});for(let e of oo)e()}function uo(e){return oo.add(e),()=>{oo.delete(e)}}function fo(e){return eo.get(e)??so.get(e)}function po(e){return to.get(e)}function mo(e){return no.get(e)}function ho(e){return ro.get(e)}function go(){return ao=!0,io}var _o=`[@vfx-js/astro]`;function vo(e){let t;try{t=JSON.parse(e)}catch{return console.error(`${_o} data-vfx is not valid JSON:`,e),{props:null}}if(typeof t!=`object`||!t||Array.isArray(t))return console.error(`${_o} data-vfx must be a JSON object:`,e),{props:null};let{shader:n,uniforms:r,...i}=t,a=i;if(typeof n==`string`&&n.startsWith(`@`)){let e=mo(n.slice(1));if(!e)return{props:null,missing:`shader "${n}"`};a.shader=e}else n!==void 0&&(a.shader=n);if(typeof r==`string`){let e=po(r);if(!e)return{props:null,missing:`uniforms "${r}"`};a.uniforms=e}else r!==void 0&&(a.uniforms=r);return{props:a}}function yo(e){if(e===`smoothstep`||e===`linear`)return e;let t=ho(e);return t||console.warn(`${_o} Unknown ease: ${e}`),t}function bo(e){let t=e.trim(),n;if(t.startsWith(`{`))try{n=JSON.parse(t)}catch{return console.error(`${_o} Transition spec is not valid JSON:`,e),null}else n={transition:t};if(typeof n!=`object`||!n)return null;let{transition:r,ease:i,...a}=n,o=a;if(r){let e=fo(r);e?o.transition=e:console.warn(`${_o} Unknown transition: ${r}`)}if(i){let e=yo(i);e&&(o.ease=e)}return o}function xo(e,t){return e??t??{}}var So=null,Co=!1;function wo(){return!So&&!Co&&(So=n.init({...go()}),Co=So===null),So}function To(){return So}export{Le as _,xo as a,ra as c,mr as d,Kn as f,vt as g,Lt as h,bo as i,Ni as l,Ht as m,To as n,uo as o,jn as p,vo as r,lo as s,wo as t,pi as u,Se as v};