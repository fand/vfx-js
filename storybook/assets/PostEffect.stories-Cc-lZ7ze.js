import{T as h}from"./Timer-D64dUIku.js";import{L as m}from"./preset-B_9u5Dmn.js";import{i as c}from"./utils-CoLwPjcP.js";import"./vfx-toqadiTe.js";const k={title:"Post Effects",render:e=>{const n=new h(e.defaultTime??0,[0,10]);document.body.append(n.element);const t=document.createElement("img");return t.src=e.src??m,c({postEffect:e.postEffect}).add(t,{shader:e.preset,overflow:e.overflow,uniforms:{...e.uniforms??{},time:()=>n.time}}),t},parameters:{layout:"fullscreen"}},E=`
    precision highp float;
    uniform sampler2D src;
    uniform sampler2D backbuffer;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    out vec4 outColor;

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 current = texture(src, uv);

        vec2 feedbackOffset = vec2(
            sin(uv.y * 31. + time * 1.0) + sin(uv.y * 17. + time * 0.7),
            cos(uv.x * 23. + time * 1.5) + cos(uv.x * 19. + time * 0.9)
        ) * 0.001;
        vec4 previous = texture(backbuffer, uv + feedbackOffset);

        outColor = mix(current, previous * 0.99, 1. - current.a);
    }
`,o={render:()=>{const e=document.createElement("img");return e.src=m,e},play:async({canvasElement:e})=>{const n=e.querySelector("img");n.complete||await new Promise(i=>{n.onload=i});let t=1;const r=c({autoplay:!1,postEffect:{shader:E,persistent:!0,uniforms:{time:()=>t}}});await r.add(n,{shader:"uvGradient",uniforms:{time:()=>t}});for(let i=0;i<60;i++)t=1+i*.016,r.render()},parameters:{layout:"fullscreen"}},s={render:()=>{const e=new h(0,[0,10]);document.body.append(e.element);const n={time:()=>e.time},t=document.createElement("div"),r=document.createElement("img");r.src=m,r.width=300;const i=r.cloneNode(),d=r.cloneNode();t.appendChild(r),t.appendChild(i),t.appendChild(d);const a=c({postEffect:{shader:"invert"}});return a.add(r,{shader:"rgbShift",uniforms:n}),a.add(i,{shader:"sinewave",uniforms:n}),a.add(d,{shader:"uvGradient",uniforms:n}),t}};var f,u,l;o.parameters={...o.parameters,docs:{...(f=o.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  play: async ({
    canvasElement
  }: {
    canvasElement: HTMLElement;
  }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    if (!img.complete) {
      await new Promise(r => {
        img.onload = r;
      });
    }
    let time = 1.0;
    const vfx = initVFX({
      autoplay: false,
      // Override the default wall-clock time so the feedback shader's
      // sin/cos offset is deterministic across runs.
      postEffect: {
        shader: feedbackShader,
        persistent: true,
        uniforms: {
          time: () => time
        }
      }
    });
    await vfx.add(img, {
      shader: "uvGradient",
      uniforms: {
        time: () => time
      }
    });
    for (let i = 0; i < 60; i++) {
      time = 1.0 + i * 0.016;
      vfx.render();
    }
  },
  parameters: {
    layout: "fullscreen"
  }
}`,...(l=(u=o.parameters)==null?void 0:u.docs)==null?void 0:l.source}}};var p,g,v;s.parameters={...s.parameters,docs:{...(p=s.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => {
    const timer = new Timer(0, [0, 10]);
    document.body.append(timer.element);
    const uniforms = {
      time: () => timer.time
    };
    const container = document.createElement("div");

    // Create three images with different effects
    const img1 = document.createElement("img");
    img1.src = Logo;
    img1.width = 300;
    const img2 = img1.cloneNode() as HTMLImageElement;
    const img3 = img1.cloneNode() as HTMLImageElement;
    container.appendChild(img1);
    container.appendChild(img2);
    container.appendChild(img3);
    const vfx = initVFX({
      postEffect: {
        shader: "invert"
      }
    });

    // Add different shader effects to each element
    vfx.add(img1, {
      shader: "rgbShift",
      uniforms
    });
    vfx.add(img2, {
      shader: "sinewave",
      uniforms
    });
    vfx.add(img3, {
      shader: "uvGradient",
      uniforms
    });
    return container;
  }
}`,...(v=(g=s.parameters)==null?void 0:g.docs)==null?void 0:v.source}}};const C=["FeedbackEffect","MultipleElements"];export{o as FeedbackEffect,s as MultipleElements,C as __namedExportsOrder,k as default};
