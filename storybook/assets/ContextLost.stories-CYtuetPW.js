import{a as e,n as t}from"./chunk-BneVvdWh.js";import{t as n}from"./react-Cjw2QDgH.js";import{t as r}from"./client-Clr0wkRe.js";import{a as i,o as a}from"./utils-BLrKilFH.js";import{n as o,r as s,t as c}from"./preset-hB8Fk8QM.js";import{a as l,n as u,r as d,t as f}from"./react-vfx-CsHtt1j8.js";function p(){let e=m();return e?(e.getContext(`webgl2`)??e.getContext(`webgl`))?.getExtension(`WEBGL_lose_context`)??null:null}function m(){return document.querySelector(`canvas[style*="pointer-events"]`)}function h(e,t){return new Promise(n=>{if(!e){n();return}e.addEventListener(t,()=>requestAnimationFrame(()=>n()),{once:!0})})}function g(){let e=(0,v.useContext)(l),t=(0,v.useRef)(null),n=(0,v.useRef)(null),r=(0,v.useRef)(0),i=(0,v.useCallback)(()=>{n.current||=p()},[]),a=(0,v.useCallback)(()=>{e&&(e.render(),r.current+=.1)},[e]),o=(0,v.useCallback)(()=>{i(),n.current?.loseContext(),t.current&&(t.current.textContent=`Status: context lost`)},[i]),c=(0,v.useCallback)(()=>{n.current?.restoreContext(),t.current&&(t.current.textContent=`Status: context restored`),r.current=0},[]),u=v.createElement;return u(`div`,null,u(`div`,{style:{display:`flex`,gap:`10px`}},u(`span`,{ref:t,style:{color:`white`}},`Status: rendering`),u(`button`,{onClick:a},`Draw`),u(`button`,{onClick:o},`Force Context Lost`),u(`button`,{onClick:c},`Force Context Restore`)),u(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`20px`}},u(d,{src:s,shader:`rainbow`,uniforms:{time:()=>r.current}}),u(d,{src:s,shader:b,backbuffer:!0,uniforms:{time:()=>r.current}})))}function _(){let e=v.createElement;return e(u,{autoplay:!1},e(g,null))}var v,y,b,x,S,C,w,T;t((()=>{v=e(n(),1),y=e(r(),1),f(),o(),a(),c(),b=`
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
`,x=30,S={title:`Context Lost`,parameters:{layout:`fullscreen`}},C={render:()=>{let e=document.createElement(`div`),t=document.createElement(`div`);t.style.display=`flex`,t.style.gap=`10px`,e.appendChild(t);let n=document.createElement(`span`);n.id=`status`,n.style.color=`white`,n.textContent=`Status: rendering`,t.append(n);let r=document.createElement(`button`);r.textContent=`Draw`,t.appendChild(r);let a=document.createElement(`button`);a.textContent=`Force Context Lost`,t.appendChild(a);let o=document.createElement(`button`);o.textContent=`Force Context Restore`,t.appendChild(o);let c=document.createElement(`div`);c.style.display=`flex`,c.style.flexDirection=`column`,c.style.gap=`20px`,e.appendChild(c);let l=document.createElement(`img`);l.src=s,c.appendChild(l);let u=document.createElement(`img`);return u.src=s,c.appendChild(u),i({autoplay:!1}),e},play:async({canvasElement:e})=>{let[t,n]=[...e.querySelectorAll(`img`)];await Promise.all([t,n].map(e=>new Promise(t=>{e.complete?t(void 0):e.onload=t})));let r=window.vfx,i=0;await r.add(t,{shader:`rainbow`,uniforms:{time:()=>i}}),await r.add(n,{shader:b,backbuffer:!0,uniforms:{time:()=>i}});let a=e.querySelector(`#status`),o=e.querySelectorAll(`button`),s=o[0],c=o[1],l=o[2],u=p();s.addEventListener(`click`,()=>{r.render(),i+=.1}),c.addEventListener(`click`,()=>{u?.loseContext(),a.textContent=`Status: context lost`}),l.addEventListener(`click`,()=>{u?.restoreContext(),a.textContent=`Status: context restored`,i=0});let d=e=>{for(let t=0;t<e;t++)s.click()},f=m();d(x);let g=h(f,`webglcontextlost`);c.click(),await g;let _=h(f,`webglcontextrestored`);l.click(),await _,d(x)}},w={render:()=>document.createElement(`div`),play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e));let t=e.firstElementChild;(0,y.createRoot)(t).render(v.createElement(_)),await new Promise(e=>setTimeout(e,500));let n=e.querySelectorAll(`button`),r=n[0],i=n[1],a=n[2],o=e=>{for(let t=0;t<e;t++)r.click()},s=m();o(x);let c=h(s,`webglcontextlost`);i.click(),await c;let l=h(s,`webglcontextrestored`);a.click(),await l,o(x)}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
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
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
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
}`,...w.parameters?.docs?.source}}},T=[`ContextLostAndRestore`,`ContextLostAndRestoreReact`]}))();export{C as ContextLostAndRestore,w as ContextLostAndRestoreReact,T as __namedExportsOrder,S as default};