import"./modulepreload-polyfill-P2Xu9kJm.js";import{t as e}from"./esm-CRRFgLjI.js";import{n as t,t as n}from"./_capture-DQwN_S4I.js";import r from"https://esm.sh/lenis";var i=`
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
`,a=`
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
`,o=`#version 300 es
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
${i}
${a}
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
`,s=`#version 300 es
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
${i}
${a}
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
        vec4 c = texture(srcHi, hiUv);
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
                vec4 c = texture(srcHi, hiUv);
                outColor = vec4(c.rgb * c.a, c.a);
            } else {
                vec4 c = texelFetch(src, toXY(i, b, axis), 0);
                outColor = vec4(c.rgb * c.a, c.a);
            }
            return;
        }
    }
    vec4 c = texture(srcHi, hiUv);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,c=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    vec4 c = texture(src, uvSrc);
    outColor = vec4(c.rgb * c.a, c.a);
}
`,l=`#version 300 es
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
`,u=`#version 300 es
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
`,d={right:{axis:0,direction:0},left:{axis:0,direction:1},down:{axis:1,direction:1},up:{axis:1,direction:0}},f={luminance:0,r:1,g:2,b:3,hue:4,saturation:5},p={range:[0,1],sortRes:128,key:`luminance`,direction:`up`,angle:0,bypass:!1},m=class{params;#e=null;#t=null;#n=null;#r=null;#i=0;#a=0;#o=0;#s=0;#c=0;#l=0;#u=0;constructor(e={}){this.params={...p,...e},this.params.range=[...this.params.range]}setParams(e){Object.assign(this.params,e),e.range&&(this.params.range=[...e.range])}#d(){this.#e?.dispose(),this.#t?.dispose(),this.#n?.dispose(),this.#r?.dispose(),this.#e=null,this.#t=null,this.#n=null,this.#r=null}#f(e){let[t,n]=e.dims.elementPixel,{axis:r}=d[this.params.direction],{angle:i}=this.params,a=this.params.sortRes,o=t,s=n;if(i!==0){let e=i*Math.PI/180,r=Math.abs(Math.cos(e)),a=Math.abs(Math.sin(e));o=Math.ceil(t*r+n*a),s=Math.ceil(t*a+n*r)}let c=r===0?Math.max(1,Math.round(a*o/t)):Math.max(1,Math.round(a*s/n)),l=r===0?c:o,u=r===0?s:c;(this.#i!==t||this.#a!==n||this.#o!==i||this.#l!==l||this.#u!==u)&&(this.#d(),this.#i=t,this.#a=n,this.#o=i,this.#s=o,this.#c=s,this.#l=l,this.#u=u,this.#e=e.createRenderTarget({size:[l,u],filter:`nearest`}),this.#t=e.createRenderTarget({size:[l,u],filter:`nearest`,float:!0}),i!==0&&(this.#n=e.createRenderTarget({size:[o,s]}),this.#r=e.createRenderTarget({size:[o,s]})))}render(e){if(this.#f(e),this.params.bypass||!this.#e||!this.#t){e.draw({frag:c,uniforms:{src:e.src},target:e.target});return}let{axis:r,direction:i}=d[this.params.direction],a=[this.#l,this.#u],[p,m]=this.params.range,h=f[this.params.key],[g,_]=e.dims.elementPixel,v=this.#n,y=this.#r,b=this.params.angle!==0&&v!==null&&y!==null,x=e.src,S=e.target,C=[1,0],w=[g,_];if(b){let t=-this.params.angle*Math.PI/180;C=[Math.cos(t),Math.sin(t)],w=[this.#s,this.#c],e.draw({frag:l,uniforms:{src:e.src,srcSize:[g,_],boxSize:w,rot:C},target:v}),x=v,S=y}b&&v!==null?t(e,v,this.#e):n(e,this.#e);let T=+!!b,E=[g,_];e.draw({frag:o,uniforms:{src:this.#e,srcSize:a,threshold:p,thresholdHigh:m,keyMode:h,direction:i,axis:r,masked:T,boxSize:w,imgSize:E,rot:C},target:this.#t}),e.draw({frag:s,uniforms:{src:this.#e,srcHi:x,rankTex:this.#t,lowSize:a,threshold:p,thresholdHigh:m,keyMode:h,axis:r,masked:T,boxSize:w,imgSize:E,rot:C},target:S}),b&&e.draw({frag:u,uniforms:{src:y,srcSize:[g,_],boxSize:w,rot:C},target:e.target})}dispose(){this.#d(),this.#i=0,this.#a=0,this.#o=0,this.#s=0,this.#c=0,this.#l=0,this.#u=0}},h={range:[0,1],sortRes:128,key:`luminance`,direction:`up`},g=[{from:0,to:.1,sec:0,bypass:!0},{from:.1,to:.2,sec:0,dir:`right`,t:[1,0]},{from:.2,to:.25,sec:1,dir:`left`,t:[0,1]},{from:.25,to:.3,sec:1,bypass:!0},{from:.3,to:.4,sec:1,dir:`right`,t:[1,0]},{from:.4,to:.45,sec:2,dir:`left`,t:[0,1]},{from:.45,to:.5,sec:2,bypass:!0},{from:.5,to:.6,sec:2,bypass:!0,sub:0,subT:[1,0],subDir:`right`},{from:.6,to:.65,sec:2,bypass:!0,sub:1,subT:[0,1],subDir:`left`},{from:.7,to:.8,sec:2,dir:`up`,t:[1,0]},{from:.8,to:.95,sec:3,dir:`down`,t:[0,1]},{from:.95,to:1.01,sec:3,bypass:!0}],_=(e,t,n)=>e+(t-e)*n,v=e=>Math.max(0,Math.min(1,e)),y=(e,t,n)=>Math.max(t,Math.min(n,e)),b=64,x=12,S=21,C=()=>{let e=document.querySelector(`.section-2 .columns`),t=document.querySelector(`.section-2 .lined`);if(!e||!t)return;let n=window.innerHeight-b,r=parseFloat(getComputedStyle(e).fontSize);for(let i=0;i<4;i++){let i=e.getBoundingClientRect().height;if(i<=0)break;let a=n-t.getBoundingClientRect().bottom;if(Math.abs(a)<1)break;r=y(r*(1+a/i),x,S),e.style.fontSize=`${r}px`}},w=[new URL(new URL(`city1-Coz3EpIx.webp`,import.meta.url).href,``+import.meta.url).href,new URL(new URL(`tower1-KQap6JXX.webp`,import.meta.url).href,``+import.meta.url).href],T=document.getElementById(`loader`),E=e=>{T.querySelector(`.bar-fill`).style.width=`${(e*100).toFixed(1)}%`,T.querySelector(`.pct`).textContent=`${Math.round(e*100)}%`},D=!1,O=()=>{D||(D=!0,T.classList.add(`done`),setTimeout(()=>T.remove(),600))},k=300,A=performance.now(),j=0,M=!1;setTimeout(O,1e4),(async()=>{let e=Array.from(document.images),t=e.length+w.length+1,n=0,r=()=>{j=++n/t},i=e.map(e=>Promise.resolve(e.decode?.()).catch(()=>{}).then(r));for(let e of w){let t=new Image;t.src=e,i.push(t.decode().catch(()=>{}).then(r))}i.push(document.fonts.ready.then(r)),await Promise.race([Promise.all(i),new Promise(e=>setTimeout(e,8e3))]),j=1,M=!0})(),await new Promise(e=>{let t=0,n=()=>{let r=performance.now()-A,i=Math.min(j,r/k);t+=(i-t)*.18,i-t<.004&&(t=i),E(t),M&&r>=k&&t>.999?(E(1),e()):requestAnimationFrame(n)};requestAnimationFrame(n)});var N=!1;try{let t=new e({scrollPadding:!1}),n=[document.querySelector(`.hero`),document.querySelector(`.section-2`),document.querySelector(`.section-3`),document.querySelector(`.section-4`)];C();let r=[],i=[];await Promise.all(n.map(async(e,n)=>{let a=new m({...h,range:[1,1]});a.enabled=!1,await t.addHTML(e,{effect:a}),r[n]=a,i[n]=e.parentElement,i[n].style.opacity=`0`,i[n].style.pointerEvents=`none`}));let a=n[2].querySelector(`.video img`);a.style.display=`none`;let o=null,s=0,c=`hidden`,l=null,u=0,d=!1,f=`right`,p=()=>{c!==`hidden`&&(++s,o&&=(t.remove(a),null),a.style.display=`none`,c=`hidden`,t.update(n[2]).catch(()=>{}))},y=async e=>{if(c===`embedded`&&l===e)return;let r=++s;o&&=(t.remove(a),null),a.src=w[e],a.style.display=``,c=`embedded`,l=e,await a.decode().catch(()=>{}),r===s&&t.update(n[2]).catch(()=>{})},b=async(e,n,r,i)=>{if(u=n,d=r,f=i,c===`standalone`&&l===e){o&&(o.enabled=!r,o.params.range[0]=n,o.params.direction=i);return}let p=++s;o&&=(t.remove(a),null),a.src=w[e],a.style.display=``,c=`standalone`,l=e;let g=new m({...h,range:[u,1],direction:f});await t.add(a,{effect:g}),p===s&&(o=g,o.enabled=!d,o.params.range[0]=u,o.params.direction=f)},x=-1,S=!0,T=(e,t,n,a)=>{x!==e&&(x>=0&&(i[x].style.opacity=`0`,i[x].style.pointerEvents=`none`,r[x].enabled=!1),i[e].style.opacity=`1`,i[e].style.pointerEvents=`auto`,x=e);let o=r[e];o.enabled=!a,a||(o.params.range[0]=t,o.params.direction=n)},E=e=>{let t=g[0];for(let n of g)if(e>=n.from)t=n;else break;return t},D=document.querySelector(`.scroll-proxy`),k=!1,A=()=>{k||(k=!0,requestAnimationFrame(()=>{if(k=!1,S)return;let e=D.offsetHeight-window.innerHeight,t=e>0?v(window.scrollY/e):0,n=E(t),r=v((t-n.from)/(n.to-n.from)),i=n.bypass===!0,a=i?1:_(n.t[0],n.t[1],r),o=n.dir??`right`;if(T(n.sec,a,o,i),n.sub!==void 0){let e=_(n.subT[0],n.subT[1],r);b(n.sub,e,e>=1,n.subDir??`right`)}else n.sec===2?y(l??0):p()}))};window.addEventListener(`scroll`,A,{passive:!0}),window.addEventListener(`resize`,A);let j;window.addEventListener(`resize`,()=>{cancelAnimationFrame(j),j=requestAnimationFrame(()=>{C(),t.update(n[1]).catch(()=>{})})}),A(),T(0,0,`up`,!1),setTimeout(()=>{O();let e=performance.now(),t=n=>{let i=v((n-e)/2e3);r[0].params.range[0]=i,i<1?requestAnimationFrame(t):(S=!1,A())};requestAnimationFrame(t)},300),N=!0}catch(e){console.warn(`vfx-js failed to load, falling back to CSS sim`,e)}N||(document.getElementById(`root`).classList.add(`pxs-fallback`),O());var P=new r;(function e(t){P.raf(t),requestAnimationFrame(e)})();var F=60,I=[{el:document.querySelector(`.hero .bg img`),range:[0,.2]},{el:document.querySelector(`.section-2 .image-col .image img`),range:[.2,.4],amp:120},{el:document.querySelector(`.section-2 .section-bg`),range:[.2,.4],amp:40},{el:document.querySelector(`.section-3 .section-bg`),range:[.4,.8]},{el:document.querySelector(`.section-4 .section-bg`),range:[.8,1]}],L=e=>{for(let t of I){if(!t.el)continue;let[n,r]=t.range,i=(.5-Math.max(0,Math.min(1,(e-n)/(r-n))))*2*(t.amp??F);t.el.style.setProperty(`--parallax-y`,`${i.toFixed(2)}px`)}};P.on(`scroll`,({progress:e})=>L(e)),L(0);