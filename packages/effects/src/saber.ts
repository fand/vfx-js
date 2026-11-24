// Finds the outline once and caches it: distance and normal to the nearest contour point.
// Each frame, pushes the outline along its normal by noise to draw thin lines, then blurs them into the glow.
// For the reveal, a traced copy of the outline gives each contour point its position along its loop, and the core pass cuts the lines by it.
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectGeometry,
    EffectRenderTarget,
} from "@vfx-js/core";
import {
    type BloomPyramid,
    createBloomPyramid,
    disposeBloomPyramid,
    upsampleBloomPyramid,
} from "./_bloom-common.js";
import { type Contour, traceContours } from "./_contour.js";
import { parseHexColor } from "./_figma-common.js";
import { SNOISE3D } from "./_noise.js";
import { padOutputRect } from "./_pad.js";
import { FRAG_SABER_PYRAMID_DOWNSAMPLE } from "./_saber-blur.js";
import { GLSL_LINE_COVERAGE } from "./_saber-coverage.js";
import { saberFlickerGain } from "./_saber-flicker.js";
import {
    DEFAULT_DISTORTION,
    GLSL_SABER_LAYERS,
    GLSL_SABER_SAMPLE,
    type SaberDistortionParams,
    type SaberGlowLayer,
    type SaberGlowLayers,
    SaberGlowPasses,
} from "./_saber-glow.js";
import { SABER_PRESETS, type SaberPresetName } from "./saber-presets.js";

export type { SaberDistortionParams, SaberGlowLayer } from "./_saber-glow.js";

// Edge value of the source, zero outside the valid src rect.
const GLSL_MASK = `
uniform sampler2D src;
uniform int edgeMode;
uniform float edgeThreshold;
uniform vec2 maskFilterStep;

float alphaAt(vec2 p) {
    vec2 inside = step(vec2(0.0), p) * step(p, vec2(1.0));
    return texture(src, clamp(p, 0.0, 1.0)).a * inside.x * inside.y;
}

float filteredAlpha(vec2 p) {
    if (maskFilterStep.x + maskFilterStep.y == 0.0) return alphaAt(p);
    // Area prefilter only when the source is minified. Four bilinear samples
    // cover a 2x2 or 4x4 source footprint without an extra render pass.
    vec2 d = maskFilterStep * 0.25;
    return (alphaAt(p + d) + alphaAt(p - d)
        + alphaAt(p + vec2(d.x, -d.y)) + alphaAt(p + vec2(-d.x, d.y))) * 0.25;
}

float lumaAt(vec2 p) {
    vec2 inside = step(vec2(0.0), p) * step(p, vec2(1.0));
    vec3 c = texture(src, clamp(p, 0.0, 1.0)).rgb;
    return dot(c, vec3(0.299, 0.587, 0.114)) * inside.x * inside.y;
}

float maskAt(vec2 p) {
    if (edgeMode == 1) {
        // Blur photos a little, so texture noise does not make tiny contours.
        vec2 t = 1.5 / vec2(textureSize(src, 0));
        float m = lumaAt(p) * 0.2;
        m += (lumaAt(p + vec2(t.x, t.y)) + lumaAt(p + vec2(-t.x, t.y))
            + lumaAt(p + vec2(t.x, -t.y)) + lumaAt(p - t)) * 0.1;
        m += (lumaAt(p + vec2(2.0 * t.x, 0.0)) + lumaAt(p - vec2(2.0 * t.x, 0.0))
            + lumaAt(p + vec2(0.0, 2.0 * t.y)) + lumaAt(p - vec2(0.0, 2.0 * t.y))) * 0.1;
        return m - max(edgeThreshold, 1e-6);
    }
    // Threshold zero includes nonzero coverage, not the transparent padding.
    return filteredAlpha(p) - max(edgeThreshold, 1e-6);
}
`;

// Marks texels next to a threshold crossing.
// Stores the px offset from the texel centre to the contour point.
// With the reveal on, it also stores the arc position from the nearest traced point.
const FRAG_SEED = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D payload;
uniform int payloadOn;
${GLSL_MASK}

// Arc position and 1 + loop length of the nearest traced point within 4 texels.
// The wide search also catches points traced a few frames ago on a moving source.
// Without one, the length part is 1, which reads as a miss.
vec2 nearestPayload() {
    vec2 best = vec2(0.0, 1.0);
    if (payloadOn == 0) {
        return best;
    }
    ivec2 p = ivec2(gl_FragCoord.xy);
    ivec2 size = textureSize(payload, 0);
    int bestDist = 100;
    for (int y = -4; y <= 4; y++) {
        for (int x = -4; x <= 4; x++) {
            ivec2 q = p + ivec2(x, y);
            if (any(lessThan(q, ivec2(0))) || any(greaterThanEqual(q, size))) {
                continue;
            }
            vec4 s = texelFetch(payload, q, 0);
            int dist = x * x + y * y;
            if (s.a > 0.0 && dist < bestDist) {
                bestDist = dist;
                best = vec2(s.r, 1.0 + s.g);
            }
        }
    }
    return best;
}

// Signed offset to the crossing towards each neighbour; 2 when there is none.
float crossing(float m, float a, float b) {
    float toA = (m >= 0.0) != (a >= 0.0) ? -m / (m - a) : 2.0;
    float toB = (m >= 0.0) != (b >= 0.0) ? m / (m - b) : 2.0;
    return abs(toA) < abs(toB) ? toA : toB;
}

void main() {
    vec2 dx = dFdx(uvSrc);
    vec2 dy = dFdy(uvSrc);
    float m = maskAt(uvSrc);
    vec4 neighbors = vec4(maskAt(uvSrc - dx), maskAt(uvSrc + dx),
        maskAt(uvSrc - dy), maskAt(uvSrc + dy));
    float ox = crossing(m, neighbors.x, neighbors.y);
    float oy = crossing(m, neighbors.z, neighbors.w);
    bool hasX = abs(ox) <= 1.0;
    bool hasY = abs(oy) <= 1.0;
    if (!hasX && !hasY) {
        outColor = vec4(0.0);
        return;
    }
    // Nearest point on the straight line through both axis crossings.
    vec2 o = vec2(ox, oy);
    o = sign(o + 1e-9) * max(abs(o), vec2(1e-4));
    vec2 inv = vec2(hasX ? 1.0 / o.x : 0.0, hasY ? 1.0 / o.y : 0.0);
    vec2 offset = inv / dot(inv, inv);
    if (hasX != hasY) {
        // One crossing alone sits on a pixel axis, not at the closest point.
        // Project it along the local mask normal to reduce oblique-edge scallops.
        vec2 grad = vec2(neighbors.y - neighbors.x, neighbors.w - neighbors.z);
        float grad2 = dot(grad, grad);
        // A one-pixel stroke can have two opposing crossings and no gradient.
        if (grad2 > 1e-8) offset = grad * dot(offset, grad) / grad2;
    }
    outColor = vec4(offset, nearestPayload());
}
`;

// One jump flood step: keep the nearest contour point among 9 neighbours.
const FRAG_JFA = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D seed;
uniform int stepSize;

void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    ivec2 size = textureSize(seed, 0);
    vec4 best = vec4(0.0);
    float bestLen = 1e20;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            ivec2 delta = ivec2(x, y) * stepSize;
            ivec2 q = p + delta;
            if (any(lessThan(q, ivec2(0))) || any(greaterThanEqual(q, size))) {
                continue;
            }
            vec4 s = texelFetch(seed, q, 0);
            if (s.a == 0.0) {
                continue;
            }
            vec2 candidate = s.rg + vec2(delta);
            float len = dot(candidate, candidate);
            if (len < bestLen) {
                bestLen = len;
                best = vec4(candidate, s.ba);
            }
        }
    }
    outColor = best;
}
`;

// Signed distance in px (negative inside), outward normal, valid flag.
const FRAG_RESOLVE = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D seed;
${GLSL_MASK}

void main() {
    vec2 dx = dFdx(uvSrc);
    vec2 dy = dFdy(uvSrc);
    vec4 s = texelFetch(seed, ivec2(gl_FragCoord.xy), 0);
    if (s.a == 0.0) {
        outColor = vec4(0.0);
        return;
    }
    float side = maskAt(uvSrc) >= 0.0 ? -1.0 : 1.0;
    float d = length(s.rg);
    vec2 n;
    if (d > 1e-3) {
        n = -side * s.rg / d;
    } else {
        // On the contour: use the mask gradient instead.
        vec2 grad = vec2(
            maskAt(uvSrc + dx) - maskAt(uvSrc - dx),
            maskAt(uvSrc + dy) - maskAt(uvSrc - dy)
        );
        float len = length(grad);
        n = len > 0.0 ? -grad / len : vec2(0.0);
    }
    outColor = vec4(side * d, n, 1.0);
}
`;

// Arc position and loop length of the nearest contour point, for the reveal.
const FRAG_ARC = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D seed;

void main() {
    vec4 s = texelFetch(seed, ivec2(gl_FragCoord.xy), 0);
    outColor = vec4(s.b, max(s.a - 1.0, 0.0), 0.0, 1.0);
}
`;

// Traced contour points, splatted as single texels into the payload target.
const VERT_SPLAT = `#version 300 es
precision highp float;
in vec4 position;
uniform vec4 outputRect;
out vec2 arc;

void main() {
    arc = position.zw;
    gl_Position = vec4((position.xy - outputRect.xy) / outputRect.zw * 2.0 - 1.0, 0.0, 1.0);
    gl_PointSize = 1.0;
}
`;

const FRAG_SPLAT = `#version 300 es
precision highp float;
in vec2 arc;
out vec4 outColor;

void main() {
    outColor = vec4(arc, 0.0, 1.0);
}
`;

// Edge mask for the contour tracer, from the same edge value as the seed pass.
const FRAG_TRACE_MASK = `#version 300 es
precision highp float;
uniform vec2 maskSize;
out vec4 outColor;
${GLSL_MASK}

void main() {
    outColor = vec4(maskAt(gl_FragCoord.xy / maskSize) >= 0.0 ? 1.0 : 0.0, 0.0, 0.0, 1.0);
}
`;

// Room for the line on each side of the contour: how far it may move along the normal
// before it meets the line from the other side of a stroke or gap.
// Marches from the contour point; past the middle the field reports a nearer contour.
const FRAG_ROOM = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D field;
uniform float maxRoom;
uniform float pixelRatio;

float march(vec2 q, vec2 dir, float side, vec2 size) {
    float best = maxRoom;
    for (int k = 1; k <= 12; k++) {
        float s = maxRoom * float(k) / 12.0;
        vec2 x = q + dir * s;
        if (any(lessThan(x, vec2(0.0))) || any(greaterThan(x, size))) {
            break;
        }
        vec4 f = texture(field, x / size);
        float overshoot = s - side * f.r;
        if (f.a > 0.5 && overshoot > 0.0) {
            best = min(best, s - overshoot * 0.5);
        }
    }
    return max(best, 0.0);
}

void main() {
    vec2 size = vec2(textureSize(field, 0));
    vec4 f = texelFetch(field, ivec2(gl_FragCoord.xy), 0);
    // A separable 4 CSS px blur reaches sqrt(4²+4²) from the contour.
    if (f.a < 0.5 || abs(f.r) > 6.0 * pixelRatio) {
        outColor = vec4(maxRoom, maxRoom, 0.0, 1.0);
        return;
    }
    vec2 q = gl_FragCoord.xy - f.r * f.gb;
    outColor = vec4(march(q, f.gb, 1.0, size), march(q, -f.gb, -1.0, size), 0.0, 1.0);
}
`;

// Box blur along one axis, to smooth the room along the contour.
const FRAG_ROOM_BLUR = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 dir;
uniform float pixelRatio;

void main() {
    vec2 p = gl_FragCoord.xy;
    vec2 size = vec2(textureSize(src, 0));
    vec4 sum = vec4(0.0);
    for (int i = -4; i <= 4; i++) {
        sum += texture(src, (p + dir * float(i) * pixelRatio) / size);
    }
    outColor = sum / 9.0;
}
`;

// Noise for the lines.
// `jag` is value noise on a lattice; sharpness 1 interpolates linearly,
// so a line runs straight inside a cell and kinks at cell edges.
const GLSL_JAG = `
${SNOISE3D}

uniform float sharpness;
uniform float minCell;

// Finer octaves move only a little faster than coarse ones.
const float OCTAVE_PACE = 1.2;
const vec2 DRIFT = vec2(0.3, 0.12);

float hash(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z) * 2.0 - 1.0;
}

// One lattice corner, moving smoothly through time.
// Two random values are crossfaded with cos and sin weights, so the spread stays the same mid-way.
// Each corner has its own phase, so the corners never change in step.
float corner(vec2 i, float t) {
    float z = t + hash(vec3(i, 7.7)) * 0.5 + 0.5;
    float zi = floor(z);
    float phase = z - zi;
    // Zero endpoint velocity avoids a sudden direction change at each new key.
    float angle = phase * phase * (3.0 - 2.0 * phase) * 1.5707963;
    return hash(vec3(i, zi)) * cos(angle) + hash(vec3(i, zi + 1.0)) * sin(angle);
}

float lattice(vec3 p, float sharp) {
    vec2 i = floor(p.xy);
    vec2 f = p.xy - i;
    vec2 smoothF = f * f * (3.0 - 2.0 * f);
    vec2 w = mix(smoothF, f, sharp);
    vec2 e = vec2(1.0, 0.0);
    float a = mix(corner(i, p.z), corner(i + e.xy, p.z), w.x);
    float b = mix(corner(i + e.yx, p.z), corner(i + e.xx, p.z), w.x);
    return mix(a, b, w.y);
}

// Octaves halve both the cell and the amplitude, so the slope is the same at every scale.
// That gives straight runs with sharp kinks, like midpoint displacement.
// Octaves finer than minCell fade out, so the line does not turn to fur.
float jag(vec2 x, float t, float cell, float sharp) {
    const mat2 turn = mat2(0.8, 0.6, -0.6, 0.8);
    vec2 p = x / cell;
    float sum = 0.0;
    float amp = 1.0;
    for (int i = 0; i < 6; i++) {
        float fade = clamp(log2(cell / minCell) + 1.0, 0.0, 1.0);
        if (fade <= 0.0) {
            break;
        }
        // A slow slide on top of the morph, so kinks crawl along the outline.
        sum += lattice(vec3(p + DRIFT * t, t), sharp) * amp * fade;
        p = turn * p * 2.0 + 17.1;
        t = t * OCTAVE_PACE + 3.7;
        cell *= 0.5;
        amp *= 0.5;
    }
    return clamp(sum * 0.7, -1.0, 1.0);
}
`;

// Core lines: the contour pushed along its normal by noise.
// Line 0 is a calm main line; the others are arcs that come and go.
// Writes one HDR intensity channel.
const FRAG_CORE = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform vec2 contentSize;
uniform sampler2D field;
uniform sampler2D roomTex;
uniform float amplitude;
uniform float mainAmplitude;
uniform float scale;
uniform float thickness;
uniform float time;
uniform float burst;
uniform float flicker;
uniform float pixelRatio;
uniform int lines;
uniform sampler2D arcTex;
uniform int reveal;
uniform float revealStart;
uniform float revealEnd;
uniform float segments;
uniform float fade;
uniform float variation;
${GLSL_JAG}
${GLSL_LINE_COVERAGE}

// Main line noise cell, as a share of scale.
const float MAIN_CELL = 0.3;
// Per line: reach as a share of amplitude, width as a share of thickness, and brightness.
const float TIER_REACH[4] = float[4](0.0, 0.6, 0.8, 1.0);
// Furthest any tier can reach, as a share of amplitude, with variation at most.
const float MAX_REACH = 1.5;
const float TIER_WIDTH[4] = float[4](1.0, 0.6, 0.45, 0.35);
const float TIER_WEIGHT[4] = float[4](1.0, 0.6, 0.8, 0.6);
// How much faster each tier's shape changes than the one before.
const float TIER_PACE = 1.5;
// Within this much of zero the noise keeps a line on the main line, so it sprouts in short arcs.
const float PLUCK[4] = float[4](0.0, 0.06, 0.06, 0.06);
// Mild preference for arcs on the outside.
const float OUTWARD_BIAS = 0.15;
// Noise cell and pace of the companion line.
const float COMPANION_CELL = 0.35;
const float COMPANION_PACE = 2.5;
// Reach of the companion line outside the active spots, as a share of its reach.
const float COMPANION_CALM = 0.3;
// Each tier's noise cell is this many times finer than the one before.
const float TIER_CELL_STEP = 1.8;
const float CURL_SHARPNESS = 0.4;
// Size of the stretches that vary in brightness and reach, in units of scale.
const float VARY_SIZE = 5.0;
// Size of the active spots, in units of scale.
const float ACTIVITY_SIZE = 3.0;
const float TOWARDS_PIXEL = 0.6;
const float SNAPS_PER_SECOND = 16.0;
// Length of the soft cut at each end of the reveal, and of the bright head, in CSS px.
const float CUT_SOFTNESS = 3.0;
const float HEAD_LENGTH = 12.0;
const float HEAD_GAIN = 1.5;
// Shortest reveal segment, in CSS px.
const float MIN_SEGMENT = 160.0;
// Noise time per second at speed 1.
const float PACE = 4.0;

// Where the lines are active along the outline, 0..1.
// Spots come and go and wander along the outline; burst makes them sparse.
float activity(vec2 q, float t, float seed) {
    vec2 drift = vec2(0.12, 0.05) * t;
    float n = snoise(vec3(q / (scale * ACTIVITY_SIZE) + drift + seed, t * 0.3)) * 0.5 + 0.5;
    float low = burst * 0.7;
    return smoothstep(low, low + 0.2, n);
}

// Slow variation along the outline, -1..1, for brightness, width and reach.
float vary(vec2 q, float t, float seed) {
    return snoise(vec3(q / (scale * VARY_SIZE) + seed * 13.1, t * 0.15 + seed));
}

// Arc that leaves the main line to the side of the noise's sign and returns to it.
// While the noise is within the threshold of zero the line lies on the main line, so it never crosses as one wave.
float pluck(float noise, float threshold) {
    return sign(noise) * max(abs(noise) - threshold, 0.0) / (1.0 - threshold);
}

// Keep the displacement inside the room on each side of the contour.
// Past the limit the line folds back, so it bounces off with a kink instead of running flat.
// Squeeze first when the room is tight, so it folds at most once.
float fit(float disp, float lineAmp, vec2 room) {
    float limit = min((disp > 0.0 ? room.x : room.y) * 0.9, lineAmp) + 1e-3;
    float t = abs(disp) / limit * min(1.0, 2.0 * limit / max(lineAmp, 1e-3));
    return sign(disp) * limit * (1.0 - abs(1.0 - min(t, 2.0)));
}

void main() {
    // Decide per 2x2 quad, so derivatives stay valid in drawn quads.
    vec4 quad = texelFetch(field, ivec2(gl_FragCoord.xy) & ~1, 0);
    float reach = max(lines > 1 ? amplitude * MAX_REACH : 0.0, mainAmplitude);
    if (quad.a < 0.5 || abs(quad.r) > reach + thickness + 4.0) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    vec2 size = vec2(textureSize(field, 0));
    vec4 f = texelFetch(field, ivec2(gl_FragCoord.xy), 0);
    float d = f.r;
    vec2 n = f.gb;
    vec2 q = gl_FragCoord.xy - d * n;
    // Noise lives in element-local coordinates, independent of output padding.
    vec2 origin = gl_FragCoord.xy - uvContent * contentSize;
    vec2 qLocal = q - origin;
    vec2 tangent = vec2(-n.y, n.x);
    vec2 room = vec2(0.0);
    vec2 roomNext = vec2(0.0);
    if (mainAmplitude > 0.0 || lines > 1) {
        room = texture(roomTex, q / size).rg;
        roomNext = texture(roomTex, (q + tangent) / size).rg;
    }

    // Mix smooth time with time that snaps to new shapes.
    float snap = floor(time * SNAPS_PER_SECOND);
    float snapped = snap / SNAPS_PER_SECOND + hash(vec3(snap, 1.7, 9.1)) * 0.5;
    float t = mix(time, snapped, flicker) * PACE;

    // Sample the noise part of the way from q towards the pixel.
    // Round a convex corner q stays put, so this keeps kinks there.
    // It also halves the jitter that per-pixel normal errors put into q.
    vec2 x = qLocal + n * d * TOWARDS_PIXEL;

    // The main line stays on the outline; it kinks by mainAmplitude only in active spots.
    float mainOn = mainAmplitude > 0.0 || lines > 1 || variation > 0.0
        ? activity(qLocal, t, 0.0) : 0.0;
    float mainDisp = 0.0;
    float mainNext = 0.0;
    if (mainAmplitude > 0.0) {
        float mainAmp = mainAmplitude * mainOn;
        float mainCell = scale * MAIN_CELL;
        mainDisp = fit(mainAmp * jag(x, t, mainCell, sharpness), mainAmp, room);
        mainNext = fit(mainAmp * jag(x + tangent, t, mainCell, sharpness), mainAmp, roomNext);
    }

    // Reveal: which part of each loop shows, a long fading tail behind start, and a bright head at end.
    float shown = 1.0;
    float head = 0.0;
    if (reveal == 1) {
        vec2 arc = texelFetch(arcTex, ivec2(q), 0).rg;
        // Split each loop into segments that reveal together; short loops get fewer.
        float count = clamp(floor(arc.y / (MIN_SEGMENT * pixelRatio)), 1.0, segments);
        float along = fract(arc.x * count);
        float segmentLength = arc.y / count;
        float soft = CUT_SOFTNESS * pixelRatio;
        float fromStart = (along - revealStart) * segmentLength;
        float toEnd = (revealEnd - along) * segmentLength;
        // The tail grows with start, so nothing dims while start is still 0.
        float tail = max(soft, min(fade, revealStart * segmentLength));
        shown = smoothstep(0.0, tail, fromStart);
        shown *= revealEnd >= 1.0 ? 1.0 : smoothstep(0.0, soft, toEnd);
        // A loop the tracer missed has no length; hide it rather than show it whole.
        shown *= step(0.5, arc.y);
        // A bright head at the growing end, which fades out as the loop closes.
        float headLength = HEAD_LENGTH * pixelRatio;
        head = exp(-max(toEnd, 0.0) / headLength);
        head *= clamp((1.0 - revealEnd) * segmentLength / headLength, 0.0, 1.0);
    }

    float mainWidth = thickness;
    float mainWeight = 1.0;
    if (variation > 0.0) {
        mainWidth *= 1.0 + variation * 0.35 * vary(qLocal, t, 2.0);
        mainWeight += variation * (0.5 * vary(qLocal, t, 1.0) + 0.8 * mainOn);
    }
    float light = 0.0;
    for (int i = 0; i < 4; i++) {
        if (i >= lines) {
            break;
        }
        float disp = mainDisp;
        float dispNext = mainNext;
        // The main line has hot knots where it is active, and slowly brighter and dimmer stretches.
        float width = mainWidth;
        float weight = mainWeight;
        if (i > 0) {
            float fi = float(i);
            // Each tier reaches further, with finer noise, and is thinner and dimmer.
            float reach = amplitude * TIER_REACH[i] * (1.0 + variation * 0.5 * vary(qLocal, t, 3.0 + fi));
            // The companion line stays close outside the active spots, so the motion stays local.
            reach *= i == 1 ? mix(COMPANION_CALM, 1.0, mainOn) : 1.0;
            // The companion line gets the finest noise, so it kinks often and never runs parallel for long.
            float cell = i == 1 ? scale * COMPANION_CELL : scale * pow(TIER_CELL_STEP, -(fi - 1.0));
            // The finest tier bends smoothly, so it curls rather than kinks.
            float sharp = i == 3 ? sharpness * CURL_SHARPNESS : sharpness;
            // The companion line runs almost all the way round; the wisps only in active spots.
            float own = snoise(vec3(qLocal / (scale * 2.0) + fi * 7.3, t * 0.5)) * 0.5 + 0.5;
            float on = i == 1 ? smoothstep(0.1, 0.3, own) : mainOn * smoothstep(0.35, 0.6, own);
            vec2 xTier = x + fi * vec2(311.7, 173.3) * pixelRatio;
            float tTier = t * (i == 1 ? COMPANION_PACE : 1.0 + (fi - 1.0) * TIER_PACE);
            float tier = fit(reach * pluck(jag(xTier, tTier, cell, sharp) + OUTWARD_BIAS, PLUCK[i]), reach, room);
            float tierNext = fit(reach * pluck(jag(xTier + tangent, tTier, cell, sharp) + OUTWARD_BIAS, PLUCK[i]), reach, roomNext);
            // Tiers leave from the main line and return to it.
            disp = mix(mainDisp, tier, on);
            dispNext = mix(mainNext, tierNext, on);
            // Wisps taper towards their ends.
            width = thickness * TIER_WIDTH[i] * mix(0.4, 1.0, on);
            // Show arcs only where there is room on their side, outside or inside.
            float sideRoom = tier >= 0.0 ? room.x : room.y;
            weight = TIER_WEIGHT[i] * on * smoothstep(2.0, 8.0, sideRoom / pixelRatio);
            // Fade out where the line lies on the main line, so it does not double it.
            weight *= mix(0.3, 1.0, smoothstep(0.5, 3.0, abs(disp - mainDisp) / pixelRatio));
            // Now and then a wisp flares up and dies down.
            float flare = max(vary(qLocal, t * 1.5, 5.0 + fi), 0.0);
            weight *= 1.0 + variation * 2.0 * flare * flare * flare;
            weight *= 1.0 - 0.6 * flicker * (hash(vec3(snap, fi, 4.2)) * 0.5 + 0.5);
        }
        // The fading tail also thins out.
        width *= mix(0.5, 1.0, shown);
        float g = d - disp;
        // Slope of the line along the contour, from one step along the tangent.
        float slope = dispNext - disp;
        float slopeGrad = sqrt(1.0 + slope * slope);
        // Screen derivatives jump where q flips sides across the medial axis.
        // Take the smaller estimate so the jump does not draw a false line.
        vec2 grad = vec2(dFdx(g), dFdy(g));
        float screenGrad = length(grad);
        // An undisplaced core already has a distance field. Dividing it by a
        // finite-difference gradient thins oblique edges and modulates energy.
        bool undisplaced = mainAmplitude == 0.0 && (i == 0 || amplitude == 0.0);
        float dist = abs(g) / (undisplaced ? 1.0 : max(min(screenGrad, slopeGrad), 1e-3));
        vec2 lineNormal = screenGrad > 1e-3 && (undisplaced || screenGrad <= slopeGrad)
            ? grad / screenGrad : (n - tangent * slope) / slopeGrad;
        // A symmetric/quantized mask can have no usable normal. A zero-width
        // pixel footprint would turn a subpixel line into a fully lit pixel.
        if (dot(lineNormal, lineNormal) < 0.25) lineNormal = vec2(1.0, 0.0);
        // Integrate both edges of a thin strip over the pixel. This preserves
        // its energy while it moves between pixels, instead of widening it.
        light += weight * lineCoverage(dist, width, lineNormal);
    }
    light *= shown * (1.0 + HEAD_GAIN * head);
    outColor = vec4(vec3(light), 1.0);
}
`;

// Light = crisp core + blurred glow, burnt to white where it is bright.
// Output is premultiplied; the light adds on top of the source.
const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D core;
uniform sampler2D glowTex;
uniform vec2 glowTexel;
uniform vec3 color;
uniform float coreGain;
#ifdef CORE_TINT
uniform float coreWhiteness;
#endif
uniform float glowGain;
#ifdef HALO
uniform sampler2D haloTex;
uniform float haloGain;
uniform float haloScale;
uniform vec2 haloOutputSize;
#endif
#ifdef CORE_OVERLAY
uniform sampler2D originalCore;
#endif
uniform float glowBias;
uniform int source;
uniform float edgeFade;
uniform float whiteMix;
uniform int linearLight;
uniform int smoothGlow;
#ifdef LAYERED_GLOW
${GLSL_SABER_LAYERS}
#elif defined(HALO)
${GLSL_SABER_SAMPLE}
#endif

float ign(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void main() {
    // 5x5 binomial gaussian from 9 bilinear taps, as in bloom.ts.
    vec2 t = glowTexel;
    float glow = 0.0;
    if (glowGain > 0.0) {
#ifdef LAYERED_GLOW
        glow = sampleLayeredGlow().r;
#else
        if (smoothGlow == 1) {
            glow += texture(glowTex, uv + vec2(-t.x, -t.y)).r * 25.0;
            glow += texture(glowTex, uv + vec2( 0.0, -t.y)).r * 30.0;
            glow += texture(glowTex, uv + vec2( t.x, -t.y)).r * 25.0;
            glow += texture(glowTex, uv + vec2(-t.x,  0.0)).r * 30.0;
            glow += texture(glowTex, uv                  ).r * 36.0;
            glow += texture(glowTex, uv + vec2( t.x,  0.0)).r * 30.0;
            glow += texture(glowTex, uv + vec2(-t.x,  t.y)).r * 25.0;
            glow += texture(glowTex, uv + vec2( 0.0,  t.y)).r * 30.0;
            glow += texture(glowTex, uv + vec2( t.x,  t.y)).r * 25.0;
            glow *= 1.0 / 256.0;
        } else {
            // Layered glow is already reconstructed smoothly at full resolution.
            glow = texture(glowTex, uv).r;
        }
#endif
        // Bias changes the glow profile only. Zero is neutral; positive tightens it.
        glow = min(pow(max(glow, 0.0), exp2(glowBias)), 4096.0);

        // Fade the glow out towards the buffer edge.
        vec2 edgeDist = min(uv, 1.0 - uv) * vec2(textureSize(core, 0));
        if (edgeFade > 0.0) {
            glow *= smoothstep(0.0, edgeFade, min(edgeDist.x, edgeDist.y));
        }
    }

    float coreLight = texture(core, uv).r * coreGain;
#ifdef CORE_OVERLAY
    coreLight = max(coreLight, texture(originalCore, uv).r * coreGain);
#endif
    float glowLight = max(glow, 0.0) * glowGain;
    vec3 glowColor = mix(color, vec3(1.0), whiteMix);
#ifdef CORE_TINT
    vec3 energy = coreLight * mix(color, vec3(1.0), coreWhiteness) + glowLight * glowColor;
#else
    // The default shader retains the original arithmetic, without a tint branch.
    vec3 energy = (coreLight + glowLight) * glowColor;
#endif
    #ifdef HALO
    // Halo is independent of glow tint/bias/distortion and visible-core softness.
    energy += layerAt(haloTex, haloScale, haloOutputSize) * haloGain * color;
#endif
    vec3 rgb = linearLight == 1 ? clamp(energy, 0.0, 1.0) : 1.0 - exp(-energy);
    // Cut the last 8-bit step of the tail, so it ends along the glow, not at the pad edge.
    rgb = max(rgb - 1.0 / 255.0, 0.0) * (255.0 / 254.0);

    // TPDF dither, faded out where there is no light.
    vec2 p = gl_FragCoord.xy;
    vec3 noise = vec3(ign(p), ign(p + 17.0), ign(p + 41.0))
        + vec3(ign(p + 113.0), ign(p + 131.0), ign(p + 149.0)) - 1.0;
    float lightAlpha = max(max(rgb.r, rgb.g), rgb.b);
    rgb = max(rgb + noise / 255.0 * clamp(lightAlpha * 64.0, 0.0, 1.0), 0.0);

    vec4 base = vec4(0.0);
    if (source == 1) {
        vec2 inside = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
        base = texture(src, clamp(uvSrc, 0.0, 1.0)) * inside.x * inside.y;
    }
    float a = clamp(max(base.a, lightAlpha), 0.0, 1.0);
    outColor = vec4(base.rgb + rgb, a);
}
`;

// Optional samplers/branches disappear entirely when their feature is off.
const COMPOSITE_SHADERS = Array.from({ length: 16 }, (_, flags) =>
    FRAG_COMPOSITE.replace(
        "#version 300 es",
        "#version 300 es" +
            ["LAYERED_GLOW", "CORE_TINT", "HALO", "CORE_OVERLAY"]
                .map((name, bit) =>
                    flags & (1 << bit) ? `\n#define ${name}` : "",
                )
                .join(""),
    ),
);

export type SaberParams = {
    /** Light tint, CSS hex. coreWhiteness controls the core's additional white mix. */
    color: string;
    /** Overall brightness of the lines and glow. */
    intensity: number;
    /** Exponential highlight rolloff (default), or linear light clipped to display range. */
    toneMapping: "exponential" | "linear";
    /** Visible core brightness only. 1 preserves the default; 0 hides the core. */
    coreIntensity: number;
    /** Mix the visible core's tint toward white, 0..1. Default 0.15. */
    coreWhiteness: number;
    /** Visible core Gaussian softness in CSS px. 0 bypasses; leaves glow unchanged. */
    coreSoftness: number;
    /** Retain the undistorted outline over the visible distorted core. Default false. */
    coreBlendOnTop: boolean;
    /** Independent warm halo gain. 0 disables its blur and composition. */
    haloIntensity: number;
    /** Independent halo Gaussian radius in CSS px. 0 disables the halo. */
    haloSize: number;
    /** Brightness modulation depth, 0..1. 0 disables; affects core, halo and glow, not source. */
    flickerIntensity: number;
    /** Brightness-noise keyframes per second, independent of speed. 0 freezes. */
    flickerSpeed: number;
    /** Integer seed for brightness flicker, independent of distortion seeds. */
    flickerSeed: number;
    /** Width of the main line in CSS px. The other lines are thinner. */
    thickness: number;
    /** How far the furthest wisps reach from the outline, in CSS px. */
    amplitude: number;
    /** How far the main line moves off the outline, in CSS px. 0 keeps it straight. */
    mainAmplitude: number;
    /** Size of the largest jags, in CSS px. Smaller values give more kinks. */
    scale: number;
    /** 0 = smooth bends, 1 = straight runs with sharp kinks. */
    sharpness: number;
    /**
     * 0 = the main line kinks and the wisps lift off all along the outline.
     * 1 = only in a few spots that wander, with the outline calm elsewhere.
     */
    burst: number;
    /** Animation rate. 0 freezes the lines. */
    speed: number;
    /** 0 = lines flow smoothly, 1 = lines snap to new shapes many times a second. */
    flicker: number;
    /**
     * Number of lines, 1..4: the main line, then a faint companion line, then two tiers of wisps.
     * Each extra line is fainter, thinner and reaches further.
     */
    lines: number;
    /** Glow brightness against the lines. */
    glow: number;
    /** Mix glow toward white independently of the core and colored halo, 0..1. Default 0.15. */
    glowWhiteness: number;
    /** Glow reach, 0..1. Near 0 is a tight halo, near 1 a long soft tail. */
    glowFalloff: number;
    /** `pyramid` keeps the original glow; `layers` uses four independent blurs. */
    glowMode: "pyramid" | "layers";
    /** Four size/intensity pairs for `layers` mode. Each size is in CSS px. */
    glowLayers: [
        SaberGlowLayer,
        SaberGlowLayer,
        SaberGlowLayer,
        SaberGlowLayer,
    ];
    /** Layer radius multiplier, 1 = neutral, 0 = no glow. `layers` mode only. */
    glowSpread: number;
    /** Glow contrast in stops of exponent: pow(glow, 2^bias). 0 = neutral. */
    glowBias: number;
    /** Additional gain on glow only, in both modes. */
    glowIntensityMultiplier: number;
    /** Additional radius multiplier, `layers` mode only. 1 = neutral. */
    glowSizeMultiplier: number;
    /** Apply pow(core, 1/gamma) before blurring; positive, 1 = neutral. */
    glowPreGamma: number;
    /** Directional glow trail in CSS px, following glowDistortion wind. 0 disables. */
    glowFlow: number;
    /** Distort every glow layer instead of protecting wide blur layers. Independent halo stays unchanged. Default false. */
    glowDistortAllLayers: boolean;
    /** Warp/modulate the rendered lines before generating their glow. */
    coreDistortion: SaberDistortionParams;
    /** Warp/modulate glow separately, leaving visible core lines unchanged. */
    glowDistortion: SaberDistortionParams;
    /**
     * What the outline is taken from.
     * `"alpha"` for logos, text and cut-out images; `"luminance"` for photos and video.
     */
    edge: "alpha" | "luminance";
    /** Cutoff on the edge value, 0..1. */
    edgeThreshold: number;
    /** Draw the element under the light. */
    source: boolean;
    /** Rebuild the outline every frame, for video and canvas. */
    dynamic: boolean;
    /**
     * Where the lines start along each outline loop, 0..1.
     * Animate it from 0 to 1 to wipe the outline out.
     */
    start: number;
    /**
     * Where the lines end along each outline loop, 0..1.
     * Animate it from 0 to 1 to draw the outline on.
     */
    end: number;
    /**
     * Number of pieces each outline loop is split into for `start` and `end`, so several heads grow at once.
     * Short loops use fewer. 1 draws each loop from a single point.
     */
    segments: number;
    /**
     * Length of the fading tail behind `start`, in CSS px, so a wipe-out trails off gently.
     * 0 cuts crisply.
     */
    fade: number;
    /**
     * How much the lines vary along the outline and over time, 0..1: brighter knots, flaring wisps, changing reach.
     * 0 looks even everywhere.
     */
    variation: number;
    /**
     * Room for the lines and glow around the element, in CSS px.
     * `"fullscreen"` fills the canvas.
     */
    pad: number | "fullscreen";
};

/** Constructor/setParams options; distortion groups accept partial updates. */
export type SaberOptions = Omit<
    Partial<SaberParams>,
    "coreDistortion" | "glowDistortion"
> & {
    /** Apply a named appearance first, then explicit overrides. Input/reveal/pad are retained. */
    preset?: SaberPresetName;
    coreDistortion?: Partial<SaberDistortionParams>;
    glowDistortion?: Partial<SaberDistortionParams>;
};

// Smallest kink spacing of the lines, in CSS px.
const MIN_CELL = 5;

// Largest room for the line that the field build measures, in CSS px.
const MAX_ROOM = 96;

// Light gain of the core line and the glow, before `intensity`.
const CORE_GAIN = 3;
const GLOW_GAIN = 1;
// Share of white in the light tint; higher burns the core whiter.
const WHITE_MIX = 0.15;

const DEFAULT_PARAMS: SaberParams = {
    color: "#3399ff",
    intensity: 1,
    toneMapping: "exponential",
    coreIntensity: 1,
    coreWhiteness: WHITE_MIX,
    coreSoftness: 0,
    coreBlendOnTop: false,
    haloIntensity: 0,
    haloSize: 8,
    flickerIntensity: 0,
    flickerSpeed: 12,
    flickerSeed: 0,
    thickness: 2,
    amplitude: 32,
    mainAmplitude: 1,
    scale: 24,
    sharpness: 0.8,
    burst: 0.45,
    speed: 1,
    flicker: 0,
    lines: 4,
    glow: 1,
    glowWhiteness: WHITE_MIX,
    glowFalloff: 0.6,
    glowMode: "pyramid",
    glowLayers: [
        { size: 3, intensity: 1 },
        { size: 12, intensity: 0.5 },
        { size: 36, intensity: 0.25 },
        { size: 96, intensity: 0.125 },
    ],
    glowSpread: 1,
    glowBias: 0,
    glowIntensityMultiplier: 1,
    glowSizeMultiplier: 1,
    glowPreGamma: 1,
    glowFlow: 0,
    glowDistortAllLayers: false,
    coreDistortion: { ...DEFAULT_DISTORTION },
    glowDistortion: { ...DEFAULT_DISTORTION, seed: 71 },
    edge: "alpha",
    edgeThreshold: 0.5,
    source: true,
    dynamic: false,
    start: 0,
    end: 1,
    segments: 3,
    fade: 100,
    variation: 0.7,
    pad: 80,
};

/**
 * Electric lines along the outline of an element, with a glow.
 * A bright main line sits on the outline, with a faint companion line beside it.
 * In spots that come and go, thin wisps lift off it and fall back.
 *
 * ```ts
 * vfx.add(img, { effect: new SaberEffect({ color: "#ff7a1a" }) });
 * ```
 *
 * The outline comes from the element's alpha, or its luminance with `edge: "luminance"`.
 * It is computed once and cached.
 * It is computed again when the element's size, `edge` or `edgeThreshold` changes.
 * After `vfx.update()` changes the content but not the size, call {@link SaberEffect.invalidate}.
 * For video, set `dynamic: true` to follow the outline every frame.
 *
 * Animate `end` from 0 to 1 to draw the outline on along each loop, and `start` from 0 to 1 to wipe it out.
 * With `segments`, each loop grows from several points at once, and `fade` makes the wiped-out end trail off gently.
 * The reveal traces the outline on the CPU once, so the lines show a few frames after it is first used.
 *
 * The lines and glow draw outside the element, within `pad` CSS px.
 * Over a white element the lines inside its edge are hard to see; use `source: false` to draw the light only.
 * All params are read every frame, so you can change `params` live.
 *
 * `coreDistortion` and `glowDistortion` have independent wind/noise clocks,
 * unaffected by the legacy line `speed`. Set both `windSpeed` and `noiseSpeed`
 * to 0 to freeze a distortion. Amount 0 skips noise; a nonzero `glowFlow`
 * still transports the glow envelope.
 * `glowMode: "layers"` enables four independently sized glows, unaffected by
 * `pad` except for clipping at the buffer boundary. Allow roughly three times
 * the largest effective radius, plus distortion reach, when choosing `pad`.
 * `glowFalloff` applies only to the original `pyramid` mode.
 * These controls approximate Saber concepts, not its proprietary renderer or units.
 */
export class SaberEffect implements Effect {
    params: SaberParams;

    #seedA: EffectRenderTarget | null = null;
    #seedB: EffectRenderTarget | null = null;
    #field: EffectRenderTarget | null = null;
    #core: EffectRenderTarget | null = null;
    #room: EffectRenderTarget | null = null;
    #roomReady = false;
    #region: EffectGeometry | undefined;
    #regionKey: readonly number[] = [];
    #pyramid: BloomPyramid | null = null;
    #pyramidLevels = 0;
    #glowPasses = new SaberGlowPasses();
    #dirty = true;
    #builtW = 0;
    #builtH = 0;
    #builtEdge: SaberParams["edge"] | null = null;
    #builtThreshold = Number.NaN;
    #builtLayout: readonly (number | string)[] = [];
    #builtGeometry: readonly number[] = [];
    #fieldVersion = 0;
    #coreVersion = 0;
    #coreKey: CacheKey = [];
    #visibleCore: EffectRenderTarget | null = null;
    #visibleCoreVersion = 0;
    #visibleCoreKey: CacheKey = [];
    #coreSoftener = new SaberGlowPasses();
    #originalSoftener = new SaberGlowPasses();
    #haloPasses = new SaberGlowPasses();
    #halo: EffectRenderTarget | null = null;
    #haloKey: CacheKey = [];
    #haloScale = 1;
    #haloWeight = 1;
    #haloOutputSize = [1, 1];
    #softCore: EffectRenderTarget | null = null;
    #softCoreKey: CacheKey = [];
    #softOriginalCore: EffectRenderTarget | null = null;
    #softOriginalCoreKey: CacheKey = [];
    #glowBase: EffectRenderTarget | null = null;
    #glowLayers: SaberGlowLayers | undefined;
    #glowBaseVersion = 0;
    #glowBaseKey: CacheKey = [];
    #glowResult: EffectRenderTarget | null = null;
    #glowResultKey: CacheKey = [];

    // Reveal: traced contours give each contour point its arc position.
    #traceMask: EffectRenderTarget | null = null;
    #payload: EffectRenderTarget | null = null;
    #arc: EffectRenderTarget | null = null;
    #splat: EffectGeometry | null = null;
    #landed: TracedSource | null = null;
    #sourceVersion = 0;
    #traceInFlight = false;
    #traceSerial = 0;
    #traceStale = true;
    #payloadReady = false;
    #fieldHasPayload = false;
    #disposed = false;

    constructor(initial: SaberOptions = {}) {
        this.params = {
            ...DEFAULT_PARAMS,
            coreDistortion: { ...DEFAULT_PARAMS.coreDistortion },
            glowDistortion: { ...DEFAULT_PARAMS.glowDistortion },
            glowLayers: DEFAULT_PARAMS.glowLayers.map((layer) => ({
                ...layer,
            })) as SaberParams["glowLayers"],
        };
        this.setParams(initial);
    }

    setParams(partial: SaberOptions): void {
        const { preset, coreDistortion, glowDistortion, glowLayers, ...rest } =
            partial;
        if (preset !== undefined) {
            if (!Object.hasOwn(SABER_PRESETS, preset)) {
                throw new RangeError(`Unknown Saber preset: ${preset}`);
            }
            this.setParams(SABER_PRESETS[preset]);
        }
        Object.assign(this.params, rest);
        Object.assign(this.params.coreDistortion, coreDistortion);
        Object.assign(this.params.glowDistortion, glowDistortion);
        if (glowLayers) {
            // Preserve live UI bindings while copying caller-owned values.
            glowLayers.forEach((layer, i) => {
                Object.assign(this.params.glowLayers[i], layer);
            });
        }
    }

    /** Compute the outline again on the next frame, after the element's content changed. */
    invalidate(): void {
        this.#dirty = true;
    }

    init(ctx: EffectContext): void {
        this.#disposed = false;
        // Flooding reads texelFetch, so linear filtering is safe. Once the field
        // has been resolved, A holds the cached room and B holds the live core.
        // Reusing these scratch images saves two full-size float buffers.
        this.#seedA = ctx.createRenderTarget({ float: true });
        this.#seedB = ctx.createRenderTarget({ float: true });
        // The host only clears the stage output.
        // So this keeps the field between frames without `persistent`.
        this.#field = ctx.createRenderTarget({ float: true });
        this.#core = this.#seedB;
        this.#roomReady = false;
        this.#dirty = true;
        // Restored targets come back empty, so the cached field must be built again.
        ctx.onContextRestored(() => {
            this.#dirty = true;
        });
    }

    render(ctx: EffectContext): void {
        const field = this.#field;
        const core = this.#core;
        if (!field || !core) {
            return;
        }
        const { edge, edgeThreshold, dynamic, start, end } = this.params;
        const regionChanged = this.#updateRegion(ctx, field);
        // Equal-sized buffers can still have different mappings (notably a
        // moving element with fullscreen padding, or a DPR/layout change).
        const geometry = [
            ...ctx.dims.element,
            ctx.dims.pixelRatio,
            ...ctx.dims.srcRect,
        ];
        const layout = [
            this.params.pad,
            ...(this.params.pad === "fullscreen" ? ctx.dims.canvasRect : []),
        ];
        const geometryChanged =
            this.#dirty ||
            edge !== this.#builtEdge ||
            edgeThreshold !== this.#builtThreshold ||
            geometry.some((value, i) => value !== this.#builtGeometry[i]);
        const sourceChanged =
            geometryChanged ||
            regionChanged ||
            field.width !== this.#builtW ||
            field.height !== this.#builtH ||
            layout.length !== this.#builtLayout.length ||
            layout.some((value, i) => value !== this.#builtLayout[i]);
        if (geometryChanged) {
            // The traced contours no longer match the element.
            this.#sourceVersion++;
            this.#payloadReady = false;
            this.#landed = null;
            this.#traceStale = true;
        } else if (dynamic) {
            this.#traceStale = true;
        }

        const reveal = start > 0 || end < 1;
        let usePayload = false;
        if (reveal) {
            this.#updatePayload(ctx);
            usePayload = this.#payloadReady;
        }
        if (
            sourceChanged ||
            dynamic ||
            (usePayload && !this.#fieldHasPayload)
        ) {
            this.#buildField(ctx, usePayload);
            this.#builtLayout = layout;
            this.#builtGeometry = geometry;
        }
        if (
            !this.#roomReady &&
            (this.params.mainAmplitude > 0 || Math.round(this.params.lines) > 1)
        ) {
            this.#buildRoom(ctx);
        }

        const { pixelRatio } = ctx.dims;
        const {
            amplitude,
            scale,
            sharpness,
            speed,
            thickness,
            burst,
            flicker,
            lines,
        } = this.params;
        const animated =
            this.params.mainAmplitude > 0 ||
            lines > 1 ||
            this.params.variation > 0;
        const coreKey: CacheKey = [
            this.#fieldVersion,
            amplitude,
            scale,
            sharpness,
            thickness,
            burst,
            flicker,
            lines,
            this.params.mainAmplitude,
            this.params.variation,
            animated ? ctx.time * speed : 0,
            reveal,
            usePayload,
            start,
            end,
            this.params.segments,
            this.params.fade,
        ];
        if (!sameKey(coreKey, this.#coreKey)) {
            ctx.draw({
                frag: FRAG_CORE,
                uniforms: {
                    field,
                    roomTex: this.#room ?? field,
                    contentSize: ctx.dims.element.map((x) => x * pixelRatio),
                    amplitude: amplitude * pixelRatio,
                    mainAmplitude:
                        Math.max(this.params.mainAmplitude, 0) * pixelRatio,
                    scale: Math.max(scale, 1e-3) * pixelRatio,
                    thickness: thickness * pixelRatio,
                    minCell: MIN_CELL * pixelRatio,
                    pixelRatio,
                    sharpness,
                    burst,
                    flicker,
                    lines: Math.round(Math.min(Math.max(lines, 1), 4)),
                    time: ctx.time * speed,
                    arcTex: usePayload && this.#arc ? this.#arc : field,
                    reveal: reveal ? 1 : 0,
                    // Until the traced contours land, show nothing rather than the whole outline.
                    revealStart: usePayload ? start : 1,
                    revealEnd: usePayload ? end : 0,
                    segments: Math.max(1, Math.round(this.params.segments)),
                    fade: Math.max(this.params.fade, 0) * pixelRatio,
                    variation: Math.min(Math.max(this.params.variation, 0), 1),
                },
                target: core,
                geometry: this.#region,
            });
            this.#coreKey = coreKey;
            this.#coreVersion++;
        }
        const visibleCoreKey = [
            this.#coreVersion,
            ...distortionKey(this.params.coreDistortion, ctx.time),
        ];
        if (
            !this.#visibleCore ||
            !sameKey(visibleCoreKey, this.#visibleCoreKey)
        ) {
            this.#visibleCore = this.#glowPasses.distort(
                ctx,
                core,
                this.params.coreDistortion,
                "core",
                false,
                this.params.coreDistortion.noiseDetail > 0
                    ? {
                          field,
                          lineWidth:
                              lines === 1 &&
                              this.params.mainAmplitude === 0 &&
                              this.params.variation === 0 &&
                              !reveal
                                  ? thickness
                                  : 0,
                          // Match the conservative support of FRAG_CORE above.
                          reach:
                              Math.max(
                                  lines > 1 ? amplitude * 1.5 : 0,
                                  this.params.mainAmplitude,
                              ) + thickness,
                      }
                    : undefined,
            );
            this.#visibleCoreKey = visibleCoreKey;
            this.#visibleCoreVersion++;
        }
        const visibleCore = this.#visibleCore;
        // Display softness is independent of the sharp light feeding glow.
        const softness = Math.max(0, this.params.coreSoftness);
        let displayedCore = visibleCore;
        let originalCore = core;
        if (softness > 0 && this.params.coreIntensity > 0) {
            const key = [this.#visibleCoreVersion, softness];
            if (!this.#softCore || !sameKey(key, this.#softCoreKey)) {
                this.#softCore = this.#coreSoftener.layers(
                    ctx,
                    visibleCore,
                    [
                        { size: softness, intensity: 1 / softness },
                        { size: 0, intensity: 0 },
                        { size: 0, intensity: 0 },
                        { size: 0, intensity: 0 },
                    ],
                    1,
                    1,
                    48,
                );
                this.#softCoreKey = key;
            }
            displayedCore = this.#softCore;
            if (this.params.coreBlendOnTop) {
                // The retained outline belongs to the same visible core. A
                // sharp bypass here defeats softness and leaves a neon edge.
                if (visibleCore === core) {
                    originalCore = displayedCore;
                } else {
                    const originalKey = [this.#coreVersion, softness];
                    if (
                        !this.#softOriginalCore ||
                        !sameKey(originalKey, this.#softOriginalCoreKey)
                    ) {
                        this.#softOriginalCore = this.#originalSoftener.layers(
                            ctx,
                            core,
                            [
                                { size: softness, intensity: 1 / softness },
                                { size: 0, intensity: 0 },
                                { size: 0, intensity: 0 },
                                { size: 0, intensity: 0 },
                            ],
                            1,
                            1,
                            48,
                        );
                        this.#softOriginalCoreKey = originalKey;
                    }
                    originalCore = this.#softOriginalCore;
                }
            }
        }
        const { color, intensity, glow, source } = this.params;
        const haloSize = Math.max(0, this.params.haloSize);
        const haloEnabled =
            this.params.haloIntensity > 0 && haloSize > 0 && intensity > 0;
        if (haloEnabled) {
            const key = [this.#visibleCoreVersion, haloSize];
            if (!this.#halo || !sameKey(key, this.#haloKey)) {
                const halo = this.#haloPasses.prepareLayers(
                    ctx,
                    visibleCore,
                    [
                        { size: haloSize, intensity: 1 },
                        { size: 0, intensity: 0 },
                        { size: 0, intensity: 0 },
                        { size: 0, intensity: 0 },
                    ],
                    1,
                    1,
                    48,
                );
                this.#halo = halo.layer0;
                this.#haloScale = halo.layerScales[0];
                this.#haloWeight = halo.weights[0];
                this.#haloOutputSize = halo.outputSize;
                this.#haloKey = key;
            }
        }
        const glowEnabled =
            glow > 0 &&
            intensity > 0 &&
            this.params.glowIntensityMultiplier > 0 &&
            (this.params.glowMode === "pyramid" ||
                (this.params.glowSpread > 0 &&
                    this.params.glowSizeMultiplier > 0 &&
                    this.params.glowLayers.some(
                        (layer) => layer.size > 0 && layer.intensity > 0,
                    )));
        let glowTex = visibleCore;
        let glowLayers: SaberGlowLayers | undefined;
        if (glowEnabled) {
            const glowBaseKey: CacheKey = [
                this.#visibleCoreVersion,
                this.params.glowMode,
                this.params.glowPreGamma,
                this.params.glowSpread,
                this.params.glowSizeMultiplier,
                this.params.glowFalloff,
                this.params.pad,
                this.params.glowDistortion.noiseScale,
                this.params.glowDistortAllLayers,
                this.params.glowDistortion.amount > 0 ||
                    this.params.glowFlow > 0,
                ...this.params.glowLayers.flatMap((layer) => [
                    layer.size,
                    layer.intensity,
                ]),
            ];
            if (!this.#glowBase || !sameKey(glowBaseKey, this.#glowBaseKey)) {
                const glowInput = this.#glowPasses.preGamma(
                    ctx,
                    visibleCore,
                    this.params.glowPreGamma,
                );
                if (this.params.glowMode === "layers") {
                    if (this.#pyramid) {
                        disposeBloomPyramid(this.#pyramid);
                        this.#pyramid = null;
                        this.#pyramidLevels = 0;
                    }
                    const layers = this.#glowPasses.prepareLayers(
                        ctx,
                        glowInput,
                        this.params.glowLayers,
                        this.params.glowSpread,
                        this.params.glowSizeMultiplier,
                        this.params.glowDistortion.noiseScale,
                        this.params.glowDistortAllLayers,
                    );
                    if (
                        this.params.glowDistortion.amount > 0 ||
                        this.params.glowFlow > 0
                    ) {
                        glowTex = this.#glowPasses.combineLayers(ctx, layers);
                    } else {
                        // Reconstruct the layers directly in the final composite when
                        // no distortion needs an intermediate, full-size glow image.
                        glowLayers = layers;
                    }
                } else {
                    this.#glowPasses.releaseLayers();
                    glowTex = this.#renderGlow(ctx, glowInput);
                }
                this.#glowBase = glowTex;
                this.#glowLayers = glowLayers;
                this.#glowBaseKey = glowBaseKey;
                this.#glowBaseVersion++;
            }
            glowLayers = this.#glowLayers;
            const glowResultKey = [
                this.#glowBaseVersion,
                this.params.glowFlow,
                this.params.glowDistortion.windDirection,
                this.params.glowDistortion.windSpeed < 0,
                ...distortionKey(this.params.glowDistortion, ctx.time),
            ];
            if (
                !this.#glowResult ||
                !sameKey(glowResultKey, this.#glowResultKey)
            ) {
                this.#glowResult = this.#glowPasses.distort(
                    ctx,
                    this.#glowBase,
                    this.params.glowDistortion,
                    "glow",
                    this.params.glowMode === "layers",
                    undefined,
                    this.params.glowFlow,
                );
                this.#glowResultKey = glowResultKey;
            }
            glowTex = this.#glowResult;
        }
        const [r, g, b] = parseHexColor(color);
        const coreWhiteness = Math.min(
            1,
            Math.max(0, this.params.coreWhiteness),
        );
        const glowWhiteness = Math.min(
            1,
            Math.max(0, this.params.glowWhiteness),
        );
        const customTint = coreWhiteness !== glowWhiteness;
        const brightness = saberFlickerGain(
            ctx.time,
            this.params.flickerIntensity,
            this.params.flickerSpeed,
            this.params.flickerSeed,
        );
        ctx.draw({
            frag: COMPOSITE_SHADERS[
                (glowLayers ? 1 : 0) |
                    (customTint ? 2 : 0) |
                    (haloEnabled ? 4 : 0) |
                    (this.params.coreBlendOnTop ? 8 : 0)
            ],
            uniforms: {
                ...glowLayers,
                src: ctx.src,
                core: displayedCore,
                originalCore,
                haloTex: this.#halo ?? visibleCore,
                haloScale: this.#haloScale,
                haloOutputSize: this.#haloOutputSize,
                haloGain:
                    Math.max(0, this.params.haloIntensity) *
                    this.#haloWeight *
                    intensity *
                    brightness,
                glowTex,
                glowTexel: [1.2 / glowTex.width, 1.2 / glowTex.height],
                color: [r, g, b],
                coreGain:
                    CORE_GAIN *
                    intensity *
                    Math.max(0, this.params.coreIntensity) *
                    brightness,
                coreWhiteness,
                glowGain: glowEnabled
                    ? GLOW_GAIN *
                      glow *
                      intensity *
                      Math.max(0, this.params.glowIntensityMultiplier) *
                      brightness
                    : 0,
                glowBias: Math.min(4, Math.max(-4, this.params.glowBias)),
                source: source ? 1 : 0,
                whiteMix: glowWhiteness,
                linearLight: this.params.toneMapping === "linear" ? 1 : 0,
                smoothGlow: this.params.glowMode === "pyramid" ? 1 : 0,
                edgeFade:
                    this.params.pad === "fullscreen"
                        ? 0
                        : this.params.glowMode === "layers"
                          ? 2 * pixelRatio
                          : this.params.pad * pixelRatio * 0.5,
            },
            target: ctx.target,
        });
    }

    outputRect(dims: EffectDims): readonly [number, number, number, number] {
        return padOutputRect(this.params.pad, dims);
    }

    dispose(): void {
        this.#glowPasses.dispose();
        this.#coreSoftener.dispose();
        this.#originalSoftener.dispose();
        this.#haloPasses.dispose();
        this.#halo = null;
        this.#haloKey = [];
        this.#softCore = null;
        this.#softCoreKey = [];
        this.#softOriginalCore = null;
        this.#softOriginalCoreKey = [];
        this.#disposed = true;
        this.#traceMask?.dispose();
        this.#traceMask = null;
        this.#payload = null;
        this.#arc = null;
        this.#splat = null;
        this.#landed = null;
        this.#traceInFlight = false;
        this.#traceSerial++;
        this.#traceStale = true;
        this.#payloadReady = false;
        this.#fieldHasPayload = false;
        this.#seedA = null;
        this.#seedB = null;
        this.#field = null;
        this.#core = null;
        this.#room = null;
        this.#roomReady = false;
        this.#region = undefined;
        this.#regionKey = [];
        if (this.#pyramid) {
            disposeBloomPyramid(this.#pyramid);
        }
        this.#pyramid = null;
        this.#pyramidLevels = 0;
        this.#dirty = true;
        this.#builtW = 0;
        this.#builtH = 0;
        this.#builtEdge = null;
        this.#builtThreshold = Number.NaN;
        this.#builtLayout = [];
        this.#builtGeometry = [];
        this.#fieldVersion = 0;
        this.#coreVersion = 0;
        this.#coreKey = [];
        this.#visibleCore = null;
        this.#visibleCoreVersion = 0;
        this.#visibleCoreKey = [];
        this.#glowBase = null;
        this.#glowLayers = undefined;
        this.#glowBaseVersion = 0;
        this.#glowBaseKey = [];
        this.#glowResult = null;
        this.#glowResultKey = [];
    }

    // Keep expensive field/core draws near the source when padding dominates.
    // Full-size targets remain zero outside this region, so blur/distortion can
    // still sample the whole image. Leave modest padding on the shared quad.
    #updateRegion(ctx: EffectContext, field: EffectRenderTarget): boolean {
        const { pixelRatio, srcRect } = ctx.dims;
        const dst = this.outputRect(ctx.dims);
        const width = field.width;
        const height = field.height;
        const reach = Math.min(
            Math.max(width, height),
            MAX_ROOM * pixelRatio * 2,
        );
        const largestJump = 2 ** Math.ceil(Math.log2(Math.max(reach, 1))) / 2;
        // Preserve flood paths and all room rays, line widths, and luminance
        // prefilter samples. This bound does not depend on animated noise.
        const maskReach =
            this.params.edge === "luminance"
                ? 3 *
                  Math.max(
                      srcRect[2] / Math.max(ctx.src.width, 1),
                      srcRect[3] / Math.max(ctx.src.height, 1),
                  )
                : 0;
        const margin =
            Math.max(
                largestJump,
                (MAX_ROOM + Math.max(this.params.thickness, 0)) * pixelRatio,
            ) +
            maskReach +
            8;
        const sx = width / dst[2];
        const sy = height / dst[3];
        const x0 = Math.max(
            0,
            Math.floor(((srcRect[0] - dst[0] - margin) * sx) / 2) * 2,
        );
        const y0 = Math.max(
            0,
            Math.floor(((srcRect[1] - dst[1] - margin) * sy) / 2) * 2,
        );
        const x1 = Math.min(
            width,
            Math.ceil(((srcRect[0] + srcRect[2] - dst[0] + margin) * sx) / 2) *
                2,
        );
        const y1 = Math.min(
            height,
            Math.ceil(((srcRect[1] + srcRect[3] - dst[1] + margin) * sy) / 2) *
                2,
        );
        const useRegion =
            x1 > x0 && y1 > y0 && (x1 - x0) * (y1 - y0) < width * height * 0.75;
        const key = useRegion ? [x0, y0, x1, y1, width, height] : [];
        if (sameKey(key, this.#regionKey)) {
            return false;
        }
        if (this.#region) {
            ctx.releaseGeometry(this.#region);
        }
        this.#region = undefined;
        this.#regionKey = key;
        if (useRegion) {
            const l = (x0 / width) * 2 - 1;
            const r = (x1 / width) * 2 - 1;
            const b = (y0 / height) * 2 - 1;
            const t = (y1 / height) * 2 - 1;
            this.#region = {
                attributes: {
                    position: {
                        itemSize: 2,
                        data: new Float32Array([
                            l,
                            b,
                            r,
                            b,
                            l,
                            t,
                            l,
                            t,
                            r,
                            b,
                            r,
                            t,
                        ]),
                    },
                },
            };
        }
        return true;
    }

    // Blur the core with a bloom pyramid.
    // Returns the result at half the buffer size.
    #renderGlow(
        ctx: EffectContext,
        core: EffectRenderTarget,
    ): EffectRenderTarget {
        const baseW = core.width;
        const baseH = core.height;
        const pixelRatio = ctx.dims.pixelRatio;
        // Levels are counted in CSS px, so the glow looks the same at any pixel ratio.
        // Level i blurs over about 2^(i+1) buffer px; `shift` turns that into CSS px.
        // Keep the widest blur inside the pad, so the glow does not hit its edge.
        const shift = Math.log2(Math.max(pixelRatio, 1e-3));
        const { pad } = this.params;
        const cssLevels =
            pad === "fullscreen"
                ? 8
                : Math.max(1, Math.round(Math.log2(Math.max(pad, 4))) - 2);
        const levels = Math.min(10, Math.max(1, cssLevels + Math.ceil(shift)));
        let pyramid = this.#pyramid;
        if (
            !pyramid ||
            this.#pyramidLevels !== levels ||
            pyramid.down[0].width !== Math.max(1, Math.floor(baseW / 2)) ||
            pyramid.down[0].height !== Math.max(1, Math.floor(baseH / 2))
        ) {
            if (pyramid) {
                disposeBloomPyramid(pyramid);
            }
            pyramid = createBloomPyramid(ctx, baseW, baseH, levels);
            this.#pyramid = pyramid;
            this.#pyramidLevels = levels;
        }
        const down = pyramid.down;
        // CSS level c = i - shift has weight glowFalloff^c; the weights sum to 1.
        // Levels finer than 2 CSS px fade out.
        // Each level also gets 2^(c+1), so a thin line keeps its brightness as it blurs.
        const falloff = Math.min(Math.max(this.params.glowFalloff, 0), 1);
        const n = down.length;
        let total = 0;
        for (let c = 0; c < cssLevels; c++) {
            total += falloff ** c;
        }
        const weightFor = (i: number) => {
            const c = i - shift;
            const weight = c >= 0 ? falloff ** c : Math.max(0, 1 + c);
            return (weight / total) * 2 ** (c + 1);
        };
        let prev = core;
        for (let i = 0; i < down.length; i++) {
            ctx.draw({
                frag: FRAG_SABER_PYRAMID_DOWNSAMPLE,
                uniforms: {
                    src: prev,
                    // A one-level pyramid has no upsample pass to apply its
                    // weight. Fold that gain into the downsample instead.
                    pyramidGain: n === 1 ? weightFor(0) : 1,
                },
                target: down[i],
            });
            prev = down[i];
        }
        return upsampleBloomPyramid(ctx, pyramid, (i) => {
            const levelScale = 2 ** (i + 2);
            return {
                texelSize: [
                    (0.5 * levelScale) / baseW,
                    (0.5 * levelScale) / baseH,
                ],
                weightLarge: weightFor(i),
                weightSmall: i === n - 2 ? weightFor(n - 1) : 1,
            };
        });
    }

    // Start a trace when the contours are stale, and turn landed contours into splat points.
    // One readback at a time; a trace that lands after the element changed is dropped.
    #updatePayload(ctx: EffectContext): void {
        if (!this.#payload) {
            const nearest = { float: true, filter: "nearest" } as const;
            this.#payload = ctx.createRenderTarget(nearest);
            this.#arc = ctx.createRenderTarget(nearest);
        }
        const landed = this.#landed;
        if (landed) {
            this.#landed = null;
            if (this.#splat) {
                ctx.releaseGeometry(this.#splat);
                this.#splat = null;
            }
            this.#splat = splatGeometry(landed);
            this.#payloadReady = true;
            this.#fieldHasPayload = false;
        }
        if (!this.#traceStale || this.#traceInFlight) {
            return;
        }
        // Padding can dwarf a small text source. Trace only the source and keep
        // its points in element coordinates, so moving/resizing the output
        // does not require another readback or briefly hide the reveal.
        const srcRect = [...ctx.dims.srcRect] as [
            number,
            number,
            number,
            number,
        ];
        const width = Math.max(1, Math.ceil(srcRect[2]));
        const height = Math.max(1, Math.ceil(srcRect[3]));
        if (
            this.#traceMask?.width !== width ||
            this.#traceMask.height !== height
        ) {
            this.#traceMask?.dispose();
            this.#traceMask = ctx.createRenderTarget({
                filter: "nearest",
                size: [width, height],
            });
        }
        const mask = this.#traceMask;
        const { edge, edgeThreshold } = this.params;
        ctx.draw({
            frag: FRAG_TRACE_MASK,
            uniforms: {
                src: ctx.src,
                maskSize: [width, height],
                maskFilterStep: maskFilterStep(ctx, 1 / width, 1 / height),
                edgeMode: edge === "luminance" ? 1 : 0,
                edgeThreshold,
            },
            target: mask,
        });
        const version = this.#sourceVersion;
        const serial = ++this.#traceSerial;
        this.#traceStale = false;
        this.#traceInFlight = true;
        ctx.readPixels(mask).then(
            (pixels) => {
                if (this.#disposed || serial !== this.#traceSerial) {
                    return;
                }
                this.#traceInFlight = false;
                if (version !== this.#sourceVersion) {
                    return;
                }
                const contours = traceContours(
                    pixels as Uint8Array,
                    width,
                    height,
                );
                this.#landed = { contours, srcRect, width, height };
            },
            () => {
                if (this.#disposed || serial !== this.#traceSerial) {
                    return;
                }
                this.#traceInFlight = false;
                this.#traceStale = true;
            },
        );
    }

    #buildField(ctx: EffectContext, usePayload: boolean): void {
        const seedA = this.#seedA;
        const seedB = this.#seedB;
        const field = this.#field;
        if (!seedA || !seedB || !field) {
            return;
        }
        const { edge, edgeThreshold } = this.params;
        const dst = this.outputRect(ctx.dims);
        const maskUniforms = {
            src: ctx.src,
            edgeMode: edge === "luminance" ? 1 : 0,
            edgeThreshold,
            maskFilterStep: maskFilterStep(
                ctx,
                dst[2] / (field.width * Math.max(ctx.dims.srcRect[2], 1)),
                dst[3] / (field.height * Math.max(ctx.dims.srcRect[3], 1)),
            ),
        };
        if (this.#region) {
            // Later room/core passes reuse these targets. Clear only when the
            // field changes; untouched pixels then stay transparent throughout.
            ctx.clear(seedA);
            ctx.clear(seedB);
            ctx.clear(field);
        }

        const payload = this.#payload;
        const splat = this.#splat;
        const withPayload = usePayload && payload !== null && splat !== null;
        if (withPayload) {
            ctx.clear(payload);
            ctx.draw({
                frag: FRAG_SPLAT,
                vert: VERT_SPLAT,
                geometry: splat,
                uniforms: { outputRect: [...this.outputRect(ctx.dims)] },
                target: payload,
            });
        }
        ctx.draw({
            frag: FRAG_SEED,
            uniforms: {
                ...maskUniforms,
                payload: withPayload ? payload : seedB,
                payloadOn: withPayload ? 1 : 0,
            },
            target: seedA,
            geometry: this.#region,
        });

        let read = seedA;
        let write = seedB;
        const flood = (stepSize: number) => {
            ctx.draw({
                frag: FRAG_JFA,
                uniforms: { seed: read, stepSize },
                target: write,
                geometry: this.#region,
            });
            [read, write] = [write, read];
        };
        // Lines and the room never reach past MAX_ROOM, so the flood can stop there.
        // Texels further out stay invalid and draw nothing.
        const maxSide = Math.max(field.width, field.height);
        const reach = Math.min(maxSide, MAX_ROOM * ctx.dims.pixelRatio * 2);
        for (
            let stepSize = 2 ** Math.ceil(Math.log2(reach)) / 2;
            stepSize >= 1;
            stepSize /= 2
        ) {
            flood(stepSize);
        }
        // One more step-1 pass fixes most leftover errors.
        flood(1);

        ctx.draw({
            frag: FRAG_RESOLVE,
            uniforms: { ...maskUniforms, seed: read },
            target: field,
            geometry: this.#region,
        });
        if (withPayload && this.#arc) {
            if (this.#region) {
                ctx.clear(this.#arc);
            }
            ctx.draw({
                frag: FRAG_ARC,
                uniforms: { seed: read },
                target: this.#arc,
                geometry: this.#region,
            });
        }
        this.#fieldHasPayload = withPayload;
        this.#fieldVersion++;
        this.#roomReady = false;

        this.#dirty = false;
        this.#builtW = field.width;
        this.#builtH = field.height;
        this.#builtEdge = edge;
        this.#builtThreshold = edgeThreshold;
    }

    #buildRoom(ctx: EffectContext): void {
        const field = this.#field;
        const seedA = this.#seedA;
        const seedB = this.#seedB;
        if (!field || !seedA || !seedB) {
            return;
        }
        this.#room = seedA;

        ctx.draw({
            frag: FRAG_ROOM,
            uniforms: {
                field,
                maxRoom: MAX_ROOM * ctx.dims.pixelRatio,
                pixelRatio: ctx.dims.pixelRatio,
            },
            target: seedA,
            geometry: this.#region,
        });
        ctx.draw({
            frag: FRAG_ROOM_BLUR,
            uniforms: {
                src: seedA,
                dir: [1, 0],
                pixelRatio: ctx.dims.pixelRatio,
            },
            target: seedB,
            geometry: this.#region,
        });
        ctx.draw({
            frag: FRAG_ROOM_BLUR,
            uniforms: {
                src: seedB,
                dir: [0, 1],
                pixelRatio: ctx.dims.pixelRatio,
            },
            target: this.#room,
            geometry: this.#region,
        });
        this.#roomReady = true;
    }
}

type TracedSource = {
    contours: Contour[];
    srcRect: readonly [number, number, number, number];
    width: number;
    height: number;
};

type CacheKey = readonly (number | string | boolean)[];

function maskFilterStep(ctx: EffectContext, x: number, y: number): number[] {
    return [x, y].map((step, i) => {
        const ratio = step * (i === 0 ? ctx.src.width : ctx.src.height);
        if (ratio <= 1.001) {
            return 0;
        }
        // Fade in continuously while shrinking from native size to half size.
        const t = Math.min(1, ratio - 1);
        return step * t * t * (3 - 2 * t);
    });
}

function sameKey(a: CacheKey, b: CacheKey): boolean {
    return a.length === b.length && a.every((value, i) => value === b[i]);
}

function distortionKey(p: SaberDistortionParams, time: number): CacheKey {
    if (p.amount <= 0) {
        return [0];
    }
    return [
        p.amount,
        p.type,
        p.composite,
        p.invert,
        p.windSpeed,
        p.windDirection,
        p.noiseSpeed,
        p.noiseScale,
        p.noiseBias,
        p.noiseComplexity,
        p.noiseDetail,
        p.noiseAspectRatio,
        p.directionality,
        p.motionBlur,
        p.seed,
        p.windSpeed !== 0 || p.noiseSpeed !== 0 ? time : 0,
    ];
}

// One point per traced vertex: element-relative position, arc position and loop length.
// Tracer coordinates put texel centres on integers, so add half a texel.
function splatGeometry({
    contours,
    srcRect,
    width,
    height,
}: TracedSource): EffectGeometry | null {
    let count = 0;
    for (const c of contours) {
        count += c.t.length;
    }
    if (count === 0) {
        return null;
    }
    const position = new Float32Array(count * 4);
    const sx = srcRect[2] / width;
    const sy = srcRect[3] / height;
    let o = 0;
    for (const c of contours) {
        const arc = new Float64Array(c.t.length);
        let length = 0;
        for (let i = 0; i < arc.length; i++) {
            arc[i] = length;
            const j = (i + 1) % arc.length;
            length += Math.hypot(
                (c.points[j * 2] - c.points[i * 2]) * sx,
                (c.points[j * 2 + 1] - c.points[i * 2 + 1]) * sy,
            );
        }
        for (let i = 0; i < c.t.length; i++) {
            position[o++] = srcRect[0] + (c.points[i * 2] + 0.5) * sx;
            position[o++] = srcRect[1] + (c.points[i * 2 + 1] + 0.5) * sy;
            position[o++] = arc[i] / Math.max(length, 1e-6);
            position[o++] = length;
        }
    }
    return {
        mode: "points",
        attributes: { position: { data: position, itemSize: 4 } },
    };
}
