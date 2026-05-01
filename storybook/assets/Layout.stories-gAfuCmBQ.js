import{n as e}from"./chunk-BneVvdWh.js";import{a as t,o as n}from"./utils-BLrKilFH.js";import{n as r,r as i,t as a}from"./preset-hB8Fk8QM.js";import{n as o,t as s}from"./jellyfish-D2xsay8i.js";import{n as c,t as l}from"./Timer-D-Ck6ryf.js";var u,d,f,p,m,h,g,_,v,y,b,x,S,C,w,T,E,D,O,k;e((()=>{n(),c(),r(),s(),a(),u=`
precision highp float;
uniform vec2 offset;
uniform vec2 resolution;
uniform sampler2D src;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    outColor = texture(src, uv);

    // Show the UV coordinate
    outColor += vec4(fract(uv), 0, 0.25);

    // Show the center
    vec2 p = uv * 2. - 1.;
    p.x *= resolution.x / resolution.y;
    outColor += (fract(length(p)) * .5 + .5) * 0.25;
}
`,d={title:`Layout`,parameters:{layout:`fullscreen`}},f={render:({padding:e})=>{let n=document.createElement(`img`);n.src=i;let r=document.createElement(`div`);return r.style.padding=`${e}px`,r.appendChild(n),t().add(n,{shader:u,overflow:!0}),r},args:{padding:100}},p={render:({overflow:e})=>{let n=document.createElement(`img`);n.src=i;let r=document.createElement(`div`);return r.style.padding=`${e*2}px`,r.appendChild(n),t().add(n,{shader:u,overflow:e}),r},args:{overflow:100}},m={render:({overflow:e})=>{let n=document.createElement(`img`);n.src=i;let[r,a,o,s]=e,c=document.createElement(`div`);return c.style.padding=`${r}px ${a}px ${o}px ${s}px`,c.appendChild(n),t().add(n,{shader:u,overflow:e}),c},args:{overflow:[50,100,150,200]}},h={render:({pixelRatio:e})=>{let n=document.createElement(`img`);return n.src=i,t({pixelRatio:e}).add(n,{shader:u}),n},args:{pixelRatio:.1}},g=({zIndex:e,fgZIndex:n})=>{let r=document.createElement(`img`);r.src=i;let a=document.createElement(`div`);a.className=`wrapper`,a.appendChild(r);let o=document.createElement(`div`);return o.className=`fg`,o.innerText=`Hello`,o.style.zIndex=n.toString(),a.appendChild(o),t({zIndex:e}).add(r,{shader:u}),a},_={render:g,args:{zIndex:0,fgZIndex:1}},v={render:g,args:{zIndex:-1,fgZIndex:0}},y=({zIndex:e})=>{let n=[[1,0,0],[0,1,0],[0,0,1]],r=document.createElement(`div`);r.className=`elementZIndexWrapper`;let a=t();for(let t=0;t<3;t++){let o=document.createElement(`img`);o.src=i,r.appendChild(o),a.add(o,{shader:`
precision highp float;
uniform vec2 offset;
uniform vec2 resolution;
uniform sampler2D src;
uniform vec3 bg;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    outColor = texture(src, uv);
    outColor += vec4(bg, 0.5);
}
    `,zIndex:e[t],uniforms:{bg:n[t]}})}return r},b={render:y,args:{zIndex:[0,0,0]}},x={render:y,args:{zIndex:[1,3,2]}},S={render:y,args:{zIndex:[3,2,1]}},C={render:()=>{let e=document.createElement(`img`);return e.src=i,t().add(e,{shader:`
        precision highp float;
        uniform vec2 offset;
        uniform vec2 resolution;
        uniform sampler2D src;
        uniform vec3 bg;
        out vec4 outColor;

        void main() {
            vec2 uv = (gl_FragCoord.xy - offset) / resolution;
            uv = (uv - .5) * 0.9 + .5;
            outColor = texture(src, uv) * 0.5;
        }
        `,overlay:!0}),e},args:null},w=e=>({render:({wrap:e})=>{let n=document.createElement(`img`);return n.src=i,t().add(n,{shader:u,wrap:e,overflow:200}),n},args:{wrap:e},argTypes:{wrap:{control:{type:`select`},options:[`repeat`,`clamp`,`mirror`]}}}),T=w(`repeat`),E=w(`clamp`),D=w(`mirror`),O={render:({shader:e,autoCrop:n})=>{let r=new l(0,[0,10]);document.body.append(r.element);let i=document.createElement(`img`);return i.src=o,t().add(i,{shader:e,autoCrop:n,overflow:200,uniforms:{time:()=>r.time}}),i},args:{shader:`rainbow`,autoCrop:!0}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: ({
    padding
  }) => {
    const img = document.createElement("img");
    img.src = Logo;
    const wrapper = document.createElement("div");
    wrapper.style.padding = \`\${padding}px\`;
    wrapper.appendChild(img);
    const vfx = initVFX();
    vfx.add(img, {
      shader,
      overflow: true
    });
    return wrapper;
  },
  args: {
    padding: 100
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: ({
    overflow
  }) => {
    const img = document.createElement("img");
    img.src = Logo;
    const wrapper = document.createElement("div");
    wrapper.style.padding = \`\${overflow * 2}px\`;
    wrapper.appendChild(img);
    const vfx = initVFX();
    vfx.add(img, {
      shader,
      overflow
    });
    return wrapper;
  },
  args: {
    overflow: 100
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: ({
    overflow
  }) => {
    const img = document.createElement("img");
    img.src = Logo;
    const [o1, o2, o3, o4] = overflow;
    const wrapper = document.createElement("div");
    wrapper.style.padding = \`\${o1}px \${o2}px \${o3}px \${o4}px\`;
    wrapper.appendChild(img);
    const vfx = initVFX();
    vfx.add(img, {
      shader,
      overflow
    });
    return wrapper;
  },
  args: {
    overflow: [50, 100, 150, 200]
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: ({
    pixelRatio
  }) => {
    const img = document.createElement("img");
    img.src = Logo;
    const vfx = initVFX({
      pixelRatio
    });
    vfx.add(img, {
      shader
    });
    return img;
  },
  args: {
    pixelRatio: 0.1
  }
}`,...h.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: zIndexBase,
  args: {
    zIndex: 0,
    fgZIndex: 1
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: zIndexBase,
  args: {
    zIndex: -1,
    fgZIndex: 0
  }
}`,...v.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: elementZIndexBase,
  args: {
    zIndex: [0, 0, 0] as const
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: elementZIndexBase,
  args: {
    zIndex: [1, 3, 2] as const
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: elementZIndexBase,
  args: {
    zIndex: [3, 2, 1] as const
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => {
    const shader = \`
        precision highp float;
        uniform vec2 offset;
        uniform vec2 resolution;
        uniform sampler2D src;
        uniform vec3 bg;
        out vec4 outColor;

        void main() {
            vec2 uv = (gl_FragCoord.xy - offset) / resolution;
            uv = (uv - .5) * 0.9 + .5;
            outColor = texture(src, uv) * 0.5;
        }
        \`;
    const img = document.createElement("img");
    img.src = Logo;
    const vfx = initVFX();
    vfx.add(img, {
      shader,
      overlay: true
    });
    return img;
  },
  args: null
}`,...C.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`wrapBase("repeat")`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`wrapBase("clamp")`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`wrapBase("mirror")`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: ({
    shader,
    autoCrop
  }: {
    shader: string;
    autoCrop: boolean;
  }) => {
    const timer = new Timer(0, [0, 10]);
    document.body.append(timer.element);
    const img = document.createElement("img");
    img.src = Jellyfish;
    const vfx = initVFX();
    vfx.add(img, {
      shader,
      autoCrop,
      overflow: 200,
      uniforms: {
        time: () => timer.time
      }
    });
    return img;
  },
  args: {
    shader: "rainbow",
    autoCrop: true
  }
}`,...O.parameters?.docs?.source}}},k=[`fullscreen`,`overflowSingle`,`overflowArray`,`pixelRatio`,`zIndex`,`zIndexNegative`,`elementZIndexDefault`,`elementZIndexDefault132`,`elementZIndexDefault321`,`overlay`,`wrapRepeat`,`wrapClamp`,`wrapMirror`,`autoCrop`]}))();export{k as __namedExportsOrder,O as autoCrop,d as default,b as elementZIndexDefault,x as elementZIndexDefault132,S as elementZIndexDefault321,f as fullscreen,m as overflowArray,p as overflowSingle,C as overlay,h as pixelRatio,E as wrapClamp,D as wrapMirror,T as wrapRepeat,_ as zIndex,v as zIndexNegative};