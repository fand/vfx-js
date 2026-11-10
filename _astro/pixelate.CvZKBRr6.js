var e={standard:` .:-=+*#%@`,minimal:` .#`,blocks:` ░▒▓█`,dots:` .·•●`,circles:` ◌○◉●`,detailed:` .'\`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$`},t=`#version 300 es
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
`,n={grid:12,preset:`standard`,font:`monospace`,fontWeight:`normal`,color:[1,1,1,1],background:[0,0,0,0],colorFromSource:!1,invert:!1,dither:0},r=64;function i(e){return Array.isArray(e)?[...e]:Array.from(e)}function a(e){return typeof e==`number`?[e,e]:e}async function o(e,t){let n=typeof document<`u`?document.fonts:void 0;if(n?.load)try{await n.load(`${t} ${r}px ${e}`),await n.ready}catch{}}function s(e,t,n,i){let a=Math.max(1,e.length),o=Math.ceil(Math.sqrt(a)),s=Math.ceil(a/o),c=`${n} ${r}px ${t}`,l=document.createElement(`canvas`),u;if(i&&i>0)u=Math.max(1,Math.round(i*r));else{let t=l.getContext(`2d`);if(u=r,t){t.font=c;let n=0;for(let r of e)n=Math.max(n,t.measureText(r).width);n>0&&(u=Math.max(1,Math.ceil(n)))}}l.width=o*u,l.height=s*r;let d=l.getContext(`2d`);if(d){d.clearRect(0,0,l.width,l.height),d.fillStyle=`#fff`,d.textAlign=`center`,d.textBaseline=`middle`,d.font=c;for(let t=0;t<e.length;t++){let n=t%o,i=Math.floor(t/o),a=n*u+u/2,s=i*r+r/2;d.save(),d.beginPath(),d.rect(n*u,i*r,u,r),d.clip(),d.fillText(e[t],a,s),d.restore()}}return{canvas:l,cols:o,rows:s,cellW:u,cellH:r}}var c=2048,l=256;function u(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement)return[e.naturalWidth||e.width,e.naturalHeight||e.height];let t=e;return[t.width||1,t.height||1]}async function d(e){if(typeof e!=`string`)return e;let t=new Image;t.crossOrigin=`anonymous`,t.src=e;try{await t.decode()}catch{}return t}function f(e){let t=Math.max(1,e.length),n=Math.ceil(Math.sqrt(t)),r=Math.ceil(t/n),i=e.map(u),[a,o]=i[0]??[1,1],s=a/Math.max(1,o),d=Math.max(1,...i.map(e=>e[1])),f=Math.min(l,Math.max(8,Math.round(d))),p=Math.max(1,Math.round(f*s)),m=Math.min(1,c/(n*p),c/(r*f));p=Math.max(1,Math.floor(p*m)),f=Math.max(1,Math.floor(f*m));let h=document.createElement(`canvas`);h.width=n*p,h.height=r*f;let g=h.getContext(`2d`);if(g){g.clearRect(0,0,h.width,h.height);for(let t=0;t<e.length;t++){let[r,a]=i[t],o=Math.min(p/r,f/a),s=r*o,c=a*o,l=t%n*p+(p-s)/2,u=Math.floor(t/n)*f+(f-c)/2;g.drawImage(e[t],l,u,s,c)}}return{canvas:h,cols:n,rows:r,cellW:p,cellH:f}}var p=class{params;#e=null;#t=1;#n=1;#r=1;#i=1;#a=[1,1];#o=!1;#s=null;constructor(e={}){this.params={...n,...e}}setParams(e){Object.assign(this.params,e)}async init(e){typeof document<`u`&&(this.#s=e,await this.#c(e))}async updateAtlas(){this.#s&&await this.#c(this.#s)}async#c(t){let n=this.params.tiles,r;if(n&&n.length>0){let e=await Promise.all(n.map(d));this.#r=e.length,this.#o=!0,r=f(e)}else{n&&n.length===0&&console.warn("[VFX-JS] AsciiEffect: `tiles` is empty; falling back to characters.");let t=i(this.params.chars??e[this.params.preset]);t.length===0&&console.warn(`[VFX-JS] AsciiEffect: empty character ramp; nothing will be rendered.`),this.#r=Math.max(1,t.length),this.#o=!1,await o(this.params.font,this.params.fontWeight),r=s(t,this.params.font,this.params.fontWeight,this.params.charAspect)}let a=this.#e;this.#t=r.cols,this.#n=r.rows,this.#i=r.cellW/r.cellH,this.#a=[r.cellW,r.cellH],this.#e=t.wrapTexture(r.canvas,{autoUpdate:!1,filter:`linear`}),a?.dispose()}render(e){if(!this.#e)return;let[n,r]=e.dims.elementPixel,[i,o]=a(this.params.grid),s=[Math.max(1,i)*e.pixelRatio,Math.max(1,o)*e.pixelRatio];e.draw({frag:t,uniforms:{src:e.src,atlas:this.#e,elementPx:[Math.max(1,n),Math.max(1,r)],cellPx:s,cols:this.#t,rows:this.#n,charCount:this.#r,glyphAspect:this.#i,atlasCellPx:this.#a,tileColor:+!!this.#o,color:this.params.color,background:this.params.background,colorFromSource:+!!this.params.colorFromSource,invert:+!!this.params.invert,dither:Math.min(1,Math.max(0,this.params.dither))},target:e.target})}dispose(){this.#e?.dispose(),this.#e=null,this.#s=null}},m=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
`,h=`
const float PI = 3.141592653589793;
float cc(int k){ return k == 0 ? 0.7071067811865476 : 1.0; }
`,g=`
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
`,_=`
  ivec2 res = textureSize(src, 0);
  ivec2 p   = ivec2(uvSrc * vec2(res));
  ivec2 b   = (p / 8) * 8;
  ivec2 l   = p - b;
`,ee=`${m}
void main(){
  vec4 c = texture(src, uvSrc);
  outColor = vec4(c.rgb * c.a, c.a);
}`,te=`${m}${h}${g}
void main(){
${_}
  vec4 sum = vec4(0.0);
  for (int x = 0; x < 8; x++) {
    vec4 t = texelFetch(src, clamp(b + ivec2(x, l.y), ivec2(0), res - 1), 0);
    vec4 f = (vec4(rgb2ycc(t.rgb), t.a) - vec4(0.5, 0.0, 0.0, 0.5)) * 255.0;
    sum += f * cos(float(2*x+1) * float(l.x) * PI / 16.0);
  }
  outColor = sum * 0.5 * cc(l.x);
}`,v=`${m}${h}
void main(){
${_}
  vec4 sum = vec4(0.0);
  for (int y = 0; y < 8; y++)
    sum += texelFetch(src, clamp(b + ivec2(l.x, y), ivec2(0), res - 1), 0)
         * cos(float(2*y+1) * float(l.y) * PI / 16.0);
  outColor = sum * 0.5 * cc(l.y);
}`,y=`${m}${h}
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
${_}
  vec4 sum = vec4(0.0);
  for (int v = 0; v < 8; v++) {
    int idx = v * 8 + l.x;
    vec4 F  = texelFetch(src, clamp(b + ivec2(l.x, v), ivec2(0), res - 1), 0);
    vec4 q  = vec4(qstep(LQ[idx]), qstep(CQ[idx]), qstep(CQ[idx]), qstep(LQ[idx]));
    sum += cc(v) * round(F / q) * q * cos(float(2*l.y+1) * float(v) * PI / 16.0);
  }
  outColor = sum * 0.5;
}`,b=`${m}${h}${g}
void main(){
${_}
  vec4 sum = vec4(0.0);
  for (int u = 0; u < 8; u++)
    sum += cc(u) * texelFetch(src, clamp(b + ivec2(u, l.y), ivec2(0), res - 1), 0)
         * cos(float(2*l.x+1) * float(u) * PI / 16.0);
  sum = sum * 0.5 / 255.0 + vec4(0.5, 0.0, 0.0, 0.5);
  outColor = clamp(vec4(ycc2rgb(sum.xyz), sum.w), 0.0, 1.0);
}`,x=`${m}${g}
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
}`,S=[`coeff`,`tmp`,`sub`,`a`,`b`],ne=class{quality;iterations;downscale;lowRes=null;constructor({quality:e=8,iterations:t=3,downscale:n=1}={}){this.quality=e,this.iterations=t,this.downscale=n}ensureLowRes(e,t,n){if(this.lowRes&&this.lowRes.w===t&&this.lowRes.h===n)return this.lowRes;this.disposeLowRes();let r=[t,n];return this.lowRes={w:t,h:n,coeff:e.createRenderTarget({float:!0,size:r}),tmp:e.createRenderTarget({float:!0,size:r}),sub:e.createRenderTarget({size:r}),a:e.createRenderTarget({size:r}),b:e.createRenderTarget({size:r})},this.lowRes}disposeLowRes(){if(this.lowRes){for(let e of S)this.lowRes[e].dispose();this.lowRes=null}}render(e){let t=Math.max(1,Math.min(10,this.iterations|0)),n=Math.max(1,Math.min(100,this.quality)),r=n<50?5e3/n:200-2*n,i=Math.max(.02,Math.min(1,this.downscale)),[a,o]=e.dims.element,s=Math.max(1,Math.floor(a*i)),c=Math.max(1,Math.floor(o*i)),l=this.ensureLowRes(e,s,c);e.draw({frag:ee,uniforms:{src:e.src},target:l.a});let u=l.a;for(let n=0;n<t;n++){e.draw({frag:x,uniforms:{src:u},target:l.sub}),e.draw({frag:te,uniforms:{src:l.sub},target:l.tmp}),e.draw({frag:v,uniforms:{src:l.tmp},target:l.coeff}),e.draw({frag:y,uniforms:{src:l.coeff,uS:r},target:l.tmp});let t=n%2==0?l.b:l.a;e.draw({frag:b,uniforms:{src:l.tmp},target:t}),u=t}e.blit(u,e.target)}dispose(){this.disposeLowRes()}};function C(e,t){if(e===`fullscreen`)return t.canvasRect;let n=e*t.pixelRatio,[,,r,i]=t.contentRect;return[-n,-n,r+2*n,i+2*n]}var re=`#version 300 es
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
`,w=`#version 300 es
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
`,ie=`#version 300 es
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
`,T=`#version 300 es
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
`,E={threshold:.7,softness:.1,intensity:1.2,scatter:.7,pad:50,dither:0,edgeFade:.02},D=.5,O=class{params;#e=null;#t=[];#n=[];#r=!1;#i=0;#a=0;constructor(e={}){this.params={...E,...e}}setParams(e){Object.assign(this.params,e)}init(e){this.#e=e.createRenderTarget({float:!0})}render(e){if(!this.#e)return;let{threshold:t,softness:n,intensity:r}=this.params,i=Math.min(Math.max(this.params.scatter,0),1),a=Math.max(0,this.params.dither),o=Math.max(1e-6,this.params.edgeFade);(this.#e.width!==this.#i||this.#e.height!==this.#a)&&(this.#t.length=0,this.#n.length=0,this.#r=!1,this.#i=this.#e.width,this.#a=this.#e.height),this.#o(e,this.#e.width,this.#e.height);let s=this.#t.length;if(s===0)return;e.draw({frag:re,uniforms:{src:e.src,threshold:t,softness:n,edgeFade:o},target:this.#e}),e.draw({frag:w,uniforms:{src:this.#e,texelSize:[1/this.#e.width,1/this.#e.height],karis:1},target:this.#t[0]});for(let t=1;t<s;t++){let n=this.#t[t-1];e.draw({frag:w,uniforms:{src:n,texelSize:[1/n.width,1/n.height],karis:0},target:this.#t[t]})}let c=this.#e.width,l=this.#e.height,u=1+i*Math.max(0,s-1),d=e=>Math.min(1,Math.max(0,u-e));for(let t=s-2;t>=0;t--){let n=t===s-2?this.#t[s-1]:this.#n[t+1],r=2**(t+2),i=t===s-2?d(s-1):1;e.draw({frag:ie,uniforms:{srcSmall:n,srcLarge:this.#t[t],texelSize:[D*r/c,D*r/l],weightLarge:d(t),weightSmall:i},target:this.#n[t]})}let f=s>=2?this.#n[0]:this.#t[0],p=r/Math.max(1,u);e.draw({frag:T,uniforms:{src:e.src,bloom:f,texelSize:[D*2/c,D*2/l],intensity:p,dither:a,edgeFade:o},target:e.target})}outputRect(e){return C(this.params.pad,e)}dispose(){this.#e=null,this.#t.length=0,this.#n.length=0,this.#r=!1,this.#i=0,this.#a=0}#o(e,t,n){if(this.#r)return;let r=Math.max(1,Math.floor(t/2)),i=Math.max(1,Math.floor(n/2));for(let t=0;t<8;t++){this.#t.push(e.createRenderTarget({size:[r,i],float:!0}));let t=Math.max(1,Math.floor(r/2)),n=Math.max(1,Math.floor(i/2));if(t===r&&n===i)break;r=t,i=n}for(let t=0;t<this.#t.length-1;t++)this.#n.push(e.createRenderTarget({size:[this.#t[t].width,this.#t[t].height],float:!0}));this.#r=!0}};function k(e){let t=e.startsWith(`#`)?e.slice(1):e;return(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``)),t.length===6&&(t+=`ff`),t.length===8?[Number.parseInt(t.slice(0,2),16)/255,Number.parseInt(t.slice(2,4),16)/255,Number.parseInt(t.slice(4,6),16)/255,Number.parseInt(t.slice(6,8),16)/255]:[0,0,0,0]}var A=`
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
`,j=`#version 300 es
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
`,M={bayer2:0,bayer4:1,bayer8:2,bayer16:3,blueNoise:4,threshold:5},N={style:`bayer16`,size:2,levels:3,brightness:1,contrast:1,mono:!1,monoColor:`#ffffff`},P=class{params;constructor(e={}){this.params={...N,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.elementPixel;e.draw({frag:j,uniforms:{src:e.src,resolution:[Math.max(1,n),Math.max(1,r)],style:M[t.style]??5,size:Math.max(1,t.size),levels:Math.max(2,t.levels),brightness:t.brightness,contrast:t.contrast,mono:+!!t.mono,monoColor:k(t.monoColor)},target:e.target})}},F=`#version 300 es
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

    outColor *= color.a;
}
`,I={color1:[1,0,0,1],color2:[0,0,1,1],speed:.2},L=class{params;constructor(e={}){this.params={...I,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:F,uniforms:{src:e.src,time:e.time,color1:this.params.color1,color2:this.params.color2,speed:this.params.speed},target:e.target})}},R=`#version 300 es
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
`,z={speed:1,intensity:1},B=class{params;constructor(e={}){this.params={...z,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:R,uniforms:{src:e.src,time:e.time*this.params.speed,intensity:this.params.intensity},target:e.target})}},V={pure:{cyan:[0,1,1,1],magenta:[1,0,1,1],yellow:[1,1,0,1],black:[0,0,0,1],red:[1,0,0,1],green:[0,1,0,1],blue:[0,0,1,1]},newsprint:{cyan:[.15,.73,.88,1],magenta:[.88,.12,.55,1],yellow:[.97,.93,.08,1],black:[.1,.1,.1,1]},fogra51:{cyan:[0,.525,.765,1],magenta:[.827,0,.486,1],yellow:[.984,.91,0,1],black:[.145,.145,.145,1]},swop:{cyan:[0,.557,.769,1],magenta:[.827,.02,.478,1],yellow:[.984,.902,.027,1],black:[.169,.169,.169,1]}},H=`#version 300 es
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
`,U={...V.pure,...V.newsprint},W={gridSize:10,dotSize:1,smoothing:.15,angle:0,mode:`rgb`,blackAmount:1,trimEdge:!0,background:[0,0,0,0],inkPalette:U},G=class{params;constructor(e={}){this.params={...W,...e,inkPalette:{...U,...e.inkPalette??{}}}}setParams(e){Object.assign(this.params,e)}setInkPreset(e){Object.assign(this.params.inkPalette,V[e])}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params,o=a.inkPalette;e.draw({frag:H,uniforms:{src:e.src,srcSizePx:[e.src.width||1,e.src.height||1],elementPx:[r,i],gridSize:Math.max(1,a.gridSize),dotSize:Math.max(0,a.dotSize),smoothing:Math.max(0,Math.min(1,a.smoothing)),angle:a.angle,blackAmount:Math.max(0,Math.min(1,a.blackAmount)),ymck:+(a.mode===`cmyk`),trimEdge:+!!a.trimEdge,background:a.background,cInk:o.cyan,mInk:o.magenta,yInk:o.yellow,kInk:o.black,rInk:o.red,gInk:o.green,bInk:o.blue},target:e.target})}},K=`#version 300 es
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
`,q=`
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
`,J=`#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D src;
uniform float threshold;   // highlight cutoff
uniform float highlightClamp; // upper clamp on source highlight brightness
uniform int dim;
${q}
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
`,ae=`#version 300 es
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
${q}
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
`,oe=`#version 300 es
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
`,se=`#version 300 es
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
`,ce=256,le={streaks:2,angle:0,length:300,width:3,falloff:2,threshold:.9,highlightClamp:1,intensity:.5,tint:[1,1,1],dispersion:-.3,fringe:.5,fringeCount:1.5,density:256,resolution:.2,pad:300},ue=class{params;#e=null;#t=0;#n=null;#r=null;#i=0;#a=0;constructor(e={}){this.params={...le,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=Math.max(2,Math.floor(this.params.density));this.#e&&this.#t===t||(this.#e&&e.releaseGeometry(this.#e),this.#e=de(t),this.#t=t,this.#r?.dispose(),this.#r=e.createRenderTarget({size:[t,t],float:!0,filter:`nearest`}));let n=this.#r;if(!n)return;let r=this.outputRect(e.dims),i=e.dims.srcRect,a=e.dims.pixelRatio,o=Math.min(Math.max(this.params.resolution,.1),1),s=Math.max(2,Math.round(r[2]*o)),c=Math.max(2,Math.round(r[3]*o));(s!==this.#i||c!==this.#a)&&(this.#n?.dispose(),this.#n=e.createRenderTarget({size:[s,c],float:!0,filter:`linear`}),this.#i=s,this.#a=c);let l=this.#n;if(!l)return;e.draw({frag:K,target:e.target,uniforms:{src:e.src}}),e.draw({frag:J,target:n,blend:`none`,uniforms:{src:e.src,threshold:this.params.threshold,highlightClamp:Math.max(this.params.threshold+.001,this.params.highlightClamp),dim:t}}),e.clear(l);let u=Math.max(1,Math.round(this.params.streaks)),d=this.params.length*a,f=this.params.width*a,p=this.params.angle*Math.PI/180;for(let a=0;a<u;a++){let o=p+a*Math.PI*2/u;e.draw({vert:ae,frag:oe,geometry:this.#e,blend:`additive`,target:l,uniforms:{highlight:n,dim:t,srcRect:[i[0],i[1],i[2],i[3]],dstRect:[r[0],r[1],r[2],r[3]],angle:o,lengthPx:d,widthPx:f,falloff:this.params.falloff,dispersion:this.params.dispersion,fringe:this.params.fringe,fringeCount:this.params.fringeCount}})}let m=(ce/t)**2;e.draw({frag:se,target:e.target,blend:`additive`,uniforms:{accum:l,intensity:this.params.intensity,norm:m/(u*.9),tint:[this.params.tint[0],this.params.tint[1],this.params.tint[2]]}})}outputRect(e){return C(this.params.pad,e)}dispose(){this.#e=null,this.#t=0,this.#n?.dispose(),this.#n=null,this.#r?.dispose(),this.#r=null,this.#i=0,this.#a=0}};function de(e){return{attributes:{position:{data:new Float32Array([0,-1,1,-1,1,1,0,1]),itemSize:2}},indices:new Uint16Array([0,1,2,0,2,3]),instanceCount:e*e}}var Y=8,fe=`#version 300 es
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
uniform vec4 colorStops[${Y}]; // trail-colour gradient stops (sRGB), head→tail
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
`,X={grid:[12,16],font:`monospace`,fontWeight:`normal`,color:[.18,1,.36,1],headColor:[.85,1,.9,1],background:[0,0,0,1],speed:10,tail:18,tailFade:1,birthRate:.6,glyphSpeed:8,brightness:1,contrast:1,invert:!1,seed:0},Z=64;function pe(e){return Array.isArray(e)?[...e]:Array.from(e)}function me(e){return typeof e==`number`?[e,e]:e}async function he(e,t){let n=typeof document<`u`?document.fonts:void 0;if(n?.load)try{await n.load(`${t} ${Z}px ${e}`),await n.ready}catch{}}function ge(e,t,n,r){let i=Math.max(1,e.length),a=Math.ceil(Math.sqrt(i)),o=Math.ceil(i/a),s=`${n} ${Z}px ${t}`,c=document.createElement(`canvas`),l;if(r&&r>0)l=Math.max(1,Math.round(r*Z));else{let t=c.getContext(`2d`);if(l=Z,t){t.font=s;let n=0;for(let r of e)n=Math.max(n,t.measureText(r).width);n>0&&(l=Math.max(1,Math.ceil(n)))}}c.width=a*l,c.height=o*Z;let u=c.getContext(`2d`);if(u){u.clearRect(0,0,c.width,c.height),u.fillStyle=`#fff`,u.textAlign=`center`,u.textBaseline=`middle`,u.font=s;for(let t=0;t<e.length;t++){let n=t%a,r=Math.floor(t/a),i=n*l+l/2,o=r*Z+Z/2;u.save(),u.beginPath(),u.rect(n*l,r*Z,l,Z),u.clip(),u.fillText(e[t],i,o),u.restore()}}return{canvas:c,cols:a,rows:o,cellW:l,cellH:Z}}function _e(e){return Array.isArray(e[0])}function Q(e){return _e(e)?e.length>0?e:[X.color]:[e]}function ve(e){let t=Q(e).slice(0,Y),n=new Float32Array(32);for(let e=0;e<t.length;e++)n.set(t[e],e*4);return{data:n,count:t.length}}function $(e,t){if(t.grid!==void 0){let[n,r]=me(t.grid);e.grid=[Math.max(1,n),Math.max(1,r)]}t.glyphs!==void 0&&(e.glyphs=t.glyphs),t.font!==void 0&&(e.font=t.font),t.fontWeight!==void 0&&(e.fontWeight=t.fontWeight),t.charAspect!==void 0&&(e.charAspect=t.charAspect),t.color!==void 0&&(e.stops=ve(t.color)),t.headColor!==void 0&&(e.headColor=t.headColor),t.background!==void 0&&(e.background=t.background),t.speed!==void 0&&(e.speed=t.speed),t.tail!==void 0&&(e.tail=Math.max(1,t.tail)),t.tailFade!==void 0&&(e.tailFade=Math.min(1,Math.max(0,t.tailFade))),t.birthRate!==void 0&&(e.birthRate=Math.max(0,t.birthRate)),t.glyphSpeed!==void 0&&(e.glyphSpeed=Math.max(0,t.glyphSpeed)),t.brightness!==void 0&&(e.brightness=Math.max(0,t.brightness)),t.contrast!==void 0&&(e.contrast=Math.max(0,t.contrast)),t.invert!==void 0&&(e.invert=+!!t.invert),t.seed!==void 0&&(e.seed=t.seed)}function ye(e){let t={};return $(t,e),t}var be=class{#e;#t=null;#n=1;#r=1;#i=1;#a=1;#o=null;constructor(e={}){this.#e=ye({...X,...e})}setParams(e){$(this.#e,e)}async init(e){typeof document<`u`&&(this.#o=e,await this.#s(e))}async updateAtlas(){this.#o&&await this.#s(this.#o)}async#s(e){let t=pe(this.#e.glyphs??`ﾊﾋﾌﾍﾎｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789Z:."=*+-<>|`);t.length===0&&console.warn(`[VFX-JS] MatrixEffect: empty glyph pool; nothing will be rendered.`),this.#i=Math.max(1,t.length),await he(this.#e.font,this.#e.fontWeight);let n=ge(t,this.#e.font,this.#e.fontWeight,this.#e.charAspect),r=this.#t;this.#n=n.cols,this.#r=n.rows,this.#a=n.cellW/n.cellH,this.#t=e.wrapTexture(n.canvas,{autoUpdate:!1,filter:`linear`}),r?.dispose()}render(e){if(!this.#t)return;let t=this.#e,[n,r]=e.dims.elementPixel,i=[t.grid[0]*e.pixelRatio,t.grid[1]*e.pixelRatio];e.draw({frag:fe,uniforms:{src:e.src,atlas:this.#t,elementPx:[Math.max(1,n),Math.max(1,r)],cellPx:i,cols:this.#n,rows:this.#r,glyphCount:this.#i,glyphAspect:this.#a,time:e.time,colorStops:t.stops.data,colorStopCount:t.stops.count,headColor:t.headColor,background:t.background,speed:t.speed,tail:t.tail,tailFade:t.tailFade,birthRate:t.birthRate,glyphSpeed:t.glyphSpeed,brightness:t.brightness,contrast:t.contrast,invert:t.invert,seed:t.seed},target:e.target})}dispose(){this.#t?.dispose(),this.#t=null,this.#o=null}},xe=`#version 300 es
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
`,Se={size:10},Ce=class{params;constructor(e={}){this.params={...Se,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element,{size:r}=this.params;e.draw({frag:xe,uniforms:{src:e.src,cellUv:[r/(t||1),r/(n||1)]},target:e.target})}};export{B as a,A as c,ne as d,p as f,G as i,k as l,be as n,L as o,ue as r,P as s,Ce as t,O as u};