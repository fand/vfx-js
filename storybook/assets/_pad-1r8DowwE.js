import{n as e}from"./rolldown-runtime-sJBDdmOt.js";function t(e,t,n,r){let i=[],a=Math.max(1,Math.floor(t/2)),o=Math.max(1,Math.floor(n/2));for(let t=0;t<r;t++){i.push(e.createRenderTarget({size:[a,o],float:!0}));let t=Math.max(1,Math.floor(a/2)),n=Math.max(1,Math.floor(o/2));if(t===a&&n===o)break;a=t,o=n}return{down:i,up:i.slice(0,-1).map(t=>e.createRenderTarget({size:[t.width,t.height],float:!0}))}}function n(e){for(let t of e.down)t.dispose();for(let t of e.up)t.dispose();e.down.length=0,e.up.length=0}function r(e,t,n){let r=t.down.length,i=t.down[r-1];for(let o=r-2;o>=0;o--)e.draw({frag:a,uniforms:{srcSmall:i,srcLarge:t.down[o],...n(o,i)},target:t.up[o]}),i=t.up[o];return i}var i,a;function o(){return(o=e((()=>{i=`
float bloomKnee(float br, float threshold, float knee) {
    float rq = clamp(br - threshold + knee, 0.0, 2.0 * knee);
    rq = rq * rq / (4.0 * knee + 1e-4);
    return max(rq, br - threshold) / max(br, 1e-4);
}
`,a=`#version 300 es
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
`})))()}function s(e,t){if(e===`fullscreen`)return t.canvasRect;let n=e*t.pixelRatio,[,,r,i]=t.contentRect;return[-n,-n,r+2*n,i+2*n]}function c(){return(c=e((()=>{})))()}export{n as a,t as i,s as n,o,i as r,r as s,c as t};