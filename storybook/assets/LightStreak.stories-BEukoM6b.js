import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./logo-640w-20p-22Elz6NL.js";import{d as r,f as i,o as a}from"./utils-_YxdPLAl.js";import"./preset-DFGAZ5Mi.js";import{R as o,t as s}from"./esm-Dh2VieTG.js";var c;function l(){return(l=e((()=>{c=new URL(`live-BjZs4G_z.webp`,import.meta.url).href})))()}var u;function d(){return(d=e((()=>{u=new URL(`robot-DZtD9WOQ.webp`,import.meta.url).href})))()}var f,p,m;function h(){return(h=e((()=>{s(),l(),n(),d(),i(),f={title:`Effect/Light Streak`,parameters:{layout:`fullscreen`}},p={render:()=>{let e=document.createElement(`img`);return e.src=t,e},args:void 0},p.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let i=r(),s=new o;await i.add(n,{effect:s});let l={Logo:t,Live:c,Robot:u};a(`Light Streak`,s,{img:n,sources:l,onSrcChange:async e=>{n.src=l[e],await new Promise(e=>{n.onload=()=>e()}),await i.update(n)}})},m=[`lightStreak`],p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...p.parameters?.docs?.source}}}})))()}h();export{m as __namedExportsOrder,f as default,p as lightStreak};