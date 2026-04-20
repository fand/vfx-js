import{J as R}from"./jellyfish-qrbjulKw.js";import{L as T}from"./preset-B_9u5Dmn.js";import{i as S}from"./utils-CoLwPjcP.js";import"./vfx-toqadiTe.js";const _=`
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    outColor = texture(src, uv);
}
`,E=`
precision highp float;
uniform sampler2D velocity;
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 t = 1.0 / resolution;
    float L = texture(velocity, uv - vec2(t.x, 0.0)).y;
    float R = texture(velocity, uv + vec2(t.x, 0.0)).y;
    float T = texture(velocity, uv + vec2(0.0, t.y)).x;
    float B = texture(velocity, uv - vec2(0.0, t.y)).x;
    outColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}
`,b=`
precision highp float;
uniform sampler2D velocity;
uniform sampler2D curl;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform vec2 mouse;
uniform vec2 mouseDelta;
uniform float curlStrength;
uniform float splatForce;
uniform float splatRadius;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 t = 1.0 / resolution;
    float aspect = resolution.x / resolution.y;

    // Vorticity confinement
    float L = abs(texture(curl, uv - vec2(t.x, 0.0)).x);
    float R = abs(texture(curl, uv + vec2(t.x, 0.0)).x);
    float T = abs(texture(curl, uv + vec2(0.0, t.y)).x);
    float B = abs(texture(curl, uv - vec2(0.0, t.y)).x);
    float C = texture(curl, uv).x;

    vec2 force = vec2(T - B, R - L);
    float len = length(force);
    force = len > 0.0001 ? force / len : vec2(0.0);
    force *= curlStrength * C;
    force.y *= -1.0;

    vec2 vel = texture(velocity, uv).xy;
    vel += force * 0.016;
    vel = clamp(vel, vec2(-1000.0), vec2(1000.0));

    // Mouse velocity splat
    vec2 mouseUv = mouse / resolution;
    vec2 diff = uv - mouseUv;
    diff.x *= aspect;
    float mSplat = exp(-dot(diff, diff) / splatRadius);
    vel += (mouseDelta / resolution) * mSplat * splatForce;

    outColor = vec4(vel, 0.0, 1.0);
}
`,M=`
precision highp float;
uniform sampler2D vort_vel;
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 t = 1.0 / resolution;
    float L = texture(vort_vel, uv - vec2(t.x, 0.0)).x;
    float R = texture(vort_vel, uv + vec2(t.x, 0.0)).x;
    float T = texture(vort_vel, uv + vec2(0.0, t.y)).y;
    float B = texture(vort_vel, uv - vec2(0.0, t.y)).y;
    vec2 C = texture(vort_vel, uv).xy;
    // Boundary: reflect velocity (no-flow-through walls)
    if (uv.x - t.x < 0.0) L = -C.x;
    if (uv.x + t.x > 1.0) R = -C.x;
    if (uv.y + t.y > 1.0) T = -C.y;
    if (uv.y - t.y < 0.0) B = -C.y;
    outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}
`,L=`
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,I=`
precision highp float;
uniform sampler2D src;
uniform sampler2D divergence;
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 t = 1.0 / resolution;
    float L = texture(src, uv - vec2(t.x, 0.0)).x;
    float R = texture(src, uv + vec2(t.x, 0.0)).x;
    float T = texture(src, uv + vec2(0.0, t.y)).x;
    float B = texture(src, uv - vec2(0.0, t.y)).x;
    float div = texture(divergence, uv).x;
    outColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}
`;function z(e){return`
precision highp float;
uniform sampler2D vort_vel;
uniform sampler2D ${e};
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 t = 1.0 / resolution;
    float L = texture(${e}, uv - vec2(t.x, 0.0)).x;
    float R = texture(${e}, uv + vec2(t.x, 0.0)).x;
    float T = texture(${e}, uv + vec2(0.0, t.y)).x;
    float B = texture(${e}, uv - vec2(0.0, t.y)).x;
    vec2 vel = texture(vort_vel, uv).xy;
    vel -= vec2(R - L, T - B);
    outColor = vec4(vel, 0.0, 1.0);
}
`}const P=`
precision highp float;
uniform sampler2D proj_vel;
uniform vec2 resolution;
uniform vec2 offset;
uniform float velocityDissipation;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 t = 1.0 / resolution;
    vec2 vel = texture(proj_vel, uv).xy;
    vec2 coord = uv - vel * t * 0.016;
    vec2 advected = texture(proj_vel, coord).xy;
    advected /= 1.0 + velocityDissipation * 0.016;
    outColor = vec4(advected, 0.0, 1.0);
}
`,A=`
precision highp float;
uniform sampler2D velocity;
uniform sampler2D dye;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform vec2 mouse;
uniform vec2 mouseDelta;
uniform vec2 simSize;
uniform float densityDissipation;
uniform float dyeSplatRadius;
uniform float dyeSplatIntensity;
out vec4 outColor;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    float aspect = resolution.x / resolution.y;

    // Velocity is in sim-texel units; convert to UV displacement
    vec2 vel = texture(velocity, uv).xy;
    vec2 velTexel = 1.0 / simSize;
    vec2 coord = uv - vel * velTexel * 0.016;
    vec3 d = texture(dye, coord).rgb;

    d /= 1.0 + densityDissipation * 0.016;

    // Mouse dye splat (speed-dependent, random color)
    vec2 mouseUv = mouse / resolution;
    vec2 diff = uv - mouseUv;
    diff.x *= aspect;
    float mSplat = exp(-dot(diff, diff) / dyeSplatRadius);
    float mSpeed = length(mouseDelta);
    vec3 mColor = hsv2rgb(vec3(fract(time * 0.06), 0.85, 1.0));
    d += mColor * mSplat * clamp(mSpeed * dyeSplatIntensity, 0.0, 3.0);

    outColor = vec4(max(d, vec3(0.0)), 1.0);
}
`,B=`
precision highp float;
uniform sampler2D dye;
uniform sampler2D velocity;
uniform sampler2D canvas;
uniform vec2 resolution;
uniform vec2 offset;
uniform vec2 simSize;
uniform float showDye;
uniform float time;
out vec4 outColor;

vec3 spectrum(float x) {
  return cos((x - vec3(0, .5, 1)) * vec3(.6, 1., .5) * 3.14);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec3 c = texture(dye, uv).rgb;

    if (showDye > 0.5) {
        float a = max(c.r, max(c.g, c.b));
        outColor = vec4(c, a);
    } else {
        vec2 vel = texture(velocity, uv).xy;
        vec2 disp = vel / simSize;

        vec2 cr = texture(canvas, uv - disp * 0.080).ra;
        vec2 cg = texture(canvas, uv - disp * 0.060).ga;
        vec2 cb = texture(canvas, uv - disp * 0.040).ba;
        outColor = vec4(cr.x, cg.x, cb.x, (cr.y + cg.y + cb.y) / 3.);

        float v = length(disp);
        outColor += vec4(spectrum(sin(v * 3. + time) * 0.4 + 0.5), 1) * smoothstep(.2, .8, v) * 0.2;
    }
}
`;function H(e,t){const o=[];o.push({frag:L,target:"p_a",float:!0,size:e});let r="p_a";for(let i=0;i<t;i++)r=i%2===0?"p_b":"p_a",o.push({frag:I,target:r,float:!0,size:e});return{passes:o,lastTarget:r}}function V(e){const{simSize:t,mouseDelta:o}=e,r=H(t,e.pressureIterations);return[{frag:_,target:"canvas"},{frag:E,target:"curl",float:!0,size:t},{frag:b,target:"vort_vel",float:!0,size:t,uniforms:{mouseDelta:o,curlStrength:e.curlStrength,splatForce:e.splatForce,splatRadius:e.splatRadius}},{frag:M,target:"divergence",float:!0,size:t},...r.passes,{frag:z(r.lastTarget),target:"proj_vel",float:!0,size:t},{frag:P,target:"velocity",persistent:!0,float:!0,size:t,uniforms:{velocityDissipation:e.velocityDissipation}},{frag:A,target:"dye",persistent:!0,float:!0,uniforms:{mouseDelta:o,time:e.time,simSize:t,densityDissipation:e.densityDissipation,dyeSplatRadius:e.dyeSplatRadius,dyeSplatIntensity:e.dyeSplatIntensity}},{frag:B,uniforms:{showDye:e.showDye?1:0,time:e.time,simSize:t}}]}const D={simResolution:{control:{type:"range",min:32,max:512,step:32}},pressureIterations:{control:{type:"range",min:1,max:40,step:1}},curlStrength:{control:{type:"range",min:0,max:100,step:1}},velocityDissipation:{control:{type:"range",min:0,max:5,step:.05}},densityDissipation:{control:{type:"range",min:0,max:5,step:.05}},splatForce:{control:{type:"range",min:100,max:2e4,step:100}},splatRadius:{control:{type:"range",min:1e-4,max:.01,step:1e-4}},dyeSplatRadius:{control:{type:"range",min:1e-4,max:.01,step:1e-4}},dyeSplatIntensity:{control:{type:"range",min:.001,max:.03,step:.001}},showDye:{control:"boolean"}},w={simResolution:128,pressureIterations:1,curlStrength:13,velocityDissipation:.6,densityDissipation:.65,splatForce:6e3,splatRadius:.002,dyeSplatRadius:.001,dyeSplatIntensity:.005,showDye:!1},j={title:"Multipass",parameters:{layout:"fullscreen"}};function C(e){let t=0,o=0,r=0,i=0;const a=()=>{const l=performance.now()-i,u=Math.exp(-l*.01);return[o*u,r*u]},n=e.simResolution,s=window.innerWidth/window.innerHeight,c=s>1?[Math.round(n*s),n]:[n,Math.round(n/s)];return{passes:V({simSize:c,mouseDelta:a,time:()=>t,pressureIterations:e.pressureIterations,curlStrength:e.curlStrength,velocityDissipation:e.velocityDissipation,densityDissipation:e.densityDissipation,splatForce:e.splatForce,splatRadius:e.splatRadius,dyeSplatRadius:e.dyeSplatRadius,dyeSplatIntensity:e.dyeSplatIntensity,showDye:e.showDye}),getTime:()=>t,setTime:l=>{t=l},setDelta:(l,u)=>{o=l,r=u,i=performance.now()}}}function F(e,t,o){const r=Math.round(window.innerWidth/2),i=Math.round(window.innerHeight/2),a=100;for(let n=0;n<a;n++){const s=n/a*Math.PI*2;o.setDelta(Math.cos(s)*15,Math.sin(s)*15),window.dispatchEvent(new MouseEvent("pointermove",{clientX:r+Math.cos(s)*100,clientY:i-Math.sin(s)*100})),o.setTime(n*.016),t.render()}e.addEventListener("click",()=>{let n=-1,s=-1;window.addEventListener("pointermove",c=>{const m=c.clientX,l=window.innerHeight-c.clientY;n>=0&&o.setDelta(m-n,l-s),n=m,s=l}),t.play()},{once:!0})}const v={args:{...w},argTypes:D,render:()=>{const e=document.createElement("img");return e.src=T,e},play:async({canvasElement:e,args:t})=>{const o=e.querySelector("img");await new Promise(a=>{o.onload=a});const r=C(t),i=S({autoplay:!1,postEffect:r.passes});await i.add(o,{shader:"uvGradient"}),F(e,i,r)},parameters:{layout:"fullscreen"}},f={args:{...w},argTypes:D,render:()=>{const e=document.createElement("img");return e.src=R,e},play:async({canvasElement:e,args:t})=>{const o=e.querySelector("img");await new Promise(a=>{o.onload=a});const r=C(t),i=S({autoplay:!1});await i.add(o,{shader:r.passes}),F(e,i,r)},parameters:{layout:"fullscreen"}};var d,p,y;v.parameters={...v.parameters,docs:{...(d=v.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    ...defaultFluidArgs
  },
  argTypes: fluidArgTypes,
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  play: async ({
    canvasElement,
    args
  }: {
    canvasElement: HTMLElement;
    args: FluidArgs;
  }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise(o => {
      img.onload = o;
    });
    const fluid = buildFluidOpts(args);
    const vfx = initVFX({
      autoplay: false,
      postEffect: fluid.passes
    });
    await vfx.add(img, {
      shader: "uvGradient"
    });
    playFluidDemo(canvasElement, vfx, fluid);
  },
  parameters: {
    layout: "fullscreen"
  }
}`,...(y=(p=v.parameters)==null?void 0:p.docs)==null?void 0:y.source}}};var x,g,h;f.parameters={...f.parameters,docs:{...(x=f.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    ...defaultFluidArgs
  },
  argTypes: fluidArgTypes,
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  play: async ({
    canvasElement,
    args
  }: {
    canvasElement: HTMLElement;
    args: FluidArgs;
  }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise(o => {
      img.onload = o;
    });
    const fluid = buildFluidOpts(args);
    const vfx = initVFX({
      autoplay: false
    });
    await vfx.add(img, {
      shader: fluid.passes
    });
    playFluidDemo(canvasElement, vfx, fluid);
  },
  parameters: {
    layout: "fullscreen"
  }
}`,...(h=(g=f.parameters)==null?void 0:g.docs)==null?void 0:h.source}}};const q=["StableFluidPostEffect","StableFluidElement"];export{f as StableFluidElement,v as StableFluidPostEffect,q as __namedExportsOrder,j as default};
