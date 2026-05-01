import{n as e}from"./chunk-BneVvdWh.js";import{a as t,o as n}from"./utils-BLrKilFH.js";import{n as r,r as i,t as a}from"./preset-hB8Fk8QM.js";var o,s,c,l,u,d,f,p,m;e((()=>{n(),r(),a(),o={title:`Backbuffer`,parameters:{layout:`fullscreen`}},s=`
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
`,c=`
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
`,u={render:()=>{let e=document.createElement(`img`);return e.src=i,e},args:void 0},u.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let r=0,i=t({autoplay:!1});for(await i.add(n,{shader:c,backbuffer:!0,uniforms:{time:()=>r}});r<30;)r++,i.render()},d={render:()=>{let e=document.createElement(`div`);e.className=`backbufferWrapper`;let t=document.createElement(`img`);t.id=`img1`,t.src=i,e.appendChild(t);let n=document.createElement(`img`);return n.id=`img2`,n.src=i,e.appendChild(n),e},args:void 0},d.play=async({canvasElement:e})=>{let n=e.querySelector(`#img1`),r=e.querySelector(`#img2`);await Promise.all([new Promise(e=>{n.onload=e}),new Promise(e=>{r.onload=e})]);let i=t({autoplay:!1});await i.add(n,{shader:s,backbuffer:!1}),await i.add(r,{shader:s,backbuffer:!0}),i.render()},f={render:()=>{let e=document.createElement(`div`);e.className=`backbufferWrapper`;let t=document.createElement(`img`);t.id=`img1`,t.src=i,e.appendChild(t);let n=document.createElement(`img`);return n.id=`img2`,n.src=i,e.appendChild(n),e},args:void 0},f.play=async({canvasElement:e})=>{let n=e.querySelector(`#img1`),r=e.querySelector(`#img2`);await Promise.all([new Promise(e=>{n.onload=e}),new Promise(e=>{r.onload=e})]);let i=t({autoplay:!1});await i.add(n,{shader:s,backbuffer:!1,overflow:30}),await i.add(r,{shader:s,backbuffer:!0,overflow:30}),i.render()},p={render:()=>{let e=document.createElement(`div`);e.className=`backbufferWrapper`;let t=document.createElement(`img`);t.id=`img1`,t.src=i,e.appendChild(t);let n=document.createElement(`img`);return n.id=`img2`,n.src=i,e.appendChild(n),e},args:void 0},p.play=async({canvasElement:e})=>{let n=e.querySelector(`#img1`),r=e.querySelector(`#img2`);await Promise.all([new Promise(e=>{n.onload=e}),new Promise(e=>{r.onload=e})]);let i=t({autoplay:!1});await i.add(n,{shader:l,backbuffer:!1,overflow:!0,uniforms:{id:0}}),await i.add(r,{shader:l,backbuffer:!0,overflow:!0,uniforms:{id:1}}),i.render()},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
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
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
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
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
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
}`,...p.parameters?.docs?.source}}},m=[`backbuffer`,`backbufferCompatibility`,`backbufferCompatibilityOverflow`,`backbufferCompatibilityFullscreen`]}))();export{m as __namedExportsOrder,u as backbuffer,d as backbufferCompatibility,p as backbufferCompatibilityFullscreen,f as backbufferCompatibilityOverflow,o as default};