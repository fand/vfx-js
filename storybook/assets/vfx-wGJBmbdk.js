var Pt=r=>{throw TypeError(r)};var lt=(r,e,t)=>e.has(r)||Pt("Cannot "+t);var s=(r,e,t)=>(lt(r,e,"read from private field"),t?t.call(r):e.get(r)),h=(r,e,t)=>e.has(r)?Pt("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(r):e.set(r,t),g=(r,e,t,i)=>(lt(r,e,"write to private field"),i?i.call(r,t):e.set(r,t),t),T=(r,e,t)=>(lt(r,e,"access private method"),t);let De;function ur(){if(De!==void 0)return De;try{const r=document.createElement("canvas"),e=r.getContext("2d");De=e!==null&&typeof e.drawElementImage=="function"&&typeof r.requestPaint=="function"}catch{De=!1}return De}function hr(r){if(!r.src||r.src.startsWith("data:"))return!1;try{return new URL(r.src,location.href).origin!==location.origin}catch{return!1}}async function dr(r){const t=await(await fetch(r)).blob();return URL.createObjectURL(t)}async function vr(r){const t=Array.from(r.querySelectorAll("img")).filter(a=>a.complete&&a.naturalWidth>0&&hr(a));if(t.length===0)return()=>{};const i=new Map,o=[];return await Promise.all(t.map(async a=>{try{const n=await dr(a.src);i.set(a,a.src),o.push(n),await new Promise(f=>{a.addEventListener("load",()=>f(),{once:!0}),a.src=n})}catch{}})),()=>{for(const[a,n]of i)a.src=n;for(const a of o)URL.revokeObjectURL(a)}}const gr=["margin-top","margin-right","margin-bottom","margin-left"],mr=["position","top","right","bottom","left","float","flex","flex-grow","flex-shrink","flex-basis","align-self","justify-self","place-self","order","grid-column","grid-column-start","grid-column-end","grid-row","grid-row-start","grid-row-end","grid-area"],vt=new WeakMap,gt=new WeakMap,mt=new WeakMap,pt=new WeakMap,bt=new WeakMap,xt=new WeakMap;async function pr(r,e){const t=r.getContext("2d");if(!t)throw new Error("Failed to get 2d context from layoutsubtree canvas");const{onCapture:i,maxSize:o}=e;let a=null,n=null;const f=new Promise(w=>{n=w});r.onpaint=()=>{const w=r.firstElementChild;if(!w||r.width===0||r.height===0)return;t.clearRect(0,0,r.width,r.height),t.drawElementImage(w,0,0);let l=r.width,d=r.height;if(o&&(l>o||d>o)){const y=Math.min(o/l,o/d);l=Math.floor(l*y),d=Math.floor(d*y)}(!a||a.width!==l||a.height!==d)&&(a=new OffscreenCanvas(l,d));const v=a.getContext("2d");if(v){if(v.clearRect(0,0,l,d),v.drawImage(r,0,0,l,d),t.clearRect(0,0,r.width,r.height),n){n(a),n=null;return}i(a)}};const c=new ResizeObserver(w=>{var l,d;for(const v of w){const y=(l=v.devicePixelContentBoxSize)==null?void 0:l[0];if(y)r.width=y.inlineSize,r.height=y.blockSize;else{const P=(d=v.borderBoxSize)==null?void 0:d[0];if(P){const U=window.devicePixelRatio;r.width=Math.round(P.inlineSize*U),r.height=Math.round(P.blockSize*U)}}}r.requestPaint()});c.observe(r,{box:"device-pixel-content-box"}),vt.set(r,c);const u=r.firstElementChild;let m="";if(u){const w=new ResizeObserver(l=>{var y;const d=(y=l[0].borderBoxSize)==null?void 0:y[0];if(!d)return;const v=`${Math.round(d.blockSize)}px`;v!==m&&(m=v,r.style.setProperty("height",v))});w.observe(u),gt.set(r,w)}return f}function br(r){r.onpaint=null;const e=vt.get(r);e&&(e.disconnect(),vt.delete(r));const t=gt.get(r);t&&(t.disconnect(),gt.delete(r))}async function xr(r,e){var d;const t=r.getBoundingClientRect(),i=document.createElement("canvas");i.setAttribute("layoutsubtree",""),i.className=r.className;const o=r.getAttribute("style");o&&i.setAttribute("style",o),i.style.setProperty("padding","0"),i.style.setProperty("border","none"),i.style.setProperty("box-sizing","content-box");const a=getComputedStyle(r),n=a.display==="inline"?"block":a.display;i.style.setProperty("display",n);for(const v of gr)i.style.setProperty(v,a.getPropertyValue(v));for(const v of mr)i.style.setProperty(v,a.getPropertyValue(v));const f=v=>Number.parseFloat(v),c=f(a.paddingLeft)+f(a.paddingRight)+f(a.borderLeftWidth)+f(a.borderRightWidth),u=f(a.paddingTop)+f(a.paddingBottom)+f(a.borderTopWidth)+f(a.borderBottomWidth);c>0&&i.style.setProperty("width",`${t.width}px`),u>0&&i.style.setProperty("height",`${t.height}px`),i.style.width||i.style.setProperty("width","100%"),i.style.height||i.style.setProperty("height",`${t.height}px`);const m=window.devicePixelRatio;i.width=Math.round(t.width*m),i.height=Math.round(t.height*m),mt.set(r,r.style.margin),pt.set(r,r.style.width),bt.set(r,r.style.boxSizing),(d=r.parentNode)==null||d.insertBefore(i,r),i.appendChild(r),r.style.setProperty("margin","0"),r.style.setProperty("width","100%"),r.style.setProperty("box-sizing","border-box");const w=await vr(r);xt.set(i,w);const l=await pr(i,e);return{canvas:i,initialCapture:l}}function Ft(r,e){var n;br(r);const t=xt.get(r);t&&(t(),xt.delete(r)),(n=r.parentNode)==null||n.insertBefore(e,r),r.remove();const i=mt.get(e);i!==void 0&&(e.style.margin=i,mt.delete(e));const o=pt.get(e);o!==void 0&&(e.style.width=o,pt.delete(e));const a=bt.get(e);a!==void 0&&(e.style.boxSizing=a,bt.delete(e))}function yr(r){const e=typeof window<"u"?window.devicePixelRatio:1;let t;r.scrollPadding===void 0?t=[.1,.1]:r.scrollPadding===!1?t=[0,0]:Array.isArray(r.scrollPadding)?t=[r.scrollPadding[0]??.1,r.scrollPadding[1]??.1]:t=[r.scrollPadding,r.scrollPadding];let i;return r.postEffect===void 0?i=[]:Array.isArray(r.postEffect)?i=r.postEffect:i=[r.postEffect],{pixelRatio:r.pixelRatio??e,zIndex:r.zIndex??void 0,autoplay:r.autoplay??!0,fixedCanvas:r.scrollPadding===!1,scrollPadding:t,wrapper:r.wrapper,postEffects:i}}function It(r,e,t,i){return{x:r.left+t,y:e-i-r.bottom,w:r.right-r.left,h:r.bottom-r.top}}function Re(r,e,t,i){return{x:r,y:e,w:t,h:i}}var Ve,me,Se,ae,yt,Xt,Ht;class K{constructor(e,t,i){h(this,ae);h(this,Ve);h(this,me);h(this,Se);this.wrapS="clamp",this.wrapT="clamp",this.needsUpdate=!0,this.source=null,g(this,me,!1),g(this,Ve,e),this.gl=e.gl,T(this,ae,yt).call(this),t&&(this.source=t),g(this,Se,(i==null?void 0:i.autoRegister)!==!1),s(this,Se)&&e.addResource(this)}restore(){T(this,ae,yt).call(this),g(this,me,!1),this.needsUpdate=!0}bind(e){const t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&(T(this,ae,Xt).call(this),this.needsUpdate=!1)}dispose(){s(this,Se)&&s(this,Ve).removeResource(this),this.gl.deleteTexture(this.texture)}}Ve=new WeakMap,me=new WeakMap,Se=new WeakMap,ae=new WeakSet,yt=function(){const e=this.gl.createTexture();if(!e)throw new Error("[VFX-JS] Failed to create texture");this.texture=e},Xt=function(){const e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(i){console.error(i)}else if(!s(this,me)){const i=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,i)}T(this,ae,Ht).call(this),g(this,me,!0)},Ht=function(){const e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,Lt(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,Lt(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR)};function Lt(r,e){return e==="repeat"?r.REPEAT:e==="mirror"?r.MIRRORED_REPEAT:r.CLAMP_TO_EDGE}function wr(r){return new Promise((e,t)=>{const i=new Image;i.crossOrigin="anonymous",i.onload=()=>e(i),i.onerror=t,i.src=r})}var Ae,_e,ot;class wt{constructor(e,t,i,o={}){h(this,_e);h(this,Ae);g(this,Ae,e),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(i)),this.float=o.float??!1,this.texture=new K(e,void 0,{autoRegister:!1}),T(this,_e,ot).call(this),e.addResource(this)}setSize(e,t){const i=Math.max(1,Math.floor(e)),o=Math.max(1,Math.floor(t));i===this.width&&o===this.height||(this.width=i,this.height=o,T(this,_e,ot).call(this))}restore(){this.texture.restore(),T(this,_e,ot).call(this)}dispose(){s(this,Ae).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}}Ae=new WeakMap,_e=new WeakSet,ot=function(){const e=this.gl,t=e.createFramebuffer();if(!t)throw new Error("[VFX-JS] Failed to create framebuffer");this.fbo=t;const i=this.texture.texture;e.bindTexture(e.TEXTURE_2D,i);const o=s(this,Ae).floatLinearFilter,a=this.float?o?e.RGBA32F:e.RGBA16F:e.RGBA8,n=this.float?o?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,n,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,t),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,i,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null};var pe,be,Pe,Y;class ct{constructor(e,t,i,o,a){h(this,pe);h(this,be);h(this,Pe);h(this,Y);g(this,pe,t),g(this,be,i),g(this,Pe,o);const n=t*o,f=i*o;g(this,Y,[new wt(e,n,f,{float:a}),new wt(e,n,f,{float:a})])}get texture(){return s(this,Y)[0].texture}get target(){return s(this,Y)[1]}resize(e,t){if(e===s(this,pe)&&t===s(this,be))return;g(this,pe,e),g(this,be,t);const i=e*s(this,Pe),o=t*s(this,Pe);s(this,Y)[0].setSize(i,o),s(this,Y)[1].setSize(i,o)}swap(){g(this,Y,[s(this,Y)[1],s(this,Y)[0]])}getViewport(){return Re(0,0,s(this,pe),s(this,be))}dispose(){s(this,Y)[0].dispose(),s(this,Y)[1].dispose()}}pe=new WeakMap,be=new WeakMap,Pe=new WeakMap,Y=new WeakMap;const Wt=`
precision highp float;
in vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,Tr=`
precision highp float;
attribute vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,qt=`
precision highp float;
uniform vec2 offset;
uniform vec2 resolution;
uniform sampler2D src;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) {
        discard;
    }
    outColor = texture(src, uv);
}
`,M=`precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform bool autoCrop;
uniform sampler2D src;
out vec4 outColor;
`,B=`vec4 readTex(sampler2D tex, vec2 uv) {
    if (autoCrop && (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.)) {
        return vec4(0);
    }
    return texture(tex, uv);
}`,Ut={none:qt,uvGradient:`
    ${M}
    ${B}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        outColor = vec4(uv, sin(time) * .5 + .5, 1);

        vec4 img = readTex(src, uv);
        outColor *= smoothstep(0., 1., img.a);
    }
    `,rainbow:`
    ${M}
    ${B}

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
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec2 uv2 = uv;
        uv2.x *= resolution.x / resolution.y;

        float x = (uv2.x - uv2.y) - fract(time);

        vec4 img = readTex(src, uv);
        float gray = length(img.rgb);

        img.rgb = vec3(hueShift(vec3(1,0,0), x) * gray);

        outColor = img;
    }
    `,glitch:`
    ${M}
    ${B}

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
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);

        float t = mod(time, 3.14 * 10.);

        // Seed value
        float v = fract(sin(t * 2.) * 700.);

        if (abs(nn(uv.y, t)) < 1.2) {
            v *= 0.01;
        }

        // Prepare for chromatic Abbreveation
        vec2 focus = vec2(0.5);
        float d = v * 0.6;
        vec2 ruv = focus + (uv - focus) * (1. - d);
        vec2 guv = focus + (uv - focus) * (1. - 2. * d);
        vec2 buv = focus + (uv - focus) * (1. - 3. * d);

        // Random Glitch
        if (v > 0.1) {
            // Randomize y
            float y = floor(uv.y * 13. * sin(35. * t)) + 1.;
            if (sin(36. * y * v) > 0.9) {
                ruv.x = uv.x + sin(76. * y) * 0.1;
                guv.x = uv.x + sin(34. * y) * 0.1;
                buv.x = uv.x + sin(59. * y) * 0.1;
            }

            // RGB Shift
            v = pow(v * 1.5, 2.) * 0.15;
            color.rgb *= 0.3;
            color.r += readTex(src, vec2(uv.x + sin(t * 123.45) * v, uv.y)).r;
            color.g += readTex(src, vec2(uv.x + sin(t * 157.67) * v, uv.y)).g;
            color.b += readTex(src, vec2(uv.x + sin(t * 143.67) * v, uv.y)).b;
        }

        // Compose Chromatic Abbreveation
        if (abs(nn(uv.y, t)) > 1.1) {
            color.r = color.r * 0.5 + color.r * texture(src, ruv).r;
            color.g = color.g * 0.5 + color.g * texture(src, guv).g;
            color.b = color.b * 0.5 + color.b * texture(src, buv).b;
            color *= 2.;
        }

        outColor = color;
        outColor.a = smoothstep(0.0, 0.8, max(color.r, max(color.g, color.b)));
    }
    `,pixelate:`
    ${M}
    ${B}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float b = sin(time * 2.) * 32. + 48.;
        uv = floor(uv * b) / b;
        outColor = readTex(src, uv);
    }
    `,rgbGlitch:`
    ${M}
    ${B}

    float random(vec2 st) {
        return fract(sin(dot(st, vec2(948.,824.))) * 30284.);
    }

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec2 uvr = uv, uvg = uv, uvb = uv;

        float tt = mod(time, 17.);

        if (fract(tt * 0.73) > .8 || fract(tt * 0.91) > .8) {
            float t = floor(tt * 11.);

            float n = random(vec2(t, floor(uv.y * 17.7)));
            if (n > .7) {
                uvr.x += random(vec2(t, 1.)) * .1 - 0.05;
                uvg.x += random(vec2(t, 2.)) * .1 - 0.05;
                uvb.x += random(vec2(t, 3.)) * .1 - 0.05;
            }

            float ny = random(vec2(t * 17. + floor(uv * 19.7)));
            if (ny > .7) {
                uvr.x += random(vec2(t, 4.)) * .1 - 0.05;
                uvg.x += random(vec2(t, 5.)) * .1 - 0.05;
                uvb.x += random(vec2(t, 6.)) * .1 - 0.05;
            }
        }

        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        outColor = vec4(
            cr.r,
            cg.g,
            cb.b,
            step(.1, cr.a + cg.a + cb.a)
        );
    }
    `,rgbShift:`
    ${M}
    ${B}

    float nn(float y, float t) {
        float n = (
            sin(y * .07 + t * 8. + sin(y * .5 + t * 10.)) +
            sin(y * .7 + t * 2. + sin(y * .3 + t * 8.)) * .7 +
            sin(y * 1.1 + t * 2.8) * .4
        );

        n += sin(y * 124. + t * 100.7) * sin(y * 877. - t * 38.8) * .3;

        return n;
    }

    float step2(float t, vec2 uv) {
        return step(t, uv.x) * step(t, uv.y);
    }

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec2 uvr = uv, uvg = uv, uvb = uv;

        float t = mod(time, 30.);

        float amp = 10. / resolution.x;

        if (abs(nn(uv.y, t)) > 1.) {
            uvr.x += nn(uv.y, t) * amp;
            uvg.x += nn(uv.y, t + 10.) * amp;
            uvb.x += nn(uv.y, t + 20.) * amp;
        }

        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        outColor = vec4(
            cr.r,
            cg.g,
            cb.b,
            smoothstep(.0, 1., cr.a + cg.a + cb.a)
        );
    }
    `,halftone:`
    // Halftone Effect by zoidberg
    // https://www.interactiveshaderformat.com/sketches/234

    ${M}
    ${B}

    // TODO: uniform
    #define gridSize 10.0
    #define dotSize 0.7
    #define smoothing 0.15
    #define speed 1.0

    #define IMG_PIXEL(x, y) readTex(x, (y - offset) / resolution);

    vec4 gridRot = vec4(15.0, 45.0, 75.0, 0.0);

    // during calculation we find the closest dot to a frag, determine its size, and then determine the size of the four dots above/below/right/left of it. this array of offsets move "one left", "one up", "one right", and "one down"...
    vec2 originOffsets[4];

    void main() {
        vec2 fragCoord = gl_FragCoord.xy - offset;

        // a halftone is an overlapping series of grids of dots
        // each grid of dots is rotated by a different amount
        // the size of the dots determines the colors. the shape of the dot should never change (always be a dot with regular edges)
        originOffsets[0] = vec2(-1.0, 0.0);
        originOffsets[1] = vec2(0.0, 1.0);
        originOffsets[2] = vec2(1.0, 0.0);
        originOffsets[3] = vec2(0.0, -1.0);

        vec3 rgbAmounts = vec3(0.0);

        // for each of the channels (i) of RGB...
        for (float i=0.0; i<3.0; ++i) {
            // figure out the rotation of the grid in radians
            float rotRad = radians(gridRot[int(i)]);

            // the grids are rotated counter-clockwise- to find the nearest dot, take the fragment pixel loc,
            // rotate it clockwise, and split by the grid to find the center of the dot. then rotate this
            // coord counter-clockwise to yield the location of the center of the dot in pixel coords local to the render space
            mat2 ccTrans = mat2(vec2(cos(rotRad), sin(rotRad)), vec2(-1.0*sin(rotRad), cos(rotRad)));
            mat2 cTrans = mat2(vec2(cos(rotRad), -1.0*sin(rotRad)), vec2(sin(rotRad), cos(rotRad)));

            // find the location of the frag in the grid (prior to rotating it)
            vec2 gridFragLoc = cTrans * fragCoord.xy;

            // find the center of the dot closest to the frag- there's no "round" in GLSL 1.2, so do a "floor" to find the dot to the bottom-left of the frag, then figure out if the frag would be in the top and right halves of that square to find the closest dot to the frag
            vec2 gridOriginLoc = vec2(floor(gridFragLoc.x/gridSize), floor(gridFragLoc.y/gridSize));

            vec2 tmpGridCoords = gridFragLoc/vec2(gridSize);
            bool fragAtTopOfGrid = ((tmpGridCoords.y-floor(tmpGridCoords.y)) > (gridSize/2.0)) ? true : false;
            bool fragAtRightOfGrid = ((tmpGridCoords.x-floor(tmpGridCoords.x)) > (gridSize/2.0)) ? true : false;
            if (fragAtTopOfGrid)
                gridOriginLoc.y = gridOriginLoc.y + 1.0;
            if (fragAtRightOfGrid)
                gridOriginLoc.x = gridOriginLoc.x + 1.0;

            // ...at this point, "gridOriginLoc" contains the grid coords of the nearest dot to the fragment being rendered
            // convert the location of the center of the dot from grid coords to pixel coords
            vec2 gridDotLoc = vec2(gridOriginLoc.x*gridSize, gridOriginLoc.y*gridSize) + vec2(gridSize/2.0);

            // rotate the pixel coords of the center of the dot so they become relative to the rendering space
            vec2 renderDotLoc = ccTrans * gridDotLoc;

            // get the color of the pixel of the input image under this dot (the color will ultimately determine the size of the dot)
            vec4 renderDotImageColorRGB = IMG_PIXEL(src, renderDotLoc + offset);

            // the amount of this channel is taken from the same channel of the color of the pixel of the input image under this halftone dot
            float imageChannelAmount = renderDotImageColorRGB[int(i)];

            // the size of the dot is determined by the value of the channel
            float dotRadius = imageChannelAmount * (gridSize * dotSize);
            float fragDistanceToDotCenter = distance(fragCoord.xy, renderDotLoc);
            if (fragDistanceToDotCenter < dotRadius) {
                rgbAmounts[int(i)] += smoothstep(dotRadius, dotRadius-(dotRadius*smoothing), fragDistanceToDotCenter);
            }

            // calcluate the size of the dots abov/below/to the left/right to see if they're overlapping
            for (float j=0.0; j<4.0; ++j) {
                gridDotLoc = vec2((gridOriginLoc.x+originOffsets[int(j)].x)*gridSize, (gridOriginLoc.y+originOffsets[int(j)].y)*gridSize) + vec2(gridSize/2.0);

                renderDotLoc = ccTrans * gridDotLoc;
                renderDotImageColorRGB = IMG_PIXEL(src, renderDotLoc + offset);

                imageChannelAmount = renderDotImageColorRGB[int(i)];
                dotRadius = imageChannelAmount * (gridSize*1.50/2.0);
                fragDistanceToDotCenter = distance(fragCoord.xy, renderDotLoc);
                if (fragDistanceToDotCenter < dotRadius) {
                    rgbAmounts[int(i)] += smoothstep(dotRadius, dotRadius-(dotRadius*smoothing), fragDistanceToDotCenter);
                }
            }
        }

        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 original = readTex(src, uv);
        float alpha = step(.1, rgbAmounts[0] + rgbAmounts[1] + rgbAmounts[2] + original.a);

        outColor = vec4(rgbAmounts[0], rgbAmounts[1], rgbAmounts[2], alpha);
    }
    `,sinewave:`
    ${M}
    ${B}

    vec4 draw(vec2 uv) {
        vec2 uvr = uv, uvg = uv, uvb = uv;

        float amp = 20. / resolution.x;

        uvr.x += sin(uv.y * 7. + time * 3.) * amp;
        uvg.x += sin(uv.y * 7. + time * 3. + .4) * amp;
        uvb.x += sin(uv.y * 7. + time * 3. + .8) * amp;

        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        return vec4(
            cr.r,
            cg.g,
            cb.b,
            cr.a + cg.a + cb.a
        );
    }

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        // x blur
        vec2 dx = vec2(2, 0) / resolution.x;
        outColor = (draw(uv) * 2. + draw(uv + dx) + draw(uv - dx)) / 4.;
    }
    `,shine:`
    ${M}
    ${B}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        vec2 p = uv * 2. - 1.;
        float a = atan(p.y, p.x);

        vec4 col = readTex(src, uv);
        float gray = length(col.rgb);

        float level = 1. + sin(a * 10. + time * 3.) * 0.2;

        outColor = vec4(1, 1, .5, col.a) * level;
    }
    `,blink:`
    ${M}
    ${B}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        outColor = readTex(src, uv) * (sin(time * 5.) * 0.2 + 0.8);
    }

    `,spring:`
    ${M}
    ${B}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        uv = (uv - .5) * (1.05 + sin(time * 5.) * 0.05) + .5;
        outColor = readTex(src, uv);
    }
    `,duotone:`
    ${M}
    ${B}

    uniform vec4 color1;
    uniform vec4 color2;
    uniform float speed;

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);

        float gray = dot(color.rgb, vec3(0.2, 0.7, 0.08));
        float t = mod(gray * 2.0 + time * speed, 2.0);

        if (t < 1.) {
            outColor = mix(color1, color2, fract(t));
        } else {
            outColor = mix(color2, color1, fract(t));
        }

        outColor.a *= color.a;
    }
    `,tritone:`
    ${M}
    ${B}

    uniform vec4 color1;
    uniform vec4 color2;
    uniform vec4 color3;
    uniform float speed;

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);

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
    `,hueShift:`
    ${M}
    ${B}

    uniform float shift;

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
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);
        color.rgb = hueShift(color.rgb, shift);
        outColor = color;
    }
    `,warpTransition:`
    ${M}
    uniform float enterTime;
    uniform float leaveTime;

    ${B}

    #define DURATION 1.0

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float t1 = enterTime / DURATION;
        float t2 = leaveTime / DURATION;
        float t = clamp(min(t1, 1. - t2), 0., 1.);

        if (t == 0.) {
            discard;
        }

        if (t < 1.) {
            uv.x += sin(floor(uv.y * 300.)) * 3. * exp(t * -10.);
        }

        outColor = readTex(src, uv);
    }
    `,slitScanTransition:`
    ${M}
    ${B}

    uniform float enterTime;
    uniform float leaveTime;

    #define DURATION 1.0

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float t1 = enterTime / DURATION;
        float t2 = leaveTime / DURATION;

        // Do not render before enter or after leave
        if (t1 < 0. || 1. < t2) {
            discard;
        }

        if (0. < t2) {
            // Leaving
            float t = 1. - t2;
            uv.y = uv.y < t ? uv.y : t;
        } else if (t1 < 1.) {
            // Entering
            float t = 1. - t1;
            uv.y = uv.y < t ? t : uv.y;
        }

        outColor = readTex(src, uv);
    }
    `,pixelateTransition:`
    ${M}
    ${B}

    uniform float enterTime;
    uniform float leaveTime;

    #define DURATION 1.0

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float t1 = enterTime / DURATION;
        float t2 = leaveTime / DURATION;
        float t = clamp(min(t1, 1. - t2), 0., 1.);

        if (t == 0.) {
            discard;
        } else if (t < 1.) {
            float b = floor(t * 64.);
            uv = (floor(uv * b) + .5) / b;
        }

        outColor = readTex(src, uv);
    }
    `,focusTransition:`
    ${M}
    ${B}

    uniform float intersection;

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        float t = smoothstep(0., 1., intersection);

        outColor = mix(
            readTex(src, uv + vec2(1. - t, 0)),
            readTex(src, uv + vec2(-(1. - t), 0)),
            0.5
        ) * intersection;
    }
    `,invert:`
    ${M}
    ${B}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);
        outColor = vec4(1.0 - color.rgb, color.a);
    }
    `,grayscale:`
    ${M}
    ${B}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        outColor = vec4(vec3(gray), color.a);
    }
    `,vignette:`
    ${M}
    ${B}

    uniform float intensity;
    uniform float radius;
    uniform float power;

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        outColor = readTex(src, uv);

        vec2 p = uv * 2.0 - 1.0;
        p.x *= resolution.x / resolution.y;

        float l = max(length(p) - radius, 0.);
        outColor *= 1. - pow(l, power) * intensity;
    }
    `,chromatic:`
    ${M}
    ${B}

    uniform float intensity;
    uniform float radius;
    uniform float power;


    vec4 mirrorTex(sampler2D tex, vec2 uv) {
        vec2 uv2 = 1. - abs(1. - mod(uv, 2.0));
        return texture(tex, uv2);
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        vec2 p = uv * 2.0 - 1.0;
        p.x *= resolution.x / resolution.y;

        float l = max(length(p) - radius, 0.);
        float d = pow(l, power) * (intensity * 0.1);

        vec2 uvR = (uv - .5) / (1.0 + d * 1.) + 0.5;
        vec2 uvG = (uv - .5) / (1.0 + d * 2.) + 0.5;
        vec2 uvB = (uv - .5) / (1.0 + d * 3.) + 0.5;

        vec4 cr = mirrorTex(src, uvR);
        vec4 cg = mirrorTex(src, uvG);
        vec4 cb = mirrorTex(src, uvB);

        outColor = vec4(cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 3.0);
    }
    `};class ne{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}}class Ne{constructor(e=0,t=0,i=0,o=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=i,this.w=o}set(e,t,i,o){return this.x=e,this.y=t,this.z=i,this.w=o,this}}function Yt(r){return/#version\s+300\s+es\b/.test(r)?"300 es":/#version\s+100\b/.test(r)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(r)?"100":"300 es"}var $e,Ge,Xe,Fe,xe,He,Tt;class Er{constructor(e,t,i,o){h(this,He);h(this,$e);h(this,Ge);h(this,Xe);h(this,Fe);h(this,xe,new Map);g(this,$e,e),this.gl=e.gl,g(this,Ge,t),g(this,Xe,i),g(this,Fe,o??Yt(i)),T(this,He,Tt).call(this),e.addResource(this)}restore(){T(this,He,Tt).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return s(this,xe).has(e)}uploadUniforms(e){const t=this.gl;let i=0;for(const[o,a]of s(this,xe)){const n=e[o];if(!n)continue;const f=n.value;if(f!=null){if(Cr(a.type)){f instanceof K&&(f.bind(i),t.uniform1i(a.location,i),i++);continue}f instanceof K||Rr(t,a,f)}}}dispose(){s(this,$e).removeResource(this),this.gl.deleteProgram(this.program)}}$e=new WeakMap,Ge=new WeakMap,Xe=new WeakMap,Fe=new WeakMap,xe=new WeakMap,He=new WeakSet,Tt=function(){const e=this.gl,t=kt(e,e.VERTEX_SHADER,Mt(s(this,Ge),s(this,Fe))),i=kt(e,e.FRAGMENT_SHADER,Mt(s(this,Xe),s(this,Fe))),o=e.createProgram();if(!o)throw new Error("[VFX-JS] Failed to create program");if(e.attachShader(o,t),e.attachShader(o,i),e.bindAttribLocation(o,0,"position"),e.linkProgram(o),!e.getProgramParameter(o,e.LINK_STATUS)){const n=e.getProgramInfoLog(o)??"";throw e.deleteShader(t),e.deleteShader(i),e.deleteProgram(o),new Error(`[VFX-JS] Program link failed: ${n}`)}e.detachShader(o,t),e.detachShader(o,i),e.deleteShader(t),e.deleteShader(i),this.program=o,s(this,xe).clear();const a=e.getProgramParameter(o,e.ACTIVE_UNIFORMS);for(let n=0;n<a;n++){const f=e.getActiveUniform(o,n);if(!f)continue;const c=f.name.replace(/\[0\]$/,""),u=e.getUniformLocation(o,f.name);u&&s(this,xe).set(c,{location:u,type:f.type,size:f.size})}};function kt(r,e,t){const i=r.createShader(e);if(!i)throw new Error("[VFX-JS] Failed to create shader");if(r.shaderSource(i,t),r.compileShader(i),!r.getShaderParameter(i,r.COMPILE_STATUS)){const o=r.getShaderInfoLog(i)??"";throw r.deleteShader(i),new Error(`[VFX-JS] Shader compile failed: ${o}

${t}`)}return i}function Mt(r,e){return r.replace(/^\s+/,"").startsWith("#version")||e==="100"?r:`#version 300 es
${r}`}function Cr(r){return r===35678||r===36298||r===36306||r===35682}const Bt=new Set;function Rr(r,e,t){const i=e.location,o=e.size>1,a=t,n=t,f=t;switch(e.type){case r.FLOAT:o?r.uniform1fv(i,a):r.uniform1f(i,t);return;case r.FLOAT_VEC2:if(o)r.uniform2fv(i,a);else if(t instanceof ne)r.uniform2f(i,t.x,t.y);else{const c=t;r.uniform2f(i,c[0],c[1])}return;case r.FLOAT_VEC3:if(o)r.uniform3fv(i,a);else{const c=t;r.uniform3f(i,c[0],c[1],c[2])}return;case r.FLOAT_VEC4:if(o)r.uniform4fv(i,a);else if(t instanceof Ne)r.uniform4f(i,t.x,t.y,t.z,t.w);else{const c=t;r.uniform4f(i,c[0],c[1],c[2],c[3])}return;case r.INT:o?r.uniform1iv(i,n):r.uniform1i(i,t);return;case r.INT_VEC2:if(o)r.uniform2iv(i,n);else{const c=t;r.uniform2i(i,c[0],c[1])}return;case r.INT_VEC3:if(o)r.uniform3iv(i,n);else{const c=t;r.uniform3i(i,c[0],c[1],c[2])}return;case r.INT_VEC4:if(o)r.uniform4iv(i,n);else{const c=t;r.uniform4i(i,c[0],c[1],c[2],c[3])}return;case r.BOOL:o?r.uniform1iv(i,n):r.uniform1i(i,t?1:0);return;case r.BOOL_VEC2:if(o)r.uniform2iv(i,n);else{const c=t;r.uniform2i(i,c[0]?1:0,c[1]?1:0)}return;case r.BOOL_VEC3:if(o)r.uniform3iv(i,n);else{const c=t;r.uniform3i(i,c[0]?1:0,c[1]?1:0,c[2]?1:0)}return;case r.BOOL_VEC4:if(o)r.uniform4iv(i,n);else{const c=t;r.uniform4i(i,c[0]?1:0,c[1]?1:0,c[2]?1:0,c[3]?1:0)}return;case r.FLOAT_MAT2:r.uniformMatrix2fv(i,!1,a);return;case r.FLOAT_MAT3:r.uniformMatrix3fv(i,!1,a);return;case r.FLOAT_MAT4:r.uniformMatrix4fv(i,!1,a);return;case r.UNSIGNED_INT:o?r.uniform1uiv(i,f):r.uniform1ui(i,t);return;case r.UNSIGNED_INT_VEC2:if(o)r.uniform2uiv(i,f);else{const c=t;r.uniform2ui(i,c[0],c[1])}return;case r.UNSIGNED_INT_VEC3:if(o)r.uniform3uiv(i,f);else{const c=t;r.uniform3ui(i,c[0],c[1],c[2])}return;case r.UNSIGNED_INT_VEC4:if(o)r.uniform4uiv(i,f);else{const c=t;r.uniform4ui(i,c[0],c[1],c[2],c[3])}return;default:Bt.has(e.type)||(Bt.add(e.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${e.type.toString(16)}; skipping upload.`));return}}class jt{constructor(e,t,i,o,a,n){this.gl=e.gl,this.program=new Er(e,t,i,n),this.uniforms=o,this.blend=a}dispose(){this.program.dispose()}}function Sr(r,e,t,i,o,a,n,f){const c=i?i.width/f:a,u=i?i.height/f:n,m=Math.max(0,o.x),w=Math.max(0,o.y),l=Math.min(c,o.x+o.w),d=Math.min(u,o.y+o.h),v=l-m,y=d-w;v<=0||y<=0||(r.bindFramebuffer(r.FRAMEBUFFER,i?i.fbo:null),r.viewport(Math.round(m*f),Math.round(w*f),Math.round(v*f),Math.round(y*f)),Ar(r,t.blend),t.program.use(),t.program.uploadUniforms(t.uniforms),e.draw())}function Ar(r,e){if(e==="none"){r.disable(r.BLEND);return}r.enable(r.BLEND),r.blendEquation(r.FUNC_ADD),e==="premultiplied"?r.blendFuncSeparate(r.ONE,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA):r.blendFuncSeparate(r.SRC_ALPHA,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA)}class _r{constructor(e){this.uniforms={src:{value:null},offset:{value:new ne},resolution:{value:new ne},viewport:{value:new Ne}},this.pass=new jt(e,Wt,qt,this.uniforms,"premultiplied")}setUniforms(e,t,i){this.uniforms.src.value=e,this.uniforms.resolution.value.set(i.w*t,i.h*t),this.uniforms.offset.value.set(i.x*t,i.y*t)}dispose(){this.pass.dispose()}}const Pr=r=>{const e=document.implementation.createHTMLDocument("test"),t=e.createRange();t.selectNodeContents(e.documentElement),t.deleteContents();const i=document.createElement("head");return e.documentElement.appendChild(i),e.documentElement.appendChild(t.createContextualFragment(r)),e.documentElement.setAttribute("xmlns",e.documentElement.namespaceURI),new XMLSerializer().serializeToString(e).replace(/<!DOCTYPE html>/,"")};async function zt(r,e,t,i){const o=r.getBoundingClientRect(),a=window.devicePixelRatio,n=o.width*a,f=o.height*a;let c=1,u=n,m=f;i&&(u>i||m>i)&&(c=Math.min(i/u,i/m),u=Math.floor(u*c),m=Math.floor(m*c));const w=t&&t.width===u&&t.height===m?t:new OffscreenCanvas(u,m),l=r.cloneNode(!0);await Kt(r,l),Jt(r,l),l.style.setProperty("opacity",e.toString()),l.style.setProperty("margin","0px"),Fr(l);const d=l.outerHTML,v=Pr(d),y=`<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${f}"><foreignObject width="100%" height="100%">${v}</foreignObject></svg>`;return new Promise((P,U)=>{const L=new Image;L.onload=()=>{const S=w.getContext("2d");if(S===null)return U();S.clearRect(0,0,u,m);const R=a*c;S.scale(R,R),S.drawImage(L,0,0,n,f),S.setTransform(1,0,0,1,0,0),P(w)},L.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(y)}`})}async function Kt(r,e){const t=window.getComputedStyle(r);for(const i of Array.from(t))/(-inline-|-block-|^inline-|^block-)/.test(i)||/^-webkit-.*(start|end|before|after|logical)/.test(i)||e.style.setProperty(i,t.getPropertyValue(i),t.getPropertyPriority(i));if(e.tagName==="INPUT")e.setAttribute("value",e.value);else if(e.tagName==="TEXTAREA")e.innerHTML=e.value;else if(e.tagName==="IMG")try{e.src=await Ir(r.src)}catch{}for(let i=0;i<r.children.length;i++){const o=r.children[i],a=e.children[i];await Kt(o,a)}}function Jt(r,e){if(typeof r.computedStyleMap=="function")try{const t=r.computedStyleMap();for(const i of["margin-top","margin-right","margin-bottom","margin-left"]){const o=t.get(i);o instanceof CSSKeywordValue&&o.value==="auto"&&e.style.setProperty(i,"auto")}}catch{}for(let t=0;t<r.children.length;t++){const i=r.children[t],o=e.children[t];i instanceof HTMLElement&&o instanceof HTMLElement&&Jt(i,o)}}function Fr(r){let e=r;for(;;){const t=e.style;if(Number.parseFloat(t.paddingTop)>0||Number.parseFloat(t.borderTopWidth)>0||t.getPropertyValue("overflow-x")&&t.getPropertyValue("overflow-x")!=="visible"||t.getPropertyValue("overflow-y")&&t.getPropertyValue("overflow-y")!=="visible"||t.display==="flex"||t.display==="grid"||t.display==="flow-root"||t.display==="inline-block")break;const i=e.firstElementChild;if(!i)break;i.style.setProperty("margin-top","0px"),e=i}for(e=r;;){const t=e.style;if(Number.parseFloat(t.paddingBottom)>0||Number.parseFloat(t.borderBottomWidth)>0||t.getPropertyValue("overflow-x")&&t.getPropertyValue("overflow-x")!=="visible"||t.getPropertyValue("overflow-y")&&t.getPropertyValue("overflow-y")!=="visible"||t.display==="flex"||t.display==="grid"||t.display==="flow-root"||t.display==="inline-block")break;const i=e.lastElementChild;if(!i)break;i.style.setProperty("margin-bottom","0px"),e=i}}async function Ir(r){const e=await fetch(r).then(t=>t.blob());return new Promise(t=>{const i=new FileReader;i.onload=function(){t(this.result)},i.readAsDataURL(e)})}function ve(r){this.data=r,this.pos=0}ve.prototype.readByte=function(){return this.data[this.pos++]};ve.prototype.peekByte=function(){return this.data[this.pos]};ve.prototype.readBytes=function(r){return this.data.subarray(this.pos,this.pos+=r)};ve.prototype.peekBytes=function(r){return this.data.subarray(this.pos,this.pos+r)};ve.prototype.readString=function(r){for(var e="",t=0;t<r;t++)e+=String.fromCharCode(this.readByte());return e};ve.prototype.readBitArray=function(){for(var r=[],e=this.readByte(),t=7;t>=0;t--)r.push(!!(e&1<<t));return r};ve.prototype.readUnsigned=function(r){var e=this.readBytes(2);return r?(e[1]<<8)+e[0]:(e[0]<<8)+e[1]};function rt(r){this.stream=new ve(r),this.output={}}rt.prototype.parse=function(r){return this.parseParts(this.output,r),this.output};rt.prototype.parseParts=function(r,e){for(var t=0;t<e.length;t++){var i=e[t];this.parsePart(r,i)}};rt.prototype.parsePart=function(r,e){var t=e.label,i;if(!(e.requires&&!e.requires(this.stream,this.output,r)))if(e.loop){for(var o=[];e.loop(this.stream);){var a={};this.parseParts(a,e.parts),o.push(a)}r[t]=o}else e.parts?(i={},this.parseParts(i,e.parts),r[t]=i):e.parser?(i=e.parser(this.stream,this.output,r),e.skip||(r[t]=i)):e.bits&&(r[t]=this.parseBits(e.bits))};function Lr(r){return r.reduce(function(e,t){return e*2+t},0)}rt.prototype.parseBits=function(r){var e={},t=this.stream.readBitArray();for(var i in r){var o=r[i];o.length?e[i]=Lr(t.slice(o.index,o.index+o.length)):e[i]=t[o.index]}return e};var I={readByte:function(){return function(r){return r.readByte()}},readBytes:function(r){return function(e){return e.readBytes(r)}},readString:function(r){return function(e){return e.readString(r)}},readUnsigned:function(r){return function(e){return e.readUnsigned(r)}},readArray:function(r,e){return function(t,i,o){for(var a=e(t,i,o),n=new Array(a),f=0;f<a;f++)n[f]=t.readBytes(r);return n}}},ft={label:"blocks",parser:function(r){for(var e=[],t=0,i=0,o=r.readByte();o!==i;o=r.readByte())e.push(r.readBytes(o)),t+=o;var a=new Uint8Array(t);t=0;for(var n=0;n<e.length;n++)a.set(e[n],t),t+=e[n].length;return a}},Ur={label:"gce",requires:function(r){var e=r.peekBytes(2);return e[0]===33&&e[1]===249},parts:[{label:"codes",parser:I.readBytes(2),skip:!0},{label:"byteSize",parser:I.readByte()},{label:"extras",bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:"delay",parser:I.readUnsigned(!0)},{label:"transparentColorIndex",parser:I.readByte()},{label:"terminator",parser:I.readByte(),skip:!0}]},kr={label:"image",requires:function(r){var e=r.peekByte();return e===44},parts:[{label:"code",parser:I.readByte(),skip:!0},{label:"descriptor",parts:[{label:"left",parser:I.readUnsigned(!0)},{label:"top",parser:I.readUnsigned(!0)},{label:"width",parser:I.readUnsigned(!0)},{label:"height",parser:I.readUnsigned(!0)},{label:"lct",bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:"lct",requires:function(r,e,t){return t.descriptor.lct.exists},parser:I.readArray(3,function(r,e,t){return Math.pow(2,t.descriptor.lct.size+1)})},{label:"data",parts:[{label:"minCodeSize",parser:I.readByte()},ft]}]},Mr={label:"text",requires:function(r){var e=r.peekBytes(2);return e[0]===33&&e[1]===1},parts:[{label:"codes",parser:I.readBytes(2),skip:!0},{label:"blockSize",parser:I.readByte()},{label:"preData",parser:function(r,e,t){return r.readBytes(t.text.blockSize)}},ft]},Br={label:"application",requires:function(r,e,t){var i=r.peekBytes(2);return i[0]===33&&i[1]===255},parts:[{label:"codes",parser:I.readBytes(2),skip:!0},{label:"blockSize",parser:I.readByte()},{label:"id",parser:function(r,e,t){return r.readString(t.blockSize)}},ft]},zr={label:"comment",requires:function(r,e,t){var i=r.peekBytes(2);return i[0]===33&&i[1]===254},parts:[{label:"codes",parser:I.readBytes(2),skip:!0},ft]},Or={label:"frames",parts:[Ur,Br,zr,kr,Mr],loop:function(r){var e=r.peekByte();return e===33||e===44}},Dr=[{label:"header",parts:[{label:"signature",parser:I.readString(3)},{label:"version",parser:I.readString(3)}]},{label:"lsd",parts:[{label:"width",parser:I.readUnsigned(!0)},{label:"height",parser:I.readUnsigned(!0)},{label:"gct",bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:"backgroundColorIndex",parser:I.readByte()},{label:"pixelAspectRatio",parser:I.readByte()}]},{label:"gct",requires:function(r,e){return e.lsd.gct.exists},parser:I.readArray(3,function(r,e){return Math.pow(2,e.lsd.gct.size+1)})},Or];function St(r){var e=new Uint8Array(r),t=new rt(e);this.raw=t.parse(Dr),this.raw.hasImages=!1;for(var i=0;i<this.raw.frames.length;i++)if(this.raw.frames[i].image){this.raw.hasImages=!0;break}}St.prototype.decompressFrame=function(r,e){if(r>=this.raw.frames.length)return null;var t=this.raw.frames[r];if(t.image){var i=t.image.descriptor.width*t.image.descriptor.height,o=n(t.image.data.minCodeSize,t.image.data.blocks,i);t.image.descriptor.lct.interlaced&&(o=f(o,t.image.descriptor.width));var a={pixels:o,dims:{top:t.image.descriptor.top,left:t.image.descriptor.left,width:t.image.descriptor.width,height:t.image.descriptor.height}};return t.image.descriptor.lct&&t.image.descriptor.lct.exists?a.colorTable=t.image.lct:a.colorTable=this.raw.gct,t.gce&&(a.delay=(t.gce.delay||10)*10,a.disposalType=t.gce.extras.disposal,t.gce.extras.transparentColorGiven&&(a.transparentIndex=t.gce.transparentColorIndex)),e&&(a.patch=c(a)),a}return null;function n(u,m,w){var l=4096,d=-1,v=w,y,P,U,L,S,R,b,z,A,N,G,p,E,k,j,ce,ge=new Array(w),V=new Array(l),$=new Array(l),Oe=new Array(l+1);for(p=u,P=1<<p,S=P+1,y=P+2,b=d,L=p+1,U=(1<<L)-1,A=0;A<P;A++)V[A]=0,$[A]=A;for(G=z=E=k=ce=j=0,N=0;N<v;){if(k===0){if(z<L){G+=m[j]<<z,z+=8,j++;continue}if(A=G&U,G>>=L,z-=L,A>y||A==S)break;if(A==P){L=p+1,U=(1<<L)-1,y=P+2,b=d;continue}if(b==d){Oe[k++]=$[A],b=A,E=A;continue}for(R=A,A==y&&(Oe[k++]=E,A=b);A>P;)Oe[k++]=$[A],A=V[A];E=$[A]&255,Oe[k++]=E,y<l&&(V[y]=b,$[y]=E,y++,(y&U)===0&&y<l&&(L++,U+=y)),b=R}k--,ge[ce++]=Oe[k],N++}for(N=ce;N<v;N++)ge[N]=0;return ge}function f(u,m){for(var w=new Array(u.length),l=u.length/m,d=function(S,R){var b=u.slice(R*m,(R+1)*m);w.splice.apply(w,[S*m,m].concat(b))},v=[0,4,2,1],y=[8,8,4,2],P=0,U=0;U<4;U++)for(var L=v[U];L<l;L+=y[U])d(L,P),P++;return w}function c(u){for(var m=u.pixels.length,w=new Uint8ClampedArray(m*4),l=0;l<m;l++){var d=l*4,v=u.pixels[l],y=u.colorTable[v];w[d]=y[0],w[d+1]=y[1],w[d+2]=y[2],w[d+3]=v!==u.transparentIndex?255:0}return w}};St.prototype.decompressFrames=function(r,e,t){e===void 0&&(e=0),t===void 0?t=this.raw.frames.length:t=Math.min(t,this.raw.frames.length);for(var i=[],o=e;o<t;o++){var a=this.raw.frames[o];a.image&&i.push(this.decompressFrame(o,r))}return i};class At{constructor(e,t,i,o){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement("canvas"),this.ctx=this.canvas.getContext("2d"),this.pixelRatio=o,this.canvas.width=t,this.canvas.height=i,this.startTime=Date.now()}static async create(e,t){const i=await fetch(e).then(f=>f.arrayBuffer()).then(f=>new St(f)),o=i.decompressFrames(!0,void 0,void 0),{width:a,height:n}=i.raw.lsd;return new At(o,a,n,t)}getCanvas(){return this.canvas}update(){const t=Date.now()-this.startTime;for(;this.playTime<t;){const a=this.frames[this.index%this.frames.length];this.playTime+=a.delay,this.index++}const i=this.frames[this.index%this.frames.length],o=new ImageData(i.patch,i.dims.width,i.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(o,i.dims.left,i.dims.top)}}var ye,we,Te,We,qe;class Nr{constructor(e){h(this,ye);h(this,we);h(this,Te);h(this,We);h(this,qe);this.isContextLost=!1,g(this,ye,new Set),g(this,we,new Set),g(this,Te,new Set),g(this,We,i=>{i.preventDefault(),this.isContextLost=!0;for(const o of s(this,we))o()}),g(this,qe,()=>{this.isContextLost=!1;const i=this.gl;i.getExtension("EXT_color_buffer_float"),i.getExtension("EXT_color_buffer_half_float");for(const o of s(this,ye))o.restore();for(const o of s(this,Te))o()});const t=e.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1});if(!t)throw new Error("[VFX-JS] WebGL2 is not available.");this.gl=t,this.canvas=e,t.getExtension("EXT_color_buffer_float"),t.getExtension("EXT_color_buffer_half_float"),this.floatLinearFilter=!!t.getExtension("OES_texture_float_linear"),this.maxTextureSize=t.getParameter(t.MAX_TEXTURE_SIZE),e.addEventListener("webglcontextlost",s(this,We),!1),e.addEventListener("webglcontextrestored",s(this,qe),!1)}setSize(e,t,i){const o=Math.floor(e*i),a=Math.floor(t*i);(this.canvas.width!==o||this.canvas.height!==a)&&(this.canvas.width=o,this.canvas.height=a)}addResource(e){s(this,ye).add(e)}removeResource(e){s(this,ye).delete(e)}onContextLost(e){return s(this,we).add(e),()=>s(this,we).delete(e)}onContextRestored(e){return s(this,Te).add(e),()=>s(this,Te).delete(e)}}ye=new WeakMap,we=new WeakMap,Te=new WeakMap,We=new WeakMap,qe=new WeakMap;var Ye,je,Ke,Et;class Vr{constructor(e){h(this,Ke);h(this,Ye);h(this,je);g(this,Ye,e),this.gl=e.gl,T(this,Ke,Et).call(this),e.addResource(this)}restore(){T(this,Ke,Et).call(this)}draw(){const e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){s(this,Ye).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(s(this,je))}}Ye=new WeakMap,je=new WeakMap,Ke=new WeakSet,Et=function(){const e=this.gl,t=e.createVertexArray(),i=e.createBuffer();if(!t||!i)throw new Error("[VFX-JS] Failed to create quad VAO");this.vao=t,g(this,je,i);const o=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,i),e.bufferData(e.ARRAY_BUFFER,o,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function ut(r,e,t,i={}){return new wt(r,e,t,{float:i.float??!1})}function Zt(r,e){const t=e.renderingToBuffer??!1;let i;t?i="none":e.premultipliedAlpha?i="premultiplied":i="normal";const o=e.glslVersion??Yt(e.fragmentShader),a=e.vertexShader??(o==="100"?Tr:Wt);return new jt(r,a,e.fragmentShader,e.uniforms,i,o)}var O,Ie,Z,Le,Ee,Q;class Ot{constructor(e,t,i,o,a,n,f,c){h(this,O);h(this,Ie);h(this,Z);h(this,Le);h(this,Ee);h(this,Q);if(g(this,Le,o??!1),g(this,Ee,a??!1),g(this,Q,n),g(this,Ie,{}),g(this,O,{src:{value:null},offset:{value:new ne},resolution:{value:new ne},viewport:{value:new Ne},time:{value:0},mouse:{value:new ne},passIndex:{value:0}}),i)for(const[u,m]of Object.entries(i))typeof m=="function"?(s(this,Ie)[u]=m,s(this,O)[u]={value:m()}):s(this,O)[u]={value:m};this.pass=Zt(e,{fragmentShader:t,uniforms:s(this,O),renderingToBuffer:f??!1,premultipliedAlpha:!0,glslVersion:c})}get uniforms(){return s(this,O)}setUniforms(e,t,i,o,a,n){s(this,O).src.value=e,s(this,O).resolution.value.set(i.w*t,i.h*t),s(this,O).offset.value.set(i.x*t,i.y*t),s(this,O).time.value=o,s(this,O).mouse.value.set(a*t,n*t)}updateCustomUniforms(e){for(const[t,i]of Object.entries(s(this,Ie)))s(this,O)[t]&&(s(this,O)[t].value=i());if(e)for(const[t,i]of Object.entries(e))s(this,O)[t]&&(s(this,O)[t].value=i())}initializeBackbuffer(e,t,i,o){s(this,Le)&&!s(this,Z)&&(s(this,Q)?g(this,Z,new ct(e,s(this,Q)[0],s(this,Q)[1],1,s(this,Ee))):g(this,Z,new ct(e,t,i,o,s(this,Ee))))}resizeBackbuffer(e,t){s(this,Z)&&!s(this,Q)&&s(this,Z).resize(e,t)}registerBufferUniform(e){s(this,O)[e]||(s(this,O)[e]={value:null})}get backbuffer(){return s(this,Z)}get persistent(){return s(this,Le)}get float(){return s(this,Ee)}get size(){return s(this,Q)}getTargetDimensions(){return s(this,Q)}dispose(){var e;this.pass.dispose(),(e=s(this,Z))==null||e.dispose()}}O=new WeakMap,Ie=new WeakMap,Z=new WeakMap,Le=new WeakMap,Ee=new WeakMap,Q=new WeakMap;function $r(r,e,t,i){return{top:r,right:e,bottom:t,left:i}}function Qt(r){return typeof r=="number"?{top:r,right:r,bottom:r,left:r}:Array.isArray(r)?{top:r[0],right:r[1],bottom:r[2],left:r[3]}:{top:r.top??0,right:r.right??0,bottom:r.bottom??0,left:r.left??0}}function er(r){return Qt(r)}const Dt=$r(0,0,0,0);function it(r){return Qt(r)}function Nt(r){return{top:r.top,right:r.right,bottom:r.bottom,left:r.left}}function ht(r,e){return{top:r.top-e.top,right:r.right+e.right,bottom:r.bottom+e.bottom,left:r.left-e.left}}function st(r,e,t){return Math.min(Math.max(r,e),t)}function Gr(r,e){const t=st(e.left,r.left,r.right),o=(st(e.right,r.left,r.right)-t)/(e.right-e.left),a=st(e.top,r.top,r.bottom),f=(st(e.bottom,r.top,r.bottom)-a)/(e.bottom-e.top);return o*f}const Vt=new Map;var J,ee,_,fe,Ue,X,H,ke,D,Je,Ce,oe,x,W,Ze,le,Me,ue,te,re,he,de,Be,C,tr,ze,Qe,nt,rr,et,Ct,Rt,q,at,ir,sr,or;class Xr{constructor(e,t){h(this,C);h(this,J);h(this,ee);h(this,_);h(this,fe);h(this,Ue);h(this,X);h(this,H,[]);h(this,ke,[]);h(this,D);h(this,Je,[]);h(this,Ce,new Map);h(this,oe);h(this,x,2);h(this,W,[]);h(this,Ze,Date.now()/1e3);h(this,le,it(0));h(this,Me,it(0));h(this,ue,[0,0]);h(this,te,0);h(this,re,0);h(this,he,0);h(this,de,0);h(this,Be,new WeakMap);h(this,ze,async()=>{if(typeof window<"u"){for(const e of s(this,W))if(e.type==="text"&&e.isInViewport){const t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await T(this,C,nt).call(this,e),e.width=t.width,e.height=t.height)}for(const e of s(this,W))if(e.type==="text"&&!e.isInViewport){const t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await T(this,C,nt).call(this,e),e.width=t.width,e.height=t.height)}}});h(this,Qe,e=>{typeof window<"u"&&(g(this,he,e.clientX),g(this,de,window.innerHeight-e.clientY))});h(this,et,()=>{this.isPlaying()&&(this.render(),g(this,oe,requestAnimationFrame(s(this,et))))});g(this,J,e),g(this,ee,t),g(this,_,new Nr(t)),g(this,fe,s(this,_).gl),s(this,fe).clearColor(0,0,0,0),g(this,x,e.pixelRatio),g(this,Ue,new Vr(s(this,_))),typeof window<"u"&&(window.addEventListener("resize",s(this,ze)),window.addEventListener("pointermove",s(this,Qe))),s(this,ze).call(this),g(this,X,new _r(s(this,_))),T(this,C,ir).call(this,e.postEffects),s(this,_).onContextRestored(()=>{s(this,fe).clearColor(0,0,0,0)})}destroy(){var e;this.stop(),typeof window<"u"&&(window.removeEventListener("resize",s(this,ze)),window.removeEventListener("pointermove",s(this,Qe))),(e=s(this,D))==null||e.dispose();for(const t of s(this,Ce).values())t==null||t.dispose();for(const t of s(this,H))t.dispose();s(this,X).dispose(),s(this,Ue).dispose()}async addElement(e,t={},i){const o=T(this,C,rr).call(this,t),a=e.getBoundingClientRect(),n=Nt(a),[f,c]=Wr(t.overflow),u=ht(n,c),m=qr(t.intersection),w=e.style.opacity===""?1:Number.parseFloat(e.style.opacity);let l,d,v=!1;if(e instanceof HTMLImageElement)if(d="img",v=!!e.src.match(/\.gif/i),v){const p=await At.create(e.src,s(this,x));Vt.set(e,p),l=new K(s(this,_),p.getCanvas())}else{const p=await wr(e.src);l=new K(s(this,_),p)}else if(e instanceof HTMLVideoElement)l=new K(s(this,_),e),d="video";else if(e instanceof HTMLCanvasElement)e.hasAttribute("layoutsubtree")&&i?(l=new K(s(this,_),i),d="hic"):(l=new K(s(this,_),e),d="canvas");else{const p=await zt(e,w,void 0,this.maxTextureSize);l=new K(s(this,_),p),d="text"}const[y,P]=Yr(t.wrap);l.wrapS=y,l.wrapT=P,l.needsUpdate=!0;const U=t.autoCrop??!0;if(d!=="hic"){if(t.overlay!==!0)if(typeof t.overlay=="number")e.style.setProperty("opacity",t.overlay.toString());else{const p=d==="video"?"0.0001":"0";e.style.setProperty("opacity",p.toString())}}const L={src:{value:l},resolution:{value:new ne},offset:{value:new ne},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new ne},intersection:{value:0},viewport:{value:new Ne},autoCrop:{value:U}},S={};if(t.uniforms!==void 0)for(const[p,E]of Object.entries(t.uniforms))typeof E=="function"?(L[p]={value:E()},S[p]=E):L[p]={value:E};let R;t.backbuffer&&(R=(()=>{const p=(u.right-u.left)*s(this,x),E=(u.bottom-u.top)*s(this,x);return new ct(s(this,_),p,E,s(this,x),!1)})(),L.backbuffer={value:R.texture});const b=new Map,z=new Map;for(let p=0;p<o.length-1;p++){const E=o[p].target??`pass${p}`;o[p]={...o[p],target:E};const k=o[p].size,j=k?k[0]:(u.right-u.left)*s(this,x),ce=k?k[1]:(u.bottom-u.top)*s(this,x);if(o[p].persistent){const ge=k?1:s(this,x),V=k?k[0]:u.right-u.left,$=k?k[1]:u.bottom-u.top;z.set(E,new ct(s(this,_),V,$,ge,o[p].float))}else b.set(E,ut(s(this,_),j,ce,{float:o[p].float}))}const A=[];for(let p=0;p<o.length;p++){const E=o[p],k=E.frag,j={...L},ce={};for(const[V,$]of b)V!==E.target&&k.match(new RegExp(`uniform\\s+sampler2D\\s+${V}\\b`))&&(j[V]={value:$.texture});for(const[V,$]of z)k.match(new RegExp(`uniform\\s+sampler2D\\s+${V}\\b`))&&(j[V]={value:$.texture});if(E.uniforms)for(const[V,$]of Object.entries(E.uniforms))typeof $=="function"?(j[V]={value:$()},ce[V]=$):j[V]={value:$};const ge=Zt(s(this,_),{vertexShader:E.vert,fragmentShader:k,uniforms:j,renderingToBuffer:E.target!==void 0,glslVersion:E.glslVersion});A.push({pass:ge,uniforms:j,uniformGenerators:{...S,...ce},target:E.target,persistent:E.persistent,float:E.float,size:E.size,backbuffer:E.target?z.get(E.target):void 0})}const N=Date.now()/1e3,G={type:d,element:e,isInViewport:!1,isInLogicalViewport:!1,width:a.width,height:a.height,passes:A,bufferTargets:b,startTime:N,enterTime:N,leaveTime:Number.NEGATIVE_INFINITY,release:t.release??Number.POSITIVE_INFINITY,isGif:v,isFullScreen:f,overflow:c,intersection:m,originalOpacity:w,srcTexture:l,zIndex:t.zIndex??0,backbuffer:R,autoCrop:U};T(this,C,Ct).call(this,G,n,N),s(this,W).push(G),s(this,W).sort((p,E)=>p.zIndex-E.zIndex)}removeElement(e){var i,o;const t=s(this,W).findIndex(a=>a.element===e);if(t!==-1){const a=s(this,W).splice(t,1)[0];for(const n of a.bufferTargets.values())n.dispose();for(const n of a.passes)n.pass.dispose(),(i=n.backbuffer)==null||i.dispose();(o=a.backbuffer)==null||o.dispose(),a.srcTexture.dispose(),e.style.setProperty("opacity",a.originalOpacity.toString())}}updateTextElement(e){const t=s(this,W).findIndex(i=>i.element===e);return t!==-1?T(this,C,nt).call(this,s(this,W)[t]):Promise.resolve()}updateCanvasElement(e){const t=s(this,W).find(i=>i.element===e);if(t){const i=t.passes[0].uniforms.src,o=i.value,a=new K(s(this,_),e);a.wrapS=o.wrapS,a.wrapT=o.wrapT,a.needsUpdate=!0,i.value=a,t.srcTexture=a,o.dispose()}}updateHICTexture(e,t){const i=s(this,W).find(n=>n.element===e);if(!i||i.type!=="hic")return;const o=i.passes[0].uniforms.src,a=o.value;if(a.source===t)a.needsUpdate=!0;else{const n=new K(s(this,_),t);n.wrapS=a.wrapS,n.wrapT=a.wrapT,n.needsUpdate=!0,o.value=n,i.srcTexture=n,a.dispose()}}get maxTextureSize(){return s(this,_).maxTextureSize}isPlaying(){return s(this,oe)!==void 0}play(){this.isPlaying()||g(this,oe,requestAnimationFrame(s(this,et)))}stop(){s(this,oe)!==void 0&&(cancelAnimationFrame(s(this,oe)),g(this,oe,void 0))}render(){var f;const e=Date.now()/1e3,t=s(this,fe);T(this,C,tr).call(this),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,s(this,ee).width,s(this,ee).height),t.clear(t.COLOR_BUFFER_BIT);const i=s(this,le).right-s(this,le).left,o=s(this,le).bottom-s(this,le).top,a=Re(0,0,i,o),n=s(this,H).length>0;n&&(T(this,C,or).call(this,i,o),s(this,D)&&(t.bindFramebuffer(t.FRAMEBUFFER,s(this,D).fbo),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)));for(const c of s(this,W)){const u=c.element.getBoundingClientRect(),m=Nt(u),w=T(this,C,Ct).call(this,c,m,e);if(!w.isVisible)continue;const l=c.passes[0].uniforms;l.time.value=e-c.startTime,l.resolution.value.set(u.width*s(this,x),u.height*s(this,x)),l.mouse.value.set((s(this,he)+s(this,te))*s(this,x),(s(this,de)+s(this,re))*s(this,x));for(const R of c.passes)for(const[b,z]of Object.entries(R.uniformGenerators))R.uniforms[b].value=z();(f=Vt.get(c.element))==null||f.update(),(c.type==="video"||c.isGif)&&(l.src.value.needsUpdate=!0);const d=It(m,o,s(this,te),s(this,re)),v=It(w.rectWithOverflow,o,s(this,te),s(this,re));c.backbuffer&&(c.passes[0].uniforms.backbuffer.value=c.backbuffer.texture);{const R=c.isFullScreen?a:v,b=Math.max(1,R.w*s(this,x)),z=Math.max(1,R.h*s(this,x)),A=Math.max(1,R.w),N=Math.max(1,R.h);for(let G=0;G<c.passes.length-1;G++){const p=c.passes[G];if(!p.size)if(p.backbuffer)p.backbuffer.resize(A,N);else{const E=c.bufferTargets.get(p.target);E&&(E.width!==b||E.height!==z)&&E.setSize(b,z)}}}const y=new Map;for(const R of c.passes)R.backbuffer&&R.target&&y.set(R.target,R.backbuffer.texture);let P=c.srcTexture;const U=s(this,he)+s(this,te)-d.x,L=s(this,de)+s(this,re)-d.y;for(let R=0;R<c.passes.length-1;R++){const b=c.passes[R],z=c.isFullScreen?a:v;b.uniforms.src.value=P;for(const[p,E]of y)b.uniforms[p]&&(b.uniforms[p].value=E);for(const[p,E]of Object.entries(b.uniformGenerators))b.uniforms[p]&&(b.uniforms[p].value=E());const A=b.size?b.size[0]:z.w*s(this,x),N=b.size?b.size[1]:z.h*s(this,x),G=b.size?Re(0,0,b.size[0],b.size[1]):Re(0,0,z.w,z.h);if(b.uniforms.resolution.value.set(A,N),b.uniforms.offset.value.set(0,0),b.uniforms.mouse.value.set(U/z.w*A,L/z.h*N),b.backbuffer)T(this,C,q).call(this,b.pass,b.backbuffer.target,G,b.uniforms,!0),b.backbuffer.swap(),P=b.backbuffer.texture;else{const p=c.bufferTargets.get(b.target);if(!p)continue;T(this,C,q).call(this,b.pass,p,G,b.uniforms,!0),P=p.texture}b.target&&y.set(b.target,P)}const S=c.passes[c.passes.length-1];S.uniforms.src.value=P,S.uniforms.resolution.value.set(u.width*s(this,x),u.height*s(this,x)),S.uniforms.offset.value.set(d.x*s(this,x),d.y*s(this,x)),S.uniforms.mouse.value.set((s(this,he)+s(this,te))*s(this,x),(s(this,de)+s(this,re))*s(this,x));for(const[R,b]of y)S.uniforms[R]&&(S.uniforms[R].value=b);for(const[R,b]of Object.entries(S.uniformGenerators))S.uniforms[R]&&(S.uniforms[R].value=b());c.backbuffer?(S.uniforms.backbuffer.value=c.backbuffer.texture,c.isFullScreen?(c.backbuffer.resize(i,o),T(this,C,at).call(this,c,d.x,d.y),T(this,C,q).call(this,S.pass,c.backbuffer.target,a,S.uniforms,!0),c.backbuffer.swap(),s(this,X).setUniforms(c.backbuffer.texture,s(this,x),a),T(this,C,q).call(this,s(this,X).pass,n&&s(this,D)||null,a,s(this,X).uniforms,!1)):(c.backbuffer.resize(v.w,v.h),T(this,C,at).call(this,c,c.overflow.left,c.overflow.bottom),T(this,C,q).call(this,S.pass,c.backbuffer.target,c.backbuffer.getViewport(),S.uniforms,!0),c.backbuffer.swap(),s(this,X).setUniforms(c.backbuffer.texture,s(this,x),v),T(this,C,q).call(this,s(this,X).pass,n&&s(this,D)||null,v,s(this,X).uniforms,!1))):(T(this,C,at).call(this,c,d.x,d.y),T(this,C,q).call(this,S.pass,n&&s(this,D)||null,c.isFullScreen?a:v,S.uniforms,!1))}n&&s(this,D)&&T(this,C,sr).call(this,a,e)}}J=new WeakMap,ee=new WeakMap,_=new WeakMap,fe=new WeakMap,Ue=new WeakMap,X=new WeakMap,H=new WeakMap,ke=new WeakMap,D=new WeakMap,Je=new WeakMap,Ce=new WeakMap,oe=new WeakMap,x=new WeakMap,W=new WeakMap,Ze=new WeakMap,le=new WeakMap,Me=new WeakMap,ue=new WeakMap,te=new WeakMap,re=new WeakMap,he=new WeakMap,de=new WeakMap,Be=new WeakMap,C=new WeakSet,tr=function(){if(typeof window>"u")return;const e=s(this,ee).ownerDocument,t=e.compatMode==="BackCompat"?e.body:e.documentElement,i=t.clientWidth,o=t.clientHeight,a=window.scrollX,n=window.scrollY;let f,c;if(s(this,J).fixedCanvas)f=0,c=0;else if(s(this,J).wrapper)f=i*s(this,J).scrollPadding[0],c=o*s(this,J).scrollPadding[1];else{const w=e.body.scrollWidth-(a+i),l=e.body.scrollHeight-(n+o);f=$t(i*s(this,J).scrollPadding[0],0,w),c=$t(o*s(this,J).scrollPadding[1],0,l)}const u=i+f*2,m=o+c*2;(u!==s(this,ue)[0]||m!==s(this,ue)[1])&&(s(this,ee).style.width=`${u}px`,s(this,ee).style.height=`${m}px`,s(this,_).setSize(u,m,s(this,x)),g(this,le,it({top:-c,left:-f,right:i+f,bottom:o+c})),g(this,Me,it({top:0,left:0,right:i,bottom:o})),g(this,ue,[u,m]),g(this,te,f),g(this,re,c)),s(this,J).fixedCanvas||s(this,ee).style.setProperty("transform",`translate(${a-f}px, ${n-c}px)`)},ze=new WeakMap,Qe=new WeakMap,nt=async function(e){if(!s(this,Be).get(e.element)){s(this,Be).set(e.element,!0);try{const t=e.passes[0].uniforms.src,i=t.value,o=i.source instanceof OffscreenCanvas?i.source:void 0,a=await zt(e.element,e.originalOpacity,o,this.maxTextureSize);if(a.width===0||a.width===0)throw"omg";const n=new K(s(this,_),a);n.wrapS=i.wrapS,n.wrapT=i.wrapT,n.needsUpdate=!0,t.value=n,e.srcTexture=n,i.dispose()}catch(t){console.error(t)}s(this,Be).set(e.element,!1)}},rr=function(e){const t=o=>o.glslVersion===void 0&&e.glslVersion!==void 0?{...o,glslVersion:e.glslVersion}:o;if(Array.isArray(e.shader))return e.shader.map(t);const i=T(this,C,Rt).call(this,e.shader||"uvGradient");return[t({frag:i})]},et=new WeakMap,Ct=function(e,t,i){const o=ht(t,e.overflow),a=e.isFullScreen||nr(s(this,Me),o),n=ht(s(this,Me),e.intersection.rootMargin),f=Gr(n,t),c=e.isFullScreen||Hr(n,t,f,e.intersection.threshold);!e.isInLogicalViewport&&c&&(e.enterTime=i,e.leaveTime=Number.POSITIVE_INFINITY),e.isInLogicalViewport&&!c&&(e.leaveTime=i),e.isInViewport=a,e.isInLogicalViewport=c;const u=a&&i-e.leaveTime<=e.release;if(u){const m=e.passes[0].uniforms;m.intersection.value=f,m.enterTime.value=i-e.enterTime,m.leaveTime.value=i-e.leaveTime}return{isVisible:u,intersection:f,rectWithOverflow:o}},Rt=function(e){return e in Ut?Ut[e]:e},q=function(e,t,i,o,a){const n=s(this,fe);a&&t!==null&&t!==s(this,D)&&(n.bindFramebuffer(n.FRAMEBUFFER,t.fbo),n.viewport(0,0,t.width,t.height),n.clear(n.COLOR_BUFFER_BIT));const f=o.viewport;f&&f.value instanceof Ne&&f.value.set(i.x*s(this,x),i.y*s(this,x),i.w*s(this,x),i.h*s(this,x));try{Sr(n,s(this,Ue),e,t,i,s(this,ue)[0],s(this,ue)[1],s(this,x))}catch(c){console.error(c)}},at=function(e,t,i){const o=e.passes[0].uniforms.offset.value;o.x=t*s(this,x),o.y=i*s(this,x)},ir=function(e){const t=[],i=[],o=[];for(const n of e)"frag"in n&&o.push(n);for(let n=0;n<o.length-1;n++)o[n].target||(o[n]={...o[n],target:`pass${n}`});for(const n of e){let f,c;"frag"in n?(f=n.frag,c=new Ot(s(this,_),f,n.uniforms,n.persistent??!1,n.float??!1,n.size,n.target!==void 0,n.glslVersion),i.push(n.target)):(f=T(this,C,Rt).call(this,n.shader),c=new Ot(s(this,_),f,n.uniforms,n.persistent??!1,n.float??!1,void 0,!1,n.glslVersion),n.persistent&&c.registerBufferUniform("backbuffer"),i.push(void 0)),s(this,H).push(c),t.push(f);const u={};if(n.uniforms)for(const[m,w]of Object.entries(n.uniforms))typeof w=="function"&&(u[m]=w);s(this,Je).push(u)}g(this,ke,i);for(const n of o)n.target&&s(this,Ce).set(n.target,void 0);const a=i.filter(n=>n!==void 0);for(let n=0;n<s(this,H).length;n++)for(const f of a)t[n].match(new RegExp(`uniform\\s+sampler2D\\s+${f}\\b`))&&s(this,H)[n].registerBufferUniform(f)},sr=function(e,t){if(!s(this,D))return;let i=s(this,D).texture;const o=new Map;for(let a=0;a<s(this,H).length;a++){const n=s(this,H)[a],f=s(this,ke)[a];f&&n.backbuffer&&o.set(f,n.backbuffer.texture)}for(let a=0;a<s(this,H).length;a++){const n=s(this,H)[a],f=a===s(this,H).length-1,c=s(this,Je)[a],u=s(this,ke)[a],m=s(this,he)+s(this,te),w=s(this,de)+s(this,re),l=n.getTargetDimensions();if(l){const[d,v]=l;n.uniforms.src.value=i,n.uniforms.resolution.value.set(d,v),n.uniforms.offset.value.set(0,0),n.uniforms.time.value=t-s(this,Ze),n.uniforms.mouse.value.set(m/e.w*d,w/e.h*v)}else n.setUniforms(i,s(this,x),e,t-s(this,Ze),m,w);n.uniforms.passIndex.value=a,n.updateCustomUniforms(c);for(const[d,v]of o){const y=n.uniforms[d];y&&(y.value=v)}if(f)n.backbuffer?(n.uniforms.backbuffer&&(n.uniforms.backbuffer.value=n.backbuffer.texture),T(this,C,q).call(this,n.pass,n.backbuffer.target,e,n.uniforms,!0),n.backbuffer.swap(),s(this,X).setUniforms(n.backbuffer.texture,s(this,x),e),T(this,C,q).call(this,s(this,X).pass,null,e,s(this,X).uniforms,!1)):T(this,C,q).call(this,n.pass,null,e,n.uniforms,!1);else if(n.backbuffer){n.uniforms.backbuffer&&(n.uniforms.backbuffer.value=n.backbuffer.texture);const d=l?Re(0,0,l[0]/s(this,x),l[1]/s(this,x)):e;T(this,C,q).call(this,n.pass,n.backbuffer.target,d,n.uniforms,!0),n.backbuffer.swap(),i=n.backbuffer.texture,u&&o.set(u,n.backbuffer.texture)}else{const d=u??`postEffect${a}`;let v=s(this,Ce).get(d);const y=l?l[0]:e.w*s(this,x),P=l?l[1]:e.h*s(this,x);(!v||v.width!==y||v.height!==P)&&(v==null||v.dispose(),v=ut(s(this,_),y,P,{float:n.float}),s(this,Ce).set(d,v));const U=l?Re(0,0,l[0]/s(this,x),l[1]/s(this,x)):e;T(this,C,q).call(this,n.pass,v,U,n.uniforms,!0),i=v.texture,u&&o.set(u,v.texture)}}},or=function(e,t){var a;const i=e*s(this,x),o=t*s(this,x);(!s(this,D)||s(this,D).width!==i||s(this,D).height!==o)&&((a=s(this,D))==null||a.dispose(),g(this,D,ut(s(this,_),i,o)));for(const n of s(this,H))n.persistent&&!n.backbuffer?n.initializeBackbuffer(s(this,_),e,t,s(this,x)):n.backbuffer&&n.resizeBackbuffer(e,t)};function nr(r,e){return e.left<=r.right&&e.right>=r.left&&e.top<=r.bottom&&e.bottom>=r.top}function Hr(r,e,t,i){return i===0?nr(r,e):t>=i}function Wr(r){return r===!0?[!0,Dt]:r===void 0?[!1,Dt]:[!1,er(r)]}function qr(r){const e=(r==null?void 0:r.threshold)??0,t=er((r==null?void 0:r.rootMargin)??0);return{threshold:e,rootMargin:t}}function dt(r){return r==="repeat"?"repeat":r==="mirror"?"mirror":"clamp"}function Yr(r){if(!r)return["clamp","clamp"];if(Array.isArray(r))return[dt(r[0]),dt(r[1])];const e=dt(r);return[e,e]}function $t(r,e,t){return Math.max(e,Math.min(t,r))}function jr(){try{const r=document.createElement("canvas");return(r.getContext("webgl2")||r.getContext("webgl"))!==null}catch{return!1}}function Kr(){if(typeof window>"u")throw"Cannot find 'window'. VFX-JS only runs on the browser.";if(typeof document>"u")throw"Cannot find 'document'. VFX-JS only runs on the browser."}function Jr(r){return{position:r?"fixed":"absolute",top:0,left:0,width:"0px",height:"0px","z-index":9999,"pointer-events":"none"}}var F,tt,ie,se,ar,cr,fr,lr;const _t=class _t{constructor(e={}){h(this,se);h(this,F);h(this,tt);h(this,ie,new Map);if(Kr(),!jr())throw new Error("[VFX-JS] WebGL is not available in this environment.");const t=yr(e),i=document.createElement("canvas"),o=Jr(t.fixedCanvas);for(const[a,n]of Object.entries(o))i.style.setProperty(a,n.toString());t.zIndex!==void 0&&i.style.setProperty("z-index",t.zIndex.toString()),(t.wrapper??document.body).appendChild(i),g(this,tt,i),g(this,F,new Xr(t,i)),t.autoplay&&s(this,F).play()}static init(e){try{return new _t(e)}catch{return null}}async add(e,t,i){e instanceof HTMLImageElement?await T(this,se,ar).call(this,e,t):e instanceof HTMLVideoElement?await T(this,se,cr).call(this,e,t):e instanceof HTMLCanvasElement?e.hasAttribute("layoutsubtree")&&i?await s(this,F).addElement(e,t,i):await T(this,se,fr).call(this,e,t):await T(this,se,lr).call(this,e,t)}updateHICTexture(e,t){s(this,F).updateHICTexture(e,t)}get maxTextureSize(){return s(this,F).maxTextureSize}async addHTML(e,t){if(!ur())return console.warn("html-in-canvas not supported, falling back to dom-to-canvas"),this.add(e,t);t.overlay!==void 0&&console.warn("addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.");const{overlay:i,...o}=t;let a=s(this,ie).get(e);a&&s(this,F).removeElement(a);const{canvas:n,initialCapture:f}=await xr(e,{onCapture:c=>{s(this,F).updateHICTexture(n,c)},maxSize:s(this,F).maxTextureSize});a=n,s(this,ie).set(e,a),await s(this,F).addElement(a,o,f)}remove(e){const t=s(this,ie).get(e);t?(Ft(t,e),s(this,ie).delete(e),s(this,F).removeElement(t)):s(this,F).removeElement(e)}async update(e){const t=s(this,ie).get(e);if(t){t.requestPaint();return}if(e instanceof HTMLCanvasElement){s(this,F).updateCanvasElement(e);return}else return s(this,F).updateTextElement(e)}play(){s(this,F).play()}stop(){s(this,F).stop()}render(){s(this,F).render()}destroy(){for(const[e,t]of s(this,ie))Ft(t,e);s(this,ie).clear(),s(this,F).destroy(),s(this,tt).remove()}};F=new WeakMap,tt=new WeakMap,ie=new WeakMap,se=new WeakSet,ar=function(e,t){return e.complete?s(this,F).addElement(e,t):new Promise(i=>{e.addEventListener("load",()=>{s(this,F).addElement(e,t),i()},{once:!0})})},cr=function(e,t){return e.readyState>=3?s(this,F).addElement(e,t):new Promise(i=>{e.addEventListener("canplay",()=>{s(this,F).addElement(e,t),i()},{once:!0})})},fr=function(e,t){return s(this,F).addElement(e,t)},lr=function(e,t){return s(this,F).addElement(e,t)};let Gt=_t;export{Gt as V,pr as a,ur as s,br as t};
