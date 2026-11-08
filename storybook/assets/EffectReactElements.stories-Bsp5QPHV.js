import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{t as n}from"./client-lsv969vs.js";import"./preset-DFGAZ5Mi.js";import{g as r,i,l as a,n as o,r as s,s as c,t as l}from"./react-D6bMJ9f7.js";import{E as u,ct as d,g as f,t as p}from"./esm-Dh2VieTG.js";import{n as m,t as h}from"./jellyfish-D_mofjh4.js";function g(){return{threshold:.4,softness:.3,intensity:3.5,scatter:1,dither:0,edgeFade:.02,pad:120}}function _(){return(0,b.jsx)(a,{children:(0,b.jsxs)(`div`,{style:S,children:[(0,b.jsxs)(`section`,{children:[(0,b.jsx)(`div`,{style:C,children:`VFXVideo + pixelate`}),(0,b.jsx)(c,{src:m,autoPlay:!0,loop:!0,muted:!0,playsInline:!0,style:{width:320,marginTop:12},effect:[new u({size:8})]})]}),(0,b.jsxs)(`section`,{children:[(0,b.jsx)(`div`,{style:C,children:`VFXSpan + bloom`}),(0,b.jsx)(s,{style:{display:`inline-block`,marginTop:12,fontSize:64,fontWeight:800,color:`#ff4fa3`},effect:[new d(g())],children:`Hello, VFXSpan`})]}),(0,b.jsxs)(`section`,{children:[(0,b.jsx)(`div`,{style:C,children:`VFXDiv + bloom`}),(0,b.jsx)(l,{style:{display:`inline-block`,marginTop:12,padding:`24px 32px`,background:`linear-gradient(135deg, #2d0040, #002040)`,borderRadius:8,fontSize:24,fontWeight:700,color:`#ffe066`},effect:[new d(g())],children:`VFXDiv container`})]}),(0,b.jsxs)(`section`,{children:[(0,b.jsx)(`div`,{style:C,children:`VFXP + scanline`}),(0,b.jsx)(o,{style:{marginTop:12,maxWidth:560,fontSize:18,lineHeight:1.6,color:`#a0e4ff`},effect:[new f({spacing:4})],children:`VFXP is the paragraph variant. Text elements go through dom2canvas, then the effect chain runs against that captured texture.`})]})]})})}function v(){return r({pixelRatio:1}),(0,b.jsxs)(`div`,{style:S,children:[(0,b.jsxs)(`section`,{children:[(0,b.jsx)(`div`,{style:C,children:`No VFXProvider`}),(0,b.jsx)(c,{src:m,autoPlay:!0,loop:!0,muted:!0,playsInline:!0,style:{width:320,marginTop:12},shader:`rgbShift`})]}),(0,b.jsx)(`section`,{children:(0,b.jsx)(s,{shader:`rainbow`,style:{fontSize:48},children:`Shared instance`})})]})}var y,b,x,S,C,w,T,E;function D(){return(D=e((()=>{p(),i(),y=n(),h(),b=t(),x={title:`Effect/React`,parameters:{layout:`fullscreen`}},S={display:`flex`,flexDirection:`column`,gap:48,padding:48,fontFamily:`system-ui, sans-serif`,color:`#fff`},C={fontSize:14,fontWeight:600,color:`#a0e4ff`,letterSpacing:1,textTransform:`uppercase`},w={name:`Elements Smoke Test`,render:()=>{let e=document.getElementById(`storybook-root`);return e&&(e.style.height=`auto`,e.style.display=`block`),document.createElement(`div`)},args:void 0},w.play=async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e));let t=e.firstElementChild;(0,y.createRoot)(t).render((0,b.jsx)(_,{}))},T={name:`No Provider`,render:()=>{let e=document.getElementById(`storybook-root`);return e&&(e.style.height=`auto`,e.style.display=`block`),document.createElement(`div`)},args:void 0},T.play=async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e));let t=e.firstElementChild;(0,y.createRoot)(t).render((0,b.jsx)(v,{}))},E=[`elementsSmokeTest`,`noProvider`],w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
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
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
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
}`,...T.parameters?.docs?.source}}}})))()}D();export{E as __namedExportsOrder,x as default,w as elementsSmokeTest,T as noProvider};