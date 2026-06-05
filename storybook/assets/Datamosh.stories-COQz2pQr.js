import{n as e}from"./chunk-BneVvdWh.js";import{l as t,n,u as r}from"./utils-CkQEfjYT.js";import{t as i}from"./preset-B7f9t9lo.js";import{d as a,t as o}from"./esm-Bdhf-gy3.js";import{n as s,t as c}from"./bbb-aniiCR4j.js";import{n as l,t as u}from"./jellyfish-C97cIPqw.js";var d,f,p,m;e((()=>{o(),s(),u(),i(),r(),d={jellyfish:l,bbb:c},f={title:`Effect/Datamosh`,parameters:{layout:`fullscreen`}},p={render:()=>{let e=document.createElement(`video`);return e.src=l,e.muted=!0,e.loop=!0,e.playsInline=!0,e.autoplay=!0,e.crossOrigin=`anonymous`,e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`,e.play(),e},args:void 0},p.play=async({canvasElement:e})=>{let r=e.querySelector(`video`);r.readyState<3&&await new Promise(e=>{r.addEventListener(`canplay`,()=>e(),{once:!0})});let i=t(),o=new a;await i.add(r,{effect:o});let s=null;n(`Datamosh`,o,async e=>{for(let e of s?.getTracks()??[])e.stop();s=null,e===`webcam`?(s=await navigator.mediaDevices.getUserMedia({video:!0}),r.srcObject=s,r.removeAttribute(`src`)):(r.srcObject=null,r.src=d[e]),await r.play()})},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => {
    const video = document.createElement("video");
    video.src = JellyfishMp4;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.crossOrigin = "anonymous";
    video.style.display = "block";
    video.style.margin = "40px auto";
    video.style.maxWidth = "80vw";
    void video.play();
    return video;
  },
  args: undefined
}`,...p.parameters?.docs?.source}}},m=[`datamosh`]}))();export{m as __namedExportsOrder,p as datamosh,f as default};