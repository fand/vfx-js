// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
// Threshold pixel sort: 3-pass (downsample → rank → gather). Scans each
// row/column for runs brighter than `threshold` and reorders them by `key`.
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

const FRAG_DOWNSAMPLE = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() { outColor = texture(src, uvSrc); }
`;

const KEY_FUNC = `
float key(vec3 c, int mode) {
    if (mode == 0) return dot(c, vec3(0.299, 0.587, 0.114));
    if (mode == 1) return c.r;
    if (mode == 2) return c.g;
    if (mode == 3) return c.b;
    float mx = max(max(c.r, c.g), c.b);
    float mn = min(min(c.r, c.g), c.b);
    float d  = mx - mn;
    if (mode == 5) return mx > 0.0 ? d / mx : 0.0;
    if (d < 1e-5) return 0.0;
    float h;
    if (mx == c.r)      h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
    else                h = (c.r - c.g) / d + 4.0;
    return h / 6.0;
}
`;

const SEGMENT_SCAN = `
ivec2 toXY(int a, int b, int axis) { return axis == 0 ? ivec2(a, b) : ivec2(b, a); }

void scanSegment(sampler2D s, int a, int b, int L, int keyMode, float threshold, int axis, out int segStart, out int segEnd) {
    segStart = a;
    for (int i = 0; i < 8192; i++) {
        if (segStart <= 0) break;
        if (i >= L) break;
        float k = key(texelFetch(s, toXY(segStart - 1, b, axis), 0).rgb, keyMode);
        if (k <= threshold) break;
        segStart--;
    }
    segEnd = a + 1;
    for (int i = 0; i < 8192; i++) {
        if (segEnd >= L) break;
        if (i >= L) break;
        float k = key(texelFetch(s, toXY(segEnd, b, axis), 0).rgb, keyMode);
        if (k <= threshold) break;
        segEnd++;
    }
}
`;

const FRAG_RANK = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 srcSize;
uniform float threshold;
uniform int keyMode;
uniform int direction;
uniform int axis;
${KEY_FUNC}
${SEGMENT_SCAN}
void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int a = axis == 0 ? p.x : p.y;
    int b = axis == 0 ? p.y : p.x;
    int L = int(axis == 0 ? srcSize.x : srcSize.y);
    float myKey = key(texelFetch(src, p, 0).rgb, keyMode);
    if (myKey <= threshold) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    int segStart, segEnd;
    scanSegment(src, a, b, L, keyMode, threshold, axis, segStart, segEnd);
    int rank = 0;
    for (int i = segStart; i < segEnd; i++) {
        if (i == a) continue;
        float k = key(texelFetch(src, toXY(i, b, axis), 0).rgb, keyMode);
        if (direction == 0) {
            if (k < myKey || (k == myKey && i < a)) rank++;
        } else {
            if (k > myKey || (k == myKey && i < a)) rank++;
        }
    }
    outColor = vec4(float(rank), float(segEnd - segStart), 0.0, 1.0);
}
`;

const FRAG_GATHER = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D srcHi;
uniform sampler2D rankTex;
uniform vec2 lowSize;
uniform float threshold;
uniform int keyMode;
uniform int axis;
${KEY_FUNC}
${SEGMENT_SCAN}
void main() {
    int lowA = axis == 0 ? int(uvSrc.x * lowSize.x) : int(uvSrc.y * lowSize.y);
    int b    = axis == 0 ? int(uvSrc.y * lowSize.y) : int(uvSrc.x * lowSize.x);
    int L    = int(axis == 0 ? lowSize.x : lowSize.y);
    ivec2 lowP = toXY(lowA, b, axis);
    float myKey = key(texelFetch(src, lowP, 0).rgb, keyMode);
    if (myKey <= threshold) {
        // below-threshold pixels skip the low-res buffer entirely.
        vec4 c = texture(srcHi, uvSrc);
        outColor = vec4(c.rgb * c.a, c.a);
        return;
    }
    int segStart, segEnd;
    scanSegment(src, lowA, b, L, keyMode, threshold, axis, segStart, segEnd);
    int targetRank = lowA - segStart;
    for (int i = segStart; i < segEnd; i++) {
        int r = int(texelFetch(rankTex, toXY(i, b, axis), 0).r + 0.5);
        if (r == targetRank) {
            // unmoved pixels keep the hi-res source; moved pixels take the low-res sorted color
            if (i == lowA) {
                vec4 c = texture(srcHi, uvSrc);
                outColor = vec4(c.rgb * c.a, c.a);
            } else {
                vec4 c = texelFetch(src, toXY(i, b, axis), 0);
                outColor = vec4(c.rgb * c.a, c.a);
            }
            return;
        }
    }
    vec4 c = texture(srcHi, uvSrc);
    outColor = vec4(c.rgb * c.a, c.a);
}
`;

// VFX-JS writes to a `premultipliedAlpha: true` canvas. Captured textures
// upload as straight alpha, so pre-multiply at output — semi-transparent
// pixels (text-shadow halos, anti-aliased edges) then composite at the
// intended alpha instead of bleeding through at full RGB intensity.
const BYPASS_FRAG = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    vec4 c = texture(src, uvSrc);
    outColor = vec4(c.rgb * c.a, c.a);
}
`;

// Sort direction → shader (axis, direction) uniforms.
// axis 0 = horizontal scan, 1 = vertical scan; direction picks which end of
// each segment the bright pixels gather toward.
const DIRECTIONS = {
    right: { axis: 0, direction: 0 },
    left: { axis: 0, direction: 1 },
    down: { axis: 1, direction: 1 },
    up: { axis: 1, direction: 0 },
} as const;

export type PixelSortDirection = "up" | "down" | "left" | "right";
export type PixelSortKey = "luminance" | "r" | "g" | "b" | "hue" | "saturation";

const KEY_MODE: Record<PixelSortKey, number> = {
    luminance: 0,
    r: 1,
    g: 2,
    b: 3,
    hue: 4,
    saturation: 5,
};

export type PixelSortParams = {
    /** Sort cutoff in [0,1]. Pixels with `key` ≤ threshold pass through. */
    threshold: number;
    /** Sort-axis resolution of the rank/gather buffers. */
    lowDim: number;
    /** Channel ranked within each bright run. */
    key: PixelSortKey;
    /** Which end of a run the bright pixels gather toward. */
    direction: PixelSortDirection;
    /** Skip the sort and pass the source through (premultiplied). */
    bypass: boolean;
};

const DEFAULT_PARAMS: PixelSortParams = {
    threshold: 0,
    lowDim: 128,
    key: "luminance",
    direction: "up",
    bypass: false,
};

export class PixelSortEffect implements Effect {
    params: PixelSortParams;

    #lowRT: EffectRenderTarget | null = null;
    #rankRT: EffectRenderTarget | null = null;
    #w = 0;
    #h = 0;
    #lowW = 0;
    #lowH = 0;

    constructor(initial: Partial<PixelSortParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(partial: Partial<PixelSortParams>): void {
        Object.assign(this.params, partial);
    }

    #ensureSize(ctx: EffectContext): void {
        const [w, h] = ctx.dims.elementPixel;
        const { axis } = DIRECTIONS[this.params.direction];
        const low = this.params.lowDim;
        const lowW = axis === 0 ? low : w;
        const lowH = axis === 0 ? h : low;
        if (
            this.#w === w &&
            this.#h === h &&
            this.#lowW === lowW &&
            this.#lowH === lowH
        ) {
            return;
        }
        this.#lowRT?.dispose();
        this.#rankRT?.dispose();
        this.#w = w;
        this.#h = h;
        this.#lowW = lowW;
        this.#lowH = lowH;
        this.#lowRT = ctx.createRenderTarget({
            size: [lowW, lowH],
            filter: "nearest",
        });
        this.#rankRT = ctx.createRenderTarget({
            size: [lowW, lowH],
            filter: "nearest",
            float: true,
        });
    }

    render(ctx: EffectContext): void {
        this.#ensureSize(ctx);
        if (this.params.bypass || !this.#lowRT || !this.#rankRT) {
            ctx.draw({
                frag: BYPASS_FRAG,
                uniforms: { src: ctx.src },
                target: ctx.target,
            });
            return;
        }
        const { axis, direction } = DIRECTIONS[this.params.direction];
        const lowSize = [this.#lowW, this.#lowH];
        const { threshold } = this.params;
        const keyMode = KEY_MODE[this.params.key];
        ctx.draw({
            frag: FRAG_DOWNSAMPLE,
            uniforms: { src: ctx.src },
            target: this.#lowRT,
        });
        ctx.draw({
            frag: FRAG_RANK,
            uniforms: {
                src: this.#lowRT,
                srcSize: lowSize,
                threshold,
                keyMode,
                direction,
                axis,
            },
            target: this.#rankRT,
        });
        ctx.draw({
            frag: FRAG_GATHER,
            uniforms: {
                src: this.#lowRT,
                srcHi: ctx.src,
                rankTex: this.#rankRT,
                lowSize,
                threshold,
                keyMode,
                axis,
            },
            target: ctx.target,
        });
    }

    dispose(): void {
        this.#lowRT?.dispose();
        this.#rankRT?.dispose();
        this.#lowRT = null;
        this.#rankRT = null;
        this.#w = 0;
        this.#h = 0;
        this.#lowW = 0;
        this.#lowH = 0;
    }
}
