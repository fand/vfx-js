import{n as e}from"./chunk-BneVvdWh.js";var t,n,r,i,a,o,s,c,l,u,d,f,p,ee,m,h,g,_=e((()=>{t=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},n=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},d=`#version 300 es
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
`,f=`#version 300 es
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
`,p=`#version 300 es
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
`,ee=`#version 300 es
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
`,m={threshold:.7,softness:.1,intensity:1.2,scatter:.7,pad:50,dither:0,edgeFade:.02},h=.5,g=class{constructor(e={}){r.add(this),i.set(this,null),a.set(this,[]),o.set(this,[]),s.set(this,!1),c.set(this,0),l.set(this,0),this.params={...m,...e}}setParams(e){Object.assign(this.params,e)}init(e){t(this,i,e.createRenderTarget({float:!0}),`f`)}render(e){if(!n(this,i,`f`))return;let{threshold:m,softness:g,intensity:_}=this.params,v=Math.min(Math.max(this.params.scatter,0),1),y=Math.max(0,this.params.dither),b=Math.max(1e-6,this.params.edgeFade);(n(this,i,`f`).width!==n(this,c,`f`)||n(this,i,`f`).height!==n(this,l,`f`))&&(n(this,a,`f`).length=0,n(this,o,`f`).length=0,t(this,s,!1,`f`),t(this,c,n(this,i,`f`).width,`f`),t(this,l,n(this,i,`f`).height,`f`)),n(this,r,`m`,u).call(this,e,n(this,i,`f`).width,n(this,i,`f`).height);let x=n(this,a,`f`).length;if(x===0)return;e.draw({frag:d,uniforms:{src:e.src,threshold:m,softness:g,edgeFade:b},target:n(this,i,`f`)}),e.draw({frag:f,uniforms:{src:n(this,i,`f`),texelSize:[1/n(this,i,`f`).width,1/n(this,i,`f`).height],karis:1},target:n(this,a,`f`)[0]});for(let t=1;t<x;t++){let r=n(this,a,`f`)[t-1];e.draw({frag:f,uniforms:{src:r,texelSize:[1/r.width,1/r.height],karis:0},target:n(this,a,`f`)[t]})}let S=n(this,i,`f`).width,te=n(this,i,`f`).height,ne=1+v*Math.max(0,x-1),re=e=>Math.min(1,Math.max(0,ne-e));for(let t=x-2;t>=0;t--){let r=t===x-2?n(this,a,`f`)[x-1]:n(this,o,`f`)[t+1],i=2**(t+2),s=t===x-2?re(x-1):1;e.draw({frag:p,uniforms:{srcSmall:r,srcLarge:n(this,a,`f`)[t],texelSize:[h*i/S,h*i/te],weightLarge:re(t),weightSmall:s},target:n(this,o,`f`)[t]})}let ie=x>=2?n(this,o,`f`)[0]:n(this,a,`f`)[0],ae=_/Math.max(1,ne);e.draw({frag:ee,uniforms:{src:e.src,bloom:ie,texelSize:[h*2/S,h*2/te],intensity:ae,dither:y,edgeFade:b},target:e.target})}outputRect(e){let{pad:t}=this.params;if(t===`fullscreen`)return e.canvasRect;let n=t*e.pixelRatio,[,,r,i]=e.contentRect;return[-n,-n,r+2*n,i+2*n]}dispose(){t(this,i,null,`f`),n(this,a,`f`).length=0,n(this,o,`f`).length=0,t(this,s,!1,`f`),t(this,c,0,`f`),t(this,l,0,`f`)}},i=new WeakMap,a=new WeakMap,o=new WeakMap,s=new WeakMap,c=new WeakMap,l=new WeakMap,r=new WeakSet,u=function(e,r,i){if(n(this,s,`f`))return;let c=Math.max(1,Math.floor(r/2)),l=Math.max(1,Math.floor(i/2));for(let t=0;t<8;t++){n(this,a,`f`).push(e.createRenderTarget({size:[c,l],float:!0}));let t=Math.max(1,Math.floor(c/2)),r=Math.max(1,Math.floor(l/2));if(t===c&&r===l)break;c=t,l=r}for(let t=0;t<n(this,a,`f`).length-1;t++)n(this,o,`f`).push(e.createRenderTarget({size:[n(this,a,`f`)[t].width,n(this,a,`f`)[t].height],float:!0}));t(this,s,!0,`f`)}})),v,y,b,x,S,te,ne,re,ie,ae,oe,se,ce,le,ue,de,fe,pe,me,he,ge,_e,ve,ye,be,xe,Se,Ce,we,Te,Ee,De,Oe,ke,Ae,je=e((()=>{v=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},y=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},_e=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`,ve=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D tex;
void main() {
    vec4 c = texture(tex, uvContent);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,ye=`#version 300 es
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
`,be=`#version 300 es
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
`,xe=`#version 300 es
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
`,Se=`#version 300 es
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
`,Ce=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D uResidual;
void main() {
    vec3 r = texture(uResidual, uvContent).rgb;
    outColor = vec4(clamp(r * 0.5 + 0.5, 0.0, 1.0), 1.0);
}
`,we=`
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 chroma(vec3 c) {
    return vec2(dot(c, vec3(-0.168736, -0.331264, 0.5)),
                dot(c, vec3(0.5, -0.418688, -0.081312))) + 0.5;
}
`,Te=`#version 300 es
precision highp float;
${we}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uCur, uRef, uMV;
uniform vec2 uChromaRes;
void main() {
    vec2 mvc = floor(texture(uMV, uv).rg * 0.5);
    vec2 pred = chroma(texture(uRef, uv + mvc / uChromaRes).rgb);
    outColor = vec4(chroma(texture(uCur, uv).rgb) - pred, 0.0, 1.0);
}
`,Ee=`#version 300 es
precision highp float;
${we}
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
`,De=`#version 300 es
precision highp float;
${we}
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
`,Oe=`#version 300 es
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
`,ke={blockSize:16,searchRange:5,searchStep:2,useResidual:!0,dup:0,colorSpace:`ycbcr`,chromaGain:1,view:`output`},Ae=class{constructor(e={}){b.add(this),x.set(this,!1),S.set(this,!0),te.set(this,null),ne.set(this,null),re.set(this,null),ie.set(this,null),ae.set(this,null),oe.set(this,null),se.set(this,null),ce.set(this,0),le.set(this,0),ue.set(this,0),de.set(this,0),fe.set(this,0),pe.set(this,void 0),this.params={...ke,...e},v(this,pe,this.params.colorSpace,`f`)}setParams(e){Object.assign(this.params,e)}enable(){v(this,x,!0,`f`)}disable(){v(this,x,!1,`f`),v(this,S,!0,`f`)}get enabled(){return y(this,x,`f`)}render(e){y(this,b,`m`,he).call(this,e);let t=y(this,te,`f`),n=y(this,ne,`f`),r=y(this,re,`f`),i=y(this,ie,`f`),a=y(this,ae,`f`),o=y(this,oe,`f`),s=y(this,se,`f`);if(!t||!n||!r||!i||!a||!o||!s)return;this.params.colorSpace!==y(this,pe,`f`)&&(v(this,pe,this.params.colorSpace,`f`),v(this,S,!0,`f`));let c=[y(this,ce,`f`),y(this,le,`f`)];e.draw({frag:_e,uniforms:{src:e.src},target:t});let l=this.params.view!==`output`;if((y(this,x,`f`)||l)&&(e.draw({frag:ye,uniforms:{uCur:t,uRef:n,uResolution:c,uBlock:y(this,fe,`f`),uSearch:this.params.searchRange,uStep:this.params.searchStep},target:r}),e.draw({frag:be,uniforms:{uCur:t,uRef:n,uMV:r,uResolution:c},target:i})),y(this,x,`f`)){let l=y(this,S,`f`)?1:1+this.params.dup,u=[y(this,ue,`f`),y(this,de,`f`)];this.params.colorSpace===`ycbcr`&&e.draw({frag:Te,uniforms:{uCur:t,uRef:n,uMV:r,uChromaRes:u},target:s});for(let n=0;n<l;n++){let l=this.params.useResidual&&n===0;this.params.colorSpace===`ycbcr`?(e.draw({frag:Ee,uniforms:{uAccum:a,uMV:r,uVideo:t,uResidual:i,uResolution:c,uIntra:y(this,S,`f`),uUseResidual:l},target:a}),e.draw({frag:De,uniforms:{uChromaAcc:o,uMV:r,uVideo:t,uResidualC:s,uChromaRes:u,uIntra:y(this,S,`f`),uUseResidual:l},target:o})):e.draw({frag:xe,uniforms:{uAccum:a,uMV:r,uVideo:t,uResidual:i,uResolution:c,uIntra:y(this,S,`f`),uUseResidual:l},target:a})}v(this,S,!1,`f`)}else v(this,S,!0,`f`);y(this,b,`m`,ge).call(this,e,t,n,r,i,a,o),e.draw({frag:_e,uniforms:{src:e.src},target:n})}dispose(){y(this,b,`m`,me).call(this),v(this,ce,0,`f`),v(this,le,0,`f`),v(this,ue,0,`f`),v(this,de,0,`f`),v(this,fe,0,`f`),v(this,S,!0,`f`)}},x=new WeakMap,S=new WeakMap,te=new WeakMap,ne=new WeakMap,re=new WeakMap,ie=new WeakMap,ae=new WeakMap,oe=new WeakMap,se=new WeakMap,ce=new WeakMap,le=new WeakMap,ue=new WeakMap,de=new WeakMap,fe=new WeakMap,pe=new WeakMap,b=new WeakSet,me=function(){y(this,te,`f`)?.dispose(),y(this,ne,`f`)?.dispose(),y(this,re,`f`)?.dispose(),y(this,ie,`f`)?.dispose(),y(this,ae,`f`)?.dispose(),y(this,oe,`f`)?.dispose(),y(this,se,`f`)?.dispose(),v(this,te,null,`f`),v(this,ne,null,`f`),v(this,re,null,`f`),v(this,ie,null,`f`),v(this,ae,null,`f`),v(this,oe,null,`f`),v(this,se,null,`f`)},he=function(e){let[t,n]=e.dims.elementPixel,r=Math.max(2,this.params.blockSize);if(y(this,ce,`f`)===t&&y(this,le,`f`)===n&&y(this,fe,`f`)===r)return;y(this,b,`m`,me).call(this),v(this,ce,t,`f`),v(this,le,n,`f`),v(this,ue,Math.ceil(t/2),`f`),v(this,de,Math.ceil(n/2),`f`),v(this,fe,r,`f`),v(this,S,!0,`f`);let i=Math.ceil(t/r),a=Math.ceil(n/r);v(this,te,e.createRenderTarget({size:[t,n]}),`f`),v(this,ne,e.createRenderTarget({size:[t,n],persistent:!0}),`f`),v(this,ie,e.createRenderTarget({size:[t,n],float:!0}),`f`),v(this,ae,e.createRenderTarget({size:[t,n],float:!0,persistent:!0}),`f`),v(this,oe,e.createRenderTarget({size:[y(this,ue,`f`),y(this,de,`f`)],float:!0,persistent:!0}),`f`),v(this,se,e.createRenderTarget({size:[y(this,ue,`f`),y(this,de,`f`)],float:!0}),`f`),v(this,re,e.createRenderTarget({size:[i,a],float:!0,filter:`nearest`}),`f`)},ge=function(e,t,n,r,i,a,o){switch(this.params.view){case`motion`:e.draw({frag:Se,uniforms:{uMV:r,uMvScale:this.params.searchRange*this.params.searchStep},target:e.target});return;case`residual`:e.draw({frag:Ce,uniforms:{uResidual:i},target:e.target});return;case`current`:e.draw({frag:ve,uniforms:{tex:t},target:e.target});return;case`previous`:e.draw({frag:ve,uniforms:{tex:n},target:e.target});return;default:y(this,x,`f`)&&this.params.colorSpace===`ycbcr`?e.draw({frag:Oe,uniforms:{uLumaAcc:a,uChromaAcc:o,uChromaGain:this.params.chromaGain},target:e.target}):e.draw({frag:ve,uniforms:{tex:y(this,x,`f`)?a:t},target:e.target})}}})),C,w,Me,Ne,Pe,Fe,Ie,Le,T,Re,ze,Be,Ve,He,Ue,We,Ge,Ke,qe,Je,Ye,Xe,Ze,Qe=e((()=>{C=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},w=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ve=`#version 300 es
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
`,He=`#version 300 es
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
`,Ue=`#version 300 es
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
`,We=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,Ge=`#version 300 es
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
`,Ke=`#version 300 es
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
`,qe=`#version 300 es
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
`,Je=`#version 300 es
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
`,Ye=`#version 300 es
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
`,Xe={simSize:[256,256],pressureIterations:1,curlStrength:13,velocityDissipation:.6,densityDissipation:.65,splatForce:6e3,splatRadius:.002,dyeSplatRadius:.001,dyeSplatIntensity:.005,showDye:!1},Ze=class{constructor(e={}){Me.set(this,null),Ne.set(this,null),Pe.set(this,null),Fe.set(this,null),Ie.set(this,null),Le.set(this,null),T.set(this,null),Re.set(this,null),ze.set(this,[0,0]),Be.set(this,!1),this.params={...Xe,...e}}init(e){let t=this.params.simSize,n={size:t,float:!0};C(this,Me,e.createRenderTarget(n),`f`),C(this,Ne,e.createRenderTarget(n),`f`),C(this,Pe,e.createRenderTarget(n),`f`),C(this,Fe,e.createRenderTarget(n),`f`),C(this,Ie,e.createRenderTarget(n),`f`),C(this,Le,e.createRenderTarget(n),`f`),C(this,T,e.createRenderTarget({size:t,float:!0,persistent:!0}),`f`),C(this,Re,e.createRenderTarget({float:!0,persistent:!0}),`f`)}render(e){if(!w(this,Me,`f`)||!w(this,Ne,`f`)||!w(this,Pe,`f`)||!w(this,Fe,`f`)||!w(this,Ie,`f`)||!w(this,Le,`f`)||!w(this,T,`f`)||!w(this,Re,`f`))return;let{simSize:t,pressureIterations:n,curlStrength:r,velocityDissipation:i,densityDissipation:a,splatForce:o,splatRadius:s,dyeSplatRadius:c,dyeSplatIntensity:l,showDye:u}=this.params,d=[1/t[0],1/t[1]],[f,p]=e.dims.elementPixel,ee=f/p,m=[e.mouse[0]/f,e.mouse[1]/p],h=w(this,Be,`f`)?[m[0]-w(this,ze,`f`)[0],m[1]-w(this,ze,`f`)[1]]:[0,0];C(this,ze,m,`f`),C(this,Be,!0,`f`),e.draw({frag:Ve,uniforms:{velocity:w(this,T,`f`),simTexel:d},target:w(this,Me,`f`)}),e.draw({frag:He,uniforms:{velocity:w(this,T,`f`),curl:w(this,Me,`f`),simTexel:d,aspect:ee,mouseUv:m,mouseDeltaUv:h,curlStrength:r,splatForce:o,splatRadius:s},target:w(this,Ne,`f`)}),e.draw({frag:Ue,uniforms:{vortVel:w(this,Ne,`f`),simTexel:d},target:w(this,Pe,`f`)}),e.draw({frag:We,target:w(this,Fe,`f`)});let g=w(this,Fe,`f`),_=w(this,Ie,`f`);for(let t=0;t<n;t++){e.draw({frag:Ge,uniforms:{pressure:g,divergence:w(this,Pe,`f`),simTexel:d},target:_});let t=g;g=_,_=t}e.draw({frag:Ke,uniforms:{vortVel:w(this,Ne,`f`),pressure:g,simTexel:d},target:w(this,Le,`f`)}),e.draw({frag:qe,uniforms:{projVel:w(this,Le,`f`),simTexel:d,velocityDissipation:i},target:w(this,T,`f`)}),e.draw({frag:Je,uniforms:{velocity:w(this,T,`f`),dye:w(this,Re,`f`),time:e.time,aspect:ee,mouseUv:m,mouseDeltaUv:h,simSize:t,densityDissipation:a,dyeSplatRadius:c,dyeSplatIntensity:l},target:w(this,Re,`f`)}),e.draw({frag:Ye,uniforms:{src:e.src,dye:w(this,Re,`f`),velocity:w(this,T,`f`),simSize:t,showDye:+!!u,time:e.time},target:e.target})}dispose(){C(this,Me,null,`f`),C(this,Ne,null,`f`),C(this,Pe,null,`f`),C(this,Fe,null,`f`),C(this,Ie,null,`f`),C(this,Le,null,`f`),C(this,T,null,`f`),C(this,Re,null,`f`),C(this,Be,!1,`f`)}},Me=new WeakMap,Ne=new WeakMap,Pe=new WeakMap,Fe=new WeakMap,Ie=new WeakMap,Le=new WeakMap,T=new WeakMap,Re=new WeakMap,ze=new WeakMap,Be=new WeakMap})),$e,et,tt,nt,rt,it=e((()=>{$e={pure:{cyan:[0,1,1,1],magenta:[1,0,1,1],yellow:[1,1,0,1],black:[0,0,0,1],red:[1,0,0,1],green:[0,1,0,1],blue:[0,0,1,1]},newsprint:{cyan:[.15,.73,.88,1],magenta:[.88,.12,.55,1],yellow:[.97,.93,.08,1],black:[.1,.1,.1,1]},fogra51:{cyan:[0,.525,.765,1],magenta:[.827,0,.486,1],yellow:[.984,.91,0,1],black:[.145,.145,.145,1]},swop:{cyan:[0,.557,.769,1],magenta:[.827,.02,.478,1],yellow:[.984,.902,.027,1],black:[.169,.169,.169,1]}},et=`#version 300 es
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
`,tt={...$e.pure,...$e.newsprint},nt={gridSize:10,dotSize:1,smoothing:.15,angle:0,mode:`rgb`,blackAmount:1,trimEdge:!0,background:[0,0,0,0],inkPalette:tt},rt=class{constructor(e={}){this.params={...nt,...e,inkPalette:{...tt,...e.inkPalette??{}}}}setParams(e){Object.assign(this.params,e)}setInkPreset(e){Object.assign(this.params.inkPalette,$e[e])}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params,o=a.inkPalette;e.draw({frag:et,uniforms:{src:e.src,srcSizePx:[e.src.width||1,e.src.height||1],elementPx:[r,i],gridSize:Math.max(1,a.gridSize),dotSize:Math.max(0,a.dotSize),smoothing:Math.max(0,Math.min(1,a.smoothing)),angle:a.angle,blackAmount:Math.max(0,Math.min(1,a.blackAmount)),ymck:+(a.mode===`cmyk`),trimEdge:+!!a.trimEdge,background:a.background,cInk:o.cyan,mInk:o.magenta,yInk:o.yellow,kInk:o.black,rInk:o.red,gInk:o.green,bInk:o.blue},target:e.target})}}}));function at(e,t){if(typeof OffscreenCanvas<`u`)return new OffscreenCanvas(e,t);let n=document.createElement(`canvas`);return n.width=e,n.height=t,n}function ot(e){let t=e.getContext(`2d`);if(!t)throw Error(`[VFX-JS] JPEGGlitchEffect: 2D canvas context unavailable`);return t}function st(e,t){if(typeof OffscreenCanvas<`u`&&e instanceof OffscreenCanvas)return e.convertToBlob({type:`image/jpeg`,quality:t});let n=e;return new Promise((e,r)=>{n.toBlob(t=>t?e(t):r(Error(`[VFX-JS] JPEGGlitchEffect: toBlob failed`)),`image/jpeg`,t)})}function ct(e){for(let t=2;t+3<e.length;t++)if(e[t]===255&&e[t+1]===218){let n=e[t+2]<<8|e[t+3];return Math.min(e.length,t+2+n)}return Math.min(e.length,417)}function lt(e,t){let n=Math.imul(Math.floor(e*2654435761)|0,2246822519)+Math.imul(t+1,3266489917)>>>0;return()=>{n=n+1831565813>>>0;let e=Math.imul(n^n>>>15,1|n);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function ut(e,t,n,r,i,a,o){switch(e.save(),e.clearRect(0,0,a,o),i){case 90:e.translate(a,0);break;case 180:e.translate(a,o);break;case 270:e.translate(0,o);break}e.rotate(i*Math.PI/180),e.drawImage(t,0,0,n,r),e.restore()}function dt(e,t,n,r){let i=e.length-t-4;if(i<=1)return;let a=Math.max(1,Math.floor(n));for(let n=0;n<a;n++){let o=i/a*n|0,s=i/a*(n+1)|0,c=Math.max(1,s-o),l=Math.min(i,o+(r()*c|0)),u=r()*256|0;e[t+l]=u}}var E,D,O,ft,k,pt,mt,ht,gt,_t,A,vt,yt,bt,j,xt,St,Ct,wt,Tt,Et,Dt,Ot,kt,At,M,jt,Mt,Nt,Pt,Ft,It,Lt,Rt,zt,Bt,Vt,Ht,Ut,Wt,Gt,Kt=e((()=>{E=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},D=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Vt=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`,Ht=`#version 300 es
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
`,Ut=`#version 300 es
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
`,Wt={quality:.4,seed:.25,iterations:24,resolutionScale:1,randomFlip:!0,vertical:!1,speed:0},Gt=class{get producedFrames(){return E(this,Nt,`f`)}constructor(e={}){O.add(this),ft.set(this,!1),k.set(this,null),pt.set(this,null),mt.set(this,null),ht.set(this,null),gt.set(this,!1),_t.set(this,null),A.set(this,null),vt.set(this,null),yt.set(this,null),bt.set(this,null),j.set(this,null),xt.set(this,null),St.set(this,new Uint8Array),Ct.set(this,null),wt.set(this,0),Tt.set(this,0),Et.set(this,0),Dt.set(this,0),Ot.set(this,!0),kt.set(this,!1),At.set(this,-1e9),M.set(this,0),jt.set(this,0),Mt.set(this,!1),Nt.set(this,0),this.params={...Wt,...e}}setParams(e){Object.assign(this.params,e),D(this,Ot,!0,`f`)}init(e){D(this,ft,typeof createImageBitmap==`function`&&(typeof OffscreenCanvas<`u`||typeof document<`u`),`f`),E(this,ft,`f`)&&(D(this,A,at(1,1),`f`),D(this,vt,ot(E(this,A,`f`)),`f`),D(this,yt,at(1,1),`f`),D(this,bt,ot(E(this,yt,`f`)),`f`),D(this,j,at(1,1),`f`),D(this,xt,ot(E(this,j,`f`)),`f`),D(this,k,e.createRenderTarget({size:[1,1]}),`f`),D(this,mt,e.gl,`f`),E(this,O,`m`,Pt).call(this,e),D(this,_t,e.onContextRestored(()=>{E(this,O,`m`,Pt).call(this,e),D(this,gt,E(this,Mt,`f`),`f`)}),`f`))}render(e){if(!E(this,ft,`f`)||!E(this,k,`f`)){E(this,O,`m`,Ft).call(this,e);return}let t=e.src.width,n=e.src.height;(t!==E(this,Et,`f`)||n!==E(this,Dt,`f`))&&(D(this,Et,t,`f`),D(this,Dt,n,`f`),D(this,Ot,!0,`f`));let[r,i]=e.dims.elementPixel,a=Math.min(1,Math.max(0,this.params.resolutionScale)),o=Math.max(1,Math.round(r*a)),s=Math.max(1,Math.round(i*a));r>=2&&i>=2&&t>0&&n>0&&((o!==E(this,wt,`f`)||s!==E(this,Tt,`f`))&&E(this,O,`m`,Lt).call(this,e,o,s),E(this,O,`m`,It).call(this,e)&&E(this,O,`m`,Rt).call(this,e)),E(this,Mt,`f`)&&E(this,pt,`f`)?(E(this,gt,`f`)&&E(this,O,`m`,zt).call(this,e),e.draw({frag:Ut,uniforms:{tex:E(this,pt,`f`)},target:e.target})):E(this,O,`m`,Ft).call(this,e)}dispose(){var e;E(this,_t,`f`)?.call(this),D(this,_t,null,`f`),E(this,mt,`f`)&&E(this,ht,`f`)&&E(this,mt,`f`).deleteTexture(E(this,ht,`f`)),D(this,ht,null,`f`),D(this,mt,null,`f`),D(this,gt,!1,`f`),E(this,k,`f`)?.dispose(),D(this,k,null,`f`),D(this,pt,null,`f`),D(this,A,null,`f`),D(this,vt,null,`f`),D(this,yt,null,`f`),D(this,bt,null,`f`),D(this,j,null,`f`),D(this,xt,null,`f`),D(this,Ct,null,`f`),D(this,St,new Uint8Array,`f`),D(this,Mt,!1,`f`),D(this,kt,!1,`f`),D(this,M,(e=E(this,M,`f`),e++,e),`f`)}},ft=new WeakMap,k=new WeakMap,pt=new WeakMap,mt=new WeakMap,ht=new WeakMap,gt=new WeakMap,_t=new WeakMap,A=new WeakMap,vt=new WeakMap,yt=new WeakMap,bt=new WeakMap,j=new WeakMap,xt=new WeakMap,St=new WeakMap,Ct=new WeakMap,wt=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,M=new WeakMap,jt=new WeakMap,Mt=new WeakMap,Nt=new WeakMap,O=new WeakSet,Pt=function(e){let t=e.gl,n=t.createTexture();n&&(t.bindTexture(t.TEXTURE_2D,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,0])),t.bindTexture(t.TEXTURE_2D,null),D(this,ht,n,`f`),D(this,pt,e.wrapTexture(n,{size:[E(this,wt,`f`)||1,E(this,Tt,`f`)||1]}),`f`))},Ft=function(e){e.draw({frag:Ht,uniforms:{src:e.src},target:e.target})},It=function(e){if(E(this,kt,`f`))return!1;let t=this.params.speed;return t>0?e.time-E(this,At,`f`)>=1/t:E(this,Ot,`f`)},Lt=function(e,t,n){var r;D(this,wt,t,`f`),D(this,Tt,n,`f`),D(this,St,new Uint8Array(t*n*4),`f`),D(this,Ct,new ImageData(t,n),`f`),E(this,A,`f`)&&(E(this,A,`f`).width=t,E(this,A,`f`).height=n),E(this,j,`f`)&&(E(this,j,`f`).width=t,E(this,j,`f`).height=n),E(this,k,`f`)?.dispose(),D(this,k,e.createRenderTarget({size:[t,n]}),`f`),D(this,Mt,!1,`f`),D(this,Ot,!0,`f`),D(this,kt,!1,`f`),D(this,gt,!1,`f`),D(this,M,(r=E(this,M,`f`),r++,r),`f`)},Rt=function(e){var t;let n=E(this,wt,`f`),r=E(this,Tt,`f`),i=E(this,A,`f`),a=E(this,vt,`f`),o=E(this,yt,`f`),s=E(this,bt,`f`),c=E(this,Ct,`f`);if(!i||!a||!o||!s||!c||!E(this,k,`f`))return;e.draw({frag:Vt,uniforms:{src:e.src},target:E(this,k,`f`)});let l=e.gl;l.readPixels(0,0,n,r,l.RGBA,l.UNSIGNED_BYTE,E(this,St,`f`)),l.bindFramebuffer(l.FRAMEBUFFER,null),D(this,kt,!0,`f`),D(this,Ot,!1,`f`),D(this,At,e.time,`f`);let u=c.data,d=n*4;for(let e=0;e<r;e++){let t=(r-1-e)*d;u.set(E(this,St,`f`).subarray(t,t+d),e*d)}for(let e=3;e<u.length;e+=4)u[e]=255;let f=this.params.speed>0?E(this,jt,`f`):0;D(this,jt,(t=E(this,jt,`f`),t++,t),`f`);let{quality:p,seed:ee,iterations:m,randomFlip:h,vertical:g}=this.params,_=lt(ee,f),v=h&&_()<.5;a.putImageData(c,0,0);let y=((v?180:0)+(g?270:0))%360,b=g,x=b?r:n,S=b?n:r;o.width=x,o.height=S,ut(s,i,n,r,y,x,S),E(this,O,`m`,Bt).call(this,o,n,r,p,m,y,_,E(this,M,`f`))},zt=function(e){let t=e.gl;!E(this,ht,`f`)||!E(this,j,`f`)||(t.bindTexture(t.TEXTURE_2D,E(this,ht,`f`)),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,E(this,j,`f`)),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,null),D(this,gt,!1,`f`))},Bt=async function(e,t,n,r,i,a,o,s){var c;try{let l=await st(e,r),u=new Uint8Array(await l.arrayBuffer());dt(u,ct(u),i,o);let d=await createImageBitmap(new Blob([u],{type:`image/jpeg`}));if(s===E(this,M,`f`)&&E(this,xt,`f`)){let e=(360-a)%360;ut(E(this,xt,`f`),d,d.width,d.height,e,t,n),D(this,Mt,!0,`f`),D(this,Nt,(c=E(this,Nt,`f`),c++,c),`f`),D(this,gt,!0,`f`)}d.close()}catch{}finally{s===E(this,M,`f`)&&D(this,kt,!1,`f`)}}})),qt,Jt,Yt,Xt=e((()=>{qt=.7,Jt=1.3,Yt=`
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
`}));function Zt(e){let t=Qt(e);return 2**Math.ceil(Math.log2(Math.sqrt(t)))}function Qt(e){return Number.isFinite(e)?Math.max(1,Math.floor(e)):1}function $t(e){let t=e|0;return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function en(e){return Math.min(sn,Math.max(0,e))}var tn,nn,rn,an,on,sn,cn=e((()=>{tn=new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),nn=`
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,rn=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,an=`#version 300 es
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
`,on=`#version 300 es
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
`,sn=.1})),N,P,F,ln,I,L,R,z,B,un,V,dn,fn,H,pn,mn,hn,gn,_n,U,vn,yn,bn,xn,Sn,Cn,wn,Tn,En,Dn,On,W,kn,An,jn,Mn,Nn,Pn,Fn,In,Ln,Rn,zn,Bn,Vn,Hn,Un,Wn=e((()=>{Xt(),cn(),N=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},P=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},W=64,kn=W*W,An=.1,jn=[W,W],Mn=new Float32Array(kn);for(let e=0;e<kn;e++)Mn[e]=e;Nn=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, 2.0);
}
`,Pn=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0);
}
`,Fn=`#version 300 es
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
`,In=`#version 300 es
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
`,Ln=`#version 300 es
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
${Yt}

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
`,Rn=`#version 300 es
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
`,zn=`#version 300 es
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
`,Bn=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;

uniform sampler2D src;
uniform vec3 color;
uniform float colorMix;
uniform vec2 lifeJitterRange;
${nn}

void main() {
    vec4 c = texture(src, clamp(vSpawn.yz, 0.0, 1.0));
    float h = hash21(vSpawn.yz + vec2(vSpawn.x) * 1.7);
    float lifeJitter = mix(lifeJitterRange.x, lifeJitterRange.y, h);
    outColor = vec4(mix(c.rgb, color, colorMix), lifeJitter);
}
`,Vn=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;
void main() {
    float theta = vSpawn.w;
    vec2 dir = theta >= 0.0 ? vec2(cos(theta), sin(theta)) : vec2(0.0);
    outColor = vec4(dir, 0.0, 0.0);
}
`,Hn={count:1024*1024,birthRate:3e4,screenBirthRate:1e4,life:1,noiseSpeed:.3,emitSpeed:1,noiseDelay:.15,noiseScale:1,noiseAnimation:.3,pointSize:10,alpha:1,radius:300,speedDecay:1,alphaDecay:5,fadeIn:.05,alphaThreshold:.05,spawnOnIdle:!0,srcOpacity:0,trailFade:.75,fog:.5,color:16777215,colorMix:0,blend:`add`},Un=class{get params(){return N(this,ln,`f`)}constructor(e={}){F.add(this),ln.set(this,void 0),I.set(this,null),L.set(this,null),R.set(this,null),z.set(this,null),B.set(this,null),un.set(this,!1),V.set(this,void 0),dn.set(this,void 0),fn.set(this,new Float32Array(kn*4)),H.set(this,null),pn.set(this,null),mn.set(this,null),hn.set(this,null),gn.set(this,null),_n.set(this,null),U.set(this,0),vn.set(this,0),yn.set(this,0),bn.set(this,null),xn.set(this,-1/0),P(this,ln,{...Hn,...e},`f`),N(this,ln,`f`).count=Qt(N(this,ln,`f`).count),P(this,V,Zt(N(this,ln,`f`).count),`f`),P(this,dn,N(this,V,`f`)*N(this,V,`f`),`f`)}get maxCount(){return N(this,dn,`f`)}setParam(e){let t=N(this,ln,`f`);for(let[n,r]of Object.entries(e))r!==void 0&&(t[n]=n===`count`?Qt(r):r)}init(e){N(this,F,`m`,Sn).call(this,e),P(this,z,e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),`f`),P(this,B,e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),`f`),P(this,hn,{attributes:{position:tn}},`f`),P(this,mn,{mode:`points`,attributes:{position:{data:Mn,itemSize:1}}},`f`),P(this,gn,e.gl,`f`),N(this,F,`m`,Tn).call(this,e),P(this,_n,e.onContextRestored(()=>{P(this,gn,e.gl,`f`),N(this,F,`m`,Tn).call(this,e),P(this,un,!1,`f`)}),`f`)}render(e){if(!N(this,I,`f`)||!N(this,L,`f`)||!N(this,R,`f`)||!N(this,z,`f`)||!N(this,B,`f`)||!N(this,hn,`f`)||!N(this,mn,`f`)||!N(this,pn,`f`)||!N(this,H,`f`))return;let t=Zt(this.params.count);t!==N(this,V,`f`)&&(N(this,F,`m`,Cn).call(this),P(this,V,t,`f`),P(this,dn,t*t,`f`),N(this,F,`m`,Sn).call(this,e),P(this,U,0,`f`),P(this,un,!1,`f`)),N(this,un,`f`)||(e.draw({frag:Nn,target:N(this,I,`f`)}),e.draw({frag:Pn,target:N(this,L,`f`)}),e.draw({frag:Pn,target:N(this,R,`f`)}),P(this,un,!0,`f`));let n=en(e.deltaTime),r=[e.dims.elementPixel[0],e.dims.elementPixel[1]],i=[N(this,V,`f`),N(this,V,`f`)],a=N(this,F,`m`,Dn).call(this,e,n,r);a>0&&N(this,F,`m`,En).call(this,e);let o=a===0;if(e.draw({frag:Ln,uniforms:{posTex:N(this,I,`f`),colorTex:N(this,L,`f`),velTex:N(this,R,`f`),elementPixel:r,time:e.time,dt:n,noiseSpeed:this.params.noiseSpeed,emitSpeed:this.params.emitSpeed,noiseDelay:this.params.noiseDelay,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,life:this.params.life},target:N(this,I,`f`),swap:o}),a>0){let t={uSpawnTex:N(this,pn,`f`),uSpawnTexSize:jn,uSpawnCount:a,stateSize:i};e.draw({vert:Rn,frag:zn,geometry:N(this,mn,`f`),uniforms:{...t,src:e.src,alphaThreshold:this.params.alphaThreshold},target:N(this,I,`f`),blend:`none`}),e.draw({vert:Rn,frag:Bn,geometry:N(this,mn,`f`),uniforms:{...t,src:e.src,color:$t(this.params.color),colorMix:this.params.colorMix,lifeJitterRange:[qt,Jt]},target:N(this,L,`f`),blend:`none`}),e.draw({vert:Rn,frag:Vn,geometry:N(this,mn,`f`),uniforms:t,target:N(this,R,`f`),blend:`none`})}let s=N(this,F,`m`,On).call(this);N(this,hn,`f`).instanceCount=s,e.draw({frag:rn,target:N(this,z,`f`)}),e.draw({vert:Fn,frag:an,uniforms:{posTex:N(this,I,`f`),colorTex:N(this,L,`f`),stateSize:i,pointSize:this.params.pointSize,elementPixel:r,particleCount:s,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fadeIn:this.params.fadeIn,fog:this.params.fog},geometry:N(this,hn,`f`),target:N(this,z,`f`),blend:this.params.blend===`normal`?`premultiplied`:`additive`}),e.draw({frag:on,uniforms:{trailPrev:N(this,B,`f`),particleStamp:N(this,z,`f`),trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:N(this,B,`f`)}),e.draw({frag:In,uniforms:{src:e.src,trail:N(this,B,`f`),srcOpacity:this.params.srcOpacity},target:e.target})}dispose(){N(this,_n,`f`)?.call(this),P(this,_n,null,`f`),N(this,gn,`f`)&&N(this,H,`f`)&&N(this,gn,`f`).deleteTexture(N(this,H,`f`)),P(this,H,null,`f`),P(this,pn,null,`f`),P(this,mn,null,`f`),P(this,gn,null,`f`),N(this,F,`m`,Cn).call(this),N(this,z,`f`)?.dispose(),N(this,B,`f`)?.dispose(),P(this,z,null,`f`),P(this,B,null,`f`),P(this,hn,null,`f`),P(this,un,!1,`f`)}outputRect(e){return e.canvasRect}},ln=new WeakMap,I=new WeakMap,L=new WeakMap,R=new WeakMap,z=new WeakMap,B=new WeakMap,un=new WeakMap,V=new WeakMap,dn=new WeakMap,fn=new WeakMap,H=new WeakMap,pn=new WeakMap,mn=new WeakMap,hn=new WeakMap,gn=new WeakMap,_n=new WeakMap,U=new WeakMap,vn=new WeakMap,yn=new WeakMap,bn=new WeakMap,xn=new WeakMap,F=new WeakSet,Sn=function(e){let t={size:[N(this,V,`f`),N(this,V,`f`)],float:!0,wrap:`clamp`,filter:`nearest`};P(this,I,e.createRenderTarget({...t,persistent:!0}),`f`),P(this,L,e.createRenderTarget(t),`f`),P(this,R,e.createRenderTarget(t),`f`)},Cn=function(){N(this,I,`f`)?.dispose(),N(this,L,`f`)?.dispose(),N(this,R,`f`)?.dispose(),P(this,I,null,`f`),P(this,L,null,`f`),P(this,R,null,`f`)},wn=function(e){let t=e.gl,n=t.createTexture();if(!n)throw Error(`[ParticleEffect] Failed to create spawn texture`);return t.bindTexture(t.TEXTURE_2D,n),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,W,W,0,t.RGBA,t.FLOAT,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.bindTexture(t.TEXTURE_2D,null),{raw:n,handle:e.wrapTexture(n,{size:[W,W],filter:`nearest`,wrap:`clamp`})}},Tn=function(e){let t=N(this,F,`m`,wn).call(this,e);P(this,H,t.raw,`f`),P(this,pn,t.handle,`f`)},En=function(e){if(!N(this,H,`f`))return;let t=e.gl;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,N(this,H,`f`)),t.texSubImage2D(t.TEXTURE_2D,0,0,0,W,W,t.RGBA,t.FLOAT,N(this,fn,`f`)),t.bindTexture(t.TEXTURE_2D,null)},Dn=function(e,t,n){let r=[e.mouse[0]/Math.max(1,n[0]),e.mouse[1]/Math.max(1,n[1])];(!N(this,bn,`f`)||Math.abs(r[0]-N(this,bn,`f`)[0])>1e-6||Math.abs(r[1]-N(this,bn,`f`)[1])>1e-6)&&P(this,xn,e.time,`f`),P(this,bn,r,`f`);let i=e.intersection>0,a=e.time-N(this,xn,`f`)<An;i&&(a||this.params.spawnOnIdle)?P(this,vn,Math.min(N(this,vn,`f`)+this.params.birthRate*t,kn),`f`):P(this,vn,0,`f`),i?P(this,yn,Math.min(N(this,yn,`f`)+this.params.screenBirthRate*t,kn),`f`):P(this,yn,0,`f`);let o=Math.min(kn,Math.floor(N(this,vn,`f`))),s=Math.min(kn-o,Math.floor(N(this,yn,`f`)));P(this,vn,N(this,vn,`f`)-o,`f`),P(this,yn,N(this,yn,`f`)-s,`f`);let c=o+s;if(c===0)return 0;let l=N(this,F,`m`,On).call(this),u=Math.max(1,n[0]),d=Math.max(1,n[1]),f=N(this,fn,`f`),p=0;for(;p<o;p++){let e=Math.sqrt(Math.random())*this.params.radius,t=Math.random()*Math.PI*2,n=Math.cos(t)*e,i=Math.sin(t)*e,a=p*4;f[a+0]=N(this,U,`f`),f[a+1]=r[0]+n/u,f[a+2]=r[1]+i/d,f[a+3]=t,P(this,U,(N(this,U,`f`)+1)%l,`f`)}for(let e=0;e<s;e++,p++){let e=p*4;f[e+0]=N(this,U,`f`),f[e+1]=Math.random(),f[e+2]=Math.random(),f[e+3]=-1,P(this,U,(N(this,U,`f`)+1)%l,`f`)}return c},On=function(){return Math.max(1,Math.min(N(this,dn,`f`),Math.floor(this.params.count)))}})),G,K,q,Gn,J,Kn,Y,X,qn,Z,Jn,Yn,Xn,Zn,Qn,$n,er,tr,nr,rr,ir,ar,or,sr,cr,lr,ur=e((()=>{Xt(),cn(),G=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},K=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},rr=`#version 300 es
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
${nn}
${Yt}

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
        ${qt.toFixed(4)},
        ${Jt.toFixed(4)},
        hash21(uv * 91.7 + 1.234)
    );
    age += dt / max(duration * lifespanScale, 1e-3);

    outColor = vec4(pos, age);
}
`,ir=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 stateSize;
uniform float count;
uniform vec3 color;
uniform float colorMix;
${nn}

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
`,ar=`#version 300 es
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
`,or=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trail;

void main() {
    outColor = texture(trail, uv);
}
`,sr=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`,cr={count:1e5,duration:1,noiseSpeed:1.5,noiseScale:1,noiseAnimation:1,outwardBias:1,pointSize:3,alpha:1,alphaDecay:5,speedDecay:2,fog:0,trailFade:.5,color:16777215,colorMix:0,blend:`add`},lr=class{get params(){return G(this,Gn,`f`)}constructor(e={}){q.add(this),Gn.set(this,void 0),J.set(this,null),Kn.set(this,null),Y.set(this,null),X.set(this,null),qn.set(this,null),Z.set(this,void 0),Jn.set(this,!1),Yn.set(this,!1),Xn.set(this,-1),Zn.set(this,0),Qn.set(this,0),K(this,Gn,{...cr,...e},`f`),G(this,Gn,`f`).count=Qt(G(this,Gn,`f`).count);let t=Zt(G(this,Gn,`f`).count);K(this,Z,[t,t],`f`)}trigger(){K(this,Jn,!0,`f`),K(this,Yn,!0,`f`),K(this,Xn,-1,`f`),K(this,Zn,0,`f`),K(this,Qn,0,`f`)}reset(){K(this,Jn,!1,`f`),K(this,Yn,!1,`f`),K(this,Xn,-1,`f`),K(this,Zn,0,`f`),K(this,Qn,0,`f`)}isDone(){return!G(this,Jn,`f`)||G(this,Zn,`f`)<this.params.duration?!1:G(this,Qn,`f`)>=G(this,q,`m`,$n).call(this)}init(e){G(this,q,`m`,er).call(this,e),K(this,Y,e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),`f`),K(this,X,e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),`f`),K(this,qn,{attributes:{position:tn}},`f`)}render(e){var t;if(!G(this,J,`f`)||!G(this,Kn,`f`)||!G(this,Y,`f`)||!G(this,X,`f`)||!G(this,qn,`f`)||e.intersection<=0)return;let n=Zt(this.params.count),r=!G(this,Jn,`f`)||this.isDone();if(n!==G(this,Z,`f`)[0]&&r&&(G(this,q,`m`,tr).call(this),K(this,Z,[n,n],`f`),G(this,q,`m`,er).call(this,e)),!G(this,Jn,`f`)){e.draw({frag:sr,uniforms:{src:e.src},target:e.target});return}G(this,Xn,`f`)<0&&K(this,Xn,e.time,`f`);let i=e.time-G(this,Xn,`f`);K(this,Zn,i,`f`);let a=i>=this.params.duration;if(a&&G(this,Qn,`f`)>=G(this,q,`m`,$n).call(this)){e.draw({frag:rn,target:e.target});return}let o=en(e.deltaTime),s=[e.dims.elementPixel[0],e.dims.elementPixel[1]];if(a)e.draw({frag:rn,target:G(this,Y,`f`)}),K(this,Qn,(t=G(this,Qn,`f`),t++,t),`f`);else{let t=+!!G(this,Yn,`f`);K(this,Yn,!1,`f`);let n=G(this,q,`m`,nr).call(this);e.draw({frag:rr,uniforms:{posTex:G(this,J,`f`),stateSize:G(this,Z,`f`),elementPixel:s,time:e.time,dt:o,noiseSpeed:this.params.noiseSpeed,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,outwardBias:this.params.outwardBias,duration:this.params.duration,count:n,uBurst:t},target:G(this,J,`f`)}),t===1&&(e.draw({frag:ir,uniforms:{src:e.src,stateSize:G(this,Z,`f`),count:n,color:$t(this.params.color),colorMix:this.params.colorMix},target:G(this,Kn,`f`)}),e.draw({frag:rn,target:G(this,X,`f`)})),G(this,qn,`f`).instanceCount=n,e.draw({frag:rn,target:G(this,Y,`f`)}),e.draw({vert:ar,frag:an,uniforms:{posTex:G(this,J,`f`),colorTex:G(this,Kn,`f`),stateSize:G(this,Z,`f`),pointSize:this.params.pointSize,elementPixel:s,particleCount:n,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fog:this.params.fog},geometry:G(this,qn,`f`),target:G(this,Y,`f`),blend:this.params.blend===`normal`?`premultiplied`:`additive`})}e.draw({frag:on,uniforms:{trailPrev:G(this,X,`f`),particleStamp:G(this,Y,`f`),trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:G(this,X,`f`)}),e.draw({frag:or,uniforms:{trail:G(this,X,`f`)},target:e.target})}dispose(){G(this,q,`m`,tr).call(this),G(this,Y,`f`)?.dispose(),G(this,X,`f`)?.dispose(),K(this,Y,null,`f`),K(this,X,null,`f`),K(this,qn,null,`f`)}outputRect(e){return e.canvasRect}},Gn=new WeakMap,J=new WeakMap,Kn=new WeakMap,Y=new WeakMap,X=new WeakMap,qn=new WeakMap,Z=new WeakMap,Jn=new WeakMap,Yn=new WeakMap,Xn=new WeakMap,Zn=new WeakMap,Qn=new WeakMap,q=new WeakSet,$n=function(){let e=this.params.trailFade;return e<=0?1:e>=.999?600:Math.ceil(-Math.log(255)/Math.log(e))},er=function(e){let t={size:G(this,Z,`f`),float:!0,wrap:`clamp`,filter:`nearest`};K(this,J,e.createRenderTarget({...t,persistent:!0}),`f`),K(this,Kn,e.createRenderTarget(t),`f`)},tr=function(){G(this,J,`f`)?.dispose(),G(this,Kn,`f`)?.dispose(),K(this,J,null,`f`),K(this,Kn,null,`f`)},nr=function(){let e=G(this,Z,`f`)[0]*G(this,Z,`f`)[1];return Math.max(1,Math.min(e,Math.floor(this.params.count)))}})),dr,fr,pr,mr=e((()=>{dr=`#version 300 es
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
`,fr={size:10},pr=class{constructor(e={}){this.params={...fr,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element,{size:r}=this.params;e.draw({frag:dr,uniforms:{src:e.src,cellUv:[r/(t||1),r/(n||1)]},target:e.target})}}})),Q,$,hr,gr,_r,vr,yr,br,xr,Sr,Cr,wr,Tr,Er,Dr,Or,kr,Ar,jr,Mr,Nr,Pr,Fr,Ir,Lr,Rr,zr,Br,Vr=e((()=>{Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},$=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},kr=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() { outColor = texture(src, uvSrc); }
`,Ar=`
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
`,jr=`
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
`,Mr=`#version 300 es
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
${Ar}
${jr}
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
`,Nr=`#version 300 es
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
${Ar}
${jr}
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
`,Pr=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    vec4 c = texture(src, uvSrc);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,Fr=`#version 300 es
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
`,Ir=`#version 300 es
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
`,Lr={right:{axis:0,direction:0},left:{axis:0,direction:1},down:{axis:1,direction:1},up:{axis:1,direction:0}},Rr={luminance:0,r:1,g:2,b:3,hue:4,saturation:5},zr={range:[0,1],sortRes:128,key:`luminance`,direction:`up`,angle:0,bypass:!1},Br=class{constructor(e={}){hr.add(this),gr.set(this,null),_r.set(this,null),vr.set(this,null),yr.set(this,null),br.set(this,0),xr.set(this,0),Sr.set(this,0),Cr.set(this,0),wr.set(this,0),Tr.set(this,0),Er.set(this,0),this.params={...zr,...e},this.params.range=[...this.params.range]}setParams(e){Object.assign(this.params,e),e.range&&(this.params.range=[...e.range])}render(e){if(Q(this,hr,`m`,Or).call(this,e),this.params.bypass||!Q(this,gr,`f`)||!Q(this,_r,`f`)){e.draw({frag:Pr,uniforms:{src:e.src},target:e.target});return}let{axis:t,direction:n}=Lr[this.params.direction],r=[Q(this,Tr,`f`),Q(this,Er,`f`)],[i,a]=this.params.range,o=Rr[this.params.key],[s,c]=e.dims.elementPixel,l=Q(this,vr,`f`),u=Q(this,yr,`f`),d=this.params.angle!==0&&l!==null&&u!==null,f=e.src,p=e.src,ee=e.target,m=[1,0],h=[s,c];if(d){let t=-this.params.angle*Math.PI/180;m=[Math.cos(t),Math.sin(t)],h=[Q(this,Cr,`f`),Q(this,wr,`f`)],e.draw({frag:Fr,uniforms:{src:e.src,srcSize:[s,c],boxSize:h,rot:m},target:l}),f=l,p=l,ee=u}e.draw({frag:kr,uniforms:{src:f},target:Q(this,gr,`f`)});let g=+!!d,_=[s,c];e.draw({frag:Mr,uniforms:{src:Q(this,gr,`f`),srcSize:r,threshold:i,thresholdHigh:a,keyMode:o,direction:n,axis:t,masked:g,boxSize:h,imgSize:_,rot:m},target:Q(this,_r,`f`)}),e.draw({frag:Nr,uniforms:{src:Q(this,gr,`f`),srcHi:p,rankTex:Q(this,_r,`f`),lowSize:r,threshold:i,thresholdHigh:a,keyMode:o,axis:t,masked:g,boxSize:h,imgSize:_,rot:m},target:ee}),d&&e.draw({frag:Ir,uniforms:{src:u,srcSize:[s,c],boxSize:h,rot:m},target:e.target})}dispose(){Q(this,hr,`m`,Dr).call(this),$(this,br,0,`f`),$(this,xr,0,`f`),$(this,Sr,0,`f`),$(this,Cr,0,`f`),$(this,wr,0,`f`),$(this,Tr,0,`f`),$(this,Er,0,`f`)}},gr=new WeakMap,_r=new WeakMap,vr=new WeakMap,yr=new WeakMap,br=new WeakMap,xr=new WeakMap,Sr=new WeakMap,Cr=new WeakMap,wr=new WeakMap,Tr=new WeakMap,Er=new WeakMap,hr=new WeakSet,Dr=function(){Q(this,gr,`f`)?.dispose(),Q(this,_r,`f`)?.dispose(),Q(this,vr,`f`)?.dispose(),Q(this,yr,`f`)?.dispose(),$(this,gr,null,`f`),$(this,_r,null,`f`),$(this,vr,null,`f`),$(this,yr,null,`f`)},Or=function(e){let[t,n]=e.dims.elementPixel,{axis:r}=Lr[this.params.direction],{angle:i}=this.params,a=this.params.sortRes,o=t,s=n;if(i!==0){let e=i*Math.PI/180,r=Math.abs(Math.cos(e)),a=Math.abs(Math.sin(e));o=Math.ceil(t*r+n*a),s=Math.ceil(t*a+n*r)}let c=r===0?Math.max(1,Math.round(a*o/t)):Math.max(1,Math.round(a*s/n)),l=r===0?c:o,u=r===0?s:c;Q(this,br,`f`)===t&&Q(this,xr,`f`)===n&&Q(this,Sr,`f`)===i&&Q(this,Tr,`f`)===l&&Q(this,Er,`f`)===u||(Q(this,hr,`m`,Dr).call(this),$(this,br,t,`f`),$(this,xr,n,`f`),$(this,Sr,i,`f`),$(this,Cr,o,`f`),$(this,wr,s,`f`),$(this,Tr,l,`f`),$(this,Er,u,`f`),$(this,gr,e.createRenderTarget({size:[l,u],filter:`nearest`}),`f`),$(this,_r,e.createRenderTarget({size:[l,u],filter:`nearest`,float:!0}),`f`),i!==0&&($(this,vr,e.createRenderTarget({size:[o,s]}),`f`),$(this,yr,e.createRenderTarget({size:[o,s]}),`f`)))}})),Hr,Ur,Wr,Gr=e((()=>{Hr=`#version 300 es
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
`,Ur={spacing:4},Wr=class{constructor(e={}){this.params={...Ur,...e}}setParams(e){Object.assign(this.params,e)}render(e){let{spacing:t}=this.params;e.draw({frag:Hr,uniforms:{src:e.src,innerHeight:e.dims.element[1]||1,spacing:t},target:e.target})}}}));function Kr(e){let t=e.startsWith(`#`)?e.slice(1):e;return(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``)),t.length===6&&(t+=`ff`),t.length===8?[Number.parseInt(t.slice(0,2),16)/255,Number.parseInt(t.slice(2,4),16)/255,Number.parseInt(t.slice(4,6),16)/255,Number.parseInt(t.slice(6,8),16)/255]:[0,0,0,0]}var qr,Jr,Yr,Xr=e((()=>{qr=`#version 300 es
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
`,Jr={cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`},Yr=class{constructor(e={}){this.params={...Jr,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params;e.draw({frag:qr,uniforms:{src:e.src,mouseUv:[e.mouse[0]/r,e.mouse[1]/i],elementPx:[r,i],cellSize:a.cellSize,pressRadius:a.pressRadius,press:a.press,flatCells:+!!a.flatCells,seed:a.seed,time:e.time,speed:Math.max(0,a.speed),breathe:Math.max(0,a.breathe),breatheSpeed:Math.max(0,a.breatheSpeed),breatheScale:Math.max(1,a.breatheScale),bgColor:Kr(a.bgColor)},target:e.target})}}})),Zr=e((()=>{_(),je(),Qe(),it(),Kt(),Wn(),ur(),mr(),Vr(),Gr(),Xr()}));export{pr as a,Gt as c,Ae as d,g as f,Br as i,rt as l,Yr as n,lr as o,Wr as r,Un as s,Zr as t,Ze as u};