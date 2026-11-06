import { type ShaderTransitionDef, shaderTransition } from "@vfx-js/core";
import { IGN, MIRROR } from "./_shared";

/**
 * A lens warps the content harder and harder, swaps it at the peak and relaxes.
 * The old content zooms in as it fades out; the new one zooms back out to normal.
 * At the peak the center is magnified and the edges fold back into it.
 * `strength` scales the warp. `dispersion` splits it into a rainbow; 0 turns it off.
 * `zoom` is the extra scale over the whole run; 0 turns it off.
 */
export function createLensDistortion(
    opts: { strength?: number; dispersion?: number; zoom?: number } = {},
): ShaderTransitionDef {
    const strength = (opts.strength ?? 1).toFixed(3);
    const dispersion = Math.max(0, opts.dispersion ?? 0.6).toFixed(3);
    const zoom = Math.max(0, opts.zoom ?? 3).toFixed(3);
    return shaderTransition({
        name: "lens_distortion",
        frag: `
const float STRENGTH = ${strength};
const float DISPERSION = ${dispersion};
const float TAPS = 12.0;
// Width of the growing warp's edge.
const float SOFT = 0.5;
// The old content zooms from 1 to 1 + ZOOM; the new one from 1 + ZOOM back to 1.
const float ZOOM = ${zoom};

${IGN}
${MIRROR}
vec4 transition(vec2 uv, float t) {
  // A container overflow must not show warped content outside the element.
  if (!inRange(uv)) return vec4(0.0);
  float mixT = smoothstep(0.35, 0.65, t);
  // Centered, with 1 at the top and bottom edges.
  float aspect = resolution.x / resolution.y;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= aspect;
  float l = length(p);
  // The first half grows the warp out from the center; the second half relaxes it.
  float amount = sin(t * 3.141593);
  if (t < 0.5) {
    float reach = t * 2.0 * (length(vec2(aspect, 1.0)) + SOFT);
    amount = 1.0 - smoothstep(reach - SOFT, reach, l);
  }
  float jitter = ign(gl_FragCoord.xy);
  float zoomFrom = 1.0 + ZOOM * t;
  float zoomTo = 1.0 + ZOOM * (1.0 - t);

  vec3 rgb = vec3(0.0);
  vec3 total = vec3(0.0);
  float alpha = 0.0;
  for (float n = 0.0; n < TAPS; n += 1.0) {
    float k = (n + jitter) / TAPS;
    float s = amount * STRENGTH * (1.0 + DISPERSION * (k - 0.5) * 2.0);
    vec2 q = p * (1.0 - l * s);
    q.x /= aspect;
    vec4 c = vec4(0.0);
    if (mixT < 1.0) c += readFrom(mirror(q / zoomFrom * 0.5 + 0.5)) * (1.0 - mixT);
    if (mixT > 0.0) c += readTo(mirror(q / zoomTo * 0.5 + 0.5)) * mixT;
    // Each tap adds to the color channels near its place in the spectrum.
    vec3 w = max(vec3(0.0), 1.0 - abs(vec3(k) - vec3(0.0, 0.5, 1.0)) * 2.0);
    rgb += c.rgb * w;
    total += w;
    alpha += c.a;
  }
  return vec4(rgb / total, alpha / TAPS);
}
`,
    });
}

/** Lens warp with a strong rainbow split. */
export const lensDistortion: ShaderTransitionDef = createLensDistortion();
