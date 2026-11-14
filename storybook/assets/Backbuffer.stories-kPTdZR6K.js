import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./logo-640w-20p-22Elz6NL.js";import{d as r,f as i}from"./utils-BPnBG3Us.js";import"./preset-DFGAZ5Mi.js";var a,o,s,c,l,u,d,f,p;function m(){return(m=e((()=>{n(),i(),a={title:`Backbuffer`,parameters:{layout:`fullscreen`}},o=`
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
`,s=`
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
`,c=`
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
`,l={render:()=>{let e=document.createElement(`img`);return e.src=t,e},args:void 0},l.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=0,i=r({autoplay:!1});for(await i.add(t,{shader:s,backbuffer:!0,uniforms:{time:()=>n}});n<30;)n++,i.render()},u={render:()=>{let e=document.createElement(`div`);e.className=`backbufferWrapper`;let n=document.createElement(`img`);n.id=`img1`,n.src=t,e.appendChild(n);let r=document.createElement(`img`);return r.id=`img2`,r.src=t,e.appendChild(r),e},args:void 0},u.play=async({canvasElement:e})=>{let t=e.querySelector(`#img1`),n=e.querySelector(`#img2`);await Promise.all([new Promise(e=>{t.onload=e}),new Promise(e=>{n.onload=e})]);let i=r({autoplay:!1});await i.add(t,{shader:o,backbuffer:!1}),await i.add(n,{shader:o,backbuffer:!0}),i.render()},d={render:()=>{let e=document.createElement(`div`);e.className=`backbufferWrapper`;let n=document.createElement(`img`);n.id=`img1`,n.src=t,e.appendChild(n);let r=document.createElement(`img`);return r.id=`img2`,r.src=t,e.appendChild(r),e},args:void 0},d.play=async({canvasElement:e})=>{let t=e.querySelector(`#img1`),n=e.querySelector(`#img2`);await Promise.all([new Promise(e=>{t.onload=e}),new Promise(e=>{n.onload=e})]);let i=r({autoplay:!1});await i.add(t,{shader:o,backbuffer:!1,overflow:30}),await i.add(n,{shader:o,backbuffer:!0,overflow:30}),i.render()},f={render:()=>{let e=document.createElement(`div`);e.className=`backbufferWrapper`;let n=document.createElement(`img`);n.id=`img1`,n.src=t,e.appendChild(n);let r=document.createElement(`img`);return r.id=`img2`,r.src=t,e.appendChild(r),e},args:void 0},f.play=async({canvasElement:e})=>{let t=e.querySelector(`#img1`),n=e.querySelector(`#img2`);await Promise.all([new Promise(e=>{t.onload=e}),new Promise(e=>{n.onload=e})]);let i=r({autoplay:!1});await i.add(t,{shader:c,backbuffer:!1,overflow:!0,uniforms:{id:0}}),await i.add(n,{shader:c,backbuffer:!0,overflow:!0,uniforms:{id:1}}),i.render()},p=[`backbuffer`,`backbufferCompatibility`,`backbufferCompatibilityOverflow`,`backbufferCompatibilityFullscreen`],l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
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
}`,...f.parameters?.docs?.source}}}})))()}m();export{p as __namedExportsOrder,l as backbuffer,u as backbufferCompatibility,f as backbufferCompatibilityFullscreen,d as backbufferCompatibilityOverflow,a as default};