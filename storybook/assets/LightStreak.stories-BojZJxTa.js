import{i as e}from"./preload-helper-xPQekRTU.js";import{d as t,f as n,o as r}from"./utils-BtfdcQuE.js";import{n as i,t as a}from"./logo-640w-20p-CDp-4Bv5.js";import{t as o}from"./preset-_bwWmH2a.js";import{R as s,t as c}from"./esm-CQ80yUUH.js";var l,u=e((()=>{l=``+new URL(`live-BjZs4G_z.webp`,import.meta.url).href})),d,f=e((()=>{d=``+new URL(`robot-DZtD9WOQ.webp`,import.meta.url).href})),p,m,h;e((()=>{c(),u(),a(),f(),o(),n(),p={title:`Effect/Light Streak`,parameters:{layout:`fullscreen`}},m={render:()=>{let e=document.createElement(`img`);return e.src=i,e},args:void 0},m.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let a=t(),o=new s;await a.add(n,{effect:o});let c={Logo:i,Live:l,Robot:d};r(`Light Streak`,o,{img:n,sources:c,onSrcChange:async e=>{n.src=c[e],await new Promise(e=>{n.onload=()=>e()}),await a.update(n)}})},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...m.parameters?.docs?.source}}},h=[`lightStreak`]}))();export{h as __namedExportsOrder,p as default,m as lightStreak};