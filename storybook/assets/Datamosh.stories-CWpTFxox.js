import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{d as t,f as n,r}from"./utils-DwVy0XXO.js";import"./preset-DFGAZ5Mi.js";import{nt as i,t as a}from"./esm-Dh2VieTG.js";import{n as o,t as s}from"./bbb-BpWt09Zd.js";import{n as c,t as l}from"./jellyfish-D_mofjh4.js";var u,d,f,p;function m(){return(m=e((()=>{a(),o(),l(),n(),u={jellyfish:c,bbb:s},d={title:`Effect/Datamosh`,parameters:{layout:`fullscreen`}},f={render:()=>{let e=document.createElement(`video`);return e.src=c,e.muted=!0,e.loop=!0,e.playsInline=!0,e.autoplay=!0,e.crossOrigin=`anonymous`,e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`,e.play(),e},args:void 0},f.play=async({canvasElement:e})=>{let n=e.querySelector(`video`);n.readyState<3&&await new Promise(e=>{n.addEventListener(`canplay`,()=>e(),{once:!0})});let a=t(),o=new i;await a.add(n,{effect:o});let s=null;r(`Datamosh`,o,async e=>{for(let e of s?.getTracks()??[])e.stop();s=null,e===`webcam`?(s=await navigator.mediaDevices.getUserMedia({video:!0}),n.srcObject=s,n.removeAttribute(`src`)):(n.srcObject=null,n.src=u[e]),await n.play()})},p=[`datamosh`],f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
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
}`,...f.parameters?.docs?.source}}}})))()}m();export{p as __namedExportsOrder,f as datamosh,d as default};