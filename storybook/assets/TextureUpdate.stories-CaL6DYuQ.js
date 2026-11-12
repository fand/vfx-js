import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{d as t,f as n}from"./utils-JGGk8dOF.js";import"./preset-DFGAZ5Mi.js";function r(e,t){let n=e.getContext(`2d`);n&&(n.fillStyle=`#222`,n.fillRect(0,0,e.width,e.height),n.fillStyle=o[t%o.length],n.beginPath(),n.arc(e.width/2,e.height/2,e.height/3,0,Math.PI*2),n.fill(),n.fillStyle=`#fff`,n.font=`bold 48px sans-serif`,n.textAlign=`center`,n.textBaseline=`middle`,n.fillText(String(t),e.width/2,e.height/2))}var i,a,o,s,c,l;function u(){return(u=e((()=>{n(),i=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D tex;
void main() {
    outColor = texture(tex, uv);
}
`,a=class{tex=null;#e;constructor(e){this.#e=e}init(e){this.tex=e.wrapTexture(this.#e,{autoUpdate:!1})}render(e){this.tex&&e.draw({frag:i,uniforms:{tex:this.tex},target:e.target})}dispose(){this.tex?.dispose(),this.tex=null}},o=[`#e63946`,`#2a9d8f`,`#e9c46a`,`#457b9d`,`#f4a261`],s={title:`TextureUpdate`,parameters:{layout:`fullscreen`}},c={render:()=>{let e=document.createElement(`div`);e.style.padding=`40px`;let n=document.createElement(`canvas`);n.width=400,n.height=300;let i=0;r(n,i);let o=document.createElement(`div`);o.style.width=`400px`,o.style.height=`300px`;let s=document.createElement(`div`);s.style.marginTop=`16px`,s.style.display=`flex`,s.style.gap=`8px`;let c=new a(n),l=document.createElement(`button`);l.textContent=`Redraw`,l.onclick=()=>{r(n,++i)};let u=document.createElement(`button`);u.textContent=`Redraw + update()`,u.onclick=()=>{r(n,++i),c.tex?.update()},s.append(l,u),e.append(o,s);let d=t();return requestAnimationFrame(()=>{d.add(o,{effect:c})}),e}},l=[`manualUpdate`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => {
    const root = document.createElement("div");
    root.style.padding = "40px";
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    let count = 0;
    draw(canvas, count);
    const target = document.createElement("div");
    target.style.width = "400px";
    target.style.height = "300px";
    const buttons = document.createElement("div");
    buttons.style.marginTop = "16px";
    buttons.style.display = "flex";
    buttons.style.gap = "8px";
    const effect = new CanvasTextureEffect(canvas);
    const redraw = document.createElement("button");
    redraw.textContent = "Redraw";
    redraw.onclick = () => {
      draw(canvas, ++count);
    };
    const redrawAndUpdate = document.createElement("button");
    redrawAndUpdate.textContent = "Redraw + update()";
    redrawAndUpdate.onclick = () => {
      draw(canvas, ++count);
      effect.tex?.update();
    };
    buttons.append(redraw, redrawAndUpdate);
    root.append(target, buttons);
    const vfx = initVFX();
    requestAnimationFrame(() => {
      vfx.add(target, {
        effect
      });
    });
    return root;
  }
}`,...c.parameters?.docs?.source}}}})))()}u();export{l as __namedExportsOrder,s as default,c as manualUpdate};