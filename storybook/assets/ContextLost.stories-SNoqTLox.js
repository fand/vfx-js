import{r as a,j as y,c as w,R as f}from"./jsx-runtime-Dsq5Daep.js";import{s as L,V as R,a as b}from"./react-vfx-Dy7CqD9D.js";import{i as h}from"./utils-C00prF83.js";import{L as g}from"./preset-B_9u5Dmn.js";import"./vfx-CaMVhH5E.js";const S=e=>{const{vfxProps:t,domProps:r}=L(e),n=a.useContext(R),[c,o]=a.useState(null);return a.useEffect(()=>{if(!(!n||!c))return n.add(c,t),()=>{n.remove(c)}},[c,n,t]),y.jsx("img",{ref:o,...r})};function v(){const e=document.querySelector('canvas[style*="pointer-events"]');if(!e)return null;const t=e.getContext("webgl2")??e.getContext("webgl");return(t==null?void 0:t.getExtension("WEBGL_lose_context"))??null}const P={title:"Context Lost",parameters:{layout:"fullscreen"}},l={render:()=>{const e=document.createElement("div"),t=document.createElement("div");t.style.display="flex",t.style.gap="10px",e.appendChild(t);const r=document.createElement("span");r.id="status",r.style.color="white",r.textContent="Status: rendering",t.append(r);const n=document.createElement("button");n.textContent="Force Context Lost",t.appendChild(n);const c=document.createElement("button");c.textContent="Force Context Restore",t.appendChild(c);const o=document.createElement("img");return o.src=g,e.appendChild(o),h(),e},play:async({canvasElement:e})=>{const t=e.querySelector("img");await new Promise(u=>{t.complete?u(void 0):t.onload=u}),await window.vfx.add(t,{shader:"rainbow"});const n=e.querySelector("#status"),c=e.querySelectorAll("button")[0],o=e.querySelectorAll("button")[1],s=v();c.addEventListener("click",()=>{s==null||s.loseContext(),n.textContent="Status: context lost"}),o.addEventListener("click",()=>{s==null||s.restoreContext(),n.textContent="Status: context restored"})}};function F(){const e=a.useRef(null),t=a.useRef(null),r=a.useCallback(()=>{t.current||(t.current=v())},[]),n=a.useCallback(()=>{var s;r(),(s=t.current)==null||s.loseContext(),e.current&&(e.current.textContent="Status: context lost")},[r]),c=a.useCallback(()=>{var s;(s=t.current)==null||s.restoreContext(),e.current&&(e.current.textContent="Status: context restored")},[]),o=f.createElement;return o(b,null,o("div",null,o("div",{style:{display:"flex",gap:"10px"}},o("span",{ref:e,style:{color:"white"}},"Status: rendering"),o("button",{onClick:n},"Force Context Lost"),o("button",{onClick:c},"Force Context Restore")),o(S,{src:g,shader:"rainbow"})))}const i={render:()=>document.createElement("div"),play:async({canvasElement:e})=>{await new Promise(n=>requestAnimationFrame(n));const t=e.firstElementChild;w.createRoot(t).render(f.createElement(F))}};var d,m,p;l.parameters={...l.parameters,docs:{...(d=l.parameters)==null?void 0:d.docs,source:{originalSource:`{
  render: () => {
    const wrapper = document.createElement("div");
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "10px";
    wrapper.appendChild(controls);
    const status = document.createElement("span");
    status.id = "status";
    status.style.color = "white";
    status.textContent = "Status: rendering";
    controls.append(status);
    const loseBtn = document.createElement("button");
    loseBtn.textContent = "Force Context Lost";
    controls.appendChild(loseBtn);
    const restoreBtn = document.createElement("button");
    restoreBtn.textContent = "Force Context Restore";
    controls.appendChild(restoreBtn);
    const img = document.createElement("img");
    img.src = Logo;
    wrapper.appendChild(img);
    initVFX();
    return wrapper;
  },
  play: async ({
    canvasElement
  }) => {
    const img = canvasElement.querySelector("img")!;
    await new Promise(r => {
      if (img.complete) {
        r(undefined);
      } else {
        img.onload = r;
      }
    });

    // biome-ignore lint/suspicious/noExplicitAny: access global vfx
    const vfx = (window as any).vfx;
    await vfx.add(img, {
      shader: "rainbow"
    });
    const status = canvasElement.querySelector("#status") as Element;
    const loseBtn = canvasElement.querySelectorAll("button")[0];
    const restoreBtn = canvasElement.querySelectorAll("button")[1];

    // Grab once while the context is alive — getExtension returns null after loss
    const ext = getVFXLoseContextExt();
    loseBtn.addEventListener("click", () => {
      ext?.loseContext();
      status.textContent = "Status: context lost";
    });
    restoreBtn.addEventListener("click", () => {
      ext?.restoreContext();
      status.textContent = "Status: context restored";
    });
  }
}`,...(p=(m=l.parameters)==null?void 0:m.docs)==null?void 0:p.source}}};var x,C,E;i.parameters={...i.parameters,docs:{...(x=i.parameters)==null?void 0:x.docs,source:{originalSource:`{
  render: () => {
    const container = document.createElement("div");
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    await new Promise(r => requestAnimationFrame(r));
    const container = canvasElement.firstElementChild as HTMLElement;
    const root = createRoot(container);
    root.render(React.createElement(ContextLostReactApp));
  }
}`,...(E=(C=i.parameters)==null?void 0:C.docs)==null?void 0:E.source}}};const X=["ContextLostAndRestore","ContextLostAndRestoreReact"];export{l as ContextLostAndRestore,i as ContextLostAndRestoreReact,X as __namedExportsOrder,P as default};
