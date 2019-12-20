import React, { useState } from "react";
import { useDebounce } from "react-use";
import "./App.css";
import * as VFX from "react-vfx";

const blink = `
    precision mediump float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform sampler2D src;
    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        gl_FragColor = texture2D(src, uv) * (1. - sin(time * 10.));
    }
`;

const mouse = `
    precision mediump float;
    uniform vec2 offset;
    uniform vec2 mouse;
    uniform float time;
    uniform sampler2D src;

    void main() {
        float l = length(gl_FragCoord.xy - mouse);
        float threshold = 100.;
        float c = smoothstep(threshold + .01, threshold, l);
        gl_FragColor = vec4(c);
    }
`;

const App: React.FC = () => {
    const [text, setText] = useState("You can dynamically!!!!");
    const [debouncedText, setDebouncedText] = useState(
        "You can dynamically!!!!"
    );

    useDebounce(
        () => {
            setDebouncedText(text);
        },
        100,
        [text]
    );

    return (
        <div className="App">
            <div className="App-frame"></div>
            <div className="App-inner">
                <VFX.VFXProvider>
                    <section className="App-hero">
                        <div className="App-hero-logo">
                            <VFX.VFXImg
                                src="logo-mobile@2x.png"
                                shader={"rgbShift"}
                            />
                        </div>
                    </section>
                    <section className="Section2">
                        <VFX.VFXP shader={blink}>
                            REACT-VFX is a React component library. It allows
                            you to use WebGL power to stylize your React
                            application.
                        </VFX.VFXP>
                    </section>

                    <section className="Secton3">
                        <VFX.VFXSpan shader="rainbow">
                            {debouncedText}
                        </VFX.VFXSpan>
                        <br />
                        <input
                            style={{ fontSize: 36 }}
                            type="text"
                            value={text}
                            onChange={e => setText(e.target.value)}
                        ></input>
                    </section>

                    <section className="Secton3">
                        <h2>Transition Effects!</h2>
                        <VFX.VFXImg shader="warpTransition" src="logo192.png" />
                        <VFX.VFXImg
                            shader="slitScanTransition"
                            src="logo192.png"
                        />
                        <VFX.VFXImg
                            shader="pixelateTransition"
                            src="logo192.png"
                        />
                    </section>
                    <h1>
                        <VFX.VFXDiv>This is DIV</VFX.VFXDiv>
                    </h1>
                    <h1>GIF</h1>
                    <img src="mind_blown.gif" alt="mind_blown original" />
                    <img src="octocat.gif" alt="octocat original" />
                    <img src="cat.gif" alt="cat original" />
                    <img src="doge.gif" alt="doge original" />
                    <br />
                    <VFX.VFXImg src="mind_blown.gif" shader="halftone" />
                    <VFX.VFXImg src="octocat.gif" shader="glitch" />
                    <VFX.VFXImg src="cat.gif" shader="rainbow" />
                    <VFX.VFXImg src="doge.gif" shader="pixelate" />
                    <br />
                    <h1>VIDEO</h1>
                    <VFX.VFXVideo
                        src="mind_blown_2.mp4"
                        shader="rainbow"
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                    <video
                        src="mind_blown_2.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                    <p>
                        <VFX.VFXSpan>
                            Lorem ipsum dolor sit amet, consectetur adipiscing
                            elit. Donec molestie, ligula sit amet ullamcorper
                            scelerisque, urna tellus dictum lacus, quis
                            ultricies nunc nibh in justo. Donec mattis rutrum
                            gravida. Curabitur lobortis lectus tellus, eu
                            gravida magna convallis quis. Nam congue quam ipsum,
                            id efficitur velit ornare ut. In auctor leo quis
                            laoreet sagittis. Donec auctor tincidunt sagittis.
                        </VFX.VFXSpan>
                    </p>
                    <VFX.VFXImg src="logo512.png" />
                    <VFX.VFXImg src="logo192.png" />
                    <VFX.VFXImg src="logo192.png" />
                    <h3>
                        <i>
                            <VFX.VFXSpan>BAzzzzz</VFX.VFXSpan>
                        </i>
                    </h3>
                    <VFX.VFXImg src="logo512.png" />
                    <h1>
                        <VFX.VFXSpan>Hello React-VFX!</VFX.VFXSpan>
                    </h1>
                    <VFX.VFXImg src="logo512.png" />
                    <h1>yo</h1>
                </VFX.VFXProvider>
            </div>
        </div>
    );
};

export default App;
