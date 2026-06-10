import{n as e}from"./chunk-BneVvdWh.js";var t,n,r,i,a,o,s,c,l,u,d,f,p=e((()=>{t=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
`,n=`
const float PI = 3.141592653589793;
float cc(int k){ return k == 0 ? 0.7071067811865476 : 1.0; }
`,r=`
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
`,i=`
  ivec2 res = textureSize(src, 0);
  ivec2 p   = ivec2(uvSrc * vec2(res));
  ivec2 b   = (p / 8) * 8;
  ivec2 l   = p - b;
`,a=`${t}
void main(){
  vec4 c = texture(src, uvSrc);
  outColor = vec4(c.rgb * c.a, c.a);
}`,o=`${t}${n}${r}
void main(){
${i}
  vec4 sum = vec4(0.0);
  for (int x = 0; x < 8; x++) {
    vec4 t = texelFetch(src, clamp(b + ivec2(x, l.y), ivec2(0), res - 1), 0);
    vec4 f = (vec4(rgb2ycc(t.rgb), t.a) - vec4(0.5, 0.0, 0.0, 0.5)) * 255.0;
    sum += f * cos(float(2*x+1) * float(l.x) * PI / 16.0);
  }
  outColor = sum * 0.5 * cc(l.x);
}`,s=`${t}${n}
void main(){
${i}
  vec4 sum = vec4(0.0);
  for (int y = 0; y < 8; y++)
    sum += texelFetch(src, clamp(b + ivec2(l.x, y), ivec2(0), res - 1), 0)
         * cos(float(2*y+1) * float(l.y) * PI / 16.0);
  outColor = sum * 0.5 * cc(l.y);
}`,c=`${t}${n}
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
${i}
  vec4 sum = vec4(0.0);
  for (int v = 0; v < 8; v++) {
    int idx = v * 8 + l.x;
    vec4 F  = texelFetch(src, clamp(b + ivec2(l.x, v), ivec2(0), res - 1), 0);
    vec4 q  = vec4(qstep(LQ[idx]), qstep(CQ[idx]), qstep(CQ[idx]), qstep(LQ[idx]));
    sum += cc(v) * round(F / q) * q * cos(float(2*l.y+1) * float(v) * PI / 16.0);
  }
  outColor = sum * 0.5;
}`,l=`${t}${n}${r}
void main(){
${i}
  vec4 sum = vec4(0.0);
  for (int u = 0; u < 8; u++)
    sum += cc(u) * texelFetch(src, clamp(b + ivec2(u, l.y), ivec2(0), res - 1), 0)
         * cos(float(2*l.x+1) * float(u) * PI / 16.0);
  sum = sum * 0.5 / 255.0 + vec4(0.5, 0.0, 0.0, 0.5);
  outColor = clamp(vec4(ycc2rgb(sum.xyz), sum.w), 0.0, 1.0);
}`,u=`${t}${r}
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
}`,d=[`coeff`,`tmp`,`sub`,`a`,`b`],f=class{constructor({quality:e=8,iterations:t=3,downscale:n=1}={}){this.lowRes=null,this.quality=e,this.iterations=t,this.downscale=n}ensureLowRes(e,t,n){if(this.lowRes&&this.lowRes.w===t&&this.lowRes.h===n)return this.lowRes;this.disposeLowRes();let r=[t,n];return this.lowRes={w:t,h:n,coeff:e.createRenderTarget({float:!0,size:r}),tmp:e.createRenderTarget({float:!0,size:r}),sub:e.createRenderTarget({size:r}),a:e.createRenderTarget({size:r}),b:e.createRenderTarget({size:r})},this.lowRes}disposeLowRes(){if(this.lowRes){for(let e of d)this.lowRes[e].dispose();this.lowRes=null}}render(e){let t=Math.max(1,Math.min(10,this.iterations|0)),n=Math.max(1,Math.min(100,this.quality)),r=n<50?5e3/n:200-2*n,i=Math.max(.02,Math.min(1,this.downscale)),[d,f]=e.dims.element,p=Math.max(1,Math.floor(d*i)),m=Math.max(1,Math.floor(f*i)),h=this.ensureLowRes(e,p,m);e.draw({frag:a,uniforms:{src:e.src},target:h.a});let g=h.a;for(let n=0;n<t;n++){e.draw({frag:u,uniforms:{src:g},target:h.sub}),e.draw({frag:o,uniforms:{src:h.sub},target:h.tmp}),e.draw({frag:s,uniforms:{src:h.tmp},target:h.coeff}),e.draw({frag:c,uniforms:{src:h.coeff,uS:r},target:h.tmp});let t=n%2==0?h.b:h.a;e.draw({frag:l,uniforms:{src:h.tmp},target:t}),g=t}e.blit(g,e.target)}dispose(){this.disposeLowRes()}}})),m,h,g,_,v,y,ee,te,ne,re,ie,ae,oe,se,ce,le,ue,de=e((()=>{m=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},h=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ie=`#version 300 es
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
`,ae=`#version 300 es
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
`,oe=`#version 300 es
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
`,se=`#version 300 es
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
`,ce={threshold:.7,softness:.1,intensity:1.2,scatter:.7,pad:50,dither:0,edgeFade:.02},le=.5,ue=class{constructor(e={}){g.add(this),_.set(this,null),v.set(this,[]),y.set(this,[]),ee.set(this,!1),te.set(this,0),ne.set(this,0),this.params={...ce,...e}}setParams(e){Object.assign(this.params,e)}init(e){m(this,_,e.createRenderTarget({float:!0}),`f`)}render(e){if(!h(this,_,`f`))return;let{threshold:t,softness:n,intensity:r}=this.params,i=Math.min(Math.max(this.params.scatter,0),1),a=Math.max(0,this.params.dither),o=Math.max(1e-6,this.params.edgeFade);(h(this,_,`f`).width!==h(this,te,`f`)||h(this,_,`f`).height!==h(this,ne,`f`))&&(h(this,v,`f`).length=0,h(this,y,`f`).length=0,m(this,ee,!1,`f`),m(this,te,h(this,_,`f`).width,`f`),m(this,ne,h(this,_,`f`).height,`f`)),h(this,g,`m`,re).call(this,e,h(this,_,`f`).width,h(this,_,`f`).height);let s=h(this,v,`f`).length;if(s===0)return;e.draw({frag:ie,uniforms:{src:e.src,threshold:t,softness:n,edgeFade:o},target:h(this,_,`f`)}),e.draw({frag:ae,uniforms:{src:h(this,_,`f`),texelSize:[1/h(this,_,`f`).width,1/h(this,_,`f`).height],karis:1},target:h(this,v,`f`)[0]});for(let t=1;t<s;t++){let n=h(this,v,`f`)[t-1];e.draw({frag:ae,uniforms:{src:n,texelSize:[1/n.width,1/n.height],karis:0},target:h(this,v,`f`)[t]})}let c=h(this,_,`f`).width,l=h(this,_,`f`).height,u=1+i*Math.max(0,s-1),d=e=>Math.min(1,Math.max(0,u-e));for(let t=s-2;t>=0;t--){let n=t===s-2?h(this,v,`f`)[s-1]:h(this,y,`f`)[t+1],r=2**(t+2),i=t===s-2?d(s-1):1;e.draw({frag:oe,uniforms:{srcSmall:n,srcLarge:h(this,v,`f`)[t],texelSize:[le*r/c,le*r/l],weightLarge:d(t),weightSmall:i},target:h(this,y,`f`)[t]})}let f=s>=2?h(this,y,`f`)[0]:h(this,v,`f`)[0],p=r/Math.max(1,u);e.draw({frag:se,uniforms:{src:e.src,bloom:f,texelSize:[le*2/c,le*2/l],intensity:p,dither:a,edgeFade:o},target:e.target})}outputRect(e){let{pad:t}=this.params;if(t===`fullscreen`)return e.canvasRect;let n=t*e.pixelRatio,[,,r,i]=e.contentRect;return[-n,-n,r+2*n,i+2*n]}dispose(){m(this,_,null,`f`),h(this,v,`f`).length=0,h(this,y,`f`).length=0,m(this,ee,!1,`f`),m(this,te,0,`f`),m(this,ne,0,`f`)}},_=new WeakMap,v=new WeakMap,y=new WeakMap,ee=new WeakMap,te=new WeakMap,ne=new WeakMap,g=new WeakSet,re=function(e,t,n){if(h(this,ee,`f`))return;let r=Math.max(1,Math.floor(t/2)),i=Math.max(1,Math.floor(n/2));for(let t=0;t<8;t++){h(this,v,`f`).push(e.createRenderTarget({size:[r,i],float:!0}));let t=Math.max(1,Math.floor(r/2)),n=Math.max(1,Math.floor(i/2));if(t===r&&n===i)break;r=t,i=n}for(let t=0;t<h(this,v,`f`).length-1;t++)h(this,y,`f`).push(e.createRenderTarget({size:[h(this,v,`f`)[t].width,h(this,v,`f`)[t].height],float:!0}));m(this,ee,!0,`f`)}})),b,x,fe,S,C,pe,me,he,ge,_e,ve,ye,be,xe,Se,Ce,we,Te,Ee,De,Oe,ke,Ae,je,Me,Ne,Pe,Fe,Ie,Le,Re,ze,Be,Ve,He=e((()=>{b=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},x=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ke=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D tex;
void main() {
    vec4 c = texture(tex, uvContent);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,Ae=`#version 300 es
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
`,je=`#version 300 es
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
`,Me=`#version 300 es
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
`,Ne=`#version 300 es
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
`,Pe=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D uResidual;
void main() {
    vec3 r = texture(uResidual, uvContent).rgb;
    outColor = vec4(clamp(r * 0.5 + 0.5, 0.0, 1.0), 1.0);
}
`,Fe=`
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 chroma(vec3 c) {
    return vec2(dot(c, vec3(-0.168736, -0.331264, 0.5)),
                dot(c, vec3(0.5, -0.418688, -0.081312))) + 0.5;
}
`,Ie=`#version 300 es
precision highp float;
${Fe}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uCur, uRef, uMV;
uniform vec2 uChromaRes;
void main() {
    vec2 mvc = floor(texture(uMV, uv).rg * 0.5);
    vec2 pred = chroma(texture(uRef, uv + mvc / uChromaRes).rgb);
    outColor = vec4(chroma(texture(uCur, uv).rgb) - pred, 0.0, 1.0);
}
`,Le=`#version 300 es
precision highp float;
${Fe}
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
`,Re=`#version 300 es
precision highp float;
${Fe}
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
`,ze=`#version 300 es
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
`,Be={blockSize:16,searchRange:5,searchStep:2,useResidual:!0,dup:0,colorSpace:`ycbcr`,chromaGain:1,view:`output`},Ve=class{constructor(e={}){fe.add(this),S.set(this,!1),C.set(this,!0),pe.set(this,null),me.set(this,null),he.set(this,null),ge.set(this,null),_e.set(this,null),ve.set(this,null),ye.set(this,null),be.set(this,0),xe.set(this,0),Se.set(this,0),Ce.set(this,0),we.set(this,0),Te.set(this,void 0),this.params={...Be,...e},b(this,Te,this.params.colorSpace,`f`)}setParams(e){Object.assign(this.params,e)}enable(){b(this,S,!0,`f`)}disable(){b(this,S,!1,`f`),b(this,C,!0,`f`)}get enabled(){return x(this,S,`f`)}render(e){x(this,fe,`m`,De).call(this,e);let t=x(this,pe,`f`),n=x(this,me,`f`),r=x(this,he,`f`),i=x(this,ge,`f`),a=x(this,_e,`f`),o=x(this,ve,`f`),s=x(this,ye,`f`);if(!t||!n||!r||!i||!a||!o||!s)return;this.params.colorSpace!==x(this,Te,`f`)&&(b(this,Te,this.params.colorSpace,`f`),b(this,C,!0,`f`));let c=[x(this,be,`f`),x(this,xe,`f`)];e.blit(e.src,t);let l=this.params.view!==`output`;if((x(this,S,`f`)||l)&&(e.draw({frag:Ae,uniforms:{uCur:t,uRef:n,uResolution:c,uBlock:x(this,we,`f`),uSearch:this.params.searchRange,uStep:this.params.searchStep},target:r}),e.draw({frag:je,uniforms:{uCur:t,uRef:n,uMV:r,uResolution:c},target:i})),x(this,S,`f`)){let l=x(this,C,`f`)?1:1+this.params.dup,u=[x(this,Se,`f`),x(this,Ce,`f`)];this.params.colorSpace===`ycbcr`&&e.draw({frag:Ie,uniforms:{uCur:t,uRef:n,uMV:r,uChromaRes:u},target:s});for(let n=0;n<l;n++){let l=this.params.useResidual&&n===0;this.params.colorSpace===`ycbcr`?(e.draw({frag:Le,uniforms:{uAccum:a,uMV:r,uVideo:t,uResidual:i,uResolution:c,uIntra:x(this,C,`f`),uUseResidual:l},target:a}),e.draw({frag:Re,uniforms:{uChromaAcc:o,uMV:r,uVideo:t,uResidualC:s,uChromaRes:u,uIntra:x(this,C,`f`),uUseResidual:l},target:o})):e.draw({frag:Me,uniforms:{uAccum:a,uMV:r,uVideo:t,uResidual:i,uResolution:c,uIntra:x(this,C,`f`),uUseResidual:l},target:a})}b(this,C,!1,`f`)}else b(this,C,!0,`f`);x(this,fe,`m`,Oe).call(this,e,t,n,r,i,a,o),e.blit(e.src,n)}dispose(){x(this,fe,`m`,Ee).call(this),b(this,be,0,`f`),b(this,xe,0,`f`),b(this,Se,0,`f`),b(this,Ce,0,`f`),b(this,we,0,`f`),b(this,C,!0,`f`)}},S=new WeakMap,C=new WeakMap,pe=new WeakMap,me=new WeakMap,he=new WeakMap,ge=new WeakMap,_e=new WeakMap,ve=new WeakMap,ye=new WeakMap,be=new WeakMap,xe=new WeakMap,Se=new WeakMap,Ce=new WeakMap,we=new WeakMap,Te=new WeakMap,fe=new WeakSet,Ee=function(){x(this,pe,`f`)?.dispose(),x(this,me,`f`)?.dispose(),x(this,he,`f`)?.dispose(),x(this,ge,`f`)?.dispose(),x(this,_e,`f`)?.dispose(),x(this,ve,`f`)?.dispose(),x(this,ye,`f`)?.dispose(),b(this,pe,null,`f`),b(this,me,null,`f`),b(this,he,null,`f`),b(this,ge,null,`f`),b(this,_e,null,`f`),b(this,ve,null,`f`),b(this,ye,null,`f`)},De=function(e){let[t,n]=e.dims.elementPixel,r=Math.max(2,this.params.blockSize);if(x(this,be,`f`)===t&&x(this,xe,`f`)===n&&x(this,we,`f`)===r)return;x(this,fe,`m`,Ee).call(this),b(this,be,t,`f`),b(this,xe,n,`f`),b(this,Se,Math.ceil(t/2),`f`),b(this,Ce,Math.ceil(n/2),`f`),b(this,we,r,`f`),b(this,C,!0,`f`);let i=Math.ceil(t/r),a=Math.ceil(n/r);b(this,pe,e.createRenderTarget({size:[t,n]}),`f`),b(this,me,e.createRenderTarget({size:[t,n],persistent:!0}),`f`),b(this,ge,e.createRenderTarget({size:[t,n],float:!0}),`f`),b(this,_e,e.createRenderTarget({size:[t,n],float:!0,persistent:!0}),`f`),b(this,ve,e.createRenderTarget({size:[x(this,Se,`f`),x(this,Ce,`f`)],float:!0,persistent:!0}),`f`),b(this,ye,e.createRenderTarget({size:[x(this,Se,`f`),x(this,Ce,`f`)],float:!0}),`f`),b(this,he,e.createRenderTarget({size:[i,a],float:!0,filter:`nearest`}),`f`)},Oe=function(e,t,n,r,i,a,o){switch(this.params.view){case`motion`:e.draw({frag:Ne,uniforms:{uMV:r,uMvScale:this.params.searchRange*this.params.searchStep},target:e.target});return;case`residual`:e.draw({frag:Pe,uniforms:{uResidual:i},target:e.target});return;case`current`:e.draw({frag:ke,uniforms:{tex:t},target:e.target});return;case`previous`:e.draw({frag:ke,uniforms:{tex:n},target:e.target});return;default:x(this,S,`f`)&&this.params.colorSpace===`ycbcr`?e.draw({frag:ze,uniforms:{uLumaAcc:a,uChromaAcc:o,uChromaGain:this.params.chromaGain},target:e.target}):e.draw({frag:ke,uniforms:{tex:x(this,S,`f`)?a:t},target:e.target})}}})),w,T,Ue,We,Ge,Ke,qe,Je,E,Ye,Xe,Ze,Qe,$e,et,tt,nt,rt,it,at,ot,st,ct,lt=e((()=>{w=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},T=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Qe=`#version 300 es
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
`,$e=`#version 300 es
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
`,et=`#version 300 es
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
`,tt=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,nt=`#version 300 es
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
`,rt=`#version 300 es
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
`,it=`#version 300 es
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
`,at=`#version 300 es
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
`,ot=`#version 300 es
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
`,st={simSize:[256,256],pressureIterations:1,curlStrength:13,velocityDissipation:.6,densityDissipation:.65,splatForce:6e3,splatRadius:.002,dyeSplatRadius:.001,dyeSplatIntensity:.005,showDye:!1},ct=class{constructor(e={}){Ue.set(this,null),We.set(this,null),Ge.set(this,null),Ke.set(this,null),qe.set(this,null),Je.set(this,null),E.set(this,null),Ye.set(this,null),Xe.set(this,[0,0]),Ze.set(this,!1),this.params={...st,...e}}init(e){let t=this.params.simSize,n={size:t,float:!0};w(this,Ue,e.createRenderTarget(n),`f`),w(this,We,e.createRenderTarget(n),`f`),w(this,Ge,e.createRenderTarget(n),`f`),w(this,Ke,e.createRenderTarget(n),`f`),w(this,qe,e.createRenderTarget(n),`f`),w(this,Je,e.createRenderTarget(n),`f`),w(this,E,e.createRenderTarget({size:t,float:!0,persistent:!0}),`f`),w(this,Ye,e.createRenderTarget({float:!0,persistent:!0}),`f`)}render(e){if(!T(this,Ue,`f`)||!T(this,We,`f`)||!T(this,Ge,`f`)||!T(this,Ke,`f`)||!T(this,qe,`f`)||!T(this,Je,`f`)||!T(this,E,`f`)||!T(this,Ye,`f`))return;let{simSize:t,pressureIterations:n,curlStrength:r,velocityDissipation:i,densityDissipation:a,splatForce:o,splatRadius:s,dyeSplatRadius:c,dyeSplatIntensity:l,showDye:u}=this.params,d=[1/t[0],1/t[1]],[f,p]=e.dims.elementPixel,m=f/p,h=[e.mouse[0]/f,e.mouse[1]/p],g=T(this,Ze,`f`)?[h[0]-T(this,Xe,`f`)[0],h[1]-T(this,Xe,`f`)[1]]:[0,0];w(this,Xe,h,`f`),w(this,Ze,!0,`f`),e.draw({frag:Qe,uniforms:{velocity:T(this,E,`f`),simTexel:d},target:T(this,Ue,`f`)}),e.draw({frag:$e,uniforms:{velocity:T(this,E,`f`),curl:T(this,Ue,`f`),simTexel:d,aspect:m,mouseUv:h,mouseDeltaUv:g,curlStrength:r,splatForce:o,splatRadius:s},target:T(this,We,`f`)}),e.draw({frag:et,uniforms:{vortVel:T(this,We,`f`),simTexel:d},target:T(this,Ge,`f`)}),e.draw({frag:tt,target:T(this,Ke,`f`)});let _=T(this,Ke,`f`),v=T(this,qe,`f`);for(let t=0;t<n;t++){e.draw({frag:nt,uniforms:{pressure:_,divergence:T(this,Ge,`f`),simTexel:d},target:v});let t=_;_=v,v=t}e.draw({frag:rt,uniforms:{vortVel:T(this,We,`f`),pressure:_,simTexel:d},target:T(this,Je,`f`)}),e.draw({frag:it,uniforms:{projVel:T(this,Je,`f`),simTexel:d,velocityDissipation:i},target:T(this,E,`f`)}),e.draw({frag:at,uniforms:{velocity:T(this,E,`f`),dye:T(this,Ye,`f`),time:e.time,aspect:m,mouseUv:h,mouseDeltaUv:g,simSize:t,densityDissipation:a,dyeSplatRadius:c,dyeSplatIntensity:l},target:T(this,Ye,`f`)}),e.draw({frag:ot,uniforms:{src:e.src,dye:T(this,Ye,`f`),velocity:T(this,E,`f`),simSize:t,showDye:+!!u,time:e.time},target:e.target})}dispose(){w(this,Ue,null,`f`),w(this,We,null,`f`),w(this,Ge,null,`f`),w(this,Ke,null,`f`),w(this,qe,null,`f`),w(this,Je,null,`f`),w(this,E,null,`f`),w(this,Ye,null,`f`),w(this,Ze,!1,`f`)}},Ue=new WeakMap,We=new WeakMap,Ge=new WeakMap,Ke=new WeakMap,qe=new WeakMap,Je=new WeakMap,E=new WeakMap,Ye=new WeakMap,Xe=new WeakMap,Ze=new WeakMap})),ut,dt,ft,pt,mt,ht=e((()=>{ut={pure:{cyan:[0,1,1,1],magenta:[1,0,1,1],yellow:[1,1,0,1],black:[0,0,0,1],red:[1,0,0,1],green:[0,1,0,1],blue:[0,0,1,1]},newsprint:{cyan:[.15,.73,.88,1],magenta:[.88,.12,.55,1],yellow:[.97,.93,.08,1],black:[.1,.1,.1,1]},fogra51:{cyan:[0,.525,.765,1],magenta:[.827,0,.486,1],yellow:[.984,.91,0,1],black:[.145,.145,.145,1]},swop:{cyan:[0,.557,.769,1],magenta:[.827,.02,.478,1],yellow:[.984,.902,.027,1],black:[.169,.169,.169,1]}},dt=`#version 300 es
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
`,ft={...ut.pure,...ut.newsprint},pt={gridSize:10,dotSize:1,smoothing:.15,angle:0,mode:`rgb`,blackAmount:1,trimEdge:!0,background:[0,0,0,0],inkPalette:ft},mt=class{constructor(e={}){this.params={...pt,...e,inkPalette:{...ft,...e.inkPalette??{}}}}setParams(e){Object.assign(this.params,e)}setInkPreset(e){Object.assign(this.params.inkPalette,ut[e])}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params,o=a.inkPalette;e.draw({frag:dt,uniforms:{src:e.src,srcSizePx:[e.src.width||1,e.src.height||1],elementPx:[r,i],gridSize:Math.max(1,a.gridSize),dotSize:Math.max(0,a.dotSize),smoothing:Math.max(0,Math.min(1,a.smoothing)),angle:a.angle,blackAmount:Math.max(0,Math.min(1,a.blackAmount)),ymck:+(a.mode===`cmyk`),trimEdge:+!!a.trimEdge,background:a.background,cInk:o.cyan,mInk:o.magenta,yInk:o.yellow,kInk:o.black,rInk:o.red,gInk:o.green,bInk:o.blue},target:e.target})}}}));function gt(e,t){if(typeof OffscreenCanvas<`u`)return new OffscreenCanvas(e,t);let n=document.createElement(`canvas`);return n.width=e,n.height=t,n}function _t(e){let t=e.getContext(`2d`);if(!t)throw Error(`[VFX-JS] JPEGGlitchEffect: 2D canvas context unavailable`);return t}function vt(e,t){if(typeof OffscreenCanvas<`u`&&e instanceof OffscreenCanvas)return e.convertToBlob({type:`image/jpeg`,quality:t});let n=e;return new Promise((e,r)=>{n.toBlob(t=>t?e(t):r(Error(`[VFX-JS] JPEGGlitchEffect: toBlob failed`)),`image/jpeg`,t)})}function yt(e){for(let t=2;t+3<e.length;t++)if(e[t]===255&&e[t+1]===218){let n=e[t+2]<<8|e[t+3];return Math.min(e.length,t+2+n)}return Math.min(e.length,417)}function bt(e,t){let n=Math.imul(Math.floor(e*2654435761)|0,2246822519)+Math.imul(t+1,3266489917)>>>0;return()=>{n=n+1831565813>>>0;let e=Math.imul(n^n>>>15,1|n);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function xt(e,t,n,r,i,a,o){switch(e.save(),e.clearRect(0,0,a,o),i){case 90:e.translate(a,0);break;case 180:e.translate(a,o);break;case 270:e.translate(0,o);break}e.rotate(i*Math.PI/180),e.drawImage(t,0,0,n,r),e.restore()}function St(e,t,n,r){let i=e.length-t-4;if(i<=1)return;let a=Math.max(1,Math.floor(n));for(let n=0;n<a;n++){let o=i/a*n|0,s=i/a*(n+1)|0,c=Math.max(1,s-o),l=Math.min(i,o+(r()*c|0)),u=r()*256|0;e[t+l]=u}}var D,O,k,Ct,A,wt,Tt,Et,Dt,Ot,kt,At,jt,Mt,j,Nt,Pt,Ft,It,Lt,Rt,zt,Bt,Vt,Ht,M,Ut,N,Wt,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt,$t,en,tn,nn=e((()=>{D=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},O=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Qt=`#version 300 es
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
`,$t=`#version 300 es
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
`,en={quality:.4,seed:.25,iterations:24,resolutionScale:1,randomFlip:!0,vertical:!1,speed:0,bypass:!1},tn=class{get producedFrames(){return D(this,Wt,`f`)}constructor(e={}){k.add(this),this.enabled=!0,Ct.set(this,!1),A.set(this,null),wt.set(this,null),Tt.set(this,null),Et.set(this,null),Dt.set(this,!1),Ot.set(this,null),kt.set(this,null),At.set(this,null),jt.set(this,null),Mt.set(this,null),j.set(this,null),Nt.set(this,null),Pt.set(this,new Uint8Array),Ft.set(this,null),It.set(this,0),Lt.set(this,0),Rt.set(this,0),zt.set(this,0),Bt.set(this,!0),Vt.set(this,!1),Ht.set(this,-1e9),M.set(this,0),Ut.set(this,0),N.set(this,!1),Wt.set(this,0),this.params={...en,...e}}setParams(e){Object.assign(this.params,e),O(this,Bt,!0,`f`)}init(e){O(this,Ct,typeof createImageBitmap==`function`&&(typeof OffscreenCanvas<`u`||typeof document<`u`),`f`),D(this,Ct,`f`)&&(O(this,Ht,-1e9,`f`),O(this,Bt,!0,`f`),O(this,kt,gt(1,1),`f`),O(this,At,_t(D(this,kt,`f`)),`f`),O(this,jt,gt(1,1),`f`),O(this,Mt,_t(D(this,jt,`f`)),`f`),O(this,j,gt(1,1),`f`),O(this,Nt,_t(D(this,j,`f`)),`f`),O(this,A,e.createRenderTarget({size:[1,1]}),`f`),O(this,Tt,e.gl,`f`),D(this,k,`m`,Gt).call(this,e),O(this,Ot,e.onContextRestored(()=>{D(this,k,`m`,Gt).call(this,e),O(this,Dt,D(this,N,`f`),`f`)}),`f`))}update(){this.enabled===!1&&O(this,N,!1,`f`)}render(e){if(this.params.bypass||!D(this,Ct,`f`)||!D(this,A,`f`)){O(this,N,!1,`f`),D(this,k,`m`,Kt).call(this,e);return}let t=e.src.width,n=e.src.height;(t!==D(this,Rt,`f`)||n!==D(this,zt,`f`))&&(O(this,Rt,t,`f`),O(this,zt,n,`f`),O(this,Bt,!0,`f`));let[r,i]=e.dims.elementPixel,a=Math.min(1,Math.max(0,this.params.resolutionScale)),o=Math.max(1,Math.round(r*a)),s=Math.max(1,Math.round(i*a));r>=2&&i>=2&&t>0&&n>0&&((o!==D(this,It,`f`)||s!==D(this,Lt,`f`))&&D(this,k,`m`,Jt).call(this,e,o,s),D(this,k,`m`,qt).call(this,e)&&D(this,k,`m`,Yt).call(this,e)),D(this,N,`f`)&&D(this,wt,`f`)?(D(this,Dt,`f`)&&D(this,k,`m`,Xt).call(this,e),e.draw({frag:$t,uniforms:{tex:D(this,wt,`f`)},target:e.target})):D(this,k,`m`,Kt).call(this,e)}dispose(){var e;D(this,Ot,`f`)?.call(this),O(this,Ot,null,`f`),D(this,Tt,`f`)&&D(this,Et,`f`)&&D(this,Tt,`f`).deleteTexture(D(this,Et,`f`)),O(this,Et,null,`f`),O(this,Tt,null,`f`),O(this,Dt,!1,`f`),D(this,A,`f`)?.dispose(),O(this,A,null,`f`),O(this,wt,null,`f`),O(this,kt,null,`f`),O(this,At,null,`f`),O(this,jt,null,`f`),O(this,Mt,null,`f`),O(this,j,null,`f`),O(this,Nt,null,`f`),O(this,Ft,null,`f`),O(this,Pt,new Uint8Array,`f`),O(this,N,!1,`f`),O(this,Vt,!1,`f`),O(this,It,0,`f`),O(this,Lt,0,`f`),O(this,M,(e=D(this,M,`f`),e++,e),`f`)}},Ct=new WeakMap,A=new WeakMap,wt=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,jt=new WeakMap,Mt=new WeakMap,j=new WeakMap,Nt=new WeakMap,Pt=new WeakMap,Ft=new WeakMap,It=new WeakMap,Lt=new WeakMap,Rt=new WeakMap,zt=new WeakMap,Bt=new WeakMap,Vt=new WeakMap,Ht=new WeakMap,M=new WeakMap,Ut=new WeakMap,N=new WeakMap,Wt=new WeakMap,k=new WeakSet,Gt=function(e){let t=e.gl,n=t.createTexture();n&&(t.bindTexture(t.TEXTURE_2D,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,0])),t.bindTexture(t.TEXTURE_2D,null),O(this,Et,n,`f`),O(this,wt,e.wrapTexture(n,{size:[D(this,It,`f`)||1,D(this,Lt,`f`)||1]}),`f`))},Kt=function(e){e.draw({frag:Qt,uniforms:{src:e.src},target:e.target})},qt=function(e){if(D(this,Vt,`f`))return!1;let t=this.params.speed;return t>0?e.time-D(this,Ht,`f`)>=1/t:D(this,Bt,`f`)},Jt=function(e,t,n){var r;O(this,It,t,`f`),O(this,Lt,n,`f`),O(this,Pt,new Uint8Array(t*n*4),`f`),O(this,Ft,new ImageData(t,n),`f`),D(this,kt,`f`)&&(D(this,kt,`f`).width=t,D(this,kt,`f`).height=n),D(this,j,`f`)&&(D(this,j,`f`).width=t,D(this,j,`f`).height=n),D(this,A,`f`)?.dispose(),O(this,A,e.createRenderTarget({size:[t,n]}),`f`),O(this,N,!1,`f`),O(this,Bt,!0,`f`),O(this,Vt,!1,`f`),O(this,Dt,!1,`f`),O(this,M,(r=D(this,M,`f`),r++,r),`f`)},Yt=function(e){var t;let n=D(this,It,`f`),r=D(this,Lt,`f`),i=D(this,kt,`f`),a=D(this,At,`f`),o=D(this,jt,`f`),s=D(this,Mt,`f`),c=D(this,Ft,`f`);if(!i||!a||!o||!s||!c||!D(this,A,`f`))return;e.blit(e.src,D(this,A,`f`));let l=e.gl;l.readPixels(0,0,n,r,l.RGBA,l.UNSIGNED_BYTE,D(this,Pt,`f`)),l.bindFramebuffer(l.FRAMEBUFFER,null),O(this,Vt,!0,`f`),O(this,Bt,!1,`f`),O(this,Ht,e.time,`f`);let u=c.data,d=n*4;for(let e=0;e<r;e++){let t=(r-1-e)*d;u.set(D(this,Pt,`f`).subarray(t,t+d),e*d)}for(let e=3;e<u.length;e+=4)u[e]=255;let f=this.params.speed>0?D(this,Ut,`f`):0;O(this,Ut,(t=D(this,Ut,`f`),t++,t),`f`);let{quality:p,seed:m,iterations:h,randomFlip:g,vertical:_}=this.params,v=bt(m,f),y=g&&v()<.5;a.putImageData(c,0,0);let ee=((y?180:0)+(_?270:0))%360,te=_,ne=te?r:n,re=te?n:r;o.width=ne,o.height=re,xt(s,i,n,r,ee,ne,re),D(this,k,`m`,Zt).call(this,o,n,r,p,h,ee,v,D(this,M,`f`))},Xt=function(e){let t=e.gl;!D(this,Et,`f`)||!D(this,j,`f`)||(t.bindTexture(t.TEXTURE_2D,D(this,Et,`f`)),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,D(this,j,`f`)),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,null),O(this,Dt,!1,`f`))},Zt=async function(e,t,n,r,i,a,o,s){var c;try{let l=await vt(e,r),u=new Uint8Array(await l.arrayBuffer());St(u,yt(u),i,o);let d=await createImageBitmap(new Blob([u],{type:`image/jpeg`}));if(s===D(this,M,`f`)&&D(this,Nt,`f`)){let e=(360-a)%360;xt(D(this,Nt,`f`),d,d.width,d.height,e,t,n),O(this,N,!0,`f`),O(this,Wt,(c=D(this,Wt,`f`),c++,c),`f`),O(this,Dt,!0,`f`)}d.close()}catch{}finally{s===D(this,M,`f`)&&O(this,Vt,!1,`f`)}}})),rn,an,on,sn=e((()=>{rn=.7,an=1.3,on=`
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
`}));function cn(e){let t=ln(e);return 2**Math.ceil(Math.log2(Math.sqrt(t)))}function ln(e){return Number.isFinite(e)?Math.max(1,Math.floor(e)):1}function un(e){let t=e|0;return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function dn(e){return Math.min(_n,Math.max(0,e))}var fn,pn,mn,hn,gn,_n,vn=e((()=>{fn=new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),pn=`
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,mn=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,hn=`#version 300 es
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
`,gn=`#version 300 es
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
`,_n=.1})),P,F,I,yn,L,R,z,B,V,bn,H,xn,Sn,U,Cn,wn,Tn,En,Dn,W,On,kn,An,jn,Mn,Nn,Pn,Fn,In,Ln,Rn,G,zn,Bn,Vn,Hn,Un,Wn,Gn,Kn,qn,Jn,Yn,Xn,Zn,Qn,$n,er=e((()=>{sn(),vn(),P=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},F=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},G=64,zn=G*G,Bn=.1,Vn=[G,G],Hn=new Float32Array(zn);for(let e=0;e<zn;e++)Hn[e]=e;Un=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, 2.0);
}
`,Wn=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0);
}
`,Gn=`#version 300 es
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
`,Kn=`#version 300 es
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
`,qn=`#version 300 es
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
${on}

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
`,Jn=`#version 300 es
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
`,Yn=`#version 300 es
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
`,Xn=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;

uniform sampler2D src;
uniform vec3 color;
uniform float colorMix;
uniform vec2 lifeJitterRange;
${pn}

void main() {
    vec4 c = texture(src, clamp(vSpawn.yz, 0.0, 1.0));
    float h = hash21(vSpawn.yz + vec2(vSpawn.x) * 1.7);
    float lifeJitter = mix(lifeJitterRange.x, lifeJitterRange.y, h);
    outColor = vec4(mix(c.rgb, color, colorMix), lifeJitter);
}
`,Zn=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;
void main() {
    float theta = vSpawn.w;
    vec2 dir = theta >= 0.0 ? vec2(cos(theta), sin(theta)) : vec2(0.0);
    outColor = vec4(dir, 0.0, 0.0);
}
`,Qn={count:1024*1024,birthRate:3e4,screenBirthRate:1e4,life:1,noiseSpeed:.3,emitSpeed:1,noiseDelay:.15,noiseScale:1,noiseAnimation:.3,pointSize:10,alpha:1,radius:300,speedDecay:1,alphaDecay:5,fadeIn:.05,alphaThreshold:.05,spawnOnIdle:!0,srcOpacity:0,trailFade:.75,fog:.5,color:16777215,colorMix:0,blend:`add`},$n=class{get params(){return P(this,yn,`f`)}constructor(e={}){I.add(this),yn.set(this,void 0),L.set(this,null),R.set(this,null),z.set(this,null),B.set(this,null),V.set(this,null),bn.set(this,!1),H.set(this,void 0),xn.set(this,void 0),Sn.set(this,new Float32Array(zn*4)),U.set(this,null),Cn.set(this,null),wn.set(this,null),Tn.set(this,null),En.set(this,null),Dn.set(this,null),W.set(this,0),On.set(this,0),kn.set(this,0),An.set(this,null),jn.set(this,-1/0),F(this,yn,{...Qn,...e},`f`),P(this,yn,`f`).count=ln(P(this,yn,`f`).count),F(this,H,cn(P(this,yn,`f`).count),`f`),F(this,xn,P(this,H,`f`)*P(this,H,`f`),`f`)}get maxCount(){return P(this,xn,`f`)}setParam(e){let t=P(this,yn,`f`);for(let[n,r]of Object.entries(e))r!==void 0&&(t[n]=n===`count`?ln(r):r)}init(e){P(this,I,`m`,Mn).call(this,e),F(this,B,e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),`f`),F(this,V,e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),`f`),F(this,Tn,{attributes:{position:fn}},`f`),F(this,wn,{mode:`points`,attributes:{position:{data:Hn,itemSize:1}}},`f`),F(this,En,e.gl,`f`),P(this,I,`m`,Fn).call(this,e),F(this,Dn,e.onContextRestored(()=>{F(this,En,e.gl,`f`),P(this,I,`m`,Fn).call(this,e),F(this,bn,!1,`f`)}),`f`)}render(e){if(!P(this,L,`f`)||!P(this,R,`f`)||!P(this,z,`f`)||!P(this,B,`f`)||!P(this,V,`f`)||!P(this,Tn,`f`)||!P(this,wn,`f`)||!P(this,Cn,`f`)||!P(this,U,`f`))return;let t=cn(this.params.count);t!==P(this,H,`f`)&&(P(this,I,`m`,Nn).call(this),F(this,H,t,`f`),F(this,xn,t*t,`f`),P(this,I,`m`,Mn).call(this,e),F(this,W,0,`f`),F(this,bn,!1,`f`)),P(this,bn,`f`)||(e.draw({frag:Un,target:P(this,L,`f`)}),e.draw({frag:Wn,target:P(this,R,`f`)}),e.draw({frag:Wn,target:P(this,z,`f`)}),F(this,bn,!0,`f`));let n=dn(e.deltaTime),r=[e.dims.elementPixel[0],e.dims.elementPixel[1]],i=[P(this,H,`f`),P(this,H,`f`)],a=P(this,I,`m`,Ln).call(this,e,n,r);a>0&&P(this,I,`m`,In).call(this,e);let o=a===0;if(e.draw({frag:qn,uniforms:{posTex:P(this,L,`f`),colorTex:P(this,R,`f`),velTex:P(this,z,`f`),elementPixel:r,time:e.time,dt:n,noiseSpeed:this.params.noiseSpeed,emitSpeed:this.params.emitSpeed,noiseDelay:this.params.noiseDelay,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,life:this.params.life},target:P(this,L,`f`),swap:o}),a>0){let t={uSpawnTex:P(this,Cn,`f`),uSpawnTexSize:Vn,uSpawnCount:a,stateSize:i};e.draw({vert:Jn,frag:Yn,geometry:P(this,wn,`f`),uniforms:{...t,src:e.src,alphaThreshold:this.params.alphaThreshold},target:P(this,L,`f`),blend:`none`}),e.draw({vert:Jn,frag:Xn,geometry:P(this,wn,`f`),uniforms:{...t,src:e.src,color:un(this.params.color),colorMix:this.params.colorMix,lifeJitterRange:[rn,an]},target:P(this,R,`f`),blend:`none`}),e.draw({vert:Jn,frag:Zn,geometry:P(this,wn,`f`),uniforms:t,target:P(this,z,`f`),blend:`none`})}let s=P(this,I,`m`,Rn).call(this);P(this,Tn,`f`).instanceCount=s,e.draw({frag:mn,target:P(this,B,`f`)}),e.draw({vert:Gn,frag:hn,uniforms:{posTex:P(this,L,`f`),colorTex:P(this,R,`f`),stateSize:i,pointSize:this.params.pointSize,elementPixel:r,particleCount:s,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fadeIn:this.params.fadeIn,fog:this.params.fog},geometry:P(this,Tn,`f`),target:P(this,B,`f`),blend:this.params.blend===`normal`?`premultiplied`:`additive`}),e.draw({frag:gn,uniforms:{trailPrev:P(this,V,`f`),particleStamp:P(this,B,`f`),trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:P(this,V,`f`)}),e.draw({frag:Kn,uniforms:{src:e.src,trail:P(this,V,`f`),srcOpacity:this.params.srcOpacity},target:e.target})}dispose(){P(this,Dn,`f`)?.call(this),F(this,Dn,null,`f`),P(this,En,`f`)&&P(this,U,`f`)&&P(this,En,`f`).deleteTexture(P(this,U,`f`)),F(this,U,null,`f`),F(this,Cn,null,`f`),F(this,wn,null,`f`),F(this,En,null,`f`),P(this,I,`m`,Nn).call(this),P(this,B,`f`)?.dispose(),P(this,V,`f`)?.dispose(),F(this,B,null,`f`),F(this,V,null,`f`),F(this,Tn,null,`f`),F(this,bn,!1,`f`)}outputRect(e){return e.canvasRect}},yn=new WeakMap,L=new WeakMap,R=new WeakMap,z=new WeakMap,B=new WeakMap,V=new WeakMap,bn=new WeakMap,H=new WeakMap,xn=new WeakMap,Sn=new WeakMap,U=new WeakMap,Cn=new WeakMap,wn=new WeakMap,Tn=new WeakMap,En=new WeakMap,Dn=new WeakMap,W=new WeakMap,On=new WeakMap,kn=new WeakMap,An=new WeakMap,jn=new WeakMap,I=new WeakSet,Mn=function(e){let t={size:[P(this,H,`f`),P(this,H,`f`)],float:!0,wrap:`clamp`,filter:`nearest`};F(this,L,e.createRenderTarget({...t,persistent:!0}),`f`),F(this,R,e.createRenderTarget(t),`f`),F(this,z,e.createRenderTarget(t),`f`)},Nn=function(){P(this,L,`f`)?.dispose(),P(this,R,`f`)?.dispose(),P(this,z,`f`)?.dispose(),F(this,L,null,`f`),F(this,R,null,`f`),F(this,z,null,`f`)},Pn=function(e){let t=e.gl,n=t.createTexture();if(!n)throw Error(`[ParticleEffect] Failed to create spawn texture`);return t.bindTexture(t.TEXTURE_2D,n),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,G,G,0,t.RGBA,t.FLOAT,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.bindTexture(t.TEXTURE_2D,null),{raw:n,handle:e.wrapTexture(n,{size:[G,G],filter:`nearest`,wrap:`clamp`})}},Fn=function(e){let t=P(this,I,`m`,Pn).call(this,e);F(this,U,t.raw,`f`),F(this,Cn,t.handle,`f`)},In=function(e){if(!P(this,U,`f`))return;let t=e.gl;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,P(this,U,`f`)),t.texSubImage2D(t.TEXTURE_2D,0,0,0,G,G,t.RGBA,t.FLOAT,P(this,Sn,`f`)),t.bindTexture(t.TEXTURE_2D,null)},Ln=function(e,t,n){let r=[e.mouse[0]/Math.max(1,n[0]),e.mouse[1]/Math.max(1,n[1])];(!P(this,An,`f`)||Math.abs(r[0]-P(this,An,`f`)[0])>1e-6||Math.abs(r[1]-P(this,An,`f`)[1])>1e-6)&&F(this,jn,e.time,`f`),F(this,An,r,`f`);let i=e.intersection>0,a=e.time-P(this,jn,`f`)<Bn;i&&(a||this.params.spawnOnIdle)?F(this,On,Math.min(P(this,On,`f`)+this.params.birthRate*t,zn),`f`):F(this,On,0,`f`),i?F(this,kn,Math.min(P(this,kn,`f`)+this.params.screenBirthRate*t,zn),`f`):F(this,kn,0,`f`);let o=Math.min(zn,Math.floor(P(this,On,`f`))),s=Math.min(zn-o,Math.floor(P(this,kn,`f`)));F(this,On,P(this,On,`f`)-o,`f`),F(this,kn,P(this,kn,`f`)-s,`f`);let c=o+s;if(c===0)return 0;let l=P(this,I,`m`,Rn).call(this),u=Math.max(1,n[0]),d=Math.max(1,n[1]),f=P(this,Sn,`f`),p=0;for(;p<o;p++){let e=Math.sqrt(Math.random())*this.params.radius,t=Math.random()*Math.PI*2,n=Math.cos(t)*e,i=Math.sin(t)*e,a=p*4;f[a+0]=P(this,W,`f`),f[a+1]=r[0]+n/u,f[a+2]=r[1]+i/d,f[a+3]=t,F(this,W,(P(this,W,`f`)+1)%l,`f`)}for(let e=0;e<s;e++,p++){let e=p*4;f[e+0]=P(this,W,`f`),f[e+1]=Math.random(),f[e+2]=Math.random(),f[e+3]=-1,F(this,W,(P(this,W,`f`)+1)%l,`f`)}return c},Rn=function(){return Math.max(1,Math.min(P(this,xn,`f`),Math.floor(this.params.count)))}})),K,q,J,tr,nr,rr,Y,X,ir,Z,ar,or,sr,cr,lr,ur,dr,fr,pr,mr,hr,gr,_r,vr,yr,br=e((()=>{sn(),vn(),K=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},q=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},mr=`#version 300 es
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
${pn}
${on}

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
        ${rn.toFixed(4)},
        ${an.toFixed(4)},
        hash21(uv * 91.7 + 1.234)
    );
    age += dt / max(duration * lifespanScale, 1e-3);

    outColor = vec4(pos, age);
}
`,hr=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 stateSize;
uniform float count;
uniform vec3 color;
uniform float colorMix;
${pn}

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
`,gr=`#version 300 es
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
`,_r=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trail;

void main() {
    outColor = texture(trail, uv);
}
`,vr={count:1e5,duration:1,noiseSpeed:1.5,noiseScale:1,noiseAnimation:1,outwardBias:1,pointSize:3,alpha:1,alphaDecay:5,speedDecay:2,fog:0,trailFade:.5,color:16777215,colorMix:0,blend:`add`},yr=class{get params(){return K(this,tr,`f`)}constructor(e={}){J.add(this),tr.set(this,void 0),nr.set(this,null),rr.set(this,null),Y.set(this,null),X.set(this,null),ir.set(this,null),Z.set(this,void 0),ar.set(this,!1),or.set(this,!1),sr.set(this,-1),cr.set(this,0),lr.set(this,0),q(this,tr,{...vr,...e},`f`),K(this,tr,`f`).count=ln(K(this,tr,`f`).count);let t=cn(K(this,tr,`f`).count);q(this,Z,[t,t],`f`)}trigger(){q(this,ar,!0,`f`),q(this,or,!0,`f`),q(this,sr,-1,`f`),q(this,cr,0,`f`),q(this,lr,0,`f`)}reset(){q(this,ar,!1,`f`),q(this,or,!1,`f`),q(this,sr,-1,`f`),q(this,cr,0,`f`),q(this,lr,0,`f`)}isDone(){return!K(this,ar,`f`)||K(this,cr,`f`)<this.params.duration?!1:K(this,lr,`f`)>=K(this,J,`m`,ur).call(this)}init(e){K(this,J,`m`,dr).call(this,e),q(this,Y,e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),`f`),q(this,X,e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),`f`),q(this,ir,{attributes:{position:fn}},`f`)}render(e){var t;if(!K(this,nr,`f`)||!K(this,rr,`f`)||!K(this,Y,`f`)||!K(this,X,`f`)||!K(this,ir,`f`)||e.intersection<=0)return;let n=cn(this.params.count),r=!K(this,ar,`f`)||this.isDone();if(n!==K(this,Z,`f`)[0]&&r&&(K(this,J,`m`,fr).call(this),q(this,Z,[n,n],`f`),K(this,J,`m`,dr).call(this,e)),!K(this,ar,`f`)){e.blit(e.src,e.target);return}K(this,sr,`f`)<0&&q(this,sr,e.time,`f`);let i=e.time-K(this,sr,`f`);q(this,cr,i,`f`);let a=i>=this.params.duration;if(a&&K(this,lr,`f`)>=K(this,J,`m`,ur).call(this)){e.draw({frag:mn,target:e.target});return}let o=dn(e.deltaTime),s=[e.dims.elementPixel[0],e.dims.elementPixel[1]];if(a)e.draw({frag:mn,target:K(this,Y,`f`)}),q(this,lr,(t=K(this,lr,`f`),t++,t),`f`);else{let t=+!!K(this,or,`f`);q(this,or,!1,`f`);let n=K(this,J,`m`,pr).call(this);e.draw({frag:mr,uniforms:{posTex:K(this,nr,`f`),stateSize:K(this,Z,`f`),elementPixel:s,time:e.time,dt:o,noiseSpeed:this.params.noiseSpeed,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,outwardBias:this.params.outwardBias,duration:this.params.duration,count:n,uBurst:t},target:K(this,nr,`f`)}),t===1&&(e.draw({frag:hr,uniforms:{src:e.src,stateSize:K(this,Z,`f`),count:n,color:un(this.params.color),colorMix:this.params.colorMix},target:K(this,rr,`f`)}),e.draw({frag:mn,target:K(this,X,`f`)})),K(this,ir,`f`).instanceCount=n,e.draw({frag:mn,target:K(this,Y,`f`)}),e.draw({vert:gr,frag:hn,uniforms:{posTex:K(this,nr,`f`),colorTex:K(this,rr,`f`),stateSize:K(this,Z,`f`),pointSize:this.params.pointSize,elementPixel:s,particleCount:n,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fog:this.params.fog},geometry:K(this,ir,`f`),target:K(this,Y,`f`),blend:this.params.blend===`normal`?`premultiplied`:`additive`})}e.draw({frag:gn,uniforms:{trailPrev:K(this,X,`f`),particleStamp:K(this,Y,`f`),trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:K(this,X,`f`)}),e.draw({frag:_r,uniforms:{trail:K(this,X,`f`)},target:e.target})}dispose(){K(this,J,`m`,fr).call(this),K(this,Y,`f`)?.dispose(),K(this,X,`f`)?.dispose(),q(this,Y,null,`f`),q(this,X,null,`f`),q(this,ir,null,`f`)}outputRect(e){return e.canvasRect}},tr=new WeakMap,nr=new WeakMap,rr=new WeakMap,Y=new WeakMap,X=new WeakMap,ir=new WeakMap,Z=new WeakMap,ar=new WeakMap,or=new WeakMap,sr=new WeakMap,cr=new WeakMap,lr=new WeakMap,J=new WeakSet,ur=function(){let e=this.params.trailFade;return e<=0?1:e>=.999?600:Math.ceil(-Math.log(255)/Math.log(e))},dr=function(e){let t={size:K(this,Z,`f`),float:!0,wrap:`clamp`,filter:`nearest`};q(this,nr,e.createRenderTarget({...t,persistent:!0}),`f`),q(this,rr,e.createRenderTarget(t),`f`)},fr=function(){K(this,nr,`f`)?.dispose(),K(this,rr,`f`)?.dispose(),q(this,nr,null,`f`),q(this,rr,null,`f`)},pr=function(){let e=K(this,Z,`f`)[0]*K(this,Z,`f`)[1];return Math.max(1,Math.min(e,Math.floor(this.params.count)))}})),xr,Sr,Cr,wr=e((()=>{xr=`#version 300 es
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
`,Sr={size:10},Cr=class{constructor(e={}){this.params={...Sr,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element,{size:r}=this.params;e.draw({frag:xr,uniforms:{src:e.src,cellUv:[r/(t||1),r/(n||1)]},target:e.target})}}})),Q,$,Tr,Er,Dr,Or,kr,Ar,jr,Mr,Nr,Pr,Fr,Ir,Lr,Rr,zr,Br,Vr,Hr,Ur,Wr,Gr,Kr,qr,Jr,Yr,Xr=e((()=>{Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},$=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},zr=`
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
`,Br=`
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
`,Vr=`#version 300 es
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
${zr}
${Br}
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
`,Hr=`#version 300 es
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
${zr}
${Br}
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
`,Ur=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    vec4 c = texture(src, uvSrc);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,Wr=`#version 300 es
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
`,Gr=`#version 300 es
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
`,Kr={right:{axis:0,direction:0},left:{axis:0,direction:1},down:{axis:1,direction:1},up:{axis:1,direction:0}},qr={luminance:0,r:1,g:2,b:3,hue:4,saturation:5},Jr={range:[0,1],sortRes:128,key:`luminance`,direction:`up`,angle:0,bypass:!1},Yr=class{constructor(e={}){Tr.add(this),Er.set(this,null),Dr.set(this,null),Or.set(this,null),kr.set(this,null),Ar.set(this,0),jr.set(this,0),Mr.set(this,0),Nr.set(this,0),Pr.set(this,0),Fr.set(this,0),Ir.set(this,0),this.params={...Jr,...e},this.params.range=[...this.params.range]}setParams(e){Object.assign(this.params,e),e.range&&(this.params.range=[...e.range])}render(e){if(Q(this,Tr,`m`,Rr).call(this,e),this.params.bypass||!Q(this,Er,`f`)||!Q(this,Dr,`f`)){e.draw({frag:Ur,uniforms:{src:e.src},target:e.target});return}let{axis:t,direction:n}=Kr[this.params.direction],r=[Q(this,Fr,`f`),Q(this,Ir,`f`)],[i,a]=this.params.range,o=qr[this.params.key],[s,c]=e.dims.elementPixel,l=Q(this,Or,`f`),u=Q(this,kr,`f`),d=this.params.angle!==0&&l!==null&&u!==null,f=e.src,p=e.src,m=e.target,h=[1,0],g=[s,c];if(d){let t=-this.params.angle*Math.PI/180;h=[Math.cos(t),Math.sin(t)],g=[Q(this,Nr,`f`),Q(this,Pr,`f`)],e.draw({frag:Wr,uniforms:{src:e.src,srcSize:[s,c],boxSize:g,rot:h},target:l}),f=l,p=l,m=u}e.blit(f,Q(this,Er,`f`));let _=+!!d,v=[s,c];e.draw({frag:Vr,uniforms:{src:Q(this,Er,`f`),srcSize:r,threshold:i,thresholdHigh:a,keyMode:o,direction:n,axis:t,masked:_,boxSize:g,imgSize:v,rot:h},target:Q(this,Dr,`f`)}),e.draw({frag:Hr,uniforms:{src:Q(this,Er,`f`),srcHi:p,rankTex:Q(this,Dr,`f`),lowSize:r,threshold:i,thresholdHigh:a,keyMode:o,axis:t,masked:_,boxSize:g,imgSize:v,rot:h},target:m}),d&&e.draw({frag:Gr,uniforms:{src:u,srcSize:[s,c],boxSize:g,rot:h},target:e.target})}dispose(){Q(this,Tr,`m`,Lr).call(this),$(this,Ar,0,`f`),$(this,jr,0,`f`),$(this,Mr,0,`f`),$(this,Nr,0,`f`),$(this,Pr,0,`f`),$(this,Fr,0,`f`),$(this,Ir,0,`f`)}},Er=new WeakMap,Dr=new WeakMap,Or=new WeakMap,kr=new WeakMap,Ar=new WeakMap,jr=new WeakMap,Mr=new WeakMap,Nr=new WeakMap,Pr=new WeakMap,Fr=new WeakMap,Ir=new WeakMap,Tr=new WeakSet,Lr=function(){Q(this,Er,`f`)?.dispose(),Q(this,Dr,`f`)?.dispose(),Q(this,Or,`f`)?.dispose(),Q(this,kr,`f`)?.dispose(),$(this,Er,null,`f`),$(this,Dr,null,`f`),$(this,Or,null,`f`),$(this,kr,null,`f`)},Rr=function(e){let[t,n]=e.dims.elementPixel,{axis:r}=Kr[this.params.direction],{angle:i}=this.params,a=this.params.sortRes,o=t,s=n;if(i!==0){let e=i*Math.PI/180,r=Math.abs(Math.cos(e)),a=Math.abs(Math.sin(e));o=Math.ceil(t*r+n*a),s=Math.ceil(t*a+n*r)}let c=r===0?Math.max(1,Math.round(a*o/t)):Math.max(1,Math.round(a*s/n)),l=r===0?c:o,u=r===0?s:c;Q(this,Ar,`f`)===t&&Q(this,jr,`f`)===n&&Q(this,Mr,`f`)===i&&Q(this,Fr,`f`)===l&&Q(this,Ir,`f`)===u||(Q(this,Tr,`m`,Lr).call(this),$(this,Ar,t,`f`),$(this,jr,n,`f`),$(this,Mr,i,`f`),$(this,Nr,o,`f`),$(this,Pr,s,`f`),$(this,Fr,l,`f`),$(this,Ir,u,`f`),$(this,Er,e.createRenderTarget({size:[l,u],filter:`nearest`}),`f`),$(this,Dr,e.createRenderTarget({size:[l,u],filter:`nearest`,float:!0}),`f`),i!==0&&($(this,Or,e.createRenderTarget({size:[o,s]}),`f`),$(this,kr,e.createRenderTarget({size:[o,s]}),`f`)))}})),Zr,Qr,$r,ei=e((()=>{Zr=`#version 300 es
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
`,Qr={spacing:4},$r=class{constructor(e={}){this.params={...Qr,...e}}setParams(e){Object.assign(this.params,e)}render(e){let{spacing:t}=this.params;e.draw({frag:Zr,uniforms:{src:e.src,innerHeight:e.dims.element[1]||1,spacing:t},target:e.target})}}}));function ti(e){let t=e.startsWith(`#`)?e.slice(1):e;return(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``)),t.length===6&&(t+=`ff`),t.length===8?[Number.parseInt(t.slice(0,2),16)/255,Number.parseInt(t.slice(2,4),16)/255,Number.parseInt(t.slice(4,6),16)/255,Number.parseInt(t.slice(6,8),16)/255]:[0,0,0,0]}var ni,ri,ii,ai=e((()=>{ni=`#version 300 es
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
`,ri={cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`},ii=class{constructor(e={}){this.params={...ri,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params;e.draw({frag:ni,uniforms:{src:e.src,mouseUv:[e.mouse[0]/r,e.mouse[1]/i],elementPx:[r,i],cellSize:a.cellSize,pressRadius:a.pressRadius,press:a.press,flatCells:+!!a.flatCells,seed:a.seed,time:e.time,speed:Math.max(0,a.speed),breathe:Math.max(0,a.breathe),breatheSpeed:Math.max(0,a.breatheSpeed),breatheScale:Math.max(1,a.breatheScale),bgColor:ti(a.bgColor)},target:e.target})}}})),oi=e((()=>{p(),de(),He(),lt(),ht(),nn(),er(),br(),wr(),Xr(),ei(),ai()}));export{Cr as a,tn as c,Ve as d,ue as f,Yr as i,mt as l,ii as n,yr as o,f as p,$r as r,$n as s,oi as t,ct as u};