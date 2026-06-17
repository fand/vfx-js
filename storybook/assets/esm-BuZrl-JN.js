import{n as e}from"./chunk-BneVvdWh.js";function t(e){return Array.isArray(e)?[...e]:Array.from(e)}function n(e){return typeof e==`number`?[e,e]:e}async function r(e,t){let n=typeof document<`u`?document.fonts:void 0;if(n?.load)try{await n.load(`${t} ${y}px ${e}`),await n.ready}catch{}}function i(e,t,n,r){let i=Math.max(1,e.length),a=Math.ceil(Math.sqrt(i)),o=Math.ceil(i/a),s=`${n} ${y}px ${t}`,c=document.createElement(`canvas`),l;if(r&&r>0)l=Math.max(1,Math.round(r*y));else{let e=c.getContext(`2d`);l=y,e&&(e.font=s,l=Math.max(1,Math.ceil(e.measureText(`M`).width)))}c.width=a*l,c.height=o*y;let u=c.getContext(`2d`);if(u){u.clearRect(0,0,c.width,c.height),u.fillStyle=`#fff`,u.textAlign=`center`,u.textBaseline=`middle`,u.font=s;for(let t=0;t<e.length;t++){let n=t%a*l+l/2,r=Math.floor(t/a)*y+y/2;u.fillText(e[t],n,r)}}return{canvas:c,cols:a,rows:o,cellW:l,cellH:y}}function a(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement)return[e.naturalWidth||e.width,e.naturalHeight||e.height];let t=e;return[t.width||1,t.height||1]}async function o(e){if(typeof e!=`string`)return e;let t=new Image;t.crossOrigin=`anonymous`,t.src=e;try{await t.decode()}catch{}return t}function s(e){let t=Math.max(1,e.length),n=Math.ceil(Math.sqrt(t)),r=Math.ceil(t/n),i=e.map(a),[o,s]=i[0]??[1,1],c=o/Math.max(1,s),l=Math.max(1,...i.map(e=>e[1])),u=Math.min(ae,Math.max(8,Math.round(l))),d=Math.max(1,Math.round(u*c)),f=Math.min(1,ie/(n*d),ie/(r*u));d=Math.max(1,Math.floor(d*f)),u=Math.max(1,Math.floor(u*f));let p=document.createElement(`canvas`);p.width=n*d,p.height=r*u;let m=p.getContext(`2d`);if(m){m.clearRect(0,0,p.width,p.height);for(let t=0;t<e.length;t++){let[r,a]=i[t],o=Math.min(d/r,u/a),s=r*o,c=a*o,l=t%n*d+(d-s)/2,f=Math.floor(t/n)*u+(u-c)/2;m.drawImage(e[t],l,f,s,c)}}return{canvas:p,cols:n,rows:r,cellW:d,cellH:u}}var c,l,u,d,f,p,m,h,g,_,v,ee,te,ne,re,y,ie,ae,oe,se=e((()=>{c=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},l=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},te={standard:` .:-=+*#%@`,minimal:` .#`,blocks:` ░▒▓█`,dots:` .·•●`,circles:` ◌○◉●`,detailed:` .'\`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$`},ne=`#version 300 es
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
// away most of the cell; this keeps the glyph choice representative.
const int TAPS = 4;

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
    vec3 fg;
    if (tileColor == 1) {
        fg = tile.rgb;
    } else {
        fg = colorFromSource == 1 ? acc.rgb : color.rgb;
    }
    float fgA = tile.a * color.a * acc.a;

    float outA = fgA + background.a * (1.0 - fgA);
    vec3 premul = fg * fgA + background.rgb * background.a * (1.0 - fgA);
    outColor = vec4(premul, outA);
}
`,re={grid:12,preset:`standard`,font:`monospace`,fontWeight:`normal`,color:[1,1,1,1],background:[0,0,0,0],colorFromSource:!1,invert:!1,dither:0},y=64,ie=2048,ae=256,oe=class{constructor(e={}){u.add(this),d.set(this,null),f.set(this,1),p.set(this,1),m.set(this,1),h.set(this,1),g.set(this,[1,1]),_.set(this,!1),v.set(this,null),this.params={...re,...e}}setParams(e){Object.assign(this.params,e)}async init(e){typeof document>`u`||(c(this,v,e,`f`),await l(this,u,`m`,ee).call(this,e))}async updateAtlas(){l(this,v,`f`)&&await l(this,u,`m`,ee).call(this,l(this,v,`f`))}render(e){if(!l(this,d,`f`))return;let[t,r]=e.dims.elementPixel,[i,a]=n(this.params.grid),o=[Math.max(1,i)*e.pixelRatio,Math.max(1,a)*e.pixelRatio];e.draw({frag:ne,uniforms:{src:e.src,atlas:l(this,d,`f`),elementPx:[Math.max(1,t),Math.max(1,r)],cellPx:o,cols:l(this,f,`f`),rows:l(this,p,`f`),charCount:l(this,m,`f`),glyphAspect:l(this,h,`f`),atlasCellPx:l(this,g,`f`),tileColor:+!!l(this,_,`f`),color:this.params.color,background:this.params.background,colorFromSource:+!!this.params.colorFromSource,invert:+!!this.params.invert,dither:Math.min(1,Math.max(0,this.params.dither))},target:e.target})}dispose(){c(this,d,null,`f`),c(this,v,null,`f`)}},d=new WeakMap,f=new WeakMap,p=new WeakMap,m=new WeakMap,h=new WeakMap,g=new WeakMap,_=new WeakMap,v=new WeakMap,u=new WeakSet,ee=async function(e){let n=this.params.tiles,a;if(n&&n.length>0){let e=await Promise.all(n.map(o));c(this,m,e.length,`f`),c(this,_,!0,`f`),a=s(e)}else{n&&n.length===0&&console.warn("[VFX-JS] AsciiEffect: `tiles` is empty; falling back to characters.");let e=t(this.params.chars??te[this.params.preset]);e.length===0&&console.warn(`[VFX-JS] AsciiEffect: empty character ramp; nothing will be rendered.`),c(this,m,Math.max(1,e.length),`f`),c(this,_,!1,`f`),await r(this.params.font,this.params.fontWeight),a=i(e,this.params.font,this.params.fontWeight,this.params.charAspect)}c(this,f,a.cols,`f`),c(this,p,a.rows,`f`),c(this,h,a.cellW/a.cellH,`f`),c(this,g,[a.cellW,a.cellH],`f`),c(this,d,e.wrapTexture(a.canvas,{autoUpdate:!1,filter:`linear`}),`f`)}})),ce,le,ue,de,fe,pe,me,he,ge,_e,ve,ye,be=e((()=>{ce=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
`,le=`
const float PI = 3.141592653589793;
float cc(int k){ return k == 0 ? 0.7071067811865476 : 1.0; }
`,ue=`
vec3 rgb2ycc(vec3 c){
  return vec3(
     0.299*c.r + 0.587*c.g + 0.114*c.b,
    -0.168736*c.r - 0.331264*c.g + 0.5*c.b,
     0.5*c.r - 0.418688*c.g - 0.081312*c.b);
}
vec3 ycc2rgb(vec3 y){
  return vec3(
    y.x + 1.402   * y.z,
    y.x - 0.344136* y.y - 0.714136 * y.z,
    y.x + 1.772   * y.y);
}
`,de=`
  ivec2 res = textureSize(src, 0);
  ivec2 p   = ivec2(uvSrc * vec2(res));
  ivec2 b   = (p / 8) * 8;
  ivec2 l   = p - b;
`,fe=`${ce}
void main(){
  vec4 c = texture(src, uvSrc);
  outColor = vec4(c.rgb * c.a, c.a);
}`,pe=`${ce}${le}${ue}
void main(){
${de}
  vec4 sum = vec4(0.0);
  for (int x = 0; x < 8; x++) {
    vec4 t = texelFetch(src, clamp(b + ivec2(x, l.y), ivec2(0), res - 1), 0);
    vec4 f = (vec4(rgb2ycc(t.rgb), t.a) - vec4(0.5, 0.0, 0.0, 0.5)) * 255.0;
    sum += f * cos(float(2*x+1) * float(l.x) * PI / 16.0);
  }
  outColor = sum * 0.5 * cc(l.x);
}`,me=`${ce}${le}
void main(){
${de}
  vec4 sum = vec4(0.0);
  for (int y = 0; y < 8; y++)
    sum += texelFetch(src, clamp(b + ivec2(l.x, y), ivec2(0), res - 1), 0)
         * cos(float(2*y+1) * float(l.y) * PI / 16.0);
  outColor = sum * 0.5 * cc(l.y);
}`,he=`${ce}${le}
uniform float uS;                              // libjpeg quality scale
const float LQ[64] = float[64](
  16.,11.,10.,16.,24.,40.,51.,61., 12.,12.,14.,19.,26.,58.,60.,55.,
  14.,13.,16.,24.,40.,57.,69.,56., 14.,17.,22.,29.,51.,87.,80.,62.,
  18.,22.,37.,56.,68.,109.,103.,77., 24.,35.,55.,64.,81.,104.,113.,92.,
  49.,64.,78.,87.,103.,121.,120.,101., 72.,92.,95.,98.,112.,100.,103.,99.);
const float CQ[64] = float[64](
  17.,18.,24.,47.,99.,99.,99.,99., 18.,21.,26.,66.,99.,99.,99.,99.,
  24.,26.,56.,99.,99.,99.,99.,99., 47.,66.,99.,99.,99.,99.,99.,99.,
  99.,99.,99.,99.,99.,99.,99.,99., 99.,99.,99.,99.,99.,99.,99.,99.,
  99.,99.,99.,99.,99.,99.,99.,99., 99.,99.,99.,99.,99.,99.,99.,99.);
float qstep(float base){ return clamp(floor((base * uS + 50.0) / 100.0), 1.0, 255.0); }
void main(){
${de}
  vec4 sum = vec4(0.0);
  for (int v = 0; v < 8; v++) {
    int idx = v * 8 + l.x;
    vec4 F  = texelFetch(src, clamp(b + ivec2(l.x, v), ivec2(0), res - 1), 0);
    vec4 q  = vec4(qstep(LQ[idx]), qstep(CQ[idx]), qstep(CQ[idx]), qstep(LQ[idx]));
    sum += cc(v) * round(F / q) * q * cos(float(2*l.y+1) * float(v) * PI / 16.0);
  }
  outColor = sum * 0.5;
}`,ge=`${ce}${le}${ue}
void main(){
${de}
  vec4 sum = vec4(0.0);
  for (int u = 0; u < 8; u++)
    sum += cc(u) * texelFetch(src, clamp(b + ivec2(u, l.y), ivec2(0), res - 1), 0)
         * cos(float(2*l.x+1) * float(u) * PI / 16.0);
  sum = sum * 0.5 / 255.0 + vec4(0.5, 0.0, 0.0, 0.5);
  outColor = clamp(vec4(ycc2rgb(sum.xyz), sum.w), 0.0, 1.0);
}`,_e=`${ce}${ue}
vec2 cellChroma(ivec2 res, ivec2 cell){
  vec2 s = vec2(0.0);
  for (int j = 0; j < 2; j++)
  for (int i = 0; i < 2; i++) {
    ivec2 ip = clamp(cell * 2 + ivec2(i, j), ivec2(0), res - 1);
    s += rgb2ycc(texelFetch(src, ip, 0).rgb).yz;
  }
  return s * 0.25;
}
void main(){
  ivec2 res = textureSize(src, 0);
  ivec2 p   = ivec2(uvSrc * vec2(res));
  vec4 c0   = texelFetch(src, clamp(p, ivec2(0), res - 1), 0);
  float Y   = rgb2ycc(c0.rgb).x;               // luma stays full-res
  vec2 gpos = (vec2(p) + 0.5) * 0.5 - 0.5;     // position on the half-res chroma grid
  vec2 gi   = floor(gpos);
  vec2 f    = gpos - gi;
  ivec2 c   = ivec2(gi);
  vec2 cb = mix(
    mix(cellChroma(res, c + ivec2(0,0)), cellChroma(res, c + ivec2(1,0)), f.x),
    mix(cellChroma(res, c + ivec2(0,1)), cellChroma(res, c + ivec2(1,1)), f.x), f.y);
  outColor = vec4(clamp(ycc2rgb(vec3(Y, cb)), 0.0, 1.0), c0.a);
}`,ve=[`coeff`,`tmp`,`sub`,`a`,`b`],ye=class{constructor({quality:e=8,iterations:t=3,downscale:n=1}={}){this.lowRes=null,this.quality=e,this.iterations=t,this.downscale=n}ensureLowRes(e,t,n){if(this.lowRes&&this.lowRes.w===t&&this.lowRes.h===n)return this.lowRes;this.disposeLowRes();let r=[t,n];return this.lowRes={w:t,h:n,coeff:e.createRenderTarget({float:!0,size:r}),tmp:e.createRenderTarget({float:!0,size:r}),sub:e.createRenderTarget({size:r}),a:e.createRenderTarget({size:r}),b:e.createRenderTarget({size:r})},this.lowRes}disposeLowRes(){if(this.lowRes){for(let e of ve)this.lowRes[e].dispose();this.lowRes=null}}render(e){let t=Math.max(1,Math.min(10,this.iterations|0)),n=Math.max(1,Math.min(100,this.quality)),r=n<50?5e3/n:200-2*n,i=Math.max(.02,Math.min(1,this.downscale)),[a,o]=e.dims.element,s=Math.max(1,Math.floor(a*i)),c=Math.max(1,Math.floor(o*i)),l=this.ensureLowRes(e,s,c);e.draw({frag:fe,uniforms:{src:e.src},target:l.a});let u=l.a;for(let n=0;n<t;n++){e.draw({frag:_e,uniforms:{src:u},target:l.sub}),e.draw({frag:pe,uniforms:{src:l.sub},target:l.tmp}),e.draw({frag:me,uniforms:{src:l.tmp},target:l.coeff}),e.draw({frag:he,uniforms:{src:l.coeff,uS:r},target:l.tmp});let t=n%2==0?l.b:l.a;e.draw({frag:ge,uniforms:{src:l.tmp},target:t}),u=t}e.blit(u,e.target)}dispose(){this.disposeLowRes()}}})),b,x,xe,S,C,Se,Ce,we,Te,Ee,De,Oe,ke,Ae,je,Me,Ne,Pe=e((()=>{b=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},x=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},De=`#version 300 es
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
`,Oe=`#version 300 es
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
`,ke=`#version 300 es
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
`,Ae=`#version 300 es
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
`,je={threshold:.7,softness:.1,intensity:1.2,scatter:.7,pad:50,dither:0,edgeFade:.02},Me=.5,Ne=class{constructor(e={}){xe.add(this),S.set(this,null),C.set(this,[]),Se.set(this,[]),Ce.set(this,!1),we.set(this,0),Te.set(this,0),this.params={...je,...e}}setParams(e){Object.assign(this.params,e)}init(e){b(this,S,e.createRenderTarget({float:!0}),`f`)}render(e){if(!x(this,S,`f`))return;let{threshold:t,softness:n,intensity:r}=this.params,i=Math.min(Math.max(this.params.scatter,0),1),a=Math.max(0,this.params.dither),o=Math.max(1e-6,this.params.edgeFade);(x(this,S,`f`).width!==x(this,we,`f`)||x(this,S,`f`).height!==x(this,Te,`f`))&&(x(this,C,`f`).length=0,x(this,Se,`f`).length=0,b(this,Ce,!1,`f`),b(this,we,x(this,S,`f`).width,`f`),b(this,Te,x(this,S,`f`).height,`f`)),x(this,xe,`m`,Ee).call(this,e,x(this,S,`f`).width,x(this,S,`f`).height);let s=x(this,C,`f`).length;if(s===0)return;e.draw({frag:De,uniforms:{src:e.src,threshold:t,softness:n,edgeFade:o},target:x(this,S,`f`)}),e.draw({frag:Oe,uniforms:{src:x(this,S,`f`),texelSize:[1/x(this,S,`f`).width,1/x(this,S,`f`).height],karis:1},target:x(this,C,`f`)[0]});for(let t=1;t<s;t++){let n=x(this,C,`f`)[t-1];e.draw({frag:Oe,uniforms:{src:n,texelSize:[1/n.width,1/n.height],karis:0},target:x(this,C,`f`)[t]})}let c=x(this,S,`f`).width,l=x(this,S,`f`).height,u=1+i*Math.max(0,s-1),d=e=>Math.min(1,Math.max(0,u-e));for(let t=s-2;t>=0;t--){let n=t===s-2?x(this,C,`f`)[s-1]:x(this,Se,`f`)[t+1],r=2**(t+2),i=t===s-2?d(s-1):1;e.draw({frag:ke,uniforms:{srcSmall:n,srcLarge:x(this,C,`f`)[t],texelSize:[Me*r/c,Me*r/l],weightLarge:d(t),weightSmall:i},target:x(this,Se,`f`)[t]})}let f=s>=2?x(this,Se,`f`)[0]:x(this,C,`f`)[0],p=r/Math.max(1,u);e.draw({frag:Ae,uniforms:{src:e.src,bloom:f,texelSize:[Me*2/c,Me*2/l],intensity:p,dither:a,edgeFade:o},target:e.target})}outputRect(e){let{pad:t}=this.params;if(t===`fullscreen`)return e.canvasRect;let n=t*e.pixelRatio,[,,r,i]=e.contentRect;return[-n,-n,r+2*n,i+2*n]}dispose(){b(this,S,null,`f`),x(this,C,`f`).length=0,x(this,Se,`f`).length=0,b(this,Ce,!1,`f`),b(this,we,0,`f`),b(this,Te,0,`f`)}},S=new WeakMap,C=new WeakMap,Se=new WeakMap,Ce=new WeakMap,we=new WeakMap,Te=new WeakMap,xe=new WeakSet,Ee=function(e,t,n){if(x(this,Ce,`f`))return;let r=Math.max(1,Math.floor(t/2)),i=Math.max(1,Math.floor(n/2));for(let t=0;t<8;t++){x(this,C,`f`).push(e.createRenderTarget({size:[r,i],float:!0}));let t=Math.max(1,Math.floor(r/2)),n=Math.max(1,Math.floor(i/2));if(t===r&&n===i)break;r=t,i=n}for(let t=0;t<x(this,C,`f`).length-1;t++)x(this,Se,`f`).push(e.createRenderTarget({size:[x(this,C,`f`)[t].width,x(this,C,`f`)[t].height],float:!0}));b(this,Ce,!0,`f`)}})),Fe,Ie,Le,Re=e((()=>{Fe=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float aspect;
uniform float intensity;
uniform float radius;
uniform float power;

// Sample at a content-space UV mirror-wrapped into [0, 1], remapped into
// the padded src buffer via srcRectUv.
vec4 mirrorTex(vec2 uv) {
    vec2 uv2 = 1. - abs(1. - mod(uv, 2.0));
    return texture(src, srcRectUv.xy + uv2 * srcRectUv.zw);
}

void main() {
    vec2 uv = uvContent;

    vec2 p = uv * 2.0 - 1.0;
    p.x *= aspect;

    float l = max(length(p) - radius, 0.);
    float d = pow(l, power) * (intensity * 0.1);

    vec2 uvR = (uv - .5) / (1.0 + d * 1.) + 0.5;
    vec2 uvG = (uv - .5) / (1.0 + d * 2.) + 0.5;
    vec2 uvB = (uv - .5) / (1.0 + d * 3.) + 0.5;

    vec4 cr = mirrorTex(uvR);
    vec4 cg = mirrorTex(uvG);
    vec4 cb = mirrorTex(uvB);

    outColor = vec4(cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 3.0);
}
`,Ie={intensity:.3,radius:0,power:2},Le=class{constructor(e={}){this.params={...Ie,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:Fe,uniforms:{src:e.src,aspect:(t||1)/(n||1),intensity:this.params.intensity,radius:this.params.radius,power:this.params.power},target:e.target})}}})),w,T,ze,E,D,Be,Ve,He,Ue,We,Ge,Ke,qe,Je,Ye,Xe,Ze,Qe,$e,et,tt,nt,rt,it,at,ot,st,ct,lt,ut,dt,ft,pt,mt,ht=e((()=>{w=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},T=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},nt=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D tex;
void main() {
    vec4 c = texture(tex, uvContent);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,rt=`#version 300 es
precision highp float;
out vec4 outMV;
uniform sampler2D uCur, uRef;
uniform vec2 uResolution;   // [w, h] in px
uniform float uBlock;       // block size in px
uniform float uSearch;      // search radius, in steps
uniform float uStep;        // px per step (coverage = uSearch * uStep px)
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
    for (float by = -uSearch; by <= uSearch; by++) {
      for (float bx = -uSearch; bx <= uSearch; bx++) {
        vec2 cand = vec2(bx, by) * uStep;   // candidate displacement, px
        float sad = 0.0;
        for (int k = 0; k < 9; k++) {
          vec3 cRef = texture(uRef, (base + off[k] + cand + 0.5) / uResolution).rgb;
          sad += dot(abs(cs[k] - cRef), vec3(1.0));
        }
        sad += length(cand) * 0.0025;   // prefer small motion on ties
        if (sad < bestSad) {
          bestSad = sad;
          move = cand;
        }
      }
    }

    outMV = vec4(move, 0.0, 1.0);
}
`,it=`#version 300 es
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
`,at=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D uAccum, uMV, uVideo, uResidual;
uniform vec2 uResolution;
uniform bool uIntra;
uniform bool uUseResidual;
void main() {
    if (uIntra) {
        outColor = vec4(texture(uVideo, uv).rgb, 1.0);
        return;
    }
    vec2 mv = texture(uMV, uv).rg; // px
    vec3 pred = texture(uAccum, uv + mv / uResolution).rgb;
    vec3 res = uUseResidual ? texture(uResidual, uv).rgb : vec3(0.0);
    // Clamp like an 8-bit decoder so the feedback can't run away to white.
    outColor = vec4(clamp(pred + res, 0.0, 1.0), 1.0);
}
`,ot=`#version 300 es
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
`,st=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D uResidual;
void main() {
    vec3 r = texture(uResidual, uvContent).rgb;
    outColor = vec4(clamp(r * 0.5 + 0.5, 0.0, 1.0), 1.0);
}
`,ct=`
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 chroma(vec3 c) {
    return vec2(dot(c, vec3(-0.168736, -0.331264, 0.5)),
                dot(c, vec3(0.5, -0.418688, -0.081312))) + 0.5;
}
`,lt=`#version 300 es
precision highp float;
${ct}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uCur, uRef, uMV;
uniform vec2 uChromaRes;
void main() {
    vec2 mvc = floor(texture(uMV, uv).rg * 0.5);
    vec2 pred = chroma(texture(uRef, uv + mvc / uChromaRes).rgb);
    outColor = vec4(chroma(texture(uCur, uv).rgb) - pred, 0.0, 1.0);
}
`,ut=`#version 300 es
precision highp float;
${ct}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uAccum, uMV, uVideo, uResidual;
uniform vec2 uResolution;
uniform bool uIntra;
uniform bool uUseResidual;
void main() {
    // I-frame: passthrough the input
    if (uIntra) {
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
`,dt=`#version 300 es
precision highp float;
${ct}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uChromaAcc, uMV, uVideo, uResidualC;
uniform vec2 uChromaRes;
uniform bool uIntra;
uniform bool uUseResidual;
void main() {
    // I-frame: passthrough the input
    if (uIntra) {
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
`,ft=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D uLumaAcc;
uniform sampler2D uChromaAcc;
uniform float uChromaGain;
void main() {
    float Y = texture(uLumaAcc, uvContent).r;
    vec2 cbcr = (texture(uChromaAcc, uvContent).rg - 0.5) * uChromaGain;
    vec3 rgb = vec3(
        Y + 1.402 * cbcr.y,
        Y - 0.344136 * cbcr.x - 0.714136 * cbcr.y,
        Y + 1.772 * cbcr.x
    );
    outColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
}
`,pt={blockSize:16,searchRange:5,searchStep:2,useResidual:!0,dup:0,colorSpace:`ycbcr`,chromaGain:1,view:`output`},mt=class{constructor(e={}){ze.add(this),E.set(this,!1),D.set(this,!0),Be.set(this,null),Ve.set(this,null),He.set(this,null),Ue.set(this,null),We.set(this,null),Ge.set(this,null),Ke.set(this,null),qe.set(this,0),Je.set(this,0),Ye.set(this,0),Xe.set(this,0),Ze.set(this,0),Qe.set(this,void 0),this.params={...pt,...e},w(this,Qe,this.params.colorSpace,`f`)}setParams(e){Object.assign(this.params,e)}enable(){w(this,E,!0,`f`)}disable(){w(this,E,!1,`f`),w(this,D,!0,`f`)}get enabled(){return T(this,E,`f`)}render(e){T(this,ze,`m`,et).call(this,e);let t=T(this,Be,`f`),n=T(this,Ve,`f`),r=T(this,He,`f`),i=T(this,Ue,`f`),a=T(this,We,`f`),o=T(this,Ge,`f`),s=T(this,Ke,`f`);if(!t||!n||!r||!i||!a||!o||!s)return;this.params.colorSpace!==T(this,Qe,`f`)&&(w(this,Qe,this.params.colorSpace,`f`),w(this,D,!0,`f`));let c=[T(this,qe,`f`),T(this,Je,`f`)];e.blit(e.src,t);let l=this.params.view!==`output`;if((T(this,E,`f`)||l)&&(e.draw({frag:rt,uniforms:{uCur:t,uRef:n,uResolution:c,uBlock:T(this,Ze,`f`),uSearch:this.params.searchRange,uStep:this.params.searchStep},target:r}),e.draw({frag:it,uniforms:{uCur:t,uRef:n,uMV:r,uResolution:c},target:i})),T(this,E,`f`)){let l=T(this,D,`f`)?1:1+this.params.dup,u=[T(this,Ye,`f`),T(this,Xe,`f`)];this.params.colorSpace===`ycbcr`&&e.draw({frag:lt,uniforms:{uCur:t,uRef:n,uMV:r,uChromaRes:u},target:s});for(let n=0;n<l;n++){let l=this.params.useResidual&&n===0;this.params.colorSpace===`ycbcr`?(e.draw({frag:ut,uniforms:{uAccum:a,uMV:r,uVideo:t,uResidual:i,uResolution:c,uIntra:T(this,D,`f`),uUseResidual:l},target:a}),e.draw({frag:dt,uniforms:{uChromaAcc:o,uMV:r,uVideo:t,uResidualC:s,uChromaRes:u,uIntra:T(this,D,`f`),uUseResidual:l},target:o})):e.draw({frag:at,uniforms:{uAccum:a,uMV:r,uVideo:t,uResidual:i,uResolution:c,uIntra:T(this,D,`f`),uUseResidual:l},target:a})}w(this,D,!1,`f`)}else w(this,D,!0,`f`);T(this,ze,`m`,tt).call(this,e,t,n,r,i,a,o),e.blit(e.src,n)}dispose(){T(this,ze,`m`,$e).call(this),w(this,qe,0,`f`),w(this,Je,0,`f`),w(this,Ye,0,`f`),w(this,Xe,0,`f`),w(this,Ze,0,`f`),w(this,D,!0,`f`)}},E=new WeakMap,D=new WeakMap,Be=new WeakMap,Ve=new WeakMap,He=new WeakMap,Ue=new WeakMap,We=new WeakMap,Ge=new WeakMap,Ke=new WeakMap,qe=new WeakMap,Je=new WeakMap,Ye=new WeakMap,Xe=new WeakMap,Ze=new WeakMap,Qe=new WeakMap,ze=new WeakSet,$e=function(){T(this,Be,`f`)?.dispose(),T(this,Ve,`f`)?.dispose(),T(this,He,`f`)?.dispose(),T(this,Ue,`f`)?.dispose(),T(this,We,`f`)?.dispose(),T(this,Ge,`f`)?.dispose(),T(this,Ke,`f`)?.dispose(),w(this,Be,null,`f`),w(this,Ve,null,`f`),w(this,He,null,`f`),w(this,Ue,null,`f`),w(this,We,null,`f`),w(this,Ge,null,`f`),w(this,Ke,null,`f`)},et=function(e){let[t,n]=e.dims.elementPixel,r=Math.max(2,this.params.blockSize);if(T(this,qe,`f`)===t&&T(this,Je,`f`)===n&&T(this,Ze,`f`)===r)return;T(this,ze,`m`,$e).call(this),w(this,qe,t,`f`),w(this,Je,n,`f`),w(this,Ye,Math.ceil(t/2),`f`),w(this,Xe,Math.ceil(n/2),`f`),w(this,Ze,r,`f`),w(this,D,!0,`f`);let i=Math.ceil(t/r),a=Math.ceil(n/r);w(this,Be,e.createRenderTarget({size:[t,n]}),`f`),w(this,Ve,e.createRenderTarget({size:[t,n],persistent:!0}),`f`),w(this,Ue,e.createRenderTarget({size:[t,n],float:!0}),`f`),w(this,We,e.createRenderTarget({size:[t,n],float:!0,persistent:!0}),`f`),w(this,Ge,e.createRenderTarget({size:[T(this,Ye,`f`),T(this,Xe,`f`)],float:!0,persistent:!0}),`f`),w(this,Ke,e.createRenderTarget({size:[T(this,Ye,`f`),T(this,Xe,`f`)],float:!0}),`f`),w(this,He,e.createRenderTarget({size:[i,a],float:!0,filter:`nearest`}),`f`)},tt=function(e,t,n,r,i,a,o){switch(this.params.view){case`motion`:e.draw({frag:ot,uniforms:{uMV:r,uMvScale:this.params.searchRange*this.params.searchStep},target:e.target});return;case`residual`:e.draw({frag:st,uniforms:{uResidual:i},target:e.target});return;case`current`:e.draw({frag:nt,uniforms:{tex:t},target:e.target});return;case`previous`:e.draw({frag:nt,uniforms:{tex:n},target:e.target});return;default:T(this,E,`f`)&&this.params.colorSpace===`ycbcr`?e.draw({frag:ft,uniforms:{uLumaAcc:a,uChromaAcc:o,uChromaGain:this.params.chromaGain},target:e.target}):e.draw({frag:nt,uniforms:{tex:T(this,E,`f`)?a:t},target:e.target})}}})),gt,_t,vt,yt=e((()=>{gt=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform vec4 color1;
uniform vec4 color2;
uniform float speed;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

void main (void) {
    vec4 color = readTex(uvContent);

    float gray = dot(color.rgb, vec3(0.2, 0.7, 0.08));
    float t = mod(gray * 2.0 + time * speed, 2.0);

    if (t < 1.) {
        outColor = mix(color1, color2, fract(t));
    } else {
        outColor = mix(color2, color1, fract(t));
    }

    outColor.a *= color.a;
}
`,_t={color1:[1,0,0,1],color2:[0,0,1,1],speed:.2},vt=class{constructor(e={}){this.params={..._t,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:gt,uniforms:{src:e.src,time:e.time,color1:this.params.color1,color2:this.params.color2,speed:this.params.speed},target:e.target})}}})),O,k,bt,xt,St,Ct,wt,Tt,A,Et,Dt,Ot,kt,At,jt,Mt,Nt,Pt,Ft,It,Lt,Rt,zt,Bt=e((()=>{O=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},k=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},kt=`#version 300 es
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
`,At=`#version 300 es
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
`,jt=`#version 300 es
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
`,Mt=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,Nt=`#version 300 es
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
`,Pt=`#version 300 es
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
`,Ft=`#version 300 es
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
`,It=`#version 300 es
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
`,Lt=`#version 300 es
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
`,Rt={simSize:[256,256],pressureIterations:1,curlStrength:13,velocityDissipation:.6,densityDissipation:.65,splatForce:6e3,splatRadius:.002,dyeSplatRadius:.001,dyeSplatIntensity:.005,showDye:!1},zt=class{constructor(e={}){bt.set(this,null),xt.set(this,null),St.set(this,null),Ct.set(this,null),wt.set(this,null),Tt.set(this,null),A.set(this,null),Et.set(this,null),Dt.set(this,[0,0]),Ot.set(this,!1),this.params={...Rt,...e}}init(e){let t=this.params.simSize,n={size:t,float:!0};O(this,bt,e.createRenderTarget(n),`f`),O(this,xt,e.createRenderTarget(n),`f`),O(this,St,e.createRenderTarget(n),`f`),O(this,Ct,e.createRenderTarget(n),`f`),O(this,wt,e.createRenderTarget(n),`f`),O(this,Tt,e.createRenderTarget(n),`f`),O(this,A,e.createRenderTarget({size:t,float:!0,persistent:!0}),`f`),O(this,Et,e.createRenderTarget({float:!0,persistent:!0}),`f`)}render(e){if(!k(this,bt,`f`)||!k(this,xt,`f`)||!k(this,St,`f`)||!k(this,Ct,`f`)||!k(this,wt,`f`)||!k(this,Tt,`f`)||!k(this,A,`f`)||!k(this,Et,`f`))return;let{simSize:t,pressureIterations:n,curlStrength:r,velocityDissipation:i,densityDissipation:a,splatForce:o,splatRadius:s,dyeSplatRadius:c,dyeSplatIntensity:l,showDye:u}=this.params,d=[1/t[0],1/t[1]],[f,p]=e.dims.elementPixel,m=f/p,h=[e.mouse[0]/f,e.mouse[1]/p],g=k(this,Ot,`f`)?[h[0]-k(this,Dt,`f`)[0],h[1]-k(this,Dt,`f`)[1]]:[0,0];O(this,Dt,h,`f`),O(this,Ot,!0,`f`),e.draw({frag:kt,uniforms:{velocity:k(this,A,`f`),simTexel:d},target:k(this,bt,`f`)}),e.draw({frag:At,uniforms:{velocity:k(this,A,`f`),curl:k(this,bt,`f`),simTexel:d,aspect:m,mouseUv:h,mouseDeltaUv:g,curlStrength:r,splatForce:o,splatRadius:s},target:k(this,xt,`f`)}),e.draw({frag:jt,uniforms:{vortVel:k(this,xt,`f`),simTexel:d},target:k(this,St,`f`)}),e.draw({frag:Mt,target:k(this,Ct,`f`)});let _=k(this,Ct,`f`),v=k(this,wt,`f`);for(let t=0;t<n;t++){e.draw({frag:Nt,uniforms:{pressure:_,divergence:k(this,St,`f`),simTexel:d},target:v});let t=_;_=v,v=t}e.draw({frag:Pt,uniforms:{vortVel:k(this,xt,`f`),pressure:_,simTexel:d},target:k(this,Tt,`f`)}),e.draw({frag:Ft,uniforms:{projVel:k(this,Tt,`f`),simTexel:d,velocityDissipation:i},target:k(this,A,`f`)}),e.draw({frag:It,uniforms:{velocity:k(this,A,`f`),dye:k(this,Et,`f`),time:e.time,aspect:m,mouseUv:h,mouseDeltaUv:g,simSize:t,densityDissipation:a,dyeSplatRadius:c,dyeSplatIntensity:l},target:k(this,Et,`f`)}),e.draw({frag:Lt,uniforms:{src:e.src,dye:k(this,Et,`f`),velocity:k(this,A,`f`),simSize:t,showDye:+!!u,time:e.time},target:e.target})}dispose(){O(this,bt,null,`f`),O(this,xt,null,`f`),O(this,St,null,`f`),O(this,Ct,null,`f`),O(this,wt,null,`f`),O(this,Tt,null,`f`),O(this,A,null,`f`),O(this,Et,null,`f`),O(this,Ot,!1,`f`)}},bt=new WeakMap,xt=new WeakMap,St=new WeakMap,Ct=new WeakMap,wt=new WeakMap,Tt=new WeakMap,A=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap})),Vt,Ht,Ut,Wt=e((()=>{Vt=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform float intensity;

// Sample src at a content-space UV (0..1 over the element), remapped
// into the padded src buffer via srcRectUv.
vec4 sampleSrc(vec2 c) {
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

// Like sampleSrc but transparent outside the content rect (preset autoCrop).
vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return sampleSrc(c);
}

float nn(float y, float t) {
    float n = (
        sin(y * .07 + t * 8. + sin(y * .5 + t * 10.)) +
        sin(y * .7 + t * 2. + sin(y * .3 + t * 8.)) * .7 +
        sin(y * 1.1 + t * 2.8) * .4
    );

    n += sin(y * 124. + t * 100.7) * sin(y * 877. - t * 38.8) * .3;

    return n;
}

void main (void) {
    vec2 uv = uvContent;
    vec4 color = readTex(uv);

    float t = mod(time, 3.14 * 10.);

    // Seed value
    float v = fract(sin(t * 2.) * 700.);

    if (abs(nn(uv.y, t)) < 1.2) {
        v *= 0.01;
    }

    // Prepare for chromatic aberration
    vec2 focus = vec2(0.5);
    float d = v * 0.6 * intensity;
    vec2 ruv = focus + (uv - focus) * (1. - d);
    vec2 guv = focus + (uv - focus) * (1. - 2. * d);
    vec2 buv = focus + (uv - focus) * (1. - 3. * d);

    // Random Glitch
    if (v > 0.1) {
        // Randomize y
        float y = floor(uv.y * 13. * sin(35. * t)) + 1.;
        if (sin(36. * y * v) > 0.9) {
            ruv.x = uv.x + sin(76. * y) * 0.1 * intensity;
            guv.x = uv.x + sin(34. * y) * 0.1 * intensity;
            buv.x = uv.x + sin(59. * y) * 0.1 * intensity;
        }

        // RGB Shift
        v = pow(v * 1.5, 2.) * 0.15 * intensity;
        color.rgb *= 0.3;
        color.r += readTex(vec2(uv.x + sin(t * 123.45) * v, uv.y)).r;
        color.g += readTex(vec2(uv.x + sin(t * 157.67) * v, uv.y)).g;
        color.b += readTex(vec2(uv.x + sin(t * 143.67) * v, uv.y)).b;
    }

    // Compose chromatic aberration
    if (abs(nn(uv.y, t)) > 1.1) {
        color.r = color.r * 0.5 + color.r * sampleSrc(ruv).r;
        color.g = color.g * 0.5 + color.g * sampleSrc(guv).g;
        color.b = color.b * 0.5 + color.b * sampleSrc(buv).b;
        color *= 2.;
    }

    outColor = color;
    outColor.a = smoothstep(0.0, 0.8, max(color.r, max(color.g, color.b)));
}
`,Ht={speed:1,intensity:1},Ut=class{constructor(e={}){this.params={...Ht,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:Vt,uniforms:{src:e.src,time:e.time*this.params.speed,intensity:this.params.intensity},target:e.target})}}})),Gt,Kt,qt,Jt,Yt,Xt=e((()=>{Gt={pure:{cyan:[0,1,1,1],magenta:[1,0,1,1],yellow:[1,1,0,1],black:[0,0,0,1],red:[1,0,0,1],green:[0,1,0,1],blue:[0,0,1,1]},newsprint:{cyan:[.15,.73,.88,1],magenta:[.88,.12,.55,1],yellow:[.97,.93,.08,1],black:[.1,.1,.1,1]},fogra51:{cyan:[0,.525,.765,1],magenta:[.827,0,.486,1],yellow:[.984,.91,0,1],black:[.145,.145,.145,1]},swop:{cyan:[0,.557,.769,1],magenta:[.827,.02,.478,1],yellow:[.984,.902,.027,1],black:[.169,.169,.169,1]}},Kt=`#version 300 es
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
`,qt={...Gt.pure,...Gt.newsprint},Jt={gridSize:10,dotSize:1,smoothing:.15,angle:0,mode:`rgb`,blackAmount:1,trimEdge:!0,background:[0,0,0,0],inkPalette:qt},Yt=class{constructor(e={}){this.params={...Jt,...e,inkPalette:{...qt,...e.inkPalette??{}}}}setParams(e){Object.assign(this.params,e)}setInkPreset(e){Object.assign(this.params.inkPalette,Gt[e])}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params,o=a.inkPalette;e.draw({frag:Kt,uniforms:{src:e.src,srcSizePx:[e.src.width||1,e.src.height||1],elementPx:[r,i],gridSize:Math.max(1,a.gridSize),dotSize:Math.max(0,a.dotSize),smoothing:Math.max(0,Math.min(1,a.smoothing)),angle:a.angle,blackAmount:Math.max(0,Math.min(1,a.blackAmount)),ymck:+(a.mode===`cmyk`),trimEdge:+!!a.trimEdge,background:a.background,cInk:o.cyan,mInk:o.magenta,yInk:o.yellow,kInk:o.black,rInk:o.red,gInk:o.green,bInk:o.blue},target:e.target})}}})),Zt,Qt,$t,en=e((()=>{Zt=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float shift;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hueShift(vec3 rgb, float t) {
    vec3 hsv = rgb2hsv(rgb);
    hsv.x = fract(hsv.x + t);
    return hsv2rgb(hsv);
}

void main (void) {
    vec4 color = readTex(uvContent);
    color.rgb = hueShift(color.rgb, shift);
    outColor = color;
}
`,Qt={shift:.5},$t=class{constructor(e={}){this.params={...Qt,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:Zt,uniforms:{src:e.src,shift:this.params.shift},target:e.target})}}}));function tn(e,t){if(typeof OffscreenCanvas<`u`)return new OffscreenCanvas(e,t);let n=document.createElement(`canvas`);return n.width=e,n.height=t,n}function nn(e){let t=e.getContext(`2d`);if(!t)throw Error(`[VFX-JS] JPEGGlitchEffect: 2D canvas context unavailable`);return t}function rn(e,t){if(typeof OffscreenCanvas<`u`&&e instanceof OffscreenCanvas)return e.convertToBlob({type:`image/jpeg`,quality:t});let n=e;return new Promise((e,r)=>{n.toBlob(t=>t?e(t):r(Error(`[VFX-JS] JPEGGlitchEffect: toBlob failed`)),`image/jpeg`,t)})}function an(e){for(let t=2;t+3<e.length;t++)if(e[t]===255&&e[t+1]===218){let n=e[t+2]<<8|e[t+3];return Math.min(e.length,t+2+n)}return Math.min(e.length,417)}function on(e,t){let n=Math.imul(Math.floor(e*2654435761)|0,2246822519)+Math.imul(t+1,3266489917)>>>0;return()=>{n=n+1831565813>>>0;let e=Math.imul(n^n>>>15,1|n);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function sn(e,t,n,r,i,a,o){switch(e.save(),e.clearRect(0,0,a,o),i){case 90:e.translate(a,0);break;case 180:e.translate(a,o);break;case 270:e.translate(0,o);break}e.rotate(i*Math.PI/180),e.drawImage(t,0,0,n,r),e.restore()}function cn(e,t,n,r){let i=e.length-t-4;if(i<=1)return;let a=Math.max(1,Math.floor(n));for(let n=0;n<a;n++){let o=i/a*n|0,s=i/a*(n+1)|0,c=Math.max(1,s-o),l=Math.min(i,o+(r()*c|0)),u=r()*256|0;e[t+l]=u}}var j,M,N,ln,P,un,dn,fn,pn,mn,hn,gn,_n,vn,F,yn,bn,xn,Sn,Cn,wn,Tn,En,Dn,On,kn,An,I,jn,Mn,Nn,Pn,Fn,In,Ln,Rn,zn,Bn,Vn,Hn,Un=e((()=>{j=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},M=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},zn=`#version 300 es
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
`,Bn=`#version 300 es
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
`,Vn={quality:.4,seed:.25,iterations:24,resolutionScale:1,randomFlip:!0,vertical:!1,speed:0,bypass:!1},Hn=class{get producedFrames(){return j(this,jn,`f`)}constructor(e={}){N.add(this),this.enabled=!0,ln.set(this,!1),P.set(this,null),un.set(this,null),dn.set(this,null),fn.set(this,null),pn.set(this,!1),mn.set(this,null),hn.set(this,null),gn.set(this,null),_n.set(this,null),vn.set(this,null),F.set(this,null),yn.set(this,null),bn.set(this,new Uint8Array),xn.set(this,null),Sn.set(this,0),Cn.set(this,0),wn.set(this,0),Tn.set(this,0),En.set(this,!0),Dn.set(this,!1),On.set(this,-1e9),kn.set(this,0),An.set(this,0),I.set(this,!1),jn.set(this,0),this.params={...Vn,...e}}setParams(e){Object.assign(this.params,e),M(this,En,!0,`f`)}init(e){M(this,ln,typeof createImageBitmap==`function`&&(typeof OffscreenCanvas<`u`||typeof document<`u`),`f`),j(this,ln,`f`)&&(M(this,On,-1e9,`f`),M(this,En,!0,`f`),M(this,hn,tn(1,1),`f`),M(this,gn,nn(j(this,hn,`f`)),`f`),M(this,_n,tn(1,1),`f`),M(this,vn,nn(j(this,_n,`f`)),`f`),M(this,F,tn(1,1),`f`),M(this,yn,nn(j(this,F,`f`)),`f`),M(this,P,e.createRenderTarget({size:[1,1]}),`f`),M(this,dn,e.gl,`f`),j(this,N,`m`,Mn).call(this,e),M(this,mn,e.onContextRestored(()=>{j(this,N,`m`,Mn).call(this,e),M(this,pn,j(this,I,`f`),`f`)}),`f`))}update(){this.enabled===!1&&M(this,I,!1,`f`)}render(e){if(this.params.bypass||!j(this,ln,`f`)||!j(this,P,`f`)){M(this,I,!1,`f`),j(this,N,`m`,Nn).call(this,e);return}let t=e.src.width,n=e.src.height;(t!==j(this,wn,`f`)||n!==j(this,Tn,`f`))&&(M(this,wn,t,`f`),M(this,Tn,n,`f`),M(this,En,!0,`f`));let[r,i]=e.dims.elementPixel,a=Math.min(1,Math.max(0,this.params.resolutionScale)),o=Math.max(1,Math.round(r*a)),s=Math.max(1,Math.round(i*a));r>=2&&i>=2&&t>0&&n>0&&((o!==j(this,Sn,`f`)||s!==j(this,Cn,`f`))&&j(this,N,`m`,Fn).call(this,e,o,s),j(this,N,`m`,Pn).call(this,e)&&j(this,N,`m`,In).call(this,e)),j(this,I,`f`)&&j(this,un,`f`)?(j(this,pn,`f`)&&j(this,N,`m`,Ln).call(this,e),e.draw({frag:Bn,uniforms:{tex:j(this,un,`f`)},target:e.target})):j(this,N,`m`,Nn).call(this,e)}dispose(){var e;j(this,mn,`f`)?.call(this),M(this,mn,null,`f`),j(this,dn,`f`)&&j(this,fn,`f`)&&j(this,dn,`f`).deleteTexture(j(this,fn,`f`)),M(this,fn,null,`f`),M(this,dn,null,`f`),M(this,pn,!1,`f`),j(this,P,`f`)?.dispose(),M(this,P,null,`f`),M(this,un,null,`f`),M(this,hn,null,`f`),M(this,gn,null,`f`),M(this,_n,null,`f`),M(this,vn,null,`f`),M(this,F,null,`f`),M(this,yn,null,`f`),M(this,xn,null,`f`),M(this,bn,new Uint8Array,`f`),M(this,I,!1,`f`),M(this,Dn,!1,`f`),M(this,Sn,0,`f`),M(this,Cn,0,`f`),M(this,kn,(e=j(this,kn,`f`),e++,e),`f`)}},ln=new WeakMap,P=new WeakMap,un=new WeakMap,dn=new WeakMap,fn=new WeakMap,pn=new WeakMap,mn=new WeakMap,hn=new WeakMap,gn=new WeakMap,_n=new WeakMap,vn=new WeakMap,F=new WeakMap,yn=new WeakMap,bn=new WeakMap,xn=new WeakMap,Sn=new WeakMap,Cn=new WeakMap,wn=new WeakMap,Tn=new WeakMap,En=new WeakMap,Dn=new WeakMap,On=new WeakMap,kn=new WeakMap,An=new WeakMap,I=new WeakMap,jn=new WeakMap,N=new WeakSet,Mn=function(e){let t=e.gl,n=t.createTexture();n&&(t.bindTexture(t.TEXTURE_2D,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,0])),t.bindTexture(t.TEXTURE_2D,null),M(this,fn,n,`f`),M(this,un,e.wrapTexture(n,{size:[j(this,Sn,`f`)||1,j(this,Cn,`f`)||1]}),`f`))},Nn=function(e){e.draw({frag:zn,uniforms:{src:e.src},target:e.target})},Pn=function(e){if(j(this,Dn,`f`))return!1;let t=this.params.speed;return t>0?e.time-j(this,On,`f`)>=1/t:j(this,En,`f`)},Fn=function(e,t,n){var r;M(this,Sn,t,`f`),M(this,Cn,n,`f`),M(this,bn,new Uint8Array(t*n*4),`f`),M(this,xn,new ImageData(t,n),`f`),j(this,hn,`f`)&&(j(this,hn,`f`).width=t,j(this,hn,`f`).height=n),j(this,F,`f`)&&(j(this,F,`f`).width=t,j(this,F,`f`).height=n),j(this,P,`f`)?.dispose(),M(this,P,e.createRenderTarget({size:[t,n]}),`f`),M(this,I,!1,`f`),M(this,En,!0,`f`),M(this,Dn,!1,`f`),M(this,pn,!1,`f`),M(this,kn,(r=j(this,kn,`f`),r++,r),`f`)},In=function(e){var t;let n=j(this,Sn,`f`),r=j(this,Cn,`f`),i=j(this,hn,`f`),a=j(this,gn,`f`),o=j(this,_n,`f`),s=j(this,vn,`f`),c=j(this,xn,`f`);if(!i||!a||!o||!s||!c||!j(this,P,`f`))return;e.blit(e.src,j(this,P,`f`));let l=e.gl;l.readPixels(0,0,n,r,l.RGBA,l.UNSIGNED_BYTE,j(this,bn,`f`)),l.bindFramebuffer(l.FRAMEBUFFER,null),M(this,Dn,!0,`f`),M(this,En,!1,`f`),M(this,On,e.time,`f`);let u=c.data,d=n*4;for(let e=0;e<r;e++){let t=(r-1-e)*d;u.set(j(this,bn,`f`).subarray(t,t+d),e*d)}for(let e=3;e<u.length;e+=4)u[e]=255;let f=this.params.speed>0?j(this,An,`f`):0;M(this,An,(t=j(this,An,`f`),t++,t),`f`);let{quality:p,seed:m,iterations:h,randomFlip:g,vertical:_}=this.params,v=on(m,f),ee=g&&v()<.5;a.putImageData(c,0,0);let te=((ee?180:0)+(_?270:0))%360,ne=_,re=ne?r:n,y=ne?n:r;o.width=re,o.height=y,sn(s,i,n,r,te,re,y),j(this,N,`m`,Rn).call(this,o,n,r,p,h,te,v,j(this,kn,`f`))},Ln=function(e){let t=e.gl;!j(this,fn,`f`)||!j(this,F,`f`)||(t.bindTexture(t.TEXTURE_2D,j(this,fn,`f`)),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,j(this,F,`f`)),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,null),M(this,pn,!1,`f`))},Rn=async function(e,t,n,r,i,a,o,s){var c;try{let l=await rn(e,r),u=new Uint8Array(await l.arrayBuffer());cn(u,an(u),i,o);let d=await createImageBitmap(new Blob([u],{type:`image/jpeg`}));if(s===j(this,kn,`f`)&&j(this,yn,`f`)){let e=(360-a)%360;sn(j(this,yn,`f`),d,d.width,d.height,e,t,n),M(this,I,!0,`f`),M(this,jn,(c=j(this,jn,`f`),c++,c),`f`),M(this,pn,!0,`f`)}d.close()}catch{}finally{s===j(this,kn,`f`)&&M(this,Dn,!1,`f`)}}})),Wn,Gn,Kn,qn=e((()=>{Wn=.7,Gn=1.3,Kn=`
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
`}));function Jn(e){let t=Yn(e);return 2**Math.ceil(Math.log2(Math.sqrt(t)))}function Yn(e){return Number.isFinite(e)?Math.max(1,Math.floor(e)):1}function Xn(e){let t=e|0;return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function Zn(e){return Math.min(rr,Math.max(0,e))}var Qn,$n,er,tr,nr,rr,ir=e((()=>{Qn=new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),$n=`
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,er=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,tr=`#version 300 es
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
`,nr=`#version 300 es
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
`,rr=.1})),L,R,z,ar,B,V,H,U,W,or,G,sr,cr,lr,ur,dr,fr,pr,mr,hr,gr,_r,vr,yr,br,xr,Sr,Cr,wr,Tr,Er,K,Dr,Or,kr,Ar,jr,Mr,Nr,Pr,Fr,Ir,Lr,Rr,zr,Br,Vr,Hr=e((()=>{qn(),ir(),L=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},R=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},K=64,Dr=K*K,Or=.1,kr=[K,K],Ar=new Float32Array(Dr);for(let e=0;e<Dr;e++)Ar[e]=e;jr=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, 2.0);
}
`,Mr=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0);
}
`,Nr=`#version 300 es
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
`,Pr=`#version 300 es
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
`,Fr=`#version 300 es
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
${Kn}

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
`,Ir=`#version 300 es
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
`,Lr=`#version 300 es
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
`,Rr=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;

uniform sampler2D src;
uniform vec3 color;
uniform float colorMix;
uniform vec2 lifeJitterRange;
${$n}

void main() {
    vec4 c = texture(src, clamp(vSpawn.yz, 0.0, 1.0));
    float h = hash21(vSpawn.yz + vec2(vSpawn.x) * 1.7);
    float lifeJitter = mix(lifeJitterRange.x, lifeJitterRange.y, h);
    outColor = vec4(mix(c.rgb, color, colorMix), lifeJitter);
}
`,zr=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;
void main() {
    float theta = vSpawn.w;
    vec2 dir = theta >= 0.0 ? vec2(cos(theta), sin(theta)) : vec2(0.0);
    outColor = vec4(dir, 0.0, 0.0);
}
`,Br={count:1024*1024,birthRate:3e4,screenBirthRate:1e4,life:1,noiseSpeed:.3,emitSpeed:1,noiseDelay:.15,noiseScale:1,noiseAnimation:.3,pointSize:10,alpha:1,radius:300,speedDecay:1,alphaDecay:5,fadeIn:.05,alphaThreshold:.05,spawnOnIdle:!0,srcOpacity:0,trailFade:.75,fog:.5,color:16777215,colorMix:0,blend:`add`},Vr=class{get params(){return L(this,ar,`f`)}constructor(e={}){z.add(this),ar.set(this,void 0),B.set(this,null),V.set(this,null),H.set(this,null),U.set(this,null),W.set(this,null),or.set(this,!1),G.set(this,void 0),sr.set(this,void 0),cr.set(this,new Float32Array(Dr*4)),lr.set(this,null),ur.set(this,null),dr.set(this,null),fr.set(this,null),pr.set(this,null),mr.set(this,null),hr.set(this,0),gr.set(this,0),_r.set(this,0),vr.set(this,null),yr.set(this,-1/0),R(this,ar,{...Br,...e},`f`),L(this,ar,`f`).count=Yn(L(this,ar,`f`).count),R(this,G,Jn(L(this,ar,`f`).count),`f`),R(this,sr,L(this,G,`f`)*L(this,G,`f`),`f`)}get maxCount(){return L(this,sr,`f`)}setParam(e){let t=L(this,ar,`f`);for(let[n,r]of Object.entries(e))r!==void 0&&(t[n]=n===`count`?Yn(r):r)}init(e){L(this,z,`m`,br).call(this,e),R(this,U,e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),`f`),R(this,W,e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),`f`),R(this,fr,{attributes:{position:Qn}},`f`),R(this,dr,{mode:`points`,attributes:{position:{data:Ar,itemSize:1}}},`f`),R(this,pr,e.gl,`f`),L(this,z,`m`,Cr).call(this,e),R(this,mr,e.onContextRestored(()=>{R(this,pr,e.gl,`f`),L(this,z,`m`,Cr).call(this,e),R(this,or,!1,`f`)}),`f`)}render(e){if(!L(this,B,`f`)||!L(this,V,`f`)||!L(this,H,`f`)||!L(this,U,`f`)||!L(this,W,`f`)||!L(this,fr,`f`)||!L(this,dr,`f`)||!L(this,ur,`f`)||!L(this,lr,`f`))return;let t=Jn(this.params.count);t!==L(this,G,`f`)&&(L(this,z,`m`,xr).call(this),R(this,G,t,`f`),R(this,sr,t*t,`f`),L(this,z,`m`,br).call(this,e),R(this,hr,0,`f`),R(this,or,!1,`f`)),L(this,or,`f`)||(e.draw({frag:jr,target:L(this,B,`f`)}),e.draw({frag:Mr,target:L(this,V,`f`)}),e.draw({frag:Mr,target:L(this,H,`f`)}),R(this,or,!0,`f`));let n=Zn(e.deltaTime),r=[e.dims.elementPixel[0],e.dims.elementPixel[1]],i=[L(this,G,`f`),L(this,G,`f`)],a=L(this,z,`m`,Tr).call(this,e,n,r);a>0&&L(this,z,`m`,wr).call(this,e);let o=a===0;if(e.draw({frag:Fr,uniforms:{posTex:L(this,B,`f`),colorTex:L(this,V,`f`),velTex:L(this,H,`f`),elementPixel:r,time:e.time,dt:n,noiseSpeed:this.params.noiseSpeed,emitSpeed:this.params.emitSpeed,noiseDelay:this.params.noiseDelay,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,life:this.params.life},target:L(this,B,`f`),swap:o}),a>0){let t={uSpawnTex:L(this,ur,`f`),uSpawnTexSize:kr,uSpawnCount:a,stateSize:i};e.draw({vert:Ir,frag:Lr,geometry:L(this,dr,`f`),uniforms:{...t,src:e.src,alphaThreshold:this.params.alphaThreshold},target:L(this,B,`f`),blend:`none`}),e.draw({vert:Ir,frag:Rr,geometry:L(this,dr,`f`),uniforms:{...t,src:e.src,color:Xn(this.params.color),colorMix:this.params.colorMix,lifeJitterRange:[Wn,Gn]},target:L(this,V,`f`),blend:`none`}),e.draw({vert:Ir,frag:zr,geometry:L(this,dr,`f`),uniforms:t,target:L(this,H,`f`),blend:`none`})}let s=L(this,z,`m`,Er).call(this);L(this,fr,`f`).instanceCount=s,e.draw({frag:er,target:L(this,U,`f`)}),e.draw({vert:Nr,frag:tr,uniforms:{posTex:L(this,B,`f`),colorTex:L(this,V,`f`),stateSize:i,pointSize:this.params.pointSize,elementPixel:r,particleCount:s,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fadeIn:this.params.fadeIn,fog:this.params.fog},geometry:L(this,fr,`f`),target:L(this,U,`f`),blend:this.params.blend===`normal`?`premultiplied`:`additive`}),e.draw({frag:nr,uniforms:{trailPrev:L(this,W,`f`),particleStamp:L(this,U,`f`),trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:L(this,W,`f`)}),e.draw({frag:Pr,uniforms:{src:e.src,trail:L(this,W,`f`),srcOpacity:this.params.srcOpacity},target:e.target})}dispose(){L(this,mr,`f`)?.call(this),R(this,mr,null,`f`),L(this,pr,`f`)&&L(this,lr,`f`)&&L(this,pr,`f`).deleteTexture(L(this,lr,`f`)),R(this,lr,null,`f`),R(this,ur,null,`f`),R(this,dr,null,`f`),R(this,pr,null,`f`),L(this,z,`m`,xr).call(this),L(this,U,`f`)?.dispose(),L(this,W,`f`)?.dispose(),R(this,U,null,`f`),R(this,W,null,`f`),R(this,fr,null,`f`),R(this,or,!1,`f`)}outputRect(e){return e.canvasRect}},ar=new WeakMap,B=new WeakMap,V=new WeakMap,H=new WeakMap,U=new WeakMap,W=new WeakMap,or=new WeakMap,G=new WeakMap,sr=new WeakMap,cr=new WeakMap,lr=new WeakMap,ur=new WeakMap,dr=new WeakMap,fr=new WeakMap,pr=new WeakMap,mr=new WeakMap,hr=new WeakMap,gr=new WeakMap,_r=new WeakMap,vr=new WeakMap,yr=new WeakMap,z=new WeakSet,br=function(e){let t={size:[L(this,G,`f`),L(this,G,`f`)],float:!0,wrap:`clamp`,filter:`nearest`};R(this,B,e.createRenderTarget({...t,persistent:!0}),`f`),R(this,V,e.createRenderTarget(t),`f`),R(this,H,e.createRenderTarget(t),`f`)},xr=function(){L(this,B,`f`)?.dispose(),L(this,V,`f`)?.dispose(),L(this,H,`f`)?.dispose(),R(this,B,null,`f`),R(this,V,null,`f`),R(this,H,null,`f`)},Sr=function(e){let t=e.gl,n=t.createTexture();if(!n)throw Error(`[ParticleEffect] Failed to create spawn texture`);return t.bindTexture(t.TEXTURE_2D,n),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,K,K,0,t.RGBA,t.FLOAT,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.bindTexture(t.TEXTURE_2D,null),{raw:n,handle:e.wrapTexture(n,{size:[K,K],filter:`nearest`,wrap:`clamp`})}},Cr=function(e){let t=L(this,z,`m`,Sr).call(this,e);R(this,lr,t.raw,`f`),R(this,ur,t.handle,`f`)},wr=function(e){if(!L(this,lr,`f`))return;let t=e.gl;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,L(this,lr,`f`)),t.texSubImage2D(t.TEXTURE_2D,0,0,0,K,K,t.RGBA,t.FLOAT,L(this,cr,`f`)),t.bindTexture(t.TEXTURE_2D,null)},Tr=function(e,t,n){let r=[e.mouse[0]/Math.max(1,n[0]),e.mouse[1]/Math.max(1,n[1])];(!L(this,vr,`f`)||Math.abs(r[0]-L(this,vr,`f`)[0])>1e-6||Math.abs(r[1]-L(this,vr,`f`)[1])>1e-6)&&R(this,yr,e.time,`f`),R(this,vr,r,`f`);let i=e.intersection>0,a=e.time-L(this,yr,`f`)<Or;i&&(a||this.params.spawnOnIdle)?R(this,gr,Math.min(L(this,gr,`f`)+this.params.birthRate*t,Dr),`f`):R(this,gr,0,`f`),i?R(this,_r,Math.min(L(this,_r,`f`)+this.params.screenBirthRate*t,Dr),`f`):R(this,_r,0,`f`);let o=Math.min(Dr,Math.floor(L(this,gr,`f`))),s=Math.min(Dr-o,Math.floor(L(this,_r,`f`)));R(this,gr,L(this,gr,`f`)-o,`f`),R(this,_r,L(this,_r,`f`)-s,`f`);let c=o+s;if(c===0)return 0;let l=L(this,z,`m`,Er).call(this),u=Math.max(1,n[0]),d=Math.max(1,n[1]),f=L(this,cr,`f`),p=0;for(;p<o;p++){let e=Math.sqrt(Math.random())*this.params.radius,t=Math.random()*Math.PI*2,n=Math.cos(t)*e,i=Math.sin(t)*e,a=p*4;f[a+0]=L(this,hr,`f`),f[a+1]=r[0]+n/u,f[a+2]=r[1]+i/d,f[a+3]=t,R(this,hr,(L(this,hr,`f`)+1)%l,`f`)}for(let e=0;e<s;e++,p++){let e=p*4;f[e+0]=L(this,hr,`f`),f[e+1]=Math.random(),f[e+2]=Math.random(),f[e+3]=-1,R(this,hr,(L(this,hr,`f`)+1)%l,`f`)}return c},Er=function(){return Math.max(1,Math.min(L(this,sr,`f`),Math.floor(this.params.count)))}})),q,J,Ur,Wr,Gr,Kr,Y,X,qr,Z,Jr,Yr,Xr,Zr,Qr,$r,ei,ti,ni,ri,ii,ai,oi,si,ci,li=e((()=>{qn(),ir(),q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},J=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ri=`#version 300 es
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
${$n}
${Kn}

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
        ${Wn.toFixed(4)},
        ${Gn.toFixed(4)},
        hash21(uv * 91.7 + 1.234)
    );
    age += dt / max(duration * lifespanScale, 1e-3);

    outColor = vec4(pos, age);
}
`,ii=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 stateSize;
uniform float count;
uniform vec3 color;
uniform float colorMix;
${$n}

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
`,oi=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trail;

void main() {
    outColor = texture(trail, uv);
}
`,si={count:1e5,duration:1,noiseSpeed:1.5,noiseScale:1,noiseAnimation:1,outwardBias:1,pointSize:3,alpha:1,alphaDecay:5,speedDecay:2,fog:0,trailFade:.5,color:16777215,colorMix:0,blend:`add`},ci=class{get params(){return q(this,Wr,`f`)}constructor(e={}){Ur.add(this),Wr.set(this,void 0),Gr.set(this,null),Kr.set(this,null),Y.set(this,null),X.set(this,null),qr.set(this,null),Z.set(this,void 0),Jr.set(this,!1),Yr.set(this,!1),Xr.set(this,-1),Zr.set(this,0),Qr.set(this,0),J(this,Wr,{...si,...e},`f`),q(this,Wr,`f`).count=Yn(q(this,Wr,`f`).count);let t=Jn(q(this,Wr,`f`).count);J(this,Z,[t,t],`f`)}trigger(){J(this,Jr,!0,`f`),J(this,Yr,!0,`f`),J(this,Xr,-1,`f`),J(this,Zr,0,`f`),J(this,Qr,0,`f`)}reset(){J(this,Jr,!1,`f`),J(this,Yr,!1,`f`),J(this,Xr,-1,`f`),J(this,Zr,0,`f`),J(this,Qr,0,`f`)}isDone(){return!q(this,Jr,`f`)||q(this,Zr,`f`)<this.params.duration?!1:q(this,Qr,`f`)>=q(this,Ur,`m`,$r).call(this)}init(e){q(this,Ur,`m`,ei).call(this,e),J(this,Y,e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),`f`),J(this,X,e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),`f`),J(this,qr,{attributes:{position:Qn}},`f`)}render(e){var t;if(!q(this,Gr,`f`)||!q(this,Kr,`f`)||!q(this,Y,`f`)||!q(this,X,`f`)||!q(this,qr,`f`)||e.intersection<=0)return;let n=Jn(this.params.count),r=!q(this,Jr,`f`)||this.isDone();if(n!==q(this,Z,`f`)[0]&&r&&(q(this,Ur,`m`,ti).call(this),J(this,Z,[n,n],`f`),q(this,Ur,`m`,ei).call(this,e)),!q(this,Jr,`f`)){e.blit(e.src,e.target);return}q(this,Xr,`f`)<0&&J(this,Xr,e.time,`f`);let i=e.time-q(this,Xr,`f`);J(this,Zr,i,`f`);let a=i>=this.params.duration;if(a&&q(this,Qr,`f`)>=q(this,Ur,`m`,$r).call(this)){e.draw({frag:er,target:e.target});return}let o=Zn(e.deltaTime),s=[e.dims.elementPixel[0],e.dims.elementPixel[1]];if(a)e.draw({frag:er,target:q(this,Y,`f`)}),J(this,Qr,(t=q(this,Qr,`f`),t++,t),`f`);else{let t=+!!q(this,Yr,`f`);J(this,Yr,!1,`f`);let n=q(this,Ur,`m`,ni).call(this);e.draw({frag:ri,uniforms:{posTex:q(this,Gr,`f`),stateSize:q(this,Z,`f`),elementPixel:s,time:e.time,dt:o,noiseSpeed:this.params.noiseSpeed,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,outwardBias:this.params.outwardBias,duration:this.params.duration,count:n,uBurst:t},target:q(this,Gr,`f`)}),t===1&&(e.draw({frag:ii,uniforms:{src:e.src,stateSize:q(this,Z,`f`),count:n,color:Xn(this.params.color),colorMix:this.params.colorMix},target:q(this,Kr,`f`)}),e.draw({frag:er,target:q(this,X,`f`)})),q(this,qr,`f`).instanceCount=n,e.draw({frag:er,target:q(this,Y,`f`)}),e.draw({vert:ai,frag:tr,uniforms:{posTex:q(this,Gr,`f`),colorTex:q(this,Kr,`f`),stateSize:q(this,Z,`f`),pointSize:this.params.pointSize,elementPixel:s,particleCount:n,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fog:this.params.fog},geometry:q(this,qr,`f`),target:q(this,Y,`f`),blend:this.params.blend===`normal`?`premultiplied`:`additive`})}e.draw({frag:nr,uniforms:{trailPrev:q(this,X,`f`),particleStamp:q(this,Y,`f`),trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:q(this,X,`f`)}),e.draw({frag:oi,uniforms:{trail:q(this,X,`f`)},target:e.target})}dispose(){q(this,Ur,`m`,ti).call(this),q(this,Y,`f`)?.dispose(),q(this,X,`f`)?.dispose(),J(this,Y,null,`f`),J(this,X,null,`f`),J(this,qr,null,`f`)}outputRect(e){return e.canvasRect}},Wr=new WeakMap,Gr=new WeakMap,Kr=new WeakMap,Y=new WeakMap,X=new WeakMap,qr=new WeakMap,Z=new WeakMap,Jr=new WeakMap,Yr=new WeakMap,Xr=new WeakMap,Zr=new WeakMap,Qr=new WeakMap,Ur=new WeakSet,$r=function(){let e=this.params.trailFade;return e<=0?1:e>=.999?600:Math.ceil(-Math.log(255)/Math.log(e))},ei=function(e){let t={size:q(this,Z,`f`),float:!0,wrap:`clamp`,filter:`nearest`};J(this,Gr,e.createRenderTarget({...t,persistent:!0}),`f`),J(this,Kr,e.createRenderTarget(t),`f`)},ti=function(){q(this,Gr,`f`)?.dispose(),q(this,Kr,`f`)?.dispose(),J(this,Gr,null,`f`),J(this,Kr,null,`f`)},ni=function(){let e=q(this,Z,`f`)[0]*q(this,Z,`f`)[1];return Math.max(1,Math.min(e,Math.floor(this.params.count)))}})),ui,di,fi,pi=e((()=>{ui=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 cellUv;

void main() {
    vec4 c = vec4(0.0);
    if (uvContent.x >= 0.0 && uvContent.x <= 1.0 &&
        uvContent.y >= 0.0 && uvContent.y <= 1.0) {
        // Snap to cell centers in dst inner UV, then remap into src
        // inner region via srcRectUv so sampling is correct whether
        // src is capture or a prior stage's padded intermediate.
        vec2 cell = (floor(uvContent / cellUv) + 0.5) * cellUv;
        vec2 uv = srcRectUv.xy + clamp(cell, 0.0, 1.0) * srcRectUv.zw;
        c = texture(src, uv);
    }
    outColor = c;
}
`,di={size:10},fi=class{constructor(e={}){this.params={...di,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element,{size:r}=this.params;e.draw({frag:ui,uniforms:{src:e.src,cellUv:[r/(t||1),r/(n||1)]},target:e.target})}}})),Q,$,mi,hi,gi,_i,vi,yi,bi,xi,Si,Ci,wi,Ti,Ei,Di,Oi,ki,Ai,ji,Mi,Ni,Pi,Fi,Ii,Li,Ri,zi=e((()=>{Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},$=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Oi=`
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
`,ki=`
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
`,Ai=`#version 300 es
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
${Oi}
${ki}
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
`,ji=`#version 300 es
precision highp float;
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
${Oi}
${ki}
void main() {
    // Crisp source edge at full output resolution. The lenient low-res run
    // membership lets sorted content spill up to a cell into the padding;
    // clip it back to the exact rotated rect here so the boundary is sharp
    // and never reveals the padding, independent of sortRes.
    if (masked == 1) {
        vec2 sp = boxToSrc(uvSrc * boxSize - boxSize * 0.5, imgSize, rot);
        if (sp.x < 0.0 || sp.x > imgSize.x || sp.y < 0.0 || sp.y > imgSize.y) {
            outColor = vec4(0.0);
            return;
        }
    }
    int lowA = axis == 0 ? int(uvSrc.x * lowSize.x) : int(uvSrc.y * lowSize.y);
    int b    = axis == 0 ? int(uvSrc.y * lowSize.y) : int(uvSrc.x * lowSize.x);
    int L    = int(axis == 0 ? lowSize.x : lowSize.y);
    ivec2 lowP = toXY(lowA, b, axis);
    float myKey = key(texelFetch(src, lowP, 0).rgb, keyMode);
    if (!runActive(src, lowA, b, axis, keyMode, threshold, thresholdHigh, masked, lowSize, boxSize, imgSize, rot)) {
        // padding / out-of-band pixels skip the low-res buffer entirely.
        vec4 c = texture(srcHi, uvSrc);
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
                vec4 c = texture(srcHi, uvSrc);
                outColor = vec4(c.rgb * c.a, c.a);
            } else {
                vec4 c = texelFetch(src, toXY(i, b, axis), 0);
                outColor = vec4(c.rgb * c.a, c.a);
            }
            return;
        }
    }
    vec4 c = texture(srcHi, uvSrc);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,Mi=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    vec4 c = texture(src, uvSrc);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,Ni=`#version 300 es
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
`,Pi=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 srcSize;
uniform vec2 boxSize;
uniform vec2 rot;
void main() {
    vec2 dSrc = uvContent * srcSize - srcSize * 0.5;
    vec2 dBox = vec2(
        rot.x * dSrc.x - rot.y * dSrc.y,
        rot.y * dSrc.x + rot.x * dSrc.y
    );
    vec2 uvB = (dBox + boxSize * 0.5) / boxSize;
    outColor = texture(src, uvB);
}
`,Fi={right:{axis:0,direction:0},left:{axis:0,direction:1},down:{axis:1,direction:1},up:{axis:1,direction:0}},Ii={luminance:0,r:1,g:2,b:3,hue:4,saturation:5},Li={range:[0,1],sortRes:128,key:`luminance`,direction:`up`,angle:0,bypass:!1},Ri=class{constructor(e={}){mi.add(this),hi.set(this,null),gi.set(this,null),_i.set(this,null),vi.set(this,null),yi.set(this,0),bi.set(this,0),xi.set(this,0),Si.set(this,0),Ci.set(this,0),wi.set(this,0),Ti.set(this,0),this.params={...Li,...e},this.params.range=[...this.params.range]}setParams(e){Object.assign(this.params,e),e.range&&(this.params.range=[...e.range])}render(e){if(Q(this,mi,`m`,Di).call(this,e),this.params.bypass||!Q(this,hi,`f`)||!Q(this,gi,`f`)){e.draw({frag:Mi,uniforms:{src:e.src},target:e.target});return}let{axis:t,direction:n}=Fi[this.params.direction],r=[Q(this,wi,`f`),Q(this,Ti,`f`)],[i,a]=this.params.range,o=Ii[this.params.key],[s,c]=e.dims.elementPixel,l=Q(this,_i,`f`),u=Q(this,vi,`f`),d=this.params.angle!==0&&l!==null&&u!==null,f=e.src,p=e.src,m=e.target,h=[1,0],g=[s,c];if(d){let t=-this.params.angle*Math.PI/180;h=[Math.cos(t),Math.sin(t)],g=[Q(this,Si,`f`),Q(this,Ci,`f`)],e.draw({frag:Ni,uniforms:{src:e.src,srcSize:[s,c],boxSize:g,rot:h},target:l}),f=l,p=l,m=u}e.blit(f,Q(this,hi,`f`));let _=+!!d,v=[s,c];e.draw({frag:Ai,uniforms:{src:Q(this,hi,`f`),srcSize:r,threshold:i,thresholdHigh:a,keyMode:o,direction:n,axis:t,masked:_,boxSize:g,imgSize:v,rot:h},target:Q(this,gi,`f`)}),e.draw({frag:ji,uniforms:{src:Q(this,hi,`f`),srcHi:p,rankTex:Q(this,gi,`f`),lowSize:r,threshold:i,thresholdHigh:a,keyMode:o,axis:t,masked:_,boxSize:g,imgSize:v,rot:h},target:m}),d&&e.draw({frag:Pi,uniforms:{src:u,srcSize:[s,c],boxSize:g,rot:h},target:e.target})}dispose(){Q(this,mi,`m`,Ei).call(this),$(this,yi,0,`f`),$(this,bi,0,`f`),$(this,xi,0,`f`),$(this,Si,0,`f`),$(this,Ci,0,`f`),$(this,wi,0,`f`),$(this,Ti,0,`f`)}},hi=new WeakMap,gi=new WeakMap,_i=new WeakMap,vi=new WeakMap,yi=new WeakMap,bi=new WeakMap,xi=new WeakMap,Si=new WeakMap,Ci=new WeakMap,wi=new WeakMap,Ti=new WeakMap,mi=new WeakSet,Ei=function(){Q(this,hi,`f`)?.dispose(),Q(this,gi,`f`)?.dispose(),Q(this,_i,`f`)?.dispose(),Q(this,vi,`f`)?.dispose(),$(this,hi,null,`f`),$(this,gi,null,`f`),$(this,_i,null,`f`),$(this,vi,null,`f`)},Di=function(e){let[t,n]=e.dims.elementPixel,{axis:r}=Fi[this.params.direction],{angle:i}=this.params,a=this.params.sortRes,o=t,s=n;if(i!==0){let e=i*Math.PI/180,r=Math.abs(Math.cos(e)),a=Math.abs(Math.sin(e));o=Math.ceil(t*r+n*a),s=Math.ceil(t*a+n*r)}let c=r===0?Math.max(1,Math.round(a*o/t)):Math.max(1,Math.round(a*s/n)),l=r===0?c:o,u=r===0?s:c;Q(this,yi,`f`)===t&&Q(this,bi,`f`)===n&&Q(this,xi,`f`)===i&&Q(this,wi,`f`)===l&&Q(this,Ti,`f`)===u||(Q(this,mi,`m`,Ei).call(this),$(this,yi,t,`f`),$(this,bi,n,`f`),$(this,xi,i,`f`),$(this,Si,o,`f`),$(this,Ci,s,`f`),$(this,wi,l,`f`),$(this,Ti,u,`f`),$(this,hi,e.createRenderTarget({size:[l,u],filter:`nearest`}),`f`),$(this,gi,e.createRenderTarget({size:[l,u],filter:`nearest`,float:!0}),`f`),i!==0&&($(this,_i,e.createRenderTarget({size:[o,s]}),`f`),$(this,vi,e.createRenderTarget({size:[o,s]}),`f`)))}})),Bi,Vi,Hi,Ui=e((()=>{Bi=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform float aspect;
uniform float frequency;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hueShift(vec3 rgb, float t) {
    vec3 hsv = rgb2hsv(rgb);
    hsv.x = fract(hsv.x + t);
    return hsv2rgb(hsv);
}

void main() {
    vec2 uv = uvContent;
    vec2 uv2 = uv;
    uv2.x *= aspect;

    float x = (uv2.x - uv2.y) * frequency - fract(time);

    vec4 img = readTex(uv);
    float gray = length(img.rgb);

    img.rgb = vec3(hueShift(vec3(1, 0, 0), x) * gray);

    outColor = img;
}
`,Vi={speed:1,frequency:1},Hi=class{constructor(e={}){this.params={...Vi,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:Bi,uniforms:{src:e.src,time:e.time*this.params.speed,aspect:(t||1)/(n||1),frequency:this.params.frequency},target:e.target})}}})),Wi,Gi,Ki,qi=e((()=>{Wi=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform float amount;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

float random(vec2 st) {
    return fract(sin(dot(st, vec2(948.,824.))) * 30284.);
}

void main (void) {
    vec2 uv = uvContent;
    vec2 uvr = uv, uvg = uv, uvb = uv;

    float tt = mod(time, 17.);

    if (fract(tt * 0.73) > .8 || fract(tt * 0.91) > .8) {
        float t = floor(tt * 11.);

        float n = random(vec2(t, floor(uv.y * 17.7)));
        if (n > .7) {
            uvr.x += random(vec2(t, 1.)) * (amount * 2.0) - amount;
            uvg.x += random(vec2(t, 2.)) * (amount * 2.0) - amount;
            uvb.x += random(vec2(t, 3.)) * (amount * 2.0) - amount;
        }

        float ny = random(vec2(t * 17. + floor(uv * 19.7)));
        if (ny > .7) {
            uvr.x += random(vec2(t, 4.)) * (amount * 2.0) - amount;
            uvg.x += random(vec2(t, 5.)) * (amount * 2.0) - amount;
            uvb.x += random(vec2(t, 6.)) * (amount * 2.0) - amount;
        }
    }

    vec4 cr = readTex(uvr);
    vec4 cg = readTex(uvg);
    vec4 cb = readTex(uvb);

    outColor = vec4(
        cr.r,
        cg.g,
        cb.b,
        step(.1, cr.a + cg.a + cb.a)
    );
}
`,Gi={speed:1,amount:.05},Ki=class{constructor(e={}){this.params={...Gi,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:Wi,uniforms:{src:e.src,time:e.time*this.params.speed,amount:this.params.amount},target:e.target})}}})),Ji,Yi,Xi,Zi=e((()=>{Ji=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform float amp;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

float nn(float y, float t) {
    float n = (
        sin(y * .07 + t * 8. + sin(y * .5 + t * 10.)) +
        sin(y * .7 + t * 2. + sin(y * .3 + t * 8.)) * .7 +
        sin(y * 1.1 + t * 2.8) * .4
    );

    n += sin(y * 124. + t * 100.7) * sin(y * 877. - t * 38.8) * .3;

    return n;
}

void main (void) {
    vec2 uv = uvContent;
    vec2 uvr = uv, uvg = uv, uvb = uv;

    float t = mod(time, 30.);

    if (abs(nn(uv.y, t)) > 1.) {
        uvr.x += nn(uv.y, t) * amp;
        uvg.x += nn(uv.y, t + 10.) * amp;
        uvb.x += nn(uv.y, t + 20.) * amp;
    }

    vec4 cr = readTex(uvr);
    vec4 cg = readTex(uvg);
    vec4 cb = readTex(uvb);

    outColor = vec4(
        cr.r,
        cg.g,
        cb.b,
        smoothstep(.0, 1., cr.a + cg.a + cb.a)
    );
}
`,Yi={speed:1,amount:10},Xi=class{constructor(e={}){this.params={...Yi,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=e.dims.element[0]||1;e.draw({frag:Ji,uniforms:{src:e.src,time:e.time*this.params.speed,amp:this.params.amount/t},target:e.target})}}})),Qi,$i,ea,ta=e((()=>{Qi=`#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform float innerHeight;
uniform float spacing;

void main() {
    vec4 c = vec4(0.0);
    if (uvContent.x >= 0.0 && uvContent.x <= 1.0 &&
        uvContent.y >= 0.0 && uvContent.y <= 1.0) {
        // Keep one 1-px line per spacing-px band; rest goes black.
        float yPx = uvContent.y * innerHeight;
        if (mod(floor(yPx), spacing) < 1.0) {
            c = texture(src, uvSrc);
        }
    }
    outColor = c;
}
`,$i={spacing:4},ea=class{constructor(e={}){this.params={...$i,...e}}setParams(e){Object.assign(this.params,e)}render(e){let{spacing:t}=this.params;e.draw({frag:Qi,uniforms:{src:e.src,innerHeight:e.dims.element[1]||1,spacing:t},target:e.target})}}})),na,ra,ia,aa=e((()=>{na=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform float amp;
uniform float frequency;
uniform float blurDx;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

vec4 draw(vec2 uv) {
    vec2 uvr = uv, uvg = uv, uvb = uv;

    uvr.x += sin(uv.y * frequency + time * 3.) * amp;
    uvg.x += sin(uv.y * frequency + time * 3. + .4) * amp;
    uvb.x += sin(uv.y * frequency + time * 3. + .8) * amp;

    vec4 cr = readTex(uvr);
    vec4 cg = readTex(uvg);
    vec4 cb = readTex(uvb);

    return vec4(
        cr.r,
        cg.g,
        cb.b,
        cr.a + cg.a + cb.a
    );
}

void main (void) {
    vec2 uv = uvContent;

    // x blur (blurDx == 0 collapses the 3 taps back to a single sample)
    vec2 dx = vec2(blurDx, 0.0);
    outColor = (draw(uv) * 2. + draw(uv + dx) + draw(uv - dx)) / 4.;
}
`,ra={speed:1,amount:20,frequency:7,blur:2},ia=class{constructor(e={}){this.params={...ra,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=e.dims.element[0]||1;e.draw({frag:na,uniforms:{src:e.src,time:e.time*this.params.speed,amp:this.params.amount/t,frequency:this.params.frequency,blurDx:this.params.blur/t},target:e.target})}}})),oa,sa,ca,la=e((()=>{oa=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform vec4 color1;
uniform vec4 color2;
uniform vec4 color3;
uniform float speed;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

void main (void) {
    vec4 color = readTex(uvContent);

    float gray = dot(color.rgb, vec3(0.2, 0.7, 0.08));
    float t = mod(gray * 3.0 + time * speed, 3.0);

    if (t < 1.) {
        outColor = mix(color1, color2, fract(t));
    } else if (t < 2.) {
        outColor = mix(color2, color3, fract(t));
    } else {
        outColor = mix(color3, color1, fract(t));
    }

    outColor.a *= color.a;
}
`,sa={color1:[1,0,0,1],color2:[0,1,0,1],color3:[0,0,1,1],speed:.2},ca=class{constructor(e={}){this.params={...sa,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:oa,uniforms:{src:e.src,time:e.time,color1:this.params.color1,color2:this.params.color2,color3:this.params.color3,speed:this.params.speed},target:e.target})}}})),ua,da,fa,pa=e((()=>{ua=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float aspect;
uniform float intensity;
uniform float radius;
uniform float power;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

void main() {
    vec2 uv = uvContent;
    outColor = readTex(uv);

    vec2 p = uv * 2.0 - 1.0;
    p.x *= aspect;

    float l = max(length(p) - radius, 0.);
    outColor *= 1. - pow(l, power) * intensity;
}
`,da={intensity:.5,radius:1,power:2},fa=class{constructor(e={}){this.params={...da,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:ua,uniforms:{src:e.src,aspect:(t||1)/(n||1),intensity:this.params.intensity,radius:this.params.radius,power:this.params.power},target:e.target})}}}));function ma(e){let t=e.startsWith(`#`)?e.slice(1):e;return(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``)),t.length===6&&(t+=`ff`),t.length===8?[Number.parseInt(t.slice(0,2),16)/255,Number.parseInt(t.slice(2,4),16)/255,Number.parseInt(t.slice(4,6),16)/255,Number.parseInt(t.slice(6,8),16)/255]:[0,0,0,0]}var ha,ga,_a,va=e((()=>{ha=`#version 300 es
precision highp float;

in vec2 uvContent;
out vec4 outColor;

uniform sampler2D src;
// Auto-uploaded by the host; we redo the content→src remap manually
// because we sample at a UV scaled around the site.
uniform vec4 srcRectUv;
uniform vec2 mouseUv;
uniform vec2 elementPx;
uniform float cellSize;
uniform float pressRadius;
uniform float press;
uniform float seed;
uniform float flatCells;
uniform float time;
uniform float speed;
uniform float breatheSpeed;
uniform float breathe;
uniform float breatheScale;
uniform vec4 bgColor;

vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

// 3D simplex noise (Ashima Arts / Ian McEwan, MIT)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
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

    i = mod289(i);
    vec4 p = permute(
        permute(
            permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0)
        )
        + i.x + vec4(0.0, i1.x, i2.x, 1.0)
    );

    float n_ = 0.142857142857;
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

    vec4 norm = taylorInvSqrt(vec4(
        dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)
    ));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(
        dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)
    ), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(
        dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)
    ));
}

vec2 jitterFor(vec2 cell) {
    vec2 base = hash22(cell + vec2(seed));
    if (speed > 0.0) {
        // Amplitude capped at 0.25 so sites stay inside the 3×3
        // search neighbourhood as they orbit.
        vec2 phase = hash22(cell + vec2(seed + 100.0)) * 6.2831853;
        base += 0.25 * vec2(
            sin(time * speed + phase.x),
            cos(time * speed + phase.y)
        );
    }
    return base;
}

void main() {
    vec2 contentPx = uvContent * elementPx;
    vec2 p = contentPx / cellSize;
    vec2 ipart = floor(p);
    vec2 fpart = fract(p);

    // Get grid-cell info for 9 neighbors
    vec2 sites[9];
    vec2 nearestSite = vec2(0.0);
    vec2 nearestG = vec2(0.0);
    float minDistSq = 1e9;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(i, j);
            vec2 site = g + jitterFor(ipart + g);
            sites[(j + 1) * 3 + (i + 1)] = site;
            float d = dot(site - fpart, site - fpart);
            if (d < minDistSq) {
                minDistSq = d;
                nearestSite = site;
                nearestG = g;
            }
        }
    }
    vec2 ownerCell = ipart + nearestG;

    // Mouse falloff + per-cell breathe noise → total shrink.
    vec2 siteWorldPx = (ipart + nearestSite) * cellSize;
    vec2 mousePx = mouseUv * elementPx;
    float falloff = smoothstep(pressRadius, 0.,
                               distance(siteWorldPx, mousePx));

    float noiseShrink = 0.0;
    if (breathe > 0.0) {
        vec3 noisePos = vec3(
            ownerCell * cellSize / breatheScale + vec2(seed + 200.0),
            time * breatheSpeed
        );
        noiseShrink = breathe * max(0.0, snoise(noisePos));
    }
    float shrink = noiseShrink + press * falloff;

    // Distance to original cell edge (for stable AA), and to the
    // edge of the cell scaled uniformly around its site by
    // (1 - shrink) — per-neighbour offset preserves polygon shape.
    float minEdgeOrig = 1e9;
    float minEdgeShrunk = 1e9;
    for (int k = 0; k < 9; k++) {
        vec2 site = sites[k];
        vec2 d = site - nearestSite;
        float dlen2 = dot(d, d);
        if (dlen2 > 1e-4) {
            float dlen = sqrt(dlen2);
            float t = dot((site + nearestSite) * 0.5 - fpart, d / dlen);
            minEdgeOrig = min(minEdgeOrig, t);
            minEdgeShrunk = min(minEdgeShrunk, t - dlen * 0.5 * shrink);
        }
    }
    float edgePx = minEdgeOrig * cellSize;
    float wallDist = minEdgeShrunk * cellSize;

    // Scale UV around the site
    float cellScale = max(0.001, 1.0 - shrink);
    vec2 siteUvContent = siteWorldPx / elementPx;
    vec2 scaledUvContent =
        siteUvContent + (uvContent - siteUvContent) / cellScale;
    vec2 sampleContent = mix(scaledUvContent, siteUvContent, flatCells);
    vec4 base = texture(src, srcRectUv.xy + sampleContent * srcRectUv.zw);

    // fwidth on edgePx, not wallDist: shrink jumps at cell seams and
    // would spike fwidth there, leaking src through 1 px of bgColor.
    float aa = fwidth(edgePx);
    float visibleMask = smoothstep(-aa, 0.0, wallDist);

    outColor = mix(bgColor, base, visibleMask);
}
`,ga={cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`},_a=class{constructor(e={}){this.params={...ga,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params;e.draw({frag:ha,uniforms:{src:e.src,mouseUv:[e.mouse[0]/r,e.mouse[1]/i],elementPx:[r,i],cellSize:a.cellSize,pressRadius:a.pressRadius,press:a.press,flatCells:+!!a.flatCells,seed:a.seed,time:e.time,speed:Math.max(0,a.speed),breathe:Math.max(0,a.breathe),breatheSpeed:Math.max(0,a.breatheSpeed),breatheScale:Math.max(1,a.breatheScale),bgColor:ma(a.bgColor)},target:e.target})}}})),ya=e((()=>{se(),be(),Pe(),Re(),ht(),yt(),Bt(),Wt(),Xt(),en(),Un(),Hr(),li(),pi(),zi(),Ui(),qi(),Zi(),ta(),aa(),la(),pa(),va()}));export{ye as C,Ne as S,Ut as _,ia as a,mt as b,Ki as c,fi as d,ci as f,Yt as g,$t as h,ca as i,Hi as l,Hn as m,_a as n,ea as o,Vr as p,fa as r,Xi as s,ya as t,Ri as u,zt as v,oe as w,Le as x,vt as y};