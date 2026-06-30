import{n as e}from"./chunk-BneVvdWh.js";function t(e){return Array.isArray(e)?[...e]:Array.from(e)}function n(e){return typeof e==`number`?[e,e]:e}async function r(e,t){let n=typeof document<`u`?document.fonts:void 0;if(n?.load)try{await n.load(`${t} ${y}px ${e}`),await n.ready}catch{}}function i(e,t,n,r){let i=Math.max(1,e.length),a=Math.ceil(Math.sqrt(i)),o=Math.ceil(i/a),s=`${n} ${y}px ${t}`,c=document.createElement(`canvas`),l;if(r&&r>0)l=Math.max(1,Math.round(r*y));else{let t=c.getContext(`2d`);if(l=y,t){t.font=s;let n=0;for(let r of e)n=Math.max(n,t.measureText(r).width);n>0&&(l=Math.max(1,Math.ceil(n)))}}c.width=a*l,c.height=o*y;let u=c.getContext(`2d`);if(u){u.clearRect(0,0,c.width,c.height),u.fillStyle=`#fff`,u.textAlign=`center`,u.textBaseline=`middle`,u.font=s;for(let t=0;t<e.length;t++){let n=t%a,r=Math.floor(t/a),i=n*l+l/2,o=r*y+y/2;u.save(),u.beginPath(),u.rect(n*l,r*y,l,y),u.clip(),u.fillText(e[t],i,o),u.restore()}}return{canvas:c,cols:a,rows:o,cellW:l,cellH:y}}function a(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement)return[e.naturalWidth||e.width,e.naturalHeight||e.height];let t=e;return[t.width||1,t.height||1]}async function o(e){if(typeof e!=`string`)return e;let t=new Image;t.crossOrigin=`anonymous`,t.src=e;try{await t.decode()}catch{}return t}function s(e){let t=Math.max(1,e.length),n=Math.ceil(Math.sqrt(t)),r=Math.ceil(t/n),i=e.map(a),[o,s]=i[0]??[1,1],c=o/Math.max(1,s),l=Math.max(1,...i.map(e=>e[1])),u=Math.min(ae,Math.max(8,Math.round(l))),d=Math.max(1,Math.round(u*c)),f=Math.min(1,ie/(n*d),ie/(r*u));d=Math.max(1,Math.floor(d*f)),u=Math.max(1,Math.floor(u*f));let p=document.createElement(`canvas`);p.width=n*d,p.height=r*u;let m=p.getContext(`2d`);if(m){m.clearRect(0,0,p.width,p.height);for(let t=0;t<e.length;t++){let[r,a]=i[t],o=Math.min(d/r,u/a),s=r*o,c=a*o,l=t%n*d+(d-s)/2,f=Math.floor(t/n)*u+(u-c)/2;m.drawImage(e[t],l,f,s,c)}}return{canvas:p,cols:n,rows:r,cellW:d,cellH:u}}var c,l,u,d,f,p,m,h,g,_,v,ee,te,ne,re,y,ie,ae,oe,se=e((()=>{c=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},l=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},te={standard:` .:-=+*#%@`,minimal:` .#`,blocks:` ░▒▓█`,dots:` .·•●`,circles:` ◌○◉●`,detailed:` .'\`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$`},ne=`#version 300 es
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
`,re={grid:12,preset:`standard`,font:`monospace`,fontWeight:`normal`,color:[1,1,1,1],background:[0,0,0,0],colorFromSource:!1,invert:!1,dither:0},y=64,ie=2048,ae=256,oe=class{constructor(e={}){u.add(this),d.set(this,null),f.set(this,1),p.set(this,1),m.set(this,1),h.set(this,1),g.set(this,[1,1]),_.set(this,!1),v.set(this,null),this.params={...re,...e}}setParams(e){Object.assign(this.params,e)}async init(e){typeof document>`u`||(c(this,v,e,`f`),await l(this,u,`m`,ee).call(this,e))}async updateAtlas(){l(this,v,`f`)&&await l(this,u,`m`,ee).call(this,l(this,v,`f`))}render(e){if(!l(this,d,`f`))return;let[t,r]=e.dims.elementPixel,[i,a]=n(this.params.grid),o=[Math.max(1,i)*e.pixelRatio,Math.max(1,a)*e.pixelRatio];e.draw({frag:ne,uniforms:{src:e.src,atlas:l(this,d,`f`),elementPx:[Math.max(1,t),Math.max(1,r)],cellPx:o,cols:l(this,f,`f`),rows:l(this,p,`f`),charCount:l(this,m,`f`),glyphAspect:l(this,h,`f`),atlasCellPx:l(this,g,`f`),tileColor:+!!l(this,_,`f`),color:this.params.color,background:this.params.background,colorFromSource:+!!this.params.colorFromSource,invert:+!!this.params.invert,dither:Math.min(1,Math.max(0,this.params.dither))},target:e.target})}dispose(){l(this,d,`f`)?.dispose(),c(this,d,null,`f`),c(this,v,null,`f`)}},d=new WeakMap,f=new WeakMap,p=new WeakMap,m=new WeakMap,h=new WeakMap,g=new WeakMap,_=new WeakMap,v=new WeakMap,u=new WeakSet,ee=async function(e){let n=this.params.tiles,a;if(n&&n.length>0){let e=await Promise.all(n.map(o));c(this,m,e.length,`f`),c(this,_,!0,`f`),a=s(e)}else{n&&n.length===0&&console.warn("[VFX-JS] AsciiEffect: `tiles` is empty; falling back to characters.");let e=t(this.params.chars??te[this.params.preset]);e.length===0&&console.warn(`[VFX-JS] AsciiEffect: empty character ramp; nothing will be rendered.`),c(this,m,Math.max(1,e.length),`f`),c(this,_,!1,`f`),await r(this.params.font,this.params.fontWeight),a=i(e,this.params.font,this.params.fontWeight,this.params.charAspect)}let u=l(this,d,`f`);c(this,f,a.cols,`f`),c(this,p,a.rows,`f`),c(this,h,a.cellW/a.cellH,`f`),c(this,g,[a.cellW,a.cellH],`f`),c(this,d,e.wrapTexture(a.canvas,{autoUpdate:!1,filter:`linear`}),`f`),u?.dispose()}})),ce,le,ue,de,fe,pe,me,he,ge,_e,ve,ye,be=e((()=>{ce=`#version 300 es
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
`,Ie={intensity:.3,radius:0,power:2},Le=class{constructor(e={}){this.params={...Ie,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:Fe,uniforms:{src:e.src,aspect:(t||1)/(n||1),intensity:this.params.intensity,radius:this.params.radius,power:this.params.power},target:e.target})}}}));function ze(e){let t=e.startsWith(`#`)?e.slice(1):e;return(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``)),t.length===6&&(t+=`ff`),t.length===8?[Number.parseInt(t.slice(0,2),16)/255,Number.parseInt(t.slice(2,4),16)/255,Number.parseInt(t.slice(4,6),16)/255,Number.parseInt(t.slice(6,8),16)/255]:[0,0,0,0]}var Be,Ve=e((()=>{Be=`
mat2 rot2d(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}
`})),He,Ue,We,Ge=e((()=>{Ve(),He=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 resolution;
uniform float threshold;
uniform float thickness;
uniform float intensity;
uniform float opacity;
uniform vec4 color1;
uniform vec4 color2;
uniform vec4 background;

vec3 sampleSrc(vec2 uv) {
    return texture(src, srcRectUv.xy + uv * srcRectUv.zw).rgb;
}

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main(void) {
    vec2 d = thickness / resolution;
    // Sobel gradient on luminance.
    float tl = lum(sampleSrc(uvContent + vec2(-d.x, d.y)));
    float tc = lum(sampleSrc(uvContent + vec2(0.0, d.y)));
    float tr = lum(sampleSrc(uvContent + vec2(d.x, d.y)));
    float ml = lum(sampleSrc(uvContent + vec2(-d.x, 0.0)));
    float mr = lum(sampleSrc(uvContent + vec2(d.x, 0.0)));
    float bl = lum(sampleSrc(uvContent + vec2(-d.x, -d.y)));
    float bc = lum(sampleSrc(uvContent + vec2(0.0, -d.y)));
    float br = lum(sampleSrc(uvContent + vec2(d.x, -d.y)));

    float gx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
    float gy = (tl + 2.0 * tc + tr) - (bl + 2.0 * bc + br);
    float g = length(vec2(gx, gy));

    float e = clamp(g * intensity - threshold, 0.0, 1.0);
    vec3 edgeCol = mix(color1.rgb, color2.rgb, clamp(g, 0.0, 1.0));
    vec3 base = mix(background.rgb, edgeCol, e);

    // Opacity blends the untouched source back in over the edge render.
    vec3 orig = sampleSrc(uvContent);
    outColor = vec4(mix(base, orig, opacity), 1.0);
}
`,Ue={threshold:.2,thickness:3,intensity:4,opacity:0,color1:`#ff0000`,color2:`#0000ff`,background:`#000000`},We=class{constructor(e={}){this.params={...Ue,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.elementPixel;e.draw({frag:He,uniforms:{src:e.src,resolution:[Math.max(1,n),Math.max(1,r)],threshold:t.threshold,thickness:Math.max(.5,t.thickness),intensity:Math.max(0,t.intensity),opacity:Math.min(1,Math.max(0,t.opacity)),color1:ze(t.color1),color2:ze(t.color2),background:ze(t.background)},target:e.target})}}})),w,T,Ke,E,D,qe,Je,Ye,Xe,Ze,Qe,$e,et,tt,nt,rt,it,at,ot,st,ct,lt,ut,dt,ft,pt,mt,ht,gt,_t,vt,yt,bt,xt,St=e((()=>{w=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},T=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},lt=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D tex;
void main() {
    vec4 c = texture(tex, uvContent);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,ut=`#version 300 es
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
`,dt=`#version 300 es
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
`,ft=`#version 300 es
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
`,pt=`#version 300 es
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
`,mt=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D uResidual;
void main() {
    vec3 r = texture(uResidual, uvContent).rgb;
    outColor = vec4(clamp(r * 0.5 + 0.5, 0.0, 1.0), 1.0);
}
`,ht=`
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 chroma(vec3 c) {
    return vec2(dot(c, vec3(-0.168736, -0.331264, 0.5)),
                dot(c, vec3(0.5, -0.418688, -0.081312))) + 0.5;
}
`,gt=`#version 300 es
precision highp float;
${ht}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uCur, uRef, uMV;
uniform vec2 uChromaRes;
void main() {
    vec2 mvc = floor(texture(uMV, uv).rg * 0.5);
    vec2 pred = chroma(texture(uRef, uv + mvc / uChromaRes).rgb);
    outColor = vec4(chroma(texture(uCur, uv).rgb) - pred, 0.0, 1.0);
}
`,_t=`#version 300 es
precision highp float;
${ht}
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
`,vt=`#version 300 es
precision highp float;
${ht}
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
`,yt=`#version 300 es
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
`,bt={blockSize:16,searchRange:5,searchStep:2,useResidual:!0,dup:0,colorSpace:`ycbcr`,chromaGain:1,view:`output`},xt=class{constructor(e={}){Ke.add(this),E.set(this,!1),D.set(this,!0),qe.set(this,null),Je.set(this,null),Ye.set(this,null),Xe.set(this,null),Ze.set(this,null),Qe.set(this,null),$e.set(this,null),et.set(this,0),tt.set(this,0),nt.set(this,0),rt.set(this,0),it.set(this,0),at.set(this,void 0),this.params={...bt,...e},w(this,at,this.params.colorSpace,`f`)}setParams(e){Object.assign(this.params,e)}enable(){w(this,E,!0,`f`)}disable(){w(this,E,!1,`f`),w(this,D,!0,`f`)}get enabled(){return T(this,E,`f`)}render(e){T(this,Ke,`m`,st).call(this,e);let t=T(this,qe,`f`),n=T(this,Je,`f`),r=T(this,Ye,`f`),i=T(this,Xe,`f`),a=T(this,Ze,`f`),o=T(this,Qe,`f`),s=T(this,$e,`f`);if(!t||!n||!r||!i||!a||!o||!s)return;this.params.colorSpace!==T(this,at,`f`)&&(w(this,at,this.params.colorSpace,`f`),w(this,D,!0,`f`));let c=[T(this,et,`f`),T(this,tt,`f`)];e.blit(e.src,t);let l=this.params.view!==`output`;if((T(this,E,`f`)||l)&&(e.draw({frag:ut,uniforms:{uCur:t,uRef:n,uResolution:c,uBlock:T(this,it,`f`),uSearch:this.params.searchRange,uStep:this.params.searchStep},target:r}),e.draw({frag:dt,uniforms:{uCur:t,uRef:n,uMV:r,uResolution:c},target:i})),T(this,E,`f`)){let l=T(this,D,`f`)?1:1+this.params.dup,u=[T(this,nt,`f`),T(this,rt,`f`)];this.params.colorSpace===`ycbcr`&&e.draw({frag:gt,uniforms:{uCur:t,uRef:n,uMV:r,uChromaRes:u},target:s});for(let n=0;n<l;n++){let l=this.params.useResidual&&n===0;this.params.colorSpace===`ycbcr`?(e.draw({frag:_t,uniforms:{uAccum:a,uMV:r,uVideo:t,uResidual:i,uResolution:c,uIntra:T(this,D,`f`),uUseResidual:l},target:a}),e.draw({frag:vt,uniforms:{uChromaAcc:o,uMV:r,uVideo:t,uResidualC:s,uChromaRes:u,uIntra:T(this,D,`f`),uUseResidual:l},target:o})):e.draw({frag:ft,uniforms:{uAccum:a,uMV:r,uVideo:t,uResidual:i,uResolution:c,uIntra:T(this,D,`f`),uUseResidual:l},target:a})}w(this,D,!1,`f`)}else w(this,D,!0,`f`);T(this,Ke,`m`,ct).call(this,e,t,n,r,i,a,o),e.blit(e.src,n)}dispose(){T(this,Ke,`m`,ot).call(this),w(this,et,0,`f`),w(this,tt,0,`f`),w(this,nt,0,`f`),w(this,rt,0,`f`),w(this,it,0,`f`),w(this,D,!0,`f`)}},E=new WeakMap,D=new WeakMap,qe=new WeakMap,Je=new WeakMap,Ye=new WeakMap,Xe=new WeakMap,Ze=new WeakMap,Qe=new WeakMap,$e=new WeakMap,et=new WeakMap,tt=new WeakMap,nt=new WeakMap,rt=new WeakMap,it=new WeakMap,at=new WeakMap,Ke=new WeakSet,ot=function(){T(this,qe,`f`)?.dispose(),T(this,Je,`f`)?.dispose(),T(this,Ye,`f`)?.dispose(),T(this,Xe,`f`)?.dispose(),T(this,Ze,`f`)?.dispose(),T(this,Qe,`f`)?.dispose(),T(this,$e,`f`)?.dispose(),w(this,qe,null,`f`),w(this,Je,null,`f`),w(this,Ye,null,`f`),w(this,Xe,null,`f`),w(this,Ze,null,`f`),w(this,Qe,null,`f`),w(this,$e,null,`f`)},st=function(e){let[t,n]=e.dims.elementPixel,r=Math.max(2,this.params.blockSize);if(T(this,et,`f`)===t&&T(this,tt,`f`)===n&&T(this,it,`f`)===r)return;T(this,Ke,`m`,ot).call(this),w(this,et,t,`f`),w(this,tt,n,`f`),w(this,nt,Math.ceil(t/2),`f`),w(this,rt,Math.ceil(n/2),`f`),w(this,it,r,`f`),w(this,D,!0,`f`);let i=Math.ceil(t/r),a=Math.ceil(n/r);w(this,qe,e.createRenderTarget({size:[t,n]}),`f`),w(this,Je,e.createRenderTarget({size:[t,n],persistent:!0}),`f`),w(this,Xe,e.createRenderTarget({size:[t,n],float:!0}),`f`),w(this,Ze,e.createRenderTarget({size:[t,n],float:!0,persistent:!0}),`f`),w(this,Qe,e.createRenderTarget({size:[T(this,nt,`f`),T(this,rt,`f`)],float:!0,persistent:!0}),`f`),w(this,$e,e.createRenderTarget({size:[T(this,nt,`f`),T(this,rt,`f`)],float:!0}),`f`),w(this,Ye,e.createRenderTarget({size:[i,a],float:!0,filter:`nearest`}),`f`)},ct=function(e,t,n,r,i,a,o){switch(this.params.view){case`motion`:e.draw({frag:pt,uniforms:{uMV:r,uMvScale:this.params.searchRange*this.params.searchStep},target:e.target});return;case`residual`:e.draw({frag:mt,uniforms:{uResidual:i},target:e.target});return;case`current`:e.draw({frag:lt,uniforms:{tex:t},target:e.target});return;case`previous`:e.draw({frag:lt,uniforms:{tex:n},target:e.target});return;default:T(this,E,`f`)&&this.params.colorSpace===`ycbcr`?e.draw({frag:yt,uniforms:{uLumaAcc:a,uChromaAcc:o,uChromaGain:this.params.chromaGain},target:e.target}):e.draw({frag:lt,uniforms:{tex:T(this,E,`f`)?a:t},target:e.target})}}})),Ct,wt,Tt,Et,Dt=e((()=>{Ve(),Ct=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 resolution;
uniform int style;
uniform float size;
uniform float levels;
uniform float brightness;
uniform float contrast;
uniform float mono;
uniform vec4 monoColor;

// Recursive Bayer ordered-dither thresholds, in [0, 1).
float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
}
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
float bayer16(vec2 a) { return bayer8(0.5 * a) * 0.25 + bayer2(a); }

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float threshold(vec2 cell) {
    if (style == 0) return bayer2(cell);
    if (style == 1) return bayer4(cell);
    if (style == 2) return bayer8(cell);
    if (style == 3) return bayer16(cell);
    // Blue noise: approximated by a per-cell hash (not a true blue spectrum).
    if (style == 4) return hash12(cell);
    return 0.5; // Threshold: no pattern, hard quantization.
}

void main(void) {
    float cellSize = max(1.0, size);
    // Content origin in fragment px (constant across the element). Bucketing
    // on the integer fragment grid keeps cells square; anchoring to this
    // origin (not raw gl_FragCoord) ties the pattern to the src rect, not
    // the screen.
    vec2 originPx = floor(gl_FragCoord.xy - uvContent * resolution + 0.5);
    // Pixel position measured from the src-rect center.
    vec2 centerPx = gl_FragCoord.xy - originPx - 0.5 * resolution;
    vec2 cell = floor(centerPx / cellSize);
    // Sample once per cell so each cell is a single flat color.
    vec2 cellUv = ((cell + 0.5) * cellSize) / resolution + 0.5;
    vec4 tex = texture(src, srcRectUv.xy + cellUv * srcRectUv.zw);
    vec3 c = tex.rgb;
    c = (c - 0.5) * contrast + 0.5;
    c *= brightness;

    float th = threshold(cell);
    float steps = max(1.0, levels - 1.0);

    if (mono > 0.5) {
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        float q = clamp(floor(l * steps + th) / steps, 0.0, 1.0);
        outColor = vec4(monoColor.rgb * q, tex.a * monoColor.a);
    } else {
        vec3 q = clamp(floor(c * steps + th) / steps, 0.0, 1.0);
        outColor = vec4(q, tex.a);
    }
}
`,wt={bayer2:0,bayer4:1,bayer8:2,bayer16:3,blueNoise:4,threshold:5},Tt={style:`bayer16`,size:2,levels:3,brightness:1,contrast:1,mono:!1,monoColor:`#ffffff`},Et=class{constructor(e={}){this.params={...Tt,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.elementPixel;e.draw({frag:Ct,uniforms:{src:e.src,resolution:[Math.max(1,n),Math.max(1,r)],style:wt[t.style]??5,size:Math.max(1,t.size),levels:Math.max(2,t.levels),brightness:t.brightness,contrast:t.contrast,mono:+!!t.mono,monoColor:ze(t.monoColor)},target:e.target})}}})),Ot,kt,At,jt=e((()=>{Ot=`#version 300 es
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
`,kt={color1:[1,0,0,1],color2:[0,0,1,1],speed:.2},At=class{constructor(e={}){this.params={...kt,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:Ot,uniforms:{src:e.src,time:e.time,color1:this.params.color1,color2:this.params.color2,speed:this.params.speed},target:e.target})}}})),O,k,Mt,Nt,Pt,Ft,It,Lt,A,Rt,zt,Bt,Vt,Ht,Ut,Wt,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt=e((()=>{O=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},k=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Vt=`#version 300 es
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
`,Ht=`#version 300 es
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
`,Ut=`#version 300 es
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
`,Wt=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,Gt=`#version 300 es
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
`,Kt=`#version 300 es
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
`,qt=`#version 300 es
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
`,Jt=`#version 300 es
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
`,Yt=`#version 300 es
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
`,Xt={simSize:[256,256],pressureIterations:1,curlStrength:13,velocityDissipation:.6,densityDissipation:.65,splatForce:6e3,splatRadius:.002,dyeSplatRadius:.001,dyeSplatIntensity:.005,showDye:!1},Zt=class{constructor(e={}){Mt.set(this,null),Nt.set(this,null),Pt.set(this,null),Ft.set(this,null),It.set(this,null),Lt.set(this,null),A.set(this,null),Rt.set(this,null),zt.set(this,[0,0]),Bt.set(this,!1),this.params={...Xt,...e}}init(e){let t=this.params.simSize,n={size:t,float:!0};O(this,Mt,e.createRenderTarget(n),`f`),O(this,Nt,e.createRenderTarget(n),`f`),O(this,Pt,e.createRenderTarget(n),`f`),O(this,Ft,e.createRenderTarget(n),`f`),O(this,It,e.createRenderTarget(n),`f`),O(this,Lt,e.createRenderTarget(n),`f`),O(this,A,e.createRenderTarget({size:t,float:!0,persistent:!0}),`f`),O(this,Rt,e.createRenderTarget({float:!0,persistent:!0}),`f`)}render(e){if(!k(this,Mt,`f`)||!k(this,Nt,`f`)||!k(this,Pt,`f`)||!k(this,Ft,`f`)||!k(this,It,`f`)||!k(this,Lt,`f`)||!k(this,A,`f`)||!k(this,Rt,`f`))return;let{simSize:t,pressureIterations:n,curlStrength:r,velocityDissipation:i,densityDissipation:a,splatForce:o,splatRadius:s,dyeSplatRadius:c,dyeSplatIntensity:l,showDye:u}=this.params,d=[1/t[0],1/t[1]],[f,p]=e.dims.elementPixel,m=f/p,h=[e.mouse[0]/f,e.mouse[1]/p],g=k(this,Bt,`f`)?[h[0]-k(this,zt,`f`)[0],h[1]-k(this,zt,`f`)[1]]:[0,0];O(this,zt,h,`f`),O(this,Bt,!0,`f`),e.draw({frag:Vt,uniforms:{velocity:k(this,A,`f`),simTexel:d},target:k(this,Mt,`f`)}),e.draw({frag:Ht,uniforms:{velocity:k(this,A,`f`),curl:k(this,Mt,`f`),simTexel:d,aspect:m,mouseUv:h,mouseDeltaUv:g,curlStrength:r,splatForce:o,splatRadius:s},target:k(this,Nt,`f`)}),e.draw({frag:Ut,uniforms:{vortVel:k(this,Nt,`f`),simTexel:d},target:k(this,Pt,`f`)}),e.draw({frag:Wt,target:k(this,Ft,`f`)});let _=k(this,Ft,`f`),v=k(this,It,`f`);for(let t=0;t<n;t++){e.draw({frag:Gt,uniforms:{pressure:_,divergence:k(this,Pt,`f`),simTexel:d},target:v});let t=_;_=v,v=t}e.draw({frag:Kt,uniforms:{vortVel:k(this,Nt,`f`),pressure:_,simTexel:d},target:k(this,Lt,`f`)}),e.draw({frag:qt,uniforms:{projVel:k(this,Lt,`f`),simTexel:d,velocityDissipation:i},target:k(this,A,`f`)}),e.draw({frag:Jt,uniforms:{velocity:k(this,A,`f`),dye:k(this,Rt,`f`),time:e.time,aspect:m,mouseUv:h,mouseDeltaUv:g,simSize:t,densityDissipation:a,dyeSplatRadius:c,dyeSplatIntensity:l},target:k(this,Rt,`f`)}),e.draw({frag:Yt,uniforms:{src:e.src,dye:k(this,Rt,`f`),velocity:k(this,A,`f`),simSize:t,showDye:+!!u,time:e.time},target:e.target})}dispose(){O(this,Mt,null,`f`),O(this,Nt,null,`f`),O(this,Pt,null,`f`),O(this,Ft,null,`f`),O(this,It,null,`f`),O(this,Lt,null,`f`),O(this,A,null,`f`),O(this,Rt,null,`f`),O(this,Bt,!1,`f`)}},Mt=new WeakMap,Nt=new WeakMap,Pt=new WeakMap,Ft=new WeakMap,It=new WeakMap,Lt=new WeakMap,A=new WeakMap,Rt=new WeakMap,zt=new WeakMap,Bt=new WeakMap})),$t,en,tn,nn=e((()=>{$t=`#version 300 es
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
`,en={speed:1,intensity:1},tn=class{constructor(e={}){this.params={...en,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:$t,uniforms:{src:e.src,time:e.time*this.params.speed,intensity:this.params.intensity},target:e.target})}}})),rn,an,on,sn,cn,ln,un=e((()=>{Ve(),rn=8,an=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec3 colors[${rn}];
uniform int colorCount;
uniform float scatter;
uniform float offset;
uniform int repeatType;
uniform float frequency;
uniform int mixSpace;
uniform float time;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec3 srgb2lin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
// Clamp first: OKLab interpolation can leave the gamut, and pow() of a
// negative value is NaN (renders as garbage/magenta).
vec3 lin2srgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }

vec3 lin2oklab(vec3 c) {
    float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
    vec3 lms = pow(max(vec3(l, m, s), 0.0), vec3(1.0 / 3.0));
    return vec3(
        0.2104542553 * lms.x + 0.7936177850 * lms.y - 0.0040720468 * lms.z,
        1.9779984951 * lms.x - 2.4285922050 * lms.y + 0.4505937099 * lms.z,
        0.0259040371 * lms.x + 0.7827717662 * lms.y - 0.8086757660 * lms.z
    );
}
vec3 oklab2lin(vec3 lab) {
    float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
    vec3 lms = vec3(l_, m_, s_);
    lms = lms * lms * lms;
    return vec3(
        4.0767416621 * lms.x - 3.3077115913 * lms.y + 0.2309699292 * lms.z,
        -1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
        -0.0041960863 * lms.x - 0.7034186147 * lms.y + 1.7076147010 * lms.z
    );
}

// Interpolate two sRGB colors in the selected space, returning sRGB.
vec3 mixColor(vec3 a, vec3 b, float t) {
    if (mixSpace == 1) {
        return lin2srgb(mix(srgb2lin(a), srgb2lin(b), t));
    } else if (mixSpace == 2) {
        vec3 oa = lin2oklab(srgb2lin(a));
        vec3 ob = lin2oklab(srgb2lin(b));
        return lin2srgb(oklab2lin(mix(oa, ob, t)));
    }
    return mix(a, b, t);
}

// Fold t into [0, 1] per the repeat mode (none = clamp).
float applyRepeat(float t) {
    if (repeatType == 1) return fract(t);
    if (repeatType == 2) return 1.0 - abs(1.0 - fract(t * 0.5) * 2.0);
    return clamp(t, 0.0, 1.0);
}

vec3 sampleGradient(float t) {
    float f = t * float(colorCount - 1);
    int i = int(floor(f));
    i = clamp(i, 0, colorCount - 2);
    float frac = clamp(f - float(i), 0.0, 1.0);
    return clamp(mixColor(colors[i], colors[i + 1], frac), 0.0, 1.0);
}

void main(void) {
    vec4 tex = texture(src, srcRectUv.xy + uvContent * srcRectUv.zw);
    float l = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    // Hash in pixel space (gl_FragCoord); hash12 degenerates on tiny
    // [0,1] uv inputs.
    l += scatter * (hash12(gl_FragCoord.xy) - 0.5);

    // offset (and time drift) advance one full cycle per unit, so a 0->1
    // offset sweep runs (frequency) cycles.
    float t = applyRepeat((l + offset + time) * frequency);
    // Premultiply: the final blit is premultiplied, so non-zero rgb in
    // transparent areas would add to the background as stray color.
    outColor = vec4(sampleGradient(t) * tex.a, tex.a);
}
`,on={none:0,repeat:1,mirror:2},sn={srgb:0,linear:1,oklab:2},cn={colors:[`#bbee00`,`#3aa0ff`,`#000000`],scatter:0,offset:0,repeat:`mirror`,frequency:1,mixSpace:`srgb`,speed:0},ln=class{constructor(e={}){this.params={...cn,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,n=t.colors.length>=2?t.colors:cn.colors,r=Math.min(rn,n.length),i=new Float32Array(rn*3);for(let e=0;e<rn;e++){let[t,a,o]=ze(n[Math.min(e,r-1)]);i[e*3]=t,i[e*3+1]=a,i[e*3+2]=o}e.draw({frag:an,uniforms:{src:e.src,colors:i,colorCount:r,scatter:Math.max(0,t.scatter),offset:t.offset,repeatType:on[t.repeat]??0,frequency:t.frequency,mixSpace:sn[t.mixSpace]??0,time:e.time*t.speed},target:e.target})}}})),dn,fn,pn,mn,hn,gn=e((()=>{dn={pure:{cyan:[0,1,1,1],magenta:[1,0,1,1],yellow:[1,1,0,1],black:[0,0,0,1],red:[1,0,0,1],green:[0,1,0,1],blue:[0,0,1,1]},newsprint:{cyan:[.15,.73,.88,1],magenta:[.88,.12,.55,1],yellow:[.97,.93,.08,1],black:[.1,.1,.1,1]},fogra51:{cyan:[0,.525,.765,1],magenta:[.827,0,.486,1],yellow:[.984,.91,0,1],black:[.145,.145,.145,1]},swop:{cyan:[0,.557,.769,1],magenta:[.827,.02,.478,1],yellow:[.984,.902,.027,1],black:[.169,.169,.169,1]}},fn=`#version 300 es
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
`,pn={...dn.pure,...dn.newsprint},mn={gridSize:10,dotSize:1,smoothing:.15,angle:0,mode:`rgb`,blackAmount:1,trimEdge:!0,background:[0,0,0,0],inkPalette:pn},hn=class{constructor(e={}){this.params={...mn,...e,inkPalette:{...pn,...e.inkPalette??{}}}}setParams(e){Object.assign(this.params,e)}setInkPreset(e){Object.assign(this.params.inkPalette,dn[e])}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params,o=a.inkPalette;e.draw({frag:fn,uniforms:{src:e.src,srcSizePx:[e.src.width||1,e.src.height||1],elementPx:[r,i],gridSize:Math.max(1,a.gridSize),dotSize:Math.max(0,a.dotSize),smoothing:Math.max(0,Math.min(1,a.smoothing)),angle:a.angle,blackAmount:Math.max(0,Math.min(1,a.blackAmount)),ymck:+(a.mode===`cmyk`),trimEdge:+!!a.trimEdge,background:a.background,cInk:o.cyan,mInk:o.magenta,yInk:o.yellow,kInk:o.black,rInk:o.red,gInk:o.green,bInk:o.blue},target:e.target})}}})),_n,vn,yn,bn=e((()=>{_n=`#version 300 es
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
`,vn={shift:.5},yn=class{constructor(e={}){this.params={...vn,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:_n,uniforms:{src:e.src,shift:this.params.shift},target:e.target})}}}));function xn(e,t){if(typeof OffscreenCanvas<`u`)return new OffscreenCanvas(e,t);let n=document.createElement(`canvas`);return n.width=e,n.height=t,n}function Sn(e){let t=e.getContext(`2d`);if(!t)throw Error(`[VFX-JS] JPEGGlitchEffect: 2D canvas context unavailable`);return t}function Cn(e,t){if(typeof OffscreenCanvas<`u`&&e instanceof OffscreenCanvas)return e.convertToBlob({type:`image/jpeg`,quality:t});let n=e;return new Promise((e,r)=>{n.toBlob(t=>t?e(t):r(Error(`[VFX-JS] JPEGGlitchEffect: toBlob failed`)),`image/jpeg`,t)})}function wn(e){for(let t=2;t+3<e.length;t++)if(e[t]===255&&e[t+1]===218){let n=e[t+2]<<8|e[t+3];return Math.min(e.length,t+2+n)}return Math.min(e.length,417)}function Tn(e,t){let n=Math.imul(Math.floor(e*2654435761)|0,2246822519)+Math.imul(t+1,3266489917)>>>0;return()=>{n=n+1831565813>>>0;let e=Math.imul(n^n>>>15,1|n);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function En(e,t,n,r,i,a,o){switch(e.save(),e.clearRect(0,0,a,o),i){case 90:e.translate(a,0);break;case 180:e.translate(a,o);break;case 270:e.translate(0,o);break}e.rotate(i*Math.PI/180),e.drawImage(t,0,0,n,r),e.restore()}function Dn(e,t,n,r){let i=e.length-t-4;if(i<=1)return;let a=Math.max(1,Math.floor(n));for(let n=0;n<a;n++){let o=i/a*n|0,s=i/a*(n+1)|0,c=Math.max(1,s-o),l=Math.min(i,o+(r()*c|0)),u=r()*256|0;e[t+l]=u}}var j,M,N,On,P,kn,An,jn,Mn,Nn,Pn,Fn,In,Ln,F,Rn,zn,Bn,Vn,Hn,Un,Wn,Gn,Kn,qn,Jn,Yn,Xn,Zn,Qn,$n,er,tr,nr,rr,ir,ar,or,sr,cr,lr=e((()=>{j=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},M=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ar=`#version 300 es
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
`,or=`#version 300 es
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
`,sr={quality:.4,seed:.25,iterations:24,resolutionScale:1,randomFlip:!0,vertical:!1,speed:0,bypass:!1},cr=class{get producedFrames(){return j(this,Zn,`f`)}constructor(e={}){N.add(this),this.enabled=!0,On.set(this,!1),P.set(this,null),kn.set(this,null),An.set(this,null),jn.set(this,null),Mn.set(this,!1),Nn.set(this,null),Pn.set(this,null),Fn.set(this,null),In.set(this,null),Ln.set(this,null),F.set(this,null),Rn.set(this,null),zn.set(this,new Uint8Array),Bn.set(this,null),Vn.set(this,0),Hn.set(this,0),Un.set(this,0),Wn.set(this,0),Gn.set(this,!0),Kn.set(this,!1),qn.set(this,-1e9),Jn.set(this,0),Yn.set(this,0),Xn.set(this,!1),Zn.set(this,0),this.params={...sr,...e}}setParams(e){Object.assign(this.params,e),M(this,Gn,!0,`f`)}init(e){M(this,On,typeof createImageBitmap==`function`&&(typeof OffscreenCanvas<`u`||typeof document<`u`),`f`),j(this,On,`f`)&&(M(this,qn,-1e9,`f`),M(this,Gn,!0,`f`),M(this,Pn,xn(1,1),`f`),M(this,Fn,Sn(j(this,Pn,`f`)),`f`),M(this,In,xn(1,1),`f`),M(this,Ln,Sn(j(this,In,`f`)),`f`),M(this,F,xn(1,1),`f`),M(this,Rn,Sn(j(this,F,`f`)),`f`),M(this,P,e.createRenderTarget({size:[1,1]}),`f`),M(this,An,e.gl,`f`),j(this,N,`m`,Qn).call(this,e),M(this,Nn,e.onContextRestored(()=>{j(this,N,`m`,Qn).call(this,e),M(this,Mn,j(this,Xn,`f`),`f`)}),`f`))}update(){this.enabled===!1&&M(this,Xn,!1,`f`)}render(e){if(this.params.bypass||!j(this,On,`f`)||!j(this,P,`f`)){M(this,Xn,!1,`f`),j(this,N,`m`,$n).call(this,e);return}let t=e.src.width,n=e.src.height;(t!==j(this,Un,`f`)||n!==j(this,Wn,`f`))&&(M(this,Un,t,`f`),M(this,Wn,n,`f`),M(this,Gn,!0,`f`));let[r,i]=e.dims.elementPixel,a=Math.min(1,Math.max(0,this.params.resolutionScale)),o=Math.max(1,Math.round(r*a)),s=Math.max(1,Math.round(i*a));r>=2&&i>=2&&t>0&&n>0&&((o!==j(this,Vn,`f`)||s!==j(this,Hn,`f`))&&j(this,N,`m`,tr).call(this,e,o,s),j(this,N,`m`,er).call(this,e)&&j(this,N,`m`,nr).call(this,e)),j(this,Xn,`f`)&&j(this,kn,`f`)?(j(this,Mn,`f`)&&j(this,N,`m`,rr).call(this,e),e.draw({frag:or,uniforms:{tex:j(this,kn,`f`)},target:e.target})):j(this,N,`m`,$n).call(this,e)}dispose(){var e;j(this,Nn,`f`)?.call(this),M(this,Nn,null,`f`),j(this,An,`f`)&&j(this,jn,`f`)&&j(this,An,`f`).deleteTexture(j(this,jn,`f`)),M(this,jn,null,`f`),M(this,An,null,`f`),M(this,Mn,!1,`f`),j(this,P,`f`)?.dispose(),M(this,P,null,`f`),M(this,kn,null,`f`),M(this,Pn,null,`f`),M(this,Fn,null,`f`),M(this,In,null,`f`),M(this,Ln,null,`f`),M(this,F,null,`f`),M(this,Rn,null,`f`),M(this,Bn,null,`f`),M(this,zn,new Uint8Array,`f`),M(this,Xn,!1,`f`),M(this,Kn,!1,`f`),M(this,Vn,0,`f`),M(this,Hn,0,`f`),M(this,Jn,(e=j(this,Jn,`f`),e++,e),`f`)}},On=new WeakMap,P=new WeakMap,kn=new WeakMap,An=new WeakMap,jn=new WeakMap,Mn=new WeakMap,Nn=new WeakMap,Pn=new WeakMap,Fn=new WeakMap,In=new WeakMap,Ln=new WeakMap,F=new WeakMap,Rn=new WeakMap,zn=new WeakMap,Bn=new WeakMap,Vn=new WeakMap,Hn=new WeakMap,Un=new WeakMap,Wn=new WeakMap,Gn=new WeakMap,Kn=new WeakMap,qn=new WeakMap,Jn=new WeakMap,Yn=new WeakMap,Xn=new WeakMap,Zn=new WeakMap,N=new WeakSet,Qn=function(e){let t=e.gl,n=t.createTexture();n&&(t.bindTexture(t.TEXTURE_2D,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,0])),t.bindTexture(t.TEXTURE_2D,null),M(this,jn,n,`f`),M(this,kn,e.wrapTexture(n,{size:[j(this,Vn,`f`)||1,j(this,Hn,`f`)||1]}),`f`))},$n=function(e){e.draw({frag:ar,uniforms:{src:e.src},target:e.target})},er=function(e){if(j(this,Kn,`f`))return!1;let t=this.params.speed;return t>0?e.time-j(this,qn,`f`)>=1/t:j(this,Gn,`f`)},tr=function(e,t,n){var r;M(this,Vn,t,`f`),M(this,Hn,n,`f`),M(this,zn,new Uint8Array(t*n*4),`f`),M(this,Bn,new ImageData(t,n),`f`),j(this,Pn,`f`)&&(j(this,Pn,`f`).width=t,j(this,Pn,`f`).height=n),j(this,F,`f`)&&(j(this,F,`f`).width=t,j(this,F,`f`).height=n),j(this,P,`f`)?.dispose(),M(this,P,e.createRenderTarget({size:[t,n]}),`f`),M(this,Xn,!1,`f`),M(this,Gn,!0,`f`),M(this,Kn,!1,`f`),M(this,Mn,!1,`f`),M(this,Jn,(r=j(this,Jn,`f`),r++,r),`f`)},nr=function(e){var t;let n=j(this,Vn,`f`),r=j(this,Hn,`f`),i=j(this,Pn,`f`),a=j(this,Fn,`f`),o=j(this,In,`f`),s=j(this,Ln,`f`),c=j(this,Bn,`f`);if(!i||!a||!o||!s||!c||!j(this,P,`f`))return;e.blit(e.src,j(this,P,`f`));let l=e.gl;l.readPixels(0,0,n,r,l.RGBA,l.UNSIGNED_BYTE,j(this,zn,`f`)),l.bindFramebuffer(l.FRAMEBUFFER,null),M(this,Kn,!0,`f`),M(this,Gn,!1,`f`),M(this,qn,e.time,`f`);let u=c.data,d=n*4;for(let e=0;e<r;e++){let t=(r-1-e)*d;u.set(j(this,zn,`f`).subarray(t,t+d),e*d)}for(let e=3;e<u.length;e+=4)u[e]=255;let f=this.params.speed>0?j(this,Yn,`f`):0;M(this,Yn,(t=j(this,Yn,`f`),t++,t),`f`);let{quality:p,seed:m,iterations:h,randomFlip:g,vertical:_}=this.params,v=Tn(m,f),ee=g&&v()<.5;a.putImageData(c,0,0);let te=((ee?180:0)+(_?270:0))%360,ne=_,re=ne?r:n,y=ne?n:r;o.width=re,o.height=y,En(s,i,n,r,te,re,y),j(this,N,`m`,ir).call(this,o,n,r,p,h,te,v,j(this,Jn,`f`))},rr=function(e){let t=e.gl;!j(this,jn,`f`)||!j(this,F,`f`)||(t.bindTexture(t.TEXTURE_2D,j(this,jn,`f`)),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,j(this,F,`f`)),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,null),M(this,Mn,!1,`f`))},ir=async function(e,t,n,r,i,a,o,s){var c;try{let l=await Cn(e,r),u=new Uint8Array(await l.arrayBuffer());Dn(u,wn(u),i,o);let d=await createImageBitmap(new Blob([u],{type:`image/jpeg`}));if(s===j(this,Jn,`f`)&&j(this,Rn,`f`)){let e=(360-a)%360;En(j(this,Rn,`f`),d,d.width,d.height,e,t,n),M(this,Xn,!0,`f`),M(this,Zn,(c=j(this,Zn,`f`),c++,c),`f`),M(this,Mn,!0,`f`)}d.close()}catch{}finally{s===j(this,Jn,`f`)&&M(this,Kn,!1,`f`)}}}));function ur(e){return Array.isArray(e)?[...e]:Array.from(e)}function dr(e){return typeof e==`number`?[e,e]:e}async function fr(e,t){let n=typeof document<`u`?document.fonts:void 0;if(n?.load)try{await n.load(`${t} ${z}px ${e}`),await n.ready}catch{}}function pr(e,t,n,r){let i=Math.max(1,e.length),a=Math.ceil(Math.sqrt(i)),o=Math.ceil(i/a),s=`${n} ${z}px ${t}`,c=document.createElement(`canvas`),l;if(r&&r>0)l=Math.max(1,Math.round(r*z));else{let t=c.getContext(`2d`);if(l=z,t){t.font=s;let n=0;for(let r of e)n=Math.max(n,t.measureText(r).width);n>0&&(l=Math.max(1,Math.ceil(n)))}}c.width=a*l,c.height=o*z;let u=c.getContext(`2d`);if(u){u.clearRect(0,0,c.width,c.height),u.fillStyle=`#fff`,u.textAlign=`center`,u.textBaseline=`middle`,u.font=s;for(let t=0;t<e.length;t++){let n=t%a,r=Math.floor(t/a),i=n*l+l/2,o=r*z+z/2;u.save(),u.beginPath(),u.rect(n*l,r*z,l,z),u.clip(),u.fillText(e[t],i,o),u.restore()}}return{canvas:c,cols:a,rows:o,cellW:l,cellH:z}}function mr(e){return Array.isArray(e[0])}function hr(e){return mr(e)?e.length>0?e:[kr.color]:[e]}function gr(e){let t=hr(e).slice(0,Dr),n=new Float32Array(Dr*4);for(let e=0;e<t.length;e++)n.set(t[e],e*4);return{data:n,count:t.length}}function _r(e,t){if(t.grid!==void 0){let[n,r]=dr(t.grid);e.grid=[Math.max(1,n),Math.max(1,r)]}t.glyphs!==void 0&&(e.glyphs=t.glyphs),t.font!==void 0&&(e.font=t.font),t.fontWeight!==void 0&&(e.fontWeight=t.fontWeight),t.charAspect!==void 0&&(e.charAspect=t.charAspect),t.color!==void 0&&(e.stops=gr(t.color)),t.headColor!==void 0&&(e.headColor=t.headColor),t.background!==void 0&&(e.background=t.background),t.speed!==void 0&&(e.speed=t.speed),t.tail!==void 0&&(e.tail=Math.max(1,t.tail)),t.tailFade!==void 0&&(e.tailFade=Math.min(1,Math.max(0,t.tailFade))),t.birthRate!==void 0&&(e.birthRate=Math.max(0,t.birthRate)),t.glyphSpeed!==void 0&&(e.glyphSpeed=Math.max(0,t.glyphSpeed)),t.brightness!==void 0&&(e.brightness=Math.max(0,t.brightness)),t.contrast!==void 0&&(e.contrast=Math.max(0,t.contrast)),t.invert!==void 0&&(e.invert=+!!t.invert),t.seed!==void 0&&(e.seed=t.seed)}function vr(e){let t={};return _r(t,e),t}var I,L,yr,R,br,xr,Sr,Cr,wr,Tr,Er,Dr,Or,kr,z,Ar,jr=e((()=>{I=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},L=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Dr=8,Or=`#version 300 es
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
uniform vec4 colorStops[${Dr}]; // trail-colour gradient stops (sRGB), head→tail
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
`,kr={grid:[12,16],font:`monospace`,fontWeight:`normal`,color:[.18,1,.36,1],headColor:[.85,1,.9,1],background:[0,0,0,1],speed:10,tail:18,tailFade:1,birthRate:.6,glyphSpeed:8,brightness:1,contrast:1,invert:!1,seed:0},z=64,Ar=class{constructor(e={}){yr.add(this),R.set(this,void 0),br.set(this,null),xr.set(this,1),Sr.set(this,1),Cr.set(this,1),wr.set(this,1),Tr.set(this,null),I(this,R,vr({...kr,...e}),`f`)}setParams(e){_r(L(this,R,`f`),e)}async init(e){typeof document>`u`||(I(this,Tr,e,`f`),await L(this,yr,`m`,Er).call(this,e))}async updateAtlas(){L(this,Tr,`f`)&&await L(this,yr,`m`,Er).call(this,L(this,Tr,`f`))}render(e){if(!L(this,br,`f`))return;let t=L(this,R,`f`),[n,r]=e.dims.elementPixel,i=[t.grid[0]*e.pixelRatio,t.grid[1]*e.pixelRatio];e.draw({frag:Or,uniforms:{src:e.src,atlas:L(this,br,`f`),elementPx:[Math.max(1,n),Math.max(1,r)],cellPx:i,cols:L(this,xr,`f`),rows:L(this,Sr,`f`),glyphCount:L(this,Cr,`f`),glyphAspect:L(this,wr,`f`),time:e.time,colorStops:t.stops.data,colorStopCount:t.stops.count,headColor:t.headColor,background:t.background,speed:t.speed,tail:t.tail,tailFade:t.tailFade,birthRate:t.birthRate,glyphSpeed:t.glyphSpeed,brightness:t.brightness,contrast:t.contrast,invert:t.invert,seed:t.seed},target:e.target})}dispose(){L(this,br,`f`)?.dispose(),I(this,br,null,`f`),I(this,Tr,null,`f`)}},R=new WeakMap,br=new WeakMap,xr=new WeakMap,Sr=new WeakMap,Cr=new WeakMap,wr=new WeakMap,Tr=new WeakMap,yr=new WeakSet,Er=async function(e){let t=ur(L(this,R,`f`).glyphs??`ﾊﾋﾌﾍﾎｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789Z:."=*+-<>|`);t.length===0&&console.warn(`[VFX-JS] MatrixEffect: empty glyph pool; nothing will be rendered.`),I(this,Cr,Math.max(1,t.length),`f`),await fr(L(this,R,`f`).font,L(this,R,`f`).fontWeight);let n=pr(t,L(this,R,`f`).font,L(this,R,`f`).fontWeight,L(this,R,`f`).charAspect),r=L(this,br,`f`);I(this,xr,n.cols,`f`),I(this,Sr,n.rows,`f`),I(this,wr,n.cellW/n.cellH,`f`),I(this,br,e.wrapTexture(n.canvas,{autoUpdate:!1,filter:`linear`}),`f`),r?.dispose()}})),Mr,Nr,Pr,Fr=e((()=>{Mr=.7,Nr=1.3,Pr=`
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
`}));function Ir(e){let t=Lr(e);return 2**Math.ceil(Math.log2(Math.sqrt(t)))}function Lr(e){return Number.isFinite(e)?Math.max(1,Math.floor(e)):1}function Rr(e){let t=e|0;return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function zr(e){return Math.min(Gr,Math.max(0,e))}var Br,Vr,Hr,Ur,Wr,Gr,Kr=e((()=>{Br=new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),Vr=`
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,Hr=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,Ur=`#version 300 es
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
`,Wr=`#version 300 es
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
`,Gr=.1})),B,V,H,qr,U,W,Jr,Yr,Xr,Zr,G,Qr,$r,ei,ti,ni,ri,ii,ai,oi,si,ci,li,ui,di,fi,pi,mi,hi,gi,_i,K,vi,yi,bi,xi,Si,Ci,wi,Ti,Ei,Di,Oi,ki,Ai,ji,Mi,Ni=e((()=>{Fr(),Kr(),B=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},V=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},K=64,vi=K*K,yi=.1,bi=[K,K],xi=new Float32Array(vi);for(let e=0;e<vi;e++)xi[e]=e;Si=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, 2.0);
}
`,Ci=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0);
}
`,wi=`#version 300 es
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
`,Ti=`#version 300 es
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
`,Ei=`#version 300 es
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
${Pr}

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
`,Di=`#version 300 es
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
`,Oi=`#version 300 es
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
`,ki=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;

uniform sampler2D src;
uniform vec3 color;
uniform float colorMix;
uniform vec2 lifeJitterRange;
${Vr}

void main() {
    vec4 c = texture(src, clamp(vSpawn.yz, 0.0, 1.0));
    float h = hash21(vSpawn.yz + vec2(vSpawn.x) * 1.7);
    float lifeJitter = mix(lifeJitterRange.x, lifeJitterRange.y, h);
    outColor = vec4(mix(c.rgb, color, colorMix), lifeJitter);
}
`,Ai=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;
void main() {
    float theta = vSpawn.w;
    vec2 dir = theta >= 0.0 ? vec2(cos(theta), sin(theta)) : vec2(0.0);
    outColor = vec4(dir, 0.0, 0.0);
}
`,ji={count:1024*1024,birthRate:3e4,screenBirthRate:1e4,life:1,noiseSpeed:.3,emitSpeed:1,noiseDelay:.15,noiseScale:1,noiseAnimation:.3,pointSize:10,alpha:1,radius:300,speedDecay:1,alphaDecay:5,fadeIn:.05,alphaThreshold:.05,spawnOnIdle:!0,srcOpacity:0,trailFade:.75,fog:.5,color:16777215,colorMix:0,blend:`add`},Mi=class{get params(){return B(this,qr,`f`)}constructor(e={}){H.add(this),qr.set(this,void 0),U.set(this,null),W.set(this,null),Jr.set(this,null),Yr.set(this,null),Xr.set(this,null),Zr.set(this,!1),G.set(this,void 0),Qr.set(this,void 0),$r.set(this,new Float32Array(vi*4)),ei.set(this,null),ti.set(this,null),ni.set(this,null),ri.set(this,null),ii.set(this,null),ai.set(this,null),oi.set(this,0),si.set(this,0),ci.set(this,0),li.set(this,null),ui.set(this,-1/0),V(this,qr,{...ji,...e},`f`),B(this,qr,`f`).count=Lr(B(this,qr,`f`).count),V(this,G,Ir(B(this,qr,`f`).count),`f`),V(this,Qr,B(this,G,`f`)*B(this,G,`f`),`f`)}get maxCount(){return B(this,Qr,`f`)}setParam(e){let t=B(this,qr,`f`);for(let[n,r]of Object.entries(e))r!==void 0&&(t[n]=n===`count`?Lr(r):r)}init(e){B(this,H,`m`,di).call(this,e),V(this,Yr,e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),`f`),V(this,Xr,e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),`f`),V(this,ri,{attributes:{position:Br}},`f`),V(this,ni,{mode:`points`,attributes:{position:{data:xi,itemSize:1}}},`f`),V(this,ii,e.gl,`f`),B(this,H,`m`,mi).call(this,e),V(this,ai,e.onContextRestored(()=>{V(this,ii,e.gl,`f`),B(this,H,`m`,mi).call(this,e),V(this,Zr,!1,`f`)}),`f`)}render(e){if(!B(this,U,`f`)||!B(this,W,`f`)||!B(this,Jr,`f`)||!B(this,Yr,`f`)||!B(this,Xr,`f`)||!B(this,ri,`f`)||!B(this,ni,`f`)||!B(this,ti,`f`)||!B(this,ei,`f`))return;let t=Ir(this.params.count);t!==B(this,G,`f`)&&(B(this,H,`m`,fi).call(this),V(this,G,t,`f`),V(this,Qr,t*t,`f`),B(this,H,`m`,di).call(this,e),V(this,oi,0,`f`),V(this,Zr,!1,`f`)),B(this,Zr,`f`)||(e.draw({frag:Si,target:B(this,U,`f`)}),e.draw({frag:Ci,target:B(this,W,`f`)}),e.draw({frag:Ci,target:B(this,Jr,`f`)}),V(this,Zr,!0,`f`));let n=zr(e.deltaTime),r=[e.dims.elementPixel[0],e.dims.elementPixel[1]],i=[B(this,G,`f`),B(this,G,`f`)],a=B(this,H,`m`,gi).call(this,e,n,r);a>0&&B(this,H,`m`,hi).call(this,e);let o=a===0;if(e.draw({frag:Ei,uniforms:{posTex:B(this,U,`f`),colorTex:B(this,W,`f`),velTex:B(this,Jr,`f`),elementPixel:r,time:e.time,dt:n,noiseSpeed:this.params.noiseSpeed,emitSpeed:this.params.emitSpeed,noiseDelay:this.params.noiseDelay,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,life:this.params.life},target:B(this,U,`f`),swap:o}),a>0){let t={uSpawnTex:B(this,ti,`f`),uSpawnTexSize:bi,uSpawnCount:a,stateSize:i};e.draw({vert:Di,frag:Oi,geometry:B(this,ni,`f`),uniforms:{...t,src:e.src,alphaThreshold:this.params.alphaThreshold},target:B(this,U,`f`),blend:`none`}),e.draw({vert:Di,frag:ki,geometry:B(this,ni,`f`),uniforms:{...t,src:e.src,color:Rr(this.params.color),colorMix:this.params.colorMix,lifeJitterRange:[Mr,Nr]},target:B(this,W,`f`),blend:`none`}),e.draw({vert:Di,frag:Ai,geometry:B(this,ni,`f`),uniforms:t,target:B(this,Jr,`f`),blend:`none`})}let s=B(this,H,`m`,_i).call(this);B(this,ri,`f`).instanceCount=s,e.draw({frag:Hr,target:B(this,Yr,`f`)}),e.draw({vert:wi,frag:Ur,uniforms:{posTex:B(this,U,`f`),colorTex:B(this,W,`f`),stateSize:i,pointSize:this.params.pointSize,elementPixel:r,particleCount:s,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fadeIn:this.params.fadeIn,fog:this.params.fog},geometry:B(this,ri,`f`),target:B(this,Yr,`f`),blend:this.params.blend===`normal`?`premultiplied`:`additive`}),e.draw({frag:Wr,uniforms:{trailPrev:B(this,Xr,`f`),particleStamp:B(this,Yr,`f`),trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:B(this,Xr,`f`)}),e.draw({frag:Ti,uniforms:{src:e.src,trail:B(this,Xr,`f`),srcOpacity:this.params.srcOpacity},target:e.target})}dispose(){B(this,ai,`f`)?.call(this),V(this,ai,null,`f`),B(this,ii,`f`)&&B(this,ei,`f`)&&B(this,ii,`f`).deleteTexture(B(this,ei,`f`)),V(this,ei,null,`f`),V(this,ti,null,`f`),V(this,ni,null,`f`),V(this,ii,null,`f`),B(this,H,`m`,fi).call(this),B(this,Yr,`f`)?.dispose(),B(this,Xr,`f`)?.dispose(),V(this,Yr,null,`f`),V(this,Xr,null,`f`),V(this,ri,null,`f`),V(this,Zr,!1,`f`)}outputRect(e){return e.canvasRect}},qr=new WeakMap,U=new WeakMap,W=new WeakMap,Jr=new WeakMap,Yr=new WeakMap,Xr=new WeakMap,Zr=new WeakMap,G=new WeakMap,Qr=new WeakMap,$r=new WeakMap,ei=new WeakMap,ti=new WeakMap,ni=new WeakMap,ri=new WeakMap,ii=new WeakMap,ai=new WeakMap,oi=new WeakMap,si=new WeakMap,ci=new WeakMap,li=new WeakMap,ui=new WeakMap,H=new WeakSet,di=function(e){let t={size:[B(this,G,`f`),B(this,G,`f`)],float:!0,wrap:`clamp`,filter:`nearest`};V(this,U,e.createRenderTarget({...t,persistent:!0}),`f`),V(this,W,e.createRenderTarget(t),`f`),V(this,Jr,e.createRenderTarget(t),`f`)},fi=function(){B(this,U,`f`)?.dispose(),B(this,W,`f`)?.dispose(),B(this,Jr,`f`)?.dispose(),V(this,U,null,`f`),V(this,W,null,`f`),V(this,Jr,null,`f`)},pi=function(e){let t=e.gl,n=t.createTexture();if(!n)throw Error(`[ParticleEffect] Failed to create spawn texture`);return t.bindTexture(t.TEXTURE_2D,n),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,K,K,0,t.RGBA,t.FLOAT,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.bindTexture(t.TEXTURE_2D,null),{raw:n,handle:e.wrapTexture(n,{size:[K,K],filter:`nearest`,wrap:`clamp`})}},mi=function(e){let t=B(this,H,`m`,pi).call(this,e);V(this,ei,t.raw,`f`),V(this,ti,t.handle,`f`)},hi=function(e){if(!B(this,ei,`f`))return;let t=e.gl;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,B(this,ei,`f`)),t.texSubImage2D(t.TEXTURE_2D,0,0,0,K,K,t.RGBA,t.FLOAT,B(this,$r,`f`)),t.bindTexture(t.TEXTURE_2D,null)},gi=function(e,t,n){let r=[e.mouse[0]/Math.max(1,n[0]),e.mouse[1]/Math.max(1,n[1])];(!B(this,li,`f`)||Math.abs(r[0]-B(this,li,`f`)[0])>1e-6||Math.abs(r[1]-B(this,li,`f`)[1])>1e-6)&&V(this,ui,e.time,`f`),V(this,li,r,`f`);let i=e.intersection>0,a=e.time-B(this,ui,`f`)<yi;i&&(a||this.params.spawnOnIdle)?V(this,si,Math.min(B(this,si,`f`)+this.params.birthRate*t,vi),`f`):V(this,si,0,`f`),i?V(this,ci,Math.min(B(this,ci,`f`)+this.params.screenBirthRate*t,vi),`f`):V(this,ci,0,`f`);let o=Math.min(vi,Math.floor(B(this,si,`f`))),s=Math.min(vi-o,Math.floor(B(this,ci,`f`)));V(this,si,B(this,si,`f`)-o,`f`),V(this,ci,B(this,ci,`f`)-s,`f`);let c=o+s;if(c===0)return 0;let l=B(this,H,`m`,_i).call(this),u=Math.max(1,n[0]),d=Math.max(1,n[1]),f=B(this,$r,`f`),p=0;for(;p<o;p++){let e=Math.sqrt(Math.random())*this.params.radius,t=Math.random()*Math.PI*2,n=Math.cos(t)*e,i=Math.sin(t)*e,a=p*4;f[a+0]=B(this,oi,`f`),f[a+1]=r[0]+n/u,f[a+2]=r[1]+i/d,f[a+3]=t,V(this,oi,(B(this,oi,`f`)+1)%l,`f`)}for(let e=0;e<s;e++,p++){let e=p*4;f[e+0]=B(this,oi,`f`),f[e+1]=Math.random(),f[e+2]=Math.random(),f[e+3]=-1,V(this,oi,(B(this,oi,`f`)+1)%l,`f`)}return c},_i=function(){return Math.max(1,Math.min(B(this,Qr,`f`),Math.floor(this.params.count)))}})),q,J,Pi,Fi,Ii,Li,Y,X,Ri,Z,zi,Bi,Vi,Hi,Ui,Wi,Gi,Ki,qi,Ji,Yi,Xi,Zi,Qi,$i,ea=e((()=>{Fr(),Kr(),q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},J=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Ji=`#version 300 es
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
${Vr}
${Pr}

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
        ${Mr.toFixed(4)},
        ${Nr.toFixed(4)},
        hash21(uv * 91.7 + 1.234)
    );
    age += dt / max(duration * lifespanScale, 1e-3);

    outColor = vec4(pos, age);
}
`,Yi=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 stateSize;
uniform float count;
uniform vec3 color;
uniform float colorMix;
${Vr}

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
`,Xi=`#version 300 es
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
`,Zi=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trail;

void main() {
    outColor = texture(trail, uv);
}
`,Qi={count:1e5,duration:1,noiseSpeed:1.5,noiseScale:1,noiseAnimation:1,outwardBias:1,pointSize:3,alpha:1,alphaDecay:5,speedDecay:2,fog:0,trailFade:.5,color:16777215,colorMix:0,blend:`add`},$i=class{get params(){return q(this,Fi,`f`)}constructor(e={}){Pi.add(this),Fi.set(this,void 0),Ii.set(this,null),Li.set(this,null),Y.set(this,null),X.set(this,null),Ri.set(this,null),Z.set(this,void 0),zi.set(this,!1),Bi.set(this,!1),Vi.set(this,-1),Hi.set(this,0),Ui.set(this,0),J(this,Fi,{...Qi,...e},`f`),q(this,Fi,`f`).count=Lr(q(this,Fi,`f`).count);let t=Ir(q(this,Fi,`f`).count);J(this,Z,[t,t],`f`)}trigger(){J(this,zi,!0,`f`),J(this,Bi,!0,`f`),J(this,Vi,-1,`f`),J(this,Hi,0,`f`),J(this,Ui,0,`f`)}reset(){J(this,zi,!1,`f`),J(this,Bi,!1,`f`),J(this,Vi,-1,`f`),J(this,Hi,0,`f`),J(this,Ui,0,`f`)}isDone(){return!q(this,zi,`f`)||q(this,Hi,`f`)<this.params.duration?!1:q(this,Ui,`f`)>=q(this,Pi,`m`,Wi).call(this)}init(e){q(this,Pi,`m`,Gi).call(this,e),J(this,Y,e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),`f`),J(this,X,e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),`f`),J(this,Ri,{attributes:{position:Br}},`f`)}render(e){var t;if(!q(this,Ii,`f`)||!q(this,Li,`f`)||!q(this,Y,`f`)||!q(this,X,`f`)||!q(this,Ri,`f`)||e.intersection<=0)return;let n=Ir(this.params.count),r=!q(this,zi,`f`)||this.isDone();if(n!==q(this,Z,`f`)[0]&&r&&(q(this,Pi,`m`,Ki).call(this),J(this,Z,[n,n],`f`),q(this,Pi,`m`,Gi).call(this,e)),!q(this,zi,`f`)){e.blit(e.src,e.target);return}q(this,Vi,`f`)<0&&J(this,Vi,e.time,`f`);let i=e.time-q(this,Vi,`f`);J(this,Hi,i,`f`);let a=i>=this.params.duration;if(a&&q(this,Ui,`f`)>=q(this,Pi,`m`,Wi).call(this)){e.draw({frag:Hr,target:e.target});return}let o=zr(e.deltaTime),s=[e.dims.elementPixel[0],e.dims.elementPixel[1]];if(a)e.draw({frag:Hr,target:q(this,Y,`f`)}),J(this,Ui,(t=q(this,Ui,`f`),t++,t),`f`);else{let t=+!!q(this,Bi,`f`);J(this,Bi,!1,`f`);let n=q(this,Pi,`m`,qi).call(this);e.draw({frag:Ji,uniforms:{posTex:q(this,Ii,`f`),stateSize:q(this,Z,`f`),elementPixel:s,time:e.time,dt:o,noiseSpeed:this.params.noiseSpeed,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,outwardBias:this.params.outwardBias,duration:this.params.duration,count:n,uBurst:t},target:q(this,Ii,`f`)}),t===1&&(e.draw({frag:Yi,uniforms:{src:e.src,stateSize:q(this,Z,`f`),count:n,color:Rr(this.params.color),colorMix:this.params.colorMix},target:q(this,Li,`f`)}),e.draw({frag:Hr,target:q(this,X,`f`)})),q(this,Ri,`f`).instanceCount=n,e.draw({frag:Hr,target:q(this,Y,`f`)}),e.draw({vert:Xi,frag:Ur,uniforms:{posTex:q(this,Ii,`f`),colorTex:q(this,Li,`f`),stateSize:q(this,Z,`f`),pointSize:this.params.pointSize,elementPixel:s,particleCount:n,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fog:this.params.fog},geometry:q(this,Ri,`f`),target:q(this,Y,`f`),blend:this.params.blend===`normal`?`premultiplied`:`additive`})}e.draw({frag:Wr,uniforms:{trailPrev:q(this,X,`f`),particleStamp:q(this,Y,`f`),trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:q(this,X,`f`)}),e.draw({frag:Zi,uniforms:{trail:q(this,X,`f`)},target:e.target})}dispose(){q(this,Pi,`m`,Ki).call(this),q(this,Y,`f`)?.dispose(),q(this,X,`f`)?.dispose(),J(this,Y,null,`f`),J(this,X,null,`f`),J(this,Ri,null,`f`)}outputRect(e){return e.canvasRect}},Fi=new WeakMap,Ii=new WeakMap,Li=new WeakMap,Y=new WeakMap,X=new WeakMap,Ri=new WeakMap,Z=new WeakMap,zi=new WeakMap,Bi=new WeakMap,Vi=new WeakMap,Hi=new WeakMap,Ui=new WeakMap,Pi=new WeakSet,Wi=function(){let e=this.params.trailFade;return e<=0?1:e>=.999?600:Math.ceil(-Math.log(255)/Math.log(e))},Gi=function(e){let t={size:q(this,Z,`f`),float:!0,wrap:`clamp`,filter:`nearest`};J(this,Ii,e.createRenderTarget({...t,persistent:!0}),`f`),J(this,Li,e.createRenderTarget(t),`f`)},Ki=function(){q(this,Ii,`f`)?.dispose(),q(this,Li,`f`)?.dispose(),J(this,Ii,null,`f`),J(this,Li,null,`f`)},qi=function(){let e=q(this,Z,`f`)[0]*q(this,Z,`f`)[1];return Math.max(1,Math.min(e,Math.floor(this.params.count)))}})),ta,na,ra,ia,aa,oa=e((()=>{Ve(),ta=`#version 300 es
precision highp float;
#define TAU 6.28318530718
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform int pattern;
uniform int edgeWrap;
uniform float strength;
uniform float smoothness;
uniform float frost;
uniform float dispersion;
uniform float stripWidth;
uniform float angle;
uniform float aspect;
${Be}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Smooth value noise: bilinear-interpolated lattice hash.
float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
        mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

// Edge sampling for out-of-range coordinates.
vec4 readTexWrap(vec2 uv) {
    if (edgeWrap == 0) {
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
            return vec4(0.0);
    } else if (edgeWrap == 1) {
        uv = clamp(uv, 0.0, 1.0);
    } else if (edgeWrap == 2) {
        uv = fract(uv);
    } else {
        vec2 m = mod(uv, 2.0);
        uv = mix(m, 2.0 - m, step(1.0, m));
    }
    return texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}

// Sample coordinate after the pattern displacement. stGrid fixes the pattern
// geometry (same for every channel); stDisp scales the displacement and is
// varied per channel to get dispersion, so RGB shifts within a strip while the
// strip boundaries stay aligned.
vec2 patternSample(vec2 uv, float stGrid, float stDisp) {
    vec2 q = rot2d(-radians(angle)) * (uv - center);
    float count = 1.0 / stripWidth;

    if (pattern == 2) {
        // Circular: shrink the content inside each grid circle toward the
        // circle's own center. aspect keeps the cells square so circles stay
        // round on any element shape.
        vec2 qa = vec2(q.x * aspect, q.y);
        vec2 g = qa * count;
        vec2 cl = fract(g) - 0.5;
        float r = length(cl);
        float edge = r * 2.0;
        float taper = smoothness > 0.0
            ? smoothstep(1.0, 1.0 - smoothness, edge)
            : step(edge, 1.0);
        float mask = r < 0.5 ? taper : 0.0;
        // Push the sample out from the circle center so a wider area maps in.
        vec2 offset = vec2(cl.x / aspect, cl.y) / count;
        q += offset * stDisp * mask;
        return rot2d(radians(angle)) * q + center;
    }

    // Lenticular: displace each strip's sample by its position within the
    // strip. n runs -1..1 across the strip. smoothness=0 keeps the interior
    // flat and spikes at the boundary (a jump, drawn as a tail); smoothness=1
    // is a sine: zero at the boundary, smooth wave that folds at the edges.
    float gx = q.x;
    float bendPhase = (q.y + 0.5) * TAU / (5.0 * stripWidth);
    if (pattern == 1) {
        // Waves: bend the lens grid along y. Frequency scales with 1/stripWidth.
        gx += sin(bendPhase) * stGrid * 0.5 * stripWidth;
    }
    float n = fract(gx * count) * 2.0 - 1.0;
    float sharp = sign(n) * pow(abs(n), 8.0);
    float soft = sin(n * TAU * 0.5);
    // Waves: keep the bend near the strip boundary so the interior stays flat
    // and adjacent strips join up; raising smoothness widens the connection.
    if (pattern == 1) soft *= n * n;
    float shape = mix(sharp, soft, smoothness);
    float disp = 0.3 * stripWidth * stDisp * shape;
    q.x += disp;
    if (pattern == 1) {
        // Refraction follows the bent grid: y shift = x shift times the grid's
        // slope along y, so where the bend rises the sample tilts up-right.
        q.y += disp * cos(bendPhase) * stGrid * 0.5 * TAU / 5.0;
    }
    return rot2d(radians(angle)) * q + center;
}

void main(void) {
    vec2 uvR = patternSample(uvContent, strength, strength * (1.0 + dispersion));
    vec2 uvG = patternSample(uvContent, strength, strength);
    vec2 uvB = patternSample(uvContent, strength, strength * (1.0 - dispersion));

    if (frost > 0.0) {
        // Frost: jitter the sample with value noise for a frosted-glass blur.
        vec2 j = (vec2(
            valueNoise(uvContent * 1024.0),
            valueNoise(uvContent * 1024.0 + 19.0)
        ) - 0.5) * frost * 0.05;
        uvR += j;
        uvG += j;
        uvB += j;
    }

    vec4 cg = readTexWrap(uvG);
    outColor = vec4(
        readTexWrap(uvR).r,
        cg.g,
        readTexWrap(uvB).b,
        cg.a
    );
}
`,na={lenticular:0,waves:1,circular:2},ra={zero:0,clamp:1,repeat:2,mirror:3},ia={pattern:`lenticular`,strength:.5,smoothness:0,frost:0,dispersion:.04,edgeWrap:`zero`,centerX:.5,centerY:.5,stripWidth:.05,angle:0},aa=class{constructor(e={}){this.params={...ia,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.element;e.draw({frag:ta,uniforms:{src:e.src,center:[t.centerX,t.centerY],pattern:na[t.pattern]??0,edgeWrap:ra[t.edgeWrap]??0,strength:t.strength,smoothness:Math.min(1,Math.max(0,t.smoothness)),frost:Math.max(0,t.frost),dispersion:Math.max(0,t.dispersion),stripWidth:Math.min(1,Math.max(.001,t.stripWidth)),angle:t.angle,aspect:(n||1)/(r||1)},target:e.target})}}})),sa,ca,la,ua=e((()=>{Ve(),sa=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform float angle;
uniform float offset;
uniform float reach;
uniform float smoothness;
${Be}

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

// Quadratic smooth min/max (Inigo Quilez) to round the band corners.
float smin(float a, float b, float k) {
    k = max(k, 1e-4);
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}
float smax(float a, float b, float k) { return -smin(-a, -b, k); }

void main(void) {
    vec2 pr = rot2d(-radians(angle)) * (uvContent - center);

    // Line position along the rotated y axis (offset 0 = center).
    float line = offset * 0.5;
    float k = min(smoothness, max(reach, 0.0) * 0.49);

    // Source displacement: 0 below the line, ramps to reach across the
    // band, then holds at reach (shifting the rest of the image up).
    float disp = smin(smax(pr.y - line, 0.0, k), reach, k);

    vec2 uv = rot2d(radians(angle)) * vec2(pr.x, pr.y - disp) + center;
    outColor = readTex(uv);
}
`,ca={offset:0,reach:.1,smoothness:0,centerX:.5,centerY:.5,angle:45},la=class{constructor(e={}){this.params={...ca,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params;e.draw({frag:sa,uniforms:{src:e.src,center:[t.centerX,t.centerY],angle:t.angle,offset:t.offset,reach:Math.max(0,t.reach),smoothness:Math.max(0,t.smoothness)},target:e.target})}}})),da,fa,pa,ma=e((()=>{da=`#version 300 es
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
`,fa={size:10},pa=class{constructor(e={}){this.params={...fa,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element,{size:r}=this.params;e.draw({frag:da,uniforms:{src:e.src,cellUv:[r/(t||1),r/(n||1)]},target:e.target})}}})),Q,$,ha,ga,_a,va,ya,ba,xa,Sa,Ca,wa,Ta,Ea,Da,Oa,ka,Aa,ja,Ma,Na,Pa,Fa,Ia,La,Ra,za,Ba=e((()=>{Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},$=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ka=`
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
`,Aa=`
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
`,ja=`#version 300 es
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
${ka}
${Aa}
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
`,Ma=`#version 300 es
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
${ka}
${Aa}
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
`,Na=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    vec4 c = texture(src, uvSrc);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,Pa=`#version 300 es
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
`,Fa=`#version 300 es
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
`,Ia={right:{axis:0,direction:0},left:{axis:0,direction:1},down:{axis:1,direction:1},up:{axis:1,direction:0}},La={luminance:0,r:1,g:2,b:3,hue:4,saturation:5},Ra={range:[0,1],sortRes:128,key:`luminance`,direction:`up`,angle:0,bypass:!1},za=class{constructor(e={}){ha.add(this),ga.set(this,null),_a.set(this,null),va.set(this,null),ya.set(this,null),ba.set(this,0),xa.set(this,0),Sa.set(this,0),Ca.set(this,0),wa.set(this,0),Ta.set(this,0),Ea.set(this,0),this.params={...Ra,...e},this.params.range=[...this.params.range]}setParams(e){Object.assign(this.params,e),e.range&&(this.params.range=[...e.range])}render(e){if(Q(this,ha,`m`,Oa).call(this,e),this.params.bypass||!Q(this,ga,`f`)||!Q(this,_a,`f`)){e.draw({frag:Na,uniforms:{src:e.src},target:e.target});return}let{axis:t,direction:n}=Ia[this.params.direction],r=[Q(this,Ta,`f`),Q(this,Ea,`f`)],[i,a]=this.params.range,o=La[this.params.key],[s,c]=e.dims.elementPixel,l=Q(this,va,`f`),u=Q(this,ya,`f`),d=this.params.angle!==0&&l!==null&&u!==null,f=e.src,p=e.src,m=e.target,h=[1,0],g=[s,c];if(d){let t=-this.params.angle*Math.PI/180;h=[Math.cos(t),Math.sin(t)],g=[Q(this,Ca,`f`),Q(this,wa,`f`)],e.draw({frag:Pa,uniforms:{src:e.src,srcSize:[s,c],boxSize:g,rot:h},target:l}),f=l,p=l,m=u}e.blit(f,Q(this,ga,`f`));let _=+!!d,v=[s,c];e.draw({frag:ja,uniforms:{src:Q(this,ga,`f`),srcSize:r,threshold:i,thresholdHigh:a,keyMode:o,direction:n,axis:t,masked:_,boxSize:g,imgSize:v,rot:h},target:Q(this,_a,`f`)}),e.draw({frag:Ma,uniforms:{src:Q(this,ga,`f`),srcHi:p,rankTex:Q(this,_a,`f`),lowSize:r,threshold:i,thresholdHigh:a,keyMode:o,axis:t,masked:_,boxSize:g,imgSize:v,rot:h},target:m}),d&&e.draw({frag:Fa,uniforms:{src:u,srcSize:[s,c],boxSize:g,rot:h},target:e.target})}dispose(){Q(this,ha,`m`,Da).call(this),$(this,ba,0,`f`),$(this,xa,0,`f`),$(this,Sa,0,`f`),$(this,Ca,0,`f`),$(this,wa,0,`f`),$(this,Ta,0,`f`),$(this,Ea,0,`f`)}},ga=new WeakMap,_a=new WeakMap,va=new WeakMap,ya=new WeakMap,ba=new WeakMap,xa=new WeakMap,Sa=new WeakMap,Ca=new WeakMap,wa=new WeakMap,Ta=new WeakMap,Ea=new WeakMap,ha=new WeakSet,Da=function(){Q(this,ga,`f`)?.dispose(),Q(this,_a,`f`)?.dispose(),Q(this,va,`f`)?.dispose(),Q(this,ya,`f`)?.dispose(),$(this,ga,null,`f`),$(this,_a,null,`f`),$(this,va,null,`f`),$(this,ya,null,`f`)},Oa=function(e){let[t,n]=e.dims.elementPixel,{axis:r}=Ia[this.params.direction],{angle:i}=this.params,a=this.params.sortRes,o=t,s=n;if(i!==0){let e=i*Math.PI/180,r=Math.abs(Math.cos(e)),a=Math.abs(Math.sin(e));o=Math.ceil(t*r+n*a),s=Math.ceil(t*a+n*r)}let c=r===0?Math.max(1,Math.round(a*o/t)):Math.max(1,Math.round(a*s/n)),l=r===0?c:o,u=r===0?s:c;Q(this,ba,`f`)===t&&Q(this,xa,`f`)===n&&Q(this,Sa,`f`)===i&&Q(this,Ta,`f`)===l&&Q(this,Ea,`f`)===u||(Q(this,ha,`m`,Da).call(this),$(this,ba,t,`f`),$(this,xa,n,`f`),$(this,Sa,i,`f`),$(this,Ca,o,`f`),$(this,wa,s,`f`),$(this,Ta,l,`f`),$(this,Ea,u,`f`),$(this,ga,e.createRenderTarget({size:[l,u],filter:`nearest`}),`f`),$(this,_a,e.createRenderTarget({size:[l,u],filter:`nearest`,float:!0}),`f`),i!==0&&($(this,va,e.createRenderTarget({size:[o,s]}),`f`),$(this,ya,e.createRenderTarget({size:[o,s]}),`f`)))}})),Va,Ha,Ua,Wa=e((()=>{Va=`#version 300 es
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
`,Ha={speed:1,frequency:1},Ua=class{constructor(e={}){this.params={...Ha,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:Va,uniforms:{src:e.src,time:e.time*this.params.speed,aspect:(t||1)/(n||1),frequency:this.params.frequency},target:e.target})}}})),Ga,Ka,qa,Ja=e((()=>{Ga=`#version 300 es
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
`,Ka={speed:1,amount:.05},qa=class{constructor(e={}){this.params={...Ka,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:Ga,uniforms:{src:e.src,time:e.time*this.params.speed,amount:this.params.amount},target:e.target})}}})),Ya,Xa,Za,Qa=e((()=>{Ya=`#version 300 es
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
`,Xa={speed:1,amount:10},Za=class{constructor(e={}){this.params={...Xa,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=e.dims.element[0]||1;e.draw({frag:Ya,uniforms:{src:e.src,time:e.time*this.params.speed,amp:this.params.amount/t},target:e.target})}}})),$a,eo,to,no=e((()=>{$a=`#version 300 es
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
`,eo={spacing:4},to=class{constructor(e={}){this.params={...eo,...e}}setParams(e){Object.assign(this.params,e)}render(e){let{spacing:t}=this.params;e.draw({frag:$a,uniforms:{src:e.src,innerHeight:e.dims.element[1]||1,spacing:t},target:e.target})}}})),ro,io,ao,oo=e((()=>{ro=`#version 300 es
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
`,io={speed:1,amount:20,frequency:7,blur:2},ao=class{constructor(e={}){this.params={...io,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=e.dims.element[0]||1;e.draw({frag:ro,uniforms:{src:e.src,time:e.time*this.params.speed,amp:this.params.amount/t,frequency:this.params.frequency,blurDx:this.params.blur/t},target:e.target})}}})),so,co,lo,uo=e((()=>{Ve(),so=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform vec2 resolution;
uniform float angle;
uniform float size;
uniform float shift;
uniform float random;
${Be}

vec4 readTex(vec2 c) {
    return texture(src, srcRectUv.xy + fract(c) * srcRectUv.zw);
}

// Per-strip sample offset, in strip-size units, along the division axis.
// Strip n samples toward the center strip by n * shift, so shift = 1 makes
// every strip show the center strip. random adds a per-strip jitter.
float stripShift(float n) {
    float jitter = (hash11(n) * 2.0 - 1.0) * random;
    return n * shift + jitter;
}

void main(void) {
    // Division axis in element-pixel space; strips stack along it.
    vec2 dir = vec2(cos(radians(angle)), sin(radians(angle)));
    float t = dot((uvContent - center) * resolution, dir);
    float n = floor(t / size + 0.5);

    vec2 uv = uvContent - stripShift(n) * size * dir / resolution;
    outColor = readTex(uv);
}
`,co={shift:.5,random:0,centerX:.5,centerY:.5,size:100,angle:0},lo=class{constructor(e={}){this.params={...co,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.element;e.draw({frag:so,uniforms:{src:e.src,center:[t.centerX,t.centerY],resolution:[n||1,r||1],angle:t.angle,size:Math.max(1,t.size),shift:t.shift,random:Math.min(1,Math.max(0,t.random))},target:e.target})}}})),fo,po,mo,ho,go=e((()=>{fo=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 resolution;
uniform int shape;
uniform vec2 cellPx;
uniform float gap;
uniform float colorTrim;
uniform float averageColor;
uniform float dissolve;
uniform float falloff;
uniform float knockout;

vec4 sampleSrc(vec2 uv) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Distance to a pointy-top hexagon's edge.
float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, vec2(0.5, 0.866025)), p.x);
}

// Nearest hexagon in a pointy-top honeycomb: local position (xy) and cell
// center (zw), in grid units.
vec4 hexCoords(vec2 g) {
    vec2 r = vec2(1.0, 1.7320508);
    vec2 h = r * 0.5;
    vec2 a = mod(g, r) - h;
    vec2 b = mod(g - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    return vec4(gv, g - gv);
}

void main(void) {
    vec2 px = uvContent * resolution;
    vec2 g = px / cellPx; // grid units (1 = one cell)
    float gapHalf = gap * 0.5;

    // Per shape: the cell center (grid units) and the coverage mask.
    vec2 centerCell;
    float mask;
    if (shape == 0 || shape == 1) {
        // Rectangle / ellipse on a square grid.
        vec2 id = floor(g);
        centerCell = id + 0.5;
        vec2 lc = g - centerCell;
        float th = 0.5 - gapHalf;
        mask = shape == 0
            ? (max(abs(lc.x), abs(lc.y)) < th ? 1.0 : 0.0)
            : (length(lc) < th ? 1.0 : 0.0);
    } else if (shape == 2) {
        // Pointy-top honeycomb; Voronoi boundary sits at 0.5 for this lattice.
        vec4 hc = hexCoords(g);
        centerCell = hc.zw;
        mask = hexDist(hc.xy) < 0.5 * (1.0 - gap) ? 1.0 : 0.0;
    } else {
        // Right triangles: each square cell is split by a diagonal whose
        // direction flips per cell, tiling the plane with 45° triangles.
        vec2 id = floor(g);
        vec2 lc = g - (id + 0.5);
        float diag = mod(id.x + id.y, 2.0);
        float s = diag < 0.5 ? (lc.x + lc.y) : (lc.x - lc.y);
        float tri = step(0.0, s);
        // Centroid of the selected triangle, for a distinct per-cell color.
        vec2 cen = diag < 0.5
            ? (tri > 0.5 ? vec2(1.0) : vec2(-1.0)) / 6.0
            : (tri > 0.5 ? vec2(1.0, -1.0) : vec2(-1.0, 1.0)) / 6.0;
        centerCell = id + 0.5 + cen;
        float dEdge = 0.5 - max(abs(lc.x), abs(lc.y));
        float dDiag = abs(s) / 1.4142136;
        mask = min(dEdge, dDiag) > gapHalf ? 1.0 : 0.0;
    }

    vec2 centerUv = centerCell * cellPx / resolution;
    vec4 centerCol = sampleSrc(centerUv);

    // Average color: blend the center tap with a 3x3 in-cell average.
    vec4 avg = vec4(0.0);
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 o = vec2(x, y) * cellPx * 0.3 / resolution;
            avg += sampleSrc(centerUv + o);
        }
    }
    avg /= 9.0;
    vec4 col = mix(centerCol, avg, averageColor);

    // Color trim: posterize to fewer levels (more trim = fewer colors).
    float steps = max(1.0, 256.0 / exp2(colorTrim));
    col.rgb = floor(col.rgb * steps) / steps;

    // Dissolve: drop cells by hash, with falloff biasing toward the top.
    float bias = mix(1.0, smoothstep(0.0, 1.0, centerUv.y), falloff);
    if (hash12(centerCell) < dissolve * bias) {
        mask = 0.0;
    }

    if (mask > 0.5) {
        outColor = col;
    } else {
        // Outside the shape / dropped: punch transparency, or fall back
        // to the untouched source when knockout is off.
        outColor = knockout > 0.5 ? vec4(0.0) : sampleSrc(uvContent);
    }
}
`,po={rectangle:0,ellipse:1,hexagon:2,triangle:3},mo={shape:`rectangle`,size:10,stretch:1,gap:0,colorTrim:2,averageColor:.8,dissolve:0,falloff:0,knockout:!0},ho=class{constructor(e={}){this.params={...mo,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.elementPixel,i=Math.max(1,t.size);e.draw({frag:fo,uniforms:{src:e.src,resolution:[Math.max(1,n),Math.max(1,r)],shape:po[t.shape]??0,cellPx:[i*Math.max(.1,t.stretch),i],gap:Math.min(1,Math.max(0,t.gap)),colorTrim:Math.max(0,t.colorTrim),averageColor:Math.min(1,Math.max(0,t.averageColor)),dissolve:Math.min(1,Math.max(0,t.dissolve)),falloff:Math.min(1,Math.max(0,t.falloff)),knockout:+!!t.knockout},target:e.target})}}})),_o,vo,yo,bo=e((()=>{_o=`#version 300 es
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
`,vo={color1:[1,0,0,1],color2:[0,1,0,1],color3:[0,0,1,1],speed:.2},yo=class{constructor(e={}){this.params={...vo,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:_o,uniforms:{src:e.src,time:e.time,color1:this.params.color1,color2:this.params.color2,color3:this.params.color3,speed:this.params.speed},target:e.target})}}})),xo,So,Co,wo=e((()=>{xo=`#version 300 es
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
`,So={intensity:.5,radius:1,power:2},Co=class{constructor(e={}){this.params={...So,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:xo,uniforms:{src:e.src,aspect:(t||1)/(n||1),intensity:this.params.intensity,radius:this.params.radius,power:this.params.power},target:e.target})}}}));function To(e){let t=e.startsWith(`#`)?e.slice(1):e;return(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``)),t.length===6&&(t+=`ff`),t.length===8?[Number.parseInt(t.slice(0,2),16)/255,Number.parseInt(t.slice(2,4),16)/255,Number.parseInt(t.slice(4,6),16)/255,Number.parseInt(t.slice(6,8),16)/255]:[0,0,0,0]}var Eo,Do,Oo,ko=e((()=>{Eo=`#version 300 es
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
`,Do={cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`},Oo=class{constructor(e={}){this.params={...Do,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params;e.draw({frag:Eo,uniforms:{src:e.src,mouseUv:[e.mouse[0]/r,e.mouse[1]/i],elementPx:[r,i],cellSize:a.cellSize,pressRadius:a.pressRadius,press:a.press,flatCells:+!!a.flatCells,seed:a.seed,time:e.time,speed:Math.max(0,a.speed),breathe:Math.max(0,a.breathe),breatheSpeed:Math.max(0,a.breatheSpeed),breatheScale:Math.max(1,a.breatheScale),bgColor:To(a.bgColor)},target:e.target})}}})),Ao,jo,Mo,No,Po=e((()=>{Ve(),Ao=`#version 300 es
precision highp float;
#define TAU 6.28318530718
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform vec2 resolution;
uniform int mode;
uniform float amp;
uniform float freq;
uniform float time;
${Be}

vec4 readTex(vec2 c) {
    c = clamp(c, 0.0, 1.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

void main(void) {
    vec2 uv = uvContent;
    vec2 p = uv - center;
    float r = length(p);

    if (mode == 0) {
        // Sine wave: ripples per axis, centered so both diagonals stay straight.
        uv.x -= sin(p.y * freq * TAU + time) * amp * 0.05;
        uv.y -= sin(p.x * freq * TAU + time) * amp * 0.05;
    } else if (mode == 1) {
        // Twist: swirl that rotates most at the center and unwinds to the edge.
        // aspect scale keeps the field circular and contained in the element.
        vec2 s = resolution / max(resolution.x, resolution.y);
        vec2 tp = (uv - center) * 2.0 * s;
        float t = length(tp) / 1.41421356;
        tp = rot2d(amp * freq * (1.0 - t)) * tp;
        uv = tp / s * 0.5 + center;
    } else if (mode == 2) {
        // Ripple: scale the radius by a cosine of the distance from center.
        p *= 1.0 - cos((r-.5) * freq * 10.0 + time) * amp * 0.2;
        uv = p + center;
    }

    outColor = readTex(uv);
}
`,jo={"sine wave":0,twist:1,ripple:2},Mo={type:`twist`,amplitude:3,frequency:1,centerX:.5,centerY:.5,speed:0},No=class{constructor(e={}){this.params={...Mo,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params;e.draw({frag:Ao,uniforms:{src:e.src,center:[t.centerX,t.centerY],resolution:[e.dims.element[0]||1,e.dims.element[1]||1],mode:jo[t.type]??0,amp:t.amplitude,freq:t.frequency,time:e.time*t.speed},target:e.target})}}})),Fo=e((()=>{se(),be(),Pe(),Re(),Ge(),St(),Dt(),jt(),Qt(),nn(),un(),gn(),bn(),lr(),jr(),Ni(),ea(),oa(),ua(),ma(),Ba(),Wa(),Ja(),Qa(),no(),oo(),uo(),go(),bo(),wo(),ko(),Po()}));export{Le as A,ln as C,Et as D,At as E,ye as M,oe as N,xt as O,hn as S,Zt as T,$i as _,yo as a,cr as b,ao as c,qa as d,Ua as f,aa as g,la as h,Co as i,Ne as j,We as k,to as l,pa as m,No as n,ho as o,za as p,Oo as r,lo as s,Fo as t,Za as u,Mi as v,tn as w,yn as x,Ar as y};