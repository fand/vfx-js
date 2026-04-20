import{T as g}from"./Timer-D64dUIku.js";import{L as c}from"./preset-B_9u5Dmn.js";import{i as h}from"./utils-CoLwPjcP.js";import"./vfx-toqadiTe.js";const k={title:"Post Effects",render:e=>{const r=new g(e.defaultTime??0,[0,10]);document.body.append(r.element);const n=document.createElement("img");return n.src=e.src??c,h({postEffect:e.postEffect}).add(n,{shader:e.preset,overflow:e.overflow,uniforms:{...e.uniforms??{},time:()=>r.time}}),n},parameters:{layout:"fullscreen"}},x=e=>({args:e}),o=x({src:c,preset:"uvGradient",defaultTime:1,postEffect:{shader:`
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
        `,persistent:!0}}),i={render:()=>{const e=new g(0,[0,10]);document.body.append(e.element);const r={time:()=>e.time},n=document.createElement("div"),t=document.createElement("img");t.src=c,t.width=300;const m=t.cloneNode(),a=t.cloneNode();n.appendChild(t),n.appendChild(m),n.appendChild(a);const s=h({postEffect:{shader:"invert"}});return s.add(t,{shader:"rgbShift",uniforms:r}),s.add(m,{shader:"sinewave",uniforms:r}),s.add(a,{shader:"uvGradient",uniforms:r}),n}};var f,d,u;o.parameters={...o.parameters,docs:{...(f=o.parameters)==null?void 0:f.docs,source:{originalSource:`story({
  src: Logo,
  preset: "uvGradient",
  defaultTime: 1.0,
  postEffect: {
    shader: \`
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
        \`,
    persistent: true
  }
})`,...(u=(d=o.parameters)==null?void 0:d.docs)==null?void 0:u.source}}};var l,v,p;i.parameters={...i.parameters,docs:{...(l=i.parameters)==null?void 0:l.docs,source:{originalSource:`{
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
}`,...(p=(v=i.parameters)==null?void 0:v.docs)==null?void 0:p.source}}};const w=["FeedbackEffect","MultipleElements"];export{o as FeedbackEffect,i as MultipleElements,w as __namedExportsOrder,k as default};
