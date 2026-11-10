import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{d as t,f as n}from"./utils-BDkCp7KQ.js";import"./preset-DFGAZ5Mi.js";import{n as r,t as i}from"./jellyfish-DtC6VyHr.js";var a,o,s,c,l,u;function d(){return(d=e((()=>{i(),n(),a=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`,o=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D rt;
uniform float lod;
void main() {
    float useLod = uv.x < 0.5 ? 0.0 : lod;
    vec4 c = textureLod(rt, uv, useLod);
    // Red separator down the middle for unambiguous split.
    if (abs(uv.x - 0.5) < 0.002) c = vec4(1.0, 0.0, 0.0, 1.0);
    outColor = c;
}
`,s=class{lod;#e=null;constructor(e){this.lod=e}init(e){this.#e=e.createRenderTarget({mipmap:!0})}render(e){this.#e&&(e.draw({frag:a,uniforms:{src:e.src},target:this.#e}),e.draw({frag:o,uniforms:{rt:this.#e,lod:this.lod},target:e.target}))}dispose(){this.#e=null}},c={title:`Mipmap`,parameters:{layout:`fullscreen`}},l={render:e=>{let n=document.createElement(`img`);n.src=r,n.style.display=`block`,n.style.margin=`40px auto`;let i=t(),a=new s(e.lod);return n.onload=()=>{i.add(n,{effect:a})},n},args:{lod:4},argTypes:{lod:{control:{type:`range`,min:0,max:10,step:.1}}}},u=[`smoke`],l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: args => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    img.style.display = "block";
    img.style.margin = "40px auto";
    const vfx = initVFX();
    const effect = new MipmapSmokeEffect(args.lod);
    img.onload = () => {
      vfx.add(img, {
        effect
      });
    };
    return img;
  },
  args: {
    lod: 4
  },
  argTypes: {
    lod: {
      control: {
        type: "range",
        min: 0,
        max: 10,
        step: 0.1
      }
    }
  }
}`,...l.parameters?.docs?.source}}}})))()}d();export{u as __namedExportsOrder,c as default,l as smoke};