import type { VFXProps, VFXPostEffect } from "@vfx-js/core";
import type { Meta } from "@storybook/html";
import { Timer } from "./Timer";

import { initVFX } from "./utils";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";

interface PostEffectProps {
  src?: string;
  overflow?: number;
  uniforms?: VFXProps["uniforms"];
  preset: string;
  postEffect: VFXPostEffect;
  defaultTime?: number;
}

export default {
  title: "Post Effects",
  render: (opts: PostEffectProps) => {
    const timer = new Timer(opts.defaultTime ?? 0, [0, 10]);
    document.body.append(timer.element);

    const img = document.createElement("img");
    img.src = opts.src ?? Logo;

    const vfx = initVFX({
      postEffect: opts.postEffect,
    });

    vfx.add(img, {
      shader: opts.preset,
      overflow: opts.overflow,
      uniforms: { ...(opts.uniforms ?? {}), time: () => timer.time },
    });

    return img;
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<PostEffectProps>;

const story = (props: PostEffectProps) => ({ args: props });

// Feedback effect using backbuffer
export const FeedbackEffect = story({
  src: Logo,
  preset: "uvGradient",
  defaultTime: 1.0,
  postEffect: {
    shader: `
            precision highp float;
            uniform sampler2D src;
            uniform sampler2D backbuffer;
            uniform vec2 resolution;
            uniform vec2 offset;
            uniform float time;
            out vec4 outColor;

            void main() {
                vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                vec4 current = texture(src, uv);

                vec2 feedbackOffset = vec2(
                    sin(uv.y * 31. + time * 1.0) + sin(uv.y * 17. + time * 0.7),
                    cos(uv.x * 23. + time * 1.5) + cos(uv.x * 19. + time * 0.9)
                ) * 0.001;
                vec4 previous = texture(backbuffer, uv + feedbackOffset);

                outColor = mix(current, previous * 0.99, 1. - current.a);
            }
        `,
    backbuffer: true,
  },
});

// Stable Fluid (Navier-Stokes multipass pipeline)

const fluidCopyShader = `
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

const fluidCurlShader = `
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

const fluidVorticityShader = `
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

const fluidDivergenceShader = `
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
const fluidPressureInitShader = `
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`;

// Jacobi pressure iteration
const fluidPressureShader = `
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

const fluidAdvectVelShader = `
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

const fluidAdvectDyeShader = `
precision highp float;
uniform sampler2D velocity;
uniform sampler2D backbuffer;
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
    vec3 dye = texture(backbuffer, coord).rgb;

    dye /= 1.0 + densityDissipation * 0.016;

    // Mouse dye splat (speed-dependent, random color)
    vec2 mouseUv = mouse / resolution;
    vec2 diff = uv - mouseUv;
    diff.x *= aspect;
    float mSplat = exp(-dot(diff, diff) / dyeSplatRadius);
    float mSpeed = length(mouseDelta);
    vec3 mColor = hsv2rgb(vec3(fract(time * 0.06), 0.85, 1.0));
    dye += mColor * mSplat * clamp(mSpeed * dyeSplatIntensity, 0.0, 3.0);

    outColor = vec4(max(dye, vec3(0.0)), 1.0);
}
`;

const fluidDisplayShader = `
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

        vec2 cr = texture(canvas, uv - disp * 0.050).ra;
        vec2 cg = texture(canvas, uv - disp * 0.045).ga;
        vec2 cb = texture(canvas, uv - disp * 0.040).ba;
        outColor = vec4(cr.x, cg.x, cb.x, (cr.y + cg.y + cb.y) / 3.);

        float v = length(disp);
        outColor += vec4(spectrum(sin(v * 3. + time) * 0.4 + 0.5), 1) * smoothstep(.2, .8, v) * 0.2;
    }
}
`;

// Build Jacobi pressure solver chain (alternates p_a / p_b)
function makePressurePasses(simSize: [number, number], iterations = 20) {
  const passes = [];
  passes.push({
    frag: fluidPressureInitShader,
    target: "p_a",
    format: "Float" as const,
    size: simSize,
  });
  let lastTarget = "p_a";
  for (let i = 0; i < iterations; i++) {
    lastTarget = i % 2 === 0 ? "p_b" : "p_a";
    passes.push({
      frag: fluidPressureShader,
      target: lastTarget,
      format: "Float" as const,
      size: simSize,
    });
  }
  return { passes, lastTarget };
}

interface FluidArgs {
  simResolution: number;
  pressureIterations: number;
  curlStrength: number;
  velocityDissipation: number;
  densityDissipation: number;
  splatForce: number;
  splatRadius: number;
  dyeSplatRadius: number;
  dyeSplatIntensity: number;
  showDye: boolean;
}

export const StableFluid = {
  args: {
    simResolution: 128,
    pressureIterations: 1,
    curlStrength: 13,
    velocityDissipation: 0.6,
    densityDissipation: 0.65,
    splatForce: 6000,
    splatRadius: 0.002,
    dyeSplatRadius: 0.001,
    dyeSplatIntensity: 0.005,
    showDye: false,
  } satisfies FluidArgs,
  argTypes: {
    simResolution: { control: { type: "range", min: 32, max: 512, step: 32 } },
    pressureIterations: {
      control: { type: "range", min: 1, max: 40, step: 1 },
    },
    curlStrength: { control: { type: "range", min: 0, max: 100, step: 1 } },
    velocityDissipation: {
      control: { type: "range", min: 0, max: 5, step: 0.05 },
    },
    densityDissipation: {
      control: { type: "range", min: 0, max: 5, step: 0.05 },
    },
    splatForce: { control: { type: "range", min: 100, max: 20000, step: 100 } },
    splatRadius: {
      control: { type: "range", min: 0.0001, max: 0.01, step: 0.0001 },
    },
    dyeSplatRadius: {
      control: { type: "range", min: 0.0001, max: 0.01, step: 0.0001 },
    },
    dyeSplatIntensity: {
      control: { type: "range", min: 0.001, max: 0.03, step: 0.001 },
    },
    showDye: { control: "boolean" },
  },
  render: (args: FluidArgs) => {
    let prevMouseX = -1;
    let prevMouseY = -1;
    let mouseDeltaX = 0;
    let mouseDeltaY = 0;
    let lastMoveTime = 0;

    const onMove = (x: number, y: number) => {
      if (prevMouseX >= 0) {
        mouseDeltaX = x - prevMouseX;
        mouseDeltaY = y - prevMouseY;
      }
      prevMouseX = x;
      prevMouseY = y;
      lastMoveTime = performance.now();
    };

    window.addEventListener("mousemove", (e) => {
      onMove(e.clientX, window.innerHeight - e.clientY);
    });
    window.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      prevMouseX = t.clientX;
      prevMouseY = window.innerHeight - t.clientY;
    });
    window.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        const t = e.touches[0];
        onMove(t.clientX, window.innerHeight - t.clientY);
      },
      { passive: false }
    );

    const mouseDelta = (): [number, number] => {
      const elapsed = performance.now() - lastMoveTime;
      const decay = Math.exp(-elapsed * 0.01);
      return [mouseDeltaX * decay, mouseDeltaY * decay];
    };

    const SIM = args.simResolution;
    const aspect = window.innerWidth / window.innerHeight;
    const simSize: [number, number] =
      aspect > 1
        ? [Math.round(SIM * aspect), SIM]
        : [SIM, Math.round(SIM / aspect)];

    const img = document.createElement("img");
    img.src = Logo;

    const vorticityUniforms = {
      mouseDelta,
      curlStrength: args.curlStrength,
      splatForce: args.splatForce,
      splatRadius: args.splatRadius,
    };
    const advectVelUniforms = {
      velocityDissipation: args.velocityDissipation,
    };
    const advectDyeUniforms = {
      mouseDelta,
      simSize,
      densityDissipation: args.densityDissipation,
      dyeSplatRadius: args.dyeSplatRadius,
      dyeSplatIntensity: args.dyeSplatIntensity,
    };

    const pressure = makePressurePasses(simSize, args.pressureIterations);

    const vfx = initVFX({
      postEffect: [
        // Copy canvas to named buffer
        { frag: fluidCopyShader, target: "canvas" },
        {
          frag: fluidCurlShader,
          target: "curl",
          format: "Float",
          size: simSize,
        },
        {
          frag: fluidVorticityShader,
          target: "vort_vel",
          format: "Float",
          size: simSize,
          uniforms: vorticityUniforms,
        },
        {
          frag: fluidDivergenceShader,
          target: "divergence",
          format: "Float",
          size: simSize,
        },
        ...pressure.passes,
        {
          frag: makeGradientShader(pressure.lastTarget),
          target: "proj_vel",
          format: "Float",
          size: simSize,
        },
        {
          frag: fluidAdvectVelShader,
          target: "velocity",
          persistent: true,
          format: "Float",
          size: simSize,
          uniforms: advectVelUniforms,
        },
        {
          frag: fluidAdvectDyeShader,
          target: "dye",
          persistent: true,
          format: "Float",
          uniforms: advectDyeUniforms,
        },
        {
          frag: fluidDisplayShader,
          uniforms: { showDye: args.showDye ? 1.0 : 0.0, simSize },
        },
      ],
    });

    vfx.add(img, { shader: "uvGradient" });

    return img;
  },
  parameters: {
    layout: "fullscreen",
  },
};

// Multiple VFXElements with post effect (test for render target clearing fix)
export const MultipleElements = {
  render: () => {
    const timer = new Timer(0, [0, 10]);
    document.body.append(timer.element);

    const uniforms = {
      time: () => timer.time,
    };

    const container = document.createElement("div");

    // Create three images with different effects
    const img1 = document.createElement("img");
    img1.src = Logo;
    img1.width = 300;

    const img2 = img1.cloneNode() as HTMLImageElement;
    const img3 = img1.cloneNode() as HTMLImageElement;

    container.appendChild(img1);
    container.appendChild(img2);
    container.appendChild(img3);

    const vfx = initVFX({
      postEffect: {
        shader: "invert",
      },
    });

    // Add different shader effects to each element
    vfx.add(img1, { shader: "rgbShift", uniforms });
    vfx.add(img2, { shader: "sinewave", uniforms });
    vfx.add(img3, { shader: "uvGradient", uniforms });

    return container;
  },
};
