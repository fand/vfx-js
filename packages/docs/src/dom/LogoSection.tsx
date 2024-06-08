import React from "react";
import * as VFX from "react-vfx";
import "./LogoSection.css";

const shader = `
precision mediump float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform float enterTime;
uniform sampler2D src;

float nn(float y, float t) {
    float n = (
        sin(y * .07 + t * 8. + sin(y * .5 + t * 10.)) +
        sin(y * .7 + t * 2. + sin(y * .3 + t * 8.)) * .7 +
        sin(y * 1.1 + t * 2.8) * .4
    );

    n += sin(y * 124. + t * 100.7) * sin(y * 877. - t * 38.8) * .3;

    return n;
}

float step2(float t, vec2 uv) {
    return step(t, uv.x) * step(t, uv.y);
}

float inside(vec2 uv) {
    return step2(0., uv) * step2(0., 1. - uv);
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

    vec4 cr = texture2D(src, uvr) * inside(uvr);
    vec4 cg = texture2D(src, uvg) * inside(uvg);
    vec4 cb = texture2D(src, uvb) * inside(uvb);

    return vec4(
        cr.r,
        cg.g,
        cb.b,
        smoothstep(.0, 1., cr.a + cg.a + cb.a)
    );
}

vec4 slitscan(vec2 uv) {
    float t = enterTime / 0.8;

    vec2 uvr = uv, uvg = uv, uvb = uv;

    uvr.x = min(uvr.x, t);
    uvg.x = min(uvg.x, t - 0.2);
    uvb.x = min(uvb.x, t - 0.4);

    vec4 cr = texture2D(src, uvr);
    vec4 cg = texture2D(src, uvg);
    vec4 cb = texture2D(src, uvb);

    vec4 co = vec4(
        cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 1.
    );

    return co;
}

void main (void) {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    if (enterTime < 1.2) {
        gl_FragColor = slitscan(uv);
    } else {
        gl_FragColor = glitch(uv);
    }
}
`;

function pub(name: string): string {
    return `${import.meta.env.BASE_URL}${name}`;
}

const LogoSection: React.FC = () => {
    return (
        <section className="LogoSection">
            <VFX.VFXImg
                className="logo"
                src={pub("logo.png")}
                shader={shader}
            />
        </section>
    );
};
export default LogoSection;
