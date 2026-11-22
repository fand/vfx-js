// Studio environment (holospot engine/scene/studioEnv.ts + env.frag, MIT © 2026 Dmitry Kurash), re-shaped for vfx-js.
//
// holospot renders env.frag into a cube and prefilters it with three's PMREM, read as textureLod(samplerCube, dir,
// uEnvMaxLod·r(2 − r)). vfx-js binds only 2D textures, so this port evaluates the same procedural studio (env.frag's
// functions, verbatim) straight into an octahedral atlas of ENV_LEVELS tiles, one per mip of that mapping: tile m holds
// the environment prefiltered with a GGX lobe of roughness r_m, r_m(2 − r_m) = m/uEnvMaxLod (split-sum, N = V = R,
// importance-sampled). Lookups blend the two nearest tiles (shader.ts `envOctLod`).
import envFrag from "../glsl/env.js";
import type { EnvLevels } from "../physics/geometry.js";
import { ENV_LEVELS, ENV_SIZE, GLSL_OCT } from "../shader.js";
import type { Mat3 } from "../types.js";
import { mulberry32 } from "./relief.js";

export { ENV_LEVELS, ENV_SIZE };

/** Fixed seed of the camera-side texture blobs (5 soft blobs, angular σ 12–25°, §5.3). */
const CAMERA_SIDE_SEED = 0x51ed;

/** Seeded blobs over the camera-side hemisphere and the hemisphere mean m of 0.5 + 4.5·B (holospot cameraSideBlobs). */
export function cameraSideBlobs(seed = CAMERA_SIDE_SEED): {
    blobs: Float32Array;
    norm: number;
} {
    const rnd = mulberry32(seed);
    const blobs: number[][] = [];
    for (let k = 0; k < 5; k++) {
        const z = rnd();
        const phi = 2 * Math.PI * rnd();
        const s = Math.sqrt(Math.max(0, 1 - z * z));
        const sigma = ((12 + 13 * rnd()) * Math.PI) / 180;
        blobs.push([s * Math.cos(phi), s * Math.sin(phi), z, sigma]);
    }
    const NZ = 96;
    const NP = 192;
    let sum = 0;
    for (let i = 0; i < NZ; i++) {
        const z = (i + 0.5) / NZ;
        const s = Math.sqrt(1 - z * z);
        for (let j = 0; j < NP; j++) {
            const phi = (2 * Math.PI * (j + 0.5)) / NP;
            const x = s * Math.cos(phi);
            const y = s * Math.sin(phi);
            let B = 0;
            for (const b of blobs) {
                const a =
                    Math.acos(
                        Math.min(
                            1,
                            Math.max(-1, x * b[0] + y * b[1] + z * b[2]),
                        ),
                    ) / b[3];
                B = Math.max(B, Math.exp(-0.5 * a * a));
            }
            sum += 0.5 + 4.5 * B;
        }
    }
    return { blobs: new Float32Array(blobs.flat()), norm: sum / (NZ * NP) };
}

/**
 * `uEnvRot` = R_z(−rotation)·mat3(conj(Q_L)) (holospot envRotation), column-major: world direction → environment lookup.
 * `rig` is mat3(conj(Q_L)), row-major: the inverse of the light rig's rotation (identity when the rig is not turned).
 */
export function envRotation(rotationDeg: number, rig?: Mat3): Float32Array {
    const a = (-rotationDeg * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const z: Mat3 = [c, -s, 0, s, c, 0, 0, 0, 1];
    const m = rig
        ? (Array.from({ length: 9 }, (_, i) => {
              const r = Math.floor(i / 3);
              const k = i % 3;
              return (
                  z[3 * r] * rig[k] +
                  z[3 * r + 1] * rig[3 + k] +
                  z[3 * r + 2] * rig[6 + k]
              );
          }) as unknown as Mat3)
        : z;
    return new Float32Array([
        m[0],
        m[3],
        m[6],
        m[1],
        m[4],
        m[7],
        m[2],
        m[5],
        m[8],
    ]);
}

export function sameLevels(a: EnvLevels | null, b: EnvLevels): boolean {
    return (
        !!a &&
        a.rims === b.rims &&
        a.fill === b.fill &&
        a.scrim === b.scrim &&
        a.cameraSide === b.cameraSide &&
        a.cameraTexture === b.cameraTexture &&
        a.behind === b.behind
    );
}

const ENV_FUNCS = envFrag
    .slice(0, envFrag.indexOf("void main()"))
    .replace("varying vec3 vDir;\n", "");

/** Prefilter pass: draws the whole atlas (ENV_SIZE × ENV_SIZE·ENV_LEVELS). */
export const FRAG_ENV_PREFILTER = `#version 300 es
precision highp float;
precision highp int;
#define gl_FragColor pc_fragColor
layout(location = 0) out highp vec4 pc_fragColor;
${ENV_FUNCS}
${GLSL_OCT}
const float ENV_SIZE_F = ${ENV_SIZE.toFixed(1)};
const float ENV_MAX_LOD = ${(ENV_LEVELS - 1).toFixed(1)};
const int SAMPLES = 192;

vec2 hammersley(int i, int n) {
  uint b = uint(i);
  b = (b << 16u) | (b >> 16u);
  b = ((b & 0x55555555u) << 1u) | ((b & 0xAAAAAAAAu) >> 1u);
  b = ((b & 0x33333333u) << 2u) | ((b & 0xCCCCCCCCu) >> 2u);
  b = ((b & 0x0F0F0F0Fu) << 4u) | ((b & 0xF0F0F0F0u) >> 4u);
  b = ((b & 0x00FF00FFu) << 8u) | ((b & 0xFF00FF00u) >> 8u);
  return vec2(float(i) / float(n), float(b) * 2.3283064365386963e-10);
}

void main() {
  float tile = floor(gl_FragCoord.y / ENV_SIZE_F);
  vec2 uv = vec2(gl_FragCoord.x, gl_FragCoord.y - tile * ENV_SIZE_F) / ENV_SIZE_F;
  vec3 n = octDecode(uv);
  if (tile < 0.5) {
    // the sharp level: 4× supersampled over the texel, as env.frag
    float h = 0.25 / ENV_SIZE_F;
    float L = 0.25 * (envStudio(octDecode(uv + vec2(-h, -h))) + envStudio(octDecode(uv + vec2(h, -h)))
                    + envStudio(octDecode(uv + vec2(-h, h))) + envStudio(octDecode(uv + vec2(h, h))));
    gl_FragColor = vec4(vec3(L), 1.0);
    return;
  }
  float r = 1.0 - sqrt(max(1.0 - tile / ENV_MAX_LOD, 0.0));   // tile = ENV_MAX_LOD·r(2 − r)
  float a = max(r * r, 1e-4);
  vec3 up = abs(n.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 tx = normalize(cross(up, n)), ty = cross(n, tx);
  float sum = 0.0, wsum = 0.0;
  for (int i = 0; i < SAMPLES; ++i) {
    vec2 xi = hammersley(i, SAMPLES);
    float phi = 6.28318530718 * xi.y;
    float ct = sqrt((1.0 - xi.x) / (1.0 + (a * a - 1.0) * xi.x));
    float st = sqrt(1.0 - ct * ct);
    vec3 hv = normalize(tx * (st * cos(phi)) + ty * (st * sin(phi)) + n * ct);
    vec3 l = reflect(-n, hv);
    float nl = dot(n, l);
    if (nl <= 0.0) continue;
    sum += envStudio(l) * nl;
    wsum += nl;
  }
  gl_FragColor = vec4(vec3(sum / max(wsum, 1e-6)), 1.0);
}
`;
