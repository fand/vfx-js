import"./modulepreload-polyfill-B5Qt9EMX.js";import{V as h}from"./vfx-DEZ05k4Y.js";const C="modulepreload",S=function(e,t){return new URL(e,t).href},y={},_=function(t,r,c){let i=Promise.resolve();if(r&&r.length>0){let v=function(o){return Promise.all(o.map(n=>Promise.resolve(n).then(f=>({status:"fulfilled",value:f}),f=>({status:"rejected",reason:f}))))};const l=document.getElementsByTagName("link"),a=document.querySelector("meta[property=csp-nonce]"),g=(a==null?void 0:a.nonce)||(a==null?void 0:a.getAttribute("nonce"));i=v(r.map(o=>{if(o=S(o,c),o in y)return;y[o]=!0;const n=o.endsWith(".css"),f=n?'[rel="stylesheet"]':"";if(!!c)for(let m=l.length-1;m>=0;m--){const x=l[m];if(x.href===o&&(!n||x.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${o}"]${f}`))return;const u=document.createElement("link");if(u.rel=n?"stylesheet":C,n||(u.as="script"),u.crossOrigin="",u.href=o,g&&u.setAttribute("nonce",g),document.head.appendChild(u),n)return new Promise((m,x)=>{u.addEventListener("load",m),u.addEventListener("error",()=>x(new Error(`Unable to preload CSS for ${o}`)))})}))}function s(v){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=v,window.dispatchEvent(l),!l.defaultPrevented)throw v}return i.then(v=>{for(const l of v||[])l.status==="rejected"&&s(l.reason);return t().catch(s)})},w=/iPad|iPhone/.test(navigator.userAgent)||navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1;w&&_(async()=>{const{default:e}=await import("https://esm.sh/lenis@1.1.20");return{default:e}},[],import.meta.url).then(({default:e})=>{new e({autoRaf:!0,syncTouch:!0})});const R=`
  precision highp float;
  uniform sampler2D src;
  uniform vec2 resolution;
  uniform vec2 offset;
  out vec4 outColor;
  void main() {
      vec2 uv = (gl_FragCoord.xy - offset) / resolution;
      outColor = texture(src, uv);
  }`,D=`
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
  }`,L=`
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
  }`,E=`
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
  }`,T=`
  precision highp float;
  out vec4 outColor;
  void main() { outColor = vec4(0.0); }`,b=`
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
  }`;function F(e){return`
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
  }`}const P=`
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
  }`,I=`
  precision highp float;
  uniform sampler2D velocity;
  uniform sampler2D canvas;
  uniform vec2 resolution;
  uniform vec2 offset;
  uniform vec2 simSize;
  uniform float time;
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
    outColor += c2 * smoothstep(.2, .8, v) * 0.5;
  }`;function z(e){const{simSize:t,mouseDelta:r}=e,c=[];c.push({frag:T,target:"p_a",float:!0,size:t});let i="p_a";for(let s=0;s<e.pressureIterations;s++)i=s%2===0?"p_b":"p_a",c.push({frag:b,target:i,float:!0,size:t});return[{frag:R,target:"canvas"},{frag:D,target:"curl",float:!0,size:t},{frag:L,target:"vort_vel",float:!0,size:t,uniforms:{mouseDelta:r,curlStrength:e.curlStrength,splatForce:e.splatForce,splatRadius:e.splatRadius}},{frag:E,target:"divergence",float:!0,size:t},...c,{frag:F(i),target:"proj_vel",float:!0,size:t},{frag:P,target:"velocity",persistent:!0,float:!0,size:t,uniforms:{velocityDissipation:e.velocityDissipation}},{frag:I,uniforms:{time:e.time,simSize:t}}]}const B=document.getElementById("app");let p=[-1,-1],d=[0,0];window.addEventListener("pointermove",e=>{const t=e.clientX,r=window.innerHeight-e.clientY;p[0]>=0&&(d=[t-p[0],r-p[1]]),p=[t,r]});window.addEventListener("load",async()=>{const t=document.documentElement.clientWidth/document.documentElement.clientHeight,r=t>1?[Math.round(128*t),128]:[128,Math.round(128/t)],c=z({simSize:r,mouseDelta:()=>(d=[d[0]*.9,d[1]*.9],d),pressureIterations:8,curlStrength:20,velocityDissipation:1,splatForce:3e3,splatRadius:.001,time:()=>performance.now()/1e3}),i=new h({postEffect:c});await i.add(B,{shader:"none"}),i.play()});
