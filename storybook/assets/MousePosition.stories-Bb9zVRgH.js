import{L as f}from"./preset-B_9u5Dmn.js";import{i as g}from"./utils-CoLwPjcP.js";import"./vfx-toqadiTe.js";const E={title:"Mouse Position"},h=`
precision highp float;
uniform vec2 mouse;
uniform sampler2D src;
out vec4 outColor;

void main() {
    vec2 dm = gl_FragCoord.xy - mouse;
    outColor += step(abs(dm.x), 1.) + step(abs(dm.y), 1.) * vec4(0,1,0,1);
}
`;function x(a,r){const o=document.createElement("div");o.style.cssText=`
        position: fixed;
        left: ${r[0]-10}px;
        top: ${r[1]-10}px;
        width: 20px;
        height: 20px;
        background: red;
        z-index: 9999;
        pointer-events: none;
    `,a.appendChild(o)}const y=(a,r)=>({render:()=>{const o=document.getElementById("storybook-root");o.style.height="auto",o.style.display="block";const t=document.createElement("div");if(a){const s=document.createElement("div");s.style.width="100%",s.style.height="2000px",s.style.background="#222",t.appendChild(s)}const e=document.createElement("img");return e.src=f,e.style.position="fixed",e.style.left="0",e.style.top="0",e.style.width="200px",e.style.height="200px",t.appendChild(e),x(t,r),g({pixelRatio:1}).add(e,{shader:h,overlay:!0,overflow:!0}),t},play:async({canvasElement:o})=>{const t=o.querySelector("img");t&&!t.complete&&await new Promise(e=>{t.onload=e}),window.dispatchEvent(new PointerEvent("pointermove",{clientX:r[0],clientY:r[1],pointerId:1,pointerType:"mouse",bubbles:!0})),await new Promise(e=>requestAnimationFrame(e)),await new Promise(e=>requestAnimationFrame(e))},parameters:{layout:"fullscreen",viewport:{defaultViewport:"small"}}}),i=y(!1,[200,250]),n=y(!0,[200,250]);var c,l,d;i.parameters={...i.parameters,docs:{...(c=i.parameters)==null?void 0:c.docs,source:{originalSource:"render(false, [200, 250])",...(d=(l=i.parameters)==null?void 0:l.docs)==null?void 0:d.source}}};var m,p,u;n.parameters={...n.parameters,docs:{...(m=n.parameters)==null?void 0:m.docs,source:{originalSource:"render(true, [200, 250])",...(u=(p=n.parameters)==null?void 0:p.docs)==null?void 0:u.source}}};const C=["MousePosition","MousePositionInScrollablePage"];export{i as MousePosition,n as MousePositionInScrollablePage,C as __namedExportsOrder,E as default};
