// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// JPEG glitch via DCT simulation (approach "B").
//
// Rather than round-tripping the element through a real JPEG codec on the
// CPU, this reproduces the visible artifacts of lossy JPEG entirely on the
// GPU as a multipass pipeline:
//
//   1. convert    RGB → YCbCr (+ straight alpha)       src      → bufA
//   2. dctH       forward 1-D DCT-II over each 8px row  bufA     → bufB
//   3. dctV       forward 1-D DCT-II over each 8px col  bufB     → bufA
//   4. cascadeRow row-local prefix sum of DC impulses   (proc.)  → rowScan
//   5. cascade    full scan-order prefix sum + desync   rowScan  → cascade
//   5b.drift      2nd prefix sum: bit-position drift     (proc.)  → cascadeDrift
//   6. quantize   per-coefficient quantization + glitch bufA     → bufB
//   7. idctV      inverse 1-D DCT over each column       bufB     → bufA
//   8. idctH      inverse 1-D DCT over each row          bufA     → bufB
//   9. displace   entropy-desync MCU grid slide / smear  bufB     → bufA
//  10. resolve    YCbCr → RGB, premultiply, write        bufA     → canvas
//
// The 2-D block DCT is separable, so each transform is two cheap 1-D passes
// (8 taps each) instead of a 64-tap convolution. Steps 2-9 run in the
// effect's own auto-sized render targets where `gl_FragCoord` maps 1:1 to
// texels (and therefore to the 8x8 block grid). The final `resolve` pass
// samples by `uv` only, so it is safe to draw into the offset element
// viewport of the last chain stage.
//
// Quantization (step 6) produces the classic blocky DCT artifacts. The
// glitch on top is the part that makes it read as a *real* JPEG byte-glitch
// (think `sed`-ing a .jpg). In baseline JPEG the DC coefficient of every
// block is differentially coded against the previous block in raster scan
// order — across row boundaries, with no per-row reset — so one corrupted
// DC delta shifts the brightness/colour of *every* block after it, to the
// end of the scan. Reproducing that needs a running sum in scan order, not
// a per-row effect, so the cascade is computed on a small block-resolution
// buffer (steps 4-5) as a two-pass prefix sum:
//   - step 4 sums DC impulses left-to-right within each block row, and
//     tracks the latest "desync" trigger block in that row;
//   - step 5 folds in all the rows above to get the true scan-order running
//     sum (the propagating DC offset) and running-max trigger.
// The desync trigger emulates entropy-stream loss: from a trigger block, a
// run of following blocks collapses to flat DC (the melted / smeared look)
// until the decoder would resync.
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

// sqrt(1/8) and sqrt(2/8): the orthonormal DCT-II scale factors for the
// DC (k=0) and AC (k>0) coefficients respectively. Inlined so the forward
// and inverse passes compose to an exact identity at quality 1.
const C0 = "0.3535533906";
const CK = "0.5";

const YCBCR_GLSL = `
vec3 rgb2ycbcr(vec3 c) {
    float y  = dot(c, vec3( 0.299,     0.587,     0.114));
    float cb = dot(c, vec3(-0.168736, -0.331264,  0.5)) + 0.5;
    float cr = dot(c, vec3( 0.5,      -0.418688, -0.081312)) + 0.5;
    return vec3(y, cb, cr);
}

vec3 ycbcr2rgb(vec3 c) {
    float y = c.x;
    float cb = c.y - 0.5;
    float cr = c.z - 0.5;
    return vec3(
        y                 + 1.402    * cr,
        y - 0.344136 * cb - 0.714136 * cr,
        y + 1.772    * cb
    );
}
`;

// Pass 1 — sample the element capture, convert to YCbCr, carry straight
// alpha. Uses the `uvSrc` varying (content-correct sampling) and masks any
// texel that falls outside the captured content.
const FRAG_CONVERT = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
${YCBCR_GLSL}

void main() {
    vec2 inside = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float mask = inside.x * inside.y;
    vec4 c = texture(src, clamp(uvSrc, 0.0, 1.0));
    outColor = vec4(rgb2ycbcr(c.rgb), c.a * mask);
}
`;

// Pass 2 — forward DCT-II along the row, per 8px block.
const FRAG_DCT_H = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 resolution;
#define PI 3.141592653589793

void main() {
    vec2 fc = gl_FragCoord.xy;
    float px = floor(fc.x);
    float blockX = floor(px / 8.0) * 8.0;
    float u = px - blockX;
    float cu = (u < 0.5) ? ${C0} : ${CK};
    vec4 sum = vec4(0.0);
    for (int i = 0; i < 8; i++) {
        float xi = blockX + float(i) + 0.5;
        vec4 f = texture(src, vec2(xi / resolution.x, fc.y / resolution.y));
        sum += f * cos((2.0 * float(i) + 1.0) * u * PI / 16.0);
    }
    outColor = cu * sum;
}
`;

// Pass 3 — forward DCT-II along the column, per 8px block.
const FRAG_DCT_V = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 resolution;
#define PI 3.141592653589793

void main() {
    vec2 fc = gl_FragCoord.xy;
    float py = floor(fc.y);
    float blockY = floor(py / 8.0) * 8.0;
    float v = py - blockY;
    float cv = (v < 0.5) ? ${C0} : ${CK};
    vec4 sum = vec4(0.0);
    for (int i = 0; i < 8; i++) {
        float yi = blockY + float(i) + 0.5;
        vec4 f = texture(src, vec2(fc.x / resolution.x, yi / resolution.y));
        sum += f * cos((2.0 * float(i) + 1.0) * v * PI / 16.0);
    }
    outColor = cv * sum;
}
`;

// Shared block-impulse model (block-resolution passes). `scan` is the
// raster block index `by * bw + bx`. A real byte-glitch is a SINGLE event:
// corrupting one entropy-coded byte both garbles the DC differential (→ the
// colour cascade) and desyncs the Huffman reader (→ the grid slide). So we
// model one sparse event stream: `glitch` is the event density, every event
// emits a DC delta, and a fraction (`corruption`) of those events also flip
// the decoder into a desync. `glitch = 0` therefore means no events at all —
// no cascade and no slide. `floor(time)` re-rolls discretely so `speed > 0`
// animates without smearing.
const IMPULSE_GLSL = `
uniform float glitch;
uniform float corruption;
uniform float shift;
uniform float time;
uniform float seed;

float h11(float x) {
    return fract(sin(x * 0.1031 + seed * 17.13) * 43758.5453);
}

// True when a corruption event occurs at this block (density ~ glitch).
bool corruptionEvent(float scan, float tt) {
    return h11(scan * 1.7 + tt * 131.0) < glitch * 0.012;
}

// Signed DC delta carried by an event.
vec3 dcDelta(float scan, float tt) {
    vec3 d = vec3(
        h11(scan * 2.3 + tt * 7.0),
        h11(scan * 3.1 + tt * 9.0),
        h11(scan * 4.7 + tt * 11.0)
    ) - 0.5;
    // DC of a flat block ~ value x 8; scale the offset into that range.
    return d * shift * 16.0;
}

// Whether an event also desyncs the bitstream (a fraction = corruption of
// all events). Only meaningful when corruptionEvent() is already true.
bool eventDesyncs(float scan, float tt) {
    return h11(scan * 5.9 + tt * 53.0 + 99.0) < corruption;
}
`;

// Pass 4 — row-local prefix. For block (bx, by): the inclusive sum of DC
// impulses from column 0..bx in this row (rgb), and the largest desync
// trigger scan-index seen so far in this row (a, -1 if none). Reading this
// buffer at the last column therefore gives each row's full total / max.
const FRAG_CASCADE_ROW = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 grid; // [bw, bh] in blocks
${IMPULSE_GLSL}

void main() {
    float bw = grid.x;
    float bx = floor(gl_FragCoord.x);
    float by = floor(gl_FragCoord.y);
    float tt = floor(time);

    vec3 dc = vec3(0.0);
    float trig = -1.0;
    for (int i = 0; i < 4096; i++) {
        if (float(i) > bx) break;
        float scan = by * bw + float(i);
        if (corruptionEvent(scan, tt)) {
            dc += dcDelta(scan, tt);
            if (eventDesyncs(scan, tt)) {
                trig = scan;
            }
        }
    }
    outColor = vec4(dc, trig);
}
`;

// Pass 5 — fold in every row above to finish the scan-order prefix sum.
// finalDC(bx,by) = (sum of all full rows j<by) + rowPrefix(bx,by); the
// trigger is the running max over the same scan range. The result is the
// true raster-order running DC offset that floods across row boundaries.
const FRAG_CASCADE = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D rowScan;
uniform vec2 grid; // [bw, bh] in blocks

void main() {
    float bw = grid.x;
    float bh = grid.y;
    float bx = floor(gl_FragCoord.x);
    float by = floor(gl_FragCoord.y);
    float lastCol = (bw - 0.5) / bw;

    vec3 dc = vec3(0.0);
    float trig = -1.0;
    for (int j = 0; j < 4096; j++) {
        if (float(j) >= by) break;
        vec4 row = texture(rowScan, vec2(lastCol, (float(j) + 0.5) / bh));
        dc += row.rgb;
        trig = max(trig, row.a);
    }
    vec4 here = texture(rowScan, vec2((bx + 0.5) / bw, (by + 0.5) / bh));
    outColor = vec4(dc + here.rgb, max(trig, here.a));
}
`;

// Shared cascade / restart-segment lookup, used by both the coefficient
// quantize pass and the spatial displace pass. Declares the block-res
// cascade sampler and the restart uniforms, and resolves, for a given scan
// index: the prefix-sum DC offset, the enclosing restart segment, and the
// desync run.
const CASCADE_GLSL = `
uniform sampler2D cascade; // block-res: rgb = prefix-sum DC offset, a = last trigger
uniform vec2 grid;         // [bw, bh] in blocks
uniform float restart;       // restart interval in blocks (MCUs); 0 = none
uniform float restartJitter; // 0..1: global phase offset of the restart grid
uniform float seed;
uniform float time;          // pre-scaled by speed; floor(time) re-rolls per step

// Read the inclusive prefix sum stored in the cascade buffer at scan index.
vec4 cascadeAt(float idx) {
    float bw = grid.x;
    float cbx = mod(idx, bw);
    float cby = floor(idx / bw);
    return texture(cascade, vec2((cbx + 0.5) / bw, (cby + 0.5) / grid.y));
}

// Robust 1-D hash (Dave Hoskins, "Hash without Sine"). Well distributed for
// integer-ish inputs, including small values where fract(sin(...))
// degenerates (e.g. sin(0) = 0).
float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

// Global phase offset of the restart lattice, in blocks. A real glitched
// file's restart grid is not aligned to the top of the image; shifting the
// WHOLE lattice by one random phase moves every reset line together.
// restartJitter scales the phase from 0 (aligned to the top) up to a full
// restart interval. The phase re-rolls each time step (floor(time)) so it
// animates when speed > 0, like a changing seed. Floored to whole blocks.
float restartPhase() {
    return floor(restart * restartJitter * hash11(seed * 7.0 + 3.0 + floor(time) * 13.0));
}

// Largest restart boundary at or before scan. Boundaries lie on a regular
// lattice offset by restartPhase(); scan below the first boundary belongs to
// the image-start segment (0).
float segStartFor(float scan) {
    if (restart < 0.5) {
        return 0.0;
    }
    float phase = restartPhase();
    if (scan < phase) {
        return 0.0;
    }
    return phase + floor((scan - phase) / restart) * restart;
}
`;

// Pass 6 — quantize each coefficient (heavier for high frequency and for
// chroma, lighter for DC), then add the restart-bounded DC cascade. The
// buffer holds full per-block DCT coefficients in the natural frequency
// layout: the texel at the top-left of each 8x8 cell is the DC term.
const FRAG_QUANTIZE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 resolution;
uniform float quality;
uniform float garbage; // 0..1 random-coefficient corruption in desync runs
${CASCADE_GLSL}

void main() {
    vec2 fc = gl_FragCoord.xy;
    float px = floor(fc.x);
    float py = floor(fc.y);
    float bx = floor(px / 8.0);
    float by = floor(py / 8.0);
    float u = px - bx * 8.0;
    float v = py - by * 8.0;
    bool isDC = (u < 0.5 && v < 0.5);

    vec4 coef = texture(src, fc / resolution);

    // --- quantization ---
    float freq = u + v;
    float base = mix(2.5, 0.02, clamp(quality, 0.0, 1.0));
    float lumaStep = base * (1.0 + freq * 0.35);
    float chromaStep = base * (2.0 + freq * 0.6);
    if (isDC) {
        // Protect the DC term so quantization alone does not wash the
        // image out — the cascade below is what should move it.
        lumaStep *= 0.25;
        chromaStep *= 0.25;
    }
    vec4 q = vec4(lumaStep, chromaStep, chromaStep, lumaStep);
    coef = floor(coef / q + 0.5) * q;

    // --- scan-order DC cascade, bounded by restart markers ---
    // The cascade buffer holds the GLOBAL prefix sum; the visible offset is
    // the sum over the current restart segment only:
    //   segmentDC(n) = prefix(n) - prefix(segStart - 1)
    float scan = by * grid.x + bx;
    float segStart = segStartFor(scan);
    float trig = cascadeAt(scan).a;
    bool desync = trig >= segStart && (scan - trig) >= 0.0;

    vec3 dcOffset = cascadeAt(scan).rgb;
    if (segStart > 0.5) {
        dcOffset -= cascadeAt(segStart - 1.0).rgb;
    }
    if (isDC) {
        coef.xyz += dcOffset;
    }

    // --- desync garbage: random coefficients from a desynced decoder ---
    // A desynced Huffman reader emits random symbols → random coefficients.
    // In YCbCr space these reconstruct into the murky dark green / brown /
    // magenta blocks and stray DCT-basis stripes that read as unmistakably
    // JPEG (and nothing like the source). DC garbage is skewed dark (low Y)
    // for those characteristic muddy colours; AC garbage is low-frequency
    // weighted so a few basis functions dominate (clean stripes, not white
    // noise). Alpha is left intact so transparent areas stay transparent.
    if (desync && garbage > 0.0) {
        float k = scan * 0.131 + (u * 8.0 + v) * 1.7 + floor(time) * 37.0;
        vec3 g;
        if (isDC) {
            g = vec3(
                hash11(k + 1.0) * 3.0, // Y DC in [0,3] → dark
                hash11(k + 2.0) * 8.0, // Cb DC in [0,8]
                hash11(k + 3.0) * 8.0  // Cr DC in [0,8]
            );
        } else {
            float fw = 1.0 / (1.0 + (u + v) * 0.4);
            g = (vec3(hash11(k + 1.0), hash11(k + 2.0), hash11(k + 3.0)) - 0.5)
                * 16.0 * fw;
        }
        coef.xyz = mix(coef.xyz, g, garbage);
    }

    outColor = coef;
}
`;

// Pass 7 — inverse DCT along the column.
const FRAG_IDCT_V = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 resolution;
#define PI 3.141592653589793

void main() {
    vec2 fc = gl_FragCoord.xy;
    float py = floor(fc.y);
    float blockY = floor(py / 8.0) * 8.0;
    float y = py - blockY;
    vec4 sum = vec4(0.0);
    for (int k = 0; k < 8; k++) {
        float ck = (k == 0) ? ${C0} : ${CK};
        float yk = blockY + float(k) + 0.5;
        vec4 f = texture(src, vec2(fc.x / resolution.x, yk / resolution.y));
        sum += ck * f * cos((2.0 * y + 1.0) * float(k) * PI / 16.0);
    }
    outColor = sum;
}
`;

// Pass 8 — inverse DCT along the row.
const FRAG_IDCT_H = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 resolution;
#define PI 3.141592653589793

void main() {
    vec2 fc = gl_FragCoord.xy;
    float px = floor(fc.x);
    float blockX = floor(px / 8.0) * 8.0;
    float x = px - blockX;
    vec4 sum = vec4(0.0);
    for (int k = 0; k < 8; k++) {
        float ck = (k == 0) ? ${C0} : ${CK};
        float xk = blockX + float(k) + 0.5;
        vec4 f = texture(src, vec2(xk / resolution.x, fc.y / resolution.y));
        sum += ck * f * cos((2.0 * x + 1.0) * float(k) * PI / 16.0);
    }
    outColor = sum;
}
`;

// Pass 5b — row-local prefix sums folded by FRAG_CASCADE (reused) into two
// global drift prefix sums:
//   .r — a dense, signed per-block random walk: the desynced stream's
//        per-block bit-length error (every block reads slightly too many or
//        too few bits), giving irregular warp. Drives `drift`.
//   .g — a count of desync events: a desynced decoder drops the corrupted
//        block, so every following block shifts one position earlier. The
//        running count is how many blocks the content has slid. Drives `skip`.
const FRAG_DRIFT_ROW = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 grid;
${IMPULSE_GLSL}

void main() {
    float bw = grid.x;
    float bx = floor(gl_FragCoord.x);
    float by = floor(gl_FragCoord.y);
    float tt = floor(time);
    float walk = 0.0;
    float skips = 0.0;
    for (int i = 0; i < 4096; i++) {
        if (float(i) > bx) break;
        float scan = by * bw + float(i);
        walk += h11(scan + tt * 7.0 + seed * 101.0) - 0.5;
        if (corruptionEvent(scan, tt) && eventDesyncs(scan, tt)) {
            skips += 1.0;
        }
    }
    outColor = vec4(walk, skips, 0.0, 0.0);
}
`;

// Pass 9 — spatial displace: emulate entropy-stream (Huffman) desync. When
// the decoder loses bit-sync it also loses count of how many bits each block
// consumed, so the MCU grid slides: subsequent content is placed at a shifted
// scan position. Inside a desync run we sample the reconstructed image from a
// scan-order-shifted block, which slides / stretches content and wraps across
// rows as the signature diagonal tear. Three lag terms combine:
//   - slide: a smooth, per-segment signed lag (prog * rate) → even shear.
//   - drift: the random-walk prefix sum → irregular warp, jagged edges.
//   - skip:  the desync-event count → each dropped block slides everything
//     after it one position earlier (a monotonic LEFTWARD staircase that
//     accumulates by one more block at every corruption point).
const FRAG_DISPLACE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src; // reconstructed YCbCr (post-IDCT)
uniform sampler2D cascadeDrift; // block-res: .r = walk prefix, .g = skip count
uniform vec2 resolution;
uniform float slide; // 0..1 uniform smear / stretch strength
uniform float drift; // magnitude of the irregular data-dependent drift
uniform float skip;  // blocks shifted left per dropped (desynced) block
${CASCADE_GLSL}

// Drift prefix sums at a scan index (.r = random walk, .g = skip count).
vec2 driftAt(float idx) {
    float bw = grid.x;
    return texture(
        cascadeDrift,
        vec2((mod(idx, bw) + 0.5) / bw, (floor(idx / bw) + 0.5) / grid.y)
    ).rg;
}

void main() {
    vec2 fc = gl_FragCoord.xy;
    float bx = floor(fc.x / 8.0);
    float by = floor(fc.y / 8.0);
    float scan = by * grid.x + bx;

    // Once the bitstream desyncs it stays desynced until the next restart
    // marker, so the lag persists from the trigger to the end of the restart
    // segment — i.e. through every following row in that segment, not just a
    // short run. trig >= segStart means the trigger lies in this block's own
    // segment, so the whole rest of the segment is affected.
    float segStart = segStartFor(scan);
    float trig = cascadeAt(scan).a;
    float prog = scan - trig;
    bool desync = trig >= segStart && prog >= 0.0;

    vec2 sampleUV = fc / resolution;
    if (desync) {
        // Systematic lag: a per-segment mean drift rate (the average
        // bit-length mismatch after this desync). Randomised and SIGNED per
        // trigger so different corrupted regions shear differently — some
        // stretch (rate > 0 → source lags), some compress (rate < 0 → source
        // runs ahead), some barely move. rate=1 freezes the source at the
        // trigger (a hard smear). It grows with progress into the segment, so
        // it shears down through the rows below the trigger.
        float rate = slide * (2.0 * hash11(trig * 1.13 + seed * 7.3) - 1.0);
        float lag = floor(prog * rate);
        vec2 here = driftAt(scan);
        // Drift lag: the bit-position random walk accumulated since the active
        // trigger (here.x - prefix(trig - 1)), which warps content irregularly.
        if (drift != 0.0) {
            float wBase = trig >= 1.0 ? driftAt(trig - 1.0).x : 0.0;
            lag += floor((here.x - wBase) * drift);
        }
        // Skip: each dropped block in this segment shifts the rest one block
        // earlier in scan order. The desync-event count since the segment
        // start gives how many blocks the content has slid; we sample AHEAD
        // (negative lag) by it — a monotonic LEFTWARD staircase that grows by
        // one more block at every corruption point, until the restart resyncs.
        float sBase = segStart >= 1.0 ? driftAt(segStart - 1.0).y : 0.0;
        lag -= floor((here.y - sBase) * skip);
        float m = max(0.0, scan - lag);
        float bw = grid.x;
        float sbx = mod(m, bw);
        float sby = floor(m / bw);
        // Keep the intra-block pixel offset so block detail is preserved.
        float intraX = fc.x - bx * 8.0;
        float intraY = fc.y - by * 8.0;
        sampleUV = vec2(
            (sbx * 8.0 + intraX) / resolution.x,
            (sby * 8.0 + intraY) / resolution.y
        );
    }
    outColor = texture(src, sampleUV);
}
`;

// Pass 10 — YCbCr → RGB, clamp, premultiply for the canvas blend.
const FRAG_RESOLVE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
${YCBCR_GLSL}

void main() {
    vec4 c = texture(src, uv);
    vec3 rgb = clamp(ycbcr2rgb(c.rgb), 0.0, 1.0);
    float a = clamp(c.a, 0.0, 1.0);
    outColor = vec4(rgb * a, a);
}
`;

export type JPEGGlitchParams = {
    /**
     * JPEG quality, `0`..`1`. `1` is near-lossless; lower values widen the
     * quantization step and produce the blocky 8x8 DCT artifacts.
     */
    quality: number;

    /**
     * Master density of corruption events, `0`..`1`. Each event is a single
     * byte-glitch: it injects a DC differential error (which accumulates in
     * raster scan order and shifts every following block until the next
     * restart marker — see `restart`) and may also desync the decoder (see
     * `corruption`). `0` means no events at all: no cascade and no slide.
     */
    glitch: number;

    /** Magnitude of each event's DC colour / brightness shift. */
    shift: number;

    /**
     * Fraction of corruption events that also desync the bitstream, `0`..`1`.
     * `0` → events only shift DC (colour bands, no slide); `1` → every event
     * also flips the decoder out of bit-sync. A desync persists until the
     * next restart marker, so everything after it in the segment (across the
     * rows below, not just a short run) is displaced by `slide`. Has no
     * effect when `glitch` is `0`.
     */
    corruption: number;

    /**
     * Random-coefficient garbage in desync regions, `0`..`1`. A desynced
     * decoder reads random Huffman symbols, so desync blocks fill with random
     * DCT coefficients — reconstructing as the murky dark green / brown blocks
     * and stray stripe patterns that look nothing like the source (the most
     * recognisable "real JPEG" tell). `0` keeps desync blocks as displaced
     * source content; `1` fully replaces their coefficients with garbage.
     * Only visible where `corruption` has triggered a desync.
     */
    garbage: number;

    /**
     * Systematic grid-slide of desync regions, `0`..`1`. The mean drift rate
     * (average bit-length mismatch) after a desync, randomised and signed per
     * trigger: some corrupted regions stretch (source lags), some compress
     * (source runs ahead), some barely move — `slide` is the maximum rate.
     * `1` lets the strongest regions freeze at the trigger block (a hard
     * smear). Pairs with `drift`, which adds the irregular fluctuation around
     * this mean. Only visible where `corruption` has triggered a desync.
     */
    slide: number;

    /**
     * Irregular bit-position drift of desync regions, in blocks. Where `slide`
     * is a smooth uniform lag, this adds a data-dependent random walk that
     * accumulates from the trigger in scan order — so the displacement warps
     * unevenly, jagging edges and locally compressing / stretching content
     * (the chaotic "shape breakdown" of a real Huffman desync). `0` disables
     * it; larger values warp harder. Only visible inside a desync run.
     */
    drift: number;

    /**
     * Leftward block-skip drift, in blocks per dropped block. A desynced
     * decoder drops the corrupted block, so every following block slides one
     * position earlier (left, wrapping up a row). The shift accumulates by one
     * more block at each corruption point and resets at the next restart — a
     * monotonic leftward staircase. `0` disables it; `1` is the literal
     * one-block-per-drop behaviour; larger exaggerates it. Only visible inside
     * a desync run.
     */
    skip: number;

    /**
     * Mean restart-marker (DRI) interval in blocks (MCUs). The DC cascade and
     * the desync run reset at restart boundaries, so corruption is confined
     * to the segment it lands in instead of smearing to the end of the image.
     * Smaller values → more localized damage. `0` disables restarts (a
     * no-restart baseline JPEG: one error floods to the end).
     */
    restart: number;

    /**
     * Global phase offset of the restart lattice, `0`..`1`. The restart
     * boundaries form a regular grid every `restart` blocks; this slides the
     * WHOLE grid (every reset line together) by a seed-random phase of up to
     * one full `restart` interval. `0` aligns the grid to the top of the
     * image; higher values offset where every reset lands. Vary `seed` to get
     * a different phase.
     */
    restartJitter: number;

    /** Animation speed of the glitch. `0` freezes it to a static frame. */
    speed: number;

    /** Random seed. */
    seed: number;
};

const DEFAULT_PARAMS: JPEGGlitchParams = {
    quality: 0.3,
    glitch: 0.5,
    shift: 0.4,
    corruption: 0.15,
    garbage: 0.6,
    restart: 512,
    restartJitter: 0.5,
    slide: 1,
    drift: 8,
    skip: 1,
    speed: 1,
    seed: 0,
};

/**
 * JPEG-glitch effect. Simulates lossy-JPEG block DCT compression on the GPU
 * and corrupts the coefficients for a datamosh look.
 *
 * Mutate `params` directly or via `setParams` — uniforms are read live each
 * frame, so a reactive UI (e.g. Tweakpane) can bind to `effect.params`.
 */
export class JPEGGlitchEffect implements Effect {
    params: JPEGGlitchParams;

    #bufA: EffectRenderTarget | null = null;
    #bufB: EffectRenderTarget | null = null;
    // Block-resolution buffers for the scan-order DC cascade. Sized to the
    // 8x8 block grid, so they are reallocated when the element resizes.
    #rowScan: EffectRenderTarget | null = null;
    #cascade: EffectRenderTarget | null = null;
    // Second prefix-sum buffer: the cumulative bit-position drift (.r).
    #cascadeDrift: EffectRenderTarget | null = null;
    #blocksW = 0;
    #blocksH = 0;

    constructor(initial: Partial<JPEGGlitchParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<JPEGGlitchParams>): void {
        Object.assign(this.params, updates);
    }

    init(ctx: EffectContext): void {
        // Float storage: DCT coefficients leave the [0,1] range (the DC term
        // of a flat block is ~value x 8), so 8-bit targets would clip them.
        // Nearest filtering keeps the per-texel coefficient reads exact.
        this.#bufA = ctx.createRenderTarget({ float: true, filter: "nearest" });
        this.#bufB = ctx.createRenderTarget({ float: true, filter: "nearest" });
    }

    render(ctx: EffectContext): void {
        const a = this.#bufA;
        const b = this.#bufB;
        if (!a || !b) {
            return;
        }

        const resolution: [number, number] = [a.width, a.height];
        const {
            quality,
            glitch,
            shift,
            corruption,
            garbage,
            restart,
            restartJitter,
            slide,
            drift,
            skip,
            seed,
        } = this.params;
        const time = ctx.time * this.params.speed;

        const [rowScan, cascade, cascadeDrift] = this.#ensureBlockBuffers(
            ctx,
            a,
        );
        const grid: [number, number] = [this.#blocksW, this.#blocksH];

        // 1. element capture → YCbCr (+ alpha)
        ctx.draw({ frag: FRAG_CONVERT, uniforms: { src: ctx.src }, target: a });

        // 2-3. forward separable DCT
        ctx.draw({
            frag: FRAG_DCT_H,
            uniforms: { src: a, resolution },
            target: b,
        });
        ctx.draw({
            frag: FRAG_DCT_V,
            uniforms: { src: b, resolution },
            target: a,
        });

        // 4-5. scan-order DC cascade (two-pass prefix sum at block res)
        const impulse = { glitch, corruption, shift, time, seed };
        ctx.draw({
            frag: FRAG_CASCADE_ROW,
            uniforms: { grid, ...impulse },
            target: rowScan,
        });
        ctx.draw({
            frag: FRAG_CASCADE,
            uniforms: { rowScan, grid },
            target: cascade,
        });

        // 5b. drift prefix sums: a second scan-order prefix pair — a dense
        // random walk (.r, for drift) and a desync-event count (.g, for skip).
        // Reuses rowScan (the DC fold is done with it) and the same fold shader.
        ctx.draw({
            frag: FRAG_DRIFT_ROW,
            uniforms: { grid, ...impulse },
            target: rowScan,
        });
        ctx.draw({
            frag: FRAG_CASCADE,
            uniforms: { rowScan, grid },
            target: cascadeDrift,
        });

        // Cascade / restart-segment uniforms shared by quantize + displace.
        // time drives restartPhase() so the restart grid animates with speed.
        const seg = { cascade, grid, restart, restartJitter, seed, time };

        // 6. quantize + DC cascade + desync garbage
        ctx.draw({
            frag: FRAG_QUANTIZE,
            uniforms: { src: a, resolution, quality, garbage, ...seg },
            target: b,
        });

        // 7-8. inverse separable DCT
        ctx.draw({
            frag: FRAG_IDCT_V,
            uniforms: { src: b, resolution },
            target: a,
        });
        ctx.draw({
            frag: FRAG_IDCT_H,
            uniforms: { src: a, resolution },
            target: b,
        });

        // 9. spatial displace (entropy-desync grid slide / smear / drift)
        ctx.draw({
            frag: FRAG_DISPLACE,
            uniforms: {
                src: b,
                resolution,
                slide,
                drift,
                skip,
                cascadeDrift,
                ...seg,
            },
            target: a,
        });

        // 10. YCbCr → RGB → canvas (or this stage's assigned target)
        ctx.draw({
            frag: FRAG_RESOLVE,
            uniforms: { src: a },
            target: ctx.target,
        });
    }

    dispose(): void {
        this.#bufA?.dispose();
        this.#bufB?.dispose();
        this.#rowScan?.dispose();
        this.#cascade?.dispose();
        this.#cascadeDrift?.dispose();
        this.#bufA = null;
        this.#bufB = null;
        this.#rowScan = null;
        this.#cascade = null;
        this.#cascadeDrift = null;
        this.#blocksW = 0;
        this.#blocksH = 0;
    }

    // Allocate (or resize) the block-resolution cascade buffers to match the
    // current coefficient buffer's 8x8 block grid.
    #ensureBlockBuffers(
        ctx: EffectContext,
        coef: EffectRenderTarget,
    ): [EffectRenderTarget, EffectRenderTarget, EffectRenderTarget] {
        const bw = Math.max(1, Math.ceil(coef.width / 8));
        const bh = Math.max(1, Math.ceil(coef.height / 8));
        if (
            !this.#rowScan ||
            !this.#cascade ||
            !this.#cascadeDrift ||
            bw !== this.#blocksW ||
            bh !== this.#blocksH
        ) {
            this.#rowScan?.dispose();
            this.#cascade?.dispose();
            this.#cascadeDrift?.dispose();
            const opts = {
                size: [bw, bh] as const,
                float: true,
                filter: "nearest" as const,
            };
            this.#rowScan = ctx.createRenderTarget(opts);
            this.#cascade = ctx.createRenderTarget(opts);
            this.#cascadeDrift = ctx.createRenderTarget(opts);
            this.#blocksW = bw;
            this.#blocksH = bh;
        }
        return [this.#rowScan, this.#cascade, this.#cascadeDrift];
    }
}
