import type { VFXPass } from "@vfx-js/core";

// Demos on the Custom Shaders page. Each is shown in a code block and run live.

export const uniformsShader = `
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
`;

export const backbufferShader = `
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
`;

// Keeps the element under a name. In later passes, src is the previous pass.
const copyFrag = `
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    outColor = texture(src, uv);
}
`;

const blurFrag = `
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
`;

const glowFrag = `
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
`;

export const multipassFrags = { copyFrag, blurFrag, glowFrag };

export const multipassPasses: VFXPass[] = [
    { frag: copyFrag, target: "image" },
    { frag: blurFrag, target: "blur" },
    { frag: glowFrag },
];
