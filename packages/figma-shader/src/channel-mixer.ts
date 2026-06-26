// Channel Mixer — recombines the R/G/B channels through a 3x3 matrix for
// duotones, false-color, and creative grading. Ported from Figma's
// "Channel Mixer" shader effect.
import type { EffectContext } from "@vfx-js/core";
import { GLSL_HEADER, SinglePassEffect } from "./_common";

const FRAG = `${GLSL_HEADER}
uniform vec3 red;
uniform vec3 green;
uniform vec3 blue;
uniform bool mono;

void main() {
    vec4 col = readTex(uvContent);
    vec3 c = col.rgb;
    if (mono) {
        c = vec3(dot(c, red));
    } else {
        c = vec3(dot(c, red), dot(c, green), dot(c, blue));
    }
    outColor = vec4(clamp(c, 0.0, 1.0), col.a);
}
`;

export type ChannelMixerParams = {
    /** Weights `[r, g, b]` contributing to the output red channel. */
    red: [number, number, number];
    /** Weights `[r, g, b]` contributing to the output green channel. */
    green: [number, number, number];
    /** Weights `[r, g, b]` contributing to the output blue channel. */
    blue: [number, number, number];
    /** Collapse to grayscale using the `red` weights only. */
    mono: boolean;
};

const DEFAULT_PARAMS: ChannelMixerParams = {
    red: [1, 0, 0],
    green: [0, 1, 0],
    blue: [0, 0, 1],
    mono: false,
};

export class ChannelMixerEffect extends SinglePassEffect<ChannelMixerParams> {
    protected frag = FRAG;

    constructor(initial: Partial<ChannelMixerParams> = {}) {
        super(DEFAULT_PARAMS, initial);
    }

    protected uniforms(_ctx: EffectContext) {
        const p = this.params;
        return { red: p.red, green: p.green, blue: p.blue, mono: p.mono };
    }
}
