import{c as e}from"./vfx.Dg2tGaef.js";import{a as t,d as n,f as r,i,n as a,o,r as s,s as c,t as l,u}from"./pixelate.B388fLGj.js";import{n as d,t as f}from"./lifecycle.v3sQOfPt.js";import{n as p,r as m,t as h}from"./background.DJ8KXuuv.js";import{t as g}from"./page-vfx.P77-y5nw.js";import{t as _}from"./lazy.mCYleO_1.js";function v(e=``){return`${`/vfx-js/`.replace(/\/$/,``)}/${e}`}var y=`
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    uv.x += sin(uv.y * 24.0 + time * 3.0) * 0.01;
    vec4 color = texture(src, uv);

    // Map brightness to two colors.
    float l = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 duo = mix(vec3(0.15, 0.0, 0.35), vec3(1.0, 0.55, 0.95), l);
    outColor = vec4(duo, color.a);
}
`,b=[{id:`RunPreset`,step:`01 — One line`,title:`Pick a preset`,caption:`glitch`,media:{src:v(`vfx-js-logo-no-padding.svg`),width:960,height:361},code:`vfx.add(logo, { shader: "glitch", overflow: 60 });`,props:()=>({shader:`glitch`,overflow:60})},{id:`RunEffects`,step:`02 — Effects`,title:`Chain prebuilt effects`,caption:`Pixelate → Bloom`,media:{src:v(`images/jellyfish.webp`),width:640,height:360},code:`
import { BloomEffect, PixelateEffect } from "@vfx-js/effects";

vfx.add(img, {
    effect: [
        new PixelateEffect({ size: 6 }),
        new BloomEffect({ threshold: 0.2, intensity: 4 }),
    ],
});`,props:()=>({effect:[new l({size:6}),new u({threshold:.2,intensity:4})]})},{id:`RunShader`,step:`03 — Your shader`,title:`Write GLSL`,caption:`custom shader`,media:{src:v(`images/pigeon.webp`),width:1200,height:800},code:`const shader = \`${y}\`;

vfx.add(img, { shader });`,props:()=>({shader:y})}],x=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float gamma;
uniform float saturation;

void main(void) {
    vec4 color = texture(src, srcRectUv.xy + uvContent * srcRectUv.zw);
    // Colors are premultiplied. Adjust the straight color.
    vec3 rgb = color.a > 0.0 ? color.rgb / color.a : vec3(0.0);
    rgb = pow(rgb, vec3(1.0 / gamma));
    float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    rgb = clamp(mix(vec3(luma), rgb, saturation), 0.0, 1.0);
    outColor = vec4(rgb * color.a, color.a);
}
`,S=class{gamma;saturation;constructor({gamma:e=1,saturation:t=1}={}){this.gamma=e,this.saturation=t}render(e){e.draw({frag:x,uniforms:{src:e.src,gamma:Math.max(.01,this.gamma),saturation:Math.max(0,this.saturation)},target:e.target})}};function C(e,t){e.setParams?e.setParams(t):Object.assign(e,t)}function w(e){return e.type===`range`?e.stage:void 0}function T(e){return e.type===`range`&&e.param||e.key}function E(e,t,n){let r=Object.fromEntries((e.controls??[]).filter(e=>w(e)===n).map(e=>[T(e),k(e,t[e.key])]));return n?{...e[n],...r}:r}function D(e,t,n){let r=e.create?.(E(e,t),n),i=r&&e.adjust?new S(E(e,t,`adjust`)):void 0,a=r&&e.glow?new u(E(e,t,`glow`)):void 0,o={adjust:i,glow:a};return{effects:[i,r,a].filter(e=>e!==void 0),set(e,t){let n=w(e),i=n?o[n]:r;i&&C(i,{[T(e)]:k(e,t)})}}}function O(e){let t=Number.parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255,1]}function k(e,t){return e.type===`color`?O(t):e.type===`range`&&e.toParam?e.toParam(t):t}var A=[{label:`Original`},{label:`ASCII`,className:`AsciiEffect`,create:e=>new r({...e,fontWeight:900}),adjust:{gamma:1.7,saturation:2},controls:[{type:`range`,key:`grid`,min:6,max:24,step:1,value:8},{type:`range`,key:`dither`,min:0,max:1,step:.01,value:.8},{type:`checkbox`,key:`colorFromSource`,value:!0}]},{label:`Dither`,className:`DitherEffect`,create:e=>new c(e),controls:[{type:`select`,key:`style`,options:[`bayer2`,`bayer4`,`bayer8`,`bayer16`,`blueNoise`,`threshold`],value:`bayer4`},{type:`range`,key:`size`,min:1,max:8,step:1,value:2},{type:`range`,key:`levels`,min:2,max:8,step:1,value:4}]},{label:`Duotone`,className:`DuotoneEffect`,create:e=>new o(e),controls:[{type:`color`,key:`color1`,value:`#FF5588`},{type:`color`,key:`color2`,value:`#002288`},{type:`range`,key:`speed`,min:0,max:1,step:.01,value:.2}]},{label:`Matrix`,className:`MatrixEffect`,create:(e,t)=>new a({...e,brightness:1,fontWeight:900,background:t?[0,0,0,1]:[0,0,0,0]}),glow:{threshold:.3},controls:[{type:`range`,key:`speed`,min:1,max:30,step:1,value:10},{type:`range`,key:`tail`,min:4,max:40,step:1,value:18},{type:`range`,key:`grid`,min:4,max:24,step:1,value:6,toParam:e=>[e,Math.round(e*4/3)]},{type:`range`,key:`glow`,stage:`glow`,param:`intensity`,min:0,max:4,step:.01,value:20}]},{label:`Bloom`,className:`BloomEffect`,create:e=>new u({...e,pad:300,softness:1,scatter:10}),controls:[{type:`range`,key:`threshold`,min:0,max:1,step:.01,value:.02},{type:`range`,key:`intensity`,min:0,max:10,step:.01,value:4}]},{label:`Light Streak`,className:`LightStreakEffect`,create:e=>new s({...e,dispersion:-.5}),controls:[{type:`range`,key:`streaks`,min:1,max:8,step:1,value:2},{type:`range`,key:`length`,min:50,max:600,step:1,value:300},{type:`range`,key:`threshold`,min:0,max:1,step:.01,value:.9},{type:`range`,key:`intensity`,min:0,max:2,step:.01,value:.5},{type:`range`,key:`angle`,min:0,max:180,step:1,value:0}]},{label:`Halftone`,className:`HalftoneEffect`,create:e=>new i(e),controls:[{type:`range`,key:`gridSize`,min:4,max:24,step:.1,value:7.5},{type:`range`,key:`dotSize`,min:.2,max:1.5,step:.01,value:1},{type:`range`,key:`angle`,min:0,max:90,step:1,value:0}]},{label:`Pixel Sort`,className:`PixelSortEffect`,create:t=>new e(t),controls:[{type:`range`,key:`range`,label:`threshold`,min:0,max:1,step:.01,value:.1,toParam:e=>[e,1]},{type:`select`,key:`direction`,options:[`up`,`down`,`left`,`right`],value:`down`},{type:`range`,key:`angle`,min:-90,max:90,step:1,value:0}]},{label:`Glitch`,className:`GlitchEffect`,create:e=>new t(e),controls:[{type:`range`,key:`intensity`,min:0,max:1,step:.01,value:.5},{type:`range`,key:`speed`,min:0,max:1,step:.01,value:.5}]},{label:`Bad JPEG`,className:`BadJpegEffect`,create:e=>new n(e),controls:[{type:`range`,key:`quality`,min:1,max:30,step:1,value:10},{type:`range`,key:`iterations`,min:1,max:8,step:1,value:1}]}];function j(e){return typeof e==`number`?String(Math.round(e*100)/100):typeof e==`string`?JSON.stringify(e):Array.isArray(e)?`[${e.map(j).join(`, `)}]`:String(e)}function M(e,t){let n=Object.entries(e).map(([e,t])=>`${e}: ${j(t)}`);return n.length?`{\n${n.map(e=>`${t}    ${e},`).join(`
`)}\n${t}}`:``}function N(e,t){if(!e.className)return`import { VFX } from "@vfx-js/core";

const vfx = new VFX();
await vfx.add(document.querySelector("img"), { shader: "none" });
`;let n=M(E(e,t),e.glow?`        `:`    `);if(!e.glow)return`import { VFX } from "@vfx-js/core";
import { ${e.className} } from "@vfx-js/effects";

const vfx = new VFX();
await vfx.add(document.querySelector("img"), {
    effect: new ${e.className}(${n}),
});
`;let r=E(e,t,`glow`);return`import { VFX } from "@vfx-js/core";
import { BloomEffect, ${e.className} } from "@vfx-js/effects";

const vfx = new VFX();
await vfx.add(document.querySelector("img"), {
    effect: [
        new ${e.className}(${n}),
        new BloomEffect(${M(r,`        `)}),
    ],
});
`}function P(e,t){return(t??document).querySelector(e)}var F=`
    precision highp float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform float enterTime;
    uniform float leaveTime;
    uniform sampler2D src;

    uniform float delay;
    #define speed 2.0

    out vec4 outColor;

    float nn(float y, float t) {
        float n = (
            sin(y * .07 + t * 8. + sin(y * .5 + t * 10.)) +
            sin(y * .7 + t * 2. + sin(y * .3 + t * 8.)) * .7 +
            sin(y * 1.1 + t * 2.8) * .4
        );
        n += sin(y * 124. + t * 100.7) * sin(y * 877. - t * 38.8) * .3;
        return n;
    }

    vec4 readTex(sampler2D tex, vec2 uv) {
        if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) { return vec4(0); }
        return texture(tex, uv);
    }

    vec4 glitch(vec2 uv) {
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

        // Colors are premultiplied, so alpha must follow the strongest channel, not the sum.
        return vec4(cr.r, cg.g, cb.b, max(cr.a, max(cg.a, cb.a)));
    }
    vec4 slitscan(vec2 uv) {
        float t = max(enterTime - delay, 0.) * speed;
        if (t <= 0.0) {
            return vec4(0);
        }

        vec2 uvr = uv, uvg = uv, uvb = uv;
        uvr.x = min(uvr.x, t);
        uvg.x = min(uvg.x, max(t - 0.2, 0.));
        uvb.x = min(uvb.x, max(t - 0.4, 0.));

        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        return vec4(cr.r, cg.g, cb.b, max(cr.a, max(cg.a, cb.a)));
    }

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        if (leaveTime > 0.) {
            float t = clamp(leaveTime - 0.5, 0., 1.);
            outColor = glitch(uv) * (1. - t);
        } else if (enterTime < 1.0) {
            outColor = slitscan(uv);
        } else {
            outColor = glitch(uv);
        }
    }
`;function I(e,t,n){let r=document.createElement(`div`);r.className=`EffectParams`;for(let i of e){let e=document.createElement(`label`);e.className=`EffectParam`;let a=document.createElement(`span`);a.textContent=i.label??i.key;let o=document.createElement(`span`);o.className=`EffectParamValue`;let s=e=>{o.textContent=i.type===`range`?String(e):``},c;if(i.type===`select`){c=document.createElement(`select`);for(let e of i.options)c.add(new Option(e,e))}else c=document.createElement(`input`),c.type=i.type,i.type===`range`&&(c.min=String(i.min),c.max=String(i.max),c.step=String(i.step));c instanceof HTMLInputElement&&i.type===`checkbox`?c.checked=t[i.key]:c.value=String(t[i.key]),s(t[i.key]),c.addEventListener(`input`,()=>{let e=i.type===`range`?Number(c.value):c instanceof HTMLInputElement&&i.type===`checkbox`?c.checked:c.value;s(e),n(i,e)}),i.type===`checkbox`?(e.classList.add(`EffectParamToggle`),e.append(a,c)):e.append(a,o,c),r.appendChild(e)}return r}var L=class{vfx=g();alive=!0;added=[];initEffectMenu(){let e=P(`#BG`),t=P(`.EffectList`),n=P(`.EffectCopy`),r=A.map(e=>Object.fromEntries((e.controls??[]).map(e=>[e.key,e.value]))),i=e=>A.map((t,n)=>D(t,r[n],e)),a=[P(`#Logo`),P(`#LogoTagline`),P(`#HeroLead`)].map(e=>({element:e,chains:i(!1),onEffectPath:!1})),o=i(!0),s=0,c=Promise.resolve(),l=(e,t,n)=>{r[e][t.key]=n;for(let r of[...a.map(e=>e.chains),o])r[e].set(t,n)},u=!0,f=()=>{let t=u?o[s].effects:[],n=[h,...t];return p.updateEffects(e,n)},m=e=>{s=e,c=c.then(async()=>{s===e&&this.alive&&await Promise.all([...a.map(async t=>{let n=t.chains[e].effects;t.onEffectPath?await this.vfx.updateEffects(t.element,n):(t.onEffectPath=!0,this.vfx.remove(t.element),await this.add(t.element,{effect:n}))}),f()])})},g=P(`.Hero`),_=new IntersectionObserver(([e])=>{u=e.isIntersecting,document.body.classList.toggle(`BGDim`,!u),c=c.then(()=>{if(this.alive)return f()})},{root:d(),threshold:.25});_.observe(g);let v=A.map((e,n)=>{let i=document.createElement(`li`),a=document.createElement(`button`);return a.type=`button`,a.className=`EffectItem`,a.innerHTML=`<span class="num">${String(n+1).padStart(2,`0`)}</span>${e.label}`,a.addEventListener(`click`,()=>{for(let[e,t]of v.entries())t.classList.toggle(`active`,e===n);m(n)}),i.appendChild(a),e.controls&&i.appendChild(I(e.controls,r[n],(e,t)=>l(n,e,t))),t.appendChild(i),i});return v[s].classList.add(`active`),n.addEventListener(`click`,async()=>{await navigator.clipboard.writeText(N(A[s],r[s]));let e=n.innerHTML;n.textContent=`Copied ✓`,setTimeout(()=>{n.innerHTML=e},1500)}),()=>{_.disconnect(),document.body.classList.remove(`BGDim`),c=c.then(()=>p.updateEffects(e,[h]))}}hideMask(){document.getElementById(`MaskTop`)?.style.setProperty(`height`,`0`),document.getElementById(`MaskBottom`)?.style.setProperty(`opacity`,`0`)}async add(e,t){await this.vfx.add(e,t),this.alive?this.added.push(e):this.vfx.remove(e)}async showLogo(){let e=P(`#Logo`),t=P(`#LogoTagline`),n=P(`#HeroLead`);return Promise.all([this.add(e,{shader:F,overflow:[0,3e3,0,100],uniforms:{delay:0},intersection:{threshold:1}}),this.add(t,{shader:F,overflow:[0,3e3,0,1e3],uniforms:{delay:.3},intersection:{threshold:1}}),this.add(n,{shader:F,overflow:[0,3e3,0,1e3],uniforms:{delay:.6},intersection:{threshold:1}})])}dispose(){this.alive=!1;for(let e of this.added)this.vfx.remove(e);this.added=[]}};function R(){let e=d(),t=!1,n=()=>{t=!0,clearTimeout(i),e?.removeEventListener(`scroll`,r)},r=()=>{if(!t){n();for(let e of b){let t=document.getElementById(e.id);t&&_(t,e.props)}}},i=setTimeout(r,5e3);return e?.addEventListener(`scroll`,r,{passive:!0}),n}f(()=>{if(!document.getElementById(`Logo`))return;let e=new L,t=document.getElementById(`MaskTop`)!==null,n,r,i=R();return m().then(()=>{e.alive&&(r=e.initEffectMenu(),e.hideMask(),n=setTimeout(()=>{e.showLogo()},t?2e3:0))}),()=>{clearTimeout(n),i(),r?.(),e.dispose()}});