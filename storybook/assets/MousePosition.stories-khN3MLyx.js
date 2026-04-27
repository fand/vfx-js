import{n as e}from"./chunk-BneVvdWh.js";import{n as t,r as n}from"./utils-DoNm3-kt.js";import{n as r,r as i,t as a}from"./preset-hB8Fk8QM.js";function o(e,t){let n=document.createElement(`div`);n.style.cssText=`
        position: fixed;
        left: ${t[0]-10}px;
        top: ${t[1]-10}px;
        width: 20px;
        height: 20px;
        background: red;
        z-index: 9999;
        pointer-events: none;
    `,e.appendChild(n)}var s,c,l,u,d,f;e((()=>{r(),n(),a(),s={title:`Mouse Position`},c=`
precision highp float;
uniform vec2 mouse;
uniform sampler2D src;
out vec4 outColor;

void main() {
    vec2 dm = gl_FragCoord.xy - mouse;
    outColor += step(abs(dm.x), 1.) + step(abs(dm.y), 1.) * vec4(0,1,0,1);
}
`,l=(e,n)=>({render:()=>{let r=document.getElementById(`storybook-root`);r.style.height=`auto`,r.style.display=`block`;let a=document.createElement(`div`);if(e){let e=document.createElement(`div`);e.style.width=`100%`,e.style.height=`2000px`,e.style.background=`#222`,a.appendChild(e)}let s=document.createElement(`img`);return s.src=i,s.style.position=`fixed`,s.style.left=`0`,s.style.top=`0`,s.style.width=`200px`,s.style.height=`200px`,a.appendChild(s),o(a,n),t({pixelRatio:1}).add(s,{shader:c,overlay:!0,overflow:!0}),a},play:async({canvasElement:e})=>{let t=e.querySelector(`img`);t&&!t.complete&&await new Promise(e=>{t.onload=e}),window.dispatchEvent(new PointerEvent(`pointermove`,{clientX:n[0],clientY:n[1],pointerId:1,pointerType:`mouse`,bubbles:!0})),await new Promise(e=>requestAnimationFrame(e)),await new Promise(e=>requestAnimationFrame(e))},parameters:{layout:`fullscreen`,viewport:{defaultViewport:`small`}}}),u=l(!1,[200,250]),d=l(!0,[200,250]),u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`render(false, [200, 250])`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`render(true, [200, 250])`,...d.parameters?.docs?.source}}},f=[`MousePosition`,`MousePositionInScrollablePage`]}))();export{u as MousePosition,d as MousePositionInScrollablePage,f as __namedExportsOrder,s as default};