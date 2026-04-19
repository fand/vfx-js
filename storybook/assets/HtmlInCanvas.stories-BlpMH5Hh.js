import{c as N,R as _}from"./jsx-runtime-Dsq5Daep.js";import{a as $,b as O}from"./react-vfx-Du5BiHC6.js";import{T as g}from"./Timer-D64dUIku.js";import{i as W}from"./utils-BUgq-vrJ.js";import"./vfx-wGJBmbdk.js";const s=(e,t)=>e.querySelector(t);function d(e,t="rainbow"){const n=new g(0,[0,10]);document.body.append(n.element);const a=W();return a.addHTML(e,{shader:t,uniforms:{time:()=>n.time}}),a}const X=`
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
`;function i(){const e=document.getElementById("storybook-root");e.style.height="auto",e.style.display="block"}const K={title:"Html In Canvas",parameters:{layout:"fullscreen",chromatic:{disableSnapshot:!0}}},c={render:()=>{i();const e=document.createElement("div");e.style.cssText="padding:96px 128px 128px; font-family:sans-serif; color:white";const t=document.createElement("div");return t.id="add-html-target",t.innerHTML=`
            <h2>html-in-canvas: addHTML</h2>
            <p style="font-size:1.2rem; line-height:1.6; max-width:600px">
                This element is captured via <code>drawElementImage</code>
                and rendered with a shader effect.
                Resize the window to see responsive re-capture.
            </p>
        `,e.appendChild(t),e},play:async({canvasElement:e})=>{await new Promise(t=>requestAnimationFrame(t)),d(s(e,"#add-html-target"))}},l={render:()=>{i();const e=document.createElement("div");e.style.cssText="padding:96px 128px 128px; font-family:sans-serif; color:white";const t=document.createElement("div");return t.id="add-html-image-target",t.innerHTML=`
            <h2>html-in-canvas: with image</h2>
            <img src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#4488ff"/><text x="100" y="110" text-anchor="middle" fill="white" font-size="24">SVG</text></svg>')}"
                 style="display:block; width:200px; border-radius:8px; margin-top:16px" />
        `,e.appendChild(t),e},play:async({canvasElement:e})=>{await new Promise(t=>requestAnimationFrame(t)),d(s(e,"#add-html-image-target"))}},m={parameters:{layout:"padded"},render:()=>{const e=document.createElement("div");e.style.cssText="padding-top:96px; font-family:sans-serif; color:white";const t=document.createElement("div");return t.id="fallback-target",t.style.display="flow-root",t.innerHTML=`
            <h2>html-in-canvas: fallback</h2>
            <p style="font-size:1.2rem; line-height:1.6; max-width:600px">
                When html-in-canvas is not supported, <code>addHTML</code>
                falls back to <code>add</code> (dom-to-canvas).
            </p>
        `,e.appendChild(t),e},play:async({canvasElement:e})=>{await new Promise(r=>requestAnimationFrame(r));const t=s(e,"#fallback-target"),n=new g(0,[0,10]);document.body.append(n.element),await W().add(t,{shader:"rainbow",uniforms:{time:()=>n.time}})}},p={render:()=>{i();const e=document.createElement("div");e.style.cssText="margin: 96px 16px; font-family:sans-serif; color:white;";const t="width:300px; height:80px; background:linear-gradient(90deg,#284,#28a); display:flex; align-items:center; justify-content:center; font-weight:bold; margin-bottom:32px",n=document.createElement("div");n.style.cssText=t,n.textContent="REFERENCE 300×80",e.appendChild(n);const a=document.createElement("div");return a.id="fixed-width-target",a.style.cssText=t,a.textContent="WITH addHTML",e.appendChild(a),e},play:async({canvasElement:e})=>{await new Promise(t=>requestAnimationFrame(t)),d(s(e,"#fixed-width-target"),X)}},h={render:()=>{i();const e=document.createElement("div");e.style.cssText="margin: 96px 16px; font-family:sans-serif; color:white";const t="width:400px; padding:30px; border:5px solid #f44; background:linear-gradient(180deg,#284,#28a); font-size:1.4rem; line-height:1.6; font-weight:bold; margin-bottom:32px",n=document.createElement("div");n.style.cssText=t,n.textContent="REFERENCE (padding:30 border:5)",e.appendChild(n);const a=document.createElement("div");return a.id="padding-target",a.style.cssText=t,a.textContent="WITH addHTML (same size expected)",e.appendChild(a),e},play:async({canvasElement:e})=>{await new Promise(n=>requestAnimationFrame(n));const t=X.replace("uv.xyx","uv.yxy");d(s(e,"#padding-target"),t)}},x={render:()=>{i();const e=document.createElement("div");e.style.cssText="margin: 96px 16px; font-family:sans-serif; color:white";const t=document.createElement("div");t.id="reflow-target",t.style.cssText="font-size:1.4rem; line-height:1.6; padding:16px; border:2px solid #888; max-width:600px",t.textContent="Initial text",e.appendChild(t);const n=document.createElement("div");n.style.cssText="margin-top:16px; display:flex; gap:8px",e.appendChild(n);for(const[a,r]of[["reflow-change","Change DOM text"],["reflow-update","Manual vfx.update()"]]){const o=document.createElement("button");o.id=a,o.textContent=r,o.style.padding="8px 16px",n.appendChild(o)}return e},play:async({canvasElement:e})=>{await new Promise(U=>requestAnimationFrame(U));const t=s(e,"#reflow-target"),n=s(e,"#reflow-change"),a=s(e,"#reflow-update"),r=d(t);let o=0;n.addEventListener("click",()=>{o++,t.textContent=`Updated text #${o} — longer content to force reflow`}),a.addEventListener("click",()=>{r.update(t)})}},u={render:()=>{i();const e=document.createElement("div");return e.style.cssText="padding:96px 128px 128px; font-family:sans-serif; color:white",e},play:async({canvasElement:e})=>{await new Promise(o=>requestAnimationFrame(o));const t=e.firstElementChild,n=new g(0,[0,10]);document.body.append(n.element);const a=N.createRoot(t),r=_.createElement;a.render(r($,null,r(O,{shader:"rainbow",uniforms:{time:()=>n.time},style:{display:"block",width:"100%"}},r("h2",null,"VFXCanvas (react-vfx)"),r("p",{style:{fontSize:"1.2rem",lineHeight:1.6,maxWidth:600}},"This element is rendered via the React VFXCanvas component using html-in-canvas."))))}};var f,v,w;c.parameters={...c.parameters,docs:{...(f=c.parameters)==null?void 0:f.docs,source:{originalSource:`{
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
}`,...(w=(v=c.parameters)==null?void 0:v.docs)==null?void 0:w.source}}};var y,E,C;l.parameters={...l.parameters,docs:{...(y=l.parameters)==null?void 0:y.docs,source:{originalSource:`{
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
}`,...(C=(E=l.parameters)==null?void 0:E.docs)==null?void 0:C.source}}};var b,T,H;m.parameters={...m.parameters,docs:{...(b=m.parameters)==null?void 0:b.docs,source:{originalSource:`{
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
}`,...(H=(T=m.parameters)==null?void 0:T.docs)==null?void 0:H.source}}};var F,R,L;p.parameters={...p.parameters,docs:{...(F=p.parameters)==null?void 0:F.docs,source:{originalSource:`{
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
}`,...(L=(R=p.parameters)==null?void 0:R.docs)==null?void 0:L.source}}};var M,k,q;h.parameters={...h.parameters,docs:{...(M=h.parameters)==null?void 0:M.docs,source:{originalSource:`{
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
}`,...(q=(k=h.parameters)==null?void 0:k.docs)==null?void 0:q.source}}};var z,S,I;x.parameters={...x.parameters,docs:{...(z=x.parameters)==null?void 0:z.docs,source:{originalSource:`{
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
}`,...(I=(S=x.parameters)==null?void 0:S.docs)==null?void 0:I.source}}};var A,P,V;u.parameters={...u.parameters,docs:{...(A=u.parameters)==null?void 0:A.docs,source:{originalSource:`{
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
}`,...(V=(P=u.parameters)==null?void 0:P.docs)==null?void 0:V.source}}};const Q=["AddHTML","AddHTMLWithImage","Fallback","CanvasSizeFixed","CanvasSizeWithPadding","CanvasSizeWithReflow","ReactVFXCanvas"];export{c as AddHTML,l as AddHTMLWithImage,p as CanvasSizeFixed,h as CanvasSizeWithPadding,x as CanvasSizeWithReflow,m as Fallback,u as ReactVFXCanvas,Q as __namedExportsOrder,K as default};
