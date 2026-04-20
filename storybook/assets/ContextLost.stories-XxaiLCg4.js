import{r as l,j as M,c as X,R as b}from"./jsx-runtime-Dsq5Daep.js";import{s as T,V as A,a as _}from"./react-vfx-D0DSqgfE.js";import{L as C}from"./preset-B_9u5Dmn.js";import{i as H}from"./utils-CoLwPjcP.js";import"./vfx-toqadiTe.js";const y=t=>{const{vfxProps:e,domProps:o}=T(t),n=l.useContext(A),[s,c]=l.useState(null);return l.useEffect(()=>{if(!(!n||!s))return n.add(s,e),()=>{n.remove(s)}},[s,n,e]),M.jsx("img",{ref:c,...o})},D=`
precision highp float;
uniform vec2 offset;
uniform vec2 resolution;
uniform float time;
uniform sampler2D backbuffer;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    // Disc centre sweeps uv.x from 0 (left edge) to 1 (right edge)
    // over time 0..3.
    vec2 centre = vec2(time / 3.0, 0.5);
    vec2 d = (uv - centre) * vec2(resolution.x / resolution.y, 1.0);
    outColor = vec4(step(length(d), .15));
    outColor += texture(backbuffer, uv) * vec4(.95);
}
`,E=30;function q(){const t=h();if(!t)return null;const e=t.getContext("webgl2")??t.getContext("webgl");return(e==null?void 0:e.getExtension("WEBGL_lose_context"))??null}function h(){return document.querySelector('canvas[style*="pointer-events"]')}function g(t,e){return new Promise(o=>{if(!t){o();return}t.addEventListener(e,()=>requestAnimationFrame(()=>o()),{once:!0})})}const J={title:"Context Lost",parameters:{layout:"fullscreen"}},w={render:()=>{const t=document.createElement("div"),e=document.createElement("div");e.style.display="flex",e.style.gap="10px",t.appendChild(e);const o=document.createElement("span");o.id="status",o.style.color="white",o.textContent="Status: rendering",e.append(o);const n=document.createElement("button");n.textContent="Draw",e.appendChild(n);const s=document.createElement("button");s.textContent="Force Context Lost",e.appendChild(s);const c=document.createElement("button");c.textContent="Force Context Restore",e.appendChild(c);const a=document.createElement("div");a.style.display="flex",a.style.flexDirection="column",a.style.gap="20px",t.appendChild(a);const i=document.createElement("img");i.src=C,a.appendChild(i);const r=document.createElement("img");return r.src=C,a.appendChild(r),H({autoplay:!1}),t},play:async({canvasElement:t})=>{const[e,o]=[...t.querySelectorAll("img")];await Promise.all([e,o].map(x=>new Promise(f=>{x.complete?f(void 0):x.onload=f})));const n=window.vfx;let s=0;await n.add(e,{shader:"rainbow",uniforms:{time:()=>s}}),await n.add(o,{shader:D,backbuffer:!0,uniforms:{time:()=>s}});const c=t.querySelector("#status"),a=t.querySelectorAll("button"),i=a[0],r=a[1],u=a[2],d=q();i.addEventListener("click",()=>{n.render(),s+=.1}),r.addEventListener("click",()=>{d==null||d.loseContext(),c.textContent="Status: context lost"}),u.addEventListener("click",()=>{d==null||d.restoreContext(),c.textContent="Status: context restored",s=0});const m=x=>{for(let f=0;f<x;f++)i.click()},p=h();m(E);const P=g(p,"webglcontextlost");r.click(),await P;const V=g(p,"webglcontextrestored");u.click(),await V,m(E)}};function N(){const t=l.useContext(A),e=l.useRef(null),o=l.useRef(null),n=l.useRef(0),s=l.useCallback(()=>{o.current||(o.current=q())},[]),c=l.useCallback(()=>{t&&(t.render(),n.current+=.1)},[t]),a=l.useCallback(()=>{var u;s(),(u=o.current)==null||u.loseContext(),e.current&&(e.current.textContent="Status: context lost")},[s]),i=l.useCallback(()=>{var u;(u=o.current)==null||u.restoreContext(),e.current&&(e.current.textContent="Status: context restored"),n.current=0},[]),r=b.createElement;return r("div",null,r("div",{style:{display:"flex",gap:"10px"}},r("span",{ref:e,style:{color:"white"}},"Status: rendering"),r("button",{onClick:c},"Draw"),r("button",{onClick:a},"Force Context Lost"),r("button",{onClick:i},"Force Context Restore")),r("div",{style:{display:"flex",flexDirection:"column",gap:"20px"}},r(y,{src:C,shader:"rainbow",uniforms:{time:()=>n.current}}),r(y,{src:C,shader:D,backbuffer:!0,uniforms:{time:()=>n.current}})))}function j(){const t=b.createElement;return t(_,{autoplay:!1},t(N,null))}const v={render:()=>document.createElement("div"),play:async({canvasElement:t})=>{await new Promise(m=>requestAnimationFrame(m));const e=t.firstElementChild;X.createRoot(e).render(b.createElement(j)),await new Promise(m=>setTimeout(m,500));const n=t.querySelectorAll("button"),s=n[0],c=n[1],a=n[2],i=m=>{for(let p=0;p<m;p++)s.click()},r=h();i(E);const u=g(r,"webglcontextlost");c.click(),await u;const d=g(r,"webglcontextrestored");a.click(),await d,i(E)}};var B,R,k;w.parameters={...w.parameters,docs:{...(B=w.parameters)==null?void 0:B.docs,source:{originalSource:`{
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
    const drawBtn = document.createElement("button");
    drawBtn.textContent = "Draw";
    controls.appendChild(drawBtn);
    const loseBtn = document.createElement("button");
    loseBtn.textContent = "Force Context Lost";
    controls.appendChild(loseBtn);
    const restoreBtn = document.createElement("button");
    restoreBtn.textContent = "Force Context Restore";
    controls.appendChild(restoreBtn);
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.flexDirection = "column";
    row.style.gap = "20px";
    wrapper.appendChild(row);
    const img1 = document.createElement("img");
    img1.src = Logo;
    row.appendChild(img1);

    // Second element uses a backbuffer shader so restore exercises
    // FBO + persistent-texture recovery as well as program recompile.
    const img2 = document.createElement("img");
    img2.src = Logo;
    row.appendChild(img2);
    initVFX({
      autoplay: false
    });
    return wrapper;
  },
  play: async ({
    canvasElement
  }) => {
    const [img1, img2] = [...canvasElement.querySelectorAll("img")] as HTMLImageElement[];
    await Promise.all([img1, img2].map(img => new Promise(r => {
      if (img.complete) {
        r(undefined);
      } else {
        img.onload = r;
      }
    })));

    // biome-ignore lint/suspicious/noExplicitAny: access global vfx
    const vfx = (window as any).vfx;

    // Frame counter drives the backbuffer shader's time.
    let time = 0;
    await vfx.add(img1, {
      shader: "rainbow",
      uniforms: {
        time: () => time
      }
    });
    await vfx.add(img2, {
      shader: backbufferShader,
      backbuffer: true,
      uniforms: {
        time: () => time
      }
    });
    const status = canvasElement.querySelector("#status") as Element;
    const buttons = canvasElement.querySelectorAll("button");
    const drawBtn = buttons[0] as HTMLButtonElement;
    const loseBtn = buttons[1] as HTMLButtonElement;
    const restoreBtn = buttons[2] as HTMLButtonElement;

    // Grab once while the context is alive — getExtension returns null after loss
    const ext = getVFXLoseContextExt();
    drawBtn.addEventListener("click", () => {
      // Render at the current time first so time=0 is drawn on the
      // very first click; then advance.
      vfx.render();
      time += 0.1;
    });
    loseBtn.addEventListener("click", () => {
      ext?.loseContext();
      status.textContent = "Status: context lost";
    });
    restoreBtn.addEventListener("click", () => {
      ext?.restoreContext();
      status.textContent = "Status: context restored";
      // Resetting time here makes pre-loss and post-restore renders
      // pixel-identical when the user performs the same sequence of
      // Draw clicks again.
      time = 0;
    });

    // Chromatic snapshot fires after play() resolves. The sequence
    // below (draw N → lose → restore → draw N) exercises the full
    // context-recovery path; if resources don't rebuild correctly,
    // the final state will differ pixel-wise from a clean render.
    const drawBatch = (n: number): void => {
      for (let i = 0; i < n; i++) {
        drawBtn.click();
      }
    };
    const canvas = getVFXCanvas();
    drawBatch(RENDER_FRAMES);
    const lost = waitForCanvasEvent(canvas, "webglcontextlost");
    loseBtn.click();
    await lost;
    const restored = waitForCanvasEvent(canvas, "webglcontextrestored");
    restoreBtn.click();
    await restored;
    drawBatch(RENDER_FRAMES);
  }
}`,...(k=(R=w.parameters)==null?void 0:R.docs)==null?void 0:k.source}}};var F,L,S;v.parameters={...v.parameters,docs:{...(F=v.parameters)==null?void 0:F.docs,source:{originalSource:`{
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

    // Wait for React to commit and VFXImg to register its elements
    // with VFXProvider (both need a couple of frames + image loads).
    await new Promise(r => setTimeout(r, 500));
    const buttons = canvasElement.querySelectorAll("button");
    const drawBtn = buttons[0] as HTMLButtonElement;
    const loseBtn = buttons[1] as HTMLButtonElement;
    const restoreBtn = buttons[2] as HTMLButtonElement;
    const drawBatch = (n: number): void => {
      for (let i = 0; i < n; i++) {
        drawBtn.click();
      }
    };
    const canvas = getVFXCanvas();
    drawBatch(RENDER_FRAMES);
    const lost = waitForCanvasEvent(canvas, "webglcontextlost");
    loseBtn.click();
    await lost;
    const restored = waitForCanvasEvent(canvas, "webglcontextrestored");
    restoreBtn.click();
    await restored;
    drawBatch(RENDER_FRAMES);
  }
}`,...(S=(L=v.parameters)==null?void 0:L.docs)==null?void 0:S.source}}};const K=["ContextLostAndRestore","ContextLostAndRestoreReact"];export{w as ContextLostAndRestore,v as ContextLostAndRestoreReact,K as __namedExportsOrder,J as default};
