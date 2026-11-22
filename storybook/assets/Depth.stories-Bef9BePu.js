import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{h as t,m as n,p as r}from"./utils-DbJM9o0h.js";import"./preset-DFGAZ5Mi.js";import{n as i,t as a}from"./jellyfish-DtC6VyHr.js";function o(){let e=[[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[0,1,0],[1,0,0]]],t=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]],n=[],r=[];for(let[i,a,o]of e)for(let[e,s]of t)for(let t=0;t<3;t++)n.push(i[t]+e*a[t]+s*o[t]),r.push(i[t]);return{position:new Float32Array(n),normal:new Float32Array(r)}}function s(){let e=o(),t=new Float32Array(48);for(let e=0;e<u;e++)t[e*4]=e/u*Math.PI,t[e*4+1]=(e%3-1)*.35,t[e*4+2]=e/u;return{attributes:{position:{data:e.position,itemSize:3},normal:{data:e.normal,itemSize:3},instance:{data:t,itemSize:4,perInstance:!0}},instanceCount:u}}var c,l,u,d,f,p,m,h,g,_,v,y,b;function x(){return(x=e((()=>{a(),n(),c=1,l=7,u=12,d=`#version 300 es
in vec3 position;
in vec3 normal;
in vec4 instance;
uniform float time;
uniform float aspect;
out vec3 vNormal;
out float vHue;

mat3 rotateX(float a) {
    float c = cos(a), s = sin(a);
    return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
}
mat3 rotateY(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}

void main() {
    // Each bar spins around the center, so the bars cross each other.
    mat3 local = rotateY(instance.x) * rotateX(0.6 * sin(time + instance.x));
    mat3 world = rotateX(1.0) * rotateY(time * 0.4);
    vec3 p = world * (local * (position * vec3(0.12, 0.12, 1.5)) + vec3(0.0, instance.y, 0.0));
    vNormal = world * local * normal;
    vHue = instance.z;

    // Perspective camera at z = 4.
    float near = ${c.toFixed(1)};
    float far = ${l.toFixed(1)};
    float z = p.z - 4.0;
    float focal = 2.0;
    gl_Position = vec4(
        p.x * focal / aspect,
        p.y * focal,
        z * (far + near) / (near - far) + 2.0 * far * near / (near - far),
        -z
    );
}
`,f=`#version 300 es
precision highp float;
in vec3 vNormal;
in float vHue;
out vec4 outColor;

void main() {
    vec3 base = 0.5 + 0.5 * cos(6.2832 * (vHue + vec3(0.0, 0.33, 0.67)));
    float light = 0.3 + 0.7 * max(dot(normalize(vNormal), normalize(vec3(0.4, 0.8, 0.6))), 0.0);
    outColor = vec4(base * light, 1.0);
}
`,p=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D depthTexture;

void main() {
    float d = texture(depthTexture, uv).r;
    float near = ${c.toFixed(1)};
    float far = ${l.toFixed(1)};
    // Linear distance from the camera, near is white.
    float linear = 2.0 * near * far / (far + near - (2.0 * d - 1.0) * (far - near));
    float gray = 1.0 - (linear - near) / (far - near);
    outColor = vec4(vec3(gray), 1.0);
}
`,m=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D previous;

void main() {
    outColor = texture(previous, uv) * 0.92;
}
`,h=class{#e;#t=s();#n=null;constructor(e){this.#e=e}init(e){this.#n=e.createRenderTarget({depth:this.#e.depth,samples:this.#e.samples,float:this.#e.float,persistent:this.#e.trail})}render(e){let n=this.#n;if(!n)return;let{depth:r,trail:i,view:a}=this.#e;i?(e.clear(n,{color:!1}),e.draw({frag:m,uniforms:{previous:n},target:n,swap:!1})):e.clear(n),e.draw({vert:d,frag:f,geometry:this.#t,uniforms:{time:t()?2:e.time,aspect:n.width/n.height},target:n,depthTest:r,cull:`back`}),a===`depth`&&n.depthTexture?e.draw({frag:p,uniforms:{depthTexture:n.depthTexture},target:e.target}):(e.blit(e.src),e.blit(n,null,{blend:`premultiplied`}))}dispose(){this.#n=null}},g={title:`Depth`,parameters:{layout:`fullscreen`},render:e=>{let t=document.createElement(`img`);t.src=i,t.style.display=`block`,t.style.margin=`40px auto`;let n=r();return t.onload=()=>{n.add(t,{effect:new h(e)})},t},args:{depth:!0,samples:4,float:!1,trail:!1,view:`color`},argTypes:{depth:{control:`boolean`},samples:{control:`inline-radio`,options:[1,4]},float:{control:`boolean`},trail:{control:`boolean`},view:{control:`inline-radio`,options:[`color`,`depth`]}}},_={},v={args:{samples:1}},y={args:{view:`depth`}},b=[`depthAndMsaa`,`samples1`,`depthView`],_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    samples: 1
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    view: "depth"
  }
}`,...y.parameters?.docs?.source}}}})))()}x();export{b as __namedExportsOrder,g as default,_ as depthAndMsaa,y as depthView,v as samples1};