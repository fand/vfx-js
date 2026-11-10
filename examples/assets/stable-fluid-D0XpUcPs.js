import"./modulepreload-polyfill-P2Xu9kJm.js";import{t as e}from"./esm-DyjkF06p.js";var t=`modulepreload`,n=function(e,t){return new URL(e,t).href},r={},i=function(e){return e.pathname.endsWith(`.css`)},a=function(e,t,n){if(t in e)return e[t];let r=n();if(!r){e[t]=void 0;return}let i=r.then(()=>{e[t]=void 0},n=>{throw e[t]=void 0,n});return e[t]=i,i},o=function(e,o,s){let c=Promise.resolve();if(o&&o.length>0){let e,l=document.querySelector(`meta[property=csp-nonce]`),u=l?.nonce||l?.getAttribute(`nonce`);function d(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function f(e){return import.meta.resolve?new URL(import.meta.resolve(e)):new URL(e,import.meta.url)}c=d(o.map(o=>{o=n(o,s);let c=f(o),l=i(c);return a(r,c.href,()=>{if(e===void 0){e={all:new Set,styles:new Set};let t=document.getElementsByTagName(`link`);for(let n=t.length-1;n>=0;n--){let r=t[n];e.all.add(r.href),r.rel===`stylesheet`&&e.styles.add(r.href)}}if((l?e.styles:e.all).has(c.href))return;let n=document.createElement(`link`);if(n.rel=l?`stylesheet`:t,l||(n.as=`script`),n.crossOrigin=``,n.href=c.href,u&&n.setAttribute(`nonce`,u),document.head.appendChild(n),l)return new Promise((e,t)=>{n.addEventListener(`load`,e),n.addEventListener(`error`,()=>t(Error(`Unable to preload CSS for ${c}`)))})})}).filter(e=>e!==void 0))}function l(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return c.then(t=>{for(let e of t||[])e.status===`rejected`&&l(e.reason);return e().catch(l)})},s=`
  precision highp float;
  uniform sampler2D src;
  uniform vec2 resolution;
  uniform vec2 offset;
  out vec4 outColor;
  void main() {
      vec2 uv = (gl_FragCoord.xy - offset) / resolution;
      outColor = texture(src, uv);
  }`,c=`
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
  }`,l=`
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
      vec2 mouseUv = mouse / resolution;
      vec2 diff = uv - mouseUv;
      diff.x *= aspect;
      float mSplat = exp(-dot(diff, diff) / splatRadius);
      vel += (mouseDelta / resolution) * mSplat * splatForce;
      outColor = vec4(vel, 0.0, 1.0);
  }`,u=`
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
      if (uv.x - t.x < 0.0) L = -C.x;
      if (uv.x + t.x > 1.0) R = -C.x;
      if (uv.y + t.y > 1.0) T = -C.y;
      if (uv.y - t.y < 0.0) B = -C.y;
      outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
  }`,d=`
  precision highp float;
  out vec4 outColor;
  void main() { outColor = vec4(0.0); }`,f=`
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
  }`;function p(e){return`
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
  }`}var m=`
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
  }`,h=`
  precision highp float;
  uniform sampler2D velocity;
  uniform sampler2D canvas;
  uniform vec2 resolution;
  uniform vec2 offset;
  uniform vec2 simSize;
  out vec4 outColor;

  vec3 spectrum(float x) {
    return cos((x - vec3(0, .5, 1)) * vec3(.6, 1., .5) * 3.14);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 vel = texture(velocity, uv).xy;

    vec2 disp = vel / simSize;
    float v = length(disp);

    // dispersion
    const int N = 8;
    vec4 c = vec4(0.0);
    vec3 wsum = vec3(0.0);
    for (int i = 0; i < N; i++) {
      float t = float(i) / float(N - 1);
      vec3 w = max(vec3(0.0),
      cos((t - vec3(0.0, 0.5, 1.0)) * 3.14159 * 0.5));
      vec4 s = texture(canvas, uv - disp * 0.3 * (t + 0.3) * v);
      c.rgb += s.rgb * w;
      c.a   += s.a * (w.r + w.g + w.b) / 3.0;
      wsum  += w;
    }
    c.rgb /= wsum;
    c.a /= (wsum.r + wsum.g + wsum.b) / 3.0;
    outColor = c;

    vec4 c2 = vec4(spectrum(sin(v * 2.) * 0.4 + 0.6), 1);
    outColor += c2 * (smoothstep(.2, .8, v) * 0.5);

    float edge = smoothstep(.003, .0, abs(v - 0.25));
    outColor = abs(outColor - edge * 0.5);
  }`;function g(e){let{simSize:t,mouseDelta:n}=e,r=[];r.push({frag:d,target:`p_a`,float:!0,size:t});let i=`p_a`;for(let n=0;n<e.pressureIterations;n++)i=n%2==0?`p_b`:`p_a`,r.push({frag:f,target:i,float:!0,size:t});return[{frag:s,target:`canvas`},{frag:c,target:`curl`,float:!0,size:t},{frag:l,target:`vort_vel`,float:!0,size:t,uniforms:{mouseDelta:n,curlStrength:e.curlStrength,splatForce:e.splatForce,splatRadius:e.splatRadius}},{frag:u,target:`divergence`,float:!0,size:t},...r,{frag:p(i),target:`proj_vel`,float:!0,size:t},{frag:m,target:`velocity`,persistent:!0,float:!0,size:t,uniforms:{velocityDissipation:e.velocityDissipation}},{frag:h,uniforms:{time:e.time,simSize:t}}]}navigator.maxTouchPoints>0&&o(async()=>{let{default:e}=await import(`https://esm.sh/lenis@1.3.21`);return{default:e}},[],import.meta.url).then(({default:e})=>{new e({autoRaf:!0,syncTouch:!0})});var _=document.getElementById(`app`),v=[-1,-1],y=[0,0];function b(e,t){v[0]>=0&&(y=[e-v[0],t-v[1]]),v=[e,t]}window.addEventListener(`pointermove`,e=>{b(e.clientX,window.innerHeight-e.clientY)});async function x(){let t=document.documentElement.clientWidth/document.documentElement.clientHeight,n=g({simSize:t>1?[Math.round(256*t),256]:[256,Math.round(256/t)],mouseDelta:()=>(y=[y[0]*.9,y[1]*.9],y),pressureIterations:12,curlStrength:20,velocityDissipation:1,splatForce:3e3,splatRadius:.002}),r=new e({postEffect:n});await r.add(_,{shader:`none`}),r.play()}document.readyState===`complete`?x():window.addEventListener(`load`,x);