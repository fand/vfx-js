import{t as e}from"./lifecycle.v3sQOfPt.js";import{t}from"./lazy.D1Bm5Zq-.js";var n=`#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D tiles;

void main() {
    vec4 color = texture(src, uvSrc);
    vec3 tint = texture(tiles, uvContent).rgb;
    outColor = vec4(color.rgb * tint, color.a);
}
`,r=class{#e=document.createElement(`canvas`);#t=null;constructor(){this.#e.width=8,this.#e.height=4,this.#n()}init(e){this.#t=e.wrapTexture(this.#e,{autoUpdate:!1,filter:`nearest`})}shuffle(){this.#n(),this.#t?.update()}render(e){this.#t&&e.draw({frag:n,uniforms:{src:e.src,tiles:this.#t},target:e.target})}dispose(){this.#t?.dispose(),this.#t=null}#n(){let e=this.#e.getContext(`2d`);if(e)for(let t=0;t<this.#e.width;t++)for(let n=0;n<this.#e.height;n++)e.fillStyle=`hsl(${Math.random()*360} 90% 65%)`,e.fillRect(t,n,1,1)}},i=`#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D prev;
uniform vec4 srcRectUv;
uniform vec2 shift;

vec4 readSrc(vec2 p) {
    if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return vec4(0);
    return texture(src, srcRectUv.xy + p * srcRectUv.zw);
}

void main() {
    vec4 color = readSrc(uvContent - shift);
    // Fade the last frame and shift its color.
    vec4 last = texture(prev, uv) * vec4(0.9, 0.8, 0.96, 0.96);
    outColor = max(color, last);
}
`,a=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D buffer;

void main() {
    outColor = texture(buffer, uv);
}
`,o=class{#e=null;init(e){this.#e=e.createRenderTarget({persistent:!0})}render(e){if(!this.#e)return;let t=e.time*2;e.draw({frag:i,uniforms:{src:e.src,prev:this.#e,shift:[Math.cos(t)*.12,Math.sin(t)*.12]},target:this.#e}),e.draw({frag:a,uniforms:{buffer:this.#e},target:e.target})}outputRect(e){let t=60*e.pixelRatio,[,,n,r]=e.contentRect;return[-t,-t,n+t*2,r+t*2]}dispose(){this.#e=null}},s=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform float amount;

void main() {
    vec2 uv = uvContent;
    uv.x += sin(uv.y * 12.0 + time * 3.0) * 0.04 * amount;
    if (uv.x < 0.0 || uv.x > 1.0) {
        outColor = vec4(0);
        return;
    }
    // Map element uv to src uv.
    outColor = texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}
`,c=class{params;#e=0;constructor(e={}){this.params={amount:1,...e}}update(e){let t=1-Math.exp(-e.deltaTime*8);this.#e+=(this.params.amount-this.#e)*t}render(e){e.draw({frag:s,uniforms:{src:e.src,time:e.time,amount:this.#e},target:e.target})}};e(()=>{let e=document.getElementById(`WaveDemo`),n=document.getElementById(`WaveAmount`);if(e&&n){let r;t(e,()=>(r=new c({amount:n.valueAsNumber}),{effect:r})),n.addEventListener(`input`,()=>{r&&(r.params.amount=n.valueAsNumber)})}let i=document.getElementById(`TrailDemo`);i&&t(i,()=>({effect:new o}));let a=document.getElementById(`TileDemo`);if(a){let e;t(a,()=>(e=new r,{effect:e})),a.addEventListener(`click`,()=>e?.shuffle())}});