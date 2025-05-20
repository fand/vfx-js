import React, { useState, useCallback, useRef, useEffect } from "react";
import * as VFX from "react-vfx";
import "./DivSection.css";
import { InlineCode } from "./Code";

const shader = `
precision mediump float;
uniform vec2 resolution;
uniform vec2 offset;
uniform vec2 mouse;
uniform float time;
uniform sampler2D src;
uniform float dist;
out vec4 outColor;

float noise(float y, float t) {
    float n = (
        sin(y * .07 + t * 8. + sin(y * .5 + t * 10.)) +
        sin(y * .7 + t * 2. + sin(y * .3 + t * 8.)) * .7 +
        sin(y * 1.1 + t * 2.8) * .4
    );
    n += sin(y * 124. + t * 100.7) * sin(y * 877. - t * 38.8) * .3;

    return n;
}

vec2 focus(vec2 uv, vec2 c, float z) {
    return mix(
        uv,
        (uv - c) * 0.5 + c,
        z
    );
}

void main (void) {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;

    vec2 uvr, uvg, uvb;

    // mouse loupe
    vec2 muv = (mouse - offset) / resolution;
    vec2 d = uv - muv;
    d.x *= resolution.x / resolution.y;
    float zoom = exp(smoothstep(0., 1., length(d)) * -5.);

    uvr = focus(uv, muv, zoom);
    uvg = focus(uv, muv, zoom * 1.1);
    uvb = focus(uv, muv, zoom * 1.2);

    // Distort & Glitch
    float t = mod(time, 30.);
    float amp = (3. + dist * 30.) / resolution.x;
    if (abs(noise(uv.y, t)) > 1. || dist > 0.03) {
        uvr.x += noise(uv.y, t) * amp;
        uvg.x += noise(uv.y, t + 10.) * amp;
        uvb.x += noise(uv.y, t + 20.) * amp;
    }

    vec4 cr = texture(src, uvr);
    vec4 cg = texture(src, uvg);
    vec4 cb = texture(src, uvb);

    outColor = vec4(
        cr.r,
        cg.g,
        cb.b,
        step(.1, cr.a + cg.a + cb.a)
    );
}
`;

const DivSection: React.FC = () => {
    const divRef = useRef<HTMLDivElement>(null);
    const { rerenderElement } = VFX.useVFX();

    const distRef = useRef(0);

    useEffect(() => {
        let isMounted = true;
        const decay = () => {
            distRef.current *= 0.8;
            if (isMounted) {
                requestAnimationFrame(decay);
            }
        };
        decay();

        return () => {
            isMounted = false;
        };
    });

    const onChange = () => {
        rerenderElement(divRef.current);
        distRef.current = 1;
    };

    const onChangeRange = () => {
        rerenderElement(divRef.current);
    };

    return (
        <section className="DivSection">
            <h3>Div (experimental)</h3>
            <p>
                REACT-VFX also has <InlineCode>VFXDiv</InlineCode>, which allow
                us to wrap any elements...
                <br />
                so you can make an interactive form with WebGL effects!!
            </p>
            <VFX.VFXDiv
                shader={shader}
                ref={divRef}
                overflow={100}
                uniforms={{
                    dist: () => distRef.current,
                }}
            >
                <div className="DivSections">
                    <div className="DivSectionField">
                        <label htmlFor="DivInput">Input (type="text")</label>
                        <input
                            id="DivInput"
                            type="text"
                            defaultValue="You can edit me!"
                            onChange={onChange}
                        />
                    </div>

                    <div className="DivSectionField">
                        <label htmlFor="DivInputRange">
                            Input (type="range")
                        </label>
                        <input
                            id="DivInputRange"
                            type="range"
                            min="0"
                            max="100"
                            defaultValue="0"
                            onChange={onChangeRange}
                        />
                    </div>

                    <div className="DivSectionField">
                        <label htmlFor="DivTextArea">Textarea</label>
                        <textarea
                            id="DivTextArea"
                            onChange={onChange}
                            defaultValue="You can even resize me!"
                        />
                    </div>
                </div>
            </VFX.VFXDiv>
        </section>
    );
};

export default DivSection;
