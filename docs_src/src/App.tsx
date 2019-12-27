import React, { useState, useCallback } from "react";
import "./App.css";
import * as VFX from "react-vfx";
import Bg from "./Bg";
import Frame from "./dom/Frame";
import LogoSection from "./dom/LogoSection";
import IntroSection from "./dom/IntroSection";
import InputSection from "./dom/InputSection";
import AuthorSection from "./dom/AuthorSection";
import { Code, InlineCode } from "./dom/Code";
import dedent from "dedent";

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
    return (
        <VFX.VFXProvider pixelRatio={1}>
            <Bg />
            <div className="App">
                <Frame />
                <LogoSection />
                <IntroSection />
                <section>
                    <h2 id="install">Install</h2>
                    <code>npm i react-vfx</code>

                    <p>
                        See{" "}
                        <a
                            href="https://github.com/fand/react-vfx"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            GitHub
                        </a>{" "}
                        for more info.
                    </p>
                </section>
                <section>
                    <h2 id="usage">Usage</h2>
                    <p>
                        REACT-VFX consists of{" "}
                        <b>
                            <i>VFX Provider</i>
                        </b>{" "}
                        and{" "}
                        <b>
                            <i>VFX Elements</i>
                        </b>
                        .
                    </p>
                    <p>
                        First, wrap your entire app with{" "}
                        <InlineCode>{"<VFXProvider>"}</InlineCode>.
                    </p>
                    <Code>
                        {dedent`
                            import { VFXProvider } from 'react-vfx';

                            function App {
                              return (
                                <VFXProvider>
                                  {/* Place your app here */}
                                </VFXProvider>
                              );
                            }
                        `}
                    </Code>
                    <p>
                        Then you can use VFX Elements anywhere in you app. Use{" "}
                        <InlineCode>{"<VFXImg>"}</InlineCode>,{" "}
                        <InlineCode>{"<VFXVideo>"}</InlineCode> or{" "}
                        <InlineCode>{"<VFXSpan>"}</InlineCode> instead of{" "}
                        <InlineCode>{"<img>"}</InlineCode>,{" "}
                        <InlineCode>{"<video>"}</InlineCode> or{" "}
                        <InlineCode>{"<span>"}</InlineCode>.
                    </p>
                    <p>
                        VFX Elements have <InlineCode>shader</InlineCode>{" "}
                        property. etc. All available shaders are listed{" "}
                        <a
                            href="https://github.com/fand/react-vfx/tree/master/src/constants.ts"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            here
                        </a>
                        .
                    </p>
                    <Code>
                        {dedent`
                            import { VFXImg } from 'react-vfx';

                            function Component {
                              return (
                                <VFXImg
                                  src="react-logo.png"
                                  shader="rainbow"/>
                              );
                            }
                        `}
                    </Code>
                </section>
                <section>
                    <h2 id="examples">Examples</h2>
                    <section>
                        <h3>Image</h3>
                        <p>
                            Use <InlineCode>{"<VFXImg>"}</InlineCode> instead of{" "}
                            <InlineCode>{"<img>"}</InlineCode>.<br />
                        </p>
                        <Code>
                            {dedent`
                                import { VFXImg } from 'react-vfx';

                                <VFXImg src="react-logo.png" shader="rainbow"/>

                                // or add attributes
                                <VFXImg
                                  src="react-logo.png"
                                  alt="React Logo"
                                  shader="rainbow"/>
                            `}
                        </Code>
                        <p>It renders like this 👇</p>
                        <VFX.VFXImg
                            src="logo192.png"
                            shader="rainbow"
                            width="320px"
                        />
                    </section>
                    <section>
                        <h3>⚡Animated GIFs are also supported!!⚡</h3>
                        <VFX.VFXImg src="chill.gif" shader="rgbShift" />
                        <VFX.VFXImg src="octocat.gif" shader="glitch" />
                        <VFX.VFXImg src="cat.gif" shader="rainbow" />
                        <VFX.VFXImg src="doge.gif" shader="pixelate" />
                    </section>
                    <section>
                        <h3>Video</h3>
                        <p>
                            Use <InlineCode>{"<VFXVideo>"}</InlineCode> instead
                            of <InlineCode>{"<video>"}</InlineCode>.<br />
                        </p>
                        <Code>
                            {dedent`
                                import { VFXVideo } from 'react-vfx';

                                <VFXVideo src="mind_blown.mp4" shader="halftone"/>
                            `}
                        </Code>
                        <p>It renders like this 👇</p>
                        <VFX.VFXVideo
                            src="mind_blown_2.mp4"
                            shader="halftone"
                            autoPlay
                            loop
                            muted
                            playsInline
                        />
                    </section>
                    <section>
                        <h3>Text</h3>
                        <p>
                            Use <InlineCode>{"<VFXSpan>"}</InlineCode> instead
                            of <InlineCode>{"<span>"}</InlineCode>.<br />
                        </p>
                        <Code>
                            {dedent`
                                import { VFXSpan } from 'react-vfx';

                                <VFXSpan>Hello world!</VFXSpan>
                            `}
                        </Code>
                        <p>It renders like this 👇</p>
                        <VFX.VFXSpan
                            style={{ fontSize: "48px", fontWeight: "bold" }}
                        >
                            Hello world!
                        </VFX.VFXSpan>
                        <p>
                            <InlineCode>{"<VFXSpan>"}</InlineCode> automatically
                            re-renders when its content is updated.
                        </p>
                        <InputSection />

                        <p>
                            <i>
                                NOTE: VFXSpan doesn't work with nested elements.
                            </i>
                        </p>
                    </section>
                </section>
                <section>
                    <h2 id="custom-shaders">Custom Shaders</h2>
                    <p>You can use your own shader in REACT-VFX.</p>
                    <Code>{dedent`
                        import { VFXSpan } from 'react-vfx';

                        const blink = \`
                        precision mediump float;
                        uniform vec2 resolution;
                        uniform vec2 offset;
                        uniform float time;
                        uniform sampler2D src;

                        void mainImage(vec2 uv, out vec4 color) {
                            gl_FragColor = texture2D(input, uv) * step(.5, fract(time));
                        }
                        \`;

                        export default = () => (
                            <VFXSpan shader={blink}></VFXSpan>
                        );
                    `}</Code>
                    <section className="Secton3">
                        <h3>Transition Effects</h3>
                        <p>
                            REACT-VFX provides a uniform variable{" "}
                            <InlineCode>float enterTime;</InlineCode> to write
                            transition effects.{" "}
                        </p>
                        <p>
                            Here are the examples; scroll and see the
                            transition!
                        </p>
                        <VFX.VFXImg shader="warpTransition" src="logo.png" />
                        <VFX.VFXImg
                            shader="slitScanTransition"
                            src="logo.png"
                        />
                        <VFX.VFXImg
                            shader="pixelateTransition"
                            src="logo.png"
                        />
                    </section>
                </section>
                <AuthorSection />
            </div>
        </VFX.VFXProvider>
    );
};

export default App;
