import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./logo-640w-20p-22Elz6NL.js";import{d as r,f as i}from"./utils-C2DuqTxv.js";import"./preset-DFGAZ5Mi.js";function a(e,t){let n=document.createElement(`div`);n.style.cssText=`
        position: fixed;
        left: ${t[0]-10}px;
        top: ${t[1]-10}px;
        width: 20px;
        height: 20px;
        background: red;
        z-index: 9999;
        pointer-events: none;
    `,e.appendChild(n)}var o,s,c,l,u,d;function f(){return(f=e((()=>{n(),i(),o={title:`Mouse Position`},s=`
precision highp float;
uniform vec2 mouse;
uniform sampler2D src;
out vec4 outColor;

void main() {
    vec2 dm = gl_FragCoord.xy - mouse;
    outColor += step(abs(dm.x), 1.) + step(abs(dm.y), 1.) * vec4(0,1,0,1);
}
`,c=(e,n)=>({render:()=>{let i=document.getElementById(`storybook-root`);i.style.height=`auto`,i.style.display=`block`;let o=document.createElement(`div`);if(e){let e=document.createElement(`div`);e.style.width=`100%`,e.style.height=`2000px`,e.style.background=`#222`,o.appendChild(e)}let c=document.createElement(`img`);return c.src=t,c.style.position=`fixed`,c.style.left=`0`,c.style.top=`0`,c.style.width=`200px`,c.style.height=`200px`,o.appendChild(c),a(o,n),r({pixelRatio:1}).add(c,{shader:s,overlay:!0,overflow:!0}),o},play:async({canvasElement:e})=>{let t=e.querySelector(`img`);t&&!t.complete&&await new Promise(e=>{t.onload=e}),window.dispatchEvent(new PointerEvent(`pointermove`,{clientX:n[0],clientY:n[1],pointerId:1,pointerType:`mouse`,bubbles:!0})),await new Promise(e=>requestAnimationFrame(e)),await new Promise(e=>requestAnimationFrame(e))},parameters:{layout:`fullscreen`,viewport:{defaultViewport:`small`}}}),l=c(!1,[200,250]),u=c(!0,[200,250]),d=[`MousePosition`,`MousePositionInScrollablePage`],l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`render(false, [200, 250])`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`render(true, [200, 250])`,...u.parameters?.docs?.source}}}})))()}f();export{l as MousePosition,u as MousePositionInScrollablePage,d as __namedExportsOrder,o as default};