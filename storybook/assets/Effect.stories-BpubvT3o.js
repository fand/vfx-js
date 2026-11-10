import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./logo-640w-20p-22Elz6NL.js";import{a as r,c as i,d as a,f as o,i as s,l as c,n as l,p as u,s as d,t as f,u as p}from"./utils-B1igQqx3.js";import"./preset-DFGAZ5Mi.js";import{a as m,i as h,n as ee,o as g,r as te,t as ne}from"./scanline-DhJLfW1t.js";import{r as re,t as ie}from"./_capture-BqAWwGRs.js";import{n as ae,t as oe}from"./pixelsort-jKoKAFMD.js";import{n as se,t as ce}from"./bbb-BpWt09Zd.js";import{n as _,t as le}from"./jellyfish-DtC6VyHr.js";import{n as v,t as ue}from"./pigeon-Dic8r3mQ.js";function de(e){return Array.isArray(e)?[...e]:Array.from(e)}function fe(e){return typeof e==`number`?[e,e]:e}async function pe(e,t){let n=typeof document<`u`?document.fonts:void 0;if(n?.load)try{await n.load(`${t} ${y}px ${e}`),await n.ready}catch{}}function me(e,t,n,r){let i=Math.max(1,e.length),a=Math.ceil(Math.sqrt(i)),o=Math.ceil(i/a),s=`${n} ${y}px ${t}`,c=document.createElement(`canvas`),l;if(r&&r>0)l=Math.max(1,Math.round(r*y));else{let t=c.getContext(`2d`);if(l=y,t){t.font=s;let n=0;for(let r of e)n=Math.max(n,t.measureText(r).width);n>0&&(l=Math.max(1,Math.ceil(n)))}}c.width=a*l,c.height=o*y;let u=c.getContext(`2d`);if(u){u.clearRect(0,0,c.width,c.height),u.fillStyle=`#fff`,u.textAlign=`center`,u.textBaseline=`middle`,u.font=s;for(let t=0;t<e.length;t++){let n=t%a,r=Math.floor(t/a),i=n*l+l/2,o=r*y+y/2;u.save(),u.beginPath(),u.rect(n*l,r*y,l,y),u.clip(),u.fillText(e[t],i,o),u.restore()}}return{canvas:c,cols:a,rows:o,cellW:l,cellH:y}}function he(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement)return[e.naturalWidth||e.width,e.naturalHeight||e.height];let t=e;return[t.width||1,t.height||1]}async function ge(e){if(typeof e!=`string`)return e;let t=new Image;t.crossOrigin=`anonymous`,t.src=e;try{await t.decode()}catch{}return t}function _e(e){let t=Math.max(1,e.length),n=Math.ceil(Math.sqrt(t)),r=Math.ceil(t/n),i=e.map(he),[a,o]=i[0]??[1,1],s=a/Math.max(1,o),c=Math.max(1,...i.map(e=>e[1])),l=Math.min(Se,Math.max(8,Math.round(c))),u=Math.max(1,Math.round(l*s)),d=Math.min(1,xe/(n*u),xe/(r*l));u=Math.max(1,Math.floor(u*d)),l=Math.max(1,Math.floor(l*d));let f=document.createElement(`canvas`);f.width=n*u,f.height=r*l;let p=f.getContext(`2d`);if(p){p.clearRect(0,0,f.width,f.height);for(let t=0;t<e.length;t++){let[r,a]=i[t],o=Math.min(u/r,l/a),s=r*o,c=a*o,d=t%n*u+(u-s)/2,f=Math.floor(t/n)*l+(l-c)/2;p.drawImage(e[t],d,f,s,c)}}return{canvas:f,cols:n,rows:r,cellW:u,cellH:l}}var ve,ye,be,y,xe,Se,Ce;function we(){return(we=e((()=>{ve={standard:` .:-=+*#%@`,minimal:` .#`,blocks:` ░▒▓█`,dots:` .·•●`,circles:` ◌○◉●`,detailed:` .'\`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$`},ye=`#version 300 es
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
`,be={grid:12,preset:`standard`,font:`monospace`,fontWeight:`normal`,color:[1,1,1,1],background:[0,0,0,0],colorFromSource:!1,invert:!1,dither:0},y=64,xe=2048,Se=256,Ce=class{params;#e=null;#t=1;#n=1;#r=1;#i=1;#a=[1,1];#o=!1;#s=null;constructor(e={}){this.params={...be,...e}}setParams(e){Object.assign(this.params,e)}async init(e){typeof document<`u`&&(this.#s=e,await this.#c(e))}async updateAtlas(){this.#s&&await this.#c(this.#s)}async#c(e){let t=this.params.tiles,n;if(t&&t.length>0){let e=await Promise.all(t.map(ge));this.#r=e.length,this.#o=!0,n=_e(e)}else{t&&t.length===0&&console.warn("[VFX-JS] AsciiEffect: `tiles` is empty; falling back to characters.");let e=de(this.params.chars??ve[this.params.preset]);e.length===0&&console.warn(`[VFX-JS] AsciiEffect: empty character ramp; nothing will be rendered.`),this.#r=Math.max(1,e.length),this.#o=!1,await pe(this.params.font,this.params.fontWeight),n=me(e,this.params.font,this.params.fontWeight,this.params.charAspect)}let r=this.#e;this.#t=n.cols,this.#n=n.rows,this.#i=n.cellW/n.cellH,this.#a=[n.cellW,n.cellH],this.#e=e.wrapTexture(n.canvas,{autoUpdate:!1,filter:`linear`}),r?.dispose()}render(e){if(!this.#e)return;let[t,n]=e.dims.elementPixel,[r,i]=fe(this.params.grid),a=[Math.max(1,r)*e.pixelRatio,Math.max(1,i)*e.pixelRatio];e.draw({frag:ye,uniforms:{src:e.src,atlas:this.#e,elementPx:[Math.max(1,t),Math.max(1,n)],cellPx:a,cols:this.#t,rows:this.#n,charCount:this.#r,glyphAspect:this.#i,atlasCellPx:this.#a,tileColor:+!!this.#o,color:this.params.color,background:this.params.background,colorFromSource:+!!this.params.colorFromSource,invert:+!!this.params.invert,dither:Math.min(1,Math.max(0,this.params.dither))},target:e.target})}dispose(){this.#e?.dispose(),this.#e=null,this.#s=null}}})))()}var b,Te,Ee,De,Oe,ke,Ae,je,Me,Ne,Pe,Fe;function Ie(){return(Ie=e((()=>{b=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
`,Te=`
const float PI = 3.141592653589793;
float cc(int k){ return k == 0 ? 0.7071067811865476 : 1.0; }
`,Ee=`
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
`,De=`
  ivec2 res = textureSize(src, 0);
  ivec2 p   = ivec2(uvSrc * vec2(res));
  ivec2 b   = (p / 8) * 8;
  ivec2 l   = p - b;
`,Oe=`${b}
void main(){
  vec4 c = texture(src, uvSrc);
  outColor = vec4(c.rgb * c.a, c.a);
}`,ke=`${b}${Te}${Ee}
void main(){
${De}
  vec4 sum = vec4(0.0);
  for (int x = 0; x < 8; x++) {
    vec4 t = texelFetch(src, clamp(b + ivec2(x, l.y), ivec2(0), res - 1), 0);
    vec4 f = (vec4(rgb2ycc(t.rgb), t.a) - vec4(0.5, 0.0, 0.0, 0.5)) * 255.0;
    sum += f * cos(float(2*x+1) * float(l.x) * PI / 16.0);
  }
  outColor = sum * 0.5 * cc(l.x);
}`,Ae=`${b}${Te}
void main(){
${De}
  vec4 sum = vec4(0.0);
  for (int y = 0; y < 8; y++)
    sum += texelFetch(src, clamp(b + ivec2(l.x, y), ivec2(0), res - 1), 0)
         * cos(float(2*y+1) * float(l.y) * PI / 16.0);
  outColor = sum * 0.5 * cc(l.y);
}`,je=`${b}${Te}
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
${De}
  vec4 sum = vec4(0.0);
  for (int v = 0; v < 8; v++) {
    int idx = v * 8 + l.x;
    vec4 F  = texelFetch(src, clamp(b + ivec2(l.x, v), ivec2(0), res - 1), 0);
    vec4 q  = vec4(qstep(LQ[idx]), qstep(CQ[idx]), qstep(CQ[idx]), qstep(LQ[idx]));
    sum += cc(v) * round(F / q) * q * cos(float(2*l.y+1) * float(v) * PI / 16.0);
  }
  outColor = sum * 0.5;
}`,Me=`${b}${Te}${Ee}
void main(){
${De}
  vec4 sum = vec4(0.0);
  for (int u = 0; u < 8; u++)
    sum += cc(u) * texelFetch(src, clamp(b + ivec2(u, l.y), ivec2(0), res - 1), 0)
         * cos(float(2*l.x+1) * float(u) * PI / 16.0);
  sum = sum * 0.5 / 255.0 + vec4(0.5, 0.0, 0.0, 0.5);
  outColor = clamp(vec4(ycc2rgb(sum.xyz), sum.w), 0.0, 1.0);
}`,Ne=`${b}${Ee}
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
}`,Pe=[`coeff`,`tmp`,`sub`,`a`,`b`],Fe=class{quality;iterations;downscale;lowRes=null;constructor({quality:e=8,iterations:t=3,downscale:n=1}={}){this.quality=e,this.iterations=t,this.downscale=n}ensureLowRes(e,t,n){if(this.lowRes&&this.lowRes.w===t&&this.lowRes.h===n)return this.lowRes;this.disposeLowRes();let r=[t,n];return this.lowRes={w:t,h:n,coeff:e.createRenderTarget({float:!0,size:r}),tmp:e.createRenderTarget({float:!0,size:r}),sub:e.createRenderTarget({size:r}),a:e.createRenderTarget({size:r}),b:e.createRenderTarget({size:r})},this.lowRes}disposeLowRes(){if(this.lowRes){for(let e of Pe)this.lowRes[e].dispose();this.lowRes=null}}render(e){let t=Math.max(1,Math.min(10,this.iterations|0)),n=Math.max(1,Math.min(100,this.quality)),r=n<50?5e3/n:200-2*n,i=Math.max(.02,Math.min(1,this.downscale)),[a,o]=e.dims.element,s=Math.max(1,Math.floor(a*i)),c=Math.max(1,Math.floor(o*i)),l=this.ensureLowRes(e,s,c);e.draw({frag:Oe,uniforms:{src:e.src},target:l.a});let u=l.a;for(let n=0;n<t;n++){e.draw({frag:Ne,uniforms:{src:u},target:l.sub}),e.draw({frag:ke,uniforms:{src:l.sub},target:l.tmp}),e.draw({frag:Ae,uniforms:{src:l.tmp},target:l.coeff}),e.draw({frag:je,uniforms:{src:l.coeff,uS:r},target:l.tmp});let t=n%2==0?l.b:l.a;e.draw({frag:Me,uniforms:{src:l.tmp},target:t}),u=t}e.blit(u,e.target)}dispose(){this.disposeLowRes()}}})))()}var Le,Re,ze;function Be(){return(Be=e((()=>{Le=`#version 300 es
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
`,Re={intensity:.3,radius:0,power:2},ze=class{params;constructor(e={}){this.params={...Re,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:Le,uniforms:{src:e.src,aspect:(t||1)/(n||1),intensity:this.params.intensity,radius:this.params.radius,power:this.params.power},target:e.target})}}})))()}function Ve(e){let t=e.startsWith(`#`)?e.slice(1):e;return(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``)),t.length===6&&(t+=`ff`),t.length===8?[Number.parseInt(t.slice(0,2),16)/255,Number.parseInt(t.slice(2,4),16)/255,Number.parseInt(t.slice(4,6),16)/255,Number.parseInt(t.slice(6,8),16)/255]:[0,0,0,0]}var He;function x(){return(x=e((()=>{He=`
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
`})))()}var Ue,We,Ge;function Ke(){return(Ke=e((()=>{x(),Ue=`#version 300 es
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
`,We={threshold:.2,thickness:3,intensity:4,opacity:0,color1:`#ff0000`,color2:`#0000ff`,background:`#000000`},Ge=class{params;constructor(e={}){this.params={...We,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.elementPixel;e.draw({frag:Ue,uniforms:{src:e.src,resolution:[Math.max(1,n),Math.max(1,r)],threshold:t.threshold,thickness:Math.max(.5,t.thickness),intensity:Math.max(0,t.intensity),opacity:Math.min(1,Math.max(0,t.opacity)),color1:Ve(t.color1),color2:Ve(t.color2),background:Ve(t.background)},target:e.target})}}})))()}var qe,Je,Ye,Xe;function Ze(){return(Ze=e((()=>{x(),qe=`#version 300 es
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
`,Je={bayer2:0,bayer4:1,bayer8:2,bayer16:3,blueNoise:4,threshold:5},Ye={style:`bayer16`,size:2,levels:3,brightness:1,contrast:1,mono:!1,monoColor:`#ffffff`},Xe=class{params;constructor(e={}){this.params={...Ye,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.elementPixel;e.draw({frag:qe,uniforms:{src:e.src,resolution:[Math.max(1,n),Math.max(1,r)],style:Je[t.style]??5,size:Math.max(1,t.size),levels:Math.max(2,t.levels),brightness:t.brightness,contrast:t.contrast,mono:+!!t.mono,monoColor:Ve(t.monoColor)},target:e.target})}}})))()}var Qe,$e,et;function tt(){return(tt=e((()=>{Qe=`#version 300 es
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
`,$e={color1:[1,0,0,1],color2:[0,0,1,1],speed:.2},et=class{params;constructor(e={}){this.params={...$e,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:Qe,uniforms:{src:e.src,time:e.time,color1:this.params.color1,color2:this.params.color2,speed:this.params.speed},target:e.target})}}})))()}var nt,rt,it,at,ot,st,ct,lt,ut,dt;function ft(){return(ft=e((()=>{nt=`#version 300 es
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
`,rt=`#version 300 es
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
`,it=`#version 300 es
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
`,at=`#version 300 es
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
`,ot=`#version 300 es
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
`,st=`#version 300 es
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
`,ct=`#version 300 es
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
`,lt=`#version 300 es
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
`,ut={simSize:[256,256],pressureIterations:1,curlStrength:13,velocityDissipation:.6,densityDissipation:.65,splatForce:6e3,splatRadius:.002,dyeSplatRadius:.001,dyeSplatIntensity:.005,showDye:!1},dt=class{params;#e=null;#t=null;#n=null;#r=null;#i=null;#a=null;#o=null;#s=null;#c=[0,0];#l=!1;constructor(e={}){this.params={...ut,...e}}init(e){let t=this.params.simSize,n={size:t,float:!0};this.#e=e.createRenderTarget(n),this.#t=e.createRenderTarget(n),this.#n=e.createRenderTarget(n),this.#r=e.createRenderTarget(n),this.#i=e.createRenderTarget(n),this.#a=e.createRenderTarget(n),this.#o=e.createRenderTarget({size:t,float:!0,persistent:!0}),this.#s=e.createRenderTarget({float:!0,persistent:!0})}render(e){if(!this.#e||!this.#t||!this.#n||!this.#r||!this.#i||!this.#a||!this.#o||!this.#s)return;let{simSize:t,pressureIterations:n,curlStrength:r,velocityDissipation:i,densityDissipation:a,splatForce:o,splatRadius:s,dyeSplatRadius:c,dyeSplatIntensity:l,showDye:u}=this.params,d=[1/t[0],1/t[1]],[f,p]=e.dims.elementPixel,m=f/p,h=[e.mouse[0]/f,e.mouse[1]/p],ee=this.#l?[h[0]-this.#c[0],h[1]-this.#c[1]]:[0,0];this.#c=h,this.#l=!0,e.draw({frag:nt,uniforms:{velocity:this.#o,simTexel:d},target:this.#e}),e.draw({frag:rt,uniforms:{velocity:this.#o,curl:this.#e,simTexel:d,aspect:m,mouseUv:h,mouseDeltaUv:ee,curlStrength:r,splatForce:o,splatRadius:s},target:this.#t}),e.draw({frag:it,uniforms:{vortVel:this.#t,simTexel:d},target:this.#n}),e.clear(this.#r);let g=this.#r,te=this.#i;for(let t=0;t<n;t++){e.draw({frag:at,uniforms:{pressure:g,divergence:this.#n,simTexel:d},target:te});let t=g;g=te,te=t}e.draw({frag:ot,uniforms:{vortVel:this.#t,pressure:g,simTexel:d},target:this.#a}),e.draw({frag:st,uniforms:{projVel:this.#a,simTexel:d,velocityDissipation:i},target:this.#o}),e.draw({frag:ct,uniforms:{velocity:this.#o,dye:this.#s,time:e.time,aspect:m,mouseUv:h,mouseDeltaUv:ee,simSize:t,densityDissipation:a,dyeSplatRadius:c,dyeSplatIntensity:l},target:this.#s}),e.draw({frag:lt,uniforms:{src:e.src,dye:this.#s,velocity:this.#o,simSize:t,showDye:+!!u,time:e.time},target:e.target})}dispose(){this.#e=null,this.#t=null,this.#n=null,this.#r=null,this.#i=null,this.#a=null,this.#o=null,this.#s=null,this.#l=!1}}})))()}var pt,mt,ht;function gt(){return(gt=e((()=>{pt=`#version 300 es
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
`,mt={speed:1,intensity:1},ht=class{params;constructor(e={}){this.params={...mt,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:pt,uniforms:{src:e.src,time:e.time*this.params.speed,intensity:this.params.intensity},target:e.target})}}})))()}var _t,vt,yt,bt,xt,St;function Ct(){return(Ct=e((()=>{x(),_t=8,vt=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec3 colors[${_t}];
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
`,yt={none:0,repeat:1,mirror:2},bt={srgb:0,linear:1,oklab:2},xt={colors:[`#bbee00`,`#3aa0ff`,`#000000`],scatter:0,offset:0,repeat:`mirror`,frequency:1,mixSpace:`srgb`,speed:0},St=class{params;constructor(e={}){this.params={...xt,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,n=t.colors.length>=2?t.colors:xt.colors,r=Math.min(_t,n.length),i=new Float32Array(24);for(let e=0;e<_t;e++){let[t,a,o]=Ve(n[Math.min(e,r-1)]);i[e*3]=t,i[e*3+1]=a,i[e*3+2]=o}e.draw({frag:vt,uniforms:{src:e.src,colors:i,colorCount:r,scatter:Math.max(0,t.scatter),offset:t.offset,repeatType:yt[t.repeat]??0,frequency:t.frequency,mixSpace:bt[t.mixSpace]??0,time:e.time*t.speed},target:e.target})}}})))()}var wt,Tt,Et,Dt,Ot;function kt(){return(kt=e((()=>{wt={pure:{cyan:[0,1,1,1],magenta:[1,0,1,1],yellow:[1,1,0,1],black:[0,0,0,1],red:[1,0,0,1],green:[0,1,0,1],blue:[0,0,1,1]},newsprint:{cyan:[.15,.73,.88,1],magenta:[.88,.12,.55,1],yellow:[.97,.93,.08,1],black:[.1,.1,.1,1]},fogra51:{cyan:[0,.525,.765,1],magenta:[.827,0,.486,1],yellow:[.984,.91,0,1],black:[.145,.145,.145,1]},swop:{cyan:[0,.557,.769,1],magenta:[.827,.02,.478,1],yellow:[.984,.902,.027,1],black:[.169,.169,.169,1]}},Tt=`#version 300 es
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
`,Et={...wt.pure,...wt.newsprint},Dt={gridSize:10,dotSize:1,smoothing:.15,angle:0,mode:`rgb`,blackAmount:1,trimEdge:!0,background:[0,0,0,0],inkPalette:Et},Ot=class{params;constructor(e={}){this.params={...Dt,...e,inkPalette:{...Et,...e.inkPalette??{}}}}setParams(e){Object.assign(this.params,e)}setInkPreset(e){Object.assign(this.params.inkPalette,wt[e])}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params,o=a.inkPalette;e.draw({frag:Tt,uniforms:{src:e.src,srcSizePx:[e.src.width||1,e.src.height||1],elementPx:[r,i],gridSize:Math.max(1,a.gridSize),dotSize:Math.max(0,a.dotSize),smoothing:Math.max(0,Math.min(1,a.smoothing)),angle:a.angle,blackAmount:Math.max(0,Math.min(1,a.blackAmount)),ymck:+(a.mode===`cmyk`),trimEdge:+!!a.trimEdge,background:a.background,cInk:o.cyan,mInk:o.magenta,yInk:o.yellow,kInk:o.black,rInk:o.red,gInk:o.green,bInk:o.blue},target:e.target})}}})))()}var At,jt,Mt;function Nt(){return(Nt=e((()=>{At=`#version 300 es
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
`,jt={shift:.5},Mt=class{params;constructor(e={}){this.params={...jt,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:At,uniforms:{src:e.src,shift:this.params.shift},target:e.target})}}})))()}function Pt(e,t){if(typeof OffscreenCanvas<`u`)return new OffscreenCanvas(e,t);let n=document.createElement(`canvas`);return n.width=e,n.height=t,n}function Ft(e){let t=e.getContext(`2d`);if(!t)throw Error(`[VFX-JS] JPEGGlitchEffect: 2D canvas context unavailable`);return t}function It(e,t){if(typeof OffscreenCanvas<`u`&&e instanceof OffscreenCanvas)return e.convertToBlob({type:`image/jpeg`,quality:t});let n=e;return new Promise((e,r)=>{n.toBlob(t=>t?e(t):r(Error(`[VFX-JS] JPEGGlitchEffect: toBlob failed`)),`image/jpeg`,t)})}function Lt(e){for(let t=2;t+3<e.length;t++)if(e[t]===255&&e[t+1]===218){let n=e[t+2]<<8|e[t+3];return Math.min(e.length,t+2+n)}return Math.min(e.length,417)}function Rt(e,t){let n=Math.imul(Math.floor(e*2654435761)|0,2246822519)+Math.imul(t+1,3266489917)>>>0;return()=>{n=n+1831565813>>>0;let e=Math.imul(n^n>>>15,1|n);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function zt(e,t,n,r,i,a,o){switch(e.save(),e.clearRect(0,0,a,o),i){case 90:e.translate(a,0);break;case 180:e.translate(a,o);break;case 270:e.translate(0,o)}e.rotate(i*Math.PI/180),e.drawImage(t,0,0,n,r),e.restore()}function Bt(e,t,n,r){let i=e.length-t-4;if(i<=1)return;let a=Math.max(1,Math.floor(n));for(let n=0;n<a;n++){let o=i/a*n|0,s=i/a*(n+1)|0,c=Math.max(1,s-o),l=Math.min(i,o+(r()*c|0)),u=r()*256|0;e[t+l]=u}}var Vt,Ht,Ut,Wt;function Gt(){return(Gt=e((()=>{re(),Vt=`#version 300 es
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
`,Ht=`#version 300 es
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
`,Ut={quality:.4,seed:.25,iterations:24,resolutionScale:1,randomFlip:!0,vertical:!1,speed:0,bypass:!1},Wt=class{params;enabled=!0;#e=!1;#t=null;#n=null;#r=null;#i=null;#a=!1;#o=null;#s=null;#c=null;#l=null;#u=null;#d=null;#f=null;#p=new Uint8Array;#m=null;#h=0;#g=0;#_=0;#v=0;#y=!0;#b=!1;#x=-1e9;#S=0;#C=0;#w=!1;#T=0;get producedFrames(){return this.#T}constructor(e={}){this.params={...Ut,...e}}setParams(e){Object.assign(this.params,e),this.#y=!0}init(e){this.#e=typeof createImageBitmap==`function`&&(typeof OffscreenCanvas<`u`||typeof document<`u`),this.#e&&(this.#x=-1e9,this.#y=!0,this.#s=Pt(1,1),this.#c=Ft(this.#s),this.#l=Pt(1,1),this.#u=Ft(this.#l),this.#d=Pt(1,1),this.#f=Ft(this.#d),this.#t=e.createRenderTarget({size:[1,1]}),this.#r=e.gl,this.#E(e),this.#o=e.onContextRestored(()=>{this.#E(e),this.#a=this.#w}))}#E(e){let t=e.gl,n=t.createTexture();n&&(t.bindTexture(t.TEXTURE_2D,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,0])),t.bindTexture(t.TEXTURE_2D,null),this.#i=n,this.#n=e.wrapTexture(n,{size:[this.#h||1,this.#g||1]}))}update(){this.enabled===!1&&(this.#w=!1)}render(e){if(this.params.bypass||!this.#e||!this.#t){this.#w=!1,this.#D(e);return}let t=e.src.width,n=e.src.height;(t!==this.#_||n!==this.#v)&&(this.#_=t,this.#v=n,this.#y=!0);let[r,i]=e.dims.elementPixel,a=Math.min(1,Math.max(0,this.params.resolutionScale)),o=Math.max(1,Math.round(r*a)),s=Math.max(1,Math.round(i*a));r>=2&&i>=2&&t>0&&n>0&&((o!==this.#h||s!==this.#g)&&this.#k(e,o,s),this.#O(e)&&this.#A(e)),this.#w&&this.#n?(this.#a&&this.#j(e),e.draw({frag:Ht,uniforms:{tex:this.#n},target:e.target})):this.#D(e)}#D(e){e.draw({frag:Vt,uniforms:{src:e.src},target:e.target})}#O(e){if(this.#b)return!1;let t=this.params.speed;return t>0?e.time-this.#x>=1/t:this.#y}#k(e,t,n){this.#h=t,this.#g=n,this.#p=new Uint8Array(t*n*4),this.#m=new ImageData(t,n),this.#s&&(this.#s.width=t,this.#s.height=n),this.#d&&(this.#d.width=t,this.#d.height=n),this.#t?.dispose(),this.#t=e.createRenderTarget({size:[t,n]}),this.#w=!1,this.#y=!0,this.#b=!1,this.#a=!1,this.#S++}#A(e){let t=this.#h,n=this.#g,r=this.#s,i=this.#c,a=this.#l,o=this.#u,s=this.#m;if(!r||!i||!a||!o||!s||!this.#t)return;ie(e,this.#t);let c=e.gl;c.readPixels(0,0,t,n,c.RGBA,c.UNSIGNED_BYTE,this.#p),c.bindFramebuffer(c.FRAMEBUFFER,null),this.#b=!0,this.#y=!1,this.#x=e.time;let l=s.data,u=t*4;for(let e=0;e<n;e++){let t=(n-1-e)*u;l.set(this.#p.subarray(t,t+u),e*u)}for(let e=3;e<l.length;e+=4)l[e]=255;let d=this.params.speed>0?this.#C:0;this.#C++;let{quality:f,seed:p,iterations:m,randomFlip:h,vertical:ee}=this.params,g=Rt(p,d),te=h&&g()<.5;i.putImageData(s,0,0);let ne=((te?180:0)+(ee?270:0))%360,re=ee,ae=re?n:t,oe=re?t:n;a.width=ae,a.height=oe,zt(o,r,t,n,ne,ae,oe),this.#M(a,t,n,f,m,ne,g,this.#S)}#j(e){let t=e.gl;this.#i&&this.#d&&(t.bindTexture(t.TEXTURE_2D,this.#i),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,this.#d),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,null),this.#a=!1)}async#M(e,t,n,r,i,a,o,s){try{let c=await It(e,r),l=new Uint8Array(await c.arrayBuffer());Bt(l,Lt(l),i,o);let u=await createImageBitmap(new Blob([l],{type:`image/jpeg`}));if(s===this.#S&&this.#f){let e=(360-a)%360;zt(this.#f,u,u.width,u.height,e,t,n),this.#w=!0,this.#T++,this.#a=!0}u.close()}catch{}finally{s===this.#S&&(this.#b=!1)}}dispose(){this.#o?.(),this.#o=null,this.#r&&this.#i&&this.#r.deleteTexture(this.#i),this.#i=null,this.#r=null,this.#a=!1,this.#t?.dispose(),this.#t=null,this.#n=null,this.#s=null,this.#c=null,this.#l=null,this.#u=null,this.#d=null,this.#f=null,this.#m=null,this.#p=new Uint8Array,this.#w=!1,this.#b=!1,this.#h=0,this.#g=0,this.#S++}}})))()}function Kt(e){return Array.isArray(e)?[...e]:Array.from(e)}function qt(e){return typeof e==`number`?[e,e]:e}async function Jt(e,t){let n=typeof document<`u`?document.fonts:void 0;if(n?.load)try{await n.load(`${t} ${S}px ${e}`),await n.ready}catch{}}function Yt(e,t,n,r){let i=Math.max(1,e.length),a=Math.ceil(Math.sqrt(i)),o=Math.ceil(i/a),s=`${n} ${S}px ${t}`,c=document.createElement(`canvas`),l;if(r&&r>0)l=Math.max(1,Math.round(r*S));else{let t=c.getContext(`2d`);if(l=S,t){t.font=s;let n=0;for(let r of e)n=Math.max(n,t.measureText(r).width);n>0&&(l=Math.max(1,Math.ceil(n)))}}c.width=a*l,c.height=o*S;let u=c.getContext(`2d`);if(u){u.clearRect(0,0,c.width,c.height),u.fillStyle=`#fff`,u.textAlign=`center`,u.textBaseline=`middle`,u.font=s;for(let t=0;t<e.length;t++){let n=t%a,r=Math.floor(t/a),i=n*l+l/2,o=r*S+S/2;u.save(),u.beginPath(),u.rect(n*l,r*S,l,S),u.clip(),u.fillText(e[t],i,o),u.restore()}}return{canvas:c,cols:a,rows:o,cellW:l,cellH:S}}function Xt(e){return Array.isArray(e[0])}function Zt(e){return Xt(e)?e.length>0?e:[rn.color]:[e]}function Qt(e){let t=Zt(e).slice(0,tn),n=new Float32Array(32);for(let e=0;e<t.length;e++)n.set(t[e],e*4);return{data:n,count:t.length}}function $t(e,t){if(t.grid!==void 0){let[n,r]=qt(t.grid);e.grid=[Math.max(1,n),Math.max(1,r)]}t.glyphs!==void 0&&(e.glyphs=t.glyphs),t.font!==void 0&&(e.font=t.font),t.fontWeight!==void 0&&(e.fontWeight=t.fontWeight),t.charAspect!==void 0&&(e.charAspect=t.charAspect),t.color!==void 0&&(e.stops=Qt(t.color)),t.headColor!==void 0&&(e.headColor=t.headColor),t.background!==void 0&&(e.background=t.background),t.speed!==void 0&&(e.speed=t.speed),t.tail!==void 0&&(e.tail=Math.max(1,t.tail)),t.tailFade!==void 0&&(e.tailFade=Math.min(1,Math.max(0,t.tailFade))),t.birthRate!==void 0&&(e.birthRate=Math.max(0,t.birthRate)),t.glyphSpeed!==void 0&&(e.glyphSpeed=Math.max(0,t.glyphSpeed)),t.brightness!==void 0&&(e.brightness=Math.max(0,t.brightness)),t.contrast!==void 0&&(e.contrast=Math.max(0,t.contrast)),t.invert!==void 0&&(e.invert=+!!t.invert),t.seed!==void 0&&(e.seed=t.seed)}function en(e){let t={};return $t(t,e),t}var tn,nn,rn,S,an;function on(){return(on=e((()=>{tn=8,nn=`#version 300 es
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
uniform vec4 colorStops[${tn}]; // trail-colour gradient stops (sRGB), head→tail
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
`,rn={grid:[12,16],font:`monospace`,fontWeight:`normal`,color:[.18,1,.36,1],headColor:[.85,1,.9,1],background:[0,0,0,1],speed:10,tail:18,tailFade:1,birthRate:.6,glyphSpeed:8,brightness:1,contrast:1,invert:!1,seed:0},S=64,an=class{#e;#t=null;#n=1;#r=1;#i=1;#a=1;#o=null;constructor(e={}){this.#e=en({...rn,...e})}setParams(e){$t(this.#e,e)}async init(e){typeof document<`u`&&(this.#o=e,await this.#s(e))}async updateAtlas(){this.#o&&await this.#s(this.#o)}async#s(e){let t=Kt(this.#e.glyphs??`ﾊﾋﾌﾍﾎｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789Z:."=*+-<>|`);t.length===0&&console.warn(`[VFX-JS] MatrixEffect: empty glyph pool; nothing will be rendered.`),this.#i=Math.max(1,t.length),await Jt(this.#e.font,this.#e.fontWeight);let n=Yt(t,this.#e.font,this.#e.fontWeight,this.#e.charAspect),r=this.#t;this.#n=n.cols,this.#r=n.rows,this.#a=n.cellW/n.cellH,this.#t=e.wrapTexture(n.canvas,{autoUpdate:!1,filter:`linear`}),r?.dispose()}render(e){if(!this.#t)return;let t=this.#e,[n,r]=e.dims.elementPixel,i=[t.grid[0]*e.pixelRatio,t.grid[1]*e.pixelRatio];e.draw({frag:nn,uniforms:{src:e.src,atlas:this.#t,elementPx:[Math.max(1,n),Math.max(1,r)],cellPx:i,cols:this.#n,rows:this.#r,glyphCount:this.#i,glyphAspect:this.#a,time:e.time,colorStops:t.stops.data,colorStopCount:t.stops.count,headColor:t.headColor,background:t.background,speed:t.speed,tail:t.tail,tailFade:t.tailFade,birthRate:t.birthRate,glyphSpeed:t.glyphSpeed,brightness:t.brightness,contrast:t.contrast,invert:t.invert,seed:t.seed},target:e.target})}dispose(){this.#t?.dispose(),this.#t=null,this.#o=null}}})))()}var sn,cn,ln;function un(){return(un=e((()=>{sn=.7,cn=1.3,ln=`
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
`})))()}function dn(e){let t=fn(e);return 2**Math.ceil(Math.log2(Math.sqrt(t)))}function fn(e){return Number.isFinite(e)?Math.max(1,Math.floor(e)):1}function pn(e){let t=e|0;return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function mn(e){return Math.min(yn,Math.max(0,e))}var hn,gn,_n,vn,yn;function bn(){return(bn=e((()=>{hn=new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),gn=`
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,_n=`#version 300 es
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
`,vn=`#version 300 es
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
`,yn=.1})))()}var C,w,xn,Sn,Cn,wn,Tn,En,Dn,On,kn,An,jn,Mn,Nn,Pn;function Fn(){return(Fn=e((()=>{un(),bn(),C=64,w=4096,xn=.1,Sn=[C,C],Cn=new Float32Array(w);for(let e=0;e<w;e++)Cn[e]=e;wn=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, 2.0);
}
`,Tn=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0);
}
`,En=`#version 300 es
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
`,Dn=`#version 300 es
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
`,On=`#version 300 es
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
${ln}

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
`,kn=`#version 300 es
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
`,An=`#version 300 es
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
`,jn=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;

uniform sampler2D src;
uniform vec3 color;
uniform float colorMix;
uniform vec2 lifeJitterRange;
${gn}

void main() {
    vec4 c = texture(src, clamp(vSpawn.yz, 0.0, 1.0));
    float h = hash21(vSpawn.yz + vec2(vSpawn.x) * 1.7);
    float lifeJitter = mix(lifeJitterRange.x, lifeJitterRange.y, h);
    outColor = vec4(mix(c.rgb, color, colorMix), lifeJitter);
}
`,Mn=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;
void main() {
    float theta = vSpawn.w;
    vec2 dir = theta >= 0.0 ? vec2(cos(theta), sin(theta)) : vec2(0.0);
    outColor = vec4(dir, 0.0, 0.0);
}
`,Nn={count:1048576,birthRate:3e4,screenBirthRate:1e4,life:1,noiseSpeed:.3,emitSpeed:1,noiseDelay:.15,noiseScale:1,noiseAnimation:.3,pointSize:10,alpha:1,radius:300,speedDecay:1,alphaDecay:5,fadeIn:.05,alphaThreshold:.05,spawnOnIdle:!0,srcOpacity:0,trailFade:.75,fog:.5,color:16777215,colorMix:0,blend:`add`},Pn=class{#e;get params(){return this.#e}#t=null;#n=null;#r=null;#i=null;#a=null;#o=!1;#s;#c;#l=new Float32Array(w*4);#u=null;#d=null;#f=null;#p=null;#m=null;#h=null;#g=0;#_=0;#v=0;#y=null;#b=-1/0;constructor(e={}){this.#e={...Nn,...e},this.#e.count=fn(this.#e.count),this.#s=dn(this.#e.count),this.#c=this.#s*this.#s}get maxCount(){return this.#c}setParam(e){let t=this.#e;for(let[n,r]of Object.entries(e))r!==void 0&&(t[n]=n===`count`?fn(r):r)}init(e){this.#x(e),this.#i=e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),this.#a=e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),this.#p={attributes:{position:hn}},this.#f={mode:`points`,attributes:{position:{data:Cn,itemSize:1}}},this.#m=e.gl,this.#w(e),this.#h=e.onContextRestored(()=>{this.#m=e.gl,this.#w(e),this.#o=!1})}#x(e){let t={size:[this.#s,this.#s],float:!0,wrap:`clamp`,filter:`nearest`};this.#t=e.createRenderTarget({...t,persistent:!0}),this.#n=e.createRenderTarget(t),this.#r=e.createRenderTarget(t)}#S(){this.#t?.dispose(),this.#n?.dispose(),this.#r?.dispose(),this.#t=null,this.#n=null,this.#r=null}#C(e){let t=e.gl,n=t.createTexture();if(!n)throw Error(`[ParticleEffect] Failed to create spawn texture`);return t.bindTexture(t.TEXTURE_2D,n),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,C,C,0,t.RGBA,t.FLOAT,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.bindTexture(t.TEXTURE_2D,null),{raw:n,handle:e.wrapTexture(n,{size:[C,C],filter:`nearest`,wrap:`clamp`})}}#w(e){let t=this.#C(e);this.#u=t.raw,this.#d=t.handle}#T(e){if(!this.#u)return;let t=e.gl;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,this.#u),t.texSubImage2D(t.TEXTURE_2D,0,0,0,C,C,t.RGBA,t.FLOAT,this.#l),t.bindTexture(t.TEXTURE_2D,null)}render(e){if(!this.#t||!this.#n||!this.#r||!this.#i||!this.#a||!this.#p||!this.#f||!this.#d||!this.#u)return;let t=dn(this.params.count);t!==this.#s&&(this.#S(),this.#s=t,this.#c=t*t,this.#x(e),this.#g=0,this.#o=!1),this.#o||=(e.draw({frag:wn,target:this.#t}),e.draw({frag:Tn,target:this.#n}),e.draw({frag:Tn,target:this.#r}),!0);let n=mn(e.deltaTime),r=[e.dims.elementPixel[0],e.dims.elementPixel[1]],i=[this.#s,this.#s],a=this.#E(e,n,r);a>0&&this.#T(e);let o=a===0;if(e.draw({frag:On,uniforms:{posTex:this.#t,colorTex:this.#n,velTex:this.#r,elementPixel:r,time:e.time,dt:n,noiseSpeed:this.params.noiseSpeed,emitSpeed:this.params.emitSpeed,noiseDelay:this.params.noiseDelay,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,life:this.params.life},target:this.#t,swap:o}),a>0){let t={uSpawnTex:this.#d,uSpawnTexSize:Sn,uSpawnCount:a,stateSize:i};e.draw({vert:kn,frag:An,geometry:this.#f,uniforms:{...t,src:e.src,alphaThreshold:this.params.alphaThreshold},target:this.#t,blend:`none`}),e.draw({vert:kn,frag:jn,geometry:this.#f,uniforms:{...t,src:e.src,color:pn(this.params.color),colorMix:this.params.colorMix,lifeJitterRange:[sn,cn]},target:this.#n,blend:`none`}),e.draw({vert:kn,frag:Mn,geometry:this.#f,uniforms:t,target:this.#r,blend:`none`})}let s=this.#D();this.#p.instanceCount=s,e.clear(this.#i),e.draw({vert:En,frag:_n,uniforms:{posTex:this.#t,colorTex:this.#n,stateSize:i,pointSize:this.params.pointSize,elementPixel:r,particleCount:s,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fadeIn:this.params.fadeIn,fog:this.params.fog},geometry:this.#p,target:this.#i,blend:this.params.blend===`normal`?`premultiplied`:`additive`}),e.draw({frag:vn,uniforms:{trailPrev:this.#a,particleStamp:this.#i,trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:this.#a}),e.draw({frag:Dn,uniforms:{src:e.src,trail:this.#a,srcOpacity:this.params.srcOpacity},target:e.target})}#E(e,t,n){let r=[e.mouse[0]/Math.max(1,n[0]),e.mouse[1]/Math.max(1,n[1])];(!this.#y||Math.abs(r[0]-this.#y[0])>1e-6||Math.abs(r[1]-this.#y[1])>1e-6)&&(this.#b=e.time),this.#y=r;let i=e.intersection>0,a=e.time-this.#b<xn;this.#_=i&&(a||this.params.spawnOnIdle)?Math.min(this.#_+this.params.birthRate*t,w):0,this.#v=i?Math.min(this.#v+this.params.screenBirthRate*t,w):0;let o=Math.min(w,Math.floor(this.#_)),s=Math.min(w-o,Math.floor(this.#v));this.#_-=o,this.#v-=s;let c=o+s;if(c===0)return 0;let l=this.#D(),u=Math.max(1,n[0]),d=Math.max(1,n[1]),f=this.#l,p=0;for(;p<o;p++){let e=Math.sqrt(Math.random())*this.params.radius,t=Math.random()*Math.PI*2,n=Math.cos(t)*e,i=Math.sin(t)*e,a=p*4;f[a+0]=this.#g,f[a+1]=r[0]+n/u,f[a+2]=r[1]+i/d,f[a+3]=t,this.#g=(this.#g+1)%l}for(let e=0;e<s;e++,p++){let e=p*4;f[e+0]=this.#g,f[e+1]=Math.random(),f[e+2]=Math.random(),f[e+3]=-1,this.#g=(this.#g+1)%l}return c}#D(){return Math.max(1,Math.min(this.#c,Math.floor(this.params.count)))}dispose(){this.#h?.(),this.#h=null,this.#m&&this.#u&&this.#m.deleteTexture(this.#u),this.#u=null,this.#d=null,this.#f=null,this.#m=null,this.#S(),this.#i?.dispose(),this.#a?.dispose(),this.#i=null,this.#a=null,this.#p=null,this.#o=!1}outputRect(e){return e.canvasRect}}})))()}var In,Ln,Rn,zn,Bn,Vn,Hn,Un;function Wn(){return(Wn=e((()=>{un(),bn(),In=sn.toFixed(4),Ln=cn.toFixed(4),Rn=`#version 300 es
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
${gn}
${ln}

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
        ${In},
        ${Ln},
        hash21(uv * 91.7 + 1.234)
    );
    age += dt / max(duration * lifespanScale, 1e-3);

    outColor = vec4(pos, age);
}
`,zn=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 stateSize;
uniform float count;
uniform vec3 color;
uniform float colorMix;
${gn}

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
`,Bn=`#version 300 es
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
`,Vn=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trail;

void main() {
    outColor = texture(trail, uv);
}
`,Hn={count:1e5,duration:1,noiseSpeed:1.5,noiseScale:1,noiseAnimation:1,outwardBias:1,pointSize:3,alpha:1,alphaDecay:5,speedDecay:2,fog:0,trailFade:.5,color:16777215,colorMix:0,blend:`add`},Un=class{#e;get params(){return this.#e}#t=null;#n=null;#r=null;#i=null;#a=null;#o;#s=!1;#c=!1;#l=-1;#u=0;#d=0;constructor(e={}){this.#e={...Hn,...e},this.#e.count=fn(this.#e.count);let t=dn(this.#e.count);this.#o=[t,t]}trigger(){this.#s=!0,this.#c=!0,this.#l=-1,this.#u=0,this.#d=0}reset(){this.#s=!1,this.#c=!1,this.#l=-1,this.#u=0,this.#d=0}isDone(){return!this.#s||this.#u<this.params.duration?!1:this.#d>=this.#f()}#f(){let e=this.params.trailFade;return e<=0?1:e>=.999?600:Math.ceil(-Math.log(255)/Math.log(e))}init(e){this.#p(e),this.#r=e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),this.#i=e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),this.#a={attributes:{position:hn}}}#p(e){let t={size:this.#o,float:!0,wrap:`clamp`,filter:`nearest`};this.#t=e.createRenderTarget({...t,persistent:!0}),this.#n=e.createRenderTarget(t)}#m(){this.#t?.dispose(),this.#n?.dispose(),this.#t=null,this.#n=null}render(e){if(!this.#t||!this.#n||!this.#r||!this.#i||!this.#a||e.intersection<=0)return;let t=dn(this.params.count),n=!this.#s||this.isDone();if(t!==this.#o[0]&&n&&(this.#m(),this.#o=[t,t],this.#p(e)),!this.#s){e.blit(e.src,e.target);return}this.#l<0&&(this.#l=e.time);let r=e.time-this.#l;this.#u=r;let i=r>=this.params.duration;if(i&&this.#d>=this.#f()){e.clear(e.target);return}let a=mn(e.deltaTime),o=[e.dims.elementPixel[0],e.dims.elementPixel[1]];if(i)e.clear(this.#r),this.#d++;else{let t=+!!this.#c;this.#c=!1;let n=this.#h();e.draw({frag:Rn,uniforms:{posTex:this.#t,stateSize:this.#o,elementPixel:o,time:e.time,dt:a,noiseSpeed:this.params.noiseSpeed,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,outwardBias:this.params.outwardBias,duration:this.params.duration,count:n,uBurst:t},target:this.#t}),t===1&&(e.draw({frag:zn,uniforms:{src:e.src,stateSize:this.#o,count:n,color:pn(this.params.color),colorMix:this.params.colorMix},target:this.#n}),e.clear(this.#i)),this.#a.instanceCount=n,e.clear(this.#r),e.draw({vert:Bn,frag:_n,uniforms:{posTex:this.#t,colorTex:this.#n,stateSize:this.#o,pointSize:this.params.pointSize,elementPixel:o,particleCount:n,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fog:this.params.fog},geometry:this.#a,target:this.#r,blend:this.params.blend===`normal`?`premultiplied`:`additive`})}e.draw({frag:vn,uniforms:{trailPrev:this.#i,particleStamp:this.#r,trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:this.#i}),e.draw({frag:Vn,uniforms:{trail:this.#i},target:e.target})}#h(){let e=this.#o[0]*this.#o[1];return Math.max(1,Math.min(e,Math.floor(this.params.count)))}dispose(){this.#m(),this.#r?.dispose(),this.#i?.dispose(),this.#r=null,this.#i=null,this.#a=null}outputRect(e){return e.canvasRect}}})))()}var Gn,Kn,qn,Jn,Yn;function Xn(){return(Xn=e((()=>{x(),Gn=`#version 300 es
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
${He}

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
`,Kn={lenticular:0,waves:1,circular:2},qn={zero:0,clamp:1,repeat:2,mirror:3},Jn={pattern:`lenticular`,strength:.5,smoothness:0,frost:0,dispersion:.04,edgeWrap:`zero`,centerX:.5,centerY:.5,stripWidth:.05,angle:0},Yn=class{params;constructor(e={}){this.params={...Jn,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.element;e.draw({frag:Gn,uniforms:{src:e.src,center:[t.centerX,t.centerY],pattern:Kn[t.pattern]??0,edgeWrap:qn[t.edgeWrap]??0,strength:t.strength,smoothness:Math.min(1,Math.max(0,t.smoothness)),frost:Math.max(0,t.frost),dispersion:Math.max(0,t.dispersion),stripWidth:Math.min(1,Math.max(.001,t.stripWidth)),angle:t.angle,aspect:(n||1)/(r||1)},target:e.target})}}})))()}var Zn,Qn,$n;function er(){return(er=e((()=>{x(),Zn=`#version 300 es
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
${He}

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
`,Qn={offset:0,reach:.1,smoothness:0,centerX:.5,centerY:.5,angle:45},$n=class{params;constructor(e={}){this.params={...Qn,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params;e.draw({frag:Zn,uniforms:{src:e.src,center:[t.centerX,t.centerY],angle:t.angle,offset:t.offset,reach:Math.max(0,t.reach),smoothness:Math.max(0,t.smoothness)},target:e.target})}}})))()}var tr,nr,rr;function ir(){return(ir=e((()=>{tr=`#version 300 es
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
`,nr={speed:1,frequency:1},rr=class{params;constructor(e={}){this.params={...nr,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:tr,uniforms:{src:e.src,time:e.time*this.params.speed,aspect:(t||1)/(n||1),frequency:this.params.frequency},target:e.target})}}})))()}var ar,or,sr;function cr(){return(cr=e((()=>{ar=`#version 300 es
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
`,or={speed:1,amount:.05},sr=class{params;constructor(e={}){this.params={...or,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:ar,uniforms:{src:e.src,time:e.time*this.params.speed,amount:this.params.amount},target:e.target})}}})))()}var lr,ur,dr;function fr(){return(fr=e((()=>{lr=`#version 300 es
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
`,ur={speed:1,amount:10},dr=class{params;constructor(e={}){this.params={...ur,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=e.dims.element[0]||1;e.draw({frag:lr,uniforms:{src:e.src,time:e.time*this.params.speed,amp:this.params.amount/t},target:e.target})}}})))()}var pr,mr,hr;function gr(){return(gr=e((()=>{pr=`#version 300 es
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
`,mr={speed:1,amount:20,frequency:7,blur:2},hr=class{params;constructor(e={}){this.params={...mr,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=e.dims.element[0]||1;e.draw({frag:pr,uniforms:{src:e.src,time:e.time*this.params.speed,amp:this.params.amount/t,frequency:this.params.frequency,blurDx:this.params.blur/t},target:e.target})}}})))()}var _r,vr,yr;function br(){return(br=e((()=>{x(),_r=`#version 300 es
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
${He}

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
`,vr={shift:.5,random:0,centerX:.5,centerY:.5,size:100,angle:0},yr=class{params;constructor(e={}){this.params={...vr,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.element;e.draw({frag:_r,uniforms:{src:e.src,center:[t.centerX,t.centerY],resolution:[n||1,r||1],angle:t.angle,size:Math.max(1,t.size),shift:t.shift,random:Math.min(1,Math.max(0,t.random))},target:e.target})}}})))()}var xr,Sr,Cr,wr;function Tr(){return(Tr=e((()=>{xr=`#version 300 es
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
`,Sr={rectangle:0,ellipse:1,hexagon:2,triangle:3},Cr={shape:`rectangle`,size:10,stretch:1,gap:0,colorTrim:2,averageColor:.8,dissolve:0,falloff:0,knockout:!0},wr=class{params;constructor(e={}){this.params={...Cr,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.elementPixel,i=Math.max(1,t.size);e.draw({frag:xr,uniforms:{src:e.src,resolution:[Math.max(1,n),Math.max(1,r)],shape:Sr[t.shape]??0,cellPx:[i*Math.max(.1,t.stretch),i],gap:Math.min(1,Math.max(0,t.gap)),colorTrim:Math.max(0,t.colorTrim),averageColor:Math.min(1,Math.max(0,t.averageColor)),dissolve:Math.min(1,Math.max(0,t.dissolve)),falloff:Math.min(1,Math.max(0,t.falloff)),knockout:+!!t.knockout},target:e.target})}}})))()}var Er,Dr,Or;function kr(){return(kr=e((()=>{Er=`#version 300 es
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

    outColor *= color.a;
}
`,Dr={color1:[1,0,0,1],color2:[0,1,0,1],color3:[0,0,1,1],speed:.2},Or=class{params;constructor(e={}){this.params={...Dr,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:Er,uniforms:{src:e.src,time:e.time,color1:this.params.color1,color2:this.params.color2,color3:this.params.color3,speed:this.params.speed},target:e.target})}}})))()}var Ar,jr,Mr;function Nr(){return(Nr=e((()=>{Ar=`#version 300 es
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
`,jr={intensity:.5,radius:1,power:2},Mr=class{params;constructor(e={}){this.params={...jr,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:Ar,uniforms:{src:e.src,aspect:(t||1)/(n||1),intensity:this.params.intensity,radius:this.params.radius,power:this.params.power},target:e.target})}}})))()}function Pr(e){let t=e.startsWith(`#`)?e.slice(1):e;return(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``)),t.length===6&&(t+=`ff`),t.length===8?[Number.parseInt(t.slice(0,2),16)/255,Number.parseInt(t.slice(2,4),16)/255,Number.parseInt(t.slice(4,6),16)/255,Number.parseInt(t.slice(6,8),16)/255]:[0,0,0,0]}var Fr,Ir,Lr;function Rr(){return(Rr=e((()=>{Fr=`#version 300 es
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
`,Ir={cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`},Lr=class{params;constructor(e={}){this.params={...Ir,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params;e.draw({frag:Fr,uniforms:{src:e.src,mouseUv:[e.mouse[0]/r,e.mouse[1]/i],elementPx:[r,i],cellSize:a.cellSize,pressRadius:a.pressRadius,press:a.press,flatCells:+!!a.flatCells,seed:a.seed,time:e.time,speed:Math.max(0,a.speed),breathe:Math.max(0,a.breathe),breatheSpeed:Math.max(0,a.breatheSpeed),breatheScale:Math.max(1,a.breatheScale),bgColor:Pr(a.bgColor)},target:e.target})}}})))()}var zr,Br,Vr,Hr;function Ur(){return(Ur=e((()=>{x(),zr=`#version 300 es
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
${He}

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
`,Br={"sine wave":0,twist:1,ripple:2},Vr={type:`twist`,amplitude:3,frequency:1,centerX:.5,centerY:.5,speed:0},Hr=class{params;constructor(e={}){this.params={...Vr,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params;e.draw({frag:zr,uniforms:{src:e.src,center:[t.centerX,t.centerY],resolution:[e.dims.element[0]||1,e.dims.element[1]||1],mode:Br[t.type]??0,amp:t.amplitude,freq:t.frequency,time:e.time*t.speed},target:e.target})}}})))()}function T(e,t,n,r={}){let{src:i=_,clock:o=!0}=r;return{render:t=>{let n=o&&u(),r=a(n?{timeScale:0}:void 0),s=document.createElement(`img`);s.src=i,s.style.display=`block`,s.style.margin=`40px auto`,s.style.maxWidth=`80vw`;let c=r.add(s,{effect:e(t)});return o&&(n?c.then(()=>{r.setTime($r),r.render()}):l(r)),s},args:t,argTypes:n}}function E(e){let t=e.trim().replace(/^#/,``);if(t.length===3&&(t=t.split(``).map(e=>e+e).join(``)),t.length!==6)return[0,0,0,1];let n=Number.parseInt(t,16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255,1]}function Wr(e){let t=e>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}async function Gr(e,t,n={}){let r=n.steps??ni,i=t.getBoundingClientRect(),a=i.left+i.width/2,o=i.top+i.height/2,s=Math.min(i.width,i.height)*.3,c=Math.random;Math.random=Wr(2654435769);try{n.onReady?.();let t=0;for(let n=0;n<r;n++){await new Promise(e=>setTimeout(e,0));let i=n/r*Math.PI*2;window.dispatchEvent(new MouseEvent(`pointermove`,{clientX:a+Math.cos(i)*s,clientY:o+Math.sin(i)*s,bubbles:!0})),t+=ri,e.setTime(t),e.render()}}finally{Math.random=c}}function Kr(){let e=document.createElement(`article`);e.style.cssText=`width: 600px; padding: 32px; background: #fff; color: #202122; font-family: sans-serif; line-height: 1.6; border: 1px solid #a2a9b1;`;let t=`font-family: serif; font-weight: normal; border-bottom: 1px solid #a2a9b1; padding-bottom: 4px; margin-top: 24px;`,n=`margin: 20px 0; text-align: center;`,r=`font-size: 0.85em; color: #54595d; margin-top: 4px;`,i=`width: 100%; height: auto; max-width: 480px; background: #f8f9fa; border: 1px solid #a2a9b1;`;return e.innerHTML=`
        <h1 style="font-family: serif; font-weight: normal;
                   border-bottom: 1px solid #a2a9b1;
                   padding-bottom: 4px; margin: 0 0 4px;">
            Voronoi diagram
        </h1>
        <div style="font-size: 0.85em; color: #54595d; margin-bottom: 16px;">
            From Wikipedia, the free encyclopedia
        </div>
        <p>
            In mathematics, a <b>Voronoi diagram</b> is a partition of a
            plane into regions close to each of a given set of objects.
            It is named after Georgy Voronoy and is also known as a
            Dirichlet tessellation or Thiessen polygons.
        </p>
        <figure style="${n}">
            ${`
        <svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"
             style="${i}">
            <polygon points="0,0 110,0 100,55 0,70" fill="#fce5cd" stroke="#54595d"/>
            <polygon points="110,0 240,0 220,75 100,55" fill="#d9ead3" stroke="#54595d"/>
            <polygon points="240,0 400,0 400,80 220,75" fill="#cfe2f3" stroke="#54595d"/>
            <polygon points="0,70 100,55 130,140 0,160" fill="#ead1dc" stroke="#54595d"/>
            <polygon points="100,55 220,75 240,150 130,140" fill="#fff2cc" stroke="#54595d"/>
            <polygon points="220,75 400,80 400,170 240,150" fill="#d0e0e3" stroke="#54595d"/>
            <polygon points="0,160 130,140 145,240 0,240" fill="#f4cccc" stroke="#54595d"/>
            <polygon points="130,140 240,150 250,240 145,240" fill="#d9d2e9" stroke="#54595d"/>
            <polygon points="240,150 400,170 400,240 250,240" fill="#fff2cc" stroke="#54595d"/>
            <circle cx="50" cy="30" r="3" fill="#202122"/>
            <circle cx="170" cy="30" r="3" fill="#202122"/>
            <circle cx="320" cy="35" r="3" fill="#202122"/>
            <circle cx="50" cy="110" r="3" fill="#202122"/>
            <circle cx="170" cy="105" r="3" fill="#202122"/>
            <circle cx="320" cy="120" r="3" fill="#202122"/>
            <circle cx="65" cy="200" r="3" fill="#202122"/>
            <circle cx="190" cy="195" r="3" fill="#202122"/>
            <circle cx="320" cy="205" r="3" fill="#202122"/>
        </svg>
    `}
            <figcaption style="${r}">
                Figure 1. A Voronoi diagram with 9 sites in the plane.
            </figcaption>
        </figure>
        <h2 style="${t}">Definition</h2>
        <p>
            For each seed there is a corresponding region, called a
            <i>Voronoi cell</i>, consisting of all points of the plane
            closer to that seed than to any other. Cell boundaries are
            segments of the perpendicular bisectors between pairs of
            neighbouring sites.
        </p>
        <h2 style="${t}">History</h2>
        <p>
            Informal use dates back to Descartes (<i>Principia
            Philosophiae</i>, 1644). Lejeune Dirichlet studied the 2D
            and 3D cases in 1850, and Georgy Voronoy generalized the
            construction to higher dimensions in 1908. In meteorology,
            Alfred Thiessen rediscovered the planar version in 1911 to
            estimate rainfall over a region.
        </p>
        <h2 style="${t}">Properties</h2>
        <ul>
            <li>Each Voronoi cell is a convex polygon (or polytope).</li>
            <li>The number of edges of an unbounded cell equals the
                number of its Voronoi neighbours.</li>
            <li>For sites in general position, each Voronoi vertex is
                the centre of a circle that passes through three sites
                and contains no other site in its interior.</li>
            <li>The diagram has at most <i>2n − 5</i> vertices and
                <i>3n − 6</i> edges for <i>n</i> sites.</li>
        </ul>
        <h2 style="${t}">Dual: Delaunay triangulation</h2>
        <p>
            The dual graph of a Voronoi diagram is the <b>Delaunay
            triangulation</b>: connect two sites by an edge whenever
            their cells share a boundary segment. The Delaunay
            triangulation maximizes the minimum interior angle of all
            triangles, avoiding sliver triangles.
        </p>
        <figure style="${n}">
            ${`
        <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg"
             style="${i}">
            <g fill="none" stroke="#54595d" stroke-width="1.2">
                <line x1="60" y1="40" x2="180" y2="60"/>
                <line x1="180" y1="60" x2="320" y2="35"/>
                <line x1="60" y1="40" x2="80" y2="140"/>
                <line x1="180" y1="60" x2="80" y2="140"/>
                <line x1="180" y1="60" x2="220" y2="150"/>
                <line x1="320" y1="35" x2="220" y2="150"/>
                <line x1="320" y1="35" x2="340" y2="140"/>
                <line x1="220" y1="150" x2="340" y2="140"/>
                <line x1="80" y1="140" x2="220" y2="150"/>
            </g>
            <circle cx="60" cy="40" r="4" fill="#cc0000"/>
            <circle cx="180" cy="60" r="4" fill="#cc0000"/>
            <circle cx="320" cy="35" r="4" fill="#cc0000"/>
            <circle cx="80" cy="140" r="4" fill="#cc0000"/>
            <circle cx="220" cy="150" r="4" fill="#cc0000"/>
            <circle cx="340" cy="140" r="4" fill="#cc0000"/>
        </svg>
    `}
            <figcaption style="${r}">
                Figure 2. Delaunay triangulation of 6 sites.
            </figcaption>
        </figure>
        <h2 style="${t}">Algorithms</h2>
        <p>
            Several algorithms construct Voronoi diagrams in
            <i>O(n log n)</i> time, matching the lower bound:
        </p>
        <ul>
            <li><b>Fortune's algorithm</b> (1987) — sweepline approach
                using a parabolic beach line.</li>
            <li><b>Bowyer–Watson algorithm</b> — incremental
                construction of the dual Delaunay triangulation.</li>
            <li><b>Lloyd's relaxation</b> — iterative method that moves
                each site to its cell's centroid, producing centroidal
                Voronoi tessellations.</li>
            <li><b>Divide and conquer</b> — Shamos and Hoey, 1975.</li>
        </ul>
        <h2 style="${t}">Applications</h2>
        <p>
            Voronoi diagrams have practical and theoretical uses in
            many fields, mainly in science and technology, but also in
            visual art:
        </p>
        <ul>
            <li>Computational geometry — nearest-neighbour search,
                largest empty circle, motion planning.</li>
            <li>Solid-state physics — Wigner–Seitz cells of crystal
                lattices.</li>
            <li>Cellular biology — modelling tissue packing and
                epithelial cell shapes.</li>
            <li>Networking and infrastructure — service-area
                assignment, cellphone tower coverage, school
                catchments.</li>
            <li>Procedural graphics — texture synthesis, terrain
                generation, stylized shading.</li>
            <li>Astronomy — analysing galaxy distribution and the
                cosmic web.</li>
        </ul>
        <h2 style="${t}">See also</h2>
        <ul>
            <li>Centroidal Voronoi tessellation</li>
            <li>Power diagram (weighted Voronoi)</li>
            <li>Apollonius diagram</li>
            <li>Worley noise</li>
        </ul>
        <h2 style="${t}">References</h2>
        <ol style="font-size: 0.9em; color: #202122;">
            <li>Voronoy, G. (1908). "Nouvelles applications des
                paramètres continus à la théorie des formes
                quadratiques." <i>J. Reine Angew. Math.</i> 133.</li>
            <li>Aurenhammer, F. (1991). "Voronoi diagrams — a survey of
                a fundamental geometric data structure." <i>ACM
                Computing Surveys</i> 23 (3): 345–405.</li>
            <li>Fortune, S. (1987). "A sweepline algorithm for Voronoi
                diagrams." <i>Algorithmica</i> 2: 153–174.</li>
            <li>Okabe, A.; Boots, B.; Sugihara, K.; Chiu, S. N. (2000).
                <i>Spatial Tessellations: Concepts and Applications of
                Voronoi Diagrams</i> (2nd ed.). Wiley.</li>
        </ol>
    `,e}function qr(e){document.getElementById(`jpeg-glitch-fps`)?.remove();let t=document.createElement(`div`);t.id=`jpeg-glitch-fps`,t.style.cssText=`position:fixed;top:8px;left:8px;z-index:2147483647;font:12px/1.4 monospace;color:#0f0;background:rgba(0,0,0,0.6);padding:2px 8px;border-radius:3px;pointer-events:none;`,t.textContent=`-- fps`,document.body.appendChild(t);let n=performance.now(),r=e.producedFrames,i=()=>{if(!t.isConnected)return;let a=performance.now(),o=a-n;if(o>=500){let i=e.producedFrames;t.textContent=`${((i-r)*1e3/o).toFixed(1)} fps`,n=a,r=i}requestAnimationFrame(i)};requestAnimationFrame(i)}function Jr(e){let t=Math.round(window.innerWidth/2),n=Math.round(window.innerHeight/2),r=Math.min(t,n)*.4,i=0,a=window.setInterval(()=>{let o=i/60*Math.PI*2;e.dispatchEvent(new MouseEvent(`pointermove`,{clientX:t+Math.cos(o)*r,clientY:n+Math.sin(o)*r,bubbles:!0})),i++,i>120&&clearInterval(a)},16)}function Yr(){let e=document.createElement(`div`);return e.style.width=`100%`,e.style.boxSizing=`border-box`,e.style.padding=`24px`,e.style.background=`#ffffff`,e.style.color=`#111111`,e.style.fontFamily=`sans-serif`,e.style.fontSize=`2.5rem`,e.innerHTML=`
        <h1 style="margin: 0 0 12px;">HTML input sample</h1>
        <p style="margin: 0 0 16px; line-height: 1.5;">
            A plain HTML block captured by VFX-JS and turned into ASCII.
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
        <input type="text" value="Type here"
               style="font-size: inherit; padding: 6px 8px; margin-right: 8px;" />
        <button style="font-size: inherit; padding: 6px 14px;">Submit</button>
    `,e}function Xr(e,t,n,r){let i=e=>{r&&Promise.resolve(e).then(r)},a=e=>{e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`};if(t===`HTML`){let t=document.createElement(`div`);t.style.display=`flex`,t.style.justifyContent=`center`,t.style.margin=`40px auto`;let r=document.createElement(`div`);r.style.width=`900px`,r.style.maxWidth=`90vw`;let a=Yr();return r.appendChild(a),t.appendChild(r),i(e.addHTML(a,{effect:n})),t}if(t===`WebCam`){let t=document.createElement(`video`);return t.muted=!0,t.loop=!0,t.playsInline=!0,t.autoplay=!0,a(t),navigator.mediaDevices?.getUserMedia({video:!0}).then(e=>{t.srcObject=e,t.play()}).catch(e=>console.warn(`[ascii story] webcam unavailable:`,e)),i(e.add(t,{effect:n})),t}let o=document.createElement(`img`);return o.src=vi[t]??v,a(o),i(e.add(o,{effect:n})),o}function Zr(e,t,n){let r=document.createElement(`canvas`);r.width=64,r.height=64;let i=r.getContext(`2d`);if(i){let r=t>1?e/(t-1):1,a=`hsl(${e/Math.max(1,t)*360}, 85%, 55%)`;if(i.fillStyle=a,i.strokeStyle=a,n===`squares`){let e=6+r*50;i.fillRect(32-e/2,32-e/2,e,e)}else n===`rings`?(i.lineWidth=2+r*9,i.beginPath(),i.arc(32,32,6+r*22,0,Math.PI*2),i.stroke()):(i.beginPath(),i.arc(32,32,3+r*27,0,Math.PI*2),i.fill())}return r}var Qr,$r,D,O,k,ei,A,ti,j,ni,ri,ii,ai,oi,M,N,P,F,I,L,R,z,B,V,H,si,ci,U,W,G,li,K,ui,q,di,J,fi,pi,Y,X,Z,mi,hi,gi,_i,vi,yi,bi,Q,xi,$,Si;function Ci(){return(Ci=e((()=>{we(),Ie(),g(),Be(),Ke(),Ze(),tt(),ft(),gt(),Ct(),kt(),Nt(),Gt(),on(),Fn(),Wn(),Xn(),h(),ae(),er(),ir(),cr(),fr(),ee(),gr(),br(),Tr(),kr(),Nr(),Rr(),Ur(),se(),le(),n(),ue(),o(),Qr={title:`Effect`,parameters:{layout:`fullscreen`}},$r=2,D={render:()=>{let e=document.createElement(`img`);return e.src=t,e.style.display=`block`,e.style.margin=`40px auto`,e},args:void 0},D.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=a(),r=new m({threshold:.2,softness:.1,intensity:5,scatter:1,dither:0,edgeFade:0,pad:50});await n.add(t,{effect:r}),f(`Bloom`,r)},O={render:()=>{let e=document.createElement(`img`);return e.src=_,e},args:void 0},O.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=a(),r=new m({threshold:.01,softness:.2,intensity:10,scatter:1,dither:0,edgeFade:.02,pad:200});await n.add(t,{effect:[new te({size:10}),new ne({spacing:5}),r]}),f(`CRT Bloom`,r)},k={render:()=>{let e=document.createElement(`img`);return e.src=_,e},args:void 0,parameters:{chromatic:{disableSnapshot:!0}}},k.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=a(),r=new oe({range:[.5,1],direction:`up`,angle:30});await n.add(t,{effect:r}),c(`Pixel Sort`,r)},ei={Jellyfish:_,Logo:t,Pigeon:v},A={render:e=>{let{src:t,...n}=e,r=a(),i=new Wt(n);if(qr(i),t===`bbb`){let e=document.createElement(`video`);return e.src=ce,e.muted=!0,e.loop=!0,e.playsInline=!0,e.autoplay=!0,e.crossOrigin=`anonymous`,e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`,e.play(),r.add(e,{effect:i}),e}let o=document.createElement(`img`);return o.src=ei[t],o.style.display=`block`,o.style.margin=`40px auto`,r.add(o,{effect:i}),o},args:{src:`Jellyfish`,quality:.4,seed:.25,iterations:24,resolutionScale:1,randomFlip:!0,vertical:!1,speed:0},argTypes:{src:{control:{type:`select`},options:[`Jellyfish`,`Logo`,`Pigeon`,`bbb`]},quality:{control:{type:`range`,min:0,max:1,step:.01}},seed:{control:{type:`range`,min:0,max:1,step:.01}},iterations:{control:{type:`range`,min:1,max:30,step:1}},resolutionScale:{control:{type:`range`,min:0,max:1,step:.01}},randomFlip:{control:{type:`boolean`}},vertical:{control:{type:`boolean`}},speed:{control:{type:`range`,min:0,max:30,step:.5}}},parameters:{chromatic:{disableSnapshot:!0}}},ti={Jellyfish:_,Logo:t,Pigeon:v},j={render:e=>{let{src:t,...n}=e,r=a(),i=new Fe(n);if(t===`bbb`){let e=document.createElement(`video`);return e.src=ce,e.muted=!0,e.loop=!0,e.playsInline=!0,e.autoplay=!0,e.crossOrigin=`anonymous`,e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`,e.play(),r.add(e,{effect:i}),e}let o=document.createElement(`img`);return o.src=ti[t],o.style.display=`block`,o.style.margin=`40px auto`,r.add(o,{effect:i}),o},args:{src:`Jellyfish`,quality:8,iterations:3,downscale:1},argTypes:{src:{control:{type:`select`},options:[`Jellyfish`,`Logo`,`Pigeon`,`bbb`]},quality:{control:{type:`range`,min:1,max:100,step:1}},iterations:{control:{type:`range`,min:1,max:10,step:1}},downscale:{control:{type:`range`,min:.02,max:1,step:.01}}},parameters:{chromatic:{disableSnapshot:!0}}},ni=60,ri=1/60,ii=20,ai=24,oi=4096,M={render:()=>{let e=document.createElement(`img`);return e.src=_,e},args:void 0},M.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=u(),r=a(n?{autoplay:!1}:void 0),i=new dt;await r.add(t,{effect:i}),n?await Gr(r,t):(s(`Fluid`,i),Jr(e))},N={render:()=>{let e=document.createElement(`img`);return e.src=_,e},args:void 0},N.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let i=a(),o={Jellyfish:_,Logo:t},s=null,c=async()=>{let e=s?{...s.params}:{};s&&(i.remove(n),p()),s=new Ot(e),await i.add(n,{effect:s}),r(`Halftone`,s,{img:n,sources:o,onSrcChange:async e=>{n.src=o[e],await new Promise(e=>{n.onload=()=>e()}),await c()}})};await c()},P={render:()=>{let e=document.createElement(`img`);return e.src=t,e},args:void 0},P.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);if(await new Promise(e=>{n.onload=()=>e()}),u()){let e=a({autoplay:!1});await e.add(n,{effect:new Pn({count:oi})}),await Gr(e,n,{steps:ii});return}let r=a(),o={Jellyfish:_,Logo:t},s=null,c=async()=>{let e=s?{...s.params}:{};s&&(r.remove(n),p()),s=new Pn(e),await r.add(n,{effect:s}),i(`Particle`,s,{img:n,sources:o,onSrcChange:async e=>{n.src=o[e],await new Promise(e=>{n.onload=()=>e()}),await c()}})};await c(),Jr(e)},F={render:()=>{let e=document.createElement(`img`);return e.src=t,e},args:void 0},F.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);if(await new Promise(e=>{n.onload=()=>e()}),await new Promise(e=>requestAnimationFrame(()=>e(void 0))),u()){let e=a({autoplay:!1}),t=new Un({count:oi});await e.add(n,{effect:t}),await Gr(e,n,{steps:ai,onReady:()=>t.trigger()});return}let r=a(),i={Logo:t,Jellyfish:_},o=null,s=async()=>{let e=o?{...o.params}:{};o&&(r.remove(n),p()),await new Promise(e=>requestAnimationFrame(()=>e(void 0))),o=new Un(e),await r.add(n,{effect:o}),d(`Particle Explode`,o,{img:n,sources:i,onSrcChange:async e=>{n.src=i[e],await new Promise(e=>{n.onload=()=>e()}),await s()}})};await s()},I={render:e=>{let{src:n,...r}=e,i=a(),o=new Lr(r);if(n===`Webpage`){let e=document.getElementById(`storybook-root`);e&&(e.style.height=`auto`,e.style.display=`block`);let t=document.createElement(`div`);t.style.display=`flex`,t.style.justifyContent=`center`;let n=Kr();return t.appendChild(n),i.addHTML(n,{effect:o}),t}let s=document.createElement(`img`);return s.src=n===`Jellyfish`?_:t,i.add(s,{effect:o}),s},args:{src:`Webpage`,cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`},argTypes:{src:{control:{type:`select`},options:[`Logo`,`Jellyfish`,`Webpage`]},cellSize:{control:{type:`range`,min:5,max:200,step:1}},pressRadius:{control:{type:`range`,min:0,max:800,step:10}},press:{control:{type:`range`,min:0,max:1,step:.01}},flatCells:{control:{type:`boolean`}},seed:{control:{type:`range`,min:0,max:1e3,step:1}},speed:{control:{type:`range`,min:0,max:5,step:.05}},breathe:{control:{type:`range`,min:0,max:1,step:.01}},breatheSpeed:{control:{type:`range`,min:0,max:5,step:.05}},breatheScale:{control:{type:`range`,min:10,max:500,step:5}},bgColor:{control:{type:`color`}}}},L=T(e=>new ht(e),{speed:1,intensity:1},{speed:{control:{type:`range`,min:0,max:5,step:.05}},intensity:{control:{type:`range`,min:0,max:3,step:.05}}}),R=T(e=>new dr(e),{speed:1,amount:10},{speed:{control:{type:`range`,min:0,max:5,step:.05}},amount:{control:{type:`range`,min:0,max:60,step:1}}}),z=T(e=>new sr(e),{speed:1,amount:.05},{speed:{control:{type:`range`,min:0,max:5,step:.05}},amount:{control:{type:`range`,min:0,max:.3,step:.005}}}),B=T(e=>new rr(e),{speed:1,frequency:1},{speed:{control:{type:`range`,min:0,max:5,step:.05}},frequency:{control:{type:`range`,min:.1,max:8,step:.1}}}),V=T(e=>new hr(e),{speed:1,amount:20,frequency:7,blur:2},{speed:{control:{type:`range`,min:0,max:5,step:.05}},amount:{control:{type:`range`,min:0,max:100,step:1}},frequency:{control:{type:`range`,min:1,max:30,step:.5}},blur:{control:{type:`range`,min:0,max:20,step:.5}}}),H=T(e=>new Ge(e),{threshold:.2,thickness:3,intensity:4,opacity:0,color1:`#ff0000`,color2:`#0000ff`,background:`#000000`},{threshold:{control:{type:`range`,min:0,max:1,step:.01}},thickness:{control:{type:`range`,min:.5,max:10,step:.5}},intensity:{control:{type:`range`,min:0,max:20,step:.1}},opacity:{control:{type:`range`,min:0,max:1,step:.01}},color1:{control:{type:`color`}},color2:{control:{type:`color`}},background:{control:{type:`color`}}},{clock:!1,src:v}),si=[`none`,`repeat`,`mirror`],ci=[`srgb`,`linear`,`oklab`],U=T(e=>new St({colors:[e.color1,e.color2,e.color3],scatter:e.scatter,offset:e.offset,repeat:e.repeat,frequency:e.frequency,mixSpace:e.mixSpace,speed:e.speed}),{color1:`#ffffff`,color2:`#3aa0ff`,color3:`#000000`,scatter:0,offset:0,repeat:`none`,frequency:1,mixSpace:`srgb`,speed:0},{color1:{control:{type:`color`}},color2:{control:{type:`color`}},color3:{control:{type:`color`}},scatter:{control:{type:`range`,min:0,max:1,step:.01}},offset:{control:{type:`range`,min:0,max:1,step:.01}},repeat:{control:{type:`select`},options:si},frequency:{control:{type:`range`,min:1,max:8,step:1}},mixSpace:{control:{type:`select`},options:ci},speed:{control:{type:`range`,min:-1,max:1,step:.01}}}),W=T(e=>new yr(e),{shift:.5,random:0,centerX:.5,centerY:.5,size:100,angle:0},{shift:{control:{type:`range`,min:-1,max:1,step:.01}},random:{control:{type:`range`,min:0,max:1,step:.01}},centerX:{control:{type:`range`,min:0,max:1,step:.01}},centerY:{control:{type:`range`,min:0,max:1,step:.01}},size:{control:{type:`range`,min:1,max:300,step:1}},angle:{control:{type:`range`,min:-180,max:180,step:1}}},{clock:!1}),G=T(e=>new $n(e),{offset:0,reach:.2,smoothness:0,centerX:.5,centerY:.5,angle:0},{offset:{control:{type:`range`,min:-1,max:1,step:.01}},reach:{control:{type:`range`,min:0,max:1,step:.01}},smoothness:{control:{type:`range`,min:0,max:1,step:.01}},centerX:{control:{type:`range`,min:0,max:1,step:.01}},centerY:{control:{type:`range`,min:0,max:1,step:.01}},angle:{control:{type:`range`,min:-180,max:180,step:1}}},{clock:!1}),li=[`sine wave`,`twist`,`ripple`],K=T(e=>new Hr(e),{type:`twist`,amplitude:3,frequency:1,centerX:.5,centerY:.5,speed:0},{type:{control:{type:`select`},options:li},amplitude:{control:{type:`range`,min:-10,max:10,step:.1}},frequency:{control:{type:`range`,min:.1,max:10,step:.1}},centerX:{control:{type:`range`,min:0,max:1,step:.01}},centerY:{control:{type:`range`,min:0,max:1,step:.01}},speed:{control:{type:`range`,min:0,max:5,step:.05}}}),ui=[`bayer2`,`bayer4`,`bayer8`,`bayer16`,`blueNoise`,`threshold`],q=T(e=>new Xe(e),{style:`threshold`,size:2,levels:3,brightness:1,contrast:1,mono:!1,monoColor:`#ffffff`},{style:{control:{type:`select`},options:ui},size:{control:{type:`range`,min:1,max:16,step:1}},levels:{control:{type:`range`,min:2,max:16,step:1}},brightness:{control:{type:`range`,min:0,max:2,step:.01}},contrast:{control:{type:`range`,min:0,max:4,step:.05}},mono:{control:{type:`boolean`}},monoColor:{control:{type:`color`}}},{clock:!1}),q.parameters={chromatic:{disableSnapshot:!0}},di=[`rectangle`,`ellipse`,`hexagon`,`triangle`],J=T(e=>new wr(e),{shape:`triangle`,size:10,stretch:1,gap:0,colorTrim:2,averageColor:.8,dissolve:0,falloff:0,knockout:!0},{shape:{control:{type:`select`},options:di},size:{control:{type:`range`,min:2,max:80,step:1}},stretch:{control:{type:`range`,min:.2,max:4,step:.1}},gap:{control:{type:`range`,min:0,max:1,step:.01}},colorTrim:{control:{type:`range`,min:0,max:8,step:1}},averageColor:{control:{type:`range`,min:0,max:1,step:.01}},dissolve:{control:{type:`range`,min:0,max:1,step:.01}},falloff:{control:{type:`range`,min:0,max:1,step:.01}},knockout:{control:{type:`boolean`}}},{clock:!1}),fi=[`lenticular`,`waves`,`circular`],pi=[`zero`,`clamp`,`repeat`,`mirror`],Y=T(e=>new Yn(e),{pattern:`lenticular`,strength:.5,smoothness:0,frost:0,dispersion:.04,edgeWrap:`zero`,centerX:.5,centerY:.5,stripWidth:.05,angle:0},{pattern:{control:{type:`select`},options:fi},strength:{control:{type:`range`,min:0,max:2,step:.01}},smoothness:{control:{type:`range`,min:0,max:1,step:.01}},frost:{control:{type:`range`,min:0,max:2,step:.01}},dispersion:{control:{type:`range`,min:0,max:1,step:.01}},edgeWrap:{control:{type:`select`},options:pi},centerX:{control:{type:`range`,min:0,max:1,step:.01}},centerY:{control:{type:`range`,min:0,max:1,step:.01}},stripWidth:{control:{type:`range`,min:.02,max:1,step:.01}},angle:{control:{type:`range`,min:-180,max:180,step:1}}},{clock:!1}),X=T(e=>new et({color1:E(e.color1),color2:E(e.color2),speed:e.speed}),{color1:`#ff0000`,color2:`#0000ff`,speed:.2},{color1:{control:{type:`color`}},color2:{control:{type:`color`}},speed:{control:{type:`range`,min:0,max:5,step:.05}}}),Z=T(e=>new Or({color1:E(e.color1),color2:E(e.color2),color3:E(e.color3),speed:e.speed}),{color1:`#ff0000`,color2:`#00ff00`,color3:`#0000ff`,speed:.2},{color1:{control:{type:`color`}},color2:{control:{type:`color`}},color3:{control:{type:`color`}},speed:{control:{type:`range`,min:0,max:5,step:.05}}}),mi=T(e=>new Mt(e),{shift:.5},{shift:{control:{type:`range`,min:0,max:1,step:.01}}},{clock:!1}),hi=T(e=>new Mr(e),{intensity:.5,radius:1,power:2},{intensity:{control:{type:`range`,min:0,max:2,step:.01}},radius:{control:{type:`range`,min:0,max:2,step:.01}},power:{control:{type:`range`,min:.1,max:5,step:.1}}},{clock:!1,src:v}),gi=T(e=>new ze(e),{intensity:.3,radius:0,power:2},{intensity:{control:{type:`range`,min:0,max:3,step:.01}},radius:{control:{type:`range`,min:0,max:2,step:.01}},power:{control:{type:`range`,min:.1,max:5,step:.1}}},{clock:!1,src:v}),_i=[`Pigeon`,`Jellyfish`,`Logo`,`WebCam`,`HTML`],vi={Pigeon:v,Jellyfish:_,Logo:t},yi=[`normal`,`bold`,`100`,`300`,`600`,`900`],bi={render:e=>{let t=a(),n=new Ce({preset:e.preset,grid:[e.gridX,e.gridY],font:e.font,fontWeight:e.fontWeight,color:E(e.color),background:E(e.background),colorFromSource:e.colorFromSource,invert:e.invert,dither:e.dither});return Xr(t,e.src,n)},args:{src:`Pigeon`,preset:`standard`,gridX:8,gridY:14,font:`monospace`,fontWeight:`normal`,color:`#ffffff`,background:`#000000`,colorFromSource:!1,invert:!1,dither:0},argTypes:{src:{control:{type:`select`},options:_i},preset:{control:{type:`select`},options:[`standard`,`minimal`,`blocks`,`dots`,`circles`,`detailed`]},gridX:{control:{type:`range`,min:4,max:48,step:1}},gridY:{control:{type:`range`,min:4,max:48,step:1}},font:{control:{type:`text`}},fontWeight:{control:{type:`select`},options:yi},color:{control:{type:`color`}},background:{control:{type:`color`}},colorFromSource:{control:{type:`boolean`}},invert:{control:{type:`boolean`}},dither:{control:{type:`range`,min:0,max:1,step:.05}}}},Q={render:e=>{let t=u(),n=a(t?{timeScale:0}:void 0),r=new an({grid:[e.gridX,e.gridY],glyphs:e.glyphs||void 0,font:e.font,fontWeight:e.fontWeight,color:e.gradient?[E(e.color),E(e.color2)]:E(e.color),headColor:E(e.headColor),background:E(e.background),speed:e.speed,tail:e.tail,tailFade:e.tailFade,birthRate:e.birthRate,glyphSpeed:e.glyphSpeed,brightness:e.brightness,contrast:e.contrast,invert:e.invert,seed:e.seed}),i=e.bloom>0?[r,new m({threshold:.1,softness:.2,intensity:e.bloom,scatter:.8,dither:0,edgeFade:.02,pad:60})]:r,o=Xr(n,e.src,i,t?()=>{n.setTime($r),n.render()}:void 0);return t||l(n),o},args:{src:`Logo`,gridX:8,gridY:8,glyphs:``,font:`monospace`,fontWeight:`normal`,color:`#2dff5c`,gradient:!1,color2:`#00b3ff`,headColor:`#d9ffe6`,background:`#000000`,speed:10,tail:18,tailFade:1,birthRate:.6,glyphSpeed:8,brightness:1,contrast:1,invert:!1,seed:0,bloom:1},argTypes:{src:{control:{type:`select`},options:_i},gridX:{control:{type:`range`,min:4,max:48,step:1}},gridY:{control:{type:`range`,min:4,max:48,step:1}},glyphs:{control:{type:`text`}},font:{control:{type:`text`}},fontWeight:{control:{type:`select`},options:yi},color:{control:{type:`color`}},gradient:{control:{type:`boolean`}},color2:{control:{type:`color`}},headColor:{control:{type:`color`}},background:{control:{type:`color`}},speed:{control:{type:`range`,min:1,max:40,step:1}},tail:{control:{type:`range`,min:2,max:48,step:1}},tailFade:{control:{type:`range`,min:0,max:1,step:.05}},birthRate:{control:{type:`range`,min:.05,max:5,step:.05}},glyphSpeed:{control:{type:`range`,min:0,max:30,step:1}},brightness:{control:{type:`range`,min:.2,max:3,step:.1}},contrast:{control:{type:`range`,min:0,max:4,step:.1}},invert:{control:{type:`boolean`}},seed:{control:{type:`range`,min:0,max:100,step:1}},bloom:{control:{type:`range`,min:0,max:8,step:.1}}}},xi=[`dots`,`rings`,`squares`],$={render:e=>{let t=a(),n=Array.from({length:6},(t,n)=>Zr(n,6,e.preset)),r=new Ce({tiles:n,grid:e.grid,background:[0,0,0,1]});return Xr(t,e.src,r)},args:{src:`Pigeon`,preset:`dots`,grid:14},argTypes:{src:{control:{type:`select`},options:_i},preset:{control:{type:`select`},options:xi},grid:{control:{type:`range`,min:4,max:48,step:1}}}},Si=`bloom.crtBloom.pixelSort.jpegGlitch.badJpeg.fluid.halftone.particle.particleExplode.voronoi.glitch.rgbShift.rgbGlitch.rainbow.sinewave.coloredEdges.gradientMap.sliceShift.pixelStretch.warp.dither.tilePixelate.patternRefraction.duotone.tritone.hueShift.vignette.chromatic.ascii.matrix.asciiTiles`.split(`.`),D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    img.style.display = "block";
    img.style.margin = "40px auto";
    return img;
  },
  args: undefined
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined,
  parameters: {
    chromatic: {
      disableSnapshot: true
    }
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  render: args => {
    const {
      src,
      ...params
    } = args;
    const vfx = initVFX();
    const effect = new JPEGGlitchEffect(params);
    attachOutputFpsMeter(effect);

    // bbb is a video; the rest are images.
    if (src === "bbb") {
      const video = document.createElement("video");
      video.src = BbbWebm;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      video.crossOrigin = "anonymous";
      video.style.display = "block";
      video.style.margin = "40px auto";
      video.style.maxWidth = "80vw";
      void video.play();
      vfx.add(video, {
        effect
      });
      return video;
    }
    const img = document.createElement("img");
    img.src = JPEG_GLITCH_IMAGES[src];
    img.style.display = "block";
    img.style.margin = "40px auto";
    vfx.add(img, {
      effect
    });
    return img;
  },
  args: {
    src: "Jellyfish",
    quality: 0.4,
    seed: 0.25,
    iterations: 24,
    resolutionScale: 1,
    randomFlip: true,
    vertical: false,
    speed: 0
  },
  argTypes: {
    src: {
      control: {
        type: "select"
      },
      options: ["Jellyfish", "Logo", "Pigeon", "bbb"]
    },
    quality: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.01
      }
    },
    seed: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.01
      }
    },
    iterations: {
      control: {
        type: "range",
        min: 1,
        max: 30,
        step: 1
      }
    },
    resolutionScale: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.01
      }
    },
    randomFlip: {
      control: {
        type: "boolean"
      }
    },
    vertical: {
      control: {
        type: "boolean"
      }
    },
    speed: {
      control: {
        type: "range",
        min: 0,
        max: 30,
        step: 0.5
      }
    }
  },
  parameters: {
    chromatic: {
      disableSnapshot: true
    }
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  render: args => {
    const {
      src,
      ...params
    } = args;
    const vfx = initVFX();
    const effect = new BadJpegEffect(params);

    // bbb is a video; the rest are images.
    if (src === "bbb") {
      const video = document.createElement("video");
      video.src = BbbWebm;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      video.crossOrigin = "anonymous";
      video.style.display = "block";
      video.style.margin = "40px auto";
      video.style.maxWidth = "80vw";
      void video.play();
      vfx.add(video, {
        effect
      });
      return video;
    }
    const img = document.createElement("img");
    img.src = BAD_JPEG_IMAGES[src];
    img.style.display = "block";
    img.style.margin = "40px auto";
    vfx.add(img, {
      effect
    });
    return img;
  },
  args: {
    src: "Jellyfish",
    quality: 8,
    iterations: 3,
    downscale: 1
  },
  argTypes: {
    src: {
      control: {
        type: "select"
      },
      options: ["Jellyfish", "Logo", "Pigeon", "bbb"]
    },
    quality: {
      control: {
        type: "range",
        min: 1,
        max: 100,
        step: 1
      }
    },
    iterations: {
      control: {
        type: "range",
        min: 1,
        max: 10,
        step: 1
      }
    },
    downscale: {
      control: {
        type: "range",
        min: 0.02,
        max: 1,
        step: 0.01
      }
    }
  },
  parameters: {
    chromatic: {
      disableSnapshot: true
    }
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...N.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  render: args => {
    const {
      src,
      ...effectArgs
    } = args;
    const vfx = initVFX();
    const effect = new VoronoiEffect(effectArgs);
    if (src === "Webpage") {
      // Webpage is taller than the viewport — switch storybook-root
      // from its default flex-centred layout (preset.css) to block
      // so the article anchors at the top and the page scrolls.
      const root = document.getElementById("storybook-root");
      if (root) {
        root.style.height = "auto";
        root.style.display = "block";
      }

      // wrapElement needs a parentNode at addHTML time so it can
      // splice the canvas wrapper between parent and target.
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.justifyContent = "center";
      const article = createVoronoiWebpage();
      wrapper.appendChild(article);
      vfx.addHTML(article, {
        effect
      });
      return wrapper;
    }
    const img = document.createElement("img");
    img.src = src === "Jellyfish" ? Jellyfish : Logo;
    vfx.add(img, {
      effect
    });
    return img;
  },
  args: {
    src: "Webpage",
    cellSize: 40,
    pressRadius: 200,
    press: 1,
    flatCells: false,
    seed: 0,
    speed: 0,
    breathe: 0,
    breatheSpeed: 0,
    breatheScale: 40,
    bgColor: "#00000000"
  },
  argTypes: {
    src: {
      control: {
        type: "select"
      },
      options: ["Logo", "Jellyfish", "Webpage"]
    },
    cellSize: {
      control: {
        type: "range",
        min: 5,
        max: 200,
        step: 1
      }
    },
    pressRadius: {
      control: {
        type: "range",
        min: 0,
        max: 800,
        step: 10
      }
    },
    press: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.01
      }
    },
    flatCells: {
      control: {
        type: "boolean"
      }
    },
    seed: {
      control: {
        type: "range",
        min: 0,
        max: 1000,
        step: 1
      }
    },
    speed: {
      control: {
        type: "range",
        min: 0,
        max: 5,
        step: 0.05
      }
    },
    breathe: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.01
      }
    },
    breatheSpeed: {
      control: {
        type: "range",
        min: 0,
        max: 5,
        step: 0.05
      }
    },
    breatheScale: {
      control: {
        type: "range",
        min: 10,
        max: 500,
        step: 5
      }
    },
    bgColor: {
      control: {
        type: "color"
      }
    }
  }
}`,...I.parameters?.docs?.source}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`presetStory<GlitchArgs>(a => new GlitchEffect(a), {
  speed: 1,
  intensity: 1
}, {
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  },
  intensity: {
    control: {
      type: "range",
      min: 0,
      max: 3,
      step: 0.05
    }
  }
})`,...L.parameters?.docs?.source}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`presetStory<RgbShiftArgs>(a => new RgbShiftEffect(a), {
  speed: 1,
  amount: 10
}, {
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  },
  amount: {
    control: {
      type: "range",
      min: 0,
      max: 60,
      step: 1
    }
  }
})`,...R.parameters?.docs?.source}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`presetStory<RgbGlitchArgs>(a => new RgbGlitchEffect(a), {
  speed: 1,
  amount: 0.05
}, {
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  },
  amount: {
    control: {
      type: "range",
      min: 0,
      max: 0.3,
      step: 0.005
    }
  }
})`,...z.parameters?.docs?.source}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`presetStory<RainbowArgs>(a => new RainbowEffect(a), {
  speed: 1,
  frequency: 1
}, {
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  },
  frequency: {
    control: {
      type: "range",
      min: 0.1,
      max: 8,
      step: 0.1
    }
  }
})`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`presetStory<SinewaveArgs>(a => new SinewaveEffect(a), {
  speed: 1,
  amount: 20,
  frequency: 7,
  blur: 2
}, {
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  },
  amount: {
    control: {
      type: "range",
      min: 0,
      max: 100,
      step: 1
    }
  },
  frequency: {
    control: {
      type: "range",
      min: 1,
      max: 30,
      step: 0.5
    }
  },
  blur: {
    control: {
      type: "range",
      min: 0,
      max: 20,
      step: 0.5
    }
  }
})`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`presetStory<ColoredEdgesArgs>(a => new ColoredEdgesEffect(a), {
  threshold: 0.2,
  thickness: 3,
  intensity: 4,
  opacity: 0,
  color1: "#ff0000",
  color2: "#0000ff",
  background: "#000000"
}, {
  threshold: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  thickness: {
    control: {
      type: "range",
      min: 0.5,
      max: 10,
      step: 0.5
    }
  },
  intensity: {
    control: {
      type: "range",
      min: 0,
      max: 20,
      step: 0.1
    }
  },
  opacity: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  color1: {
    control: {
      type: "color"
    }
  },
  color2: {
    control: {
      type: "color"
    }
  },
  background: {
    control: {
      type: "color"
    }
  }
}, {
  clock: false,
  src: Pigeon
})`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`presetStory<GradientMapArgs>(a => new GradientMapEffect({
  colors: [a.color1, a.color2, a.color3],
  scatter: a.scatter,
  offset: a.offset,
  repeat: a.repeat,
  frequency: a.frequency,
  mixSpace: a.mixSpace,
  speed: a.speed
}), {
  color1: "#ffffff",
  color2: "#3aa0ff",
  color3: "#000000",
  scatter: 0,
  offset: 0,
  repeat: "none",
  frequency: 1,
  mixSpace: "srgb",
  speed: 0
}, {
  color1: {
    control: {
      type: "color"
    }
  },
  color2: {
    control: {
      type: "color"
    }
  },
  color3: {
    control: {
      type: "color"
    }
  },
  scatter: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  offset: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  repeat: {
    control: {
      type: "select"
    },
    options: GRADIENT_REPEATS
  },
  frequency: {
    control: {
      type: "range",
      min: 1,
      max: 8,
      step: 1
    }
  },
  mixSpace: {
    control: {
      type: "select"
    },
    options: GRADIENT_MIX_SPACES
  },
  speed: {
    control: {
      type: "range",
      min: -1,
      max: 1,
      step: 0.01
    }
  }
})`,...U.parameters?.docs?.source}}},W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`presetStory<SliceShiftArgs>(a => new SliceShiftEffect(a), {
  shift: 0.5,
  random: 0,
  centerX: 0.5,
  centerY: 0.5,
  size: 100,
  angle: 0
}, {
  shift: {
    control: {
      type: "range",
      min: -1,
      max: 1,
      step: 0.01
    }
  },
  random: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  centerX: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  centerY: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  size: {
    control: {
      type: "range",
      min: 1,
      max: 300,
      step: 1
    }
  },
  angle: {
    control: {
      type: "range",
      min: -180,
      max: 180,
      step: 1
    }
  }
}, {
  clock: false
})`,...W.parameters?.docs?.source}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`presetStory<PixelStretchArgs>(a => new PixelStretchEffect(a), {
  offset: 0,
  reach: 0.2,
  smoothness: 0,
  centerX: 0.5,
  centerY: 0.5,
  angle: 0
}, {
  offset: {
    control: {
      type: "range",
      min: -1,
      max: 1,
      step: 0.01
    }
  },
  reach: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  smoothness: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  centerX: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  centerY: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  angle: {
    control: {
      type: "range",
      min: -180,
      max: 180,
      step: 1
    }
  }
}, {
  clock: false
})`,...G.parameters?.docs?.source}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`presetStory<WarpArgs>(a => new WarpEffect(a), {
  type: "twist",
  amplitude: 3,
  frequency: 1,
  centerX: 0.5,
  centerY: 0.5,
  speed: 0
}, {
  type: {
    control: {
      type: "select"
    },
    options: WARP_TYPES
  },
  amplitude: {
    control: {
      type: "range",
      min: -10,
      max: 10,
      step: 0.1
    }
  },
  frequency: {
    control: {
      type: "range",
      min: 0.1,
      max: 10,
      step: 0.1
    }
  },
  centerX: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  centerY: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  }
})`,...K.parameters?.docs?.source}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`presetStory<DitherArgs>(a => new DitherEffect(a), {
  style: "threshold",
  size: 2,
  levels: 3,
  brightness: 1,
  contrast: 1,
  mono: false,
  monoColor: "#ffffff"
}, {
  style: {
    control: {
      type: "select"
    },
    options: DITHER_STYLES
  },
  size: {
    control: {
      type: "range",
      min: 1,
      max: 16,
      step: 1
    }
  },
  levels: {
    control: {
      type: "range",
      min: 2,
      max: 16,
      step: 1
    }
  },
  brightness: {
    control: {
      type: "range",
      min: 0,
      max: 2,
      step: 0.01
    }
  },
  contrast: {
    control: {
      type: "range",
      min: 0,
      max: 4,
      step: 0.05
    }
  },
  mono: {
    control: {
      type: "boolean"
    }
  },
  monoColor: {
    control: {
      type: "color"
    }
  }
}, {
  clock: false
})`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`presetStory<TilePixelateArgs>(a => new TilePixelateEffect(a), {
  shape: "triangle",
  size: 10,
  stretch: 1,
  gap: 0,
  colorTrim: 2,
  averageColor: 0.8,
  dissolve: 0,
  falloff: 0,
  knockout: true
}, {
  shape: {
    control: {
      type: "select"
    },
    options: PIXELATE_SHAPES
  },
  size: {
    control: {
      type: "range",
      min: 2,
      max: 80,
      step: 1
    }
  },
  stretch: {
    control: {
      type: "range",
      min: 0.2,
      max: 4,
      step: 0.1
    }
  },
  gap: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  colorTrim: {
    control: {
      type: "range",
      min: 0,
      max: 8,
      step: 1
    }
  },
  averageColor: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  dissolve: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  falloff: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  knockout: {
    control: {
      type: "boolean"
    }
  }
}, {
  clock: false
})`,...J.parameters?.docs?.source}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`presetStory<PatternRefractionArgs>(a => new PatternRefractionEffect(a), {
  pattern: "lenticular",
  strength: 0.5,
  smoothness: 0,
  frost: 0,
  dispersion: 0.04,
  edgeWrap: "zero",
  centerX: 0.5,
  centerY: 0.5,
  stripWidth: 0.05,
  angle: 0
}, {
  pattern: {
    control: {
      type: "select"
    },
    options: REFRACTION_PATTERNS
  },
  strength: {
    control: {
      type: "range",
      min: 0,
      max: 2,
      step: 0.01
    }
  },
  smoothness: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  frost: {
    control: {
      type: "range",
      min: 0,
      max: 2,
      step: 0.01
    }
  },
  dispersion: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  edgeWrap: {
    control: {
      type: "select"
    },
    options: REFRACTION_EDGE_WRAPS
  },
  centerX: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  centerY: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  stripWidth: {
    control: {
      type: "range",
      min: 0.02,
      max: 1,
      step: 0.01
    }
  },
  angle: {
    control: {
      type: "range",
      min: -180,
      max: 180,
      step: 1
    }
  }
}, {
  clock: false
})`,...Y.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`presetStory<DuotoneArgs>(a => new DuotoneEffect({
  color1: hexToRgba(a.color1),
  color2: hexToRgba(a.color2),
  speed: a.speed
}), {
  color1: "#ff0000",
  color2: "#0000ff",
  speed: 0.2
}, {
  color1: {
    control: {
      type: "color"
    }
  },
  color2: {
    control: {
      type: "color"
    }
  },
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  }
})`,...X.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`presetStory<TritoneArgs>(a => new TritoneEffect({
  color1: hexToRgba(a.color1),
  color2: hexToRgba(a.color2),
  color3: hexToRgba(a.color3),
  speed: a.speed
}), {
  color1: "#ff0000",
  color2: "#00ff00",
  color3: "#0000ff",
  speed: 0.2
}, {
  color1: {
    control: {
      type: "color"
    }
  },
  color2: {
    control: {
      type: "color"
    }
  },
  color3: {
    control: {
      type: "color"
    }
  },
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  }
})`,...Z.parameters?.docs?.source}}},mi.parameters={...mi.parameters,docs:{...mi.parameters?.docs,source:{originalSource:`presetStory<HueShiftArgs>(a => new HueShiftEffect(a), {
  shift: 0.5
}, {
  shift: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  }
}, {
  clock: false
})`,...mi.parameters?.docs?.source}}},hi.parameters={...hi.parameters,docs:{...hi.parameters?.docs,source:{originalSource:`presetStory<VignetteArgs>(a => new VignetteEffect(a), {
  intensity: 0.5,
  radius: 1.0,
  power: 2.0
}, {
  intensity: {
    control: {
      type: "range",
      min: 0,
      max: 2,
      step: 0.01
    }
  },
  radius: {
    control: {
      type: "range",
      min: 0,
      max: 2,
      step: 0.01
    }
  },
  power: {
    control: {
      type: "range",
      min: 0.1,
      max: 5,
      step: 0.1
    }
  }
}, {
  clock: false,
  src: Pigeon
})`,...hi.parameters?.docs?.source}}},gi.parameters={...gi.parameters,docs:{...gi.parameters?.docs,source:{originalSource:`presetStory<ChromaticArgs>(a => new ChromaticEffect(a), {
  intensity: 0.3,
  radius: 0.0,
  power: 2.0
}, {
  intensity: {
    control: {
      type: "range",
      min: 0,
      max: 3,
      step: 0.01
    }
  },
  radius: {
    control: {
      type: "range",
      min: 0,
      max: 2,
      step: 0.01
    }
  },
  power: {
    control: {
      type: "range",
      min: 0.1,
      max: 5,
      step: 0.1
    }
  }
}, {
  clock: false,
  src: Pigeon
})`,...gi.parameters?.docs?.source}}},bi.parameters={...bi.parameters,docs:{...bi.parameters?.docs,source:{originalSource:`{
  render: a => {
    const vfx = initVFX();
    const effect = new AsciiEffect({
      preset: a.preset,
      grid: [a.gridX, a.gridY],
      font: a.font,
      fontWeight: a.fontWeight,
      color: hexToRgba(a.color),
      background: hexToRgba(a.background),
      colorFromSource: a.colorFromSource,
      invert: a.invert,
      dither: a.dither
    });
    return addAsciiSource(vfx, a.src, effect);
  },
  args: {
    src: "Pigeon",
    preset: "standard",
    gridX: 8,
    gridY: 14,
    font: "monospace",
    fontWeight: "normal",
    color: "#ffffff",
    background: "#000000",
    colorFromSource: false,
    invert: false,
    dither: 0
  },
  argTypes: {
    src: {
      control: {
        type: "select"
      },
      options: ASCII_SRCS
    },
    preset: {
      control: {
        type: "select"
      },
      options: ["standard", "minimal", "blocks", "dots", "circles", "detailed"]
    },
    gridX: {
      control: {
        type: "range",
        min: 4,
        max: 48,
        step: 1
      }
    },
    gridY: {
      control: {
        type: "range",
        min: 4,
        max: 48,
        step: 1
      }
    },
    font: {
      control: {
        type: "text"
      }
    },
    fontWeight: {
      control: {
        type: "select"
      },
      options: FONT_WEIGHTS
    },
    color: {
      control: {
        type: "color"
      }
    },
    background: {
      control: {
        type: "color"
      }
    },
    colorFromSource: {
      control: {
        type: "boolean"
      }
    },
    invert: {
      control: {
        type: "boolean"
      }
    },
    dither: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.05
      }
    }
  }
}`,...bi.parameters?.docs?.source}}},Q.parameters={...Q.parameters,docs:{...Q.parameters?.docs,source:{originalSource:`{
  render: a => {
    // The rain is a pure function of the clock + seed (no Math.random),
    // so under VRT freeze the clock (timeScale 0) and pin it to a fixed
    // frame once added — Chromatic then captures the same pattern every
    // run.
    const vrt = isChromatic();
    const vfx = initVFX(vrt ? {
      timeScale: 0
    } : undefined);
    const effect = new MatrixEffect({
      grid: [a.gridX, a.gridY],
      glyphs: a.glyphs || undefined,
      font: a.font,
      fontWeight: a.fontWeight,
      // gradient on → two-stop vertical gradient (top → bottom),
      // interpolated in OKLCH; off → a single flat colour.
      color: a.gradient ? [hexToRgba(a.color), hexToRgba(a.color2)] : hexToRgba(a.color),
      headColor: hexToRgba(a.headColor),
      background: hexToRgba(a.background),
      speed: a.speed,
      tail: a.tail,
      tailFade: a.tailFade,
      birthRate: a.birthRate,
      glyphSpeed: a.glyphSpeed,
      brightness: a.brightness,
      contrast: a.contrast,
      invert: a.invert,
      seed: a.seed
    });
    // bloom = 0 → bypass (rain only); otherwise chain a low-threshold
    // BloomEffect whose intensity is the slider value, so the green
    // glyphs glow like the film's phosphor CRT.
    const effects = a.bloom > 0 ? [effect, new BloomEffect({
      threshold: 0.1,
      softness: 0.2,
      intensity: a.bloom,
      scatter: 0.8,
      dither: 0,
      edgeFade: 0.02,
      pad: 60
    })] : effect;
    const el = addAsciiSource(vfx, a.src, effects, vrt ? () => {
      vfx.setTime(VRT_TIME);
      vfx.render();
    } : undefined);
    if (!vrt) {
      attachClockPane(vfx);
    }
    return el;
  },
  args: {
    src: "Logo",
    gridX: 8,
    gridY: 8,
    glyphs: "",
    font: "monospace",
    fontWeight: "normal",
    color: "#2dff5c",
    gradient: false,
    color2: "#00b3ff",
    headColor: "#d9ffe6",
    background: "#000000",
    speed: 10,
    tail: 18,
    tailFade: 1,
    birthRate: 0.6,
    glyphSpeed: 8,
    brightness: 1,
    contrast: 1,
    invert: false,
    seed: 0,
    bloom: 1.0
  },
  argTypes: {
    src: {
      control: {
        type: "select"
      },
      options: ASCII_SRCS
    },
    gridX: {
      control: {
        type: "range",
        min: 4,
        max: 48,
        step: 1
      }
    },
    gridY: {
      control: {
        type: "range",
        min: 4,
        max: 48,
        step: 1
      }
    },
    glyphs: {
      control: {
        type: "text"
      }
    },
    font: {
      control: {
        type: "text"
      }
    },
    fontWeight: {
      control: {
        type: "select"
      },
      options: FONT_WEIGHTS
    },
    color: {
      control: {
        type: "color"
      }
    },
    gradient: {
      control: {
        type: "boolean"
      }
    },
    color2: {
      control: {
        type: "color"
      }
    },
    headColor: {
      control: {
        type: "color"
      }
    },
    background: {
      control: {
        type: "color"
      }
    },
    speed: {
      control: {
        type: "range",
        min: 1,
        max: 40,
        step: 1
      }
    },
    tail: {
      control: {
        type: "range",
        min: 2,
        max: 48,
        step: 1
      }
    },
    tailFade: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.05
      }
    },
    birthRate: {
      control: {
        type: "range",
        min: 0.05,
        max: 5,
        step: 0.05
      }
    },
    glyphSpeed: {
      control: {
        type: "range",
        min: 0,
        max: 30,
        step: 1
      }
    },
    brightness: {
      control: {
        type: "range",
        min: 0.2,
        max: 3,
        step: 0.1
      }
    },
    contrast: {
      control: {
        type: "range",
        min: 0,
        max: 4,
        step: 0.1
      }
    },
    invert: {
      control: {
        type: "boolean"
      }
    },
    seed: {
      control: {
        type: "range",
        min: 0,
        max: 100,
        step: 1
      }
    },
    bloom: {
      control: {
        type: "range",
        min: 0,
        max: 8,
        step: 0.1
      }
    }
  }
}`,...Q.parameters?.docs?.source}}},$.parameters={...$.parameters,docs:{...$.parameters?.docs,source:{originalSource:`{
  render: a => {
    const vfx = initVFX();
    const count = 6;
    const tiles = Array.from({
      length: count
    }, (_, i) => makeTileCanvas(i, count, a.preset));
    const effect = new AsciiEffect({
      tiles,
      grid: a.grid,
      background: [0, 0, 0, 1]
    });
    return addAsciiSource(vfx, a.src, effect);
  },
  args: {
    src: "Pigeon",
    preset: "dots",
    grid: 14
  },
  argTypes: {
    src: {
      control: {
        type: "select"
      },
      options: ASCII_SRCS
    },
    preset: {
      control: {
        type: "select"
      },
      options: ASCII_TILE_SHAPES
    },
    grid: {
      control: {
        type: "range",
        min: 4,
        max: 48,
        step: 1
      }
    }
  }
}`,...$.parameters?.docs?.source}}}})))()}Ci();export{Si as __namedExportsOrder,bi as ascii,$ as asciiTiles,j as badJpeg,D as bloom,gi as chromatic,H as coloredEdges,O as crtBloom,Qr as default,q as dither,X as duotone,M as fluid,L as glitch,U as gradientMap,N as halftone,mi as hueShift,A as jpegGlitch,Q as matrix,P as particle,F as particleExplode,Y as patternRefraction,k as pixelSort,G as pixelStretch,B as rainbow,z as rgbGlitch,R as rgbShift,V as sinewave,W as sliceShift,J as tilePixelate,Z as tritone,hi as vignette,I as voronoi,K as warp};