import{a as e,n as t}from"./chunk-BneVvdWh.js";import{t as n}from"./react-Cjw2QDgH.js";import{t as r}from"./client-Clr0wkRe.js";import{a as i,o as a}from"./utils-BLrKilFH.js";import{i as o,n as s,t as c}from"./react-vfx-CsHtt1j8.js";import{n as l,t as u}from"./Timer-D-Ck6ryf.js";function d(e,t=`rainbow`){let n=new u(0,[0,10]);document.body.append(n.element);let r=i();return r.addHTML(e,{shader:t,uniforms:{time:()=>n.time}}),r}function f(){let e=document.getElementById(`storybook-root`);e.style.height=`auto`,e.style.display=`block`}var p,m,h,g,_,v,y,b,x,S,C,w,T;t((()=>{p=e(n(),1),m=e(r(),1),c(),l(),a(),h=(e,t)=>e.querySelector(t),g=`
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec3 col = 0.5 + 0.5 * cos(time + uv.xyx * 3.0 + vec3(0, 2, 4));
    outColor = vec4(col, 0.85);
}
`,_={title:`Html In Canvas`,parameters:{layout:`fullscreen`,chromatic:{disableSnapshot:!0}}},v={render:()=>{f();let e=document.createElement(`div`);e.style.cssText=`padding:96px 128px 128px; font-family:sans-serif; color:white`;let t=document.createElement(`div`);return t.id=`add-html-target`,t.innerHTML=`
            <h2>html-in-canvas: addHTML</h2>
            <p style="font-size:1.2rem; line-height:1.6; max-width:600px">
                This element is captured via <code>drawElementImage</code>
                and rendered with a shader effect.
                Resize the window to see responsive re-capture.
            </p>
        `,e.appendChild(t),e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e)),d(h(e,`#add-html-target`))}},y={render:()=>{f();let e=document.createElement(`div`);e.style.cssText=`padding:96px 128px 128px; font-family:sans-serif; color:white`;let t=document.createElement(`div`);return t.id=`add-html-image-target`,t.innerHTML=`
            <h2>html-in-canvas: with image</h2>
            <img src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22200%22%3E%3Crect%20width%3D%22200%22%20height%3D%22200%22%20fill%3D%22%234488ff%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%22110%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%20font-size%3D%2224%22%3ESVG%3C%2Ftext%3E%3C%2Fsvg%3E"
                 style="display:block; width:200px; border-radius:8px; margin-top:16px" />
        `,e.appendChild(t),e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e)),d(h(e,`#add-html-image-target`))}},b={parameters:{layout:`padded`},render:()=>{let e=document.createElement(`div`);e.style.cssText=`padding-top:96px; font-family:sans-serif; color:white`;let t=document.createElement(`div`);return t.id=`fallback-target`,t.style.display=`flow-root`,t.innerHTML=`
            <h2>html-in-canvas: fallback</h2>
            <p style="font-size:1.2rem; line-height:1.6; max-width:600px">
                When html-in-canvas is not supported, <code>addHTML</code>
                falls back to <code>add</code> (dom-to-canvas).
            </p>
        `,e.appendChild(t),e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e));let t=h(e,`#fallback-target`),n=new u(0,[0,10]);document.body.append(n.element),await i().add(t,{shader:`rainbow`,uniforms:{time:()=>n.time}})}},x={render:()=>{f();let e=document.createElement(`div`);e.style.cssText=`margin: 96px 16px; font-family:sans-serif; color:white;`;let t=`width:300px; height:80px; background:linear-gradient(90deg,#284,#28a); display:flex; align-items:center; justify-content:center; font-weight:bold; margin-bottom:32px`,n=document.createElement(`div`);n.style.cssText=t,n.textContent=`REFERENCE 300×80`,e.appendChild(n);let r=document.createElement(`div`);return r.id=`fixed-width-target`,r.style.cssText=t,r.textContent=`WITH addHTML`,e.appendChild(r),e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e)),d(h(e,`#fixed-width-target`),g)}},S={render:()=>{f();let e=document.createElement(`div`);e.style.cssText=`margin: 96px 16px; font-family:sans-serif; color:white`;let t=`width:400px; padding:30px; border:5px solid #f44; background:linear-gradient(180deg,#284,#28a); font-size:1.4rem; line-height:1.6; font-weight:bold; margin-bottom:32px`,n=document.createElement(`div`);n.style.cssText=t,n.textContent=`REFERENCE (padding:30 border:5)`,e.appendChild(n);let r=document.createElement(`div`);return r.id=`padding-target`,r.style.cssText=t,r.textContent=`WITH addHTML (same size expected)`,e.appendChild(r),e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e));let t=g.replace(`uv.xyx`,`uv.yxy`);d(h(e,`#padding-target`),t)}},C={render:()=>{f();let e=document.createElement(`div`);e.style.cssText=`margin: 96px 16px; font-family:sans-serif; color:white`;let t=document.createElement(`div`);t.id=`reflow-target`,t.style.cssText=`font-size:1.4rem; line-height:1.6; padding:16px; border:2px solid #888; max-width:600px`,t.textContent=`Initial text`,e.appendChild(t);let n=document.createElement(`div`);n.style.cssText=`margin-top:16px; display:flex; gap:8px`,e.appendChild(n);for(let[e,t]of[[`reflow-change`,`Change DOM text`],[`reflow-update`,`Manual vfx.update()`]]){let r=document.createElement(`button`);r.id=e,r.textContent=t,r.style.padding=`8px 16px`,n.appendChild(r)}return e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e));let t=h(e,`#reflow-target`),n=h(e,`#reflow-change`),r=h(e,`#reflow-update`),i=d(t),a=0;n.addEventListener(`click`,()=>{a++,t.textContent=`Updated text #${a} — longer content to force reflow`}),r.addEventListener(`click`,()=>{i.update(t)})}},w={render:()=>{f();let e=document.createElement(`div`);return e.style.cssText=`padding:96px 128px 128px; font-family:sans-serif; color:white`,e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e));let t=e.firstElementChild,n=new u(0,[0,10]);document.body.append(n.element);let r=(0,m.createRoot)(t),i=p.createElement;r.render(i(s,null,i(o,{shader:`rainbow`,uniforms:{time:()=>n.time},style:{display:`block`,width:`100%`}},i(`h2`,null,`VFXCanvas (react-vfx)`),i(`p`,{style:{fontSize:`1.2rem`,lineHeight:1.6,maxWidth:600}},`This element is rendered via the React VFXCanvas component using html-in-canvas.`))))}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => {
    fullscreenRoot();
    const container = document.createElement("div");
    container.style.cssText = "padding:96px 128px 128px; font-family:sans-serif; color:white";
    const el = document.createElement("div");
    el.id = "add-html-target";
    el.innerHTML = \`
            <h2>html-in-canvas: addHTML</h2>
            <p style="font-size:1.2rem; line-height:1.6; max-width:600px">
                This element is captured via <code>drawElementImage</code>
                and rendered with a shader effect.
                Resize the window to see responsive re-capture.
            </p>
        \`;
    container.appendChild(el);
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    await new Promise(r => requestAnimationFrame(r));
    setupHIC(qs(canvasElement, "#add-html-target"));
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => {
    fullscreenRoot();
    const container = document.createElement("div");
    container.style.cssText = "padding:96px 128px 128px; font-family:sans-serif; color:white";
    const el = document.createElement("div");
    el.id = "add-html-image-target";
    el.innerHTML = \`
            <h2>html-in-canvas: with image</h2>
            <img src="data:image/svg+xml,\${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#4488ff"/><text x="100" y="110" text-anchor="middle" fill="white" font-size="24">SVG</text></svg>')}"
                 style="display:block; width:200px; border-radius:8px; margin-top:16px" />
        \`;
    container.appendChild(el);
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    await new Promise(r => requestAnimationFrame(r));
    setupHIC(qs(canvasElement, "#add-html-image-target"));
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  parameters: {
    layout: "padded"
  },
  render: () => {
    const container = document.createElement("div");
    container.style.cssText = "padding-top:96px; font-family:sans-serif; color:white";
    const el = document.createElement("div");
    el.id = "fallback-target";
    el.style.display = "flow-root";
    el.innerHTML = \`
            <h2>html-in-canvas: fallback</h2>
            <p style="font-size:1.2rem; line-height:1.6; max-width:600px">
                When html-in-canvas is not supported, <code>addHTML</code>
                falls back to <code>add</code> (dom-to-canvas).
            </p>
        \`;
    container.appendChild(el);
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    await new Promise(r => requestAnimationFrame(r));
    const el = qs<HTMLElement>(canvasElement, "#fallback-target");
    const timer = new Timer(0, [0, 10]);
    document.body.append(timer.element);
    const vfx = initVFX();
    await vfx.add(el, {
      shader: "rainbow",
      uniforms: {
        time: () => timer.time
      }
    });
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => {
    fullscreenRoot();
    const container = document.createElement("div");
    container.style.cssText = "margin: 96px 16px; font-family:sans-serif; color:white;";
    const boxCss = "width:300px; height:80px; background:linear-gradient(90deg,#284,#28a); display:flex; align-items:center; justify-content:center; font-weight:bold; margin-bottom:32px";
    const ref = document.createElement("div");
    ref.style.cssText = boxCss;
    ref.textContent = "REFERENCE 300×80";
    container.appendChild(ref);
    const target = document.createElement("div");
    target.id = "fixed-width-target";
    target.style.cssText = boxCss;
    target.textContent = "WITH addHTML";
    container.appendChild(target);
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    await new Promise(r => requestAnimationFrame(r));
    setupHIC(qs(canvasElement, "#fixed-width-target"), solidShader);
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: () => {
    fullscreenRoot();
    const container = document.createElement("div");
    container.style.cssText = "margin: 96px 16px; font-family:sans-serif; color:white";
    const boxCss = "width:400px; padding:30px; border:5px solid #f44; background:linear-gradient(180deg,#284,#28a); font-size:1.4rem; line-height:1.6; font-weight:bold; margin-bottom:32px";
    const ref = document.createElement("div");
    ref.style.cssText = boxCss;
    ref.textContent = "REFERENCE (padding:30 border:5)";
    container.appendChild(ref);
    const target = document.createElement("div");
    target.id = "padding-target";
    target.style.cssText = boxCss;
    target.textContent = "WITH addHTML (same size expected)";
    container.appendChild(target);
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    await new Promise(r => requestAnimationFrame(r));
    const shader = solidShader.replace("uv.xyx", "uv.yxy");
    setupHIC(qs(canvasElement, "#padding-target"), shader);
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => {
    fullscreenRoot();
    const container = document.createElement("div");
    container.style.cssText = "margin: 96px 16px; font-family:sans-serif; color:white";
    const target = document.createElement("div");
    target.id = "reflow-target";
    target.style.cssText = "font-size:1.4rem; line-height:1.6; padding:16px; border:2px solid #888; max-width:600px";
    target.textContent = "Initial text";
    container.appendChild(target);
    const buttons = document.createElement("div");
    buttons.style.cssText = "margin-top:16px; display:flex; gap:8px";
    container.appendChild(buttons);
    for (const [id, label] of [["reflow-change", "Change DOM text"], ["reflow-update", "Manual vfx.update()"]] as const) {
      const btn = document.createElement("button");
      btn.id = id;
      btn.textContent = label;
      btn.style.padding = "8px 16px";
      buttons.appendChild(btn);
    }
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    await new Promise(r => requestAnimationFrame(r));
    const target = qs<HTMLElement>(canvasElement, "#reflow-target");
    const btnChange = qs<HTMLElement>(canvasElement, "#reflow-change");
    const btnUpdate = qs<HTMLElement>(canvasElement, "#reflow-update");
    const vfx = setupHIC(target);
    let i = 0;
    btnChange.addEventListener("click", () => {
      i++;
      target.textContent = \`Updated text #\${i} — longer content to force reflow\`;
    });
    btnUpdate.addEventListener("click", () => {
      vfx.update(target);
    });
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: () => {
    fullscreenRoot();
    const container = document.createElement("div");
    container.style.cssText = "padding:96px 128px 128px; font-family:sans-serif; color:white";
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    await new Promise(r => requestAnimationFrame(r));
    const container = canvasElement.firstElementChild as HTMLElement;
    const timer = new Timer(0, [0, 10]);
    document.body.append(timer.element);
    const root = createRoot(container);
    const h = React.createElement;
    root.render(h(VFXProvider, null, h(VFXCanvas, {
      shader: "rainbow",
      uniforms: {
        time: () => timer.time
      },
      style: {
        display: "block",
        width: "100%"
      }
    }, h("h2", null, "VFXCanvas (react-vfx)"), h("p", {
      style: {
        fontSize: "1.2rem",
        lineHeight: 1.6,
        maxWidth: 600
      }
    }, "This element is rendered via the React VFXCanvas component using html-in-canvas."))));
  }
}`,...w.parameters?.docs?.source}}},T=[`AddHTML`,`AddHTMLWithImage`,`Fallback`,`CanvasSizeFixed`,`CanvasSizeWithPadding`,`CanvasSizeWithReflow`,`ReactVFXCanvas`]}))();export{v as AddHTML,y as AddHTMLWithImage,x as CanvasSizeFixed,S as CanvasSizeWithPadding,C as CanvasSizeWithReflow,b as Fallback,w as ReactVFXCanvas,T as __namedExportsOrder,_ as default};