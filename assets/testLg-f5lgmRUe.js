import"./modulepreload-polyfill-B5Qt9EMX.js";import{V as B}from"./vfx-Bk5ysT1u.js";const c={sphereR:.1,bubbleCount:8,bubbleRadiusMin:.03,bubbleRadiusMax:.06,bubbleSpeed:.6,mouseSmoothing:.05},N=`
    precision highp float;
    uniform sampler2D src;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform vec2 mouse;
    uniform vec2 lag;
    uniform float time;
    uniform float clickTime;
    uniform int clickCount;
    out vec4 outColor;

    const float SPHERE_R = ${c.sphereR.toFixed(4)};

    const float DISP = 0.02;
    const int   DISP_STEPS = 8;
    const float DISP_LO = 0.0;
    const float DISP_HI = 1.0;

    const float SCATTER = 0.03;

    const int N_BUBBLES = ${c.bubbleCount};
    const float BUBBLE_SMOOTH = 0.025;
    uniform float bubbleData[${c.bubbleCount*4}]; // N * (x, y, z, r)

    const vec3 ABSORB = vec3(2.0, 1.2, 1.0) * 3.;

    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
    }

    vec2 hash22(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
    }

    mat2 rot(float t) {
      float c = cos(t), s = sin(t);
      return mat2(c, -s, s, c);
    }

    float sdSphere(vec3 p, float r) {
      return length(p) - r;
    }

    float sdBox(vec3 p, vec3 b, float r) {
      vec3 q = abs(p) - b + r;
      return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
    }

    float sdRing(vec3 p, vec2 r) {
      float s = length(p.xy) - r.x;
      return length(vec2(s, p.z)) - r.y;
    }

    float map(vec3 p, vec3 c) {
      vec3 q = p - c;

      // Click reaction
      float tt = clickTime * 5.0;
      float bounce = exp(-tt) * sin(tt) * 5. + (1. - exp(-tt));
      float s = bounce * 0.5 + 0.5;
      q /= s;

      q.xz *= rot(exp(-clickTime*3.0) * 8.);

      // Main object
      vec3 sp = q;
      sp.y += sin(sp.z * 29. + time * 4.5) * 0.01;
      sp.z += sin(sp.x * 23. + sp.y * 11. + time * 7.) * 0.01;
      sp.xy *= rot(time*1.3);
      sp.xz *= rot(time*1.1);

      float d ;
      int objType = clickCount % 3;
      if (objType == 0) {
        d = sdSphere(sp, SPHERE_R);
      } else if (objType == 1) {
        d = sdBox(sp, vec3(SPHERE_R), 0.01);
      } else {
        d = sdRing(sp, vec2(SPHERE_R, 0.01));
      }

      // Bubbles (positions from JS uniform)
      for (int i = 0; i < N_BUBBLES; i++) {
        int b = i * 4;
        vec3 bPos = vec3(bubbleData[b], bubbleData[b+1], bubbleData[b+2]);
        float r = bubbleData[b+3];
        d = smin(d, sdSphere(q - bPos, max(r, 0.001)), BUBBLE_SMOOTH);
      }

      return d * s;
    }

    vec3 calcNormal(vec3 p, vec3 c) {
      vec2 e = vec2(0.001, 0.0);
      return normalize(vec3(
        map(p + e.xyy, c) - map(p - e.xyy, c),
        map(p + e.yxy, c) - map(p - e.yxy, c),
        map(p + e.yyx, c) - map(p - e.yyx, c)
      ));
    }

    // x ∈ [0,1]: 0 = red, 1 = violet. Sums to ~white over a full sweep.
    vec3 spectrum(float x) {
      return clamp(vec3(
        1.5 - abs(4.0 * x - 1.0),
        1.5 - abs(4.0 * x - 2.0),
        1.5 - abs(4.0 * x - 3.0)
      ), 0.0, 1.0);
    }

    vec4 getSrc(vec2 uv) {
      vec4 c = texture(src, uv);
      return mix(vec4(1), c, c.a);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - offset) / resolution;
      float aspect = resolution.y / resolution.x;

      vec2 p = (uv - 0.5) * vec2(1.0, aspect);
      vec2 mp = ((mouse + lag) / resolution - 0.5) * vec2(1.0, aspect);

      vec3 ro = vec3(0.0, 0.0, -2.0);
      float focal = 2.0;
      vec3 rd = normalize(vec3(p, focal));

      // coord center
      vec3 c = vec3(mp, 0.0);

      vec3 firstN = vec3(0.0);
      vec3 lastN = vec3(0.0);
      int hitCount = 0;

      // Total in-glass distance (Σ over all entry→exit slabs).
      float thickness = 0.0;
      float tEntry = 0.0;
      float t = 0.0;
      bool inside = false;
      for (int i = 0; i < 50; i++) {
        if (t > 10.0) break;

        vec3 pos = ro + rd * t;
        float d = map(pos, c);

        // Distance to nearest surface, always positive regardless of side.
        float step = inside ? -d : d;
        if (step < 3e-4) {
          vec3 n = calcNormal(pos, c);
          if (hitCount == 0) firstN = n;
          lastN = n;
          // Sample t at every entry, accumulate (t - tEntry) at every exit.
          if (!inside) {
            tEntry = t;
          } else {
            thickness += t - tEntry;
          }

          hitCount++;
          if (hitCount >= 4) { break; }

          inside = !inside;
          t += 0.01; // kick
        } else {
          t += step;
        }
      }

      if (hitCount > 0) {
        vec2 baseDisp = -(firstN.xy + lastN.xy) * 0.5 * DISP;

        float NdotR = max(dot(firstN, -rd), 0.0);
        float scatter = pow((1.0 - NdotR), 2.0) * SCATTER;

        // dispersion + hash scatter
        vec3 acc = vec3(0.0);
        vec3 wsum = vec3(0.0);
        for (int i = 0; i < DISP_STEPS; i++) {
          float wl = float(i) / float(DISP_STEPS - 1);
          float k = mix(DISP_LO, DISP_HI, wl) * (1.3 + float(hitCount) * 0.2);
          vec2 h = hash22(uv * 1000.0 + float(i) * 7.13 + time) * scatter;
          vec3 w = spectrum(wl);
          acc += getSrc(uv + baseDisp * k + h).rgb * w;
          wsum += w;
        }
        vec3 col = acc / wsum * 0.99;
        col -= float(hitCount) * 0.05;

        col += 0.1;

        // Fresnel
        float fres = pow(1.0 - NdotR, 5.0);
        col *= 1. + fres;

        // Absorb
        float f2 = 1. - pow(NdotR, 3.0);
        col *= mix(vec3(1), exp(-ABSORB * thickness), f2);
        col *= 1. + f2;

        // Lights
        vec3 ld = normalize(vec3(0.5, 0.9, -0.3));
        float spec = pow(max(dot(reflect(-ld, firstN), -rd), 0.0), 200.0);
        col += spec * 30.;

        ld = normalize(vec3(-0.9, 0.4, -0.3));
        spec = pow(max(dot(reflect(-ld, firstN), -rd), 0.0), 300.0);
        col += spec * 3.;

        ld = normalize(vec3(-0.1, -0.9, -0.1));
        spec = pow(max(dot(reflect(-ld, firstN), -rd), 0.0), 30.0);
        col += spec * 0.5;

        // Edge
        col = min(col, 1.);
        col = 1. - abs(col + fres * .5 - 1.);

        outColor = vec4(col, 1.0);
      } else {
        outColor = getSrc(uv);
      }
    }
    `;window.addEventListener("load",async()=>{const g=document.getElementById("app"),m=c.bubbleCount,v=t=>t-Math.floor(t),d=(t,a,e)=>{const s=Math.cos(e),p=Math.sin(e);return[t*s-a*p,t*p+a*s]},n={x:0,y:0},o={x:0,y:0},l={x:0,y:0};window.addEventListener("pointermove",t=>{n.x=t.clientX,n.y=window.innerHeight-t.clientY});let x=performance.now()/1e3,y=0;window.addEventListener("pointerdown",()=>{x=performance.now()/1e3,y++});const r=new Float32Array(m*4),k=performance.now()/1e3;function h(){const t=performance.now()/1e3-k,a=c.mouseSmoothing;o.x+=(n.x-o.x)*a,o.y+=(n.y-o.y)*a,l.x+=(o.x-l.x)*a,l.y+=(o.y-l.y)*a;for(let e=0;e<m;e++){const s=v(t*c.bubbleSpeed+e/m),p=c.sphereR*(.3+s*.8),w=t*(.8+v(e*.618)*.7)+e*1.256;let f=Math.cos(w)*p,i=0,u=Math.sin(w)*p;[f,i]=d(f,i,e*2.3),[i,u]=d(i,u,e*1.8),i+=s*.1,f+=Math.sin(t*2.7+e*4.1)*.008*s,u+=Math.cos(t*3.1+e*3.7)*.008*s;const R=window.innerWidth,E=window.innerHeight;f+=(l.x-o.x)/R*(E/R),i+=(l.y-o.y)/E;const C=c.bubbleRadiusMax-c.bubbleRadiusMin,P=c.bubbleRadiusMin+C*v(e*.618),b=e*4;r[b]=f,r[b+1]=i,r[b+2]=u,r[b+3]=P*Math.sin(s*Math.PI)}requestAnimationFrame(h)}h();const S=new B({postEffect:{shader:N,uniforms:{lag:()=>[(o.x-n.x)*devicePixelRatio,(o.y-n.y)*devicePixelRatio],clickTime:()=>performance.now()/1e3-x,clickCount:()=>y,bubbleData:()=>r}}});await S.addHTML(g,{shader:"none"}),S.play()});
