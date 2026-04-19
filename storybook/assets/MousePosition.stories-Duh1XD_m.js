import{L as f}from"./preset-B_9u5Dmn.js";import{i as h}from"./utils-BUgq-vrJ.js";import"./vfx-wGJBmbdk.js";const P={title:"Mouse Position"},x=`
precision highp float;
uniform vec2 mouse;
uniform sampler2D src;
out vec4 outColor;

void main() {
    vec2 dm = gl_FragCoord.xy - mouse;
    outColor += step(abs(dm.x), 1.) + step(abs(dm.y), 1.) * vec4(0,1,0,1);
}
`;function g(a,t){const o=document.createElement("div");o.style.cssText=`
        position: fixed;
        left: ${t[0]-10}px;
        top: ${t[1]-10}px;
        width: 20px;
        height: 20px;
        background: red;
        z-index: 9999;
        pointer-events: none;
    `,a.appendChild(o)}const y=(a,t)=>({render:()=>{const o=document.getElementById("storybook-root");o.style.height="auto",o.style.display="block";const r=document.createElement("div");if(a){const s=document.createElement("div");s.style.width="100%",s.style.height="2000px",s.style.background="#222",r.appendChild(s)}const e=document.createElement("img");return e.src=f,e.style.position="fixed",e.style.left="0",e.style.top="0",e.style.width="200px",e.style.height="200px",r.appendChild(e),g(r,t),h({pixelRatio:1}).add(e,{shader:x,overlay:!0,overflow:!0}),r},play:async()=>{window.dispatchEvent(new PointerEvent("pointermove",{clientX:t[0],clientY:t[1],pointerId:1,pointerType:"mouse",bubbles:!0}))},parameters:{layout:"fullscreen",viewport:{defaultViewport:"small"}}}),n=y(!1,[200,250]),i=y(!0,[200,250]);var c,l,d;n.parameters={...n.parameters,docs:{...(c=n.parameters)==null?void 0:c.docs,source:{originalSource:"render(false, [200, 250])",...(d=(l=n.parameters)==null?void 0:l.docs)==null?void 0:d.source}}};var p,u,m;i.parameters={...i.parameters,docs:{...(p=i.parameters)==null?void 0:p.docs,source:{originalSource:"render(true, [200, 250])",...(m=(u=i.parameters)==null?void 0:u.docs)==null?void 0:m.source}}};const C=["MousePosition","MousePositionInScrollablePage"];export{n as MousePosition,i as MousePositionInScrollablePage,C as __namedExportsOrder,P as default};
