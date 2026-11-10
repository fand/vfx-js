/** The scroll demo on How it Works. Shown in a code block and run live. */
export const scrollShader = `
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
uniform float intersection;  // 0..1, how much of the element is in view
uniform float enterProgress; // 0..1 after it enters
uniform float leaveProgress; // 0..1 after it leaves
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec4 color = texture(src, uv);
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Color fills in from the left as more of the element is in view.
    float colored = step(uv.x, intersection);
    color.rgb = mix(vec3(gray), color.rgb, colored);

    // Fade in on enter, out on leave. Turns back if you scroll back mid-way.
    outColor = color * enterProgress * (1.0 - leaveProgress);
}
`;

/** The `intersection` option for the demo. */
export const scrollIntersection = { threshold: 0.5, duration: 0.8 };

export const scrollCode = `
vfx.add(img, {
    shader,
    // Enter when half of it is in view, and leave when less than half is.
    intersection: { threshold: 0.5, duration: 0.8 },
});
`;
