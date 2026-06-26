// Hatching — pen-and-ink cross-hatching whose line density follows the
// image's tonal value. Ported from Figma's "Hatching" shader effect.
import type { EffectContext } from "@vfx-js/core";
import {
    contentResolution,
    GLSL_HEADER,
    GLSL_LUMA,
    SinglePassEffect,
} from "./_common";

const FRAG = `${GLSL_HEADER}
${GLSL_LUMA}
uniform vec2 resolution;
uniform float spacing;
uniform float angle;
uniform float thickness;
uniform vec3 inkColor;
uniform vec4 paper;

// 1.0 on a hatch line, 0.0 between lines. \`th\` is the line-width fraction.
float hatch(vec2 uvpx, float ang, float space, float th) {
    vec2 n = vec2(cos(ang), sin(ang));
    float d = abs(fract(dot(uvpx, n) / space - 0.5) - 0.5) * 2.0;
    float aa = fwidth(d) + 0.01;
    return 1.0 - smoothstep(th - aa, th + aa, d);
}

const float Q = 0.7853981634; // 45 deg

void main() {
    vec4 col = readTex(uvContent);
    float l = luma(col.rgb);
    vec2 uvpx = uvContent * resolution;

    float ink = 0.0;
    if (l < 0.85) { ink = max(ink, hatch(uvpx, angle, spacing, thickness)); }
    if (l < 0.65) { ink = max(ink, hatch(uvpx, angle + 2.0 * Q, spacing, thickness)); }
    if (l < 0.45) { ink = max(ink, hatch(uvpx, angle + Q, spacing, thickness)); }
    if (l < 0.25) { ink = max(ink, hatch(uvpx, angle - Q, spacing, thickness)); }
    if (l < 0.10) { ink = max(ink, hatch(uvpx, angle, spacing * 0.5, thickness)); }

    ink *= col.a;
    outColor = mix(paper, vec4(inkColor, 1.0), ink);
}
`;

export type HatchingParams = {
    /** Distance between hatch lines in CSS px. */
    spacing: number;
    /** Base hatch angle in degrees. */
    angle: number;
    /** Line width as a fraction of spacing `0..1`. */
    thickness: number;
    /** Ink color, each channel `0..1`. */
    inkColor: [number, number, number];
    /** Paper color (RGBA, each channel `0..1`). */
    paper: [number, number, number, number];
};

const DEFAULT_PARAMS: HatchingParams = {
    spacing: 6,
    angle: 45,
    thickness: 0.35,
    inkColor: [0.05, 0.05, 0.05],
    paper: [0.96, 0.94, 0.88, 1],
};

export class HatchingEffect extends SinglePassEffect<HatchingParams> {
    protected frag = FRAG;

    constructor(initial: Partial<HatchingParams> = {}) {
        super(DEFAULT_PARAMS, initial);
    }

    protected uniforms(ctx: EffectContext) {
        const [w, h] = contentResolution(ctx);
        const p = this.params;
        return {
            resolution: [w, h],
            spacing: Math.max(p.spacing * ctx.pixelRatio, 1),
            angle: (p.angle * Math.PI) / 180,
            thickness: p.thickness,
            inkColor: p.inkColor,
            paper: p.paper,
        };
    }
}
