import{n as e,t}from"./lifecycle.v3sQOfPt.js";import{t as n}from"./lazy.CB2youxS.js";var r=`
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform float scroll; // from a function, every frame
uniform vec3 tint;    // a static value
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    uv.x = fract(uv.x + scroll + time * 0.1);
    vec4 color = texture(src, uv);
    outColor = vec4(color.rgb * tint, color.a);
}
`,i=`
precision highp float;
uniform sampler2D src;
uniform sampler2D backbuffer;
uniform vec2 resolution;
uniform vec2 offset;
uniform vec4 viewport;
uniform float time;
out vec4 outColor;

vec4 readSrc(vec2 uv) {
    if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) return vec4(0);
    return texture(src, uv);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;

    // Move the element in a circle.
    vec2 shift = vec2(cos(time * 2.0), sin(time * 2.0)) * 0.12;
    vec4 color = readSrc(uv - shift);

    // The backbuffer covers the element plus overflow.
    vec2 bufferUv = (gl_FragCoord.xy - viewport.xy) / viewport.zw;
    // Fade the last frame and shift its color.
    vec4 prev = texture(backbuffer, bufferUv) * vec4(0.9, 0.8, 0.96, 0.96);

    outColor = max(color, prev);
}
`,a=[{frag:`
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    outColor = texture(src, uv);
}
`,target:`image`},{frag:`
precision highp float;
uniform sampler2D src; // the previous pass
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec4 c = vec4(0);
    for (int x = -4; x <= 4; x++) {
        for (int y = -4; y <= 4; y++) {
            c += texture(src, uv + vec2(x, y) * 4.0 / resolution);
        }
    }
    outColor = c / 81.0;
}
`,target:`blur`},{frag:`
precision highp float;
uniform sampler2D image; // the "image" target
uniform sampler2D blur;  // the "blur" target
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec4 glow = texture(blur, uv) * vec4(0.3, 0.8, 1.0, 1.0) * 2.0;
    outColor = texture(image, uv) + glow;
}
`}];t(()=>{let t=document.getElementById(`UniformsDemo`);t&&n(t,()=>({shader:r,uniforms:{tint:[1,.4,.8],scroll:()=>(e()?.scrollTop??0)/window.innerHeight}}));let o=document.getElementById(`BackbufferDemo`);o&&n(o,()=>({shader:i,backbuffer:!0,overflow:60}));let s=document.getElementById(`MultipassDemo`);s&&n(s,()=>({shader:a}))});