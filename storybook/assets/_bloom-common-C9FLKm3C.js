import{n as e}from"./rolldown-runtime-sJBDdmOt.js";function t(e,t){return e===`fullscreen`?e:typeof e==`number`&&Number.isFinite(e)?Math.min(Math.max(e,0),r):t}function n(e,t){if(e===`fullscreen`)return t.canvasRect;let n=e*t.pixelRatio,[,,r,i]=t.contentRect;return[-n,-n,r+2*n,i+2*n]}var r;function i(){return(i=e((()=>{r=1e4})))()}function a(e,t,n,r){let i=[],a=Math.max(1,Math.floor(t/2)),o=Math.max(1,Math.floor(n/2));for(let t=0;t<r;t++){i.push(e.createRenderTarget({size:[a,o],float:!0}));let t=Math.max(1,Math.floor(a/2)),n=Math.max(1,Math.floor(o/2));if(t===a&&n===o)break;a=t,o=n}return{down:i,up:i.slice(0,-1).map(t=>e.createRenderTarget({size:[t.width,t.height],float:!0}))}}function o(e){for(let t of e.down)t.dispose();for(let t of e.up)t.dispose();e.down.length=0,e.up.length=0}function s(e,t,n){let r=t.down.length,i=t.down[r-1];for(let a=r-2;a>=0;a--)e.draw({frag:l,uniforms:{srcSmall:i,srcLarge:t.down[a],...n(a,i)},target:t.up[a]}),i=t.up[a];return i}var c,l;function u(){return(u=e((()=>{c=`
float bloomKnee(float br, float threshold, float knee) {
    float rq = clamp(br - threshold + knee, 0.0, 2.0 * knee);
    rq = rq * rq / (4.0 * knee + 1e-4);
    return max(rq, br - threshold) / max(br, 1e-4);
}
`,l=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D srcSmall;
uniform sampler2D srcLarge;
uniform vec2 texelSize;
uniform float weightLarge;
uniform float weightSmall;

void main() {
    vec2 t = texelSize;
    vec4 sum = vec4(0.0);
    sum += texture(srcSmall, uv + vec2(-t.x, -t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2( 0.0, -t.y)) * 2.0;
    sum += texture(srcSmall, uv + vec2( t.x, -t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2(-t.x,  0.0)) * 2.0;
    sum += texture(srcSmall, uv                  ) * 4.0;
    sum += texture(srcSmall, uv + vec2( t.x,  0.0)) * 2.0;
    sum += texture(srcSmall, uv + vec2(-t.x,  t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2( 0.0,  t.y)) * 2.0;
    sum += texture(srcSmall, uv + vec2( t.x,  t.y)) * 1.0;
    sum *= (1.0 / 16.0);
    outColor = texture(srcLarge, uv) * weightLarge + sum * weightSmall;
}
`})))()}export{s as a,n as c,u as i,a as n,i as o,o as r,t as s,c as t};