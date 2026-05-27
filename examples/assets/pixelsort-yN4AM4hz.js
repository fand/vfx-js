import"./modulepreload-polyfill-3xzlJT5O.js";import{t as e}from"./esm-ep-oan_P.js";import t from"https://esm.sh/lenis";var n=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() { outColor = texture(src, uvSrc); }
`,r=`
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
`,i=`
ivec2 toXY(int a, int b, int axis) { return axis == 0 ? ivec2(a, b) : ivec2(b, a); }

void scanSegment(sampler2D s, int a, int b, int L, int keyMode, float threshold, int axis, out int segStart, out int segEnd) {
    segStart = a;
    for (int i = 0; i < 8192; i++) {
        if (segStart <= 0) break;
        if (i >= L) break;
        float k = key(texelFetch(s, toXY(segStart - 1, b, axis), 0).rgb, keyMode);
        if (k <= threshold) break;
        segStart--;
    }
    segEnd = a + 1;
    for (int i = 0; i < 8192; i++) {
        if (segEnd >= L) break;
        if (i >= L) break;
        float k = key(texelFetch(s, toXY(segEnd, b, axis), 0).rgb, keyMode);
        if (k <= threshold) break;
        segEnd++;
    }
}
`,a=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 srcSize;
uniform float threshold;
uniform int keyMode;
uniform int direction;
uniform int axis;
${r}
${i}
void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int a = axis == 0 ? p.x : p.y;
    int b = axis == 0 ? p.y : p.x;
    int L = int(axis == 0 ? srcSize.x : srcSize.y);
    float myKey = key(texelFetch(src, p, 0).rgb, keyMode);
    if (myKey <= threshold) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    int segStart, segEnd;
    scanSegment(src, a, b, L, keyMode, threshold, axis, segStart, segEnd);
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
`,o=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D srcHi;
uniform sampler2D rankTex;
uniform vec2 lowSize;
uniform float threshold;
uniform int keyMode;
uniform int axis;
${r}
${i}
void main() {
    int lowA = axis == 0 ? int(uvSrc.x * lowSize.x) : int(uvSrc.y * lowSize.y);
    int b    = axis == 0 ? int(uvSrc.y * lowSize.y) : int(uvSrc.x * lowSize.x);
    int L    = int(axis == 0 ? lowSize.x : lowSize.y);
    ivec2 lowP = toXY(lowA, b, axis);
    float myKey = key(texelFetch(src, lowP, 0).rgb, keyMode);
    if (myKey <= threshold) {
        // below-threshold pixels skip the low-res buffer entirely.
        vec4 c = texture(srcHi, uvSrc);
        outColor = vec4(c.rgb * c.a, c.a);
        return;
    }
    int segStart, segEnd;
    scanSegment(src, lowA, b, L, keyMode, threshold, axis, segStart, segEnd);
    int targetRank = lowA - segStart;
    for (int i = segStart; i < segEnd; i++) {
        int r = int(texelFetch(rankTex, toXY(i, b, axis), 0).r + 0.5);
        if (r == targetRank) {
            // sortで動かないピクセルは元画像、動いたピクセルだけ低解像度のソート色
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
`,s=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    vec4 c = texture(src, uvSrc);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,c={right:{axis:0,direction:0},left:{axis:0,direction:1},down:{axis:1,direction:1},up:{axis:1,direction:0}},l=class{constructor(e,t={}){this.params=e,this.localBypass=t.bypass??!1,this.localThreshold=t.threshold??null,this.localDir=t.dir??null,this._lowRT=null,this._rankRT=null,this._w=0,this._h=0,this._lowW=0,this._lowH=0}_dir(){return c[this.localDir??this.params.dir]??c.right}_axis(){return this._dir().axis}_ensureSize(e){let[t,n]=e.dims.elementPixel,r=this._axis(),i=this.params.lowDim,a=r===0?i:t,o=r===0?n:i;this._w===t&&this._h===n&&this._lowW===a&&this._lowH===o||(this._lowRT?.dispose?.(),this._rankRT?.dispose?.(),this._w=t,this._h=n,this._lowW=a,this._lowH=o,this._lowRT=e.createRenderTarget({size:[a,o],filter:`nearest`}),this._rankRT=e.createRenderTarget({size:[a,o],filter:`nearest`,float:!0}))}render(e){if(this._ensureSize(e),this.localBypass){e.draw({frag:s,uniforms:{src:e.src},target:e.target});return}let{axis:t,direction:r}=this._dir(),i=[this._lowW,this._lowH],c=this.localThreshold??this.params.threshold;e.draw({frag:n,uniforms:{src:e.src},target:this._lowRT}),e.draw({frag:a,uniforms:{src:this._lowRT,srcSize:i,threshold:c,keyMode:this.params.keyMode,direction:r,axis:t},target:this._rankRT}),e.draw({frag:o,uniforms:{src:this._lowRT,srcHi:e.src,rankTex:this._rankRT,lowSize:i,threshold:c,keyMode:this.params.keyMode,axis:t},target:e.target})}},u={threshold:0,lowDim:128,keyMode:0,dir:`up`},d=[{from:0,to:.1,sec:0,bypass:!0},{from:.1,to:.2,sec:0,dir:`right`,t:[1,0]},{from:.2,to:.25,sec:1,dir:`left`,t:[0,1]},{from:.25,to:.3,sec:1,bypass:!0},{from:.3,to:.4,sec:1,dir:`right`,t:[1,0]},{from:.4,to:.45,sec:2,dir:`left`,t:[0,1]},{from:.45,to:.5,sec:2,bypass:!0},{from:.5,to:.6,sec:2,bypass:!0,sub:0,subT:[1,0],subDir:`right`},{from:.6,to:.65,sec:2,bypass:!0,sub:1,subT:[0,1],subDir:`left`},{from:.7,to:.8,sec:2,dir:`up`,t:[1,0]},{from:.8,to:.95,sec:3,dir:`down`,t:[0,1]},{from:.95,to:1.01,sec:3,bypass:!0}],f=(e,t,n)=>e+(t-e)*n,p=e=>Math.max(0,Math.min(1,e)),m=(e,t,n)=>Math.max(t,Math.min(n,e)),h=64,g=12,_=21,v=()=>{let e=document.querySelector(`.section-2 .columns`),t=document.querySelector(`.section-2 .lined`);if(!e||!t)return;let n=window.innerHeight-h,r=parseFloat(getComputedStyle(e).fontSize);for(let i=0;i<4;i++){let i=e.getBoundingClientRect().height;if(i<=0)break;let a=n-t.getBoundingClientRect().bottom;if(Math.abs(a)<1)break;r=m(r*(1+a/i),g,_),e.style.fontSize=`${r}px`}},y=[`./pixelsort/city1.webp`,`./pixelsort/tower1.webp`],b=document.getElementById(`loader`),x=e=>{b.querySelector(`.bar-fill`).style.width=`${(e*100).toFixed(1)}%`,b.querySelector(`.pct`).textContent=`${Math.round(e*100)}%`},S=!1,C=()=>{S||(S=!0,b.classList.add(`done`),setTimeout(()=>b.remove(),600))},w=300,T=performance.now(),E=0,D=!1;setTimeout(C,1e4),(async()=>{let e=Array.from(document.images),t=e.length+y.length+1,n=0,r=()=>{E=++n/t},i=e.map(e=>Promise.resolve(e.decode?.()).catch(()=>{}).then(r));for(let e of y){let t=new Image;t.src=e,i.push(t.decode().catch(()=>{}).then(r))}i.push(document.fonts.ready.then(r)),await Promise.race([Promise.all(i),new Promise(e=>setTimeout(e,8e3))]),E=1,D=!0})(),await new Promise(e=>{let t=0,n=()=>{let r=performance.now()-T,i=Math.min(E,r/w);t+=(i-t)*.18,i-t<.004&&(t=i),x(t),D&&r>=w&&t>.999?(x(1),e()):requestAnimationFrame(n)};requestAnimationFrame(n)});var O=!1;try{let t=new e({scrollPadding:!1}),n=[document.querySelector(`.hero`),document.querySelector(`.section-2`),document.querySelector(`.section-3`),document.querySelector(`.section-4`)],r=n.map(e=>e.parentElement);v();let i=[],a=[];await Promise.all(r.map(async(e,n)=>{let r=new l(u,{bypass:!0,threshold:1});await t.addHTML(e,{effect:r}),i[n]=r,a[n]=e.parentElement,a[n].style.opacity=`0`,a[n].style.pointerEvents=`none`}));let o=n[2].querySelector(`.video img`);o.style.display=`none`;let s=null,c=0,m=`hidden`,h=null,g=0,_=!1,b=`right`,x=()=>{m!==`hidden`&&(++c,s&&=(t.remove(o),null),o.style.display=`none`,m=`hidden`,t.update(r[2]).catch(()=>{}))},S=async e=>{if(m===`embedded`&&h===e)return;let n=++c;s&&=(t.remove(o),null),o.src=y[e],o.style.display=``,m=`embedded`,h=e,await o.decode().catch(()=>{}),n===c&&t.update(r[2]).catch(()=>{})},w=async(e,n,r,i)=>{if(g=n,_=r,b=i,m===`standalone`&&h===e){s&&(s.localBypass=r,s.localThreshold=n,s.localDir=i);return}let a=++c;s&&=(t.remove(o),null),o.src=y[e],o.style.display=``,m=`standalone`,h=e;let d=new l(u,{bypass:!1,threshold:g,dir:b});await t.add(o,{effect:d}),a===c&&(s=d,s.localBypass=_,s.localThreshold=g,s.localDir=b)},T=-1,E=!0,D=(e,t,n,r)=>{T!==e&&(T>=0&&(a[T].style.opacity=`0`,a[T].style.pointerEvents=`none`,i[T].localBypass=!0),a[e].style.opacity=`1`,a[e].style.pointerEvents=`auto`,T=e);let o=i[e];o.localBypass=r,r||(o.localThreshold=t,o.localDir=n)},k=e=>{let t=d[0];for(let n of d)if(e>=n.from)t=n;else break;return t},A=document.querySelector(`.scroll-proxy`),j=!1,M=()=>{j||(j=!0,requestAnimationFrame(()=>{if(j=!1,E)return;let e=A.offsetHeight-window.innerHeight,t=e>0?p(window.scrollY/e):0,n=k(t),r=p((t-n.from)/(n.to-n.from)),i=n.bypass===!0,a=i?1:f(n.t[0],n.t[1],r),o=n.dir??`right`;if(D(n.sec,a,o,i),n.sub!==void 0){let e=f(n.subT[0],n.subT[1],r);w(n.sub,e,e>=1,n.subDir??`right`)}else n.sec===2?S(h??0):x()}))};window.addEventListener(`scroll`,M,{passive:!0}),window.addEventListener(`resize`,M);let N;window.addEventListener(`resize`,()=>{cancelAnimationFrame(N),N=requestAnimationFrame(()=>{v(),t.update(r[1]).catch(()=>{})})}),M(),D(0,0,`up`,!1),setTimeout(()=>{C();let e=performance.now(),t=n=>{let r=p((n-e)/2e3);i[0].localThreshold=r,r<1?requestAnimationFrame(t):(E=!1,M())};requestAnimationFrame(t)},300),O=!0}catch(e){console.warn(`vfx-js failed to load, falling back to CSS sim`,e)}O||(document.getElementById(`root`).classList.add(`pxs-fallback`),C());var k=new t;(function e(t){k.raf(t),requestAnimationFrame(e)})();var A=60,j=[{el:document.querySelector(`.hero .bg img`),range:[0,.2]},{el:document.querySelector(`.section-2 .image-col .image img`),range:[.2,.4],amp:120},{el:document.querySelector(`.section-2 .section-bg`),range:[.2,.4],amp:40},{el:document.querySelector(`.section-3 .section-bg`),range:[.4,.8]},{el:document.querySelector(`.section-4 .section-bg`),range:[.8,1]}],M=e=>{for(let t of j){if(!t.el)continue;let[n,r]=t.range,i=(.5-Math.max(0,Math.min(1,(e-n)/(r-n))))*2*(t.amp??A);t.el.style.setProperty(`--parallax-y`,`${i.toFixed(2)}px`)}};k.on(`scroll`,({progress:e})=>M(e)),M(0);