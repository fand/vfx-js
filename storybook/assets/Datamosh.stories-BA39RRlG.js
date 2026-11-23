import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{m as t,p as n,r}from"./utils-_F9SZfcx.js";import{n as i,t as a}from"./datamosh-BndtgXA6.js";import"./preset-DFGAZ5Mi.js";import{n as o,t as s}from"./jellyfish-D_mofjh4.js";import{n as c,t as l}from"./bbb-BpWt09Zd.js";var u,d,f,p;function m(){return(m=e((()=>{i(),c(),s(),t(),u={jellyfish:o,bbb:l},d={title:`Effect/Datamosh`,parameters:{layout:`fullscreen`}},f={render:()=>{let e=document.createElement(`video`);return e.src=o,e.muted=!0,e.loop=!0,e.playsInline=!0,e.autoplay=!0,e.crossOrigin=`anonymous`,e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`,e.play(),e},args:void 0},f.play=async({canvasElement:e})=>{let t=e.querySelector(`video`);t.readyState<3&&await new Promise(e=>{t.addEventListener(`canplay`,()=>e(),{once:!0})});let i=n(),o=new a;await i.add(t,{effect:o});let s=null;r(`Datamosh`,o,async e=>{for(let e of s?.getTracks()??[])e.stop();s=null,e===`webcam`?(s=await navigator.mediaDevices.getUserMedia({video:!0}),t.srcObject=s,t.removeAttribute(`src`)):(t.srcObject=null,t.src=u[e]),await t.play()})},p=[`datamosh`],f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
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