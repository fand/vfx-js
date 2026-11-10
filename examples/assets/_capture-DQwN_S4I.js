function e(e,t){e.draw({frag:`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
void main() {
    outColor = texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}
`,uniforms:{src:e.src},target:t})}function t(e,t,n){e.draw({frag:`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,uniforms:{src:t},target:n})}export{t as n,e as t};