import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./logo-640w-20p-22Elz6NL.js";import{d as r,f as i,o as a}from"./utils-B1igQqx3.js";import"./preset-DFGAZ5Mi.js";import{n as o}from"./_pad-x6ZvL2VN.js";function s(e){return{attributes:{position:{data:new Float32Array([0,-1,1,-1,1,1,0,1]),itemSize:2}},indices:new Uint16Array([0,1,2,0,2,3]),instanceCount:e*e}}var c,l,u,d,f,p,m,h,g;function _(){return(_=e((()=>{c=`#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;

void main() {
    vec2 inS = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    vec2 inC = step(vec2(0.0), uvContent) * step(uvContent, vec2(1.0));
    float m = inS.x * inS.y * inC.x * inC.y;
    vec4 base = texture(src, clamp(uvSrc, 0.0, 1.0)) * m;
    outColor = vec4(base.rgb * base.a, base.a);
}
`,l=`
float hash(uint n) {
    n = (n ^ 61u) ^ (n >> 16u);
    n *= 9u;
    n = n ^ (n >> 4u);
    n *= 0x27d4eb2du;
    n = n ^ (n >> 15u);
    return float(n & 0x00ffffffu) / 16777216.0;
}

vec2 cellUv(ivec2 cell, int dim) {
    uint i = uint(cell.y * dim + cell.x);
    vec2 j = vec2(hash(i * 2u + 1u), hash(i * 2u + 2u)) - 0.5;
    return (vec2(cell) + 0.5 + j * 0.8) / float(dim);
}
`,u=`#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D src;
uniform float threshold;   // highlight cutoff
uniform float highlightClamp; // upper clamp on source highlight brightness
uniform int dim;
${l}
void main() {
    ivec2 cell = ivec2(gl_FragCoord.xy);
    vec3 c = texture(src, cellUv(cell, dim)).rgb;
    // Max-channel knee, hue preserved, clamped so blown-out sources
    // don't dominate. gate is the highlight factor in [0,1].
    float vmax = max(max(c.r, c.g), c.b);
    if (vmax > highlightClamp) {
        c *= highlightClamp / vmax;
        vmax = highlightClamp;
    }
    float gate = max(0.0, vmax - threshold) / max(vmax, 1e-5);
    outColor = vec4(c, gate);
}
`,d=`#version 300 es
precision highp float;
in vec2 position;

uniform sampler2D highlight; // dim×dim pre-pass output
uniform int dim;
// Source buffer rect and this stage's output rect, in element-local
// physical px. The host viewport equals dstRect.
uniform vec4 srcRect;
uniform vec4 dstRect;
uniform float angle;       // streak direction (rad)
uniform float lengthPx;    // max streak length (physical px)
uniform float widthPx;     // streak cross-section width (physical px)

out float v_along;
out float v_cross;
out vec3 v_color;
out float v_gate;
${l}
void main() {
    ivec2 cell = ivec2(gl_InstanceID % dim, gl_InstanceID / dim);
    vec4 hl = texelFetch(highlight, cell, 0);
    vec3 c = hl.rgb;
    float gate = hl.a;

    // Cull dim cells: collapse the quad to a single off-screen point.
    if (gate < 0.003) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        v_along = 0.0;
        v_cross = 0.0;
        v_color = vec3(0.0);
        v_gate = 0.0;
        return;
    }

    vec2 srcPx = srcRect.xy + cellUv(cell, dim) * srcRect.zw;
    vec2 centerNdc = (srcPx - dstRect.xy) / dstRect.zw * 2.0 - 1.0;

    vec2 dir = vec2(cos(angle), sin(angle));
    vec2 perp = vec2(-dir.y, dir.x);

    vec2 offPx = dir * (position.x * lengthPx)
               + perp * (position.y * widthPx * 0.5);

    // px → NDC delta; the divide by w/h is undone by the viewport mapping.
    vec2 ndc = centerNdc + offPx * 2.0 / dstRect.zw;
    gl_Position = vec4(ndc, 0.0, 1.0);

    v_along = position.x;
    v_cross = position.y;
    v_color = c;
    v_gate = gate;
}
`,f=`#version 300 es
precision highp float;
in float v_along;
in float v_cross;
in vec3 v_color;
in float v_gate;

uniform float falloff;          // length fade decay rate
uniform float dispersion;       // -1 = blue tip, +1 = red tip
uniform float fringe;           // diffraction fringe contrast
uniform float fringeCount;      // fringes along the streak (green reference)

out vec4 outColor;

void main() {
    // Normalized exponential length falloff, pinned to 1 at the source
    // and 0 at the tip. Floor k so falloff -> 0 approaches the linear
    // limit instead of degenerating to zero output.
    float k = max(falloff, 1e-3);
    float eEnd = exp(-k);
    float base = max((exp(-k * v_along) - eEnd) / max(1.0 - eEnd, 1e-4), 0.0);
    // Dispersion: per-channel exponential reach ratio pivoting on green,
    // applied over the normalized profile so the tip fringe survives.
    float spread = dispersion * 0.8;
    vec3 perChannel = base * exp(k * spread * vec3(1.0, 0.0, -1.0) * v_along);
    // Soft gaussian cross-section so neighbouring sprites overlap into a
    // continuous sheet instead of discrete stripes.
    float crossFall = exp(-v_cross * v_cross * 2.0);
    vec3 rgb = v_color * perChannel * (crossFall * v_gate);

    // Diffraction fringes: per-channel intensity modulation whose period
    // scales with wavelength (630/530/465 nm), so all channels peak at the
    // source (white core) and separate into rainbow bands further out.
    if (fringe > 1e-4) {
        vec3 freq = fringeCount * vec3(0.8413, 1.0, 1.1398);
        vec3 m = 0.5 + 0.5 * cos(6.2831853 * freq * v_along);
        rgb *= mix(vec3(1.0), m, fringe);
    }

    if (max(max(rgb.r, rgb.g), rgb.b) < 1e-4) {
        discard;
    }
    outColor = vec4(rgb, 1.0);
}
`,p=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D accum;
uniform vec3 tint;
uniform float intensity;
uniform float norm;        // core-gain normalisation (cross-method calibration)

void main() {
    vec3 acc = max(texture(accum, uv).rgb, vec3(0.0));
    vec3 s = (1.0 - exp(-acc * norm * intensity)) * tint;
    float a = clamp(dot(s, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    outColor = vec4(s, a);
}
`,m=256,h={streaks:2,angle:0,length:300,width:3,falloff:2,threshold:.9,highlightClamp:1,intensity:.5,tint:[1,1,1],dispersion:-.3,fringe:.5,fringeCount:1.5,density:256,resolution:.2,pad:300},g=class{params;#e=null;#t=0;#n=null;#r=null;#i=0;#a=0;constructor(e={}){this.params={...h,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=Math.max(2,Math.floor(this.params.density));this.#e&&this.#t===t||(this.#e&&e.releaseGeometry(this.#e),this.#e=s(t),this.#t=t,this.#r?.dispose(),this.#r=e.createRenderTarget({size:[t,t],float:!0,filter:`nearest`}));let n=this.#r;if(!n)return;let r=this.outputRect(e.dims),i=e.dims.srcRect,a=e.dims.pixelRatio,o=Math.min(Math.max(this.params.resolution,.1),1),l=Math.max(2,Math.round(r[2]*o)),h=Math.max(2,Math.round(r[3]*o));(l!==this.#i||h!==this.#a)&&(this.#n?.dispose(),this.#n=e.createRenderTarget({size:[l,h],float:!0,filter:`linear`}),this.#i=l,this.#a=h);let g=this.#n;if(!g)return;e.draw({frag:c,target:e.target,uniforms:{src:e.src}}),e.draw({frag:u,target:n,blend:`none`,uniforms:{src:e.src,threshold:this.params.threshold,highlightClamp:Math.max(this.params.threshold+.001,this.params.highlightClamp),dim:t}}),e.clear(g);let _=Math.max(1,Math.round(this.params.streaks)),v=this.params.length*a,y=this.params.width*a,b=this.params.angle*Math.PI/180;for(let a=0;a<_;a++){let o=b+a*Math.PI*2/_;e.draw({vert:d,frag:f,geometry:this.#e,blend:`additive`,target:g,uniforms:{highlight:n,dim:t,srcRect:[i[0],i[1],i[2],i[3]],dstRect:[r[0],r[1],r[2],r[3]],angle:o,lengthPx:v,widthPx:y,falloff:this.params.falloff,dispersion:this.params.dispersion,fringe:this.params.fringe,fringeCount:this.params.fringeCount}})}let x=(m/t)**2;e.draw({frag:p,target:e.target,blend:`additive`,uniforms:{accum:g,intensity:this.params.intensity,norm:x/(_*.9),tint:[this.params.tint[0],this.params.tint[1],this.params.tint[2]]}})}outputRect(e){return o(this.params.pad,e)}dispose(){this.#e=null,this.#t=0,this.#n?.dispose(),this.#n=null,this.#r?.dispose(),this.#r=null,this.#i=0,this.#a=0}}})))()}var v;function y(){return(y=e((()=>{v=new URL(`live-BjZs4G_z.webp`,import.meta.url).href})))()}var b;function x(){return(x=e((()=>{b=new URL(`robot-DZtD9WOQ.webp`,import.meta.url).href})))()}var S,C,w;function T(){return(T=e((()=>{_(),y(),n(),x(),i(),S={title:`Effect/Light Streak`,parameters:{layout:`fullscreen`}},C={render:()=>{let e=document.createElement(`img`);return e.src=t,e},args:void 0},C.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let i=r(),o=new g;await i.add(n,{effect:o});let s={Logo:t,Live:v,Robot:b};a(`Light Streak`,o,{img:n,sources:s,onSrcChange:async e=>{n.src=s[e],await new Promise(e=>{n.onload=()=>e()}),await i.update(n)}})},w=[`lightStreak`],C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...C.parameters?.docs?.source}}}})))()}T();export{w as __namedExportsOrder,S as default,C as lightStreak};