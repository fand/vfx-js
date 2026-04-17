import{i as u}from"./utils-C00prF83.js";import{L as n}from"./preset-B_9u5Dmn.js";import"./vfx-CaMVhH5E.js";const _={title:"Backbuffer",parameters:{layout:"fullscreen"}},d=`
precision highp float;
uniform vec2 offset;
uniform vec2 resolution;
uniform sampler2D src;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    outColor = texture(src, uv);

    // Show the UV coordinate
    outColor += vec4(fract(uv), 0, 0.25);

    // Show the center
    vec2 p = uv * 2. - 1.;
    p.x *= resolution.x / resolution.y;
    outColor += (fract(length(p)) * .5 + .5) * 0.25;
}
`,S=`
precision highp float;
uniform vec2 offset;
uniform vec2 resolution;
uniform float time;
uniform sampler2D backbuffer;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 p = uv * 2. - 1.;
    p.x *= resolution.x / resolution.y;

    p.x -= (time / 30. * 2.) - 1.;

    outColor = vec4(step(length(p), .3));
    outColor += texture(backbuffer, uv) * vec4(.9, .95, 1, .995);
}
`,l=`
precision highp float;
uniform vec2 offset;
uniform vec2 resolution;
uniform sampler2D src;
uniform vec4 viewport;
uniform int id;
out vec4 outColor;

void main() {
    if (int(gl_FragCoord.x / 100.) % 2 == id)  {
        discard;
    }

    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    outColor = texture(src, uv);

    // Show the UV coordinate
    outColor += vec4(gl_FragCoord.xy / viewport.zw, 1, 0.5);

    vec2 p = gl_FragCoord.xy / viewport.zw * 2. - 1.;
    p.x *= viewport.z / viewport.w;
    outColor += smoothstep(.1, .0, abs(sin(length(p) * 30.))) * 0.1;
}
`,i={render:()=>{const e=document.createElement("img");return e.src=n,e},args:void 0};i.play=async({canvasElement:e})=>{const o=e.querySelector("img");await new Promise(a=>{o.onload=a});let r=0;const t=u({autoplay:!1});for(await t.add(o,{shader:S,backbuffer:!0,uniforms:{time:()=>r}});r<30;)r++,t.render()};const c={render:()=>{const e=document.createElement("div");e.className="backbufferWrapper";const o=document.createElement("img");o.id="img1",o.src=n,e.appendChild(o);const r=document.createElement("img");return r.id="img2",r.src=n,e.appendChild(r),e},args:void 0};c.play=async({canvasElement:e})=>{const o=e.querySelector("#img1"),r=e.querySelector("#img2");await Promise.all([new Promise(a=>{o.onload=a}),new Promise(a=>{r.onload=a})]);const t=u({autoplay:!1});await t.add(o,{shader:d,backbuffer:!1}),await t.add(r,{shader:d,backbuffer:!0}),t.render()};const m={render:()=>{const e=document.createElement("div");e.className="backbufferWrapper";const o=document.createElement("img");o.id="img1",o.src=n,e.appendChild(o);const r=document.createElement("img");return r.id="img2",r.src=n,e.appendChild(r),e},args:void 0};m.play=async({canvasElement:e})=>{const o=e.querySelector("#img1"),r=e.querySelector("#img2");await Promise.all([new Promise(a=>{o.onload=a}),new Promise(a=>{r.onload=a})]);const t=u({autoplay:!1});await t.add(o,{shader:d,backbuffer:!1,overflow:30}),await t.add(r,{shader:d,backbuffer:!0,overflow:30}),t.render()};const s={render:()=>{const e=document.createElement("div");e.className="backbufferWrapper";const o=document.createElement("img");o.id="img1",o.src=n,e.appendChild(o);const r=document.createElement("img");return r.id="img2",r.src=n,e.appendChild(r),e},args:void 0};s.play=async({canvasElement:e})=>{const o=e.querySelector("#img1"),r=e.querySelector("#img2");await Promise.all([new Promise(a=>{o.onload=a}),new Promise(a=>{r.onload=a})]);const t=u({autoplay:!1});await t.add(o,{shader:l,backbuffer:!1,overflow:!0,uniforms:{id:0}}),await t.add(r,{shader:l,backbuffer:!0,overflow:!0,uniforms:{id:1}}),t.render()};var p,g,f;i.parameters={...i.parameters,docs:{...(p=i.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...(f=(g=i.parameters)==null?void 0:g.docs)==null?void 0:f.source}}};var b,v,w;c.parameters={...c.parameters,docs:{...(b=c.parameters)==null?void 0:b.docs,source:{originalSource:`{
  render: () => {
    const wrapper = document.createElement("div");
    wrapper.className = "backbufferWrapper";
    const img1 = document.createElement("img");
    img1.id = "img1";
    img1.src = Logo;
    wrapper.appendChild(img1);
    const img2 = document.createElement("img");
    img2.id = "img2";
    img2.src = Logo;
    wrapper.appendChild(img2);
    return wrapper;
  },
  args: undefined
}`,...(w=(v=c.parameters)==null?void 0:v.docs)==null?void 0:w.source}}};var h,C,y;m.parameters={...m.parameters,docs:{...(h=m.parameters)==null?void 0:h.docs,source:{originalSource:`{
  render: () => {
    const wrapper = document.createElement("div");
    wrapper.className = "backbufferWrapper";
    const img1 = document.createElement("img");
    img1.id = "img1";
    img1.src = Logo;
    wrapper.appendChild(img1);
    const img2 = document.createElement("img");
    img2.id = "img2";
    img2.src = Logo;
    wrapper.appendChild(img2);
    return wrapper;
  },
  args: undefined
}`,...(y=(C=m.parameters)==null?void 0:C.docs)==null?void 0:y.source}}};var k,x,E;s.parameters={...s.parameters,docs:{...(k=s.parameters)==null?void 0:k.docs,source:{originalSource:`{
  render: () => {
    const wrapper = document.createElement("div");
    wrapper.className = "backbufferWrapper";
    const img1 = document.createElement("img");
    img1.id = "img1";
    img1.src = Logo;
    wrapper.appendChild(img1);
    const img2 = document.createElement("img");
    img2.id = "img2";
    img2.src = Logo;
    wrapper.appendChild(img2);
    return wrapper;
  },
  args: undefined
}`,...(E=(x=s.parameters)==null?void 0:x.docs)==null?void 0:E.source}}};const q=["backbuffer","backbufferCompatibility","backbufferCompatibilityOverflow","backbufferCompatibilityFullscreen"];export{q as __namedExportsOrder,i as backbuffer,c as backbufferCompatibility,s as backbufferCompatibilityFullscreen,m as backbufferCompatibilityOverflow,_ as default};
