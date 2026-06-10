import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

// The 2D 8x8 DCT is separable: a rows pass then a columns pass, 8 taps each.
// All passes run premultiplied so transparent texels don't bleed into the DCT
// or chroma subsampling; alpha rides along as a 4th plane using the luma table.

const HEADER = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
`;

const DCT = `
const float PI = 3.141592653589793;
float cc(int k){ return k == 0 ? 0.7071067811865476 : 1.0; }
`;

const YCC = `
vec3 rgb2ycc(vec3 c){
  return vec3(
     0.299*c.r + 0.587*c.g + 0.114*c.b,
    -0.168736*c.r - 0.331264*c.g + 0.5*c.b,
     0.5*c.r - 0.418688*c.g - 0.081312*c.b);
}
vec3 ycc2rgb(vec3 y){
  return vec3(
    y.x + 1.402   * y.z,
    y.x - 0.344136* y.y - 0.714136 * y.z,
    y.x + 1.772   * y.y);
}
`;

// b = 8x8 block origin, l = position within the block
const BLOCK = `
  ivec2 res = textureSize(src, 0);
  ivec2 p   = ivec2(uvSrc * vec2(res));
  ivec2 b   = (p / 8) * 8;
  ivec2 l   = p - b;
`;

/* straight-alpha capture -> premultiplied low-res raster */
const PRE = `${HEADER}
void main(){
  vec4 c = texture(src, uvSrc);
  outColor = vec4(c.rgb * c.a, c.a);
}`;

/* forward DCT, rows: RGB->YCbCr, level-shift, 1D DCT across x */
const FWDH = `${HEADER}${DCT}${YCC}
void main(){
${BLOCK}
  vec4 sum = vec4(0.0);
  for (int x = 0; x < 8; x++) {
    vec4 t = texelFetch(src, clamp(b + ivec2(x, l.y), ivec2(0), res - 1), 0);
    vec4 f = (vec4(rgb2ycc(t.rgb), t.a) - vec4(0.5, 0.0, 0.0, 0.5)) * 255.0;
    sum += f * cos(float(2*x+1) * float(l.x) * PI / 16.0);
  }
  outColor = sum * 0.5 * cc(l.x);
}`;

/* forward DCT, columns: 1D DCT across y -> full DCT coefficients */
const FWDV = `${HEADER}${DCT}
void main(){
${BLOCK}
  vec4 sum = vec4(0.0);
  for (int y = 0; y < 8; y++)
    sum += texelFetch(src, clamp(b + ivec2(l.x, y), ivec2(0), res - 1), 0)
         * cos(float(2*y+1) * float(l.y) * PI / 16.0);
  outColor = sum * 0.5 * cc(l.y);
}`;

/* inverse pass 1: quantize each coeff, 1D iDCT across columns */
const INVV = `${HEADER}${DCT}
uniform float uS;                              // libjpeg quality scale
const float LQ[64] = float[64](
  16.,11.,10.,16.,24.,40.,51.,61., 12.,12.,14.,19.,26.,58.,60.,55.,
  14.,13.,16.,24.,40.,57.,69.,56., 14.,17.,22.,29.,51.,87.,80.,62.,
  18.,22.,37.,56.,68.,109.,103.,77., 24.,35.,55.,64.,81.,104.,113.,92.,
  49.,64.,78.,87.,103.,121.,120.,101., 72.,92.,95.,98.,112.,100.,103.,99.);
const float CQ[64] = float[64](
  17.,18.,24.,47.,99.,99.,99.,99., 18.,21.,26.,66.,99.,99.,99.,99.,
  24.,26.,56.,99.,99.,99.,99.,99., 47.,66.,99.,99.,99.,99.,99.,99.,
  99.,99.,99.,99.,99.,99.,99.,99., 99.,99.,99.,99.,99.,99.,99.,99.,
  99.,99.,99.,99.,99.,99.,99.,99., 99.,99.,99.,99.,99.,99.,99.,99.);
float qstep(float base){ return clamp(floor((base * uS + 50.0) / 100.0), 1.0, 255.0); }
void main(){
${BLOCK}
  vec4 sum = vec4(0.0);
  for (int v = 0; v < 8; v++) {
    int idx = v * 8 + l.x;
    vec4 F  = texelFetch(src, clamp(b + ivec2(l.x, v), ivec2(0), res - 1), 0);
    vec4 q  = vec4(qstep(LQ[idx]), qstep(CQ[idx]), qstep(CQ[idx]), qstep(LQ[idx]));
    sum += cc(v) * round(F / q) * q * cos(float(2*l.y+1) * float(v) * PI / 16.0);
  }
  outColor = sum * 0.5;
}`;

/* inverse pass 2: 1D iDCT across rows, un-shift, YCbCr->RGB (still premultiplied) */
const INVH = `${HEADER}${DCT}${YCC}
void main(){
${BLOCK}
  vec4 sum = vec4(0.0);
  for (int u = 0; u < 8; u++)
    sum += cc(u) * texelFetch(src, clamp(b + ivec2(u, l.y), ivec2(0), res - 1), 0)
         * cos(float(2*l.x+1) * float(u) * PI / 16.0);
  sum = sum * 0.5 / 255.0 + vec4(0.5, 0.0, 0.0, 0.5);
  outColor = clamp(vec4(ycc2rgb(sum.xyz), sum.w), 0.0, 1.0);
}`;

/* 4:2:0 chroma subsample: box-downsample Cb/Cr to half res, bilinear upsample.
   Not a fixed point — chroma blurs further each pass, so the loop accumulates. */
const SUB = `${HEADER}${YCC}
vec2 cellChroma(ivec2 res, ivec2 cell){
  vec2 s = vec2(0.0);
  for (int j = 0; j < 2; j++)
  for (int i = 0; i < 2; i++) {
    ivec2 ip = clamp(cell * 2 + ivec2(i, j), ivec2(0), res - 1);
    s += rgb2ycc(texelFetch(src, ip, 0).rgb).yz;
  }
  return s * 0.25;
}
void main(){
  ivec2 res = textureSize(src, 0);
  ivec2 p   = ivec2(uvSrc * vec2(res));
  vec4 c0   = texelFetch(src, clamp(p, ivec2(0), res - 1), 0);
  float Y   = rgb2ycc(c0.rgb).x;               // luma stays full-res
  vec2 gpos = (vec2(p) + 0.5) * 0.5 - 0.5;     // position on the half-res chroma grid
  vec2 gi   = floor(gpos);
  vec2 f    = gpos - gi;
  ivec2 c   = ivec2(gi);
  vec2 cb = mix(
    mix(cellChroma(res, c + ivec2(0,0)), cellChroma(res, c + ivec2(1,0)), f.x),
    mix(cellChroma(res, c + ivec2(0,1)), cellChroma(res, c + ivec2(1,1)), f.x), f.y);
  outColor = vec4(clamp(ycc2rgb(vec3(Y, cb)), 0.0, 1.0), c0.a);
}`;

export type BadJpegEffectOptions = {
    quality?: number;
    iterations?: number;
    downscale?: number;
};

type LowResBuffers = {
    w: number;
    h: number;
    coeff: EffectRenderTarget;
    tmp: EffectRenderTarget;
    sub: EffectRenderTarget;
    a: EffectRenderTarget;
    b: EffectRenderTarget;
};

const LOW_RES_KEYS = ["coeff", "tmp", "sub", "a", "b"] as const;

/**
 * Simulates JPEG degradation: chroma subsampling, blocky DCT quantization,
 * and generation loss from re-encoding the result `iterations` times.
 * Mutate `quality` / `iterations` / `downscale` directly for runtime tweaks.
 *
 * @see GABIBI https://amix-design.com/tl/tool-gabibi/
 * @see DCT glitch https://qiita.com/FMS_Cat/items/6943c708a875984228b9
 */
export class BadJpegEffect implements Effect {
    quality: number;
    iterations: number;
    downscale: number;
    private lowRes: LowResBuffers | null = null;

    constructor({
        quality = 8,
        iterations = 3,
        downscale = 1.0,
    }: BadJpegEffectOptions = {}) {
        this.quality = quality;
        this.iterations = iterations;
        this.downscale = downscale;
    }

    // Low-res RT set sized floor(element * downscale); reallocated when dims change.
    private ensureLowRes(
        ctx: EffectContext,
        w: number,
        h: number,
    ): LowResBuffers {
        if (this.lowRes && this.lowRes.w === w && this.lowRes.h === h) {
            return this.lowRes;
        }
        this.disposeLowRes();
        const size: [number, number] = [w, h];
        this.lowRes = {
            w,
            h,
            coeff: ctx.createRenderTarget({ float: true, size }), // DCT coeffs (signed, large)
            tmp: ctx.createRenderTarget({ float: true, size }), // separable scratch
            sub: ctx.createRenderTarget({ size }), // chroma-subsampled spatial RGB
            a: ctx.createRenderTarget({ size }), // 8-bit ping-pong (generation loss)
            b: ctx.createRenderTarget({ size }),
        };
        return this.lowRes;
    }

    private disposeLowRes() {
        if (this.lowRes) {
            for (const k of LOW_RES_KEYS) {
                this.lowRes[k].dispose();
            }
            this.lowRes = null;
        }
    }

    render(ctx: EffectContext) {
        const N = Math.max(1, Math.min(10, this.iterations | 0));
        const q = Math.max(1, Math.min(100, this.quality));
        const S = q < 50 ? 5000 / q : 200 - 2 * q;
        const ds = Math.max(0.02, Math.min(1, this.downscale));

        // element size in CSS px, so the 8x8 block scale is DPI-independent
        const [W, H] = ctx.dims.element;
        const lw = Math.max(1, Math.floor(W * ds));
        const lh = Math.max(1, Math.floor(H * ds));
        const lowRes = this.ensureLowRes(ctx, lw, lh);

        // premultiply + shrink source onto the low-res raster
        ctx.draw({ frag: PRE, uniforms: { src: ctx.src }, target: lowRes.a });
        let input: EffectRenderTarget = lowRes.a;

        // JPEG-degrade loop, entirely at low res
        for (let k = 0; k < N; k++) {
            ctx.draw({
                frag: SUB,
                uniforms: { src: input },
                target: lowRes.sub,
            });
            ctx.draw({
                frag: FWDH,
                uniforms: { src: lowRes.sub },
                target: lowRes.tmp,
            });
            ctx.draw({
                frag: FWDV,
                uniforms: { src: lowRes.tmp },
                target: lowRes.coeff,
            });
            ctx.draw({
                frag: INVV,
                uniforms: { src: lowRes.coeff, uS: S },
                target: lowRes.tmp,
            });
            const out = k % 2 === 0 ? lowRes.b : lowRes.a;
            ctx.draw({
                frag: INVH,
                uniforms: { src: lowRes.tmp },
                target: out,
            });
            input = out;
        }

        // bilinear up-scale back to full output for the soft look
        ctx.blit(input, ctx.target);
    }

    dispose() {
        this.disposeLowRes();
    }
}
