import type { VFXPass } from "@vfx-js/core";

const copyShader = `
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    outColor = texture(src, uv);
}
`;

const curlShader = `
precision highp float;
uniform sampler2D velocity;
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 t = 1.0 / resolution;
    float L = texture(velocity, uv - vec2(t.x, 0.0)).y;
    float R = texture(velocity, uv + vec2(t.x, 0.0)).y;
    float T = texture(velocity, uv + vec2(0.0, t.y)).x;
    float B = texture(velocity, uv - vec2(0.0, t.y)).x;
    outColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}
`;

const vorticityShader = `
precision highp float;
uniform sampler2D velocity;
uniform sampler2D curl;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform vec2 mouse;
uniform vec2 mouseDelta;
uniform float curlStrength;
uniform float splatForce;
uniform float splatRadius;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 t = 1.0 / resolution;
    float aspect = resolution.x / resolution.y;

    // Vorticity confinement
    float L = abs(texture(curl, uv - vec2(t.x, 0.0)).x);
    float R = abs(texture(curl, uv + vec2(t.x, 0.0)).x);
    float T = abs(texture(curl, uv + vec2(0.0, t.y)).x);
    float B = abs(texture(curl, uv - vec2(0.0, t.y)).x);
    float C = texture(curl, uv).x;

    vec2 force = vec2(T - B, R - L);
    float len = length(force);
    force = len > 0.0001 ? force / len : vec2(0.0);
    force *= curlStrength * C;
    force.y *= -1.0;

    vec2 vel = texture(velocity, uv).xy;
    vel += force * 0.016;
    vel = clamp(vel, vec2(-1000.0), vec2(1000.0));

    // Mouse velocity splat
    vec2 mouseUv = mouse / resolution;
    vec2 diff = uv - mouseUv;
    diff.x *= aspect;
    float mSplat = exp(-dot(diff, diff) / splatRadius);
    vel += (mouseDelta / resolution) * mSplat * splatForce;

    outColor = vec4(vel, 0.0, 1.0);
}
`;

const divergenceShader = `
precision highp float;
uniform sampler2D vort_vel;
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 t = 1.0 / resolution;
    float L = texture(vort_vel, uv - vec2(t.x, 0.0)).x;
    float R = texture(vort_vel, uv + vec2(t.x, 0.0)).x;
    float T = texture(vort_vel, uv + vec2(0.0, t.y)).y;
    float B = texture(vort_vel, uv - vec2(0.0, t.y)).y;
    vec2 C = texture(vort_vel, uv).xy;
    // Boundary: reflect velocity (no-flow-through walls)
    if (uv.x - t.x < 0.0) L = -C.x;
    if (uv.x + t.x > 1.0) R = -C.x;
    if (uv.y + t.y > 1.0) T = -C.y;
    if (uv.y - t.y < 0.0) B = -C.y;
    outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}
`;

// Pressure init (zero start each frame)
const pressureInitShader = `
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`;

// Jacobi pressure iteration
const pressureShader = `
precision highp float;
uniform sampler2D src;
uniform sampler2D divergence;
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 t = 1.0 / resolution;
    float L = texture(src, uv - vec2(t.x, 0.0)).x;
    float R = texture(src, uv + vec2(t.x, 0.0)).x;
    float T = texture(src, uv + vec2(0.0, t.y)).x;
    float B = texture(src, uv - vec2(0.0, t.y)).x;
    float div = texture(divergence, uv).x;
    outColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}
`;

// Gradient subtraction from final pressure buffer
function makeGradientShader(pressureBuffer: string) {
    return `
precision highp float;
uniform sampler2D vort_vel;
uniform sampler2D ${pressureBuffer};
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 t = 1.0 / resolution;
    float L = texture(${pressureBuffer}, uv - vec2(t.x, 0.0)).x;
    float R = texture(${pressureBuffer}, uv + vec2(t.x, 0.0)).x;
    float T = texture(${pressureBuffer}, uv + vec2(0.0, t.y)).x;
    float B = texture(${pressureBuffer}, uv - vec2(0.0, t.y)).x;
    vec2 vel = texture(vort_vel, uv).xy;
    vel -= vec2(R - L, T - B);
    outColor = vec4(vel, 0.0, 1.0);
}
`;
}

const advectVelShader = `
precision highp float;
uniform sampler2D proj_vel;
uniform vec2 resolution;
uniform vec2 offset;
uniform float velocityDissipation;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 t = 1.0 / resolution;
    vec2 vel = texture(proj_vel, uv).xy;
    vec2 coord = uv - vel * t * 0.016;
    vec2 advected = texture(proj_vel, coord).xy;
    advected /= 1.0 + velocityDissipation * 0.016;
    outColor = vec4(advected, 0.0, 1.0);
}
`;

const advectDyeShader = `
precision highp float;
uniform sampler2D velocity;
uniform sampler2D dye;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform vec2 mouse;
uniform vec2 mouseDelta;
uniform vec2 simSize;
uniform float densityDissipation;
uniform float dyeSplatRadius;
uniform float dyeSplatIntensity;
out vec4 outColor;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    float aspect = resolution.x / resolution.y;

    // Velocity is in sim-texel units; convert to UV displacement
    vec2 vel = texture(velocity, uv).xy;
    vec2 velTexel = 1.0 / simSize;
    vec2 coord = uv - vel * velTexel * 0.016;
    vec3 d = texture(dye, coord).rgb;

    d /= 1.0 + densityDissipation * 0.016;

    // Mouse dye splat (speed-dependent, random color)
    vec2 mouseUv = mouse / resolution;
    vec2 diff = uv - mouseUv;
    diff.x *= aspect;
    float mSplat = exp(-dot(diff, diff) / dyeSplatRadius);
    float mSpeed = length(mouseDelta);
    vec3 mColor = hsv2rgb(vec3(fract(time * 0.06), 0.85, 1.0));
    d += mColor * mSplat * clamp(mSpeed * dyeSplatIntensity, 0.0, 3.0);

    outColor = vec4(max(d, vec3(0.0)), 1.0);
}
`;

const displayShader = `
precision highp float;
uniform sampler2D dye;
uniform sampler2D velocity;
uniform sampler2D canvas;
uniform vec2 resolution;
uniform vec2 offset;
uniform vec2 simSize;
uniform float showDye;
uniform float time;
out vec4 outColor;

vec3 spectrum(float x) {
  return cos((x - vec3(0, .5, 1)) * vec3(.6, 1., .5) * 3.14);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec3 c = texture(dye, uv).rgb;

    if (showDye > 0.5) {
        float a = max(c.r, max(c.g, c.b));
        outColor = vec4(c, a);
    } else {
        vec2 vel = texture(velocity, uv).xy;
        vec2 disp = vel / simSize;

        vec2 cr = texture(canvas, uv - disp * 0.080).ra;
        vec2 cg = texture(canvas, uv - disp * 0.060).ga;
        vec2 cb = texture(canvas, uv - disp * 0.040).ba;
        outColor = vec4(cr.x, cg.x, cb.x, (cr.y + cg.y + cb.y) / 3.);

        float v = length(disp);
        outColor += vec4(spectrum(sin(v * 3. + time) * 0.4 + 0.5), 1) * smoothstep(.2, .8, v) * 0.2;
    }
}
`;

// Build Jacobi pressure solver chain (alternates p_a / p_b)
function makePressurePasses(simSize: [number, number], iterations: number) {
    const passes: VFXPass[] = [];
    passes.push({
        frag: pressureInitShader,
        target: "p_a",
        float: true,
        size: simSize,
    });
    let lastTarget = "p_a";
    for (let i = 0; i < iterations; i++) {
        lastTarget = i % 2 === 0 ? "p_b" : "p_a";
        passes.push({
            frag: pressureShader,
            target: lastTarget,
            float: true,
            size: simSize,
        });
    }
    return { passes, lastTarget };
}

export interface FluidPassesOpts {
    simSize: [number, number];
    pressureIterations: number;
    curlStrength: number;
    velocityDissipation: number;
    densityDissipation: number;
    splatForce: number;
    splatRadius: number;
    dyeSplatRadius: number;
    dyeSplatIntensity: number;
    showDye: boolean;
    mouseDelta: () => [number, number];
    time: () => number;
}

export function buildFluidPasses(opts: FluidPassesOpts): VFXPass[] {
    const { simSize, mouseDelta } = opts;
    const pressure = makePressurePasses(simSize, opts.pressureIterations);

    return [
        // Copy canvas to named buffer
        { frag: copyShader, target: "canvas" },
        {
            frag: curlShader,
            target: "curl",
            float: true,
            size: simSize,
        },
        {
            frag: vorticityShader,
            target: "vort_vel",
            float: true,
            size: simSize,
            uniforms: {
                mouseDelta,
                curlStrength: opts.curlStrength,
                splatForce: opts.splatForce,
                splatRadius: opts.splatRadius,
            },
        },
        {
            frag: divergenceShader,
            target: "divergence",
            float: true,
            size: simSize,
        },
        ...pressure.passes,
        {
            frag: makeGradientShader(pressure.lastTarget),
            target: "proj_vel",
            float: true,
            size: simSize,
        },
        {
            frag: advectVelShader,
            target: "velocity",
            persistent: true,
            float: true,
            size: simSize,
            uniforms: {
                velocityDissipation: opts.velocityDissipation,
            },
        },
        {
            frag: advectDyeShader,
            target: "dye",
            persistent: true,
            float: true,
            uniforms: {
                mouseDelta,
                time: opts.time,
                simSize,
                densityDissipation: opts.densityDissipation,
                dyeSplatRadius: opts.dyeSplatRadius,
                dyeSplatIntensity: opts.dyeSplatIntensity,
            },
        },
        {
            frag: displayShader,
            uniforms: {
                showDye: opts.showDye ? 1.0 : 0.0,
                time: opts.time,
                simSize,
            },
        },
    ];
}
