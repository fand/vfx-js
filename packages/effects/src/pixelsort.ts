// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
// Threshold pixel sort: 3-pass (downsample → rank → gather). Scans each
// row/column for runs brighter than `threshold` and reorders them by `key`.
import type {
    Effect,
    EffectContext,
    EffectRenderTarget,
    EffectTexture,
} from "@vfx-js/core";

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

// A pixel takes part in a sort run when it is inside the source AND its key
// clears the threshold. The compare is >= so threshold == 0 keeps every pixel
// (key is always >= 0), sorting the whole source instead of dropping pure-black
// pixels. \`masked\` marks the rotated path, where alpha = 0 padding fills the
// bounding box outside the source; that padding bounds the run regardless of
// threshold, which is what lets the >= compare include every source pixel
// without bleeding the sort into the padding.
bool isActive(vec4 c, int keyMode, float threshold, int masked) {
    if (masked == 1 && c.a < 0.5) return false;
    return key(c.rgb, keyMode) >= threshold;
}
`;

const SEGMENT_SCAN = `
ivec2 toXY(int a, int b, int axis) { return axis == 0 ? ivec2(a, b) : ivec2(b, a); }

void scanSegment(sampler2D s, int a, int b, int L, int keyMode, float threshold, int axis, int masked, out int segStart, out int segEnd) {
    segStart = a;
    for (int i = 0; i < 8192; i++) {
        if (segStart <= 0) break;
        if (i >= L) break;
        vec4 c = texelFetch(s, toXY(segStart - 1, b, axis), 0);
        if (!isActive(c, keyMode, threshold, masked)) break;
        segStart--;
    }
    segEnd = a + 1;
    for (int i = 0; i < 8192; i++) {
        if (segEnd >= L) break;
        if (i >= L) break;
        vec4 c = texelFetch(s, toXY(segEnd, b, axis), 0);
        if (!isActive(c, keyMode, threshold, masked)) break;
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
uniform int masked;
${KEY_FUNC}
${SEGMENT_SCAN}
void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int a = axis == 0 ? p.x : p.y;
    int b = axis == 0 ? p.y : p.x;
    int L = int(axis == 0 ? srcSize.x : srcSize.y);
    vec4 self = texelFetch(src, p, 0);
    float myKey = key(self.rgb, keyMode);
    if (!isActive(self, keyMode, threshold, masked)) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    int segStart, segEnd;
    scanSegment(src, a, b, L, keyMode, threshold, axis, masked, segStart, segEnd);
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
uniform int masked;
${KEY_FUNC}
${SEGMENT_SCAN}
void main() {
    int lowA = axis == 0 ? int(uvSrc.x * lowSize.x) : int(uvSrc.y * lowSize.y);
    int b    = axis == 0 ? int(uvSrc.y * lowSize.y) : int(uvSrc.x * lowSize.x);
    int L    = int(axis == 0 ? lowSize.x : lowSize.y);
    ivec2 lowP = toXY(lowA, b, axis);
    vec4 self = texelFetch(src, lowP, 0);
    float myKey = key(self.rgb, keyMode);
    if (!isActive(self, keyMode, threshold, masked)) {
        // padding / below-threshold pixels skip the low-res buffer entirely.
        vec4 c = texture(srcHi, uvSrc);
        outColor = vec4(c.rgb * c.a, c.a);
        return;
    }
    int segStart, segEnd;
    scanSegment(src, lowA, b, L, keyMode, threshold, axis, masked, segStart, segEnd);
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

// Rotate the source into the centre of a bounding-box buffer so the sort
// axis can run at an arbitrary `angle`. Rotation is done in pixel space
// (uv × size) so non-square inputs keep their aspect ratio. Pixels outside
// the source map to 0 (transparent black, key 0 → never sorted), isolating
// the input run-by-run. `rot` is [cos(angle), sin(angle)].
const ROTATE_IN = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 srcSize;
uniform vec2 boxSize;
uniform vec2 rot;
void main() {
    vec2 dBox = uv * boxSize - boxSize * 0.5;
    vec2 dSrc = vec2(
        rot.x * dBox.x + rot.y * dBox.y,
        -rot.y * dBox.x + rot.x * dBox.y
    );
    vec2 uvS = (dSrc + srcSize * 0.5) / srcSize;
    if (uvS.x < 0.0 || uvS.x > 1.0 || uvS.y < 0.0 || uvS.y > 1.0) {
        outColor = vec4(0.0);
        return;
    }
    outColor = texture(src, srcRectUv.xy + uvS * srcRectUv.zw);
}
`;

// Inverse of ROTATE_IN: for each output pixel, sample the sorted bounding-box
// buffer at the rotated location, restoring the original orientation. `src`
// is already premultiplied, so it composites as-is.
const ROTATE_OUT = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 srcSize;
uniform vec2 boxSize;
uniform vec2 rot;
void main() {
    vec2 dSrc = uvContent * srcSize - srcSize * 0.5;
    vec2 dBox = vec2(
        rot.x * dSrc.x - rot.y * dSrc.y,
        rot.y * dSrc.x + rot.x * dSrc.y
    );
    vec2 uvB = (dBox + boxSize * 0.5) / boxSize;
    outColor = texture(src, uvB);
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
    /**
     * Sort axis rotation in degrees. Non-zero wraps the sort in a
     * rotate-in / rotate-out pass pair so the streaks run at any angle.
     */
    angle: number;
    /** Skip the sort and pass the source through (premultiplied). */
    bypass: boolean;
};

const DEFAULT_PARAMS: PixelSortParams = {
    threshold: 0,
    lowDim: 128,
    key: "luminance",
    direction: "up",
    angle: 0,
    bypass: false,
};

/**
 * Threshold-based pixel sort. Scans each row/column for runs of pixels
 * brighter than `threshold` and reorders the run by `key`. Set `angle` to
 * sort along an arbitrary direction. Mutate `params` directly or via
 * `setParams`.
 *
 * Ported from "20170723_pixelSorter" by FMS_Cat:
 * https://www.shadertoy.com/view/XsBfRG
 */
export class PixelSortEffect implements Effect {
    params: PixelSortParams;

    #lowRT: EffectRenderTarget | null = null;
    #rankRT: EffectRenderTarget | null = null;
    // Bounding-box buffers, allocated only while `angle` is non-zero.
    #rotRT: EffectRenderTarget | null = null;
    #sortedRT: EffectRenderTarget | null = null;
    #w = 0;
    #h = 0;
    #angle = 0;
    #bw = 0;
    #bh = 0;
    #lowW = 0;
    #lowH = 0;

    constructor(initial: Partial<PixelSortParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(partial: Partial<PixelSortParams>): void {
        Object.assign(this.params, partial);
    }

    #disposeTargets(): void {
        this.#lowRT?.dispose();
        this.#rankRT?.dispose();
        this.#rotRT?.dispose();
        this.#sortedRT?.dispose();
        this.#lowRT = null;
        this.#rankRT = null;
        this.#rotRT = null;
        this.#sortedRT = null;
    }

    #ensureSize(ctx: EffectContext): void {
        const [w, h] = ctx.dims.elementPixel;
        const { axis } = DIRECTIONS[this.params.direction];
        const { angle } = this.params;
        const low = this.params.lowDim;
        // Bounding box that fully contains the input rotated by `angle`.
        let bw = w;
        let bh = h;
        if (angle !== 0) {
            const r = (angle * Math.PI) / 180;
            const c = Math.abs(Math.cos(r));
            const s = Math.abs(Math.sin(r));
            bw = Math.ceil(w * c + h * s);
            bh = Math.ceil(w * s + h * c);
        }
        const lowW = axis === 0 ? low : bw;
        const lowH = axis === 0 ? bh : low;
        if (
            this.#w === w &&
            this.#h === h &&
            this.#angle === angle &&
            this.#lowW === lowW &&
            this.#lowH === lowH
        ) {
            return;
        }
        this.#disposeTargets();
        this.#w = w;
        this.#h = h;
        this.#angle = angle;
        this.#bw = bw;
        this.#bh = bh;
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
        if (angle !== 0) {
            this.#rotRT = ctx.createRenderTarget({ size: [bw, bh] });
            this.#sortedRT = ctx.createRenderTarget({ size: [bw, bh] });
        }
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
        const [w, h] = ctx.dims.elementPixel;

        // angle != 0 → rotate the input into a bounding-box buffer, sort
        // there, then rotate the result back. The sort passes are identical
        // either way; only their source/target buffers change.
        const rotRT = this.#rotRT;
        const sortedRT = this.#sortedRT;
        const rotated =
            this.params.angle !== 0 && rotRT !== null && sortedRT !== null;
        let sortSrc: EffectTexture | EffectRenderTarget = ctx.src;
        let sortHi: EffectTexture | EffectRenderTarget = ctx.src;
        let sortTarget = ctx.target;
        let rot = [1, 0];
        let boxSize = [w, h];
        if (rotated) {
            // Negate so positive `angle` tilts the streaks clockwise on
            // screen: rotate-in maps by -angle, rotate-out by +angle.
            const r = (-this.params.angle * Math.PI) / 180;
            rot = [Math.cos(r), Math.sin(r)];
            boxSize = [this.#bw, this.#bh];
            ctx.draw({
                frag: ROTATE_IN,
                uniforms: { src: ctx.src, srcSize: [w, h], boxSize, rot },
                target: rotRT,
            });
            sortSrc = rotRT;
            sortHi = rotRT;
            sortTarget = sortedRT;
        }

        ctx.draw({
            frag: FRAG_DOWNSAMPLE,
            uniforms: { src: sortSrc },
            target: this.#lowRT,
        });
        // Rotated path pads the bounding box with alpha 0; the sort masks it
        // out so threshold stays decoupled from the padding boundary.
        const masked = rotated ? 1 : 0;
        ctx.draw({
            frag: FRAG_RANK,
            uniforms: {
                src: this.#lowRT,
                srcSize: lowSize,
                threshold,
                keyMode,
                direction,
                axis,
                masked,
            },
            target: this.#rankRT,
        });
        ctx.draw({
            frag: FRAG_GATHER,
            uniforms: {
                src: this.#lowRT,
                srcHi: sortHi,
                rankTex: this.#rankRT,
                lowSize,
                threshold,
                keyMode,
                axis,
                masked,
            },
            target: sortTarget,
        });

        if (rotated) {
            ctx.draw({
                frag: ROTATE_OUT,
                uniforms: { src: sortedRT, srcSize: [w, h], boxSize, rot },
                target: ctx.target,
            });
        }
    }

    dispose(): void {
        this.#disposeTargets();
        this.#w = 0;
        this.#h = 0;
        this.#angle = 0;
        this.#bw = 0;
        this.#bh = 0;
        this.#lowW = 0;
        this.#lowH = 0;
    }
}
