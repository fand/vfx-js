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
                                shader="rgbShift"
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
                    <VFX.VFXSpan>Hello React-VFX!</VFX.VFXSpan>
                    <br />
                    <VFX.VFXImg src="logo192.png" />
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
                    />
                    <video src="mind_blown_2.mp4" autoPlay loop />
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
                            Fusce sit amet cursus ante. Duis bibendum leo a sem
                            auctor efficitur. Nunc euismod placerat nisl, vel
                            malesuada risus consectetur a. Curabitur fringilla,
                            justo ac porta volutpat, purus orci hendrerit
                            tellus, in semper leo leo nec mauris. Donec commodo
                            mi eu fringilla posuere. Mauris cursus lorem enim.
                            Proin sit amet tellus scelerisque, lobortis justo
                            quis, pharetra lectus. Phasellus vulputate, felis id
                            dignissim sodales, diam nisi efficitur orci, eu
                            venenatis odio neque eget dolor. Sed eleifend
                            ultricies tortor a congue. Cras tincidunt ipsum
                            risus. Integer eu lacus quam. Aenean non iaculis
                            augue. In viverra eleifend mi, sit amet tempor ante
                            elementum in. Pellentesque rhoncus mi id nunc
                            pretium ultricies. Etiam vulputate convallis
                            sollicitudin. Maecenas accumsan diam eget erat
                            tincidunt tempus. Ut pellentesque scelerisque
                            consequat. Nulla egestas dolor eu diam lobortis
                            condimentum. Curabitur consequat velit nec porta
                            venenatis. Donec rhoncus lacus urna, sit amet tempus
                            ante gravida eget. Suspendisse pretium, risus
                            efficitur finibus sollicitudin, eros turpis
                            hendrerit massa, ut dapibus quam sem ac tellus.
                            Nullam eget dolor ut diam viverra sodales ac quis
                            velit. Vivamus in lorem nisl. Sed iaculis
                            scelerisque pharetra. Integer imperdiet id neque sed
                            dignissim. Donec dui odio, efficitur vitae pharetra
                            a, ullamcorper vel nibh. Praesent urna nisi,
                            sollicitudin a sapien et, feugiat ullamcorper ex.
                            Fusce ultrices tristique dolor vel fermentum.
                            Quisque a molestie libero, sit amet venenatis
                            mauris. Maecenas congue nisl quis ornare posuere.
                            Nunc ut sem euismod, accumsan enim quis, ornare
                            felis. Nam in quam sed libero venenatis vestibulum
                            eu vitae lacus.
                        </VFX.VFXSpan>
                    </p>
                    <VFX.VFXImg src="logo512.png" />
                    <VFX.VFXImg src="logo192.png" />
                    <VFX.VFXImg src="logo192.png" />
                    <VFX.VFXImg src="logo192.png" />
                    <h2>
                        <VFX.VFXSpan>Hello React-VFX!br</VFX.VFXSpan>
                    </h2>
                    <VFX.VFXImg src="logo512.png" />
                    <VFX.VFXImg src="logo192.png" />
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
