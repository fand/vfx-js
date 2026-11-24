import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./src-C8lXfRjC.js";import{a as r,c as i,i as a,n as o,o as s,r as c,s as l,t as u}from"./_bloom-common-C9FLKm3C.js";function d(e,t=[],n=new Set){if(typeof e!=`object`||!e||n.has(e))return t;if(n.add(e),ArrayBuffer.isView(e))return e.buffer instanceof ArrayBuffer&&!t.includes(e.buffer)&&t.push(e.buffer),t;if(e instanceof ArrayBuffer)return t.includes(e)||t.push(e),t;for(let r of Array.isArray(e)?e:Object.values(e))d(r,t,n);return t}var f,p;function m(){return(m=e((()=>{f=class{factory;worker=null;url=``;failed=!1;disposed=!1;local=null;id=0;jobs=new Map;source;constructor(e,t){this.factory=e,this.source=t??e.toString()}async run(e,t,n=[]){if(this.disposed)throw Error(`kernel worker disposed`);let r=this.ensure();if(r)try{return await new Promise((i,a)=>{let o=++this.id;this.jobs.set(o,{resolve:i,reject:a});try{r.postMessage({id:o,fn:e,arg:t},n)}catch(e){this.jobs.delete(o),a(new p(String(e))),this.fail()}})}catch(e){if(!(e instanceof p)||this.disposed)throw e}this.local??=this.factory();let i=this.local[e];if(typeof i!=`function`)throw Error(`kernel has no function ${e}`);return i(t)}dispose(){this.disposed=!0,this.fail(),this.failed=!0}fail(){this.worker?.terminate(),this.worker=null,this.url&&URL.revokeObjectURL(this.url),this.url=``;for(let e of this.jobs.values())e.reject(new p(`worker unavailable`));this.jobs.clear()}ensure(){if(this.failed)return null;if(this.worker)return this.worker;try{if(typeof Worker>`u`||typeof Blob>`u`)throw Error(`no workers`);let e=`"use strict";
const K = (${this.source})();
function tr(v, out, seen) {
  if (v === null || typeof v !== "object" || seen.has(v)) return out;
  seen.add(v);
  if (ArrayBuffer.isView(v)) { if (out.indexOf(v.buffer) < 0) out.push(v.buffer); return out; }
  if (v instanceof ArrayBuffer) { if (out.indexOf(v) < 0) out.push(v); return out; }
  for (const x of (Array.isArray(v) ? v : Object.values(v))) tr(x, out, seen);
  return out;
}
self.onmessage = (e) => {
  const d = e.data;
  try {
    const r = K[d.fn](d.arg);
    self.postMessage({ id: d.id, r }, tr(r, [], new Set()));
  } catch (err) {
    self.postMessage({ id: d.id, error: String((err && err.stack) || err) });
  }
};`;this.url=URL.createObjectURL(new Blob([e],{type:`text/javascript`}));let t=new Worker(this.url);t.onmessage=e=>{let t=e.data,n=this.jobs.get(t.id);n&&(this.jobs.delete(t.id),t.error===void 0?n.resolve(t.r):n.reject(Error(t.error)))},t.onerror=e=>{e.preventDefault(),this.failed=!0,this.fail()},this.worker=t}catch{this.failed=!0,this.worker=null}return this.worker}},p=class extends Error{}})))()}function h(e){let t=e.startsWith(`#`)?e.slice(1):e;return(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``)),t.length===6&&(t+=`ff`),t.length===8?[Number.parseInt(t.slice(0,2),16)/255,Number.parseInt(t.slice(2,4),16)/255,Number.parseInt(t.slice(4,6),16)/255,Number.parseInt(t.slice(6,8),16)/255]:[0,0,0,0]}var g;function _(){return(_=e((()=>{g=`
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
`})))()}function v(e,t,n={...t}){for(let r of x){let i=e[r],[a,o]=b[r];n[r]=typeof i==`number`&&Number.isFinite(i)?Math.min(Math.max(i,a),o):t[r]}return n.drag=!!e.drag,n.cameraOrigin=e.cameraOrigin===`viewport`||e.cameraOrigin===`element`?e.cameraOrigin:t.cameraOrigin,n}function ee(e,t){let n=Math.cos(e),r=Math.sin(e),i=Math.cos(t),a=Math.sin(t),o=n,s=r,c=a*r,l=i,u=-a*n;return[o,c,-i*r,0,l,a,s,u,i*n]}function y(e){let[t,n,r,i]=e.canvasRect;return[t+r/2,n+i/2]}function te(e,t,n){return Math.min(Math.max(e,t),n)}var b,x,S,ne,re,ie,ae,oe,se,ce,C;function w(){return(w=e((()=>{b={yaw:[-36e3,36e3],pitch:[-36e3,36e3],orbitAnimation:[-720,720],orbitSpeed:[0,100],fov:[1,150],zoom:[.01,100],pointerStrength:[0,100]},x=Object.keys(b),S=.13,ne=.09,re=1.3,ie=.3,ae=.006,oe=1.2,se=.25,ce=Math.PI/180,C=class{#e;#t;#n=0;#r=0;#i=!1;#a=[0,0];#o=null;#s=[0,0];#c=1;#l=[0,0];#u=!1;#d=null;#f=0;#p=0;#m=0;#h=null;constructor(e){this.#e={...e},this.#t={...e}}get pointerIn(){return this.#u}get dragging(){return this.#i}get offsets(){return{dragYaw:this.#n,dragPitch:this.#r,tiltYaw:this.#f,tiltPitch:this.#p}}update(e,t){let n=v(e,this.#e,this.#t),{dims:r}=t,[i,a]=r.elementPixel,o=t.pixelRatio;this.#s[0]=t.mouse[0]-t.mouseViewport[0],this.#s[1]=t.mouse[1]-t.mouseViewport[1],this.#c=o,this.#l[0]=i,this.#l[1]=a;let s=t.tilt?Math.min(20*n.pointerStrength,90):0,c=t.live&&typeof window<`u`;this.#g(c&&n.drag,c&&(s>0||!!t.trackPointer));let l=0,u=0;if(c&&s>0&&this.#u){let[e,n]=t.mouse,c=window.innerWidth*o||r.canvasPixel[0],d=window.innerHeight*o||r.canvasPixel[1],f=te((e-i/2)/Math.max(c/2,1),-1,1),p=te((n-a/2)/Math.max(d/2,1),-1,1),m=s*ce;l=m*f,u=-m*p}let d=Number.isFinite(t.dt)?Math.max(t.dt,0):0,f=1-Math.exp(-d/se);this.#f+=(l-this.#f)*f,this.#p+=(u-this.#p)*f;let p=Number.isFinite(t.time)?t.time:0;this.#m=this.#h===null?p*n.orbitSpeed:this.#m+(p-this.#h)*n.orbitSpeed,this.#h=p;let m=this.#m,h=n.orbitAnimation,g=(n.yaw+h*Math.sin(m*S))*ce+this.#n+this.#f,_=(n.pitch+h*ie*Math.sin(m*ne+re))*ce+this.#r+this.#p,b=1/Math.tan(n.fov*Math.PI/360),x=Math.max(i,a)/2*n.zoom,[ae,oe]=t.outputRect,C=i/2,w=a/2,le=0,ue=0,T=C,de=w;return n.cameraOrigin===`viewport`&&x>0&&([T,de]=y(r),le=(T-C)/x,ue=(de-w)/x),{viewRot:ee(g,_),camDist:b,unitPx:x,focalPx:b*x,centerPx:[C-ae,w-oe],eye:[le,ue,b],principalPx:[T-ae,de-oe],origin:[ae,oe]}}dispose(){this.#g(!1,!1),this.#n=0,this.#r=0,this.#f=0,this.#p=0,this.#m=0,this.#h=null,this.#s=[0,0],this.#l=[0,0]}#g(e,t){e?this.#_():this.#o&&(this.#o(),this.#o=null,this.#i=!1),t?this.#y():this.#d&&(this.#d(),this.#d=null,this.#u=!1)}#_(){if(this.#o)return;let e=e=>{this.#v(e.clientX,e.clientY)&&(this.#i=!0,this.#a=[e.clientX,e.clientY])},t=e=>{if(!this.#i)return;let t=e.clientX-this.#a[0],n=e.clientY-this.#a[1];this.#a=[e.clientX,e.clientY],this.#n+=t*ae,this.#r=te(this.#r+n*ae,-1.2,oe)},n=()=>{this.#i=!1},r=e=>{this.#i&&e.preventDefault()};window.addEventListener(`dragstart`,r),window.addEventListener(`selectstart`,r),window.addEventListener(`pointerdown`,e),window.addEventListener(`pointermove`,t),window.addEventListener(`pointerup`,n),window.addEventListener(`pointercancel`,n),this.#o=()=>{window.removeEventListener(`dragstart`,r),window.removeEventListener(`selectstart`,r),window.removeEventListener(`pointerdown`,e),window.removeEventListener(`pointermove`,t),window.removeEventListener(`pointerup`,n),window.removeEventListener(`pointercancel`,n)}}#v(e,t){let n=this.#c,r=e*n+this.#s[0],i=(window.innerHeight-t)*n+this.#s[1],[a,o]=this.#l;return r>=0&&i>=0&&r<=a&&i<=o}#y(){if(this.#d)return;let e=e=>{this.#u=e.clientX>=0&&e.clientY>=0&&e.clientX<window.innerWidth&&e.clientY<window.innerHeight},t=e=>{e.relatedTarget||(this.#u=!1)},n=()=>{this.#u=!1};window.addEventListener(`pointermove`,e,{passive:!0}),window.addEventListener(`pointerout`,t,{passive:!0}),window.addEventListener(`blur`,n),this.#d=()=>{window.removeEventListener(`pointermove`,e),window.removeEventListener(`pointerout`,t),window.removeEventListener(`blur`,n)}}}})))()}var le;function ue(){return(ue=e((()=>{le=`function shapeKernel() {
    const SDF_PAD = 0.3;
    const SPAWN_SIZE = 256;
    const INF = 1e20;
    function edt1d(f, n, d, v, z) {
        let k = 0;
        v[0] = 0;
        z[0] = -INF;
        z[1] = INF;
        for (let q = 1; q < n; q++) {
            let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
            while (s <= z[k]) {
                k--;
                s =
                    (f[q] + q * q - (f[v[k]] + v[k] * v[k])) /
                        (2 * q - 2 * v[k]);
            }
            k++;
            v[k] = q;
            z[k] = s;
            z[k + 1] = INF;
        }
        k = 0;
        for (let q = 0; q < n; q++) {
            while (z[k + 1] < q) {
                k++;
            }
            const dq = q - v[k];
            d[q] = dq * dq + f[v[k]];
        }
    }
    function edt2d(grid, w, h) {
        const n = Math.max(w, h);
        const f = new Float64Array(n);
        const d = new Float64Array(n);
        const v = new Int32Array(n);
        const z = new Float64Array(n + 1);
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                f[y] = grid[y * w + x];
            }
            edt1d(f, h, d, v, z);
            for (let y = 0; y < h; y++) {
                grid[y * w + x] = d[y];
            }
        }
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                f[x] = grid[y * w + x];
            }
            edt1d(f, w, d, v, z);
            for (let x = 0; x < w; x++) {
                grid[y * w + x] = d[x];
            }
        }
    }
    function mulberry32(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function boxBlur1d(data, start, stride, n, r, line) {
        for (let i = 0; i < n; i++) {
            line[i] = data[start + i * stride];
        }
        let sum = 0;
        for (let i = 0; i < Math.min(r, n); i++) {
            sum += line[i];
        }
        for (let i = 0; i < n; i++) {
            if (i + r < n) {
                sum += line[i + r];
            }
            if (i - r - 1 >= 0) {
                sum -= line[i - r - 1];
            }
            const cnt = Math.min(i + r, n - 1) - Math.max(i - r, 0) + 1;
            data[start + i * stride] = sum / cnt;
        }
    }
    function insideTest(pixels, channel) {
        const scale = pixels instanceof Float32Array ? 1 : 1 / 255;
        if (channel === "none") {
            return () => true;
        }
        if (channel === "luminance") {
            return (i) => (0.2126 * pixels[i] +
                0.7152 * pixels[i + 1] +
                0.0722 * pixels[i + 2]) *
                scale >=
                0.5;
        }
        return (i) => pixels[i + 3] * scale >= 0.5;
    }
    function buildShape(pixels, mw, mh, channel, aspect, smoothRadius = 1, smoothPasses = 1, withSpawn = true) {
        const isInside = insideTest(pixels, channel);
        const mLong = Math.max(mw, mh);
        const pad = Math.round(mLong * SDF_PAD);
        const W = mw + pad * 2;
        const H = mh + pad * 2;
        const inside = new Uint8Array(W * H);
        let insideCount = 0;
        for (let y = 0; y < mh; y++) {
            for (let x = 0; x < mw; x++) {
                if (isInside((y * mw + x) * 4)) {
                    inside[(y + pad) * W + x + pad] = 1;
                    insideCount++;
                }
            }
        }
        if (insideCount < 16) {
            return null;
        }
        const toOut = new Float64Array(W * H);
        const toIn = new Float64Array(W * H);
        for (let i = 0; i < W * H; i++) {
            toOut[i] = inside[i] ? 0 : INF;
            toIn[i] = inside[i] ? INF : 0;
        }
        edt2d(toOut, W, H);
        edt2d(toIn, W, H);
        const sd = new Float32Array(W * H);
        for (let i = 0; i < W * H; i++) {
            sd[i] = inside[i]
                ? -(Math.sqrt(toIn[i]) - 0.5)
                : Math.sqrt(toOut[i]) - 0.5;
        }
        const r = Math.max(Math.round(smoothRadius), 0);
        if (r > 0) {
            const line = new Float32Array(Math.max(W, H));
            for (let pass = 0; pass < Math.max(smoothPasses, 0); pass++) {
                for (let y = 0; y < H; y++) {
                    boxBlur1d(sd, y * W, 1, W, r, line);
                }
                for (let x = 0; x < W; x++) {
                    boxBlur1d(sd, x, W, H, r, line);
                }
            }
        }
        const px = 2 / mLong;
        const minX = -(mw / 2 + pad) * px;
        const minY = -(mh / 2 + pad) * px;
        const sdf = new Float32Array(W * H * 4);
        const gradX = new Float32Array(W * H);
        const gradY = new Float32Array(W * H);
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const i = y * W + x;
                const l = sd[y * W + Math.max(x - 1, 0)];
                const r = sd[y * W + Math.min(x + 1, W - 1)];
                const b = sd[Math.max(y - 1, 0) * W + x];
                const t = sd[Math.min(y + 1, H - 1) * W + x];
                let gx = r - l;
                let gy = t - b;
                const gl = Math.hypot(gx, gy);
                if (gl > 1e-6) {
                    gx /= gl;
                    gy /= gl;
                }
                else {
                    gx = 0;
                    gy = 0;
                }
                gradX[i] = gx;
                gradY[i] = gy;
                sdf[i * 4] = sd[i] * px;
                sdf[i * 4 + 1] = gx;
                sdf[i * 4 + 2] = gy;
            }
        }
        const sdfRect = [
            minX,
            minY,
            W * px,
            H * px,
        ];
        const shapeHalf = [mw / mLong, mh / mLong];
        if (!withSpawn) {
            return {
                sdf,
                sdfW: W,
                sdfH: H,
                sdfRect,
                shapeHalf,
                spawn: new Float32Array(0),
                spawnSide: 0,
                spawnCap: 0,
                aspect,
            };
        }
        const insideIdx = [];
        const edgeIdx = [];
        for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
                const i = y * W + x;
                if (!inside[i]) {
                    continue;
                }
                insideIdx.push(i);
                if (!inside[i - 1] ||
                    !inside[i + 1] ||
                    !inside[i - W] ||
                    !inside[i + W]) {
                    edgeIdx.push(i);
                }
            }
        }
        const capArea = insideIdx.length * px * px * 2;
        const sideLength = edgeIdx.length * 1.15 * px;
        const rand = mulberry32(0x5eed1234);
        const total = SPAWN_SIZE * SPAWN_SIZE;
        const spawn = new Float32Array(total * 4);
        for (let k = 0; k < total; k++) {
            const o = k * 4;
            if (k < total / 2 && edgeIdx.length > 0) {
                const i = edgeIdx[Math.floor(rand() * edgeIdx.length)];
                const x = i % W;
                const y = (i - x) / W;
                const d = sd[i];
                const wx = minX + (x + 0.5 + (rand() - 0.5) * 0.5) * px;
                const wy = minY + (y + 0.5 + (rand() - 0.5) * 0.5) * px;
                spawn[o] = wx - gradX[i] * d * px;
                spawn[o + 1] = wy - gradY[i] * d * px;
                spawn[o + 2] = rand() * 2 - 1;
            }
            else {
                const i = insideIdx[Math.floor(rand() * insideIdx.length)];
                const x = i % W;
                const y = (i - x) / W;
                spawn[o] = minX + (x + rand()) * px;
                spawn[o + 1] = minY + (y + rand()) * px;
                spawn[o + 2] = rand() < 0.5 ? -1 : 1;
            }
        }
        return {
            sdf,
            sdfW: W,
            sdfH: H,
            sdfRect,
            shapeHalf,
            spawn,
            spawnSide: edgeIdx.length > 0 ? sideLength : 0,
            spawnCap: capArea,
            aspect,
        };
    }
    function reliefLuminance(pixels, mw, mh, shape) {
        const scale = pixels instanceof Float32Array ? 1 : 1 / 255;
        const W = shape.sdfW;
        const pad = Math.round((W - mw) / 2);
        const h = new Float32Array(W * shape.sdfH);
        for (let y = 0; y < mh; y++) {
            for (let x = 0; x < mw; x++) {
                const i = (y * mw + x) * 4;
                const l = 0.2126 * pixels[i] +
                    0.7152 * pixels[i + 1] +
                    0.0722 * pixels[i + 2];
                h[(y + pad) * W + x + pad] = Math.min(Math.max(l * scale, 0), 1);
            }
        }
        return h;
    }
    function reliefRadius(blur, shape, maxRadius) {
        const px = shape.sdfRect[2] / shape.sdfW;
        const r = Number.isFinite(blur)
            ? Math.round(Math.max(blur, 0) / px)
            : 0;
        return Math.min(r, maxRadius);
    }
    function buildRelief(lum, shape, radius, passes) {
        const W = shape.sdfW;
        const H = shape.sdfH;
        const h = lum.slice();
        const line = new Float32Array(Math.max(W, H));
        for (let pass = 0; pass < passes; pass++) {
            for (let y = 0; y < H; y++) {
                boxBlur1d(h, y * W, 1, W, radius, line);
            }
            for (let x = 0; x < W; x++) {
                boxBlur1d(h, x, W, H, radius, line);
            }
        }
        const inv = 1 / (2 * (shape.sdfRect[2] / W));
        const out = new Float32Array(W * H * 4);
        let maxGrad = 0;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const i = y * W + x;
                const gx = (h[y * W + Math.min(x + 1, W - 1)] -
                    h[y * W + Math.max(x - 1, 0)]) *
                    inv;
                const gy = (h[Math.min(y + 1, H - 1) * W + x] -
                    h[Math.max(y - 1, 0) * W + x]) *
                    inv;
                out[i * 4] = h[i];
                out[i * 4 + 1] = gx;
                out[i * 4 + 2] = gy;
                maxGrad = Math.max(maxGrad, Math.hypot(gx, gy));
            }
        }
        return { map: out, maxGrad };
    }
    function buildReliefJob(a) {
        return buildRelief(a.lum, a, a.radius, a.passes);
    }
    function buildShapeJob(a) {
        const shape = buildShape(a.pixels, a.mw, a.mh, a.channel, a.aspect, a.smoothRadius, a.smoothPasses, a.spawn);
        if (!shape) {
            return null;
        }
        let relief = null;
        if (a.relief) {
            const lum = reliefLuminance(a.pixels, a.mw, a.mh, shape);
            const radius = reliefRadius(a.relief.blur, shape, a.relief.maxRadius);
            relief = {
                lum,
                radius,
                ...buildRelief(lum, shape, radius, a.relief.passes),
            };
        }
        return { ...shape, relief };
    }
    return {
        SPAWN_SIZE,
        buildShape,
        buildShapeJob,
        buildRelief,
        buildReliefJob,
        reliefRadius,
    };
}`})))()}function T(){let e=0x56bc75e2d63100000;function t(t,n,r,i,a){let o=0;i[0]=0,a[0]=-0x56bc75e2d63100000,a[1]=e;for(let r=1;r<n;r++){let n=(t[r]+r*r-(t[i[o]]+i[o]*i[o]))/(2*r-2*i[o]);for(;n<=a[o];)o--,n=(t[r]+r*r-(t[i[o]]+i[o]*i[o]))/(2*r-2*i[o]);o++,i[o]=r,a[o]=n,a[o+1]=e}o=0;for(let e=0;e<n;e++){for(;a[o+1]<e;)o++;let n=e-i[o];r[e]=n*n+t[i[o]]}}function n(e,n,r){let i=Math.max(n,r),a=new Float64Array(i),o=new Float64Array(i),s=new Int32Array(i),c=new Float64Array(i+1);for(let i=0;i<n;i++){for(let t=0;t<r;t++)a[t]=e[t*n+i];t(a,r,o,s,c);for(let t=0;t<r;t++)e[t*n+i]=o[t]}for(let i=0;i<r;i++){for(let t=0;t<n;t++)a[t]=e[i*n+t];t(a,n,o,s,c);for(let t=0;t<n;t++)e[i*n+t]=o[t]}}function r(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function i(e,t,n,r,i,a){for(let i=0;i<r;i++)a[i]=e[t+i*n];let o=0;for(let e=0;e<Math.min(i,r);e++)o+=a[e];for(let s=0;s<r;s++){s+i<r&&(o+=a[s+i]),s-i-1>=0&&(o-=a[s-i-1]);let c=Math.min(s+i,r-1)-Math.max(s-i,0)+1;e[t+s*n]=o/c}}function a(e,t){let n=e instanceof Float32Array?1:1/255;return t===`none`?()=>!0:t===`luminance`?t=>(.2126*e[t]+.7152*e[t+1]+.0722*e[t+2])*n>=.5:t=>e[t+3]*n>=.5}function o(t,o,s,c,l,u=1,d=1,f=!0){let p=a(t,c),m=Math.max(o,s),h=Math.round(m*.3),g=o+h*2,_=s+h*2,v=new Uint8Array(g*_),ee=0;for(let e=0;e<s;e++)for(let t=0;t<o;t++)p((e*o+t)*4)&&(v[(e+h)*g+t+h]=1,ee++);if(ee<16)return null;let y=new Float64Array(g*_),te=new Float64Array(g*_);for(let t=0;t<g*_;t++)y[t]=v[t]?0:e,te[t]=v[t]?e:0;n(y,g,_),n(te,g,_);let b=new Float32Array(g*_);for(let e=0;e<g*_;e++)b[e]=v[e]?-(Math.sqrt(te[e])-.5):Math.sqrt(y[e])-.5;let x=Math.max(Math.round(u),0);if(x>0){let e=new Float32Array(Math.max(g,_));for(let t=0;t<Math.max(d,0);t++){for(let t=0;t<_;t++)i(b,t*g,1,g,x,e);for(let t=0;t<g;t++)i(b,t,g,_,x,e)}}let S=2/m,ne=-(o/2+h)*S,re=-(s/2+h)*S,ie=new Float32Array(g*_*4),ae=new Float32Array(g*_),oe=new Float32Array(g*_);for(let e=0;e<_;e++)for(let t=0;t<g;t++){let n=e*g+t,r=b[e*g+Math.max(t-1,0)],i=b[e*g+Math.min(t+1,g-1)],a=b[Math.max(e-1,0)*g+t],o=b[Math.min(e+1,_-1)*g+t],s=i-r,c=o-a,l=Math.hypot(s,c);l>1e-6?(s/=l,c/=l):(s=0,c=0),ae[n]=s,oe[n]=c,ie[n*4]=b[n]*S,ie[n*4+1]=s,ie[n*4+2]=c}let se=[ne,re,g*S,_*S],ce=[o/m,s/m];if(!f)return{sdf:ie,sdfW:g,sdfH:_,sdfRect:se,shapeHalf:ce,spawn:new Float32Array,spawnSide:0,spawnCap:0,aspect:l};let C=[],w=[];for(let e=1;e<_-1;e++)for(let t=1;t<g-1;t++){let n=e*g+t;v[n]&&(C.push(n),v[n-1]&&v[n+1]&&v[n-g]&&v[n+g]||w.push(n))}let le=C.length*S*S*2,ue=w.length*1.15*S,T=r(1592594996),de=65536,E=new Float32Array(de*4);for(let e=0;e<de;e++){let t=e*4;if(e<de/2&&w.length>0){let e=w[Math.floor(T()*w.length)],n=e%g,r=(e-n)/g,i=b[e],a=ne+(n+.5+(T()-.5)*.5)*S,o=re+(r+.5+(T()-.5)*.5)*S;E[t]=a-ae[e]*i*S,E[t+1]=o-oe[e]*i*S,E[t+2]=T()*2-1}else{let e=C[Math.floor(T()*C.length)],n=e%g,r=(e-n)/g;E[t]=ne+(n+T())*S,E[t+1]=re+(r+T())*S,E[t+2]=T()<.5?-1:1}}return{sdf:ie,sdfW:g,sdfH:_,sdfRect:se,shapeHalf:ce,spawn:E,spawnSide:w.length>0?ue:0,spawnCap:le,aspect:l}}function s(e,t,n,r){let i=e instanceof Float32Array?1:1/255,a=r.sdfW,o=Math.round((a-t)/2),s=new Float32Array(a*r.sdfH);for(let r=0;r<n;r++)for(let n=0;n<t;n++){let c=(r*t+n)*4,l=.2126*e[c]+.7152*e[c+1]+.0722*e[c+2];s[(r+o)*a+n+o]=Math.min(Math.max(l*i,0),1)}return s}function c(e,t,n){let r=t.sdfRect[2]/t.sdfW,i=Number.isFinite(e)?Math.round(Math.max(e,0)/r):0;return Math.min(i,n)}function l(e,t,n,r){let a=t.sdfW,o=t.sdfH,s=e.slice(),c=new Float32Array(Math.max(a,o));for(let e=0;e<r;e++){for(let e=0;e<o;e++)i(s,e*a,1,a,n,c);for(let e=0;e<a;e++)i(s,e,a,o,n,c)}let l=1/(2*(t.sdfRect[2]/a)),u=new Float32Array(a*o*4),d=0;for(let e=0;e<o;e++)for(let t=0;t<a;t++){let n=e*a+t,r=(s[e*a+Math.min(t+1,a-1)]-s[e*a+Math.max(t-1,0)])*l,i=(s[Math.min(e+1,o-1)*a+t]-s[Math.max(e-1,0)*a+t])*l;u[n*4]=s[n],u[n*4+1]=r,u[n*4+2]=i,d=Math.max(d,Math.hypot(r,i))}return{map:u,maxGrad:d}}function u(e){return l(e.lum,e,e.radius,e.passes)}function d(e){let t=o(e.pixels,e.mw,e.mh,e.channel,e.aspect,e.smoothRadius,e.smoothPasses,e.spawn);if(!t)return null;let n=null;if(e.relief){let r=s(e.pixels,e.mw,e.mh,t),i=c(e.relief.blur,t,e.relief.maxRadius);n={lum:r,radius:i,...l(r,t,i,e.relief.passes)}}return{...t,relief:n}}return{SPAWN_SIZE:256,buildShape:o,buildShapeJob:d,buildRelief:l,buildReliefJob:u,reliefRadius:c}}var de,E,fe,pe,me,he,ge,_e;function ve(){return(ve=e((()=>{de=`
uniform sampler2D sdfTex;
uniform vec4 sdfRect;
uniform float halfDepth;
uniform float rounding;

vec3 sd2(vec2 p) {
    vec2 uv = (p - sdfRect.xy) / sdfRect.zw;
    vec2 cuv = clamp(uv, 0.0, 1.0);
    vec4 s = texture(sdfTex, cuv);
    vec2 outside = (uv - cuv) * sdfRect.zw;
    float lo = length(outside);
    vec2 g = lo > 0.0 ? normalize(outside + s.gb * 0.05) : s.gb;
    float gl = length(g);
    return vec3(s.r + lo, gl > 1e-5 ? g / gl : vec2(0.0, 1.0));
}
`,E=`
// The extrusion of a 2D sample s (from sd2) at depth z.
// x = distance, yzw = unit gradient.
vec4 extrude(vec3 s, float z) {
    float sz = z >= 0.0 ? 1.0 : -1.0;
    vec2 w = vec2(s.x + rounding, abs(z) - halfDepth + rounding);
    if (w.x > 0.0 && w.y > 0.0) {
        float l = length(w);
        return vec4(l - rounding, vec3(s.yz * w.x, sz * w.y) / l);
    }
    if (w.x > w.y) {
        return vec4(w.x - rounding, s.yz, 0.0);
    }
    return vec4(w.y - rounding, 0.0, 0.0, sz);
}

vec4 sdf3(vec3 p) {
    return extrude(sd2(p.xy), p.z);
}
`,fe=de+E,{SPAWN_SIZE:pe,buildShape:me,buildShapeJob:he,buildRelief:ge,reliefRadius:_e}=T()})))()}function ye(){return Se??=new f(T,le),Se}function be(e){return ye().run(`buildShapeJob`,e,[e.pixels.buffer])}function xe(e){return ye().run(`buildReliefJob`,e)}var Se;function Ce(){return(Ce=e((()=>{m(),ue(),ve(),Se=null})))()}function we(e,t){e.draw({frag:Ee,uniforms:{src:e.src},target:t})}function Te(e,t,n){e.draw({frag:De,uniforms:{src:t},target:n})}var Ee,De;function Oe(){return(Oe=e((()=>{Ee=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
void main() {
    outColor = texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}
`,De=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`})))()}function ke(e){return e===`luminance`||e===`none`?e:`alpha`}var Ae;function je(){return(je=e((()=>{Oe(),Ae=class{#e;#t=0;#n=`capture`;#r=0;#i=3;#a=0;#o=0;#s=[0,0];#c=0;constructor(e){this.#e=e}get phase(){return this.#n}update(e){this.#n===`idle`&&this.#l(e),this.#n===`capture`&&this.#d(e)}refresh(){this.#n===`reading`&&this.#t++,this.#n=`capture`,this.#r=0,this.#i=3}contextRestored(){this.#t++,this.#n===`reading`&&(this.#n=`capture`,this.#r=0)}reset(){this.#t++,this.#n=`capture`,this.#r=0,this.#i=3,this.#a=0,this.#o=0,this.#s[0]=0,this.#s[1]=0,this.#c=0}#l(e){let[t,n]=e.dims.elementPixel;if(!(t>=1&&n>=1))return;let r=t!==this.#s[0]||n!==this.#s[1];this.#s[0]=t,this.#s[1]=n,this.#c=r?0:this.#c+1,!(this.#c<5)&&(Math.abs(t/n/this.#a-1)>.01||this.#u(t,n)>this.#o*1.25)&&this.refresh()}#u(e,t){let{longSide:n,minLongSide:r}=this.#e;return r===void 0?n:Math.round(Math.min(Math.max(Math.max(e,t),r),n))}#d(e){let[t,n]=e.dims.elementPixel;if(e.src.width===0||e.src.height===0||!(t>=1&&n>=1)||++this.#r<this.#i)return;let r=this.#u(t,n),i=t/n,a=Math.max(1,i>=1?r:Math.round(r*i)),o=Math.max(1,i>=1?Math.round(r/i):r),s=e.createRenderTarget({size:[a,o]});we(e,s),this.#n=`reading`;let c=this.#t,l=this.#e.read?e.readPixels(s,this.#e.read):e.readPixels(s);s.dispose();let u=e=>{this.#r=0,e&&(this.#i=Math.min(this.#i*2,120)),this.#n=`capture`},d=()=>c===this.#t;l.then(e=>{if(!d())return;let t=e=>{d()&&(e?(this.#a=i,this.#o=r,this.#n=`idle`):u(!0))},n=this.#e.onRead({pixels:e,width:a,height:o,aspect:i},d);typeof n==`boolean`?t(n):n.then(t,()=>t(!1))},()=>{d()&&u(!1)})}}})))()}function Me(e){let t=Ne(e);return 2**Math.ceil(Math.log2(Math.sqrt(t)))}function Ne(e){return Number.isFinite(e)?Math.max(1,Math.floor(e)):1}function Pe(e){let t=e|0;return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function Fe(e){return Math.min(Be,Math.max(0,e))}var Ie,Le,Re,ze,Be;function Ve(){return(Ve=e((()=>{Ie=new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),Le=`
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,Re=`#version 300 es
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
`,ze=`#version 300 es
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
`,Be=.1})))()}function He(e){return Object.freeze(e.map(e=>Object.freeze(e)))}function Ue(e,t){if(!e)return 0;let n=e.spawnSide*2*t,r=n+e.spawnCap;return r>0?n/r:0}function We(e){let t=e.getParameter(e.MAX_TEXTURE_SIZE),n=Math.floor(t/Math.max(pt,mt)),r=2**Math.floor(Math.log2(Math.max(n,1)));return Math.min(nt,r*r)}function Ge(e){return`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
#define ${e.toUpperCase()}
#define TRAIL_SAMPLES ${ft}
#define HIST_COLS ${pt}

uniform int idOffset;
// Instances from here on are spare room in the geometry: drawn as nothing.
uniform int idEnd;
#ifdef FIREFLY
uniform float fireflyIntensity;
uniform vec3 fireflyColor;
uniform float time;
#else
in vec2 position;
uniform sampler2D velTex;
uniform float streak;
uniform sampler2D histTex;
// Newest first: slot in the history atlas, and seconds since it was written.
uniform float histSlot[TRAIL_SAMPLES];
uniform float histAgo[TRAIL_SAMPLES];
uniform sampler2D attrA;
#endif
#ifdef BODY
in float seg;
#endif
#ifdef SHADOW
// Towards the light, z > 0; the page is at view z = -shadowDepth
// (shadowDistance behind the front face, so shadowDepth can be negative).
uniform vec3 shadowLight;
uniform float shadowDepth;
#endif

uniform sampler2D posTex;
uniform int stateWidth;
uniform mat3 viewRot;
uniform float camDist;
uniform float camNear;
uniform float camFar;
uniform float focalPx;
// The eye in view space is (eye, camDist); its axis meets the buffer at
// principalPx (see _orbit-camera.ts).
uniform vec2 eye;
uniform vec2 principalPx;
uniform vec2 bufferPx;
uniform float pointPx;

out vec3 vColor;
out vec2 vLocal;
out vec2 vShape;

${wt}

void cull() {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vColor = vec3(0.0);
    vLocal = vec2(0.0);
    vShape = vec2(0.0);
}

// Camera space: xy in buffer px, z = distance from the camera.
vec3 project(vec3 p) {
    vec3 q = viewRot * p;
#ifdef SHADOW
    // Flatten onto the page along the light. Points behind the page
    // (the page cuts the shape when shadowDistance is under depth) lie
    // on it.
    q -= shadowLight * (max(q.z + shadowDepth, 0.0) / shadowLight.z);
#endif
    float depth = camDist - q.z;
    return vec3(principalPx + (q.xy - eye) * focalPx / max(depth, 1e-3), depth);
}

#ifndef FIREFLY
vec4 histAt(int k, ivec2 texel) {
    int slot = int(histSlot[k]);
    ivec2 o = ivec2(slot % HIST_COLS, slot / HIST_COLS) * stateWidth;
    return texelFetch(histTex, o + texel, 0);
}
#endif

void main() {
    int i = gl_InstanceID + idOffset;
    if (i >= idEnd) {
        cull();
        return;
    }
    ivec2 texel = ivec2(i % stateWidth, i / stateWidth);
    uint id = uint(i);
    vec4 P = texelFetch(posTex, texel, 0);
    vec3 p = P.xyz;
    float ageN = P.w;

    // Grow in, shrink out: opaque particles can't fade.
    float lifeScale = smoothstep(0.0, 0.08, ageN) * (1.0 - smoothstep(0.85, 1.0, ageN));
    vec3 c = project(p);
    if (lifeScale <= 0.01 || c.z < camNear) {
        cull();
        return;
    }
    float persp = camDist / c.z;
    float r = rnd(id * 2246822519u + 13u);

#ifdef FIREFLY
    float zLin = (c.z - camNear) / (camFar - camNear);
    float flick = pow(0.5 + 0.5 * sin(time * (3.0 + r * 5.0) + r * 40.0), 6.0);
    // Nudge towards the camera so the fibres don't bury every sparkle.
    zLin -= 0.03 / (camFar - camNear);
    gl_Position = vec4(c.xy / bufferPx * 2.0 - 1.0, zLin * 2.0 - 1.0, 1.0);
    gl_PointSize = pointPx * persp * (1.4 + 1.6 * flick) * lifeScale;
    vColor = fireflyColor * fireflyIntensity * (0.25 + 1.75 * flick);
    vLocal = vec2(0.0);
    vShape = vec2(0.0);
#else
    vec4 A = texelFetch(attrA, texel, 0);
    float off = A.w;
    float w = max(pointPx * persp * lifeScale * mix(1.0, 0.6, off), 1.0);
#ifdef BODY
    int sg = int(seg + 0.5);
#else
    int sg = 0;
#endif

    // Walk the trail from the head to segment sg. Point j + 1 is history
    // sample j. A sample from another generation (written before the
    // particle's last respawn, or never written: -1) ends the trail, so a
    // respawn never draws a line back. The trail is cut at \`streak\`
    // seconds and, like a speed cap, at 14 widths on screen per 0.3 s of
    // streak (the default), never fewer than 14.
    float gen = texelFetch(velTex, texel, 0).w;
    float capLen = w * 14.0 * max(streak / 0.3, 1.0);
    float used = 0.0;
    vec3 pa = p;
    vec3 ca = c;
    float agoA = 0.0;
    vec3 cb = c;
    bool reached = false;
    for (int j = 0; j < TRAIL_SAMPLES; j++) {
        vec4 h = histAt(j, texel);
        float ago = histAgo[j];
        // ago == agoA: the newest sample was written this frame.
        bool valid = agoA < streak && used < capLen && ago >= agoA
            && abs(h.w - gen) < 0.5;
        vec3 cn = ca;
        vec3 pn = pa;
        if (valid) {
            float f = ago > agoA ? min((streak - agoA) / (ago - agoA), 1.0) : 1.0;
            pn = mix(pa, h.xyz, f);
            cn = project(pn);
            float l = length(cn.xy - ca.xy);
            float room = capLen - used;
            if (l > room) {
                float k = room / l;
                cn = mix(ca, cn, k);
                pn = mix(pa, pn, k);
                l = room;
            }
            used += l;
        }
        if (j == sg) {
            cb = cn;
            // The head segment always draws, as a dot if need be.
            reached = valid || sg == 0;
            break;
        }
        if (!valid) {
            break;
        }
        pa = pn;
        ca = cn;
        agoA = ago;
    }
    if (!reached) {
        cull();
        return;
    }

    // Quad from the segment's start (ca, towards the head) to its end,
    // ws wide and ws / 2 longer at each end. The body draws it whole, the
    // shadow cuts a capsule out of it.
    float ws = w * mix(1.0, 0.55, clamp(agoA / max(streak, 1e-4), 0.0, 1.0));
#ifdef SHADOW
    // The coverage target is half-res: twice as wide (at least one of its
    // texels), so the dense body reads as solid rather than speckled.
    ws = max(ws * 2.0, 2.0);
#endif
    vec2 d = ca.xy - cb.xy;
    float len = length(d);
    vec2 ax = len > 1e-3 ? d / len : vec2(1.0, 0.0);
    vec2 pe = vec2(-ax.y, ax.x);
    vec2 mid = ca.xy - ax * len * 0.5;
    vec2 local = position * vec2(len + ws, ws);
    vec2 px = mid + ax * local.x + pe * local.y;
    float zA = clamp((ca.z - camNear) / (camFar - camNear), 0.0, 1.0);
    float zB = clamp((cb.z - camNear) / (camFar - camNear), 0.0, 1.0);
    float zLin = mix(zB, zA, position.x + 0.5);
    gl_Position = vec4(px / bufferPx * 2.0 - 1.0, zLin * 2.0 - 1.0, 1.0);
    vLocal = local;
    vShape = vec2(len * 0.5, ws * 0.5);

#ifdef BODY
    vColor = A.rgb;
#else
    vColor = vec3(1.0);
#endif
#endif
}
`}function Ke(e,t,n){return Math.min(Math.max(e,t),n)}function qe(e,t){let n=typeof e==`string`&&Wt.test(e)?e:t,r=Gt.get(n);if(!r){Gt.size>=64&&Gt.clear();let[e,t,i]=h(n);r=[e,t,i],Gt.set(n,r)}return r}function Je(e,t){let n=Array.isArray(e)?e:[],[r,i,a]=[Number(n[0]),Number(n[1]),Number(n[2])],o=Math.hypot(r,i,a);!Number.isFinite(o)||o<1e-6?Je(D.lightDirection,t):(t[0]=r/o,t[1]=i/o,t[2]=a/o)}function Ye(e,t){let n=t??{light:[0,0,1]};for(let t of Ut){let r=e[t],[i,a]=Ht[t];n[t]=typeof r==`number`&&Number.isFinite(r)?Ke(r,i,a):D[t]}return n.count=Math.floor(n.count),n.pad=l(e.pad,D.pad),n.shadow=!!e.shadow,n.drag=!!e.drag,n.cameraOrigin=e.cameraOrigin===`viewport`?`viewport`:`element`,n.antialias=!!e.antialias,n.pointer=e.pointer===`repel`||e.pointer===`tilt`?e.pointer:`none`,Je(e.lightDirection,n.light),n.lightColor=qe(e.lightColor,D.lightColor),n.fireflyColor=qe(e.fireflyColor,D.fireflyColor),n.shadowColor=qe(e.shadowColor,D.shadowColor),n}function Xe(e){let t=typeof e==`string`?tt[e]:Array.isArray(e)?e.filter(e=>e&&typeof e==`object`):null;return t&&t.length>0?t:tt.nebula}function Ze(e){let t=Xe(e).map(e=>({offset:Number.isFinite(e.offset)?Ke(e.offset,0,1):0,rgb:qe(e.color,`#000000`)})).sort((e,t)=>e.offset-t.offset),n=new Uint8Array(ot*4),r=0;for(let e=0;e<ot;e++){let i=e/255;for(;r<t.length-1&&t[r+1].offset<i;)r++;let a=t[r],o=t[Math.min(r+1,t.length-1)],s=0;s=i<=a.offset?0:i>=o.offset?1:(i-a.offset)/Math.max(o.offset-a.offset,1e-6);for(let t=0;t<3;t++){let r=a.rgb[t]+(o.rgb[t]-a.rgb[t])*s;n[e*4+t]=Math.round(r*255)}n[e*4+3]=255}return n}function Qe(e){if(e<=0)return 0;let t=2**Math.max(Math.floor(Math.log2(e))-3,0);return Math.ceil(e/t)*t}function $e(e,t=ft){let n=[-.5,-.5,.5,-.5,.5,.5,-.5,.5],r=new Float32Array(t*8),i=new Float32Array(t*4),a=new Uint16Array(t*6);for(let e=0;e<t;e++){r.set(n,e*8),i.fill(e,e*4,e*4+4);let t=e*4;a.set([t,t+1,t+2,t,t+2,t+3],e*6)}return{attributes:{position:{data:r,itemSize:2},seg:{data:i,itemSize:1}},indices:a,instanceCount:e}}function et(e,t,n){let r=Ke((n-e)/(t-e),0,1);return r*r*(3-2*r)}var tt,D,nt,rt,it,at,ot,st,ct,lt,ut,dt,ft,pt,mt,ht,gt,_t,vt,yt,bt,xt,St,Ct,wt,Tt,Et,Dt,Ot,kt,At,jt,Mt,Nt,Pt,Ft,It,Lt,Rt,zt,Bt,Vt,Ht,Ut,Wt,Gt,Kt,qt;function Jt(){return(Jt=e((()=>{a(),_(),w(),s(),Ve(),Ce(),ve(),je(),tt=Object.freeze({nebula:He([{offset:0,color:`#0e1554`},{offset:.45,color:`#3a50d4`},{offset:.8,color:`#c478e0`},{offset:1,color:`#f4e6ff`}]),ember:He([{offset:0,color:`#2a0603`},{offset:.45,color:`#b0260c`},{offset:.8,color:`#ff9a2e`},{offset:1,color:`#fff3cf`}]),aurora:He([{offset:0,color:`#03262a`},{offset:.45,color:`#0d8f72`},{offset:.8,color:`#5cf2b0`},{offset:1,color:`#e4fffb`}]),mono:He([{offset:0,color:`#141519`},{offset:.45,color:`#4b4f58`},{offset:.8,color:`#b4b8c0`},{offset:1,color:`#ffffff`}]),sakura:He([{offset:0,color:`#3b0d2f`},{offset:.45,color:`#a8357a`},{offset:.8,color:`#f5a3c7`},{offset:1,color:`#fff2f7`}]),ocean:He([{offset:0,color:`#021a35`},{offset:.45,color:`#0a61a3`},{offset:.8,color:`#2fc6da`},{offset:1,color:`#e9fcff`}])}),D={count:65536,depth:.22,swirl:1,curl:.8,curlScale:2.2,speed:.14,attract:10,peel:.8,life:4,intro:1.5,pointSize:1.4,streak:.3,fireflyRatio:.01,fireflyIntensity:6,fireflyColor:`#ffd2ec`,bloom:.9,palette:`nebula`,sourceColor:0,sourceChannel:`alpha`,lightDirection:[-.45,.75,.55],lightColor:`#ffffff`,lightIntensity:1,ambient:.25,occlusion:.7,glint:.7,shadow:!1,shadowOpacity:.35,shadowSoftness:14,shadowDistance:.26,shadowColor:`#1c2233`,yaw:0,pitch:0,orbitAnimation:23,orbitSpeed:1,fov:35,zoom:1,drag:!1,cameraOrigin:`element`,pointer:`none`,pointerRadius:120,pointerStrength:1,pad:200,antialias:!1},nt=1<<20,rt=6,it=.85,at=1,ot=256,st=1/30,ct=3,lt=90,ut=.05/3.2,dt=2.875,ft=6,pt=Math.ceil(Math.sqrt(ft)),mt=Math.ceil(ft/pt),ht=1e9,gt=1024,_t=.05,vt=6,yt=.1,bt=.15,xt=.06,St=4,Ct=`
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoiseGrad(vec3 v, out vec3 gradient) {
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
    vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
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
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    vec4 m2 = m * m;
    vec4 m4 = m2 * m2;
    vec4 pdotx = vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3));
    vec4 temp = m2 * m * pdotx;
    gradient = -8.0 * (temp.x * x0 + temp.y * x1 + temp.z * x2 + temp.w * x3);
    gradient += m4.x * p0 + m4.y * p1 + m4.z * p2 + m4.w * p3;
    gradient *= 105.0;
    return 105.0 * dot(m4, pdotx);
}
`,wt=`
uint pcg(uint v) {
    uint s = v * 747796405u + 2891336453u;
    uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
    return (w >> 22u) ^ w;
}
float rnd(uint v) {
    return float(pcg(v)) * (1.0 / 4294967296.0);
}
`,Tt=`
uniform sampler2D spawnTex;
uniform int spawnSize;
// Share of births on the side wall, by area at the current depth.
uniform float spawnSideShare;

uint spawnKey(uint id, float gen) {
    return pcg(id ^ (uint(gen) * 2654435769u));
}

// xy = world position, z = position along the depth / halfDepth (-1..1).
// The first half of the points are on the side wall, the second on the caps.
vec4 spawnPoint(uint key) {
    int half_ = spawnSize * spawnSize / 2;
    bool side = float(key & 0xffffu) < spawnSideShare * 65536.0;
    int idx = int((key >> 16u) % uint(half_)) + (side ? 0 : half_);
    return texelFetch(spawnTex, ivec2(idx % spawnSize, idx / spawnSize), 0);
}
`,Et=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

// State: pos = xyz + age / life (0..1; < 0 while waiting to be born in
// an intro), vel = xyz + generation (wraps at GEN_WRAP). Both stay
// meaningful in 16-bit float targets.
uniform sampler2D posTex;
uniform sampler2D velTex;
uniform int stateWidth;
// Ids at or past \`count\` are not drawn and keep their state.
uniform int count;
// 1: respawn every particle. 2: the state grew; copy the first
// \`oldCount\` particles from the old, \`oldWidth\` wide state, respawn the rest.
uniform int reset;
// Seconds over which respawned particles are born; 0: all at once.
uniform float intro;
uniform sampler2D oldPosTex;
uniform sampler2D oldVelTex;
uniform int oldWidth;
uniform int oldCount;
// 1: the state targets are 16-bit floats.
uniform int halfState;
uniform int frameSeed;
uniform float lifeMean;
uniform float time;
uniform float dt;
uniform float swirl;
uniform float curl;
uniform float curlScale;
uniform float speed;
uniform float attract;
uniform float peel;
// Pointer repel: strength × fade (0 = off), the smoothed pointer and the
// radius in buffer px, and the camera that draws the particles.
uniform float repelForce;
uniform vec2 repelPx;
uniform float repelRadiusPx;
uniform mat3 viewRot;
uniform float camDist;
uniform float focalPx;
uniform vec2 eye;
uniform vec2 principalPx;

layout(location = 0) out vec4 outPos;
layout(location = 1) out vec4 outVel;

${wt}
${Ct}
${fe}
${Tt}

float lifeOf(uint id, float gen) {
    float life = lifeMean * mix(0.6, 1.4, rnd(id * 1664525u + uint(gen) * 1013904223u + 7u));
    // The first life after an intro is cut short at random, so the
    // particles born together die over a whole life, not together.
    if (gen >= ${gt.toFixed(1)}) {
        life *= mix(${_t.toFixed(2)}, 1.0, rnd(id * 40503u + 23u));
    }
    return life;
}

// Round onto the 16-bit float grid, up or down at random. In 16-bit
// state targets, a step smaller than half a step of the grid would
// otherwise round away every frame: the particle would never die or
// move. This way the steps add up on average.
float roundHalf(float x, float r) {
    float e = exp2(floor(log2(max(abs(x), 6.2e-5))) - 10.0);
    return floor(x / e + r) * e;
}

vec3 spawn(uint id, float gen) {
    uint key = spawnKey(id, gen);
    vec4 s = spawnPoint(key);
    vec3 p = vec3(s.xy, s.z * halfDepth);
    // A thin fuzzy layer instead of an exact shell.
    vec4 d = sdf3(p);
    return p + d.yzw * (rnd(key + 11u) * 0.012 - d.x);
}

void main() {
    ivec2 texel = ivec2(gl_FragCoord.xy);
    int i = texel.y * stateWidth + texel.x;
    uint id = uint(i);

    if (reset == 2 && i < oldCount) {
        ivec2 o = ivec2(i % oldWidth, i / oldWidth);
        outPos = texelFetch(oldPosTex, o, 0);
        outVel = texelFetch(oldVelTex, o, 0);
        return;
    }
    if (reset != 0) {
        if (intro > 0.0) {
            // Born at a random moment in the next \`intro\` seconds: until
            // then the age is negative and the particle waits, undrawn.
            // The births speed up (the share born by time t is
            // (t / intro)²): a few particles already show the whole
            // shape, so a steady rate would look done a third of the way in.
            float gen0 = ${gt.toFixed(1)};
            float wait = sqrt(rnd(id * 7919u + 3u)) * intro;
            outPos = vec4(spawn(id, gen0), -wait / lifeOf(id, gen0));
            outVel = vec4(0.0, 0.0, 0.0, gen0);
            return;
        }
        // Random ages, so the particles don't all respawn together.
        outPos = vec4(spawn(id, 0.0), rnd(id * 7919u + 3u));
        outVel = vec4(0.0);
        return;
    }

    vec4 P = texelFetch(posTex, texel, 0);
    vec4 V = texelFetch(velTex, texel, 0);
    if (i >= count) {
        outPos = P;
        outVel = V;
        return;
    }

    float gen = V.w;
    float life = lifeOf(id, gen);
    float ageN = P.w + dt / life;
    if (halfState == 1) {
        ageN = roundHalf(ageN, rnd(id * 2654435761u + uint(frameSeed) * 2246822519u + 29u));
    }
    if (ageN < 0.0) {
        // Not born yet: hold on the spawn point, at rest. It grows in
        // once the age passes 0 (see lifeScale). After a refresh() it
        // flows onto the new shape from there, like the others.
        outPos = vec4(P.xyz, ageN);
        outVel = vec4(0.0, 0.0, 0.0, gen);
        return;
    }
    if (ageN >= 1.0) {
        gen = mod(gen + 1.0, ${gt.toFixed(1)});
        outPos = vec4(spawn(id, gen), 0.0);
        outVel = vec4(0.0, 0.0, 0.0, gen);
        return;
    }

    vec3 p = P.xyz;
    vec3 v = V.xyz;
    vec4 s = sdf3(p);
    vec3 n = s.yzw;
    float d = s.x;

    // How firmly this particle still holds on to the surface.
    float peeler = smoothstep(0.5, 0.9, rnd(id * 31u + uint(gen) * 17u + 5u));
    float hold = 1.0 - peel * peeler * smoothstep(0.2, 0.9, ageN);

    // Tangential flow: cross(normal, A), with A a slow, low-frequency
    // vector field around a drifting main axis.
    vec3 ga;
    snoiseGrad(p * 0.55 + vec3(0.0, 0.0, time * 0.05), ga);
    vec3 axis = normalize(vec3(0.35 * sin(time * 0.11), 1.0, 0.45 * cos(time * 0.07)));
    vec3 A = normalize(axis + ga * 0.35);
    vec3 sw = cross(n, A);

    // Divergence-free noise: cross of two noise gradients.
    vec3 g1;
    vec3 g2;
    vec3 q = p * curlScale;
    snoiseGrad(q + vec3(time * 0.09, 0.0, 0.0), g1);
    snoiseGrad(q + vec3(31.4, 17.7, 9.2) - vec3(0.0, time * 0.08, 0.0), g2);
    vec3 cu = cross(g1, g2) * 0.12;
    // Attached particles stay tangent; peeled ones may lift off.
    vec3 cuT = cu - n * dot(cu, n) * hold;

    float near = exp(-max(d, 0.0) * 5.0);
    vec3 target = speed * (sw * swirl * mix(0.5, 1.0, near) + cuT * curl)
                - n * d * attract * hold
                + n * speed * 0.8 * (1.0 - hold);

    // Repel: measured on screen, with the camera that draws the particle,
    // pushed in the view plane. The push is in radii (at the particle's
    // depth) per second, so the hole is the same on any element size.
    if (repelForce > 0.0) {
        vec3 qv = viewRot * p;
        float depth = camDist - qv.z;
        if (depth > 1e-3) {
            vec2 dd = principalPx + (qv.xy - eye) * focalPx / depth - repelPx;
            float r = length(dd) / repelRadiusPx;
            if (r < 1.0) {
                float f = 1.0 - r * r;
                f *= f;
                float a = rnd(id * 97u + 1u) * 6.2831853;
                vec2 dir = r > 1e-3 ? dd / (r * repelRadiusPx) : vec2(cos(a), sin(a));
                float radiusW = repelRadiusPx * depth / focalPx;
                // Inverse rotation: view plane → world.
                target += (vec3(dir, 0.0) * viewRot) * (repelForce * ${St.toFixed(1)} * radiusW * f);
            }
        }
    }

    v = mix(v, target, 1.0 - exp(-dt * 5.0));
    p += v * dt;
    if (halfState == 1) {
        // As for the age: small moves would round away, and slow particles freeze.
        uint k = id * 2654435761u + uint(frameSeed) * 2246822519u;
        p = vec3(
            roundHalf(p.x, rnd(k + 31u)),
            roundHalf(p.y, rnd(k + 37u)),
            roundHalf(p.z, rnd(k + 41u))
        );
    }

    outPos = vec4(p, ageN);
    outVel = vec4(v, gen);
}
`,Dt=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D posTex;
uniform sampler2D velTex;
uniform sampler2D paletteTex;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 shapeHalf;
uniform float sourceColor;
uniform float time;
uniform float speed;
uniform int stateWidth;
uniform int count;
uniform mat3 viewRot;
uniform vec3 lightDir;
uniform vec3 lightColor;
uniform float lightIntensity;
uniform float ambient;
uniform float occlusion;
uniform float glintAmount;

// rgb = the lit colour, a = how far the particle is off the surface.
out vec4 outA;

${wt}
${Ct}
${fe}
${Tt}

vec3 ramp(float t) {
    float u = (clamp(t, 0.0, 1.0) * ${255 .toFixed(1)} + 0.5) / ${ot.toFixed(1)};
    return textureLod(paletteTex, vec2(u, 0.5), 0.0).rgb;
}

// Straight colour of the source where this particle was born.
vec3 spawnColor(uint id, float gen) {
    vec2 xy = spawnPoint(spawnKey(id, gen)).xy;
    // Side-wall points sit on the contour; step inside to skip the AA edge.
    vec3 s = sd2(xy);
    xy -= s.yz * max(s.x + 0.01, 0.0);
    vec2 uv = clamp(xy / (2.0 * shapeHalf) + 0.5, 0.0, 1.0);
    vec4 c = textureLod(src, srcRectUv.xy + uv * srcRectUv.zw, 0.0);
    return c.a > 1e-3 ? c.rgb / c.a : vec3(0.0);
}

void main() {
    ivec2 texel = ivec2(gl_FragCoord.xy);
    int i = texel.y * stateWidth + texel.x;
    if (i >= count) {
        outA = vec4(0.0);
        return;
    }
    uint id = uint(i);
    vec4 P = texelFetch(posTex, texel, 0);
    vec4 V = texelFetch(velTex, texel, 0);
    vec3 p = P.xyz;
    vec4 s = sdf3(p);
    float off = clamp(s.x / 0.08, 0.0, 1.0);
    float r = rnd(id * 2246822519u + 13u);

    // Colour attribute: slow noise over the surface + speed + per particle.
    vec3 gn;
    float nz = snoiseGrad(p * 1.6 + vec3(0.0, time * 0.05, 0.0), gn);
    float spd = length(V.xyz) / max(speed, 1e-4);
    float t = 0.3 + 0.35 * nz + 0.3 * clamp(spd - 0.5, 0.0, 1.5) + 0.3 * (r - 0.5);
    t += 0.4 * off;
    vec3 base = ramp(t);
    vec3 highlight = ramp(1.0);
    if (sourceColor > 0.0) {
        // Carried from the spawn point like paint; t keeps some texture.
        vec3 sc = spawnColor(id, V.w);
        base = mix(base, sc * mix(0.85, 1.15, clamp(t, 0.0, 1.0)), sourceColor);
        highlight = mix(highlight, mix(sc, vec3(1.0), 0.5), sourceColor);
    }

    // Lit once per particle, from the SDF normal at its head, in view
    // space; every segment of its trail takes this colour.
    vec3 nv = viewRot * s.yzw;
    float ndl = dot(nv, lightDir);
    float wrap = 0.5 + 0.5 * ndl;
    // Cheap occlusion: how far the field is clear along the normal.
    float aoDist = sdf3(p + s.yzw * 0.07).x;
    float ao = mix(1.0 - occlusion, 1.0, clamp(aoDist / 0.07, 0.0, 1.0));
    vec3 col = base * (ambient + 0.9 * lightIntensity * wrap * lightColor) * ao;
    // Some fibres catch the light.
    float glint = pow(max(ndl, 0.0), 3.0) * step(0.65, fract(r * 7.13));
    col += highlight * lightColor * glint * glintAmount * ao;
    // Peeled-off wisps get lighter.
    col = mix(col, highlight * 0.85, off * 0.5);
    outA = vec4(col, off);
}
`,Ot=Ge(`body`),kt=Ge(`shadow`),At=Ge(`firefly`),jt=`#version 300 es
precision highp float;
in vec3 vColor;
in vec2 vLocal;
in vec2 vShape;
out vec4 outColor;

// No discard: the quad's sides are the fibre's edges, so multisampling
// (antialias) smooths them. Round caps would be invisible at fibre
// widths anyway.
void main() {
    // Rounded shading across the width (vShape.y = half width).
    float r = vLocal.y / max(vShape.y, 1e-3);
    outColor = vec4(vColor * (1.0 - 0.3 * r * r), 1.0);
}
`,Mt=`#version 300 es
precision highp float;
in vec2 vLocal;
in vec2 vShape;
out vec4 outColor;

void main() {
    vec2 q = vec2(max(abs(vLocal.x) - vShape.x, 0.0), vLocal.y);
    if (length(q) > max(vShape.y, 1e-3)) discard;
    outColor = vec4(1.0);
}
`,Nt=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D curTex;
uniform sampler2D histTex;
uniform float amount;
out vec4 outColor;

void main() {
    float c = texture(curTex, uv).r;
    // amount 1 restarts the average; skip whatever the history holds.
    float v = amount >= 1.0 ? c : mix(texture(histTex, uv).r, c, amount);
    outColor = vec4(v, 0.0, 0.0, 1.0);
}
`,Pt=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
uniform vec2 dir;
uniform float sigma;
uniform int radius;
out vec4 outColor;

void main() {
    float k = -0.5 / (sigma * sigma);
    float sum = texture(srcTex, uv).r;
    float wsum = 1.0;
    for (int i = 1; i <= 24; i++) {
        if (i > radius) break;
        float w = exp(float(i * i) * k);
        sum += (texture(srcTex, uv + dir * float(i)).r
              + texture(srcTex, uv - dir * float(i)).r) * w;
        wsum += 2.0 * w;
    }
    outColor = vec4(sum / wsum, 0.0, 0.0, 1.0);
}
`,Ft=`#version 300 es
in vec2 position;
uniform vec4 slotRect;
void main() {
    gl_Position = vec4(mix(slotRect.xy, slotRect.zw, position + 0.5), 0.0, 1.0);
}
`,It=`#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D posTex;
uniform sampler2D velTex;
uniform vec2 slotOrigin;
out vec4 outColor;
void main() {
    ivec2 texel = ivec2(gl_FragCoord.xy - slotOrigin);
    outColor = vec4(texelFetch(posTex, texel, 0).xyz, texelFetch(velTex, texel, 0).w);
}
`,Lt=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, -1.0);
}
`,Rt=`#version 300 es
precision highp float;
in vec3 vColor;
out vec4 outColor;

void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(c, c);
    // A hot core with a small 4-point star.
    float core = exp(-r2 * 10.0);
    float star = exp(-abs(c.x) * 14.0) * exp(-abs(c.y) * 2.5)
               + exp(-abs(c.y) * 14.0) * exp(-abs(c.x) * 2.5);
    float a = core + star * 0.45;
    if (a < 0.003) discard;
    outColor = vec4(vColor * a, 0.0);
}
`,zt=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D scene;
uniform vec2 texel;
out vec4 outColor;

const float threshold = ${at.toFixed(1)};
${u}
void main() {
    vec3 c = texture(scene, uv + texel * vec2(-0.5, -0.5)).rgb
           + texture(scene, uv + texel * vec2(0.5, -0.5)).rgb
           + texture(scene, uv + texel * vec2(-0.5, 0.5)).rgb
           + texture(scene, uv + texel * vec2(0.5, 0.5)).rgb;
    c *= 0.25;
    float br = max(c.r, max(c.g, c.b));
    outColor = vec4(c * bloomKnee(br, threshold, 0.5), 1.0);
}
`,Bt=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
uniform vec2 texel;
out vec4 outColor;

void main() {
    vec3 c = texture(srcTex, uv).rgb * 0.5;
    c += texture(srcTex, uv + texel * vec2(-1.0, -1.0)).rgb * 0.125;
    c += texture(srcTex, uv + texel * vec2(1.0, -1.0)).rgb * 0.125;
    c += texture(srcTex, uv + texel * vec2(-1.0, 1.0)).rgb * 0.125;
    c += texture(srcTex, uv + texel * vec2(1.0, 1.0)).rgb * 0.125;
    outColor = vec4(c, 1.0);
}
`,Vt=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D scene;
uniform sampler2D bloomTex;
uniform sampler2D shadowTex;
uniform int hasScene;
uniform float bloom;
// shadowOpacity, or 0 with the shadow off.
uniform float shadowAmount;
uniform vec3 shadowColor;
out vec4 outColor;

vec3 softClip(vec3 x) {
    vec3 k = 0.8 + 0.2 * (1.0 - exp(-(x - 0.8) / 0.2));
    return mix(x, k, step(0.8, x));
}

void main() {
    if (hasScene == 0) {
        outColor = vec4(0.0);
        return;
    }
    vec4 s = texture(scene, uv);
    vec3 col = s.rgb + texture(bloomTex, uv).rgb * bloom;
    col = softClip(max(col, 0.0));
    float a = clamp(max(s.a, max(col.r, max(col.g, col.b))), 0.0, 1.0);
    if (shadowAmount > 0.0) {
        float sh = shadowAmount * clamp(texture(shadowTex, uv).r, 0.0, 1.0);
        col += shadowColor * sh * (1.0 - a);
        a += sh * (1.0 - a);
    }
    // Noise dither against banding in the faint glow, on the alpha too:
    // the glow composites as a translucent colour, so where its wide tail
    // crosses an 8-bit alpha step it would draw a contour on a flat page.
    // The colour scales with the dithered alpha (premultiplied, hue kept)
    // and gets its own noise. Pixels with nothing drawn stay exactly 0.
    if (a <= 0.0) {
        outColor = vec4(0.0);
        return;
    }
    vec2 fc = gl_FragCoord.xy;
    float n1 = fract(sin(dot(fc, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    float n2 = fract(sin(dot(fc, vec2(39.3468, 11.135))) * 24634.6345) - 0.5;
    // Slightly under ±0.5 levels, so a vanishing tail can't round up to
    // specks across the whole output rect.
    float ad = clamp(a + n1 * 0.98 / 255.0, 0.0, 1.0);
    col = clamp(col * (ad / a) + n2 / 255.0, 0.0, ad);
    outColor = vec4(col, ad);
}
`,Ht={count:[1,nt],depth:[.01,4],swirl:[-10,10],curl:[-10,10],curlScale:[.01,50],speed:[0,10],attract:[0,100],peel:[0,1],life:[.1,120],intro:[0,120],pointSize:[0,64],streak:[0,10],fireflyRatio:[0,1],fireflyIntensity:[0,1e3],bloom:[0,100],sourceColor:[0,1],lightIntensity:[0,100],ambient:[0,1],occlusion:[0,1],glint:[0,100],shadowOpacity:[0,1],shadowSoftness:[0,500],shadowDistance:[0,100],...b,pointerRadius:[0,1e4]},Ut=Object.keys(Ht),Wt=/^#?(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,Gt=new Map,Kt={bloom:null,shadow:null,shadowAmount:0},qt=class{params;#e;#t=!1;#n;#r=nt;#i=!1;#a(){let e=Ye(this.params,this.#n);return e.count>this.#r&&(this.#i||(this.#i=!0,console.warn(`[VFX-JS] SwirlParticleEffect: count ${e.count} is more than this GPU can hold; using ${this.#r}.`)),e.count=this.#r),e}#o=new Ae({longSide:400,onRead:(e,t)=>this.#se(e,t)});#s=null;#c=null;#l=null;#u=!0;#d=0;#f=0;#p=!1;#m=0;#h=[];#g=0;#_=null;#v=null;#y=null;#b=1;#x=null;#S=[0,0];#C=[];#w=[0,0];#T=null;#E=!1;#D=Kt;#O=0;#k=null;#A=null;#j=null;#M=Array(ft).fill(-1/0);#N=5;#P=-1/0;#F=null;#I=null;#L=null;#R=null;#z=null;#B=null;#V=null;#H=null;#U=[];#W=0;#G=null;#K=null;#q=null;#J=null;#Y=-1;#X=-1;#Z=-1;#Q=-1;#$={attributes:{position:{data:Ie,itemSize:2}}};#ee=null;#te=new C(D);#ne=[0,0];#re=0;constructor(e={},t={}){this.params={...D,...e},this.#e=t.still??!1,this.#n=Ye(this.params)}setParams(e){Object.assign(this.params,e)}init(e){this.#F=e.gl,this.#t=!e.gl.getExtension(`OES_texture_float_linear`),this.#r=We(e.gl);let t=this.#a();this.#ae(e,Me(t.count),!1),this.#ie(e),this.#ee=e.onContextRestored(()=>{this.#o.contextRestored(),this.#F=e.gl,this.#t=!e.gl.getExtension(`OES_texture_float_linear`),this.#I=null,this.#L=null,this.#R=null,this.#z=null,this.#B=null,this.#V=null,this.#H=null,this.#c=this.#c??this.#l,this.#u=!0,this.#p=!1,this.#E=!1})}outputRect(e){return i(l(this.params.pad,D.pad),e)}#ie(e){let t=this.#n.antialias?4:1;this.#y?.dispose();let n=e.createRenderTarget({float:!0,depth:!0,samples:t});return this.#y=n,this.#b=t,n}#ae(e,t,n){let r=this.#_,i=this.#v,a=this.#g,o={size:[t,t],float:!0,persistent:!0,filter:`nearest`},s=e.createRenderTarget(o),c=e.createRenderTarget(o);this.#g=t,n&&r&&i&&!this.#u&&this.#z&&this.#B?e.draw({frag:Et,uniforms:{...this.#ge(e),posTex:r,velTex:i,oldPosTex:r,oldVelTex:i,oldWidth:a,oldCount:a*a,reset:2,dt:0},target:[s,c]}):this.#u=!0,r?.dispose(),i?.dispose(),this.#A?.dispose(),this.#j?.dispose(),this.#_=s,this.#v=c;let l={...o,persistent:!1};this.#A=e.createRenderTarget(l),this.#j=e.createRenderTarget({...l,size:[t*pt,t*mt]}),this.#u||this.#ye(e)}render(e){if(!this.#y||!this.#_||!this.#v)return;let t=this.#a(),n=(t.antialias?4:1)===this.#b?this.#y:this.#ie(e);this.#o.phase===`idle`&&this.#s!==null&&ke(this.params.sourceChannel)!==this.#s&&this.#o.refresh(),this.#o.phase===`idle`&&this.#c||this.#o.update(e),this.#c&&this.#ce(e,this.#c)&&((!this.#l||this.#e)&&(this.#u=!0),this.#l=this.#c,this.#c=null),this.#de(e);let r=!!(this.#l&&this.#z&&this.#B&&this.#V);if(!r)this.#D=Kt;else{t.count>this.#g**2&&this.#ae(e,Me(t.count),!0),this.#fe(e),this.#e&&t.count!==this.#m&&(this.#u=!0);let r=this.#e&&this.#oe(e,n);if(!this.#e||!this.#p||this.#u||r){let t=Fe(e.deltaTime)||0;this.#me(e,t),this.#_e(e,t),this.#k=this.#he(e,t);let r=this.#Se(e,n,this.#k);this.#D={bloom:this.#De(e,n),shadow:r?r.tex:null,shadowAmount:r?r.amount:0}}}let i=this.#D;e.draw({frag:Vt,uniforms:{scene:n,bloomTex:i.bloom??n,shadowTex:i.shadow??n,hasScene:+!!r,bloom:i.bloom?t.bloom:0,shadowAmount:i.shadow?i.shadowAmount:0,shadowColor:t.shadowColor},target:e.target})}#oe(e,t){let n=this.#n,r=this.#h,a=0,o=!1,s=e=>{r[a]!==e&&(r[a]=e,o=!0),a++};for(let e of Ut)s(n[e]);s(n.pad),s(n.shadow),s(n.light[0]),s(n.light[1]),s(n.light[2]),s(n.lightColor),s(n.fireflyColor),s(n.shadowColor),s(this.#W),s(this.#g),s(t.width),s(t.height),s(this.#b);let c=e.dims,[l,u]=i(n.pad,c);return s(c.elementPixel[0]),s(c.elementPixel[1]),s(l),s(u),s(n.cameraOrigin),n.cameraOrigin===`viewport`&&(s(c.canvasRect[0]+c.canvasRect[2]/2),s(c.canvasRect[1]+c.canvasRect[3]/2)),o}refresh(){this.#o.refresh()}async#se(e,t){let n=ke(this.params.sourceChannel),r=await be({pixels:e.pixels,mw:e.width,mh:e.height,channel:n,aspect:e.aspect,smoothRadius:1,smoothPasses:1,spawn:!0});return r?(t()&&(this.#c=r,this.#s=n),!0):!1}#ce(e,t){let n=e.gl;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_ALIGNMENT,4);let r=n.createTexture(),i=n.createTexture();return!r||!i?(n.deleteTexture(r),n.deleteTexture(i),e.resetState(),!1):(n.bindTexture(n.TEXTURE_2D,r),n.texImage2D(n.TEXTURE_2D,0,n.RGBA16F,t.sdfW,t.sdfH,0,n.RGBA,n.FLOAT,t.sdf),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.bindTexture(n.TEXTURE_2D,i),n.texImage2D(n.TEXTURE_2D,0,n.RGBA32F,pe,pe,0,n.RGBA,n.FLOAT,t.spawn),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.bindTexture(n.TEXTURE_2D,null),e.resetState(),this.#le(),this.#I=r,this.#L=i,this.#z=e.wrapTexture(r,{size:[t.sdfW,t.sdfH],filter:`linear`,wrap:`clamp`}),this.#B=e.wrapTexture(i,{size:[pe,pe],filter:`nearest`,wrap:`clamp`}),!0)}#le(){if(this.#F)for(let e of[this.#I,this.#L])e&&this.#F.deleteTexture(e);this.#I=null,this.#L=null,this.#z=null,this.#B=null}#ue(e){if(e!==this.#H)return!1;if(!Array.isArray(e))return!0;let t=this.#U;if(t.length!==e.length*2)return!1;for(let n=0;n<e.length;n++){let r=e[n];if(t[n*2]!==r?.offset||t[n*2+1]!==r?.color)return!1}return!0}#de(e){let t=this.params.palette;if(this.#V&&this.#ue(t))return;let n=e.gl,r=Ze(t);n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_ALIGNMENT,4);let i=this.#R;i?(n.bindTexture(n.TEXTURE_2D,i),n.texSubImage2D(n.TEXTURE_2D,0,0,0,ot,1,n.RGBA,n.UNSIGNED_BYTE,r)):(i=n.createTexture(),n.bindTexture(n.TEXTURE_2D,i),n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,ot,1,0,n.RGBA,n.UNSIGNED_BYTE,r),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)),n.bindTexture(n.TEXTURE_2D,null),e.resetState(),i&&(this.#V||=(this.#R=i,e.wrapTexture(i,{size:[ot,1],filter:`linear`,wrap:`clamp`})),this.#H=t,this.#U=Array.isArray(t)?t.flatMap(e=>[e?.offset,e?.color]):[],this.#W++)}#fe(e){let t=this.#n,n=Math.min(t.count,Math.round(t.count*t.fireflyRatio)),r=t.count-n;this.#Y=r,this.#X=n;let i=Qe(r);i!==this.#Z&&(this.#G&&e.releaseGeometry(this.#G),this.#q&&e.releaseGeometry(this.#q),this.#K&&e.releaseGeometry(this.#K),this.#G=$e(i),this.#q=$e(i,1),this.#K={attributes:{position:{data:Ie,itemSize:2}},instanceCount:i},this.#Z=i);let a=Qe(n);a!==this.#Q&&(this.#J&&e.releaseGeometry(this.#J),this.#J={mode:`points`,attributes:{},drawRange:{start:0,count:1},instanceCount:a},this.#Q=a)}#pe(){let e=this.#n.depth/2,t={sdfRect:this.#l?.sdfRect??[0,0,1,1],halfDepth:e,rounding:Math.min(.025,e*.5),stateWidth:this.#g,spawnSize:pe,spawnSideShare:Ue(this.#l,e)};return this.#z&&this.#B&&(t.sdfTex=this.#z,t.spawnTex=this.#B),t}#me(e,t){let n=this.#n,r=!this.#e&&n.pointer===`repel`&&this.#te.pointerIn;if(r){let[n,r]=e.mouse;if(this.#re<=0)this.#ne=[n,r];else{let e=1-Math.exp(-t/xt);this.#ne[0]+=(n-this.#ne[0])*e,this.#ne[1]+=(r-this.#ne[1])*e}}let i=t/bt;this.#re=r?Math.min(this.#re+i,1):Math.max(this.#re-i,0)}#he(e,t){let n=this.#n;return this.#te.update(n,{time:this.#d,dt:t,dims:e.dims,outputRect:i(n.pad,e.dims),mouse:e.mouse,mouseViewport:e.mouseViewport,pixelRatio:e.pixelRatio,live:!this.#e,tilt:n.pointer===`tilt`,trackPointer:n.pointer!==`none`})}#ge(e){let t=this.#n,n=this.#B;return{...this.#pe(),count:t.count,lifeMean:t.life,intro:this.#e?0:t.intro,swirl:t.swirl,curl:t.curl,curlScale:t.curlScale,speed:t.speed,attract:t.attract,peel:t.peel,time:this.#d,halfState:+!!this.#t,frameSeed:this.#f,...n?{oldPosTex:n,oldVelTex:n}:{},oldWidth:1,oldCount:0,...this.#ve(e)}}#_e(e,t){let n=this.#_,r=this.#v;if(!n||!r||!this.#z||!this.#B)return;let i,a;if(this.#e){if(this.#O=0,this.#p&&!this.#u)return;i=lt,a=1/60}else this.#O=t,i=Ke(Math.ceil(t/st),1,ct),a=t/i;this.#u&&this.#e&&(this.#d=0,this.#f=0);let o=this.#ge(e);this.#u&&(e.draw({frag:Et,uniforms:{...o,posTex:n,velTex:r,reset:1,dt:0},target:[n,r]}),this.#ye(e),this.#u=!1,this.#E=!1);for(let t=0;t<i;t++)this.#d+=a,this.#f=(this.#f+1)%1048576,e.draw({frag:Et,uniforms:{...o,posTex:n,velTex:r,reset:0,time:this.#d,frameSeed:this.#f,dt:a},target:[n,r]}),this.#be(e);this.#p=!0,this.#m=this.#n.count}#ve(e){let t=this.#n,n=this.#k??this.#he(e,0);return{repelForce:t.pointerRadius>0?this.#re*t.pointerStrength:0,repelPx:[this.#ne[0]-n.origin[0],this.#ne[1]-n.origin[1]],repelRadiusPx:Math.max(t.pointerRadius*e.pixelRatio,1),viewRot:n.viewRot,camDist:n.camDist,focalPx:n.focalPx,eye:[n.eye[0],n.eye[1]],principalPx:n.principalPx}}#ye(e){this.#j&&e.draw({frag:Lt,target:this.#j}),this.#M.fill(-1/0),this.#N=5,this.#P=-1/0}#be(e){let t=this.#j,n=this.#_,r=this.#v,i=this.#n.streak;if(!t||!n||!r||!(i>0))return;let a=i/5;if(this.#d-this.#P<a)return;let o=(this.#N+1)%ft,s=o%pt,c=Math.floor(o/pt),l=2*s/pt-1,u=2*c/mt-1,d=this.#g;e.draw({vert:Ft,frag:It,geometry:this.#$,uniforms:{posTex:n,velTex:r,slotRect:[l,u,l+2/pt,u+2/mt],slotOrigin:[s*d,c*d]},target:t}),this.#N=o,this.#M[o]=this.#d,this.#P=this.#d}#xe(){let e=[],t=[];for(let n=0;n<ft;n++){let r=(this.#N-n+12)%ft,i=this.#M[r];e.push(r),t.push(Number.isFinite(i)?this.#d-i:ht)}return{histSlot:e,histAgo:t}}#Se(e,t,n){let r=this.#_,i=this.#v,a=this.#l,o=this.#A,s=this.#j,c=this.#G,l=this.#K,u=this.#J;if(!r||!i||!a||!this.#V||!o||!s||!c||!l||!u)return null;let d=this.#n,f=n.camDist,p={...this.#pe(),posTex:r,viewRot:n.viewRot,camDist:f,camNear:f*ut,camFar:f*dt,focalPx:n.focalPx,eye:[n.eye[0],n.eye[1]],principalPx:n.principalPx,bufferPx:[t.width,t.height],pointPx:d.pointSize*e.pixelRatio};e.clear(t),this.#Y>0&&e.draw({frag:Dt,uniforms:{...p,velTex:i,count:d.count,time:this.#d,speed:d.speed,paletteTex:this.#V,src:e.src,shapeHalf:a.shapeHalf,sourceColor:d.sourceColor,lightDir:d.light,lightColor:d.lightColor,lightIntensity:d.lightIntensity,ambient:d.ambient,occlusion:d.occlusion,glintAmount:d.glint},target:o});let m={...p,...this.#xe(),velTex:i,histTex:s,attrA:o,idOffset:this.#X,idEnd:d.count,streak:d.streak};this.#Y>0&&e.draw({vert:Ot,frag:jt,geometry:d.streak>0?c:this.#q??c,uniforms:m,target:t,depthTest:!0,blend:`none`}),this.#X>0&&e.draw({vert:At,frag:Rt,geometry:u,uniforms:{...p,idOffset:0,idEnd:this.#X,time:this.#d,fireflyIntensity:d.fireflyIntensity,fireflyColor:d.fireflyColor},target:t,depthTest:!0,depthWrite:!1,blend:`additive`});let h=d.light,g=d.shadowOpacity*et(0,.25,h[2]);if(!d.shadow||!(g>0)||this.#Y===0)return this.#Te(),null;let _=this.#we(e,t,l,{...m,shadowLight:[h[0],h[1],Math.max(h[2],.02)],shadowDepth:d.shadowDistance-d.depth/2});return _?{tex:_,amount:g}:null}#Ce(e,t){let n=this.#C;for(;n.length<=t;){let t=2**n.length,r={size:[Math.max(1,Math.floor(this.#w[0]/t)),Math.max(1,Math.floor(this.#w[1]/t))],float:!0,filter:`linear`};n.push({a:e.createRenderTarget(r),b:e.createRenderTarget(r)})}return n[t]}#we(e,t,n,r){let i=Math.max(1,Math.floor(t.width/2)),a=Math.max(1,Math.floor(t.height/2));(i!==this.#w[0]||a!==this.#w[1])&&(this.#Te(),this.#w=[i,a]),this.#T||=e.createRenderTarget({size:[i,a],float:!0,persistent:!0,filter:`linear`});let o=this.#T,s=this.#Ce(e,0).a;e.clear(s),e.draw({vert:kt,frag:Mt,geometry:n,uniforms:r,target:s,blend:`none`});let c=this.#E&&!this.#e?1-Math.exp(-this.#O/yt):1;e.draw({frag:Nt,uniforms:{curTex:s,histTex:o,amount:c},target:o}),this.#E=!0;let l=this.#n.shadowSoftness*e.pixelRatio,u=0;for(;u<3&&l/2**(u+1)>vt;)u++;let d=t=>t===0?o:this.#Ce(e,t).a;for(let t=1;t<=u;t++){let n=d(t-1);e.draw({frag:Bt,uniforms:{srcTex:n,texel:[1/n.width,1/n.height]},target:this.#Ce(e,t).a})}let f=d(u),p=l/2**(u+1);if(p<.3)return f;let{a:m,b:h}=this.#Ce(e,u),g=Math.min(Math.ceil(p*3),24);return e.draw({frag:Pt,uniforms:{srcTex:f,dir:[1/f.width,0],sigma:p,radius:g},target:h}),e.draw({frag:Pt,uniforms:{srcTex:h,dir:[0,1/h.height],sigma:p,radius:g},target:m}),m}#Te(){for(let e of this.#C)e.a.dispose(),e.b.dispose();this.#T?.dispose(),this.#T=null,this.#E=!1,this.#C=[],this.#w=[0,0]}#Ee(){this.#x&&c(this.#x),this.#x=null,this.#S=[0,0]}#De(e,t){if(!(this.#n.bloom>0))return this.#Ee(),null;this.#x&&t.width===this.#S[0]&&t.height===this.#S[1]||(this.#Ee(),this.#x=o(e,t.width,t.height,rt),this.#S=[t.width,t.height]);let n=this.#x.down;e.draw({frag:zt,uniforms:{scene:t,texel:[1/t.width,1/t.height]},target:n[0]});for(let t=1;t<n.length;t++){let r=n[t-1];e.draw({frag:Bt,uniforms:{srcTex:r,texel:[1/r.width,1/r.height]},target:n[t]})}return r(e,this.#x,(e,t)=>({texelSize:[1/t.width,1/t.height],weightLarge:1,weightSmall:it}))}dispose(){this.#te.dispose(),this.#ee?.(),this.#ee=null,this.#le(),this.#F&&this.#R&&this.#F.deleteTexture(this.#R),this.#R=null,this.#V=null,this.#F=null,this.#_?.dispose(),this.#v?.dispose(),this.#A?.dispose(),this.#j?.dispose(),this.#y?.dispose(),this.#Te(),this.#Ee(),this.#_=null,this.#v=null,this.#A=null,this.#j=null,this.#y=null,this.#g=0,this.#G=null,this.#q=null,this.#K=null,this.#J=null,this.#Y=-1,this.#X=-1,this.#Z=-1,this.#Q=-1,this.#o.reset(),this.#s=null,this.#c=null,this.#l=null,this.#u=!0,this.#d=0,this.#f=0,this.#p=!1,this.#m=0,this.#h=[],this.#D=Kt,this.#O=0,this.#k=null,this.#M.fill(-1/0),this.#N=5,this.#P=-1/0,this.#H=null,this.#U=[],this.#ne=[0,0],this.#re=0}}})))()}function O(e){return e}function k(e){return e==null}function Yt(e){return typeof e==`object`&&!!e}function Xt(e){return typeof e==`object`&&!!e}function Zt(e,t){if(e.length!==t.length)return!1;for(let n=0;n<e.length;n++)if(e[n]!==t[n])return!1;return!0}function Qt(e,t){return Array.from(new Set([...Object.keys(e),...Object.keys(t)])).reduce((n,r)=>{let i=e[r],a=t[r];return Xt(i)&&Xt(a)?Object.assign(Object.assign({},n),{[r]:Qt(i,a)}):Object.assign(Object.assign({},n),{[r]:r in t?a:i})},{})}function $t(e){return Yt(e)?`target`in e:!1}function A(e,t){let n=t?.constraint,r=t?.equals;return!n&&!r?new mo(e):new po(e,t)}function en(e){return[new ho(e),(t,n)=>{e.setRawValue(t,n)}]}function tn(e){return(t,n)=>{for(let r=0;r<e.length;r++){let i=e[r](t,n);if(i!==``)return i}return``}}function nn(e,t){let n=e.substr(t).match(/^\s+/);return(n&&n[0])??``}function rn(e,t){let n=e.substr(t,1);return n.match(/^[1-9]$/)?n:``}function an(e,t){let n=e.substr(t).match(/^[0-9]+/);return(n&&n[0])??``}function on(e,t){let n=an(e,t);if(n!==``)return n;let r=e.substr(t,1);if(t+=1,r!==`-`&&r!==`+`)return``;let i=an(e,t);return i===``?``:r+i}function sn(e,t){let n=e.substr(t,1);if(t+=1,n.toLowerCase()!==`e`)return``;let r=on(e,t);return r===``?``:n+r}function cn(e,t){let n=e.substr(t,1);if(n===`0`)return n;let r=rn(e,t);return t+=r.length,r===``?``:r+an(e,t)}function ln(e,t){let n=cn(e,t);if(t+=n.length,n===``)return``;let r=e.substr(t,1);if(t+=r.length,r!==`.`)return``;let i=an(e,t);return t+=i.length,n+r+i+sn(e,t)}function un(e,t){let n=e.substr(t,1);if(t+=n.length,n!==`.`)return``;let r=an(e,t);return t+=r.length,r===``?``:n+r+sn(e,t)}function dn(e,t){let n=cn(e,t);return t+=n.length,n===``?``:n+sn(e,t)}function fn(e,t){let n=e.substr(t).match(/^[01]+/);return(n&&n[0])??``}function pn(e,t){let n=e.substr(t,2);if(t+=n.length,n.toLowerCase()!==`0b`)return``;let r=fn(e,t);return r===``?``:n+r}function mn(e,t){let n=e.substr(t).match(/^[0-7]+/);return(n&&n[0])??``}function hn(e,t){let n=e.substr(t,2);if(t+=n.length,n.toLowerCase()!==`0o`)return``;let r=mn(e,t);return r===``?``:n+r}function gn(e,t){let n=e.substr(t).match(/^[0-9a-f]+/i);return(n&&n[0])??``}function _n(e,t){let n=e.substr(t,2);if(t+=n.length,n.toLowerCase()!==`0x`)return``;let r=gn(e,t);return r===``?``:n+r}function vn(e,t){let n=To(e,t);return t+=n.length,n===``?null:{evaluable:new yo(n),cursor:t}}function yn(e,t){let n=e.substr(t,1);if(t+=n.length,n!==`(`)return null;let r=wn(e,t);if(!r)return null;t=r.cursor,t+=nn(e,t).length;let i=e.substr(t,1);return t+=i.length,i===`)`?{evaluable:r.evaluable,cursor:t}:null}function bn(e,t){return vn(e,t)??yn(e,t)}function xn(e,t){let n=bn(e,t);if(n)return n;let r=e.substr(t,1);if(t+=r.length,r!==`+`&&r!==`-`&&r!==`~`)return null;let i=xn(e,t);return i?(t=i.cursor,{cursor:t,evaluable:new Co(r,i.evaluable)}):null}function Sn(e,t,n){n+=nn(t,n).length;let r=e.filter(e=>t.startsWith(e,n))[0];return r?(n+=r.length,n+=nn(t,n).length,{cursor:n,operator:r}):null}function Cn(e,t){return(n,r)=>{let i=e(n,r);if(!i)return null;r=i.cursor;let a=i.evaluable;for(;;){let i=Sn(t,n,r);if(!i)break;r=i.cursor;let o=e(n,r);if(!o)return null;r=o.cursor,a=new xo(i.operator,a,o.evaluable)}return a?{cursor:r,evaluable:a}:null}}function wn(e,t){return t+=nn(e,t).length,Eo(e,t)}function Tn(e){let t=wn(e,0);return!t||t.cursor+nn(e,t.cursor).length!==e.length?null:t.evaluable}function En(e){return Tn(e)?.evaluate()??null}function Dn(e){if(typeof e==`number`)return e;if(typeof e==`string`){let t=En(e);if(!k(t))return t}return 0}function On(e){return String(e)}function j(e){return t=>t.toFixed(Math.max(Math.min(e,20),0))}function M(e,t,n,r,i){return r+(e-t)/(n-t)*(i-r)}function kn(e){return String(e.toFixed(10)).split(`.`)[1].replace(/0+$/,``).length}function N(e,t,n){return Math.min(Math.max(e,t),n)}function An(e,t){return(e%t+t)%t}function jn(e,t){return k(e.step)?Math.max(kn(t),2):kn(e.step)}function Mn(e){return e.step??1}function Nn(e,t){let n=Math.abs(e.step??t);return n===0?.1:10**(Math.floor(Math.log10(n))-1)}function Pn(e,t){return k(e.step)?null:new vo(e.step,t)}function Fn(e){return!k(e.max)&&!k(e.min)?new go({max:e.max,min:e.min}):!k(e.max)||!k(e.min)?new _o({max:e.max,min:e.min}):null}function In(e,t){return{formatter:e.format??j(jn(e,t)),keyScale:e.keyScale??Mn(e),pointerScale:e.pointerScale??Nn(e,t)}}function Ln(e){return{format:e.optional.function,keyScale:e.optional.number,max:e.optional.number,min:e.optional.number,pointerScale:e.optional.number,step:e.optional.number}}function Rn(e){return{constraint:e.constraint,textProps:K.fromObject(In(e.params,e.initialValue))}}function zn(e){if(!(`binding`in e))return!1;let t=e.binding;return $t(t)&&`read`in t&&`write`in t}function Bn(e,t){return O(Object.keys(t).reduce((n,r)=>{if(n===void 0)return;let i=t[r],a=i(e[r]);return a.succeeded?Object.assign(Object.assign({},n),{[r]:a.value}):void 0},{}))}function Vn(e,t){return e.reduce((e,n)=>{if(e===void 0)return;let r=t(n);if(r.succeeded&&r.value!==void 0)return[...e,r.value]},[])}function Hn(e){return typeof e==`object`&&!!e}function Un(e){return t=>n=>{if(!t&&n===void 0)return{succeeded:!1,value:void 0};if(t&&n===void 0)return{succeeded:!0,value:void 0};let r=e(n);return r===void 0?{succeeded:!1,value:void 0}:{succeeded:!0,value:r}}}function Wn(e){return{custom:t=>Un(t)(e),boolean:Un(e=>typeof e==`boolean`?e:void 0)(e),number:Un(e=>typeof e==`number`?e:void 0)(e),string:Un(e=>typeof e==`string`?e:void 0)(e),function:Un(e=>typeof e==`function`?e:void 0)(e),constant:t=>Un(e=>e===t?t:void 0)(e),raw:Un(e=>e)(e),object:t=>Un(e=>{if(Hn(e))return Bn(e,t)})(e),array:t=>Un(e=>{if(Array.isArray(e))return Vn(e,t)})(e)}}function P(e,t){let n=t(Fo),r=Fo.required.object(n)(e);return r.succeeded?r.value:void 0}function F(e,t,n,r){if(t&&!t(e))return!1;let i=P(e,n);return i?r(i):!1}function I(e,t){return Qt(e?.()??{},t)}function Gn(e){return`value`in e}function Kn(e){if(!Yt(e)||!(`binding`in e))return!1;let t=e.binding;return $t(t)}function qn(e){e.offsetHeight}function Jn(e,t){let n=e.style.transition;e.style.transition=`none`,t(),e.style.transition=n}function Yn(e){return e.ontouchstart!==void 0}function Xn(){return globalThis}function Zn(){return O(Xn()).document}function Qn(e){let t=e.ownerDocument.defaultView;return t&&`document`in t?e.getContext(`2d`,{willReadFrequently:!0}):null}function $n(e,t){let n=e.createElementNS(q,`svg`);return n.innerHTML=Io[t],n}function er(e,t,n){e.insertBefore(t,e.children[n])}function tr(e){e.parentElement&&e.parentElement.removeChild(e)}function nr(e){for(;e.children.length>0;)e.removeChild(e.children[0])}function rr(e){for(;e.childNodes.length>0;)e.removeChild(e.childNodes[0])}function ir(e){return e.relatedTarget?O(e.relatedTarget):`explicitOriginalTarget`in e?e.explicitOriginalTarget:null}function ar(e,t){e.emitter.on(`change`,e=>{t(e.rawValue)}),t(e.rawValue)}function L(e,t,n){ar(e.value(t),n)}function R(e){return(t,n)=>[Lo,`-`,e,`v`,t?`_${t}`:``,n?`-${n}`:``].join(``)}function or(e,t){let n=e.createDocumentFragment();return t.split(`
`).map(t=>e.createTextNode(t)).forEach((t,r)=>{r>0&&n.appendChild(e.createElement(`br`)),n.appendChild(t)}),n}function sr(){return[`veryfirst`,`first`,`last`,`verylast`]}function cr(e){let t=Object.assign({},e);return delete t.value,t}function lr(e){return Gn(e)&&Kn(e.value)}function ur(e){return Gn(e)&&zn(e.value)}function dr(e,t){for(;e.length<t;)e.push(void 0)}function fr(e){let t=[];return dr(t,e),t}function pr(e){let t=e.indexOf(void 0);return O(t<0?e:e.slice(0,t))}function mr(e,t){let n=[...pr(e),t];return n.length>e.length?n.splice(0,n.length-e.length):dr(n,e.length),n}function hr(e){if(!(`binding`in e))return!1;let t=e.binding;return $t(t)&&`read`in t&&!(`write`in t)}function gr(e){return Gn(e)&&hr(e.value)}function _r(e,t,n){n?e.classList.add(t):e.classList.remove(t)}function vr(e,t){return n=>{_r(e,t,n)}}function yr(e,t){ar(e,e=>{t.textContent=e??``})}function z(e){return Object.assign({core:ts},e)}function br(e,t){return e.addBlade(Object.assign(Object.assign({},t),{view:`button`}))}function xr(e,t){return e.addBlade(Object.assign(Object.assign({},t),{view:`folder`}))}function Sr(e,t){return e.addBlade(Object.assign(Object.assign({},t),{view:`tab`}))}function Cr(e){return Yt(e)?`refresh`in e&&typeof e.refresh==`function`:!1}function wr(e,t){if(!fo.isBindable(e))throw W.notBindable();return new fo(e,t)}function Tr(e){return`rackController`in e}function Er(e,t){for(let n=0;n<e.length;n++){let r=e[n];if(Gn(r)&&r.value===t)return r}return null}function Dr(e){return Tr(e)?e.rackController.rack.bcSet_:null}function Or(){return new K({positions:A([],{equals:Zt})})}function kr(e,t){let n=0;return Jn(t,()=>{e.set(`expandedHeight`,null),e.set(`temporaryExpanded`,!0),qn(t),n=t.clientHeight,e.set(`temporaryExpanded`,null),qn(t)}),n}function Ar(e,t){t.style.height=e.styleHeight}function jr(e,t){e.value(`expanded`).emitter.on(`beforechange`,()=>{if(e.set(`completed`,!1),k(e.get(`expandedHeight`))){let n=kr(e,t);n>0&&e.set(`expandedHeight`,n)}e.set(`shouldFixHeight`,!0),qn(t)}),e.emitter.on(`change`,()=>{Ar(e,t)}),Ar(e,t),t.addEventListener(`transitionend`,t=>{t.propertyName===`height`&&e.cleanUpTransition()})}function Mr(e,t){return vr(e,hs(void 0,t))}function Nr(e,t){let n=e.accept(t.params);if(!n)return null;let r=P(t.params,e=>({disabled:e.optional.boolean,hidden:e.optional.boolean}));return e.controller({blade:Or(),document:t.document,params:O(Object.assign(Object.assign({},n.params),{disabled:r?.disabled,hidden:r?.hidden})),viewProps:gs.create({disabled:r?.disabled,hidden:r?.hidden})})}function Pr(e,t){if(e instanceof t)return e;if(e instanceof Ps){let n=e.constraints.reduce((e,n)=>e||(n instanceof t?n:null),null);if(n)return n}return null}function Fr(e){let t=Fo;if(Array.isArray(e))return P({items:e},e=>({items:e.required.array(e.required.object({text:e.required.string,value:e.required.raw}))}))?.items;if(typeof e==`object`)return t.required.raw(e).value}function Ir(e){if(Array.isArray(e))return e;let t=[];return Object.keys(e).forEach(n=>{t.push({text:n,value:e[n]})}),t}function Lr(e){return k(e)?null:new Fs(Ir(O(e)))}function Rr(e){return String(e)}function zr(e){return e!==`false`&&!!e}function Br(e){return Rr(e)}function Vr(e){return t=>e.reduce((e,n)=>e===null?n(t):e,null)}function Hr(e){return Gs(e)+`%`}function Ur(e){return String(e)}function Wr(e){return e}function Gr({primary:e,secondary:t,forward:n,backward:r}){let i=!1;function a(e){i||=(i=!0,e(),!1)}e.emitter.on(`change`,r=>{a(()=>{t.setRawValue(n(e.rawValue,t.rawValue),r.options)})}),t.emitter.on(`change`,i=>{a(()=>{e.setRawValue(r(e.rawValue,t.rawValue),i.options)}),a(()=>{t.setRawValue(n(e.rawValue,t.rawValue),i.options)})}),a(()=>{t.setRawValue(n(e.rawValue,t.rawValue),{forceEmit:!1,last:!0})})}function B(e,t){let n=e*(t.altKey?.1:1)*(t.shiftKey?10:1);return t.upKey?+n:t.downKey?-n:0}function Kr(e){return{altKey:e.altKey,downKey:e.key===`ArrowDown`,shiftKey:e.shiftKey,upKey:e.key===`ArrowUp`}}function qr(e){return{altKey:e.altKey,downKey:e.key===`ArrowLeft`,shiftKey:e.shiftKey,upKey:e.key===`ArrowRight`}}function Jr(e){return e===`ArrowUp`||e===`ArrowDown`}function Yr(e){return Jr(e)||e===`ArrowLeft`||e===`ArrowRight`}function Xr(e,t){let n=t.ownerDocument.defaultView,r=t.getBoundingClientRect();return{x:e.pageX-(((n&&n.scrollX)??0)+r.left),y:e.pageY-(((n&&n.scrollY)??0)+r.top)}}function Zr(e){return{sliderProps:new K({keyScale:e.keyScale,max:e.max,min:e.min}),textProps:new K({formatter:A(e.formatter),keyScale:e.keyScale,pointerScale:A(e.pointerScale)})}}function Qr(e){return`--${tc[e]}`}function $r(e){return Ln(e)}function ei(e){if(Xt(e))return P(e,$r)}function ti(e,t){if(!e)return;let n=[],r=Pn(e,t);r&&n.push(r);let i=Fn(e);return i&&n.push(i),new Ps(n)}function ni(e){return e?e.major===ts.major:!1}function ri(e){if(e===`inline`||e===`popup`)return e}function ii(e,t){e.write(t)}function ai(e){let t=[],n=Lr(e.options);return n&&t.push(n),new Ps(t)}function oi(e,t,n){let r=N(e/255,0,1),i=N(t/255,0,1),a=N(n/255,0,1),o=Math.max(r,i,a),s=Math.min(r,i,a),c=o-s,l=0,u=0,d=(s+o)/2;return c!==0&&(u=c/(1-Math.abs(o+s-1)),l=r===o?(i-a)/c:i===o?2+(a-r)/c:4+(r-i)/c,l=l/6+ +(l<0)),[l*360,u*100,d*100]}function si(e,t,n){let r=(e%360+360)%360,i=N(t/100,0,1),a=N(n/100,0,1),o=(1-Math.abs(2*a-1))*i,s=o*(1-Math.abs(r/60%2-1)),c=a-o/2,l,u,d;return r>=0&&r<60?[l,u,d]=[o,s,0]:r>=60&&r<120?[l,u,d]=[s,o,0]:r>=120&&r<180?[l,u,d]=[0,o,s]:r>=180&&r<240?[l,u,d]=[0,s,o]:r>=240&&r<300?[l,u,d]=[s,0,o]:[l,u,d]=[o,0,s],[(l+c)*255,(u+c)*255,(d+c)*255]}function ci(e,t,n){let r=N(e/255,0,1),i=N(t/255,0,1),a=N(n/255,0,1),o=Math.max(r,i,a),s=o-Math.min(r,i,a),c;c=s===0?0:o===r?60*(((i-a)/s%6+6)%6):o===i?60*((a-r)/s+2):60*((r-i)/s+4);let l=o===0?0:s/o,u=o;return[c,l*100,u*100]}function li(e,t,n){let r=An(e,360),i=N(t/100,0,1),a=N(n/100,0,1),o=a*i,s=o*(1-Math.abs(r/60%2-1)),c=a-o,l,u,d;return r>=0&&r<60?[l,u,d]=[o,s,0]:r>=60&&r<120?[l,u,d]=[s,o,0]:r>=120&&r<180?[l,u,d]=[0,o,s]:r>=180&&r<240?[l,u,d]=[0,s,o]:r>=240&&r<300?[l,u,d]=[s,0,o]:[l,u,d]=[o,0,s],[(l+c)*255,(u+c)*255,(d+c)*255]}function ui(e,t,n){let r=n+t*(100-Math.abs(2*n-100))/200;return[e,r===0?0:t*(100-Math.abs(2*n-100))/r,n+t*(100-Math.abs(2*n-100))/200]}function di(e,t,n){let r=100-Math.abs(n*(200-t)/100-100);return[e,r===0?0:t*n/r,n*(200-t)/200]}function V(e){return[e[0],e[1],e[2]]}function fi(e,t){return[e[0],e[1],e[2],t]}function pi(e,t){return[t===`float`?1:e===`rgb`?255:360,t===`float`?1:e===`rgb`?255:100,t===`float`?1:e===`rgb`?255:100]}function mi(e,t){return e===t?t:An(e,t)}function hi(e,t,n){let r=pi(t,n);return[t===`rgb`?N(e[0],0,r[0]):mi(e[0],r[0]),N(e[1],0,r[1]),N(e[2],0,r[2]),N(e[3]??1,0,1)]}function gi(e,t,n,r){let i=pi(t,n),a=pi(t,r);return e.map((e,t)=>e/i[t]*a[t])}function _i(e,t,n){let r=gi(e,t.mode,t.type,`int`);return gi(cc[t.mode][n.mode](...r),n.mode,`int`,n.type)}function vi(e){return e===`int`?`int`:e===`float`?`float`:void 0}function yi(e){return P(e,e=>({color:e.optional.object({alpha:e.optional.boolean,type:e.optional.custom(vi)}),expanded:e.optional.boolean,picker:e.optional.custom(ri),readonly:e.optional.constant(!1)}))}function bi(e){return e?.1:1}function xi(e){return e.color?.type}function Si(e,t,n){return fc[n](e,t)}function Ci(e){return e.type===`float`}function wi(e){return e.type===`int`}function Ti(e){let t=e.getComponents(),n=pi(e.mode,`int`);return new Y([Math.round(M(t[0],0,1,0,n[0])),Math.round(M(t[1],0,1,0,n[1])),Math.round(M(t[2],0,1,0,n[2])),t[3]],e.mode)}function Ei(e){let t=e.getComponents(),n=pi(e.mode,`int`);return new dc([M(t[0],0,n[0],0,1),M(t[1],0,n[1],0,1),M(t[2],0,n[2],0,1),t[3]],e.mode)}function H(e,t){if(e.type===t)return e;if(wi(e)&&t===`float`)return Ei(e);if(Ci(e)&&t===`int`)return Ti(e);throw W.shouldNeverHappen()}function Di(e,t){return e.alpha===t.alpha&&e.mode===t.mode&&e.notation===t.notation&&e.type===t.type}function U(e,t){let n=e.match(/^(.+)%$/);return Math.min(n?parseFloat(n[1])*.01*t:parseFloat(e),t)}function Oi(e){let t=e.match(/^([0-9.]+?)(deg|grad|rad|turn)$/);if(!t)return parseFloat(e);let n=parseFloat(t[1]),r=t[2];return pc[r](n)}function ki(e){let t=e.match(/^rgb\(\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*\)$/);if(!t)return null;let n=[U(t[1],255),U(t[2],255),U(t[3],255)];return isNaN(n[0])||isNaN(n[1])||isNaN(n[2])?null:n}function Ai(e){let t=ki(e);return t?new Y(t,`rgb`):null}function ji(e){let t=e.match(/^rgba\(\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*\)$/);if(!t)return null;let n=[U(t[1],255),U(t[2],255),U(t[3],255),U(t[4],1)];return isNaN(n[0])||isNaN(n[1])||isNaN(n[2])||isNaN(n[3])?null:n}function Mi(e){let t=ji(e);return t?new Y(t,`rgb`):null}function Ni(e){let t=e.match(/^hsl\(\s*([0-9A-Fa-f.]+(?:deg|grad|rad|turn)?)\s*,\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*\)$/);if(!t)return null;let n=[Oi(t[1]),U(t[2],100),U(t[3],100)];return isNaN(n[0])||isNaN(n[1])||isNaN(n[2])?null:n}function Pi(e){let t=Ni(e);return t?new Y(t,`hsl`):null}function Fi(e){let t=e.match(/^hsla\(\s*([0-9A-Fa-f.]+(?:deg|grad|rad|turn)?)\s*,\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*\)$/);if(!t)return null;let n=[Oi(t[1]),U(t[2],100),U(t[3],100),U(t[4],1)];return isNaN(n[0])||isNaN(n[1])||isNaN(n[2])||isNaN(n[3])?null:n}function Ii(e){let t=Fi(e);return t?new Y(t,`hsl`):null}function Li(e){let t=e.match(/^#([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])$/);if(t)return[parseInt(t[1]+t[1],16),parseInt(t[2]+t[2],16),parseInt(t[3]+t[3],16)];let n=e.match(/^(?:#|0x)([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/);return n?[parseInt(n[1],16),parseInt(n[2],16),parseInt(n[3],16)]:null}function Ri(e){let t=Li(e);return t?new Y(t,`rgb`):null}function zi(e){let t=e.match(/^#([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])$/);if(t)return[parseInt(t[1]+t[1],16),parseInt(t[2]+t[2],16),parseInt(t[3]+t[3],16),M(parseInt(t[4]+t[4],16),0,255,0,1)];let n=e.match(/^(?:#|0x)?([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/);return n?[parseInt(n[1],16),parseInt(n[2],16),parseInt(n[3],16),M(parseInt(n[4],16),0,255,0,1)]:null}function Bi(e){let t=zi(e);return t?new Y(t,`rgb`):null}function Vi(e){let t=e.match(/^\{\s*r\s*:\s*([0-9A-Fa-f.]+%?)\s*,\s*g\s*:\s*([0-9A-Fa-f.]+%?)\s*,\s*b\s*:\s*([0-9A-Fa-f.]+%?)\s*\}$/);if(!t)return null;let n=[parseFloat(t[1]),parseFloat(t[2]),parseFloat(t[3])];return isNaN(n[0])||isNaN(n[1])||isNaN(n[2])?null:n}function Hi(e){return t=>{let n=Vi(t);return n?Si(n,`rgb`,e):null}}function Ui(e){let t=e.match(/^\{\s*r\s*:\s*([0-9A-Fa-f.]+%?)\s*,\s*g\s*:\s*([0-9A-Fa-f.]+%?)\s*,\s*b\s*:\s*([0-9A-Fa-f.]+%?)\s*,\s*a\s*:\s*([0-9A-Fa-f.]+%?)\s*\}$/);if(!t)return null;let n=[parseFloat(t[1]),parseFloat(t[2]),parseFloat(t[3]),parseFloat(t[4])];return isNaN(n[0])||isNaN(n[1])||isNaN(n[2])||isNaN(n[3])?null:n}function Wi(e){return t=>{let n=Ui(t);return n?Si(n,`rgb`,e):null}}function Gi(e){return mc.reduce((t,{parser:n,result:r})=>t||(n(e)?r:null),null)}function Ki(e,t=`int`){let n=Gi(e);return n?n.notation===`hex`&&t!==`float`?Object.assign(Object.assign({},n),{type:`int`}):n.notation===`func`?Object.assign(Object.assign({},n),{type:t}):null:null}function qi(e){let t=[Ri,Bi,Ai,Mi,Pi,Ii];e===`int`&&t.push(Hi(`int`),Wi(`int`)),e===`float`&&t.push(Hi(`float`),Wi(`float`));let n=Vr(t);return t=>{let r=n(t);return r?H(r,e):null}}function Ji(e){let t=qi(`int`);return typeof e==`string`?t(e)??Y.black():Y.black()}function Yi(e){let t=N(Math.floor(e),0,255).toString(16);return t.length===1?`0${t}`:t}function Xi(e,t=`#`){return`${t}${V(e.getComponents(`rgb`)).map(Yi).join(``)}`}function Zi(e,t=`#`){let n=e.getComponents(`rgb`);return`${t}${[n[0],n[1],n[2],n[3]*255].map(Yi).join(``)}`}function Qi(e){let t=j(0);return`rgb(${V(H(e,`int`).getComponents(`rgb`)).map(e=>t(e)).join(`, `)})`}function $i(e){let t=j(2),n=j(0);return`rgba(${H(e,`int`).getComponents(`rgb`).map((e,r)=>(r===3?t:n)(e)).join(`, `)})`}function ea(e){let t=[j(0),Hr,Hr];return`hsl(${V(H(e,`int`).getComponents(`hsl`)).map((e,n)=>t[n](e)).join(`, `)})`}function ta(e){let t=[j(0),Hr,Hr,j(2)];return`hsla(${H(e,`int`).getComponents(`hsl`).map((e,n)=>t[n](e)).join(`, `)})`}function na(e,t){let n=j(t===`float`?2:0),r=[`r`,`g`,`b`];return`{${V(H(e,t).getComponents(`rgb`)).map((e,t)=>`${r[t]}: ${n(e)}`).join(`, `)}}`}function ra(e){return t=>na(t,e)}function ia(e,t){let n=j(2),r=j(t===`float`?2:0),i=[`r`,`g`,`b`,`a`];return`{${H(e,t).getComponents(`rgb`).map((e,t)=>{let a=t===3?n:r;return`${i[t]}: ${a(e)}`}).join(`, `)}}`}function aa(e){return t=>ia(t,e)}function oa(e){return hc.reduce((t,n)=>t||(Di(n.format,e)?n.stringifier:null),null)}function sa(e){let t=e.createElement(`select`);return t.appendChild([{text:`RGB`,value:`rgb`},{text:`HSL`,value:`hsl`},{text:`HSV`,value:`hsv`},{text:`HEX`,value:`hex`}].reduce((t,n)=>{let r=e.createElement(`option`);return r.textContent=n.text,r.value=n.value,t.appendChild(r),t},e.createDocumentFragment())),t}function ca(e){return j(e===`float`?2:0)}function la(e,t,n){let r=pi(e,t)[n];return new go({min:0,max:r})}function ua(e,t,n){return new Js(e,{arrayPosition:n===0?`fst`:n===2?`lst`:`mid`,parser:t.parser,props:K.fromObject({formatter:ca(t.colorType),keyScale:bi(!1),pointerScale:t.colorType===`float`?.01:1}),value:A(0,{constraint:la(t.colorMode,t.colorType,n)}),viewProps:t.viewProps})}function da(e,t){let n={colorMode:t.colorMode,colorType:t.colorType,parser:En,viewProps:t.viewProps};return[0,1,2].map(r=>{let i=ua(e,n,r);return Gr({primary:t.value,secondary:i.value,forward(e){return H(e,t.colorType).getComponents(t.colorMode)[r]},backward(e,n){let i=t.colorMode,a=H(e,t.colorType).getComponents(i);return a[r]=n,H(Si(fi(V(a),a[3]),i,t.colorType),`int`)}}),i})}function fa(e,t){let n=new Ws(e,{parser:qi(`int`),props:K.fromObject({formatter:Xi}),value:A(Y.black()),viewProps:t.viewProps});return Gr({primary:t.value,secondary:n.value,forward:e=>new Y(V(e.getComponents()),e.mode),backward:(e,t)=>new Y(fi(V(t.getComponents(e.mode)),e.getComponents()[3]),e.mode)}),[n]}function pa(e){return e!==`hex`}function ma(e){return V(e.getComponents(`rgb`)).reduce((e,t)=>e<<8|Math.floor(t)&255,0)}function ha(e){return e.getComponents(`rgb`).reduce((e,t,n)=>{let r=Math.floor(n===3?t*255:t)&255;return e<<8|r},0)>>>0}function ga(e){return new Y([e>>16&255,e>>8&255,e&255],`rgb`)}function _a(e){return new Y([e>>24&255,e>>16&255,e>>8&255,M(e&255,0,255,0,1)],`rgb`)}function va(e){return typeof e==`number`?ga(e):Y.black()}function ya(e){return typeof e==`number`?_a(e):Y.black()}function ba(e,t){return typeof e!=`object`||k(e)?!1:t in e&&typeof e[t]==`number`}function xa(e){return ba(e,`r`)&&ba(e,`g`)&&ba(e,`b`)}function Sa(e){return xa(e)&&ba(e,`a`)}function Ca(e){return xa(e)}function wa(e,t){if(e.mode!==t.mode||e.type!==t.type)return!1;let n=e.getComponents(),r=t.getComponents();for(let e=0;e<n.length;e++)if(n[e]!==r[e])return!1;return!0}function Ta(e){return`a`in e?[e.r,e.g,e.b,e.a]:[e.r,e.g,e.b]}function Ea(e){let t=oa(e);return t?(e,n)=>{ii(e,t(n))}:null}function Da(e){let t=e?ha:ma;return(e,n)=>{ii(e,t(n))}}function Oa(e,t,n){let r=H(t,n).toRgbaObject();e.writeProperty(`r`,r.r),e.writeProperty(`g`,r.g),e.writeProperty(`b`,r.b),e.writeProperty(`a`,r.a)}function ka(e,t,n){let r=H(t,n).toRgbaObject();e.writeProperty(`r`,r.r),e.writeProperty(`g`,r.g),e.writeProperty(`b`,r.b)}function Aa(e,t){return(n,r)=>{e?Oa(n,r,t):ka(n,r,t)}}function ja(e){return!!e?.color?.alpha}function Ma(e){return e?e=>Zi(e,`0x`):e=>Xi(e,`0x`)}function Na(e){return`color`in e||e.view===`color`}function Pa(e,t){if(!Ca(e))return H(Y.black(),t);if(t===`int`){let t=Ta(e);return new Y(t,`rgb`)}if(t===`float`){let t=Ta(e);return new dc(t,`rgb`)}return H(Y.black(),`int`)}function Fa(e){return Sa(e)}function Ia(e){return t=>H(Pa(t,e),`int`)}function La(e,t){return n=>e?ia(n,t):na(n,t)}function Ra(e,t,n){return new Js(e,{arrayPosition:n===0?`fst`:n===t.axes.length-1?`lst`:`mid`,parser:t.parser,props:t.axes[n].textProps,value:A(0,{constraint:t.axes[n].constraint}),viewProps:t.viewProps})}function za(e,t){let n=[],r=Pn(e,t);r&&n.push(r);let i=Fn(e);i&&n.push(i);let a=Lr(e.options);return a&&n.push(a),new Ps(n)}function Ba(e,t,n){return[B(t[0],qr(e)),B(t[1],Kr(e))*(n?1:-1)]}function Va(e){return Uc.isObject(e)?new Uc(e.x,e.y):new Uc}function Ha(e,t){e.writeProperty(`x`,t.x),e.writeProperty(`y`,t.y)}function Ua(e,t){return new Lc({assembly:Wc,components:[ti(Object.assign(Object.assign({},e),e.x),t.x),ti(Object.assign(Object.assign({},e),e.y),t.y)]})}function Wa(e,t){if(!k(e.min)||!k(e.max))return Math.max(Math.abs(e.min??0),Math.abs(e.max??0));let n=Mn(e);return Math.max(Math.abs(n)*10,Math.abs(t)*10)}function Ga(e,t){let n=Wa(Qt(e,e.x??{}),t.x),r=Wa(Qt(e,e.y??{}),t.y);return Math.max(n,r)}function Ka(e){if(!(`y`in e))return!1;let t=e.y;return t?`inverted`in t&&!!t.inverted:!1}function qa(e){return Zc.isObject(e)?new Zc(e.x,e.y,e.z):new Zc}function Ja(e,t){e.writeProperty(`x`,t.x),e.writeProperty(`y`,t.y),e.writeProperty(`z`,t.z)}function Ya(e,t){return new Lc({assembly:Qc,components:[ti(Object.assign(Object.assign({},e),e.x),t.x),ti(Object.assign(Object.assign({},e),e.y),t.y),ti(Object.assign(Object.assign({},e),e.z),t.z)]})}function Xa(e){return el.isObject(e)?new el(e.x,e.y,e.z,e.w):new el}function Za(e,t){e.writeProperty(`x`,t.x),e.writeProperty(`y`,t.y),e.writeProperty(`z`,t.z),e.writeProperty(`w`,t.w)}function Qa(e,t){return new Lc({assembly:tl,components:[ti(Object.assign(Object.assign({},e),e.x),t.x),ti(Object.assign(Object.assign({},e),e.y),t.y),ti(Object.assign(Object.assign({},e),e.z),t.z),ti(Object.assign(Object.assign({},e),e.w),t.w)]})}function $a(e){let t=[],n=Lr(e.options);return n&&t.push(n),new Ps(t)}function eo(e){return k(e.format)?j(2):e.format}function to(e){return e.value.rawValue.length===1?new ul(e.document,{formatter:eo(e.params),value:e.value,viewProps:e.viewProps}):new sl(e.document,{formatter:eo(e.params),rows:e.params.rows??il.monitor.defaultRows,value:e.value,viewProps:e.viewProps})}function no(e){return new hl(e.document,{formatter:eo(e.params),rows:e.params.rows??il.monitor.defaultRows,props:K.fromObject({max:e.params.max??100,min:e.params.min??0}),value:e.value,viewProps:e.viewProps})}function ro(e){return e.view===`graph`}function io(e,t){let n=e.accept(t.target.read(),t.params);if(k(n))return null;let r={target:t.target,initialValue:n.initialValue,params:n.params},i=P(t.params,e=>({disabled:e.optional.boolean,hidden:e.optional.boolean,label:e.optional.string,tag:e.optional.string})),a=e.binding.reader(r),o=e.binding.constraint?e.binding.constraint(r):void 0,s=new yl({reader:a,target:t.target,writer:e.binding.writer(r)}),c=new Po(A(a(n.initialValue),{constraint:o,equals:e.binding.equals}),s),l=e.controller({constraint:o,document:t.document,initialValue:n.initialValue,params:n.params,value:c,viewProps:gs.create({disabled:i?.disabled,hidden:i?.hidden})});return new Ko(t.document,{blade:Or(),props:K.fromObject({label:`label`in t.params?i?.label??null:t.target.key}),tag:i?.tag,value:c,valueController:l})}function ao(e,t){return t===0?new Ms:new Ns(e,t??il.monitor.defaultInterval)}function oo(e,t){let n=e.accept(t.target.read(),t.params);if(k(n))return null;let r={target:t.target,initialValue:n.initialValue,params:n.params},i=P(t.params,e=>({bufferSize:e.optional.number,disabled:e.optional.boolean,hidden:e.optional.boolean,interval:e.optional.number,label:e.optional.string})),a=e.binding.reader(r),o=i?.bufferSize??(e.binding.defaultBufferSize&&e.binding.defaultBufferSize(n.params))??1,s=new qo({binding:new bl({reader:a,target:t.target}),bufferSize:o,ticker:ao(t.document,i?.interval)}),c=e.controller({document:t.document,params:n.params,value:s,viewProps:gs.create({disabled:i?.disabled,hidden:i?.hidden})});return c.viewProps.bindDisabled(s.ticker),c.viewProps.handleDispose(()=>{s.ticker.dispose()}),new Jo(t.document,{blade:Or(),props:K.fromObject({label:`label`in t.params?i?.label??null:t.target.key}),value:s,valueController:c})}function so(){let e=new xl(Sl);return[Xc,$c,nl,rl,Hc,Ic,Fc,Pc,ac,dl,_l,gl,ns,ms,As].forEach(t=>{e.register(`core`,t)}),e}function co(e){let t=e.createElement(`div`);return t.classList.add(R(`dfw`)()),e.body&&e.body.appendChild(t),t}function lo(e,t,n){if(e.querySelector(`style[data-tp-style=${t}]`))return;let r=e.createElement(`style`);r.dataset.tpStyle=t,r.textContent=n,e.head.appendChild(r)}var uo,W,fo,G,po,mo,ho,K,go,_o,vo,yo,bo,xo,So,Co,wo,To,Eo,Do,Oo,ko,Ao,jo,Mo,No,Po,Fo,q,Io,Lo,Ro,zo,Bo,Vo,Ho,Uo,Wo,Go,Ko,qo,Jo,Yo,Xo,Zo,Qo,$o,es,ts,ns,rs,is,as,os,ss,cs,ls,us,ds,fs,ps,ms,hs,gs,_s,vs,ys,bs,xs,Ss,Cs,ws,Ts,Es,Ds,Os,ks,As,js,Ms,Ns,Ps,Fs,Is,Ls,Rs,zs,Bs,Vs,Hs,Us,Ws,Gs,Ks,J,qs,Js,Ys,Xs,Zs,Qs,$s,ec,tc,nc,rc,ic,ac,oc,sc,cc,Y,lc,uc,dc,fc,pc,mc,hc,gc,_c,vc,yc,bc,xc,Sc,Cc,wc,Tc,Ec,Dc,Oc,kc,Ac,jc,Mc,Nc,Pc,Fc,Ic,Lc,Rc,zc,Bc,Vc,Hc,Uc,Wc,Gc,Kc,X,qc,Jc,Yc,Xc,Zc,Qc,$c,el,tl,nl,rl,il,al,ol,sl,cl,ll,ul,dl,fl,pl,ml,hl,gl,_l,vl,yl,bl,xl,Sl,Cl,wl,Tl,El,Dl,Ol,kl,Al,jl,Ml,Nl,Pl,Fl,Z;function Il(){return(Il=e((()=>{uo={alreadydisposed:()=>`View has been already disposed`,invalidparams:e=>`Invalid parameters for '${e.name}'`,nomatchingcontroller:e=>`No matching controller for '${e.key}'`,nomatchingview:e=>`No matching view for '${JSON.stringify(e.params)}'`,notbindable:()=>`Value is not bindable`,notcompatible:e=>`Not compatible with  plugin '${e.id}'`,propertynotfound:e=>`Property '${e.name}' not found`,shouldneverhappen:()=>`This error should never happen`},W=class e{static alreadyDisposed(){return new e({type:`alreadydisposed`})}static notBindable(){return new e({type:`notbindable`})}static notCompatible(t,n){return new e({type:`notcompatible`,context:{id:`${t}.${n}`}})}static propertyNotFound(t){return new e({type:`propertynotfound`,context:{name:t}})}static shouldNeverHappen(){return new e({type:`shouldneverhappen`})}constructor(e){this.message=uo[e.type](O(e.context))??`Unexpected error`,this.name=this.constructor.name,this.stack=Error(this.message).stack,this.type=e.type}toString(){return this.message}},fo=class e{constructor(e,t){this.obj_=e,this.key=t}static isBindable(e){return!(e===null||typeof e!=`object`&&typeof e!=`function`)}read(){return this.obj_[this.key]}write(e){this.obj_[this.key]=e}writeProperty(t,n){let r=this.read();if(!e.isBindable(r))throw W.notBindable();if(!(t in r))throw W.propertyNotFound(t);r[t]=n}},G=class{constructor(){this.observers_={}}on(e,t,n){let r=this.observers_[e];return r||=this.observers_[e]=[],r.push({handler:t,key:n?.key??t}),this}off(e,t){let n=this.observers_[e];return n&&(this.observers_[e]=n.filter(e=>e.key!==t)),this}emit(e,t){let n=this.observers_[e];n&&n.forEach(e=>{e.handler(t)})}},po=class{constructor(e,t){this.constraint_=t?.constraint,this.equals_=t?.equals??((e,t)=>e===t),this.emitter=new G,this.rawValue_=e}get constraint(){return this.constraint_}get rawValue(){return this.rawValue_}set rawValue(e){this.setRawValue(e,{forceEmit:!1,last:!0})}setRawValue(e,t){let n=t??{forceEmit:!1,last:!0},r=this.constraint_?this.constraint_.constrain(e):e,i=this.rawValue_;(!this.equals_(i,r)||n.forceEmit)&&(this.emitter.emit(`beforechange`,{sender:this}),this.rawValue_=r,this.emitter.emit(`change`,{options:n,previousRawValue:i,rawValue:r,sender:this}))}},mo=class{constructor(e){this.emitter=new G,this.value_=e}get rawValue(){return this.value_}set rawValue(e){this.setRawValue(e,{forceEmit:!1,last:!0})}setRawValue(e,t){let n=t??{forceEmit:!1,last:!0},r=this.value_;(r!==e||n.forceEmit)&&(this.emitter.emit(`beforechange`,{sender:this}),this.value_=e,this.emitter.emit(`change`,{options:n,previousRawValue:r,rawValue:this.value_,sender:this}))}},ho=class{constructor(e){this.emitter=new G,this.onValueBeforeChange_=this.onValueBeforeChange_.bind(this),this.onValueChange_=this.onValueChange_.bind(this),this.value_=e,this.value_.emitter.on(`beforechange`,this.onValueBeforeChange_),this.value_.emitter.on(`change`,this.onValueChange_)}get rawValue(){return this.value_.rawValue}onValueBeforeChange_(e){this.emitter.emit(`beforechange`,Object.assign(Object.assign({},e),{sender:this}))}onValueChange_(e){this.emitter.emit(`change`,Object.assign(Object.assign({},e),{sender:this}))}},K=class e{constructor(e){this.emitter=new G,this.valMap_=e;for(let e in this.valMap_)this.valMap_[e].emitter.on(`change`,()=>{this.emitter.emit(`change`,{key:e,sender:this})})}static createCore(e){return Object.keys(e).reduce((t,n)=>Object.assign(t,{[n]:A(e[n])}),{})}static fromObject(t){let n=this.createCore(t);return new e(n)}get(e){return this.valMap_[e].rawValue}set(e,t){this.valMap_[e].rawValue=t}value(e){return this.valMap_[e]}},go=class{constructor(e){this.values=K.fromObject({max:e.max,min:e.min})}constrain(e){let t=this.values.get(`max`),n=this.values.get(`min`);return Math.min(Math.max(e,n),t)}},_o=class{constructor(e){this.values=K.fromObject({max:e.max,min:e.min})}constrain(e){let t=this.values.get(`max`),n=this.values.get(`min`),r=e;return k(n)||(r=Math.max(r,n)),k(t)||(r=Math.min(r,t)),r}},vo=class{constructor(e,t=0){this.step=e,this.origin=t}constrain(e){let t=this.origin%this.step;return t+Math.round((e-t)/this.step)*this.step}},yo=class{constructor(e){this.text=e}evaluate(){return Number(this.text)}toString(){return this.text}},bo={"**":(e,t)=>e**+t,"*":(e,t)=>e*t,"/":(e,t)=>e/t,"%":(e,t)=>e%t,"+":(e,t)=>e+t,"-":(e,t)=>e-t,"<<":(e,t)=>e<<t,">>":(e,t)=>e>>t,">>>":(e,t)=>e>>>t,"&":(e,t)=>e&t,"^":(e,t)=>e^t,"|":(e,t)=>e|t},xo=class{constructor(e,t,n){this.left=t,this.operator=e,this.right=n}evaluate(){let e=bo[this.operator];if(!e)throw Error(`unexpected binary operator: '${this.operator}`);return e(this.left.evaluate(),this.right.evaluate())}toString(){return[`b(`,this.left.toString(),this.operator,this.right.toString(),`)`].join(` `)}},So={"+":e=>e,"-":e=>-e,"~":e=>~e},Co=class{constructor(e,t){this.operator=e,this.expression=t}evaluate(){let e=So[this.operator];if(!e)throw Error(`unexpected unary operator: '${this.operator}`);return e(this.expression.evaluate())}toString(){return[`u(`,this.operator,this.expression.toString(),`)`].join(` `)}},wo=tn([ln,un,dn]),To=tn([tn([pn,hn,_n]),wo]),Eo=[[`**`],[`*`,`/`,`%`],[`+`,`-`],[`<<`,`>>>`,`>>`],[`&`],[`^`],[`|`]].reduce((e,t)=>Cn(e,t),xn),Do=class{constructor(e){this.controller=e}get element(){return this.controller.view.element}get disabled(){return this.controller.viewProps.get(`disabled`)}set disabled(e){this.controller.viewProps.set(`disabled`,e)}get hidden(){return this.controller.viewProps.get(`hidden`)}set hidden(e){this.controller.viewProps.set(`hidden`,e)}dispose(){this.controller.viewProps.set(`disposed`,!0)}importState(e){return this.controller.importState(e)}exportState(){return this.controller.exportState()}},Oo=class{constructor(e){this.target=e}},ko=class extends Oo{constructor(e,t,n){super(e),this.value=t,this.last=n??!0}},Ao=class extends Oo{constructor(e,t){super(e),this.expanded=t}},jo=class extends Oo{constructor(e,t){super(e),this.index=t}},Mo=class extends Oo{constructor(e,t){super(e),this.native=t}},No=class extends Do{constructor(e){super(e),this.onValueChange_=this.onValueChange_.bind(this),this.emitter_=new G,this.controller.value.emitter.on(`change`,this.onValueChange_)}get label(){return this.controller.labelController.props.get(`label`)}set label(e){this.controller.labelController.props.set(`label`,e)}get key(){return this.controller.value.binding.target.key}get tag(){return this.controller.tag}set tag(e){this.controller.tag=e}on(e,t){let n=t.bind(this);return this.emitter_.on(e,e=>{n(e)},{key:t}),this}off(e,t){return this.emitter_.off(e,t),this}refresh(){this.controller.value.fetch()}onValueChange_(e){let t=this.controller.value;this.emitter_.emit(`change`,new ko(this,O(t.binding.target.read()),e.options.last))}},Po=class{constructor(e,t){this.onValueBeforeChange_=this.onValueBeforeChange_.bind(this),this.onValueChange_=this.onValueChange_.bind(this),this.binding=t,this.value_=e,this.value_.emitter.on(`beforechange`,this.onValueBeforeChange_),this.value_.emitter.on(`change`,this.onValueChange_),this.emitter=new G}get rawValue(){return this.value_.rawValue}set rawValue(e){this.value_.rawValue=e}setRawValue(e,t){this.value_.setRawValue(e,t)}fetch(){this.value_.rawValue=this.binding.read()}push(){this.binding.write(this.value_.rawValue)}onValueBeforeChange_(e){this.emitter.emit(`beforechange`,Object.assign(Object.assign({},e),{sender:this}))}onValueChange_(e){this.push(),this.emitter.emit(`change`,Object.assign(Object.assign({},e),{sender:this}))}},Fo={optional:Wn(!0),required:Wn(!1)},q=`http://www.w3.org/2000/svg`,Io={check:`<path d="M2 8l4 4l8 -8"/>`,dropdown:`<path d="M5 7h6l-3 3 z"/>`,p2dpad:`<path d="M8 4v8"/><path d="M4 8h8"/><circle cx="12" cy="12" r="1.2"/>`},Lo=`tp`,Ro=R(`lbl`),zo=class{constructor(e,t){this.element=e.createElement(`div`),this.element.classList.add(Ro()),t.viewProps.bindClassModifiers(this.element);let n=e.createElement(`div`);n.classList.add(Ro(`l`)),L(t.props,`label`,t=>{k(t)?this.element.classList.add(Ro(void 0,`nol`)):(this.element.classList.remove(Ro(void 0,`nol`)),rr(n),n.appendChild(or(e,t)))}),this.element.appendChild(n),this.labelElement=n;let r=e.createElement(`div`);r.classList.add(Ro(`v`)),this.element.appendChild(r),this.valueElement=r}},Bo=class{constructor(e,t){this.props=t.props,this.valueController=t.valueController,this.viewProps=t.valueController.viewProps,this.view=new zo(e,{props:t.props,viewProps:this.viewProps}),this.view.valueElement.appendChild(this.valueController.view.element)}importProps(e){return F(e,null,e=>({label:e.optional.string}),e=>(this.props.set(`label`,e.label),!0))}exportProps(){return I(null,{label:this.props.get(`label`)})}},Vo=R(``),Ho={veryfirst:`vfst`,first:`fst`,last:`lst`,verylast:`vlst`},Uo=class{constructor(e){this.parent_=null,this.blade=e.blade,this.view=e.view,this.viewProps=e.viewProps;let t=this.view.element;this.blade.value(`positions`).emitter.on(`change`,()=>{sr().forEach(e=>{t.classList.remove(Vo(void 0,Ho[e]))}),this.blade.get(`positions`).forEach(e=>{t.classList.add(Vo(void 0,Ho[e]))})}),this.viewProps.handleDispose(()=>{tr(t)})}get parent(){return this.parent_}set parent(e){this.parent_=e,this.viewProps.set(`parent`,this.parent_?this.parent_.viewProps:null)}importState(e){return F(e,null,e=>({disabled:e.required.boolean,hidden:e.required.boolean}),e=>(this.viewProps.importState(e),!0))}exportState(){return I(null,Object.assign({},this.viewProps.exportState()))}},Wo=class extends Uo{constructor(e,t){if(t.value!==t.valueController.value)throw W.shouldNeverHappen();let n=t.valueController.viewProps,r=new Bo(e,{blade:t.blade,props:t.props,valueController:t.valueController});super(Object.assign(Object.assign({},t),{view:new zo(e,{props:t.props,viewProps:n}),viewProps:n})),this.labelController=r,this.value=t.value,this.valueController=t.valueController,this.view.valueElement.appendChild(this.valueController.view.element)}importState(e){return F(e,t=>{var n;return super.importState(t)&&this.labelController.importProps(t)&&((n=this.valueController).importProps?.call(n,e)??!0)},e=>({value:e.optional.raw}),e=>(e.value&&(this.value.rawValue=e.value),!0))}exportState(){var e;return I(()=>super.exportState(),Object.assign(Object.assign({value:this.value.rawValue},this.labelController.exportProps()),(e=this.valueController).exportProps?.call(e)??{}))}},Go=class extends Wo{constructor(e,t){super(e,t),this.tag=t.tag}importState(e){return F(e,t=>super.importState(cr(e)),e=>({tag:e.optional.string}),e=>(this.tag=e.tag,!0))}exportState(){return I(()=>cr(super.exportState()),{binding:{key:this.value.binding.target.key,value:this.value.binding.target.read()},tag:this.tag})}},Ko=class extends Go{importState(e){return F(e,e=>super.importState(e),e=>({binding:e.required.object({value:e.required.raw})}),e=>(this.value.binding.inject(e.binding.value),this.value.fetch(),!0))}},qo=class{constructor(e){this.emitter=new G,this.onTick_=this.onTick_.bind(this),this.onValueBeforeChange_=this.onValueBeforeChange_.bind(this),this.onValueChange_=this.onValueChange_.bind(this),this.binding=e.binding,this.value_=A(fr(e.bufferSize)),this.value_.emitter.on(`beforechange`,this.onValueBeforeChange_),this.value_.emitter.on(`change`,this.onValueChange_),this.ticker=e.ticker,this.ticker.emitter.on(`tick`,this.onTick_),this.fetch()}get rawValue(){return this.value_.rawValue}set rawValue(e){this.value_.rawValue=e}setRawValue(e,t){this.value_.setRawValue(e,t)}fetch(){this.value_.rawValue=mr(this.value_.rawValue,this.binding.read())}onTick_(){this.fetch()}onValueBeforeChange_(e){this.emitter.emit(`beforechange`,Object.assign(Object.assign({},e),{sender:this}))}onValueChange_(e){this.emitter.emit(`change`,Object.assign(Object.assign({},e),{sender:this}))}},Jo=class extends Go{exportState(){return I(()=>super.exportState(),{binding:{readonly:!0}})}},Yo=class extends Do{get label(){return this.controller.labelController.props.get(`label`)}set label(e){this.controller.labelController.props.set(`label`,e)}get title(){return this.controller.buttonController.props.get(`title`)??``}set title(e){this.controller.buttonController.props.set(`title`,e)}on(e,t){let n=t.bind(this);return this.controller.buttonController.emitter.on(e,e=>{n(new Mo(this,e.nativeEvent))}),this}off(e,t){return this.controller.buttonController.emitter.off(e,t),this}},Xo=R(`btn`),Zo=class{constructor(e,t){this.element=e.createElement(`div`),this.element.classList.add(Xo()),t.viewProps.bindClassModifiers(this.element);let n=e.createElement(`button`);n.classList.add(Xo(`b`)),t.viewProps.bindDisabled(n),this.element.appendChild(n),this.buttonElement=n;let r=e.createElement(`div`);r.classList.add(Xo(`t`)),yr(t.props.value(`title`),r),this.buttonElement.appendChild(r)}},Qo=class{constructor(e,t){this.emitter=new G,this.onClick_=this.onClick_.bind(this),this.props=t.props,this.viewProps=t.viewProps,this.view=new Zo(e,{props:this.props,viewProps:this.viewProps}),this.view.buttonElement.addEventListener(`click`,this.onClick_)}importProps(e){return F(e,null,e=>({title:e.optional.string}),e=>(this.props.set(`title`,e.title),!0))}exportProps(){return I(null,{title:this.props.get(`title`)})}onClick_(e){this.emitter.emit(`click`,{nativeEvent:e,sender:this})}},$o=class extends Uo{constructor(e,t){let n=new Qo(e,{props:t.buttonProps,viewProps:t.viewProps}),r=new Bo(e,{blade:t.blade,props:t.labelProps,valueController:n});super({blade:t.blade,view:r.view,viewProps:t.viewProps}),this.buttonController=n,this.labelController=r}importState(e){return F(e,e=>super.importState(e)&&this.buttonController.importProps(e)&&this.labelController.importProps(e),()=>({}),()=>!0)}exportState(){return I(()=>super.exportState(),Object.assign(Object.assign({},this.buttonController.exportProps()),this.labelController.exportProps()))}},es=class{constructor(e){let[t,n]=e.split(`-`),r=t.split(`.`);this.major=parseInt(r[0],10),this.minor=parseInt(r[1],10),this.patch=parseInt(r[2],10),this.prerelease=n??null}toString(){let e=[this.major,this.minor,this.patch].join(`.`);return this.prerelease===null?e:[e,this.prerelease].join(`-`)}},ts=new es(`2.0.5`),ns=z({id:`button`,type:`blade`,accept(e){let t=P(e,e=>({title:e.required.string,view:e.required.constant(`button`),label:e.optional.string}));return t?{params:t}:null},controller(e){return new $o(e.document,{blade:e.blade,buttonProps:K.fromObject({title:e.params.title}),labelProps:K.fromObject({label:e.params.label}),viewProps:e.viewProps})},api(e){return e.controller instanceof $o?new Yo(e.controller):null}}),rs=class{constructor(e,t){this.onRackValueChange_=this.onRackValueChange_.bind(this),this.controller_=e,this.emitter_=new G,this.pool_=t,this.controller_.rack.emitter.on(`valuechange`,this.onRackValueChange_)}get children(){return this.controller_.rack.children.map(e=>this.pool_.createApi(e))}addBinding(e,t,n){let r=n??{},i=this.controller_.element.ownerDocument,a=this.pool_.createBinding(i,wr(e,t),r),o=this.pool_.createBindingApi(a);return this.add(o,r.index)}addFolder(e){return xr(this,e)}addButton(e){return br(this,e)}addTab(e){return Sr(this,e)}add(e,t){let n=e.controller;return this.controller_.rack.add(n,t),e}remove(e){this.controller_.rack.remove(e.controller)}addBlade(e){let t=this.controller_.element.ownerDocument,n=this.pool_.createBlade(t,e),r=this.pool_.createApi(n);return this.add(r,e.index)}on(e,t){let n=t.bind(this);return this.emitter_.on(e,e=>{n(e)},{key:t}),this}off(e,t){return this.emitter_.off(e,t),this}refresh(){this.children.forEach(e=>{Cr(e)&&e.refresh()})}onRackValueChange_(e){let t=e.bladeController,n=this.pool_.createApi(t),r=Kn(t.value)?t.value.binding:null;this.emitter_.emit(`change`,new ko(n,r?r.target.read():t.value.rawValue,e.options.last))}},is=class extends Do{constructor(e,t){super(e),this.rackApi_=new rs(e.rackController,t)}refresh(){this.rackApi_.refresh()}},as=class extends Uo{constructor(e){super({blade:e.blade,view:e.view,viewProps:e.rackController.viewProps}),this.rackController=e.rackController}importState(e){return F(e,e=>super.importState(e),e=>({children:e.required.array(e.required.raw)}),e=>this.rackController.rack.children.every((t,n)=>t.importState(e.children[n])))}exportState(){return I(()=>super.exportState(),{children:this.rackController.rack.children.map(e=>e.exportState())})}},os=class{constructor(e){this.emitter=new G,this.items_=[],this.cache_=new Set,this.onSubListAdd_=this.onSubListAdd_.bind(this),this.onSubListRemove_=this.onSubListRemove_.bind(this),this.extract_=e}get items(){return this.items_}allItems(){return Array.from(this.cache_)}find(e){for(let t of this.allItems())if(e(t))return t;return null}includes(e){return this.cache_.has(e)}add(e,t){if(this.includes(e))throw W.shouldNeverHappen();let n=t===void 0?this.items_.length:t;this.items_.splice(n,0,e),this.cache_.add(e);let r=this.extract_(e);r&&(r.emitter.on(`add`,this.onSubListAdd_),r.emitter.on(`remove`,this.onSubListRemove_),r.allItems().forEach(e=>{this.cache_.add(e)})),this.emitter.emit(`add`,{index:n,item:e,root:this,target:this})}remove(e){let t=this.items_.indexOf(e);if(t<0)return;this.items_.splice(t,1),this.cache_.delete(e);let n=this.extract_(e);n&&(n.allItems().forEach(e=>{this.cache_.delete(e)}),n.emitter.off(`add`,this.onSubListAdd_),n.emitter.off(`remove`,this.onSubListRemove_)),this.emitter.emit(`remove`,{index:t,item:e,root:this,target:this})}onSubListAdd_(e){this.cache_.add(e.item),this.emitter.emit(`add`,{index:e.index,item:e.item,root:this,target:e.target})}onSubListRemove_(e){this.cache_.delete(e.item),this.emitter.emit(`remove`,{index:e.index,item:e.item,root:this,target:e.target})}},ss=class{constructor(e){var t;this.emitter=new G,this.onBladePositionsChange_=this.onBladePositionsChange_.bind(this),this.onSetAdd_=this.onSetAdd_.bind(this),this.onSetRemove_=this.onSetRemove_.bind(this),this.onChildDispose_=this.onChildDispose_.bind(this),this.onChildPositionsChange_=this.onChildPositionsChange_.bind(this),this.onChildValueChange_=this.onChildValueChange_.bind(this),this.onChildViewPropsChange_=this.onChildViewPropsChange_.bind(this),this.onRackLayout_=this.onRackLayout_.bind(this),this.onRackValueChange_=this.onRackValueChange_.bind(this),this.blade_=e.blade??null,(t=this.blade_)==null||t.value(`positions`).emitter.on(`change`,this.onBladePositionsChange_),this.viewProps=e.viewProps,this.bcSet_=new os(Dr),this.bcSet_.emitter.on(`add`,this.onSetAdd_),this.bcSet_.emitter.on(`remove`,this.onSetRemove_)}get children(){return this.bcSet_.items}add(e,t){var n;(n=e.parent)==null||n.remove(e),e.parent=this,this.bcSet_.add(e,t)}remove(e){e.parent=null,this.bcSet_.remove(e)}find(e){return this.bcSet_.allItems().filter(e)}onSetAdd_(e){this.updatePositions_();let t=e.target===e.root;if(this.emitter.emit(`add`,{bladeController:e.item,index:e.index,root:t,sender:this}),!t)return;let n=e.item;if(n.viewProps.emitter.on(`change`,this.onChildViewPropsChange_),n.blade.value(`positions`).emitter.on(`change`,this.onChildPositionsChange_),n.viewProps.handleDispose(this.onChildDispose_),Gn(n))n.value.emitter.on(`change`,this.onChildValueChange_);else if(Tr(n)){let e=n.rackController.rack;if(e){let t=e.emitter;t.on(`layout`,this.onRackLayout_),t.on(`valuechange`,this.onRackValueChange_)}}}onSetRemove_(e){this.updatePositions_();let t=e.target===e.root;if(this.emitter.emit(`remove`,{bladeController:e.item,root:t,sender:this}),!t)return;let n=e.item;if(Gn(n))n.value.emitter.off(`change`,this.onChildValueChange_);else if(Tr(n)){let e=n.rackController.rack;if(e){let t=e.emitter;t.off(`layout`,this.onRackLayout_),t.off(`valuechange`,this.onRackValueChange_)}}}updatePositions_(){let e=this.bcSet_.items.filter(e=>!e.viewProps.get(`hidden`)),t=e[0],n=e[e.length-1];this.bcSet_.items.forEach(e=>{let r=[];e===t&&(r.push(`first`),(!this.blade_||this.blade_.get(`positions`).includes(`veryfirst`))&&r.push(`veryfirst`)),e===n&&(r.push(`last`),(!this.blade_||this.blade_.get(`positions`).includes(`verylast`))&&r.push(`verylast`)),e.blade.set(`positions`,r)})}onChildPositionsChange_(){this.updatePositions_(),this.emitter.emit(`layout`,{sender:this})}onChildViewPropsChange_(e){this.updatePositions_(),this.emitter.emit(`layout`,{sender:this})}onChildDispose_(){this.bcSet_.items.filter(e=>e.viewProps.get(`disposed`)).forEach(e=>{this.bcSet_.remove(e)})}onChildValueChange_(e){let t=Er(this.find(Gn),e.sender);if(!t)throw W.alreadyDisposed();this.emitter.emit(`valuechange`,{bladeController:t,options:e.options,sender:this})}onRackLayout_(e){this.updatePositions_(),this.emitter.emit(`layout`,{sender:this})}onRackValueChange_(e){this.emitter.emit(`valuechange`,{bladeController:e.bladeController,options:e.options,sender:this})}onBladePositionsChange_(){this.updatePositions_()}},cs=class{constructor(e){this.onRackAdd_=this.onRackAdd_.bind(this),this.onRackRemove_=this.onRackRemove_.bind(this),this.element=e.element,this.viewProps=e.viewProps;let t=new ss({blade:e.root?void 0:e.blade,viewProps:e.viewProps});t.emitter.on(`add`,this.onRackAdd_),t.emitter.on(`remove`,this.onRackRemove_),this.rack=t,this.viewProps.handleDispose(()=>{for(let e=this.rack.children.length-1;e>=0;e--)this.rack.children[e].viewProps.set(`disposed`,!0)})}onRackAdd_(e){e.root&&er(this.element,e.bladeController.view.element,e.index)}onRackRemove_(e){e.root&&tr(e.bladeController.view.element)}},ls=class e extends K{constructor(e){super(e)}static create(t){let n={completed:!0,expanded:t,expandedHeight:null,shouldFixHeight:!1,temporaryExpanded:null},r=K.createCore(n);return new e(r)}get styleExpanded(){return this.get(`temporaryExpanded`)??this.get(`expanded`)}get styleHeight(){if(!this.styleExpanded)return`0`;let e=this.get(`expandedHeight`);return this.get(`shouldFixHeight`)&&!k(e)?`${e}px`:`auto`}bindExpandedClass(e,t){let n=()=>{this.styleExpanded?e.classList.add(t):e.classList.remove(t)};L(this,`expanded`,n),L(this,`temporaryExpanded`,n)}cleanUpTransition(){this.set(`shouldFixHeight`,!1),this.set(`expandedHeight`,null),this.set(`completed`,!0)}},us=class extends is{constructor(e,t){super(e,t),this.emitter_=new G,this.controller.foldable.value(`expanded`).emitter.on(`change`,e=>{this.emitter_.emit(`fold`,new Ao(this,e.sender.rawValue))}),this.rackApi_.on(`change`,e=>{this.emitter_.emit(`change`,e)})}get expanded(){return this.controller.foldable.get(`expanded`)}set expanded(e){this.controller.foldable.set(`expanded`,e)}get title(){return this.controller.props.get(`title`)}set title(e){this.controller.props.set(`title`,e)}get children(){return this.rackApi_.children}addBinding(e,t,n){return this.rackApi_.addBinding(e,t,n)}addFolder(e){return this.rackApi_.addFolder(e)}addButton(e){return this.rackApi_.addButton(e)}addTab(e){return this.rackApi_.addTab(e)}add(e,t){return this.rackApi_.add(e,t)}remove(e){this.rackApi_.remove(e)}addBlade(e){return this.rackApi_.addBlade(e)}on(e,t){let n=t.bind(this);return this.emitter_.on(e,e=>{n(e)},{key:t}),this}off(e,t){return this.emitter_.off(e,t),this}},ds=R(`cnt`),fs=class{constructor(e,t){this.className_=R(t.viewName??`fld`),this.element=e.createElement(`div`),this.element.classList.add(this.className_(),ds()),t.viewProps.bindClassModifiers(this.element),this.foldable_=t.foldable,this.foldable_.bindExpandedClass(this.element,this.className_(void 0,`expanded`)),L(this.foldable_,`completed`,vr(this.element,this.className_(void 0,`cpl`)));let n=e.createElement(`button`);n.classList.add(this.className_(`b`)),L(t.props,`title`,e=>{k(e)?this.element.classList.add(this.className_(void 0,`not`)):this.element.classList.remove(this.className_(void 0,`not`))}),t.viewProps.bindDisabled(n),this.element.appendChild(n),this.buttonElement=n;let r=e.createElement(`div`);r.classList.add(this.className_(`i`)),this.element.appendChild(r);let i=e.createElement(`div`);i.classList.add(this.className_(`t`)),yr(t.props.value(`title`),i),this.buttonElement.appendChild(i),this.titleElement=i;let a=e.createElement(`div`);a.classList.add(this.className_(`m`)),this.buttonElement.appendChild(a);let o=e.createElement(`div`);o.classList.add(this.className_(`c`)),this.element.appendChild(o),this.containerElement=o}},ps=class extends as{constructor(e,t){let n=ls.create(t.expanded??!0),r=new fs(e,{foldable:n,props:t.props,viewName:t.root?`rot`:void 0,viewProps:t.viewProps});super(Object.assign(Object.assign({},t),{rackController:new cs({blade:t.blade,element:r.containerElement,root:t.root,viewProps:t.viewProps}),view:r})),this.onTitleClick_=this.onTitleClick_.bind(this),this.props=t.props,this.foldable=n,jr(this.foldable,this.view.containerElement),this.rackController.rack.emitter.on(`add`,()=>{this.foldable.cleanUpTransition()}),this.rackController.rack.emitter.on(`remove`,()=>{this.foldable.cleanUpTransition()}),this.view.buttonElement.addEventListener(`click`,this.onTitleClick_)}get document(){return this.view.element.ownerDocument}importState(e){return F(e,e=>super.importState(e),e=>({expanded:e.required.boolean,title:e.optional.string}),e=>(this.foldable.set(`expanded`,e.expanded),this.props.set(`title`,e.title),!0))}exportState(){return I(()=>super.exportState(),{expanded:this.foldable.get(`expanded`),title:this.props.get(`title`)})}onTitleClick_(){this.foldable.set(`expanded`,!this.foldable.get(`expanded`))}},ms=z({id:`folder`,type:`blade`,accept(e){let t=P(e,e=>({title:e.required.string,view:e.required.constant(`folder`),expanded:e.optional.boolean}));return t?{params:t}:null},controller(e){return new ps(e.document,{blade:e.blade,expanded:e.params.expanded,props:K.fromObject({title:e.params.title}),viewProps:e.viewProps})},api(e){return e.controller instanceof ps?new us(e.controller,e.pool):null}}),hs=R(``),gs=class e extends K{constructor(e){var t;super(e),this.onDisabledChange_=this.onDisabledChange_.bind(this),this.onParentChange_=this.onParentChange_.bind(this),this.onParentGlobalDisabledChange_=this.onParentGlobalDisabledChange_.bind(this),[this.globalDisabled_,this.setGlobalDisabled_]=en(A(this.getGlobalDisabled_())),this.value(`disabled`).emitter.on(`change`,this.onDisabledChange_),this.value(`parent`).emitter.on(`change`,this.onParentChange_),(t=this.get(`parent`))==null||t.globalDisabled.emitter.on(`change`,this.onParentGlobalDisabledChange_)}static create(t){let n=t??{};return new e(K.createCore({disabled:n.disabled??!1,disposed:!1,hidden:n.hidden??!1,parent:n.parent??null}))}get globalDisabled(){return this.globalDisabled_}bindClassModifiers(e){ar(this.globalDisabled_,Mr(e,`disabled`)),L(this,`hidden`,Mr(e,`hidden`))}bindDisabled(e){ar(this.globalDisabled_,t=>{e.disabled=t})}bindTabIndex(e){ar(this.globalDisabled_,t=>{e.tabIndex=t?-1:0})}handleDispose(e){this.value(`disposed`).emitter.on(`change`,t=>{t&&e()})}importState(e){this.set(`disabled`,e.disabled),this.set(`hidden`,e.hidden)}exportState(){return{disabled:this.get(`disabled`),hidden:this.get(`hidden`)}}getGlobalDisabled_(){let e=this.get(`parent`);return(e?e.globalDisabled.rawValue:!1)||this.get(`disabled`)}updateGlobalDisabled_(){this.setGlobalDisabled_(this.getGlobalDisabled_())}onDisabledChange_(){this.updateGlobalDisabled_()}onParentGlobalDisabledChange_(){this.updateGlobalDisabled_()}onParentChange_(e){var t;e.previousRawValue?.globalDisabled.emitter.off(`change`,this.onParentGlobalDisabledChange_),(t=this.get(`parent`))==null||t.globalDisabled.emitter.on(`change`,this.onParentGlobalDisabledChange_),this.updateGlobalDisabled_()}},_s=R(`tbp`),vs=class{constructor(e,t){this.element=e.createElement(`div`),this.element.classList.add(_s()),t.viewProps.bindClassModifiers(this.element);let n=e.createElement(`div`);n.classList.add(_s(`c`)),this.element.appendChild(n),this.containerElement=n}},ys=R(`tbi`),bs=class{constructor(e,t){this.element=e.createElement(`div`),this.element.classList.add(ys()),t.viewProps.bindClassModifiers(this.element),L(t.props,`selected`,e=>{e?this.element.classList.add(ys(void 0,`sel`)):this.element.classList.remove(ys(void 0,`sel`))});let n=e.createElement(`button`);n.classList.add(ys(`b`)),t.viewProps.bindDisabled(n),this.element.appendChild(n),this.buttonElement=n;let r=e.createElement(`div`);r.classList.add(ys(`t`)),yr(t.props.value(`title`),r),this.buttonElement.appendChild(r),this.titleElement=r}},xs=class{constructor(e,t){this.emitter=new G,this.onClick_=this.onClick_.bind(this),this.props=t.props,this.viewProps=t.viewProps,this.view=new bs(e,{props:t.props,viewProps:t.viewProps}),this.view.buttonElement.addEventListener(`click`,this.onClick_)}onClick_(){this.emitter.emit(`click`,{sender:this})}},Ss=class extends as{constructor(e,t){let n=new vs(e,{viewProps:t.viewProps});super(Object.assign(Object.assign({},t),{rackController:new cs({blade:t.blade,element:n.containerElement,viewProps:t.viewProps}),view:n})),this.onItemClick_=this.onItemClick_.bind(this),this.ic_=new xs(e,{props:t.itemProps,viewProps:gs.create()}),this.ic_.emitter.on(`click`,this.onItemClick_),this.props=t.props,L(this.props,`selected`,e=>{this.itemController.props.set(`selected`,e),this.viewProps.set(`hidden`,!e)})}get itemController(){return this.ic_}importState(e){return F(e,e=>super.importState(e),e=>({selected:e.required.boolean,title:e.required.string}),e=>(this.ic_.props.set(`selected`,e.selected),this.ic_.props.set(`title`,e.title),!0))}exportState(){return I(()=>super.exportState(),{selected:this.ic_.props.get(`selected`),title:this.ic_.props.get(`title`)})}onItemClick_(){this.props.set(`selected`,!0)}},Cs=class extends is{constructor(e,t){super(e,t),this.emitter_=new G,this.onSelect_=this.onSelect_.bind(this),this.pool_=t,this.rackApi_.on(`change`,e=>{this.emitter_.emit(`change`,e)}),this.controller.tab.selectedIndex.emitter.on(`change`,this.onSelect_)}get pages(){return this.rackApi_.children}addPage(e){let t=this.controller.view.element.ownerDocument,n=new Ss(t,{blade:Or(),itemProps:K.fromObject({selected:!1,title:e.title}),props:K.fromObject({selected:!1}),viewProps:gs.create()}),r=this.pool_.createApi(n);return this.rackApi_.add(r,e.index)}removePage(e){this.rackApi_.remove(this.rackApi_.children[e])}on(e,t){let n=t.bind(this);return this.emitter_.on(e,e=>{n(e)},{key:t}),this}off(e,t){return this.emitter_.off(e,t),this}onSelect_(e){this.emitter_.emit(`select`,new jo(this,e.rawValue))}},ws=class extends is{get title(){return this.controller.itemController.props.get(`title`)??``}set title(e){this.controller.itemController.props.set(`title`,e)}get selected(){return this.controller.props.get(`selected`)}set selected(e){this.controller.props.set(`selected`,e)}get children(){return this.rackApi_.children}addButton(e){return this.rackApi_.addButton(e)}addFolder(e){return this.rackApi_.addFolder(e)}addTab(e){return this.rackApi_.addTab(e)}add(e,t){this.rackApi_.add(e,t)}remove(e){this.rackApi_.remove(e)}addBinding(e,t,n){return this.rackApi_.addBinding(e,t,n)}addBlade(e){return this.rackApi_.addBlade(e)}},Ts=-1,Es=class{constructor(){this.onItemSelectedChange_=this.onItemSelectedChange_.bind(this),this.empty=A(!0),this.selectedIndex=A(Ts),this.items_=[]}add(e,t){let n=t??this.items_.length;this.items_.splice(n,0,e),e.emitter.on(`change`,this.onItemSelectedChange_),this.keepSelection_()}remove(e){let t=this.items_.indexOf(e);t<0||(this.items_.splice(t,1),e.emitter.off(`change`,this.onItemSelectedChange_),this.keepSelection_())}keepSelection_(){if(this.items_.length===0){this.selectedIndex.rawValue=Ts,this.empty.rawValue=!0;return}let e=this.items_.findIndex(e=>e.rawValue);e<0?(this.items_.forEach((e,t)=>{e.rawValue=t===0}),this.selectedIndex.rawValue=0):(this.items_.forEach((t,n)=>{t.rawValue=n===e}),this.selectedIndex.rawValue=e),this.empty.rawValue=!1}onItemSelectedChange_(e){if(e.rawValue){let t=this.items_.findIndex(t=>t===e.sender);this.items_.forEach((e,n)=>{e.rawValue=n===t}),this.selectedIndex.rawValue=t}else this.keepSelection_()}},Ds=R(`tab`),Os=class{constructor(e,t){this.element=e.createElement(`div`),this.element.classList.add(Ds(),ds()),t.viewProps.bindClassModifiers(this.element),ar(t.empty,vr(this.element,Ds(void 0,`nop`)));let n=e.createElement(`div`);n.classList.add(Ds(`t`)),this.element.appendChild(n),this.itemsElement=n;let r=e.createElement(`div`);r.classList.add(Ds(`i`)),this.element.appendChild(r);let i=e.createElement(`div`);i.classList.add(Ds(`c`)),this.element.appendChild(i),this.contentsElement=i}},ks=class extends as{constructor(e,t){let n=new Es,r=new Os(e,{empty:n.empty,viewProps:t.viewProps});super({blade:t.blade,rackController:new cs({blade:t.blade,element:r.contentsElement,viewProps:t.viewProps}),view:r}),this.onRackAdd_=this.onRackAdd_.bind(this),this.onRackRemove_=this.onRackRemove_.bind(this);let i=this.rackController.rack;i.emitter.on(`add`,this.onRackAdd_),i.emitter.on(`remove`,this.onRackRemove_),this.tab=n}add(e,t){this.rackController.rack.add(e,t)}remove(e){this.rackController.rack.remove(this.rackController.rack.children[e])}onRackAdd_(e){if(!e.root)return;let t=e.bladeController;er(this.view.itemsElement,t.itemController.view.element,e.index),t.itemController.viewProps.set(`parent`,this.viewProps),this.tab.add(t.props.value(`selected`))}onRackRemove_(e){if(!e.root)return;let t=e.bladeController;tr(t.itemController.view.element),t.itemController.viewProps.set(`parent`,null),this.tab.remove(t.props.value(`selected`))}},As=z({id:`tab`,type:`blade`,accept(e){let t=P(e,e=>({pages:e.required.array(e.required.object({title:e.required.string})),view:e.required.constant(`tab`)}));return!t||t.pages.length===0?null:{params:t}},controller(e){let t=new ks(e.document,{blade:e.blade,viewProps:e.viewProps});return e.params.pages.forEach(n=>{let r=new Ss(e.document,{blade:Or(),itemProps:K.fromObject({selected:!1,title:n.title}),props:K.fromObject({selected:!1}),viewProps:gs.create()});t.add(r)}),t},api(e){return e.controller instanceof ks?new Cs(e.controller,e.pool):e.controller instanceof Ss?new ws(e.controller,e.pool):null}}),js=class extends No{get options(){return this.controller.valueController.props.get(`options`)}set options(e){this.controller.valueController.props.set(`options`,e)}},Ms=class{constructor(){this.disabled=!1,this.emitter=new G}dispose(){}tick(){this.disabled||this.emitter.emit(`tick`,{sender:this})}},Ns=class{constructor(e,t){this.disabled_=!1,this.timerId_=null,this.onTick_=this.onTick_.bind(this),this.doc_=e,this.emitter=new G,this.interval_=t,this.setTimer_()}get disabled(){return this.disabled_}set disabled(e){this.disabled_=e,this.disabled_?this.clearTimer_():this.setTimer_()}dispose(){this.clearTimer_()}clearTimer_(){if(this.timerId_===null)return;let e=this.doc_.defaultView;e&&e.clearInterval(this.timerId_),this.timerId_=null}setTimer_(){if(this.clearTimer_(),this.interval_<=0)return;let e=this.doc_.defaultView;e&&(this.timerId_=e.setInterval(this.onTick_,this.interval_))}onTick_(){this.disabled_||this.emitter.emit(`tick`,{sender:this})}},Ps=class{constructor(e){this.constraints=e}constrain(e){return this.constraints.reduce((e,t)=>t.constrain(e),e)}},Fs=class{constructor(e){this.values=K.fromObject({options:e})}constrain(e){let t=this.values.get(`options`);return t.length===0||t.filter(t=>t.value===e).length>0?e:t[0].value}},Is=R(`lst`),Ls=class{constructor(e,t){this.onValueChange_=this.onValueChange_.bind(this),this.props_=t.props,this.element=e.createElement(`div`),this.element.classList.add(Is()),t.viewProps.bindClassModifiers(this.element);let n=e.createElement(`select`);n.classList.add(Is(`s`)),t.viewProps.bindDisabled(n),this.element.appendChild(n),this.selectElement=n;let r=e.createElement(`div`);r.classList.add(Is(`m`)),r.appendChild($n(e,`dropdown`)),this.element.appendChild(r),t.value.emitter.on(`change`,this.onValueChange_),this.value_=t.value,L(this.props_,`options`,t=>{nr(this.selectElement),t.forEach(t=>{let n=e.createElement(`option`);n.textContent=t.text,this.selectElement.appendChild(n)}),this.update_()})}update_(){let e=this.props_.get(`options`).map(e=>e.value);this.selectElement.selectedIndex=e.indexOf(this.value_.rawValue)}onValueChange_(){this.update_()}},Rs=class{constructor(e,t){this.onSelectChange_=this.onSelectChange_.bind(this),this.props=t.props,this.value=t.value,this.viewProps=t.viewProps,this.view=new Ls(e,{props:this.props,value:this.value,viewProps:this.viewProps}),this.view.selectElement.addEventListener(`change`,this.onSelectChange_)}onSelectChange_(e){let t=O(e.currentTarget);this.value.rawValue=this.props.get(`options`)[t.selectedIndex].value}importProps(e){return F(e,null,e=>({options:e.required.custom(Fr)}),e=>(this.props.set(`options`,Ir(e.options)),!0))}exportProps(){return I(null,{options:this.props.get(`options`)})}},zs=R(`pop`),Bs=class{constructor(e,t){this.element=e.createElement(`div`),this.element.classList.add(zs()),t.viewProps.bindClassModifiers(this.element),ar(t.shows,vr(this.element,zs(void 0,`v`)))}},Vs=class{constructor(e,t){this.shows=A(!1),this.viewProps=t.viewProps,this.view=new Bs(e,{shows:this.shows,viewProps:this.viewProps})}},Hs=R(`txt`),Us=class{constructor(e,t){this.onChange_=this.onChange_.bind(this),this.element=e.createElement(`div`),this.element.classList.add(Hs()),t.viewProps.bindClassModifiers(this.element),this.props_=t.props,this.props_.emitter.on(`change`,this.onChange_);let n=e.createElement(`input`);n.classList.add(Hs(`i`)),n.type=`text`,t.viewProps.bindDisabled(n),this.element.appendChild(n),this.inputElement=n,t.value.emitter.on(`change`,this.onChange_),this.value_=t.value,this.refresh()}refresh(){let e=this.props_.get(`formatter`);this.inputElement.value=e(this.value_.rawValue)}onChange_(){this.refresh()}},Ws=class{constructor(e,t){this.onInputChange_=this.onInputChange_.bind(this),this.parser_=t.parser,this.props=t.props,this.value=t.value,this.viewProps=t.viewProps,this.view=new Us(e,{props:t.props,value:this.value,viewProps:this.viewProps}),this.view.inputElement.addEventListener(`change`,this.onInputChange_)}onInputChange_(e){let t=O(e.currentTarget).value,n=this.parser_(t);k(n)||(this.value.rawValue=n),this.view.refresh()}},Gs=j(0),Ks=class{constructor(e){this.lastTouch_=null,this.onDocumentMouseMove_=this.onDocumentMouseMove_.bind(this),this.onDocumentMouseUp_=this.onDocumentMouseUp_.bind(this),this.onMouseDown_=this.onMouseDown_.bind(this),this.onTouchEnd_=this.onTouchEnd_.bind(this),this.onTouchMove_=this.onTouchMove_.bind(this),this.onTouchStart_=this.onTouchStart_.bind(this),this.elem_=e,this.emitter=new G,e.addEventListener(`touchstart`,this.onTouchStart_,{passive:!1}),e.addEventListener(`touchmove`,this.onTouchMove_,{passive:!0}),e.addEventListener(`touchend`,this.onTouchEnd_),e.addEventListener(`mousedown`,this.onMouseDown_)}computePosition_(e){let t=this.elem_.getBoundingClientRect();return{bounds:{width:t.width,height:t.height},point:e?{x:e.x,y:e.y}:null}}onMouseDown_(e){var t;e.preventDefault(),(t=e.currentTarget)==null||t.focus();let n=this.elem_.ownerDocument;n.addEventListener(`mousemove`,this.onDocumentMouseMove_),n.addEventListener(`mouseup`,this.onDocumentMouseUp_),this.emitter.emit(`down`,{altKey:e.altKey,data:this.computePosition_(Xr(e,this.elem_)),sender:this,shiftKey:e.shiftKey})}onDocumentMouseMove_(e){this.emitter.emit(`move`,{altKey:e.altKey,data:this.computePosition_(Xr(e,this.elem_)),sender:this,shiftKey:e.shiftKey})}onDocumentMouseUp_(e){let t=this.elem_.ownerDocument;t.removeEventListener(`mousemove`,this.onDocumentMouseMove_),t.removeEventListener(`mouseup`,this.onDocumentMouseUp_),this.emitter.emit(`up`,{altKey:e.altKey,data:this.computePosition_(Xr(e,this.elem_)),sender:this,shiftKey:e.shiftKey})}onTouchStart_(e){e.preventDefault();let t=e.targetTouches.item(0),n=this.elem_.getBoundingClientRect();this.emitter.emit(`down`,{altKey:e.altKey,data:this.computePosition_(t?{x:t.clientX-n.left,y:t.clientY-n.top}:void 0),sender:this,shiftKey:e.shiftKey}),this.lastTouch_=t}onTouchMove_(e){let t=e.targetTouches.item(0),n=this.elem_.getBoundingClientRect();this.emitter.emit(`move`,{altKey:e.altKey,data:this.computePosition_(t?{x:t.clientX-n.left,y:t.clientY-n.top}:void 0),sender:this,shiftKey:e.shiftKey}),this.lastTouch_=t}onTouchEnd_(e){let t=e.targetTouches.item(0)??this.lastTouch_,n=this.elem_.getBoundingClientRect();this.emitter.emit(`up`,{altKey:e.altKey,data:this.computePosition_(t?{x:t.clientX-n.left,y:t.clientY-n.top}:void 0),sender:this,shiftKey:e.shiftKey})}},J=R(`txt`),qs=class{constructor(e,t){this.onChange_=this.onChange_.bind(this),this.props_=t.props,this.props_.emitter.on(`change`,this.onChange_),this.element=e.createElement(`div`),this.element.classList.add(J(),J(void 0,`num`)),t.arrayPosition&&this.element.classList.add(J(void 0,t.arrayPosition)),t.viewProps.bindClassModifiers(this.element);let n=e.createElement(`input`);n.classList.add(J(`i`)),n.type=`text`,t.viewProps.bindDisabled(n),this.element.appendChild(n),this.inputElement=n,this.onDraggingChange_=this.onDraggingChange_.bind(this),this.dragging_=t.dragging,this.dragging_.emitter.on(`change`,this.onDraggingChange_),this.element.classList.add(J()),this.inputElement.classList.add(J(`i`));let r=e.createElement(`div`);r.classList.add(J(`k`)),this.element.appendChild(r),this.knobElement=r;let i=e.createElementNS(q,`svg`);i.classList.add(J(`g`)),this.knobElement.appendChild(i);let a=e.createElementNS(q,`path`);a.classList.add(J(`gb`)),i.appendChild(a),this.guideBodyElem_=a;let o=e.createElementNS(q,`path`);o.classList.add(J(`gh`)),i.appendChild(o),this.guideHeadElem_=o;let s=e.createElement(`div`);s.classList.add(R(`tt`)()),this.knobElement.appendChild(s),this.tooltipElem_=s,t.value.emitter.on(`change`,this.onChange_),this.value=t.value,this.refresh()}onDraggingChange_(e){if(e.rawValue===null){this.element.classList.remove(J(void 0,`drg`));return}this.element.classList.add(J(void 0,`drg`));let t=e.rawValue/this.props_.get(`pointerScale`),n=t+(t>0?-1:+(t<0)),r=N(-n,-4,4);this.guideHeadElem_.setAttributeNS(null,`d`,[`M ${n+r},0 L${n},4 L${n+r},8`,`M ${t},-1 L${t},9`].join(` `)),this.guideBodyElem_.setAttributeNS(null,`d`,`M 0,4 L${t},4`);let i=this.props_.get(`formatter`);this.tooltipElem_.textContent=i(this.value.rawValue),this.tooltipElem_.style.left=`${t}px`}refresh(){let e=this.props_.get(`formatter`);this.inputElement.value=e(this.value.rawValue)}onChange_(){this.refresh()}},Js=class{constructor(e,t){this.originRawValue_=0,this.onInputChange_=this.onInputChange_.bind(this),this.onInputKeyDown_=this.onInputKeyDown_.bind(this),this.onInputKeyUp_=this.onInputKeyUp_.bind(this),this.onPointerDown_=this.onPointerDown_.bind(this),this.onPointerMove_=this.onPointerMove_.bind(this),this.onPointerUp_=this.onPointerUp_.bind(this),this.parser_=t.parser,this.props=t.props,this.sliderProps_=t.sliderProps??null,this.value=t.value,this.viewProps=t.viewProps,this.dragging_=A(null),this.view=new qs(e,{arrayPosition:t.arrayPosition,dragging:this.dragging_,props:this.props,value:this.value,viewProps:this.viewProps}),this.view.inputElement.addEventListener(`change`,this.onInputChange_),this.view.inputElement.addEventListener(`keydown`,this.onInputKeyDown_),this.view.inputElement.addEventListener(`keyup`,this.onInputKeyUp_);let n=new Ks(this.view.knobElement);n.emitter.on(`down`,this.onPointerDown_),n.emitter.on(`move`,this.onPointerMove_),n.emitter.on(`up`,this.onPointerUp_)}constrainValue_(e){let t=this.sliderProps_?.get(`min`),n=this.sliderProps_?.get(`max`),r=e;return t!==void 0&&(r=Math.max(r,t)),n!==void 0&&(r=Math.min(r,n)),r}onInputChange_(e){let t=O(e.currentTarget).value,n=this.parser_(t);k(n)||(this.value.rawValue=this.constrainValue_(n)),this.view.refresh()}onInputKeyDown_(e){let t=B(this.props.get(`keyScale`),Kr(e));t!==0&&this.value.setRawValue(this.constrainValue_(this.value.rawValue+t),{forceEmit:!1,last:!1})}onInputKeyUp_(e){B(this.props.get(`keyScale`),Kr(e))!==0&&this.value.setRawValue(this.value.rawValue,{forceEmit:!0,last:!0})}onPointerDown_(){this.originRawValue_=this.value.rawValue,this.dragging_.rawValue=0}computeDraggingValue_(e){if(!e.point)return null;let t=e.point.x-e.bounds.width/2;return this.constrainValue_(this.originRawValue_+t*this.props.get(`pointerScale`))}onPointerMove_(e){let t=this.computeDraggingValue_(e.data);t!==null&&(this.value.setRawValue(t,{forceEmit:!1,last:!1}),this.dragging_.rawValue=this.value.rawValue-this.originRawValue_)}onPointerUp_(e){let t=this.computeDraggingValue_(e.data);t!==null&&(this.value.setRawValue(t,{forceEmit:!0,last:!0}),this.dragging_.rawValue=null)}},Ys=R(`sld`),Xs=class{constructor(e,t){this.onChange_=this.onChange_.bind(this),this.props_=t.props,this.props_.emitter.on(`change`,this.onChange_),this.element=e.createElement(`div`),this.element.classList.add(Ys()),t.viewProps.bindClassModifiers(this.element);let n=e.createElement(`div`);n.classList.add(Ys(`t`)),t.viewProps.bindTabIndex(n),this.element.appendChild(n),this.trackElement=n;let r=e.createElement(`div`);r.classList.add(Ys(`k`)),this.trackElement.appendChild(r),this.knobElement=r,t.value.emitter.on(`change`,this.onChange_),this.value=t.value,this.update_()}update_(){let e=N(M(this.value.rawValue,this.props_.get(`min`),this.props_.get(`max`),0,100),0,100);this.knobElement.style.width=`${e}%`}onChange_(){this.update_()}},Zs=class{constructor(e,t){this.onKeyDown_=this.onKeyDown_.bind(this),this.onKeyUp_=this.onKeyUp_.bind(this),this.onPointerDownOrMove_=this.onPointerDownOrMove_.bind(this),this.onPointerUp_=this.onPointerUp_.bind(this),this.value=t.value,this.viewProps=t.viewProps,this.props=t.props,this.view=new Xs(e,{props:this.props,value:this.value,viewProps:this.viewProps}),this.ptHandler_=new Ks(this.view.trackElement),this.ptHandler_.emitter.on(`down`,this.onPointerDownOrMove_),this.ptHandler_.emitter.on(`move`,this.onPointerDownOrMove_),this.ptHandler_.emitter.on(`up`,this.onPointerUp_),this.view.trackElement.addEventListener(`keydown`,this.onKeyDown_),this.view.trackElement.addEventListener(`keyup`,this.onKeyUp_)}handlePointerEvent_(e,t){e.point&&this.value.setRawValue(M(N(e.point.x,0,e.bounds.width),0,e.bounds.width,this.props.get(`min`),this.props.get(`max`)),t)}onPointerDownOrMove_(e){this.handlePointerEvent_(e.data,{forceEmit:!1,last:!1})}onPointerUp_(e){this.handlePointerEvent_(e.data,{forceEmit:!0,last:!0})}onKeyDown_(e){let t=B(this.props.get(`keyScale`),qr(e));t!==0&&this.value.setRawValue(this.value.rawValue+t,{forceEmit:!1,last:!1})}onKeyUp_(e){B(this.props.get(`keyScale`),qr(e))!==0&&this.value.setRawValue(this.value.rawValue,{forceEmit:!0,last:!0})}},Qs=R(`sldtxt`),$s=class{constructor(e,t){this.element=e.createElement(`div`),this.element.classList.add(Qs());let n=e.createElement(`div`);n.classList.add(Qs(`s`)),this.sliderView_=t.sliderView,n.appendChild(this.sliderView_.element),this.element.appendChild(n);let r=e.createElement(`div`);r.classList.add(Qs(`t`)),this.textView_=t.textView,r.appendChild(this.textView_.element),this.element.appendChild(r)}},ec=class{constructor(e,t){this.value=t.value,this.viewProps=t.viewProps,this.sliderC_=new Zs(e,{props:t.sliderProps,value:t.value,viewProps:this.viewProps}),this.textC_=new Js(e,{parser:t.parser,props:t.textProps,sliderProps:t.sliderProps,value:t.value,viewProps:t.viewProps}),this.view=new $s(e,{sliderView:this.sliderC_.view,textView:this.textC_.view})}get sliderController(){return this.sliderC_}get textController(){return this.textC_}importProps(e){return F(e,null,e=>({max:e.required.number,min:e.required.number}),e=>{let t=this.sliderC_.props;return t.set(`max`,e.max),t.set(`min`,e.min),!0})}exportProps(){let e=this.sliderC_.props;return I(null,{max:e.get(`max`),min:e.get(`min`)})}},tc={containerUnitSize:`cnt-usz`},nc=R(`ckb`),rc=class{constructor(e,t){this.onValueChange_=this.onValueChange_.bind(this),this.element=e.createElement(`div`),this.element.classList.add(nc()),t.viewProps.bindClassModifiers(this.element);let n=e.createElement(`label`);n.classList.add(nc(`l`)),this.element.appendChild(n),this.labelElement=n;let r=e.createElement(`input`);r.classList.add(nc(`i`)),r.type=`checkbox`,this.labelElement.appendChild(r),this.inputElement=r,t.viewProps.bindDisabled(this.inputElement);let i=e.createElement(`div`);i.classList.add(nc(`w`)),this.labelElement.appendChild(i);let a=$n(e,`check`);i.appendChild(a),t.value.emitter.on(`change`,this.onValueChange_),this.value=t.value,this.update_()}update_(){this.inputElement.checked=this.value.rawValue}onValueChange_(){this.update_()}},ic=class{constructor(e,t){this.onInputChange_=this.onInputChange_.bind(this),this.onLabelMouseDown_=this.onLabelMouseDown_.bind(this),this.value=t.value,this.viewProps=t.viewProps,this.view=new rc(e,{value:this.value,viewProps:this.viewProps}),this.view.inputElement.addEventListener(`change`,this.onInputChange_),this.view.labelElement.addEventListener(`mousedown`,this.onLabelMouseDown_)}onInputChange_(e){let t=O(e.currentTarget);this.value.rawValue=t.checked,e.preventDefault(),e.stopPropagation()}onLabelMouseDown_(e){e.preventDefault()}},ac=z({id:`input-bool`,type:`input`,accept:(e,t)=>{if(typeof e!=`boolean`)return null;let n=P(t,e=>({options:e.optional.custom(Fr),readonly:e.optional.constant(!1)}));return n?{initialValue:e,params:n}:null},binding:{reader:e=>zr,constraint:e=>ai(e.params),writer:e=>ii},controller:e=>{let t=e.document,n=e.value,r=e.constraint,i=r&&Pr(r,Fs);return i?new Rs(t,{props:new K({options:i.values.value(`options`)}),value:n,viewProps:e.viewProps}):new ic(t,{value:n,viewProps:e.viewProps})},api(e){return typeof e.controller.value.rawValue==`boolean`&&e.controller.valueController instanceof Rs?new js(e.controller):null}}),oc=R(`col`),sc=class{constructor(e,t){this.element=e.createElement(`div`),this.element.classList.add(oc()),t.foldable.bindExpandedClass(this.element,oc(void 0,`expanded`)),L(t.foldable,`completed`,vr(this.element,oc(void 0,`cpl`)));let n=e.createElement(`div`);n.classList.add(oc(`h`)),this.element.appendChild(n);let r=e.createElement(`div`);r.classList.add(oc(`s`)),n.appendChild(r),this.swatchElement=r;let i=e.createElement(`div`);if(i.classList.add(oc(`t`)),n.appendChild(i),this.textElement=i,t.pickerLayout===`inline`){let t=e.createElement(`div`);t.classList.add(oc(`p`)),this.element.appendChild(t),this.pickerElement=t}else this.pickerElement=null}},cc={hsl:{hsl:(e,t,n)=>[e,t,n],hsv:ui,rgb:si},hsv:{hsl:di,hsv:(e,t,n)=>[e,t,n],rgb:li},rgb:{hsl:oi,hsv:ci,rgb:(e,t,n)=>[e,t,n]}},Y=class e{static black(){return new e([0,0,0],`rgb`)}constructor(e,t){this.type=`int`,this.mode=t,this.comps_=hi(e,t,this.type)}getComponents(e){return fi(_i(V(this.comps_),{mode:this.mode,type:this.type},{mode:e??this.mode,type:this.type}),this.comps_[3])}toRgbaObject(){let e=this.getComponents(`rgb`);return{r:e[0],g:e[1],b:e[2],a:e[3]}}},lc=R(`colp`),uc=class{constructor(e,t){this.alphaViews_=null,this.element=e.createElement(`div`),this.element.classList.add(lc()),t.viewProps.bindClassModifiers(this.element);let n=e.createElement(`div`);n.classList.add(lc(`hsv`));let r=e.createElement(`div`);r.classList.add(lc(`sv`)),this.svPaletteView_=t.svPaletteView,r.appendChild(this.svPaletteView_.element),n.appendChild(r);let i=e.createElement(`div`);i.classList.add(lc(`h`)),this.hPaletteView_=t.hPaletteView,i.appendChild(this.hPaletteView_.element),n.appendChild(i),this.element.appendChild(n);let a=e.createElement(`div`);if(a.classList.add(lc(`rgb`)),this.textsView_=t.textsView,a.appendChild(this.textsView_.element),this.element.appendChild(a),t.alphaViews){this.alphaViews_={palette:t.alphaViews.palette,text:t.alphaViews.text};let n=e.createElement(`div`);n.classList.add(lc(`a`));let r=e.createElement(`div`);r.classList.add(lc(`ap`)),r.appendChild(this.alphaViews_.palette.element),n.appendChild(r);let i=e.createElement(`div`);i.classList.add(lc(`at`)),i.appendChild(this.alphaViews_.text.element),n.appendChild(i),this.element.appendChild(n)}}get allFocusableElements(){let e=[this.svPaletteView_.element,this.hPaletteView_.element,this.textsView_.modeSelectElement,...this.textsView_.inputViews.map(e=>e.inputElement)];return this.alphaViews_&&e.push(this.alphaViews_.palette.element,this.alphaViews_.text.inputElement),e}},dc=class{constructor(e,t){this.type=`float`,this.mode=t,this.comps_=hi(e,t,this.type)}getComponents(e){return fi(_i(V(this.comps_),{mode:this.mode,type:this.type},{mode:e??this.mode,type:this.type}),this.comps_[3])}toRgbaObject(){let e=this.getComponents(`rgb`);return{r:e[0],g:e[1],b:e[2],a:e[3]}}},fc={int:(e,t)=>new Y(e,t),float:(e,t)=>new dc(e,t)},pc={deg:e=>e,grad:e=>e*360/400,rad:e=>e*360/(2*Math.PI),turn:e=>e*360},mc=[{parser:Li,result:{alpha:!1,mode:`rgb`,notation:`hex`}},{parser:zi,result:{alpha:!0,mode:`rgb`,notation:`hex`}},{parser:ki,result:{alpha:!1,mode:`rgb`,notation:`func`}},{parser:ji,result:{alpha:!0,mode:`rgb`,notation:`func`}},{parser:Ni,result:{alpha:!1,mode:`hsl`,notation:`func`}},{parser:Fi,result:{alpha:!0,mode:`hsl`,notation:`func`}},{parser:Vi,result:{alpha:!1,mode:`rgb`,notation:`object`}},{parser:Ui,result:{alpha:!0,mode:`rgb`,notation:`object`}}],hc=[{format:{alpha:!1,mode:`rgb`,notation:`hex`,type:`int`},stringifier:Xi},{format:{alpha:!0,mode:`rgb`,notation:`hex`,type:`int`},stringifier:Zi},{format:{alpha:!1,mode:`rgb`,notation:`func`,type:`int`},stringifier:Qi},{format:{alpha:!0,mode:`rgb`,notation:`func`,type:`int`},stringifier:$i},{format:{alpha:!1,mode:`hsl`,notation:`func`,type:`int`},stringifier:ea},{format:{alpha:!0,mode:`hsl`,notation:`func`,type:`int`},stringifier:ta},...[`int`,`float`].reduce((e,t)=>[...e,{format:{alpha:!1,mode:`rgb`,notation:`object`,type:t},stringifier:ra(t)},{format:{alpha:!0,mode:`rgb`,notation:`object`,type:t},stringifier:aa(t)}],[])],gc=R(`apl`),_c=class{constructor(e,t){this.onValueChange_=this.onValueChange_.bind(this),this.value=t.value,this.value.emitter.on(`change`,this.onValueChange_),this.element=e.createElement(`div`),this.element.classList.add(gc()),t.viewProps.bindClassModifiers(this.element),t.viewProps.bindTabIndex(this.element);let n=e.createElement(`div`);n.classList.add(gc(`b`)),this.element.appendChild(n);let r=e.createElement(`div`);r.classList.add(gc(`c`)),n.appendChild(r),this.colorElem_=r;let i=e.createElement(`div`);i.classList.add(gc(`m`)),this.element.appendChild(i),this.markerElem_=i;let a=e.createElement(`div`);a.classList.add(gc(`p`)),this.markerElem_.appendChild(a),this.previewElem_=a,this.update_()}update_(){let e=this.value.rawValue,t=e.getComponents(`rgb`),n=new Y([t[0],t[1],t[2],0],`rgb`),r=new Y([t[0],t[1],t[2],255],`rgb`),i=[`to right`,$i(n),$i(r)];this.colorElem_.style.background=`linear-gradient(${i.join(`,`)})`,this.previewElem_.style.backgroundColor=$i(e);let a=M(t[3],0,1,0,100);this.markerElem_.style.left=`${a}%`}onValueChange_(){this.update_()}},vc=class{constructor(e,t){this.onKeyDown_=this.onKeyDown_.bind(this),this.onKeyUp_=this.onKeyUp_.bind(this),this.onPointerDown_=this.onPointerDown_.bind(this),this.onPointerMove_=this.onPointerMove_.bind(this),this.onPointerUp_=this.onPointerUp_.bind(this),this.value=t.value,this.viewProps=t.viewProps,this.view=new _c(e,{value:this.value,viewProps:this.viewProps}),this.ptHandler_=new Ks(this.view.element),this.ptHandler_.emitter.on(`down`,this.onPointerDown_),this.ptHandler_.emitter.on(`move`,this.onPointerMove_),this.ptHandler_.emitter.on(`up`,this.onPointerUp_),this.view.element.addEventListener(`keydown`,this.onKeyDown_),this.view.element.addEventListener(`keyup`,this.onKeyUp_)}handlePointerEvent_(e,t){if(!e.point)return;let n=e.point.x/e.bounds.width,[r,i,a]=this.value.rawValue.getComponents(`hsv`);this.value.setRawValue(new Y([r,i,a,n],`hsv`),t)}onPointerDown_(e){this.handlePointerEvent_(e.data,{forceEmit:!1,last:!1})}onPointerMove_(e){this.handlePointerEvent_(e.data,{forceEmit:!1,last:!1})}onPointerUp_(e){this.handlePointerEvent_(e.data,{forceEmit:!0,last:!0})}onKeyDown_(e){let t=B(bi(!0),qr(e));if(t===0)return;let[n,r,i,a]=this.value.rawValue.getComponents(`hsv`);this.value.setRawValue(new Y([n,r,i,a+t],`hsv`),{forceEmit:!1,last:!1})}onKeyUp_(e){B(bi(!0),qr(e))!==0&&this.value.setRawValue(this.value.rawValue,{forceEmit:!0,last:!0})}},yc=R(`coltxt`),bc=class{constructor(e,t){this.element=e.createElement(`div`),this.element.classList.add(yc()),t.viewProps.bindClassModifiers(this.element);let n=e.createElement(`div`);n.classList.add(yc(`m`)),this.modeElem_=sa(e),this.modeElem_.classList.add(yc(`ms`)),n.appendChild(this.modeSelectElement),t.viewProps.bindDisabled(this.modeElem_);let r=e.createElement(`div`);r.classList.add(yc(`mm`)),r.appendChild($n(e,`dropdown`)),n.appendChild(r),this.element.appendChild(n);let i=e.createElement(`div`);i.classList.add(yc(`w`)),this.element.appendChild(i),this.inputsElem_=i,this.inputViews_=t.inputViews,this.applyInputViews_(),ar(t.mode,e=>{this.modeElem_.value=e})}get modeSelectElement(){return this.modeElem_}get inputViews(){return this.inputViews_}set inputViews(e){this.inputViews_=e,this.applyInputViews_()}applyInputViews_(){nr(this.inputsElem_);let e=this.element.ownerDocument;this.inputViews_.forEach(t=>{let n=e.createElement(`div`);n.classList.add(yc(`c`)),n.appendChild(t.element),this.inputsElem_.appendChild(n)})}},xc=class{constructor(e,t){this.onModeSelectChange_=this.onModeSelectChange_.bind(this),this.colorType_=t.colorType,this.value=t.value,this.viewProps=t.viewProps,this.colorMode=A(this.value.rawValue.mode),this.ccs_=this.createComponentControllers_(e),this.view=new bc(e,{mode:this.colorMode,inputViews:[this.ccs_[0].view,this.ccs_[1].view,this.ccs_[2].view],viewProps:this.viewProps}),this.view.modeSelectElement.addEventListener(`change`,this.onModeSelectChange_)}createComponentControllers_(e){let t=this.colorMode.rawValue;return pa(t)?da(e,{colorMode:t,colorType:this.colorType_,value:this.value,viewProps:this.viewProps}):fa(e,{value:this.value,viewProps:this.viewProps})}onModeSelectChange_(e){let t=e.currentTarget;this.colorMode.rawValue=t.value,this.ccs_=this.createComponentControllers_(this.view.element.ownerDocument),this.view.inputViews=this.ccs_.map(e=>e.view)}},Sc=R(`hpl`),Cc=class{constructor(e,t){this.onValueChange_=this.onValueChange_.bind(this),this.value=t.value,this.value.emitter.on(`change`,this.onValueChange_),this.element=e.createElement(`div`),this.element.classList.add(Sc()),t.viewProps.bindClassModifiers(this.element),t.viewProps.bindTabIndex(this.element);let n=e.createElement(`div`);n.classList.add(Sc(`c`)),this.element.appendChild(n);let r=e.createElement(`div`);r.classList.add(Sc(`m`)),this.element.appendChild(r),this.markerElem_=r,this.update_()}update_(){let[e]=this.value.rawValue.getComponents(`hsv`);this.markerElem_.style.backgroundColor=Qi(new Y([e,100,100],`hsv`));let t=M(e,0,360,0,100);this.markerElem_.style.left=`${t}%`}onValueChange_(){this.update_()}},wc=class{constructor(e,t){this.onKeyDown_=this.onKeyDown_.bind(this),this.onKeyUp_=this.onKeyUp_.bind(this),this.onPointerDown_=this.onPointerDown_.bind(this),this.onPointerMove_=this.onPointerMove_.bind(this),this.onPointerUp_=this.onPointerUp_.bind(this),this.value=t.value,this.viewProps=t.viewProps,this.view=new Cc(e,{value:this.value,viewProps:this.viewProps}),this.ptHandler_=new Ks(this.view.element),this.ptHandler_.emitter.on(`down`,this.onPointerDown_),this.ptHandler_.emitter.on(`move`,this.onPointerMove_),this.ptHandler_.emitter.on(`up`,this.onPointerUp_),this.view.element.addEventListener(`keydown`,this.onKeyDown_),this.view.element.addEventListener(`keyup`,this.onKeyUp_)}handlePointerEvent_(e,t){if(!e.point)return;let n=M(N(e.point.x,0,e.bounds.width),0,e.bounds.width,0,360),[,r,i,a]=this.value.rawValue.getComponents(`hsv`);this.value.setRawValue(new Y([n,r,i,a],`hsv`),t)}onPointerDown_(e){this.handlePointerEvent_(e.data,{forceEmit:!1,last:!1})}onPointerMove_(e){this.handlePointerEvent_(e.data,{forceEmit:!1,last:!1})}onPointerUp_(e){this.handlePointerEvent_(e.data,{forceEmit:!0,last:!0})}onKeyDown_(e){let t=B(bi(!1),qr(e));if(t===0)return;let[n,r,i,a]=this.value.rawValue.getComponents(`hsv`);this.value.setRawValue(new Y([n+t,r,i,a],`hsv`),{forceEmit:!1,last:!1})}onKeyUp_(e){B(bi(!1),qr(e))!==0&&this.value.setRawValue(this.value.rawValue,{forceEmit:!0,last:!0})}},Tc=R(`svp`),Ec=64,Dc=class{constructor(e,t){this.onValueChange_=this.onValueChange_.bind(this),this.value=t.value,this.value.emitter.on(`change`,this.onValueChange_),this.element=e.createElement(`div`),this.element.classList.add(Tc()),t.viewProps.bindClassModifiers(this.element),t.viewProps.bindTabIndex(this.element);let n=e.createElement(`canvas`);n.height=Ec,n.width=Ec,n.classList.add(Tc(`c`)),this.element.appendChild(n),this.canvasElement=n;let r=e.createElement(`div`);r.classList.add(Tc(`m`)),this.element.appendChild(r),this.markerElem_=r,this.update_()}update_(){let e=Qn(this.canvasElement);if(!e)return;let t=this.value.rawValue.getComponents(`hsv`),n=this.canvasElement.width,r=this.canvasElement.height,i=e.getImageData(0,0,n,r),a=i.data;for(let e=0;e<r;e++)for(let i=0;i<n;i++){let o=M(i,0,n,0,100),s=M(e,0,r,100,0),c=li(t[0],o,s),l=(e*n+i)*4;a[l]=c[0],a[l+1]=c[1],a[l+2]=c[2],a[l+3]=255}e.putImageData(i,0,0);let o=M(t[1],0,100,0,100);this.markerElem_.style.left=`${o}%`;let s=M(t[2],0,100,100,0);this.markerElem_.style.top=`${s}%`}onValueChange_(){this.update_()}},Oc=class{constructor(e,t){this.onKeyDown_=this.onKeyDown_.bind(this),this.onKeyUp_=this.onKeyUp_.bind(this),this.onPointerDown_=this.onPointerDown_.bind(this),this.onPointerMove_=this.onPointerMove_.bind(this),this.onPointerUp_=this.onPointerUp_.bind(this),this.value=t.value,this.viewProps=t.viewProps,this.view=new Dc(e,{value:this.value,viewProps:this.viewProps}),this.ptHandler_=new Ks(this.view.element),this.ptHandler_.emitter.on(`down`,this.onPointerDown_),this.ptHandler_.emitter.on(`move`,this.onPointerMove_),this.ptHandler_.emitter.on(`up`,this.onPointerUp_),this.view.element.addEventListener(`keydown`,this.onKeyDown_),this.view.element.addEventListener(`keyup`,this.onKeyUp_)}handlePointerEvent_(e,t){if(!e.point)return;let n=M(e.point.x,0,e.bounds.width,0,100),r=M(e.point.y,0,e.bounds.height,100,0),[i,,,a]=this.value.rawValue.getComponents(`hsv`);this.value.setRawValue(new Y([i,n,r,a],`hsv`),t)}onPointerDown_(e){this.handlePointerEvent_(e.data,{forceEmit:!1,last:!1})}onPointerMove_(e){this.handlePointerEvent_(e.data,{forceEmit:!1,last:!1})}onPointerUp_(e){this.handlePointerEvent_(e.data,{forceEmit:!0,last:!0})}onKeyDown_(e){Yr(e.key)&&e.preventDefault();let[t,n,r,i]=this.value.rawValue.getComponents(`hsv`),a=bi(!1),o=B(a,qr(e)),s=B(a,Kr(e));(o!==0||s!==0)&&this.value.setRawValue(new Y([t,n+o,r+s,i],`hsv`),{forceEmit:!1,last:!1})}onKeyUp_(e){let t=bi(!1),n=B(t,qr(e)),r=B(t,Kr(e));(n!==0||r!==0)&&this.value.setRawValue(this.value.rawValue,{forceEmit:!0,last:!0})}},kc=class{constructor(e,t){this.value=t.value,this.viewProps=t.viewProps,this.hPaletteC_=new wc(e,{value:this.value,viewProps:this.viewProps}),this.svPaletteC_=new Oc(e,{value:this.value,viewProps:this.viewProps}),this.alphaIcs_=t.supportsAlpha?{palette:new vc(e,{value:this.value,viewProps:this.viewProps}),text:new Js(e,{parser:En,props:K.fromObject({pointerScale:.01,keyScale:.1,formatter:j(2)}),value:A(0,{constraint:new go({min:0,max:1})}),viewProps:this.viewProps})}:null,this.alphaIcs_&&Gr({primary:this.value,secondary:this.alphaIcs_.text.value,forward:e=>e.getComponents()[3],backward:(e,t)=>{let n=e.getComponents();return n[3]=t,new Y(n,e.mode)}}),this.textsC_=new xc(e,{colorType:t.colorType,value:this.value,viewProps:this.viewProps}),this.view=new uc(e,{alphaViews:this.alphaIcs_?{palette:this.alphaIcs_.palette.view,text:this.alphaIcs_.text.view}:null,hPaletteView:this.hPaletteC_.view,supportsAlpha:t.supportsAlpha,svPaletteView:this.svPaletteC_.view,textsView:this.textsC_.view,viewProps:this.viewProps})}get textsController(){return this.textsC_}},Ac=R(`colsw`),jc=class{constructor(e,t){this.onValueChange_=this.onValueChange_.bind(this),t.value.emitter.on(`change`,this.onValueChange_),this.value=t.value,this.element=e.createElement(`div`),this.element.classList.add(Ac()),t.viewProps.bindClassModifiers(this.element);let n=e.createElement(`div`);n.classList.add(Ac(`sw`)),this.element.appendChild(n),this.swatchElem_=n;let r=e.createElement(`button`);r.classList.add(Ac(`b`)),t.viewProps.bindDisabled(r),this.element.appendChild(r),this.buttonElement=r,this.update_()}update_(){let e=this.value.rawValue;this.swatchElem_.style.backgroundColor=Zi(e)}onValueChange_(){this.update_()}},Mc=class{constructor(e,t){this.value=t.value,this.viewProps=t.viewProps,this.view=new jc(e,{value:this.value,viewProps:this.viewProps})}},Nc=class{constructor(e,t){this.onButtonBlur_=this.onButtonBlur_.bind(this),this.onButtonClick_=this.onButtonClick_.bind(this),this.onPopupChildBlur_=this.onPopupChildBlur_.bind(this),this.onPopupChildKeydown_=this.onPopupChildKeydown_.bind(this),this.value=t.value,this.viewProps=t.viewProps,this.foldable_=ls.create(t.expanded),this.swatchC_=new Mc(e,{value:this.value,viewProps:this.viewProps});let n=this.swatchC_.view.buttonElement;n.addEventListener(`blur`,this.onButtonBlur_),n.addEventListener(`click`,this.onButtonClick_),this.textC_=new Ws(e,{parser:t.parser,props:K.fromObject({formatter:t.formatter}),value:this.value,viewProps:this.viewProps}),this.view=new sc(e,{foldable:this.foldable_,pickerLayout:t.pickerLayout}),this.view.swatchElement.appendChild(this.swatchC_.view.element),this.view.textElement.appendChild(this.textC_.view.element),this.popC_=t.pickerLayout===`popup`?new Vs(e,{viewProps:this.viewProps}):null;let r=new kc(e,{colorType:t.colorType,supportsAlpha:t.supportsAlpha,value:this.value,viewProps:this.viewProps});r.view.allFocusableElements.forEach(e=>{e.addEventListener(`blur`,this.onPopupChildBlur_),e.addEventListener(`keydown`,this.onPopupChildKeydown_)}),this.pickerC_=r,this.popC_?(this.view.element.appendChild(this.popC_.view.element),this.popC_.view.element.appendChild(r.view.element),Gr({primary:this.foldable_.value(`expanded`),secondary:this.popC_.shows,forward:e=>e,backward:(e,t)=>t})):this.view.pickerElement&&(this.view.pickerElement.appendChild(this.pickerC_.view.element),jr(this.foldable_,this.view.pickerElement))}get textController(){return this.textC_}onButtonBlur_(e){if(!this.popC_)return;let t=this.view.element,n=O(e.relatedTarget);n&&t.contains(n)||(this.popC_.shows.rawValue=!1)}onButtonClick_(){this.foldable_.set(`expanded`,!this.foldable_.get(`expanded`)),this.foldable_.get(`expanded`)&&this.pickerC_.view.allFocusableElements[0].focus()}onPopupChildBlur_(e){if(!this.popC_)return;let t=this.popC_.view.element,n=ir(e);n&&t.contains(n)||(!n||n!==this.swatchC_.view.buttonElement||Yn(t.ownerDocument))&&(this.popC_.shows.rawValue=!1)}onPopupChildKeydown_(e){this.popC_?e.key===`Escape`&&(this.popC_.shows.rawValue=!1):this.view.pickerElement&&e.key===`Escape`&&this.swatchC_.view.buttonElement.focus()}},Pc=z({id:`input-color-number`,type:`input`,accept:(e,t)=>{if(typeof e!=`number`||!Na(t))return null;let n=yi(t);return n?{initialValue:e,params:Object.assign(Object.assign({},n),{supportsAlpha:ja(t)})}:null},binding:{reader:e=>e.params.supportsAlpha?ya:va,equals:wa,writer:e=>Da(e.params.supportsAlpha)},controller:e=>new Nc(e.document,{colorType:`int`,expanded:e.params.expanded??!1,formatter:Ma(e.params.supportsAlpha),parser:qi(`int`),pickerLayout:e.params.picker??`popup`,supportsAlpha:e.params.supportsAlpha,value:e.value,viewProps:e.viewProps})}),Fc=z({id:`input-color-object`,type:`input`,accept:(e,t)=>{if(!Ca(e))return null;let n=yi(t);return n?{initialValue:e,params:Object.assign(Object.assign({},n),{colorType:xi(t)??`int`})}:null},binding:{reader:e=>Ia(e.params.colorType),equals:wa,writer:e=>Aa(Fa(e.initialValue),e.params.colorType)},controller:e=>{let t=Sa(e.initialValue);return new Nc(e.document,{colorType:e.params.colorType,expanded:e.params.expanded??!1,formatter:La(t,e.params.colorType),parser:qi(`int`),pickerLayout:e.params.picker??`popup`,supportsAlpha:t,value:e.value,viewProps:e.viewProps})}}),Ic=z({id:`input-color-string`,type:`input`,accept:(e,t)=>{if(typeof e!=`string`||t.view===`text`)return null;let n=Ki(e,xi(t));if(!n)return null;let r=oa(n);if(!r)return null;let i=yi(t);return i?{initialValue:e,params:Object.assign(Object.assign({},i),{format:n,stringifier:r})}:null},binding:{reader:()=>Ji,equals:wa,writer:e=>{let t=Ea(e.params.format);if(!t)throw W.notBindable();return t}},controller:e=>new Nc(e.document,{colorType:e.params.format.type,expanded:e.params.expanded??!1,formatter:e.params.stringifier,parser:qi(`int`),pickerLayout:e.params.picker??`popup`,supportsAlpha:e.params.format.alpha,value:e.value,viewProps:e.viewProps})}),Lc=class{constructor(e){this.components=e.components,this.asm_=e.assembly}constrain(e){let t=this.asm_.toComponents(e).map((e,t)=>this.components[t]?.constrain(e)??e);return this.asm_.fromComponents(t)}},Rc=R(`pndtxt`),zc=class{constructor(e,t){this.textViews=t.textViews,this.element=e.createElement(`div`),this.element.classList.add(Rc()),this.textViews.forEach(t=>{let n=e.createElement(`div`);n.classList.add(Rc(`a`)),n.appendChild(t.element),this.element.appendChild(n)})}},Bc=class{constructor(e,t){this.value=t.value,this.viewProps=t.viewProps,this.acs_=t.axes.map((n,r)=>Ra(e,t,r)),this.acs_.forEach((e,n)=>{Gr({primary:this.value,secondary:e.value,forward:e=>t.assembly.toComponents(e)[n],backward:(e,r)=>{let i=t.assembly.toComponents(e);return i[n]=r,t.assembly.fromComponents(i)}})}),this.view=new zc(e,{textViews:this.acs_.map(e=>e.view)})}get textControllers(){return this.acs_}},Vc=class extends No{get max(){return this.controller.valueController.sliderController.props.get(`max`)}set max(e){this.controller.valueController.sliderController.props.set(`max`,e)}get min(){return this.controller.valueController.sliderController.props.get(`min`)}set min(e){this.controller.valueController.sliderController.props.set(`min`,e)}},Hc=z({id:`input-number`,type:`input`,accept:(e,t)=>{if(typeof e!=`number`)return null;let n=P(t,e=>Object.assign(Object.assign({},Ln(e)),{options:e.optional.custom(Fr),readonly:e.optional.constant(!1)}));return n?{initialValue:e,params:n}:null},binding:{reader:e=>Dn,constraint:e=>za(e.params,e.initialValue),writer:e=>ii},controller:e=>{let t=e.value,n=e.constraint,r=n&&Pr(n,Fs);if(r)return new Rs(e.document,{props:new K({options:r.values.value(`options`)}),value:t,viewProps:e.viewProps});let i=In(e.params,t.rawValue),a=n&&Pr(n,go);return a?new ec(e.document,Object.assign(Object.assign({},Zr(Object.assign(Object.assign({},i),{keyScale:A(i.keyScale),max:a.values.value(`max`),min:a.values.value(`min`)}))),{parser:En,value:t,viewProps:e.viewProps})):new Js(e.document,{parser:En,props:K.fromObject(i),value:t,viewProps:e.viewProps})},api(e){return typeof e.controller.value.rawValue==`number`?e.controller.valueController instanceof ec?new Vc(e.controller):e.controller.valueController instanceof Rs?new js(e.controller):null:null}}),Uc=class{constructor(e=0,t=0){this.x=e,this.y=t}getComponents(){return[this.x,this.y]}static isObject(e){if(k(e))return!1;let t=e.x,n=e.y;return typeof t==`number`&&typeof n==`number`}static equals(e,t){return e.x===t.x&&e.y===t.y}toObject(){return{x:this.x,y:this.y}}},Wc={toComponents:e=>e.getComponents(),fromComponents:e=>new Uc(...e)},Gc=R(`p2d`),Kc=class{constructor(e,t){this.element=e.createElement(`div`),this.element.classList.add(Gc()),t.viewProps.bindClassModifiers(this.element),ar(t.expanded,vr(this.element,Gc(void 0,`expanded`)));let n=e.createElement(`div`);n.classList.add(Gc(`h`)),this.element.appendChild(n);let r=e.createElement(`button`);r.classList.add(Gc(`b`)),r.appendChild($n(e,`p2dpad`)),t.viewProps.bindDisabled(r),n.appendChild(r),this.buttonElement=r;let i=e.createElement(`div`);if(i.classList.add(Gc(`t`)),n.appendChild(i),this.textElement=i,t.pickerLayout===`inline`){let t=e.createElement(`div`);t.classList.add(Gc(`p`)),this.element.appendChild(t),this.pickerElement=t}else this.pickerElement=null}},X=R(`p2dp`),qc=class{constructor(e,t){this.onFoldableChange_=this.onFoldableChange_.bind(this),this.onPropsChange_=this.onPropsChange_.bind(this),this.onValueChange_=this.onValueChange_.bind(this),this.props_=t.props,this.props_.emitter.on(`change`,this.onPropsChange_),this.element=e.createElement(`div`),this.element.classList.add(X()),t.layout===`popup`&&this.element.classList.add(X(void 0,`p`)),t.viewProps.bindClassModifiers(this.element);let n=e.createElement(`div`);n.classList.add(X(`p`)),t.viewProps.bindTabIndex(n),this.element.appendChild(n),this.padElement=n;let r=e.createElementNS(q,`svg`);r.classList.add(X(`g`)),this.padElement.appendChild(r),this.svgElem_=r;let i=e.createElementNS(q,`line`);i.classList.add(X(`ax`)),i.setAttributeNS(null,`x1`,`0`),i.setAttributeNS(null,`y1`,`50%`),i.setAttributeNS(null,`x2`,`100%`),i.setAttributeNS(null,`y2`,`50%`),this.svgElem_.appendChild(i);let a=e.createElementNS(q,`line`);a.classList.add(X(`ax`)),a.setAttributeNS(null,`x1`,`50%`),a.setAttributeNS(null,`y1`,`0`),a.setAttributeNS(null,`x2`,`50%`),a.setAttributeNS(null,`y2`,`100%`),this.svgElem_.appendChild(a);let o=e.createElementNS(q,`line`);o.classList.add(X(`l`)),o.setAttributeNS(null,`x1`,`50%`),o.setAttributeNS(null,`y1`,`50%`),this.svgElem_.appendChild(o),this.lineElem_=o;let s=e.createElement(`div`);s.classList.add(X(`m`)),this.padElement.appendChild(s),this.markerElem_=s,t.value.emitter.on(`change`,this.onValueChange_),this.value=t.value,this.update_()}get allFocusableElements(){return[this.padElement]}update_(){let[e,t]=this.value.rawValue.getComponents(),n=this.props_.get(`max`),r=M(e,-n,+n,0,100),i=M(t,-n,+n,0,100),a=this.props_.get(`invertsY`)?100-i:i;this.lineElem_.setAttributeNS(null,`x2`,`${r}%`),this.lineElem_.setAttributeNS(null,`y2`,`${a}%`),this.markerElem_.style.left=`${r}%`,this.markerElem_.style.top=`${a}%`}onValueChange_(){this.update_()}onPropsChange_(){this.update_()}onFoldableChange_(){this.update_()}},Jc=class{constructor(e,t){this.onPadKeyDown_=this.onPadKeyDown_.bind(this),this.onPadKeyUp_=this.onPadKeyUp_.bind(this),this.onPointerDown_=this.onPointerDown_.bind(this),this.onPointerMove_=this.onPointerMove_.bind(this),this.onPointerUp_=this.onPointerUp_.bind(this),this.props=t.props,this.value=t.value,this.viewProps=t.viewProps,this.view=new qc(e,{layout:t.layout,props:this.props,value:this.value,viewProps:this.viewProps}),this.ptHandler_=new Ks(this.view.padElement),this.ptHandler_.emitter.on(`down`,this.onPointerDown_),this.ptHandler_.emitter.on(`move`,this.onPointerMove_),this.ptHandler_.emitter.on(`up`,this.onPointerUp_),this.view.padElement.addEventListener(`keydown`,this.onPadKeyDown_),this.view.padElement.addEventListener(`keyup`,this.onPadKeyUp_)}handlePointerEvent_(e,t){if(!e.point)return;let n=this.props.get(`max`),r=M(e.point.x,0,e.bounds.width,-n,+n),i=M(this.props.get(`invertsY`)?e.bounds.height-e.point.y:e.point.y,0,e.bounds.height,-n,+n);this.value.setRawValue(new Uc(r,i),t)}onPointerDown_(e){this.handlePointerEvent_(e.data,{forceEmit:!1,last:!1})}onPointerMove_(e){this.handlePointerEvent_(e.data,{forceEmit:!1,last:!1})}onPointerUp_(e){this.handlePointerEvent_(e.data,{forceEmit:!0,last:!0})}onPadKeyDown_(e){Yr(e.key)&&e.preventDefault();let[t,n]=Ba(e,[this.props.get(`xKeyScale`),this.props.get(`yKeyScale`)],this.props.get(`invertsY`));(t!==0||n!==0)&&this.value.setRawValue(new Uc(this.value.rawValue.x+t,this.value.rawValue.y+n),{forceEmit:!1,last:!1})}onPadKeyUp_(e){let[t,n]=Ba(e,[this.props.get(`xKeyScale`),this.props.get(`yKeyScale`)],this.props.get(`invertsY`));(t!==0||n!==0)&&this.value.setRawValue(this.value.rawValue,{forceEmit:!0,last:!0})}},Yc=class{constructor(e,t){var n,r;this.onPopupChildBlur_=this.onPopupChildBlur_.bind(this),this.onPopupChildKeydown_=this.onPopupChildKeydown_.bind(this),this.onPadButtonBlur_=this.onPadButtonBlur_.bind(this),this.onPadButtonClick_=this.onPadButtonClick_.bind(this),this.value=t.value,this.viewProps=t.viewProps,this.foldable_=ls.create(t.expanded),this.popC_=t.pickerLayout===`popup`?new Vs(e,{viewProps:this.viewProps}):null;let i=new Jc(e,{layout:t.pickerLayout,props:new K({invertsY:A(t.invertsY),max:A(t.max),xKeyScale:t.axes[0].textProps.value(`keyScale`),yKeyScale:t.axes[1].textProps.value(`keyScale`)}),value:this.value,viewProps:this.viewProps});i.view.allFocusableElements.forEach(e=>{e.addEventListener(`blur`,this.onPopupChildBlur_),e.addEventListener(`keydown`,this.onPopupChildKeydown_)}),this.pickerC_=i,this.textC_=new Bc(e,{assembly:Wc,axes:t.axes,parser:t.parser,value:this.value,viewProps:this.viewProps}),this.view=new Kc(e,{expanded:this.foldable_.value(`expanded`),pickerLayout:t.pickerLayout,viewProps:this.viewProps}),this.view.textElement.appendChild(this.textC_.view.element),(n=this.view.buttonElement)==null||n.addEventListener(`blur`,this.onPadButtonBlur_),(r=this.view.buttonElement)==null||r.addEventListener(`click`,this.onPadButtonClick_),this.popC_?(this.view.element.appendChild(this.popC_.view.element),this.popC_.view.element.appendChild(this.pickerC_.view.element),Gr({primary:this.foldable_.value(`expanded`),secondary:this.popC_.shows,forward:e=>e,backward:(e,t)=>t})):this.view.pickerElement&&(this.view.pickerElement.appendChild(this.pickerC_.view.element),jr(this.foldable_,this.view.pickerElement))}get textController(){return this.textC_}onPadButtonBlur_(e){if(!this.popC_)return;let t=this.view.element,n=O(e.relatedTarget);n&&t.contains(n)||(this.popC_.shows.rawValue=!1)}onPadButtonClick_(){this.foldable_.set(`expanded`,!this.foldable_.get(`expanded`)),this.foldable_.get(`expanded`)&&this.pickerC_.view.allFocusableElements[0].focus()}onPopupChildBlur_(e){if(!this.popC_)return;let t=this.popC_.view.element,n=ir(e);n&&t.contains(n)||(!n||n!==this.view.buttonElement||Yn(t.ownerDocument))&&(this.popC_.shows.rawValue=!1)}onPopupChildKeydown_(e){this.popC_?e.key===`Escape`&&(this.popC_.shows.rawValue=!1):this.view.pickerElement&&e.key===`Escape`&&this.view.buttonElement.focus()}},Xc=z({id:`input-point2d`,type:`input`,accept:(e,t)=>{if(!Uc.isObject(e))return null;let n=P(t,e=>Object.assign(Object.assign({},$r(e)),{expanded:e.optional.boolean,picker:e.optional.custom(ri),readonly:e.optional.constant(!1),x:e.optional.custom(ei),y:e.optional.object(Object.assign(Object.assign({},$r(e)),{inverted:e.optional.boolean}))}));return n?{initialValue:e,params:n}:null},binding:{reader:()=>Va,constraint:e=>Ua(e.params,e.initialValue),equals:Uc.equals,writer:()=>Ha},controller:e=>{let t=e.document,n=e.value,r=e.constraint,i=[e.params.x,e.params.y];return new Yc(t,{axes:n.rawValue.getComponents().map((t,n)=>Rn({constraint:r.components[n],initialValue:t,params:Qt(e.params,i[n]??{})})),expanded:e.params.expanded??!1,invertsY:Ka(e.params),max:Ga(e.params,n.rawValue),parser:En,pickerLayout:e.params.picker??`popup`,value:n,viewProps:e.viewProps})}}),Zc=class{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}getComponents(){return[this.x,this.y,this.z]}static isObject(e){if(k(e))return!1;let t=e.x,n=e.y,r=e.z;return typeof t==`number`&&typeof n==`number`&&typeof r==`number`}static equals(e,t){return e.x===t.x&&e.y===t.y&&e.z===t.z}toObject(){return{x:this.x,y:this.y,z:this.z}}},Qc={toComponents:e=>e.getComponents(),fromComponents:e=>new Zc(...e)},$c=z({id:`input-point3d`,type:`input`,accept:(e,t)=>{if(!Zc.isObject(e))return null;let n=P(t,e=>Object.assign(Object.assign({},$r(e)),{readonly:e.optional.constant(!1),x:e.optional.custom(ei),y:e.optional.custom(ei),z:e.optional.custom(ei)}));return n?{initialValue:e,params:n}:null},binding:{reader:e=>qa,constraint:e=>Ya(e.params,e.initialValue),equals:Zc.equals,writer:e=>Ja},controller:e=>{let t=e.value,n=e.constraint,r=[e.params.x,e.params.y,e.params.z];return new Bc(e.document,{assembly:Qc,axes:t.rawValue.getComponents().map((t,i)=>Rn({constraint:n.components[i],initialValue:t,params:Qt(e.params,r[i]??{})})),parser:En,value:t,viewProps:e.viewProps})}}),el=class{constructor(e=0,t=0,n=0,r=0){this.x=e,this.y=t,this.z=n,this.w=r}getComponents(){return[this.x,this.y,this.z,this.w]}static isObject(e){if(k(e))return!1;let t=e.x,n=e.y,r=e.z,i=e.w;return typeof t==`number`&&typeof n==`number`&&typeof r==`number`&&typeof i==`number`}static equals(e,t){return e.x===t.x&&e.y===t.y&&e.z===t.z&&e.w===t.w}toObject(){return{x:this.x,y:this.y,z:this.z,w:this.w}}},tl={toComponents:e=>e.getComponents(),fromComponents:e=>new el(...e)},nl=z({id:`input-point4d`,type:`input`,accept:(e,t)=>{if(!el.isObject(e))return null;let n=P(t,e=>Object.assign(Object.assign({},$r(e)),{readonly:e.optional.constant(!1),w:e.optional.custom(ei),x:e.optional.custom(ei),y:e.optional.custom(ei),z:e.optional.custom(ei)}));return n?{initialValue:e,params:n}:null},binding:{reader:e=>Xa,constraint:e=>Qa(e.params,e.initialValue),equals:el.equals,writer:e=>Za},controller:e=>{let t=e.value,n=e.constraint,r=[e.params.x,e.params.y,e.params.z,e.params.w];return new Bc(e.document,{assembly:tl,axes:t.rawValue.getComponents().map((t,i)=>Rn({constraint:n.components[i],initialValue:t,params:Qt(e.params,r[i]??{})})),parser:En,value:t,viewProps:e.viewProps})}}),rl=z({id:`input-string`,type:`input`,accept:(e,t)=>{if(typeof e!=`string`)return null;let n=P(t,e=>({readonly:e.optional.constant(!1),options:e.optional.custom(Fr)}));return n?{initialValue:e,params:n}:null},binding:{reader:e=>Ur,constraint:e=>$a(e.params),writer:e=>ii},controller:e=>{let t=e.document,n=e.value,r=e.constraint,i=r&&Pr(r,Fs);return i?new Rs(t,{props:new K({options:i.values.value(`options`)}),value:n,viewProps:e.viewProps}):new Ws(t,{parser:e=>e,props:K.fromObject({formatter:Wr}),value:n,viewProps:e.viewProps})},api(e){return typeof e.controller.value.rawValue==`string`&&e.controller.valueController instanceof Rs?new js(e.controller):null}}),il={monitor:{defaultInterval:200,defaultRows:3}},al=R(`mll`),ol=class{constructor(e,t){this.onValueUpdate_=this.onValueUpdate_.bind(this),this.formatter_=t.formatter,this.element=e.createElement(`div`),this.element.classList.add(al()),t.viewProps.bindClassModifiers(this.element);let n=e.createElement(`textarea`);n.classList.add(al(`i`)),n.style.height=`calc(var(${Qr(`containerUnitSize`)}) * ${t.rows})`,n.readOnly=!0,t.viewProps.bindDisabled(n),this.element.appendChild(n),this.textareaElem_=n,t.value.emitter.on(`change`,this.onValueUpdate_),this.value=t.value,this.update_()}update_(){let e=this.textareaElem_,t=e.scrollTop===e.scrollHeight-e.clientHeight,n=[];this.value.rawValue.forEach(e=>{e!==void 0&&n.push(this.formatter_(e))}),e.textContent=n.join(`
`),t&&(e.scrollTop=e.scrollHeight)}onValueUpdate_(){this.update_()}},sl=class{constructor(e,t){this.value=t.value,this.viewProps=t.viewProps,this.view=new ol(e,{formatter:t.formatter,rows:t.rows,value:this.value,viewProps:this.viewProps})}},cl=R(`sgl`),ll=class{constructor(e,t){this.onValueUpdate_=this.onValueUpdate_.bind(this),this.formatter_=t.formatter,this.element=e.createElement(`div`),this.element.classList.add(cl()),t.viewProps.bindClassModifiers(this.element);let n=e.createElement(`input`);n.classList.add(cl(`i`)),n.readOnly=!0,n.type=`text`,t.viewProps.bindDisabled(n),this.element.appendChild(n),this.inputElement=n,t.value.emitter.on(`change`,this.onValueUpdate_),this.value=t.value,this.update_()}update_(){let e=this.value.rawValue,t=e[e.length-1];this.inputElement.value=t===void 0?``:this.formatter_(t)}onValueUpdate_(){this.update_()}},ul=class{constructor(e,t){this.value=t.value,this.viewProps=t.viewProps,this.view=new ll(e,{formatter:t.formatter,value:this.value,viewProps:this.viewProps})}},dl=z({id:`monitor-bool`,type:`monitor`,accept:(e,t)=>{if(typeof e!=`boolean`)return null;let n=P(t,e=>({readonly:e.required.constant(!0),rows:e.optional.number}));return n?{initialValue:e,params:n}:null},binding:{reader:e=>zr},controller:e=>e.value.rawValue.length===1?new ul(e.document,{formatter:Br,value:e.value,viewProps:e.viewProps}):new sl(e.document,{formatter:Br,rows:e.params.rows??il.monitor.defaultRows,value:e.value,viewProps:e.viewProps})}),fl=class extends No{get max(){return this.controller.valueController.props.get(`max`)}set max(e){this.controller.valueController.props.set(`max`,e)}get min(){return this.controller.valueController.props.get(`min`)}set min(e){this.controller.valueController.props.set(`min`,e)}},pl=R(`grl`),ml=class{constructor(e,t){this.onCursorChange_=this.onCursorChange_.bind(this),this.onValueUpdate_=this.onValueUpdate_.bind(this),this.element=e.createElement(`div`),this.element.classList.add(pl()),t.viewProps.bindClassModifiers(this.element),this.formatter_=t.formatter,this.props_=t.props,this.cursor_=t.cursor,this.cursor_.emitter.on(`change`,this.onCursorChange_);let n=e.createElementNS(q,`svg`);n.classList.add(pl(`g`)),n.style.height=`calc(var(${Qr(`containerUnitSize`)}) * ${t.rows})`,this.element.appendChild(n),this.svgElem_=n;let r=e.createElementNS(q,`polyline`);this.svgElem_.appendChild(r),this.lineElem_=r;let i=e.createElement(`div`);i.classList.add(pl(`t`),R(`tt`)()),this.element.appendChild(i),this.tooltipElem_=i,t.value.emitter.on(`change`,this.onValueUpdate_),this.value=t.value,this.update_()}get graphElement(){return this.svgElem_}update_(){let{clientWidth:e,clientHeight:t}=this.element,n=this.value.rawValue.length-1,r=this.props_.get(`min`),i=this.props_.get(`max`),a=[];this.value.rawValue.forEach((o,s)=>{if(o===void 0)return;let c=M(s,0,n,0,e),l=M(o,r,i,t,0);a.push([c,l].join(`,`))}),this.lineElem_.setAttributeNS(null,`points`,a.join(` `));let o=this.tooltipElem_,s=this.value.rawValue[this.cursor_.rawValue];if(s===void 0){o.classList.remove(pl(`t`,`a`));return}let c=M(this.cursor_.rawValue,0,n,0,e),l=M(s,r,i,t,0);o.style.left=`${c}px`,o.style.top=`${l}px`,o.textContent=`${this.formatter_(s)}`,o.classList.contains(pl(`t`,`a`))||(o.classList.add(pl(`t`,`a`),pl(`t`,`in`)),qn(o),o.classList.remove(pl(`t`,`in`)))}onValueUpdate_(){this.update_()}onCursorChange_(){this.update_()}},hl=class{constructor(e,t){if(this.onGraphMouseMove_=this.onGraphMouseMove_.bind(this),this.onGraphMouseLeave_=this.onGraphMouseLeave_.bind(this),this.onGraphPointerDown_=this.onGraphPointerDown_.bind(this),this.onGraphPointerMove_=this.onGraphPointerMove_.bind(this),this.onGraphPointerUp_=this.onGraphPointerUp_.bind(this),this.props=t.props,this.value=t.value,this.viewProps=t.viewProps,this.cursor_=A(-1),this.view=new ml(e,{cursor:this.cursor_,formatter:t.formatter,rows:t.rows,props:this.props,value:this.value,viewProps:this.viewProps}),!Yn(e))this.view.element.addEventListener(`mousemove`,this.onGraphMouseMove_),this.view.element.addEventListener(`mouseleave`,this.onGraphMouseLeave_);else{let e=new Ks(this.view.element);e.emitter.on(`down`,this.onGraphPointerDown_),e.emitter.on(`move`,this.onGraphPointerMove_),e.emitter.on(`up`,this.onGraphPointerUp_)}}importProps(e){return F(e,null,e=>({max:e.required.number,min:e.required.number}),e=>(this.props.set(`max`,e.max),this.props.set(`min`,e.min),!0))}exportProps(){return I(null,{max:this.props.get(`max`),min:this.props.get(`min`)})}onGraphMouseLeave_(){this.cursor_.rawValue=-1}onGraphMouseMove_(e){let{clientWidth:t}=this.view.element;this.cursor_.rawValue=Math.floor(M(e.offsetX,0,t,0,this.value.rawValue.length))}onGraphPointerDown_(e){this.onGraphPointerMove_(e)}onGraphPointerMove_(e){e.data.point?this.cursor_.rawValue=Math.floor(M(e.data.point.x,0,e.data.bounds.width,0,this.value.rawValue.length)):this.cursor_.rawValue=-1}onGraphPointerUp_(){this.cursor_.rawValue=-1}},gl=z({id:`monitor-number`,type:`monitor`,accept:(e,t)=>{if(typeof e!=`number`)return null;let n=P(t,e=>({format:e.optional.function,max:e.optional.number,min:e.optional.number,readonly:e.required.constant(!0),rows:e.optional.number,view:e.optional.string}));return n?{initialValue:e,params:n}:null},binding:{defaultBufferSize:e=>ro(e)?64:1,reader:e=>Dn},controller:e=>ro(e.params)?no(e):to(e),api:e=>e.controller.valueController instanceof hl?new fl(e.controller):null}),_l=z({id:`monitor-string`,type:`monitor`,accept:(e,t)=>{if(typeof e!=`string`)return null;let n=P(t,e=>({multiline:e.optional.boolean,readonly:e.required.constant(!0),rows:e.optional.number}));return n?{initialValue:e,params:n}:null},binding:{reader:e=>Ur},controller:e=>{let t=e.value;return t.rawValue.length>1||e.params.multiline?new sl(e.document,{formatter:Wr,rows:e.params.rows??il.monitor.defaultRows,value:t,viewProps:e.viewProps}):new ul(e.document,{formatter:Wr,value:t,viewProps:e.viewProps})}}),vl=class{constructor(){this.map_=new Map}get(e){return this.map_.get(e)??null}has(e){return this.map_.has(e)}add(e,t){return this.map_.set(e,t),e.viewProps.handleDispose(()=>{this.map_.delete(e)}),t}},yl=class{constructor(e){this.target=e.target,this.reader_=e.reader,this.writer_=e.writer}read(){return this.reader_(this.target.read())}write(e){this.writer_(this.target,e)}inject(e){this.write(this.reader_(e))}},bl=class{constructor(e){this.target=e.target,this.reader_=e.reader}read(){return this.reader_(this.target.read())}},xl=class{constructor(e){this.pluginsMap_={blades:[],inputs:[],monitors:[]},this.apiCache_=e}getAll(){return[...this.pluginsMap_.blades,...this.pluginsMap_.inputs,...this.pluginsMap_.monitors]}register(e,t){if(!ni(t.core))throw W.notCompatible(e,t.id);t.type===`blade`?this.pluginsMap_.blades.unshift(t):t.type===`input`?this.pluginsMap_.inputs.unshift(t):t.type===`monitor`&&this.pluginsMap_.monitors.unshift(t)}createInput_(e,t,n){return this.pluginsMap_.inputs.reduce((r,i)=>r??io(i,{document:e,target:t,params:n}),null)}createMonitor_(e,t,n){return this.pluginsMap_.monitors.reduce((r,i)=>r??oo(i,{document:e,params:n,target:t}),null)}createBinding(e,t,n){if(k(t.read()))throw new W({context:{key:t.key},type:`nomatchingcontroller`});let r=this.createInput_(e,t,n);if(r)return r;let i=this.createMonitor_(e,t,n);if(i)return i;throw new W({context:{key:t.key},type:`nomatchingcontroller`})}createBlade(e,t){let n=this.pluginsMap_.blades.reduce((n,r)=>n??Nr(r,{document:e,params:t}),null);if(!n)throw new W({type:`nomatchingview`,context:{params:t}});return n}createInputBindingApi_(e){let t=this.pluginsMap_.inputs.reduce((t,n)=>t||(n.api?.call(n,{controller:e})??null),null);return this.apiCache_.add(e,t??new No(e))}createMonitorBindingApi_(e){let t=this.pluginsMap_.monitors.reduce((t,n)=>t||(n.api?.call(n,{controller:e})??null),null);return this.apiCache_.add(e,t??new No(e))}createBindingApi(e){if(this.apiCache_.has(e))return this.apiCache_.get(e);if(ur(e))return this.createInputBindingApi_(e);if(gr(e))return this.createMonitorBindingApi_(e);throw W.shouldNeverHappen()}createApi(e){if(this.apiCache_.has(e))return this.apiCache_.get(e);if(lr(e))return this.createBindingApi(e);let t=this.pluginsMap_.blades.reduce((t,n)=>t??n.api({controller:e,pool:this}),null);if(!t)throw W.shouldNeverHappen();return this.apiCache_.add(e,t)}},Sl=new vl,Cl=class extends Do{constructor(e){super(e),this.emitter_=new G,this.controller.value.emitter.on(`change`,e=>{this.emitter_.emit(`change`,new ko(this,e.rawValue))})}get label(){return this.controller.labelController.props.get(`label`)}set label(e){this.controller.labelController.props.set(`label`,e)}get options(){return this.controller.valueController.props.get(`options`)}set options(e){this.controller.valueController.props.set(`options`,e)}get value(){return this.controller.value.rawValue}set value(e){this.controller.value.rawValue=e}on(e,t){let n=t.bind(this);return this.emitter_.on(e,e=>{n(e)},{key:t}),this}off(e,t){return this.emitter_.off(e,t),this}},wl=class extends Do{},Tl=class extends Do{constructor(e){super(e),this.emitter_=new G,this.controller.value.emitter.on(`change`,e=>{this.emitter_.emit(`change`,new ko(this,e.rawValue))})}get label(){return this.controller.labelController.props.get(`label`)}set label(e){this.controller.labelController.props.set(`label`,e)}get max(){return this.controller.valueController.sliderController.props.get(`max`)}set max(e){this.controller.valueController.sliderController.props.set(`max`,e)}get min(){return this.controller.valueController.sliderController.props.get(`min`)}set min(e){this.controller.valueController.sliderController.props.set(`min`,e)}get value(){return this.controller.value.rawValue}set value(e){this.controller.value.rawValue=e}on(e,t){let n=t.bind(this);return this.emitter_.on(e,e=>{n(e)},{key:t}),this}off(e,t){return this.emitter_.off(e,t),this}},El=class extends Do{constructor(e){super(e),this.emitter_=new G,this.controller.value.emitter.on(`change`,e=>{this.emitter_.emit(`change`,new ko(this,e.rawValue))})}get label(){return this.controller.labelController.props.get(`label`)}set label(e){this.controller.labelController.props.set(`label`,e)}get formatter(){return this.controller.valueController.props.get(`formatter`)}set formatter(e){this.controller.valueController.props.set(`formatter`,e)}get value(){return this.controller.value.rawValue}set value(e){this.controller.value.rawValue=e}on(e,t){let n=t.bind(this);return this.emitter_.on(e,e=>{n(e)},{key:t}),this}off(e,t){return this.emitter_.off(e,t),this}},Dl=(function(){return{id:`list`,type:`blade`,core:ts,accept(e){let t=P(e,e=>({options:e.required.custom(Fr),value:e.required.raw,view:e.required.constant(`list`),label:e.optional.string}));return t?{params:t}:null},controller(e){let t=new Fs(Ir(e.params.options)),n=A(e.params.value,{constraint:t}),r=new Rs(e.document,{props:new K({options:t.values.value(`options`)}),value:n,viewProps:e.viewProps});return new Wo(e.document,{blade:e.blade,props:K.fromObject({label:e.params.label}),value:n,valueController:r})},api(e){return!(e.controller instanceof Wo)||!(e.controller.valueController instanceof Rs)?null:new Cl(e.controller)}}})(),Ol=class extends us{constructor(e,t){super(e,t)}get element(){return this.controller.view.element}},kl=class extends ps{constructor(e,t){super(e,{expanded:t.expanded,blade:t.blade,props:t.props,root:!0,viewProps:t.viewProps})}},Al=R(`spr`),jl=class{constructor(e,t){this.element=e.createElement(`div`),this.element.classList.add(Al()),t.viewProps.bindClassModifiers(this.element);let n=e.createElement(`hr`);n.classList.add(Al(`r`)),this.element.appendChild(n)}},Ml=class extends Uo{constructor(e,t){super(Object.assign(Object.assign({},t),{view:new jl(e,{viewProps:t.viewProps})}))}},Nl={id:`separator`,type:`blade`,core:ts,accept(e){let t=P(e,e=>({view:e.required.constant(`separator`)}));return t?{params:t}:null},controller(e){return new Ml(e.document,{blade:e.blade,viewProps:e.viewProps})},api(e){return e.controller instanceof Ml?new wl(e.controller):null}},Pl={id:`slider`,type:`blade`,core:ts,accept(e){let t=P(e,e=>({max:e.required.number,min:e.required.number,view:e.required.constant(`slider`),format:e.optional.function,label:e.optional.string,value:e.optional.number}));return t?{params:t}:null},controller(e){let t=e.params.value??0,n=new go({max:e.params.max,min:e.params.min}),r=A(t,{constraint:n}),i=new ec(e.document,Object.assign(Object.assign({},Zr({formatter:e.params.format??On,keyScale:A(1),max:n.values.value(`max`),min:n.values.value(`min`),pointerScale:Nn(e.params,t)})),{parser:En,value:r,viewProps:e.viewProps}));return new Wo(e.document,{blade:e.blade,props:K.fromObject({label:e.params.label}),value:r,valueController:i})},api(e){return!(e.controller instanceof Wo)||!(e.controller.valueController instanceof ec)?null:new Tl(e.controller)}},Fl=(function(){return{id:`text`,type:`blade`,core:ts,accept(e){let t=P(e,e=>({parse:e.required.function,value:e.required.raw,view:e.required.constant(`text`),format:e.optional.function,label:e.optional.string}));return t?{params:t}:null},controller(e){let t=A(e.params.value),n=new Ws(e.document,{parser:e.params.parse,props:K.fromObject({formatter:e.params.format??(e=>String(e))}),value:t,viewProps:e.viewProps});return new Wo(e.document,{blade:e.blade,props:K.fromObject({label:e.params.label}),value:t,valueController:n})},api(e){return!(e.controller instanceof Wo)||!(e.controller.valueController instanceof Ws)?null:new El(e.controller)}}})(),Z=class extends Ol{constructor(e){let t=e??{},n=t.document??Zn(),r=so(),i=new kl(n,{expanded:t.expanded,blade:Or(),props:K.fromObject({title:t.title}),viewProps:gs.create()});super(i,r),this.pool_=r,this.containerElem_=t.container??co(n),this.containerElem_.appendChild(this.element),this.doc_=n,this.usesDefaultWrapper_=!t.container,this.setUpDefaultPlugins_()}get document(){if(!this.doc_)throw W.alreadyDisposed();return this.doc_}dispose(){let e=this.containerElem_;if(!e)throw W.alreadyDisposed();if(this.usesDefaultWrapper_){let t=e.parentElement;t&&t.removeChild(e)}this.containerElem_=null,this.doc_=null,super.dispose()}registerPlugin(e){e.css&&lo(this.document,`plugin-${e.id}`,e.css),(`plugin`in e?[e.plugin]:`plugins`in e?e.plugins:[]).forEach(t=>{this.pool_.register(e.id,t)})}setUpDefaultPlugins_(){this.registerPlugin({id:`default`,css:`.tp-tbiv_b,.tp-coltxtv_ms,.tp-colswv_b,.tp-ckbv_i,.tp-sglv_i,.tp-mllv_i,.tp-grlv_g,.tp-txtv_i,.tp-p2dpv_p,.tp-colswv_sw,.tp-rotv_b,.tp-fldv_b,.tp-p2dv_b,.tp-btnv_b,.tp-lstv_s{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:rgba(0,0,0,0);border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0}.tp-p2dv_b,.tp-btnv_b,.tp-lstv_s{background-color:var(--btn-bg);border-radius:var(--bld-br);color:var(--btn-fg);cursor:pointer;display:block;font-weight:bold;height:var(--cnt-usz);line-height:var(--cnt-usz);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tp-p2dv_b:hover,.tp-btnv_b:hover,.tp-lstv_s:hover{background-color:var(--btn-bg-h)}.tp-p2dv_b:focus,.tp-btnv_b:focus,.tp-lstv_s:focus{background-color:var(--btn-bg-f)}.tp-p2dv_b:active,.tp-btnv_b:active,.tp-lstv_s:active{background-color:var(--btn-bg-a)}.tp-p2dv_b:disabled,.tp-btnv_b:disabled,.tp-lstv_s:disabled{opacity:.5}.tp-rotv_c>.tp-cntv.tp-v-lst,.tp-tbpv_c>.tp-cntv.tp-v-lst,.tp-fldv_c>.tp-cntv.tp-v-lst{margin-bottom:calc(-1*var(--cnt-vp))}.tp-rotv_c>.tp-fldv.tp-v-lst .tp-fldv_c,.tp-tbpv_c>.tp-fldv.tp-v-lst .tp-fldv_c,.tp-fldv_c>.tp-fldv.tp-v-lst .tp-fldv_c{border-bottom-left-radius:0}.tp-rotv_c>.tp-fldv.tp-v-lst .tp-fldv_b,.tp-tbpv_c>.tp-fldv.tp-v-lst .tp-fldv_b,.tp-fldv_c>.tp-fldv.tp-v-lst .tp-fldv_b{border-bottom-left-radius:0}.tp-rotv_c>*:not(.tp-v-fst),.tp-tbpv_c>*:not(.tp-v-fst),.tp-fldv_c>*:not(.tp-v-fst){margin-top:var(--cnt-usp)}.tp-rotv_c>.tp-sprv:not(.tp-v-fst),.tp-tbpv_c>.tp-sprv:not(.tp-v-fst),.tp-fldv_c>.tp-sprv:not(.tp-v-fst),.tp-rotv_c>.tp-cntv:not(.tp-v-fst),.tp-tbpv_c>.tp-cntv:not(.tp-v-fst),.tp-fldv_c>.tp-cntv:not(.tp-v-fst){margin-top:var(--cnt-vp)}.tp-rotv_c>.tp-sprv+*:not(.tp-v-hidden),.tp-tbpv_c>.tp-sprv+*:not(.tp-v-hidden),.tp-fldv_c>.tp-sprv+*:not(.tp-v-hidden),.tp-rotv_c>.tp-cntv+*:not(.tp-v-hidden),.tp-tbpv_c>.tp-cntv+*:not(.tp-v-hidden),.tp-fldv_c>.tp-cntv+*:not(.tp-v-hidden){margin-top:var(--cnt-vp)}.tp-rotv_c>.tp-sprv:not(.tp-v-hidden)+.tp-sprv,.tp-tbpv_c>.tp-sprv:not(.tp-v-hidden)+.tp-sprv,.tp-fldv_c>.tp-sprv:not(.tp-v-hidden)+.tp-sprv,.tp-rotv_c>.tp-cntv:not(.tp-v-hidden)+.tp-cntv,.tp-tbpv_c>.tp-cntv:not(.tp-v-hidden)+.tp-cntv,.tp-fldv_c>.tp-cntv:not(.tp-v-hidden)+.tp-cntv{margin-top:0}.tp-tbpv_c>.tp-cntv,.tp-fldv_c>.tp-cntv{margin-left:4px}.tp-tbpv_c>.tp-fldv>.tp-fldv_b,.tp-fldv_c>.tp-fldv>.tp-fldv_b{border-top-left-radius:var(--bld-br);border-bottom-left-radius:var(--bld-br)}.tp-tbpv_c>.tp-fldv.tp-fldv-expanded>.tp-fldv_b,.tp-fldv_c>.tp-fldv.tp-fldv-expanded>.tp-fldv_b{border-bottom-left-radius:0}.tp-tbpv_c .tp-fldv>.tp-fldv_c,.tp-fldv_c .tp-fldv>.tp-fldv_c{border-bottom-left-radius:var(--bld-br)}.tp-tbpv_c>.tp-cntv+.tp-fldv>.tp-fldv_b,.tp-fldv_c>.tp-cntv+.tp-fldv>.tp-fldv_b{border-top-left-radius:0}.tp-tbpv_c>.tp-cntv+.tp-tabv>.tp-tabv_t,.tp-fldv_c>.tp-cntv+.tp-tabv>.tp-tabv_t{border-top-left-radius:0}.tp-tbpv_c>.tp-tabv>.tp-tabv_t,.tp-fldv_c>.tp-tabv>.tp-tabv_t{border-top-left-radius:var(--bld-br)}.tp-tbpv_c .tp-tabv>.tp-tabv_c,.tp-fldv_c .tp-tabv>.tp-tabv_c{border-bottom-left-radius:var(--bld-br)}.tp-rotv_b,.tp-fldv_b{background-color:var(--cnt-bg);color:var(--cnt-fg);cursor:pointer;display:block;height:calc(var(--cnt-usz) + 4px);line-height:calc(var(--cnt-usz) + 4px);overflow:hidden;padding-left:var(--cnt-hp);padding-right:calc(4px + var(--cnt-usz) + var(--cnt-hp));position:relative;text-align:left;text-overflow:ellipsis;white-space:nowrap;width:100%;transition:border-radius .2s ease-in-out .2s}.tp-rotv_b:hover,.tp-fldv_b:hover{background-color:var(--cnt-bg-h)}.tp-rotv_b:focus,.tp-fldv_b:focus{background-color:var(--cnt-bg-f)}.tp-rotv_b:active,.tp-fldv_b:active{background-color:var(--cnt-bg-a)}.tp-rotv_b:disabled,.tp-fldv_b:disabled{opacity:.5}.tp-rotv_m,.tp-fldv_m{background:linear-gradient(to left, var(--cnt-fg), var(--cnt-fg) 2px, transparent 2px, transparent 4px, var(--cnt-fg) 4px);border-radius:2px;bottom:0;content:"";display:block;height:6px;right:calc(var(--cnt-hp) + (var(--cnt-usz) + 4px - 6px)/2 - 2px);margin:auto;opacity:.5;position:absolute;top:0;transform:rotate(90deg);transition:transform .2s ease-in-out;width:6px}.tp-rotv.tp-rotv-expanded .tp-rotv_m,.tp-fldv.tp-fldv-expanded>.tp-fldv_b>.tp-fldv_m{transform:none}.tp-rotv_c,.tp-fldv_c{box-sizing:border-box;height:0;opacity:0;overflow:hidden;padding-bottom:0;padding-top:0;position:relative;transition:height .2s ease-in-out,opacity .2s linear,padding .2s ease-in-out}.tp-rotv.tp-rotv-cpl:not(.tp-rotv-expanded) .tp-rotv_c,.tp-fldv.tp-fldv-cpl:not(.tp-fldv-expanded)>.tp-fldv_c{display:none}.tp-rotv.tp-rotv-expanded .tp-rotv_c,.tp-fldv.tp-fldv-expanded>.tp-fldv_c{opacity:1;padding-bottom:var(--cnt-vp);padding-top:var(--cnt-vp);transform:none;overflow:visible;transition:height .2s ease-in-out,opacity .2s linear .2s,padding .2s ease-in-out}.tp-txtv_i,.tp-p2dpv_p,.tp-colswv_sw{background-color:var(--in-bg);border-radius:var(--bld-br);box-sizing:border-box;color:var(--in-fg);font-family:inherit;height:var(--cnt-usz);line-height:var(--cnt-usz);min-width:0;width:100%}.tp-txtv_i:hover,.tp-p2dpv_p:hover,.tp-colswv_sw:hover{background-color:var(--in-bg-h)}.tp-txtv_i:focus,.tp-p2dpv_p:focus,.tp-colswv_sw:focus{background-color:var(--in-bg-f)}.tp-txtv_i:active,.tp-p2dpv_p:active,.tp-colswv_sw:active{background-color:var(--in-bg-a)}.tp-txtv_i:disabled,.tp-p2dpv_p:disabled,.tp-colswv_sw:disabled{opacity:.5}.tp-lstv,.tp-coltxtv_m{position:relative}.tp-lstv_s{padding:0 20px 0 4px;width:100%}.tp-lstv_m,.tp-coltxtv_mm{bottom:0;margin:auto;pointer-events:none;position:absolute;right:2px;top:0}.tp-lstv_m svg,.tp-coltxtv_mm svg{bottom:0;height:16px;margin:auto;position:absolute;right:0;top:0;width:16px}.tp-lstv_m svg path,.tp-coltxtv_mm svg path{fill:currentColor}.tp-sglv_i,.tp-mllv_i,.tp-grlv_g{background-color:var(--mo-bg);border-radius:var(--bld-br);box-sizing:border-box;color:var(--mo-fg);height:var(--cnt-usz);scrollbar-color:currentColor rgba(0,0,0,0);scrollbar-width:thin;width:100%}.tp-sglv_i::-webkit-scrollbar,.tp-mllv_i::-webkit-scrollbar,.tp-grlv_g::-webkit-scrollbar{height:8px;width:8px}.tp-sglv_i::-webkit-scrollbar-corner,.tp-mllv_i::-webkit-scrollbar-corner,.tp-grlv_g::-webkit-scrollbar-corner{background-color:rgba(0,0,0,0)}.tp-sglv_i::-webkit-scrollbar-thumb,.tp-mllv_i::-webkit-scrollbar-thumb,.tp-grlv_g::-webkit-scrollbar-thumb{background-clip:padding-box;background-color:currentColor;border:rgba(0,0,0,0) solid 2px;border-radius:4px}.tp-pndtxtv,.tp-coltxtv_w{display:flex}.tp-pndtxtv_a,.tp-coltxtv_c{width:100%}.tp-pndtxtv_a+.tp-pndtxtv_a,.tp-coltxtv_c+.tp-pndtxtv_a,.tp-pndtxtv_a+.tp-coltxtv_c,.tp-coltxtv_c+.tp-coltxtv_c{margin-left:2px}.tp-rotv{--bs-bg: var(--tp-base-background-color, hsl(230, 7%, 17%));--bs-br: var(--tp-base-border-radius, 6px);--bs-ff: var(--tp-base-font-family, Roboto Mono, Source Code Pro, Menlo, Courier, monospace);--bs-sh: var(--tp-base-shadow-color, rgba(0, 0, 0, 0.2));--bld-br: var(--tp-blade-border-radius, 2px);--bld-hp: var(--tp-blade-horizontal-padding, 4px);--bld-vw: var(--tp-blade-value-width, 160px);--btn-bg: var(--tp-button-background-color, hsl(230, 7%, 70%));--btn-bg-a: var(--tp-button-background-color-active, #d6d7db);--btn-bg-f: var(--tp-button-background-color-focus, #c8cad0);--btn-bg-h: var(--tp-button-background-color-hover, #bbbcc4);--btn-fg: var(--tp-button-foreground-color, hsl(230, 7%, 17%));--cnt-bg: var(--tp-container-background-color, rgba(187, 188, 196, 0.1));--cnt-bg-a: var(--tp-container-background-color-active, rgba(187, 188, 196, 0.25));--cnt-bg-f: var(--tp-container-background-color-focus, rgba(187, 188, 196, 0.2));--cnt-bg-h: var(--tp-container-background-color-hover, rgba(187, 188, 196, 0.15));--cnt-fg: var(--tp-container-foreground-color, hsl(230, 7%, 75%));--cnt-hp: var(--tp-container-horizontal-padding, 4px);--cnt-vp: var(--tp-container-vertical-padding, 4px);--cnt-usp: var(--tp-container-unit-spacing, 4px);--cnt-usz: var(--tp-container-unit-size, 20px);--in-bg: var(--tp-input-background-color, rgba(187, 188, 196, 0.1));--in-bg-a: var(--tp-input-background-color-active, rgba(187, 188, 196, 0.25));--in-bg-f: var(--tp-input-background-color-focus, rgba(187, 188, 196, 0.2));--in-bg-h: var(--tp-input-background-color-hover, rgba(187, 188, 196, 0.15));--in-fg: var(--tp-input-foreground-color, hsl(230, 7%, 75%));--lbl-fg: var(--tp-label-foreground-color, rgba(187, 188, 196, 0.7));--mo-bg: var(--tp-monitor-background-color, rgba(0, 0, 0, 0.2));--mo-fg: var(--tp-monitor-foreground-color, rgba(187, 188, 196, 0.7));--grv-fg: var(--tp-groove-foreground-color, rgba(187, 188, 196, 0.1))}.tp-btnv_b{width:100%}.tp-btnv_t{text-align:center}.tp-ckbv_l{display:block;position:relative}.tp-ckbv_i{left:0;opacity:0;position:absolute;top:0}.tp-ckbv_w{background-color:var(--in-bg);border-radius:var(--bld-br);cursor:pointer;display:block;height:var(--cnt-usz);position:relative;width:var(--cnt-usz)}.tp-ckbv_w svg{display:block;height:16px;inset:0;margin:auto;opacity:0;position:absolute;width:16px}.tp-ckbv_w svg path{fill:none;stroke:var(--in-fg);stroke-width:2}.tp-ckbv_i:hover+.tp-ckbv_w{background-color:var(--in-bg-h)}.tp-ckbv_i:focus+.tp-ckbv_w{background-color:var(--in-bg-f)}.tp-ckbv_i:active+.tp-ckbv_w{background-color:var(--in-bg-a)}.tp-ckbv_i:checked+.tp-ckbv_w svg{opacity:1}.tp-ckbv.tp-v-disabled .tp-ckbv_w{opacity:.5}.tp-colv{position:relative}.tp-colv_h{display:flex}.tp-colv_s{flex-grow:0;flex-shrink:0;width:var(--cnt-usz)}.tp-colv_t{flex:1;margin-left:4px}.tp-colv_p{height:0;margin-top:0;opacity:0;overflow:hidden;transition:height .2s ease-in-out,opacity .2s linear,margin .2s ease-in-out}.tp-colv.tp-colv-expanded.tp-colv-cpl .tp-colv_p{overflow:visible}.tp-colv.tp-colv-expanded .tp-colv_p{margin-top:var(--cnt-usp);opacity:1}.tp-colv .tp-popv{left:calc(-1*var(--cnt-hp));right:calc(-1*var(--cnt-hp));top:var(--cnt-usz)}.tp-colpv_h,.tp-colpv_ap{margin-left:6px;margin-right:6px}.tp-colpv_h{margin-top:var(--cnt-usp)}.tp-colpv_rgb{display:flex;margin-top:var(--cnt-usp);width:100%}.tp-colpv_a{display:flex;margin-top:var(--cnt-vp);padding-top:calc(var(--cnt-vp) + 2px);position:relative}.tp-colpv_a::before{background-color:var(--grv-fg);content:"";height:2px;left:calc(-1*var(--cnt-hp));position:absolute;right:calc(-1*var(--cnt-hp));top:0}.tp-colpv.tp-v-disabled .tp-colpv_a::before{opacity:.5}.tp-colpv_ap{align-items:center;display:flex;flex:3}.tp-colpv_at{flex:1;margin-left:4px}.tp-svpv{border-radius:var(--bld-br);outline:none;overflow:hidden;position:relative}.tp-svpv.tp-v-disabled{opacity:.5}.tp-svpv_c{cursor:crosshair;display:block;height:calc(var(--cnt-usz)*4);width:100%}.tp-svpv_m{border-radius:100%;border:rgba(255,255,255,.75) solid 2px;box-sizing:border-box;filter:drop-shadow(0 0 1px rgba(0, 0, 0, 0.3));height:12px;margin-left:-6px;margin-top:-6px;pointer-events:none;position:absolute;width:12px}.tp-svpv:focus .tp-svpv_m{border-color:#fff}.tp-hplv{cursor:pointer;height:var(--cnt-usz);outline:none;position:relative}.tp-hplv.tp-v-disabled{opacity:.5}.tp-hplv_c{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAABCAYAAABubagXAAAAQ0lEQVQoU2P8z8Dwn0GCgQEDi2OK/RBgYHjBgIpfovFh8j8YBIgzFGQxuqEgPhaDOT5gOhPkdCxOZeBg+IDFZZiGAgCaSSMYtcRHLgAAAABJRU5ErkJggg==);background-position:left top;background-repeat:no-repeat;background-size:100% 100%;border-radius:2px;display:block;height:4px;left:0;margin-top:-2px;position:absolute;top:50%;width:100%}.tp-hplv_m{border-radius:var(--bld-br);border:rgba(255,255,255,.75) solid 2px;box-shadow:0 0 2px rgba(0,0,0,.1);box-sizing:border-box;height:12px;left:50%;margin-left:-6px;margin-top:-6px;position:absolute;top:50%;width:12px}.tp-hplv:focus .tp-hplv_m{border-color:#fff}.tp-aplv{cursor:pointer;height:var(--cnt-usz);outline:none;position:relative;width:100%}.tp-aplv.tp-v-disabled{opacity:.5}.tp-aplv_b{background-color:#fff;background-image:linear-gradient(to top right, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%),linear-gradient(to top right, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%);background-size:4px 4px;background-position:0 0,2px 2px;border-radius:2px;display:block;height:4px;left:0;margin-top:-2px;overflow:hidden;position:absolute;top:50%;width:100%}.tp-aplv_c{inset:0;position:absolute}.tp-aplv_m{background-color:#fff;background-image:linear-gradient(to top right, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%),linear-gradient(to top right, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%);background-size:12px 12px;background-position:0 0,6px 6px;border-radius:var(--bld-br);box-shadow:0 0 2px rgba(0,0,0,.1);height:12px;left:50%;margin-left:-6px;margin-top:-6px;overflow:hidden;position:absolute;top:50%;width:12px}.tp-aplv_p{border-radius:var(--bld-br);border:rgba(255,255,255,.75) solid 2px;box-sizing:border-box;inset:0;position:absolute}.tp-aplv:focus .tp-aplv_p{border-color:#fff}.tp-colswv{background-color:#fff;background-image:linear-gradient(to top right, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%),linear-gradient(to top right, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%);background-size:10px 10px;background-position:0 0,5px 5px;border-radius:var(--bld-br);overflow:hidden}.tp-colswv.tp-v-disabled{opacity:.5}.tp-colswv_sw{border-radius:0}.tp-colswv_b{cursor:pointer;display:block;height:var(--cnt-usz);left:0;position:absolute;top:0;width:var(--cnt-usz)}.tp-colswv_b:focus::after{border:rgba(255,255,255,.75) solid 2px;border-radius:var(--bld-br);content:"";display:block;inset:0;position:absolute}.tp-coltxtv{display:flex;width:100%}.tp-coltxtv_m{margin-right:4px}.tp-coltxtv_ms{border-radius:var(--bld-br);color:var(--lbl-fg);cursor:pointer;height:var(--cnt-usz);line-height:var(--cnt-usz);padding:0 18px 0 4px}.tp-coltxtv_ms:hover{background-color:var(--in-bg-h)}.tp-coltxtv_ms:focus{background-color:var(--in-bg-f)}.tp-coltxtv_ms:active{background-color:var(--in-bg-a)}.tp-coltxtv_mm{color:var(--lbl-fg)}.tp-coltxtv.tp-v-disabled .tp-coltxtv_mm{opacity:.5}.tp-coltxtv_w{flex:1}.tp-dfwv{position:absolute;top:8px;right:8px;width:256px}.tp-fldv{position:relative}.tp-fldv_t{padding-left:4px}.tp-fldv_b:disabled .tp-fldv_m{display:none}.tp-fldv_c{padding-left:4px}.tp-fldv_i{bottom:0;color:var(--cnt-bg);left:0;overflow:hidden;position:absolute;top:calc(var(--cnt-usz) + 4px);width:max(var(--bs-br),4px)}.tp-fldv_i::before{background-color:currentColor;bottom:0;content:"";left:0;position:absolute;top:0;width:4px}.tp-fldv_b:hover+.tp-fldv_i{color:var(--cnt-bg-h)}.tp-fldv_b:focus+.tp-fldv_i{color:var(--cnt-bg-f)}.tp-fldv_b:active+.tp-fldv_i{color:var(--cnt-bg-a)}.tp-fldv.tp-v-disabled>.tp-fldv_i{opacity:.5}.tp-grlv{position:relative}.tp-grlv_g{display:block;height:calc(var(--cnt-usz)*3)}.tp-grlv_g polyline{fill:none;stroke:var(--mo-fg);stroke-linejoin:round}.tp-grlv_t{margin-top:-4px;transition:left .05s,top .05s;visibility:hidden}.tp-grlv_t.tp-grlv_t-a{visibility:visible}.tp-grlv_t.tp-grlv_t-in{transition:none}.tp-grlv.tp-v-disabled .tp-grlv_g{opacity:.5}.tp-grlv .tp-ttv{background-color:var(--mo-fg)}.tp-grlv .tp-ttv::before{border-top-color:var(--mo-fg)}.tp-lblv{align-items:center;display:flex;line-height:1.3;padding-left:var(--cnt-hp);padding-right:var(--cnt-hp)}.tp-lblv.tp-lblv-nol{display:block}.tp-lblv_l{color:var(--lbl-fg);flex:1;-webkit-hyphens:auto;hyphens:auto;overflow:hidden;padding-left:4px;padding-right:16px}.tp-lblv.tp-v-disabled .tp-lblv_l{opacity:.5}.tp-lblv.tp-lblv-nol .tp-lblv_l{display:none}.tp-lblv_v{align-self:flex-start;flex-grow:0;flex-shrink:0;width:var(--bld-vw)}.tp-lblv.tp-lblv-nol .tp-lblv_v{width:100%}.tp-lstv_s{padding:0 20px 0 var(--bld-hp);width:100%}.tp-lstv_m{color:var(--btn-fg)}.tp-sglv_i{padding-left:var(--bld-hp);padding-right:var(--bld-hp)}.tp-sglv.tp-v-disabled .tp-sglv_i{opacity:.5}.tp-mllv_i{display:block;height:calc(var(--cnt-usz)*3);line-height:var(--cnt-usz);padding-left:var(--bld-hp);padding-right:var(--bld-hp);resize:none;white-space:pre}.tp-mllv.tp-v-disabled .tp-mllv_i{opacity:.5}.tp-p2dv{position:relative}.tp-p2dv_h{display:flex}.tp-p2dv_b{height:var(--cnt-usz);margin-right:4px;position:relative;width:var(--cnt-usz)}.tp-p2dv_b svg{display:block;height:16px;left:50%;margin-left:-8px;margin-top:-8px;position:absolute;top:50%;width:16px}.tp-p2dv_b svg path{stroke:currentColor;stroke-width:2}.tp-p2dv_b svg circle{fill:currentColor}.tp-p2dv_t{flex:1}.tp-p2dv_p{height:0;margin-top:0;opacity:0;overflow:hidden;transition:height .2s ease-in-out,opacity .2s linear,margin .2s ease-in-out}.tp-p2dv.tp-p2dv-expanded .tp-p2dv_p{margin-top:var(--cnt-usp);opacity:1}.tp-p2dv .tp-popv{left:calc(-1*var(--cnt-hp));right:calc(-1*var(--cnt-hp));top:var(--cnt-usz)}.tp-p2dpv{padding-left:calc(var(--cnt-usz) + 4px)}.tp-p2dpv_p{cursor:crosshair;height:0;overflow:hidden;padding-bottom:100%;position:relative}.tp-p2dpv.tp-v-disabled .tp-p2dpv_p{opacity:.5}.tp-p2dpv_g{display:block;height:100%;left:0;pointer-events:none;position:absolute;top:0;width:100%}.tp-p2dpv_ax{opacity:.1;stroke:var(--in-fg);stroke-dasharray:1}.tp-p2dpv_l{opacity:.5;stroke:var(--in-fg);stroke-dasharray:1}.tp-p2dpv_m{border:var(--in-fg) solid 1px;border-radius:50%;box-sizing:border-box;height:4px;margin-left:-2px;margin-top:-2px;position:absolute;width:4px}.tp-p2dpv_p:focus .tp-p2dpv_m{background-color:var(--in-fg);border-width:0}.tp-popv{background-color:var(--bs-bg);border-radius:var(--bs-br);box-shadow:0 2px 4px var(--bs-sh);display:none;max-width:var(--bld-vw);padding:var(--cnt-vp) var(--cnt-hp);position:absolute;visibility:hidden;z-index:1000}.tp-popv.tp-popv-v{display:block;visibility:visible}.tp-sldv.tp-v-disabled{opacity:.5}.tp-sldv_t{box-sizing:border-box;cursor:pointer;height:var(--cnt-usz);margin:0 6px;outline:none;position:relative}.tp-sldv_t::before{background-color:var(--in-bg);border-radius:1px;content:"";display:block;height:2px;inset:0;margin:auto;position:absolute}.tp-sldv_k{height:100%;left:0;position:absolute;top:0}.tp-sldv_k::before{background-color:var(--in-fg);border-radius:1px;content:"";display:block;height:2px;inset:0;margin-bottom:auto;margin-top:auto;position:absolute}.tp-sldv_k::after{background-color:var(--btn-bg);border-radius:var(--bld-br);bottom:0;content:"";display:block;height:12px;margin-bottom:auto;margin-top:auto;position:absolute;right:-6px;top:0;width:12px}.tp-sldv_t:hover .tp-sldv_k::after{background-color:var(--btn-bg-h)}.tp-sldv_t:focus .tp-sldv_k::after{background-color:var(--btn-bg-f)}.tp-sldv_t:active .tp-sldv_k::after{background-color:var(--btn-bg-a)}.tp-sldtxtv{display:flex}.tp-sldtxtv_s{flex:2}.tp-sldtxtv_t{flex:1;margin-left:4px}.tp-tabv{position:relative}.tp-tabv_t{align-items:flex-end;color:var(--cnt-bg);display:flex;overflow:hidden;position:relative}.tp-tabv_t:hover{color:var(--cnt-bg-h)}.tp-tabv_t:has(*:focus){color:var(--cnt-bg-f)}.tp-tabv_t:has(*:active){color:var(--cnt-bg-a)}.tp-tabv_t::before{background-color:currentColor;bottom:0;content:"";height:2px;left:0;pointer-events:none;position:absolute;right:0}.tp-tabv.tp-v-disabled .tp-tabv_t::before{opacity:.5}.tp-tabv.tp-tabv-nop .tp-tabv_t{height:calc(var(--cnt-usz) + 4px);position:relative}.tp-tabv.tp-tabv-nop .tp-tabv_t::before{background-color:var(--cnt-bg);bottom:0;content:"";height:2px;left:0;position:absolute;right:0}.tp-tabv_i{bottom:0;color:var(--cnt-bg);left:0;overflow:hidden;position:absolute;top:calc(var(--cnt-usz) + 4px);width:max(var(--bs-br),4px)}.tp-tabv_i::before{background-color:currentColor;bottom:0;content:"";left:0;position:absolute;top:0;width:4px}.tp-tabv_t:hover+.tp-tabv_i{color:var(--cnt-bg-h)}.tp-tabv_t:has(*:focus)+.tp-tabv_i{color:var(--cnt-bg-f)}.tp-tabv_t:has(*:active)+.tp-tabv_i{color:var(--cnt-bg-a)}.tp-tabv.tp-v-disabled>.tp-tabv_i{opacity:.5}.tp-tbiv{flex:1;min-width:0;position:relative}.tp-tbiv+.tp-tbiv{margin-left:2px}.tp-tbiv+.tp-tbiv.tp-v-disabled::before{opacity:.5}.tp-tbiv_b{display:block;padding-left:calc(var(--cnt-hp) + 4px);padding-right:calc(var(--cnt-hp) + 4px);position:relative;width:100%}.tp-tbiv_b:disabled{opacity:.5}.tp-tbiv_b::before{background-color:var(--cnt-bg);content:"";inset:0 0 2px;pointer-events:none;position:absolute}.tp-tbiv_b:hover::before{background-color:var(--cnt-bg-h)}.tp-tbiv_b:focus::before{background-color:var(--cnt-bg-f)}.tp-tbiv_b:active::before{background-color:var(--cnt-bg-a)}.tp-tbiv_t{color:var(--cnt-fg);height:calc(var(--cnt-usz) + 4px);line-height:calc(var(--cnt-usz) + 4px);opacity:.5;overflow:hidden;position:relative;text-overflow:ellipsis}.tp-tbiv.tp-tbiv-sel .tp-tbiv_t{opacity:1}.tp-tbpv_c{padding-bottom:var(--cnt-vp);padding-left:4px;padding-top:var(--cnt-vp)}.tp-txtv{position:relative}.tp-txtv_i{padding-left:var(--bld-hp);padding-right:var(--bld-hp)}.tp-txtv.tp-txtv-fst .tp-txtv_i{border-bottom-right-radius:0;border-top-right-radius:0}.tp-txtv.tp-txtv-mid .tp-txtv_i{border-radius:0}.tp-txtv.tp-txtv-lst .tp-txtv_i{border-bottom-left-radius:0;border-top-left-radius:0}.tp-txtv.tp-txtv-num .tp-txtv_i{text-align:right}.tp-txtv.tp-txtv-drg .tp-txtv_i{opacity:.3}.tp-txtv_k{cursor:pointer;height:100%;left:calc(var(--bld-hp) - 5px);position:absolute;top:0;width:12px}.tp-txtv_k::before{background-color:var(--in-fg);border-radius:1px;bottom:0;content:"";height:calc(var(--cnt-usz) - 4px);left:50%;margin-bottom:auto;margin-left:-1px;margin-top:auto;opacity:.1;position:absolute;top:0;transition:border-radius .1s,height .1s,transform .1s,width .1s;width:2px}.tp-txtv_k:hover::before,.tp-txtv.tp-txtv-drg .tp-txtv_k::before{opacity:1}.tp-txtv.tp-txtv-drg .tp-txtv_k::before{border-radius:50%;height:4px;transform:translateX(-1px);width:4px}.tp-txtv_g{bottom:0;display:block;height:8px;left:50%;margin:auto;overflow:visible;pointer-events:none;position:absolute;top:0;visibility:hidden;width:100%}.tp-txtv.tp-txtv-drg .tp-txtv_g{visibility:visible}.tp-txtv_gb{fill:none;stroke:var(--in-fg);stroke-dasharray:1}.tp-txtv_gh{fill:none;stroke:var(--in-fg)}.tp-txtv .tp-ttv{margin-left:6px;visibility:hidden}.tp-txtv.tp-txtv-drg .tp-ttv{visibility:visible}.tp-ttv{background-color:var(--in-fg);border-radius:var(--bld-br);color:var(--bs-bg);padding:2px 4px;pointer-events:none;position:absolute;transform:translate(-50%, -100%)}.tp-ttv::before{border-color:var(--in-fg) rgba(0,0,0,0) rgba(0,0,0,0) rgba(0,0,0,0);border-style:solid;border-width:2px;box-sizing:border-box;content:"";font-size:.9em;height:4px;left:50%;margin-left:-2px;position:absolute;top:100%;width:4px}.tp-rotv{background-color:var(--bs-bg);border-radius:var(--bs-br);box-shadow:0 2px 4px var(--bs-sh);font-family:var(--bs-ff);font-size:11px;font-weight:500;line-height:1;text-align:left}.tp-rotv_b{border-bottom-left-radius:var(--bs-br);border-bottom-right-radius:var(--bs-br);border-top-left-radius:var(--bs-br);border-top-right-radius:var(--bs-br);padding-left:calc(4px + var(--cnt-usz) + var(--cnt-hp));text-align:center}.tp-rotv.tp-rotv-expanded .tp-rotv_b{border-bottom-left-radius:0;border-bottom-right-radius:0;transition-delay:0s;transition-duration:0s}.tp-rotv.tp-rotv-not>.tp-rotv_b{display:none}.tp-rotv_b:disabled .tp-rotv_m{display:none}.tp-rotv_c>.tp-fldv.tp-v-lst>.tp-fldv_c{border-bottom-left-radius:var(--bs-br);border-bottom-right-radius:var(--bs-br)}.tp-rotv_c>.tp-fldv.tp-v-lst>.tp-fldv_i{border-bottom-left-radius:var(--bs-br)}.tp-rotv_c>.tp-fldv.tp-v-lst:not(.tp-fldv-expanded)>.tp-fldv_b{border-bottom-left-radius:var(--bs-br);border-bottom-right-radius:var(--bs-br)}.tp-rotv_c>.tp-fldv.tp-v-lst.tp-fldv-expanded>.tp-fldv_b{transition-delay:0s;transition-duration:0s}.tp-rotv_c .tp-fldv.tp-v-vlst:not(.tp-fldv-expanded)>.tp-fldv_b{border-bottom-right-radius:var(--bs-br)}.tp-rotv.tp-rotv-not .tp-rotv_c>.tp-fldv.tp-v-fst{margin-top:calc(-1*var(--cnt-vp))}.tp-rotv.tp-rotv-not .tp-rotv_c>.tp-fldv.tp-v-fst>.tp-fldv_b{border-top-left-radius:var(--bs-br);border-top-right-radius:var(--bs-br)}.tp-rotv_c>.tp-tabv.tp-v-lst>.tp-tabv_c{border-bottom-left-radius:var(--bs-br);border-bottom-right-radius:var(--bs-br)}.tp-rotv_c>.tp-tabv.tp-v-lst>.tp-tabv_i{border-bottom-left-radius:var(--bs-br)}.tp-rotv.tp-rotv-not .tp-rotv_c>.tp-tabv.tp-v-fst{margin-top:calc(-1*var(--cnt-vp))}.tp-rotv.tp-rotv-not .tp-rotv_c>.tp-tabv.tp-v-fst>.tp-tabv_t{border-top-left-radius:var(--bs-br);border-top-right-radius:var(--bs-br)}.tp-rotv.tp-v-disabled,.tp-rotv .tp-v-disabled{pointer-events:none}.tp-rotv.tp-v-hidden,.tp-rotv .tp-v-hidden{display:none}.tp-sprv_r{background-color:var(--grv-fg);border-width:0;display:block;height:2px;margin:0;width:100%}.tp-sprv.tp-v-disabled .tp-sprv_r{opacity:.5}`,plugins:[Dl,Nl,Pl,As,Fl]})}},new es(`4.0.5`)})))()}function Ll(){let e=window,t=e.__vfxPanes??[];for(let e of t)e.dispose();e.__vfxPanes=[];for(let e of document.querySelectorAll(`.${$}`))e.remove()}function Q(e){let t=window;t.__vfxPanes??=[],t.__vfxPanes.push(e)}function Rl(e,t=!0){let n=document.createElement(`div`);n.className=$,n.style.cssText=`position:fixed;top:16px;right:16px;width:300px;max-height:calc(100vh - 32px);overflow:auto;z-index:10000`,document.body.appendChild(n);let r=new Z({container:n,title:e,expanded:t});return Q(r),r}function zl(e){let n=window;n.vfx&&typeof n.vfx.destroy==`function`&&n.vfx.destroy(),Ll();let r=new t(e);return n.vfx=r,r}function Bl(e,t){let n=document.createElement(`div`);n.className=$,n.style.cssText=`position:fixed;top:16px;right:16px;width:280px;z-index:10000`,document.body.appendChild(n);let r=new Z({container:n,title:e,expanded:!1});return r.addBinding(t.params,`threshold`,{min:0,max:1,step:.01}),r.addBinding(t.params,`softness`,{min:0,max:1,step:.01}),r.addBinding(t.params,`intensity`,{min:0,max:10,step:.01}),r.addBinding(t.params,`scatter`,{min:0,max:1,step:.01}),r.addBinding(t.params,`dither`,{min:0,max:5,step:.05}),r.addBinding(t.params,`edgeFade`,{min:0,max:.2,step:.001}),r.addBinding(t.params,`pad`,{min:0,max:400,step:1,view:`number`}),Q(r),r}function Vl(e,t,n){let r=document.createElement(`div`);r.className=$,r.style.cssText=`position:fixed;top:16px;right:16px;width:280px;z-index:10000`,document.body.appendChild(r);let i=new Z({container:r,title:e,expanded:!1});n&&Jl(i,n),i.addBinding(t.params,`streaks`,{min:1,max:24,step:1}),i.addBinding(t.params,`angle`,{min:0,max:360,step:1}),i.addBinding(t.params,`threshold`,{min:0,max:1,step:.01}),i.addBinding(t.params,`highlightClamp`,{min:.1,max:1,step:.01}),i.addBinding(t.params,`intensity`,{min:0,max:2,step:.01}),i.addBinding(t.params,`dispersion`,{min:-1,max:1,step:.01}),i.addBinding(t.params,`fringe`,{min:0,max:1,step:.01}),i.addBinding(t.params,`fringeCount`,{min:0,max:10,step:.1});let[a,o,s]=t.params.tint,c={tint:{r:a,g:o,b:s}};i.addBinding(c,`tint`,{color:{type:`float`}}).on(`change`,e=>{t.params.tint=[e.value.r,e.value.g,e.value.b]});let l=i.addFolder({title:`Shape`,expanded:!1});return l.addBinding(t.params,`length`,{min:0,max:2e3,step:1}),l.addBinding(t.params,`width`,{min:1,max:10,step:1}),l.addBinding(t.params,`falloff`,{min:.5,max:10,step:.05}),l.addBinding(t.params,`density`,{min:64,max:512,step:32}),l.addBinding(t.params,`resolution`,{min:.1,max:1,step:.05}),i.addBinding(t.params,`pad`,{min:0,max:800,step:1,view:`number`}),Q(i),i}function Hl(e,t){let n=document.createElement(`div`);n.className=$,n.style.cssText=`position:fixed;top:16px;right:16px;width:280px;z-index:10000`,document.body.appendChild(n);let r=new Z({container:n,title:e,expanded:!1}),i={range:{x:t.params.range[0],y:t.params.range[1]}};return r.addBinding(i,`range`,{x:{min:0,max:1,step:.01},y:{min:0,max:1,step:.01}}).on(`change`,e=>{t.params.range[0]=e.value.x,t.params.range[1]=e.value.y}),r.addBinding(t.params,`sortRes`,{min:16,max:512,step:16}),r.addBinding(t.params,`key`,{options:{luminance:`luminance`,r:`r`,g:`g`,b:`b`,hue:`hue`,saturation:`saturation`}}),r.addBinding(t.params,`direction`,{options:{up:`up`,down:`down`,left:`left`,right:`right`}}),r.addBinding(t.params,`angle`,{min:-180,max:180,step:1}),r.addBinding(t.params,`bypass`),Q(r),r}function Ul(e,t){let n=document.createElement(`div`);n.className=$,n.style.cssText=`position:fixed;top:16px;right:16px;width:280px;z-index:10000`,document.body.appendChild(n);let r=new Z({container:n,title:e,expanded:!1});return r.addBinding(t.params,`pressureIterations`,{min:1,max:40,step:1}),r.addBinding(t.params,`curlStrength`,{min:0,max:100,step:1}),r.addBinding(t.params,`velocityDissipation`,{min:0,max:5,step:.05}),r.addBinding(t.params,`densityDissipation`,{min:0,max:5,step:.05}),r.addBinding(t.params,`splatForce`,{min:100,max:2e4,step:100}),r.addBinding(t.params,`splatRadius`,{min:1e-4,max:.01,step:1e-4}),r.addBinding(t.params,`dyeSplatRadius`,{min:1e-4,max:.01,step:1e-4}),r.addBinding(t.params,`dyeSplatIntensity`,{min:.001,max:.03,step:.001}),r.addBinding(t.params,`showDye`),Q(r),r}function Wl(e,t,n){let r=document.createElement(`div`);r.className=$,r.style.cssText=`position:fixed;top:16px;right:16px;width:280px;z-index:10000`,document.body.appendChild(r);let i=new Z({container:r,title:e,expanded:!1});n&&Jl(i,n),i.addBinding(t.params,`mode`,{options:{rgb:`rgb`,cmyk:`cmyk`}}),i.addBinding(t.params,`gridSize`,{min:2,max:50,step:.5}),i.addBinding(t.params,`dotSize`,{min:0,max:2,step:.01}),i.addBinding(t.params,`smoothing`,{min:0,max:1,step:.01}),i.addBinding(t.params,`angle`,{min:-180,max:180,step:1}),i.addBinding(t.params,`blackAmount`,{min:0,max:1,step:.01}),i.addBinding(t.params,`trimEdge`);let[a,o,s,c]=t.params.background,l={background:{r:a,g:o,b:s,a:c}};return i.addBinding(l,`background`,{color:{type:`float`,alpha:!0}}).on(`change`,e=>{t.params.background=[e.value.r,e.value.g,e.value.b,e.value.a]}),Kl(i,t),Q(i),i}function Gl(e,t,n){let r=document.createElement(`div`);r.className=$,r.style.cssText=`position:fixed;top:16px;right:16px;width:280px;z-index:10000`,document.body.appendChild(r);let i=new Z({container:r,title:e,expanded:!0});n&&i.addBinding({source:`jellyfish`},`source`,{options:{jellyfish:`jellyfish`,bbb:`bbb`,webcam:`webcam`}}).on(`change`,e=>n(e.value));let a={mosh:t.enabled};return i.addBinding(a,`mosh`).on(`change`,e=>{e.value?t.enable():t.disable()}),i.addBinding(t.params,`blockSize`,{min:2,max:64,step:1}),i.addBinding(t.params,`searchRange`,{min:1,max:32,step:1}),i.addBinding(t.params,`searchStep`,{min:1,max:10,step:1}),i.addBinding(t.params,`useResidual`),i.addBinding(t.params,`dup`,{min:0,max:8,step:1}),i.addBinding(t.params,`colorSpace`,{options:{rgb:`rgb`,ycbcr:`ycbcr`}}),i.addBinding(t.params,`chromaGain`,{min:0,max:2,step:.1}),i.addBinding(t.params,`healRate`,{min:0,max:1,step:.01}),i.addBinding(t.params,`healThreshold`,{min:0,max:1,step:.01}),i.addBinding(t.params,`view`,{options:{output:`output`,motion:`motion`,residual:`residual`,current:`current`,previous:`previous`}}),Q(i),i}function Kl(e,t){let n={};for(let e of[...au,...ou]){let[r,i,a,o]=t.params.inkPalette[e];n[e]={color:{r,g:i,b:a},density:o}}let r=e=>{let{color:r,density:i}=n[e];t.params.inkPalette[e]=[r.r,r.g,r.b,i]};e.addBinding({preset:`newsprint`},`preset`,{label:`ink preset`,options:iu}).on(`change`,r=>{t.setInkPreset(r.value);for(let e of[...au,...ou]){let[r,i,a,o]=t.params.inkPalette[e];n[e].color.r=r,n[e].color.g=i,n[e].color.b=a,n[e].density=o}e.refresh()});let i=(t,i)=>{let a=e.addFolder({title:t,expanded:!1});for(let e of i)a.addBinding(n[e],`color`,{color:{type:`float`},label:e}).on(`change`,()=>r(e)),a.addBinding(n[e],`density`,{label:`${e} density`,min:0,max:1,step:.01}).on(`change`,()=>r(e))};i(`CMYK inks`,au),i(`RGB inks`,ou)}function ql(e){let t=document.createElement(`div`);return t.className=$,t.style.cssText=`position:fixed;top:16px;right:16px;width:280px;z-index:10000`,document.body.appendChild(t),{pane:new Z({container:t,title:e,expanded:!1})}}function Jl(e,t){let{img:n,sources:r,onSrcChange:i}=t,a=Object.keys(r),o={src:a.find(e=>r[e]===n.src)??a[0]},s=Object.fromEntries(a.map(e=>[e,e]));e.addBinding(o,`src`,{options:s}).on(`change`,e=>{let t=e.value;i?i(t):n.src=r[t]})}function Yl(e,t,n){let{pane:r}=ql(e);n&&Jl(r,n);let i=r.addFolder({title:`Emitter`,expanded:!0});i.addBinding(t.params,`count`,{min:1,max:nu,step:1}),i.addBinding(t.params,`birthRate`,{min:0,max:2e5,step:1e3}),i.addBinding(t.params,`screenBirthRate`,{min:0,max:2e5,step:1e3}),i.addBinding(t.params,`radius`,{min:5,max:300,step:1}),i.addBinding(t.params,`alphaThreshold`,{min:0,max:1,step:.01}),i.addBinding(t.params,`spawnOnIdle`);let a=r.addFolder({title:`Lifetime`,expanded:!0});a.addBinding(t.params,`life`,{min:.2,max:10,step:.1}),a.addBinding(t.params,`alphaDecay`,{min:.1,max:5,step:.05}),a.addBinding(t.params,`fadeIn`,{min:0,max:1,step:.005}),a.addBinding(t.params,`speedDecay`,{min:.1,max:5,step:.05});let o=r.addFolder({title:`Motion`,expanded:!0});o.addBinding(t.params,`emitSpeed`,{min:0,max:5,step:.05}),o.addBinding(t.params,`noiseDelay`,{min:0,max:1,step:.01}),o.addBinding(t.params,`noiseSpeed`,{min:0,max:1,step:.005}),o.addBinding(t.params,`noiseScale`,{min:.05,max:3,step:.01}),o.addBinding(t.params,`noiseAnimation`,{min:0,max:2,step:.01});let s=r.addFolder({title:`Appearance`,expanded:!0});s.addBinding(t.params,`pointSize`,{min:1,max:10,step:.1}),s.addBinding(t.params,`alpha`,{min:0,max:1,step:.01}),s.addBinding(t.params,`fog`,{min:0,max:1,step:.01}),s.addBinding(t.params,`color`,{view:`color`}),s.addBinding(t.params,`colorMix`,{min:0,max:1,step:.01});let c=r.addFolder({title:`Composite`,expanded:!0});return c.addBinding(t.params,`blend`,{options:{add:`add`,normal:`normal`}}),c.addBinding(t.params,`trailFade`,{min:0,max:1,step:.005}),c.addBinding(t.params,`srcOpacity`,{min:0,max:1,step:.01}),Q(r),r}function Xl(e,t,n){let{pane:r}=ql(e);n&&Jl(r,n);let i=r.addFolder({title:`Appearance`,expanded:!0});i.addBinding(t.params,`pointSize`,{min:1,max:10,step:.1}),i.addBinding(t.params,`alpha`,{min:0,max:1,step:.01}),i.addBinding(t.params,`alphaDecay`,{min:.1,max:5,step:.05}),i.addBinding(t.params,`fog`,{min:0,max:1,step:.01}),i.addBinding(t.params,`color`,{view:`color`}),i.addBinding(t.params,`colorMix`,{min:0,max:1,step:.01});let a=r.addFolder({title:`Composite`,expanded:!0});a.addBinding(t.params,`blend`,{options:{add:`add`,normal:`normal`}}),a.addBinding(t.params,`trailFade`,{min:0,max:1,step:.005});let o=r.addFolder({title:`Explode`,expanded:!0});return o.addBinding(t.params,`count`,{min:1,max:nu,step:1}),o.addBinding(t.params,`duration`,{min:.2,max:5,step:.1}),o.addBinding(t.params,`noiseSpeed`,{min:0,max:20,step:.1}),o.addBinding(t.params,`noiseScale`,{min:.05,max:3,step:.01}),o.addBinding(t.params,`noiseAnimation`,{min:0,max:2,step:.01}),o.addBinding(t.params,`outwardBias`,{min:0,max:5,step:.05}),o.addBinding(t.params,`speedDecay`,{min:.1,max:5,step:.05}),o.addButton({title:`Explode`}).on(`click`,()=>{t.trigger()}),o.addButton({title:`Reset`}).on(`click`,()=>{t.reset()}),Q(r),r}function Zl(e,t={}){let[n,r]=t.range??[0,20],i=document.createElement(`div`);i.className=$,i.style.cssText=`position:fixed;top:16px;left:16px;width:260px;z-index:10000`,document.body.appendChild(i);let a=new Z({container:i,title:t.title??`Clock`}),o={timeScale:e.timeScale,time:e.time},s=!0,c=a.addButton({title:`Pause`});c.on(`click`,()=>{s=!s,s?(e.play(),c.title=`Pause`):(e.stop(),c.title=`Play`)}),a.addBinding(o,`timeScale`,{label:`speed`,min:-3,max:3,step:.1}).on(`change`,t=>{e.timeScale=t.value});let l=a.addBinding(o,`time`,{label:`time`,min:n,max:r,step:.01});l.on(`change`,t=>{e.setTime(t.value),s||e.render()});let u=()=>{i.isConnected&&(s&&(o.time=e.time,l.refresh()),requestAnimationFrame(u))};return requestAnimationFrame(u),Q(a),a}function Ql(e,t,n,r,i){let a=document.createElement(`div`);a.className=$,a.style.cssText=`position:fixed;top:16px;right:16px;width:280px;z-index:10000;max-height:calc(100vh - 32px);overflow-y:auto`,a.addEventListener(`pointerdown`,e=>e.stopPropagation()),document.body.appendChild(a);let o=new Z({container:a,title:e,expanded:!0}),s=(e,t,n)=>({min:e,max:t,step:n}),c=(e,r,i={})=>{e.addBinding(t,r,i).on(`change`,n)};if(r){let e={source:r.value};o.addBinding(e,`source`,{options:Object.fromEntries(r.keys.map(e=>[e,e]))}).on(`change`,e=>r.onChange(e.value))}let l=o.addFolder({title:`Particles`});c(l,`count`,{options:{"1k":1024,"2k":2048,"4k":4096,"8k":8192,"16k":16384,"32k":32768,"65k":65536,"131k":131072,"262k":262144,"524k":524288,"1M":1048576}}),c(l,`life`,s(.5,12,.1)),c(l,`intro`,s(0,5,.1)),i&&l.addButton({title:`Replay intro`}).on(`click`,i),c(l,`pointSize`,s(.5,5,.1)),c(l,`streak`,s(0,1.5,.01));let u=o.addFolder({title:`Shape`});c(u,`sourceChannel`,{options:cu}),c(u,`depth`,s(.02,1,.01));let d=o.addFolder({title:`Flow`});c(d,`speed`,s(0,1,.01)),c(d,`swirl`,s(0,3,.05)),c(d,`curl`,s(0,3,.05)),c(d,`curlScale`,s(.5,6,.1)),c(d,`attract`,s(0,20,.5)),c(d,`peel`,s(0,1,.01)),$l(o,t,n);let f=o.addFolder({title:`Fireflies & Bloom`});c(f,`fireflyRatio`,s(0,.1,.001)),c(f,`fireflyIntensity`,s(0,20,.5)),c(f,`fireflyColor`,{view:`color`}),c(f,`bloom`,s(0,3,.05));let p=o.addFolder({title:`Light`}),[m,h,g]=t.lightDirection,_={direction:{x:m,y:h},z:g},v=()=>{t.lightDirection=[_.direction.x,_.direction.y,_.z],n()};p.addBinding(_,`direction`,{picker:`inline`,expanded:!0,x:{min:-1,max:1,step:.01},y:{min:-1,max:1,step:.01,inverted:!0}}).on(`change`,v),p.addBinding(_,`z`,{min:-1,max:1,step:.01}).on(`change`,v),c(p,`lightColor`,{view:`color`}),c(p,`lightIntensity`,s(0,3,.01)),c(p,`ambient`,s(0,1,.01)),c(p,`occlusion`,s(0,1,.01)),c(p,`glint`,s(0,3,.01));let ee=p.addFolder({title:`Shadow`});c(ee,`shadow`),c(ee,`shadowOpacity`,s(0,1,.01)),c(ee,`shadowSoftness`,s(0,80,.5)),c(ee,`shadowDistance`,s(0,1.5,.01)),c(ee,`shadowColor`,{view:`color`});let y=o.addFolder({title:`Camera`});c(y,`yaw`,s(-180,180,.5)),c(y,`pitch`,s(-85,85,.5)),c(y,`orbitAnimation`,s(0,90,.5)),c(y,`orbitSpeed`,s(0,10,.1)),c(y,`fov`,s(5,90,1)),c(y,`zoom`,s(.3,3,.05)),c(y,`drag`),c(y,`cameraOrigin`,{options:su});let te=o.addFolder({title:`Pointer`});c(te,`pointer`,{options:{none:`none`,repel:`repel`,tilt:`tilt`}}),c(te,`pointerRadius`,s(10,400,1)),c(te,`pointerStrength`,s(0,4,.01));let b={fullscreen:t.pad===`fullscreen`,pad:typeof t.pad==`number`?t.pad:200},x=()=>{t.pad=b.fullscreen?`fullscreen`:b.pad,n()},S=o.addFolder({title:`Output`,expanded:!1});return c(S,`antialias`),S.addBinding(b,`fullscreen`).on(`change`,x),S.addBinding(b,`pad`,s(0,600,1)).on(`change`,x),Q(o),o}function $l(e,t,n){let r=e=>e.map(e=>({...e})),i=typeof t.palette==`string`?t.palette:`nebula`;t.palette=r(typeof t.palette==`string`?tt[t.palette]:t.palette);let a=e.addFolder({title:`Color`}),o={palette:i};a.addBinding(o,`palette`,{options:Object.fromEntries(Object.keys(tt).map(e=>[e,e]))}).on(`change`,e=>{t.palette=r(tt[e.value]),c(),n()}),a.addBinding(t,`sourceColor`,{min:0,max:1,step:.01}).on(`change`,n);let s=a.addFolder({title:`Stops`,expanded:!0}),c=()=>{for(let e of[...s.children])s.remove(e);t.palette.forEach((e,t)=>{s.addBinding(e,`offset`,{label:`stop ${t+1}`,min:0,max:1,step:.01}).on(`change`,n),s.addBinding(e,`color`,{label:``,view:`color`}).on(`change`,n)})};c()}function eu(e,t,n,r){let i=document.createElement(`div`);i.className=$,i.style.cssText=`position:fixed;top:16px;right:16px;width:280px;z-index:10000;max-height:calc(100vh - 32px);overflow-y:auto`,i.addEventListener(`pointerdown`,e=>e.stopPropagation()),document.body.appendChild(i);let a=new Z({container:i,title:e,expanded:!0}),o=(e,t,n)=>({min:e,max:t,step:n}),s=(e,r,i={})=>{e.addBinding(t,r,i).on(`change`,n)},c=(e,t,n)=>{let r={value:n.value};e.addBinding(r,`value`,{label:t,options:Object.fromEntries(n.keys.map(e=>[e,e]))}).on(`change`,e=>n.onChange(e.value))};c(a,`source`,r.source);let l=a.addFolder({title:`Shape`});s(l,`sourceChannel`,{options:cu}),s(l,`depth`,o(.02,1.5,.01)),s(l,`bevel`,o(0,.4,.005)),s(l,`bevelShape`,{options:{round:`round`,chamfer:`chamfer`}}),s(l,`bulge`,o(0,.5,.005)),s(l,`bulgeWidth`,o(.01,1,.005)),s(l,`relief`,o(-.3,.3,.005)),s(l,`reliefBlur`,o(0,.1,.001));let u=a.addFolder({title:`Glass`});s(u,`ior`,o(1,2.5,.01)),s(u,`dispersion`,o(0,.5,.005)),s(u,`paths`,o(1,4,1)),s(u,`samples`,o(1,16,1)),s(u,`bounces`,o(0,5,1)),s(u,`jitter`,o(0,1,.01)),s(u,`tint`,{view:`color`}),s(u,`absorption`,o(0,10,.1)),s(u,`reflection`,o(0,3,.05)),s(u,`bump`,o(0,1,.01)),s(u,`bumpScale`,o(.02,1,.005)),s(u,`frost`,o(0,1,.01));let d=a.addFolder({title:`Backdrop`});c(d,`backdrop`,r.backdrop),c(d,`palette`,r.palette),s(d,`backdropVisible`),s(d,`backdropScale`,o(.02,3,.01)),s(d,`backdropDistance`,o(0,3,.01)),s(d,`backdropSpeed`,o(-2,2,.01)),s(d,`backdropRatio`,o(0,1,.01)),s(d,`backdropSoftness`,o(0,1,.01)),d.addBinding(r.colors,`a`,{view:`color`,label:`colorA`}).on(`change`,n),d.addBinding(r.colors,`b`,{view:`color`,label:`colorB`}).on(`change`,n);let f=a.addFolder({title:`Lights`});s(f,`lightIntensity`,o(0,8,.05)),s(f,`lightSoftness`,o(0,1,.01));let p=a.addFolder({title:`View`});return s(p,`yaw`,o(-180,180,.5)),s(p,`pitch`,o(-85,85,.5)),s(p,`orbitAnimation`,o(0,90,.5)),s(p,`orbitSpeed`,o(0,10,.1)),s(p,`fov`,o(5,90,1)),s(p,`zoom`,o(.1,2,.01)),s(p,`drag`),s(p,`cameraOrigin`,{options:su}),s(p,`pointer`,{options:{none:`none`,tilt:`tilt`}}),s(p,`pointerStrength`,o(0,4,.01)),s(p,`resolution`,o(.25,2,.05)),s(p,`antialias`),s(p,`debug`,{options:{off:`off`,outer:`outer`,inner:`inner`,total:`total`}}),Q(a),a}function tu(e,t,n,r){let i=document.createElement(`div`);i.className=$,i.style.cssText=`position:fixed;top:16px;right:16px;width:280px;z-index:10000;max-height:calc(100vh - 32px);overflow-y:auto`,i.addEventListener(`pointerdown`,e=>e.stopPropagation()),document.body.appendChild(i);let a=new Z({container:i,title:e,expanded:!0}),o=(e,t,n)=>({min:e,max:t,step:n}),s=(e,r,i={})=>{e.addBinding(t,r,i).on(`change`,n)},c=(e,t,n)=>{let r={value:n.value};e.addBinding(r,`value`,{label:t,options:Object.fromEntries(n.keys.map(e=>[e,e]))}).on(`change`,e=>n.onChange(e.value))};c(a,`source`,r.source);let l=a.addFolder({title:`Bubbles`});s(l,`sourceChannel`,{options:cu}),s(l,`depth`,o(.02,1.5,.01)),s(l,`bevel`,o(0,.4,.005)),s(l,`cellSize`,o(.02,.6,.005)),s(l,`cellSizeRandomness`,o(0,1,.01)),s(l,`seed`,o(0,100,1)),s(l,`roundness`,o(0,1,.01)),s(l,`minSize`,o(.05,1,.01)),s(l,`containment`,o(0,1,.01)),s(l,`wobble`,o(0,.15,.005)),s(l,`speed`,o(0,2,.01)),s(l,`maxLayers`,o(1,16,1));let u=a.addFolder({title:`Film`});s(u,`iridescence`,o(0,1,.01)),s(u,`thickness`,o(0,1500,5)),s(u,`thicknessVariation`,o(0,1,.01)),s(u,`drain`,o(0,1,.01)),s(u,`swirlScale`,o(0,6,.05)),s(u,`swirlSpeed`,o(-1,1,.01)),s(u,`reflection`,o(0,4,.05)),s(u,`rim`,o(0,1,.01)),s(u,`tint`,{view:`color`}),s(u,`tintStrength`,o(0,1,.01)),s(u,`opacity`,o(0,1,.01)),s(u,`color`,{view:`color`});let d=a.addFolder({title:`Borders`});s(d,`borderWidth`,o(0,.5,.005)),s(d,`borderHighlight`,o(0,2,.01));let f=a.addFolder({title:`Backdrop`});c(f,`backdrop`,r.backdrop),c(f,`palette`,r.palette),s(f,`backdropVisible`),s(f,`backdropAround`),s(f,`backdropScale`,o(.02,3,.01)),s(f,`backdropDistance`,o(0,3,.01)),s(f,`backdropSpeed`,o(-2,2,.01)),s(f,`backdropRatio`,o(0,1,.01)),s(f,`backdropSoftness`,o(0,1,.01));let p=a.addFolder({title:`Lights`});s(p,`lightIntensity`,o(0,8,.05)),s(p,`lightSoftness`,o(0,1,.01));let m=a.addFolder({title:`View`});return s(m,`yaw`,o(-180,180,.5)),s(m,`pitch`,o(-85,85,.5)),s(m,`orbitAnimation`,o(0,90,.5)),s(m,`orbitSpeed`,o(0,10,.1)),s(m,`fov`,o(5,90,1)),s(m,`zoom`,o(.1,2,.01)),s(m,`drag`),s(m,`cameraOrigin`,{options:su}),s(m,`pointer`,{options:{none:`none`,tilt:`tilt`}}),s(m,`pointerStrength`,o(0,4,.01)),s(m,`resolution`,o(.25,2,.05)),s(m,`antialias`),s(m,`debug`,{options:{off:`off`,cost:`cost`,layers:`layers`,cells:`cells`}}),Q(a),a}var $,nu,ru,iu,au,ou,su,cu;function lu(){return(lu=e((()=>{n(),Jt(),Il(),$=`vfx-tweakpane-container`,nu=4194304,ru=()=>typeof navigator<`u`&&/Chromatic/.test(navigator.userAgent),iu={"Pure CMYK / RGB":`pure`,Newsprint:`newsprint`,"FOGRA51 (offset)":`fogra51`,"SWOP 2013":`swop`},au=[`cyan`,`magenta`,`yellow`,`black`],ou=[`red`,`green`,`blue`],su={element:`element`,viewport:`viewport`},cu={alpha:`alpha`,luminance:`luminance`,none:`none`}})))()}export{je as A,ve as B,Ie as C,Ne as D,Ve as E,xe as F,_ as G,C as H,be as I,m as J,h as K,Ce as L,we as M,Te as N,Me as O,Oe as P,de as R,Le as S,Pe as T,w as U,_e as V,g as W,d as Y,Rl as _,Ul as a,Re as b,Vl as c,Hl as d,Ql as f,ru as g,lu as h,Gl as i,ke as j,Ae as k,Xl as l,zl as m,tu as n,eu as o,Ll as p,f as q,Zl as r,Wl as s,Bl as t,Yl as u,qt as v,Fe as w,ze as x,Jt as y,fe as z};