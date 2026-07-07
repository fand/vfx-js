import{i as e}from"./preload-helper-xPQekRTU.js";import{d as t,r as n,u as r}from"./utils-CTrlMTv_.js";import{t as i}from"./preset-_bwWmH2a.js";import{et as a,t as o}from"./esm-BEk86aDe.js";import{n as s,t as c}from"./bbb-Dkq0cQ87.js";import{n as l,t as u}from"./jellyfish-ChQdcEXP.js";var d,f,p,m;e((()=>{o(),s(),u(),i(),t(),d={jellyfish:l,bbb:c},f={title:`Effect/Datamosh`,parameters:{layout:`fullscreen`}},p={render:()=>{let e=document.createElement(`video`);return e.src=l,e.muted=!0,e.loop=!0,e.playsInline=!0,e.autoplay=!0,e.crossOrigin=`anonymous`,e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`,e.play(),e},args:void 0},p.play=async({canvasElement:e})=>{let t=e.querySelector(`video`);t.readyState<3&&await new Promise(e=>{t.addEventListener(`canplay`,()=>e(),{once:!0})});let i=r(),o=new a;await i.add(t,{effect:o});let s=null;n(`Datamosh`,o,async e=>{for(let e of s?.getTracks()??[])e.stop();s=null,e===`webcam`?(s=await navigator.mediaDevices.getUserMedia({video:!0}),t.srcObject=s,t.removeAttribute(`src`)):(t.srcObject=null,t.src=d[e]),await t.play()})},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
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