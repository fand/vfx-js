import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{f as t,m as n,p as r}from"./utils-C6d1wicz.js";import"./preset-DFGAZ5Mi.js";import{n as i,t as a}from"./jellyfish-DtC6VyHr.js";function o(){let e=new Float32Array(8192);for(let t=0;t<4096;t++)e[t*2]=(t%s+.5)/s,e[t*2+1]=(Math.floor(t/s)+.5)/s;return{mode:`points`,attributes:{particle:{data:e,itemSize:2}},drawRange:{count:4096}}}var s,c,l,u,d,f,p,m,h,g,_,v;function y(){return(y=e((()=>{a(),r(),s=64,c=1/60,l=4,u=180,d=`
const float SIZE = ${s.toFixed(1)};

// A fixed lattice on a sphere, one point per texel.
vec3 startPosition(vec2 uv) {
    float theta = uv.x * 6.2831853;
    float phi = uv.y * 3.1415927;
    return 0.8 * vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));
}

// Lifetimes from 180 to 324 steps, staggered by particle index.
// Age counts whole steps, which stay exact in half-float targets too.
float lifetime(vec2 uv) {
    vec2 cell = floor(uv * SIZE);
    return 180.0 + mod(cell.y * SIZE + cell.x, 7.0) * 24.0;
}
`,f=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D pos;
uniform sampler2D vel;
uniform float frame;
layout(location = 0) out vec4 outPos;
layout(location = 1) out vec4 outVel;
${d}
const float DT = ${c.toFixed(8)};

vec3 force(vec3 p, float t) {
    vec3 swirl = vec3(sin(p.y * 3.0 + t * 0.5), sin(p.z * 3.0 + t * 0.7), sin(p.x * 3.0 + t * 0.3));
    vec3 spin = cross(vec3(0.0, 1.0, 0.0), p);
    return swirl * 0.8 + spin * 0.6 - p * 0.3;
}

void main() {
    vec4 state = texture(pos, uv);
    float age = state.w + 1.0;
    if (frame == 0.0 || age > lifetime(uv)) {
        outPos = vec4(startPosition(uv), 0.0);
        outVel = vec4(0.0);
        return;
    }
    // One force evaluation updates both outputs; MRT writes them in one pass.
    vec3 v = (texture(vel, uv).xyz + force(state.xyz, frame * DT) * DT) * 0.99;
    outPos = vec4(state.xyz + v * DT, age);
    outVel = vec4(v, 0.0);
}
`,p=`#version 300 es
in vec2 particle;
uniform sampler2D pos;
uniform float aspect;
uniform float pixelRatio;
out float vFade;
${d}

void main() {
    vec4 state = texture(pos, particle);
    // Fixed camera at z = 3, looking at the origin.
    vec3 view = state.xyz - vec3(0.0, 0.0, 3.0);
    float focal = 2.0;
    gl_Position = vec4(view.x * focal / aspect, view.y * focal, 0.0, -view.z);
    gl_PointSize = 4.0 * pixelRatio / -view.z;
    vFade = sin(3.1415927 * clamp(state.w / lifetime(particle), 0.0, 1.0));
}
`,m=`#version 300 es
precision highp float;
in float vFade;
out vec4 outColor;

void main() {
    outColor = vec4(0.3, 0.6, 1.0, 1.0) * 0.5 * vFade;
}
`,h=class{#e=o();#t=null;#n=null;#r=0;#i=0;init(e){let t={size:[s,s],float:!0,persistent:!0,filter:`nearest`};this.#t=e.createRenderTarget(t),this.#n=e.createRenderTarget(t),e.onContextRestored(()=>{this.#r=0})}#a(e){if(n())return this.#r===0?u:0;this.#i+=e;let t=Math.floor(this.#i/c);this.#i-=t*c;let r=Math.min(t,l);return this.#r===0?Math.max(r,1):r}render(e){let t=this.#t,n=this.#n;if(!t||!n)return;let r=this.#a(e.deltaTime);for(let i=0;i<r;i++)e.draw({frag:f,uniforms:{pos:t,vel:n,frame:this.#r},target:[t,n]}),this.#r++;let[i,a]=e.dims.elementPixel;e.blit(e.src),e.draw({vert:p,frag:m,geometry:this.#e,uniforms:{pos:t,aspect:i/a,pixelRatio:e.pixelRatio},target:e.target,blend:`additive`})}dispose(){this.#t=null,this.#n=null}},g={title:`MRT`,parameters:{layout:`fullscreen`},render:()=>{let e=document.createElement(`img`);e.src=i,e.style.display=`block`,e.style.margin=`40px auto`;let n=t();return e.onload=()=>{n.add(e,{effect:new h})},e}},_={},v=[`particles`],_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{}`,..._.parameters?.docs?.source}}}})))()}y();export{v as __namedExportsOrder,g as default,_ as particles};