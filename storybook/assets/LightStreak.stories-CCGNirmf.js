import{i as e}from"./preload-helper-xPQekRTU.js";import{n as t,t as n}from"./logo-640w-20p-CDp-4Bv5.js";import{d as r,f as i,o as a}from"./utils-DQN2J993.js";import{t as o}from"./preset-_bwWmH2a.js";import{R as s,t as c}from"./esm-Csfq274Y.js";var l,u=e((()=>{l=``+new URL(`live-BjZs4G_z.webp`,import.meta.url).href})),d,f=e((()=>{d=``+new URL(`robot-DZtD9WOQ.webp`,import.meta.url).href})),p,m,h;e((()=>{c(),u(),n(),f(),o(),i(),p={title:`Effect/Light Streak`,parameters:{layout:`fullscreen`}},m={render:()=>{let e=document.createElement(`img`);return e.src=t,e},args:void 0},m.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let i=r(),o=new s;await i.add(n,{effect:o});let c={Logo:t,Live:l,Robot:d};a(`Light Streak`,o,{img:n,sources:c,onSrcChange:async e=>{n.src=c[e],await new Promise(e=>{n.onload=()=>e()}),await i.update(n)}})},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...m.parameters?.docs?.source}}},h=[`lightStreak`]}))();export{h as __namedExportsOrder,p as default,m as lightStreak};