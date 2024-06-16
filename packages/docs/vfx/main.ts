import { VFX } from "web-vfx";
import "./index.css";

const shaders = {
    blob: `
    precision mediump float;
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
};

// const vfx = new VFX({ pixelRatio: window.devicePixelRatio });

// for (const img of document.querySelectorAll("img")) {
//     const shader = img.getAttribute("data-shader");
//     if (shader) {
//         vfx.addImage(img, {
//             shader,
//             overflow: parseFloat(img.getAttribute("data-overflow") ?? "0"),
//         });
//     }

//     const shaderId = img.getAttribute("data-shader-id");
//     if (shaderId) {
//         console.log(img, shaderId, shaders[shaderId]);
//         vfx.addImage(img, {
//             shader: shaders[shaderId],
//             overflow: parseFloat(img.getAttribute("data-overflow") ?? "0"),
//         });
//     }
// }

// for (const video of document.querySelectorAll("video")) {
//     vfx.addVideo(video, {
//         shader: "sinewave",
//         overflow: 200,
//     });
// }

// for (const p of document.querySelectorAll("p")) {
//     vfx.addElement(p, {
//         shader: p.getAttribute("data-shader") ?? "glitch",
//         overflow: parseFloat(p.getAttribute("data-overflow") ?? "0"),
//     });
// }
