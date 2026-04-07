import"./modulepreload-polyfill-B5Qt9EMX.js";import{V as l}from"./vfx-Ct8kENVT.js";const a=`
  precision highp float;
  uniform sampler2D src;
  uniform vec2 resolution;
  uniform vec2 offset;
  out vec4 outColor;
  void main() {
      vec2 uv = (gl_FragCoord.xy - offset) / resolution;
      outColor = texture(src, uv);
  }`,s=`
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
  }`,n=`
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
  }`,f=`
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
  }`,m=`
  precision highp float;
  out vec4 outColor;
  void main() { outColor = vec4(0.0); }`,x=`
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
  }`}const p=`
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
  }`,g=`
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
    vec2 cr = texture(canvas, uv - disp * 0.050).ra;
    vec2 cg = texture(canvas, uv - disp * 0.040).ga;
    vec2 cb = texture(canvas, uv - disp * 0.030).ba;
    outColor = vec4(cr.x, cg.x, cb.x, (cr.y + cg.y + cb.y) / 3.);

    float v = length(disp);
    outColor += vec4(spectrum(sin(v * 3. + time) * 0.4 + 0.5), 1) * smoothstep(.2, .8, v)
   * 0.5;
  }`;function y(e){const{simSize:t,mouseDelta:o}=e,u=[];u.push({frag:m,target:"p_a",float:!0,size:t});let r="p_a";for(let c=0;c<e.pressureIterations;c++)r=c%2===0?"p_b":"p_a",u.push({frag:x,target:r,float:!0,size:t});return[{frag:a,target:"canvas"},{frag:s,target:"curl",float:!0,size:t},{frag:n,target:"vort_vel",float:!0,size:t,uniforms:{mouseDelta:o,curlStrength:e.curlStrength,splatForce:e.splatForce,splatRadius:e.splatRadius}},{frag:f,target:"divergence",float:!0,size:t},...u,{frag:d(r),target:"proj_vel",float:!0,size:t},{frag:p,target:"velocity",persistent:!0,float:!0,size:t,uniforms:{velocityDissipation:e.velocityDissipation}},{frag:g,uniforms:{time:e.time,simSize:t}}]}const h=document.getElementById("app");let i=[-1,-1],v=[0,0];window.addEventListener("mousemove",e=>{const t=e.clientX,o=window.innerHeight-e.clientY;i[0]>=0&&(v=[t-i[0],o-i[1]]),i=[t,o]});window.addEventListener("load",async()=>{const t=document.documentElement.clientWidth/document.documentElement.clientHeight,o=t>1?[Math.round(128*t),128]:[128,Math.round(128/t)],u=y({simSize:o,mouseDelta:()=>(v=[v[0]*.9,v[1]*.9],v),pressureIterations:8,curlStrength:20,velocityDissipation:1,splatForce:3e3,splatRadius:.001,time:()=>performance.now()/1e3}),r=new l({postEffect:u});await r.add(h,{shader:"none"}),r.play()});
