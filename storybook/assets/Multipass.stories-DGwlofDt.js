import{i as e}from"./preload-helper-xPQekRTU.js";import{n as t,t as n}from"./logo-640w-20p-CDp-4Bv5.js";import{d as r,f as i,p as a}from"./utils-DQN2J993.js";import{t as o}from"./preset-_bwWmH2a.js";import{n as s,t as c}from"./jellyfish-CWg8JMTu.js";function l(e){return`
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
`}function u(e,t){let n=[];n.push({frag:g,target:`p_a`,float:!0,size:e});let r=`p_a`;for(let i=0;i<t;i++)r=i%2==0?`p_b`:`p_a`,n.push({frag:_,target:r,float:!0,size:e});return{passes:n,lastTarget:r}}function d(e){let{simSize:t,mouseDelta:n}=e,r=u(t,e.pressureIterations);return[{frag:f,target:`canvas`},{frag:p,target:`curl`,float:!0,size:t},{frag:m,target:`vort_vel`,float:!0,size:t,uniforms:{mouseDelta:n,curlStrength:e.curlStrength,splatForce:e.splatForce,splatRadius:e.splatRadius}},{frag:h,target:`divergence`,float:!0,size:t},...r.passes,{frag:l(r.lastTarget),target:`proj_vel`,float:!0,size:t},{frag:v,target:`velocity`,persistent:!0,float:!0,size:t,uniforms:{velocityDissipation:e.velocityDissipation}},{frag:y,target:`dye`,persistent:!0,float:!0,uniforms:{mouseDelta:n,time:e.time,simSize:t,densityDissipation:e.densityDissipation,dyeSplatRadius:e.dyeSplatRadius,dyeSplatIntensity:e.dyeSplatIntensity}},{frag:b,uniforms:{showDye:+!!e.showDye,time:e.time,simSize:t}}]}var f,p,m,h,g,_,v,y,b,x=e((()=>{f=`
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    outColor = texture(src, uv);
}
`,p=`
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
`,m=`
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
`,h=`
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
`,g=`
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,_=`
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
`,v=`
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
`,y=`
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
`,b=`
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
`}));function S(e){let t=0,n=0,r=0,i=()=>[n,r],a=e.simResolution,o=window.innerWidth/window.innerHeight;return{passes:d({simSize:o>1?[Math.round(a*o),a]:[a,Math.round(a/o)],mouseDelta:i,time:()=>t,pressureIterations:e.pressureIterations,curlStrength:e.curlStrength,velocityDissipation:e.velocityDissipation,densityDissipation:e.densityDissipation,splatForce:e.splatForce,splatRadius:e.splatRadius,dyeSplatRadius:e.dyeSplatRadius,dyeSplatIntensity:e.dyeSplatIntensity,showDye:e.showDye}),getTime:()=>t,setTime:e=>{t=e},setDelta:(e,t)=>{n=e,r=t}}}function C(e,t,n){let r=Math.round(window.innerWidth/2),i=Math.round(window.innerHeight/2),o=a()?10:100;for(let e=0;e<o;e++){let a=e/o*Math.PI*2;n.setDelta(Math.cos(a)*15,Math.sin(a)*15),window.dispatchEvent(new MouseEvent(`pointermove`,{clientX:r+Math.cos(a)*100,clientY:i-Math.sin(a)*100})),n.setTime(e*.016),t.render()}e.addEventListener(`click`,()=>{let e=-1,r=-1,i;window.addEventListener(`pointermove`,t=>{let a=t.clientX,o=window.innerHeight-t.clientY;e>=0&&n.setDelta(a-e,o-r),e=a,r=o,clearTimeout(i),i=window.setTimeout(()=>n.setDelta(0,0),50)}),t.play()},{once:!0})}async function w(e,t){let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let i=r({autoplay:!1});await i.add(n,{shader:P,overflow:t}),i.render()}var T,E,D,O,k,A,j,M,N,P,F,I,L;e((()=>{c(),n(),x(),i(),o(),T={simResolution:{control:{type:`range`,min:32,max:512,step:32}},pressureIterations:{control:{type:`range`,min:1,max:40,step:1}},curlStrength:{control:{type:`range`,min:0,max:100,step:1}},velocityDissipation:{control:{type:`range`,min:0,max:5,step:.05}},densityDissipation:{control:{type:`range`,min:0,max:5,step:.05}},splatForce:{control:{type:`range`,min:100,max:2e4,step:100}},splatRadius:{control:{type:`range`,min:1e-4,max:.01,step:1e-4}},dyeSplatRadius:{control:{type:`range`,min:1e-4,max:.01,step:1e-4}},dyeSplatIntensity:{control:{type:`range`,min:.001,max:.03,step:.001}},showDye:{control:`boolean`}},E={simResolution:128,pressureIterations:1,curlStrength:13,velocityDissipation:.6,densityDissipation:.65,splatForce:6e3,splatRadius:.002,dyeSplatRadius:.001,dyeSplatIntensity:.005,showDye:!1},D={title:`Multipass`,parameters:{layout:`fullscreen`}},O={args:{...E},argTypes:T,render:()=>{let e=document.createElement(`img`);return e.src=t,e},play:async({canvasElement:e,args:t})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let i=S(t),a=r({autoplay:!1,postEffect:i.passes});await a.add(n,{shader:`uvGradient`}),C(e,a,i)},parameters:{layout:`fullscreen`}},k={args:{...E},argTypes:T,render:()=>{let e=document.createElement(`img`);return e.src=s,e},play:async({canvasElement:e,args:t})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let i=S(t),a=r({autoplay:!1});await a.add(n,{shader:i.passes}),C(e,a,i)},parameters:{layout:`fullscreen`}},A=`
vec2 toBuffer(vec2 uv) {
    return (uv * resolution + (offset - viewport.xy)) / viewport.zw;
}
`,j=`
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    // The element texture has nothing outside 0..1
    vec2 inside = step(vec2(0.0), uv) * step(uv, vec2(1.0));
    outColor = texture(src, uv) * inside.x * inside.y;
}
`,M=`
precision highp float;
uniform sampler2D original;
uniform vec2 resolution;
uniform vec2 offset;
uniform vec4 viewport;
out vec4 outColor;
${A}

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 texel = 4.0 / resolution;

    vec4 c = vec4(0.0);
    for (int x = -4; x <= 4; x++) {
        for (int y = -4; y <= 4; y++) {
            c += texture(original, toBuffer(uv + vec2(x, y) * texel));
        }
    }
    outColor = c / 81.0;
}
`,N=`
precision highp float;
uniform sampler2D original;
uniform sampler2D glow;
uniform vec2 resolution;
uniform vec2 offset;
uniform vec4 viewport;
out vec4 outColor;
${A}

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec4 base = texture(original, toBuffer(uv));
    vec4 g = texture(glow, toBuffer(uv));
    outColor = base + g * (1.0 - base.a);
}
`,P=[{frag:j,target:`original`},{frag:M,target:`glow`},{frag:N}],F={render:()=>{let e=document.createElement(`img`);return e.src=t,e},play:({canvasElement:e})=>w(e,40)},I={render:()=>{let e=document.createElement(`img`);return e.src=t,e},play:({canvasElement:e})=>w(e,!0)},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
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
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
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
}`,...k.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  play: ({
    canvasElement
  }: {
    canvasElement: HTMLElement;
  }) => playGlowBleed(canvasElement, 40)
}`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  play: ({
    canvasElement
  }: {
    canvasElement: HTMLElement;
  }) => playGlowBleed(canvasElement, true)
}`,...I.parameters?.docs?.source}}},L=[`StableFluidPostEffect`,`StableFluidElement`,`GlowBleedOverflow`,`GlowBleedFullscreen`]}))();export{I as GlowBleedFullscreen,F as GlowBleedOverflow,k as StableFluidElement,O as StableFluidPostEffect,L as __namedExportsOrder,D as default};