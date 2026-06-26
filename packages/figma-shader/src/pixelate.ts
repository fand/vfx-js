// Pixelate — scatters the image into a grid of tiled shapes with color
// reduction and a dissolve control. Ported from Figma's "Pixelate"
// shader effect.
import type { EffectContext } from "@vfx-js/core";
import {
    contentResolution,
    GLSL_HEADER,
    GLSL_NOISE,
    SinglePassEffect,
} from "./_common";

export type PixelateShape = "square" | "circle" | "diamond";

const SHAPE_INDEX: Record<PixelateShape, number> = {
    square: 0,
    circle: 1,
    diamond: 2,
};

const FRAG = `${GLSL_HEADER}
${GLSL_NOISE}
uniform vec2 resolution;
uniform float size;
uniform int shape;
uniform float colorLevels;
uniform float dissolve;
uniform vec4 background;

void main() {
    vec2 uvpx = uvContent * resolution;
    vec2 cell = floor(uvpx / size);
    vec2 center = (cell + 0.5) * size;
    vec4 col = readTex(center / resolution);

    if (colorLevels > 1.0) {
        float s = colorLevels - 1.0;
        col.rgb = floor(col.rgb * s + 0.5) / s;
    }

    vec2 local = (uvpx - center) / (size * 0.5);
    float m;
    if (shape == 1) {
        m = length(local);
    } else if (shape == 2) {
        m = abs(local.x) + abs(local.y);
    } else {
        m = max(abs(local.x), abs(local.y));
    }
    float aa = fwidth(m) + 0.02;
    float inside = 1.0 - smoothstep(1.0 - aa, 1.0, m);
    float keep = step(dissolve, hash21(cell + 3.17));

    float a = inside * keep * col.a;
    outColor = mix(background, vec4(col.rgb, 1.0), a);
}
`;

export type PixelateParams = {
    /** Tile size in CSS px. */
    size: number;
    /** Tile shape. */
    shape: PixelateShape;
    /** Quantization steps per channel (`0`/`1` disables color reduction). */
    colorLevels: number;
    /** Fraction of tiles randomly dropped to the background `0..1`. */
    dissolve: number;
    /** Background revealed by the dissolve / gaps (RGBA, `0..1`). */
    background: [number, number, number, number];
};

const DEFAULT_PARAMS: PixelateParams = {
    size: 16,
    shape: "square",
    colorLevels: 0,
    dissolve: 0,
    background: [0, 0, 0, 0],
};

export class PixelateEffect extends SinglePassEffect<PixelateParams> {
    protected frag = FRAG;

    constructor(initial: Partial<PixelateParams> = {}) {
        super(DEFAULT_PARAMS, initial);
    }

    protected uniforms(ctx: EffectContext) {
        const [w, h] = contentResolution(ctx);
        const p = this.params;
        return {
            resolution: [w, h],
            size: Math.max(p.size * ctx.pixelRatio, 1),
            shape: SHAPE_INDEX[p.shape],
            colorLevels: p.colorLevels,
            dissolve: p.dissolve,
            background: p.background,
        };
    }
}
