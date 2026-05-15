import{n as e}from"./chunk-BneVvdWh.js";import{c as t,s as n}from"./utils-75XtCKbd.js";import{t as r}from"./preset-B7f9t9lo.js";import{n as i,t as a}from"./jellyfish-B6nQsbyY.js";var o,s,c,l,u,d;e((()=>{a(),r(),t(),o=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`,s=`#version 300 es
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
`,c=class{lod;#e=null;constructor(e){this.lod=e}init(e){this.#e=e.createRenderTarget({mipmap:!0})}render(e){this.#e&&(e.draw({frag:o,uniforms:{src:e.src},target:this.#e}),e.draw({frag:s,uniforms:{rt:this.#e,lod:this.lod},target:e.target}))}dispose(){this.#e=null}},l={title:`Mipmap`,parameters:{layout:`fullscreen`}},u={render:e=>{let t=document.createElement(`img`);t.src=i,t.style.display=`block`,t.style.margin=`40px auto`;let r=n(),a=new c(e.lod);return t.onload=()=>{r.add(t,{effect:a})},t},args:{lod:4},argTypes:{lod:{control:{type:`range`,min:0,max:10,step:.1}}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
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
}`,...u.parameters?.docs?.source}}},d=[`smoke`]}))();export{d as __namedExportsOrder,l as default,u as smoke};