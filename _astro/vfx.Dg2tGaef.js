import{n as e,r as t,t as n}from"./esm.mYZhLx6n.js";var r=Object.defineProperty,i=(e,t)=>{let n={};for(var i in e)r(n,i,{get:e[i],enumerable:!0});return t||r(n,Symbol.toStringTag,{value:`Module`}),n},a=`
vec4 splitRead(vec2 uvr, vec2 uvg, vec2 uvb, bool to) {
  vec4 r = to ? readTo(uvr) : readFrom(uvr);
  vec4 g = to ? readTo(uvg) : readFrom(uvg);
  vec4 b = to ? readTo(uvb) : readFrom(uvb);
  return vec4(r.r, g.g, b.b, (r.a + g.a + b.a) / 3.0);
}
`,o=`
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
`,s=`
vec2 mirror(vec2 p) {
  return 1.0 - abs(1.0 - mod(p, 2.0));
}
`,c=class extends t{name=`hard_cut`;frag=`
vec4 transition(vec2 uv, float t) {
  return t < 0.5 ? readFrom(uv) : readTo(uv);
}
`},l=e=>typeof e.render==`function`&&e.enabled!==!1;function u(e,t,n){return{...e,src:t,target:n,draw:t=>e.draw({...t,target:t.target??n}),blit:(t,r,i)=>e.blit(t,r??n,i),clear:t=>e.clear(t??n)}}var d=class{params;#e=[];constructor(e={}){this.params=e}async init(e){this.#e=this.stages.slice(1).map(()=>e.createRenderTarget());for(let t of this.stages)await t.init?.(e)}start(e){for(let t of this.stages)t.start?.(e)}update(e){for(let t of this.stages)t.update?.(e)}render(e){let t=this.stages.filter(l);if(t.length===0){e.blit(e.src);return}let n=e.src;for(let[r,i]of t.entries()){if(r===t.length-1){i.render?.({...e,src:n});return}let a=this.#e[r];e.clear(a),i.render?.(u(e,n,a)),n=a}}end(){for(let e of this.stages)e.end?.()}outputRect(e){let t=this.stages.filter(l);return t[t.length-1]?.outputRect?.(e)}dispose(){for(let e of this.stages)e.dispose?.();for(let e of this.#e)e.dispose();this.#e=[]}},f=class extends t{name=`crosszoom`;overflow=!0;frag=`
const float STRENGTH = 0.4;
const float TAPS = 16.0;

${o}
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
`},p=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
void main() {
    outColor = texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}
`,m=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`;function h(e,t){e.draw({frag:p,uniforms:{src:e.src},target:t})}function g(e,t,n){e.draw({frag:m,uniforms:{src:t},target:n})}var _=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D tex;
void main() {
    if (any(lessThan(uvContent, vec2(0.0))) || any(greaterThan(uvContent, vec2(1.0)))) {
        outColor = vec4(0.0);
        return;
    }
    outColor = texture(tex, uvContent);
}
`,v=`#version 300 es
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
`,y=`#version 300 es
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
`,b=`#version 300 es
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
`,x=`#version 300 es
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
`,S=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D uResidual;
void main() {
    vec3 r = texture(uResidual, uvContent).rgb;
    outColor = vec4(clamp(r * 0.5 + 0.5, 0.0, 1.0), 1.0);
}
`,C=`
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 chroma(vec3 c) {
    return vec2(dot(c, vec3(-0.168736, -0.331264, 0.5)),
                dot(c, vec3(0.5, -0.418688, -0.081312))) + 0.5;
}
`,ee=`#version 300 es
precision highp float;
${C}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uCur, uRef, uMV;
uniform vec2 uChromaRes;
void main() {
    vec2 mvc = floor(texture(uMV, uv).rg * 0.5);
    vec2 pred = chroma(texture(uRef, uv + mvc / uChromaRes).rgb);
    outColor = vec4(chroma(texture(uCur, uv).rgb) - pred, 0.0, 1.0);
}
`,te=`#version 300 es
precision highp float;
${C}
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
`,ne=`#version 300 es
precision highp float;
${C}
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
`,re=`#version 300 es
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
`,ie={blockSize:16,searchRange:5,searchStep:2,useResidual:!0,dup:0,colorSpace:`ycbcr`,chromaGain:1,healRate:0,healThreshold:1,view:`output`},w=class{params;#e=!1;#t=!0;#n=null;#r=null;#i=null;#a=null;#o=null;#s=null;#c=null;#l=0;#u=0;#d=0;#f=0;#p=0;#m=0;#h;constructor(e={}){this.params={...ie,...e},this.#h=this.params.colorSpace}setParams(e){Object.assign(this.params,e)}enable(){this.#e=!0}disable(){this.#e=!1,this.#t=!0}get enabled(){return this.#e}#g(){this.#n?.dispose(),this.#r?.dispose(),this.#i?.dispose(),this.#a?.dispose(),this.#o?.dispose(),this.#s?.dispose(),this.#c?.dispose(),this.#n=null,this.#r=null,this.#i=null,this.#a=null,this.#o=null,this.#s=null,this.#c=null}#_(e){let[t,n]=e.dims.elementPixel,r=Math.max(2,this.params.blockSize);if(this.#l===t&&this.#u===n&&this.#p===r)return;this.#g(),this.#l=t,this.#u=n,this.#d=Math.ceil(t/2),this.#f=Math.ceil(n/2),this.#p=r,this.#t=!0;let i=Math.ceil(t/r),a=Math.ceil(n/r);this.#n=e.createRenderTarget({size:[t,n]}),this.#r=e.createRenderTarget({size:[t,n],persistent:!0}),this.#a=e.createRenderTarget({size:[t,n],float:!0}),this.#o=e.createRenderTarget({size:[t,n],float:!0,persistent:!0}),this.#s=e.createRenderTarget({size:[this.#d,this.#f],float:!0,persistent:!0}),this.#c=e.createRenderTarget({size:[this.#d,this.#f],float:!0}),this.#i=e.createRenderTarget({size:[i,a],float:!0,filter:`nearest`})}render(e){this.#_(e);let t=this.#n,n=this.#r,r=this.#i,i=this.#a,a=this.#o,o=this.#s,s=this.#c;if(!t||!n||!r||!i||!a||!o||!s)return;this.params.colorSpace!==this.#h&&(this.#h=this.params.colorSpace,this.#t=!0);let c=[this.#l,this.#u];h(e,t);let l=this.params.view!==`output`;if((this.#e||l)&&(e.draw({frag:v,uniforms:{uCur:t,uRef:n,uResolution:c,uBlock:this.#p,uSearch:this.params.searchRange,uStep:this.params.searchStep,uHealRate:this.params.healRate,uHealThreshold:this.params.healThreshold,uFrame:this.#m++%65536},target:r}),e.draw({frag:y,uniforms:{uCur:t,uRef:n,uMV:r,uResolution:c},target:i})),this.#e){let l=this.#t?1:1+this.params.dup,u=[this.#d,this.#f];this.params.colorSpace===`ycbcr`&&e.draw({frag:ee,uniforms:{uCur:t,uRef:n,uMV:r,uChromaRes:u},target:s});for(let n=0;n<l;n++){let l=this.params.useResidual&&n===0;this.params.colorSpace===`ycbcr`?(e.draw({frag:te,uniforms:{uAccum:a,uMV:r,uVideo:t,uResidual:i,uResolution:c,uIntra:this.#t,uUseResidual:l},target:a}),e.draw({frag:ne,uniforms:{uChromaAcc:o,uMV:r,uVideo:t,uResidualC:s,uChromaRes:u,uIntra:this.#t,uUseResidual:l},target:o})):e.draw({frag:b,uniforms:{uAccum:a,uMV:r,uVideo:t,uResidual:i,uResolution:c,uIntra:this.#t,uUseResidual:l},target:a})}this.#t=!1}else this.#t=!0;this.#v(e,t,n,r,i,a,o),h(e,n)}#v(e,t,n,r,i,a,o){switch(this.params.view){case`motion`:e.draw({frag:x,uniforms:{uMV:r,uMvScale:this.params.searchRange*this.params.searchStep},target:e.target});return;case`residual`:e.draw({frag:S,uniforms:{uResidual:i},target:e.target});return;case`current`:e.draw({frag:_,uniforms:{tex:t},target:e.target});return;case`previous`:e.draw({frag:_,uniforms:{tex:n},target:e.target});return;default:this.#e&&this.params.colorSpace===`ycbcr`?e.draw({frag:re,uniforms:{uLumaAcc:a,uChromaAcc:o,uChromaGain:this.params.chromaGain},target:e.target}):e.draw({frag:_,uniforms:{tex:this.#e?a:t},target:e.target})}}dispose(){this.#g(),this.#l=0,this.#u=0,this.#d=0,this.#f=0,this.#p=0,this.#t=!0}},ae=`#version 300 es
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
    outColor = texture(src, uvSrc);
}
`,oe=`#version 300 es
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
`,se={quality:.4,seed:.25,iterations:24,resolutionScale:1,randomFlip:!0,vertical:!1,speed:0,bypass:!1};function T(e,t){if(typeof OffscreenCanvas<`u`)return new OffscreenCanvas(e,t);let n=document.createElement(`canvas`);return n.width=e,n.height=t,n}function E(e){let t=e.getContext(`2d`);if(!t)throw Error(`[VFX-JS] JPEGGlitchEffect: 2D canvas context unavailable`);return t}function ce(e,t){if(typeof OffscreenCanvas<`u`&&e instanceof OffscreenCanvas)return e.convertToBlob({type:`image/jpeg`,quality:t});let n=e;return new Promise((e,r)=>{n.toBlob(t=>t?e(t):r(Error(`[VFX-JS] JPEGGlitchEffect: toBlob failed`)),`image/jpeg`,t)})}function le(e){for(let t=2;t+3<e.length;t++)if(e[t]===255&&e[t+1]===218){let n=e[t+2]<<8|e[t+3];return Math.min(e.length,t+2+n)}return Math.min(e.length,417)}function ue(e,t){let n=Math.imul(Math.floor(e*2654435761)|0,2246822519)+Math.imul(t+1,3266489917)>>>0;return()=>{n=n+1831565813>>>0;let e=Math.imul(n^n>>>15,1|n);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function D(e,t,n,r,i,a,o){switch(e.save(),e.clearRect(0,0,a,o),i){case 90:e.translate(a,0);break;case 180:e.translate(a,o);break;case 270:e.translate(0,o)}e.rotate(i*Math.PI/180),e.drawImage(t,0,0,n,r),e.restore()}function de(e,t,n,r){let i=e.length-t-4;if(i<=1)return;let a=Math.max(1,Math.floor(n));for(let n=0;n<a;n++){let o=i/a*n|0,s=i/a*(n+1)|0,c=Math.max(1,s-o),l=Math.min(i,o+(r()*c|0)),u=r()*256|0;e[t+l]=u}}var O=class{params;enabled=!0;#e=!1;#t=null;#n=null;#r=null;#i=null;#a=!1;#o=null;#s=null;#c=null;#l=null;#u=null;#d=null;#f=null;#p=new Uint8Array;#m=null;#h=0;#g=0;#_=0;#v=0;#y=!0;#b=!1;#x=-1e9;#S=0;#C=0;#w=!1;#T=0;get producedFrames(){return this.#T}constructor(e={}){this.params={...se,...e}}setParams(e){Object.assign(this.params,e),this.#y=!0}init(e){this.#e=typeof createImageBitmap==`function`&&(typeof OffscreenCanvas<`u`||typeof document<`u`),this.#e&&(this.#x=-1e9,this.#y=!0,this.#s=T(1,1),this.#c=E(this.#s),this.#l=T(1,1),this.#u=E(this.#l),this.#d=T(1,1),this.#f=E(this.#d),this.#t=e.createRenderTarget({size:[1,1]}),this.#r=e.gl,this.#E(e),this.#o=e.onContextRestored(()=>{this.#E(e),this.#a=this.#w}))}#E(e){let t=e.gl,n=t.createTexture();n&&(t.bindTexture(t.TEXTURE_2D,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,0])),t.bindTexture(t.TEXTURE_2D,null),this.#i=n,this.#n=e.wrapTexture(n,{size:[this.#h||1,this.#g||1]}))}update(){this.enabled===!1&&(this.#w=!1)}render(e){if(this.params.bypass||!this.#e||!this.#t){this.#w=!1,this.#D(e);return}let t=e.src.width,n=e.src.height;(t!==this.#_||n!==this.#v)&&(this.#_=t,this.#v=n,this.#y=!0);let[r,i]=e.dims.elementPixel,a=Math.min(1,Math.max(0,this.params.resolutionScale)),o=Math.max(1,Math.round(r*a)),s=Math.max(1,Math.round(i*a));r>=2&&i>=2&&t>0&&n>0&&((o!==this.#h||s!==this.#g)&&this.#k(e,o,s),this.#O(e)&&this.#A(e)),this.#w&&this.#n?(this.#a&&this.#j(e),e.draw({frag:oe,uniforms:{tex:this.#n},target:e.target})):this.#D(e)}#D(e){e.draw({frag:ae,uniforms:{src:e.src},target:e.target})}#O(e){if(this.#b)return!1;let t=this.params.speed;return t>0?e.time-this.#x>=1/t:this.#y}#k(e,t,n){this.#h=t,this.#g=n,this.#p=new Uint8Array(t*n*4),this.#m=new ImageData(t,n),this.#s&&(this.#s.width=t,this.#s.height=n),this.#d&&(this.#d.width=t,this.#d.height=n),this.#t?.dispose(),this.#t=e.createRenderTarget({size:[t,n]}),this.#w=!1,this.#y=!0,this.#b=!1,this.#a=!1,this.#S++}#A(e){let t=this.#h,n=this.#g,r=this.#s,i=this.#c,a=this.#l,o=this.#u,s=this.#m;if(!r||!i||!a||!o||!s||!this.#t)return;h(e,this.#t);let c=e.gl;c.readPixels(0,0,t,n,c.RGBA,c.UNSIGNED_BYTE,this.#p),c.bindFramebuffer(c.FRAMEBUFFER,null),this.#b=!0,this.#y=!1,this.#x=e.time;let l=s.data,u=t*4;for(let e=0;e<n;e++){let t=(n-1-e)*u;l.set(this.#p.subarray(t,t+u),e*u)}for(let e=3;e<l.length;e+=4)l[e]=255;let d=this.params.speed>0?this.#C:0;this.#C++;let{quality:f,seed:p,iterations:m,randomFlip:g,vertical:_}=this.params,v=ue(p,d),y=g&&v()<.5;i.putImageData(s,0,0);let b=((y?180:0)+(_?270:0))%360,x=_,S=x?n:t,C=x?t:n;a.width=S,a.height=C,D(o,r,t,n,b,S,C),this.#M(a,t,n,f,m,b,v,this.#S)}#j(e){let t=e.gl;this.#i&&this.#d&&(t.bindTexture(t.TEXTURE_2D,this.#i),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,this.#d),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,null),this.#a=!1)}async#M(e,t,n,r,i,a,o,s){try{let c=await ce(e,r),l=new Uint8Array(await c.arrayBuffer());de(l,le(l),i,o);let u=await createImageBitmap(new Blob([l],{type:`image/jpeg`}));if(s===this.#S&&this.#f){let e=(360-a)%360;D(this.#f,u,u.width,u.height,e,t,n),this.#w=!0,this.#T++,this.#a=!0}u.close()}catch{}finally{s===this.#S&&(this.#b=!1)}}dispose(){this.#o?.(),this.#o=null,this.#r&&this.#i&&this.#r.deleteTexture(this.#i),this.#i=null,this.#r=null,this.#a=!1,this.#t?.dispose(),this.#t=null,this.#n=null,this.#s=null,this.#c=null,this.#l=null,this.#u=null,this.#d=null,this.#f=null,this.#m=null,this.#p=new Uint8Array,this.#w=!1,this.#b=!1,this.#h=0,this.#g=0,this.#S++}},k=`
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
`,A=`
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
`,fe=`#version 300 es
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
${k}
${A}
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
`,pe=`#version 300 es
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
${k}
${A}
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
        outColor = texture(srcHi, hiUv);
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
                outColor = texture(srcHi, hiUv);
            } else {
                outColor = texelFetch(src, toXY(i, b, axis), 0);
            }
            return;
        }
    }
    outColor = texture(srcHi, hiUv);
}
`,me=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`,he=`#version 300 es
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
`,ge=`#version 300 es
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
`,j={right:{axis:0,direction:0},left:{axis:0,direction:1},down:{axis:1,direction:1},up:{axis:1,direction:0}},_e={luminance:0,r:1,g:2,b:3,hue:4,saturation:5},ve={range:[0,1],sortRes:128,key:`luminance`,direction:`up`,angle:0,bypass:!1},M=class{params;#e=null;#t=null;#n=null;#r=null;#i=0;#a=0;#o=0;#s=0;#c=0;#l=0;#u=0;constructor(e={}){this.params={...ve,...e},this.params.range=[...this.params.range]}setParams(e){Object.assign(this.params,e),e.range&&(this.params.range=[...e.range])}#d(){this.#e?.dispose(),this.#t?.dispose(),this.#n?.dispose(),this.#r?.dispose(),this.#e=null,this.#t=null,this.#n=null,this.#r=null}#f(e){let[t,n]=e.dims.elementPixel,{axis:r}=j[this.params.direction],{angle:i}=this.params,a=this.params.sortRes,o=t,s=n;if(i!==0){let e=i*Math.PI/180,r=Math.abs(Math.cos(e)),a=Math.abs(Math.sin(e));o=Math.ceil(t*r+n*a),s=Math.ceil(t*a+n*r)}let c=r===0?Math.max(1,Math.round(a*o/t)):Math.max(1,Math.round(a*s/n)),l=r===0?c:o,u=r===0?s:c;(this.#i!==t||this.#a!==n||this.#o!==i||this.#l!==l||this.#u!==u)&&(this.#d(),this.#i=t,this.#a=n,this.#o=i,this.#s=o,this.#c=s,this.#l=l,this.#u=u,this.#e=e.createRenderTarget({size:[l,u],filter:`nearest`}),this.#t=e.createRenderTarget({size:[l,u],filter:`nearest`,float:!0}),i!==0&&(this.#n=e.createRenderTarget({size:[o,s]}),this.#r=e.createRenderTarget({size:[o,s]})))}render(e){if(this.#f(e),this.params.bypass||!this.#e||!this.#t){e.draw({frag:me,uniforms:{src:e.src},target:e.target});return}let{axis:t,direction:n}=j[this.params.direction],r=[this.#l,this.#u],[i,a]=this.params.range,o=_e[this.params.key],[s,c]=e.dims.elementPixel,l=this.#n,u=this.#r,d=this.params.angle!==0&&l!==null&&u!==null,f=e.src,p=e.target,m=[1,0],_=[s,c];if(d){let t=-this.params.angle*Math.PI/180;m=[Math.cos(t),Math.sin(t)],_=[this.#s,this.#c],e.draw({frag:he,uniforms:{src:e.src,srcSize:[s,c],boxSize:_,rot:m},target:l}),f=l,p=u}d&&l!==null?g(e,l,this.#e):h(e,this.#e);let v=+!!d,y=[s,c];e.draw({frag:fe,uniforms:{src:this.#e,srcSize:r,threshold:i,thresholdHigh:a,keyMode:o,direction:n,axis:t,masked:v,boxSize:_,imgSize:y,rot:m},target:this.#t}),e.draw({frag:pe,uniforms:{src:this.#e,srcHi:f,rankTex:this.#t,lowSize:r,threshold:i,thresholdHigh:a,keyMode:o,axis:t,masked:v,boxSize:_,imgSize:y,rot:m},target:p}),d&&e.draw({frag:ge,uniforms:{src:u,srcSize:[s,c],boxSize:_,rot:m},target:e.target})}dispose(){this.#d(),this.#i=0,this.#a=0,this.#o=0,this.#s=0,this.#c=0,this.#l=0,this.#u=0}},N=.25,P=1.5,F=2,ye=32,be=class extends t{name=`datamosh`;frag=`
vec4 transition(vec2 uv, float t) {
  return reverse > 0.5 ? readFrom(uv) : readTo(uv);
}
`};function xe(e){return e!==void 0&&Number.isFinite(e)&&e>=2?Math.round(e):ye}var Se=class extends w{#e;#t=0;#n=1;constructor(e){super({dup:0,blockSize:e()}),this.#e=e}start(e){this.params.blockSize=this.#e(),this.params.chromaGain=P,this.params.useResidual=!1,this.params.healRate=0,this.#t=0,this.#n=Math.max(e.duration*.75,.001),this.enable()}update(e){let{x:t}=e.progress,n=Math.min(Math.max((t-N)/.75,0),1);this.params.useResidual=++this.#t>F,this.params.chromaGain=P+-.5*n,this.params.healRate=t<N?0:1-.01**(e.deltaTime/this.#n)}end(){this.disable()}},Ce=class extends d{name=`datamosh`;stages=[new be,new Se(()=>xe(this.params.blockSize))]},we=class extends t{name=`distort_fade`;frag=`
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

${s}
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
`},I=/vec4\s+transition\s*\(\s*vec2\s+(\w+)\s*\)/,Te=new Set([`from`,`src`,`srcRectUv`,`t`,`reverse`,`resolution`,`time`,`uvContent`,`outColor`,`progress`,`ratio`]),L=e=>Te.has(e)?`glParam_${e}`:e;function Ee(e){let n=e.paramsTypes??{},r=[...e.textures??[],...Object.keys(n).filter(e=>n[e]===`sampler2D`)];if(r.length>0)throw Error(`[VFX-JS] gl-transition "${e.name}" needs textures (${r.join(`, `)}), which are not supported.`);if(!I.test(e.glsl))throw Error(`[VFX-JS] gl-transition "${e.name}" has no \`vec4 transition(vec2 uv)\`.`);let i=e.glsl.replace(I,`vec4 glTransition_(vec2 $1)`);for(let e of Object.keys(n)){let t=L(e);t!==e&&(i=i.replace(RegExp(`(^|[^.\\w])${e}\\b`,`g`),`$1${t}`))}let a=`
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
`;return class extends t{name=`gl:${e.name}`;frag=a;ease=`linear`;constructor(t={}){super(t);for(let r of Object.keys(t))r in n||console.warn(`[VFX-JS] gl-transition "${e.name}" has no param "${r}".`)}uniforms(){let t={},n={...e.defaultParams,...this.params};for(let e of Object.keys(n))t[L(e)]=n[e];return t}}}var De=class extends t{name=`glitch`;frag=`
uniform float amount;
uniform float speed;

float gnoise(float y) {
  return sin(y * 7.0) * sin(y * 17.0) * sin(y * 59.0);
}
vec2 gnoise(vec2 uv) {
  return vec2(gnoise(uv.x), gnoise(uv.y + 100.0));
}

${a}
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
`;uniforms(){return{amount:this.params.amount??1,speed:this.params.speed??1}}},Oe=class extends t{name=`glitch_slide`;frag=`
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
`},ke=.12,Ae=30,R=e=>Math.min(Math.max(e.quality??.1,0),1),je=class extends O{#e;constructor(e){super({quality:R(e()),bypass:!0,resolutionScale:.25}),this.#e=e}start(){this.params.bypass=!0,this.params.speed=Ae,this.params.quality=R(this.#e())}render(e){let{x:t}=e.progress;this.params.bypass=!(t>ke&&t<.88);let n=Math.sin(Math.min(Math.max(t,0),1)*Math.PI),r=Math.max(1,Math.round(this.#e().iterations??4));this.params.iterations=Math.max(1,Math.round(r*n)),super.render(e)}end(){this.params.bypass=!0}},Me=class extends d{name=`jpeg_glitch`;ease=`linear`;stages=[new c,new je(()=>this.params)]},Ne=class extends t{name=`lens_distortion`;frag=`
uniform float strength;
uniform float dispersion;
// The old content zooms from 1 to 1 + zoom; the new one from 1 + zoom back to 1.
uniform float zoom;
const float TAPS = 12.0;
// Width of the growing warp's edge.
const float SOFT = 0.5;

${o}
${s}
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
`;uniforms(){return{strength:this.params.strength??1,dispersion:Math.max(0,this.params.dispersion??.6),zoom:Math.max(0,this.params.zoom??3)}}},Pe={right:[1,0],left:[-1,0],up:[0,1],down:[0,-1],center:[0,0]},Fe=class extends t{name=`pixel_scan`;frag=`
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
`;uniforms(){return{blackout:this.params.blackout??!0?1:0,sweep:Pe[this.params.direction??`right`]}}},Ie=class extends t{name=`pixel_stretch`;frag=`
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
`},z={up:`down`,down:`up`,left:`right`,right:`left`},Le=class extends M{#e;#t=!1;constructor(e){super({range:[1,1]}),this.#e=e}start(e){let t=this.#e();this.#t=e.reverse,this.params.direction=e.reverse?z[t]:t,this.params.range[0]=1}update(e){let{t}=e.progress,n=this.#e(),r=this.#t?1-t:t;this.params.direction=r<.5?n:z[n],this.params.range[0]=Math.abs(1-2*t)}end(){this.params.range[0]=1}},Re=class extends d{name=`pixelsort`;stages=[new c,new Le(()=>this.params.direction??`up`)]},ze=class extends t{name=`slit_scan`;frag=`
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
`},Be={left:[-1,0],right:[1,0],up:[0,1],down:[0,-1]},Ve=class extends t{name=`swipe`;frag=`
uniform vec2 move;
const float STRETCH = 0.6;
const float BLUR = 0.2;
const float TAPS = 16.0;

${o}
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
`;uniforms(){return{move:Be[this.params.direction??`left`]}}},He={center:[0,0],left:[-1,0],right:[1,0],up:[0,1],down:[0,-1]},Ue={hex:`
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
`},B=e=>`
uniform float count;
uniform float shadow;
// Zero spreads out in rings; otherwise the side the sweep moves toward.
uniform vec2 sweep;
const float SPREAD = 0.6;
// Shadow offset and blur at full lift, in tiles.
const vec2 SHADOW_OFFSET = vec2(0.05, -0.08);
const float SHADOW_BLUR = 0.12;
${Ue[e]}
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
`,We={hex:B(`hex`),square:B(`square`)},Ge=class extends t{name=`tile`;get frag(){return We[this.params.shape??`hex`]}uniforms(){return{count:Math.max(1,Math.round(this.params.count??12)),shadow:Math.min(Math.max(this.params.shadow??.5,0),1),sweep:He[this.params.direction??`center`]}}},Ke=class extends t{name=`zoom`;overflow=!0;frag=`
vec4 transition(vec2 uv, float t) {
  vec2 uv1 = (uv - 0.5) * (1.0 - t) + 0.5;
  vec2 uv2 = (uv - 0.5) / (t * 0.999 + 0.001) + 0.5;
  // Tile the new content only inside the element, so the overflow shows just the old one.
  vec4 to = inRange(uv) ? readTo(fract(uv2)) : vec4(0.0);
  return mix(readFrom(uv1), to, t);
}
`},qe=class extends t{name=`zoom_blur`;overflow=!0;frag=`
${a}
${o}
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
`},Je=i({Crossfade:()=>e,Crosszoom:()=>f,Datamosh:()=>Ce,DistortFade:()=>we,Glitch:()=>De,GlitchSlide:()=>Oe,JpegGlitch:()=>Me,LensDistortion:()=>Ne,PixelScan:()=>Fe,PixelStretch:()=>Ie,Pixelsort:()=>Re,SlitScan:()=>ze,Swipe:()=>Ve,Tile:()=>Ge,Zoom:()=>Ke,ZoomBlur:()=>qe,createGLTransition:()=>Ee}),V=new Map,H=new Map,U=new Map,W=new Map,G={},K=!1,q=new Set,J=new Map;for(let[e,t]of Object.entries(Je))typeof t==`function`&&/^[A-Z]/.test(e)&&J.set(e.toLowerCase(),t);function Y(e,t){for(let[n,r]of Object.entries(t??{}))e.set(n,r)}function Ye(e){Y(V,e.transitions),Y(H,e.uniforms),Y(U,e.shaders),Y(W,e.eases),e.vfx&&(K&&console.warn("[@vfx-js/astro] registerVFX: the VFX already exists, so the `vfx` options are ignored. Call registerVFX before any element."),G={...G,...e.vfx});for(let e of q)e()}function Xe(e){return q.add(e),()=>{q.delete(e)}}function Ze(e){return V.get(e)??J.get(e)}function Qe(e){return H.get(e)}function $e(e){return U.get(e)}function et(e){return W.get(e)}function X(){return K=!0,G}var Z=`[@vfx-js/astro]`;function tt(e){let t;try{t=JSON.parse(e)}catch{return console.error(`${Z} data-vfx is not valid JSON:`,e),{props:null}}if(typeof t!=`object`||!t||Array.isArray(t))return console.error(`${Z} data-vfx must be a JSON object:`,e),{props:null};let{shader:n,uniforms:r,...i}=t,a=i;if(typeof n==`string`&&n.startsWith(`@`)){let e=$e(n.slice(1));if(!e)return{props:null,missing:`shader "${n}"`};a.shader=e}else n!==void 0&&(a.shader=n);if(typeof r==`string`){let e=Qe(r);if(!e)return{props:null,missing:`uniforms "${r}"`};a.uniforms=e}else r!==void 0&&(a.uniforms=r);return{props:a}}function nt(e){if(e===`smoothstep`||e===`linear`)return e;let t=et(e);return t||console.warn(`${Z} Unknown ease: ${e}`),t}function rt(e){let t=e.trim(),n;if(t.startsWith(`{`))try{n=JSON.parse(t)}catch{return console.error(`${Z} Transition spec is not valid JSON:`,e),null}else n={transition:t};if(typeof n!=`object`||!n)return null;let{transition:r,ease:i,...a}=n,o=a;if(r){let e=Ze(r);e?o.transition=e:console.warn(`${Z} Unknown transition: ${r}`)}if(i){let e=nt(i);e&&(o.ease=e)}return o}function it(e,t){return e??t??{}}var Q=null,$=!1;function at(){return!Q&&!$&&(Q=n.init({...X()}),$=Q===null),Q}function ot(){return Q}export{it as a,M as c,rt as i,O as l,ot as n,Xe as o,tt as r,Ye as s,at as t,w as u};