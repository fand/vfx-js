import type { Effect, TransitionDef } from "@vfx-js/core";
import { JPEGGlitchEffect } from "@vfx-js/effects";

/** Glitch only in the middle; outside it the live capture shows with no codec lag. */
const WINDOW = 0.12;
/** Re-glitches per second. The real rate is capped by encode/decode latency. */
const SPEED = 30;

/**
 * Hard cut through a real JPEG glitch: the content is encoded, its bytes
 * corrupted and decoded again. The corruption peaks at the cut halfway.
 */
export function createJpegGlitch(
    opts: { iterations?: number; quality?: number } = {},
): TransitionDef {
    const maxIterations = Math.max(1, Math.round(opts.iterations ?? 64));
    const quality = Math.min(Math.max(opts.quality ?? 0.3, 0), 1);

    return {
        name: "jpeg_glitch",
        frag: `
vec4 transition(vec2 uv, float t) {
  return t < 0.5 ? readFrom(uv) : readTo(uv);
}
`,
        // Linear, so the glitch window and the cut line up with the envelope.
        ease: "linear",
        async effects(): Promise<Effect[]> {
            const effect = new JPEGGlitchEffect({ quality, bypass: true });
            effect.enabled = false;
            return [effect];
        },
        prepare(_run, fx) {
            const effect = fx[0] as JPEGGlitchEffect;
            effect.params.bypass = true;
            effect.params.speed = SPEED;
            effect.params.quality = quality;
            effect.enabled = true;
        },
        onFrame(_t, x, _dt, fx) {
            const effect = fx[0] as JPEGGlitchEffect;
            const active = x > WINDOW && x < 1 - WINDOW;
            effect.params.bypass = !active;
            const amount = Math.sin(Math.min(Math.max(x, 0), 1) * Math.PI);
            effect.params.iterations = Math.max(
                1,
                Math.round(maxIterations * amount),
            );
        },
        onEnd(fx) {
            const effect = fx[0] as JPEGGlitchEffect;
            effect.enabled = false;
            effect.params.bypass = true;
        },
    };
}

export const jpegGlitch: TransitionDef = createJpegGlitch();
