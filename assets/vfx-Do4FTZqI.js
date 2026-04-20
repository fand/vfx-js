let Ae;function Sr(){if(Ae!==void 0)return Ae;try{const r=document.createElement("canvas"),e=r.getContext("2d");Ae=e!==null&&typeof e.drawElementImage=="function"&&typeof r.requestPaint=="function"}catch{Ae=!1}return Ae}var Ye=function(r,e,t,i){function o(s){return s instanceof t?s:new t(function(a){a(s)})}return new(t||(t=Promise))(function(s,a){function l(c){try{u(i.next(c))}catch(d){a(d)}}function f(c){try{u(i.throw(c))}catch(d){a(d)}}function u(c){c.done?s(c.value):o(c.value).then(l,f)}u((i=i.apply(r,e||[])).next())})};function Rr(r){if(!r.src||r.src.startsWith("data:"))return!1;try{return new URL(r.src,location.href).origin!==location.origin}catch{return!1}}function Mr(r){return Ye(this,void 0,void 0,function*(){const t=yield(yield fetch(r)).blob();return URL.createObjectURL(t)})}function Ar(r){return Ye(this,void 0,void 0,function*(){const t=Array.from(r.querySelectorAll("img")).filter(s=>s.complete&&s.naturalWidth>0&&Rr(s));if(t.length===0)return()=>{};const i=new Map,o=[];return yield Promise.all(t.map(s=>Ye(this,void 0,void 0,function*(){try{const a=yield Mr(s.src);i.set(s,s.src),o.push(a),yield new Promise(l=>{s.addEventListener("load",()=>l(),{once:!0}),s.src=a})}catch{}}))),()=>{for(const[s,a]of i)s.src=a;for(const s of o)URL.revokeObjectURL(s)}})}const kr=["margin-top","margin-right","margin-bottom","margin-left"],Ir=["position","top","right","bottom","left","float","flex","flex-grow","flex-shrink","flex-basis","align-self","justify-self","place-self","order","grid-column","grid-column-start","grid-column-end","grid-row","grid-row-start","grid-row-end","grid-area"],Ft=new WeakMap,Ct=new WeakMap,St=new WeakMap,Rt=new WeakMap,Mt=new WeakMap,At=new WeakMap;function Lr(r,e){return Ye(this,void 0,void 0,function*(){const t=r.getContext("2d");if(!t)throw new Error("Failed to get 2d context from layoutsubtree canvas");const{onCapture:i,maxSize:o}=e;let s=null,a=null;const l=new Promise(d=>{a=d});r.onpaint=()=>{const d=r.firstElementChild;if(!d||r.width===0||r.height===0)return;t.clearRect(0,0,r.width,r.height),t.drawElementImage(d,0,0);let v=r.width,p=r.height;if(o&&(v>o||p>o)){const m=Math.min(o/v,o/p);v=Math.floor(v*m),p=Math.floor(p*m)}(!s||s.width!==v||s.height!==p)&&(s=new OffscreenCanvas(v,p));const h=s.getContext("2d");if(h){if(h.clearRect(0,0,v,p),h.drawImage(r,0,0,v,p),t.clearRect(0,0,r.width,r.height),a){a(s),a=null;return}i(s)}};const f=new ResizeObserver(d=>{var v,p;for(const h of d){const m=(v=h.devicePixelContentBoxSize)===null||v===void 0?void 0:v[0];if(m)r.width=m.inlineSize,r.height=m.blockSize;else{const S=(p=h.borderBoxSize)===null||p===void 0?void 0:p[0];if(S){const T=window.devicePixelRatio;r.width=Math.round(S.inlineSize*T),r.height=Math.round(S.blockSize*T)}}}r.requestPaint()});f.observe(r,{box:"device-pixel-content-box"}),Ft.set(r,f);const u=r.firstElementChild;let c="";if(u){const d=new ResizeObserver(v=>{var p;const h=(p=v[0].borderBoxSize)===null||p===void 0?void 0:p[0];if(!h)return;const m=`${Math.round(h.blockSize)}px`;m!==c&&(c=m,r.style.setProperty("height",m))});d.observe(u),Ct.set(r,d)}return l})}function Vr(r){r.onpaint=null;const e=Ft.get(r);e&&(e.disconnect(),Ft.delete(r));const t=Ct.get(r);t&&(t.disconnect(),Ct.delete(r))}function Ur(r,e){return Ye(this,void 0,void 0,function*(){var t;const i=r.getBoundingClientRect(),o=document.createElement("canvas");o.setAttribute("layoutsubtree",""),o.className=r.className;const s=r.getAttribute("style");s&&o.setAttribute("style",s),o.style.setProperty("padding","0"),o.style.setProperty("border","none"),o.style.setProperty("box-sizing","content-box");const a=getComputedStyle(r),l=a.display==="inline"?"block":a.display;o.style.setProperty("display",l);for(const h of kr)o.style.setProperty(h,a.getPropertyValue(h));for(const h of Ir)o.style.setProperty(h,a.getPropertyValue(h));const f=h=>Number.parseFloat(h),u=f(a.paddingLeft)+f(a.paddingRight)+f(a.borderLeftWidth)+f(a.borderRightWidth),c=f(a.paddingTop)+f(a.paddingBottom)+f(a.borderTopWidth)+f(a.borderBottomWidth);u>0&&o.style.setProperty("width",`${i.width}px`),c>0&&o.style.setProperty("height",`${i.height}px`),o.style.width||o.style.setProperty("width","100%"),o.style.height||o.style.setProperty("height",`${i.height}px`);const d=window.devicePixelRatio;o.width=Math.round(i.width*d),o.height=Math.round(i.height*d),St.set(r,r.style.margin),Rt.set(r,r.style.width),Mt.set(r,r.style.boxSizing),(t=r.parentNode)===null||t===void 0||t.insertBefore(o,r),o.appendChild(r),r.style.setProperty("margin","0"),r.style.setProperty("width","100%"),r.style.setProperty("box-sizing","border-box");const v=yield Ar(r);At.set(o,v);const p=yield Lr(o,e);return{canvas:o,initialCapture:p}})}function $t(r,e){var t;Vr(r);const i=At.get(r);i&&(i(),At.delete(r)),(t=r.parentNode)===null||t===void 0||t.insertBefore(e,r),r.remove();const o=St.get(e);o!==void 0&&(e.style.margin=o,St.delete(e));const s=Rt.get(e);s!==void 0&&(e.style.width=s,Rt.delete(e));const a=Mt.get(e);a!==void 0&&(e.style.boxSizing=a,Mt.delete(e))}function Or(r){var e,t,i,o,s;const a=typeof window<"u"?window.devicePixelRatio:1;let l;r.scrollPadding===void 0?l=[.1,.1]:r.scrollPadding===!1?l=[0,0]:Array.isArray(r.scrollPadding)?l=[(e=r.scrollPadding[0])!==null&&e!==void 0?e:.1,(t=r.scrollPadding[1])!==null&&t!==void 0?t:.1]:l=[r.scrollPadding,r.scrollPadding];let f;return r.postEffect===void 0?f=[]:Array.isArray(r.postEffect)?f=r.postEffect:f=[r.postEffect],{pixelRatio:(i=r.pixelRatio)!==null&&i!==void 0?i:a,zIndex:(o=r.zIndex)!==null&&o!==void 0?o:void 0,autoplay:(s=r.autoplay)!==null&&s!==void 0?s:!0,fixedCanvas:r.scrollPadding===!1,scrollPadding:l,wrapper:r.wrapper,postEffects:f}}function jt(r,e,t,i){return{x:r.left+t,y:e-i-r.bottom,w:r.right-r.left,h:r.bottom-r.top}}function Re(r,e,t,i){return{x:r,y:e,w:t,h:i}}var rt=function(r,e,t,i,o){if(i==="m")throw new TypeError("Private method is not writable");if(i==="a"&&!o)throw new TypeError("Private accessor was defined without a setter");if(typeof e=="function"?r!==e||!o:!e.has(r))throw new TypeError("Cannot write private member to an object whose class did not declare it");return i==="a"?o.call(r,t):o?o.value=t:e.set(r,t),t},de=function(r,e,t,i){if(t==="a"&&!i)throw new TypeError("Private accessor was defined without a getter");if(typeof e=="function"?r!==e||!i:!e.has(r))throw new TypeError("Cannot read private member from an object whose class did not declare it");return t==="m"?i:t==="a"?i.call(r):i?i.value:e.get(r)},Ce,it,$e,ke,kt,sr,Ht;class Q{constructor(e,t,i){Ce.add(this),this.wrapS="clamp",this.wrapT="clamp",this.needsUpdate=!0,this.source=null,it.set(this,void 0),$e.set(this,!1),ke.set(this,void 0),rt(this,it,e,"f"),this.gl=e.gl,de(this,Ce,"m",kt).call(this),t&&(this.source=t),rt(this,ke,(i==null?void 0:i.autoRegister)!==!1,"f"),de(this,ke,"f")&&e.addResource(this)}restore(){de(this,Ce,"m",kt).call(this),rt(this,$e,!1,"f"),this.needsUpdate=!0}bind(e){const t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&(de(this,Ce,"m",sr).call(this),this.needsUpdate=!1)}dispose(){de(this,ke,"f")&&de(this,it,"f").removeResource(this),this.gl.deleteTexture(this.texture)}}it=new WeakMap,$e=new WeakMap,ke=new WeakMap,Ce=new WeakSet,kt=function(){const e=this.gl.createTexture();if(!e)throw new Error("[VFX-JS] Failed to create texture");this.texture=e},sr=function(){const e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(i){console.error(i)}else if(!de(this,$e,"f")){const i=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,i)}de(this,Ce,"m",Ht).call(this),rt(this,$e,!0,"f")},Ht=function(){const e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,qt(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,qt(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR)};function qt(r,e){return e==="repeat"?r.REPEAT:e==="mirror"?r.MIRRORED_REPEAT:r.CLAMP_TO_EDGE}function Br(r){return new Promise((e,t)=>{const i=new Image;i.crossOrigin="anonymous",i.onload=()=>e(i),i.onerror=t,i.src=r})}var zr=function(r,e,t,i,o){if(i==="m")throw new TypeError("Private method is not writable");if(i==="a"&&!o)throw new TypeError("Private accessor was defined without a setter");if(typeof e=="function"?r!==e||!o:!e.has(r))throw new TypeError("Cannot write private member to an object whose class did not declare it");return i==="a"?o.call(r,t):o?o.value=t:e.set(r,t),t},Ie=function(r,e,t,i){if(t==="a"&&!i)throw new TypeError("Private accessor was defined without a getter");if(typeof e=="function"?r!==e||!i:!e.has(r))throw new TypeError("Cannot read private member from an object whose class did not declare it");return t==="m"?i:t==="a"?i.call(r):i?i.value:e.get(r)},Le,je,ot;class It{constructor(e,t,i,o={}){var s;Le.add(this),je.set(this,void 0),zr(this,je,e,"f"),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(i)),this.float=(s=o.float)!==null&&s!==void 0?s:!1,this.texture=new Q(e,void 0,{autoRegister:!1}),Ie(this,Le,"m",ot).call(this),e.addResource(this)}setSize(e,t){const i=Math.max(1,Math.floor(e)),o=Math.max(1,Math.floor(t));i===this.width&&o===this.height||(this.width=i,this.height=o,Ie(this,Le,"m",ot).call(this))}restore(){this.texture.restore(),Ie(this,Le,"m",ot).call(this)}dispose(){Ie(this,je,"f").removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}}je=new WeakMap,Le=new WeakSet,ot=function(){const e=this.gl,t=this.fbo,i=e.createFramebuffer();if(!i)throw new Error("[VFX-JS] Failed to create framebuffer");this.fbo=i;const o=this.texture.texture;e.bindTexture(e.TEXTURE_2D,o);const s=Ie(this,je,"f").floatLinearFilter,a=this.float?s?e.RGBA32F:e.RGBA16F:e.RGBA8,l=this.float?s?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,l,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,i),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,o,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};var pe=function(r,e,t,i,o){if(i==="m")throw new TypeError("Private method is not writable");if(i==="a"&&!o)throw new TypeError("Private accessor was defined without a setter");if(typeof e=="function"?r!==e||!o:!e.has(r))throw new TypeError("Cannot write private member to an object whose class did not declare it");return i==="a"?o.call(r,t):o?o.value=t:e.set(r,t),t},$=function(r,e,t,i){if(t==="a"&&!i)throw new TypeError("Private accessor was defined without a getter");if(typeof e=="function"?r!==e||!i:!e.has(r))throw new TypeError("Cannot read private member from an object whose class did not declare it");return t==="m"?i:t==="a"?i.call(r):i?i.value:e.get(r)},Te,Ee,Ve,J;class mt{constructor(e,t,i,o,s){Te.set(this,void 0),Ee.set(this,void 0),Ve.set(this,void 0),J.set(this,void 0),pe(this,Te,t,"f"),pe(this,Ee,i,"f"),pe(this,Ve,o,"f");const a=t*o,l=i*o;pe(this,J,[new It(e,a,l,{float:s}),new It(e,a,l,{float:s})],"f")}get texture(){return $(this,J,"f")[0].texture}get target(){return $(this,J,"f")[1]}resize(e,t){if(e===$(this,Te,"f")&&t===$(this,Ee,"f"))return;pe(this,Te,e,"f"),pe(this,Ee,t,"f");const i=e*$(this,Ve,"f"),o=t*$(this,Ve,"f");$(this,J,"f")[0].setSize(i,o),$(this,J,"f")[1].setSize(i,o)}swap(){pe(this,J,[$(this,J,"f")[1],$(this,J,"f")[0]],"f")}getViewport(){return Re(0,0,$(this,Te,"f"),$(this,Ee,"f"))}dispose(){$(this,J,"f")[0].dispose(),$(this,J,"f")[1].dispose()}}Te=new WeakMap,Ee=new WeakMap,Ve=new WeakMap,J=new WeakMap;const nr=`
precision highp float;
in vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,Xr=`
precision highp float;
attribute vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,ar=`
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
`,L=`precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform bool autoCrop;
uniform sampler2D src;
out vec4 outColor;
`,V=`vec4 readTex(sampler2D tex, vec2 uv) {
    if (autoCrop && (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.)) {
        return vec4(0);
    }
    return texture(tex, uv);
}`,Yt={none:ar,uvGradient:`
    ${L}
    ${V}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        outColor = vec4(uv, sin(time) * .5 + .5, 1);

        vec4 img = readTex(src, uv);
        outColor *= smoothstep(0., 1., img.a);
    }
    `,rainbow:`
    ${L}
    ${V}

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
    ${L}
    ${V}

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
    ${L}
    ${V}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float b = sin(time * 2.) * 32. + 48.;
        uv = floor(uv * b) / b;
        outColor = readTex(src, uv);
    }
    `,rgbGlitch:`
    ${L}
    ${V}

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
    ${L}
    ${V}

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

    ${L}
    ${V}

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
    ${L}
    ${V}

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
    ${L}
    ${V}

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
    ${L}
    ${V}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        outColor = readTex(src, uv) * (sin(time * 5.) * 0.2 + 0.8);
    }

    `,spring:`
    ${L}
    ${V}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        uv = (uv - .5) * (1.05 + sin(time * 5.) * 0.05) + .5;
        outColor = readTex(src, uv);
    }
    `,duotone:`
    ${L}
    ${V}

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
    ${L}
    ${V}

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
    ${L}
    ${V}

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
    ${L}
    uniform float enterTime;
    uniform float leaveTime;

    ${V}

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
    ${L}
    ${V}

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
    ${L}
    ${V}

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
    ${L}
    ${V}

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
    ${L}
    ${V}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);
        outColor = vec4(1.0 - color.rgb, color.a);
    }
    `,grayscale:`
    ${L}
    ${V}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        outColor = vec4(vec3(gray), color.a);
    }
    `,vignette:`
    ${L}
    ${V}

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
    ${L}
    ${V}

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
    `};class le{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}}class Ke{constructor(e=0,t=0,i=0,o=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=i,this.w=o}set(e,t,i,o){return this.x=e,this.y=t,this.z=i,this.w=o,this}}var Ze=function(r,e,t,i,o){if(i==="m")throw new TypeError("Private method is not writable");if(i==="a"&&!o)throw new TypeError("Private accessor was defined without a setter");if(typeof e=="function"?r!==e||!o:!e.has(r))throw new TypeError("Cannot write private member to an object whose class did not declare it");return i==="a"?o.call(r,t):o?o.value=t:e.set(r,t),t},te=function(r,e,t,i){if(t==="a"&&!i)throw new TypeError("Private accessor was defined without a getter");if(typeof e=="function"?r!==e||!i:!e.has(r))throw new TypeError("Cannot read private member from an object whose class did not declare it");return t==="m"?i:t==="a"?i.call(r):i?i.value:e.get(r)},st,nt,gt,wt,He,Me,Lt;function fr(r){return/#version\s+300\s+es\b/.test(r)?"300 es":/#version\s+100\b/.test(r)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(r)?"100":"300 es"}class Dr{constructor(e,t,i,o){st.add(this),nt.set(this,void 0),gt.set(this,void 0),wt.set(this,void 0),He.set(this,void 0),Me.set(this,new Map),Ze(this,nt,e,"f"),this.gl=e.gl,Ze(this,gt,t,"f"),Ze(this,wt,i,"f"),Ze(this,He,o??fr(i),"f"),te(this,st,"m",Lt).call(this),e.addResource(this)}restore(){te(this,st,"m",Lt).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return te(this,Me,"f").has(e)}uploadUniforms(e){const t=this.gl;let i=0;for(const[o,s]of te(this,Me,"f")){const a=e[o];if(!a)continue;const l=a.value;if(l!=null){if(Wr(s.type)){l instanceof Q&&(l.bind(i),t.uniform1i(s.location,i),i++);continue}l instanceof Q||Nr(t,s,l)}}}dispose(){te(this,nt,"f").removeResource(this),this.gl.deleteProgram(this.program)}}nt=new WeakMap,gt=new WeakMap,wt=new WeakMap,He=new WeakMap,Me=new WeakMap,st=new WeakSet,Lt=function(){var e;const t=this.gl,i=Kt(t,t.VERTEX_SHADER,Jt(te(this,gt,"f"),te(this,He,"f"))),o=Kt(t,t.FRAGMENT_SHADER,Jt(te(this,wt,"f"),te(this,He,"f"))),s=t.createProgram();if(!s)throw new Error("[VFX-JS] Failed to create program");if(t.attachShader(s,i),t.attachShader(s,o),t.bindAttribLocation(s,0,"position"),t.linkProgram(s),!t.getProgramParameter(s,t.LINK_STATUS)){const l=(e=t.getProgramInfoLog(s))!==null&&e!==void 0?e:"";throw t.deleteShader(i),t.deleteShader(o),t.deleteProgram(s),new Error(`[VFX-JS] Program link failed: ${l}`)}t.detachShader(s,i),t.detachShader(s,o),t.deleteShader(i),t.deleteShader(o),this.program=s,te(this,Me,"f").clear();const a=t.getProgramParameter(s,t.ACTIVE_UNIFORMS);for(let l=0;l<a;l++){const f=t.getActiveUniform(s,l);if(!f)continue;const u=f.name.replace(/\[0\]$/,""),c=t.getUniformLocation(s,f.name);c&&te(this,Me,"f").set(u,{location:c,type:f.type,size:f.size})}};function Kt(r,e,t){var i;const o=r.createShader(e);if(!o)throw new Error("[VFX-JS] Failed to create shader");if(r.shaderSource(o,t),r.compileShader(o),!r.getShaderParameter(o,r.COMPILE_STATUS)){const s=(i=r.getShaderInfoLog(o))!==null&&i!==void 0?i:"";throw r.deleteShader(o),new Error(`[VFX-JS] Shader compile failed: ${s}

${t}`)}return o}function Jt(r,e){return r.replace(/^\s+/,"").startsWith("#version")||e==="100"?r:`#version 300 es
${r}`}function Wr(r){return r===35678||r===36298||r===36306||r===35682}const Qt=new Set;function Nr(r,e,t){const i=e.location,o=e.size>1,s=t,a=t,l=t;switch(e.type){case r.FLOAT:o?r.uniform1fv(i,s):r.uniform1f(i,t);return;case r.FLOAT_VEC2:if(o)r.uniform2fv(i,s);else if(t instanceof le)r.uniform2f(i,t.x,t.y);else{const f=t;r.uniform2f(i,f[0],f[1])}return;case r.FLOAT_VEC3:if(o)r.uniform3fv(i,s);else{const f=t;r.uniform3f(i,f[0],f[1],f[2])}return;case r.FLOAT_VEC4:if(o)r.uniform4fv(i,s);else if(t instanceof Ke)r.uniform4f(i,t.x,t.y,t.z,t.w);else{const f=t;r.uniform4f(i,f[0],f[1],f[2],f[3])}return;case r.INT:o?r.uniform1iv(i,a):r.uniform1i(i,t);return;case r.INT_VEC2:if(o)r.uniform2iv(i,a);else{const f=t;r.uniform2i(i,f[0],f[1])}return;case r.INT_VEC3:if(o)r.uniform3iv(i,a);else{const f=t;r.uniform3i(i,f[0],f[1],f[2])}return;case r.INT_VEC4:if(o)r.uniform4iv(i,a);else{const f=t;r.uniform4i(i,f[0],f[1],f[2],f[3])}return;case r.BOOL:o?r.uniform1iv(i,a):r.uniform1i(i,t?1:0);return;case r.BOOL_VEC2:if(o)r.uniform2iv(i,a);else{const f=t;r.uniform2i(i,f[0]?1:0,f[1]?1:0)}return;case r.BOOL_VEC3:if(o)r.uniform3iv(i,a);else{const f=t;r.uniform3i(i,f[0]?1:0,f[1]?1:0,f[2]?1:0)}return;case r.BOOL_VEC4:if(o)r.uniform4iv(i,a);else{const f=t;r.uniform4i(i,f[0]?1:0,f[1]?1:0,f[2]?1:0,f[3]?1:0)}return;case r.FLOAT_MAT2:r.uniformMatrix2fv(i,!1,s);return;case r.FLOAT_MAT3:r.uniformMatrix3fv(i,!1,s);return;case r.FLOAT_MAT4:r.uniformMatrix4fv(i,!1,s);return;case r.UNSIGNED_INT:o?r.uniform1uiv(i,l):r.uniform1ui(i,t);return;case r.UNSIGNED_INT_VEC2:if(o)r.uniform2uiv(i,l);else{const f=t;r.uniform2ui(i,f[0],f[1])}return;case r.UNSIGNED_INT_VEC3:if(o)r.uniform3uiv(i,l);else{const f=t;r.uniform3ui(i,f[0],f[1],f[2])}return;case r.UNSIGNED_INT_VEC4:if(o)r.uniform4uiv(i,l);else{const f=t;r.uniform4ui(i,f[0],f[1],f[2],f[3])}return;default:Qt.has(e.type)||(Qt.add(e.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${e.type.toString(16)}; skipping upload.`));return}}class cr{constructor(e,t,i,o,s,a){this.gl=e.gl,this.program=new Dr(e,t,i,a),this.uniforms=o,this.blend=s}dispose(){this.program.dispose()}}function Gr(r,e,t,i,o,s,a,l){const f=i?i.width/l:s,u=i?i.height/l:a,c=Math.max(0,o.x),d=Math.max(0,o.y),v=Math.min(f,o.x+o.w),p=Math.min(u,o.y+o.h),h=v-c,m=p-d;h<=0||m<=0||(r.bindFramebuffer(r.FRAMEBUFFER,i?i.fbo:null),r.viewport(Math.round(c*l),Math.round(d*l),Math.round(h*l),Math.round(m*l)),$r(r,t.blend),t.program.use(),t.program.uploadUniforms(t.uniforms),e.draw())}function $r(r,e){if(e==="none"){r.disable(r.BLEND);return}r.enable(r.BLEND),r.blendEquation(r.FUNC_ADD),e==="premultiplied"?r.blendFuncSeparate(r.ONE,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA):r.blendFuncSeparate(r.SRC_ALPHA,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA)}class jr{constructor(e){this.uniforms={src:{value:null},offset:{value:new le},resolution:{value:new le},viewport:{value:new Ke}},this.pass=new cr(e,nr,ar,this.uniforms,"premultiplied")}setUniforms(e,t,i){this.uniforms.src.value=e,this.uniforms.resolution.value.set(i.w*t,i.h*t),this.uniforms.offset.value.set(i.x*t,i.y*t)}dispose(){this.pass.dispose()}}var Wt=function(r,e,t,i){function o(s){return s instanceof t?s:new t(function(a){a(s)})}return new(t||(t=Promise))(function(s,a){function l(c){try{u(i.next(c))}catch(d){a(d)}}function f(c){try{u(i.throw(c))}catch(d){a(d)}}function u(c){c.done?s(c.value):o(c.value).then(l,f)}u((i=i.apply(r,e||[])).next())})};const Hr=r=>{const e=document.implementation.createHTMLDocument("test"),t=e.createRange();t.selectNodeContents(e.documentElement),t.deleteContents();const i=document.createElement("head");return e.documentElement.appendChild(i),e.documentElement.appendChild(t.createContextualFragment(r)),e.documentElement.setAttribute("xmlns",e.documentElement.namespaceURI),new XMLSerializer().serializeToString(e).replace(/<!DOCTYPE html>/,"")};function lr(r,e,t,i){return Wt(this,void 0,void 0,function*(){const o=r.getBoundingClientRect(),s=window.devicePixelRatio,a=o.width*s,l=o.height*s;let f=1,u=a,c=l;i&&(u>i||c>i)&&(f=Math.min(i/u,i/c),u=Math.floor(u*f),c=Math.floor(c*f));const d=t&&t.width===u&&t.height===c?t:new OffscreenCanvas(u,c),v=r.cloneNode(!0);yield ur(r,v),dr(r,v),v.style.setProperty("opacity",e.toString()),v.style.setProperty("margin","0px"),qr(v);const p=v.outerHTML,h=Hr(p),m=`<svg xmlns="http://www.w3.org/2000/svg" width="${a}" height="${l}"><foreignObject width="100%" height="100%">${h}</foreignObject></svg>`;return new Promise((S,T)=>{const R=new Image;R.onload=()=>{const E=d.getContext("2d");if(E===null)return T();E.clearRect(0,0,u,c);const x=s*f;E.scale(x,x),E.drawImage(R,0,0,a,l),E.setTransform(1,0,0,1,0,0),S(d)},R.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(m)}`})})}function ur(r,e){return Wt(this,void 0,void 0,function*(){const t=window.getComputedStyle(r);for(const i of Array.from(t))/(-inline-|-block-|^inline-|^block-)/.test(i)||/^-webkit-.*(start|end|before|after|logical)/.test(i)||e.style.setProperty(i,t.getPropertyValue(i),t.getPropertyPriority(i));if(e.tagName==="INPUT")e.setAttribute("value",e.value);else if(e.tagName==="TEXTAREA")e.innerHTML=e.value;else if(e.tagName==="IMG")try{e.src=yield Yr(r.src)}catch{}for(let i=0;i<r.children.length;i++){const o=r.children[i],s=e.children[i];yield ur(o,s)}})}function dr(r,e){if(typeof r.computedStyleMap=="function")try{const t=r.computedStyleMap();for(const i of["margin-top","margin-right","margin-bottom","margin-left"]){const o=t.get(i);o instanceof CSSKeywordValue&&o.value==="auto"&&e.style.setProperty(i,"auto")}}catch{}for(let t=0;t<r.children.length;t++){const i=r.children[t],o=e.children[t];i instanceof HTMLElement&&o instanceof HTMLElement&&dr(i,o)}}function qr(r){let e=r;for(;;){const t=e.style;if(Number.parseFloat(t.paddingTop)>0||Number.parseFloat(t.borderTopWidth)>0||t.getPropertyValue("overflow-x")&&t.getPropertyValue("overflow-x")!=="visible"||t.getPropertyValue("overflow-y")&&t.getPropertyValue("overflow-y")!=="visible"||t.display==="flex"||t.display==="grid"||t.display==="flow-root"||t.display==="inline-block")break;const i=e.firstElementChild;if(!i)break;i.style.setProperty("margin-top","0px"),e=i}for(e=r;;){const t=e.style;if(Number.parseFloat(t.paddingBottom)>0||Number.parseFloat(t.borderBottomWidth)>0||t.getPropertyValue("overflow-x")&&t.getPropertyValue("overflow-x")!=="visible"||t.getPropertyValue("overflow-y")&&t.getPropertyValue("overflow-y")!=="visible"||t.display==="flex"||t.display==="grid"||t.display==="flow-root"||t.display==="inline-block")break;const i=e.lastElementChild;if(!i)break;i.style.setProperty("margin-bottom","0px"),e=i}}function Yr(r){return Wt(this,void 0,void 0,function*(){const e=yield fetch(r).then(t=>t.blob());return new Promise(t=>{const i=new FileReader;i.onload=function(){t(this.result)},i.readAsDataURL(e)})})}function he(r){this.data=r,this.pos=0}he.prototype.readByte=function(){return this.data[this.pos++]};he.prototype.peekByte=function(){return this.data[this.pos]};he.prototype.readBytes=function(r){return this.data.subarray(this.pos,this.pos+=r)};he.prototype.peekBytes=function(r){return this.data.subarray(this.pos,this.pos+r)};he.prototype.readString=function(r){for(var e="",t=0;t<r;t++)e+=String.fromCharCode(this.readByte());return e};he.prototype.readBitArray=function(){for(var r=[],e=this.readByte(),t=7;t>=0;t--)r.push(!!(e&1<<t));return r};he.prototype.readUnsigned=function(r){var e=this.readBytes(2);return r?(e[1]<<8)+e[0]:(e[0]<<8)+e[1]};function Je(r){this.stream=new he(r),this.output={}}Je.prototype.parse=function(r){return this.parseParts(this.output,r),this.output};Je.prototype.parseParts=function(r,e){for(var t=0;t<e.length;t++){var i=e[t];this.parsePart(r,i)}};Je.prototype.parsePart=function(r,e){var t=e.label,i;if(!(e.requires&&!e.requires(this.stream,this.output,r)))if(e.loop){for(var o=[];e.loop(this.stream);){var s={};this.parseParts(s,e.parts),o.push(s)}r[t]=o}else e.parts?(i={},this.parseParts(i,e.parts),r[t]=i):e.parser?(i=e.parser(this.stream,this.output,r),e.skip||(r[t]=i)):e.bits&&(r[t]=this.parseBits(e.bits))};function Kr(r){return r.reduce(function(e,t){return e*2+t},0)}Je.prototype.parseBits=function(r){var e={},t=this.stream.readBitArray();for(var i in r){var o=r[i];o.length?e[i]=Kr(t.slice(o.index,o.index+o.length)):e[i]=t[o.index]}return e};var k={readByte:function(){return function(r){return r.readByte()}},readBytes:function(r){return function(e){return e.readBytes(r)}},readString:function(r){return function(e){return e.readString(r)}},readUnsigned:function(r){return function(e){return e.readUnsigned(r)}},readArray:function(r,e){return function(t,i,o){for(var s=e(t,i,o),a=new Array(s),l=0;l<s;l++)a[l]=t.readBytes(r);return a}}},xt={label:"blocks",parser:function(r){for(var e=[],t=0,i=0,o=r.readByte();o!==i;o=r.readByte())e.push(r.readBytes(o)),t+=o;var s=new Uint8Array(t);t=0;for(var a=0;a<e.length;a++)s.set(e[a],t),t+=e[a].length;return s}},Jr={label:"gce",requires:function(r){var e=r.peekBytes(2);return e[0]===33&&e[1]===249},parts:[{label:"codes",parser:k.readBytes(2),skip:!0},{label:"byteSize",parser:k.readByte()},{label:"extras",bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:"delay",parser:k.readUnsigned(!0)},{label:"transparentColorIndex",parser:k.readByte()},{label:"terminator",parser:k.readByte(),skip:!0}]},Qr={label:"image",requires:function(r){var e=r.peekByte();return e===44},parts:[{label:"code",parser:k.readByte(),skip:!0},{label:"descriptor",parts:[{label:"left",parser:k.readUnsigned(!0)},{label:"top",parser:k.readUnsigned(!0)},{label:"width",parser:k.readUnsigned(!0)},{label:"height",parser:k.readUnsigned(!0)},{label:"lct",bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:"lct",requires:function(r,e,t){return t.descriptor.lct.exists},parser:k.readArray(3,function(r,e,t){return Math.pow(2,t.descriptor.lct.size+1)})},{label:"data",parts:[{label:"minCodeSize",parser:k.readByte()},xt]}]},Zr={label:"text",requires:function(r){var e=r.peekBytes(2);return e[0]===33&&e[1]===1},parts:[{label:"codes",parser:k.readBytes(2),skip:!0},{label:"blockSize",parser:k.readByte()},{label:"preData",parser:function(r,e,t){return r.readBytes(t.text.blockSize)}},xt]},ei={label:"application",requires:function(r,e,t){var i=r.peekBytes(2);return i[0]===33&&i[1]===255},parts:[{label:"codes",parser:k.readBytes(2),skip:!0},{label:"blockSize",parser:k.readByte()},{label:"id",parser:function(r,e,t){return r.readString(t.blockSize)}},xt]},ti={label:"comment",requires:function(r,e,t){var i=r.peekBytes(2);return i[0]===33&&i[1]===254},parts:[{label:"codes",parser:k.readBytes(2),skip:!0},xt]},ri={label:"frames",parts:[Jr,ei,ti,Qr,Zr],loop:function(r){var e=r.peekByte();return e===33||e===44}},ii=[{label:"header",parts:[{label:"signature",parser:k.readString(3)},{label:"version",parser:k.readString(3)}]},{label:"lsd",parts:[{label:"width",parser:k.readUnsigned(!0)},{label:"height",parser:k.readUnsigned(!0)},{label:"gct",bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:"backgroundColorIndex",parser:k.readByte()},{label:"pixelAspectRatio",parser:k.readByte()}]},{label:"gct",requires:function(r,e){return e.lsd.gct.exists},parser:k.readArray(3,function(r,e){return Math.pow(2,e.lsd.gct.size+1)})},ri];function Nt(r){var e=new Uint8Array(r),t=new Je(e);this.raw=t.parse(ii),this.raw.hasImages=!1;for(var i=0;i<this.raw.frames.length;i++)if(this.raw.frames[i].image){this.raw.hasImages=!0;break}}Nt.prototype.decompressFrame=function(r,e){if(r>=this.raw.frames.length)return null;var t=this.raw.frames[r];if(t.image){var i=t.image.descriptor.width*t.image.descriptor.height,o=a(t.image.data.minCodeSize,t.image.data.blocks,i);t.image.descriptor.lct.interlaced&&(o=l(o,t.image.descriptor.width));var s={pixels:o,dims:{top:t.image.descriptor.top,left:t.image.descriptor.left,width:t.image.descriptor.width,height:t.image.descriptor.height}};return t.image.descriptor.lct&&t.image.descriptor.lct.exists?s.colorTable=t.image.lct:s.colorTable=this.raw.gct,t.gce&&(s.delay=(t.gce.delay||10)*10,s.disposalType=t.gce.extras.disposal,t.gce.extras.transparentColorGiven&&(s.transparentIndex=t.gce.transparentColorIndex)),e&&(s.patch=f(s)),s}return null;function a(u,c,d){var v=4096,p=-1,h=d,m,S,T,R,E,x,g,U,P,W,N,I,O,Z,ve,_e,y=new Array(d),F=new Array(v),B=new Array(v),G=new Array(v+1);for(I=u,S=1<<I,E=S+1,m=S+2,g=p,R=I+1,T=(1<<R)-1,P=0;P<S;P++)F[P]=0,B[P]=P;for(N=U=O=Z=_e=ve=0,W=0;W<h;){if(Z===0){if(U<R){N+=c[ve]<<U,U+=8,ve++;continue}if(P=N&T,N>>=R,U-=R,P>m||P==E)break;if(P==S){R=I+1,T=(1<<R)-1,m=S+2,g=p;continue}if(g==p){G[Z++]=B[P],g=P,O=P;continue}for(x=P,P==m&&(G[Z++]=O,P=g);P>S;)G[Z++]=B[P],P=F[P];O=B[P]&255,G[Z++]=O,m<v&&(F[m]=g,B[m]=O,m++,(m&T)===0&&m<v&&(R++,T+=m)),g=x}Z--,y[_e++]=G[Z],W++}for(W=_e;W<h;W++)y[W]=0;return y}function l(u,c){for(var d=new Array(u.length),v=u.length/c,p=function(E,x){var g=u.slice(x*c,(x+1)*c);d.splice.apply(d,[E*c,c].concat(g))},h=[0,4,2,1],m=[8,8,4,2],S=0,T=0;T<4;T++)for(var R=h[T];R<v;R+=m[T])p(R,S),S++;return d}function f(u){for(var c=u.pixels.length,d=new Uint8ClampedArray(c*4),v=0;v<c;v++){var p=v*4,h=u.pixels[v],m=u.colorTable[h];d[p]=m[0],d[p+1]=m[1],d[p+2]=m[2],d[p+3]=h!==u.transparentIndex?255:0}return d}};Nt.prototype.decompressFrames=function(r,e,t){e===void 0&&(e=0),t===void 0?t=this.raw.frames.length:t=Math.min(t,this.raw.frames.length);for(var i=[],o=e;o<t;o++){var s=this.raw.frames[o];s.image&&i.push(this.decompressFrame(o,r))}return i};var oi=function(r,e,t,i){function o(s){return s instanceof t?s:new t(function(a){a(s)})}return new(t||(t=Promise))(function(s,a){function l(c){try{u(i.next(c))}catch(d){a(d)}}function f(c){try{u(i.throw(c))}catch(d){a(d)}}function u(c){c.done?s(c.value):o(c.value).then(l,f)}u((i=i.apply(r,e||[])).next())})};class Gt{static create(e,t){return oi(this,void 0,void 0,function*(){const i=yield fetch(e).then(l=>l.arrayBuffer()).then(l=>new Nt(l)),o=i.decompressFrames(!0,void 0,void 0),{width:s,height:a}=i.raw.lsd;return new Gt(o,s,a,t)})}constructor(e,t,i,o){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement("canvas"),this.ctx=this.canvas.getContext("2d"),this.pixelRatio=o,this.canvas.width=t,this.canvas.height=i,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){const t=Date.now()-this.startTime;for(;this.playTime<t;){const s=this.frames[this.index%this.frames.length];this.playTime+=s.delay,this.index++}const i=this.frames[this.index%this.frames.length],o=new ImageData(i.patch,i.dims.width,i.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(o,i.dims.left,i.dims.top)}}var ee=function(r,e,t,i){if(t==="a"&&!i)throw new TypeError("Private accessor was defined without a getter");if(typeof e=="function"?r!==e||!i:!e.has(r))throw new TypeError("Cannot read private member from an object whose class did not declare it");return t==="m"?i:t==="a"?i.call(r):i?i.value:e.get(r)},Ue,Oe,Be,Vt,Ut;class si{constructor(e){this.isContextLost=!1,Ue.set(this,new Set),Oe.set(this,new Set),Be.set(this,new Set),Vt.set(this,i=>{i.preventDefault(),this.isContextLost=!0;for(const o of ee(this,Oe,"f"))o()}),Ut.set(this,()=>{this.isContextLost=!1;const i=this.gl;i.getExtension("EXT_color_buffer_float"),i.getExtension("EXT_color_buffer_half_float");for(const o of ee(this,Ue,"f"))o.restore();for(const o of ee(this,Be,"f"))o()});const t=e.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1});if(!t)throw new Error("[VFX-JS] WebGL2 is not available.");this.gl=t,this.canvas=e,t.getExtension("EXT_color_buffer_float"),t.getExtension("EXT_color_buffer_half_float"),this.floatLinearFilter=!!t.getExtension("OES_texture_float_linear"),this.maxTextureSize=t.getParameter(t.MAX_TEXTURE_SIZE),e.addEventListener("webglcontextlost",ee(this,Vt,"f"),!1),e.addEventListener("webglcontextrestored",ee(this,Ut,"f"),!1)}setSize(e,t,i){const o=Math.floor(e*i),s=Math.floor(t*i);(this.canvas.width!==o||this.canvas.height!==s)&&(this.canvas.width=o,this.canvas.height=s)}addResource(e){ee(this,Ue,"f").add(e)}removeResource(e){ee(this,Ue,"f").delete(e)}onContextLost(e){return ee(this,Oe,"f").add(e),()=>ee(this,Oe,"f").delete(e)}onContextRestored(e){return ee(this,Be,"f").add(e),()=>ee(this,Be,"f").delete(e)}}Ue=new WeakMap,Oe=new WeakMap,Be=new WeakMap,Vt=new WeakMap,Ut=new WeakMap;var hr=function(r,e,t,i,o){if(i==="m")throw new TypeError("Private method is not writable");if(i==="a"&&!o)throw new TypeError("Private accessor was defined without a setter");if(typeof e=="function"?r!==e||!o:!e.has(r))throw new TypeError("Cannot write private member to an object whose class did not declare it");return i==="a"?o.call(r,t):o?o.value=t:e.set(r,t),t},et=function(r,e,t,i){if(t==="a"&&!i)throw new TypeError("Private accessor was defined without a getter");if(typeof e=="function"?r!==e||!i:!e.has(r))throw new TypeError("Cannot read private member from an object whose class did not declare it");return t==="m"?i:t==="a"?i.call(r):i?i.value:e.get(r)},at,ft,yt,Ot;class ni{constructor(e){at.add(this),ft.set(this,void 0),yt.set(this,void 0),hr(this,ft,e,"f"),this.gl=e.gl,et(this,at,"m",Ot).call(this),e.addResource(this)}restore(){et(this,at,"m",Ot).call(this)}draw(){const e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){et(this,ft,"f").removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(et(this,yt,"f"))}}ft=new WeakMap,yt=new WeakMap,at=new WeakSet,Ot=function(){const e=this.gl,t=e.createVertexArray(),i=e.createBuffer();if(!t||!i)throw new Error("[VFX-JS] Failed to create quad VAO");this.vao=t,hr(this,yt,i,"f");const o=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,i),e.bufferData(e.ARRAY_BUFFER,o,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function Bt(r,e,t,i={}){var o;return new It(r,e,t,{float:(o=i.float)!==null&&o!==void 0?o:!1})}function vr(r,e){var t,i,o;const s=(t=e.renderingToBuffer)!==null&&t!==void 0?t:!1;let a;s?a="none":e.premultipliedAlpha?a="premultiplied":a="normal";const l=(i=e.glslVersion)!==null&&i!==void 0?i:fr(e.fragmentShader),f=(o=e.vertexShader)!==null&&o!==void 0?o:l==="100"?Xr:nr;return new cr(r,f,e.fragmentShader,e.uniforms,a,l)}var me=function(r,e,t,i,o){if(i==="m")throw new TypeError("Private method is not writable");if(i==="a"&&!o)throw new TypeError("Private accessor was defined without a setter");if(typeof e=="function"?r!==e||!o:!e.has(r))throw new TypeError("Cannot write private member to an object whose class did not declare it");return i==="a"?o.call(r,t):o?o.value=t:e.set(r,t),t},_=function(r,e,t,i){if(t==="a"&&!i)throw new TypeError("Private accessor was defined without a getter");if(typeof e=="function"?r!==e||!i:!e.has(r))throw new TypeError("Cannot read private member from an object whose class did not declare it");return t==="m"?i:t==="a"?i.call(r):i?i.value:e.get(r)},X,ze,oe,Xe,Pe,se;class Zt{constructor(e,t,i,o,s,a,l,f){if(X.set(this,void 0),ze.set(this,void 0),oe.set(this,void 0),Xe.set(this,void 0),Pe.set(this,void 0),se.set(this,void 0),me(this,Xe,o??!1,"f"),me(this,Pe,s??!1,"f"),me(this,se,a,"f"),me(this,ze,{},"f"),me(this,X,{src:{value:null},offset:{value:new le},resolution:{value:new le},viewport:{value:new Ke},time:{value:0},mouse:{value:new le},passIndex:{value:0}},"f"),i)for(const[u,c]of Object.entries(i))typeof c=="function"?(_(this,ze,"f")[u]=c,_(this,X,"f")[u]={value:c()}):_(this,X,"f")[u]={value:c};this.pass=vr(e,{fragmentShader:t,uniforms:_(this,X,"f"),renderingToBuffer:l??!1,premultipliedAlpha:!0,glslVersion:f})}get uniforms(){return _(this,X,"f")}setUniforms(e,t,i,o,s,a){_(this,X,"f").src.value=e,_(this,X,"f").resolution.value.set(i.w*t,i.h*t),_(this,X,"f").offset.value.set(i.x*t,i.y*t),_(this,X,"f").time.value=o,_(this,X,"f").mouse.value.set(s*t,a*t)}updateCustomUniforms(e){for(const[t,i]of Object.entries(_(this,ze,"f")))_(this,X,"f")[t]&&(_(this,X,"f")[t].value=i());if(e)for(const[t,i]of Object.entries(e))_(this,X,"f")[t]&&(_(this,X,"f")[t].value=i())}initializeBackbuffer(e,t,i,o){_(this,Xe,"f")&&!_(this,oe,"f")&&(_(this,se,"f")?me(this,oe,new mt(e,_(this,se,"f")[0],_(this,se,"f")[1],1,_(this,Pe,"f")),"f"):me(this,oe,new mt(e,t,i,o,_(this,Pe,"f")),"f"))}resizeBackbuffer(e,t){_(this,oe,"f")&&!_(this,se,"f")&&_(this,oe,"f").resize(e,t)}registerBufferUniform(e){_(this,X,"f")[e]||(_(this,X,"f")[e]={value:null})}get backbuffer(){return _(this,oe,"f")}get persistent(){return _(this,Xe,"f")}get float(){return _(this,Pe,"f")}get size(){return _(this,se,"f")}getTargetDimensions(){return _(this,se,"f")}dispose(){var e;this.pass.dispose(),(e=_(this,oe,"f"))===null||e===void 0||e.dispose()}}X=new WeakMap,ze=new WeakMap,oe=new WeakMap,Xe=new WeakMap,Pe=new WeakMap,se=new WeakMap;function ai(r,e,t,i){return{top:r,right:e,bottom:t,left:i}}function pr(r){var e,t,i,o;return typeof r=="number"?{top:r,right:r,bottom:r,left:r}:Array.isArray(r)?{top:r[0],right:r[1],bottom:r[2],left:r[3]}:{top:(e=r.top)!==null&&e!==void 0?e:0,right:(t=r.right)!==null&&t!==void 0?t:0,bottom:(i=r.bottom)!==null&&i!==void 0?i:0,left:(o=r.left)!==null&&o!==void 0?o:0}}function mr(r){return pr(r)}const er=ai(0,0,0,0);function bt(r){return pr(r)}function tr(r){return{top:r.top,right:r.right,bottom:r.bottom,left:r.left}}function zt(r,e){return{top:r.top-e.top,right:r.right+e.right,bottom:r.bottom+e.bottom,left:r.left-e.left}}function tt(r,e,t){return Math.min(Math.max(r,e),t)}function fi(r,e){const t=tt(e.left,r.left,r.right),o=(tt(e.right,r.left,r.right)-t)/(e.right-e.left),s=tt(e.top,r.top,r.bottom),l=(tt(e.bottom,r.top,r.bottom)-s)/(e.bottom-e.top);return o*l}var Xt=function(r,e,t,i){function o(s){return s instanceof t?s:new t(function(a){a(s)})}return new(t||(t=Promise))(function(s,a){function l(c){try{u(i.next(c))}catch(d){a(d)}}function f(c){try{u(i.throw(c))}catch(d){a(d)}}function u(c){c.done?s(c.value):o(c.value).then(l,f)}u((i=i.apply(r,e||[])).next())})},z=function(r,e,t,i,o){if(i==="m")throw new TypeError("Private method is not writable");if(i==="a"&&!o)throw new TypeError("Private accessor was defined without a setter");if(typeof e=="function"?r!==e||!o:!e.has(r))throw new TypeError("Cannot write private member to an object whose class did not declare it");return i==="a"?o.call(r,t):o?o.value=t:e.set(r,t),t},n=function(r,e,t,i){if(t==="a"&&!i)throw new TypeError("Private accessor was defined without a getter");if(typeof e=="function"?r!==e||!i:!e.has(r))throw new TypeError("Cannot read private member from an object whose class did not declare it");return t==="m"?i:t==="a"?i.call(r):i?i.value:e.get(r)},C,ie,ce,M,we,qe,q,H,De,D,ct,Se,ue,w,j,lt,ye,We,ge,ae,fe,be,xe,Ne,gr,Ge,ut,dt,wr,ht,Dt,Tt,Y,vt,yr,br,xr;const rr=new Map;class ci{constructor(e,t){C.add(this),ie.set(this,void 0),ce.set(this,void 0),M.set(this,void 0),we.set(this,void 0),qe.set(this,void 0),q.set(this,void 0),H.set(this,[]),De.set(this,[]),D.set(this,void 0),ct.set(this,[]),Se.set(this,new Map),ue.set(this,void 0),w.set(this,2),j.set(this,[]),lt.set(this,Date.now()/1e3),ye.set(this,bt(0)),We.set(this,bt(0)),ge.set(this,[0,0]),ae.set(this,0),fe.set(this,0),be.set(this,0),xe.set(this,0),Ne.set(this,new WeakMap),Ge.set(this,()=>Xt(this,void 0,void 0,function*(){if(typeof window<"u"){for(const i of n(this,j,"f"))if(i.type==="text"&&i.isInViewport){const o=i.element.getBoundingClientRect();(o.width!==i.width||o.height!==i.height)&&(yield n(this,C,"m",dt).call(this,i),i.width=o.width,i.height=o.height)}for(const i of n(this,j,"f"))if(i.type==="text"&&!i.isInViewport){const o=i.element.getBoundingClientRect();(o.width!==i.width||o.height!==i.height)&&(yield n(this,C,"m",dt).call(this,i),i.width=o.width,i.height=o.height)}}})),ut.set(this,i=>{typeof window<"u"&&(z(this,be,i.clientX,"f"),z(this,xe,window.innerHeight-i.clientY,"f"))}),ht.set(this,()=>{this.isPlaying()&&(this.render(),z(this,ue,requestAnimationFrame(n(this,ht,"f")),"f"))}),z(this,ie,e,"f"),z(this,ce,t,"f"),z(this,M,new si(t),"f"),z(this,we,n(this,M,"f").gl,"f"),n(this,we,"f").clearColor(0,0,0,0),z(this,w,e.pixelRatio,"f"),z(this,qe,new ni(n(this,M,"f")),"f"),typeof window<"u"&&(window.addEventListener("resize",n(this,Ge,"f")),window.addEventListener("pointermove",n(this,ut,"f"))),n(this,Ge,"f").call(this),z(this,q,new jr(n(this,M,"f")),"f"),n(this,C,"m",yr).call(this,e.postEffects),n(this,M,"f").onContextRestored(()=>{n(this,we,"f").clearColor(0,0,0,0)})}destroy(){var e;this.stop(),typeof window<"u"&&(window.removeEventListener("resize",n(this,Ge,"f")),window.removeEventListener("pointermove",n(this,ut,"f"))),(e=n(this,D,"f"))===null||e===void 0||e.dispose();for(const t of n(this,Se,"f").values())t==null||t.dispose();for(const t of n(this,H,"f"))t.dispose();n(this,q,"f").dispose(),n(this,qe,"f").dispose()}addElement(e){return Xt(this,arguments,void 0,function*(t,i={},o){var s,a,l,f;const u=n(this,C,"m",wr).call(this,i),c=t.getBoundingClientRect(),d=tr(c),[v,p]=ui(i.overflow),h=zt(d,p),m=di(i.intersection),S=t.style.opacity===""?1:Number.parseFloat(t.style.opacity);let T,R,E=!1;if(t instanceof HTMLImageElement)if(R="img",E=!!t.src.match(/\.gif/i),E){const y=yield Gt.create(t.src,n(this,w,"f"));rr.set(t,y),T=new Q(n(this,M,"f"),y.getCanvas())}else{const y=yield Br(t.src);T=new Q(n(this,M,"f"),y)}else if(t instanceof HTMLVideoElement)T=new Q(n(this,M,"f"),t),R="video";else if(t instanceof HTMLCanvasElement)t.hasAttribute("layoutsubtree")&&o?(T=new Q(n(this,M,"f"),o),R="hic"):(T=new Q(n(this,M,"f"),t),R="canvas");else{const y=yield lr(t,S,void 0,this.maxTextureSize);T=new Q(n(this,M,"f"),y),R="text"}const[x,g]=hi(i.wrap);T.wrapS=x,T.wrapT=g,T.needsUpdate=!0;const U=(s=i.autoCrop)!==null&&s!==void 0?s:!0;if(R!=="hic"){if(i.overlay!==!0)if(typeof i.overlay=="number")t.style.setProperty("opacity",i.overlay.toString());else{const y=R==="video"?"0.0001":"0";t.style.setProperty("opacity",y.toString())}}const P={src:{value:T},resolution:{value:new le},offset:{value:new le},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new le},intersection:{value:0},viewport:{value:new Ke},autoCrop:{value:U}},W={};if(i.uniforms!==void 0)for(const[y,F]of Object.entries(i.uniforms))typeof F=="function"?(P[y]={value:F()},W[y]=F):P[y]={value:F};let N;i.backbuffer&&(N=(()=>{const y=(h.right-h.left)*n(this,w,"f"),F=(h.bottom-h.top)*n(this,w,"f");return new mt(n(this,M,"f"),y,F,n(this,w,"f"),!1)})(),P.backbuffer={value:N.texture});const I=new Map,O=new Map;for(let y=0;y<u.length-1;y++){const F=(a=u[y].target)!==null&&a!==void 0?a:`pass${y}`;u[y]=Object.assign(Object.assign({},u[y]),{target:F});const B=u[y].size,G=B?B[0]:(h.right-h.left)*n(this,w,"f"),Qe=B?B[1]:(h.bottom-h.top)*n(this,w,"f");if(u[y].persistent){const _t=B?1:n(this,w,"f"),K=B?B[0]:h.right-h.left,re=B?B[1]:h.bottom-h.top;O.set(F,new mt(n(this,M,"f"),K,re,_t,u[y].float))}else I.set(F,Bt(n(this,M,"f"),G,Qe,{float:u[y].float}))}const Z=[];for(let y=0;y<u.length;y++){const F=u[y],B=F.frag,G=Object.assign({},P),Qe={};for(const[K,re]of I)K!==F.target&&B.match(new RegExp(`uniform\\s+sampler2D\\s+${K}\\b`))&&(G[K]={value:re.texture});for(const[K,re]of O)B.match(new RegExp(`uniform\\s+sampler2D\\s+${K}\\b`))&&(G[K]={value:re.texture});if(F.uniforms)for(const[K,re]of Object.entries(F.uniforms))typeof re=="function"?(G[K]={value:re()},Qe[K]=re):G[K]={value:re};const _t=vr(n(this,M,"f"),{vertexShader:F.vert,fragmentShader:B,uniforms:G,renderingToBuffer:F.target!==void 0,glslVersion:F.glslVersion});Z.push({pass:_t,uniforms:G,uniformGenerators:Object.assign(Object.assign({},W),Qe),target:F.target,persistent:F.persistent,float:F.float,size:F.size,backbuffer:F.target?O.get(F.target):void 0})}const ve=Date.now()/1e3,_e={type:R,element:t,isInViewport:!1,isInLogicalViewport:!1,width:c.width,height:c.height,passes:Z,bufferTargets:I,startTime:ve,enterTime:ve,leaveTime:Number.NEGATIVE_INFINITY,release:(l=i.release)!==null&&l!==void 0?l:Number.POSITIVE_INFINITY,isGif:E,isFullScreen:v,overflow:p,intersection:m,originalOpacity:S,srcTexture:T,zIndex:(f=i.zIndex)!==null&&f!==void 0?f:0,backbuffer:N,autoCrop:U};n(this,C,"m",Dt).call(this,_e,d,ve),n(this,j,"f").push(_e),n(this,j,"f").sort((y,F)=>y.zIndex-F.zIndex)})}removeElement(e){var t,i;const o=n(this,j,"f").findIndex(s=>s.element===e);if(o!==-1){const s=n(this,j,"f").splice(o,1)[0];for(const a of s.bufferTargets.values())a.dispose();for(const a of s.passes)a.pass.dispose(),(t=a.backbuffer)===null||t===void 0||t.dispose();(i=s.backbuffer)===null||i===void 0||i.dispose(),s.srcTexture.dispose(),e.style.setProperty("opacity",s.originalOpacity.toString())}}updateTextElement(e){const t=n(this,j,"f").findIndex(i=>i.element===e);return t!==-1?n(this,C,"m",dt).call(this,n(this,j,"f")[t]):Promise.resolve()}updateCanvasElement(e){const t=n(this,j,"f").find(i=>i.element===e);if(t){const i=t.passes[0].uniforms.src,o=i.value,s=new Q(n(this,M,"f"),e);s.wrapS=o.wrapS,s.wrapT=o.wrapT,s.needsUpdate=!0,i.value=s,t.srcTexture=s,o.dispose()}}updateHICTexture(e,t){const i=n(this,j,"f").find(a=>a.element===e);if(!i||i.type!=="hic")return;const o=i.passes[0].uniforms.src,s=o.value;if(s.source===t)s.needsUpdate=!0;else{const a=new Q(n(this,M,"f"),t);a.wrapS=s.wrapS,a.wrapT=s.wrapT,a.needsUpdate=!0,o.value=a,i.srcTexture=a,s.dispose()}}get maxTextureSize(){return n(this,M,"f").maxTextureSize}isPlaying(){return n(this,ue,"f")!==void 0}play(){this.isPlaying()||z(this,ue,requestAnimationFrame(n(this,ht,"f")),"f")}stop(){n(this,ue,"f")!==void 0&&(cancelAnimationFrame(n(this,ue,"f")),z(this,ue,void 0,"f"))}render(){var e;const t=Date.now()/1e3,i=n(this,we,"f");n(this,C,"m",gr).call(this),i.bindFramebuffer(i.FRAMEBUFFER,null),i.viewport(0,0,n(this,ce,"f").width,n(this,ce,"f").height),i.clear(i.COLOR_BUFFER_BIT);const o=n(this,ye,"f").right-n(this,ye,"f").left,s=n(this,ye,"f").bottom-n(this,ye,"f").top,a=Re(0,0,o,s),l=n(this,H,"f").length>0;l&&(n(this,C,"m",xr).call(this,o,s),n(this,D,"f")&&(i.bindFramebuffer(i.FRAMEBUFFER,n(this,D,"f").fbo),i.clear(i.COLOR_BUFFER_BIT),i.bindFramebuffer(i.FRAMEBUFFER,null)));for(const f of n(this,j,"f")){const u=f.element.getBoundingClientRect(),c=tr(u),d=n(this,C,"m",Dt).call(this,f,c,t);if(!d.isVisible)continue;const v=f.passes[0].uniforms;v.time.value=t-f.startTime,v.resolution.value.set(u.width*n(this,w,"f"),u.height*n(this,w,"f")),v.mouse.value.set((n(this,be,"f")+n(this,ae,"f"))*n(this,w,"f"),(n(this,xe,"f")+n(this,fe,"f"))*n(this,w,"f"));for(const x of f.passes)for(const[g,U]of Object.entries(x.uniformGenerators))x.uniforms[g].value=U();(e=rr.get(f.element))===null||e===void 0||e.update(),(f.type==="video"||f.isGif)&&(v.src.value.needsUpdate=!0);const p=jt(c,s,n(this,ae,"f"),n(this,fe,"f")),h=jt(d.rectWithOverflow,s,n(this,ae,"f"),n(this,fe,"f"));f.backbuffer&&(f.passes[0].uniforms.backbuffer.value=f.backbuffer.texture);{const x=f.isFullScreen?a:h,g=Math.max(1,x.w*n(this,w,"f")),U=Math.max(1,x.h*n(this,w,"f")),P=Math.max(1,x.w),W=Math.max(1,x.h);for(let N=0;N<f.passes.length-1;N++){const I=f.passes[N];if(!I.size)if(I.backbuffer)I.backbuffer.resize(P,W);else{const O=f.bufferTargets.get(I.target);O&&(O.width!==g||O.height!==U)&&O.setSize(g,U)}}}const m=new Map;for(const x of f.passes)x.backbuffer&&x.target&&m.set(x.target,x.backbuffer.texture);let S=f.srcTexture;const T=n(this,be,"f")+n(this,ae,"f")-p.x,R=n(this,xe,"f")+n(this,fe,"f")-p.y;for(let x=0;x<f.passes.length-1;x++){const g=f.passes[x],U=f.isFullScreen?a:h;g.uniforms.src.value=S;for(const[I,O]of m)g.uniforms[I]&&(g.uniforms[I].value=O);for(const[I,O]of Object.entries(g.uniformGenerators))g.uniforms[I]&&(g.uniforms[I].value=O());const P=g.size?g.size[0]:U.w*n(this,w,"f"),W=g.size?g.size[1]:U.h*n(this,w,"f"),N=g.size?Re(0,0,g.size[0],g.size[1]):Re(0,0,U.w,U.h);if(g.uniforms.resolution.value.set(P,W),g.uniforms.offset.value.set(0,0),g.uniforms.mouse.value.set(T/U.w*P,R/U.h*W),g.backbuffer)n(this,C,"m",Y).call(this,g.pass,g.backbuffer.target,N,g.uniforms,!0),g.backbuffer.swap(),S=g.backbuffer.texture;else{const I=f.bufferTargets.get(g.target);if(!I)continue;n(this,C,"m",Y).call(this,g.pass,I,N,g.uniforms,!0),S=I.texture}g.target&&m.set(g.target,S)}const E=f.passes[f.passes.length-1];E.uniforms.src.value=S,E.uniforms.resolution.value.set(u.width*n(this,w,"f"),u.height*n(this,w,"f")),E.uniforms.offset.value.set(p.x*n(this,w,"f"),p.y*n(this,w,"f")),E.uniforms.mouse.value.set((n(this,be,"f")+n(this,ae,"f"))*n(this,w,"f"),(n(this,xe,"f")+n(this,fe,"f"))*n(this,w,"f"));for(const[x,g]of m)E.uniforms[x]&&(E.uniforms[x].value=g);for(const[x,g]of Object.entries(E.uniformGenerators))E.uniforms[x]&&(E.uniforms[x].value=g());f.backbuffer?(E.uniforms.backbuffer.value=f.backbuffer.texture,f.isFullScreen?(f.backbuffer.resize(o,s),n(this,C,"m",vt).call(this,f,p.x,p.y),n(this,C,"m",Y).call(this,E.pass,f.backbuffer.target,a,E.uniforms,!0),f.backbuffer.swap(),n(this,q,"f").setUniforms(f.backbuffer.texture,n(this,w,"f"),a),n(this,C,"m",Y).call(this,n(this,q,"f").pass,l&&n(this,D,"f")||null,a,n(this,q,"f").uniforms,!1)):(f.backbuffer.resize(h.w,h.h),n(this,C,"m",vt).call(this,f,f.overflow.left,f.overflow.bottom),n(this,C,"m",Y).call(this,E.pass,f.backbuffer.target,f.backbuffer.getViewport(),E.uniforms,!0),f.backbuffer.swap(),n(this,q,"f").setUniforms(f.backbuffer.texture,n(this,w,"f"),h),n(this,C,"m",Y).call(this,n(this,q,"f").pass,l&&n(this,D,"f")||null,h,n(this,q,"f").uniforms,!1))):(n(this,C,"m",vt).call(this,f,p.x,p.y),n(this,C,"m",Y).call(this,E.pass,l&&n(this,D,"f")||null,f.isFullScreen?a:h,E.uniforms,!1))}l&&n(this,D,"f")&&n(this,C,"m",br).call(this,a,t)}}ie=new WeakMap,ce=new WeakMap,M=new WeakMap,we=new WeakMap,qe=new WeakMap,q=new WeakMap,H=new WeakMap,De=new WeakMap,D=new WeakMap,ct=new WeakMap,Se=new WeakMap,ue=new WeakMap,w=new WeakMap,j=new WeakMap,lt=new WeakMap,ye=new WeakMap,We=new WeakMap,ge=new WeakMap,ae=new WeakMap,fe=new WeakMap,be=new WeakMap,xe=new WeakMap,Ne=new WeakMap,Ge=new WeakMap,ut=new WeakMap,ht=new WeakMap,C=new WeakSet,gr=function(){if(typeof window>"u")return;const e=n(this,ce,"f").ownerDocument,t=e.compatMode==="BackCompat"?e.body:e.documentElement,i=t.clientWidth,o=t.clientHeight,s=window.scrollX,a=window.scrollY;let l,f;if(n(this,ie,"f").fixedCanvas)l=0,f=0;else if(n(this,ie,"f").wrapper)l=i*n(this,ie,"f").scrollPadding[0],f=o*n(this,ie,"f").scrollPadding[1];else{const d=e.body.scrollWidth-(s+i),v=e.body.scrollHeight-(a+o);l=ir(i*n(this,ie,"f").scrollPadding[0],0,d),f=ir(o*n(this,ie,"f").scrollPadding[1],0,v)}const u=i+l*2,c=o+f*2;(u!==n(this,ge,"f")[0]||c!==n(this,ge,"f")[1])&&(n(this,ce,"f").style.width=`${u}px`,n(this,ce,"f").style.height=`${c}px`,n(this,M,"f").setSize(u,c,n(this,w,"f")),z(this,ye,bt({top:-f,left:-l,right:i+l,bottom:o+f}),"f"),z(this,We,bt({top:0,left:0,right:i,bottom:o}),"f"),z(this,ge,[u,c],"f"),z(this,ae,l,"f"),z(this,fe,f,"f")),n(this,ie,"f").fixedCanvas||n(this,ce,"f").style.setProperty("transform",`translate(${s-l}px, ${a-f}px)`)},dt=function(e){return Xt(this,void 0,void 0,function*(){if(!n(this,Ne,"f").get(e.element)){n(this,Ne,"f").set(e.element,!0);try{const t=e.passes[0].uniforms.src,i=t.value,o=i.source instanceof OffscreenCanvas?i.source:void 0,s=yield lr(e.element,e.originalOpacity,o,this.maxTextureSize);if(s.width===0||s.width===0)throw"omg";const a=new Q(n(this,M,"f"),s);a.wrapS=i.wrapS,a.wrapT=i.wrapT,a.needsUpdate=!0,t.value=a,e.srcTexture=a,i.dispose()}catch(t){console.error(t)}n(this,Ne,"f").set(e.element,!1)}})},wr=function(e){const t=o=>o.glslVersion===void 0&&e.glslVersion!==void 0?Object.assign(Object.assign({},o),{glslVersion:e.glslVersion}):o;if(Array.isArray(e.shader))return e.shader.map(t);const i=n(this,C,"m",Tt).call(this,e.shader||"uvGradient");return[t({frag:i})]},Dt=function(e,t,i){const o=zt(t,e.overflow),s=e.isFullScreen||_r(n(this,We,"f"),o),a=zt(n(this,We,"f"),e.intersection.rootMargin),l=fi(a,t),f=e.isFullScreen||li(a,t,l,e.intersection.threshold);!e.isInLogicalViewport&&f&&(e.enterTime=i,e.leaveTime=Number.POSITIVE_INFINITY),e.isInLogicalViewport&&!f&&(e.leaveTime=i),e.isInViewport=s,e.isInLogicalViewport=f;const u=s&&i-e.leaveTime<=e.release;if(u){const c=e.passes[0].uniforms;c.intersection.value=l,c.enterTime.value=i-e.enterTime,c.leaveTime.value=i-e.leaveTime}return{isVisible:u,intersection:l,rectWithOverflow:o}},Tt=function(e){return e in Yt?Yt[e]:e},Y=function(e,t,i,o,s){const a=n(this,we,"f");s&&t!==null&&t!==n(this,D,"f")&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));const l=o.viewport;l&&l.value instanceof Ke&&l.value.set(i.x*n(this,w,"f"),i.y*n(this,w,"f"),i.w*n(this,w,"f"),i.h*n(this,w,"f"));try{Gr(a,n(this,qe,"f"),e,t,i,n(this,ge,"f")[0],n(this,ge,"f")[1],n(this,w,"f"))}catch(f){console.error(f)}},vt=function(e,t,i){const o=e.passes[0].uniforms.offset.value;o.x=t*n(this,w,"f"),o.y=i*n(this,w,"f")},yr=function(e){var t,i,o,s;const a=[],l=[],f=[];for(const c of e)"frag"in c&&f.push(c);for(let c=0;c<f.length-1;c++)f[c].target||(f[c]=Object.assign(Object.assign({},f[c]),{target:`pass${c}`}));for(const c of e){let d,v;"frag"in c?(d=c.frag,v=new Zt(n(this,M,"f"),d,c.uniforms,(t=c.persistent)!==null&&t!==void 0?t:!1,(i=c.float)!==null&&i!==void 0?i:!1,c.size,c.target!==void 0,c.glslVersion),l.push(c.target)):(d=n(this,C,"m",Tt).call(this,c.shader),v=new Zt(n(this,M,"f"),d,c.uniforms,(o=c.persistent)!==null&&o!==void 0?o:!1,(s=c.float)!==null&&s!==void 0?s:!1,void 0,!1,c.glslVersion),c.persistent&&v.registerBufferUniform("backbuffer"),l.push(void 0)),n(this,H,"f").push(v),a.push(d);const p={};if(c.uniforms)for(const[h,m]of Object.entries(c.uniforms))typeof m=="function"&&(p[h]=m);n(this,ct,"f").push(p)}z(this,De,l,"f");for(const c of f)c.target&&n(this,Se,"f").set(c.target,void 0);const u=l.filter(c=>c!==void 0);for(let c=0;c<n(this,H,"f").length;c++)for(const d of u)a[c].match(new RegExp(`uniform\\s+sampler2D\\s+${d}\\b`))&&n(this,H,"f")[c].registerBufferUniform(d)},br=function(e,t){if(!n(this,D,"f"))return;let i=n(this,D,"f").texture;const o=new Map;for(let s=0;s<n(this,H,"f").length;s++){const a=n(this,H,"f")[s],l=n(this,De,"f")[s];l&&a.backbuffer&&o.set(l,a.backbuffer.texture)}for(let s=0;s<n(this,H,"f").length;s++){const a=n(this,H,"f")[s],l=s===n(this,H,"f").length-1,f=n(this,ct,"f")[s],u=n(this,De,"f")[s],c=n(this,be,"f")+n(this,ae,"f"),d=n(this,xe,"f")+n(this,fe,"f"),v=a.getTargetDimensions();if(v){const[p,h]=v;a.uniforms.src.value=i,a.uniforms.resolution.value.set(p,h),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t-n(this,lt,"f"),a.uniforms.mouse.value.set(c/e.w*p,d/e.h*h)}else a.setUniforms(i,n(this,w,"f"),e,t-n(this,lt,"f"),c,d);a.uniforms.passIndex.value=s,a.updateCustomUniforms(f);for(const[p,h]of o){const m=a.uniforms[p];m&&(m.value=h)}if(l)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),n(this,C,"m",Y).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),n(this,q,"f").setUniforms(a.backbuffer.texture,n(this,w,"f"),e),n(this,C,"m",Y).call(this,n(this,q,"f").pass,null,e,n(this,q,"f").uniforms,!1)):n(this,C,"m",Y).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);const p=v?Re(0,0,v[0]/n(this,w,"f"),v[1]/n(this,w,"f")):e;n(this,C,"m",Y).call(this,a.pass,a.backbuffer.target,p,a.uniforms,!0),a.backbuffer.swap(),i=a.backbuffer.texture,u&&o.set(u,a.backbuffer.texture)}else{const p=u??`postEffect${s}`;let h=n(this,Se,"f").get(p);const m=v?v[0]:e.w*n(this,w,"f"),S=v?v[1]:e.h*n(this,w,"f");(!h||h.width!==m||h.height!==S)&&(h==null||h.dispose(),h=Bt(n(this,M,"f"),m,S,{float:a.float}),n(this,Se,"f").set(p,h));const T=v?Re(0,0,v[0]/n(this,w,"f"),v[1]/n(this,w,"f")):e;n(this,C,"m",Y).call(this,a.pass,h,T,a.uniforms,!0),i=h.texture,u&&o.set(u,h.texture)}}},xr=function(e,t){var i;const o=e*n(this,w,"f"),s=t*n(this,w,"f");(!n(this,D,"f")||n(this,D,"f").width!==o||n(this,D,"f").height!==s)&&((i=n(this,D,"f"))===null||i===void 0||i.dispose(),z(this,D,Bt(n(this,M,"f"),o,s),"f"));for(const a of n(this,H,"f"))a.persistent&&!a.backbuffer?a.initializeBackbuffer(n(this,M,"f"),e,t,n(this,w,"f")):a.backbuffer&&a.resizeBackbuffer(e,t)};function _r(r,e){return e.left<=r.right&&e.right>=r.left&&e.top<=r.bottom&&e.bottom>=r.top}function li(r,e,t,i){return i===0?_r(r,e):t>=i}function ui(r){return r===!0?[!0,er]:r===void 0?[!1,er]:[!1,mr(r)]}function di(r){var e,t;const i=(e=r==null?void 0:r.threshold)!==null&&e!==void 0?e:0,o=mr((t=r==null?void 0:r.rootMargin)!==null&&t!==void 0?t:0);return{threshold:i,rootMargin:o}}function Et(r){return r==="repeat"?"repeat":r==="mirror"?"mirror":"clamp"}function hi(r){if(!r)return["clamp","clamp"];if(Array.isArray(r))return[Et(r[0]),Et(r[1])];const e=Et(r);return[e,e]}function ir(r,e,t){return Math.max(e,Math.min(t,r))}function vi(){try{const r=document.createElement("canvas");return(r.getContext("webgl2")||r.getContext("webgl"))!==null}catch{return!1}}var Pt=function(r,e,t,i){function o(s){return s instanceof t?s:new t(function(a){a(s)})}return new(t||(t=Promise))(function(s,a){function l(c){try{u(i.next(c))}catch(d){a(d)}}function f(c){try{u(i.throw(c))}catch(d){a(d)}}function u(c){c.done?s(c.value):o(c.value).then(l,f)}u((i=i.apply(r,e||[])).next())})},or=function(r,e,t,i,o){if(i==="m")throw new TypeError("Private method is not writable");if(i==="a"&&!o)throw new TypeError("Private accessor was defined without a setter");if(typeof e=="function"?r!==e||!o:!e.has(r))throw new TypeError("Cannot write private member to an object whose class did not declare it");return i==="a"?o.call(r,t):o?o.value=t:e.set(r,t),t},b=function(r,e,t,i){if(t==="a"&&!i)throw new TypeError("Private accessor was defined without a getter");if(typeof e=="function"?r!==e||!i:!e.has(r))throw new TypeError("Cannot read private member from an object whose class did not declare it");return t==="m"?i:t==="a"?i.call(r):i?i.value:e.get(r)},pi=function(r,e){var t={};for(var i in r)Object.prototype.hasOwnProperty.call(r,i)&&e.indexOf(i)<0&&(t[i]=r[i]);if(r!=null&&typeof Object.getOwnPropertySymbols=="function")for(var o=0,i=Object.getOwnPropertySymbols(r);o<i.length;o++)e.indexOf(i[o])<0&&Object.prototype.propertyIsEnumerable.call(r,i[o])&&(t[i[o]]=r[i[o]]);return t},Fe,A,pt,ne,Tr,Er,Pr,Fr;function mi(){if(typeof window>"u")throw"Cannot find 'window'. VFX-JS only runs on the browser.";if(typeof document>"u")throw"Cannot find 'document'. VFX-JS only runs on the browser."}function gi(r){return{position:r?"fixed":"absolute",top:0,left:0,width:"0px",height:"0px","z-index":9999,"pointer-events":"none"}}class Cr{static init(e){try{return new Cr(e)}catch{return null}}constructor(e={}){var t;if(Fe.add(this),A.set(this,void 0),pt.set(this,void 0),ne.set(this,new Map),mi(),!vi())throw new Error("[VFX-JS] WebGL is not available in this environment.");const i=Or(e),o=document.createElement("canvas"),s=gi(i.fixedCanvas);for(const[a,l]of Object.entries(s))o.style.setProperty(a,l.toString());i.zIndex!==void 0&&o.style.setProperty("z-index",i.zIndex.toString()),((t=i.wrapper)!==null&&t!==void 0?t:document.body).appendChild(o),or(this,pt,o,"f"),or(this,A,new ci(i,o),"f"),i.autoplay&&b(this,A,"f").play()}add(e,t,i){return Pt(this,void 0,void 0,function*(){e instanceof HTMLImageElement?yield b(this,Fe,"m",Tr).call(this,e,t):e instanceof HTMLVideoElement?yield b(this,Fe,"m",Er).call(this,e,t):e instanceof HTMLCanvasElement?e.hasAttribute("layoutsubtree")&&i?yield b(this,A,"f").addElement(e,t,i):yield b(this,Fe,"m",Pr).call(this,e,t):yield b(this,Fe,"m",Fr).call(this,e,t)})}updateHICTexture(e,t){b(this,A,"f").updateHICTexture(e,t)}get maxTextureSize(){return b(this,A,"f").maxTextureSize}addHTML(e,t){return Pt(this,void 0,void 0,function*(){if(!Sr())return console.warn("html-in-canvas not supported, falling back to dom-to-canvas"),this.add(e,t);t.overlay!==void 0&&console.warn("addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.");const{overlay:i}=t,o=pi(t,["overlay"]);let s=b(this,ne,"f").get(e);s&&b(this,A,"f").removeElement(s);const{canvas:a,initialCapture:l}=yield Ur(e,{onCapture:f=>{b(this,A,"f").updateHICTexture(a,f)},maxSize:b(this,A,"f").maxTextureSize});s=a,b(this,ne,"f").set(e,s),yield b(this,A,"f").addElement(s,o,l)})}remove(e){const t=b(this,ne,"f").get(e);t?($t(t,e),b(this,ne,"f").delete(e),b(this,A,"f").removeElement(t)):b(this,A,"f").removeElement(e)}update(e){return Pt(this,void 0,void 0,function*(){const t=b(this,ne,"f").get(e);if(t){t.requestPaint();return}if(e instanceof HTMLCanvasElement){b(this,A,"f").updateCanvasElement(e);return}else return b(this,A,"f").updateTextElement(e)})}play(){b(this,A,"f").play()}stop(){b(this,A,"f").stop()}render(){b(this,A,"f").render()}destroy(){for(const[e,t]of b(this,ne,"f"))$t(t,e);b(this,ne,"f").clear(),b(this,A,"f").destroy(),b(this,pt,"f").remove()}}A=new WeakMap,pt=new WeakMap,ne=new WeakMap,Fe=new WeakSet,Tr=function(e,t){return e.complete?b(this,A,"f").addElement(e,t):new Promise(i=>{e.addEventListener("load",()=>{b(this,A,"f").addElement(e,t),i()},{once:!0})})},Er=function(e,t){return e.readyState>=3?b(this,A,"f").addElement(e,t):new Promise(i=>{e.addEventListener("canplay",()=>{b(this,A,"f").addElement(e,t),i()},{once:!0})})},Pr=function(e,t){return b(this,A,"f").addElement(e,t)},Fr=function(e,t){return b(this,A,"f").addElement(e,t)};export{Cr as V};
