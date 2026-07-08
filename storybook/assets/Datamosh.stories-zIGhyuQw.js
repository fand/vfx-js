import{i as e}from"./preload-helper-xPQekRTU.js";import{d as t,f as n,r}from"./utils-Sb8JYQfs.js";import{t as i}from"./preset-_bwWmH2a.js";import{nt as a,t as o}from"./esm-CQ80yUUH.js";import{n as s,t as c}from"./bbb-Dkq0cQ87.js";import{n as l,t as u}from"./jellyfish-ChQdcEXP.js";var d,f,p,m;e((()=>{o(),s(),u(),i(),n(),d={jellyfish:l,bbb:c},f={title:`Effect/Datamosh`,parameters:{layout:`fullscreen`}},p={render:()=>{let e=document.createElement(`video`);return e.src=l,e.muted=!0,e.loop=!0,e.playsInline=!0,e.autoplay=!0,e.crossOrigin=`anonymous`,e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`,e.play(),e},args:void 0},p.play=async({canvasElement:e})=>{let n=e.querySelector(`video`);n.readyState<3&&await new Promise(e=>{n.addEventListener(`canplay`,()=>e(),{once:!0})});let i=t(),o=new a;await i.add(n,{effect:o});let s=null;r(`Datamosh`,o,async e=>{for(let e of s?.getTracks()??[])e.stop();s=null,e===`webcam`?(s=await navigator.mediaDevices.getUserMedia({video:!0}),n.srcObject=s,n.removeAttribute(`src`)):(n.srcObject=null,n.src=d[e]),await n.play()})},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
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