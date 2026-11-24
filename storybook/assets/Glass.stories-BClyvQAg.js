import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./logo-640w-20p-22Elz6NL.js";import{g as r,h as i,m as a,o}from"./utils-AjYcdxV6.js";import{n as s,r as c,t as l}from"./glass-CbOKDWfd.js";import"./preset-DFGAZ5Mi.js";import{n as u,t as d}from"./amagi-rvGYqYQ3.js";import{n as f,t as p}from"./jellyfish-DtC6VyHr.js";import{n as m,t as h}from"./pigeon-Dic8r3mQ.js";import{i as g,n as _,r as v,t as y}from"./robot-DYF1cG3Q.js";function b(e){return E[e]??e}function x(e){let t=C[e];if(`src`in t){let e=document.createElement(`img`);return e.style.cssText=t.style,e.src=t.src,e}let n=document.createElement(t.tag);return n.style.cssText=t.style,n.textContent=t.text,n}function S(e){return e instanceof HTMLImageElement?new Promise((t,n)=>{e.complete&&e.naturalWidth>0?t():(e.addEventListener(`load`,()=>t(),{once:!0}),e.addEventListener(`error`,()=>n(Error(`load failed`)),{once:!0}))}):document.fonts.ready.then(()=>{})}var C,w,T,E,D,O,k,A,j,M;function N(){return(N=e((()=>{c(),u(),p(),v(),n(),h(),y(),i(),C={"VFX-JS logo":{src:t,style:`width: min(80vw, 960px)`},amagi:{src:d,style:`height: min(70vh, 640px)`},"slab (photo)":{src:m,style:`max-width: min(60vw, 800px); max-height: 60vh`},"HTML text":{tag:`h1`,text:`Glass`,style:`margin: 0; padding: 0 0.1em; color: #fff; font: 900 min(24vw, 300px) / 1.1 system-ui, sans-serif; letter-spacing: -0.02em`},"HTML button":{tag:`button`,text:`Click me`,style:`appearance: none; border: 0; border-radius: 999px; padding: 0.55em 1.4em; background: #fff; color: #000; font: 700 min(8vw, 96px) / 1 system-ui, sans-serif; cursor: pointer`}},w=[`stripes`,`grid`,`marble`,`flow`,`none`],T=[...Object.keys(l),`custom`],E={"image: jellyfish":f,"image: pigeon":m,"image: robot":_,"image: live":g},D=[...w,...Object.keys(E)],O={title:`Effect/Glass`,parameters:{layout:`fullscreen`,controls:{disable:!0}},render:e=>{let t=document.createElement(`div`);t.style.cssText=`position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: #000`;let n=a(),i=r(),{backdrop:c,backdropColors:u,...d}=new s({drag:!0,...e.params}).params,f=typeof u==`string`?null:u,p=f??l[u],m={a:p[0],b:p[p.length-1]},h=typeof u==`string`?u:`custom`,g=()=>h===`custom`?f&&m.a===f[0]&&m.b===f[f.length-1]?f:[m.a,m.b]:h,_=e.backdrop,v=()=>({...d,backdrop:b(_),backdropColors:g()}),y=e.source,w=null,E=null,O=0,k=Promise.resolve(),A=()=>{E&&Object.assign(E.params,v())},j=async()=>{let e=++O,r=w,a=x(y);w=a,r?(r.replaceWith(a),await k.catch(()=>{}),n.remove(r)):t.appendChild(a);try{await S(a),await new Promise(e=>requestAnimationFrame(e))}catch(e){console.error(e);return}e===O&&(E=new s(v(),{still:i}),k=n.add(a,{effect:E}),await k)};return j().then(()=>{i||o(`Glass`,d,A,{source:{keys:Object.keys(C),value:y,onChange:e=>{y=e,j()}},backdrop:{keys:D,value:_,onChange:e=>{_=e,A()}},palette:{keys:T,value:h,onChange:e=>{h=e,A()}},colors:m})}),t}},k={args:{source:`VFX-JS logo`,backdrop:`stripes`}},A={args:{source:`amagi`,backdrop:`flow`,params:{backdropColors:`pastel`,backdropSoftness:1,depth:.3,bevel:.06,bevelShape:`chamfer`,dispersion:.25,paths:3}}},j={args:{source:`HTML button`,backdrop:`grid`,params:{relief:-.05}}},M=[`logo`,`flow`,`htmlButton`],k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    source: "VFX-JS logo",
    backdrop: "stripes"
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  args: {
    source: "amagi",
    backdrop: "flow",
    params: {
      backdropColors: "pastel",
      backdropSoftness: 1,
      depth: 0.3,
      bevel: 0.06,
      bevelShape: "chamfer",
      dispersion: 0.25,
      paths: 3
    }
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    source: "HTML button",
    backdrop: "grid",
    params: {
      relief: -0.05
    }
  }
}`,...j.parameters?.docs?.source}}}})))()}N();export{M as __namedExportsOrder,O as default,A as flow,j as htmlButton,k as logo};