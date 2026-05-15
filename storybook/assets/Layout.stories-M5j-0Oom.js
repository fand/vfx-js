import{n as e}from"./chunk-BneVvdWh.js";import{c as t,s as n}from"./utils-75XtCKbd.js";import{n as r,t as i}from"./logo-640w-20p-DamX1-bG.js";import{t as a}from"./preset-B7f9t9lo.js";import{n as o,t as s}from"./jellyfish-B6nQsbyY.js";import{n as c,t as l}from"./Timer-D-KEr5Rw.js";var u,d,f,p,m,h,g,_,v,y,b,x,S,C,w,T,E,D,O,k;e((()=>{t(),c(),i(),s(),a(),u=`
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
`,d={title:`Layout`,parameters:{layout:`fullscreen`}},f={render:({padding:e})=>{let t=document.createElement(`img`);t.src=r;let i=document.createElement(`div`);return i.style.padding=`${e}px`,i.appendChild(t),n().add(t,{shader:u,overflow:!0}),i},args:{padding:100}},p={render:({overflow:e})=>{let t=document.createElement(`img`);t.src=r;let i=document.createElement(`div`);return i.style.padding=`${e*2}px`,i.appendChild(t),n().add(t,{shader:u,overflow:e}),i},args:{overflow:100}},m={render:({overflow:e})=>{let t=document.createElement(`img`);t.src=r;let[i,a,o,s]=e,c=document.createElement(`div`);return c.style.padding=`${i}px ${a}px ${o}px ${s}px`,c.appendChild(t),n().add(t,{shader:u,overflow:e}),c},args:{overflow:[50,100,150,200]}},h={render:({pixelRatio:e})=>{let t=document.createElement(`img`);return t.src=r,n({pixelRatio:e}).add(t,{shader:u}),t},args:{pixelRatio:.1}},g=({zIndex:e,fgZIndex:t})=>{let i=document.createElement(`img`);i.src=r;let a=document.createElement(`div`);a.className=`wrapper`,a.appendChild(i);let o=document.createElement(`div`);return o.className=`fg`,o.innerText=`Hello`,o.style.zIndex=t.toString(),a.appendChild(o),n({zIndex:e}).add(i,{shader:u}),a},_={render:g,args:{zIndex:0,fgZIndex:1}},v={render:g,args:{zIndex:-1,fgZIndex:0}},y=({zIndex:e})=>{let t=[[1,0,0],[0,1,0],[0,0,1]],i=document.createElement(`div`);i.className=`elementZIndexWrapper`;let a=n();for(let n=0;n<3;n++){let o=document.createElement(`img`);o.src=r,i.appendChild(o),a.add(o,{shader:`
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
    `,zIndex:e[n],uniforms:{bg:t[n]}})}return i},b={render:y,args:{zIndex:[0,0,0]}},x={render:y,args:{zIndex:[1,3,2]}},S={render:y,args:{zIndex:[3,2,1]}},C={render:()=>{let e=document.createElement(`img`);return e.src=r,n().add(e,{shader:`
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
        `,overlay:!0}),e},args:null},w=e=>({render:({wrap:e})=>{let t=document.createElement(`img`);return t.src=r,n().add(t,{shader:u,wrap:e,overflow:200}),t},args:{wrap:e},argTypes:{wrap:{control:{type:`select`},options:[`repeat`,`clamp`,`mirror`]}}}),T=w(`repeat`),E=w(`clamp`),D=w(`mirror`),O={render:({shader:e,autoCrop:t})=>{let r=new l(0,[0,10]);document.body.append(r.element);let i=document.createElement(`img`);return i.src=o,n().add(i,{shader:e,autoCrop:t,overflow:200,uniforms:{time:()=>r.time}}),i},args:{shader:`rainbow`,autoCrop:!0}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
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