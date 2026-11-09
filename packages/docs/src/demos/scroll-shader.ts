/** The scroll demo on How it Works. Shown in a code block and run live. */
export const scrollShader = `
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
uniform float intersection; // 0..1, how much of the element is in view
uniform float enterTime;    // seconds since it entered
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec4 color = texture(src, uv);
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Color fills in from the left as more of the element is in view.
    float colored = step(uv.x, intersection);
    color.rgb = mix(vec3(gray), color.rgb, colored);

    // Fade in over 1 second after entering.
    outColor = color * clamp(enterTime, 0.0, 1.0);
}
`;
