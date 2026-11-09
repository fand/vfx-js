/** The AI page demo: a shader an agent wrote from a one-line prompt. Shown and run live. */
export const rippleShader = `
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
uniform vec2 mouse; // same space as gl_FragCoord
uniform float time;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;

    // Rings that move out from the mouse and fade with distance.
    vec2 fromMouse = gl_FragCoord.xy - mouse;
    float d = length(fromMouse);
    float wave = sin(d * 0.05 - time * 6.0) * exp(-d * 0.004);

    uv += normalize(fromMouse + 0.001) * wave * 0.03;
    outColor = texture(src, uv);
}
`;
