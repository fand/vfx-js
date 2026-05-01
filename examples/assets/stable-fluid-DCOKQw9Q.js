import"./modulepreload-polyfill-N-DOuI4P.js";import{t as e}from"./esm-CeNsHEOB.js";var t=`modulepreload`,n=function(e,t){return new URL(e,t).href},r={},i=function(e,i,a){let o=Promise.resolve();if(i&&i.length>0){let e=document.getElementsByTagName(`link`),s=document.querySelector(`meta[property=csp-nonce]`),c=s?.nonce||s?.getAttribute(`nonce`);function l(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}o=l(i.map(i=>{if(i=n(i,a),i in r)return;r[i]=!0;let o=i.endsWith(`.css`),s=o?`[rel="stylesheet"]`:``;if(a)for(let t=e.length-1;t>=0;t--){let n=e[t];if(n.href===i&&(!o||n.rel===`stylesheet`))return}else if(document.querySelector(`link[href="${i}"]${s}`))return;let l=document.createElement(`link`);if(l.rel=o?`stylesheet`:t,o||(l.as=`script`),l.crossOrigin=``,l.href=i,c&&l.setAttribute(`nonce`,c),document.head.appendChild(l),o)return new Promise((e,t)=>{l.addEventListener(`load`,e),l.addEventListener(`error`,()=>t(Error(`Unable to preload CSS for ${i}`)))})}))}function s(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return o.then(t=>{for(let e of t||[])e.status===`rejected`&&s(e.reason);return e().catch(s)})},a=`
  precision highp float;
  uniform sampler2D src;
  uniform vec2 resolution;
  uniform vec2 offset;
  out vec4 outColor;
  void main() {
      vec2 uv = (gl_FragCoord.xy - offset) / resolution;
      outColor = texture(src, uv);
  }`,o=`
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
  }`,s=`
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
  }`,c=`
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
  }`,l=`
  precision highp float;
  out vec4 outColor;
  void main() { outColor = vec4(0.0); }`,u=`
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
  }`;function d(e){return`
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
  }`}var f=`
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
  }`,p=`
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
  }`;function m(e){let{simSize:t,mouseDelta:n}=e,r=[];r.push({frag:l,target:`p_a`,float:!0,size:t});let i=`p_a`;for(let n=0;n<e.pressureIterations;n++)i=n%2==0?`p_b`:`p_a`,r.push({frag:u,target:i,float:!0,size:t});return[{frag:a,target:`canvas`},{frag:o,target:`curl`,float:!0,size:t},{frag:s,target:`vort_vel`,float:!0,size:t,uniforms:{mouseDelta:n,curlStrength:e.curlStrength,splatForce:e.splatForce,splatRadius:e.splatRadius}},{frag:c,target:`divergence`,float:!0,size:t},...r,{frag:d(i),target:`proj_vel`,float:!0,size:t},{frag:f,target:`velocity`,persistent:!0,float:!0,size:t,uniforms:{velocityDissipation:e.velocityDissipation}},{frag:p,uniforms:{time:e.time,simSize:t}}]}navigator.maxTouchPoints>0&&i(async()=>{let{default:e}=await import(`https://esm.sh/lenis@1.3.21`);return{default:e}},[],import.meta.url).then(({default:e})=>{new e({autoRaf:!0,syncTouch:!0})});var h=document.getElementById(`app`),g=[-1,-1],_=[0,0];function v(e,t){g[0]>=0&&(_=[e-g[0],t-g[1]]),g=[e,t]}window.addEventListener(`pointermove`,e=>{v(e.clientX,window.innerHeight-e.clientY)});async function y(){let t=document.documentElement.clientWidth/document.documentElement.clientHeight,n=new e({postEffect:m({simSize:t>1?[Math.round(256*t),256]:[256,Math.round(256/t)],mouseDelta:()=>(_=[_[0]*.9,_[1]*.9],_),pressureIterations:12,curlStrength:20,velocityDissipation:1,splatForce:3e3,splatRadius:.002})});await n.add(h,{shader:`none`}),n.play()}document.readyState===`complete`?y():window.addEventListener(`load`,y);