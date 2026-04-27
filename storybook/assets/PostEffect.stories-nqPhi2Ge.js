import{n as e}from"./chunk-BneVvdWh.js";import{n as t,r as n}from"./utils-DoNm3-kt.js";import{n as r,r as i,t as a}from"./preset-hB8Fk8QM.js";import{n as o,t as s}from"./Timer-D-Ck6ryf.js";var c,l,u,d,f;e((()=>{o(),r(),n(),a(),c={title:`Post Effects`,render:e=>{let n=new s(e.defaultTime??0,[0,10]);document.body.append(n.element);let r=document.createElement(`img`);return r.src=e.src??`data:image/svg+xml,%3csvg%20width='640'%20height='265'%20viewBox='0%200%20640%20265'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M479.823%20190.844V159.355H543.798L438.836%2054.3939H597.643V85.8823H515.039L620%20190.844H479.823Z'%20fill='white'/%3e%3cpath%20fill-rule='evenodd'%20clip-rule='evenodd'%20d='M395.933%20159.355H430.208V20H461.696V190.844H364.445L395.933%20159.355Z'%20fill='white'/%3e%3cpath%20d='M412.659%20106.874V137.82H381.714L366.357%20122.615L381.714%20106.874H412.659Z'%20fill='white'/%3e%3cpath%20fill-rule='evenodd'%20clip-rule='evenodd'%20d='M226.839%2054.3939L295.064%20122.619L172.382%20245.301H217.096L317.421%20144.976L350.732%20178.287L373.089%20155.93L339.778%20122.619L408.003%2054.3939H363.289L317.421%20100.262L271.553%2054.3939H226.839ZM386.223%20169.065L364.444%20190.844H408.003L386.223%20169.065Z'%20fill='white'/%3e%3cpath%20d='M204.928%2085.8824V185.112L173.439%20216.639V54.3939H259.299V85.8824H204.928ZM221.621%20137.82V106.875H252.566L267.923%20122.615L252.566%20137.82H221.621Z'%20fill='white'/%3e%3cpath%20d='M124.961%20147.494V54.3935H156.45V223.696L20%2087.2464V42.5328L124.961%20147.494Z'%20fill='white'/%3e%3c/svg%3e`,t({postEffect:e.postEffect}).add(r,{shader:e.preset,overflow:e.overflow,uniforms:{...e.uniforms??{},time:()=>n.time}}),r},parameters:{layout:`fullscreen`}},l=`
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
`,u={render:()=>{let e=document.createElement(`img`);return e.src=i,e},play:async({canvasElement:e})=>{let n=e.querySelector(`img`);n.complete||await new Promise(e=>{n.onload=e});let r=1,i=t({autoplay:!1,postEffect:{shader:l,persistent:!0,uniforms:{time:()=>r}}});await i.add(n,{shader:`uvGradient`,uniforms:{time:()=>r}});for(let e=0;e<60;e++)r=1+e*.016,i.render()},parameters:{layout:`fullscreen`}},d={render:()=>{let e=new s(0,[0,10]);document.body.append(e.element);let n={time:()=>e.time},r=document.createElement(`div`),a=document.createElement(`img`);a.src=i,a.width=300;let o=a.cloneNode(),c=a.cloneNode();r.appendChild(a),r.appendChild(o),r.appendChild(c);let l=t({postEffect:{shader:`invert`}});return l.add(a,{shader:`rgbShift`,uniforms:n}),l.add(o,{shader:`sinewave`,uniforms:n}),l.add(c,{shader:`uvGradient`,uniforms:n}),r}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
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
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
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
}`,...d.parameters?.docs?.source}}},f=[`FeedbackEffect`,`MultipleElements`]}))();export{u as FeedbackEffect,d as MultipleElements,f as __namedExportsOrder,c as default};