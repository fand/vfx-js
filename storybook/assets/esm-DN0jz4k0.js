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
}`,d=[`coeff`,`tmp`,`sub`,`a`,`b`],f=class{constructor({quality:e=8,iterations:t=3,downscale:n=1}={}){this.lowRes=null,this.quality=e,this.iterations=t,this.downscale=n}ensureLowRes(e,t,n){if(this.lowRes&&this.lowRes.w===t&&this.lowRes.h===n)return this.lowRes;this.disposeLowRes();let r=[t,n];return this.lowRes={w:t,h:n,coeff:e.createRenderTarget({float:!0,size:r}),tmp:e.createRenderTarget({float:!0,size:r}),sub:e.createRenderTarget({size:r}),a:e.createRenderTarget({size:r}),b:e.createRenderTarget({size:r})},this.lowRes}disposeLowRes(){if(this.lowRes){for(let e of d)this.lowRes[e].dispose();this.lowRes=null}}render(e){let t=Math.max(1,Math.min(10,this.iterations|0)),n=Math.max(1,Math.min(100,this.quality)),r=n<50?5e3/n:200-2*n,i=Math.max(.02,Math.min(1,this.downscale)),[d,f]=e.dims.element,p=Math.max(1,Math.floor(d*i)),m=Math.max(1,Math.floor(f*i)),h=this.ensureLowRes(e,p,m);e.draw({frag:a,uniforms:{src:e.src},target:h.a});let g=h.a;for(let n=0;n<t;n++){e.draw({frag:u,uniforms:{src:g},target:h.sub}),e.draw({frag:o,uniforms:{src:h.sub},target:h.tmp}),e.draw({frag:s,uniforms:{src:h.tmp},target:h.coeff}),e.draw({frag:c,uniforms:{src:h.coeff,uS:r},target:h.tmp});let t=n%2==0?h.b:h.a;e.draw({frag:l,uniforms:{src:h.tmp},target:t}),g=t}e.blit(g,e.target)}dispose(){this.disposeLowRes()}}})),m,h,g,_,v,ee,te,ne,re,ie,ae,oe,se,ce,le,ue,de,fe=e((()=>{m=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},h=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ae=`#version 300 es
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
`,oe=`#version 300 es
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
`,se=`#version 300 es
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
`,ce=`#version 300 es
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
`,le={threshold:.7,softness:.1,intensity:1.2,scatter:.7,pad:50,dither:0,edgeFade:.02},ue=.5,de=class{constructor(e={}){g.add(this),_.set(this,null),v.set(this,[]),ee.set(this,[]),te.set(this,!1),ne.set(this,0),re.set(this,0),this.params={...le,...e}}setParams(e){Object.assign(this.params,e)}init(e){m(this,_,e.createRenderTarget({float:!0}),`f`)}render(e){if(!h(this,_,`f`))return;let{threshold:t,softness:n,intensity:r}=this.params,i=Math.min(Math.max(this.params.scatter,0),1),a=Math.max(0,this.params.dither),o=Math.max(1e-6,this.params.edgeFade);(h(this,_,`f`).width!==h(this,ne,`f`)||h(this,_,`f`).height!==h(this,re,`f`))&&(h(this,v,`f`).length=0,h(this,ee,`f`).length=0,m(this,te,!1,`f`),m(this,ne,h(this,_,`f`).width,`f`),m(this,re,h(this,_,`f`).height,`f`)),h(this,g,`m`,ie).call(this,e,h(this,_,`f`).width,h(this,_,`f`).height);let s=h(this,v,`f`).length;if(s===0)return;e.draw({frag:ae,uniforms:{src:e.src,threshold:t,softness:n,edgeFade:o},target:h(this,_,`f`)}),e.draw({frag:oe,uniforms:{src:h(this,_,`f`),texelSize:[1/h(this,_,`f`).width,1/h(this,_,`f`).height],karis:1},target:h(this,v,`f`)[0]});for(let t=1;t<s;t++){let n=h(this,v,`f`)[t-1];e.draw({frag:oe,uniforms:{src:n,texelSize:[1/n.width,1/n.height],karis:0},target:h(this,v,`f`)[t]})}let c=h(this,_,`f`).width,l=h(this,_,`f`).height,u=1+i*Math.max(0,s-1),d=e=>Math.min(1,Math.max(0,u-e));for(let t=s-2;t>=0;t--){let n=t===s-2?h(this,v,`f`)[s-1]:h(this,ee,`f`)[t+1],r=2**(t+2),i=t===s-2?d(s-1):1;e.draw({frag:se,uniforms:{srcSmall:n,srcLarge:h(this,v,`f`)[t],texelSize:[ue*r/c,ue*r/l],weightLarge:d(t),weightSmall:i},target:h(this,ee,`f`)[t]})}let f=s>=2?h(this,ee,`f`)[0]:h(this,v,`f`)[0],p=r/Math.max(1,u);e.draw({frag:ce,uniforms:{src:e.src,bloom:f,texelSize:[ue*2/c,ue*2/l],intensity:p,dither:a,edgeFade:o},target:e.target})}outputRect(e){let{pad:t}=this.params;if(t===`fullscreen`)return e.canvasRect;let n=t*e.pixelRatio,[,,r,i]=e.contentRect;return[-n,-n,r+2*n,i+2*n]}dispose(){m(this,_,null,`f`),h(this,v,`f`).length=0,h(this,ee,`f`).length=0,m(this,te,!1,`f`),m(this,ne,0,`f`),m(this,re,0,`f`)}},_=new WeakMap,v=new WeakMap,ee=new WeakMap,te=new WeakMap,ne=new WeakMap,re=new WeakMap,g=new WeakSet,ie=function(e,t,n){if(h(this,te,`f`))return;let r=Math.max(1,Math.floor(t/2)),i=Math.max(1,Math.floor(n/2));for(let t=0;t<8;t++){h(this,v,`f`).push(e.createRenderTarget({size:[r,i],float:!0}));let t=Math.max(1,Math.floor(r/2)),n=Math.max(1,Math.floor(i/2));if(t===r&&n===i)break;r=t,i=n}for(let t=0;t<h(this,v,`f`).length-1;t++)h(this,ee,`f`).push(e.createRenderTarget({size:[h(this,v,`f`)[t].width,h(this,v,`f`)[t].height],float:!0}));m(this,te,!0,`f`)}})),pe,me,he,ge=e((()=>{pe=`#version 300 es
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
`,me={intensity:.3,radius:0,power:2},he=class{constructor(e={}){this.params={...me,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:pe,uniforms:{src:e.src,aspect:(t||1)/(n||1),intensity:this.params.intensity,radius:this.params.radius,power:this.params.power},target:e.target})}}})),y,b,_e,ve,x,ye,be,xe,Se,Ce,we,Te,Ee,De,Oe,ke,Ae,je,Me,Ne,Pe,Fe,Ie,Le,Re,ze,Be,Ve,He,Ue,We,Ge,Ke,qe,Je=e((()=>{y=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},b=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Fe=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D tex;
void main() {
    vec4 c = texture(tex, uvContent);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,Ie=`#version 300 es
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
`,Le=`#version 300 es
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
`,Re=`#version 300 es
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
`,ze=`#version 300 es
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
`,Be=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D uResidual;
void main() {
    vec3 r = texture(uResidual, uvContent).rgb;
    outColor = vec4(clamp(r * 0.5 + 0.5, 0.0, 1.0), 1.0);
}
`,Ve=`
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 chroma(vec3 c) {
    return vec2(dot(c, vec3(-0.168736, -0.331264, 0.5)),
                dot(c, vec3(0.5, -0.418688, -0.081312))) + 0.5;
}
`,He=`#version 300 es
precision highp float;
${Ve}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uCur, uRef, uMV;
uniform vec2 uChromaRes;
void main() {
    vec2 mvc = floor(texture(uMV, uv).rg * 0.5);
    vec2 pred = chroma(texture(uRef, uv + mvc / uChromaRes).rgb);
    outColor = vec4(chroma(texture(uCur, uv).rgb) - pred, 0.0, 1.0);
}
`,Ue=`#version 300 es
precision highp float;
${Ve}
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
`,We=`#version 300 es
precision highp float;
${Ve}
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
`,Ge=`#version 300 es
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
`,Ke={blockSize:16,searchRange:5,searchStep:2,useResidual:!0,dup:0,colorSpace:`ycbcr`,chromaGain:1,view:`output`},qe=class{constructor(e={}){_e.add(this),ve.set(this,!1),x.set(this,!0),ye.set(this,null),be.set(this,null),xe.set(this,null),Se.set(this,null),Ce.set(this,null),we.set(this,null),Te.set(this,null),Ee.set(this,0),De.set(this,0),Oe.set(this,0),ke.set(this,0),Ae.set(this,0),je.set(this,void 0),this.params={...Ke,...e},y(this,je,this.params.colorSpace,`f`)}setParams(e){Object.assign(this.params,e)}enable(){y(this,ve,!0,`f`)}disable(){y(this,ve,!1,`f`),y(this,x,!0,`f`)}get enabled(){return b(this,ve,`f`)}render(e){b(this,_e,`m`,Ne).call(this,e);let t=b(this,ye,`f`),n=b(this,be,`f`),r=b(this,xe,`f`),i=b(this,Se,`f`),a=b(this,Ce,`f`),o=b(this,we,`f`),s=b(this,Te,`f`);if(!t||!n||!r||!i||!a||!o||!s)return;this.params.colorSpace!==b(this,je,`f`)&&(y(this,je,this.params.colorSpace,`f`),y(this,x,!0,`f`));let c=[b(this,Ee,`f`),b(this,De,`f`)];e.blit(e.src,t);let l=this.params.view!==`output`;if((b(this,ve,`f`)||l)&&(e.draw({frag:Ie,uniforms:{uCur:t,uRef:n,uResolution:c,uBlock:b(this,Ae,`f`),uSearch:this.params.searchRange,uStep:this.params.searchStep},target:r}),e.draw({frag:Le,uniforms:{uCur:t,uRef:n,uMV:r,uResolution:c},target:i})),b(this,ve,`f`)){let l=b(this,x,`f`)?1:1+this.params.dup,u=[b(this,Oe,`f`),b(this,ke,`f`)];this.params.colorSpace===`ycbcr`&&e.draw({frag:He,uniforms:{uCur:t,uRef:n,uMV:r,uChromaRes:u},target:s});for(let n=0;n<l;n++){let l=this.params.useResidual&&n===0;this.params.colorSpace===`ycbcr`?(e.draw({frag:Ue,uniforms:{uAccum:a,uMV:r,uVideo:t,uResidual:i,uResolution:c,uIntra:b(this,x,`f`),uUseResidual:l},target:a}),e.draw({frag:We,uniforms:{uChromaAcc:o,uMV:r,uVideo:t,uResidualC:s,uChromaRes:u,uIntra:b(this,x,`f`),uUseResidual:l},target:o})):e.draw({frag:Re,uniforms:{uAccum:a,uMV:r,uVideo:t,uResidual:i,uResolution:c,uIntra:b(this,x,`f`),uUseResidual:l},target:a})}y(this,x,!1,`f`)}else y(this,x,!0,`f`);b(this,_e,`m`,Pe).call(this,e,t,n,r,i,a,o),e.blit(e.src,n)}dispose(){b(this,_e,`m`,Me).call(this),y(this,Ee,0,`f`),y(this,De,0,`f`),y(this,Oe,0,`f`),y(this,ke,0,`f`),y(this,Ae,0,`f`),y(this,x,!0,`f`)}},ve=new WeakMap,x=new WeakMap,ye=new WeakMap,be=new WeakMap,xe=new WeakMap,Se=new WeakMap,Ce=new WeakMap,we=new WeakMap,Te=new WeakMap,Ee=new WeakMap,De=new WeakMap,Oe=new WeakMap,ke=new WeakMap,Ae=new WeakMap,je=new WeakMap,_e=new WeakSet,Me=function(){b(this,ye,`f`)?.dispose(),b(this,be,`f`)?.dispose(),b(this,xe,`f`)?.dispose(),b(this,Se,`f`)?.dispose(),b(this,Ce,`f`)?.dispose(),b(this,we,`f`)?.dispose(),b(this,Te,`f`)?.dispose(),y(this,ye,null,`f`),y(this,be,null,`f`),y(this,xe,null,`f`),y(this,Se,null,`f`),y(this,Ce,null,`f`),y(this,we,null,`f`),y(this,Te,null,`f`)},Ne=function(e){let[t,n]=e.dims.elementPixel,r=Math.max(2,this.params.blockSize);if(b(this,Ee,`f`)===t&&b(this,De,`f`)===n&&b(this,Ae,`f`)===r)return;b(this,_e,`m`,Me).call(this),y(this,Ee,t,`f`),y(this,De,n,`f`),y(this,Oe,Math.ceil(t/2),`f`),y(this,ke,Math.ceil(n/2),`f`),y(this,Ae,r,`f`),y(this,x,!0,`f`);let i=Math.ceil(t/r),a=Math.ceil(n/r);y(this,ye,e.createRenderTarget({size:[t,n]}),`f`),y(this,be,e.createRenderTarget({size:[t,n],persistent:!0}),`f`),y(this,Se,e.createRenderTarget({size:[t,n],float:!0}),`f`),y(this,Ce,e.createRenderTarget({size:[t,n],float:!0,persistent:!0}),`f`),y(this,we,e.createRenderTarget({size:[b(this,Oe,`f`),b(this,ke,`f`)],float:!0,persistent:!0}),`f`),y(this,Te,e.createRenderTarget({size:[b(this,Oe,`f`),b(this,ke,`f`)],float:!0}),`f`),y(this,xe,e.createRenderTarget({size:[i,a],float:!0,filter:`nearest`}),`f`)},Pe=function(e,t,n,r,i,a,o){switch(this.params.view){case`motion`:e.draw({frag:ze,uniforms:{uMV:r,uMvScale:this.params.searchRange*this.params.searchStep},target:e.target});return;case`residual`:e.draw({frag:Be,uniforms:{uResidual:i},target:e.target});return;case`current`:e.draw({frag:Fe,uniforms:{tex:t},target:e.target});return;case`previous`:e.draw({frag:Fe,uniforms:{tex:n},target:e.target});return;default:b(this,ve,`f`)&&this.params.colorSpace===`ycbcr`?e.draw({frag:Ge,uniforms:{uLumaAcc:a,uChromaAcc:o,uChromaGain:this.params.chromaGain},target:e.target}):e.draw({frag:Fe,uniforms:{tex:b(this,ve,`f`)?a:t},target:e.target})}}})),Ye,Xe,Ze,Qe=e((()=>{Ye=`#version 300 es
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
`,Xe={color1:[1,0,0,1],color2:[0,0,1,1],speed:.2},Ze=class{constructor(e={}){this.params={...Xe,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:Ye,uniforms:{src:e.src,time:e.time,color1:this.params.color1,color2:this.params.color2,speed:this.params.speed},target:e.target})}}})),S,C,$e,et,tt,nt,rt,it,w,at,ot,st,ct,lt,ut,dt,ft,pt,mt,ht,gt,_t,vt,yt=e((()=>{S=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},C=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ct=`#version 300 es
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
`,lt=`#version 300 es
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
`,ut=`#version 300 es
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
`,dt=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,ft=`#version 300 es
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
`,pt=`#version 300 es
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
`,mt=`#version 300 es
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
`,ht=`#version 300 es
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
`,gt=`#version 300 es
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
`,_t={simSize:[256,256],pressureIterations:1,curlStrength:13,velocityDissipation:.6,densityDissipation:.65,splatForce:6e3,splatRadius:.002,dyeSplatRadius:.001,dyeSplatIntensity:.005,showDye:!1},vt=class{constructor(e={}){$e.set(this,null),et.set(this,null),tt.set(this,null),nt.set(this,null),rt.set(this,null),it.set(this,null),w.set(this,null),at.set(this,null),ot.set(this,[0,0]),st.set(this,!1),this.params={..._t,...e}}init(e){let t=this.params.simSize,n={size:t,float:!0};S(this,$e,e.createRenderTarget(n),`f`),S(this,et,e.createRenderTarget(n),`f`),S(this,tt,e.createRenderTarget(n),`f`),S(this,nt,e.createRenderTarget(n),`f`),S(this,rt,e.createRenderTarget(n),`f`),S(this,it,e.createRenderTarget(n),`f`),S(this,w,e.createRenderTarget({size:t,float:!0,persistent:!0}),`f`),S(this,at,e.createRenderTarget({float:!0,persistent:!0}),`f`)}render(e){if(!C(this,$e,`f`)||!C(this,et,`f`)||!C(this,tt,`f`)||!C(this,nt,`f`)||!C(this,rt,`f`)||!C(this,it,`f`)||!C(this,w,`f`)||!C(this,at,`f`))return;let{simSize:t,pressureIterations:n,curlStrength:r,velocityDissipation:i,densityDissipation:a,splatForce:o,splatRadius:s,dyeSplatRadius:c,dyeSplatIntensity:l,showDye:u}=this.params,d=[1/t[0],1/t[1]],[f,p]=e.dims.elementPixel,m=f/p,h=[e.mouse[0]/f,e.mouse[1]/p],g=C(this,st,`f`)?[h[0]-C(this,ot,`f`)[0],h[1]-C(this,ot,`f`)[1]]:[0,0];S(this,ot,h,`f`),S(this,st,!0,`f`),e.draw({frag:ct,uniforms:{velocity:C(this,w,`f`),simTexel:d},target:C(this,$e,`f`)}),e.draw({frag:lt,uniforms:{velocity:C(this,w,`f`),curl:C(this,$e,`f`),simTexel:d,aspect:m,mouseUv:h,mouseDeltaUv:g,curlStrength:r,splatForce:o,splatRadius:s},target:C(this,et,`f`)}),e.draw({frag:ut,uniforms:{vortVel:C(this,et,`f`),simTexel:d},target:C(this,tt,`f`)}),e.draw({frag:dt,target:C(this,nt,`f`)});let _=C(this,nt,`f`),v=C(this,rt,`f`);for(let t=0;t<n;t++){e.draw({frag:ft,uniforms:{pressure:_,divergence:C(this,tt,`f`),simTexel:d},target:v});let t=_;_=v,v=t}e.draw({frag:pt,uniforms:{vortVel:C(this,et,`f`),pressure:_,simTexel:d},target:C(this,it,`f`)}),e.draw({frag:mt,uniforms:{projVel:C(this,it,`f`),simTexel:d,velocityDissipation:i},target:C(this,w,`f`)}),e.draw({frag:ht,uniforms:{velocity:C(this,w,`f`),dye:C(this,at,`f`),time:e.time,aspect:m,mouseUv:h,mouseDeltaUv:g,simSize:t,densityDissipation:a,dyeSplatRadius:c,dyeSplatIntensity:l},target:C(this,at,`f`)}),e.draw({frag:gt,uniforms:{src:e.src,dye:C(this,at,`f`),velocity:C(this,w,`f`),simSize:t,showDye:+!!u,time:e.time},target:e.target})}dispose(){S(this,$e,null,`f`),S(this,et,null,`f`),S(this,tt,null,`f`),S(this,nt,null,`f`),S(this,rt,null,`f`),S(this,it,null,`f`),S(this,w,null,`f`),S(this,at,null,`f`),S(this,st,!1,`f`)}},$e=new WeakMap,et=new WeakMap,tt=new WeakMap,nt=new WeakMap,rt=new WeakMap,it=new WeakMap,w=new WeakMap,at=new WeakMap,ot=new WeakMap,st=new WeakMap})),bt,xt,St,Ct=e((()=>{bt=`#version 300 es
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
`,xt={speed:1,intensity:1},St=class{constructor(e={}){this.params={...xt,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:bt,uniforms:{src:e.src,time:e.time*this.params.speed,intensity:this.params.intensity},target:e.target})}}})),wt,Tt,Et,Dt,Ot,kt=e((()=>{wt={pure:{cyan:[0,1,1,1],magenta:[1,0,1,1],yellow:[1,1,0,1],black:[0,0,0,1],red:[1,0,0,1],green:[0,1,0,1],blue:[0,0,1,1]},newsprint:{cyan:[.15,.73,.88,1],magenta:[.88,.12,.55,1],yellow:[.97,.93,.08,1],black:[.1,.1,.1,1]},fogra51:{cyan:[0,.525,.765,1],magenta:[.827,0,.486,1],yellow:[.984,.91,0,1],black:[.145,.145,.145,1]},swop:{cyan:[0,.557,.769,1],magenta:[.827,.02,.478,1],yellow:[.984,.902,.027,1],black:[.169,.169,.169,1]}},Tt=`#version 300 es
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
`,Et={...wt.pure,...wt.newsprint},Dt={gridSize:10,dotSize:1,smoothing:.15,angle:0,mode:`rgb`,blackAmount:1,trimEdge:!0,background:[0,0,0,0],inkPalette:Et},Ot=class{constructor(e={}){this.params={...Dt,...e,inkPalette:{...Et,...e.inkPalette??{}}}}setParams(e){Object.assign(this.params,e)}setInkPreset(e){Object.assign(this.params.inkPalette,wt[e])}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params,o=a.inkPalette;e.draw({frag:Tt,uniforms:{src:e.src,srcSizePx:[e.src.width||1,e.src.height||1],elementPx:[r,i],gridSize:Math.max(1,a.gridSize),dotSize:Math.max(0,a.dotSize),smoothing:Math.max(0,Math.min(1,a.smoothing)),angle:a.angle,blackAmount:Math.max(0,Math.min(1,a.blackAmount)),ymck:+(a.mode===`cmyk`),trimEdge:+!!a.trimEdge,background:a.background,cInk:o.cyan,mInk:o.magenta,yInk:o.yellow,kInk:o.black,rInk:o.red,gInk:o.green,bInk:o.blue},target:e.target})}}})),At,jt,Mt,Nt=e((()=>{At=`#version 300 es
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
`,jt={shift:.5},Mt=class{constructor(e={}){this.params={...jt,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:At,uniforms:{src:e.src,shift:this.params.shift},target:e.target})}}}));function Pt(e,t){if(typeof OffscreenCanvas<`u`)return new OffscreenCanvas(e,t);let n=document.createElement(`canvas`);return n.width=e,n.height=t,n}function Ft(e){let t=e.getContext(`2d`);if(!t)throw Error(`[VFX-JS] JPEGGlitchEffect: 2D canvas context unavailable`);return t}function It(e,t){if(typeof OffscreenCanvas<`u`&&e instanceof OffscreenCanvas)return e.convertToBlob({type:`image/jpeg`,quality:t});let n=e;return new Promise((e,r)=>{n.toBlob(t=>t?e(t):r(Error(`[VFX-JS] JPEGGlitchEffect: toBlob failed`)),`image/jpeg`,t)})}function Lt(e){for(let t=2;t+3<e.length;t++)if(e[t]===255&&e[t+1]===218){let n=e[t+2]<<8|e[t+3];return Math.min(e.length,t+2+n)}return Math.min(e.length,417)}function Rt(e,t){let n=Math.imul(Math.floor(e*2654435761)|0,2246822519)+Math.imul(t+1,3266489917)>>>0;return()=>{n=n+1831565813>>>0;let e=Math.imul(n^n>>>15,1|n);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function zt(e,t,n,r,i,a,o){switch(e.save(),e.clearRect(0,0,a,o),i){case 90:e.translate(a,0);break;case 180:e.translate(a,o);break;case 270:e.translate(0,o);break}e.rotate(i*Math.PI/180),e.drawImage(t,0,0,n,r),e.restore()}function Bt(e,t,n,r){let i=e.length-t-4;if(i<=1)return;let a=Math.max(1,Math.floor(n));for(let n=0;n<a;n++){let o=i/a*n|0,s=i/a*(n+1)|0,c=Math.max(1,s-o),l=Math.min(i,o+(r()*c|0)),u=r()*256|0;e[t+l]=u}}var T,E,D,Vt,O,Ht,Ut,Wt,Gt,Kt,k,qt,Jt,Yt,A,Xt,Zt,Qt,$t,en,tn,nn,rn,an,on,j,sn,M,cn,ln,un,dn,fn,pn,mn,hn,gn,_n,vn,yn,bn=e((()=>{T=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},E=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},gn=`#version 300 es
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
`,_n=`#version 300 es
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
`,vn={quality:.4,seed:.25,iterations:24,resolutionScale:1,randomFlip:!0,vertical:!1,speed:0,bypass:!1},yn=class{get producedFrames(){return T(this,cn,`f`)}constructor(e={}){D.add(this),this.enabled=!0,Vt.set(this,!1),O.set(this,null),Ht.set(this,null),Ut.set(this,null),Wt.set(this,null),Gt.set(this,!1),Kt.set(this,null),k.set(this,null),qt.set(this,null),Jt.set(this,null),Yt.set(this,null),A.set(this,null),Xt.set(this,null),Zt.set(this,new Uint8Array),Qt.set(this,null),$t.set(this,0),en.set(this,0),tn.set(this,0),nn.set(this,0),rn.set(this,!0),an.set(this,!1),on.set(this,-1e9),j.set(this,0),sn.set(this,0),M.set(this,!1),cn.set(this,0),this.params={...vn,...e}}setParams(e){Object.assign(this.params,e),E(this,rn,!0,`f`)}init(e){E(this,Vt,typeof createImageBitmap==`function`&&(typeof OffscreenCanvas<`u`||typeof document<`u`),`f`),T(this,Vt,`f`)&&(E(this,on,-1e9,`f`),E(this,rn,!0,`f`),E(this,k,Pt(1,1),`f`),E(this,qt,Ft(T(this,k,`f`)),`f`),E(this,Jt,Pt(1,1),`f`),E(this,Yt,Ft(T(this,Jt,`f`)),`f`),E(this,A,Pt(1,1),`f`),E(this,Xt,Ft(T(this,A,`f`)),`f`),E(this,O,e.createRenderTarget({size:[1,1]}),`f`),E(this,Ut,e.gl,`f`),T(this,D,`m`,ln).call(this,e),E(this,Kt,e.onContextRestored(()=>{T(this,D,`m`,ln).call(this,e),E(this,Gt,T(this,M,`f`),`f`)}),`f`))}update(){this.enabled===!1&&E(this,M,!1,`f`)}render(e){if(this.params.bypass||!T(this,Vt,`f`)||!T(this,O,`f`)){E(this,M,!1,`f`),T(this,D,`m`,un).call(this,e);return}let t=e.src.width,n=e.src.height;(t!==T(this,tn,`f`)||n!==T(this,nn,`f`))&&(E(this,tn,t,`f`),E(this,nn,n,`f`),E(this,rn,!0,`f`));let[r,i]=e.dims.elementPixel,a=Math.min(1,Math.max(0,this.params.resolutionScale)),o=Math.max(1,Math.round(r*a)),s=Math.max(1,Math.round(i*a));r>=2&&i>=2&&t>0&&n>0&&((o!==T(this,$t,`f`)||s!==T(this,en,`f`))&&T(this,D,`m`,fn).call(this,e,o,s),T(this,D,`m`,dn).call(this,e)&&T(this,D,`m`,pn).call(this,e)),T(this,M,`f`)&&T(this,Ht,`f`)?(T(this,Gt,`f`)&&T(this,D,`m`,mn).call(this,e),e.draw({frag:_n,uniforms:{tex:T(this,Ht,`f`)},target:e.target})):T(this,D,`m`,un).call(this,e)}dispose(){var e;T(this,Kt,`f`)?.call(this),E(this,Kt,null,`f`),T(this,Ut,`f`)&&T(this,Wt,`f`)&&T(this,Ut,`f`).deleteTexture(T(this,Wt,`f`)),E(this,Wt,null,`f`),E(this,Ut,null,`f`),E(this,Gt,!1,`f`),T(this,O,`f`)?.dispose(),E(this,O,null,`f`),E(this,Ht,null,`f`),E(this,k,null,`f`),E(this,qt,null,`f`),E(this,Jt,null,`f`),E(this,Yt,null,`f`),E(this,A,null,`f`),E(this,Xt,null,`f`),E(this,Qt,null,`f`),E(this,Zt,new Uint8Array,`f`),E(this,M,!1,`f`),E(this,an,!1,`f`),E(this,$t,0,`f`),E(this,en,0,`f`),E(this,j,(e=T(this,j,`f`),e++,e),`f`)}},Vt=new WeakMap,O=new WeakMap,Ht=new WeakMap,Ut=new WeakMap,Wt=new WeakMap,Gt=new WeakMap,Kt=new WeakMap,k=new WeakMap,qt=new WeakMap,Jt=new WeakMap,Yt=new WeakMap,A=new WeakMap,Xt=new WeakMap,Zt=new WeakMap,Qt=new WeakMap,$t=new WeakMap,en=new WeakMap,tn=new WeakMap,nn=new WeakMap,rn=new WeakMap,an=new WeakMap,on=new WeakMap,j=new WeakMap,sn=new WeakMap,M=new WeakMap,cn=new WeakMap,D=new WeakSet,ln=function(e){let t=e.gl,n=t.createTexture();n&&(t.bindTexture(t.TEXTURE_2D,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,0])),t.bindTexture(t.TEXTURE_2D,null),E(this,Wt,n,`f`),E(this,Ht,e.wrapTexture(n,{size:[T(this,$t,`f`)||1,T(this,en,`f`)||1]}),`f`))},un=function(e){e.draw({frag:gn,uniforms:{src:e.src},target:e.target})},dn=function(e){if(T(this,an,`f`))return!1;let t=this.params.speed;return t>0?e.time-T(this,on,`f`)>=1/t:T(this,rn,`f`)},fn=function(e,t,n){var r;E(this,$t,t,`f`),E(this,en,n,`f`),E(this,Zt,new Uint8Array(t*n*4),`f`),E(this,Qt,new ImageData(t,n),`f`),T(this,k,`f`)&&(T(this,k,`f`).width=t,T(this,k,`f`).height=n),T(this,A,`f`)&&(T(this,A,`f`).width=t,T(this,A,`f`).height=n),T(this,O,`f`)?.dispose(),E(this,O,e.createRenderTarget({size:[t,n]}),`f`),E(this,M,!1,`f`),E(this,rn,!0,`f`),E(this,an,!1,`f`),E(this,Gt,!1,`f`),E(this,j,(r=T(this,j,`f`),r++,r),`f`)},pn=function(e){var t;let n=T(this,$t,`f`),r=T(this,en,`f`),i=T(this,k,`f`),a=T(this,qt,`f`),o=T(this,Jt,`f`),s=T(this,Yt,`f`),c=T(this,Qt,`f`);if(!i||!a||!o||!s||!c||!T(this,O,`f`))return;e.blit(e.src,T(this,O,`f`));let l=e.gl;l.readPixels(0,0,n,r,l.RGBA,l.UNSIGNED_BYTE,T(this,Zt,`f`)),l.bindFramebuffer(l.FRAMEBUFFER,null),E(this,an,!0,`f`),E(this,rn,!1,`f`),E(this,on,e.time,`f`);let u=c.data,d=n*4;for(let e=0;e<r;e++){let t=(r-1-e)*d;u.set(T(this,Zt,`f`).subarray(t,t+d),e*d)}for(let e=3;e<u.length;e+=4)u[e]=255;let f=this.params.speed>0?T(this,sn,`f`):0;E(this,sn,(t=T(this,sn,`f`),t++,t),`f`);let{quality:p,seed:m,iterations:h,randomFlip:g,vertical:_}=this.params,v=Rt(m,f),ee=g&&v()<.5;a.putImageData(c,0,0);let te=((ee?180:0)+(_?270:0))%360,ne=_,re=ne?r:n,ie=ne?n:r;o.width=re,o.height=ie,zt(s,i,n,r,te,re,ie),T(this,D,`m`,hn).call(this,o,n,r,p,h,te,v,T(this,j,`f`))},mn=function(e){let t=e.gl;!T(this,Wt,`f`)||!T(this,A,`f`)||(t.bindTexture(t.TEXTURE_2D,T(this,Wt,`f`)),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,T(this,A,`f`)),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,null),E(this,Gt,!1,`f`))},hn=async function(e,t,n,r,i,a,o,s){var c;try{let l=await It(e,r),u=new Uint8Array(await l.arrayBuffer());Bt(u,Lt(u),i,o);let d=await createImageBitmap(new Blob([u],{type:`image/jpeg`}));if(s===T(this,j,`f`)&&T(this,Xt,`f`)){let e=(360-a)%360;zt(T(this,Xt,`f`),d,d.width,d.height,e,t,n),E(this,M,!0,`f`),E(this,cn,(c=T(this,cn,`f`),c++,c),`f`),E(this,Gt,!0,`f`)}d.close()}catch{}finally{s===T(this,j,`f`)&&E(this,an,!1,`f`)}}})),xn,Sn,Cn,wn=e((()=>{xn=.7,Sn=1.3,Cn=`
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
`}));function Tn(e){let t=En(e);return 2**Math.ceil(Math.log2(Math.sqrt(t)))}function En(e){return Number.isFinite(e)?Math.max(1,Math.floor(e)):1}function Dn(e){let t=e|0;return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function On(e){return Math.min(Pn,Math.max(0,e))}var kn,An,jn,Mn,Nn,Pn,Fn=e((()=>{kn=new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),An=`
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,jn=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,Mn=`#version 300 es
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
`,Nn=`#version 300 es
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
`,Pn=.1})),N,P,F,In,I,L,R,z,B,Ln,V,Rn,zn,H,Bn,Vn,Hn,Un,Wn,U,Gn,Kn,qn,Jn,Yn,Xn,Zn,Qn,$n,er,tr,W,nr,rr,ir,ar,or,sr,cr,lr,ur,dr,fr,pr,mr,hr,gr,_r=e((()=>{wn(),Fn(),N=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},P=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},W=64,nr=W*W,rr=.1,ir=[W,W],ar=new Float32Array(nr);for(let e=0;e<nr;e++)ar[e]=e;or=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, 2.0);
}
`,sr=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0);
}
`,cr=`#version 300 es
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
`,lr=`#version 300 es
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
`,ur=`#version 300 es
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
${Cn}

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
`,dr=`#version 300 es
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
`,fr=`#version 300 es
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
`,pr=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;

uniform sampler2D src;
uniform vec3 color;
uniform float colorMix;
uniform vec2 lifeJitterRange;
${An}

void main() {
    vec4 c = texture(src, clamp(vSpawn.yz, 0.0, 1.0));
    float h = hash21(vSpawn.yz + vec2(vSpawn.x) * 1.7);
    float lifeJitter = mix(lifeJitterRange.x, lifeJitterRange.y, h);
    outColor = vec4(mix(c.rgb, color, colorMix), lifeJitter);
}
`,mr=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;
void main() {
    float theta = vSpawn.w;
    vec2 dir = theta >= 0.0 ? vec2(cos(theta), sin(theta)) : vec2(0.0);
    outColor = vec4(dir, 0.0, 0.0);
}
`,hr={count:1024*1024,birthRate:3e4,screenBirthRate:1e4,life:1,noiseSpeed:.3,emitSpeed:1,noiseDelay:.15,noiseScale:1,noiseAnimation:.3,pointSize:10,alpha:1,radius:300,speedDecay:1,alphaDecay:5,fadeIn:.05,alphaThreshold:.05,spawnOnIdle:!0,srcOpacity:0,trailFade:.75,fog:.5,color:16777215,colorMix:0,blend:`add`},gr=class{get params(){return N(this,In,`f`)}constructor(e={}){F.add(this),In.set(this,void 0),I.set(this,null),L.set(this,null),R.set(this,null),z.set(this,null),B.set(this,null),Ln.set(this,!1),V.set(this,void 0),Rn.set(this,void 0),zn.set(this,new Float32Array(nr*4)),H.set(this,null),Bn.set(this,null),Vn.set(this,null),Hn.set(this,null),Un.set(this,null),Wn.set(this,null),U.set(this,0),Gn.set(this,0),Kn.set(this,0),qn.set(this,null),Jn.set(this,-1/0),P(this,In,{...hr,...e},`f`),N(this,In,`f`).count=En(N(this,In,`f`).count),P(this,V,Tn(N(this,In,`f`).count),`f`),P(this,Rn,N(this,V,`f`)*N(this,V,`f`),`f`)}get maxCount(){return N(this,Rn,`f`)}setParam(e){let t=N(this,In,`f`);for(let[n,r]of Object.entries(e))r!==void 0&&(t[n]=n===`count`?En(r):r)}init(e){N(this,F,`m`,Yn).call(this,e),P(this,z,e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),`f`),P(this,B,e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),`f`),P(this,Hn,{attributes:{position:kn}},`f`),P(this,Vn,{mode:`points`,attributes:{position:{data:ar,itemSize:1}}},`f`),P(this,Un,e.gl,`f`),N(this,F,`m`,Qn).call(this,e),P(this,Wn,e.onContextRestored(()=>{P(this,Un,e.gl,`f`),N(this,F,`m`,Qn).call(this,e),P(this,Ln,!1,`f`)}),`f`)}render(e){if(!N(this,I,`f`)||!N(this,L,`f`)||!N(this,R,`f`)||!N(this,z,`f`)||!N(this,B,`f`)||!N(this,Hn,`f`)||!N(this,Vn,`f`)||!N(this,Bn,`f`)||!N(this,H,`f`))return;let t=Tn(this.params.count);t!==N(this,V,`f`)&&(N(this,F,`m`,Xn).call(this),P(this,V,t,`f`),P(this,Rn,t*t,`f`),N(this,F,`m`,Yn).call(this,e),P(this,U,0,`f`),P(this,Ln,!1,`f`)),N(this,Ln,`f`)||(e.draw({frag:or,target:N(this,I,`f`)}),e.draw({frag:sr,target:N(this,L,`f`)}),e.draw({frag:sr,target:N(this,R,`f`)}),P(this,Ln,!0,`f`));let n=On(e.deltaTime),r=[e.dims.elementPixel[0],e.dims.elementPixel[1]],i=[N(this,V,`f`),N(this,V,`f`)],a=N(this,F,`m`,er).call(this,e,n,r);a>0&&N(this,F,`m`,$n).call(this,e);let o=a===0;if(e.draw({frag:ur,uniforms:{posTex:N(this,I,`f`),colorTex:N(this,L,`f`),velTex:N(this,R,`f`),elementPixel:r,time:e.time,dt:n,noiseSpeed:this.params.noiseSpeed,emitSpeed:this.params.emitSpeed,noiseDelay:this.params.noiseDelay,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,life:this.params.life},target:N(this,I,`f`),swap:o}),a>0){let t={uSpawnTex:N(this,Bn,`f`),uSpawnTexSize:ir,uSpawnCount:a,stateSize:i};e.draw({vert:dr,frag:fr,geometry:N(this,Vn,`f`),uniforms:{...t,src:e.src,alphaThreshold:this.params.alphaThreshold},target:N(this,I,`f`),blend:`none`}),e.draw({vert:dr,frag:pr,geometry:N(this,Vn,`f`),uniforms:{...t,src:e.src,color:Dn(this.params.color),colorMix:this.params.colorMix,lifeJitterRange:[xn,Sn]},target:N(this,L,`f`),blend:`none`}),e.draw({vert:dr,frag:mr,geometry:N(this,Vn,`f`),uniforms:t,target:N(this,R,`f`),blend:`none`})}let s=N(this,F,`m`,tr).call(this);N(this,Hn,`f`).instanceCount=s,e.draw({frag:jn,target:N(this,z,`f`)}),e.draw({vert:cr,frag:Mn,uniforms:{posTex:N(this,I,`f`),colorTex:N(this,L,`f`),stateSize:i,pointSize:this.params.pointSize,elementPixel:r,particleCount:s,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fadeIn:this.params.fadeIn,fog:this.params.fog},geometry:N(this,Hn,`f`),target:N(this,z,`f`),blend:this.params.blend===`normal`?`premultiplied`:`additive`}),e.draw({frag:Nn,uniforms:{trailPrev:N(this,B,`f`),particleStamp:N(this,z,`f`),trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:N(this,B,`f`)}),e.draw({frag:lr,uniforms:{src:e.src,trail:N(this,B,`f`),srcOpacity:this.params.srcOpacity},target:e.target})}dispose(){N(this,Wn,`f`)?.call(this),P(this,Wn,null,`f`),N(this,Un,`f`)&&N(this,H,`f`)&&N(this,Un,`f`).deleteTexture(N(this,H,`f`)),P(this,H,null,`f`),P(this,Bn,null,`f`),P(this,Vn,null,`f`),P(this,Un,null,`f`),N(this,F,`m`,Xn).call(this),N(this,z,`f`)?.dispose(),N(this,B,`f`)?.dispose(),P(this,z,null,`f`),P(this,B,null,`f`),P(this,Hn,null,`f`),P(this,Ln,!1,`f`)}outputRect(e){return e.canvasRect}},In=new WeakMap,I=new WeakMap,L=new WeakMap,R=new WeakMap,z=new WeakMap,B=new WeakMap,Ln=new WeakMap,V=new WeakMap,Rn=new WeakMap,zn=new WeakMap,H=new WeakMap,Bn=new WeakMap,Vn=new WeakMap,Hn=new WeakMap,Un=new WeakMap,Wn=new WeakMap,U=new WeakMap,Gn=new WeakMap,Kn=new WeakMap,qn=new WeakMap,Jn=new WeakMap,F=new WeakSet,Yn=function(e){let t={size:[N(this,V,`f`),N(this,V,`f`)],float:!0,wrap:`clamp`,filter:`nearest`};P(this,I,e.createRenderTarget({...t,persistent:!0}),`f`),P(this,L,e.createRenderTarget(t),`f`),P(this,R,e.createRenderTarget(t),`f`)},Xn=function(){N(this,I,`f`)?.dispose(),N(this,L,`f`)?.dispose(),N(this,R,`f`)?.dispose(),P(this,I,null,`f`),P(this,L,null,`f`),P(this,R,null,`f`)},Zn=function(e){let t=e.gl,n=t.createTexture();if(!n)throw Error(`[ParticleEffect] Failed to create spawn texture`);return t.bindTexture(t.TEXTURE_2D,n),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,W,W,0,t.RGBA,t.FLOAT,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.bindTexture(t.TEXTURE_2D,null),{raw:n,handle:e.wrapTexture(n,{size:[W,W],filter:`nearest`,wrap:`clamp`})}},Qn=function(e){let t=N(this,F,`m`,Zn).call(this,e);P(this,H,t.raw,`f`),P(this,Bn,t.handle,`f`)},$n=function(e){if(!N(this,H,`f`))return;let t=e.gl;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,N(this,H,`f`)),t.texSubImage2D(t.TEXTURE_2D,0,0,0,W,W,t.RGBA,t.FLOAT,N(this,zn,`f`)),t.bindTexture(t.TEXTURE_2D,null)},er=function(e,t,n){let r=[e.mouse[0]/Math.max(1,n[0]),e.mouse[1]/Math.max(1,n[1])];(!N(this,qn,`f`)||Math.abs(r[0]-N(this,qn,`f`)[0])>1e-6||Math.abs(r[1]-N(this,qn,`f`)[1])>1e-6)&&P(this,Jn,e.time,`f`),P(this,qn,r,`f`);let i=e.intersection>0,a=e.time-N(this,Jn,`f`)<rr;i&&(a||this.params.spawnOnIdle)?P(this,Gn,Math.min(N(this,Gn,`f`)+this.params.birthRate*t,nr),`f`):P(this,Gn,0,`f`),i?P(this,Kn,Math.min(N(this,Kn,`f`)+this.params.screenBirthRate*t,nr),`f`):P(this,Kn,0,`f`);let o=Math.min(nr,Math.floor(N(this,Gn,`f`))),s=Math.min(nr-o,Math.floor(N(this,Kn,`f`)));P(this,Gn,N(this,Gn,`f`)-o,`f`),P(this,Kn,N(this,Kn,`f`)-s,`f`);let c=o+s;if(c===0)return 0;let l=N(this,F,`m`,tr).call(this),u=Math.max(1,n[0]),d=Math.max(1,n[1]),f=N(this,zn,`f`),p=0;for(;p<o;p++){let e=Math.sqrt(Math.random())*this.params.radius,t=Math.random()*Math.PI*2,n=Math.cos(t)*e,i=Math.sin(t)*e,a=p*4;f[a+0]=N(this,U,`f`),f[a+1]=r[0]+n/u,f[a+2]=r[1]+i/d,f[a+3]=t,P(this,U,(N(this,U,`f`)+1)%l,`f`)}for(let e=0;e<s;e++,p++){let e=p*4;f[e+0]=N(this,U,`f`),f[e+1]=Math.random(),f[e+2]=Math.random(),f[e+3]=-1,P(this,U,(N(this,U,`f`)+1)%l,`f`)}return c},tr=function(){return Math.max(1,Math.min(N(this,Rn,`f`),Math.floor(this.params.count)))}})),G,K,q,vr,J,yr,Y,X,br,Z,xr,Sr,Cr,wr,Tr,Er,Dr,Or,kr,Ar,jr,Mr,Nr,Pr,Fr,Ir=e((()=>{wn(),Fn(),G=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},K=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Ar=`#version 300 es
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
${An}
${Cn}

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
        ${xn.toFixed(4)},
        ${Sn.toFixed(4)},
        hash21(uv * 91.7 + 1.234)
    );
    age += dt / max(duration * lifespanScale, 1e-3);

    outColor = vec4(pos, age);
}
`,jr=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 stateSize;
uniform float count;
uniform vec3 color;
uniform float colorMix;
${An}

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
`,Mr=`#version 300 es
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
`,Nr=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trail;

void main() {
    outColor = texture(trail, uv);
}
`,Pr={count:1e5,duration:1,noiseSpeed:1.5,noiseScale:1,noiseAnimation:1,outwardBias:1,pointSize:3,alpha:1,alphaDecay:5,speedDecay:2,fog:0,trailFade:.5,color:16777215,colorMix:0,blend:`add`},Fr=class{get params(){return G(this,vr,`f`)}constructor(e={}){q.add(this),vr.set(this,void 0),J.set(this,null),yr.set(this,null),Y.set(this,null),X.set(this,null),br.set(this,null),Z.set(this,void 0),xr.set(this,!1),Sr.set(this,!1),Cr.set(this,-1),wr.set(this,0),Tr.set(this,0),K(this,vr,{...Pr,...e},`f`),G(this,vr,`f`).count=En(G(this,vr,`f`).count);let t=Tn(G(this,vr,`f`).count);K(this,Z,[t,t],`f`)}trigger(){K(this,xr,!0,`f`),K(this,Sr,!0,`f`),K(this,Cr,-1,`f`),K(this,wr,0,`f`),K(this,Tr,0,`f`)}reset(){K(this,xr,!1,`f`),K(this,Sr,!1,`f`),K(this,Cr,-1,`f`),K(this,wr,0,`f`),K(this,Tr,0,`f`)}isDone(){return!G(this,xr,`f`)||G(this,wr,`f`)<this.params.duration?!1:G(this,Tr,`f`)>=G(this,q,`m`,Er).call(this)}init(e){G(this,q,`m`,Dr).call(this,e),K(this,Y,e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),`f`),K(this,X,e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),`f`),K(this,br,{attributes:{position:kn}},`f`)}render(e){var t;if(!G(this,J,`f`)||!G(this,yr,`f`)||!G(this,Y,`f`)||!G(this,X,`f`)||!G(this,br,`f`)||e.intersection<=0)return;let n=Tn(this.params.count),r=!G(this,xr,`f`)||this.isDone();if(n!==G(this,Z,`f`)[0]&&r&&(G(this,q,`m`,Or).call(this),K(this,Z,[n,n],`f`),G(this,q,`m`,Dr).call(this,e)),!G(this,xr,`f`)){e.blit(e.src,e.target);return}G(this,Cr,`f`)<0&&K(this,Cr,e.time,`f`);let i=e.time-G(this,Cr,`f`);K(this,wr,i,`f`);let a=i>=this.params.duration;if(a&&G(this,Tr,`f`)>=G(this,q,`m`,Er).call(this)){e.draw({frag:jn,target:e.target});return}let o=On(e.deltaTime),s=[e.dims.elementPixel[0],e.dims.elementPixel[1]];if(a)e.draw({frag:jn,target:G(this,Y,`f`)}),K(this,Tr,(t=G(this,Tr,`f`),t++,t),`f`);else{let t=+!!G(this,Sr,`f`);K(this,Sr,!1,`f`);let n=G(this,q,`m`,kr).call(this);e.draw({frag:Ar,uniforms:{posTex:G(this,J,`f`),stateSize:G(this,Z,`f`),elementPixel:s,time:e.time,dt:o,noiseSpeed:this.params.noiseSpeed,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,outwardBias:this.params.outwardBias,duration:this.params.duration,count:n,uBurst:t},target:G(this,J,`f`)}),t===1&&(e.draw({frag:jr,uniforms:{src:e.src,stateSize:G(this,Z,`f`),count:n,color:Dn(this.params.color),colorMix:this.params.colorMix},target:G(this,yr,`f`)}),e.draw({frag:jn,target:G(this,X,`f`)})),G(this,br,`f`).instanceCount=n,e.draw({frag:jn,target:G(this,Y,`f`)}),e.draw({vert:Mr,frag:Mn,uniforms:{posTex:G(this,J,`f`),colorTex:G(this,yr,`f`),stateSize:G(this,Z,`f`),pointSize:this.params.pointSize,elementPixel:s,particleCount:n,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fog:this.params.fog},geometry:G(this,br,`f`),target:G(this,Y,`f`),blend:this.params.blend===`normal`?`premultiplied`:`additive`})}e.draw({frag:Nn,uniforms:{trailPrev:G(this,X,`f`),particleStamp:G(this,Y,`f`),trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:G(this,X,`f`)}),e.draw({frag:Nr,uniforms:{trail:G(this,X,`f`)},target:e.target})}dispose(){G(this,q,`m`,Or).call(this),G(this,Y,`f`)?.dispose(),G(this,X,`f`)?.dispose(),K(this,Y,null,`f`),K(this,X,null,`f`),K(this,br,null,`f`)}outputRect(e){return e.canvasRect}},vr=new WeakMap,J=new WeakMap,yr=new WeakMap,Y=new WeakMap,X=new WeakMap,br=new WeakMap,Z=new WeakMap,xr=new WeakMap,Sr=new WeakMap,Cr=new WeakMap,wr=new WeakMap,Tr=new WeakMap,q=new WeakSet,Er=function(){let e=this.params.trailFade;return e<=0?1:e>=.999?600:Math.ceil(-Math.log(255)/Math.log(e))},Dr=function(e){let t={size:G(this,Z,`f`),float:!0,wrap:`clamp`,filter:`nearest`};K(this,J,e.createRenderTarget({...t,persistent:!0}),`f`),K(this,yr,e.createRenderTarget(t),`f`)},Or=function(){G(this,J,`f`)?.dispose(),G(this,yr,`f`)?.dispose(),K(this,J,null,`f`),K(this,yr,null,`f`)},kr=function(){let e=G(this,Z,`f`)[0]*G(this,Z,`f`)[1];return Math.max(1,Math.min(e,Math.floor(this.params.count)))}})),Lr,Rr,zr,Br=e((()=>{Lr=`#version 300 es
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
`,Rr={size:10},zr=class{constructor(e={}){this.params={...Rr,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element,{size:r}=this.params;e.draw({frag:Lr,uniforms:{src:e.src,cellUv:[r/(t||1),r/(n||1)]},target:e.target})}}})),Q,$,Vr,Hr,Ur,Wr,Gr,Kr,qr,Jr,Yr,Xr,Zr,Qr,$r,ei,ti,ni,ri,ii,ai,oi,si,ci,li,ui,di,fi=e((()=>{Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},$=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ti=`
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
`,ni=`
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
`,ri=`#version 300 es
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
${ti}
${ni}
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
`,ii=`#version 300 es
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
${ti}
${ni}
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
`,ai=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    vec4 c = texture(src, uvSrc);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,oi=`#version 300 es
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
`,si=`#version 300 es
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
`,ci={right:{axis:0,direction:0},left:{axis:0,direction:1},down:{axis:1,direction:1},up:{axis:1,direction:0}},li={luminance:0,r:1,g:2,b:3,hue:4,saturation:5},ui={range:[0,1],sortRes:128,key:`luminance`,direction:`up`,angle:0,bypass:!1},di=class{constructor(e={}){Vr.add(this),Hr.set(this,null),Ur.set(this,null),Wr.set(this,null),Gr.set(this,null),Kr.set(this,0),qr.set(this,0),Jr.set(this,0),Yr.set(this,0),Xr.set(this,0),Zr.set(this,0),Qr.set(this,0),this.params={...ui,...e},this.params.range=[...this.params.range]}setParams(e){Object.assign(this.params,e),e.range&&(this.params.range=[...e.range])}render(e){if(Q(this,Vr,`m`,ei).call(this,e),this.params.bypass||!Q(this,Hr,`f`)||!Q(this,Ur,`f`)){e.draw({frag:ai,uniforms:{src:e.src},target:e.target});return}let{axis:t,direction:n}=ci[this.params.direction],r=[Q(this,Zr,`f`),Q(this,Qr,`f`)],[i,a]=this.params.range,o=li[this.params.key],[s,c]=e.dims.elementPixel,l=Q(this,Wr,`f`),u=Q(this,Gr,`f`),d=this.params.angle!==0&&l!==null&&u!==null,f=e.src,p=e.src,m=e.target,h=[1,0],g=[s,c];if(d){let t=-this.params.angle*Math.PI/180;h=[Math.cos(t),Math.sin(t)],g=[Q(this,Yr,`f`),Q(this,Xr,`f`)],e.draw({frag:oi,uniforms:{src:e.src,srcSize:[s,c],boxSize:g,rot:h},target:l}),f=l,p=l,m=u}e.blit(f,Q(this,Hr,`f`));let _=+!!d,v=[s,c];e.draw({frag:ri,uniforms:{src:Q(this,Hr,`f`),srcSize:r,threshold:i,thresholdHigh:a,keyMode:o,direction:n,axis:t,masked:_,boxSize:g,imgSize:v,rot:h},target:Q(this,Ur,`f`)}),e.draw({frag:ii,uniforms:{src:Q(this,Hr,`f`),srcHi:p,rankTex:Q(this,Ur,`f`),lowSize:r,threshold:i,thresholdHigh:a,keyMode:o,axis:t,masked:_,boxSize:g,imgSize:v,rot:h},target:m}),d&&e.draw({frag:si,uniforms:{src:u,srcSize:[s,c],boxSize:g,rot:h},target:e.target})}dispose(){Q(this,Vr,`m`,$r).call(this),$(this,Kr,0,`f`),$(this,qr,0,`f`),$(this,Jr,0,`f`),$(this,Yr,0,`f`),$(this,Xr,0,`f`),$(this,Zr,0,`f`),$(this,Qr,0,`f`)}},Hr=new WeakMap,Ur=new WeakMap,Wr=new WeakMap,Gr=new WeakMap,Kr=new WeakMap,qr=new WeakMap,Jr=new WeakMap,Yr=new WeakMap,Xr=new WeakMap,Zr=new WeakMap,Qr=new WeakMap,Vr=new WeakSet,$r=function(){Q(this,Hr,`f`)?.dispose(),Q(this,Ur,`f`)?.dispose(),Q(this,Wr,`f`)?.dispose(),Q(this,Gr,`f`)?.dispose(),$(this,Hr,null,`f`),$(this,Ur,null,`f`),$(this,Wr,null,`f`),$(this,Gr,null,`f`)},ei=function(e){let[t,n]=e.dims.elementPixel,{axis:r}=ci[this.params.direction],{angle:i}=this.params,a=this.params.sortRes,o=t,s=n;if(i!==0){let e=i*Math.PI/180,r=Math.abs(Math.cos(e)),a=Math.abs(Math.sin(e));o=Math.ceil(t*r+n*a),s=Math.ceil(t*a+n*r)}let c=r===0?Math.max(1,Math.round(a*o/t)):Math.max(1,Math.round(a*s/n)),l=r===0?c:o,u=r===0?s:c;Q(this,Kr,`f`)===t&&Q(this,qr,`f`)===n&&Q(this,Jr,`f`)===i&&Q(this,Zr,`f`)===l&&Q(this,Qr,`f`)===u||(Q(this,Vr,`m`,$r).call(this),$(this,Kr,t,`f`),$(this,qr,n,`f`),$(this,Jr,i,`f`),$(this,Yr,o,`f`),$(this,Xr,s,`f`),$(this,Zr,l,`f`),$(this,Qr,u,`f`),$(this,Hr,e.createRenderTarget({size:[l,u],filter:`nearest`}),`f`),$(this,Ur,e.createRenderTarget({size:[l,u],filter:`nearest`,float:!0}),`f`),i!==0&&($(this,Wr,e.createRenderTarget({size:[o,s]}),`f`),$(this,Gr,e.createRenderTarget({size:[o,s]}),`f`)))}})),pi,mi,hi,gi=e((()=>{pi=`#version 300 es
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
`,mi={speed:1,frequency:1},hi=class{constructor(e={}){this.params={...mi,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:pi,uniforms:{src:e.src,time:e.time*this.params.speed,aspect:(t||1)/(n||1),frequency:this.params.frequency},target:e.target})}}})),_i,vi,yi,bi=e((()=>{_i=`#version 300 es
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
`,vi={speed:1,amount:.05},yi=class{constructor(e={}){this.params={...vi,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:_i,uniforms:{src:e.src,time:e.time*this.params.speed,amount:this.params.amount},target:e.target})}}})),xi,Si,Ci,wi=e((()=>{xi=`#version 300 es
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
`,Si={speed:1,amount:10},Ci=class{constructor(e={}){this.params={...Si,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=e.dims.element[0]||1;e.draw({frag:xi,uniforms:{src:e.src,time:e.time*this.params.speed,amp:this.params.amount/t},target:e.target})}}})),Ti,Ei,Di,Oi=e((()=>{Ti=`#version 300 es
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
`,Ei={spacing:4},Di=class{constructor(e={}){this.params={...Ei,...e}}setParams(e){Object.assign(this.params,e)}render(e){let{spacing:t}=this.params;e.draw({frag:Ti,uniforms:{src:e.src,innerHeight:e.dims.element[1]||1,spacing:t},target:e.target})}}})),ki,Ai,ji,Mi=e((()=>{ki=`#version 300 es
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
`,Ai={speed:1,amount:20,frequency:7,blur:2},ji=class{constructor(e={}){this.params={...Ai,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=e.dims.element[0]||1;e.draw({frag:ki,uniforms:{src:e.src,time:e.time*this.params.speed,amp:this.params.amount/t,frequency:this.params.frequency,blurDx:this.params.blur/t},target:e.target})}}})),Ni,Pi,Fi,Ii=e((()=>{Ni=`#version 300 es
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
`,Pi={color1:[1,0,0,1],color2:[0,1,0,1],color3:[0,0,1,1],speed:.2},Fi=class{constructor(e={}){this.params={...Pi,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:Ni,uniforms:{src:e.src,time:e.time,color1:this.params.color1,color2:this.params.color2,color3:this.params.color3,speed:this.params.speed},target:e.target})}}})),Li,Ri,zi,Bi=e((()=>{Li=`#version 300 es
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
`,Ri={intensity:.5,radius:1,power:2},zi=class{constructor(e={}){this.params={...Ri,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:Li,uniforms:{src:e.src,aspect:(t||1)/(n||1),intensity:this.params.intensity,radius:this.params.radius,power:this.params.power},target:e.target})}}}));function Vi(e){let t=e.startsWith(`#`)?e.slice(1):e;return(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``)),t.length===6&&(t+=`ff`),t.length===8?[Number.parseInt(t.slice(0,2),16)/255,Number.parseInt(t.slice(2,4),16)/255,Number.parseInt(t.slice(4,6),16)/255,Number.parseInt(t.slice(6,8),16)/255]:[0,0,0,0]}var Hi,Ui,Wi,Gi=e((()=>{Hi=`#version 300 es
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
`,Ui={cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`},Wi=class{constructor(e={}){this.params={...Ui,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params;e.draw({frag:Hi,uniforms:{src:e.src,mouseUv:[e.mouse[0]/r,e.mouse[1]/i],elementPx:[r,i],cellSize:a.cellSize,pressRadius:a.pressRadius,press:a.press,flatCells:+!!a.flatCells,seed:a.seed,time:e.time,speed:Math.max(0,a.speed),breathe:Math.max(0,a.breathe),breatheSpeed:Math.max(0,a.breatheSpeed),breatheScale:Math.max(1,a.breatheScale),bgColor:Vi(a.bgColor)},target:e.target})}}})),Ki=e((()=>{p(),fe(),ge(),Je(),Qe(),yt(),Ct(),kt(),Nt(),bn(),_r(),Ir(),Br(),fi(),gi(),bi(),wi(),Oi(),Mi(),Ii(),Bi(),Gi()}));export{f as C,de as S,St as _,ji as a,qe as b,yi as c,zr as d,Fr as f,Ot as g,Mt as h,Fi as i,hi as l,yn as m,Wi as n,Di as o,gr as p,zi as r,Ci as s,Ki as t,di as u,vt as v,he as x,Ze as y};