import{n as e}from"./rolldown-runtime-sJBDdmOt.js";function t(e,t){e.draw({frag:r,uniforms:{src:e.src},target:t})}function n(e,t,n){e.draw({frag:i,uniforms:{src:t},target:n})}var r,i;function a(){return(a=e((()=>{r=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
void main() {
    outColor = texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}
`,i=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`})))()}export{n,a as r,t};