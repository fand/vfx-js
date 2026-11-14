import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./logo-640w-20p-22Elz6NL.js";import{d as r,f as i}from"./utils-MMR05sUo.js";import"./preset-DFGAZ5Mi.js";import{n as a,t as o}from"./jellyfish-DtC6VyHr.js";import{n as s,t as c}from"./Timer-R2IgWf3S.js";var l,u,d,f,p,m,h,g,_,v,y,b,x,S,C,w,T,E,D,O;function k(){return(k=e((()=>{o(),n(),s(),i(),l=`
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
`,u={title:`Layout`,parameters:{layout:`fullscreen`}},d={render:({padding:e})=>{let n=document.createElement(`img`);n.src=t;let i=document.createElement(`div`);return i.style.padding=`${e}px`,i.appendChild(n),r().add(n,{shader:l,overflow:!0}),i},args:{padding:100}},f={render:({overflow:e})=>{let n=document.createElement(`img`);n.src=t;let i=document.createElement(`div`);return i.style.padding=`${e*2}px`,i.appendChild(n),r().add(n,{shader:l,overflow:e}),i},args:{overflow:100}},p={render:({overflow:e})=>{let n=document.createElement(`img`);n.src=t;let[i,a,o,s]=e,c=document.createElement(`div`);return c.style.padding=`${i}px ${a}px ${o}px ${s}px`,c.appendChild(n),r().add(n,{shader:l,overflow:e}),c},args:{overflow:[50,100,150,200]}},m={render:({pixelRatio:e})=>{let n=document.createElement(`img`);return n.src=t,r({pixelRatio:e}).add(n,{shader:l}),n},args:{pixelRatio:.1}},h=({zIndex:e,fgZIndex:n})=>{let i=document.createElement(`img`);i.src=t;let a=document.createElement(`div`);a.className=`wrapper`,a.appendChild(i);let o=document.createElement(`div`);return o.className=`fg`,o.textContent=`Hello`,o.style.zIndex=n.toString(),a.appendChild(o),r({zIndex:e}).add(i,{shader:l}),a},g={render:h,args:{zIndex:0,fgZIndex:1}},_={render:h,args:{zIndex:-1,fgZIndex:0}},v=({zIndex:e})=>{let n=[[1,0,0],[0,1,0],[0,0,1]],i=document.createElement(`div`);i.className=`elementZIndexWrapper`;let a=r();for(let r=0;r<3;r++){let o=document.createElement(`img`);o.src=t,i.appendChild(o),a.add(o,{shader:`
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
    `,zIndex:e[r],uniforms:{bg:n[r]}})}return i},y={render:v,args:{zIndex:[0,0,0]}},b={render:v,args:{zIndex:[1,3,2]}},x={render:v,args:{zIndex:[3,2,1]}},S={render:()=>{let e=document.createElement(`img`);return e.src=t,r().add(e,{shader:`
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
        `,overlay:!0}),e},args:null},C=e=>({render:({wrap:e})=>{let n=document.createElement(`img`);return n.src=t,r().add(n,{shader:l,wrap:e,overflow:200}),n},args:{wrap:e},argTypes:{wrap:{control:{type:`select`},options:[`repeat`,`clamp`,`mirror`]}}}),w=C(`repeat`),T=C(`clamp`),E=C(`mirror`),D={render:({shader:e,autoCrop:t})=>{let n=new c(0,[0,10]);document.body.append(n.element);let i=document.createElement(`img`);return i.src=a,r().add(i,{shader:e,autoCrop:t,overflow:200,uniforms:{time:()=>n.time}}),i},args:{shader:`rainbow`,autoCrop:!0}},O=[`fullscreen`,`overflowSingle`,`overflowArray`,`pixelRatio`,`zIndex`,`zIndexNegative`,`elementZIndexDefault`,`elementZIndexDefault132`,`elementZIndexDefault321`,`overlay`,`wrapRepeat`,`wrapClamp`,`wrapMirror`,`autoCrop`],d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
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
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
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
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
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
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
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
}`,...m.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: zIndexBase,
  args: {
    zIndex: 0,
    fgZIndex: 1
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: zIndexBase,
  args: {
    zIndex: -1,
    fgZIndex: 0
  }
}`,..._.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: elementZIndexBase,
  args: {
    zIndex: [0, 0, 0] as const
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: elementZIndexBase,
  args: {
    zIndex: [1, 3, 2] as const
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: elementZIndexBase,
  args: {
    zIndex: [3, 2, 1] as const
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
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
}`,...S.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`wrapBase("repeat")`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`wrapBase("clamp")`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`wrapBase("mirror")`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
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
}`,...D.parameters?.docs?.source}}}})))()}k();export{O as __namedExportsOrder,D as autoCrop,u as default,y as elementZIndexDefault,b as elementZIndexDefault132,x as elementZIndexDefault321,d as fullscreen,p as overflowArray,f as overflowSingle,S as overlay,m as pixelRatio,T as wrapClamp,E as wrapMirror,w as wrapRepeat,g as zIndex,_ as zIndexNegative};