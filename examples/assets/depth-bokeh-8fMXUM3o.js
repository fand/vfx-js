import"./modulepreload-polyfill-Crh6zePY.js";import{t as e}from"./esm-CozQkVkD.js";import{Pane as t}from"https://esm.sh/tweakpane@4.0.5";import{AutoImageProcessor as n,AutoModel as r,RawImage as i}from"https://esm.sh/@huggingface/transformers@3.7.1";var a=[{id:`img1`,color:new URL(``+new URL(`img1-BIxrCEQW.png`,import.meta.url).href,``+import.meta.url).href,depth:new URL(``+new URL(`img1_depth-CIx3Cbr6.png`,import.meta.url).href,``+import.meta.url).href},{id:`img2`,color:new URL(``+new URL(`img2-747lUx3h.png`,import.meta.url).href,``+import.meta.url).href,depth:new URL(``+new URL(`img2_depth-B8PNdi-U.png`,import.meta.url).href,``+import.meta.url).href},{id:`img3`,color:new URL(``+new URL(`img3-Cb51-qvF.png`,import.meta.url).href,``+import.meta.url).href,depth:new URL(``+new URL(`img3_depth-D9M8pJkR.png`,import.meta.url).href,``+import.meta.url).href},{id:`webcam`,live:!0}],o=`onnx-community/depth-anything-v2-small`,s=`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`,c=`
    float decodeDepth(vec3 col) {
      return col.r;
    }
  `,l=64,u=`#version 300 es
    precision highp float;
    in vec2 uv;
    in vec2 uvSrc;
    uniform sampler2D colorTex;
    uniform sampler2D depthTex;
    uniform vec2 dstSize;
    uniform float focal;
    uniform float aperture;
    uniform float swirl;
    out vec4 outColor;

    ${c}

    void main() {
      float d = decodeDepth(texture(depthTex, uv).rgb);
      vec3 sharp = texture(colorTex, uvSrc).rgb;
      float coc = abs(d - focal) * aperture;
      if (coc < 0.5) {
        outColor = vec4(sharp, 1.0);
        return;
      }
      // Hash for per-pixel rotation of the golden-spiral sample set;
      // breaks up concentric kernel banding into noise.
      float a0 = fract(sin(dot(uv * dstSize, vec2(12.9898, 78.233))) * 43758.5453) * 6.28318530;

      // Swirl kernel parameters. ASPECT > 1 stretches tangentially
      // (mapped to angular sweep) and shrinks radially. arcAng capped
      // to one radian so pixels near the image center don't wrap.
      const float SWIRL_ASPECT = 3.0;
      vec2 imgCenter = vec2(0.5);
      vec2 fromCpx = (uvSrc - imgCenter) * dstSize;
      float rPx = length(fromCpx);
      float baseAng = atan(fromCpx.y, fromCpx.x);
      float tangLen = coc * SWIRL_ASPECT;
      float radExt = coc / SWIRL_ASPECT;
      float arcAng = min(tangLen / max(rPx, 1.0), 1.0);

      vec3 acc = vec3(0.0);
      float weightSum = 0.0;
      for (int i = 0; i < ${l}; i++) {
        float t = (float(i) + 0.5) / float(${l});
        float r = sqrt(t);
        float a = a0 + float(i) * 2.39996323;
        float ux = cos(a) * r;
        float uy = sin(a) * r;

        vec2 diskPos = uvSrc + vec2(ux, uy) * coc / dstSize;

        float dAng = ux * arcAng;
        float newR = rPx + uy * radExt;
        vec2 swirlPos = imgCenter
          + newR * vec2(cos(baseAng + dAng), sin(baseAng + dAng)) / dstSize;

        vec2 sPos = mix(diskPos, swirlPos, swirl);
        float inB = step(0.0, sPos.x) * step(sPos.x, 1.0)
                  * step(0.0, sPos.y) * step(sPos.y, 1.0);

        // Sample contributes iff its own bokeh circle reaches this
        // pixel. Blocks in-focus foreground from bleeding into bg
        // gathers and vice versa. Use the logical disk distance
        // (r*coc), not the actual sPos distance — the swirl kernel
        // is an artistic remapping of the disk, and using physical
        // distance would reject all the off-axis swirl samples.
        float depthS = decodeDepth(texture(depthTex, sPos).rgb);
        float cocS = abs(depthS - focal) * aperture;
        float depthW = smoothstep(-1.0, 1.0, cocS - r * coc);

        // Flat interior + soft edge. Smooths kernel rim and stops
        // individual samples from showing as discrete bright dots in
        // bright highlights.
        float kernelW = 1.0 - smoothstep(0.5, 1.0, r);

        // OOB samples keep wDiv proportional to kernelW so partial-OOB
        // kernels still dim (cat's-eye). Depth-rejected in-bounds
        // samples drop out of the divisor entirely so silhouettes
        // don't get dark halos.
        float wAcc = inB * depthW * kernelW;
        float wDiv = mix(1.0, depthW, inB) * kernelW;
        acc += texture(colorTex, sPos).rgb * wAcc;
        weightSum += wDiv;
      }
      outColor = vec4(acc / max(weightSum, 1.0), 1.0);
    }
  `,d=256,f=d*d;function p(e,t){let n=1,r=0;for(;e>0;)n/=t,r+=e%t*n,e=Math.floor(e/t);return r}var m=new Float32Array(f*2);for(let e=0;e<f;e++)m[e*2]=p(e+1,2),m[e*2+1]=p(e+1,3);var h=`#version 300 es
    precision highp float;
    in vec2 position;
    in vec2 instanceUv;
    in float instanceDepth;
    in float instanceRank;
    uniform sampler2D colorTex;
    uniform vec2 dstSize;
    uniform float focal;
    uniform float aperture;
    uniform float diskScale;
    uniform float diskSwirl;
    uniform float diskCount;
    uniform float lumThreshold;
    uniform float lumGamma;
    uniform float diskOpacity;
    out vec2 v_quadUv;
    out vec2 v_uv;
    out vec3 v_color;
    out float v_opacity;
    out float v_depth;
    out float v_squash;

    void main() {
      // Prefix-cull by Halton rank so the rendered set is always a
      // low-discrepancy subset of the full pre-baked instance pool.
      if (instanceRank >= diskCount) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        v_quadUv = vec2(0.0);
        v_uv = vec2(0.0);
        v_color = vec3(0.0);
        v_opacity = 0.0;
        v_depth = 0.0;
        return;
      }

      vec3 color = texture(colorTex, instanceUv).rgb;
      float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
      float opacity =
        pow(smoothstep(lumThreshold, 1.0, lum), lumGamma) * diskOpacity;

      float coc = abs(instanceDepth - focal) * aperture;
      float diskRadius = coc * diskScale;

      if (opacity < 0.005 || diskRadius < 0.5) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        v_quadUv = vec2(0.0);
        v_uv = vec2(0.0);
        v_color = vec3(0.0);
        v_opacity = 0.0;
        v_depth = 0.0;
        v_squash = 0.0;
        return;
      }

      vec2 centerNdc = instanceUv * 2.0 - 1.0;

      // Quad is symmetric in (tang, radial) basis around the image
      // center; the half-moon vignette mask is applied in the FS using
      // v_squash + the diskSwirlBias uniform. Deforming the quad here
      // would just produce a pinched trapezoid (sides shifted outward),
      // not a clean half-moon.
      vec2 fromCenterPx = (instanceUv - 0.5) * dstSize;
      float rPx = length(fromCenterPx);
      vec2 radialDir = rPx > 1.0 ? fromCenterPx / rPx : vec2(1.0, 0.0);
      vec2 tangDir = vec2(-radialDir.y, radialDir.x);
      float halfDiag = length(dstSize) * 0.5;
      float rNorm = rPx / halfDiag;
      float squash = clamp(diskSwirl * rNorm, 0.0, 0.98);

      vec2 pxOffset = (
        tangDir * position.x +
        radialDir * position.y
      ) * diskRadius;
      vec2 ndc = centerNdc + pxOffset * 2.0 / dstSize;
      gl_Position = vec4(ndc, 0.0, 1.0);
      v_quadUv = position;
      v_uv = ndc * 0.5 + 0.5;
      v_color = color;
      v_opacity = opacity;
      v_depth = instanceDepth;
      v_squash = squash;
    }
  `,g=`#version 300 es
    precision highp float;
    in vec2 position;
    in vec2 instanceUv;
    in float instanceRank;
    uniform sampler2D colorTex;
    uniform sampler2D depthTex;
    uniform vec2 dstSize;
    uniform float focal;
    uniform float aperture;
    uniform float diskScale;
    uniform float diskSwirl;
    uniform float diskCount;
    uniform float lumThreshold;
    uniform float lumGamma;
    uniform float diskOpacity;
    out vec2 v_quadUv;
    out vec2 v_uv;
    out vec3 v_color;
    out float v_opacity;
    out float v_depth;
    out float v_squash;

    ${c}

    void main() {
      if (instanceRank >= diskCount) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        v_quadUv = vec2(0.0);
        v_uv = vec2(0.0);
        v_color = vec3(0.0);
        v_opacity = 0.0;
        v_depth = 0.0;
        v_squash = 0.0;
        return;
      }

      float instanceDepth = decodeDepth(texture(depthTex, instanceUv).rgb);

      vec3 color = texture(colorTex, instanceUv).rgb;
      float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
      float opacity =
        pow(smoothstep(lumThreshold, 1.0, lum), lumGamma) * diskOpacity;

      float coc = abs(instanceDepth - focal) * aperture;
      float diskRadius = coc * diskScale;

      if (opacity < 0.005 || diskRadius < 0.5) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        v_quadUv = vec2(0.0);
        v_uv = vec2(0.0);
        v_color = vec3(0.0);
        v_opacity = 0.0;
        v_depth = 0.0;
        v_squash = 0.0;
        return;
      }

      vec2 centerNdc = instanceUv * 2.0 - 1.0;
      vec2 fromCenterPx = (instanceUv - 0.5) * dstSize;
      float rPx = length(fromCenterPx);
      vec2 radialDir = rPx > 1.0 ? fromCenterPx / rPx : vec2(1.0, 0.0);
      vec2 tangDir = vec2(-radialDir.y, radialDir.x);
      float halfDiag = length(dstSize) * 0.5;
      float rNorm = rPx / halfDiag;
      float squash = clamp(diskSwirl * rNorm, 0.0, 0.98);

      vec2 pxOffset = (
        tangDir * position.x +
        radialDir * position.y
      ) * diskRadius;
      vec2 ndc = centerNdc + pxOffset * 2.0 / dstSize;
      gl_Position = vec4(ndc, 0.0, 1.0);
      v_quadUv = position;
      v_uv = ndc * 0.5 + 0.5;
      v_color = color;
      v_opacity = opacity;
      v_depth = instanceDepth;
      v_squash = squash;
    }
  `,_=new Float32Array(f);for(let e=0;e<f;e++)_[e]=e;var v={attributes:{position:{data:new Float32Array([-1,-1,1,-1,1,1,-1,1]),itemSize:2},instanceUv:{data:m,itemSize:2,perInstance:!0},instanceRank:{data:_,itemSize:1,perInstance:!0}},indices:new Uint16Array([0,1,2,0,2,3]),instanceCount:f},y=`#version 300 es
    precision highp float;
    in vec2 v_quadUv;
    in vec2 v_uv;
    in vec3 v_color;
    in float v_opacity;
    in float v_depth;
    in float v_squash;
    uniform sampler2D depthTex;
    uniform float diskBlades;
    uniform float diskSoftness;
    uniform float diskAngle;
    uniform float diskFill;
    uniform float diskSwirlBias;
    out vec4 outColor;

    ${c}

    void main() {
      // Half-moon vignette mask: outward half (v_quadUv.y > 0) is
      // compressed by squash*(1-bias), inward half (y < 0) by squash.
      // bias=0 compresses both halves equally (symmetric ellipse);
      // bias=1 leaves the outward half at full radius (flat-bottom
      // half-moon). Dividing v_quadUv.y by the scale stretches the
      // unit-circle / n-gon mask into the chosen half-moon shape.
      float outwardR = max(1.0 - v_squash * (1.0 - diskSwirlBias), 1e-3);
      float inwardR = max(1.0 - v_squash, 1e-3);
      float yScale = v_quadUv.y > 0.0 ? outwardR : inwardR;
      vec2 maskUv = vec2(v_quadUv.x, v_quadUv.y / yScale);

      // diskBlades < 3 → circular disk; otherwise regular N-gon
      // inscribed in the unit circle (signed dist from center). All
      // splats share diskAngle: real apertures are fixed for the
      // whole frame, not randomly oriented per highlight.
      float dist;
      if (diskBlades < 2.5) {
        dist = length(maskUv);
      } else {
        float c = cos(diskAngle), s = sin(diskAngle);
        vec2 p = mat2(c, -s, s, c) * maskUv;
        float ang = atan(p.x, p.y) + 3.14159265;
        float seg = 6.28318530 / diskBlades;
        float a = mod(ang, seg) - seg * 0.5;
        dist = length(p) * cos(a) / cos(seg * 0.5);
      }
      if (dist > 1.0) discard;
      // Two-zone radial profile: outer fade (rim → 0 at the edge) and
      // inner blend (rim plateau → diskFill in the centre). diskFill=1
      // matches the previous solid-disk look; diskFill=0 leaves only
      // the rim visible.
      float rimAt = max(1.0 - diskSoftness, 0.001);
      float fillAt = max(rimAt - diskSoftness, 0.0);
      float outer = smoothstep(1.0, rimAt, dist);
      float inner = smoothstep(rimAt, fillAt, dist);
      float mask = outer * mix(1.0, diskFill, inner);

      // Depth occlusion against the source depth map: if the underlying
      // pixel is closer to camera than this disk's source pixel, the
      // disk should be hidden behind it (no foreground overlap). Disks
      // are also pre-sorted far-to-near on the CPU so src-over gives
      // correct disk-vs-disk ordering.
      float pixelDepth = decodeDepth(texture(depthTex, v_uv).rgb);
      float occlusion = smoothstep(0.02, 0.08, pixelDepth - v_depth);
      mask *= 1.0 - occlusion;

      float alpha = mask * v_opacity;
      if (alpha < 1e-4) discard;
      outColor = vec4(v_color * alpha, alpha);
    }
  `,b=class{constructor(){this.focal=.65,this.aperture=0,this.swirl=.1,this.diskCount=16384,this.diskScale=.6,this.diskOpacity=.8,this.diskBlades=9,this.diskAngle=1,this.diskSoftness=.1,this.diskFill=.7,this.diskSwirl=1.2,this.diskSwirlBias=.3,this.lumThreshold=0,this.lumGamma=2,this._resources=new Map,this._activeId=a[0].id}async init(e){this._ctx=e;for(let t of a){if(t.live){this._installBlackPlaceholder(t.id);continue}this._resources.set(t.id,await this._loadImage(e,t))}}_installBlackPlaceholder(e){let t=document.createElement(`canvas`);t.width=t.height=1;let n=t.getContext(`2d`);n.fillStyle=`#000`,n.fillRect(0,0,1,1);let r=this._ctx.wrapTexture(t,{filter:`linear`,wrap:`clamp`,autoUpdate:!1}),i=this._ctx.wrapTexture(t,{filter:`linear`,wrap:`clamp`,autoUpdate:!1});this._resources.set(e,{colorTex:r,depthTex:i,geometry:v,depthCanvas:t,live:!0})}installLiveSource(e,{displayCanvas:t,depthCanvas:n}){let r=this._ctx.wrapTexture(t,{filter:`linear`,wrap:`clamp`}),i=this._ctx.wrapTexture(n,{filter:`linear`,wrap:`clamp`});this._resources.set(e,{colorTex:r,depthTex:i,geometry:v,depthCanvas:n,live:!0})}async _loadImage(e,t){let n=new Image;n.crossOrigin=`anonymous`,n.src=t.depth,await n.decode();let r=e.wrapTexture(n,{filter:`linear`,wrap:`clamp`}),i=document.createElement(`canvas`);i.width=n.naturalWidth,i.height=n.naturalHeight;let a=i.getContext(`2d`,{willReadFrequently:!0});a.drawImage(n,0,0);let o=a.getImageData(0,0,i.width,i.height).data,s=new Uint32Array(f),c=new Float32Array(f);for(let e=0;e<f;e++){s[e]=e;let t=m[e*2],n=m[e*2+1],r=Math.min(i.width-1,Math.floor(t*i.width)),a=(Math.min(i.height-1,Math.floor((1-n)*i.height))*i.width+r)*4;c[e]=x(o[a]/255,o[a+1]/255,o[a+2]/255)}s.sort((e,t)=>c[e]-c[t]);let l=new Float32Array(f*2),u=new Float32Array(f),d=new Float32Array(f);for(let e=0;e<f;e++){let t=s[e];l[e*2]=m[t*2],l[e*2+1]=m[t*2+1],u[e]=c[t],d[e]=t}return{depthTex:r,geometry:{attributes:{position:{data:new Float32Array([-1,-1,1,-1,1,1,-1,1]),itemSize:2},instanceUv:{data:l,itemSize:2,perInstance:!0},instanceDepth:{data:u,itemSize:1,perInstance:!0},instanceRank:{data:d,itemSize:1,perInstance:!0}},indices:new Uint16Array([0,1,2,0,2,3]),instanceCount:f},depthCanvas:i}}setActiveImage(e){this._resources.has(e)&&(this._activeId=e)}activeDepthCanvas(){return this._resources.get(this._activeId)?.depthCanvas??null}render(e){let t=this._resources.get(this._activeId);if(!t)return;let n=t.colorTex??e.src,r=[e.dims.elementPixel[0],e.dims.elementPixel[1]];e.draw({frag:u,target:e.target,uniforms:{colorTex:n,depthTex:t.depthTex,dstSize:r,focal:this.focal,aperture:this.aperture,swirl:this.swirl}}),t.geometry&&e.draw({vert:t.live?g:h,frag:y,target:e.target,blend:`premultiplied`,geometry:t.geometry,uniforms:{colorTex:n,depthTex:t.depthTex,dstSize:r,focal:this.focal,aperture:this.aperture,diskScale:this.diskScale,diskSwirl:this.diskSwirl,diskSwirlBias:this.diskSwirlBias,diskCount:this.diskCount,diskOpacity:this.diskOpacity,diskBlades:this.diskBlades,diskAngle:this.diskAngle,diskSoftness:this.diskSoftness,diskFill:this.diskFill,lumThreshold:this.lumThreshold,lumGamma:this.lumGamma}})}dispose(){this._resources.clear()}};function x(e,t,n){return Math.min(1,Math.max(0,e))}function S(e,t,n=504*504,r=14){let i=e/t,a=Math.sqrt(n/i),o=Math.max(r,Math.round(a/r)*r);return{width:Math.max(r,Math.round(o*i/r)*r),height:o}}var C=class{constructor(){this.state=`idle`,this.error=null,this.progress=0,this.progressLabel=``,this.video=null,this.displayCanvas=null,this.depthCanvas=null,this.displayWidth=0,this.displayHeight=0,this._displayCtx=null,this._depthCtx=null,this._readCanvas=null,this._readCtx=null,this._stream=null,this.model=null,this.processor=null,this._inferring=!1,this._loopScheduled=!1,this._gateActive=()=>!1,this._onStateChange=()=>{},this._onReady=()=>{},this._fileProgress=new Map}_setState(e,t){this.state=e,this.error=t??null,this._onStateChange()}async start(){if(!(this.state===`ready`||this.state===`requestingCam`||this.state===`loadingModel`))try{if(!navigator.gpu)throw Error(`WebGPU is required for realtime depth. Try Chrome 113+ or enable the WebGPU flag.`);this._setState(`requestingCam`),this._stream=await navigator.mediaDevices.getUserMedia({video:{width:1280,height:720},audio:!1});let e=document.createElement(`video`);e.srcObject=this._stream,e.playsInline=!0,e.muted=!0,e.autoplay=!0,await e.play(),e.videoWidth||await new Promise(t=>e.addEventListener(`loadedmetadata`,t,{once:!0})),this.video=e;let t=e.videoWidth,i=e.videoHeight,a=Math.min(1,1280/Math.max(t,i));this.displayWidth=Math.max(2,Math.round(t*a)),this.displayHeight=Math.max(2,Math.round(i*a)),this.displayCanvas=document.createElement(`canvas`),this.displayCanvas.width=this.displayWidth,this.displayCanvas.height=this.displayHeight,this._displayCtx=this.displayCanvas.getContext(`2d`);let s=S(t,i);this.depthCanvas=document.createElement(`canvas`),this.depthCanvas.width=s.width,this.depthCanvas.height=s.height,this._depthCtx=this.depthCanvas.getContext(`2d`,{willReadFrequently:!0}),this._readCanvas=document.createElement(`canvas`),this._readCanvas.width=s.width,this._readCanvas.height=s.height,this._readCtx=this._readCanvas.getContext(`2d`,{willReadFrequently:!0}),this._setState(`loadingModel`);let c=e=>this._handleProgress(e);this.model=await r.from_pretrained(o,{device:`webgpu`,dtype:`fp32`,progress_callback:c}),this.processor=await n.from_pretrained(o,{progress_callback:c}),this.processor.size={width:s.width,height:s.height},this._setState(`ready`),this._onReady(),this._scheduleLoop()}catch(e){if(console.error(e),this._stream){for(let e of this._stream.getTracks())e.stop();this._stream=null}this._setState(`error`,e)}}_handleProgress(e){if(e.status===`progress`&&e.total)this._fileProgress.set(e.file,{loaded:e.loaded,total:e.total});else if(e.status===`done`&&e.file){let t=this._fileProgress.get(e.file);t&&this._fileProgress.set(e.file,{loaded:t.total,total:t.total})}let t=``,n=0,r=0;for(let[e,i]of this._fileProgress)i.total>r&&(r=i.total,n=i.loaded,t=e);if(r>0){this.progress=n/r;let e=e=>(e/1024/1024).toFixed(1);this.progressLabel=`${t.split(`/`).pop()} · ${e(n)} / ${e(r)} MB`}else e.status===`ready`?this.progressLabel=`warming up`:e.status===`initiate`&&e.file&&(this.progressLabel=`fetching ${e.file.split(`/`).pop()}`);this._onStateChange()}_scheduleLoop(){this._loopScheduled||(this._loopScheduled=!0,requestAnimationFrame(()=>{this._loopScheduled=!1,requestAnimationFrame(()=>this._scheduleLoop()),this.state===`ready`&&(this._inferring||this._gateActive()&&(!this.video||this.video.readyState<2||(this._inferring=!0,this._inferOnce().catch(e=>console.error(`[webcam] inference error`,e)).finally(()=>{this._inferring=!1}))))}))}drawDisplayFrame(){let e=this.video;!e||e.readyState<2||this._displayCtx.drawImage(e,0,0,this.displayCanvas.width,this.displayCanvas.height)}async _inferOnce(){let e=this.video,t=this._readCanvas.width,n=this._readCanvas.height;this._readCtx.drawImage(e,0,0,t,n);let r=new i(this._readCtx.getImageData(0,0,t,n).data,t,n,4),a=await this.processor(r),{predicted_depth:o}=await this.model(a),s=o.data,[,c,l]=o.dims,u=1/0,d=-1/0;for(let e=0;e<s.length;e++){let t=s[e];t<u&&(u=t),t>d&&(d=t)}let f=d-u||1;(this.depthCanvas.width!==l||this.depthCanvas.height!==c)&&(this.depthCanvas.width=l,this.depthCanvas.height=c);let p=this._depthCtx.createImageData(l,c),m=p.data;for(let e=0,t=0;e<s.length;e++,t+=4){let n=Math.round((s[e]-u)/f*255);m[t]=n,m[t+1]=n,m[t+2]=n,m[t+3]=255}this._depthCtx.putImageData(p,0,0)}};window.addEventListener(`load`,async()=>{let n=document.getElementById(`photo`);n.complete||await new Promise(e=>{n.onload=e});let r=new e,i=new b;await r.add(n,{effect:i});let o=i.focal,c={maxAperture:120,pressed:!1,pointerUv:null};function l(e,t){let r=n.getBoundingClientRect(),i=(e-r.left)/r.width,a=(t-r.top)/r.height;return i>=0&&i<=1&&a>=0&&a<=1?[i,a]:null}function u(e){let t=i.activeDepthCanvas();if(!t)return;let n=Math.min(t.width-1,Math.floor(e[0]*t.width)),r=Math.min(t.height-1,Math.floor(e[1]*t.height)),[a,s,c]=t.getContext(`2d`).getImageData(n,r,1,1).data;o=x(a/255,s/255,c/255)}window.addEventListener(`pointerdown`,e=>{let t=l(e.clientX,e.clientY);t&&(c.pressed=!0,c.pointerUv=t)}),window.addEventListener(`pointermove`,e=>{if(!c.pressed)return;let t=l(e.clientX,e.clientY);if(!t){c.pressed=!1;return}c.pointerUv=t});let d=()=>{c.pressed=!1};window.addEventListener(`pointerup`,d),window.addEventListener(`pointercancel`,d);let f=document.createElement(`div`);f.style.cssText=`position:fixed;top:16px;right:16px;width:280px;z-index:10000`,document.body.appendChild(f);let p=new t({container:f,title:`Bokeh`}),m={image:a[0].id},h=document.getElementById(`fade`),g=document.getElementById(`webcam-overlay`),_=document.querySelector(`.indicator`);for(let e of a){let t=document.createElement(`span`);t.className=`dot`,t.dataset.id=e.id,_.appendChild(t)}function v(e){for(let t of _.querySelectorAll(`.dot`))t.classList.toggle(`active`,t.dataset.id===e)}function y(){let e=n.getBoundingClientRect();h.style.left=e.left+`px`,h.style.top=e.top+`px`,h.style.width=e.width+`px`,h.style.height=e.height+`px`,g.style.left=e.left+`px`,g.style.top=e.top+`px`,g.style.width=e.width+`px`,g.style.height=e.height+`px`}y(),v(m.image),window.addEventListener(`resize`,y);let S=new C;S._gateActive=()=>m.image===`webcam`,S._onStateChange=()=>T(),S._onReady=()=>{m.image===`webcam`&&(w(),y()),i.installLiveSource(`webcam`,S),m.image===`webcam`&&i.setActiveImage(`webcam`)};function w(){let e=S.video?.videoWidth||S.displayWidth||640,t=S.video?.videoHeight||S.displayHeight||360;n.removeAttribute(`width`),n.removeAttribute(`height`),n.style.width=`${e}px`,n.style.height=`auto`,n.style.aspectRatio=`${e} / ${t}`}function T(){if(m.image!==`webcam`||S.state===`ready`){g.style.display=`none`,g.replaceChildren();return}g.style.display=`flex`,g.replaceChildren();let e=(e,t={},n)=>{let r=document.createElement(e);return Object.assign(r,t),n!==void 0&&(r.textContent=n),r};if(S.state===`idle`){g.appendChild(e(`div`,{},`Live webcam + realtime depth estimation`)),g.appendChild(e(`div`,{className:`label`},`Depth-Anything-V2 (small) on WebGPU`));let t=e(`button`,{type:`button`},`Start webcam`);t.addEventListener(`click`,()=>S.start()),g.appendChild(t)}else if(S.state===`requestingCam`)g.appendChild(e(`div`,{},`Requesting camera access…`));else if(S.state===`loadingModel`){g.appendChild(e(`div`,{},`Loading model…`));let t=e(`div`,{className:`bar`}),n=e(`span`);n.style.width=Math.round(Math.min(1,Math.max(0,S.progress))*100)+`%`,t.appendChild(n),g.appendChild(t),g.appendChild(e(`div`,{className:`label`},S.progressLabel||``))}else if(S.state===`error`){g.appendChild(e(`div`,{className:`err`},S.error?.message||String(S.error)));let t=e(`button`,{type:`button`},`Retry`);t.addEventListener(`click`,()=>S.start()),g.appendChild(t)}}let E=!1;async function D(e){let t=a.find(t=>t.id===e);!t||E||m.image===e||(E=!0,y(),h.style.opacity=`1`,await new Promise(e=>setTimeout(e,180)),t.live?(n.src=s,w()):(n.removeAttribute(`width`),n.removeAttribute(`height`),n.style.width=``,n.style.height=``,n.style.aspectRatio=``,n.src=t.color,await r.update(n)),i.setActiveImage(e),m.image=e,v(e),y(),T(),h.style.opacity=`0`,await new Promise(e=>setTimeout(e,180)),E=!1)}p.addBinding(m,`image`,{options:Object.fromEntries(a.map(e=>[e.id,e.id]))}).on(`change`,e=>D(e.value)),window.addEventListener(`keydown`,e=>{let t=0;if(e.key===`ArrowLeft`)t=-1;else if(e.key===`ArrowRight`)t=1;else return;e.preventDefault(),D(a[(a.findIndex(e=>e.id===m.image)+t+a.length)%a.length].id)}),p.addBinding(i,`focal`,{min:0,max:1,step:.001}).on(`change`,()=>{o=i.focal}),p.addBinding(c,`maxAperture`,{min:0,max:200,step:1}),p.addBinding(i,`swirl`,{min:0,max:1,step:.01});let O=p.addFolder({title:`Disk`});O.addBinding(i,`diskCount`,{min:0,max:65536,step:256}),O.addBinding(i,`diskScale`,{min:0,max:2,step:.01}),O.addBinding(i,`diskSwirl`,{min:0,max:3,step:.01}),O.addBinding(i,`diskSwirlBias`,{min:0,max:1,step:.01}),O.addBinding(i,`diskOpacity`,{min:0,max:2,step:.01}),O.addBinding(i,`diskBlades`,{min:0,max:12,step:1}),O.addBinding(i,`diskAngle`,{min:0,max:6.283,step:.01}),O.addBinding(i,`diskSoftness`,{min:0,max:1,step:.01}),O.addBinding(i,`diskFill`,{min:0,max:1,step:.01}),O.addBinding(i,`lumThreshold`,{min:0,max:1,step:.01}),O.addBinding(i,`lumGamma`,{min:.1,max:5,step:.01}),T(),(function e(){m.image===`webcam`&&S.state===`ready`&&S.drawDisplayFrame(),c.pressed&&c.pointerUv&&u(c.pointerUv),i.focal+=(o-i.focal)*.5;let t=c.pressed?c.maxAperture:0;i.aperture+=(t-i.aperture)*.15,p.refresh(),requestAnimationFrame(e)})()});