import { VFX } from "@vfx-js/core";

import Prism from "prismjs";
import "prism-themes/themes/prism-nord.min.css";

Prism.manual = true;
Prism.highlightAll();

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
    uniform sampler2D src;

    uniform float delay;
    #define speed 2.0

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
        return texture2D(tex, uv);
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
        if (enterTime < 1.0) {
            gl_FragColor = slitscan(uv);
        } else {
            gl_FragColor = glitch(uv);
        }
    }
    `,
    blob: `
    precision highp float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform sampler2D src;

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
        c += texture2D(src, uv + vec2(1, 0) * d);
        c += texture2D(src, uv - vec2(1, 0) * d);
        c += texture2D(src, uv + vec2(0, 1) * d);
        c += texture2D(src, uv - vec2(0, 1) * d);
        return c / 4.;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        vec4 img = texture2D(src, uv);

        float gray = dot(img.rgb, vec3(0.2, 0.7, 0.1));

        vec2 d = (uv - .5) * vec2(resolution.x / resolution.y, 1);
        float l = length(d);


        // Colorize
        img.rgb = mix(img.rgb, vec3(.8, .4, .4), sin(gray * 3. - time));

        // Hue shift
        float shift = fract(gray + l - time * 0.2);
        img.rgb = hueShift(img.rgb, shift);

        img.a *= 0.5;
        gl_FragColor = img;
    }
    `,
    canvas: `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;

void main (void) {
    vec2 fc = gl_FragCoord.xy;
    float res = sin(time) * 32. + 33.;
    fc.y = floor(fc.y / res) * res;
    vec2 uv = (fc - offset) / resolution;
    gl_FragColor = texture2D(src, uv);
}
    `,
    custom: `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;

uniform float scroll;

void main (void) {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    uv.x = fract(uv.x + scroll + time * 0.2);
    gl_FragColor = texture2D(src, uv);
}
    `,
};

class App {
    vfx = new VFX({
        pixelRatio: window.devicePixelRatio,
        zIndex: -1,
    });

    initBG() {
        const bg = document.getElementById("BG")!;

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
    }

    initVFX() {
        const bg = document.getElementById("BG")!;
        this.vfx.add(bg, { shader: shaders.blob });

        for (const e of document.querySelectorAll("*[data-shader]")) {
            const shader = e.getAttribute("data-shader")!;

            const uniformsJSON = e.getAttribute("data-uniforms");
            const uniforms = uniformsJSON
                ? JSON.parse(uniformsJSON)
                : undefined;

            this.vfx.add(e as HTMLImageElement, {
                shader,
                overflow: parseFloat(e.getAttribute("data-overflow") ?? "0"),
                uniforms,
            });
        }
    }

    initDiv() {
        const div = document.getElementById("div")!;
        this.vfx.add(div, { shader: "rgbShift", overflow: 100 });

        for (const input of div.querySelectorAll("input,textarea")) {
            input.addEventListener("input", () => this.vfx.update(div));
        }

        const textarea = div.querySelector("textarea")!;
        const mo = new MutationObserver(() => this.vfx.update(div));
        mo.observe(textarea, {
            attributes: true,
        });
    }

    initCanvas() {
        const canvas = document.getElementById("canvas") as HTMLCanvasElement;
        const ctx = canvas.getContext("2d")!;
        const { width, height } = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio ?? 1;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        ctx.scale(ratio, ratio);

        const ps = [[width / 2, height / 2]];
        let mouse = [width / 2, height / 2];
        let isMouseOn = false;
        const startTime = Date.now();

        canvas.addEventListener("mousemove", (e) => {
            isMouseOn = true;
            mouse = [e.offsetX, e.offsetY];
        });
        canvas.addEventListener("mouseleave", (e) => {
            isMouseOn = false;
        });

        const drawMouseStalker = () => {
            if (!isMouseOn) {
                const t = Date.now() / 1000 - startTime;
                const target = [
                    width * 0.5 + Math.sin(t * 1.3) * width * 0.3,
                    height * 0.5 + Math.sin(t * 1.7) * height * 0.3,
                ];
                mouse = [
                    lerp(mouse[0], target[0], 0.1),
                    lerp(mouse[1], target[1], 0.1),
                ];
            }
            ps.push(mouse);
            ps.splice(0, ps.length - 30);

            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, width, height);

            for (let i = 0; i < ps.length; i++) {
                const [x, y] = ps[i];
                const t = (i / ps.length) * 255;
                ctx.fillStyle = `rgb(${255 - t}, 180, ${t})`;
                ctx.beginPath();
                ctx.arc(x, y, i + 20, 0, 2 * Math.PI);
                ctx.fill();
            }

            this.vfx.update(canvas);
            requestAnimationFrame(drawMouseStalker);
        };
        drawMouseStalker();

        this.vfx.add(canvas, { shader: "halftone" });
    }

    initCustomShader() {
        const e = document.getElementById("custom")!;
        this.vfx.add(e, {
            shader: shaders.custom,
            uniforms: { scroll: () => window.scrollY / window.innerHeight },
        });
    }

    hideMask() {
        const maskTop = document.getElementById("MaskTop")!;
        maskTop.style.setProperty("height", "0");

        const maskBottom = document.getElementById("MaskBottom")!;
        maskBottom.style.setProperty("opacity", "0");
    }

    showLogo() {
        const logo = document.getElementById("Logo")!;
        this.vfx.add(logo, {
            shader: shaders.logo,
            overflow: [0, 3000, 0, 100],
            uniforms: { delay: 0 },
        });

        const tagline = document.getElementById("LogoTagline")!;
        this.vfx.add(tagline, {
            shader: shaders.logo,
            overflow: [0, 3000, 0, 1000],
            uniforms: { delay: 0.3 },
        });
    }

    showProfile() {
        const profile = document.getElementById("profile")!;
        this.vfx.add(profile, {
            shader: shaders.logo,
            overflow: [0, 2000, 0, 1000],
            uniforms: { delay: 0.5 },
        });
    }
}

window.addEventListener("load", () => {
    const app = new App();
    app.initBG();
    app.initVFX();
    app.initDiv();
    app.initCanvas();
    app.initCustomShader();
    app.hideMask();
    setTimeout(() => {
        app.showLogo();
        app.showProfile();
    }, 2000);
});
