import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{t as n}from"./client-lsv969vs.js";import"./preset-DFGAZ5Mi.js";import{g as r,i,l as a,n as o,r as s,s as c,t as l}from"./react-C0QCOBq_.js";import{a as u,i as d,n as f,o as p,r as m,t as h}from"./scanline-Bcvh5Sks.js";import{n as g,t as _}from"./jellyfish-D_mofjh4.js";function v(){return{threshold:.4,softness:.3,intensity:3.5,scatter:1,dither:0,edgeFade:.02,pad:120}}function y(){return(0,S.jsx)(a,{children:(0,S.jsxs)(`div`,{style:w,children:[(0,S.jsxs)(`section`,{children:[(0,S.jsx)(`div`,{style:T,children:`VFXVideo + pixelate`}),(0,S.jsx)(c,{src:g,autoPlay:!0,loop:!0,muted:!0,playsInline:!0,style:{width:320,marginTop:12},effect:[new m({size:8})]})]}),(0,S.jsxs)(`section`,{children:[(0,S.jsx)(`div`,{style:T,children:`VFXSpan + bloom`}),(0,S.jsx)(s,{style:{display:`inline-block`,marginTop:12,fontSize:64,fontWeight:800,color:`#ff4fa3`},effect:[new u(v())],children:`Hello, VFXSpan`})]}),(0,S.jsxs)(`section`,{children:[(0,S.jsx)(`div`,{style:T,children:`VFXDiv + bloom`}),(0,S.jsx)(l,{style:{display:`inline-block`,marginTop:12,padding:`24px 32px`,background:`linear-gradient(135deg, #2d0040, #002040)`,borderRadius:8,fontSize:24,fontWeight:700,color:`#ffe066`},effect:[new u(v())],children:`VFXDiv container`})]}),(0,S.jsxs)(`section`,{children:[(0,S.jsx)(`div`,{style:T,children:`VFXP + scanline`}),(0,S.jsx)(o,{style:{marginTop:12,maxWidth:560,fontSize:18,lineHeight:1.6,color:`#a0e4ff`},effect:[new h({spacing:4})],children:`VFXP is the paragraph variant. Text elements go through dom2canvas, then the effect chain runs against that captured texture.`})]})]})})}function b(){return r({pixelRatio:1}),(0,S.jsxs)(`div`,{style:w,children:[(0,S.jsxs)(`section`,{children:[(0,S.jsx)(`div`,{style:T,children:`No VFXProvider`}),(0,S.jsx)(c,{src:g,autoPlay:!0,loop:!0,muted:!0,playsInline:!0,style:{width:320,marginTop:12},shader:`rgbShift`})]}),(0,S.jsx)(`section`,{children:(0,S.jsx)(s,{shader:`rainbow`,style:{fontSize:48},children:`Shared instance`})})]})}var x,S,C,w,T,E,D,O;function k(){return(k=e((()=>{p(),d(),f(),i(),x=n(),_(),S=t(),C={title:`Effect/React`,parameters:{layout:`fullscreen`}},w={display:`flex`,flexDirection:`column`,gap:48,padding:48,fontFamily:`system-ui, sans-serif`,color:`#fff`},T={fontSize:14,fontWeight:600,color:`#a0e4ff`,letterSpacing:1,textTransform:`uppercase`},E={name:`Elements Smoke Test`,render:()=>{let e=document.getElementById(`storybook-root`);return e&&(e.style.height=`auto`,e.style.display=`block`),document.createElement(`div`)},args:void 0},E.play=async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e));let t=e.firstElementChild;(0,x.createRoot)(t).render((0,S.jsx)(y,{}))},D={name:`No Provider`,render:()=>{let e=document.getElementById(`storybook-root`);return e&&(e.style.height=`auto`,e.style.display=`block`),document.createElement(`div`)},args:void 0},D.play=async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e));let t=e.firstElementChild;(0,x.createRoot)(t).render((0,S.jsx)(b,{}))},O=[`elementsSmokeTest`,`noProvider`],E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  name: "Elements Smoke Test",
  render: () => {
    const root = document.getElementById("storybook-root");
    if (root) {
      root.style.height = "auto";
      root.style.display = "block";
    }
    const container = document.createElement("div");
    return container;
  },
  args: undefined
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  name: "No Provider",
  render: () => {
    const root = document.getElementById("storybook-root");
    if (root) {
      root.style.height = "auto";
      root.style.display = "block";
    }
    return document.createElement("div");
  },
  args: undefined
}`,...D.parameters?.docs?.source}}}})))()}k();export{O as __namedExportsOrder,C as default,E as elementsSmokeTest,D as noProvider};