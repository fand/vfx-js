import{r as u,j as P,c as D,R as C}from"./jsx-runtime-Dsq5Daep.js";import{s as T,V as S,a as q}from"./react-vfx-D0DSqgfE.js";import{L as w}from"./preset-B_9u5Dmn.js";import{i as M}from"./utils-CoLwPjcP.js";import"./vfx-toqadiTe.js";const b=t=>{const{vfxProps:e,domProps:a}=T(t),n=u.useContext(S),[r,i]=u.useState(null);return u.useEffect(()=>{if(!(!n||!r))return n.add(r,e),()=>{n.remove(r)}},[r,n,e]),P.jsx("img",{ref:i,...a})},F=`
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
`,E=30;function A(){const t=document.querySelector('canvas[style*="pointer-events"]');if(!t)return null;const e=t.getContext("webgl2")??t.getContext("webgl");return(e==null?void 0:e.getExtension("WEBGL_lose_context"))??null}const G={title:"Context Lost",parameters:{layout:"fullscreen"}},f={render:()=>{const t=document.createElement("div"),e=document.createElement("div");e.style.display="flex",e.style.gap="10px",t.appendChild(e);const a=document.createElement("span");a.id="status",a.style.color="white",a.textContent="Status: rendering",e.append(a);const n=document.createElement("button");n.textContent="Draw",e.appendChild(n);const r=document.createElement("button");r.textContent="Force Context Lost",e.appendChild(r);const i=document.createElement("button");i.textContent="Force Context Restore",e.appendChild(i);const c=document.createElement("div");c.style.display="flex",c.style.flexDirection="column",c.style.gap="20px",t.appendChild(c);const d=document.createElement("img");d.src=w,c.appendChild(d);const o=document.createElement("img");return o.src=w,c.appendChild(o),M({autoplay:!1}),t},play:async({canvasElement:t})=>{const[e,a]=[...t.querySelectorAll("img")];await Promise.all([e,a].map(p=>new Promise(m=>{p.complete?m(void 0):p.onload=m})));const n=window.vfx;let r=0;await n.add(e,{shader:"rainbow"}),await n.add(a,{shader:F,backbuffer:!0,uniforms:{time:()=>r}});const i=t.querySelector("#status"),c=t.querySelectorAll("button"),d=c[0],o=c[1],s=c[2],l=A();d.addEventListener("click",()=>{n.render(),r+=.1}),o.addEventListener("click",()=>{l==null||l.loseContext(),i.textContent="Status: context lost"}),s.addEventListener("click",()=>{l==null||l.restoreContext(),i.textContent="Status: context restored",r=0});const v=p=>{for(let m=0;m<p;m++)d.click()},h=p=>new Promise(m=>setTimeout(m,p));v(E),await h(50),o.click(),await h(100),s.click(),await h(100),v(E)}};function V(){const t=u.useContext(S),e=u.useRef(null),a=u.useRef(null),n=u.useRef(0),r=u.useCallback(()=>{a.current||(a.current=A())},[]),i=u.useCallback(()=>{t&&(t.render(),n.current+=.1)},[t]),c=u.useCallback(()=>{var s;r(),(s=a.current)==null||s.loseContext(),e.current&&(e.current.textContent="Status: context lost")},[r]),d=u.useCallback(()=>{var s;(s=a.current)==null||s.restoreContext(),e.current&&(e.current.textContent="Status: context restored"),n.current=0},[]),o=C.createElement;return o("div",null,o("div",{style:{display:"flex",gap:"10px"}},o("span",{ref:e,style:{color:"white"}},"Status: rendering"),o("button",{onClick:i},"Draw"),o("button",{onClick:c},"Force Context Lost"),o("button",{onClick:d},"Force Context Restore")),o("div",{style:{display:"flex",flexDirection:"column",gap:"20px"}},o(b,{src:w,shader:"rainbow"}),o(b,{src:w,shader:F,backbuffer:!0,uniforms:{time:()=>n.current}})))}function _(){const t=C.createElement;return t(q,{autoplay:!1},t(V,null))}const x={render:()=>document.createElement("div"),play:async({canvasElement:t})=>{await new Promise(s=>requestAnimationFrame(s));const e=t.firstElementChild;D.createRoot(e).render(C.createElement(_)),await new Promise(s=>setTimeout(s,500));const n=t.querySelectorAll("button"),r=n[0],i=n[1],c=n[2],d=s=>{for(let l=0;l<s;l++)r.click()},o=s=>new Promise(l=>setTimeout(l,s));d(E),await o(50),i.click(),await o(100),c.click(),await o(100),d(E)}};var g,y,B;f.parameters={...f.parameters,docs:{...(g=f.parameters)==null?void 0:g.docs,source:{originalSource:`{
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
      shader: "rainbow"
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
    //
    // webglcontextlost / webglcontextrestored are dispatched
    // asynchronously. Firing them back-to-back in the same tick
    // confuses Chrome's context-loss heuristics and can kill the
    // tab, so we yield to the event loop between steps.
    const drawBatch = (n: number): void => {
      for (let i = 0; i < n; i++) {
        drawBtn.click();
      }
    };
    const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));
    drawBatch(RENDER_FRAMES);
    await sleep(50);
    loseBtn.click();
    await sleep(100);
    restoreBtn.click();
    await sleep(100);
    drawBatch(RENDER_FRAMES);
  }
}`,...(B=(y=f.parameters)==null?void 0:y.docs)==null?void 0:B.source}}};var R,k,L;x.parameters={...x.parameters,docs:{...(R=x.parameters)==null?void 0:R.docs,source:{originalSource:`{
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
    const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));
    drawBatch(RENDER_FRAMES);
    await sleep(50);
    loseBtn.click();
    await sleep(100);
    restoreBtn.click();
    await sleep(100);
    drawBatch(RENDER_FRAMES);
  }
}`,...(L=(k=x.parameters)==null?void 0:k.docs)==null?void 0:L.source}}};const O=["ContextLostAndRestore","ContextLostAndRestoreReact"];export{f as ContextLostAndRestore,x as ContextLostAndRestoreReact,O as __namedExportsOrder,G as default};
