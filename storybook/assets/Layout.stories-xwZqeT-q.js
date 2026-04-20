import{i as a}from"./utils-CoLwPjcP.js";import{T as fe}from"./Timer-D64dUIku.js";import{L as s}from"./preset-B_9u5Dmn.js";import{J as ve}from"./jellyfish-qrbjulKw.js";import"./vfx-toqadiTe.js";const m=`
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
`,Ee={title:"Layout",parameters:{layout:"fullscreen"}},i={render:({padding:n})=>{const e=document.createElement("img");e.src=s;const r=document.createElement("div");return r.style.padding=`${n}px`,r.appendChild(e),a().add(e,{shader:m,overflow:!0}),r},args:{padding:100}},p={render:({overflow:n})=>{const e=document.createElement("img");e.src=s;const r=document.createElement("div");return r.style.padding=`${n*2}px`,r.appendChild(e),a().add(e,{shader:m,overflow:n}),r},args:{overflow:100}},u={render:({overflow:n})=>{const e=document.createElement("img");e.src=s;const[r,o,t,c]=n,d=document.createElement("div");return d.style.padding=`${r}px ${o}px ${t}px ${c}px`,d.appendChild(e),a().add(e,{shader:m,overflow:n}),d},args:{overflow:[50,100,150,200]}},l={render:({pixelRatio:n})=>{const e=document.createElement("img");return e.src=s,a({pixelRatio:n}).add(e,{shader:m}),e},args:{pixelRatio:.1}},ge=({zIndex:n,fgZIndex:e})=>{const r=document.createElement("img");r.src=s;const o=document.createElement("div");o.className="wrapper",o.appendChild(r);const t=document.createElement("div");return t.className="fg",t.innerText="Hello",t.style.zIndex=e.toString(),o.appendChild(t),a({zIndex:n}).add(r,{shader:m}),o},g={render:ge,args:{zIndex:0,fgZIndex:1}},f={render:ge,args:{zIndex:-1,fgZIndex:0}},z=({zIndex:n})=>{const e=`
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
    `,r=[[1,0,0],[0,1,0],[0,0,1]],o=document.createElement("div");o.className="elementZIndexWrapper";const t=a();for(let c=0;c<3;c++){const d=document.createElement("img");d.src=s,o.appendChild(d),t.add(d,{shader:e,zIndex:n[c],uniforms:{bg:r[c]}})}return o},v={render:z,args:{zIndex:[0,0,0]}},x={render:z,args:{zIndex:[1,3,2]}},w={render:z,args:{zIndex:[3,2,1]}},h={render:()=>{const n=`
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
        `,e=document.createElement("img");return e.src=s,a().add(e,{shader:n,overlay:!0}),e},args:null},S=n=>({render:({wrap:e})=>{const r=document.createElement("img");return r.src=s,a().add(r,{shader:m,wrap:e,overflow:200}),r},args:{wrap:n},argTypes:{wrap:{control:{type:"select"},options:["repeat","clamp","mirror"]}}}),I=S("repeat"),C=S("clamp"),y=S("mirror"),E={render:({shader:n,autoCrop:e})=>{const r=new fe(0,[0,10]);document.body.append(r.element);const o=document.createElement("img");return o.src=ve,a().add(o,{shader:n,autoCrop:e,overflow:200,uniforms:{time:()=>r.time}}),o},args:{shader:"rainbow",autoCrop:!0}};var Z,$,b;i.parameters={...i.parameters,docs:{...(Z=i.parameters)==null?void 0:Z.docs,source:{originalSource:`{
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
}`,...(b=($=i.parameters)==null?void 0:$.docs)==null?void 0:b.source}}};var B,F,D;p.parameters={...p.parameters,docs:{...(B=p.parameters)==null?void 0:B.docs,source:{originalSource:`{
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
}`,...(D=(F=p.parameters)==null?void 0:F.docs)==null?void 0:D.source}}};var R,L,V;u.parameters={...u.parameters,docs:{...(R=u.parameters)==null?void 0:R.docs,source:{originalSource:`{
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
}`,...(V=(L=u.parameters)==null?void 0:L.docs)==null?void 0:V.source}}};var X,_,N;l.parameters={...l.parameters,docs:{...(X=l.parameters)==null?void 0:X.docs,source:{originalSource:`{
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
}`,...(N=(_=l.parameters)==null?void 0:_.docs)==null?void 0:N.source}}};var T,J,A;g.parameters={...g.parameters,docs:{...(T=g.parameters)==null?void 0:T.docs,source:{originalSource:`{
  render: zIndexBase,
  args: {
    zIndex: 0,
    fgZIndex: 1
  }
}`,...(A=(J=g.parameters)==null?void 0:J.docs)==null?void 0:A.source}}};var M,H,O;f.parameters={...f.parameters,docs:{...(M=f.parameters)==null?void 0:M.docs,source:{originalSource:`{
  render: zIndexBase,
  args: {
    zIndex: -1,
    fgZIndex: 0
  }
}`,...(O=(H=f.parameters)==null?void 0:H.docs)==null?void 0:O.source}}};var U,W,j;v.parameters={...v.parameters,docs:{...(U=v.parameters)==null?void 0:U.docs,source:{originalSource:`{
  render: elementZIndexBase,
  args: {
    zIndex: [0, 0, 0] as const
  }
}`,...(j=(W=v.parameters)==null?void 0:W.docs)==null?void 0:j.source}}};var k,q,G;x.parameters={...x.parameters,docs:{...(k=x.parameters)==null?void 0:k.docs,source:{originalSource:`{
  render: elementZIndexBase,
  args: {
    zIndex: [1, 3, 2] as const
  }
}`,...(G=(q=x.parameters)==null?void 0:q.docs)==null?void 0:G.source}}};var K,P,Q;w.parameters={...w.parameters,docs:{...(K=w.parameters)==null?void 0:K.docs,source:{originalSource:`{
  render: elementZIndexBase,
  args: {
    zIndex: [3, 2, 1] as const
  }
}`,...(Q=(P=w.parameters)==null?void 0:P.docs)==null?void 0:Q.source}}};var Y,ee,re;h.parameters={...h.parameters,docs:{...(Y=h.parameters)==null?void 0:Y.docs,source:{originalSource:`{
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
}`,...(re=(ee=h.parameters)==null?void 0:ee.docs)==null?void 0:re.source}}};var ne,oe,te;I.parameters={...I.parameters,docs:{...(ne=I.parameters)==null?void 0:ne.docs,source:{originalSource:'wrapBase("repeat")',...(te=(oe=I.parameters)==null?void 0:oe.docs)==null?void 0:te.source}}};var ae,se,ce;C.parameters={...C.parameters,docs:{...(ae=C.parameters)==null?void 0:ae.docs,source:{originalSource:'wrapBase("clamp")',...(ce=(se=C.parameters)==null?void 0:se.docs)==null?void 0:ce.source}}};var de,me,ie;y.parameters={...y.parameters,docs:{...(de=y.parameters)==null?void 0:de.docs,source:{originalSource:'wrapBase("mirror")',...(ie=(me=y.parameters)==null?void 0:me.docs)==null?void 0:ie.source}}};var pe,ue,le;E.parameters={...E.parameters,docs:{...(pe=E.parameters)==null?void 0:pe.docs,source:{originalSource:`{
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
}`,...(le=(ue=E.parameters)==null?void 0:ue.docs)==null?void 0:le.source}}};const ze=["fullscreen","overflowSingle","overflowArray","pixelRatio","zIndex","zIndexNegative","elementZIndexDefault","elementZIndexDefault132","elementZIndexDefault321","overlay","wrapRepeat","wrapClamp","wrapMirror","autoCrop"];export{ze as __namedExportsOrder,E as autoCrop,Ee as default,v as elementZIndexDefault,x as elementZIndexDefault132,w as elementZIndexDefault321,i as fullscreen,u as overflowArray,p as overflowSingle,h as overlay,l as pixelRatio,C as wrapClamp,y as wrapMirror,I as wrapRepeat,g as zIndex,f as zIndexNegative};
