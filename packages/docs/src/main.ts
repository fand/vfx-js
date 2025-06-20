import { VFX } from "@vfx-js/core";

import Prism from "prismjs";
import "prism-themes/themes/prism-nord.min.css";

Prism.manual = true;
Prism.highlightAll();

function $(selector: string, parent?: HTMLElement) {
    return (parent ?? document).querySelector(selector) as HTMLElement;
}

function lerp(a: number, b: number, t: number) {
    return a * (1 - t) + b * t;
}

const shaders: Record<string, string> = {
    logo: `
    precision highp float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform float enterTime;
    uniform float leaveTime;
    uniform sampler2D src;

    uniform float delay;
    #define speed 2.0

    out vec4 outColor;

    float nn(float y, float t) {
        float n = (
            sin(y * .07 + t * 8. + sin(y * .5 + t * 10.)) +
            sin(y * .7 + t * 2. + sin(y * .3 + t * 8.)) * .7 +
            sin(y * 1.1 + t * 2.8) * .4
        );
        n += sin(y * 124. + t * 100.7) * sin(y * 877. - t * 38.8) * .3;
        return n;
    }

    vec4 readTex(sampler2D tex, vec2 uv) {
        if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) { return vec4(0); }
        return texture(tex, uv);
    }

    vec4 glitch(vec2 uv) {
        vec2 uvr = uv, uvg = uv, uvb = uv;
        float t = mod(time, 30.);
        float amp = 10. / resolution.x;
        if (abs(nn(uv.y, t)) > 1.) {
            uvr.x += nn(uv.y, t) * amp;
            uvg.x += nn(uv.y, t + 10.) * amp;
            uvb.x += nn(uv.y, t + 20.) * amp;
        }
        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        return vec4(
            cr.r,
            cg.g,
            cb.b,
            smoothstep(.0, 1., cr.a + cg.a + cb.a)
        );
    }
    vec4 slitscan(vec2 uv) {
        float t = max(enterTime - delay, 0.) * speed;
        if (t <= 0.0) {
            return vec4(0);
        }

        vec2 uvr = uv, uvg = uv, uvb = uv;
        uvr.x = min(uvr.x, t);
        uvg.x = min(uvg.x, max(t - 0.2, 0.));
        uvb.x = min(uvb.x, max(t - 0.4, 0.));

        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        return vec4(
            cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 1.
        );
    }

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        if (leaveTime > 0.) {
            float t = clamp(leaveTime - 0.5, 0., 1.);
            outColor = glitch(uv) * (1. - t);
        } else if (enterTime < 1.0) {
            outColor = slitscan(uv);
        } else {
            outColor = glitch(uv);
        }
    }
    `,
    blob: `
    precision highp float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform sampler2D src;
    out vec4 outColor;

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hueShift(vec3 rgb, float t) {
        vec3 hsv = rgb2hsv(rgb);
        hsv.x = fract(hsv.x + t);
        return hsv2rgb(hsv);
    }

    vec4 readTex(vec2 uv) {
        vec2 d = 3. / resolution.xy;
        vec4 c = vec4(0);
        c += texture(src, uv + vec2(1, 0) * d);
        c += texture(src, uv - vec2(1, 0) * d);
        c += texture(src, uv + vec2(0, 1) * d);
        c += texture(src, uv - vec2(0, 1) * d);
        return c / 4.;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        vec4 img = texture(src, uv);

        float gray = dot(img.rgb, vec3(0.2, 0.7, 0.1));

        vec2 d = (uv - .5) * vec2(resolution.x / resolution.y, 1);
        float l = length(d);

        // Colorize
        img.rgb = mix(img.rgb, vec3(.8, .4, .4), sin(gray * 3. - time));

        // Hue shift
        float shift = fract(gray + l - time * 0.2);
        img.rgb = hueShift(img.rgb, shift);

        img.a *= 0.5;
        outColor = img;
    }
    `,
    canvas: `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;
out vec4 outColor;

#define ZOOM(uv, x) ((uv - .5) / x + .5)

void main (void) {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;

    float r = sin(time) * 0.5 + 0.5;

    float l = pow(length(uv - .5), 2.);
    uv = (uv - .5) *  (1. - l * 0.3 * r) + .5;


    float n = 0.02 + r * 0.03;
    vec4 cr = texture(src, ZOOM(uv, 1.00));
    vec4 cg = texture(src, ZOOM(uv, (1. + n)));
    vec4 cb = texture(src, ZOOM(uv, (1. + n * 2.)));

    outColor = vec4(cr.r, cg.g, cb.b, 1);
}
    `,
    custom: `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;
uniform float scroll;
out vec4 outColor;

void main (void) {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    uv.x = fract(uv.x + scroll + time * 0.2);
    outColor = texture(src, uv);
}
    `,
};

class App {
    vfx = new VFX({
        pixelRatio: window.devicePixelRatio,
        zIndex: -1,
    });
    vfx2 = new VFX({
        pixelRatio: 1,
        zIndex: -2,
        scrollPadding: false,
    });

    async initBG() {
        const bg = $("#BG");

        let scroll = 0;
        function lerp(a: number, b: number, t: number): number {
            return a * (1 - t) + b * t;
        }

        function loop() {
            scroll = lerp(scroll, window.scrollY, 0.03);
            bg.style.setProperty("transform", `translateY(-${scroll * 0.1}px)`);

            requestAnimationFrame(loop);
        }
        loop();

        await this.vfx2.add(bg, { shader: shaders.blob });
    }

    async initVFX() {
        await Promise.all(
            Array.from(document.querySelectorAll("*[data-shader]")).map((e) => {
                const shader = e.getAttribute("data-shader") as string;

                const uniformsJSON = e.getAttribute("data-uniforms");
                const uniforms = uniformsJSON
                    ? JSON.parse(uniformsJSON)
                    : undefined;

                return this.vfx.add(e as HTMLImageElement, {
                    shader,
                    overflow: Number.parseFloat(
                        e.getAttribute("data-overflow") ?? "0",
                    ),
                    uniforms,
                    intersection: {
                        threshold: Number.parseFloat(
                            e.getAttribute("data-threshold") ?? "0",
                        ),
                    },
                });
            }),
        );
    }

    async initDiv() {
        const div = $("#div");
        await this.vfx.add(div, { shader: "rgbShift", overflow: 100 });

        for (const input of div.querySelectorAll("input,textarea")) {
            input.addEventListener("input", () => this.vfx.update(div));
        }

        const textarea = $("textarea", div);
        const mo = new MutationObserver(() => this.vfx.update(div));
        mo.observe(textarea, {
            attributes: true,
        });
    }

    async initCanvas() {
        const canvas = document.getElementById("canvas") as HTMLCanvasElement;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw "Failed to get the canvas context";
        }

        const { width, height } = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio ?? 1;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        ctx.scale(ratio, ratio);

        let target = [width / 2, height / 2];
        let p = target;
        const ps = [p];
        let isMouseOn = false;
        const startTime = Date.now();

        canvas.addEventListener("mousemove", (e) => {
            isMouseOn = true;
            target = [e.offsetX, e.offsetY];
        });
        canvas.addEventListener("mouseleave", (e) => {
            isMouseOn = false;
        });

        let isInside = false;
        const io = new IntersectionObserver(
            (changes) => {
                for (const c of changes) {
                    isInside = c.intersectionRatio > 0.1;
                }
            },
            { threshold: [0, 1, 0.2, 0.8] },
        );
        io.observe(canvas);

        const drawMouseStalker = () => {
            requestAnimationFrame(drawMouseStalker);

            if (!isInside) {
                return;
            }

            if (!isMouseOn) {
                const t = Date.now() / 1000 - startTime;
                target = [
                    width * 0.5 + Math.sin(t * 1.3) * width * 0.3,
                    height * 0.5 + Math.sin(t * 1.7) * height * 0.3,
                ];
            }
            p = [lerp(p[0], target[0], 0.1), lerp(p[1], target[1], 0.1)];

            ps.push(p);
            ps.splice(0, ps.length - 30);

            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = "white";
            ctx.font = `bold ${width * 0.14}px sans-serif`;
            ctx.fillText("HOVER ME", width / 2, height / 2);
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";

            for (let i = 0; i < ps.length; i++) {
                const [x, y] = ps[i];
                const t = (i / ps.length) * 255;
                ctx.fillStyle = `rgba(${255 - t}, 255, ${t}, ${(i / ps.length) * 0.5 + 0.5})`;
                ctx.beginPath();
                ctx.arc(x, y, i + 20, 0, 2 * Math.PI);
                ctx.fill();
            }

            this.vfx.update(canvas);
        };
        drawMouseStalker();

        await this.vfx.add(canvas, { shader: shaders.canvas });
    }

    async initCustomShader() {
        const e = $("#custom");
        await this.vfx.add(e, {
            shader: shaders.custom,
            uniforms: { scroll: () => window.scrollY / window.innerHeight },
        });
    }

    hideMask() {
        const maskTop = $("#MaskTop");
        maskTop.style.setProperty("height", "0");

        const maskBottom = $("#MaskBottom");
        maskBottom.style.setProperty("opacity", "0");
    }

    async showLogo() {
        const logo = $("#Logo");
        const tagline = $("#LogoTagline");
        return Promise.all([
            this.vfx.add(logo, {
                shader: shaders.logo,
                overflow: [0, 3000, 0, 100],
                uniforms: { delay: 0 },
                intersection: {
                    threshold: 1,
                },
            }),
            this.vfx.add(tagline, {
                shader: shaders.logo,
                overflow: [0, 3000, 0, 1000],
                uniforms: { delay: 0.3 },
                intersection: {
                    threshold: 1,
                },
            }),
        ]);
    }

    async showProfile() {
        const profile = $("#profile");
        await this.vfx.add(profile, {
            shader: shaders.logo,
            overflow: [0, 3000, 0, 2000],
            uniforms: { delay: 0.5 },
            intersection: {
                rootMargin: [-100, 0, -100, 0],
                threshold: 1,
            },
        });
    }
}

window.addEventListener("load", async () => {
    const app = new App();
    await app.initBG();

    await Promise.all([
        await app.initVFX(),
        app.initDiv(),
        app.initCanvas(),
        app.initCustomShader(),
    ]);

    app.hideMask();
    setTimeout(() => {
        app.showLogo();
        app.showProfile();
    }, 2000);
});
