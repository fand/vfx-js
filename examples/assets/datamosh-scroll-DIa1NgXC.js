import"./modulepreload-polyfill-P2Xu9kJm.js";import{t as e}from"./esm-2MEOraI8.js";import{t}from"./_capture-DQwN_S4I.js";import{t as n}from"./tweakpane-CejtfnN4.js";var r=`#version 300 es
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
`,i=`#version 300 es
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
`,a=`#version 300 es
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
`,o=`#version 300 es
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
`,s=`#version 300 es
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
`,c=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D uResidual;
void main() {
    vec3 r = texture(uResidual, uvContent).rgb;
    outColor = vec4(clamp(r * 0.5 + 0.5, 0.0, 1.0), 1.0);
}
`,l=`
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 chroma(vec3 c) {
    return vec2(dot(c, vec3(-0.168736, -0.331264, 0.5)),
                dot(c, vec3(0.5, -0.418688, -0.081312))) + 0.5;
}
`,u=`#version 300 es
precision highp float;
${l}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uCur, uRef, uMV;
uniform vec2 uChromaRes;
void main() {
    vec2 mvc = floor(texture(uMV, uv).rg * 0.5);
    vec2 pred = chroma(texture(uRef, uv + mvc / uChromaRes).rgb);
    outColor = vec4(chroma(texture(uCur, uv).rgb) - pred, 0.0, 1.0);
}
`,d=`#version 300 es
precision highp float;
${l}
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
`,f=`#version 300 es
precision highp float;
${l}
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
`,p=`#version 300 es
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
`,m={blockSize:16,searchRange:5,searchStep:2,useResidual:!0,dup:0,colorSpace:`ycbcr`,chromaGain:1,healRate:0,healThreshold:1,view:`output`},h=class{params;#e=!1;#t=!0;#n=null;#r=null;#i=null;#a=null;#o=null;#s=null;#c=null;#l=0;#u=0;#d=0;#f=0;#p=0;#m=0;#h;constructor(e={}){this.params={...m,...e},this.#h=this.params.colorSpace}setParams(e){Object.assign(this.params,e)}enable(){this.#e=!0}disable(){this.#e=!1,this.#t=!0}get enabled(){return this.#e}#g(){this.#n?.dispose(),this.#r?.dispose(),this.#i?.dispose(),this.#a?.dispose(),this.#o?.dispose(),this.#s?.dispose(),this.#c?.dispose(),this.#n=null,this.#r=null,this.#i=null,this.#a=null,this.#o=null,this.#s=null,this.#c=null}#_(e){let[t,n]=e.dims.elementPixel,r=Math.max(2,this.params.blockSize);if(this.#l===t&&this.#u===n&&this.#p===r)return;this.#g(),this.#l=t,this.#u=n,this.#d=Math.ceil(t/2),this.#f=Math.ceil(n/2),this.#p=r,this.#t=!0;let i=Math.ceil(t/r),a=Math.ceil(n/r);this.#n=e.createRenderTarget({size:[t,n]}),this.#r=e.createRenderTarget({size:[t,n],persistent:!0}),this.#a=e.createRenderTarget({size:[t,n],float:!0}),this.#o=e.createRenderTarget({size:[t,n],float:!0,persistent:!0}),this.#s=e.createRenderTarget({size:[this.#d,this.#f],float:!0,persistent:!0}),this.#c=e.createRenderTarget({size:[this.#d,this.#f],float:!0}),this.#i=e.createRenderTarget({size:[i,a],float:!0,filter:`nearest`})}render(e){this.#_(e);let n=this.#n,r=this.#r,s=this.#i,c=this.#a,l=this.#o,p=this.#s,m=this.#c;if(!n||!r||!s||!c||!l||!p||!m)return;this.params.colorSpace!==this.#h&&(this.#h=this.params.colorSpace,this.#t=!0);let h=[this.#l,this.#u];t(e,n);let g=this.params.view!==`output`;if((this.#e||g)&&(e.draw({frag:i,uniforms:{uCur:n,uRef:r,uResolution:h,uBlock:this.#p,uSearch:this.params.searchRange,uStep:this.params.searchStep,uHealRate:this.params.healRate,uHealThreshold:this.params.healThreshold,uFrame:this.#m++%65536},target:s}),e.draw({frag:a,uniforms:{uCur:n,uRef:r,uMV:s,uResolution:h},target:c})),this.#e){let t=this.#t?1:1+this.params.dup,i=[this.#d,this.#f];this.params.colorSpace===`ycbcr`&&e.draw({frag:u,uniforms:{uCur:n,uRef:r,uMV:s,uChromaRes:i},target:m});for(let r=0;r<t;r++){let t=this.params.useResidual&&r===0;this.params.colorSpace===`ycbcr`?(e.draw({frag:d,uniforms:{uAccum:l,uMV:s,uVideo:n,uResidual:c,uResolution:h,uIntra:this.#t,uUseResidual:t},target:l}),e.draw({frag:f,uniforms:{uChromaAcc:p,uMV:s,uVideo:n,uResidualC:m,uChromaRes:i,uIntra:this.#t,uUseResidual:t},target:p})):e.draw({frag:o,uniforms:{uAccum:l,uMV:s,uVideo:n,uResidual:c,uResolution:h,uIntra:this.#t,uUseResidual:t},target:l})}this.#t=!1}else this.#t=!0;this.#v(e,n,r,s,c,l,p),t(e,r)}#v(e,t,n,i,a,o,l){switch(this.params.view){case`motion`:e.draw({frag:s,uniforms:{uMV:i,uMvScale:this.params.searchRange*this.params.searchStep},target:e.target});return;case`residual`:e.draw({frag:c,uniforms:{uResidual:a},target:e.target});return;case`current`:e.draw({frag:r,uniforms:{tex:t},target:e.target});return;case`previous`:e.draw({frag:r,uniforms:{tex:n},target:e.target});return;default:this.#e&&this.params.colorSpace===`ycbcr`?e.draw({frag:p,uniforms:{uLumaAcc:o,uChromaAcc:l,uChromaGain:this.params.chromaGain},target:e.target}):e.draw({frag:r,uniforms:{tex:this.#e?o:t},target:e.target})}}dispose(){this.#g(),this.#l=0,this.#u=0,this.#d=0,this.#f=0,this.#p=0,this.#t=!0}},g=50,_=[...document.querySelectorAll(`section`)],v=[new URL(new URL(`push-DBDxI3qq.webm`,import.meta.url).href,``+import.meta.url).href,new URL(new URL(`drop-BoURiv8o.webm`,import.meta.url).href,``+import.meta.url).href,new URL(new URL(`flip-rr74aPRJ.webm`,import.meta.url).href,``+import.meta.url).href,new URL(new URL(`roll-CrPtZNhu.webm`,import.meta.url).href,``+import.meta.url).href].map(e=>{let t=document.createElement(`video`);return Object.assign(t,{src:e,muted:!0,loop:!0,playsInline:!0,preload:`auto`}),t});v[0].play();var y=document.getElementById(`bg`),b=y.getContext(`2d`),x=document.getElementById(`head`),S=x.getContext(`2d`),C=()=>{for(let e of[y,x])e.width=e.clientWidth,e.height=e.clientHeight};C(),addEventListener(`resize`,C);var w=(e,t)=>{let n=e.videoWidth,r=e.videoHeight;if(!n||!r)return;let{width:i,height:a}=y,o=Math.max(i/n,a/r)*1.1;b.drawImage(e,(i-n*o)/2,(a-r*o)/2+t,n*o,r*o)},T=_.map(e=>[...e.querySelectorAll(`.head *`)]),E=(e,t,n,r,i,a)=>{e.fillStyle=t,e.fillRect(n,r,i,a)},D=(e,t,n,r)=>{let i=e=>parseFloat(n[e]),a=r.left+i(`paddingLeft`),o=r.right-i(`paddingRight`),s=i(`lineHeight`)||i(`fontSize`)*1.2;e.textAlign={right:`right`,end:`right`,center:`center`}[n.textAlign]??`left`;let c={right:o,center:(a+o)/2}[e.textAlign]??a;e.font=`${n.fontStyle} ${n.fontWeight} ${n.fontSize} ${n.fontFamily}`,e.letterSpacing=n.letterSpacing===`normal`?`0px`:n.letterSpacing,e.fillStyle=n.color;let l=t.textContent.trim();n.textTransform===`uppercase`&&(l=l.toUpperCase());let u=``,d=r.top+i(`borderTopWidth`)+i(`paddingTop`)+s/2;for(let t of l.split(/\s+/)){let n=u?`${u} ${t}`:t;u&&e.measureText(n).width>o-a?(e.fillText(u,c,d),u=t,d+=s):u=n}e.fillText(u,c,d)},O=(e,t,n=0)=>{e.textBaseline=`middle`,e.shadowColor=`rgba(0, 0, 0, 0.5)`,e.shadowBlur=16;for(let r of t){let{x:t,y:i,width:a,height:o}=r.getBoundingClientRect(),s=new DOMRect(t,i+n,a,o);if(!s.width||s.bottom<0||s.top>innerHeight)continue;let c=getComputedStyle(r);e.globalAlpha=Number(c.opacity),c.backgroundColor!==`rgba(0, 0, 0, 0)`&&E(e,c.backgroundColor,s.left,s.top,s.width,s.height);let l=parseFloat(c.borderTopWidth);l&&E(e,c.borderTopColor,s.left,s.top,s.width,l);let u=parseFloat(c.borderBottomWidth);if(u){let t=s.bottom-u;E(e,c.borderBottomColor,s.left,t,s.width,u)}!r.childElementCount&&r.textContent.trim()&&D(e,r,c,s)}e.globalAlpha=1,e.shadowBlur=0},k=new h({dup:0,blockSize:32}),A=new n({title:`Datamosh`,expanded:!1});A.addBinding(k.params,`dup`,{min:0,max:8,step:1}),A.addBinding(k.params,`blockSize`,{min:4,max:64,step:1});var j={chromaGain:1.5,holdMs:500,healMs:1e3};A.addBinding(j,`chromaGain`,{min:0,max:3}),A.addBinding(j,`holdMs`,{min:0,max:3e3,step:10}),A.addBinding(j,`healMs`,{min:10,max:3e3,step:10});var M=new e({pixelRatio:1,zIndex:0,scrollPadding:!1});await M.add(y,{effect:k});var N=0,P=0,F=-1/0,I=performance.now(),L=()=>{let e=Math.min(_.length-1,Math.max(0,Math.round(scrollY/innerHeight))),t=performance.now(),n=t-I;I=t,P!==N&&v[P].readyState>=2&&(v[P].play(),v[N].pause(),N=P,F=t),e!==P&&(P=e,F=t,k.enable());let r=t-F,i=r-j.holdMs,a=Math.min(1,Math.max(0,i/j.healMs));k.params.chromaGain=j.chromaGain+(1-j.chromaGain)*a,k.params.healRate=i<0?0:1-.01**(n/j.healMs),k.params.useResidual=r>g,a>=1&&P===N&&k.enabled&&k.disable();let o=(scrollY-N*innerHeight)*-.08;w(v[N],o);let s=-_[N].getBoundingClientRect().top;k.enabled&&O(b,T[N],s),S.clearRect(0,0,x.width,x.height),O(S,T[N],s),M.update(y),requestAnimationFrame(L)};L();