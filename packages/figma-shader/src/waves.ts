// Waves — refraction-style distortion (sine waves, zigzags, lenticular
// lensing). Ported from Figma's "Distortion" shader effect.
import type { EffectContext } from "@vfx-js/core";
import { contentResolution, GLSL_HEADER, SinglePassEffect } from "./_common";

export type WavesType = "wave" | "zigzag" | "lens";

const TYPE_INDEX: Record<WavesType, number> = {
    wave: 0,
    zigzag: 1,
    lens: 2,
};

const FRAG = `${GLSL_HEADER}
uniform vec2 resolution;
uniform float time;
uniform float amplitude;
uniform float frequency;
uniform float speed;
uniform float angle;
uniform int type;

void main() {
    vec2 dir = vec2(cos(angle), sin(angle));
    vec2 perp = vec2(-dir.y, dir.x);
    float coord = dot(uvContent, dir);
    float ph = coord * frequency * 6.2831853 + time * speed;

    vec2 disp;
    if (type == 1) {                       // zigzag (triangle wave)
        float w = abs(fract(ph / 6.2831853) * 2.0 - 1.0) * 2.0 - 1.0;
        disp = perp * w;
    } else if (type == 2) {                // lenticular lens
        float w = (fract(coord * frequency) - 0.5) * 2.0;
        disp = dir * w;
    } else {                               // sine wave
        disp = perp * sin(ph);
    }

    vec2 uv = uvContent + disp * amplitude / resolution;
    outColor = readTex(uv);
}
`;

export type WavesParams = {
    /** Distortion shape. */
    type: WavesType;
    /** Displacement amplitude in CSS px. */
    amplitude: number;
    /** Spatial frequency (cycles across the image). */
    frequency: number;
    /** Animation speed (`0` freezes the pattern). */
    speed: number;
    /** Wave direction in degrees. */
    angle: number;
};

const DEFAULT_PARAMS: WavesParams = {
    type: "wave",
    amplitude: 12,
    frequency: 6,
    speed: 1.5,
    angle: 0,
};

export class WavesEffect extends SinglePassEffect<WavesParams> {
    protected frag = FRAG;

    constructor(initial: Partial<WavesParams> = {}) {
        super(DEFAULT_PARAMS, initial);
    }

    protected uniforms(ctx: EffectContext) {
        const [w, h] = contentResolution(ctx);
        const p = this.params;
        return {
            resolution: [w, h],
            time: ctx.time,
            amplitude: p.amplitude * ctx.pixelRatio,
            frequency: p.frequency,
            speed: p.speed,
            angle: (p.angle * Math.PI) / 180,
            type: TYPE_INDEX[p.type],
        };
    }
}
