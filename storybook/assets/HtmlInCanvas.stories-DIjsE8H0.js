import{a as e,n as t}from"./rolldown-runtime-sJBDdmOt.js";import{t as n}from"./react-DlPsW1c0.js";import{t as r}from"./client-lsv969vs.js";import{d as i,f as a}from"./utils-MMR05sUo.js";import{i as o,l as s,p as c}from"./react-CcndszUD.js";import{n as l,t as u}from"./jellyfish-DtC6VyHr.js";import{n as d,t as f}from"./Timer-R2IgWf3S.js";function p(e,t=`rainbow`){let n=new f(0,[0,10]);document.body.append(n.element);let r=i();return r.addHTML(e,{shader:t,uniforms:{time:()=>n.time}}),r}function m(){let e=document.getElementById(`storybook-root`);e.style.height=`auto`,e.style.display=`block`}var h,g,_,v,y,b,x,S,C,w,T,E,D,O,k,A,j,M,N;function P(){return(P=t((()=>{o(),h=e(n(),1),g=r(),u(),d(),a(),_=(e,t)=>e.querySelector(t),v=`
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
`,y={title:`Html In Canvas`,parameters:{layout:`fullscreen`,chromatic:{disableSnapshot:!0}}},b={render:()=>{m();let e=document.createElement(`div`);e.style.cssText=`padding:96px 128px 128px; font-family:sans-serif; color:white`;let t=document.createElement(`div`);return t.id=`add-html-target`,t.innerHTML=`
            <h2>html-in-canvas: addHTML</h2>
            <p style="font-size:1.2rem; line-height:1.6; max-width:600px">
                This element is captured via <code>drawElementImage</code>
                and rendered with a shader effect.
                Resize the window to see responsive re-capture.
            </p>
        `,e.appendChild(t),e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e)),p(_(e,`#add-html-target`))}},x={render:()=>{m();let e=document.createElement(`div`);e.style.cssText=`padding:96px 128px 128px; font-family:sans-serif; color:white`;let t=document.createElement(`div`);return t.id=`add-html-image-target`,t.innerHTML=`
            <h2>html-in-canvas: with image</h2>
            <img src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22200%22%3E%3Crect%20width%3D%22200%22%20height%3D%22200%22%20fill%3D%22%234488ff%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%22110%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%20font-size%3D%2224%22%3ESVG%3C%2Ftext%3E%3C%2Fsvg%3E"
                 style="display:block; width:200px; border-radius:8px; margin-top:16px" />
        `,e.appendChild(t),e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e)),p(_(e,`#add-html-image-target`))}},S={parameters:{layout:`padded`},render:()=>{let e=document.createElement(`div`);e.style.cssText=`padding-top:96px; font-family:sans-serif; color:white`;let t=document.createElement(`div`);return t.id=`fallback-target`,t.style.display=`flow-root`,t.innerHTML=`
            <h2>html-in-canvas: fallback</h2>
            <p style="font-size:1.2rem; line-height:1.6; max-width:600px">
                When html-in-canvas is not supported, <code>addHTML</code>
                falls back to <code>add</code> (dom-to-canvas).
            </p>
        `,e.appendChild(t),e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e));let t=_(e,`#fallback-target`),n=new f(0,[0,10]);document.body.append(n.element),await i().add(t,{shader:`rainbow`,uniforms:{time:()=>n.time}})}},C={render:()=>{m();let e=document.createElement(`div`);e.style.cssText=`margin: 96px 16px; font-family:sans-serif; color:white;`;let t=`width:300px; height:80px; background:linear-gradient(90deg,#284,#28a); display:flex; align-items:center; justify-content:center; font-weight:bold; margin-bottom:32px`,n=document.createElement(`div`);n.style.cssText=t,n.textContent=`REFERENCE 300×80`,e.appendChild(n);let r=document.createElement(`div`);return r.id=`fixed-width-target`,r.style.cssText=t,r.textContent=`WITH addHTML`,e.appendChild(r),e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e)),p(_(e,`#fixed-width-target`),v)}},w={render:()=>{m();let e=document.createElement(`div`);e.style.cssText=`margin: 96px 16px; font-family:sans-serif; color:white`;let t=`width:400px; padding:30px; border:5px solid #f44; background:linear-gradient(180deg,#284,#28a); font-size:1.4rem; line-height:1.6; font-weight:bold; margin-bottom:32px`,n=document.createElement(`div`);n.style.cssText=t,n.textContent=`REFERENCE (padding:30 border:5)`,e.appendChild(n);let r=document.createElement(`div`);return r.id=`padding-target`,r.style.cssText=t,r.textContent=`WITH addHTML (same size expected)`,e.appendChild(r),e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e));let t=v.replace(`uv.xyx`,`uv.yxy`);p(_(e,`#padding-target`),t)}},T=[{key:`class`,label:`Width from a class (.slides { width: 600px; margin: 0 40px })`,css:`.hic-css-class { width: 600px; margin: 0 40px; }`},{key:`id`,label:`Width from an #id rule (480px)`,css:`#hic-css-id-ref, #hic-css-id-target { width: 480px; }`},{key:`center`,label:`Centered with margin: 0 auto (480px)`,css:`.hic-css-center { width: 480px; margin: 0 auto; }`},{key:`scaled`,label:`Inside a transform: scale(0.75) parent (600px)`,css:`.hic-css-scaled { width: 600px; }`,stage:`transform: scale(0.75); transform-origin: 0 0; height: 60px`},{key:`right`,label:`position: absolute; right: 0 (300px)`,css:`.hic-css-right { position: absolute; top: 0; right: 0; width: 300px; }`,stage:`position: relative; height: 80px`},{key:`half`,label:`position: absolute; left: 50% (300px)`,css:`.hic-css-half { position: absolute; top: 0; left: 50%; width: 300px; }`,stage:`position: relative; height: 80px`}],E={render:()=>{m();let e=document.createElement(`div`);e.style.cssText=`margin: 96px 16px; font-family:sans-serif; color:#222; display:flex; flex-direction:column; gap:12px`;let t=document.createElement(`style`);t.textContent=`
            .hic-css-box {
                box-sizing: border-box; height: 80px; display: flex;
                align-items: center; justify-content: center; font-weight: bold;
            }
            .hic-css-ref { border: 2px dashed #888; color: #888; }
            .hic-css-target { background: #345; color: white; }
            ${T.map(e=>e.css).join(`
`)}
        `,e.appendChild(t);for(let t of T){let n=document.createElement(`div`);n.textContent=t.label,n.style.cssText=`font-size:0.9rem; margin-top:12px`,e.appendChild(n);for(let n of[`ref`,`target`]){let r=document.createElement(`div`);r.style.cssText=`stage`in t?t.stage:``;let i=document.createElement(`div`);i.className=`hic-css-box hic-css-${n} hic-css-${t.key}`,i.id=`hic-css-${t.key}-${n}`,i.textContent=n===`ref`?`REFERENCE`:`addHTML`,r.appendChild(i),e.appendChild(r)}}return e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e));let t=new f(0,[0,10]);document.body.append(t.element);let n=i();for(let r of T){let i=_(e,`#hic-css-${r.key}-target`);n.addHTML(i,{shader:v,uniforms:{time:()=>t.time}})}}},D={render:()=>{m();let e=document.createElement(`div`);e.style.cssText=`margin: 96px 16px; font-family:sans-serif; color:white`;let t=document.createElement(`div`);t.id=`reflow-target`,t.style.cssText=`font-size:1.4rem; line-height:1.6; padding:16px; border:2px solid #888; max-width:600px`,t.textContent=`Initial text`,e.appendChild(t);let n=document.createElement(`div`);n.style.cssText=`margin-top:16px; display:flex; gap:8px`,e.appendChild(n);for(let[e,t]of[[`reflow-change`,`Change DOM text`],[`reflow-update`,`Manual vfx.update()`]]){let r=document.createElement(`button`);r.id=e,r.textContent=t,r.style.padding=`8px 16px`,n.appendChild(r)}return e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e));let t=_(e,`#reflow-target`),n=_(e,`#reflow-change`),r=_(e,`#reflow-update`),i=p(t),a=0;n.addEventListener(`click`,()=>{a++,t.textContent=`Updated text #${a} — longer content to force reflow`}),r.addEventListener(`click`,()=>{i.update(t)})}},O={render:()=>{m();let e=document.createElement(`div`);return e.style.cssText=`padding:96px 128px 128px; font-family:sans-serif; color:white`,e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e));let t=e.firstElementChild,n=new f(0,[0,10]);document.body.append(n.element);let r=(0,g.createRoot)(t),i=h.createElement;r.render(i(s,null,i(c,{shader:`rainbow`,uniforms:{time:()=>n.time},style:{display:`block`,width:`100%`}},i(`h2`,null,`VFXCanvas (@vfx-js/react)`),i(`p`,{style:{fontSize:`1.2rem`,lineHeight:1.6,maxWidth:600}},`This element is rendered via the React VFXCanvas component using html-in-canvas.`))))}},k=`
.inset-box {
    position: relative;
    display: inline-block;
    width: 360px;
    height: 220px;
    margin-right: 32px;
    background: #333;
}
.inset-target {
    position: absolute;
    inset: 24px;
    border: 8px solid #fc4;
    background: #246;
    padding: 12px;
    font-weight: bold;
}
`,A={render:()=>{m();let e=document.createElement(`div`);e.style.cssText=`margin: 96px 16px; font-family:sans-serif; color:white`;let t=document.createElement(`style`);t.textContent=k,e.appendChild(t);for(let[t,n]of[[`inset-sized-ref`,`REFERENCE`],[`inset-sized-target`,`WITH addHTML`]]){let r=document.createElement(`div`);r.className=`inset-box`,r.innerHTML=`
                <div id="${t}" class="inset-target">
                    ${n}
                </div>
            `,e.appendChild(r)}return e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e)),p(_(e,`#inset-sized-target`),`none`)}},j={render:()=>{m();let e=document.createElement(`div`);e.style.cssText=`margin: 96px 16px; font-family:sans-serif; color:white`;for(let[t,n]of[[`percent-margin-ref`,`REFERENCE`],[`percent-margin-target`,`WITH addHTML`]]){let r=document.createElement(`div`);r.style.cssText=`position:relative; width:600px; height:200px; margin-bottom:32px; outline:1px solid #888`;let i=document.createElement(`div`);i.id=t,i.style.cssText=`position:absolute; top:0; bottom:0; left:0; right:0; margin:5% 0; background:linear-gradient(90deg,#284,#28a); font-weight:bold; padding:8px`,i.textContent=n,r.appendChild(i),e.appendChild(r)}return e},play:async({canvasElement:e})=>{await new Promise(e=>requestAnimationFrame(e)),p(_(e,`#percent-margin-target`),v)}},M={render:()=>{m();let e=document.createElement(`div`);e.style.cssText=`margin: 96px 16px; font-family:sans-serif; color:white`;for(let t of[`replaced-ref`,`replaced-target`]){let n=document.createElement(`div`);n.style.cssText=`position:relative; width:900px; height:500px; margin-bottom:32px; outline:1px solid #888`;let r=document.createElement(`img`);r.id=t,r.src=l,r.style.cssText=`position:absolute; inset:0`,n.appendChild(r),e.appendChild(n)}return e},play:async({canvasElement:e})=>{let t=_(e,`#replaced-target`);await t.decode(),p(t,v)}},N=[`AddHTML`,`AddHTMLWithImage`,`Fallback`,`CanvasSizeFixed`,`CanvasSizeWithPadding`,`CanvasSizeFromCSS`,`CanvasSizeWithReflow`,`ReactVFXCanvas`,`InsetSized`,`InsetSizedPercentMargin`,`InsetReplacedElement`],b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
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
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
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
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
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
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
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
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
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
}`,...w.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  render: () => {
    fullscreenRoot();
    const container = document.createElement("div");
    container.style.cssText = "margin: 96px 16px; font-family:sans-serif; color:#222; display:flex; flex-direction:column; gap:12px";
    const style = document.createElement("style");
    style.textContent = \`
            .hic-css-box {
                box-sizing: border-box; height: 80px; display: flex;
                align-items: center; justify-content: center; font-weight: bold;
            }
            .hic-css-ref { border: 2px dashed #888; color: #888; }
            .hic-css-target { background: #345; color: white; }
            \${cssSizeCases.map(c => c.css).join("\\n")}
        \`;
    container.appendChild(style);
    for (const c of cssSizeCases) {
      const label = document.createElement("div");
      label.textContent = c.label;
      label.style.cssText = "font-size:0.9rem; margin-top:12px";
      container.appendChild(label);
      for (const role of ["ref", "target"] as const) {
        const stage = document.createElement("div");
        stage.style.cssText = "stage" in c ? c.stage : "";
        const box = document.createElement("div");
        box.className = \`hic-css-box hic-css-\${role} hic-css-\${c.key}\`;
        box.id = \`hic-css-\${c.key}-\${role}\`;
        box.textContent = role === "ref" ? "REFERENCE" : "addHTML";
        stage.appendChild(box);
        container.appendChild(stage);
      }
    }
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    await new Promise(r => requestAnimationFrame(r));
    const timer = new Timer(0, [0, 10]);
    document.body.append(timer.element);
    const vfx = initVFX();
    for (const c of cssSizeCases) {
      const target = qs<HTMLElement>(canvasElement, \`#hic-css-\${c.key}-target\`);
      vfx.addHTML(target, {
        shader: solidShader,
        uniforms: {
          time: () => timer.time
        }
      });
    }
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
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
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
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
    }, h("h2", null, "VFXCanvas (@vfx-js/react)"), h("p", {
      style: {
        fontSize: "1.2rem",
        lineHeight: 1.6,
        maxWidth: 600
      }
    }, "This element is rendered via the React VFXCanvas component using html-in-canvas."))));
  }
}`,...O.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  render: () => {
    fullscreenRoot();
    const container = document.createElement("div");
    container.style.cssText = "margin: 96px 16px; font-family:sans-serif; color:white";
    const style = document.createElement("style");
    style.textContent = insetSizedCss;
    container.appendChild(style);
    for (const [id, label] of [["inset-sized-ref", "REFERENCE"], ["inset-sized-target", "WITH addHTML"]]) {
      const box = document.createElement("div");
      box.className = "inset-box";
      box.innerHTML = \`
                <div id="\${id}" class="inset-target">
                    \${label}
                </div>
            \`;
      container.appendChild(box);
    }
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    await new Promise(r => requestAnimationFrame(r));
    setupHIC(qs(canvasElement, "#inset-sized-target"), "none");
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  render: () => {
    fullscreenRoot();
    const container = document.createElement("div");
    container.style.cssText = "margin: 96px 16px; font-family:sans-serif; color:white";
    const targetCss = "position:absolute; top:0; bottom:0; left:0; right:0; margin:5% 0; background:linear-gradient(90deg,#284,#28a); font-weight:bold; padding:8px";
    for (const [id, label] of [["percent-margin-ref", "REFERENCE"], ["percent-margin-target", "WITH addHTML"]]) {
      const box = document.createElement("div");
      box.style.cssText = "position:relative; width:600px; height:200px; margin-bottom:32px; outline:1px solid #888";
      const target = document.createElement("div");
      target.id = id;
      target.style.cssText = targetCss;
      target.textContent = label;
      box.appendChild(target);
      container.appendChild(box);
    }
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    await new Promise(r => requestAnimationFrame(r));
    setupHIC(qs(canvasElement, "#percent-margin-target"), solidShader);
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  render: () => {
    fullscreenRoot();
    const container = document.createElement("div");
    container.style.cssText = "margin: 96px 16px; font-family:sans-serif; color:white";
    for (const id of ["replaced-ref", "replaced-target"]) {
      const box = document.createElement("div");
      box.style.cssText = "position:relative; width:900px; height:500px; margin-bottom:32px; outline:1px solid #888";
      const img = document.createElement("img");
      img.id = id;
      img.src = Jellyfish;
      img.style.cssText = "position:absolute; inset:0";
      box.appendChild(img);
      container.appendChild(box);
    }
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    const img = qs<HTMLImageElement>(canvasElement, "#replaced-target");
    await img.decode();
    setupHIC(img, solidShader);
  }
}`,...M.parameters?.docs?.source}}}})))()}P();export{b as AddHTML,x as AddHTMLWithImage,C as CanvasSizeFixed,E as CanvasSizeFromCSS,w as CanvasSizeWithPadding,D as CanvasSizeWithReflow,S as Fallback,M as InsetReplacedElement,A as InsetSized,j as InsetSizedPercentMargin,O as ReactVFXCanvas,N as __namedExportsOrder,y as default};