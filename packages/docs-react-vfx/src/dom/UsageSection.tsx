import React from "react";
import * as VFX from "react-vfx";
import InputSection from "./InputSection";
import DivSection from "./DivSection";
import dedent from "dedent";
import { Code, InlineCode } from "./Code";

const blink = `
uniform vec2 resolution; // Resolution of the element
uniform vec2 offset;     // Position of the element in the screen
uniform float time;      // Time passed since mount
uniform sampler2D src;   // Input texture
out vec4 outColor;

void main() {
    // Get UV in the element
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;

    outColor = texture2D(src, uv) * step(.5, fract(time));
}
`;

const fadeIn = `
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform float enterTime; // Time since entering the viewport
uniform sampler2D src;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    outColor = texture2D(src, uv);

    // Fade alpha by enterTime
    outColor.a *= smoothstep(0.0, 3.0, enterTime);
}
`;

const scrollByScroll = `
uniform vec2 resolution;
uniform vec2 offset;
uniform float scroll; // custom uniform passed as React props
uniform sampler2D src;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;

    // scroll X by scroll
    uv.x = fract(uv.x + scroll * 30.);

    // prevent vertical overflow
    if (uv.y < 0. || uv.y > 1.) discard;

    outColor = texture2D(src, uv);
}
`;

const UsageSection: React.VFC = () => (
    <>
        <section>
            <h2 id="install">Install</h2>
            <code>npm i react-vfx</code>

            <p>
                See{" "}
                <a
                    href="https://github.com/fand/vfx-js/tree/main/packages/react-vfx"
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
                VFX Elements have <InlineCode>shader</InlineCode> property. etc.
                All available shaders are listed{" "}
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
            </section>
            <section>
                <h3>Video</h3>
                <p>
                    Use <InlineCode>{"<VFXVideo>"}</InlineCode> instead of{" "}
                    <InlineCode>{"<video>"}</InlineCode>.<br />
                </p>
                <Code>
                    {dedent`
                import { VFXVideo } from 'react-vfx';

                <VFXVideo src="mind_blown.mp4" shader="halftone"/>
            `}
                </Code>
            </section>
            <InputSection />
            <DivSection />
        </section>
        <section>
            <h2 id="custom-shaders">Custom Shaders</h2>
            <p>You can use your own shader in REACT-VFX.</p>
            <Code>{dedent`
        import { VFXSpan } from 'react-vfx';

        const blink = \`
        uniform vec2 resolution; // Resolution of the element
        uniform vec2 offset;     // Position of the element in the screen
        uniform float time;      // Time passed since mount
        uniform sampler2D src;   // Input texture
        out vec4 outColor;

        void main() {
            // Get UV in the element
            vec2 uv = (gl_FragCoord.xy - offset) / resolution;

            outColor = texture2D(src, uv) * step(.5, fract(time));
        }
        \`;

        export default = () => (
            <VFXSpan shader={blink}>I'm blinking!</VFXSpan>
        );
    `}</Code>
            <p>This renders like this:</p>
            <VFX.VFXSpan
                shader={blink}
                style={{
                    fontSize: "72px",
                    fontWeight: "bold",
                    fontStyle: "italic",
                }}
            >
                I'm blinking!
            </VFX.VFXSpan>
            <section className="Secton3">
                <h3>Transition</h3>
                <p>
                    REACT-VFX provides a uniform variable{" "}
                    <InlineCode>float enterTime;</InlineCode> to write
                    transition effects.{" "}
                </p>
                <Code>{dedent`
            import { VFXSpan } from 'react-vfx';

            const fadeIn = \`
            uniform vec2 resolution;
            uniform vec2 offset;
            uniform float time;
            uniform float enterTime; // Time since entering the viewport
            uniform sampler2D src;
            out vec4 outColor;

            void main() {
                vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                outColor = texture2D(src, uv);

                // Fade alpha by enterTime
                outColor.a *= smoothstep(0.0, 3.0, enterTime);
            }
            \`;

            export default = () => (
                <VFXSpan shader={fadeIn}>I'm fading!</VFXSpan>
            );
        `}</Code>
                <p>This renders like this:</p>
                <VFX.VFXSpan
                    shader={fadeIn}
                    style={{
                        fontSize: "72px",
                        fontWeight: "bold",
                        fontStyle: "italic",
                    }}
                >
                    I'm fading!
                </VFX.VFXSpan>
            </section>
            <section className="Secton4">
                <h3>Custom Uniforms</h3>
                <p>
                    REACT-VFX accepts custom uniform variables as `uniforms`.
                    You can pass objects of parameters or functions:
                </p>
                <Code>
                    {dedent`
            // dictionary of parameters or functions
            export type VFXUniforms = {
                [name: string]: VFXUniformValue | (() => VFXUniformValue);
            };

            // REACT-VFX currently supports float, vec2, vec3 and vec4.
            export type VFXUniformValue =
                | number // float
                | [number, number] // vec2
                | [number, number, number] // vec3
                | [number, number, number, number]; // vec4
        `}
                </Code>
                <p>
                    If a parameter frequently changes over time (e.g. scroll
                    position), consider passing it as a function than a native
                    value to avoid performance problem.
                </p>
                <Code>{dedent`
            import { VFXSpan } from 'react-vfx';

            const scrollByScroll = \`
            uniform vec2 resolution;
            uniform vec2 offset;
            uniform float scroll; // custom uniform passed as props
            uniform sampler2D src;
            out vec4 outColor;

            void main() {
                vec2 uv = (gl_FragCoord.xy - offset) / resolution;

                // scroll X by scroll
                uv.x = fract(uv.x + scroll * 30.);

                // prevent vertical overflow
                if (uv.y < 0. || uv.y > 1.) discard;

                outColor = texture2D(src, uv);
            }
            \`;

            export default = () => (
                <VFXSpan shader={scrollByScroll} uniforms={{
                    scroll: () => window.scrollY / (document.body.scrollHeight - window.innerHeight);
                }}>I'm blinking!</VFXSpan>
            );
        `}</Code>
                <p>This renders like this:</p>
                <VFX.VFXSpan
                    shader={scrollByScroll}
                    style={{
                        fontSize: "72px",
                        fontWeight: "bold",
                        fontStyle: "italic",
                    }}
                    uniforms={{
                        scroll: () =>
                            window.scrollY /
                            (document.body.scrollHeight - window.innerHeight),
                    }}
                    overflow={{ left: 1000, right: 1000 }}
                >
                    I'm scrolling!
                </VFX.VFXSpan>
            </section>
        </section>
    </>
);

export default UsageSection;
