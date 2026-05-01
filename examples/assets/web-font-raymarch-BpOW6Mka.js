import"./modulepreload-polyfill-N-DOuI4P.js";import{t as e}from"./esm-CeNsHEOB.js";function t(e,t,n){return e*(1-n)+t*n}var n=`
precision highp float;
uniform vec2 resolution;
uniform vec2 mouse;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;
uniform vec3 mouseDir;
#define PI 3.141593

mat2 rot(float t) {
  return mat2(cos(t), -sin(t), sin(t), cos(t));
}

float rand(vec2 p) {
  return fract(sin(dot(p, vec2(484., 398.)) * 984.));
}

float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float map(vec3 p) {
  float d = sdSphere(p - mouseDir * 8., 3.);

  p.xz *= rot(sin(time * 0.3) * 0.5);
  p.xy *= rot(time * 0.7);

  float l = 4.4;
  d = min(d, sdSphere(p + vec3(1, 1, 1) * l, 2.0));
  d = min(d, sdSphere(p + vec3(-1, -1, 1) * l * 2., 1.7));
  d = min(d, sdSphere(p + vec3(-1, 1, -1) * l, 1.2));
  d = min(d, sdSphere(p + vec3(1, -1, -1) * l, 2.9));

  return d;
}

vec3 getNormal(vec3 p) {
  vec2 d = vec2(1, 0);
  return normalize(vec3(
    map(p + d.xyy) - map(p - d.xyy),
    map(p + d.yxy) - map(p - d.yxy),
    map(p + d.yyx) - map(p - d.yyx)
  ));
}

vec3 spectrum(float x) {
    return cos((x - vec3(0, .5, 1)) * vec3(.6, 1., .5) * PI);
}

float surface(vec3 p, vec3 n, vec3 rd, vec3 lig) {
  float c = 0.;

  vec3 hal = normalize(lig - rd);
  float spe = pow(clamp(dot(hal, n), 0., 1.), 250.);
  c += spe * 0.9;

  c += clamp(dot(n, lig), 0., 1.) * 0.4;

  return c;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - offset) / resolution;
  vec2 p = uv * 2. - 1.;
  p.x *= resolution.x / resolution.y;

  p *= resolution.y / 1000.;

  vec3 ro = vec3(0, 0, 30);
  vec3 rd = normalize(vec3(p, -7));
  vec3 rp;

  float t = 0.;
  float d;

  vec4 c = vec4(0);
  vec4 light = vec4(0);

  vec3 n = vec3(-1);

  for (int i = 0; i < 50; i++) {
    rp = ro + rd * t;
    d = map(rp);

    if (d < 0.01) {
      n = getNormal(rp);
      break;
    }
    if (t > 50.) {
      break;
    }

    t += d;
  }

  if (n.z > 0.) {
    float glaze = clamp(1. + dot(rd, n), 0., 1.);

    float z = rp.z + 5.;
    for (float x = 0.; x <= 1.; x += 0.1) {
      float xx = x * 2. - 1.;

      float ior = 1.5 + x * 2.;
      vec3 rd2 = rp + refract(rd, n, 1. / ior);

      vec2 uv2 = uv + rd2.xy * z * 0.003 * xx * glaze;
      uv2 += rand(rp.xy) * 0.1 * pow(glaze, 3.);

      vec4 tc = texture2D(src, uv2);
      c += vec4(spectrum(x * 0.7) * 2., 1) * tc.a;
    }
    c /= 11.;

    c += pow(glaze, 3.) * 0.8 * vec4(.6, .9, 1, 1);

    c += surface(rp, n, rd, normalize(vec3(-.8, 1., .2))) * vec4(.8, .9, 1, 1);
    c += surface(rp, n, rd, normalize(vec3(1., -0.7, .1)));

    c = clamp(c, 0., 1.);
    c += vec4(0.0, 0.02, 0.03, 0.1);
  }

  c += vec4(0, 0, 0, pow(length(p), 2.) * 0.04);
  c += rand(uv * 2.) * 0.1;

  c.rgb /= c.a;
  gl_FragColor = c;
}
`,r=30,i=1.2,a=.17,o=window.devicePixelRatio||1,s=document.querySelector(`h1`),c=document.createElement(`canvas`),l=c.getContext(`2d`);document.body.appendChild(c);var u=new e;function d(){let e=s.getBoundingClientRect();c.style.position=`fixed`,c.style.left=`${e.left-r}px`,c.style.top=`${e.top-r}px`,c.style.width=`${e.width+r*2}px`,c.style.height=`${e.height+r*2}px`,c.width=(e.width+r*2)*o,c.height=(e.height+r*2)*o,c.style.pointerEvents=`none`;let t=window.getComputedStyle(s),n=parseFloat(t.fontSize),d=n*a;l.scale(o,o),l.clearRect(0,0,e.width,e.height),l.font=t.font,l.fillStyle=`rgba(0, 0, 0, 1)`,l.textBaseline=`top`,l.textAlign=`center`;let f=s.innerText.split(`
`),p=0;for(let t of f)l.fillText(t,r+e.width*.5,r+d+p),p+=n*i;u.update(c)}new MutationObserver(d).observe(s,{subtree:!0,characterData:!0,attributes:!0}),window.addEventListener(`resize`,d),window.addEventListener(`load`,d),document.addEventListener(`keydown`,d),document.addEventListener(`keyup`,d);var f=[0,0],p=[0,0];window.addEventListener(`pointermove`,e=>{p=[e.clientX/window.innerWidth*2-1,-(e.clientY/window.innerHeight*2-1)]}),u.add(c,{shader:n,overflow:!0,uniforms:{mouseDir:()=>(f=[t(f[0],p[0],.05),t(f[1],p[1],.05)],[f[0],f[1],0])}}),d();