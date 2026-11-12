import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{d as t,f as n}from"./utils-JGGk8dOF.js";import"./preset-DFGAZ5Mi.js";function r(e){let t=document.createElement(`div`);return t.style.cssText=`display:flex;gap:16px;align-items:center;padding:12px;color:white;font:20px sans-serif;`,t.innerHTML=`
        <span style="width:200px">${e}</span>
        <code style="background:rgba(255,255,255,0.12);padding:4px 8px">rgba(255,255,255,0.12)</code>
        <span style="background:rgba(255,0,0,0.3);padding:4px 8px">rgba(255,0,0,0.3)</span>
        <span style="background:rgba(0,128,255,0.5);padding:4px 8px">rgba(0,128,255,0.5)</span>
    `,t}var i,a,o,s,c;function l(){return(l=e((()=>{n(),i=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`,a=class{render(e){e.draw({frag:i,uniforms:{src:e.src},target:e.target})}},o={title:`PremultipliedSrc`,parameters:{layout:`fullscreen`}},s={render:()=>{let e=document.createElement(`div`);e.style.cssText=`background:#222;min-height:100vh;padding:40px;`;let n=r(`HTML`),i=r(`shader`),o=r(`effect: []`),s=r(`effect: [copy]`);e.append(n,i,o,s);let c=t();return requestAnimationFrame(()=>{c.add(i,{shader:`none`}),c.add(o,{effect:[]}),c.add(s,{effect:[new a]})}),e}},c=[`translucent`],s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => {
    const root = document.createElement("div");
    root.style.cssText = "background:#222;min-height:100vh;padding:40px;";
    const plain = makeSample("HTML");
    const shader = makeSample("shader");
    const empty = makeSample("effect: []");
    const copy = makeSample("effect: [copy]");
    root.append(plain, shader, empty, copy);
    const vfx = initVFX();
    requestAnimationFrame(() => {
      vfx.add(shader, {
        shader: "none"
      });
      vfx.add(empty, {
        effect: []
      });
      vfx.add(copy, {
        effect: [new CopyEffect()]
      });
    });
    return root;
  }
}`,...s.parameters?.docs?.source}}}})))()}l();export{c as __namedExportsOrder,o as default,s as translucent};